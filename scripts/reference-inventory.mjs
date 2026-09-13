// Offline inventory; never queries Maps or prints environment credentials.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function reviewCategory(review) {
  const text = String(review || '').toLowerCase();
  if (text.includes('reject')) return 'rejected';
  if (text.includes('limited') || text.includes('detail-only')) return 'limited';
  if (text.startsWith('accepted')) return 'accepted';
  return 'pending';
}

export async function referenceInventory(root = 'reconstruction') {
  const results = [];
  for (const region of ['marina-bay', 'raffles-place', 'queenstown']) {
    const directory = `${root}/${region}/references`;
    let names;
    try { names = await readdir(directory); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    const summary = { region, images: 0, bytes: 0, accepted: 0, limited: 0, rejected: 0, pending: 0, invalid: [] };
    const manifests = new Map();
    for (const name of names.filter(name => name.endsWith('.json'))) {
      try {
        const manifest = JSON.parse(await readFile(`${directory}/${name}`, 'utf8'));
        // Older Static captures keep several frames in one panorama manifest.
        for (const frame of manifest.frames || []) {
          if (frame.file) manifests.set(frame.file.split('/').at(-1), { ...frame, visualReview: frame.visualReview || manifest.visualReview });
        }
        if (manifest.file) manifests.set(manifest.file.split('/').at(-1), manifest);
      } catch { /* Missing/invalid manifests are reported against their images below. */ }
    }
    for (const name of names.filter(name => /\.(png|jpe?g)$/i.test(name))) {
      const bytes = await readFile(`${directory}/${name}`);
      summary.images++; summary.bytes += bytes.length;
      try {
        const manifest = manifests.get(name);
        if (!manifest) throw new Error('Missing image manifest');
        summary[reviewCategory(manifest.visualReview)]++;
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (!manifest.sha256 || hash !== manifest.sha256) summary.invalid.push(name);
      } catch { summary.pending++; summary.invalid.push(name); }
    }
    results.push(summary);
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = await referenceInventory();
  console.log(JSON.stringify(results, null, 2));
  if (results.some(region => region.invalid.length)) process.exitCode = 1;
}
