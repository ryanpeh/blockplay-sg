import * as THREE from 'three';
import type { Obstacle } from './queenstown-collision';

export const QUEENSTOWN_SPAWN = { x: -18, z: 83, yaw: -0.35 };
export const QUEENSTOWN_STAMPS = [
  { name: 'Queenstown station', x: 0, z: 41 },
  { name: 'Void deck', x: -73, z: -44 },
  { name: 'Community court', x: 85, z: -40 },
  { name: 'Library garden', x: 34, z: -88 },
  { name: 'Green corridor', x: -157, z: 65 },
];

/** Compressed heritage-inspired estate, not a surveyed model or exact present-day streets. */
export function buildQueenstownScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#bcd9e7');
  scene.fog = new THREE.Fog('#bcd9e7', 240, 650);
  scene.add(new THREE.HemisphereLight('#eff8ff', '#747454', 1.8));
  const sun = new THREE.DirectionalLight('#fff0dc', 2); sun.position.set(-70, 150, 85); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -190, right: 190, top: 150, bottom: -150, far: 420 });
  sun.shadow.normalBias = 0.2; scene.add(sun);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [];
  const obstacles: Obstacle[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = (color: string) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); materials.push(m); return m; };
  const unit = geo(new THREE.BoxGeometry(1, 1, 1));
  const cream = mat('#ece7d6'), teal = mat('#6d9d92'), coral = mat('#c58c77'), glass = mat('#556f78'), dark = mat('#424b49');
  const concrete = mat('#b6b5a7'), grass = mat('#75915e'), leaf = mat('#487743'), white = mat('#f4f1df'), asphalt = mat('#555957');
  const red = mat('#b36655'), orange = mat('#f09a43'), wood = mat('#846b52');
  const stationBlue = mat('#668faa'), walkwayBlue = mat('#36799b'), corridorGray = mat('#c5c8c3');
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene, shadow = false) {
    const mesh = new THREE.Mesh(unit, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function solid(x: number, z: number, w: number, d: number) { obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }); }
  function sign(text: string, x: number, y: number, z: number, w = 14, h = 2) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.fillStyle = '#245d4f'; ctx.fillRect(0, 0, 768, 128); ctx.fillStyle = '#fff9e8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 55px sans-serif'; ctx.fillText(text, 384, 66, 730);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture }); materials.push(material);
    const panel = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), material); panel.position.set(x, y, z); scene.add(panel);
  }
  box(0, -0.6, 0, 380, 1, 300, grass);
  // Continuous estate loop and Commonwealth Avenue-inspired central arterial.
  for (const z of [-122, 116, 22]) {
    box(0, 0, z, 300, 0.12, z === 22 ? 24 : 14, asphalt);
    for (let x = -142; x < 145; x += 12) box(x, 0.08, z, 5, 0.025, 0.18, white);
    for (const side of [-1, 1]) box(0, 0.1, z + side * (z === 22 ? 14 : 9), 300, 0.2, 3, concrete);
  }
  for (const x of [-140, 140]) {
    box(x, 0, -3, 14, 0.12, 238, asphalt);
    for (let z = -110; z < 110; z += 12) box(x, 0.08, z, 0.18, 0.025, 5, white);
  }
  // Crosswalks and an estate access lane; road widths remain navigable in drive mode.
  box(-15, 0.02, 74, 12, 0.12, 84, asphalt);
  for (const x of [-123, 118]) for (let z = 12; z <= 32; z += 3) box(x, 0.1, z, 5, 0.02, 1.5, white);
  for (const z of [-98, -10, 86]) box(0, 0.05, z, 266, 0.12, 5, concrete);
  box(-157, 0.06, 0, 5, 0.13, 266, mat('#c1ac8b'));
  // Open ground-floor void decks: collisions on pillars/cores, never an invisible solid slab.
  function block(x: number, z: number, floors: number, accent: THREE.Material, label: string) {
    const width = 59, depth = 15, height = floors * 2.8;
    box(x, height / 2 + 3.4, z, width, height, depth, cream, scene, true);
    box(x, height + 3.7, z, width + 1, 0.6, depth + 1, concrete);
    box(x - 25, height / 2 + 3.4, z + 7.6, 7, height, 0.35, accent);
    for (const dx of [-25, -13, 0, 13, 25]) for (const dz of [-5.8, 5.8]) {
      box(x + dx, 1.7, z + dz, 0.85, 3.4, 0.85, cream, scene, true); solid(x + dx, z + dz, 0.85, 0.85);
    }
    box(x + 19, 1.7, z, 7, 3.4, 6, accent); solid(x + 19, z, 7, 6);
    for (let floor = 0; floor < floors; floor++) {
      const y = 4.8 + floor * 2.8;
      for (const dz of [-7.6, 7.6]) {
        box(x, y - 1.3, z + dz, width, 0.16, 0.6, concrete);
        for (let dx = -18; dx < 28; dx += 5.5) {
          box(x + dx, y, z + dz, 2.5, 1.35, 0.12, glass);
          box(x + dx + 1.8, y - 0.35, z + dz * 1.04, 0.8, 0.65, 0.5, concrete);
        }
      }
      // estate-south.png: long recessed access galleries with pale-gray parapets.
      box(x + 4, y + 0.15, z + 7.72, 46, 1.45, 0.12, dark);
      box(x + 4, y - 0.65, z + 7.86, 46, 0.85, 0.18, corridorGray);
      box(x + 4, y - 0.18, z + 7.98, 46, 0.12, 0.12, white);
      for (let dx = -17; dx < 28; dx += 9) box(x + dx, y, z + 8.02, 0.3, 2.7, 0.25, cream);
      box(x - 25, y, z + 7.85, 3.8, 1.6, 0.1, white);
    }
    box(x - 13, 0.65, z, 4, 0.16, 1.2, coral); // void-deck seating
    sign(label, x - 25, 7, z + 8.02, 5, 2.4);
  }
  block(-73, -44, 10, teal, 'ESTATE'); block(-73, -83, 12, coral, 'QUEENS');
  block(78, 76, 16, teal, 'HDB'); block(-76, 77, 9, coral, 'HOME');
  // Covered walkways connect open decks, estate paths and the station entrance.
  function shelter(x: number, z: number, width: number) {
    box(x, 3.05, z, width, 0.3, 4.2, concrete, scene, true);
    box(x, 0.08, z, width, 0.16, 4.4, concrete);
    for (let dx = -width / 2 + 2; dx < width / 2; dx += 8) {
      box(x + dx, 1.5, z - 1.7, 0.2, 3, 0.2, walkwayBlue); solid(x + dx, z - 1.7, 0.25, 0.25);
    }
  }
  shelter(-76, -20, 92); shelter(62, 52, 100);
  // Elevated railway: clear underside, piers in the center median, station above.
  box(0, 7.8, 22, 360, 1.4, 9, concrete, scene, true);
  for (const z of [18, 26]) box(0, 8.7, z, 360, 0.6, 0.35, concrete);
  for (const z of [20.2, 23.8]) box(0, 8.55, z, 360, 0.1, 0.12, dark);
  for (let x = -164; x <= 170; x += 28) { box(x, 3.6, 22, 1.6, 7.2, 2.2, concrete, scene, true); solid(x, 22, 1.6, 2.2); }
  box(0, 9.2, 22, 74, 0.8, 19, cream, scene, true);
  for (const z of [14, 30]) for (let x = -32; x <= 32; x += 8) box(x, 11.2, z, 0.35, 4, 0.35, cream);
  const roofSection = new THREE.Shape(); roofSection.moveTo(-10.4, 0); roofSection.quadraticCurveTo(0, 7, 10.4, 0); roofSection.lineTo(10.4, -0.3); roofSection.quadraticCurveTo(0, 6.6, -10.4, -0.3); roofSection.closePath();
  const roofGeo = geo(new THREE.ExtrudeGeometry(roofSection, { depth: 78, bevelEnabled: false, curveSegments: 12 }));
  const stationRoof = new THREE.Mesh(roofGeo, teal); stationRoof.rotation.y = Math.PI / 2; stationRoof.position.set(-39, 13, 22); stationRoof.castShadow = true; scene.add(stationRoof);
  sign('EW19  QUEENSTOWN', 0, 10.4, 31.7, 29, 2.2);
  for (const x of [-42, 42]) {
    box(x, 4.5, 39, 6, 9, 6, stationBlue, scene, true); solid(x, 39, 6, 6);
    box(x, 6.1, 42.1, 4.7, 2.6, 0.12, glass);
    for (let y = 5; y <= 7; y += 0.45) box(x, y, 42.25, 5.3, 0.11, 0.15, concrete);
    box(x, 9.2, 32, 6, 0.5, 14, cream);
    sign('MRT', x, 3.8, 42.1, 4, 1.2);
  }
  const train = new THREE.Group(); scene.add(train);
  for (let n = 0; n < 3; n++) {
    const x = n * 13 - 13;
    box(x, 10, 22, 12, 2.8, 3.2, cream, train); box(x, 9.3, 23.65, 12, 0.35, 0.06, red, train);
    for (let dx = -4; dx <= 4; dx += 2) box(x + dx, 10.25, 23.65, 1.3, 1, 0.06, glass, train);
  }
  // Low-rise neighbourhood shops and market canopy, not tourist landmarks.
  box(73, 3, -13, 65, 6, 13, cream, scene, true); solid(73, -13, 65, 13);
  const shopNames = ['KOPI', 'PROVISIONS', 'BAKERY', 'MARKET'];
  for (let i = 0; i < 4; i++) {
    const x = 49 + i * 16;
    box(x, 1.7, -6.4, 12, 2.9, 0.15, glass); box(x, 3.6, -4.7, 15, 0.25, 4, i % 2 ? teal : coral, scene, true);
    sign(shopNames[i], x, 4.9, -6.25, 12, 1.2);
    for (const dx of [-3, 3]) { box(x + dx, 0.8, -1, 1.7, 0.12, 1.7, cream); box(x + dx, 0.4, -1, 0.25, 0.8, 0.25, dark); solid(x + dx, -1, 1.7, 1.7); }
  }
  // Community court with accurately marked game-scale basketball half circles.
  box(85, 0.08, -53, 32, 0.16, 45, red);
  box(85, 0.18, -53, 27, 0.02, 40, mat('#729888'));
  for (const x of [71.5, 98.5]) box(x, 0.2, -53, 0.15, 0.02, 40, white);
  for (const z of [-73, -53, -33]) box(85, 0.2, z, 27, 0.02, 0.15, white);
  const ringGeo = geo(new THREE.TorusGeometry(4, 0.075, 4, 32));
  const centerRing = new THREE.Mesh(ringGeo, white); centerRing.rotation.x = Math.PI / 2; centerRing.position.set(85, 0.22, -53); scene.add(centerRing);
  for (const z of [-76, -30]) { box(85, 1.6, z, 0.2, 3.2, 0.2, dark); solid(85, z, 0.4, 0.4); box(85, 3, z, 2.5, 1.4, 0.1, white); }
  // Heritage-inspired library: low profile, red roof, long window wall and garden.
  box(23, 3.4, -103, 44, 6.8, 17, cream, scene, true); solid(23, -103, 44, 17);
  box(23, 3.4, -94.4, 35, 4.5, 0.15, glass);
  for (let x = 6; x < 42; x += 4) box(x, 3.4, -94.2, 0.2, 4.5, 0.2, white);
  for (const side of [-1, 1]) { const roof = box(23, 7.4, -103 + side * 4.3, 47, 0.45, 9.5, red, scene, true); roof.rotation.x = side * 0.15; }
  sign('QUEENSTOWN LIBRARY', 23, 5.7, -94.02, 29, 1.4);
  const crownGeo = geo(new THREE.IcosahedronGeometry(1, 1));
  function tree(x: number, z: number, height = 7) {
    box(x, height / 2, z, 0.65, height, 0.65, wood, scene, true); solid(x, z, 0.8, 0.8);
    for (let j = 0; j < 3; j++) { const crown = new THREE.Mesh(crownGeo, leaf); crown.position.set(x + (j - 1) * 1.5, height + j % 2, z); crown.scale.set(3.3, 2.3, 3); crown.castShadow = true; scene.add(crown); }
  }
  for (let z = -126; z <= 126; z += 21) for (const x of [-170, 168]) tree(x, z, 6 + Math.abs(z % 3));
  for (const [x, z] of [[-116,-103],[-119,-64],[-115,62],[119,79],[114,-97],[2,-75],[49,-85],[-29,92]]) tree(x, z);
  for (let x = -114; x < 130; x += 40) {
    box(x, 4, 6, 0.16, 8, 0.16, dark); box(x, 8, 5, 0.2, 0.2, 2, dark); solid(x, 6, 0.3, 0.3);
  }
  // Reviewed station images: planted curb strips, yellow/black bollards and metal guards.
  for (const x of [-31, 31]) {
    box(x, 0.3, 39, 11, 0.6, 2.6, concrete); box(x, 0.8, 39, 10.5, 0.7, 2.3, leaf); solid(x, 39, 11, 2.6);
    for (const dx of [-6.5, 6.5]) { box(x + dx, 0.5, 43, 0.22, 1, 0.22, dark); box(x + dx, 0.75, 43, 0.25, 0.15, 0.25, orange); solid(x + dx, 43, 0.3, 0.3); }
  }
  // estate-south.png: paved parking apron and double yellow edge lines.
  box(-75, 0.08, 99, 70, 0.12, 15, mat('#a99789'));
  for (let x = -105; x <= -46; x += 6) box(x, 0.16, 97, 0.12, 0.02, 9, white);
  for (const z of [106, 106.4]) box(-75, 0.16, z, 70, 0.02, 0.13, orange);
  sign('QUEENSTOWN · ESTATE LOOP', -53, 3.2, 101, 34, 2);
  const car = new THREE.Group(); scene.add(car);
  box(0, 0.7, 0, 1.8, 0.65, 3.4, coral, car, true); box(0, 1.18, 0.1, 1.5, 0.62, 1.65, glass, car); box(0, 1.51, 0.1, 1.6, 0.13, 1.85, cream, car);
  box(0, 0.65, -1.74, 1.55, 0.2, 0.08, white, car);
  const wheelGeo = geo(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10));
  for (const x of [-0.94, 0.94]) for (const z of [-1.05, 1.05]) { const wheel = new THREE.Mesh(wheelGeo, dark); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.38, z); car.add(wheel); }
  car.visible = false;
  const stampGeo = geo(new THREE.TorusGeometry(1.15, 0.16, 5, 20));
  const stamps = QUEENSTOWN_STAMPS.map(point => { const stamp = new THREE.Mesh(stampGeo, orange); stamp.position.set(point.x, 2.2, point.z); scene.add(stamp); return stamp; });
  scene.userData.referenceFeatures = ['station-east', 'estate-north', 'estate-south'];
  scene.userData.authoredMeshCount = scene.children.filter(child => child instanceof THREE.Mesh).length;
  // Batch static details while leaving car, train and collectible animation independent.
  const batches = new Map<string, THREE.Mesh[]>(), instances: THREE.InstancedMesh[] = [];
  for (const child of [...scene.children]) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material) || stamps.includes(child)) continue;
    const key = `${child.geometry.uuid}:${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
    const batch = batches.get(key) ?? []; batch.push(child); batches.set(key, batch);
  }
  for (const batch of batches.values()) {
    if (batch.length < 2) continue;
    const mesh = new THREE.InstancedMesh(batch[0].geometry, batch[0].material, batch.length);
    mesh.castShadow = batch[0].castShadow; mesh.receiveShadow = batch[0].receiveShadow;
    batch.forEach((item, i) => { item.updateMatrix(); mesh.setMatrixAt(i, item.matrix); scene.remove(item); });
    mesh.computeBoundingSphere(); scene.add(mesh); instances.push(mesh);
  }
  return { scene, obstacles, car, stamps,
    animate(time: number) { train.position.x = ((time * 6) % 430) - 215; stamps.forEach((stamp, i) => { stamp.rotation.y = time * 0.7; stamp.position.y = 2.2 + Math.sin(time * 2 + i) * 0.2; }); },
    dispose() { instances.forEach(mesh => mesh.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); sun.shadow.dispose(); },
  };
}
