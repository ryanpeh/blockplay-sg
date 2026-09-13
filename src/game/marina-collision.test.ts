import { expect, it } from 'vitest';
import { canOccupy, MARINA_BOUNDS, moveInMarina } from './marina-collision';

const water = [{ minX: -80, maxX: 80, minZ: -90, maxZ: 50 }];
it('keeps walking and driving out of the bay even at high speed', () => {
  const result = moveInMarina({ x: 0, z: 60 }, 0, -40, 1, water);
  expect(result.z).toBeGreaterThanOrEqual(51);
  expect(canOccupy(result.x, result.z, 1, water)).toBe(true);
});
it('slides along an obstacle while preserving sideways movement', () => {
  const result = moveInMarina({ x: 0, z: 52 }, 10, -10, 1, water);
  expect(result.x).toBeCloseTo(10);
  expect(result.z).toBeGreaterThanOrEqual(51);
});
it('keeps players inside the modeled map and permits clear roads', () => {
  expect(canOccupy(MARINA_BOUNDS.maxX, 0, 1, [])).toBe(false);
  expect(canOccupy(0, MARINA_BOUNDS.minZ, 1, [])).toBe(false);
  expect(canOccupy(238, 0, 1.5, water)).toBe(true);
  expect(canOccupy(103, 0, 1.5, water)).toBe(true);
});
