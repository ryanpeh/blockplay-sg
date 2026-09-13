// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9228.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.ARENA_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.ARENA_CHROME_ORIGIN || 'http://127.0.0.1:9228';
const output = new URL('../.cache/arena-solo-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('LAN arena'))`);
  await evaluate(`localStorage.removeItem('blockplay.armory.v1');location.reload()`);
  await delay(1000);
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('LAN arena'))`);
  await wait(`!!document.querySelector('.lan-lobby')`);
  await screenshot('lobby-desktop');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('lobby-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Lobby must fit mobile viewport');
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Solo vs bots'))`);
  await evaluate(`(()=>{const select=document.querySelector('#lan-squad');select.value='tank';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert(await evaluate(`document.querySelector('.lan-squad-control p').textContent.includes('stronger armor')`), 'Tank squad description');
  await evaluate(`(()=>{const select=document.querySelector('#lan-squad');select.value='sniper';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  assert(await evaluate(`document.querySelector('.lan-squad-control p').textContent.includes('distance')`), 'Sniper squad description');
  await evaluate(`(()=>{const select=document.querySelector('#lan-squad');select.value='mixed';select.dispatchEvent(new Event('change',{bubbles:true}));const range=document.querySelector('#lan-bot-count');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(range,'6');range.dispatchEvent(new Event('input',{bubbles:true}));range.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await wait(`document.querySelector('.lan-bot-control output').textContent==='06'`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await click(button('Deploy against bots'));
  await wait(phase('ready'), 30000);
  await wait(`document.querySelectorAll('.arena-scoreboard tbody tr').length===7`);
  const roles = await evaluate(`[...document.querySelectorAll('.arena-scoreboard tbody tr td:nth-child(2)')].map(e=>e.textContent)`);
  assert.equal(roles.filter(role=>role==='assault').length,2);
  assert.equal(roles.filter(role=>role==='tank').length,2);
  assert.equal(roles.filter(role=>role==='sniper').length,2);
  assert.equal(await evaluate(`!![...document.querySelectorAll('.fps-inputs button')].find(b=>b.textContent.includes('vehicle'))`),false,'Arena must not expose unsynchronized vehicle controls');
  await screenshot('arena-ready');
  await click(button('Start match')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement'), 'Arena captures pointer before play');
  await wait(`Number(document.querySelector('.fps-game').dataset.health)<100`,60000);
  await screenshot('arena-bots-engaging');
  await wait(`document.querySelector('.fps-game').dataset.arenaAlive==='false'`,60000);
  await screenshot('arena-respawn');
  assert(await evaluate(`!!document.querySelector('.arena-respawn')`),'Death displays respawn countdown');
  await wait(`document.querySelector('.fps-game').dataset.arenaAlive==='true'`,12000);
  assert(await evaluate('!!document.pointerLockElement'),'Respawn retains pointer capture');
  await key('Escape','Escape'); await wait(phase('paused'));
  assert.equal(await evaluate('!!document.pointerLockElement'),false,'Menu releases pointer');
  assert(await evaluate(`document.querySelector('.arena-start-card p').textContent.includes('keep running')`),'Arena explains local menu does not stop match');
  await click(`document.querySelector('[aria-label="Reset arena match"]')`); await wait(phase('ready'));
  assert(await evaluate(`document.querySelector('.fps-score').textContent.includes('0 K / 0 D')`),'Host reset clears score');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('arena-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Arena must fit mobile viewport');
  await click(button('Leave match · return to lobby →'));
  await wait(`!!document.querySelector('.lan-lobby')`);
  assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),0,'Leaving arena removes renderer');
  assert.equal(mapRequests,0,'Arena has no map API requests');
  assert.deepEqual(errors,[],'No browser errors');
  console.log('PASS: responsive lobby, role selection, six mixed bots, role roster, infantry-only controls, pointer capture, bot damage, death and respawn, local menu, host reset, mobile arena, renderer cleanup; no browser errors.');
  console.log('Screenshots: .cache/arena-solo-smoke/');
} catch(error) { await screenshot('arena-failure'); throw error; }
finally { ws.close(); await fetch(`${chrome}/json/close/${tab.id}`); }
