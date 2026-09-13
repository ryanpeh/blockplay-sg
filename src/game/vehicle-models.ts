import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { itemById } from './armory-catalog';
import type { VehicleKind } from './vehicle-rules';

export function vehiclePaint(id: string) {
  const item = itemById(id), canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!, colors = item?.palette || ['#45513a', '#45513a', '#45513a', '#45513a'];
  ctx.fillStyle = colors[0]; ctx.fillRect(0, 0, 256, 256);
  let seed = 2111;
  for (let i = 0; i < 130; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; ctx.fillStyle = colors[(seed >>> 19) % colors.length]; ctx.fillRect((seed % 32) * 8, ((seed >>> 8) % 32) * 8, 8 * (2 + (seed >>> 21) % 5), 8 * (1 + (seed >>> 24) % 5)); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ name: 'Vehicle paint', map: texture, roughness: .64, metalness: .25 });
}
/** Original utility vehicle silhouettes; no copied game logos or liveries. Forward is local -Z. */
export function buildVehicleModel(kind: VehicleKind, skin = 'paint-issued') {
  const root = new THREE.Group(), paint = vehiclePaint(skin);
  const dark = new THREE.MeshStandardMaterial({ color: '#20272a', roughness: .8 });
  const metal = new THREE.MeshStandardMaterial({ color: '#737b75', roughness: .4, metalness: .75 });
  const glass = new THREE.MeshStandardMaterial({ color: '#254652', roughness: .18, metalness: .4 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#e7dbb1', emissive: '#b29e64', emissiveIntensity: .4 });
  const red = new THREE.MeshStandardMaterial({ color: '#a44836', emissive: '#641c10', emissiveIntensity: .35 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material = paint, parent: THREE.Object3D = root, radius = .045) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const rod = (a: number[], b: number[], radius = .06, material = metal, parent: THREE.Object3D = root) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material); mesh.position.copy(from.add(to).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); parent.add(mesh); return mesh;
  };
  if (kind === 'car') {
    box(2.05, .55, 4.45, 0, .8, 0); box(1.86, .85, 2.5, 0, 1.45, .24, glass);
    box(2.04, .17, 2.85, 0, 1.99, .25); box(1.96, .24, 1.25, 0, 1.13, -1.54);
    for (const x of [-.98, .98]) {
      for (const z of [-1.02, .32, 1.62]) box(.08, .93, .10, x, 1.5, z);
      box(.09, .45, 2.4, x, 1.11, .27); box(.18, .12, 2.8, x, .48, .18, dark);
      box(.24, .20, .25, x * 1.17, 1.49, -.81, dark); for (const z of [-.45, .92]) box(.05, .05, .20, x * 1.025, 1.35, z, metal);
      for (const z of [-1.45, 1.45]) {
        const wheel = new THREE.Group(); wheel.name = 'vehicle-wheel'; wheel.position.set(x * 1.03, .5, z); root.add(wheel);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .35, 24), dark); tire.rotation.z = Math.PI / 2; wheel.add(tire);
        for (const side of [-1, 1]) { const hub = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .015, 12), metal); hub.rotation.z = Math.PI / 2; hub.position.x = side * .181; wheel.add(hub); }
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const tread = box(.37, .10, .13, 0, Math.cos(a) * .49, Math.sin(a) * .49, dark, wheel, .012); tread.rotation.x = a; }
      }
    }
    box(2.18, .18, .24, 0, .61, -2.28, dark); box(2.18, .18, .24, 0, .61, 2.28, dark);
    box(.92, .30, .03, 0, .96, -2.245, dark); for (let i = -3; i <= 3; i++) box(.045, .23, .03, i * .12, .96, -2.265, metal);
    for (const x of [-.77, .77]) { box(.35, .25, .08, x, .98, -2.25, lamp); box(.22, .24, .08, x, .91, 2.25, red); }
    for (const x of [-.8, .8]) rod([x, 2.13, -.9], [x, 2.13, 1.4], .045, dark);
    for (const z of [-.9, 0, 1.4]) rod([-.85, 2.13, z], [.85, 2.13, z], .045, dark);
    box(1.3, .35, .7, 0, 2.28, .65, dark);
  } else {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), paint); shell.position.set(0, 1.55, -.25); shell.scale.set(1.13, 1.05, 2.0); root.add(shell);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), glass); canopy.position.set(0, 1.69, -1.05); canopy.scale.set(.96, .8, 1.22); root.add(canopy);
    // Center windscreen seam and cabin door outlines.
    rod([0, 2.41, -1.55], [0, 1.23, -2.22], .038, metal);
    for (const x of [-1.01, 1.01]) { box(.045, 1.14, .04, x, 1.61, -.28, metal); box(.048, .04, 1.1, x, 1.08, .20, metal); box(.06, .08, .25, x, 1.60, .30, dark); }
    box(1.34, .48, 1.85, 0, 2.36, .3); box(.68, .36, .95, 0, 2.58, .49, dark);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(.13, .38, 4.7, 14), paint); tail.position.set(0, 1.67, 3.3); tail.rotation.x = Math.PI / 2; root.add(tail);
    const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(.7, 0); finShape.lineTo(.95, 1.65); finShape.lineTo(.3, 1.4); finShape.closePath();
    const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: .09, bevelEnabled: true, bevelSize: .035, bevelThickness: .02, bevelSegments: 2, steps: 1 }), paint); fin.rotation.y = Math.PI / 2; fin.position.set(-.045, 1.5, 5.6); root.add(fin);
    box(2.2, .09, .55, 0, 1.72, 4.7);
    const rotor = new THREE.Group(); rotor.name = 'main-rotor'; rotor.position.set(0, 3.02, .15); root.add(rotor);
    rod([0, 2.56, .15], [0, 3.12, .15], .11, metal);
    for (let i = 0; i < 4; i++) { const blade = new THREE.Group(); blade.rotation.y = i * Math.PI / 2; rotor.add(blade); box(.22, .055, 5.2, 0, 0, -2.62, dark, blade, .015); box(.23, .06, .4, 0, 0, -4.99, lamp, blade, .01); }
    const tailRotor = new THREE.Group(); tailRotor.name = 'tail-rotor'; tailRotor.position.set(.24, 2.11, 5.29); root.add(tailRotor);
    box(.07, 1.5, .11, 0, 0, 0, dark, tailRotor); box(.07, .11, 1.5, 0, 0, 0, dark, tailRotor);
    for (const x of [-1.20, 1.20]) {
      rod([x, .17, -1.75], [x, .17, 1.6], .095, dark); rod([x, .17, -1.75], [x, .38, -2.1], .095, dark);
      for (const z of [-.8, .85]) rod([x, .17, z], [x * .62, .93, z], .075, metal);
    }
    box(.22, .16, .2, -.95, 1.7, .60, red); box(.22, .16, .2, .95, 1.7, .60, lamp);
  }
  root.userData.vehicleKind = kind;
  return root;
}
