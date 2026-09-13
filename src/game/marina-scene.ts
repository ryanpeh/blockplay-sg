import * as THREE from 'three';
import type { Obstacle } from './marina-collision';

export const MARINA_SPAWN = { x: 0, z: 71, yaw: -0.52 };
export const MARINA_STAMPS = [
  { name: 'Waterfront', x: 45, z: 65 },
  { name: 'City skyline', x: -103, z: 15 },
  { name: 'Bay crossing', x: -20, z: -112 },
  { name: 'Lotus museum', x: 103, z: -77 },
  { name: 'SkyPark', x: 126, z: 65 },
];

/** Authored, compressed game map. Photos inform the promenade; geometry is not surveyed. */
export function buildMarinaScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#c4ddd9');
  scene.fog = new THREE.Fog('#c4ddd9', 230, 650);
  scene.add(new THREE.HemisphereLight('#fff4d9', '#829d92', 2.5));
  const sun = new THREE.DirectionalLight('#fff2cf', 3);
  sun.position.set(-120, 190, 90); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 1, far: 550 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.3; scene.add(sun);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const obstacles: Obstacle[] = [{ minX: -80, maxX: 80, minZ: -90, maxZ: 50 }];
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }); materials.push(material); return material;
  };
  const boxGeo = geo(new THREE.BoxGeometry(1, 1, 1));
  const cream = mat('#e8e0c7'), pale = mat('#f3eddb'), glass = mat('#799f9e'), dark = mat('#536d68');
  const sand = mat('#d7d1b9'), road = mat('#657771'), white = mat('#e9e8cf'), leaf = mat('#648a62'), trunk = mat('#a38e6b');
  const orange = mat('#e88f5d'), mint = mat('#a4c5a3'), water = mat('#6eb5ba', { roughness: 0.35, metalness: 0.15 });
  const collider = (x: number, z: number, w: number, d: number) => obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene, shadow = false) {
    const mesh = new THREE.Mesh(boxGeo, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  box(0, -0.6, -20, 430, 1, 360, mat('#a5b496'));
  box(0, -0.18, -20, 188, 0.35, 168, sand);
  box(0, -0.05, -20, 160, 0.15, 140, water);
  // The road completes a continuous loop around the bay.
  for (const z of [-112, 94]) {
    box(0, 0, z, 220, 0.08, 15, road);
    for (let x = -100; x <= 100; x += 12) box(x, 0.06, z, 5, 0.03, 0.15, white);
  }
  for (const x of [-103, 103]) {
    box(x, 0, -9, 15, 0.08, 206, road);
    for (let z = -100; z < 90; z += 12) box(x, 0.06, z, 0.15, 0.03, 5, white);
  }
  box(0, 0, 66, 185, 0.15, 28, sand);
  box(121, 0, 62, 32, 0.15, 24, sand);
  // Promenade paving and the horizontal waterfront railing, observed in source views.
  for (let x = -90; x <= 90; x += 8) box(x, 0.09, 66, 0.07, 0.015, 28, cream);
  for (const z of [54, 62, 70, 78]) box(0, 0.09, z, 184, 0.015, 0.07, cream);
  for (const y of [0.55, 1.05, 1.5]) {
    box(0, y, 50.6, 161, 0.08, 0.08, dark);
    box(-80.6, y, -20, 0.08, 0.08, 141, dark);
    box(80.6, y, -20, 0.08, 0.08, 141, dark);
  }
  for (let x = -80; x <= 80; x += 5) box(x, 0.75, 50.6, 0.12, 1.5, 0.12, dark);
  for (let z = -90; z <= 50; z += 5) for (const x of [-80.6, 80.6]) box(x, 0.75, z, 0.12, 1.5, 0.12, dark);
  const frondGeo = geo(new THREE.ConeGeometry(1, 1, 3));
  function palm(x: number, z: number, height = 11, parent: THREE.Object3D = scene, collision = true) {
    box(x, height / 2, z, 0.55, height, 0.55, trunk, parent, true);
    for (let j = 0; j < 7; j++) {
      const angle = j / 7 * Math.PI * 2;
      const frond = new THREE.Mesh(frondGeo, leaf);
      frond.position.set(x + Math.cos(angle) * 1.8, height + 0.2, z + Math.sin(angle) * 1.8);
      frond.scale.set(1.3, 5.4, 0.5); frond.rotation.set(Math.sin(angle) * 1.25, 0, -Math.cos(angle) * 1.25);
      frond.castShadow = true; parent.add(frond);
    }
    if (collision) collider(x, z, 1, 1);
  }
  for (let x = -84; x <= 84; x += 21) { palm(x, 75, 10 + (x % 3)); box(x, 0.2, 75, 3.5, 0.4, 3.5, cream); }
  for (let z = -80; z < 50; z += 26) { palm(-89, z); palm(89, z); }
  for (let x = -65; x <= 70; x += 45) {
    box(x, 0.7, 58, 4, 0.25, 1, trunk); box(x - 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); box(x + 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); collider(x, 58, 4, 1);
  }
  // Open shade pavilion echoes the promenade's overhead frames.
  for (const x of [-55, -40, -25]) {
    box(x, 3.2, 70, 0.24, 6.4, 0.24, pale, scene, true);
    box(x, 3.2, 82, 0.24, 6.4, 0.24, pale, scene, true);
    box(x, 6.5, 76, 0.25, 0.25, 12.5, pale);
    collider(x, 70, 0.5, 0.5); collider(x, 82, 0.5, 0.5);
  }
  for (const z of [70, 73, 76, 79, 82]) box(-40, 6.5, z, 32, 0.18, 0.18, pale);

  // Marina Bay Sands: three modeled towers, connected by a boat-shaped SkyPark.
  for (const z of [-65, -15, 35]) {
    box(148, 39, z, 24, 78, 28, glass, scene, true); collider(148, z, 24, 28);
    for (const x of [136, 142, 148, 154, 160]) box(x, 39, z + 14.3, 1.2, 78, 0.8, pale);
    for (const x of [136, 160]) box(x, 39, z, 1.4, 78, 29, pale);
    for (let y = 5; y < 79; y += 4) box(135.2, y, z, 0.5, 0.6, 28.5, cream);
    box(148, 1.5, z, 28, 3, 31, pale);
  }
  const boat = new THREE.Shape();
  boat.moveTo(-17, -91); boat.quadraticCurveTo(0, -110, 17, -91); boat.lineTo(17, 70); boat.quadraticCurveTo(15, 95, 0, 99); boat.quadraticCurveTo(-17, 90, -17, 70); boat.closePath();
  const deckGeo = geo(new THREE.ExtrudeGeometry(boat, { depth: 3, bevelEnabled: true, bevelSegments: 1, bevelSize: 1.3, bevelThickness: 0.6, steps: 1, curveSegments: 10 }));
  const deck = new THREE.Mesh(deckGeo, cream); deck.rotation.x = -Math.PI / 2; deck.position.set(148, 79, -15); deck.castShadow = true; scene.add(deck);
  box(142, 82.25, -15, 6, 0.4, 116, water);
  box(153, 82.2, -15, 11, 0.3, 137, leaf);
  const crownGeo = geo(new THREE.IcosahedronGeometry(2.6, 0));
  for (let z = -74; z < 65; z += 13) { const crown = new THREE.Mesh(crownGeo, leaf); crown.position.set(153, 84.5, z); scene.add(crown); }
  // Lotus-like ArtScience Museum, fully modeled petals.
  const baseGeo = geo(new THREE.CylinderGeometry(11, 8, 5, 12));
  const museumBase = new THREE.Mesh(baseGeo, pale); museumBase.position.set(135, 2.5, -110); scene.add(museumBase); collider(135, -110, 28, 28);
  const petalGeo = geo(new THREE.SphereGeometry(1, 8, 5));
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, pale);
    petal.position.set(135 + Math.cos(angle) * 7, 10 + i % 3, -110 + Math.sin(angle) * 7);
    petal.scale.set(4, 10 + i % 3, 3.8); petal.rotation.set(Math.sin(angle) * 0.55, 0, -Math.cos(angle) * 0.55); petal.castShadow = true; scene.add(petal);
  }
  // Stylized Helix crossing beside the north shore, aligned with the driveable loop.
  box(55, 0.2, -98, 67, 0.5, 7, cream);
  const tubeMat = mat('#a4bcb3');
  for (const phase of [0, Math.PI]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) { const theta = i / 100 * Math.PI * 8 + phase; points.push(new THREE.Vector3(23 + i * 0.64, 3 + Math.sin(theta) * 2.8, -98 + Math.cos(theta) * 3.8)); }
    const tube = new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.16, 5, false)), tubeMat); scene.add(tube);
  }
  // City-side skyline uses the same colored solid façades as Joyride.
  const towerColors = ['#8fa9a2', '#b7c6b5', '#9caeb1', '#b4b9a6'];
  function tower(x: number, z: number, w: number, h: number, d: number, index: number) {
    const face = mat(towerColors[index % towerColors.length]);
    box(x, h / 2, z, w, h, d, face, scene, true); collider(x, z, w, d);
    box(x, h + 1, z, w - 3, 2, d - 3, cream);
    for (let y = 4; y < h; y += 5) {
      box(x + w / 2 + 0.05, y, z, 0.1, 1, d, glass);
      box(x, y, z + d / 2 + 0.05, w, 1, 0.1, glass);
    }
    for (let dx = -w / 2 + 3; dx < w / 2; dx += 5) box(x + dx, h / 2, z + d / 2 + 0.15, 0.55, h, 0.25, cream);
  }
  for (let i = 0; i < 6; i++) tower(-148 - i % 2 * 22, -100 + i * 38, 22, [76, 109, 64, 92, 62, 84][i], 25, i);
  for (let i = 0; i < 8; i++) tower(-130 + i * 36, -153, 19 + i % 3 * 3, 30 + (i * 17) % 48, 20, i);

  const waves: THREE.Mesh[] = [];
  const foam = mat('#b6d9d0', { transparent: true, opacity: 0.4 });
  for (let i = 0; i < 42; i++) {
    const x = -70 + (i * 37) % 140, z = -83 + (i * 23) % 125;
    const wave = box(x, 0.055, z, 3 + i % 5, 0.02, 0.12, foam); wave.userData.baseX = x; waves.push(wave);
  }
  // Tiny low-poly bumboat on the bay.
  const boatGroup = new THREE.Group(); boatGroup.position.set(-35, 0.5, -25); scene.add(boatGroup);
  box(0, 0, 0, 8, 1.2, 3.5, trunk, boatGroup); box(0, 1.2, 0, 5, 1.8, 2.6, pale, boatGroup); box(0, 2.3, 0, 6.5, 0.25, 3, orange, boatGroup);
  const stamps = MARINA_STAMPS.map(point => {
    const group = new THREE.Group(); group.position.set(point.x, 3, point.z);
    const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(1.5, 0.16, 6, 20)), orange); group.add(ring);
    const gem = new THREE.Mesh(geo(new THREE.OctahedronGeometry(0.65)), cream); group.add(gem); scene.add(group); return group;
  });
  const car = new THREE.Group(); car.visible = false; scene.add(car);
  box(0, 0.8, 0, 2.3, 0.7, 4.4, mint, car, true); box(0, 1.4, -0.3, 1.85, 0.9, 2.3, glass, car, true); box(0, 1.95, -0.3, 1.95, 0.18, 2.45, mint, car);
  box(0, 0.72, -2.23, 2.1, 0.2, 0.12, pale, car); box(0, 0.75, 2.23, 2.1, 0.2, 0.12, orange, car);
  const wheelGeo = geo(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 10));
  for (const x of [-1.15, 1.15]) for (const z of [-1.35, 1.35]) { const wheel = new THREE.Mesh(wheelGeo, dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.5, z); car.add(wheel); }
  return {
    scene, obstacles, car, stamps,
    animate(time: number) { waves.forEach((wave, i) => { wave.position.x = wave.userData.baseX + Math.sin(time * 0.45 + i) * 1.4; }); stamps.forEach((stamp, i) => { stamp.rotation.y = time * 0.5; stamp.position.y = 3 + Math.sin(time * 1.7 + i) * 0.35; }); boatGroup.position.y = 0.5 + Math.sin(time) * 0.13; },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sun.shadow.map?.dispose(); },
  };
}
