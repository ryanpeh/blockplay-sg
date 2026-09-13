import { expect, it } from 'vitest';
import { advanceBloom, createWeaponBloom, recordBloomShot, sampleShotSpread, weaponSpread } from './fps-accuracy';

it('builds spread during sustained fire, caps it and recovers after a firing pause', () => {
  const state = createWeaponBloom(), initial = weaponSpread(state, 0, 0, false, false);
  for (let i = 0; i < 20; i++) { recordBloomShot(state, 0); advanceBloom(state, .1); }
  expect(state.amount).toBe(.028);
  expect(weaponSpread(state, 0, 0, false, false)).toBeGreaterThan(initial * 6);
  advanceBloom(state, .1); expect(state.amount).toBe(.028);
  for (let i = 0; i < 20; i++) advanceBloom(state, .1);
  expect(state.amount).toBe(0);
});
it('rewards ADS, crouching and stationary fire while support fire blooms more', () => {
  const rifle = createWeaponBloom(), support = createWeaponBloom();
  recordBloomShot(rifle, 0); recordBloomShot(support, 1);
  const hip = weaponSpread(rifle, 0, 0, false, false);
  expect(weaponSpread(rifle, 0, 1, false, false)).toBeCloseTo(hip * .2);
  expect(weaponSpread(rifle, 0, 0, true, false)).toBeLessThan(hip);
  expect(weaponSpread(rifle, 0, 0, false, true)).toBeGreaterThan(hip);
  expect(weaponSpread(support, 1, 0, false, false)).toBeGreaterThan(hip);
});
it('samples shot directions inside the cone used by the crosshair', () => {
  const angle = .03;
  for (let i = 0; i <= 100; i++) {
    const offset = sampleShotSpread(angle, () => i / 100);
    expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(Math.tan(angle) + 1e-12);
  }
});
