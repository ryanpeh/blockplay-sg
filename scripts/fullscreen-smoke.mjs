// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9224.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9224';
const output = new URL('../.cache/fullscreen-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
const fpsMode = `[...document.querySelectorAll('.mode-card')].find(b=>b.querySelector('strong')?.textContent==='Marina FPS')`;
const shop = `document.querySelector('.fps-shop-link')`;
async function openShop() { await click(fpsMode); await wait(`!!${shop}`); await click(shop); }
const action = `document.querySelector('[data-testid="shop-action"]')`;
const wallet = `JSON.parse(localStorage.getItem('blockplay.armory.v1'))`;
const choose = async id => { await click(`document.querySelector('[data-item="${id}"]')`); await delay(200); };
const category = async id => { await click(`document.querySelector('#shop-tab-${id}')`); await delay(200); };
try {
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`); await wait(phase('ready'));
  await click(`document.querySelector('[aria-label="Fullscreen range"]')`);
  await wait(`document.fullscreenElement===document.querySelector('.fps-game')`);
  assert(await evaluate(`document.querySelector('.fps-game').getBoundingClientRect().width>=innerWidth-1`));
  await screenshot('fullscreen-ready'); await click(button('Enter range')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement')); await screenshot('fullscreen-fps');
  await key('e','KeyE'); await wait(`document.querySelector('.fps-game').dataset.vehicle==='car'`); await screenshot('fullscreen-car');
  await key('f','KeyF'); await wait(phase('paused')); await wait(`!document.fullscreenElement && !document.querySelector('.fps-game').classList.contains('is-immersive')`);
  assert(!(await evaluate('!!document.pointerLockElement'))); assert(await evaluate(`document.querySelector('.fps-game').dataset.vehicle==='car'`),'Fullscreen changes preserve the occupied vehicle');
  await click(`document.querySelector('[aria-label="Fullscreen range"]')`); await wait(`!!document.fullscreenElement`); await click(button('Resume exercise')); await wait(phase('playing'));
  await key('Escape','Escape'); await wait(phase('paused'));
  assert(!(await evaluate('!!document.pointerLockElement')),'Escape releases capture in fullscreen');
  if(await evaluate('!!document.fullscreenElement')) await click(`document.querySelector('.fps-leave-screen')`);
  await wait(`!document.fullscreenElement`);
  // Embedded-browser failure: keep a usable expanded view and a working exit.
  await evaluate(`window.__full=HTMLElement.prototype.requestFullscreen;HTMLElement.prototype.requestFullscreen=()=>Promise.reject(new Error('Test denial'))`);
  await click(`document.querySelector('[aria-label="Fullscreen range"]')`); await wait(`!!document.querySelector('.fps-screen-notice')`);
  assert(await evaluate(`!document.fullscreenElement && document.querySelector('.fps-game').classList.contains('is-immersive')`));
  await screenshot('fullscreen-fallback'); await click(`document.querySelector('.fps-leave-screen')`);
  await evaluate(`HTMLElement.prototype.requestFullscreen=window.__full;delete window.__full`);
  assert(await evaluate(`!document.querySelector('.fps-game').classList.contains('is-immersive') && document.body.style.overflow!== 'hidden'`),'Exit restores page scrolling');
  await click(button('Open armory · change equipment →')); await wait(`!!document.querySelector('.armory')`); assert.equal(await evaluate('document.querySelectorAll("canvas").length'),1);
  assert.equal(mapRequests,0); assert.deepEqual(errors,[]); console.log('PASS: native fullscreen, immersive FPS/car, F toggle, Escape/pointer release, session continuity, denied-native fallback, scroll restoration and cleanup.');
} catch(error) {await screenshot('fullscreen-failure');throw error;}
finally {ws.close();await fetch(`${chrome}/json/close/${tab.id}`);}
