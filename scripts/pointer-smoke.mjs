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
  // Regression: virtual tablets can report no fine primary pointer despite mouse events.
  await evaluate(`(()=>{const media=window.matchMedia.bind(window);window.matchMedia=query=>query==='(pointer: fine)'?{...media(query),matches:false}:media(query)})()`);
  // Preserve the browser's real pointer-lock implementation; observe the requested options.
  await evaluate(`(()=>{const original=HTMLCanvasElement.prototype.requestPointerLock;window.captureOptions=[];HTMLCanvasElement.prototype.requestPointerLock=function(options){window.captureOptions.push(options||{});return original.call(this,options)}})()`);
  await click(button('Enter range')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement'));
  assert.equal(await evaluate(`document.querySelectorAll('.fps-minimap').length`),1);
  assert.equal(await evaluate(`document.querySelectorAll('[data-marker-kind=target]').length`),8);
  assert.equal(await evaluate(`document.querySelectorAll('[data-marker-kind=car],[data-marker-kind=helicopter]').length`),2);
  assert(await evaluate('window.captureOptions[0].unadjustedMovement!==true'), 'Standard relative input requested for VM compatibility');
  await delay(200);
  const before = await evaluate(`({yaw:Number(document.querySelector('[data-minimap-player]').dataset.yaw),x:Number(document.querySelector('.fps-game').dataset.playerX),z:Number(document.querySelector('.fps-game').dataset.playerZ)})`);
  // Keep absolute coordinates pinned to the screen edge while sending >2 full revolutions.
  await evaluate(`(()=>{for(let i=0;i<100;i++){document.dispatchEvent(new MouseEvent('mousemove',{clientX:screen.width-1,clientY:screen.height-1,movementX:64,movementY:0}))}})()`);
  await key('w', 'KeyW', 700); await delay(200);
  const after = await evaluate(`({x:Number(document.querySelector('.fps-game').dataset.playerX),z:Number(document.querySelector('.fps-game').dataset.playerZ)})`);
  assert(after.x>before.x+.3, `Look continued past screen edge and multiple revolutions (${JSON.stringify({before,after})})`);
  const finalYaw=before.yaw-(100*64*.0023),dx=after.x-before.x,dz=after.z-before.z,travel=Math.hypot(dx,dz);
  assert((dx*-Math.sin(finalYaw)+dz*-Math.cos(finalYaw))/travel>.99, 'Movement follows the expected heading after continuous turns');
  assert(await evaluate(`Math.abs(Number(document.querySelector('[data-minimap-player]').dataset.yaw)-(${before.yaw})+(100*64*.0023))<.01`),'Minimap heading follows continuous mouse turns');
  assert(await evaluate(`Math.abs(Number(document.querySelector('[data-minimap-player]').dataset.worldX)-Number(document.querySelector('.fps-game').dataset.playerX))<.01`),'Minimap position follows movement');
  await screenshot('minimap-turn');
  await key('Escape','Escape'); await wait(phase('paused'));
  assert.equal(await evaluate('!!document.pointerLockElement'),false,'Escape releases mouse');
  // Denied capture must never fall through into unlocked desktop play.
  await evaluate(`window.realCapture=HTMLCanvasElement.prototype.requestPointerLock;HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new DOMException('Denied for test','NotAllowedError'))}`);
  await click(button('Resume exercise'));await wait(`!!document.querySelector('.fps-capture-error')`);
  assert(await evaluate(phase('paused')));assert.equal(await evaluate('!!document.pointerLockElement'),false);
  await evaluate('HTMLCanvasElement.prototype.requestPointerLock=window.realCapture');
  await evaluate(`window.pointerEvents=[];for(const type of ['pointerdown','pointermove','pointerup','blur'])window.addEventListener(type,e=>{window.pointerEvents.push({type:e.type,pointer:e.pointerType,target:e.target.tagName});window.pointerEvents=window.pointerEvents.slice(-20)},true)`);
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const resume=await point(button('Resume exercise'));
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...resume,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(phase('playing'));assert.equal(await evaluate('!!document.pointerLockElement'),false,'Real touch can play without locking a mouse');
  const touchYaw=await evaluate(`Number(document.querySelector('[data-minimap-player]').dataset.yaw)`),touchPoint=await point(`document.querySelector('.fps-game canvas')`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchPoint,id:2}]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchPoint.x+40,y:touchPoint.y,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`Math.abs(Number(document.querySelector('[data-minimap-player]').dataset.yaw)-(${touchYaw}))>.03`);
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:touchPoint.x+80,y:touchPoint.y});
  await wait(phase('paused'));assert.equal(await evaluate('!!document.pointerLockElement'),false,'Switching from touch to mouse requires a new capture gesture');
  await click(button('Resume exercise'));await wait(phase('playing'));assert(await evaluate('!!document.pointerLockElement'));
  // Lose native lock while suppressing its notification; the frame guard must still pause.
  await evaluate(`document.addEventListener('pointerlockchange',event=>event.stopImmediatePropagation(),{capture:true,once:true});document.exitPointerLock()`);
  await wait(phase('paused'));assert.equal(await evaluate('!!document.pointerLockElement'),false);
  await screenshot('continuous-turn');
  assert.deepEqual(errors, []);
  console.log('PASS: coarse/VM primary-pointer regression, denied capture stays paused, real touch drag and mouse handoff, capture-loss frame guard, standard capture requested, true pointer lock, >2 continuous turns with fixed edge coordinates, heading verified by movement, Escape releases capture. Physical VM mouse delivery requires user confirmation.');
} catch(error){console.log(await evaluate(`({phase:document.querySelector('.fps-game')?.dataset.phase,message:document.querySelector('.fps-capture-error')?.textContent,events:window.pointerEvents})`));throw error;} finally {ws.close();await fetch(`${chrome}/json/close/${tab.id}`);}
