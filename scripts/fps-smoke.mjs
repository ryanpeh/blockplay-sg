// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9224.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9224';
const output = new URL('../.cache/fps-smoke/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }); await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await evaluate(`localStorage.removeItem('blockplay.armory.v1');location.reload()`);
  await delay(1200);
  await wait(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina FPS'))`);
  await wait(phase('ready')); await screenshot('range-ready');
  await click(button('Enter range')); await wait(phase('playing'));
  const locked = await evaluate('!!document.pointerLockElement');
  assert(locked, 'Desktop play must capture the pointer before starting');
  await screenshot('range-playing');
  const firePoint = locked ? { x: 700, y: 550 } : await point(button('Fire'));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...firePoint, button: 'left', clickCount: 1 });
  await wait(`document.querySelector('.fps-score').textContent.startsWith('1 /')`);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...firePoint, button: 'left', clickCount: 1 });
  assert(await evaluate(`document.querySelector('.fps-score').textContent.startsWith('1 /')`), 'Initial crosshair shot must hit the center target');
  assert.equal(await evaluate(`document.querySelectorAll('[data-marker-kind=target]').length`),7,'Cleared targets disappear from minimap');
  await key('r', 'KeyR'); await wait(`!!document.querySelector('.fps-reload-track')`);
  await key('Escape', 'Escape'); await wait(phase('paused'));
  const pausedTime = await evaluate(`document.querySelector('.fps-score b').textContent`); await delay(2000);
  assert.equal(await evaluate(`document.querySelector('.fps-score b').textContent`), pausedTime, 'Pause freezes clock');
  await click(button('Resume exercise')); await wait(phase('playing')); await wait(`${ammo}===30`);
  await key('2', 'Digit2'); await wait(`${ammo}===60`);
  const beforeZ = await evaluate(`Number(document.querySelector('.fps-game').dataset.playerZ)`);
  await key('w', 'KeyW', 350); await delay(200);
  assert(await evaluate(`Number(document.querySelector('.fps-game').dataset.playerZ)`)<beforeZ, 'W advances the player');
  // Right mouse aims only under pointer lock; fallback uses the accessible Aim button.
  if (await evaluate('!!document.pointerLockElement')) await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 550, button: 'right', clickCount: 1 });
  else await click(button('Aim'));
  await wait(`!!document.querySelector('.fps-scope')`); await screenshot('range-aim');
  await key('Escape', 'Escape'); await wait(phase('paused'));
  await click(`document.querySelector('[aria-label="Reset FPS exercise"]')`); await wait(phase('ready'));
  assert(await evaluate(`document.querySelector('.fps-score').textContent.startsWith('0 /')`));
  await click(button('Enter range')); await wait(phase('playing'));
  assert(await evaluate('!!document.pointerLockElement'), 'Full drill uses captured mouse input');
  await key('1', 'Digit1'); await wait(`${ammo}===30`);
  await evaluate(`window.sawKillChain=false;window.killChainObserver=new MutationObserver(()=>{if(document.querySelector('.fps-kill-callout'))window.sawKillChain=true});window.killChainObserver.observe(document.querySelector('.fps-viewport'),{childList:true,subtree:true})`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 550, button: 'right', clickCount: 1 });
  await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.98`);
  let yaw = 0, pitch = -0.03, cleared = 0;
  for (const [x, z] of [[-44,56],[-50,57],[-38,57],[-56,62],[-32,62],[-60,55],[-26,55],[-14,64]]) {
    // Real spread rewards aiming; leave enough ammunition for a short burst at each target.
    if (await evaluate(ammo) < 8) {
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 550, button: 'right', clickCount: 1 });
      await key('r', 'KeyR'); await wait(`${ammo}===30`);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 550, button: 'right', clickCount: 1 });
      await wait(`Number(document.querySelector('.fps-viewport canvas').dataset.aimProgress)>.98`);
    }
    const nextYaw = Math.atan2(-(x + 44), -(z - 68)), nextPitch = Math.atan2(-0.32, Math.hypot(x + 44, z - 68));
    const dx = -(nextYaw - yaw) / 0.0013, dy = -(nextPitch - pitch) / 0.0013;
    // Send look deltas through the same document input listener, without altering game state.
    await evaluate(`(()=>{const event=new MouseEvent('mousemove');Object.defineProperties(event,{movementX:{value:${dx}},movementY:{value:${dy}}});document.dispatchEvent(event)})()`);
    yaw = nextYaw; pitch = nextPitch; await delay(250);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 550, button: 'left', clickCount: 1 });
    cleared++;
    await wait(`document.querySelector('.fps-score').textContent.startsWith('${cleared} /')`, 5000);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 550, button: 'left', clickCount: 1 });
    await delay(500);
  }
  await wait(phase('complete')); await screenshot('range-complete');
  assert(await evaluate(`JSON.parse(localStorage.getItem('blockplay.armory.v1')).xp>=300`), 'Kills and completion award persisted XP');
  assert(await evaluate(`!!document.querySelector('.fps-level-up')`), 'Completed drill announces level up');
  assert(await evaluate(`window.sawKillChain || !!document.querySelector('.fps-final-callout')`), 'Rapid target eliminations announce multi-kills, even when a later reload breaks the chain');
  await evaluate('window.killChainObserver.disconnect()');
  assert(await evaluate(`document.querySelector('.fps-start-card h2').textContent==='Eight for eight.'`));
  await click(button('Reset exercise')); await wait(phase('ready'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('range-mobile');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'No mobile horizontal overflow');
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Marina 3D'))`);
  await wait(`!!document.querySelector('.marina-game canvas')`);
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 1, 'Mode exit removes FPS canvas');
  assert.equal(mapRequests, 0, 'No map API requests'); assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('PASS: asset loading, center-target hit, ammo, reload/pause, weapon switching, movement, aim, full eight-target completion, reset, mobile layout, mode cleanup; zero map requests.');
  console.log('Screenshots: .cache/fps-smoke/');
} catch (error) { await screenshot('range-failure'); throw error; }
finally { ws.close(); await fetch(`${chrome}/json/close/${tab.id}`); }
