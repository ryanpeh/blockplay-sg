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
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await wait(phase('ready'));
  await click(`document.querySelector('.fps-debug-panel summary')`);
  await click(`document.querySelectorAll('.fps-debug-options button')[2]`);
  if (!await evaluate(`document.querySelector('.fps-debug-panel input').checked`)) await click(`document.querySelector('.fps-debug-panel input')`);
  await screenshot('debug-settings');
  await click(button('Enter range')); await wait(phase('playing'));
  assert.equal(await evaluate(`Number(document.querySelector('.fps-game').dataset.health)`),1000);
  await screenshot('rifle-hip');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'right',clickCount:1});
  await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.98`);
  assert.equal(await evaluate(`document.querySelector('.fps-viewport canvas').dataset.weaponVisible`),'true');
  await screenshot('rifle-ads');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'right',clickCount:1});
  await delay(500);
  await evaluate(`document.dispatchEvent(new MouseEvent('mousemove',{movementY:-400}))`);
  const initial=await evaluate(`parseFloat(document.querySelector('.fps-weapon-hud').style.getPropertyValue('--fps-spread'))`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'left',clickCount:1});await delay(1400);
  const spread=await evaluate(`parseFloat(document.querySelector('.fps-weapon-hud').style.getPropertyValue('--fps-spread'))`);
  assert(spread>initial+3,`Sustained fire spreads crosshair: ${initial} -> ${spread}`);
  await screenshot('sustained-fire');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'left',clickCount:1});
  await evaluate(`window.reloadStages=[];window.reloadObserver=new MutationObserver(()=>{const stage=document.querySelector('.fps-viewport canvas').dataset.reloadStage;if(stage&&!window.reloadStages.includes(stage))window.reloadStages.push(stage)});window.reloadObserver.observe(document.querySelector('.fps-viewport canvas'),{attributes:true,attributeFilter:['data-reload-stage']})`);
  await key('r','KeyR'); await wait(`document.querySelector('.fps-viewport canvas').dataset.reloadStage==='MAG OUT'`); await screenshot('rifle-mag-out');
  await wait(`${ammo}===30`);
  assert((await evaluate('window.reloadStages')).includes('MAG IN'));
  assert((await evaluate('window.reloadStages')).includes('SEAT MAG'));
  await delay(1300);const recovered=await evaluate(`parseFloat(document.querySelector('.fps-weapon-hud').style.getPropertyValue('--fps-spread'))`);assert(recovered<spread-3);
  await key('2','Digit2'); await wait(`${ammo}===60`);
  await evaluate(`document.dispatchEvent(new MouseEvent('mousemove',{movementY:400}))`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'right',clickCount:1});
  await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.98`);await screenshot('support-ads');
  assert.equal(await evaluate(`document.querySelector('.fps-viewport canvas').dataset.weaponVisible`),'true');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'right',clickCount:1});
  await evaluate(`document.dispatchEvent(new MouseEvent('mousemove',{movementY:-450}))`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:550,button:'left',clickCount:1});await wait(`${ammo}===0`,20000);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:550,button:'left',clickCount:1});
  await evaluate('window.reloadStages=[]');await key('r','KeyR');await wait(`document.querySelector('.fps-viewport canvas').dataset.reloadStage==='MAG OUT'`);await screenshot('support-mag-out');
  await wait(`${ammo}===60`);assert((await evaluate('window.reloadStages')).includes('CHAMBER'));
  await key('Escape','Escape');await wait(phase('paused'));
  await screenshot('paused-debug');
  assert.deepEqual(errors,[]);console.log('PASS: LAN HTTP startup, 10x HP, both visible ADS optics, sustained-fire bloom/recovery, tactical and empty staged reloads.');
} catch(e) {console.log(errors);await screenshot('failure').catch(()=>{});throw e;}
finally {ws.close(); await fetch(`${chrome}/json/close/${tab.id}`);}
