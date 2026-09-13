// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9224.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9224';
const output = new URL('../.cache/pointer-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await wait(phase('ready'));
  // Preserve the browser's real pointer-lock implementation; observe the requested options.
  await evaluate(`(()=>{const original=HTMLCanvasElement.prototype.requestPointerLock;window.captureOptions=[];HTMLCanvasElement.prototype.requestPointerLock=function(options){window.captureOptions.push(options||{});return original.call(this,options)}})()`);
  await click(button('Enter range')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement'));
  assert(await evaluate('window.captureOptions[0].unadjustedMovement!==true'), 'Standard relative input requested for VM compatibility');
  const before = await evaluate(`({x:Number(document.querySelector('.fps-game').dataset.playerX),z:Number(document.querySelector('.fps-game').dataset.playerZ)})`);
  // Keep absolute coordinates pinned to the screen edge while sending >2 full revolutions.
  await evaluate(`(()=>{for(let i=0;i<100;i++){document.dispatchEvent(new MouseEvent('mousemove',{clientX:screen.width-1,clientY:screen.height-1,movementX:(Math.PI*4+Math.PI/2)/.0023/100,movementY:0}))}})()`);
  await key('w', 'KeyW', 250); await delay(200);
  const after = await evaluate(`({x:Number(document.querySelector('.fps-game').dataset.playerX),z:Number(document.querySelector('.fps-game').dataset.playerZ)})`);
  assert(after.x>before.x+.3, `Look continued past screen edge and multiple revolutions (${JSON.stringify({before,after})})`);
  assert(Math.abs(after.z-before.z)<.15, 'Final heading is perpendicular to original heading');
  await key('Escape','Escape'); await wait(phase('paused'));
  assert.equal(await evaluate('!!document.pointerLockElement'),false,'Escape releases mouse');
  await screenshot('continuous-turn');
  assert.deepEqual(errors, []);
  console.log('PASS: standard capture requested, true pointer lock, >2 continuous turns with fixed edge coordinates, heading verified by movement, Escape releases capture. Physical VM mouse delivery requires user confirmation.');
} finally {ws.close();await fetch(`${chrome}/json/close/${tab.id}`);}
