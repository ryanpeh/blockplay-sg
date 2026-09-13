import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { defaultDriveLook, dragDriveLook, driveCameraOffset, settleDriveLook } from '../game/drive-camera';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CarFront, Footprints, RotateCcw, Flag } from 'lucide-react';
import { buildMarinaScene, MARINA_MAP_ROADS, MARINA_SPAWN, MARINA_STAMPS } from '../game/marina-scene';
import { MARINA_BOUNDS, moveInMarina } from '../game/marina-collision';
import { minimapProjection } from '../game/minimap';

const initialHud = { distance: 0, speed: 0, x: MARINA_SPAWN.x as number, z: MARINA_SPAWN.z as number, collected: [] as number[] };
const map = minimapProjection(MARINA_BOUNDS);

export default function MarinaGame() {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [travel, setTravel] = useState<'walk' | 'drive'>('walk');
  const travelRef = useRef(travel);
  const keys = useRef(new Set<string>());
  const reset = useRef(() => {});
  const [hud, setHud] = useState(initialHud);
  useEffect(() => { travelRef.current = travel; keys.current.clear(); }, [travel]);

  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { setError('WebGL could not start. Try a browser with hardware acceleration enabled.'); return; }
    const world = buildMarinaScene();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
    const canvas = renderer.domElement; canvas.tabIndex = 0; container.appendChild(canvas);
    canvas.setAttribute('aria-label', 'Modeled Marina Bay game. Click and use WASD to move; drag to look.');
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1400); camera.rotation.order = 'YXZ';
    let position = { x: MARINA_SPAWN.x as number, z: MARINA_SPAWN.z as number };
    let yaw = MARINA_SPAWN.yaw, pitch = 0.14, speed = 0, distance = 0;
    let driveLook = defaultDriveLook(), lastLookAt = 0;
    let lastTravel = travelRef.current;
    const collected = new Set<number>();
    const report = () => setHud({ distance, speed, ...position, collected: [...collected] });
    reset.current = () => {
      position = { x: MARINA_SPAWN.x, z: MARINA_SPAWN.z }; yaw = MARINA_SPAWN.yaw; pitch = 0.14; speed = 0; distance = 0; collected.clear();
      driveLook = defaultDriveLook(); drag = undefined; lastLookAt = 0;
      world.stamps.forEach(stamp => { stamp.visible = true; }); keys.current.clear(); report();
    };
    let drag: { x: number; y: number; pointerId: number } | undefined;
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || drag) return;
      canvas.focus(); canvas.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (travelRef.current === 'drive') {
        driveLook = dragDriveLook(driveLook, event.clientX - drag.x, event.clientY - drag.y);
        lastLookAt = performance.now();
      } else {
        yaw -= (event.clientX - drag.x) * 0.004;
        pitch = THREE.MathUtils.clamp(pitch - (event.clientY - drag.y) * 0.003, -0.7, 1.1);
      }
      drag.x = event.clientX; drag.y = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => { if (drag?.pointerId === event.pointerId) { drag = undefined; lastLookAt = performance.now(); } };
    const supported = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'];
    const keyDown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (supported.includes(key)) { event.preventDefault(); keys.current.add(key); } };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => { keys.current.clear(); speed = 0; drag = undefined; };
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', pointerUp); canvas.addEventListener('lostpointercapture', pointerUp);
    canvas.addEventListener('keydown', keyDown); canvas.addEventListener('blur', blur); window.addEventListener('keyup', keyUp); window.addEventListener('blur', blur);
    const resize = () => { const { width, height } = container.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let frame = 0, last = performance.now(), lastReport = 0;
    const animate = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const held = keys.current;
      const forward = Number(held.has('w') || held.has('arrowup')) - Number(held.has('s') || held.has('arrowdown'));
      const side = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft'));
      const driving = travelRef.current === 'drive';
      if (lastTravel !== travelRef.current) {
        driveLook = defaultDriveLook(); drag = undefined; lastLookAt = 0;
        lastTravel = travelRef.current;
      }
      let dx = 0, dz = 0;
      if (driving) {
        speed = held.has(' ') ? THREE.MathUtils.damp(speed, 0, 15, dt) : forward ? THREE.MathUtils.clamp(speed + forward * 10 * dt, -5, 18) : THREE.MathUtils.damp(speed, 0, 2, dt);
        yaw -= side * Math.min(Math.abs(speed) / 8, 1.5) * Math.sign(speed) * dt;
        dx = -Math.sin(yaw) * speed * dt; dz = -Math.cos(yaw) * speed * dt;
      } else {
        speed = 0; const rate = held.has('shift') ? 8 : 4.2, normal = Math.max(1, Math.hypot(forward, side));
        dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / normal * rate * dt;
        dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / normal * rate * dt;
      }
      const next = moveInMarina(position, dx, dz, driving ? 1.35 : 0.65, world.obstacles);
      const step = Math.hypot(next.x - position.x, next.z - position.z);
      if (driving && step < Math.hypot(dx, dz) * 0.2) speed = 0;
      distance += step; position = next;
      world.car.visible = driving; world.car.position.set(position.x, 0.12, position.z); world.car.rotation.y = yaw;
      if (driving) {
        if (!drag && Math.abs(speed) > 0.5 && now - lastLookAt > 800) driveLook = settleDriveLook(driveLook, dt);
        const offset = driveCameraOffset(yaw, driveLook);
        camera.position.set(position.x + offset.x, 1.3 + offset.y, position.z + offset.z);
        camera.lookAt(position.x, 1.3, position.z);
      } else {
        camera.position.set(position.x, 1.75, position.z); camera.rotation.set(pitch, yaw, 0, 'YXZ');
      }
      MARINA_STAMPS.forEach((stamp, i) => {
        if (!collected.has(i) && Math.hypot(stamp.x - position.x, stamp.z - position.z) < 4) { collected.add(i); world.stamps[i].visible = false; }
      });
      world.animate(now / 1000); renderer.render(world.scene, camera);
      if (now - lastReport > 150) { report(); lastReport = now; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); keys.current.clear(); reset.current = () => {};
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerUp); canvas.removeEventListener('lostpointercapture', pointerUp);
      canvas.removeEventListener('keydown', keyDown); canvas.removeEventListener('blur', blur); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', blur);
      world.dispose(); renderer.dispose(); canvas.remove();
    };
  }, []);

  return <div className="marina-reconstruction marina-game">
    <div className="viewport marina-viewport"><div ref={host} className="world" />
      {error ? <div className="viewer-message" role="alert"><p>{error}</p></div> : <>
        <div className="scene-top"><span className="scene-badge"><span className="status-dot" /> MARINA BAY · GAME WORLD</span><span className="marina-stamp-count"><Flag size={14} />{hud.collected.length} / {MARINA_STAMPS.length} stamps</span></div>
        <div className="marina-map" aria-label="Game map showing player position and collectible stamps"><span>THE BAY & GARDENS</span>
          <svg viewBox="0 0 200 160" role="img" aria-label="Schematic game map">
            <rect x="6" y="6" width="188" height="148" rx="5" fill="#d7dfc8" />
            <g transform={map.transform}>
              {MARINA_MAP_ROADS.map((road, index) => <polyline key={index} points={road.points.map(point => `${point.x},${point.z}`).join(' ')} fill="none" stroke="#929f8d" strokeWidth="15" />)}
              <rect x="-80" y="-90" width="160" height="140" fill="#7db5b3" />
              {[-65,-15,35].map(z => <rect key={z} x="139" y={z - 15} width="24" height="30" fill="#eee7ce" />)}
              <rect x="141" y="-107" width="20" height="184" rx="4" fill="#819872" />
            </g>
            {MARINA_STAMPS.map((stamp, i) => <circle key={stamp.name} cx={map.x(stamp.x)} cy={map.y(stamp.z)} r="3" fill={hud.collected.includes(i) ? '#4f7960' : '#d78853'} />)}
            <circle cx={map.x(hud.x)} cy={map.y(hud.z)} r="4" stroke="#fffdf0" strokeWidth="2" fill="#244832" />
          </svg>
        </div>
        <div className="marina-objective">{hud.collected.length === MARINA_STAMPS.length ? 'All stamps collected. Shiok! Keep exploring or reset to play again.' : `Find the orange rings · Explore Marina Bay and collect ${MARINA_STAMPS.length} stamps.`}</div>
      </>}
    </div>
    <div className="experience-toolbar"><div className="experience-title"><span className="mode-icon">{travel === 'walk' ? <Footprints size={20} /> : <CarFront size={20} />}</span><div><h3>Marina Bay · waterfront & gardens</h3><p>Expanded low-poly map · inner and outer road loops</p></div></div><div className="toolbar-actions"><button className="session-button" aria-pressed={travel === 'walk'} onClick={() => setTravel('walk')}>Walk</button><button className="session-button" aria-pressed={travel === 'drive'} onClick={() => setTravel('drive')}>Drive</button><button className="icon-button" aria-label="Reset Marina position" onClick={() => reset.current()}><RotateCcw size={16} /></button></div></div>
    <div className="session-strip"><div><span>EXPLORED</span><strong>{Math.round(hud.distance)}<small>m</small></strong></div><p className="marina-hint">Click scene, then WASD · {travel === 'walk' ? 'Drag to look' : 'Drag to orbit · A/D steer'} · {travel === 'walk' ? 'Shift to run' : `${Math.round(Math.abs(hud.speed) * 3.6)} km/h · Space to brake`}</p><div className="touch-controls">{(['a', 'w', 's', 'd'] as const).map((key, index) => { const Icon = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight][index]; return <button key={key} disabled={!!error} aria-label={`Marina ${['left', 'forward', 'backward', 'right'][index]}`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); keys.current.add(key); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)} onLostPointerCapture={() => keys.current.delete(key)}><Icon size={15} /></button>; })}</div></div>
  </div>;
}
