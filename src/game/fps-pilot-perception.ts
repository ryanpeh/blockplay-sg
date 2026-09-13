import * as THREE from 'three';
import type { PilotContact } from './fps-pilot';

/** Trusted sensor adapter. Private geometry ends here; controllers receive angles only. */
export interface PilotSubject { id: string; root: THREE.Object3D; points: THREE.Vector3[]; radius: number }
const belongsTo = (object: THREE.Object3D, root: THREE.Object3D) => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node === root) return true;
  return false;
};
export function visiblePilotContacts(camera: THREE.PerspectiveCamera, scene: THREE.Scene, subjects: readonly PilotSubject[], screenBlocked: (point: THREE.Vector2) => boolean = () => false): PilotContact[] {
  const ray = new THREE.Raycaster(), projected = new THREE.Vector3(), local = new THREE.Vector3();
  const surfaces: THREE.Mesh[] = [];
  const collect = (node: THREE.Object3D) => {
    if (!node.visible || node.userData.fpsEffect) return;
    if (node instanceof THREE.Mesh) surfaces.push(node);
    node.children.forEach(collect);
  };
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); collect(scene);
  const contacts: PilotContact[] = [];
  for (const subject of subjects) {
    for (const point of subject.points) {
      projected.copy(point).project(camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .97 || Math.abs(projected.y) > .97 || screenBlocked(new THREE.Vector2(projected.x, projected.y))) continue;
      local.copy(point).sub(camera.position); const distance = local.length();
      if (distance > 125 || distance < .1) continue;
      ray.set(camera.position, local.normalize()); ray.far = distance + subject.radius;
      const hit = ray.intersectObjects(surfaces, false)[0];
      if (!hit || !belongsTo(hit.object, subject.root)) continue;
      local.copy(point).applyMatrix4(camera.matrixWorldInverse);
      contacts.push({ id: subject.id, yawError: Math.atan2(-local.x, -local.z), pitchError: Math.atan2(local.y, Math.hypot(local.x, local.z)), angularRadius: Math.atan(subject.radius / distance) });
      break;
    }
  }
  return contacts;
}
