// Isolated real-WebRTC smoke. Run with NO_PROXY=* node scripts/lan-transport-smoke.mjs.
// Chrome is launched only for this test; no application or external service is required.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { createLanServer } from './lan-server.mjs';

const directory = await mkdtemp(join(tmpdir(), 'blockplay-rtc-smoke-'));
const source = await readFile(new URL('../src/game/lan-peer.ts', import.meta.url), 'utf8');
await writeFile(join(directory, 'lan-peer.js'), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText);
await writeFile(join(directory, 'index.html'), '<!doctype html><title>LAN transport smoke</title><script type="module">import * as lan from "/lan-peer.js"; window.lan=lan;</script>');
const server = createLanServer({ distDir: directory });
await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
// A non-localhost hostname exercises the insecure HTTP context used on a LAN.
// Override with an actual LAN IP to also exercise the machine's network route.
const lanHost = process.env.LAN_SMOKE_HOST || 'blockplay-lan.test';
const origin = `http://${lanHost}:${server.address().port}`;
const chromePort = 9225;
const chrome = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--no-proxy-server', '--host-resolver-rules=MAP blockplay-lan.test 127.0.0.1', `--user-data-dir=${join(directory, 'chrome')}`, `--remote-debugging-port=${chromePort}`, 'about:blank'], { stdio: 'ignore' });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tabs = [];
async function page() {
  const tab = await (await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(origin)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map();
  ws.onmessage = (event) => { const message = JSON.parse(event.data); const entry = pending.get(message.id); if (entry) { pending.delete(message.id); clearTimeout(entry.timer); message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result); } };
  const command = (method, params) => new Promise((resolve, reject) => { const next = ++id; const timer = setTimeout(() => { pending.delete(next); reject(new Error(`CDP timed out: ${method}`)); }, 35_000); pending.set(next, { resolve, reject, timer }); ws.send(JSON.stringify({ id: next, method, params })); });
  const evaluate = async (expression) => { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value; };
  const wait = async (expression) => { for (let tries = 0; tries < 150; tries++) { if (await evaluate(expression)) return; await delay(100); } throw new Error(`Timed out: ${expression}`); };
  await wait('!!window.lan');
  const page = { evaluate, wait, close: () => ws.close() }; tabs.push(page); return page;
}
try {
  for (let tries = 0; ; tries++) { try { await fetch(`http://127.0.0.1:${chromePort}/json/version`); break; } catch { if (tries > 50) throw new Error('Chrome failed to start. Set CHROME_BIN if needed.'); await delay(100); } }
  const host = await page(); const guest = await page(); const guest2 = await page();
  assert.equal(await host.evaluate('window.isSecureContext'), false, 'Exercise an ordinary, insecure LAN HTTP origin');
  const code = await host.evaluate('(async()=>{const result=await lan.hostLan("Host");window.session=result.session;window.received=[];session.subscribe((from,payload)=>received.push({from,payload}));return result.roomCode;})()');
  await guest.evaluate(`(async()=>{window.session=await lan.joinLan('Guest',${JSON.stringify(code)});window.received=[];session.subscribe((from,payload)=>received.push({from,payload}));})()`);
  await host.wait('session.getPeers().length===1');
  await guest.evaluate('session.send({type:"hello",x:12})');
  await host.wait('received.length===1');
  assert.equal(await host.evaluate('received[0].payload.x'), 12);
  assert.equal(await host.evaluate('received[0].from'), await guest.evaluate('session.id'));
  await host.evaluate('session.send({type:"state",players:[1,2]})');
  await guest.wait('received.length===1');
  assert.deepEqual(await guest.evaluate('received[0].payload.players'), [1, 2]);
  await guest2.evaluate(`(async()=>{window.session=await lan.joinLan('Guest2',${JSON.stringify(code)});window.received=[];session.subscribe((from,payload)=>received.push({from,payload}));})()`);
  await host.wait('session.getPeers().length===2'); await guest.wait('session.getPeers().length===2');
  await host.evaluate(`session.send({type:'private'},${JSON.stringify(await guest.evaluate('session.id'))})`);
  await guest.wait('received.length===2'); assert.equal(await guest2.evaluate('received.length'), 0);
  await host.evaluate('window.second=0;window.off=session.subscribe(()=>second++);session.send({big:"x".repeat(60000)})');
  await delay(200); assert.equal(await guest.evaluate('received.length'), 2, 'Oversized packets are dropped');
  await guest.evaluate('session.send({type:"second-listener"})'); await host.wait('second===1');
  await host.evaluate('off()'); await guest.evaluate('session.send({type:"unsubscribed"})'); await host.wait('received.length===3');
  assert.equal(await host.evaluate('second'), 1);
  await guest2.evaluate('session.close()'); await host.wait('session.getPeers().length===1'); await guest.wait('session.getPeers().length===1');
  await host.evaluate('session.close()'); await guest.wait('session.getPeers().length===0');
  console.log(`PASS: genuine WebRTC over ${origin} (secureContext=false), 3 peers, host broadcast, directed packets, authenticated sender IDs, multiple subscriptions, size limit, roster updates and disconnect cleanup.`);
} finally {
  for (const tab of tabs) tab.close();
  chrome.kill('SIGTERM');
  await new Promise((resolve) => server.close(resolve));
  await delay(500); await rm(directory, { recursive: true, force: true });
}
