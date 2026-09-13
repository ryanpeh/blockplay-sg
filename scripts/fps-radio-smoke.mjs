// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9228.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9228';
const output = new URL('../.cache/fps-radio/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
 await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await wait(`!![...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Marina FPS')`);
 await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Marina FPS')`);
 await wait(phase('ready'));
 await click(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Mute Encik voice')`);
 await click(button('Watch AI play')); await wait(phase('playing'));
 await wait(`document.querySelector('.fps-comms-entry.channel-radio')?.textContent.includes('Encik · AI')`);
 await wait(`!!document.querySelector('.fps-comms-entry.channel-kills')`,25000);
 assert(await evaluate(`document.querySelector('.fps-comms').textContent.includes('AI pilot')`));
 await screenshot('radio-ai-playing');
 await key('Escape','Escape'); await wait(phase('paused'));
 await click(button('Speech'));
 assert.equal(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-kills').length`),0);
 assert(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-radio').length>0`));
 await click(button('Kills'));
 assert.equal(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-radio').length`),0);
 assert(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-kills').length>0`));
 await click(button('All'));
 await click(`document.querySelector('[aria-label="Expand comms history"]')`);
 assert(await evaluate(`document.querySelector('.fps-comms').classList.contains('is-expanded')`));
 await screenshot('radio-history');
 await click(`document.querySelector('[aria-label="Collapse comms history"]')`);
 await click(button('Watch AI play')); await wait(phase('playing'));
 await wait(phase('complete'),90000);
 assert.equal(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-kills').length`),8);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await evaluate(`document.querySelector('.fps-comms').scrollIntoView({block:'center'})`);
 await screenshot('radio-mobile');
 assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'));
 assert.deepEqual(errors,[]); console.log('PASS: muted AI callouts still logged, all eight kills retained, channel filters/history controls work, and mobile has no horizontal overflow.');
} catch(error) {console.log(errors); await screenshot('pilot-failure'); throw error;}
finally {ws.close(); await fetch(`${chrome}/json/close/${tab.id}`);}
