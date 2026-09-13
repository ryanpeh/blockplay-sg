import { expect, it } from 'vitest';
import { InstancedMesh } from 'three';
import { buildMarinaScene, MARINA_LANDMARKS, MARINA_MAP_ROADS, MARINA_SPAWN, MARINA_STAMPS } from './marina-scene';
import { canOccupy, MARINA_BOUNDS, moveInMarina } from './marina-collision';

it('keeps spawn, collectibles and the full road loop clear for the car', () => {
  const world = buildMarinaScene();
  try {
    for (const point of [MARINA_SPAWN, ...MARINA_STAMPS]) expect(canOccupy(point.x, point.z, 1.35, world.obstacles)).toBe(true);
    let position = { x: -103, z: 94 };
    for (const next of [{ x: 103, z: 94 }, { x: 103, z: -112 }, { x: -103, z: -112 }, { x: -103, z: 94 }]) {
      position = moveInMarina(position, next.x - position.x, next.z - position.z, 1.35, world.obstacles);
      expect(position.x).toBeCloseTo(next.x); expect(position.z).toBeCloseTo(next.z);
    }
  } finally { world.dispose(); }
});

it('adds over 70 percent more area and keeps all three road circuits and connectors clear', () => {
  expect((MARINA_BOUNDS.maxX - MARINA_BOUNDS.minX) * (MARINA_BOUNDS.maxZ - MARINA_BOUNDS.minZ)).toBeGreaterThan(556 * 466 * 1.7);
  expect(MARINA_STAMPS).toHaveLength(14);
  const world = buildMarinaScene();
  try {
    for (const route of MARINA_MAP_ROADS) for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const reached = moveInMarina(a, b.x - a.x, b.z - a.z, 1.35, world.obstacles);
      expect(reached.x).toBeCloseTo(b.x); expect(reached.z).toBeCloseTo(b.z);
    }
  } finally { world.dispose(); }
});

it('can reach all fourteen stamps from spawn without crossing a collider', () => {
  const world = buildMarinaScene();
  try {
    const queue = [{ x: MARINA_SPAWN.x, z: MARINA_SPAWN.z }];
    const seen = new Set([`${MARINA_SPAWN.x},${MARINA_SPAWN.z}`]);
    const unreached = new Set(MARINA_STAMPS.map(point => point.name));
    for (let index = 0; index < queue.length && unreached.size; index++) {
      const p = queue[index];
      for (const stamp of MARINA_STAMPS) if (Math.hypot(p.x - stamp.x, p.z - stamp.z) < 3) unreached.delete(stamp.name);
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const x = p.x + dx, z = p.z + dz, key = `${x},${z}`;
        if (seen.has(key) || !canOccupy(x, z, 1.35, world.obstacles)) continue;
        const moved = moveInMarina(p, dx, dz, 1.35, world.obstacles);
        if (Math.abs(moved.x - x) > 0.01 || Math.abs(moved.z - z) > 0.01) continue;
        seen.add(key); queue.push({ x, z });
      }
    }
    expect([...unreached]).toEqual([]);
  } finally { world.dispose(); }
});

it('uses published SkyPark proportions and batches static details', () => {
  const world = buildMarinaScene();
  try {
    expect(MARINA_LANDMARKS.skyParkLength / MARINA_LANDMARKS.towerHeight).toBeCloseTo(340 / 200);
    expect(MARINA_LANDMARKS.skyParkWidth / MARINA_LANDMARKS.skyParkLength).toBeCloseTo(38 / 340);
    const instances = world.scene.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
    expect(instances.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(8000);
    expect(instances.length).toBeLessThan(60);
    expect(world.scene.userData.referenceFeatures).toHaveLength(21);
  } finally { world.dispose(); }
});

it('models the reviewed facade and landmark details without expanding the play footprint', () => {
  const world = buildMarinaScene();
  try {
    expect(MARINA_BOUNDS).toEqual({ minX: -338, maxX: 388, minZ: -328, maxZ: 288 });
    expect(MARINA_STAMPS).toHaveLength(14);
    expect(world.scene.userData.qualityDetails).toEqual({ esplanadeSunshades: 472, wheelCapsules: 16, conservatoryGlazingSegments: 224, sandsMullions: 3240 });
    const instances = world.scene.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
    expect(instances.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(14000);
    expect(instances.length).toBeLessThan(60);
    expect(world.scene.children.length).toBeLessThan(240);
  } finally { world.dispose(); }
});
