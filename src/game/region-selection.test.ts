import { expect, it } from 'vitest';
import { hasRegionGame, regionModeLabel } from './region-selection';

it('offers real region maps only for implemented destinations', () => {
  expect(hasRegionGame('marina-bay')).toBe(true);
  expect(hasRegionGame('queenstown')).toBe(true);
  expect(hasRegionGame('tampines')).toBe(false);
  expect(hasRegionGame('toa-payoh')).toBe(false);
  expect(hasRegionGame('unknown')).toBe(false);
});

it('labels the two region games distinctly', () => {
  expect(regionModeLabel('queenstown').name).toBe('Queenstown 3D');
  expect(regionModeLabel('marina-bay').name).toBe('Marina 3D');
});
