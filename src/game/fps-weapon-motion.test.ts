import { expect, it } from 'vitest';
import { reloadMotion, reloadStage } from './fps-weapon-motion';

it('removes and reseats the magazine, restoring the complete resting pose', () => {
  expect(reloadMotion(.34).magazineDrop).toBeCloseTo(.30);
  expect(reloadMotion(.43).magazineVisible).toBe(false);
  expect(reloadMotion(.60).magazineVisible).toBe(true);
  expect(reloadMotion(.74).magazineDrop).toBeLessThanOrEqual(0);
  expect(reloadMotion(1)).toEqual(reloadMotion(0));
  for (let p = 0; p <= 1; p += .01) expect(Object.values(reloadMotion(p)).every(v => typeof v === 'boolean' || Number.isFinite(v))).toBe(true);
});
it('distinguishes the empty chamber action from a tactical reload', () => {
  expect(reloadStage(.65)).toBe('MAG OUT');
  expect(reloadStage(.4)).toBe('MAG IN');
  expect(reloadStage(.15, true)).toBe('CHAMBER');
  expect(reloadStage(.15, false)).toBe('SEAT MAG');
  expect(reloadStage(0)).toBe('');
});
