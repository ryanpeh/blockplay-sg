import { expect, it } from 'vitest';
import { minimapProjection } from './minimap';

it('fits expanded region bounds inside the minimap with uniform scale', () => {
  const bounds = { minX: -300, maxX: 320, minZ: -270, maxZ: 200 };
  const map = minimapProjection(bounds);
  expect(map.x(bounds.minX)).toBeGreaterThanOrEqual(8);
  expect(map.x(bounds.maxX)).toBeLessThanOrEqual(192);
  expect(map.y(bounds.minZ)).toBeGreaterThanOrEqual(8);
  expect(map.y(bounds.maxZ)).toBeLessThanOrEqual(152);
  expect(map.x(10) - map.x(0)).toBeCloseTo(map.y(10) - map.y(0));
});

it('rejects empty bounds', () => {
  expect(() => minimapProjection({ minX: 0, maxX: 0, minZ: 0, maxZ: 10 })).toThrow();
});
