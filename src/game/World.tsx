import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { Location, Mode } from '../data/locations';
import { advanceSpeed, CHECKPOINTS, checkpointCount } from './physics';

export interface GameStats { speed: number; distance: number; score: number; elapsed: number }
interface Props {
  location: Location;
  mode: Exclude<Mode, 'explore'>;
  running: boolean;
  controls: RefObject<Set<string>>;
  onStats: (stats: GameStats) => void;
  onFinish: () => void;
}

export default function World({ location, mode, running, controls, onStats, onFinish }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const active = useRef(running);
  const [error, setError] = useState('');
  useEffect(() => { active.current = running; if (!running) controls.current.clear(); }, [running, controls]);

  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setError('This browser could not start 3D graphics. Try a browser with WebGL enabled, or switch to Street View.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#c4d7d4');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', mode === 'drive' ? '3D neighborhood driving circuit' : '3D target practice. Click the orange targets.');
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#c4d7d4', 65, 230);
    scene.add(new THREE.HemisphereLight('#fff7dc', '#698f85', 2.7));
    const sun = new THREE.DirectionalLight('#fff1cf', 2.5);
    sun.position.set(-30, 70, 35);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
    camera.position.set(-2.5, 3.2, 12);
    camera.lookAt(-2.5, 3, -70);
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const textures: THREE.Texture[] = [];
    const material = (color: THREE.ColorRepresentation) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      materials.push(mat); return mat;
    };
    const road = material('#687775');
    const concrete = material('#d8d5bf');
    const cream = material('#f0e8d4');
    const leaves = material('#638c64');
    const trunk = material('#897965');
    const white = material('#e9e8d2');
    const orange = material('#f87c41');
    const dark = material('#384b44');
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    geometries.push(boxGeometry);
    function box(x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]) {
      const mesh = new THREE.Mesh(boxGeometry, mat);
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); scene.add(mesh); return mesh;
    }
    box(0, -0.4, -160, 800, 0.6, 800, material('#8ea984'));
    box(0, -0.05, -170, 15, 0.1, 440, road);
    for (const side of [-1, 1]) {
      box(side * 9.1, 0.12, -170, 3.2, 0.3, 440, concrete);
      box(side * 7.6, 0.08, -170, 0.15, 0.1, 440, white);
    }
    for (let z = 24; z > -380; z -= 9) box(0, 0.02, z, 0.13, 0.04, 3.8, white);
    // Original procedural facades; no downloaded map imagery or geometry.
    function facade(blockNumber: number, tint: string) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#eee7d6'; ctx.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 9; row++) {
        ctx.fillStyle = tint; ctx.fillRect(0, row * 54 + 38, 512, 14);
        for (let col = 0; col < 7; col++) {
          ctx.fillStyle = '#637d7b'; ctx.fillRect(col * 72 + 20, row * 54 + 10, 32, 25);
          ctx.fillStyle = '#b2c5bd'; ctx.fillRect(col * 72 + 35, row * 54 + 10, 2, 25);
        }
      }
      ctx.fillStyle = tint; ctx.fillRect(0, 0, 74, 512);
      ctx.fillStyle = '#fff6df'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(String(blockNumber), 8, 58);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }); materials.push(mat); return mat;
    }
    for (let i = 0; i < 11; i++) {
      for (const side of [-1, 1]) {
        const z = 5 - i * 36;
        const h = location.id === 'marina-bay' ? 34 + (i % 3) * 8 : 23 + (i % 3) * 3;
        const face = facade(location.block + i + (side === 1 ? 11 : 0), location.color);
        box(side * 24, h / 2 + 2, z, 19, h, 24, [face, face, cream, cream, face, face]);
        box(side * 24, 2, z, 20, 0.5, 25, cream);
        for (let j = -1; j <= 1; j++) box(side * 16, 1, z + j * 9, 0.7, 2, 0.7, cream);
        box(side * 24, h + 2.3, z, 20, 0.6, 25, cream);
      }
    }
    const foliageGeometry = new THREE.IcosahedronGeometry(2.8, 1); geometries.push(foliageGeometry);
    for (let i = 0; i < 25; i++) {
      for (const side of [-1, 1]) {
        const x = side * 11.5; const z = 15 - i * 16;
        box(x, 1.8, z, 0.35, 3.6, 0.35, trunk);
        const foliage = new THREE.Mesh(foliageGeometry, leaves);
        foliage.position.set(x, 5, z); foliage.scale.set(1, 1.15, 1); scene.add(foliage);
        if (i % 3 === 0) {
          box(side * 8.7, 3.4, z - 7, 0.12, 6.8, 0.12, dark);
          box(side * 7.8, 6.8, z - 7, 2, 0.12, 0.18, dark);
        }
      }
    }
    // A small bus shelter makes the street feel like home.
    box(10, 2.9, -16, 3, 0.25, 8, dark);
    box(11.2, 1.4, -16, 0.2, 2.8, 8, cream);
    box(10, 0.65, -16, 0.7, 0.2, 5, orange);
    const gates: THREE.Mesh[][] = [];
    if (mode === 'drive') {
      for (const distance of CHECKPOINTS) {
        const z = 12 - distance;
        gates.push([
          box(-6.8, 3, z, 0.15, 6, 0.15, orange),
          box(6.8, 3, z, 0.15, 6, 0.15, orange),
          box(0, 6, z, 13.7, 0.15, 0.15, orange),
        ]);
      }
    }
    const targets: THREE.Mesh[] = [];
    if (mode === 'training') {
      const targetGeometry = new THREE.CylinderGeometry(1.3, 1.3, 0.16, 32);
      const centerGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.18, 24);
      geometries.push(targetGeometry, centerGeometry);
      for (let i = 0; i < 5; i++) {
        const x = [-5, 0, 5, -3, 3][i]; const z = [-9, -17, -13, -28, -32][i];
        box(x, 1.4, z, 0.13, 2.8, 0.13, dark);
        const target = new THREE.Mesh(targetGeometry, orange);
        target.position.set(x, 3, z); target.rotation.x = Math.PI / 2;
        const center = new THREE.Mesh(centerGeometry, cream);
        center.position.y = -0.03; target.add(center); scene.add(target); targets.push(target);
      }
    }
    const keys = controls.current;
    const supported = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    const keydown = (event: KeyboardEvent) => {
      if (!active.current || !supported.includes(event.key.toLowerCase()) || event.target instanceof HTMLButtonElement) return;
      event.preventDefault(); keys.add(event.key.toLowerCase());
    };
    const keyup = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
    const blur = () => keys.clear();
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    let speed = 0; let distance = 0; let score = 0; let elapsed = 0; let finished = false;
    const raycaster = new THREE.Raycaster();
    const shoot = (event: PointerEvent) => {
      if (!active.current || mode !== 'training' || finished) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects(targets.filter(t => t.visible), false)[0];
      if (hit) {
        hit.object.visible = false; score++;
        onStats({ speed, distance, score, elapsed });
        if (score === 5) { finished = true; onFinish(); }
      }
    };
    renderer.domElement.addEventListener('pointerdown', shoot);
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let frame = 0; let last = performance.now(); let lastReport = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (active.current && !finished) {
        elapsed += dt;
        if (mode === 'drive') {
          speed = advanceSpeed(speed, keys.has('w') || keys.has('arrowup'), keys.has('s') || keys.has('arrowdown') || keys.has(' '), dt);
          distance = Math.min(240, distance + speed * dt);
          const steer = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
          camera.position.x = THREE.MathUtils.clamp(camera.position.x + steer * speed * dt * 0.32, -6, 6);
          camera.position.z = 12 - distance;
          camera.lookAt(camera.position.x + steer * 0.65, 3, camera.position.z - 70);
          score = checkpointCount(distance);
          gates.forEach((gate, index) => gate.forEach(mesh => { mesh.visible = index >= score; }));
          if (score === 3) { finished = true; onStats({ speed, distance, score, elapsed }); onFinish(); }
        }
        if (now - lastReport > 100) { onStats({ speed, distance, score, elapsed }); lastReport = now; }
      }
      renderer.render(scene, camera); frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); keys.clear();
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur);
      renderer.domElement.removeEventListener('pointerdown', shoot);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [location, mode, controls, onStats, onFinish]);

  return <div className="world" ref={host}>{error && <div className="viewer-message" role="alert">{error}</div>}</div>;
}
