import { expect, it } from 'vitest';
import { Mesh } from 'three';
import { buildQueenstownScene, QUEENSTOWN_MAP_ROADS, QUEENSTOWN_SPAWN, QUEENSTOWN_STAMPS } from './queenstown-scene';
import { canOccupy, moveInQueenstown, QUEENSTOWN_BOUNDS } from './queenstown-collision';

it('creates a distinct estate with safe spawn and reachable driving collectibles', () => {
  const world = buildQueenstownScene();
  try {
    expect(world.scene.userData.authoredMeshCount).toBeGreaterThan(2000);
    expect(world.scene.children.length).toBeLessThan(100);
    expect(world.stamps).toHaveLength(8);
    expect((QUEENSTOWN_BOUNDS.maxX-QUEENSTOWN_BOUNDS.minX)*(QUEENSTOWN_BOUNDS.maxZ-QUEENSTOWN_BOUNDS.minZ)/(368*288)).toBeGreaterThan(2);
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

it('keeps the road loop and sheltered waiting areas open while furniture is solid', () => {
  const world = buildQueenstownScene();
  try {
    for (let x = -132; x <= 132; x += 4) for (const z of [-122, 116, 17, 28]) expect(canOccupy(x,z,1.35,world.obstacles), `road ${x},${z}`).toBe(true);
    for (let z = -114; z <= 108; z += 4) for (const x of [-140,140]) expect(canOccupy(x,z,1.35,world.obstacles), `loop ${x},${z}`).toBe(true);
    expect(canOccupy(-88,4.5,0.65,world.obstacles)).toBe(true);
    for (let x=-232;x<=232;x+=4) for (const z of [-185,185]) expect(canOccupy(x,z,1.35,world.obstacles), `outer ${x},${z}`).toBe(true);
    for (let z=-180;z<=180;z+=4) for (const x of [-235,235]) expect(canOccupy(x,z,1.35,world.obstacles), `outer ${x},${z}`).toBe(true);
    expect(canOccupy(-99,97,0.65,world.obstacles)).toBe(false);
    expect(world.scene.userData.detailFeatures).toContain('bus-shelters');
    for (const road of QUEENSTOWN_MAP_ROADS.slice(3)) for (let i=1;i<road.points.length;i++) {
      const a=road.points[i-1],b=road.points[i],distance=Math.hypot(b.x-a.x,b.z-a.z);
      for (let d=0;d<=distance;d+=3) {const x=a.x+(b.x-a.x)*d/distance,z=a.z+(b.z-a.z)*d/distance;expect(canOccupy(x,z,1.35,world.obstacles),`connector ${x},${z}`).toBe(true);}
    }
  } finally { world.dispose(); }
});

it('allows passage through open void decks but stops at estate columns', () => {
  const world = buildQueenstownScene();
  try {
    expect(canOccupy(-73, -44, 1.35, world.obstacles)).toBe(true);
    expect(canOccupy(-73, -38.2, 0.65, world.obstacles)).toBe(false);
    expect(canOccupy(QUEENSTOWN_BOUNDS.maxX, 0, 1, [])).toBe(false);
    expect(moveInQueenstown({ x: 250, z: 0 }, 30, 0, 1, []).x).toBeLessThanOrEqual(259);
  } finally { world.dispose(); }
});

it('retains Static-reference model depth and differentiated materials within the draw budget', () => {
  const world=buildQueenstownScene();
  try {
    expect(world.scene.userData.authoredMeshCount).toBeGreaterThan(14000);
    expect(world.scene.children.length).toBeLessThan(100);
    expect(world.scene.userData.qualityFeatures).toEqual(expect.arrayContaining(['rounded-viaduct-piers','projecting-station-louvers','framed-lattice-galleries','barrel-roof-seams','round-kopi-tables','four-sided-tower-facades','branched-canopies','gateway-louver-panels']));
    const geometryTypes=new Set<string>();world.scene.traverse(child=>{if(child instanceof Mesh)geometryTypes.add(child.geometry.type);});
    expect(geometryTypes.has('CylinderGeometry')).toBe(true);
    expect(geometryTypes.has('TubeGeometry')).toBe(true);
    expect(world.scene.userData.materialRoughness.glass).toBeLessThan(world.scene.userData.materialRoughness.plaster);
    expect(world.scene.userData.materialRoughness.paintedMetal).toBeLessThan(world.scene.userData.materialRoughness.plaster);
  } finally {world.dispose();}
});
