// Start pnpm preview:cloudflare first; also accepts a deployed HTTPS origin.
// Exercises routing/assets only: never spends companion, voice or map credits.
import assert from 'node:assert/strict';
const origin = process.env.CLOUDFLARE_APP_ORIGIN || 'http://127.0.0.1:8787';
const get = (path, options) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), ...options });
const health = await get('/api/health');
assert.equal(health.status, 200);
assert.equal((await health.json()).service, 'blockplay-cloudflare');
const page = await get('/'); assert.equal(page.status, 200);
const html = await page.text(); assert.match(html, /id="root"/); assert(!html.includes('/@vite/client'));
for (const path of [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(match => match[1])) {
  const asset = await get(path); assert.equal(asset.status, 200, path);
  assert(!asset.headers.get('content-type')?.includes('text/html'), path);
}
const model = await get('/models/field-kit/sar21-inspired.glb'); assert.equal(model.status, 200);
assert.equal(new TextDecoder().decode((await model.arrayBuffer()).slice(0, 4)), 'glTF');
const voicePage = await (await get('/audio/encik/')).text();
const voice = voicePage.match(/src="(?:\.\/)?([^"\s]+\.mp3)"/);
assert(voice, 'recording in listening page');
const recording = await get(`/audio/encik/${voice[1]}`); assert.equal(recording.status, 200);
assert.match(recording.headers.get('content-type'), /audio\//);
assert((await recording.arrayBuffer()).byteLength > 1000);
const deepLink = await get('/play/queenstown', { headers: { 'Sec-Fetch-Mode': 'navigate' } });
assert.equal(deepLink.status, 200); assert.match(await deepLink.text(), /id="root"/);
for (const path of ['/api/does-not-exist', '/api/lan/health']) {
  const result = await get(path, { headers: { 'Sec-Fetch-Mode': 'navigate' } });
  assert.equal(result.status, 404); assert.match(result.headers.get('content-type'), /application\/json/);
}
const denied = await get('/api/adventure/pilot-plan', {
  method: 'POST', headers: { Origin: 'https://unexpected.invalid', 'Content-Type': 'application/json' }, body: '{}',
});
assert.equal(denied.status, 403); assert.equal((await denied.json()).error, 'Unexpected origin');
const local = await get('/api/adventure/pilot-plan', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
});
assert([400, 503].includes(local.status), `same-origin API response: ${local.status}`);
assert.match(local.headers.get('content-type'), /application\/json/);
console.log('PASS Cloudflare: production JS/CSS, GLB, recorded MP3, SPA fallback, API routing, origin checks and companion availability. No paid API requests.');
