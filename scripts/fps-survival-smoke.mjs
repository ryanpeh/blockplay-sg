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
 await send('Runtime.enable');await send('Page.enable');
 await send('Page.navigate',{url:origin+'/connection-check.html'});await delay(500);
 await evaluate(`(async()=>{
  const {createFpsEngine}=await import('/src/game/fps-engine.ts');const {createSoloSession}=await import('/src/game/lan-peer.ts');
  sessionStorage.setItem('blockplay.fps-debug.v1',JSON.stringify({healthMultiplier:10,regeneration:true}));
  document.body.innerHTML='<button id="start">Enter test arena</button><div id="stage" style="width:1000px;height:650px"></div>';
  const session=createSoloSession('Survival test'); const {createProfile}=await import('/src/game/armory-state.ts');
  window.testEngine=createFpsEngine(document.querySelector('#stage'),hud=>window.testHud=hud,{arena:{session,profile:createProfile(),botCount:0,initialVitals:{health:25}}});
  document.querySelector('#start').onclick=()=>window.testEngine.start();
 })()`);
 await wait(`window.testHud?.phase==='ready'`);await delay(300);
 assert.equal(await evaluate('window.testHud.health'),250,'Authoritative initial health scales to 10x');
 await click(`document.querySelector('#start')`);await wait(`window.testHud.phase==='playing'`);
 await delay(1500);const regenerated=await evaluate('window.testHud.health');assert(regenerated>330&&regenerated<550,`Health regenerates through simulation: ${regenerated}`);
 await key('Escape','Escape');await wait(`window.testHud.phase==='paused'`);await delay(200);
 const paused=await evaluate('window.testHud.health');await delay(600);assert.equal(await evaluate('window.testHud.health'),paused,'Menu pauses regeneration');
 await evaluate('window.testEngine.configureDebug({healthMultiplier:5,regeneration:true})');await delay(200);
 assert.equal(await evaluate('window.testHud.maxHealth'),500);
 assert(Math.abs(await evaluate('window.testHud.health')-paused/2)<.1);
 await evaluate('window.testEngine.refillHealth()');await delay(250);assert.equal(await evaluate('window.testHud.health'),500);
 await evaluate('window.testEngine.reset()');await delay(250);assert.equal(await evaluate('window.testHud.health'),500,'Reset preserves boosted maximum');
 await evaluate('window.testEngine.dispose()');
 assert.deepEqual(errors,[]);console.log('PASS: solo authoritative 10x health, real regeneration, pause, change to 5x, refill and reset.');
} finally {ws.close(); await fetch(`${chrome}/json/close/${tab.id}`);}
