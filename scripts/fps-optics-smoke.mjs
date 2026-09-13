// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9228.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9228';
const output = new URL('../.cache/fps-handling/', import.meta.url); await fs.mkdir(output, { recursive: true });
const tab = await (await fetch(`${chrome}/json/new?${encodeURIComponent(origin)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0; const pending = new Map(), errors = []; let mapRequests = 0;
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent' && /maps\.googleapis|streetviewpixels|maps\.google\.com/.test(m.params.request.url)) mapRequests++;
};
function send(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; const timer = setTimeout(() => { pending.delete(n); reject(new Error(`CDP timeout: ${method}`)); }, 30000); pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); }); }
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression, timeout = 20000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await delay(150); } throw new Error(`Timed out waiting for ${expression}`); }
const button = name => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(name)})`;
async function point(expression) { return evaluate(`(()=>{const e=${expression}; if(!e) throw Error('Missing control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); }
async function click(expression) { const p = await point(expression); await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 }); }
async function key(key, code, held = 0) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code }); if (held) await delay(held); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code }); }
async function screenshot(name) { const shot = await send('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(new URL(name + '.png', output), Buffer.from(shot.data, 'base64')); }
const phase = value => `document.querySelector('.fps-game')?.dataset.phase===${JSON.stringify(value)}`;
const ammo = `Number(document.querySelector('.fps-ammo strong')?.firstChild.textContent)`;
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await evaluate(`localStorage.removeItem('blockplay.armory.v1');location.reload()`); await delay(900);
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await wait(phase('ready')); await click(button('Enter range')); await wait(phase('playing'));
  await screenshot('sar-integrated-hip');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'right',clickCount:1});
  await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.99`);
  await wait(`document.querySelector('.fps-viewport canvas').dataset.scopeActive==='true'`);
  await delay(500); await screenshot('sar-integrated-pip');
  assert.equal(await evaluate(`document.querySelector('.fps-weapon-hud').dataset.sight`),'scope');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'right',clickCount:1});
  await delay(600); assert.equal(await evaluate(`document.querySelector('.fps-viewport canvas').dataset.scopeActive`),'false');
  await key('Escape','Escape'); await wait(phase('paused'));
  await click(`document.querySelector('.fps-shop-link')`);
  await wait(`!!document.querySelector('#shop-tab-attachment')`);
  await click(`document.querySelector('#shop-tab-attachment')`);
  await click(`document.querySelector('[data-item="optic-reflex"]')`);
  await wait(`!document.querySelector('.armory-preview-status')`);
  await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`);
  await screenshot('sar-reflex-shop');
  const action = `document.querySelector('[data-testid="shop-action"]')`;
  await click(action); await delay(200); await click(action);
  await wait(`JSON.parse(localStorage.getItem('blockplay.armory.v1')).guns[0].attachments.optic==='optic-reflex'`);
  await click(button('Deploy to Marina FPS')); await wait(phase('ready'));
  await click(button('Enter range')); await wait(phase('playing')); await screenshot('sar-reflex-hip');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'right',clickCount:1});
  await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.99`);
  await screenshot('sar-reflex-ads');
  assert.equal(await evaluate(`document.querySelector('.fps-viewport canvas').dataset.scopeActive`),'false');
  assert.equal(await evaluate(`document.querySelector('.fps-weapon-hud').dataset.sight`),'reflex');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'right',clickCount:1});
  await key('Escape','Escape'); await wait(phase('paused'));
  await click(`document.querySelector('.fps-shop-link')`); await wait(`!!document.querySelector('.armory')`);
  await click(`document.querySelector('[aria-label="Remove optic attachment"]')`);
  await wait(`!JSON.parse(localStorage.getItem('blockplay.armory.v1')).guns[0].attachments.optic`);
  await click(button('Deploy to Marina FPS')); await wait(phase('ready'));
  await click(button('Enter range')); await wait(phase('playing'));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'right',clickCount:1});
  await wait(`document.querySelector('.fps-viewport canvas').dataset.scopeActive==='true'`);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'right',clickCount:1});
  await key('Escape','Escape');
  assert.deepEqual(errors,[]); console.log('PASS: integrated PiP, hip render gating, shop purchase/equip, unmagnified replacement red dot, and restoring the integrated optic');
} finally {ws.close(); await fetch(`${chrome}/json/close/${tab.id}`);}
