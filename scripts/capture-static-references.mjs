import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { withBudget, isStaticAttempt } from './api-budget.mjs';
import { prepareStaticViews, hash } from './static-reference-plan.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== '--plan' || !/^reconstruction\/[a-z0-9][a-z0-9-]*\.json$/.test(args[1] || '') || args.length > 3 || (args[2] && args[2] !== '--dry-run')) throw new Error('Use --plan reconstruction/name.json [--dry-run].');
  const plan = JSON.parse(await readFile(args[1], 'utf8')), views = await prepareStaticViews(plan);
  const missing = views.filter(view => !view.cached);
  console.log(JSON.stringify({ plan: plan.name, region: plan.region, cached: views.length - missing.length, newStaticImages: missing.length, metadataRequests: 0 }));
  if (args[2] === '--dry-run' || !missing.length) return;
  const env = {};
  for (const file of ['.env', '.env.local']) {
    try { Object.assign(env, parseEnv(await readFile(file, 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const key = (process.env.VITE_GOOGLE_MAPS_API_KEY || env.VITE_GOOGLE_MAPS_API_KEY)?.trim();
  if (!key) throw new Error('Missing Static API key.');
  const directory = `reconstruction/${plan.region}/references`;
  const report = { plan: plan.name, startedAt: new Date().toISOString(), cached: views.length - missing.length, captured: 0, failed: 0, staticImageAttempts: 0, metadataRequests: 0, bytes: 0, durationMs: 0, views: [] };
  const started = performance.now();
  try {
    await withBudget(async (request, ledger) => {
      const allowance = ledger.regionImageAllowances?.[plan.region];
      if (!allowance) throw new Error('Missing regional authorization.');
      const regionUsed = ledger.attempts.filter(entry => entry.kind.startsWith('image') && entry.location === plan.region).length - allowance.baselineStaticImageAttempts;
      const globalUsed = ledger.attempts.filter(entry => entry.kind.startsWith('image')).length - ledger.imageAllowance.baselineStaticImageAttempts;
      if (missing.length > allowance.maxAdditionalImages - regionUsed || missing.length > ledger.imageAllowance.maxAdditionalImages - globalUsed || missing.length > ledger.limit - ledger.attempts.filter(entry => isStaticAttempt(entry.kind)).length) throw new Error('Insufficient remaining budget for this batch.');
      for (const view of missing) {
        try {
          const url = new URL('https://maps.googleapis.com/maps/api/streetview');
          url.search = new URLSearchParams({ key, pano: view.source.pano_id, heading: String(view.heading), pitch: String(view.pitch), fov: String(view.fov), size: '640x640', return_error_code: 'true' });
          report.staticImageAttempts++;
          const response = await request(`image-static-quality-${view.id}`, () => fetch(url, { signal: AbortSignal.timeout(25000) }));
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Static image request failed.');
          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Invalid JPEG response.');
          const manifest = { source: 'Google Street View Static API; owner-authorized reference', sourceMetadata: view.sourceMetadata, pano_id: view.source.pano_id, position: view.source.location, sourceDate: view.source.date, copyright: view.source.copyright, pov: { heading: view.heading, pitch: view.pitch }, horizontalFov: view.fov, width: 640, height: 640, purpose: view.purpose, capturedAt: new Date().toISOString(), file: view.imageFile, fingerprint: view.fingerprint, sha256: hash(bytes), bytes: bytes.length, attribution: 'Retained in original image', visualReview: 'pending' };
          await writeFile(view.imageFile, bytes, { flag: 'wx' });
          await writeFile(view.manifestFile, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
          report.captured++; report.bytes += bytes.length; report.views.push({ id: view.id, status: 'saved', bytes: bytes.length });
          console.log(`Cached ${plan.region}/${view.id}.jpg`);
        } catch (error) { report.failed++; report.views.push({ id: view.id, status: 'failed; no automatic retry' }); throw error; }
      }
    }, undefined, plan.region);
  } finally {
    report.durationMs = Math.round(performance.now() - started);
    await mkdir(`${directory}/reports`, { recursive: true });
    await writeFile(`${directory}/reports/${plan.name}-${report.startedAt.replaceAll(':', '-')}.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ captured: report.captured, failed: report.failed, bytes: report.bytes, durationMs: report.durationMs }));
  }
}
main().catch(() => { console.error('Static capture stopped. Inspect the ledger, plan and cached files before retrying; raw errors/URLs are withheld to protect credentials.'); process.exitCode = 1; });
