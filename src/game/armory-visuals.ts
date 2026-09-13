import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { itemById, type ShopItem } from './armory-catalog';
import type { EquippedWeapon } from './armory-state';

/** Each preview owns its materials. Restore originals before disposing the source GLB. */
export function dressWeapon(root: THREE.Object3D, weapon: EquippedWeapon) {
  const skin = itemById(weapon.equipment.skin), originals: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  const materials: THREE.Material[] = [];
  let texture: THREE.CanvasTexture | undefined;
  if (skin?.palette) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = skin.palette[0]; ctx.fillRect(0, 0, 256, 256);
    let seed = 9021;
    for (let i = 0; i < 220; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      ctx.fillStyle = skin.palette[(seed >>> 16) % skin.palette.length];
      ctx.fillRect((seed % 32) * 8, ((seed >>> 8) % 32) * 8, (1 + (seed >>> 20) % 4) * 8, (1 + (seed >>> 24) % 3) * 8);
    }
    texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.magFilter = THREE.NearestFilter;
  }
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    originals.push([object, object.material]);
    const dressed = (Array.isArray(object.material) ? object.material : [object.material]).map(source => {
      const m = source.clone() as THREE.MeshStandardMaterial; materials.push(m);
      if (/olive|polymer/i.test(source.name) && texture) { m.map = texture; m.color.set('#ffffff'); m.roughness = skin?.id === 'skin-gold' ? .32 : .72; m.metalness = skin?.id === 'skin-gold' ? .65 : .08; }
      if (/machined|raised/i.test(source.name) && weapon.accent) { m.color.set(weapon.accent); m.metalness = .55; }
      return m;
    });
    object.material = Array.isArray(object.material) ? dressed : dressed[0];
  });
  const accessories = new THREE.Group(); root.add(accessories);
  const addBand = (x: number, y: number, z: number, color: string) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(.038, .012, .05), new THREE.MeshStandardMaterial({ color, metalness: .55, roughness: .45 }));
    part.position.set(x, y, z); accessories.add(part);
  };
  if (weapon.equipment.attachments.optic) addBand(0, weapon.sightHeight + .02, -.08, '#79bccc');
  if (weapon.equipment.attachments.magazine) addBand(.036, .07, .13, '#b8a17a');
  if (weapon.equipment.attachments.handling) addBand(0, .07, -.20, '#555b5e');
  return () => {
    originals.forEach(([object, material]) => object.material = material);
    materials.forEach(m => m.dispose()); texture?.dispose(); accessories.removeFromParent(); disposeModel(accessories);
  };
}
export function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { materials.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v); }); }); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.source.data instanceof ImageBitmap) t.source.data.close(); });
}
/** Visual game interpretation of a carrying rig and removable insert, not a protection specification. */
export function armorModel(item: ShopItem) {
  const group = new THREE.Group(), elite = item.tier === 'Elite';
  const cloth = document.createElement('canvas'); cloth.width = cloth.height = 64;
  const ctx = cloth.getContext('2d')!; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 64; i += 4) { ctx.fillStyle = '#9a9a9a'; ctx.fillRect(i, 0, 1, 64); ctx.fillStyle = '#666666'; ctx.fillRect(0, i, 64, 1); }
  const weave = new THREE.CanvasTexture(cloth); weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(8, 8);
  const fabric = new THREE.MeshStandardMaterial({ color: elite ? '#383d35' : '#626b47', roughness: .95, bumpMap: weave, bumpScale: .002 });
  const trim = new THREE.MeshStandardMaterial({ color: elite ? '#b59856' : '#303b2c', roughness: .7 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, material = fabric) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(.012, w / 5, h / 5, d / 5)), material); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  box(.46, .52, .09, 0, 0, 0); box(.44, .5, .06, 0, .01, -.19);
  for (const x of [-.15, .15]) { box(.085, .19, .065, x, .33, -.045); box(.09, .045, .085, x, .30, .002, trim); }
  for (const x of [-.265, .265]) box(.09, .2, .23, x, -.06, -.09);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) box(.055, .014, .016, -.175 + col * .07, .18 - row * .065, .053, trim);
  if (item.category === 'rig') {
    for (const x of [-.15, 0, .15]) { box(.12, .18, .08, x, -.16, .095); box(.126, .04, .085, x, -.08, .10, trim); }
    if (item.id !== 'rig-ilbv') for (const x of [-.30, .30]) box(.10, .19, .10, x, -.17, .05);
  } else if (item.id !== 'plate-none') {
    const shape = new THREE.Shape(); shape.moveTo(-.13, -.20); shape.lineTo(.13, -.20); shape.lineTo(.14, .12); shape.lineTo(.075, .20); shape.lineTo(-.075, .20); shape.lineTo(-.14, .12); shape.closePath();
    const material = new THREE.MeshStandardMaterial({ color: elite ? '#363c44' : item.id === 'plate-soft' ? '#788268' : '#393c3b', roughness: .78, metalness: .08 });
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .026, bevelEnabled: true, bevelSize: .012, bevelThickness: .008, bevelSegments: 2, steps: 1 }), material);
    plate.position.set(.36, .015, .30); plate.rotation.y = -.20; group.add(plate);
    box(.15, .06, .004, .36, .07, .341, trim);
  }
  return group;
}
