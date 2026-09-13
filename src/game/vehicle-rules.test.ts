import { describe, expect, it } from 'vitest';
import { buildMarinaScene } from './marina-scene';
import { canOccupy, MARINA_BOUNDS } from './marina-collision';
import { canFly, createVehicle, driveVehicle, flyVehicle, vehicleBounds, vehicleExit, type FlightObstacle } from './vehicle-rules';
import { createProfile, equip, purchase, resolveLoadout, restoreProfile } from './armory-state';
const wall: FlightObstacle = { minX: -5, maxX: 5, minZ: -5, maxZ: 5, minY: 0, maxY: 12 };
describe('vehicle movement and transitions', () => {
  it('places both vehicles in clear ground, with usable dismount points', () => {
    const world = buildMarinaScene();
    try {
      for (const kind of ['car', 'helicopter'] as const) { const v = createVehicle(kind); expect(canOccupy(v.x, v.z, 2.5, world.obstacles)).toBe(true); expect(vehicleExit(v, world.obstacles)).not.toBeNull(); }
    } finally { world.dispose(); }
  });
  it('accelerates, brakes and stops at a solid obstacle without tunnelling', () => {
    let v = { ...createVehicle('car'), x: 0, z: 20, yaw: 0 };
    for (let i = 0; i < 80; i++) v = driveVehicle(v, 1, 0, false, .05, [wall]).state;
    expect(v.z).toBeGreaterThanOrEqual(7.35); expect(v.speed).toBe(0);
    v = { ...v, speed: 15 }; for (let i = 0; i < 10; i++) v = driveVehicle(v, 0, 0, true, .05, []).state; expect(Math.abs(v.speed)).toBeLessThan(.1);
  });
  it('steers only when rolling and caps frame steps', () => {
    const v = createVehicle('car'); expect(driveVehicle(v, 0, 1, false, .05, []).state.yaw).toBe(v.yaw);
    expect(driveVehicle({ ...v, speed: 10 }, 0, 1, false, .05, []).state.yaw).toBeLessThan(v.yaw);
    expect(driveVehicle(v, 1, 0, false, 10, []).state).toEqual(driveVehicle(v, 1, 0, false, .05, []).state);
  });
  it('flies over an obstacle only above its clearance height and respects ceilings', () => {
    expect(canFly(0, 10, 0, [wall])).toBe(false); expect(canFly(0, 13, 0, [wall])).toBe(true);
    expect(canFly(0, 4, 0, [{ ...wall, minY: 6, maxY: 8 }])).toBe(false);
    expect(canFly(0, 1, 0, [{ ...wall, minY: 6, maxY: 8 }])).toBe(true);
    expect(canFly(MARINA_BOUNDS.maxX + 2, 20, 0, [])).toBe(false);
  });
  it('takes off, stabilizes hover, lands and clamps altitude', () => {
    let v = createVehicle('helicopter'); for (let i = 0; i < 30; i++) v = flyVehicle(v, 0, 0, 1, false, .05, []).state;
    expect(v.y).toBeGreaterThan(5); const climbed = v.y;
    for (let i = 0; i < 50; i++) v = flyVehicle(v, 0, 0, 0, false, .05, []).state;
    expect(Math.abs(v.climb)).toBeLessThan(.01); expect(v.y).toBeLessThan(climbed + 2);
    for (let i = 0; i < 100; i++) v = flyVehicle(v, 0, 0, -1, false, .05, []).state;
    expect(v.y).toBe(.13); expect(v.climb).toBe(0);
    v = flyVehicle({ ...v, y: 120, climb: 5 }, 0, 0, 1, false, .05, []).state; expect(v.y).toBe(120);
  });
  it('rejects moving/airborne exits and chooses ground clear of the vehicle', () => {
    const v = createVehicle('car'); expect(vehicleExit({ ...v, speed: 10 }, [])).toBeNull();
    expect(vehicleExit({ ...createVehicle('helicopter'), y: 10 }, [])).toBeNull();
    const exit = vehicleExit(v, [])!; expect(canOccupy(exit.x, exit.z, .38, [vehicleBounds(v)])).toBe(true);
    expect(vehicleExit(v, [{ minX: -100, maxX: 100, minZ: -100, maxZ: 100 }])).toBeNull();
  });
  it('purchases one cosmetic wrap and equips it independently for each vehicle', () => {
    const base = { ...createProfile(), xp: 800 }, unlocked = purchase(base, 'paint-jungle').profile;
    const car = equip(unlocked, 'paint-jungle', 0, 'car'); expect(car.vehicleSkins).toEqual({ car: 'paint-jungle', helicopter: 'paint-issued' });
    const both = equip(car, 'paint-jungle', 0, 'helicopter'); expect(both.credits).toBe(950); expect(restoreProfile(JSON.stringify(both))).toEqual(both);
    expect(resolveLoadout(both).weapons[0].damage).toBe(resolveLoadout(base).weapons[0].damage);
    expect(restoreProfile(JSON.stringify({ ...base, vehicleSkins: { car: 'paint-arctic' } })).vehicleSkins.car).toBe('paint-issued');
  });
});
