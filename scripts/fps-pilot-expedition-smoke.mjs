// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9228.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9228';
const output = new URL('../.cache/fps-pilot-expedition/', import.meta.url); await fs.mkdir(output, { recursive: true });
const fixturePath = new URL('fixture.html', output);
await fs.writeFile(fixturePath, `<!doctype html><style>body{margin:0;background:#17231e;color:white;font:16px sans-serif}#world{height:700px;width:100vw}button{font:inherit;padding:12px;margin:8px}canvas{display:block}</style><div id="world"></div><button id="enter">Enter district</button><button id="take">Take loot</button><button id="travel">Cross checkpoint</button><script type="module">
import {createFpsEngine} from '/src/game/fps-engine.ts';
import {createProfile,resolveLoadout} from '/src/game/armory-state.ts';
import {createExpeditionLoot} from '/src/game/expedition-loot.ts';
import {buildExpeditionWorld} from '/src/game/expedition-world.ts';
const original=createProfile();original.owned.push('plate-ceramic');original.plate='plate-ceramic';
window.original=JSON.stringify(original);localStorage.setItem('expedition-test-permanent',window.original);
let profile=structuredClone(original);const geometry=buildExpeditionWorld('marina-bay');
let loot,items;
for(let seed=0;seed<1000;seed++){loot=createExpeditionLoot('travel-'+seed);items=loot.enterZone({id:'marina-bay',spawn:geometry.zone.spawn,bounds:geometry.bounds,obstacles:geometry.obstacles,anchors:[{x:-103,z:94}]});if(items[0].catalogId==='sar-vanguard')break;}
geometry.dispose();window.firstLoot=items[0];window.loot=loot;window.transfers=[];
function mount(zone,spawn,checkpoint){
window.engine?.dispose();window.zone=zone;
window.engine=createFpsEngine(document.querySelector('#world'),hud=>{window.hud=hud;}, {loadout:resolveLoadout(profile),expedition:{zone,spawn,checkpoint,profile,loot,onEquipment(next){profile=next;window.fieldProfile=profile;},onTravel(transition,state){window.transfers.push({transition,state});mount(transition.to,transition.spawn,state);}}});
window.engine.setPilotDestination('raffles-place');
}
window.mountFixture=mount;
mount('marina-bay',{x:-103,z:95.5,yaw:0,pitch:0},{health:64,armor:21,weapon:1,ammunition:[{magazine:7,reserve:40,cooldown:0,reloadRemaining:0},{magazine:11,reserve:60,cooldown:0,reloadRemaining:0}]});
document.querySelector('#enter').onclick=()=>window.engine.startPilot();document.querySelector('#take').onclick=()=>window.engine.interactLoot();document.querySelector('#travel').onclick=()=>window.engine.travelZone();
</script>`);
const fixtureUrl = origin + '/@fs' + decodeURIComponent(fixturePath.pathname);
const tab = await (await fetch(`${chrome}/json/new?${encodeURIComponent(fixtureUrl)}`, { method: 'PUT' })).json();
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
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  await wait(`window.hud?.phase==='ready' && window.hud.arenaSelf && window.hud.weapon===1`);
  assert.equal(await evaluate('hud.health'),64);assert.equal(await evaluate('hud.armor'),21);assert.equal(await evaluate('hud.magazine'),11);
  await evaluate('engine.toggleEncikVoice()');
  await click(`document.querySelector('#enter')`);
  await wait(`zone==='raffles-place' && hud.phase==='playing' && hud.pilotEnabled`,30000);
  assert.equal(await evaluate('!!document.pointerLockElement'),false);
  assert.equal(await evaluate('transfers.length'),1);
  assert.equal(await evaluate('hud.encikVoice'),false,'Encik voice preference carries across districts');
  assert(await evaluate('hud.comms.some(e=>e.channel==="radio" && e.source==="Encik · AI")'),'Muted AI speech stays in history');
  assert(await evaluate('hud.comms.some(e=>e.channel==="system" && e.source==="Supplies")'),'Collected loot is recorded');
  assert(await evaluate('hud.comms.some(e=>e.channel==="system" && e.source==="Travel")'),'Travel is retained in the arrival log');
  assert(await evaluate('new Set(hud.comms.map(e=>e.id)).size===hud.comms.length'),'Carried and new messages have unique IDs');
  assert.equal(await evaluate('transfers[0].state.pilot'),true);
  assert.equal(await evaluate('transfers[0].state.pilotStrategy'),'local');
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'),1);
  assert.equal(await evaluate('hud.fieldLoot.length'),10);
  assert.equal(await evaluate('fieldProfile.guns[0].variant'),'sar-vanguard');
  assert.equal(await evaluate('localStorage.getItem("expedition-test-permanent")'),await evaluate('original'));
  await screenshot('pilot-cbd-arrival');
  await evaluate('engine.pause()'); await wait(`hud.phase==='paused' && !hud.pilotEnabled`);
  await evaluate('engine.dispose()'); assert.equal(await evaluate('document.querySelectorAll("canvas").length'),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: AI collects real field gear, crosses the planned checkpoint and resumes in CBD; player state, strategy and renderer lifecycle carry correctly.');
} catch(error){console.log(errors, await evaluate('({zone,hud,transfers})'));await screenshot('failure');throw error;}
finally{await evaluate('window.engine?.dispose();localStorage.removeItem("expedition-test-permanent")').catch(()=>{});ws.close();await fetch(`${chrome}/json/close/${tab.id}`);await fs.rm(fixturePath,{force:true});}
