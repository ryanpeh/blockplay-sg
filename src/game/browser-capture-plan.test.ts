import { expect, it } from 'vitest';
// @ts-expect-error Shared capture-tool JavaScript module.
import { validatePlan, checkAllowance, prepareViews } from '../../scripts/browser-capture-plan.mjs';
const plan = { name: 'test-plan', width: 1280, height: 900, maxNewImages: 1, views: [{ id: 'test-view', source: 'north-bay.json', heading: 160, pitch: 15, zoom: 1 }] };
it('validates safe output IDs, unique views and bounded camera settings', () => {
  expect(validatePlan(plan)).toBe(plan);
  expect(() => validatePlan({ ...plan, views: [{ ...plan.views[0], id: '../secret' }] })).toThrow();
  expect(() => validatePlan({ ...plan, views: [plan.views[0], plan.views[0]] })).toThrow();
  expect(() => validatePlan({ ...plan, views: [{ ...plan.views[0], heading: 360 }] })).toThrow();
});
it('bounds new screenshots per run without deducting any Static allowance', () => {
  expect(checkAllowance(plan, [{}, { cached: {} }])).toEqual({ cached: 1, newImages: 1, staticApiRequests: 0 });
  expect(() => checkAllowance(plan, [{}, {}])).toThrow('per-run');
});
it('validates the existing screenshot cache and refuses changed camera settings', async () => {
  const cachedPlan = { ...plan, views: [{ ...plan.views[0], id: 'north-bay-browser-h160-p15-z1' }] };
  const views = await prepareViews(cachedPlan);
  expect(views[0].cached.sha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(prepareViews({ ...cachedPlan, views: [{ ...cachedPlan.views[0], pitch: 16 }] })).rejects.toThrow('Cache differs');
});
