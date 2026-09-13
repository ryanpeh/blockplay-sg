import { describe, expect, it } from 'vitest';
import { buildMarinaScene, MARINA_SPAWN } from './marina-scene';
import { buildRafflesScene, RAFFLES_SPAWN } from './raffles-scene';
import { buildQueenstownScene, QUEENSTOWN_SPAWN } from './queenstown-scene';
import { canOccupy as canMarina, moveInMarina } from './marina-collision';
import { canOccupy as canRaffles, moveInRaffles } from './raffles-collision';
import { canOccupy as canQueenstown, moveInQueenstown } from './queenstown-collision';
import { WORLD_GATEWAYS, WORLD_ZONES, findWorldGateway, findWorldRoute, getWorldZone, isWorldZoneId, resolveWorldTransition } from './world-zones';

describe('connected world travel', () => {
  it('routes through the CBD instead of inventing a direct coast-to-estate checkpoint', () => {
    expect(findWorldRoute('marina-bay', 'queenstown').map(step => step.id)).toEqual(['marina-to-raffles', 'raffles-to-queenstown']);
    expect(findWorldRoute('queenstown', 'marina-bay').map(step => step.id)).toEqual(['queenstown-to-raffles', 'raffles-to-marina']);
    expect(findWorldRoute('raffles-place', 'marina-bay')).toHaveLength(1);
    expect(findWorldRoute('queenstown', 'queenstown')).toEqual([]);
    for (const from of WORLD_ZONES) for (const to of WORLD_ZONES) {
      let current = from.id;
      for (const step of findWorldRoute(from.id, to.id)) {
        expect(step.from).toBe(current);
        expect(resolveWorldTransition(current, step.id, step.position)?.to).toBe(step.to);
        current = step.to;
      }
      expect(current).toBe(to.id);
    }
  });
  it('links every district through reversible checkpoints without immediate return triggers', () => {
    const reached = new Set(['marina-bay']);
    for (let i = 0; i < WORLD_ZONES.length; i++) for (const gateway of WORLD_GATEWAYS) {
      if (reached.has(gateway.from)) reached.add(gateway.to);
      const reverse = WORLD_GATEWAYS.find(candidate => candidate.from === gateway.to && candidate.to === gateway.from);
      expect(reverse, gateway.id).toBeDefined();
      expect(findWorldGateway(gateway.to, gateway.arrival), gateway.id).toBeNull();
      const awayX = gateway.arrival.x - reverse!.position.x, awayZ = gateway.arrival.z - reverse!.position.z;
      const facingDot = awayX * -Math.sin(gateway.arrival.yaw) + awayZ * -Math.cos(gateway.arrival.yaw);
      expect(facingDot, `arrival must face into destination: ${gateway.id}`).toBeGreaterThan(0);
    }
    expect([...reached].sort()).toEqual(WORLD_ZONES.map(zone => zone.id).sort());
    expect(new Set(WORLD_GATEWAYS.map(gateway => gateway.id)).size).toBe(WORLD_GATEWAYS.length);
  });

  it('rejects remote, wrong-zone, forged and non-finite travel requests', () => {
    const gateway = WORLD_GATEWAYS[0];
    expect(resolveWorldTransition(gateway.from, gateway.id, gateway.position)).toMatchObject({ from: gateway.from, to: gateway.to, spawn: gateway.arrival });
    expect(resolveWorldTransition(gateway.from, gateway.id, { x: gateway.position.x + gateway.radius + 0.01, z: gateway.position.z })).toBeNull();
    expect(resolveWorldTransition(gateway.to, gateway.id, gateway.position)).toBeNull();
    expect(resolveWorldTransition(gateway.from, 'nonexistent', gateway.position)).toBeNull();
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(findWorldGateway(gateway.from, { x: value, z: gateway.position.z })).toBeNull();
      expect(findWorldGateway(gateway.from, { x: gateway.position.x, z: value })).toBeNull();
    }
    expect(isWorldZoneId('marina-bay')).toBe(true);
    expect(isWorldZoneId('unloaded-district')).toBe(false);
    expect(isWorldZoneId(null)).toBe(false);
  });

  it('returns independent spawn state and requires no inventory mutation', () => {
    const gateway = WORLD_GATEWAYS[0];
    const transition = resolveWorldTransition(gateway.from, gateway.id, gateway.position)!;
    expect(transition.spawn).not.toBe(gateway.arrival);
    expect(Object.keys(transition).sort()).toEqual(['from', 'gatewayId', 'spawn', 'to']);
  });
});

const scenes = [
  { id: 'marina-bay', build: buildMarinaScene, canOccupy: canMarina, move: moveInMarina, spawn: MARINA_SPAWN },
  { id: 'raffles-place', build: buildRafflesScene, canOccupy: canRaffles, move: moveInRaffles, spawn: RAFFLES_SPAWN },
  { id: 'queenstown', build: buildQueenstownScene, canOccupy: canQueenstown, move: moveInQueenstown, spawn: QUEENSTOWN_SPAWN },
] as const;

for (const adapter of scenes) it(`${adapter.id}: checkpoints and arrivals are clear and connected to the authored spawn`, () => {
  const world = adapter.build();
  try {
    const targets = [
      ...WORLD_GATEWAYS.filter(gateway => gateway.from === adapter.id).map(gateway => gateway.position),
      ...WORLD_GATEWAYS.filter(gateway => gateway.to === adapter.id).map(gateway => gateway.arrival),
    ];
    const spawn = getWorldZone(adapter.id).spawn;
    targets.push(...getWorldZone(adapter.id).encounterSpawns);
    expect(spawn).toMatchObject(adapter.spawn);
    // Use the existing car clearance (wider than an infantry capsule), even
    // though the initial transition controller only permits on-foot travel.
    const radius = 1.35;
    for (const target of [spawn, ...targets]) expect(adapter.canOccupy(target.x, target.z, radius, world.obstacles), JSON.stringify(target)).toBe(true);
    // Real collision-aware flood fill proves these aren't isolated safe points
    // inside inaccessible yards. Stop as soon as all destinations are reachable.
    const queue = [{ x: spawn.x, z: spawn.z }], seen = new Set([`${spawn.x},${spawn.z}`]);
    const pending = new Set(targets);
    for (let i = 0; i < queue.length && pending.size; i++) {
      const p = queue[i];
      for (const target of pending) if (Math.hypot(p.x - target.x, p.z - target.z) <= 2) {
        const end = adapter.move(p, target.x - p.x, target.z - p.z, radius, world.obstacles);
        if (Math.hypot(end.x - target.x, end.z - target.z) < 0.01) pending.delete(target);
      }
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const x = p.x + dx, z = p.z + dz, key = `${x},${z}`;
        if (seen.has(key) || !adapter.canOccupy(x, z, radius, world.obstacles)) continue;
        const end = adapter.move(p, dx, dz, radius, world.obstacles);
        if (Math.hypot(end.x - x, end.z - z) > 0.01) continue;
        seen.add(key); queue.push({ x, z });
      }
    }
    expect([...pending], 'unreachable gateway/spawn positions').toEqual([]);
  } finally { world.dispose(); }
});
