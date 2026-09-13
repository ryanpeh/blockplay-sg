import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createFpsVehicles } from './fps-vehicles';
import { firstVisibleHit } from './fps-raycast';

afterEach(() => vi.unstubAllGlobals());

it('keeps vehicle labels decorative for camera-free counter-fire rays and player shots', () => {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
    getContext: () => ({ fillRect() {}, fillText() {} }),
  }) });
  const scene = new THREE.Scene();
  const vehicles = createFpsVehicles(scene, [], { car: '', helicopter: '' });
  try {
    scene.updateMatrixWorld(true);
    const labels: THREE.Sprite[] = [];
    scene.traverse(object => { if (object instanceof THREE.Sprite) labels.push(object); });
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      const position = label.getWorldPosition(new THREE.Vector3());
      const ray = new THREE.Raycaster(position.clone().add(new THREE.Vector3(0, 0, 10)), new THREE.Vector3(0, 0, -1));
      expect(ray.camera).toBeNull();
      expect(() => firstVisibleHit(ray, scene.children)).not.toThrow();
      expect(firstVisibleHit(ray, [label])).toBeUndefined();
      ray.camera = new THREE.PerspectiveCamera();
      expect(firstVisibleHit(ray, [label])).toBeUndefined();
    }
    // The actual car still obstructs fire: only its floating label is excluded.
    const car = vehicles.states.car;
    const bodyRay = new THREE.Raycaster(new THREE.Vector3(car.x, 1, car.z + 20), new THREE.Vector3(0, 0, -1));
    const hit = firstVisibleHit(bodyRay, [vehicles.models.car]);
    expect(hit).toBeDefined();
  } finally { vehicles.dispose(); }
});
