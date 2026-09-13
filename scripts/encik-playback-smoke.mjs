// Run a local Vite server and an isolated Chrome with --remote-debugging-port=9331.
// No browser automation dependency or remote map requests are needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin = process.env.FPS_APP_ORIGIN || 'http://127.0.0.1:5175';
const chrome = process.env.FPS_CHROME_ORIGIN || 'http://127.0.0.1:9331';
const output = new URL('../.cache/encik-playback/', import.meta.url); await fs.mkdir(output, { recursive: true });
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
try {
 await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
 await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 await evaluate(`(()=>{
   window.__encikQA={starts:0,stops:0,tts:0};
   const start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop;
   AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>1)window.__encikQA.starts++;return start.apply(this,args)};
   AudioBufferSourceNode.prototype.stop=function(...args){if(this.buffer?.duration>1)window.__encikQA.stops++;return stop.apply(this,args)};
   if(window.speechSynthesis) { const speak=speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak=(...args)=>{window.__encikQA.tts++;return speak(...args)}; }
 })()`);
 await wait(`!![...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Marina FPS')`);
 await click(`[...document.querySelectorAll('button')].find(b=>b.querySelector('strong')?.textContent==='Marina FPS')`);
 await wait(phase('ready'));
 await click(button('Watch AI play')); await wait(phase('playing'));
 await wait('window.__encikQA.starts>0');
 const firstStops=await evaluate('window.__encikQA.stops');
 await click(`document.querySelector('[aria-label="Mute Encik voice"]')`);
 await wait(`window.__encikQA.stops>${firstStops}`);
 assert(await evaluate(`document.querySelectorAll('.fps-comms-entry.channel-radio').length>0`));
 assert.equal(await evaluate('window.__encikQA.tts'),0);
 // Reset, mute all sound before play, and verify captions without recorded playback.
 await click(`document.querySelector('[aria-label="Reset FPS exercise"]')`); await wait(phase('ready'));
 await click(`document.querySelector('[aria-label="Enable Encik voice"]')`);
 await click(`document.querySelector('[aria-label="Mute range sound"]')`);
 const mutedStarts=await evaluate('window.__encikQA.starts');
 await click(button('Watch AI play')); await wait(phase('playing'));
 await wait(`document.querySelectorAll('.fps-comms-entry.channel-radio').length>0`);
 await delay(1000); assert.equal(await evaluate('window.__encikQA.starts'),mutedStarts);
 // Fresh unmuted start, then pause while the recording is active.
 await click(`document.querySelector('[aria-label="Reset FPS exercise"]')`); await wait(phase('ready'));
 if(await evaluate(`!!document.querySelector('[aria-label="Enable range sound"]')`)) await click(`document.querySelector('[aria-label="Enable range sound"]')`);
 if(await evaluate(`!!document.querySelector('[aria-label="Enable Encik voice"]')`)) await click(`document.querySelector('[aria-label="Enable Encik voice"]')`);
 await click(button('Watch AI play')); await wait(`window.__encikQA.starts>${mutedStarts}`);
 const pauseStops=await evaluate('window.__encikQA.stops');
 await key('Escape','Escape'); await wait(phase('paused')); await wait(`window.__encikQA.stops>${pauseStops}`);
 const requests=await evaluate(`performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('/audio/encik/'))`);
 assert(requests.some(n=>n.endsWith('.mp3')));
 assert.equal(voiceApiRequests,0); assert.equal(mapRequests,0);
 assert.deepEqual(errors,[]);
 await screenshot('recorded-callouts-paused');
 console.log(JSON.stringify({result:'PASS: real recorded playback, voice mute, master mute, pause cancellation, subtitles and no browser TTS',audit:await evaluate('window.__encikQA'),recordingRequests:requests.length}));
} catch(error) {console.log(errors); await screenshot('playback-failure'); throw error;}
finally {ws.close(); await fetch(`${chrome}/json/close/${tab.id}`);}
