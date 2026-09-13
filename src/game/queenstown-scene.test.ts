import { expect, it } from 'vitest';
import { buildQueenstownScene, QUEENSTOWN_SPAWN, QUEENSTOWN_STAMPS } from './queenstown-scene';
import { canOccupy, moveInQueenstown, QUEENSTOWN_BOUNDS } from './queenstown-collision';

it('creates a distinct estate with safe spawn and reachable driving collectibles', () => {
  const world = buildQueenstownScene();
  try {
    expect(world.scene.userData.authoredMeshCount).toBeGreaterThan(500);
    expect(world.scene.children.length).toBeLessThan(100);
    expect(world.stamps).toHaveLength(5);
    expect(canOccupy(QUEENSTOWN_SPAWN.x, QUEENSTOWN_SPAWN.z, 1.35, world.obstacles)).toBe(true);
    const seen = new Set<string>(); const queue = [{ x: -18, z: 82 }];
    for (let index = 0; index < queue.length; index++) {
      const p = queue[index];
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const x = p.x + dx, z = p.z + dz, key = `${x},${z}`;
        if (seen.has(key) || !canOccupy(x, z, 1.35, world.obstacles)) continue;
        const moved = moveInQueenstown(p, dx, dz, 1.35, world.obstacles);
        if (Math.abs(moved.x - x) > 0.01 || Math.abs(moved.z - z) > 0.01) continue;
        seen.add(key); queue.push({ x, z });
      }
    }
    for (const stamp of QUEENSTOWN_STAMPS) expect(queue.some(p => Math.hypot(p.x - stamp.x, p.z - stamp.z) < 3), stamp.name).toBe(true);
    world.animate(12);
    expect(world.stamps.every(stamp => Number.isFinite(stamp.position.y))).toBe(true);
  } finally { world.dispose(); }
});

it('allows passage through open void decks but stops at estate columns', () => {
  const world = buildQueenstownScene();
  try {
    expect(canOccupy(-73, -44, 1.35, world.obstacles)).toBe(true);
    expect(canOccupy(-73, -38.2, 0.65, world.obstacles)).toBe(false);
    expect(canOccupy(QUEENSTOWN_BOUNDS.maxX, 0, 1, [])).toBe(false);
    expect(moveInQueenstown({ x: 180, z: 0 }, 30, 0, 1, []).x).toBeLessThanOrEqual(183);
  } finally { world.dispose(); }
});
