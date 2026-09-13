// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9331.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9331';
const output = new URL('../.cache/fps-districts/', import.meta.url); await fs.mkdir(output, { recursive: true });
const tab = await (await fetch(`${chrome}/json/new?${encodeURIComponent(origin)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0; const pending = new Map(), errors = []; let mapRequests = 0, voiceApiRequests = 0;
ws.onmessage = event => {
  const m = JSON.parse(event.data);
  if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }
  if (m.method === 'Network.requestWillBeSent' && /elevenlabs\.io/.test(m.params.request.url)) voiceApiRequests++;
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
const number = name => `Number(document.querySelector('.fps-game').dataset.${name})`;
const vehicle = kind => `document.querySelector('.fps-game')?.dataset.vehicle===${JSON.stringify(kind)}`;
async function holdUntil(keyName,code,condition){await send('Input.dispatchKeyEvent',{type:'keyDown',key:keyName,code});try{await wait(condition,12000)}finally{await send('Input.dispatchKeyEvent',{type:'keyUp',key:keyName,code})}}
try {
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await wait(`document.querySelectorAll('.location-card').length===3`);
 for(const [id,name,label] of [['queenstown','Queenstown','Queenstown FPS'],['raffles-place','Raffles Place','Raffles FPS']]) {
   await click(`[...document.querySelectorAll('.location-card')].find(b=>b.querySelector('strong')?.textContent===${JSON.stringify(name)})`);
   if(!await evaluate(`!!document.querySelector('.fps-game')`)) await click(`[...document.querySelectorAll('.mode-card')].find(b=>b.querySelector('strong')?.textContent===${JSON.stringify(label)})`);
   await wait(`document.querySelector('.fps-game')?.dataset.mapZone===${JSON.stringify(id)} && ${phase('ready')}`);
   await click(button('Enter range')); await wait(phase('playing'));assert(await evaluate('!!document.pointerLockElement'));
   if(id==='queenstown') {await holdUntil('a','KeyA',`${number('playerX')}<-17`);await holdUntil('s','KeyS',`document.querySelector('.fps-interact-prompt')?.textContent.includes('Drive')`)}
   else await holdUntil('a','KeyA',`document.querySelector('.fps-interact-prompt')?.textContent.includes('Drive')`);
   await key('e','KeyE');await wait(vehicle('car'));
   const x=await evaluate(number('playerX'));await holdUntil('w','KeyW',`${number('playerX')}>${x+1.5}`);
   assert(await evaluate(number('playerX'))>x+1,'car moves');
   await holdUntil(' ','Space',`${number('speed')}<.2`);await key('e','KeyE');await wait(vehicle('on-foot'));console.log(`PASS ${id}: vehicle cycle completed.`);
   await key('Escape','Escape');await wait(phase('paused'));
   await click(`document.querySelector('[aria-label="Reset FPS exercise"]')`);await wait(phase('ready'));
   await click(button('Enter range'));await wait(phase('playing'));
   if(id==='queenstown') await holdUntil('d','KeyD',`document.querySelector('.fps-interact-prompt')?.textContent.includes('Pilot')`);
   else {await holdUntil('d','KeyD',`${number('playerX')}>17`);await holdUntil('w','KeyW',`document.querySelector('.fps-interact-prompt')?.textContent.includes('Pilot')`)}
   await key('e','KeyE');await wait(vehicle('helicopter'));
   await holdUntil(' ','Space',`${number('altitude')}>5`);assert(await evaluate(number('altitude'))>4,'helicopter takes off');
   await key('e','KeyE');assert(await evaluate(vehicle('helicopter')),'airborne exit guard');
   await screenshot(`${id}-helicopter`);
   await holdUntil('c','KeyC',`${number('altitude')}<.01`);await key('e','KeyE');await wait(vehicle('on-foot'));console.log(`PASS ${id}: vehicle cycle completed.`);
   await key('Escape','Escape');await wait(phase('paused'));
   await click(`document.querySelector('[aria-label="Fullscreen range"]')`);await wait(`document.querySelector('.fps-game').classList.contains('is-immersive')`);
   await screenshot(`${id}-fullscreen`);
   await click(`document.querySelector('.fps-leave-screen')`);await wait(`!document.querySelector('.fps-game').classList.contains('is-immersive')`);
   await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
   await screenshot(`${id}-mobile`);
   await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
   console.log(`PASS ${id}: captured human movement, car enter/drive/brake/exit, helicopter takeoff/landing/exit guard, fullscreen and mobile layout.`);
 }
 assert.equal(mapRequests,0);assert.deepEqual(errors,[]);
} catch(error) {console.log(errors);await screenshot('district-vehicle-failure');throw error;}
finally {ws.close();await fetch(`${chrome}/json/close/${tab.id}`);}
