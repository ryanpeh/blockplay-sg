// Opt-in LIVE GPT-Live-1 test. Injects a local spoken WAV as microphone input;
// no human microphone is captured. Requires server + Vite + Chrome debugging.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const fixture = process.argv[2];
if (!fixture) throw new Error('Usage: node scripts/smoke-adventure-voice.mjs /absolute/path/request.wav');
const wav = (await readFile(fixture)).toString('base64');
const chrome = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
const origin = process.env.REGION_APP_ORIGIN || 'http://127.0.0.1:5173';
const delay = ms => new Promise(r => setTimeout(r, ms));
async function connect(url) {
  const ws = new WebSocket(url), pending = new Map(); let next = 0;
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { clearTimeout(p.timer); pending.delete(m.id); m.error ? p.reject(new Error('CDP command failed')) : p.resolve(m.result); } };
  return { send: (method, params = {}) => new Promise((resolve, reject) => { const id = ++next, timer = setTimeout(() => reject(new Error('CDP timeout')), 40000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); }), close: () => ws.close() };
}
const browser = await connect((await (await fetch(`${chrome}/json/version`)).json()).webSocketDebuggerUrl);
let target, page;
try {
  target = (await browser.send('Target.createTarget', { url: 'about:blank' })).targetId;
  page = await connect((await (await fetch(`${chrome}/json`)).json()).find(t => t.id === target).webSocketDebuggerUrl);
  const evaluate = async expression => { const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }); if (r.exceptionDetails) throw new Error('Voice browser evaluation failed'); return r.result.value; };
  await page.send('Page.enable'); await page.send('Page.navigate', { url: origin }); await delay(2300);
  await evaluate(`(async()=>{
    window.__events=[];window.__sent=[];window.__peak=0;window.__approvedPeak=0;window.__audioChunks=[];
    const RealPeer=window.RTCPeerConnection;
    window.RTCPeerConnection=class extends RealPeer {
      constructor(...args){super(...args);this.addEventListener('track',e=>{
        const stream=new MediaStream([e.track]);window.__recorder=new MediaRecorder(stream);
        window.__recorder.ondataavailable=e=>window.__audioChunks.push(e.data);window.__recorder.start(500);
        const input=window.__audioContext.createMediaStreamSource(stream),analyser=window.__audioContext.createAnalyser();input.connect(analyser);
        window.__meter=setInterval(()=>{const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);const peak=Math.max(...data.map(Math.abs));window.__peak=Math.max(window.__peak,peak);if(!document.querySelector('.adventure-companion audio').muted)window.__approvedPeak=Math.max(window.__approvedPeak,peak);},100);
      });}
      createDataChannel(...args){const channel=super.createDataChannel(...args);const send=channel.send.bind(channel);channel.send=value=>{window.__sent.push(JSON.parse(value));send(value)};channel.addEventListener('message',e=>{const event=JSON.parse(e.data);window.__events.push({type:event.type,delta:event.delta,code:event.error?.code,client_event_id:event.client_event_id,delegation:event.delegation});});return channel;}
    };
    window.__audioContext=new AudioContext();await window.__audioContext.resume();
    const bytes=Uint8Array.from(atob(${JSON.stringify(wav)}),c=>c.charCodeAt(0));
    const buffer=await window.__audioContext.decodeAudioData(bytes.buffer);
    // Keep the input media clock running after the test phrase, like a real mic.
    // A finished synthetic source can stop Live's frame progress and defer appends.
    const padded=window.__audioContext.createBuffer(buffer.numberOfChannels,buffer.sampleRate*90,buffer.sampleRate);
    for(let channel=0;channel<buffer.numberOfChannels;channel++)padded.getChannelData(channel).set(buffer.getChannelData(channel));
    window.__source=window.__audioContext.createBufferSource();window.__source.buffer=padded;
    const destination=window.__audioContext.createMediaStreamDestination();window.__source.connect(destination);
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>destination.stream});
    document.querySelector('[aria-label="Start microphone"]').click();
  })()`);
  for (let i = 0; i < 100; i++) { if (await evaluate(`window.__events.some(e=>e.type==='session.started') || !!document.querySelector('.companion-error')`)) break; await delay(350); }
  const connected = await evaluate(`window.__events.some(e=>e.type==='session.started')`);
  if (!connected) { console.log(await evaluate(`({connected:false,error:document.querySelector('.companion-error')?.textContent,events:window.__events})`)); throw new Error('Live voice could not connect'); }
  await evaluate('window.__source.start()');
  for (let i = 0; i < 120; i++) { if (await evaluate(`document.querySelector('[data-active-objective]').dataset.activeObjective !== 'waterfront' && window.__approvedPeak > .001 && /city skyline/i.test(window.__events.filter(e=>e.type==='session.output_transcript.delta').map(e=>e.delta).join(''))`)) break; await delay(350); }
  await delay(4000);
  const result = await evaluate(`({active:document.querySelector('[data-active-objective]').dataset.activeObjective,history:document.querySelector('.companion-history').textContent,transcript:window.__events.filter(e=>e.type==='session.input_transcript.delta').map(e=>e.delta).join(''),output:window.__events.filter(e=>e.type==='session.output_transcript.delta').map(e=>e.delta).join(''),receivedAudioPeak:window.__peak,approvedAudioPeak:window.__approvedPeak,error:document.querySelector('.companion-error')?.textContent,eventTypes:[...new Set(window.__events.map(e=>e.type))],sent:window.__sent,delegations:window.__events.filter(e=>e.type==='session.delegation.created'),muted:document.querySelector('.adventure-companion audio').muted})`);
  console.log(JSON.stringify(result, null, 2));
  await evaluate(`document.querySelector('[aria-label="Stop microphone"]')?.click();if(window.__recorder?.state==='recording')window.__recorder.stop();clearInterval(window.__meter);`);
  await delay(1300);
  await mkdir('.cache/browser-checks', { recursive: true });
  const recording = await evaluate(`new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(window.__audioChunks,{type:'audio/webm'}));})`);
  await writeFile('.cache/browser-checks/adventure-live-response.webm', Buffer.from(recording, 'base64'));
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await writeFile('.cache/browser-checks/adventure-live.png', Buffer.from(shot.data, 'base64'));
  assert.equal(result.active, 'city-skyline'); assert.match(result.transcript, /closer/i); assert.ok(result.approvedAudioPeak > .001); assert.match(result.history, /updated/); assert.match(result.output, /City skyline/i); assert.equal(result.muted, false);
  console.log('PASS live synthetic spoken input → GPT-Live transcript → Astra → applied objective/minimap → GPT-Live output audio');
} finally { if (page) { try { await page.send('Runtime.evaluate', { expression: `document.querySelector('[aria-label="Stop microphone"]')?.click()` }); await delay(1500); } catch {} page.close(); } if (target) await browser.send('Target.closeTarget', { targetId: target }); browser.close(); }
