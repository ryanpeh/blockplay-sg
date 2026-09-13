// Uses an isolated Chrome tab. Default is mocked API/voice transport; --live tests Luna text.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.env.REGION_APP_ORIGIN || 'http://127.0.0.1:5173';
const chrome = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
const live = process.argv.includes('--live');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect(url) {
  const ws = new WebSocket(url), pending = new Map(); let id = 0;
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const listeners = [];
  ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); clearTimeout(p.timer); m.error ? p.reject(new Error('CDP failed')) : p.resolve(m.result); } else listeners.forEach(fn => fn(m)); };
  return { listeners, send: (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; const timer = setTimeout(() => reject(new Error('CDP timeout')), 40000); pending.set(n, { resolve, reject, timer }); ws.send(JSON.stringify({ id: n, method, params })); }), close: () => ws.close() };
}
const browser = await connect((await (await fetch(`${chrome}/json/version`)).json()).webSocketDebuggerUrl);
let target, page;
try {
  target = (await browser.send('Target.createTarget', { url: 'about:blank' })).targetId;
  const info = (await (await fetch(`${chrome}/json`)).json()).find(t => t.id === target);
  page = await connect(info.webSocketDebuggerUrl);
  const evaluate = async expression => {
    const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('Browser evaluation failed: ' + r.exceptionDetails.text);
    return r.result.value;
  };
  const errors = []; page.listeners.push(e => { if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.text); });
  await page.send('Page.enable'); await page.send('Runtime.enable');
  await page.send('Page.navigate', { url: origin }); await sleep(2500);
  await evaluate(`window.__realFetch = window.fetch.bind(window); window.__requests = []; window.__pending = [];
    window.__mock = () => { window.fetch = async (url, options) => {
      if (url === '/api/adventure/voice-session') return new Response(JSON.stringify({ session: { id: 'mock' }, transport: { sdp: 'mock' } }));
      if (url !== '/api/adventure/change') return window.__realFetch(url, options);
      const body = JSON.parse(options.body); window.__requests.push(body);
      if (/tell me about|highlights/i.test(body.text)) {
        const result = new Response(JSON.stringify({decision:{intent:'learn',destinationId:null,topicId:/library/i.test(body.text)?'queenstown-library':/Boat Quay/i.test(body.text)?'raffles-boat-quay':/Queenstown/i.test(body.text)?'queenstown':/Raffles/i.test(body.text)?'raffles-place':/museum/i.test(body.text)?'artscience-museum':body.state.region}}));
        if (/slow/.test(body.text)) return new Promise(resolve=>window.__pending.push(()=>resolve(result)));
        return result;
      }
      let intent = /closer/.test(body.text) ? 'closer' : /skip/.test(body.text) ? 'skip' : 'named';
      const candidates = body.state.destinations.filter(d => d.id !== body.state.activeId && !body.state.collected.includes(d.id));
      candidates.sort((a,b) => Math.hypot(a.x-body.state.position.x,a.z-body.state.position.z)-Math.hypot(b.x-body.state.position.x,b.z-body.state.position.z));
      const id = /museum/.test(body.text) ? 'lotus-museum' : /invalid/.test(body.text) ? 'invented' : candidates[0]?.id ?? null;
      const result = new Response(JSON.stringify({ decision: { intent, destinationId: id } }), { status: /failure/.test(body.text) ? 502 : 200 });
      if (/slow/.test(body.text)) return new Promise(resolve => window.__pending.push(() => resolve(result)));
      return result;
    }; };
    ${live ? '' : 'window.__mock();'}
  `);
  const active = () => evaluate(`document.querySelector('[data-active-objective]')?.getAttribute('data-active-objective')`);
  const submit = async text => {
    await evaluate(`(() => { const input=document.querySelector('[aria-label="Adventure request"]'); input.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(text)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await sleep(80);
    await evaluate(`document.querySelector('[aria-label="Send adventure request"]').click()`);
  };
  const waitFor = async expression => { for (let n = 0; n < 120; n++) { if (await evaluate(expression)) return; await sleep(250); } throw new Error('Condition timed out: '+expression); };
  assert.equal(await active(), 'waterfront');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.mode-card strong')).map(e=>e.textContent)`), ['Marina 3D', 'Marina FPS', 'Open world', 'LAN arena', 'Street View']);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='The idea').click()`);
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('source-linked facts') && document.querySelector('dialog').textContent.includes('fullscreen')`), true);
  await evaluate(`document.querySelector('[aria-label="Close dialog"]').click(); Array.from(document.querySelectorAll('footer button')).find(b=>b.textContent==='Privacy').click()`);
  assert.equal(await evaluate(`document.querySelector('dialog').textContent.includes('switch regions') && document.querySelector('dialog').textContent.includes('local storage')`), true);
  await evaluate(`document.querySelector('[aria-label="Close dialog"]').click()`);
  await submit('Tell me about the museum');
  await waitFor(`document.querySelector('[aria-label="Singapore learning card"]')?.textContent.includes('ArtScience Museum')`);
  assert.equal(await active(), 'waterfront');
  assert.equal(await evaluate(`document.querySelector('.companion-learning a').hostname`), 'www.visitsingapore.com');
  await submit('Tell me about Queenstown');
  await waitFor(`document.querySelector('[aria-label="Singapore learning card"]')?.textContent.includes('first satellite town')`);
  assert.equal(await active(), 'waterfront');
  console.log('PASS educational museum and Queenstown questions show sourced cards without changing objective');
  await submit('give me something closer'); await waitFor(`document.querySelector('[data-active-objective]').dataset.activeObjective !== 'waterfront'`);
  assert.equal(await active(), 'city-skyline');
  assert.equal(await evaluate(`document.querySelector('[data-active="true"]').dataset.destinationId`), 'city-skyline');
  assert.equal(await evaluate(`document.querySelector('.objective-map-highlight').getAttribute('aria-label')`), 'Highlighted objective: City skyline');
  await submit('take me to the museum'); await waitFor(`document.querySelector('[data-active-objective]').dataset.activeObjective === 'lotus-museum'`);
  assert.equal(await evaluate(`document.querySelector('.objective-map-label').textContent.includes('Lotus museum')`), true);
  await submit('skip this stop'); await waitFor(`document.querySelector('[data-active-objective]').dataset.activeObjective !== 'lotus-museum'`);
  console.log(`PASS ${live ? 'LIVE Luna' : 'mocked'} text: closer, museum, skip, HUD and minimap`);
  for (const [region, question, answer] of [['Queenstown', 'Tell me about the library', '30 April 1970'], ['Raffles Place', 'Tell me about Boat Quay', 'conservation area in 1989']]) {
    await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes(${JSON.stringify(region)})).click()`);
    await waitFor(`!!document.querySelector('[aria-label=${JSON.stringify(region + ' educational guide')}]')`);
    const stamps = await evaluate(`document.querySelector('.marina-stamp-count').textContent`);
    await submit(question); await waitFor(`document.querySelector('.companion-learning')?.textContent.includes(${JSON.stringify(answer)})`);
    assert.equal(await evaluate(`document.querySelector('.marina-stamp-count').textContent`), stamps);
    assert.equal(await active(), undefined);
    await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth <= 392'), true);
    await mkdir('.cache/browser-checks', { recursive: true });
    const guideShot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`.cache/browser-checks/guide-${region.toLowerCase().replaceAll(' ', '-')}.png`, Buffer.from(guideShot.data, 'base64'));
  }
  console.log(`PASS ${live ? 'LIVE Luna' : 'mocked'} Queenstown library and Raffles Boat Quay guides; stamps unchanged, mobile cards`);
  await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes('Marina Bay')).click()`); await sleep(500);
  await evaluate('window.__mock()');
  const before = await active(); await submit('invalid'); await sleep(450); assert.equal(await active(), before);
  await submit('failure'); await waitFor(`!!document.querySelector('.companion-error')`); assert.equal(await active(), before);
  // Typed movement keys must not affect either position or traveled distance.
  const position = () => evaluate(`Array.from(document.querySelector('.marina-map svg').querySelectorAll('circle')).at(-1).outerHTML`);
  const startPosition = await position();
  await evaluate(`document.querySelector('[aria-label="Adventure request"]').focus()`);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', text: 'w' }); await sleep(700);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' }); assert.equal(await position(), startPosition);
  // Force out-of-order completion, including an API transport ignoring abort.
  await submit('slow museum'); await submit('skip'); await sleep(400); const newest = await active();
  await evaluate('window.__pending.splice(0).forEach(resolve=>resolve())'); await sleep(400); assert.equal(await active(), newest);
  await submit('slow museum'); await evaluate(`document.querySelector('[aria-label="Reset Marina adventure (clears stamps and conversation)"]').click()`); await sleep(350);
  await evaluate('window.__pending.splice(0).forEach(resolve=>resolve())'); await sleep(350); assert.equal(await active(), 'waterfront');
  await submit('slow museum'); await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes('Queenstown')).click()`); await sleep(700);
  await evaluate('window.__pending.splice(0).forEach(resolve=>resolve())'); await sleep(350);
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Change the adventure"]')`), false);
  assert.equal(await evaluate(`!!document.querySelector('.companion-learning')`), false);
  await submit('slow tell me about the library');
  await evaluate(`document.querySelector('[aria-label="Reset Queenstown progress (clears stamps and conversation)"]').click()`); await sleep(300);
  await evaluate('window.__pending.splice(0).forEach(resolve=>resolve())'); await sleep(300);
  assert.equal(await evaluate(`!!document.querySelector('.companion-learning')`), false);
  await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes('Marina Bay')).click()`); await sleep(900); assert.equal(await active(), 'waterfront');
  console.log('PASS invalid IDs, API failures, typing isolation, rapid requests, reset and region-switch races');
  // Denied permission does not disable the text path.
  await evaluate(`Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{throw new DOMException('Denied','NotAllowedError')}}); document.querySelector('[aria-label="Start microphone"]').click()`);
  await waitFor(`document.querySelector('.companion-error')?.textContent.includes('permission denied')`);
  await submit('museum'); await waitFor(`document.querySelector('[data-active-objective]').dataset.activeObjective === 'lotus-museum'`);
  // Mock media transport only; feed documented GPT-Live events through the real adapter/panel.
  await evaluate(`
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>({getTracks:()=>[{stop(){},enabled:true}]})});
    window.RTCPeerConnection = class {
      iceGatheringState='complete'; localDescription={sdp:'v=0'};
      addTrack(){} addEventListener(){} removeEventListener(){} async createOffer(){return {type:'offer',sdp:'v=0'}} async setLocalDescription(){}
      createDataChannel(){ return window.__voiceChannel={readyState:'open',send(value){const event=JSON.parse(value);window.__lastVoiceSend=event;if(event.type==='session.close')this.onmessage({data:JSON.stringify({type:'session.closed'})});if(event.type==='session.commentary.append')this.onmessage({data:JSON.stringify({type:'session.commentary.appended',client_event_id:event.event_id})});},close(){}} }
      async setRemoteDescription(){window.__voiceChannel.onmessage({data:JSON.stringify({type:'session.started'})})} close(){}
    };
    document.querySelector('[aria-label="Start microphone"]').click();
  `);
  await waitFor(`document.querySelector('.companion-heading').textContent.includes('listening')`);
  await evaluate(`for(const event of [{type:'session.input_transcript.delta',delta:'give me something closer',start_ms:0,end_ms:1200},{type:'session.delegation.created',offset_ms:1200,delegation:{id:'mock_delegation',target:'client'}}])window.__voiceChannel.onmessage({data:JSON.stringify(event)});`);
  await waitFor(`document.querySelector('[data-active-objective]').dataset.activeObjective !== 'lotus-museum'`);
  await waitFor(`window.__lastVoiceSend?.type === 'session.commentary.append'`);
  assert.equal(await evaluate(`window.__lastVoiceSend.content.includes('updated')`), true);
  console.log('PASS denied microphone recovery and simulated spoken request through shared game logic; confirmed result returned to GPT-Live');
  const beforeLearning = await active();
  await evaluate(`for(const event of [{type:'session.input_transcript.delta',delta:'Tell me about Queenstown',start_ms:2000,end_ms:3200},{type:'session.delegation.created',offset_ms:3200,delegation:{id:'mock_learning',target:'client'}}])window.__voiceChannel.onmessage({data:JSON.stringify(event)});`);
  await waitFor(`window.__lastVoiceSend?.delegation_id === 'mock_learning'`);
  assert.equal(await evaluate(`window.__lastVoiceSend.content.includes('first satellite town')`), true);
  assert.equal(await active(), beforeLearning);
  console.log('PASS simulated voice education returns grounded facts to GPT-Live without changing objective');
  await evaluate(`document.querySelector('[aria-label="Stop microphone"]').click()`);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true }); await sleep(400);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= 392'), true);
  await mkdir('.cache/browser-checks', { recursive: true });
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile('.cache/browser-checks/adventure-mobile.png', Buffer.from(shot.data, 'base64'));
  for (const [region, question, expected] of [['Queenstown', 'Tell me about the library', '30 April 1970'], ['Raffles Place', 'Tell me about Boat Quay', 'conservation area in 1989']]) {
    await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes(${JSON.stringify(region)})).click()`); await sleep(300);
    await evaluate(`window.__lastVoiceSend=null; document.querySelector('[aria-label="Start microphone"]').click()`);
    await waitFor(`document.querySelector('.companion-heading').textContent.includes('listening')`);
    await evaluate(`for(const event of [{type:'session.input_transcript.delta',delta:${JSON.stringify(question)},start_ms:0,end_ms:1200},{type:'session.delegation.created',offset_ms:1200,delegation:{id:'regional_learning',target:'client'}}])window.__voiceChannel.onmessage({data:JSON.stringify(event)});`);
    await waitFor(`window.__lastVoiceSend?.content?.includes(${JSON.stringify(expected)})`);
    assert.equal(await evaluate(`document.querySelector('.companion-history').textContent.includes(${JSON.stringify(expected)})`), true);
    await evaluate(`document.querySelector('[aria-label="Stop microphone"]').click()`);
  }
  console.log('PASS simulated voice learning in both new regional panels');
  await evaluate(`Array.from(document.querySelectorAll('.location-card')).find(b=>b.textContent.includes('Marina Bay')).click()`); await sleep(300);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.mode-card')).some(b=>b.textContent.includes('Armory'))`), false);
  await evaluate(`Array.from(document.querySelectorAll('.mode-card')).find(b=>b.textContent.includes('Marina FPS')).click()`);
  await waitFor(`!!document.querySelector('.fps-shop-link')`);
  await evaluate(`document.querySelector('.fps-shop-link').click()`); await sleep(300);
  await evaluate(`document.querySelector('#shop-tab-vehicleSkin').click()`); await sleep(200);
  assert.equal(await evaluate(`!!document.querySelector('.armory-vehicle-equipped') && !document.querySelector('.armory-equipped .armory-slot') && !document.querySelector('.armory-equipped .armory-rig-summary')`), true);
  await evaluate(`document.querySelector('#shop-tab-weapon').click()`); await sleep(200);
  assert.equal(await evaluate(`document.querySelectorAll('.armory-equipped .armory-slot').length`), 3);
  console.log('PASS About/Privacy copy and separate vehicle/weapon loadouts');
  assert.deepEqual(errors, []); console.log('PASS mobile layout and no uncaught errors');
} finally { page?.close(); if (target) await browser.send('Target.closeTarget', { targetId: target }); browser.close(); }
