import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export const directory = 'reconstruction/marina-bay/references';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function validatePlan(plan) {
  const safe = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
  if (!safe(plan?.name) || !Number.isInteger(plan.width) || !Number.isInteger(plan.height) || plan.width < 640 || plan.width > 1920 || plan.height < 480 || plan.height > 1080) throw new Error('Invalid plan name or viewport.');
  if (!Number.isInteger(plan.maxNewImages) || plan.maxNewImages < 0 || plan.maxNewImages > 50 || !Array.isArray(plan.views) || !plan.views.length || plan.views.length > 50) throw new Error('Invalid plan image limits.');
  const ids = new Set();
  for (const view of plan.views) {
    if (!safe(view.id) || ids.has(view.id) || !['north-bay.json', 'west-bay.json', 'museum-promenade.json', 'original-waterfront'].includes(view.source)) throw new Error('Invalid/duplicate view or unreviewed source.');
    if (!Number.isFinite(view.heading) || view.heading < 0 || view.heading >= 360 || !Number.isFinite(view.pitch) || Math.abs(view.pitch) > 80 || !Number.isFinite(view.zoom) || view.zoom < 0 || view.zoom > 3) throw new Error('Invalid camera settings.');
    ids.add(view.id);
  }
  return plan;
}
export async function prepareViews(plan) {
  validatePlan(plan);
  const result = [];
  for (const view of plan.views) {
    const source = JSON.parse(await readFile(view.source === 'original-waterfront' ? 'reconstruction/marina-bay.capture.json' : `${directory}/${view.source}`, 'utf8'));
    if (!source.pano_id || source.status !== 'OK') throw new Error('Missing reviewed panorama.');
    const stem = `${directory}/${view.id}`, imageFile = `${stem}.png`, manifestFile = `${stem}.json`;
    const fingerprint = sha256(JSON.stringify({ pano: source.pano_id, heading: view.heading, pitch: view.pitch, zoom: view.zoom, width: plan.width, height: plan.height }));
    let bytes, cached;
    try { bytes = await readFile(imageFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bytes) {
      cached = JSON.parse(await readFile(manifestFile, 'utf8'));
      // Maps returns tiny floating-point deviations (e.g. zoom 0.9999999999999997).
      const close = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-6;
      if (sha256(bytes) !== cached.sha256 || (cached.fingerprint && cached.fingerprint !== fingerprint) || cached.pano_id !== source.pano_id || !close(cached.pov.heading, view.heading) || !close(cached.pov.pitch, view.pitch) || !close(cached.zoom, view.zoom) || cached.width !== plan.width || cached.height !== plan.height) throw new Error('Cache differs from plan; inspect manually or choose a new view ID.');
    }
    result.push({ ...view, source, sourceMetadata: view.source, imageFile, manifestFile, fingerprint, cached });
  }
  return result;
}
export function checkAllowance(plan, views) {
  const missing = views.filter(view => !view.cached).length;
  if (missing > plan.maxNewImages) throw new Error('Plan exceeds per-run screenshot safety limit; reduce the plan.');
  return { cached: views.length - missing, newImages: missing, staticApiRequests: 0 };
}
