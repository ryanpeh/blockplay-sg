// Offline-game browser check. Requires Vite + loopback Chrome debugging.
// Never opens live Street View or logs request URLs (which may contain keys).
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.REGION_APP_ORIGIN || 'http://127.0.0.1:5173';
const chrome = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const connect = async url => {
  const socket = new WebSocket(url), pending = new Map(), listeners = []; let next = 0;
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Chrome unavailable')), { once: true }); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(new Error('Chrome command failed')) : task.resolve(message.result); }
    else listeners.forEach(listener => listener(message));
  };
  return { listeners, send: (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(new Error('Chrome timeout')); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  }), close() { socket.close(); } };
};
const browser = await connect((await (await fetch(`${chrome}/json/version`)).json()).webSocketDebuggerUrl);
let targetId, page;
try {
  ({ targetId } = await browser.send('Target.createTarget', { url: 'about:blank' }));
  const targets = await (await fetch(`${chrome}/json`)).json();
  page = await connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => {
    const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error('Browser check evaluation failed');
    return result.result.value;
  };
  let googleRequests = 0; const errors = [];
  page.listeners.push(message => {
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.requestWillBeSent' && /maps\.googleapis\.com|streetviewpixels/.test(message.params.request.url)) googleRequests++;
  });
  await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
  // Test-only observation of renderer camera uniforms. No production debug state
  // or screenshots/pixel comparisons (animated scenery would make those flaky).
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const names = new WeakMap(), uniforms = new WeakMap();
    const proto = WebGL2RenderingContext.prototype;
    const getLocation = proto.getUniformLocation, setMatrix = proto.uniformMatrix4fv;
    const setViewport = proto.viewport, clear = proto.clear;
    proto.viewport = function(x, y, width, height) {
      this.__smokeMainViewport = width === this.drawingBufferWidth && height === this.drawingBufferHeight;
      return setViewport.call(this, x, y, width, height);
    };
    proto.clear = function(mask) { this.__smokeObserved = false; return clear.call(this, mask); };
    proto.getUniformLocation = function(program, name) {
      const location = getLocation.call(this, program, name);
      if (location) names.set(location, { program, name });
      return location;
    };
    proto.uniformMatrix4fv = function(location, transpose, value, ...rest) {
      const uniform = names.get(location);
      if (uniform) {
        const state = uniforms.get(uniform.program) || {};
        state[uniform.name] = Array.from(value); uniforms.set(uniform.program, state);
      }
      return setMatrix.call(this, location, transpose, value, ...rest);
    };
    const useProgram = proto.useProgram;
    proto.useProgram = function(program) { this.__smokeProgram = program; return useProgram.call(this, program); };
    for (const method of ['drawElements', 'drawElementsInstanced', 'drawArrays', 'drawArraysInstanced']) {
      const draw = proto[method];
      proto[method] = function(...args) {
        const state = uniforms.get(this.__smokeProgram);
        if (this.__smokeMainViewport && !this.__smokeObserved && state?.modelViewMatrix && state?.modelMatrix) {
          // Remove the object's model transform, including animated stamp
          // rotation. Observe at draw time so Three's uniform cache is safe.
          window.__smokeViewMatrix = Array.from(new DOMMatrix(state.modelViewMatrix).multiply(new DOMMatrix(state.modelMatrix).inverse()).toFloat64Array());
          this.__smokeObserved = true;
        }
        return draw.apply(this, args);
      };
    }
  ` });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: origin });
  await mkdir('.cache/browser-checks', { recursive: true });
  const regions = [['Marina Bay', 'Reset Marina adventure (clears stamps and conversation)'], ['Queenstown', 'Reset Queenstown progress (clears stamps)']];
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`!!document.querySelector('.location-card')`)) break;
    await delay(100);
  }
  assert(await evaluate(`!!document.querySelector('.location-card')`), 'app is ready (check Vite import/build errors if absent)');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.location-card strong')).map(e=>e.textContent)`), ['Marina Bay', 'Raffles Place', 'Queenstown'], 'developed regions are selectable with Marina first');
  // Include the third region once its playable card has landed during parallel development.
  if (await evaluate(`Array.from(document.querySelectorAll('.location-card')).some(b=>b.textContent.includes('Raffles Place'))`)) regions.push(['Raffles Place', 'Reset Raffles progress (clears stamps)']);
  const rotation = async () => {
    const matrix = await evaluate('window.__smokeViewMatrix');
    assert.equal(matrix?.length, 16, 'camera view matrix observed');
    return [0, 1, 2, 4, 5, 6, 8, 9, 10].map(index => matrix[index]);
  };
  const difference = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
  const player = () => evaluate(`(()=>{const p=document.querySelector('.marina-map svg circle:last-child');return [Number(p.getAttribute('cx')),Number(p.getAttribute('cy'))]})()`);
  const drag = async () => {
    const point = await evaluate(`(()=>{const r=document.querySelector('.marina-viewport canvas').getBoundingClientRect();return {x:r.left+r.width*.45,y:r.top+r.height*.55}})()`);
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x + 160, y: point.y + 35, button: 'left', buttons: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x + 160, y: point.y + 35, button: 'left', buttons: 0, clickCount: 1 });
    await delay(180);
  };
  for (const [name, resetLabel] of regions) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`!!document.querySelector('.location-card')`)) break;
      await delay(100);
    }
    await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes(${JSON.stringify(name)})).click()`);
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`!!document.querySelector('[aria-label=${JSON.stringify(resetLabel)}]') && !!document.querySelector('.marina-viewport canvas')`)) break;
      await delay(100);
    }
    assert.equal(await evaluate(`document.querySelectorAll('.marina-viewport canvas').length`), 1, `${name}: one renderer`);
    assert(await evaluate(`!!document.querySelector('[aria-label=${JSON.stringify(resetLabel)}]')`), `${name}: correct region`);
    assert.equal(await evaluate(`document.querySelector('[data-map-location][data-selected="true"]')?.getAttribute('data-map-location')`), name.toLowerCase().replaceAll(' ', '-'), `${name}: Singapore locator follows selection`);
    await evaluate(`document.querySelector('.marina-viewport canvas').focus()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' }); await delay(1000);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' }); await delay(180);
    assert(await evaluate(`parseFloat(document.querySelector('.marina-reconstruction .session-strip strong').textContent)>0`), `${name}: walk`);
    await evaluate(`document.querySelector('[aria-label=${JSON.stringify(resetLabel)}]').click()`); await delay(180);
    assert.equal(await evaluate(`parseFloat(document.querySelector('.marina-reconstruction .session-strip strong').textContent)`), 0, `${name}: reset`);
    await evaluate(`Array.from(document.querySelectorAll('.marina-reconstruction button')).find(b=>b.textContent==='Drive').click()`); await delay(100);
    await evaluate(`document.querySelector('.marina-viewport canvas').focus()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' }); await delay(1200);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' }); await delay(180);
    assert(await evaluate(`parseFloat(document.querySelector('.marina-reconstruction .session-strip strong').textContent)>0`), `${name}: drive`);
    const reset = async () => { await evaluate(`document.querySelector('[aria-label=${JSON.stringify(resetLabel)}]').click()`); await delay(220); };
    await reset();
    const defaultCamera = await rotation(), spawn = await player();
    await drag();
    assert(difference(defaultCamera, await rotation()) > 0.3, `${name}: stationary drag changes camera`);
    assert(difference(spawn, await player()) < 0.01, `${name}: stationary drag does not move car`);
    await delay(1000);
    assert(difference(defaultCamera, await rotation()) > 0.3, `${name}: stationary look is retained`);
    await reset();
    const resetCamera = await rotation();
    assert(difference(defaultCamera, resetCamera) < 0.01, `${name}: reset recenters camera`);
    await evaluate(`document.querySelector('.marina-viewport canvas').focus()`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' });
    await delay(600);
    const beforeDrag = await player();
    await drag();
    assert(difference(defaultCamera, await rotation()) > 0.3, `${name}: moving drag changes camera`);
    await delay(1500);
    const afterDrag = await player();
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' });
    const beforeVector = beforeDrag.map((v, i) => v - spawn[i]), afterVector = afterDrag.map((v, i) => v - spawn[i]);
    const cross = Math.abs(beforeVector[0] * afterVector[1] - beforeVector[1] * afterVector[0]);
    assert(Math.hypot(...beforeVector) > 0.05 && Math.hypot(...afterVector) > Math.hypot(...beforeVector), `${name}: trajectory sampled while moving`);
    assert(cross / Math.hypot(...afterVector) < 0.08, `${name}: drag does not steer car`);
    assert(difference(defaultCamera, await rotation()) < 0.3, `${name}: moving camera settles behind car`);
    await reset(); await drag();
    for (const mode of ['Walk', 'Drive']) {
      await evaluate(`Array.from(document.querySelectorAll('.marina-reconstruction button')).find(b=>b.textContent===${JSON.stringify(mode)}).click()`); await delay(180);
    }
    assert(difference(defaultCamera, await rotation()) < 0.01, `${name}: switching modes clears camera orbit`);
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`.cache/browser-checks/${name.toLowerCase().replaceAll(' ', '-')}.png`, Buffer.from(shot.data, 'base64'));
    console.log(`PASS ${name}: render, walk, reset, drive, stationary/moving camera orbit, independent trajectory, recenter, mode switch`);
  }
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const [name] of regions) {
    await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes(${JSON.stringify(name)})).click()`); await delay(300);
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `${name}: mobile width`);
  }
  // Map controls use the same region selection action as the original cards.
  await evaluate(`document.querySelector('[data-map-location="queenstown"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await delay(350);
  assert.equal(await evaluate(`document.querySelector('.location-card[aria-pressed="true"] strong')?.textContent`), 'Queenstown', 'map click selects region');
  await evaluate(`document.querySelector('[data-map-location="marina-bay"]').focus()`);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' }); await delay(350);
  assert.equal(await evaluate(`document.querySelector('.location-card[aria-pressed="true"] strong')?.textContent`), 'Marina Bay', 'map keyboard selection');
  const mobileShot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('.cache/browser-checks/singapore-map-mobile.png', Buffer.from(mobileShot.data, 'base64'));
  assert.equal(googleRequests, 0, 'region games must not load Maps or Street View');
  assert.deepEqual(errors, [], 'no uncaught browser exceptions');
  console.log('PASS region switching, mobile width, zero Google Maps requests, no uncaught errors');
} finally { page?.close(); if (targetId) await browser.send('Target.closeTarget', { targetId }); browser.close(); }
