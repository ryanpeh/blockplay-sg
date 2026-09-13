import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function validateStaticPlan(plan) {
  const safe = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
  if (!plan || !safe(plan.name) || !['marina-bay', 'raffles-place', 'queenstown'].includes(plan.region)) throw new Error('Invalid region or plan name.');
  if (!Number.isInteger(plan.maxNewImages) || plan.maxNewImages < 0 || plan.maxNewImages > 25 || !Array.isArray(plan.views) || !plan.views.length || plan.views.length > 25) throw new Error('Static plans allow at most 25 images.');
  const ids = new Set();
  for (const view of plan.views) {
    if (!safe(view.id) || ids.has(view.id) || !/^[a-z0-9][a-z0-9-]{0,79}\.json$/.test(view.source || '')) throw new Error('Invalid or duplicate output/source.');
    if (!Number.isFinite(view.heading) || view.heading < 0 || view.heading >= 360 || !Number.isFinite(view.pitch) || Math.abs(view.pitch) > 90 || !Number.isFinite(view.fov) || view.fov < 10 || view.fov > 120 || typeof view.purpose !== 'string' || !view.purpose.trim()) throw new Error('Invalid camera or missing purpose.');
    ids.add(view.id);
  }
  return plan;
}
export async function prepareStaticViews(plan, root = 'reconstruction') {
  validateStaticPlan(plan);
  const directory = `${root}/${plan.region}/references`, fingerprints = new Set(), views = [];
  for (const view of plan.views) {
    const source = JSON.parse(await readFile(`${directory}/${view.source}`, 'utf8'));
    if (source.status !== 'OK' || !source.pano_id || !/Google/i.test(source.copyright || '')) throw new Error('Source must be cached, successful Google panorama metadata.');
    const fingerprint = hash(JSON.stringify({ api: 'static', pano: source.pano_id, heading: view.heading, pitch: view.pitch, fov: view.fov, size: '640x640' }));
    if (fingerprints.has(fingerprint)) throw new Error('Duplicate camera view in plan.');
    fingerprints.add(fingerprint);
    const imageFile = `${directory}/${view.id}.jpg`, manifestFile = `${directory}/${view.id}.json`;
    let bytes, cached;
    try { bytes = await readFile(imageFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (bytes) {
      cached = JSON.parse(await readFile(manifestFile, 'utf8'));
      if (cached.fingerprint !== fingerprint || cached.sha256 !== hash(bytes) || cached.pano_id !== source.pano_id || cached.pov?.heading !== view.heading || cached.pov?.pitch !== view.pitch || cached.horizontalFov !== view.fov || cached.width !== 640 || cached.height !== 640) throw new Error('Cache differs from plan; inspect manually, never silently overwrite.');
    } else {
      try { await readFile(manifestFile); throw new Error('Orphan metadata: inspect cache manually.'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    views.push({ ...view, source, sourceMetadata: view.source, fingerprint, imageFile, manifestFile, cached });
  }
  if (views.filter(view => !view.cached).length > plan.maxNewImages) throw new Error('Plan exceeds its new-image limit.');
  return views;
}
