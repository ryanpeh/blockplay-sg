import * as THREE from 'three';
import type { Obstacle } from './marina-collision';

export const MARINA_SPAWN = { x: -44, z: 67, yaw: -0.82 };
// Landmark scale 0.54: SkyPark 340 × 38m, elevation 200m (Arup/MBS).
// Ground layout is still compressed independently for gameplay.
export const MARINA_LANDMARKS = { towerHeight: 108, skyParkLength: 183.6, skyParkWidth: 20.52, museumHeight: 32.4 };
export const MARINA_MAP_ROADS = [
  { points: [{ x: -103, z: 94 }, { x: 103, z: 94 }, { x: 103, z: -112 }, { x: -103, z: -112 }, { x: -103, z: 94 }] },
  { points: [{ x: -223, z: 164 }, { x: 238, z: 164 }, { x: 238, z: -218 }, { x: -223, z: -218 }, { x: -223, z: 164 }] },
  { points: [{ x: -103, z: 94 }, { x: -103, z: 164 }] },
  { points: [{ x: 103, z: 94 }, { x: 103, z: 164 }] },
  { points: [{ x: 103, z: -112 }, { x: 103, z: -218 }] },
  { points: [{ x: -310, z: 252 }, { x: 350, z: 252 }, { x: 350, z: -295 }, { x: -310, z: -295 }, { x: -310, z: 252 }] },
  { points: [{ x: 238, z: 164 }, { x: 350, z: 164 }] },
  { points: [{ x: -223, z: 164 }, { x: -310, z: 164 }] },
  { points: [{ x: 103, z: -218 }, { x: 103, z: -295 }] },
  { points: [{ x: 0, z: 164 }, { x: 0, z: 252 }] },
];
export const MARINA_STAMPS = [
  { name: 'Waterfront', x: 45, z: 65 },
  { name: 'City skyline', x: -103, z: 15 },
  { name: 'Bay crossing', x: -20, z: -112 },
  { name: 'Lotus museum', x: 103, z: -77 },
  { name: 'SkyPark', x: 126, z: 65 },
  { name: 'Waterfront terraces', x: -191, z: 95 },
  { name: 'Esplanade gardens', x: -25, z: -185 },
  { name: 'Bayfront greenway', x: 214, z: 17 },
  { name: 'Southern gardens', x: 25, z: 140 },
  { name: 'Garden canopy walk', x: 320, z: 135 },
  { name: 'Conservatory avenue', x: 326, z: -130 },
  { name: 'Observation wheel', x: 246, z: -265 },
  { name: 'Harbour promenade', x: 85, z: 228 },
  { name: 'Civic arcade', x: -280, z: 130 },
];

