import { expect, it } from 'vitest';
import { hasRegionGame, regionModeLabel } from './region-selection';
import { locations } from '../data/locations';

it('only lists the three developed worlds in the location picker', () => {
  expect(locations.map(location => location.id)).toEqual(['raffles-place', 'queenstown', 'marina-bay']);
  expect(locations.every(location => hasRegionGame(location.id))).toBe(true);
});

it('offers real region maps only for implemented destinations', () => {
  expect(hasRegionGame('marina-bay')).toBe(true);
  expect(hasRegionGame('queenstown')).toBe(true);
  expect(hasRegionGame('raffles-place')).toBe(true);
  expect(hasRegionGame('tampines')).toBe(false);
  expect(hasRegionGame('toa-payoh')).toBe(false);
  expect(hasRegionGame('unknown')).toBe(false);
});

it('labels the region games distinctly', () => {
  expect(regionModeLabel('raffles-place').name).toBe('Raffles 3D');
  expect(regionModeLabel('queenstown').name).toBe('Queenstown 3D');
  expect(regionModeLabel('marina-bay').name).toBe('Marina 3D');
});
