import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildVehicleModel } from '../game/vehicle-models';
import type { VehicleKind } from '../game/vehicle-rules';
import type { ShopItem } from '../game/armory-catalog';
import type { EquippedWeapon } from '../game/armory-state';
import { armorModel, disposeModel, dressWeapon } from '../game/armory-visuals';

export default function ArmoryPreview({ item, weapon, vehicle = 'car' }: { item: ShopItem; weapon: EquippedWeapon; vehicle?: VehicleKind }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading equipment…'), [retry, setRetry] = useState(0);
  const signature = JSON.stringify(weapon);
  useEffect(() => {
    let disposed = false, model: THREE.Object3D | undefined, undress: (() => void) | undefined, frame = 0;
    const node = host.current!; setStatus('Loading equipment…');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setStatus('3D preview unavailable. Item stats and purchases still work.'); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    node.append(renderer.domElement); renderer.domElement.setAttribute('aria-label', `${item.name} interactive 3D preview. Drag to rotate, scroll to zoom.`);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .01, 20);
    scene.add(new THREE.HemisphereLight('#dce8ff', '#4c4b38', 2.3));
    const key = new THREE.DirectionalLight('#fff1d9', 3.8); key.position.set(2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight('#88c4e0', 2); rim.position.set(-2, 1, -2); scene.add(rim);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = .65; controls.maxDistance = 3.8;
    const resize = () => { renderer.setSize(Math.max(1, node.clientWidth), Math.max(1, node.clientHeight)); camera.aspect = node.clientWidth / Math.max(1, node.clientHeight); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(node); resize();
    const mount = (root: THREE.Object3D) => {
      if (disposed) { disposeModel(root); return; }
      model = root;
      if (item.category !== 'rig' && item.category !== 'plate' && item.category !== 'vehicleSkin') undress = dressWeapon(root, JSON.parse(signature));
      const bounds = new THREE.Box3().setFromObject(root), center = bounds.getCenter(new THREE.Vector3());
      root.position.sub(center); scene.add(root);
      const armor = item.category === 'rig' || item.category === 'plate';
      if (item.category === 'vehicleSkin') { const scale = vehicle === 'car' ? .22 : .10; root.scale.setScalar(scale); root.position.multiplyScalar(scale); }
      camera.position.set(armor ? .68 : .92, armor ? .3 : .30, armor ? 1.3 : .34); controls.target.set(0, 0, 0); controls.update(); setStatus('');
    };
    if (item.category === 'vehicleSkin') mount(buildVehicleModel(vehicle, item.id));
    else if (item.category === 'rig' || item.category === 'plate') mount(armorModel(item));
    else void new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/field-kit/${JSON.parse(signature).id}.glb`).then(gltf => mount(gltf.scene)).catch(() => { if (!disposed) setStatus('Preview failed to load.'); });
    const render = () => { if (disposed) return; controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(render); }; render();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); undress?.(); if (model) disposeModel(model); renderer.dispose(); renderer.domElement.remove(); };
  }, [item.id, item.category, item.name, signature, vehicle, retry]);
  return <div className="armory-preview"><div ref={host} className="armory-preview-canvas" />{status ? <div className="armory-preview-status" role="status">{status}{status.includes('failed') && <button onClick={() => setRetry(n => n + 1)}>Retry preview</button>}</div> : <span className="armory-orbit-hint">DRAG TO INSPECT · SCROLL TO ZOOM</span>}<span className="armory-preview-mark">SG / EQUIPMENT DIVISION</span></div>;
}
