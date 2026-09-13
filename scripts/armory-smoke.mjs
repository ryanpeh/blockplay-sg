// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9224.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9224';
const output = new URL('../.cache/armory-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(`!!${fpsMode}`);
  await evaluate(`localStorage.removeItem('blockplay.armory.v1');location.reload()`); await delay(1000); await wait(`!!${fpsMode}`);
  await openShop(); await wait(`!!document.querySelector('.armory-preview canvas')`);
  assert(await evaluate(`${action}.disabled && ${action}.textContent.includes('level 3')`), 'New recruits cannot buy Vanguard');
  await click(button('+250 demo tokens'));
  assert(await evaluate(`${action}.disabled`), 'Token top-ups never bypass levels');
  await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`); await screenshot('recruit-lock');
  // Saved veteran fixture supplies XP only. All inventory changes below use real shop controls.
  await evaluate(`(()=>{const p=${wallet};p.xp=800;p.tokens=300;localStorage.setItem('blockplay.armory.v1',JSON.stringify(p));location.reload()})()`);
  await delay(1000); await wait(`!!${fpsMode}`); await openShop();
  await click(action); await wait(`${wallet}.tokens===60`); assert(await evaluate(`${action}.textContent.includes('Equip on SAR')`));
  await click(action); await wait(`${wallet}.guns[0].variant==='sar-vanguard'`); assert(await evaluate(`${action}.disabled`));
  await category('attachment'); await choose('mag-quick'); await click(action); await click(action); await wait(`${wallet}.guns[0].attachments.magazine==='mag-quick'`);
  await category('armor'); await choose('plate-ceramic'); await click(action); await click(action); await wait(`${wallet}.plate==='plate-ceramic'`);
  assert.equal(await evaluate(`${wallet}.credits`), 50);
  await choose('rig-lbs'); assert(await evaluate(`${action}.disabled && ${action}.textContent.includes('950')`), 'Insufficient credit balance disables buying');
  await choose('plate-ceramic'); await delay(1000); await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`); await screenshot('ceramic-armor');
  await category('skin'); await choose('skin-gold'); assert(await evaluate(`${action}.disabled`)); await click(button('+250 demo tokens')); await click(action); await click(action);
  await wait(`${wallet}.guns[0].skin==='skin-gold'`); assert.equal(await evaluate(`${wallet}.tokens`), 190);
  await delay(1500); await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`); await screenshot('gold-loadout');
  const saved = await evaluate(wallet);
  await send('Page.reload'); await delay(1000); await wait(`!!${fpsMode}`); await openShop(); assert.deepEqual(await evaluate(wallet), saved, 'Wallet, XP, ownership and loadout survive reload');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('.armory').scrollIntoView({block:'start'})`); await screenshot('shop-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Shop fits a mobile viewport');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await click(button('Deploy to Marina FPS')); await wait(phase('ready'));
  assert(await evaluate(`document.querySelector('.fps-loadout').textContent.includes('Vanguard')`));
  assert.equal(await evaluate(`Number(document.querySelector('.fps-game').dataset.armor)`), 75);
  await click(button('Counter-fire · +100 CR')); await wait(phase('ready'));
  await click(button('Enter range')); await wait(phase('playing')); assert(await evaluate('!!document.pointerLockElement'));
  await wait(`${ammo}===36`); await screenshot('gold-fps');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1800, y: 1400 });
  assert(await evaluate('!!document.pointerLockElement'), 'Pointer stays locked when movement crosses the viewport bounds');
  // Return to spawn aim after a confinement check; the outside movement may turn the camera.
  await key('Escape', 'Escape'); await wait(phase('paused')); assert(!(await evaluate('!!document.pointerLockElement')));
  const original = `HTMLCanvasElement.prototype.requestPointerLock`;
  await evaluate(`window.__originalLock=${original};${original}=()=>Promise.reject(new Error('Blocked for regression test'))`);
  await click(button('Resume exercise')); await delay(500);
  assert(await evaluate(phase('paused')), 'Denied capture must never start desktop gameplay');
  assert(await evaluate(`document.querySelector('.fps-capture-error')?.textContent.includes('capture was blocked')`));
  await evaluate(`${original}=window.__originalLock;delete window.__originalLock`);
  await click(button('Resume exercise')); await wait(phase('playing'));
  await wait(`Number(document.querySelector('.fps-game').dataset.armor)<75`, 15000);
  const health = await evaluate(`Number(document.querySelector('.fps-game').dataset.health)`), armor = await evaluate(`Number(document.querySelector('.fps-game').dataset.armor)`);
  assert(health > 82 && health < 100, 'Ceramic absorbs part of the first 18-damage hit'); assert(armor < 75 && armor > 50);
  await key('Escape', 'Escape'); await wait(phase('paused'));
  const frozen = await evaluate(`document.querySelector('.fps-game').dataset.health`); await delay(3200); assert.equal(await evaluate(`document.querySelector('.fps-game').dataset.health`), frozen, 'Pause freezes counter-fire');
  await click(button('Resume exercise')); await wait(phase('playing'));
  await wait(phase('defeated'), 45000); assert.equal(await evaluate(`${wallet}.credits`), 50, 'An uncleared drill grants no completion credits');
  assert.equal(await evaluate(`Number(document.querySelector('.fps-game').dataset.health)`), 0);
  await screenshot('counterfire-defeat'); await click(button('Reset exercise')); await wait(phase('ready'));
  assert.equal(await evaluate(`Number(document.querySelector('.fps-game').dataset.armor)`), 75, 'Each drill restores armor');
  await click(button('Open armory · change equipment →')); await wait(`!!document.querySelector('.armory')`);
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 1, 'Leaving range removes its renderer');
  assert.equal(mapRequests, 0); assert.deepEqual(errors, []);
  console.log('PASS: level locks, demo wallet, purchases, equip, insufficient funds, skins, armor previews, persistence, mobile layout, gameplay stats, strict pointer capture / denial / Escape, counter-fire absorption and defeat, reset, cleanup.');
} catch(error) { await screenshot('shop-failure'); throw error; }
finally { ws.close(); await fetch(`${chrome}/json/close/${tab.id}`); }
