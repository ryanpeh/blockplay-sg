import { expect, it } from 'vitest';
import * as THREE from 'three';
import { firstVisibleHit } from './fps-raycast';

it('blocks a target behind scenery and ignores invisible parent groups', () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
  const wall = new THREE.Mesh(geometry, material); wall.position.z = -3;
  const target = new THREE.Mesh(geometry, material); target.position.z = -6;
  const group = new THREE.Group(); group.add(wall);
  group.updateMatrixWorld(true); target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
  expect(firstVisibleHit(ray, [target, group])?.object).toBe(wall);
  group.visible = false;
  expect(firstVisibleHit(ray, [target, group])?.object).toBe(target);
  target.visible = false; expect(firstVisibleHit(ray, [target, group])).toBeUndefined();
  geometry.dispose(); material.dispose();
});
