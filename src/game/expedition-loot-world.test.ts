import { describe, expect, it } from 'vitest';
import { createExpeditionLoot } from './expedition-loot';
import { buildExpeditionWorld } from './expedition-world';
import { WORLD_ZONES } from './world-zones';

describe('expedition loot in authored scenes', () => {
  for (const zone of WORLD_ZONES) it(`${zone.id}: all crates are clear and reachable across several seeds`, () => {
    const world = buildExpeditionWorld(zone.id);
    try {
      const targets = ['route-a', 'route-b', 'route-c', 'hackathon'].flatMap(seed => [false, true].flatMap(useAnchors => {
        const loot = createExpeditionLoot(seed).enterZone({ id: zone.id, spawn: zone.spawn, bounds: world.bounds, obstacles: world.obstacles,
          ...(useAnchors ? { anchors: zone.encounterSpawns } : {}) });
        expect(loot, `${zone.id}/${seed} crate count`).toHaveLength(zone.id === 'marina-bay' ? 8 : zone.id === 'raffles-place' ? 10 : 6);
        return loot;
      }));
      const radius = .38;
      const clear = (x: number, z: number) => x - radius >= world.bounds.minX && x + radius <= world.bounds.maxX &&
        z - radius >= world.bounds.minZ && z + radius <= world.bounds.maxZ &&
        !world.obstacles.some(o => x + radius > o.minX && x - radius < o.maxX && z + radius > o.minZ && z - radius < o.maxZ);
      for (const target of targets) expect(clear(target.x, target.z), target.id).toBe(true);
      const queue = [{ x: zone.spawn.x, z: zone.spawn.z }]; const seen = new Set([`${zone.spawn.x},${zone.spawn.z}`]);
      const pending = new Set(targets);
      for (let i = 0; i < queue.length && pending.size; i++) {
        const p = queue[i];
        for (const target of pending) if (Math.hypot(p.x - target.x, p.z - target.z) <= 2.5) {
          const end = world.move(p, target.x - p.x, target.z - p.z, radius, world.obstacles);
          if (Math.hypot(end.x - target.x, end.z - target.z) < .01) pending.delete(target);
        }
        for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
          const x = p.x + dx; const z = p.z + dz; const key = `${x},${z}`;
          if (seen.has(key) || !clear(x, z)) continue;
          const end = world.move(p, dx, dz, radius, world.obstacles);
          if (Math.hypot(end.x - x, end.z - z) > .01) continue;
          seen.add(key); queue.push({ x, z });
        }
      }
      expect([...pending].map(p => ({ id: p.id, x: p.x, z: p.z })), 'unreachable loot positions').toEqual([]);
    } finally { world.dispose(); }
  }, 15000);
});
