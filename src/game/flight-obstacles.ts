import * as THREE from 'three';
import type { FlightObstacle } from './vehicle-rules';

/** Snapshot the authored geometry once, preserving open space under decks/viaducts. */
export function sceneFlightObstacles(scene: THREE.Object3D): FlightObstacle[] {
  const result: FlightObstacle[] = [], box = new THREE.Box3(), instance = new THREE.Matrix4(), matrix = new THREE.Matrix4();
  scene.updateMatrixWorld(true);
  const add = (mesh: THREE.Mesh, transform: THREE.Matrix4) => {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box.copy(mesh.geometry.boundingBox!).applyMatrix4(transform);
    if (box.isEmpty() || box.max.y <= .5) return;
    result.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, minY: Math.max(0, box.min.y), maxY: box.max.y });
  };
  scene.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object instanceof THREE.InstancedMesh) {
      for (let i = 0; i < object.count; i++) { object.getMatrixAt(i, instance); matrix.multiplyMatrices(object.matrixWorld, instance); add(object, matrix); }
    } else add(object, object.matrixWorld);
  });
  return result;
}
