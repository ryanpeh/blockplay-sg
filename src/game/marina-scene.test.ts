import { expect, it } from 'vitest';
import { InstancedMesh } from 'three';
import { buildMarinaScene, MARINA_LANDMARKS, MARINA_SPAWN, MARINA_STAMPS } from './marina-scene';
import { canOccupy, moveInMarina } from './marina-collision';

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

it('uses published SkyPark proportions and batches static details', () => {
  const world = buildMarinaScene();
  try {
    expect(MARINA_LANDMARKS.skyParkLength / MARINA_LANDMARKS.towerHeight).toBeCloseTo(340 / 200);
    expect(MARINA_LANDMARKS.skyParkWidth / MARINA_LANDMARKS.skyParkLength).toBeCloseTo(38 / 340);
    const instances = world.scene.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
    expect(instances.reduce((sum, mesh) => sum + mesh.count, 0)).toBeGreaterThan(2000);
    expect(instances.length).toBeLessThan(60);
    expect(world.scene.userData.referenceFeatures).toHaveLength(8);
  } finally { world.dispose(); }
});
