import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { withBudget } from './api-budget.mjs';

// Default: 3 previews. --surroundings: four extra headings at each cached center.
// Cache authorized references in the repository; never print URLs or keys.
const views = [
  { id: 'west-bay', lat: 1.2836, lng: 103.8531, heading: 105, pitch: 8 },
  { id: 'north-bay', lat: 1.2861, lng: 103.8580, heading: 190, pitch: 5 },
  { id: 'museum-promenade', lat: 1.2833, lng: 103.8590, heading: 135, pitch: 10 },
];
const env = {};
for (const file of ['.env', '.env.local']) {
  try { Object.assign(env, parseEnv(await readFile(file, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const key = process.env.VITE_GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY;
if (!key) throw new Error('Missing local Google Maps key.');
const output = 'reconstruction/marina-bay/references';
const endpoint = 'https://maps.googleapis.com/maps/api/streetview';
await mkdir(output, { recursive: true });
await withBudget(async request => {
  for (const view of views) {
    const metadataFile = `${output}/${view.id}.json`, imageFile = `${output}/${view.id}.jpg`;
    let metadata;
    try { metadata = JSON.parse(await readFile(metadataFile, 'utf8')); } catch {}
    if (!metadata) {
      const url = new URL(`${endpoint}/metadata`);
      url.search = new URLSearchParams({ key, location: `${view.lat},${view.lng}`, radius: '70', source: 'outdoor' });
      metadata = await (await request('metadata', () => fetch(url, { signal: AbortSignal.timeout(20000) }))).json();
      // Persist only safe, useful fields (no API error messages or request URL).
      metadata = { status: metadata.status, pano_id: metadata.pano_id, location: metadata.location, date: metadata.date, copyright: metadata.copyright, requested: view };
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
    }
    console.log(JSON.stringify({ view: view.id, status: metadata.status, location: metadata.location, date: metadata.date }));
    if (metadata.status !== 'OK' || !/Google/i.test(metadata.copyright || '')) continue;
    const frames = process.argv.includes('--surroundings')
      ? [0, 90, 180, 270].map(heading => ({ heading, pitch: 8, file: `${output}/${view.id}-${heading}.jpg` }))
      : [{ heading: view.heading, pitch: view.pitch, file: imageFile }];
    for (const frame of frames) {
    let cached;
    try { cached = await readFile(frame.file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (cached) {
      if (cached.length < 4 || cached[0] !== 0xff || cached[1] !== 0xd8) throw new Error('Invalid cached JPEG; inspect it manually before recapturing.');
      metadata.frames = [...(metadata.frames || []).filter(f => f.file !== frame.file), { ...frame, horizontalFov: 90, bytes: cached.length, sha256: createHash('sha256').update(cached).digest('hex') }];
      await writeFile(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
      console.log(`Reusing ${frame.file}; zero image calls.`); continue;
    }
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ key, pano: metadata.pano_id, heading: String(frame.heading), pitch: String(frame.pitch), fov: '90', size: '640x640', return_error_code: 'true' });
    const response = await request(`image-reference-${view.id}-${frame.heading}`, () => fetch(url, { signal: AbortSignal.timeout(20000) }));
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Reference image failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(frame.file, bytes);
    metadata.frames = [...(metadata.frames || []).filter(f => f.file !== frame.file), { ...frame, horizontalFov: 90, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }];
    await writeFile(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
    }
  }
}).catch(() => { console.error('Reference capture failed; inspect the ledger and cached metadata. Request details withheld to protect the key.'); process.exitCode = 1; });
