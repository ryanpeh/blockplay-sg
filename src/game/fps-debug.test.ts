import { expect, it } from 'vitest';
import { normalizeFpsDebug, regenerateHealth } from './fps-debug';

it('limits survival settings to the supported multipliers', () => {
  expect(normalizeFpsDebug({ healthMultiplier: 10, regeneration: true })).toEqual({ healthMultiplier: 10, regeneration: true });
  expect(normalizeFpsDebug({ healthMultiplier: NaN as 1 })).toEqual({ healthMultiplier: 1, regeneration: false });
});
it('regenerates ten percent per second without overflow, revival or background time jumps', () => {
  let health = 400;
  for (let i = 0; i < 10; i++) health = regenerateHealth(health, 500, .1);
  expect(health).toBe(450);
  expect(regenerateHealth(499, 500, .1)).toBe(500);
  expect(regenerateHealth(0, 1000, .1)).toBe(0);
  expect(regenerateHealth(100, 1000, 60)).toBe(110);
});
