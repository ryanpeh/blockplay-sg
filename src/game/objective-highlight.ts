import * as THREE from 'three';

/** Decorative only: follows an existing stamp, never participates in collisions. */
export function createObjectiveHighlight(scene: THREE.Scene) {
  const group = new THREE.Group(); group.name = 'active-objective-highlight'; group.visible = false;
  const purple = new THREE.MeshBasicMaterial({ color: '#8c65ff', toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const glow = new THREE.MeshBasicMaterial({ color: '#976cff', transparent: true, opacity: 0.2, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.15, 48), purple);
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.16; group.add(halo);
  const rim = new THREE.Mesh(new THREE.RingGeometry(4.15, 4.4, 48), white);
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.17; group.add(rim);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.3, 28, 12, 1, true), glow);
  beam.position.y = 14; group.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.5, 4), purple);
  arrow.rotation.z = Math.PI; arrow.position.y = 8; group.add(arrow);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), white);
  gem.position.y = 10.5; group.add(gem);
  scene.add(group);
  let selected: THREE.Group | undefined;
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const restore = () => { originals.forEach((material, mesh) => { mesh.material = material; }); originals.clear(); };
  return {
    group,
    select(stamp?: THREE.Group) {
      if (stamp === selected) return;
      restore(); selected = stamp;
      if (stamp) stamp.traverse(child => {
        if (child instanceof THREE.Mesh) { originals.set(child, child.material); child.material = purple; }
      });
    },
    update(time: number) {
      group.visible = !!selected?.visible;
      if (!selected || !group.visible) return;
      group.position.set(selected.position.x, 0, selected.position.z);
      // Gentle vertical movement; no flashing or expanding collision footprint.
      arrow.position.y = 8 + Math.sin(time * 2) * 0.35;
      gem.rotation.y = time * 0.7;
    },
    dispose() {
      restore(); scene.remove(group);
      group.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); });
      purple.dispose(); white.dispose(); glow.dispose();
    },
  };
}
