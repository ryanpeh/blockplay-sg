import * as THREE from 'three';
import type { Obstacle } from './marina-collision';

export const MARINA_SPAWN = { x: -44, z: 67, yaw: -0.82 };
// Landmark scale 0.54: SkyPark 340 × 38m, elevation 200m (Arup/MBS).
// Ground layout is still compressed independently for gameplay.
export const MARINA_LANDMARKS = { towerHeight: 108, skyParkLength: 183.6, skyParkWidth: 20.52, museumHeight: 32.4 };
export const MARINA_STAMPS = [
  { name: 'Waterfront', x: 45, z: 65 },
  { name: 'City skyline', x: -103, z: 15 },
  { name: 'Bay crossing', x: -20, z: -112 },
  { name: 'Lotus museum', x: 103, z: -77 },
  { name: 'SkyPark', x: 126, z: 65 },
];

/** Authored, compressed game map. Photos inform the promenade; geometry is not surveyed. */
export function buildMarinaScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#a8cde8');
  scene.fog = new THREE.Fog('#b8cfdf', 290, 850);
  scene.add(new THREE.HemisphereLight('#e4efff', '#71746e', 1.65));
  const sun = new THREE.DirectionalLight('#fff5e7', 2.1);
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
  const cream = mat('#cbc9c1'), pale = mat('#efefeb'), glass = mat('#6287ab', { roughness: 0.3, metalness: 0.08 }), dark = mat('#424e53');
  const sand = mat('#92938f'), road = mat('#45494c'), white = mat('#eeeeea'), leaf = mat('#316c35'), trunk = mat('#83776a');
  const orange = mat('#ed8e42'), mint = mat('#5dafa6'), water = mat('#315e65', { roughness: 0.28, metalness: 0.22 });
  const steel = mat('#a6afb2', { roughness: 0.35, metalness: 0.65 }), wood = mat('#766257'), hedge = mat('#466b2d');
  const collider = (x: number, z: number, w: number, d: number) => obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene, shadow = false) {
    const mesh = new THREE.Mesh(boxGeo, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function beam(from: THREE.Vector3, to: THREE.Vector3, width: number, material: THREE.Material) {
    const middle = from.clone().add(to).multiplyScalar(0.5);
    const mesh = box(middle.x, middle.y, middle.z, width, from.distanceTo(to), width, material, scene, true);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()); return mesh;
  }
  box(0, -0.6, -20, 430, 1, 360, mat('#687d4e'));
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
  // Instanced granite paving: small gray slabs, not the previous beige plaza.
  const pavers = new THREE.InstancedMesh(boxGeo, mat('#a3a39e'), 180 * 24);
  const transform = new THREE.Object3D(); const color = new THREE.Color();
  for (let x = 0; x < 180; x++) for (let z = 0; z < 24; z++) {
    const i = x * 24 + z;
    transform.position.set(-89.5 + x, 0.095, 53 + z * 1.1); transform.scale.set(0.986, 0.025, 1.086); transform.updateMatrix();
    pavers.setMatrixAt(i, transform.matrix); color.setHSL(0.12, 0.015, 0.83 + ((x * 7 + z * 3) % 7) * 0.022); pavers.setColorAt(i, color);
  }
  pavers.receiveShadow = true; scene.add(pavers);
  box(0, 0.1, 51.9, 161, 0.12, 2, wood);
  for (let x = -80; x < 80; x += 2) box(x, 0.17, 51.9, 0.025, 0.015, 2, dark);
  for (const z of [85, 103, -103, -121]) box(0, 0.14, z, 220, 0.28, 0.45, cream);
  // Crosswalks, curbside planting and human-scale street lights.
  for (const x of [-103, 103]) for (let z = 84; z < 104; z += 2.8) box(x, 0.07, z, 11, 0.02, 1.3, white);
  for (let x = -76; x <= 76; x += 38) {
    box(x, 3.7, 81, 0.17, 7.4, 0.17, steel, scene, true);
    box(x, 7.45, 80.4, 0.65, 0.16, 1.5, dark);
    box(x, 0.6, 80.5, 0.75, 1.2, 0.65, dark); collider(x, 81, 0.8, 0.8);
  }
  // Broad, darker expansion bands observed in south-waterfront.png.
  for (const x of [-64, -32, 0, 32, 64]) box(x, 0.115, 66, 0.7, 0.025, 27, mat('#777b79'));
  for (let x = -80; x <= 80; x += 3) {
    beam(new THREE.Vector3(x, 0.05, 51), new THREE.Vector3(x, 1.16, 50.5), 0.075, steel);
  }
  for (const y of [0.25, 0.45, 0.65, 0.85, 1.1]) {
    box(0, y, 50.6, 161, 0.035, 0.035, steel);
    box(-80.6, y, -20, 0.035, 0.035, 141, steel);
    box(80.6, y, -20, 0.035, 0.035, 141, steel);
  }
  for (let x = -80; x <= 80; x += 3) { const post = box(x, 0.58, 50.6, 0.08, 1.16, 0.1, steel); post.rotation.x = -0.12; }
  for (let z = -90; z <= 50; z += 3) for (const x of [-80.6, 80.6]) box(x, 0.58, z, 0.1, 1.16, 0.1, steel);
  // Bent, tapered fronds with individual leaflets instead of star-shaped cones.
  const frondVertices: number[] = [];
  for (let i = 0; i < 8; i++) {
    const t = i / 8, next = (i + 1) / 8;
    const y = (u: number) => Math.sin(u * Math.PI) * 0.7 - u * u * 1.1;
    const width = Math.sin((t + 0.08) * Math.PI) * 0.6;
    frondVertices.push(t * 4.8, y(t), 0, next * 4.8, y(next), 0, t * 4.8 - 0.25, y(t) - 0.1, width);
    frondVertices.push(t * 4.8, y(t), 0, t * 4.8 - 0.25, y(t) - 0.1, -width, next * 4.8, y(next), 0);
  }
  const frondGeo = geo(new THREE.BufferGeometry()); frondGeo.setAttribute('position', new THREE.Float32BufferAttribute(frondVertices, 3)); frondGeo.computeVertexNormals();
  const palmLeaf = mat('#2e6631', { side: THREE.DoubleSide });
  const trunkGeo = geo(new THREE.CylinderGeometry(0.18, 0.32, 1, 7));
  function palm(x: number, z: number, height = 11, parent: THREE.Object3D = scene, collision = true) {
    const stem = new THREE.Mesh(trunkGeo, trunk); stem.position.set(x, height / 2, z); stem.scale.y = height; stem.castShadow = true; parent.add(stem);
    for (let j = 0; j < 10; j++) {
      const frond = new THREE.Mesh(frondGeo, palmLeaf);
      frond.position.set(x, height, z); frond.rotation.y = j / 10 * Math.PI * 2; frond.rotation.z = (j % 3) * 0.15;
      frond.castShadow = true; parent.add(frond);
    }
    if (collision) collider(x, z, 1, 1);
  }
  for (let x = -84; x <= 84; x += 14) { palm(x, 75, 8.5 + Math.abs(x % 3)); box(x, 0.12, 75, 2, 0.24, 2, hedge); }
  for (let z = -80; z < 50; z += 26) { palm(-89, z); palm(89, z); }
  for (let x = -65; x <= 70; x += 45) {
    box(x, 0.7, 58, 4, 0.25, 1, trunk); box(x - 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); box(x + 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); collider(x, 58, 4, 1);
    box(x, 1.05, 58.45, 4, 0.55, 0.12, wood);
    for (const dx of [-1.8, 1.8]) box(x + dx, 0.95, 58, 0.12, 0.12, 1.1, steel);
  }
  // Curved steel frames in south-palms.png replace the generic box pergola.
  for (const x of [-55, -40, -25]) {
    box(x, 3.2, 70, 0.24, 6.4, 0.24, pale, scene, true);
    box(x, 3.2, 82, 0.24, 6.4, 0.24, pale, scene, true);
    box(x, 6.5, 76, 0.25, 0.25, 12.5, pale);
    collider(x, 70, 0.5, 0.5); collider(x, 82, 0.5, 0.5);
  }
  for (const z of [70, 76, 82]) {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-55, 6.5, z), new THREE.Vector3(-40, 4.8, z), new THREE.Vector3(-25, 6.5, z));
    const mesh = new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 18, 0.13, 5, false)), steel); mesh.castShadow = true; scene.add(mesh);
  }
  // Dense red/green curb planting and broad shade trees from the entrance shots.
  const redLeaf = mat('#8e4545'), limeLeaf = mat('#78994e');
  const shrubGeo = geo(new THREE.IcosahedronGeometry(1, 0));
  for (let x = -84; x <= 84; x += 7) {
    const shrub = new THREE.Mesh(shrubGeo, x % 2 ? redLeaf : limeLeaf);
    shrub.position.set(x, 0.55, 82.5); shrub.scale.set(2.8, 0.7, 0.75); scene.add(shrub);
  }
  for (const x of [-77, -7, 63]) {
    box(x, 2.8, 83.5, 0.65, 5.6, 0.65, trunk, scene, true); collider(x, 83.5, 1, 1);
    for (let j = 0; j < 5; j++) {
      const crown = new THREE.Mesh(shrubGeo, j % 2 ? leaf : hedge); crown.position.set(x + Math.cos(j * 2.4) * 1.8, 6.3 + j % 2, 83.5 + Math.sin(j * 2.4)); crown.scale.set(3.3, 2.3, 2.8); crown.castShadow = true; scene.add(crown);
    }
  }

  // Shoppes podium: low glazed frontage and a segmented barrel roof.
  box(123, 4, -12, 20, 8, 134, glass, scene, true); collider(123, -12, 20, 134);
  for (let z = -76; z <= 52; z += 8) {
    box(112.8, 4, z, 0.45, 8, 0.45, steel);
    const archPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; archPoints.push(new THREE.Vector3(123 + Math.cos(a) * 11, 8 + Math.sin(a) * 4, z)); }
    scene.add(new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 16, 0.18, 4, false)), steel));
  }
  const roofShape = new THREE.Shape(); roofShape.moveTo(-11, 0); roofShape.quadraticCurveTo(0, 8, 11, 0); roofShape.lineTo(-11, 0);
  const roof = new THREE.Mesh(geo(new THREE.ExtrudeGeometry(roofShape, { depth: 134, bevelEnabled: false, curveSegments: 12 })), mat('#597887', { roughness: 0.4, metalness: 0.25 }));
  roof.position.set(123, 8, -79); scene.add(roof);
  // Bronze roof louvers, sail masts and suspension stays seen across the pond.
  const bronze = mat('#a49a7d', { roughness: 0.5, metalness: 0.2 });
  for (let a = 0.15; a < Math.PI; a += 0.22) box(123 + Math.cos(a) * 11, 8 + Math.sin(a) * 4 + 0.2, -12, 0.25, 0.18, 134, bronze);
  for (const z of [-58, -20, 18]) {
    const top = new THREE.Vector3(123, 23, z);
    beam(new THREE.Vector3(123, 9, z), top, 0.3, pale);
    for (const dx of [-10, 10]) for (const dz of [-12, 12]) beam(top, new THREE.Vector3(123 + dx, 10, z + dz), 0.08, pale);
  }
  for (let z = -73; z < 52; z += 5) {
    box(112.6, 2.9, z, 0.14, 5.6, 0.15, pale);
    box(112.55, 5.8, z, 0.18, 0.25, 4.9, bronze);
  }
  // Entrance canopy / blue fins / black-yellow bollards, on the plaza side.
  box(122, 6.8, 62, 25, 0.35, 12, steel, scene, true);
  for (const x of [112, 132]) { box(x, 3.4, 66, 0.6, 6.8, 0.6, pale, scene, true); collider(x, 66, 0.7, 0.7); }
  for (let x = 112; x <= 132; x += 2) box(x, 6.95, 62, 0.16, 0.25, 12, pale);
  const blueFin = mat('#385f9a');
  for (let x = 114; x <= 132; x += 1.5) { box(x, 3.2, 55.25, 0.35, 6.4, 0.5, x % 3 === 0 ? pale : blueFin); }
  const bollardGeo = geo(new THREE.CylinderGeometry(0.2, 0.2, 1, 8));
  for (const x of [113, 116, 130, 133]) {
    const bollard = new THREE.Mesh(bollardGeo, steel); bollard.position.set(x, 0.5, 70); scene.add(bollard); collider(x, 70, 0.4, 0.4);
    box(x, 0.74, 70.21, 0.35, 0.25, 0.025, orange);
    const stripe = box(x, 0.74, 70.23, 0.07, 0.29, 0.025, dark); stripe.rotation.z = -0.5;
  }
  for (const x of [-70, -14, 42, 70]) { box(x, 0.35, 81, 11, 0.7, 2.6, cream); box(x, 0.9, 81, 10.5, 0.6, 2.1, hedge); collider(x, 81, 11, 2.6); }

  // Three slender blue-glass towers. Curved/splayed lower legs are approximated
  // by offset floor bands; dimensions share the same 0.54 landmark scale.
  const h = MARINA_LANDMARKS.towerHeight;
  for (const z of [-65, -15, 35]) {
    collider(151, z, 24, 32);
    for (let floor = 0; floor < 54; floor++) {
      const y = floor * 2 + 1, splay = Math.pow(1 - y / h, 2) * 8;
      box(147 - splay * 0.2, y, z, 9, 1.94, 30, glass, scene, true);
      box(156 + splay, y, z, 7, 1.94, 30, glass, scene, true);
      box(142.35 - splay * 0.2, y - 0.95, z, 0.16, 0.09, 30, steel);
      box(151, y, z - 15.2, 18 + splay, 1.94, 0.6, cream);
      box(151, y, z + 15.2, 18 + splay, 1.94, 0.6, cream);
    }
    for (let dz = -14; dz <= 14; dz += 2.8) box(140.55, h / 2, z + dz, 0.1, h, 0.12, steel);
    box(151, 2, z, 27, 4, 33, pale);
  }
  const boat = new THREE.Shape();
  const halfWidth = MARINA_LANDMARKS.skyParkWidth / 2, halfLength = MARINA_LANDMARKS.skyParkLength / 2;
  boat.moveTo(-halfWidth, -halfLength + 8); boat.quadraticCurveTo(-halfWidth, -halfLength, 0, -halfLength); boat.quadraticCurveTo(halfWidth, -halfLength, halfWidth, -halfLength + 8);
  boat.lineTo(halfWidth, halfLength - 22); boat.quadraticCurveTo(halfWidth, halfLength - 4, 0, halfLength); boat.quadraticCurveTo(-halfWidth, halfLength - 4, -halfWidth, halfLength - 22); boat.closePath();
  const deckGeo = geo(new THREE.ExtrudeGeometry(boat, { depth: 2.6, bevelEnabled: false, steps: 1, curveSegments: 12 }));
  const deck = new THREE.Mesh(deckGeo, cream); deck.rotation.x = -Math.PI / 2; deck.position.set(151, h, -15); deck.castShadow = true; scene.add(deck);
  box(146, h + 2.7, -15, 4, 0.2, 81, mat('#368ca4'));
  box(154, h + 2.65, -15, 6, 0.2, 130, leaf);
  for (const x of [141, 161]) box(x, h + 3, -15, 0.12, 0.7, 146, steel);
  const crownGeo = geo(new THREE.IcosahedronGeometry(2.6, 0));
  for (let z = -74; z < 65; z += 13) { const crown = new THREE.Mesh(crownGeo, leaf); crown.position.set(154, h + 4, z); crown.scale.setScalar(0.65); scene.add(crown); }
  // Lotus-like ArtScience Museum, fully modeled petals.
  const baseGeo = geo(new THREE.CylinderGeometry(8, 5, 7, 10));
  const museumBase = new THREE.Mesh(baseGeo, pale); museumBase.position.set(135, 9, -110); scene.add(museumBase); collider(135, -110, 44, 44);
  const pond = new THREE.Mesh(geo(new THREE.CylinderGeometry(22, 22, 0.2, 40)), water); pond.position.set(135, 0.1, -110); scene.add(pond);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const support = box(135 + Math.cos(a) * 5, 4, -110 + Math.sin(a) * 5, 0.8, 8, 0.8, pale); support.rotation.z = Math.cos(a) * 0.2;
  }
  // Broad tapering shells, not rounded flower blobs: reference museum-shell.png.
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const vertices: number[] = [], indices: number[] = [];
    const tip = MARINA_LANDMARKS.museumHeight - (i % 4) * 3;
    for (let j = 0; j < 5; j++) {
      const t = j / 4, radius = 5 + t * 15, y = 10 + (tip - 10) * t * t, width = [2.4, 4.2, 5.1, 4.6, 3.5][j];
      vertices.push(radius, y, -width, radius, y, width, radius, y - 2.2, -width, radius, y - 2.2, width);
      if (j < 4) { const a = j * 4, b = a + 4; indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3); }
    }
    indices.push(16,18,17,17,18,19);
    for (let k = 0; k < indices.length; k += 3) [indices[k + 1], indices[k + 2]] = [indices[k + 2], indices[k + 1]];
    const geometry = geo(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const petal = new THREE.Mesh(geometry, pale); petal.position.set(135, 0, -110); petal.rotation.y = angle; petal.castShadow = true; scene.add(petal);
    const tipWindow = box(135 + Math.cos(angle) * 20.06, tip - 1.1, -110 - Math.sin(angle) * 20.06, 0.12, 1.4, 5.5, glass); tipWindow.rotation.y = angle;
    beam(new THREE.Vector3(135 + Math.cos(angle) * 8, 0.2, -110 - Math.sin(angle) * 8), new THREE.Vector3(135 + Math.cos(angle) * 4, 12, -110 - Math.sin(angle) * 4), 0.6, pale);
  }
  const pondRim = new THREE.Mesh(geo(new THREE.TorusGeometry(22.5, 0.5, 4, 64)), cream); pondRim.rotation.x = Math.PI / 2; pondRim.position.set(135, 0.3, -110); scene.add(pondRim);
  const lilyGeo = geo(new THREE.CircleGeometry(0.45, 7));
  for (let i = 0; i < 36; i++) {
    const a = i * 2.4, r = 13 + i % 8;
    const lily = new THREE.Mesh(lilyGeo, hedge); lily.rotation.x = -Math.PI / 2; lily.position.set(135 + Math.cos(a) * r, 0.22, -110 + Math.sin(a) * r); scene.add(lily);
  }
  // Stylized Helix crossing beside the north shore, aligned with the driveable loop.
  box(55, 0.2, -98, 67, 0.5, 7, cream);
  const tubeMat = steel;
  for (const phase of [0, Math.PI]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) { const theta = i / 100 * Math.PI * 8 + phase; points.push(new THREE.Vector3(23 + i * 0.64, 3 + Math.sin(theta) * 2.8, -98 + Math.cos(theta) * 3.8)); }
    const tube = new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.16, 5, false)), tubeMat); scene.add(tube);
  }
  // City-side skyline uses the same colored solid façades as Joyride.
  const towerColors = ['#557c96', '#81969f', '#607c94', '#98a1a4'];
  function tower(x: number, z: number, w: number, h: number, d: number, index: number) {
    const face = mat(towerColors[index % towerColors.length], { roughness: 0.35, metalness: 0.1 });
    box(x, h / 2, z, w, h, d, face, scene, true); collider(x, z, w, d);
    box(x, h + 1, z, w - 3, 2, d - 3, cream);
    for (let y = 3; y < h; y += 3) {
      box(x + w / 2 + 0.05, y, z, 0.1, 0.22, d, steel);
      box(x, y, z + d / 2 + 0.05, w, 0.22, 0.1, steel);
    }
    for (let dx = -w / 2 + 3; dx < w / 2; dx += 4) box(x + dx, h / 2, z + d / 2 + 0.15, 0.2, h, 0.15, steel);
    box(x, h + 3, z, w * 0.55, 4, d * 0.65, dark);
    if (index % 2) box(x, h + 9, z, 0.5, 10, 0.5, steel);
  }
  for (let i = 0; i < 6; i++) tower(-148 - i % 2 * 22, -100 + i * 38, 22, [76, 109, 64, 92, 62, 84][i], 25, i);
  for (let i = 0; i < 8; i++) tower(-130 + i * 36, -153, 19 + i % 3 * 3, 30 + (i * 17) % 48, 20, i);

  // Fullerton-side stone arcade: arched openings, cornices and planted frontage
  // observed in fullerton-materials.png, compressed into the city-side block.
  const stone = mat('#b3b6b4'), insetGlass = mat('#273f4a', { roughness: 0.4 });
  box(-133, 6.5, 30, 24, 13, 38, stone, scene, true); collider(-133, 30, 24, 38);
  box(-133, 13.4, 30, 25.5, 0.8, 39.5, cream);
  for (const y of [1.1, 3.5, 6, 8.5, 11, 12.7]) box(-120.7, y, 30, 0.55, 0.22, 38.5, cream);
  const arch = new THREE.Shape(); arch.moveTo(-1.8, 0); arch.lineTo(-1.8, 4.5); arch.absarc(0, 4.5, 1.8, Math.PI, 0, true); arch.lineTo(1.8, 0); arch.closePath();
  const archGeo = geo(new THREE.ShapeGeometry(arch, 12));
  for (let z = 16; z <= 44; z += 7) {
    const opening = new THREE.Mesh(archGeo, insetGlass); opening.rotation.y = Math.PI / 2; opening.position.set(-120.35, 0.2, z); scene.add(opening);
    box(-120.2, 3, z + 2.3, 0.6, 6, 0.5, pale);
    box(-120.2, 3, z - 2.3, 0.6, 6, 0.5, pale);
    box(-117, 0.35, z, 1.5, 0.7, 4.5, cream); box(-117, 1, z, 1.2, 0.9, 4.2, hedge); collider(-117, z, 1.5, 4.5);
  }
  // Record which reviewed images informed authored features (not photogrammetry).
  scene.userData.referenceFeatures = ['museum-shell', 'bay-skyline', 'fullerton-materials', 'fullerton-glazing', 'sands-canopy', 'sands-streetscape', 'south-waterfront', 'south-palms'];

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
  // Thousands of façade/paving/railing details share a handful of draw calls.
  // Leave moving waves and child meshes (car/boat) alone.
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of [...scene.children]) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || child.geometry !== boxGeo || waves.includes(child)) continue;
    const material = child.material as THREE.Material, key = `${material.uuid}:${child.castShadow}`;
    const batch = batches.get(key) || []; batch.push(child); batches.set(key, batch);
  }
  const instances: THREE.InstancedMesh[] = [pavers];
  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(boxGeo, batch[0].material, batch.length);
    mesh.castShadow = batch[0].castShadow; mesh.receiveShadow = true;
    batch.forEach((item, i) => { item.updateMatrix(); mesh.setMatrixAt(i, item.matrix); scene.remove(item); });
    mesh.computeBoundingSphere(); scene.add(mesh); instances.push(mesh);
  }
  return {
    scene, obstacles, car, stamps,
    animate(time: number) { waves.forEach((wave, i) => { wave.position.x = wave.userData.baseX + Math.sin(time * 0.45 + i) * 1.4; }); stamps.forEach((stamp, i) => { stamp.rotation.y = time * 0.5; stamp.position.y = 3 + Math.sin(time * 1.7 + i) * 0.35; }); boatGroup.position.y = 0.5 + Math.sin(time) * 0.13; },
    dispose() { instances.forEach(mesh => mesh.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sun.shadow.map?.dispose(); },
  };
}
