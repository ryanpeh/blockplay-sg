import * as THREE from 'three';
import type { WeaponSpec } from './fps-rules';
import { opticMagnification } from './fps-rules';

export interface WeaponSight {
  aimHeight: number; aimDepth: number; radius: number; magnification: number;
  lens: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}
const sights = new WeakMap<THREE.Object3D, WeaponSight>();
export const getWeaponSight = (root: THREE.Object3D) => sights.get(root);

/** Shared by the shop and the FPS: one housing per optic slot. */
export function fitWeaponOptic(root: THREE.Object3D, weapon: WeaponSpec) {
  const sar = weapon.id === 'sar21-inspired', integrated = sar && weapon.optic !== 'reflex';
  const original = root.getObjectByName('sar21-inspired__optic');
  const wasVisible = original?.visible ?? true;
  if (original) original.visible = integrated;
  const group = new THREE.Group(); group.name = 'equipped-optic'; root.add(group);
  const steel = new THREE.MeshStandardMaterial({ color: '#202627', roughness: .38, metalness: .65 });
  const geometry: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number) => {
    geometry.push(g); const m = new THREE.Mesh(g, steel); m.position.set(x, y, z); group.add(m); return m;
  };
  const aimHeight = integrated ? .328 : sar ? .343 : .405;
  const rearZ = integrated ? .194 : sar ? .12 : .19;
  const radius = integrated ? .0235 : .045;
  if (!integrated) {
    group.name = weapon.optic === 'precision' ? 'fps-precision-optic' : 'fps-reflex-optic';
    // The SAR conversion rail takes the place of the entire original scope/bridge.
    if (sar) {
      add(new THREE.BoxGeometry(.045, .016, .30), 0, .273, .015);
      for (let i = 0; i < 12; i++) add(new THREE.BoxGeometry(.049, .007, .008), 0, .284, -.12 + i * .024);
    }
    add(new THREE.BoxGeometry(.038, .042, .055), 0, aimHeight - .061, rearZ - .026);
    const tube = add(new THREE.CylinderGeometry(.05, .05, .052, 28, 1, true), 0, aimHeight, rearZ - .026); tube.rotation.x = Math.PI / 2;
    for (const z of [rearZ - .052, rearZ]) add(new THREE.TorusGeometry(.048, .006, 6, 28), 0, aimHeight, z);
    add(new THREE.BoxGeometry(.025, .038, .039), .061, aimHeight - .005, rearZ - .026);
  }
  const lensMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const lensGeometry = new THREE.CircleGeometry(radius, 48); geometry.push(lensGeometry);
  const lens = new THREE.Mesh(lensGeometry, lensMaterial); lens.name = 'fps-scope-lens';
  lens.position.set(0, aimHeight, rearZ + .001); lens.visible = false; group.add(lens);
  const sight: WeaponSight = { aimHeight, aimDepth: integrated ? -.36 : -.47, radius, magnification: opticMagnification(weapon), lens };
  sights.set(root, sight);
  return () => {
    if (original) original.visible = wasVisible;
    sights.delete(root); group.removeFromParent(); geometry.forEach(g => g.dispose()); steel.dispose(); lensMaterial.dispose();
  };
}

/** The target covers only the lens, so crop FOV as well as applying magnification. */
export function scopeFov(worldFov: number, lensFraction: number, magnification: number) {
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(worldFov / 2)) * lensFraction / magnification));
}

export function createScopeRenderer(renderer: THREE.WebGLRenderer) {
  // One reusable 384px target. No extra world render at hip, with red dots, or in vehicles.
  const target = new THREE.WebGLRenderTarget(384, 384, { depthBuffer: true, stencilBuffer: false });
  const camera = new THREE.PerspectiveCamera();
  const lensPosition = new THREE.Vector3();
  return {
    render(world: THREE.Scene, worldCamera: THREE.PerspectiveCamera, viewCamera: THREE.PerspectiveCamera, sight: WeaponSight | undefined, active: boolean) {
      if (!sight) return false;
      sight.lens.visible = active && sight.magnification > 1.01;
      if (!sight.lens.visible) return false;
      sight.lens.getWorldPosition(lensPosition);
      const depth = -lensPosition.applyMatrix4(viewCamera.matrixWorldInverse).z;
      const fraction = sight.radius / (Math.max(.01, depth) * Math.tan(THREE.MathUtils.degToRad(viewCamera.fov / 2)));
      camera.copy(worldCamera); camera.aspect = 1;
      camera.fov = scopeFov(worldCamera.fov, fraction, sight.magnification); camera.updateProjectionMatrix();
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(world, camera); renderer.setRenderTarget(previous);
      sight.lens.material.map = target.texture;
      return true;
    },
    dispose() { target.dispose(); },
  };
}
