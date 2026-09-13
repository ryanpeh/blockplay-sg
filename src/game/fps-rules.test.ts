import { describe, expect, it } from 'vitest';
import { advanceWeapon, beginReload, createLoadout, fireWeapon, FPS_WEAPONS, movementInput, FPS_SPAWN, FPS_TARGETS } from './fps-rules';
import { buildMarinaScene } from './marina-scene';
import { canOccupy } from './marina-collision';

describe('FPS ammunition lifecycle', () => {
  it('enforces the cooldown, empty magazine and reload interlock', () => {
    const state = createLoadout()[0]; state.magazine = 2;
    expect(fireWeapon(state, 0)).toBe(true);
    expect(fireWeapon(state, 0)).toBe(false);
    advanceWeapon(state, 0, FPS_WEAPONS[0].interval);
    expect(fireWeapon(state, 0)).toBe(true);
    advanceWeapon(state, 0, 1);
    expect(fireWeapon(state, 0)).toBe(false);
    expect(beginReload(state, 0)).toBe(true);
    expect(fireWeapon(state, 0)).toBe(false);
  });
  it('conserves ammo for partial reloads, including the final reserve', () => {
    const state = createLoadout()[0]; state.magazine = 24; state.reserve = 3;
    beginReload(state, 0); advanceWeapon(state, 0, 1);
    expect(state.magazine).toBe(24); expect(state.reserve).toBe(3);
    advanceWeapon(state, 0, 1);
    expect(state.magazine).toBe(27); expect(state.reserve).toBe(0);
    expect(beginReload(state, 0)).toBe(false);
  });
  it('does not refill or reset reload timing on repeated reload input', () => {
    const state = createLoadout()[1];
    expect(beginReload(state, 1)).toBe(false);
    state.magazine = 5; beginReload(state, 1); advanceWeapon(state, 1, 1);
    expect(beginReload(state, 1)).toBe(false);
    expect(state.reloadRemaining).toBe(1.5);
    state.reloadRemaining = 0; // switching weapons cancels the animation without creating ammo
    advanceWeapon(state, 1, 5); expect(state.magazine).toBe(5);
    expect(createLoadout()[1].magazine).toBe(60);
  });
});
it('normalizes diagonal movement and keeps movement relative to camera yaw', () => {
  const diagonal = movementInput(1, 1, 0, 4, 1);
  expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(4);
  const turned = movementInput(1, 0, Math.PI / 2, 4, 1);
  expect(turned.x).toBeCloseTo(-4); expect(turned.z).toBeCloseTo(0);
});
it('places FPS spawn and all target stands clear of Marina obstacles', () => {
  const world = buildMarinaScene();
  try {
    for (const p of [FPS_SPAWN, ...FPS_TARGETS]) expect(canOccupy(p.x, p.z, 0.38, world.obstacles), JSON.stringify(p)).toBe(true);
  } finally { world.dispose(); }
});
