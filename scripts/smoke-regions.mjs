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
  await page.send('Runtime.enable'); await page.send('Network.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: origin });
  await mkdir('.cache/browser-checks', { recursive: true });
  for (const [name, resetLabel] of [['Marina Bay', 'Reset Marina position'], ['Queenstown', 'Reset Queenstown position']]) {
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
    const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`.cache/browser-checks/${name.toLowerCase().replaceAll(' ', '-')}.png`, Buffer.from(shot.data, 'base64'));
    console.log(`PASS ${name}: render, walk, reset, drive`);
  }
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  for (const name of ['Marina Bay', 'Queenstown']) {
    await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes(${JSON.stringify(name)})).click()`); await delay(300);
    assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth`), `${name}: mobile width`);
  }
  assert.equal(googleRequests, 0, 'region games must not load Maps or Street View');
  assert.deepEqual(errors, [], 'no uncaught browser exceptions');
  console.log('PASS region switching, mobile width, zero Google Maps requests, no uncaught errors');
} finally { page?.close(); if (targetId) await browser.send('Target.closeTarget', { targetId }); browser.close(); }
