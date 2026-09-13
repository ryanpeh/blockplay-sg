import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CarFront, Footprints, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface SceneManifest {
  version: number; cameraHeight: number; explorationRadius: number; copyright?: string; captureDate?: string;
  meshes: { geometry: string; texture: string }[];
}

export default function MarinaWorld() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading the Marina Bay reconstruction…');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [travel, setTravel] = useState<'walk' | 'drive'>('walk');
  const travelRef = useRef(travel);
  const keys = useRef(new Set<string>());
  const [attribution, setAttribution] = useState('');
  const [distance, setDistance] = useState(0);
  const resetPosition = useRef(() => {});
  useEffect(() => { travelRef.current = travel; keys.current.clear(); }, [travel]);

  useEffect(() => {
    const container = host.current!;
    const abort = new AbortController();
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let removeControls = () => {};
    const geometry: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const dispose = () => {
      geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
    };
    setStatus('Loading the Marina Bay reconstruction…'); setFailed(false); setDistance(0);
    async function json(path: string) {
      const response = await fetch(`/reconstruction/marina-bay/${path}`, { signal: abort.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Marina Bay source images have not been reconstructed yet. Enable Street View Static API, then run pnpm marina:capture and pnpm marina:reconstruct.');
      return response.json();
    }
    async function init() {
      try {
        const manifest: SceneManifest = await json('scene.json');
        if (manifest.version !== 1 || !manifest.meshes?.length || !Number.isFinite(manifest.explorationRadius) || manifest.explorationRadius <= 0 || manifest.explorationRadius > 30) throw new Error('Invalid scene manifest. Rebuild the Marina Bay scene.');
        const scene = new THREE.Scene(); scene.background = new THREE.Color('#bbd6dd');
        for (const part of manifest.meshes) {
          if (!/^[\w.-]+$/.test(part.geometry) || !/^[\w.-]+$/.test(part.texture)) throw new Error('Invalid scene asset path.');
          const data = await json(part.geometry);
          const meshGeometry = new THREE.BufferGeometry(); geometry.push(meshGeometry);
          meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
          meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
          meshGeometry.setIndex(data.indices); meshGeometry.computeVertexNormals();
          const texture = await new THREE.TextureLoader().loadAsync(`/reconstruction/marina-bay/${part.texture}`);
          textures.push(texture); texture.colorSpace = THREE.SRGBColorSpace;
          if (abort.signal.aborted) { dispose(); return; }
          const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }); materials.push(material);
          scene.add(new THREE.Mesh(meshGeometry, material));
        }
        if (abort.signal.aborted) { dispose(); return; }
        setAttribution(`${manifest.copyright || 'Google Street View'} · Capture ${manifest.captureDate || 'date unknown'} · Estimated depth`);
        const groundGeometry = new THREE.CircleGeometry(manifest.explorationRadius + 1, 64); geometry.push(groundGeometry);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: '#8b8983', side: THREE.DoubleSide }); materials.push(groundMaterial);
        const ground = new THREE.Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);
        const boundaryGeometry = new THREE.RingGeometry(manifest.explorationRadius - 0.06, manifest.explorationRadius, 96); geometry.push(boundaryGeometry);
        const boundaryMaterial = new THREE.MeshBasicMaterial({ color: '#eac77e', transparent: true, opacity: 0.65, side: THREE.DoubleSide }); materials.push(boundaryMaterial);
        const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial); boundary.rotation.x = -Math.PI / 2; boundary.position.y = 0.02; scene.add(boundary);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
        const canvas = renderer.domElement; container.appendChild(canvas); canvas.tabIndex = 0;
        canvas.setAttribute('aria-label', 'Marina Bay reconstructed 3D scene. Drag to look and use WASD to move.');
        const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 300);
        camera.rotation.order = 'YXZ';
        let yaw = 0, pitch = 0, speed = 0, moved = 0;
        camera.position.set(0, manifest.cameraHeight, 0);
        resetPosition.current = () => { camera.position.set(0, manifest.cameraHeight, 0); yaw = 0; pitch = 0; speed = 0; moved = 0; setDistance(0); };
        let drag: { x: number; y: number } | undefined;
        const pointerDown = (event: PointerEvent) => { canvas.focus(); canvas.setPointerCapture(event.pointerId); drag = { x: event.clientX, y: event.clientY }; };
        const pointerMove = (event: PointerEvent) => {
          if (!drag) return;
          yaw -= (event.clientX - drag.x) * 0.004;
          pitch = THREE.MathUtils.clamp(pitch - (event.clientY - drag.y) * 0.004, -1.2, 1.2);
          drag = { x: event.clientX, y: event.clientY };
        };
        const pointerUp = () => { drag = undefined; };
        const supported = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
        const keyDown = (event: KeyboardEvent) => { if (supported.includes(event.key.toLowerCase())) { event.preventDefault(); keys.current.add(event.key.toLowerCase()); } };
        const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
        const blur = () => { keys.current.clear(); drag = undefined; speed = 0; };
        canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp);
        canvas.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur); canvas.addEventListener('blur', blur);
        removeControls = () => {
          canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp);
          canvas.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur); canvas.removeEventListener('blur', blur);
        };
        observer = new ResizeObserver(() => { const { width, height } = container.getBoundingClientRect(); renderer!.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); }); observer.observe(container);
        let previous = performance.now(), lastReport = 0;
        const animate = (now: number) => {
          const dt = Math.min((now - previous) / 1000, 0.05); previous = now;
          const held = keys.current;
          const forward = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'));
          const sideways = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
          const before = camera.position.clone();
          if (travelRef.current === 'drive') {
            speed = held.has(' ') ? 0 : THREE.MathUtils.clamp(speed + (forward * 2.5 - speed * 1.4) * dt, -1, 2.5);
            yaw -= sideways * speed * dt * 0.75;
            camera.position.x -= Math.sin(yaw) * speed * dt; camera.position.z -= Math.cos(yaw) * speed * dt;
          } else {
            speed = 0;
            const normalization = Math.max(1, Math.hypot(forward, sideways));
            camera.position.x += (-Math.sin(yaw) * forward + Math.cos(yaw) * sideways) / normalization * 1.6 * dt;
            camera.position.z += (-Math.cos(yaw) * forward - Math.sin(yaw) * sideways) / normalization * 1.6 * dt;
          }
          const radius = Math.hypot(camera.position.x, camera.position.z);
          if (radius > manifest.explorationRadius) { camera.position.x *= manifest.explorationRadius / radius; camera.position.z *= manifest.explorationRadius / radius; speed = 0; }
          moved += Math.hypot(camera.position.x - before.x, camera.position.z - before.z);
          camera.position.y = THREE.MathUtils.lerp(camera.position.y, travelRef.current === 'walk' ? manifest.cameraHeight : 1.5, Math.min(1, dt * 6));
          camera.rotation.set(pitch, yaw, 0, 'YXZ'); renderer!.render(scene, camera);
          if (now - lastReport > 200) { setDistance(moved); lastReport = now; }
          frame = requestAnimationFrame(animate);
        };
        setStatus(''); frame = requestAnimationFrame(animate);
      } catch (error) {
        if (!abort.signal.aborted) { setStatus(error instanceof Error ? error.message : 'Could not load the Marina Bay scene.'); setFailed(true); }
      }
    }
    void init();
    return () => { abort.abort(); cancelAnimationFrame(frame); observer?.disconnect(); removeControls(); keys.current.clear(); dispose(); renderer?.dispose(); renderer?.domElement.remove(); resetPosition.current = () => {}; };
  }, [retry]);

  return <div className="marina-reconstruction">
    <div className="viewport marina-viewport"><div ref={host} className="world" />
      {status ? <div className="viewer-message" role={failed ? 'alert' : 'status'}><h3>{failed ? 'Marina Bay reconstruction is waiting for source imagery.' : 'Building a little more depth.'}</h3><p>{status}</p>{failed && <button className="secondary-button" onClick={() => setRetry(n => n + 1)}>Reload scene assets</button>}</div> : <><div className="scene-top"><span className="scene-badge">MARINA BAY · ESTIMATED 3D</span></div><div className="scene-bottom"><span className="scene-caption">{attribution}</span></div></>}
    </div>
    <div className="experience-toolbar"><div className="experience-title"><span className="mode-icon">{travel === 'walk' ? <Footprints size={20} /> : <CarFront size={20} />}</span><div><h3>Marina Bay · depth reconstruction</h3><p>Small-area preview · approximate geometry and scale</p></div></div><div className="toolbar-actions"><button className="session-button" aria-pressed={travel === 'walk'} onClick={() => setTravel('walk')}>Walk</button><button className="session-button" aria-pressed={travel === 'drive'} onClick={() => setTravel('drive')}>Drive</button><button className="icon-button" aria-label="Reset Marina position" onClick={() => resetPosition.current()}><RotateCcw size={16} /></button></div></div>
    <div className="session-strip"><div><span>TRAVELLED / APPROX.</span><strong>{distance.toFixed(1)}<small>m</small></strong></div><p className="marina-hint">Click scene, then WASD · Drag to look · Gold ring marks the boundary</p><div className="touch-controls">{(['a', 'w', 's', 'd'] as const).map((key, index) => { const Icon = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight][index]; return <button key={key} disabled={!!status} aria-label={`Marina ${['left', 'forward', 'backward', 'right'][index]}`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); keys.current.add(key); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)} onLostPointerCapture={() => keys.current.delete(key)}><Icon size={15} /></button>; })}</div></div>
  </div>;
}
