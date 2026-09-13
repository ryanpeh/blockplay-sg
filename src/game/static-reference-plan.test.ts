import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
// @ts-expect-error Node-only capture helper.
import { validateStaticPlan, prepareStaticViews } from '../../scripts/static-reference-plan.mjs';
const plan = { name: 'quality-test', region: 'marina-bay', maxNewImages: 1, views: [{ id: 'static-quality-test', source: 'north-bay.json', heading: 160, pitch: 15, fov: 60, purpose: 'Facade details' }] };
it('bounds Static plans and rejects unsafe paths/cameras and duplicate IDs', () => {
  expect(validateStaticPlan(plan)).toBe(plan);
  for (const change of [{ region: '../secret' }, { maxNewImages: 26 }, { views: [...plan.views, ...plan.views] }, { views: [{ ...plan.views[0], source: '../secret.json' }] }, { views: [{ ...plan.views[0], fov: 0 }] }]) expect(() => validateStaticPlan({ ...plan, ...change })).toThrow();
});
it('prepares a new view from existing metadata without network calls', async () => {
  const [view] = await prepareStaticViews(plan);
  expect(view.source.status).toBe('OK');
  expect(view.cached).toBeUndefined();
  expect(view.imageFile).toBe('reconstruction/marina-bay/references/static-quality-test.jpg');
  expect(view.fingerprint).toHaveLength(64);
});

it('reuses every downloaded quality view and refuses changed camera settings', async () => {
  const cachedPlan = JSON.parse(await readFile('reconstruction/marina-static-quality-plan.json', 'utf8'));
  expect((await prepareStaticViews(cachedPlan)).every((view: { cached?: unknown }) => view.cached)).toBe(true);
  cachedPlan.views[0].pitch += 0.5;
  await expect(prepareStaticViews(cachedPlan)).rejects.toThrow('Cache differs');
});
