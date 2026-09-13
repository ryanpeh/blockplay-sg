import { expect, it } from 'vitest';
import * as THREE from 'three';
import { getFpsDistrict } from './fps-districts';
import { buildDistrictWorld } from './district-world';
import { sceneFlightObstacles } from './flight-obstacles';
import { WORLD_ZONES } from './world-zones';
import { canFly, createVehicle, driveVehicle, vehicleBounds, vehicleExit } from './vehicle-rules';
import { firstVisibleHit } from './fps-raycast';

for (const { id } of WORLD_ZONES) it(`${id}: practice spawns, all targets and vehicles are clear on the actual map`, () => {
  const config = getFpsDistrict(id), world = buildDistrictWorld(id);
  try {
    world.stamps.forEach(s => { s.visible = false; }); world.scene.updateMatrixWorld(true);
    const clear = (x: number, z: number, r: number) => x - r >= world.bounds.minX && x + r <= world.bounds.maxX && z - r >= world.bounds.minZ && z + r <= world.bounds.maxZ && !world.obstacles.some(o => x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
    expect(clear(config.spawn.x, config.spawn.z, .38), 'player spawn').toBe(true);
    expect(config.targets).toHaveLength(8);
    for (const [i, target] of config.targets.entries()) {
      expect(clear(target.x, target.z, .5), `target ${i}`).toBe(true);
      const eye = new THREE.Vector3(config.spawn.x, 1.65, config.spawn.z), aim = new THREE.Vector3(target.x, 1.43, target.z);
      const ray = new THREE.Raycaster(eye, aim.clone().sub(eye).normalize(), 0, eye.distanceTo(aim) - .1);
      expect(firstVisibleHit(ray, world.scene.children), `target ${i} sightline`).toBeUndefined();
    }
    const props = config.props.map(([, x, z, w, d]) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }));
    const targets = config.targets.map(p => ({ minX: p.x - .42, maxX: p.x + .42, minZ: p.z - .42, maxZ: p.z + .42 }));
    for (const kind of ['car', 'helicopter'] as const) {
      const vehicle = createVehicle(kind, config.vehicles[kind]), b = vehicleBounds(vehicle);
      const other = createVehicle(kind === 'car' ? 'helicopter' : 'car', config.vehicles[kind === 'car' ? 'helicopter' : 'car']);
      const obstacles = [...world.obstacles, ...props, ...targets, vehicleBounds(other)];
      expect(obstacles.some(o => b.maxX > o.minX && b.minX < o.maxX && b.maxZ > o.minZ && b.minZ < o.maxZ), `${kind} spawn`).toBe(false);
      expect(vehicleExit(vehicle, obstacles, world.bounds), `${kind} exit`).not.toBeNull();
      if (kind === 'car') {
        const step = driveVehicle(vehicle, 1, 0, false, .05, obstacles, world.bounds);
        expect(Math.hypot(step.state.x - vehicle.x, step.state.z - vehicle.z)).toBeGreaterThan(0);
      }
    }
    if (id !== 'marina-bay') {
      const flight = sceneFlightObstacles(world.scene), h = config.vehicles.helicopter;
      expect(canFly(h.x, .13, h.z, flight, world.bounds), 'helicopter takeoff').toBe(true);
      expect(canFly(h.x, 10, h.z, flight, world.bounds), 'clear vertical departure').toBe(true);
    }
  } finally { world.dispose(); }
});
it('uses regional vehicle boundaries for driving, flying and dismounting', () => {
  const bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  const v = { ...createVehicle('car'), x: 0, z: -7.5, yaw: 0, speed: 20 };
  expect(driveVehicle(v, 1, 0, false, .05, [], bounds).state.z).toBeGreaterThanOrEqual(-7.65);
  expect(canFly(9, 10, 0, [], bounds)).toBe(false);
  const exit = vehicleExit({ ...v, x: 9, z: 0, speed: 0 }, [], bounds)!;
  expect(exit.x).toBeLessThanOrEqual(9.62);
});
it('derives instanced building heights and preserves the space beneath elevated structures', () => {
  const scene = new THREE.Scene(), geometry = new THREE.BoxGeometry(4, 2, 4), material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, 2);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 8, 0));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(20, 30, 0)); scene.add(mesh);
  const obstacles = sceneFlightObstacles(scene);
  expect(obstacles).toHaveLength(2);
  expect(canFly(0, .13, 0, obstacles)).toBe(true);
  expect(canFly(0, 7, 0, obstacles)).toBe(false);
  expect(canFly(20, 30, 0, obstacles)).toBe(false);
  geometry.dispose(); material.dispose(); mesh.dispose();
});
