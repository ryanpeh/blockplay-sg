import { expect, it } from 'vitest';
// @ts-expect-error Shared build-time JavaScript module.
import { depthMesh, stitchDepthMeshes } from '../../scripts/depth-mesh.mjs';

it('unprojects north/east headings into different world directions with finite geometry', () => {
  const depth = new Uint8Array(9).fill(128);
  const north = depthMesh(depth, 3, 3, 0, { steps: 2 });
  const east = depthMesh(depth, 3, 3, 90, { steps: 2 });
  expect(north.positions[12]).toBeCloseTo(0);
  expect(north.positions[14]).toBeLessThan(0);
  expect(east.positions[12]).toBeGreaterThan(0);
  expect(east.positions[14]).toBeCloseTo(0);
  expect(north.positions.every(Number.isFinite)).toBe(true);
  expect(north.indices).toHaveLength(24);
  expect(Math.min(...north.positions.filter((_: number, i: number) => i % 3 === 1))).toBeGreaterThanOrEqual(0);
});

it('rejects a depth buffer whose dimensions do not match', () => {
  expect(() => depthMesh([0], 3, 3, 0)).toThrow('Invalid depth dimensions');
});

it('joins adjacent directional meshes without leaving a seam gap', () => {
  const meshes = [0, 90, 180, 270].map((heading, i) => depthMesh(new Uint8Array(9).fill(30 + i * 40), 3, 3, heading, { steps: 2 }));
  stitchDepthMeshes(meshes, 2);
  for (let sector = 0; sector < 4; sector++) {
    for (let row = 0; row <= 2; row++) {
      const end = (row * 3 + 2) * 3, start = row * 3 * 3;
      expect(meshes[sector].positions.slice(end, end + 3)).toEqual(meshes[(sector + 1) % 4].positions.slice(start, start + 3));
    }
  }
});