/** Authored, compressed game map. Photos inform the promenade; geometry is not surveyed. */
export function buildMarinaScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#a8cde8');
  scene.fog = new THREE.Fog('#b8cfdf', 290, 850);
  scene.add(new THREE.HemisphereLight('#e4efff', '#71746e', 1.65));
  const sun = new THREE.DirectionalLight('#fff5e7', 2.1);
  sun.position.set(-120, 190, 90); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -405, right: 405, top: 370, bottom: -370, near: 1, far: 850 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.3; scene.add(sun);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const qualityDetails = { esplanadeSunshades: 0, wheelCapsules: 0, conservatoryGlazingSegments: 0, sandsMullions: 0 };
  const obstacles: Obstacle[] = [{ minX: -80, maxX: 80, minZ: -90, maxZ: 50, maxY: 2 }];
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }); materials.push(material); return material;
  };
  const boxGeo = geo(new THREE.BoxGeometry(1, 1, 1));
  const cream = mat('#cbc9c1'), pale = mat('#efefeb'), glass = mat('#6287ab', { roughness: 0.3, metalness: 0.08 }), dark = mat('#424e53');
  const sand = mat('#92938f'), road = mat('#45494c'), white = mat('#eeeeea'), leaf = mat('#316c35'), trunk = mat('#83776a');
  const orange = mat('#ed8e42'), mint = mat('#5dafa6'), water = mat('#315e65', { roughness: 0.28, metalness: 0.22 });
  const steel = mat('#a6afb2', { roughness: 0.35, metalness: 0.65 }), wood = mat('#766257'), hedge = mat('#466b2d');
  const collider = (x: number, z: number, w: number, d: number, maxY = 6.8) => obstacles.push({ maxY, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene, shadow = false) {
    const mesh = new THREE.Mesh(boxGeo, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function beam(from: THREE.Vector3, to: THREE.Vector3, width: number, material: THREE.Material) {
    const middle = from.clone().add(to).multiplyScalar(0.5);
    const mesh = box(middle.x, middle.y, middle.z, width, from.distanceTo(to), width, material, scene, true);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()); return mesh;
  }
  box(25, -0.6, -20, 770, 1, 660, mat('#687d4e'));
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
    box(x, 0.6, 80.5, 0.75, 1.2, 0.65, dark); collider(x, 81, 0.8, 0.8, 7.8);
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
    if (collision) collider(x, z, 1, 1, height + 1);
  }
  for (let x = -84; x <= 84; x += 14) { palm(x, 75, 8.5 + Math.abs(x % 3)); box(x, 0.12, 75, 2, 0.24, 2, hedge); }
  for (let z = -80; z < 50; z += 26) { palm(-89, z); palm(89, z); }
  for (let x = -65; x <= 70; x += 45) {
    box(x, 0.7, 58, 4, 0.25, 1, trunk); box(x - 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); box(x + 1.4, 0.35, 58, 0.2, 0.7, 0.6, dark); collider(x, 58, 4, 1, 1.4);
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
    box(x, 2.8, 83.5, 0.65, 5.6, 0.65, trunk, scene, true); collider(x, 83.5, 1, 1, 10);
    for (let j = 0; j < 5; j++) {
      const crown = new THREE.Mesh(shrubGeo, j % 2 ? leaf : hedge); crown.position.set(x + Math.cos(j * 2.4) * 1.8, 6.3 + j % 2, 83.5 + Math.sin(j * 2.4)); crown.scale.set(3.3, 2.3, 2.8); crown.castShadow = true; scene.add(crown);
    }
  }

  // Shoppes podium: low glazed frontage and a segmented barrel roof.
  box(123, 4, -12, 20, 8, 134, glass, scene, true); collider(123, -12, 20, 134, 12);
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
    const bollard = new THREE.Mesh(bollardGeo, steel); bollard.position.set(x, 0.5, 70); scene.add(bollard); collider(x, 70, 0.4, 0.4, 1);
    box(x, 0.74, 70.21, 0.35, 0.25, 0.025, orange);
    const stripe = box(x, 0.74, 70.23, 0.07, 0.29, 0.025, dark); stripe.rotation.z = -0.5;
  }
  for (const x of [-70, -14, 42, 70]) { box(x, 0.35, 81, 11, 0.7, 2.6, cream); box(x, 0.9, 81, 10.5, 0.6, 2.1, hedge); collider(x, 81, 11, 2.6, 1.6); }

  // Three slender blue-glass towers. Curved/splayed lower legs are approximated
  // by offset floor bands; dimensions share the same 0.54 landmark scale.
  const h = MARINA_LANDMARKS.towerHeight;
  for (const z of [-65, -15, 35]) {
    collider(151, z, 24, 32, 114);
    for (let floor = 0; floor < 54; floor++) {
      const y = floor * 2 + 1, splay = Math.pow(1 - y / h, 2) * 8;
      box(147 - splay * 0.2, y, z, 9, 1.94, 30, glass, scene, true);
      box(156 + splay, y, z, 7, 1.94, 30, glass, scene, true);
      box(142.35 - splay * 0.2, y - 0.95, z, 0.16, 0.09, 30, steel);
      box(151, y, z - 15.2, 18 + splay, 1.94, 0.6, cream);
      box(151, y, z + 15.2, 18 + splay, 1.94, 0.6, cream);
      // Follow both splayed faces rather than floating a straight grille in
      // front of the curved lower legs. Rear frames read pale against glass.
      box(159.65 + splay, y - 0.93, z, 0.13, 0.12, 30, pale);
      for (let dz = -13.5; dz <= 13.5; dz += 3) {
        box(142.35 - splay * 0.2, y, z + dz, 0.1, 1.96, 0.1, steel);
        box(159.65 + splay, y, z + dz, 0.13, 1.96, 0.13, pale);
        qualityDetails.sandsMullions += 2;
      }
    }
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
  const museumBase = new THREE.Mesh(baseGeo, pale); museumBase.position.set(135, 9, -110); scene.add(museumBase); collider(135, -110, 44, 44, 34);
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
  // Static close-ups distinguish dark outer struts from the white inner legs.
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    beam(new THREE.Vector3(135 + Math.cos(angle) * 17, 0.2, -110 + Math.sin(angle) * 17), new THREE.Vector3(135 + Math.cos(angle) * 14, 13.8, -110 + Math.sin(angle) * 14), 0.65, dark);
  }
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
    box(x, h / 2, z, w, h, d, face, scene, true); collider(x, z, w, d, h + 4);
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

  // New connected district circuit: original bay retained, with a longer route
  // behind the skyline and Sands. Distances remain compressed for game pacing.
  const asphaltEdge = mat('#70726e'), gardenSoil = mat('#746957');
  for (const route of MARINA_MAP_ROADS.slice(1)) for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i], horizontal = a.z === b.z;
    const length = Math.abs(horizontal ? b.x - a.x : b.z - a.z);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    box(x, -0.025, z, horizontal ? length + 16 : 22, 0.1, horizontal ? 22 : length + 16, asphaltEdge);
    box(x, 0.035, z, horizontal ? length + 16 : 16, 0.08, horizontal ? 16 : length + 16, road);
    for (let step = 10; step < length - 8; step += 12) {
      const t = step / length;
      box(a.x + (b.x - a.x) * t, 0.085, a.z + (b.z - a.z) * t, horizontal ? 5 : 0.16, 0.015, horizontal ? 0.16 : 5, white);
    }
  }
  // Bayfront greenway: broad stone cycle path between the hotel and new road.
  box(212, 0.015, -15, 19, 0.12, 320, sand);
  box(218, 0.09, -15, 3.2, 0.03, 315, mat('#9f665b'));
  for (let z = -165; z <= 135; z += 20) {
    palm(198, z, 10 + Math.abs(z % 3));
    box(198, 0.12, z, 3, 0.25, 3, gardenSoil);
    box(225, 3.7, z, 0.15, 7.4, 0.15, steel);
    box(224.5, 7.4, z, 1.2, 0.15, 0.5, dark);
    collider(225, z, 0.4, 0.4);
    if (z % 40 === 15) { box(204, 0.7, z, 1, 0.25, 4, wood); collider(204, z, 1, 4); }
  }
  // Sheares Link reference: alternating black/white curbs, double yellow
  // roadside lines, dense planting and a broad rain-tree canopy.
  const yellow = mat('#d4b549');
  for (let z = -170; z < 142; z += 3) box(229, 0.2, z, 0.45, 0.4, 2.9, z % 2 ? white : dark);
  for (const x of [230.2, 230.6]) box(x, 0.09, -14, 0.12, 0.025, 311, yellow);
  for (let z = -158; z <= 122; z += 28) {
    box(201, 0.35, z, 3, 0.7, 15, hedge);
    for (let i = 0; i < 3; i++) {
      const tree = new THREE.Mesh(shrubGeo, leaf); tree.position.set(258 + i * 2.4, 9 + i % 2 * 2, z + i * 1.6); tree.scale.set(7, 3.5, 6); tree.castShadow = true; scene.add(tree);
    }
    box(260, 4.5, z, 0.8, 9, 0.8, trunk); collider(260, z, 1, 1);
  }
  box(221, 3, 42, 0.15, 6, 0.15, steel); collider(221, 42, 0.4, 0.4);
  box(221, 5.5, 42, 0.18, 2.5, 5, mat('#246d55'));
  for (const y of [5, 5.7, 6.2]) box(221.11, y, 42, 0.02, 0.1, 3.8, white);
  // Southern garden court and west-side waterfront terraces. The stepped
  // plinths are decorative, with a flat clear public path alongside them.
  box(0, 0.015, 135, 180, 0.13, 25, sand);
  for (let x = -75; x <= 75; x += 25) {
    palm(x, 118, 10);
    box(x, 0.5, 117, 9, 1, 5, cream); box(x, 1.05, 117, 8.5, 0.25, 4.5, hedge); collider(x, 117, 9, 5);
    box(x, 0.65, 149, 5, 0.22, 1, wood); collider(x, 149, 5, 1);
  }
  box(-188, 0.01, 93, 38, 0.12, 52, sand);
  for (let i = 0; i < 4; i++) {
    box(-182, 0.2 + i * 0.25, 108 + i * 2, 30, 0.4 + i * 0.5, 2, cream);
    collider(-182, 108 + i * 2, 30, 2);
  }
  for (const x of [-207, -169]) for (const z of [73, 123]) palm(x, z, 10);
  // Merlion-side reference: blue tiled base, cream sculptural silhouette and
  // a curved hedge planter. This is an intentionally simplified game statue.
  const tileBlue = mat('#386a9a');
  const statue = new THREE.Group(); statue.position.set(-87, 0, -40); scene.add(statue); collider(-87, -40, 4, 4);
  const pedestal = new THREE.Mesh(geo(new THREE.CylinderGeometry(2.2, 2.8, 0.9, 12)), tileBlue); pedestal.position.y = 0.45; statue.add(pedestal);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const waveTile = box(Math.cos(angle) * 2, 0.7, Math.sin(angle) * 2, 0.65, 1.05, 1.2, i % 2 ? tileBlue : steel, statue);
    waveTile.rotation.y = Math.PI / 2 - angle;
    for (const y of [0.35, 0.65, 0.95]) { const grout = box(Math.cos(angle) * 2.02, y, Math.sin(angle) * 2.02, 0.67, 0.025, 1.22, cream, statue); grout.rotation.y = Math.PI / 2 - angle; }
  }
  const fish = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.85, 1.5, 4.5, 9)), pale); fish.position.y = 3; statue.add(fish);
  const lion = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(1.25, 1)), cream); lion.position.set(0, 6.1, 0); statue.add(lion);
  box(0.95, 5.85, 0, 1.1, 0.6, 0.95, pale, statue);
  for (const z of [-0.48, 0.48]) box(0.83, 6.35, z, 0.12, 0.14, 0.1, dark, statue);
  for (let row = 0; row < 8; row++) for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + row % 2 * 0.3, r = 1.44 - row * 0.067;
    const scale = box(Math.cos(a) * r, 1.2 + row * 0.48, Math.sin(a) * r, 0.52, 0.12, 0.35, cream, statue); scale.rotation.y = -a;
  }
  const jet = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-85.5, 5.8, -40), new THREE.Vector3(-78, 7, -40), new THREE.Vector3(-75, 0.12, -40));
  scene.add(new THREE.Mesh(geo(new THREE.TubeGeometry(jet, 24, 0.1, 5, false)), mat('#c6e1df', { transparent: true, opacity: 0.75 })));

  // Park pavilions extend the northern district beyond the original skyline.
  // Their radial roof fins are a stylized architectural motif, not a measured
  // reconstruction of the Esplanade shells.
  box(-25, 0.01, -190, 137, 0.12, 32, sand);
  const pavilionGeo = geo(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
  const sunshadeGeo = geo(new THREE.ConeGeometry(1, 0.5, 3));
  const sunshade = mat('#b8b9a6', { roughness: 0.65, metalness: 0.15 });
  for (const x of [-60, 10]) {
    const dome = new THREE.Mesh(pavilionGeo, mat('#899996', { roughness: 0.5, metalness: 0.18 }));
    dome.position.set(x, 1, -183); dome.scale.set(21, 12, 13); scene.add(dome); collider(x, -183, 42, 26, 14);
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2;
      beam(new THREE.Vector3(x + Math.cos(angle) * 21, 1, -183 + Math.sin(angle) * 13), new THREE.Vector3(x + Math.cos(angle) * 10, 11.5, -183 + Math.sin(angle) * 6), 0.45, cream);
    }
    // Dense triangular sunshades, rather than a smooth pumpkin-like dome.
    for (let row = 0; row < 8; row++) {
      const polar = (row + 0.6) / 8.6 * Math.PI / 2, count = 12 + row * 5;
      for (let i = 0; i < count; i++) {
        const azimuth = (i + (row % 2) * 0.5) / count * Math.PI * 2;
        const dx = Math.sin(polar) * Math.cos(azimuth), dy = Math.cos(polar), dz = Math.sin(polar) * Math.sin(azimuth);
        const facet = new THREE.Mesh(sunshadeGeo, sunshade);
        facet.position.set(x + dx * 21.1, 1 + dy * 12.1, -183 + dz * 13.1);
        facet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / 21, dy / 12, dz / 13).normalize());
        facet.scale.set(1.35, 1, 1.15); scene.add(facet); qualityDetails.esplanadeSunshades++;
      }
    }
  }
  for (const x of [-88, -27, 43]) { palm(x, -202, 9); box(x, 0.5, -202, 6, 1, 3, hedge); collider(x, -202, 6, 3); }
  // Additional city blocks put an inhabited edge around the expanded route.
  for (let i = 0; i < 4; i++) tower(-251, -160 + i * 73, 18, 35 + i * 13, 28, i);
  for (let i = 0; i < 5; i++) tower(-150 + i * 74, -245, 26, 32 + i % 3 * 14, 18, i);
  // MBFC entrance reference: transparent-looking blue glazing, dark canopy
  // beams and a line of silver cylindrical bollards outside the drop-off.
  box(-239, 5, 59, 8, 0.18, 18, glass);
  for (const z of [51, 59, 67]) {
    box(-239, 4.9, z, 8, 0.3, 0.25, dark);
    const bollard = new THREE.Mesh(bollardGeo, steel); bollard.position.set(-234, 0.5, z); scene.add(bollard); collider(-234, z, 0.4, 0.4);
  }
  box(-242, 2.5, 59, 0.3, 5, 18, glass);

  // Third district ring: a walkable garden/observation-wheel district and
  // inhabited southern/western edges. This is a compressed authored layout.
  // New source captures refine materials, not an assertion of surveyed placement.
  const canopyFrame = mat('#703b5d'); // gardens-grove-03: wine-purple steel, not timber.
  box(324, 0.025, -25, 10, 0.16, 355, sand);
  for (const z of [-130, 80, 135]) box(291, 0.035, z, 67, 0.17, 7, sand);
  for (const [x, z, radius] of [[291, 15, 11], [304, 65, 14], [289, 116, 10]]) {
    const stem = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.4, 2.5, 21, 9)), sand);
    stem.position.set(x, 10.5, z); scene.add(stem); collider(x, z, 5, 5, 28);
    const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(radius, 0.2, 5, 18)), canopyFrame);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, 25, z); scene.add(rim);
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI / 6;
      const trunkPoint = new THREE.Vector3(x + Math.cos(angle) * 2.4, 17, z + Math.sin(angle) * 2.4);
      const shoulder = new THREE.Vector3(x + Math.cos(angle) * radius * 0.58, 22, z + Math.sin(angle) * radius * 0.58);
      beam(new THREE.Vector3(x + Math.cos(angle) * 2, 1, z + Math.sin(angle) * 2), trunkPoint, 0.3, canopyFrame);
      beam(trunkPoint, shoulder, 0.3, canopyFrame);
      beam(shoulder, new THREE.Vector3(x + Math.cos(angle) * radius, 25, z + Math.sin(angle) * radius), 0.23, canopyFrame);
      for (const fork of [-0.16, 0.16]) beam(new THREE.Vector3(x + Math.cos(angle) * radius * 0.7, 22, z + Math.sin(angle) * radius * 0.7), new THREE.Vector3(x + Math.cos(angle + fork) * (radius + 2), 26, z + Math.sin(angle + fork) * (radius + 2)), 0.15, canopyFrame);
      for (const y of [3, 6, 9, 12, 15]) {
        const planting = new THREE.Mesh(shrubGeo, i % 3 ? hedge : leaf); planting.position.set(x + Math.cos(angle) * 2.2, y + (i % 3) * 0.35, z + Math.sin(angle) * 2.2); planting.scale.set(0.75, 1.8, 0.75); scene.add(planting);
      }
    }
  }
  // Golden rails and grey decking echo the skywalk palette at ground level;
  // elevated walkability is deliberately not implied by this flat controller.
  for (const x of [319, 329]) {
    box(x, 1.1, 92, 0.08, 0.08, 24, yellow);
    for (let z = 80; z <= 104; z += 3) box(x, 0.55, z, 0.08, 1.1, 0.08, yellow);
  }
  // Ribbed conservatory-inspired shells, kept to the side of the public path.
  const conservatoryGlass = mat('#718e89', { roughness: 0.35, metalness: 0.08 });
  for (const [x, z, width, height, depth] of [[287, -168, 22, 20, 32], [289, -95, 25, 15, 26]]) {
    const shell = new THREE.Mesh(pavilionGeo, conservatoryGlass); shell.position.set(x, 0.4, z); shell.scale.set(width, height, depth); scene.add(shell); collider(x, z, width * 2, depth * 2, height + 1);
    for (let rib = -4; rib <= 4; rib++) {
      const fraction = rib / 5, ringRadius = Math.sqrt(1 - fraction * fraction);
      const curve: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const angle = i / 16 * Math.PI;
        curve.push(new THREE.Vector3(x + Math.cos(angle) * width * ringRadius, 0.7 + Math.sin(angle) * height * ringRadius, z + depth * fraction));
      }
      scene.add(new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 20, 0.4, 4, false)), pale));
    }
    // Fine dark longitudinal mullions subdivide the glass between white ribs.
    // Box beams join the shared instance batch instead of adding draw calls.
    for (let row = 1; row < 8; row++) {
      const angle = row / 8 * Math.PI;
      let previous: THREE.Vector3 | undefined;
      for (let i = 0; i <= 16; i++) {
        const latitude = -Math.PI / 2 + i / 16 * Math.PI, radius = Math.cos(latitude);
        const point = new THREE.Vector3(x + Math.cos(angle) * width * radius * 1.003, 0.55 + Math.sin(angle) * height * radius, z + Math.sin(latitude) * depth * 1.003);
        if (previous) { beam(previous, point, 0.075, dark); qualityDetails.conservatoryGlazingSegments++; }
        previous = point;
      }
    }
    box(x, 1.8, z + depth + 0.5, 12, 3.6, 1, dark);
    for (const dx of [-4, 0, 4]) box(x + dx, 1.8, z + depth + 1.05, 3.5, 3.2, 0.1, glass);
  }
  for (let z = -190; z <= -70; z += 15) { box(317, 0.65, z, 0.25, 1.3, 0.25, canopyFrame); collider(317, z, 0.3, 0.3); }
  // Promenade-road references show planted flyover supports and coach bays.
  // This is scenery above the ground route, not a second driveable level.
  box(257, 16, -227, 150, 1.7, 14, cream);
  for (let x = 185; x <= 329; x += 8) box(x, 14.6, -227, 0.75, 1.2, 13.6, cream);
  for (const z of [-233.7, -220.3]) box(257, 17.3, z, 150, 1, 0.4, pale);
  for (const x of [193, 253, 313]) {
    for (const z of [-231, -223]) {
      box(x, 4, z, 1.8, 8, 1.8, cream); collider(x, z, 2, 2, 12);
      beam(new THREE.Vector3(x, 7, z), new THREE.Vector3(x - 4, 15.5, z), 1.4, cream);
      beam(new THREE.Vector3(x, 7, z), new THREE.Vector3(x + 4, 15.5, z), 1.4, cream);
      box(x + 0.95, 5.5, z, 0.18, 10, 1.6, hedge);
    }
  }
  // Observation wheel with paired rims, radial spokes, capsule glazing and
  // splayed supports; the ground-level forecourt remains flat and accessible.
  box(250, 0.015, -267, 70, 0.12, 35, sand);
  const capsuleGeo = geo(new THREE.CapsuleGeometry(1.05, 4.5, 3, 8));
  const capsuleGlass = mat('#587c7c', { roughness: 0.32, metalness: 0.15 });
  const axle = new THREE.Mesh(geo(new THREE.CylinderGeometry(1.1, 1.1, 7.2, 12)), steel); axle.rotation.x = Math.PI / 2; axle.position.set(258, 30, -267); scene.add(axle);
  for (const z of [-270, -264]) {
    const rim = new THREE.Mesh(geo(new THREE.TorusGeometry(25, 0.4, 5, 40)), pale); rim.position.set(258, 30, z); scene.add(rim);
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      beam(new THREE.Vector3(258, 30, z), new THREE.Vector3(258 + Math.cos(angle) * 25, 30 + Math.sin(angle) * 25, z), 0.12, steel);
      if (z === -264) {
        const x = 258 + Math.cos(angle) * 25, y = 30 + Math.sin(angle) * 25;
        const capsule = new THREE.Mesh(capsuleGeo, capsuleGlass); capsule.rotation.x = Math.PI / 2; capsule.scale.x = 1.5; capsule.position.set(x, y, -267); scene.add(capsule); qualityDetails.wheelCapsules++;
        box(x, y - 0.95, -267, 2.5, 0.18, 5.5, pale);
        box(x, y + 1.05, -267, 2.3, 0.13, 5.7, pale);
        for (const dx of [-1.53, 1.53]) for (const dz of [-2, -1, 0, 1, 2]) box(x + dx, y, -267 + dz, 0.07, 1.55, 0.07, steel);
      }
    }
    for (const x of [245, 271]) { beam(new THREE.Vector3(x, 0, z + (z === -270 ? -6 : 6)), new THREE.Vector3(258, 30, z), 1, pale); collider(x, z + (z === -270 ? -6 : 6), 2, 2); }
  }
  // Southern civic promenade with arcaded retail, loading bays and planted
  // central reservations. Keep the north/south connector at x=0 unobstructed.
  box(33, 0.015, 227, 480, 0.12, 18, sand);
  for (const x of [-185, -133, -81, 67, 119, 171]) {
    box(x, 5, 201, 40, 10, 24, cream, scene, true); collider(x, 201, 40, 24, 15);
    box(x, 10.4, 201, 43, 0.8, 26, pale);
    box(x, 4.2, 215, 44, 0.3, 5, steel);
    for (let dx = -17; dx <= 17; dx += 6.8) {
      box(x + dx, 2, 213.1, 5.3, 3.7, 0.15, glass);
      box(x + dx, 7.3, 213.1, 4.8, 2.7, 0.15, glass);
    }
    box(x, 3.5, 213.3, 35, 0.7, 0.1, dark);
    for (const y of [3.05, 3.3, 3.55]) box(x, y, 215.2, 42, 0.08, 0.12, pale);
    for (const dx of [-18, 18]) { box(x + dx, 2, 217, 0.3, 4, 0.3, steel); collider(x + dx, 217, 0.4, 0.4); }
  }
  // Dense but batched west-side offices and open civic arcades.
  for (const z of [-230, -140, -50, 45]) {
    box(-281, 16, z, 24, 32, 34, cream, scene, true); collider(-281, z, 24, 34, 36);
    box(-281, 33, z, 26, 2, 36, pale);
    for (let floor = 0; floor < 8; floor++) for (let dz = -12; dz <= 12; dz += 6) box(-268.9, 3 + floor * 3.6, z + dz, 0.15, 2.5, 3.8, glass);
    box(-264, 4, z, 8, 0.18, 36, glass);
    for (let dz = -18; dz <= 18; dz += 3) box(-264, 3.95, z + dz, 8, 0.24, 0.15, dark);
    for (const dx of [-267, -263, -260.2]) box(dx, 3.95, z, 0.15, 0.24, 36, dark);
    for (const dz of [-16, -8, 0, 8, 16]) { box(-260.5, 2, z + dz, 0.5, 4, 0.5, pale); collider(-260.5, z + dz, 0.6, 0.6); }
  }
  box(-280, 0.015, 124, 40, 0.12, 39, sand);
  // Consistent street furniture fills long walks while preserving lane edges.
  for (let x = -280; x <= 325; x += 30) for (const z of [239, -282]) {
    box(x, 3.6, z, 0.14, 7.2, 0.14, steel); box(x + 0.7, 7.2, z, 1.5, 0.15, 0.45, dark); collider(x, z, 0.35, 0.35);
    if (x % 60 === 20) { box(x + 7, 0.6, z, 3.5, 0.3, 0.8, wood); collider(x + 7, z, 3.5, 0.8); }
  }
  for (let z = -260; z <= 235; z += 33) for (const x of [-325, 368]) {
    palm(x, z, 9 + Math.abs(z % 3));
    box(x, 0.25, z, 4, 0.5, 4, cream); collider(x, z, 4, 4);
  }
  for (const x of [320, -296]) for (let z = -235; z <= 110; z += 27) {
    box(x, 0.45, z, 3.5, 0.9, 8, hedge); collider(x, z, 3.5, 8);
  }
  // Black/white kerb blocks, paired yellow edge lines and gullies observed in
  // the 2024 Marina Gardens Drive and 2018 Esplanade exterior references.
  for (let z = -270; z < 240; z += 3) {
    if (z > 151 && z < 177) continue; // Open the connector junction.
    box(340, 0.16, z, 0.4, 0.32, 2.95, Math.abs(z / 3) % 2 ? white : dark);
  }
  for (const x of [341.1, 341.5]) box(x, 0.085, -15, 0.12, 0.025, 510, yellow);
  for (let z = -260; z < 230; z += 30) { box(338.8, 0.1, z, 0.65, 0.05, 1.1, dark); for (let i = 0; i < 5; i++) box(338.8, 0.13, z - 0.4 + i * 0.2, 0.65, 0.02, 0.04, steel); }
  // Bicycle racks, litter bins and sheltered seating add human-scale detail.
  for (const [x, z] of [[313, 134], [315, -130], [-285, 139], [95, 230]]) {
    box(x, 0.65, z, 0.8, 1.3, 0.8, dark); collider(x, z, 0.8, 0.8);
    box(x, 1.34, z, 0.95, 0.12, 0.95, steel);
    for (let i = 0; i < 4; i++) {
      box(x + 3 + i * 1.4, 0.6, z, 0.1, 1.2, 0.1, steel);
      box(x + 3 + i * 1.4, 0.6, z + 1.2, 0.1, 1.2, 0.1, steel);
      box(x + 3 + i * 1.4, 1.2, z + 0.6, 0.1, 0.1, 1.3, steel);
    }
  }
  const walkers: { group: THREE.Group; x: number; z: number; axis: 'x' | 'z'; phase: number }[] = [];
  const headGeo = geo(new THREE.IcosahedronGeometry(0.27, 1));
  for (const [index, [x, z, axis]] of ([[327, 105, 'z'], [305, 135, 'x'], [120, 229, 'x'], [-280, 116, 'z']] as const).entries()) {
    const group = new THREE.Group(); scene.add(group);
    box(0, 1, 0, 0.55, 0.85, 0.3, index % 2 ? mint : orange, group);
    box(-0.17, 0.35, 0, 0.2, 0.7, 0.24, dark, group); box(0.17, 0.35, 0, 0.2, 0.7, 0.24, dark, group);
    const head = new THREE.Mesh(headGeo, wood); head.position.y = 1.65; group.add(head);
    walkers.push({ group, x, z, axis, phase: index * 1.7 });
  }

  // Fullerton-side stone arcade: arched openings, cornices and planted frontage
  // observed in fullerton-materials.png, compressed into the city-side block.
  const stone = mat('#b3b6b4'), insetGlass = mat('#273f4a', { roughness: 0.4 });
  box(-133, 6.5, 30, 24, 13, 38, stone, scene, true); collider(-133, 30, 24, 38, 15);
  box(-133, 13.4, 30, 25.5, 0.8, 39.5, cream);
  for (const y of [1.1, 3.5, 6, 8.5, 11, 12.7]) box(-120.7, y, 30, 0.55, 0.22, 38.5, cream);
  const arch = new THREE.Shape(); arch.moveTo(-1.8, 0); arch.lineTo(-1.8, 4.5); arch.absarc(0, 4.5, 1.8, Math.PI, 0, true); arch.lineTo(1.8, 0); arch.closePath();
  const archGeo = geo(new THREE.ShapeGeometry(arch, 12));
  for (let z = 16; z <= 44; z += 7) {
    const opening = new THREE.Mesh(archGeo, insetGlass); opening.rotation.y = Math.PI / 2; opening.position.set(-120.35, 0.2, z); scene.add(opening);
    box(-120.2, 3, z + 2.3, 0.6, 6, 0.5, pale);
    box(-120.2, 3, z - 2.3, 0.6, 6, 0.5, pale);
    box(-117, 0.35, z, 1.5, 0.7, 4.5, cream); box(-117, 1, z, 1.2, 0.9, 4.2, hedge); collider(-117, z, 1.5, 4.5, 1.5);
  }
  // Record which reviewed images informed authored features (not photogrammetry).
  scene.userData.qualityDetails = qualityDetails;
  scene.userData.referenceFeatures = ['museum-shell', 'bay-skyline', 'fullerton-materials', 'fullerton-glazing', 'sands-canopy', 'sands-streetscape', 'south-waterfront', 'south-palms', 'merlion-waterfront-east', 'bayfront-gardens-east', 'south-promenade-north', 'gardens-grove-03-0', 'conservatory-road-03-90', 'barrage-approach-03-180', 'east-garden-03-180', 'flyer-road-03-270', 'float-waterfront-03-90', 'esplanade-road-03-180', 'promenade-road-03-180', 'downtown-green-03-180', 'marina-one-street-03-90'];

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
  // Repeated façade/paving/railing and palm details share batched draw calls.
  // Leave unique landmark geometry, moving waves and car/boat children alone.
  // The Merlion is static: preserve its world transforms while flattening it
  // so every scale/tile/grout strip joins the existing instance batches.
  statue.updateMatrixWorld(true);
  for (const child of [...statue.children]) scene.attach(child);
  scene.remove(statue);
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of [...scene.children]) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || Array.isArray(child.material) || waves.includes(child)) continue;
    const material = child.material as THREE.Material, key = `${child.geometry.uuid}:${material.uuid}:${child.castShadow}`;
    const batch = batches.get(key) || []; batch.push(child); batches.set(key, batch);
  }
  const instances: THREE.InstancedMesh[] = [pavers];
  for (const batch of batches.values()) {
    if (batch.length < 2) continue;
    const mesh = new THREE.InstancedMesh(batch[0].geometry, batch[0].material, batch.length);
    mesh.castShadow = batch[0].castShadow; mesh.receiveShadow = true;
    batch.forEach((item, i) => { item.updateMatrix(); mesh.setMatrixAt(i, item.matrix); scene.remove(item); });
    mesh.computeBoundingSphere(); scene.add(mesh); instances.push(mesh);
  }
  return {
    scene, obstacles, car, stamps,
    animate(time: number) { waves.forEach((wave, i) => { wave.position.x = wave.userData.baseX + Math.sin(time * 0.45 + i) * 1.4; }); stamps.forEach((stamp, i) => { stamp.rotation.y = time * 0.5; stamp.position.y = 3 + Math.sin(time * 1.7 + i) * 0.35; }); boatGroup.position.y = 0.5 + Math.sin(time) * 0.13;
      walkers.forEach(({ group, x, z, axis, phase }) => { const offset = Math.sin(time * 0.09 + phase) * 10; group.position.set(x + (axis === 'x' ? offset : 0), Math.abs(Math.sin(time * 4 + phase)) * 0.04, z + (axis === 'z' ? offset : 0)); group.rotation.y = (axis === 'x' ? Math.PI / 2 : 0) + (Math.cos(time * 0.09 + phase) > 0 ? Math.PI : 0); });
    },
    dispose() { instances.forEach(mesh => mesh.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); sun.shadow.map?.dispose(); },
  };
}
