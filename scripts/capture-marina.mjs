import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { withBudget } from './api-budget.mjs';

// Run only for imagery you are authorized to reconstruct and redistribute.
// Never log request URLs: they contain the browser key.
const env = {};
for (const file of ['.env', '.env.local']) {
  try { Object.assign(env, parseEnv(await readFile(file, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const key = process.env.VITE_GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('Set VITE_GOOGLE_MAPS_API_KEY in .env.local.');
const output = resolve('reconstruction/marina-bay/source');
const endpoint = 'https://maps.googleapis.com/maps/api/streetview';
const center = '1.2807,103.8548';
await withBudget(async (request, ledger) => {
let cached;
try { cached = JSON.parse(await readFile(resolve(output, 'capture.json'), 'utf8')); } catch {}
if (!cached) {
  try { cached = JSON.parse(await readFile('reconstruction/marina-bay.capture.json', 'utf8')); } catch {}
}
if (cached?.frames?.length === 4) {
  try {
    for (const frame of cached.frames) await readFile(resolve(output, frame.file));
    console.log(`Reusing complete source capture. Zero API requests. Recorded usage: ${ledger.attempts.length}/${ledger.limit}.`);
    return;
  } catch {}
}
const metadataUrl = new URL(`${endpoint}/metadata`);
metadataUrl.search = new URLSearchParams({ key, location: center, source: 'outdoor', radius: '100' });
const metadata = cached?.pano_id ? cached : await (await request('metadata', () => fetch(metadataUrl, { signal: AbortSignal.timeout(20000) }))).json();
if (metadata.status !== 'OK') {
  const message = String(metadata.error_message || 'Check Street View Static API enablement, billing, and key restrictions.').replaceAll(key, '[redacted]');
  console.error(`Source imagery unavailable: ${metadata.status}. ${message}`);
  process.exitCode = 1;
} else {
  console.log(`Street View source available at ${metadata.location.lat}, ${metadata.location.lng}; date ${metadata.date || 'unknown'}.`);
  if (!/Google/i.test(metadata.copyright || '')) throw new Error('The nearest panorama is contributed imagery. No images requested; select an official outdoor capture first.');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'capture.json'), JSON.stringify({ ...metadata, frames: cached?.frames || [] }, null, 2));
  if (!process.argv.includes('--check')) {
    await mkdir(output, { recursive: true });
    const frames = [];
    await writeFile(resolve(output, 'capture.json'), JSON.stringify({ ...metadata, frames }, null, 2));
    for (const heading of (process.argv.includes('--preview') ? [0] : [0, 90, 180, 270])) {
      const filename = `view-${heading}.jpg`;
      try {
        await readFile(resolve(output, filename));
        frames.push({ file: filename, heading, pitch: 0, horizontalFov: 90 });
        console.log(`Reusing ${filename}; zero requests.`);
        continue;
      } catch {}
      const url = new URL(endpoint);
      url.search = new URLSearchParams({ key, pano: metadata.pano_id, heading: String(heading), pitch: '0', fov: '90', size: '640x640', return_error_code: 'true' });
      const image = await request(`image-heading-${heading}`, () => fetch(url, { signal: AbortSignal.timeout(20000) }));
      if (!image.ok || !image.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image request failed (${image.status}); no source file written.`);
      await writeFile(resolve(output, filename), Buffer.from(await image.arrayBuffer()));
      frames.push({ file: filename, heading, pitch: 0, horizontalFov: 90 });
    }
    await writeFile(resolve(output, 'capture.json'), JSON.stringify({ source: 'Google Street View, user-authorized', ...metadata, frames }, null, 2));
    console.log(`Saved ${frames.length} directional source views. They share one camera center; reconstruction will use estimated depth, not multi-view photogrammetry.`);
  }
}
});
