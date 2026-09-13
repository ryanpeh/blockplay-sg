// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9228.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.EXPEDITION_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.EXPEDITION_CHROME_ORIGIN || 'http://127.0.0.1:9228';
const output = new URL('../.cache/expedition-ui-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Open world')`);
  const saved = await evaluate(`localStorage.getItem('blockplay.armory.v1')`);
  await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Open world')`);
  await wait(phase('ready'), 30000);
  await wait(`document.querySelector('.expedition-game').dataset.botCount==='4'`);
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.zone`),'marina-bay');
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.lootCount`),'8');
  assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),1);
  assert.equal(await evaluate(`document.querySelectorAll('.expedition-network>div').length`),3);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.fps-toolbar h3')).color`),'rgb(220, 231, 215)','Toolbar title has readable contrast');
  await evaluate(`window.expeditionCanvas=document.querySelector('.expedition-game canvas')`);
  await click(`document.querySelector('[data-map-location="queenstown"]')`);
  await wait(`document.querySelector('.singapore-route-details').textContent.includes('Marina Bay → Raffles Place → Queenstown')`);
  assert.equal(await evaluate(`document.querySelector('[data-map-active]').dataset.mapActive`),'marina-bay');
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.zone`),'marina-bay','Planning does not travel');
  assert(await evaluate(`document.querySelector('.expedition-game canvas')===window.expeditionCanvas`),'Planning preserves the renderer and expedition');
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.lootCount`),'8');
  assert.equal(await evaluate(`document.querySelectorAll('[data-map-link]').length`),2);
  await screenshot('expedition-ready');
  await click(button('Enter district')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement'),'Entry captures pointer');
  const before = await evaluate(`({...document.querySelector('.expedition-game').dataset})`);
  await key('w','KeyW',500);
  const after = await evaluate(`({...document.querySelector('.expedition-game').dataset})`);
  assert(Math.hypot(Number(after.playerX)-Number(before.playerX),Number(after.playerZ)-Number(before.playerZ))>1,'Walking changes position');
  const rounds = await evaluate(ammo);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:500,button:'left',clickCount:1}); await delay(250);
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:700,y:500,button:'left',clickCount:1}); await delay(150);
  assert(await evaluate(ammo)<rounds,'Firing consumes ammunition');
  await screenshot('expedition-playing');
  await key('Escape','Escape'); await wait(phase('paused')); await wait('!document.pointerLockElement');
  assert(await evaluate(`document.querySelector('.fps-start-card p').textContent.includes('Patrols remain active')`));
  await click(`document.querySelector('[aria-label="Fullscreen expedition"]')`);
  await wait(`document.fullscreenElement===document.querySelector('.expedition-game')`);
  assert(await evaluate(`document.querySelector('.expedition-game').getBoundingClientRect().width>=innerWidth-1`));
  await screenshot('expedition-fullscreen-menu');
  await click(button('Resume expedition')); await wait(phase('playing'));
  await screenshot('expedition-fullscreen-playing');
  await key('f','KeyF'); await wait(phase('paused')); await wait(`!document.fullscreenElement`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('.expedition-game').scrollIntoView({block:'start'})`);
  await screenshot('expedition-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Mobile fits viewport');
  assert(await evaluate(`document.querySelectorAll('.expedition-network>div').length===3`));
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  assert.equal(await evaluate(`localStorage.getItem('blockplay.armory.v1')`),saved,'Expedition does not write permanent Armory');
  await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='LAN arena')`);
  await wait(`!!document.querySelector('.lan-lobby')`);
  assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),0,'Leaving expedition disposes renderer');
  assert.equal(await evaluate(`!!document.pointerLockElement`),false);
  // The normal map still opens regional exploration; a new expedition starts there.
  await click(`document.querySelector('[data-map-location="queenstown"]')`);
  await wait(`!!document.querySelector('.queenstown-game')`);
  await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Open world')`);
  await wait(phase('ready'),30000);
  await wait(`document.querySelector('.expedition-game').dataset.botCount==='3'`);
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.zone`),'queenstown');
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.lootCount`),'6');
  assert.equal(await evaluate(`document.querySelector('[data-map-active]').dataset.mapActive`),'queenstown');
  await evaluate(`document.querySelector('[data-map-location="marina-bay"]').focus()`);
  await key('Enter','Enter');
  await wait(`document.querySelector('.singapore-route-details').textContent.includes('Queenstown → Raffles Place → Marina Bay')`);
  assert.equal(await evaluate(`document.querySelector('.expedition-game').dataset.zone`),'queenstown','Keyboard route selection preserves the active district');
  assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),1);
  assert.equal(await evaluate(`localStorage.getItem('blockplay.armory.v1')`),saved);
  await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='LAN arena')`);
  await wait(`!!document.querySelector('.lan-lobby')`);
  assert.equal(await evaluate(`document.querySelectorAll('canvas').length`),0);
  assert.equal(mapRequests,0,'No live map requests'); assert.deepEqual(errors,[],'No browser errors');
  console.log('PASS: Open world route, Marina with one canvas/eight supplies/four bots, three-zone graph, map route planning without scene resets, selected-district starts, keyboard map access, pointer capture, movement, firing, menu, native fullscreen, mobile layout, persistent Armory unchanged and renderer cleanup.');
  console.log('Screenshots: .cache/expedition-ui-smoke/');
} catch(error) { await screenshot('expedition-failure'); throw error; }
finally { ws.close(); await fetch(`${chrome}/json/close/${tab.id}`); }
