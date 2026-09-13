// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9224.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9224';
const output = new URL('../.cache/vehicle-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
const vehicle = kind => `document.querySelector('.fps-game')?.dataset.vehicle===${JSON.stringify(kind)}`;
const number = name => `Number(document.querySelector('.fps-game').dataset.${name})`;
try {
  await send('Runtime.enable'); await send('Network.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await wait(`!!${fpsMode}`);
  // Veteran fixture supplies level access. The wrap itself is bought and equipped through UI.
  await evaluate(`(()=>{localStorage.removeItem('blockplay.armory.v1');location.reload()})()`); await delay(1000); await wait(`!!${fpsMode}`);
  await evaluate(`(()=>{const p=${wallet};p.xp=800;localStorage.setItem('blockplay.armory.v1',JSON.stringify(p));location.reload()})()`); await delay(1000); await wait(`!!${fpsMode}`);
  await openShop(); await category('vehicleSkin'); await choose('paint-jungle'); await click(action); await click(action);
  await wait(`${wallet}.vehicleSkins.car==='paint-jungle'`); assert.equal(await evaluate(`${wallet}.vehicleSkins.helicopter`),'paint-issued');
  await click(button('Falcon 01')); await click(action); await wait(`${wallet}.vehicleSkins.helicopter==='paint-jungle'`);
  assert.equal(await evaluate(`${wallet}.credits`),950,'One wrap purchase fits both vehicles');
  await delay(1000); await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`); await screenshot('helicopter-shop');
  await click(button('Deploy to Marina FPS')); await wait(phase('ready')); await click(button('Enter range')); await wait(phase('playing'));
  await key('e','KeyE'); await wait(vehicle('car')); await screenshot('utility-driving');
  const x = await evaluate(number('playerX'));
  await key('w','KeyW',1100); await delay(200); assert(await evaluate(number('playerX'))>x+2,'Car drives along its heading');
  assert(await evaluate(number('speed'))>0,'Vehicle HUD reports movement');
  await key('Escape','Escape'); await wait(phase('paused')); const parked = await evaluate(number('playerX')); await delay(700); assert.equal(await evaluate(number('playerX')),parked,'Pause freezes vehicle physics');
  await click(button('Resume exercise')); await wait(phase('playing')); await key(' ','Space',600); await key('e','KeyE'); await wait(vehicle('on-foot'));
  assert(await evaluate('!!document.pointerLockElement'),'Dismount retains pointer capture');
  assert(await evaluate(`!!document.querySelector('[data-minimap-marker=car]')`),'Parked car returns to the map after driving');
  assert(await evaluate(`Math.abs(Number(document.querySelector('[data-minimap-player]').dataset.worldX)-Number(document.querySelector('.fps-game').dataset.playerX))<.01`),'Minimap follows vehicle movement and dismount');
  // Approach around the south side of the car, range barriers and helicopter collider.
  await key('Escape','Escape'); await wait(phase('paused')); await click(`document.querySelector('[aria-label="Reset FPS exercise"]')`); await wait(phase('ready'));
  await click(button('Enter range')); await wait(phase('playing'));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS'}); await wait(`${number('playerZ')}>77`); await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS'});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA'}); await wait(`${number('playerX')}<-61.5`); await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA'});
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW'});await wait(`document.querySelector('.fps-interact-prompt')?.textContent.includes('Pilot')`);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW'}); await key('e','KeyE');
  await wait(vehicle('helicopter')); await screenshot('helicopter-ground');
  await key(' ','Space',2100); await delay(200); assert(await evaluate(number('altitude'))>5,'Helicopter takes off');
  await key('e','KeyE'); assert(await evaluate(vehicle('helicopter')),'Airborne dismount is prevented');
  const z = await evaluate(number('playerZ')); await key('w','KeyW',1200); await delay(350); assert(await evaluate(number('playerZ'))<z-3,'Helicopter cruises forward');
  await screenshot('helicopter-flight');
  // Reverse back over the promenade before descending; the water cannot be a landing zone.
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'s',code:'KeyS'}); await wait(`${number('playerZ')}>63`,10000); await send('Input.dispatchKeyEvent',{type:'keyUp',key:'s',code:'KeyS'});
  await delay(2500); await key('c','KeyC',3800); await delay(800);
  await wait(`${number('altitude')}<0.2`,10000); await key('e','KeyE'); await wait(vehicle('on-foot'));
  assert(await evaluate('!!document.querySelector(".fps-ammo")'),'Weapon view returns after landing and dismount');
  await key('Escape','Escape'); await wait(phase('paused')); await click(button('Open armory · change equipment →'));
  await wait(`!!document.querySelector('.armory')`); assert.equal(await evaluate('document.querySelectorAll("canvas").length'),1);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true}); await category('vehicleSkin'); await click(button('Falcon 01')); await screenshot('vehicle-shop-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Vehicle shop fits mobile');
  assert.equal(mapRequests,0); assert.deepEqual(errors,[]); console.log('PASS: vehicle wrap purchase/equipment, car enter/drive/brake/pause/exit, helicopter approach/takeoff/cruise/land/exit, airborne exit guard, persistent pointer lock, weapon restoration, mobile and cleanup.');
} catch(error) { await screenshot('vehicle-failure'); throw error; }
finally {ws.close();await fetch(`${chrome}/json/close/${tab.id}`);}
