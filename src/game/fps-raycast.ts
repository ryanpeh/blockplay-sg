import * as THREE from 'three';

/** Nearest visible surface wins, so a target behind cover cannot be scored. */
export function firstVisibleHit(ray: THREE.Raycaster, objects: THREE.Object3D[]) {
  return ray.intersectObjects(objects, true).find(hit => {
    let object: THREE.Object3D | null = hit.object;
    while (object) { if (!object.visible) return false; object = object.parent; }
    return true;
  });
}
