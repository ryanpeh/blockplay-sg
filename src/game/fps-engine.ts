import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildMarinaScene } from './marina-scene';
import { moveInMarina } from './marina-collision';
import { advanceWeapon, beginReload, createLoadout, fireWeapon, FPS_SPAWN, FPS_TARGETS, FPS_WEAPONS, movementInput } from './fps-rules';
import { firstVisibleHit } from './fps-raycast';
import { applyArmorDamage, createProfile, resolveLoadout, rewardAmount, completionXp, type ResolvedLoadout, type ExerciseReward } from './armory-state';
import { registerElimination, ELIMINATION_XP, type KillChain } from './progression';
import { createFpsVehicles } from './fps-vehicles';
import type { VehicleKind } from './vehicle-rules';
import { dressWeapon } from './armory-visuals';

export interface FpsHud {
  phase: 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'defeated' | 'error';
  weapon: number; magazine: number; reserve: number; reloading: number;
  hits: number; shots: number; landed: number; health: number; armor: number; incoming: boolean; hurt: boolean; lastDamage: number; earned: number; earnedXp: number; callout: string; chain: number; elapsed: number; aiming: boolean; hit: boolean;
  vehicle: VehicleKind | 'on-foot'; vehicleSpeed: number; altitude: number; interact: string; vehicleNotice: string; carDistance: number; helicopterDistance: number;
  locked: boolean; message: string; muted: boolean; x: number; z: number;
}
export const initialFpsHud: FpsHud = { phase: 'loading', weapon: 0, magazine: 30, reserve: 120, reloading: 0, hits: 0, shots: 0, landed: 0, health: 100, armor: 0, incoming: false, hurt: false, lastDamage: 0, earned: 0, earnedXp: 0, callout: '', chain: 0, elapsed: 0, aiming: false, hit: false, vehicle: 'on-foot', vehicleSpeed: 0, altitude: 0, interact: '', vehicleNotice: '', carDistance: 0, helicopterDistance: 0, locked: false, message: '', muted: false, x: FPS_SPAWN.x, z: FPS_SPAWN.z };

function disposeAssets(roots: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  roots.forEach(root => root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      materials.add(m);
      Object.values(m).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  }));
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  textures.forEach(t => { t.dispose(); if (typeof ImageBitmap !== 'undefined' && t.source.data instanceof ImageBitmap) t.source.data.close(); });
}

export function createFpsEngine(host: HTMLDivElement, onHud: (hud: FpsHud) => void, options: { loadout?: ResolvedLoadout; combat?: boolean; onComplete?: (reward: ExerciseReward) => void; onElimination?: (id: string) => void; onFullscreen?: () => void } = {}) {
  const equipment = options.loadout || resolveLoadout(createProfile()), specs = equipment.weapons;
  const undress: (() => void)[] = [];
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  // Shadow-map rendering doubles work on this VM; the existing map still supplies its lighting.
  renderer.shadowMap.enabled = false; renderer.autoClear = false;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Marina FPS range. WASD to move, mouse to look, click to fire.');
  host.append(canvas);
  const world = buildMarinaScene(); world.stamps.forEach(o => o.visible = false);
  const vehicles = createFpsVehicles(world.scene, world.obstacles, equipment.vehicleSkins);
  const chaseRay = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.08, 800); camera.rotation.order = 'YXZ';
  const viewScene = new THREE.Scene(), viewCamera = new THREE.PerspectiveCamera(65, 1, 0.01, 3);
  viewScene.add(new THREE.HemisphereLight('#e4efff', '#576350', 2.1));
  const weaponLight = new THREE.DirectionalLight('#fff4dd', 2.5); weaponLight.position.set(1, 2, 1); viewScene.add(weaponLight);
  const rig = new THREE.Group(); viewScene.add(rig);
  const loader = new GLTFLoader(), templates: THREE.Group[] = [], weapons: THREE.Group[] = [];
  const targets: { root: THREE.Group; hitZone: THREE.Mesh; alive: boolean; health: number; maxHealth: number; bar: THREE.Mesh }[] = [];
  const decorations = new THREE.Group(); world.scene.add(decorations);
  const targetGeometry = new THREE.CircleGeometry(0.265, 32);
  const targetMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  const flashGeometry = new THREE.SphereGeometry(0.028, 8, 6);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: '#ffd382', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial); flash.scale.set(1, 1, 2.6); flash.visible = false;
  const tracerGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracerMaterial = new THREE.LineBasicMaterial({ color: '#ffe8b0', transparent: true, opacity: 0.6 });
  const tracer = new THREE.Line(tracerGeometry, tracerMaterial); tracer.frustumCulled = false; tracer.visible = false; world.scene.add(tracer);
  const impactGeometry = new THREE.SphereGeometry(0.05, 8, 6), impactMaterial = new THREE.MeshBasicMaterial({ color: '#f3ae59' });
  const impact = new THREE.Mesh(impactGeometry, impactMaterial); impact.visible = false; world.scene.add(impact);
  const keys = new Set<string>(); const hud = { ...initialFpsHud, armor: equipment.armor };
  let killChain: KillChain = { count: 0, lastAt: -Infinity }, calloutTime = 0;
  let roundId = crypto.randomUUID(), attackTimer = 3, hurtTime = 0;
  let pendingAttack: { target: number; remaining: number; aim: THREE.Vector3 } | null = null;
  const attackRay = new THREE.Raycaster(), attackOrigin = new THREE.Vector3();
  const healthGeometry = new THREE.PlaneGeometry(.54, .055), healthMaterial = new THREE.MeshBasicMaterial({ color: "#e1a74e", side: THREE.DoubleSide });
  let disposed = false, loadout = createLoadout(specs), position = { x: FPS_SPAWN.x, z: FPS_SPAWN.z };
  let yaw: number = FPS_SPAWN.yaw, pitch: number = FPS_SPAWN.pitch, vertical = 0, velocityY = 0;
  let trigger = false, ads = false, touchAim = false, actualAim = false, kick = 0, bob = 0, flashTime = 0, hitTime = 0, effectTime = 0, impactActive = false;
  let capturePending = false;
  let lastTime = performance.now(), frame = 0, lastReport = 0, wasLocked = false;
  let drag: { id: number; x: number; y: number } | null = null;
  let motor: OscillatorNode | null = null, motorGain: GainNode | null = null;
  let audio: AudioContext | null = null, soundBuffer: AudioBuffer | null = null;
  const ray = new THREE.Raycaster(); ray.far = 250;
  const center = new THREE.Vector2(), muzzlePoint = new THREE.Vector3();
  const publish = () => {
    if (disposed) return;
    const state = loadout[hud.weapon];
    onHud({ ...hud, ...vehicles.hud(position), magazine: state.magazine, reserve: state.reserve, reloading: state.reloadRemaining / specs[hud.weapon].reload, aiming: actualAim, hit: hitTime > 0, locked: document.pointerLockElement === canvas, x: position.x, z: position.z });
  };
  const clearInput = () => { keys.clear(); trigger = false; ads = false; touchAim = false; drag = null; };
  function pause() {
    capturePending = false;
    if (hud.phase !== 'playing') return;
    hud.phase = 'paused'; clearInput(); stopVoice();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    publish();
  }
  function initAudio() {
    if (hud.muted) return;
    try {
      if (!audio) {
        audio = new AudioContext();
        motor = audio.createOscillator(); motor.type = 'triangle'; motorGain = audio.createGain(); motorGain.gain.value = 0; motor.connect(motorGain).connect(audio.destination); motor.start();
        soundBuffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.07), audio.sampleRate);
        const samples = soundBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples.length * 0.16));
      }
      void audio.resume().catch(() => {});
    } catch { hud.muted = true; }
  }
  function shotSound() {
    if (!audio || !soundBuffer || hud.muted || audio.state !== 'running') return;
    const sound = audio.createBufferSource(), gain = audio.createGain(), filter = audio.createBiquadFilter();
    sound.buffer = soundBuffer; filter.type = 'lowpass'; filter.frequency.value = hud.weapon ? 1100 : 1800; gain.gain.value = 0.16;
    sound.connect(filter).connect(gain).connect(audio.destination); sound.start();
    sound.onended = () => { sound.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  let speaking = false;
  function stopVoice() { if (speaking && 'speechSynthesis' in window) { speechSynthesis.cancel(); speaking = false; } }
  function announce(label: string, count: number) {
    if (hud.muted) return;
    if (audio?.state === 'running') {
      const context = audio;
      [0, .09, .18].forEach((offset, i) => {
        const tone = context.createOscillator(), gain = context.createGain(); tone.type = 'triangle';
        tone.frequency.value = 330 + count * 35 + i * 110;
        gain.gain.setValueAtTime(.075, context.currentTime + offset); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + offset + .20);
        tone.connect(gain).connect(context.destination); tone.start(context.currentTime + offset); tone.stop(context.currentTime + offset + .22);
        tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      });
    }
    // Only use an installed local English voice; the visual callout and audio stinger always remain available.
    if ('speechSynthesis' in window) {
      const voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('en'));
      if (voice) { stopVoice(); const utterance = new SpeechSynthesisUtterance(label.toLowerCase()); utterance.voice = voice; utterance.rate = 1.05; utterance.pitch = .75; utterance.volume = .65; speaking = true; utterance.onend = () => { speaking = false; }; speechSynthesis.speak(utterance); }
    }
  }
  function enterPlay() {
    if (disposed || !['ready', 'paused'].includes(hud.phase)) return;
    capturePending = false; hud.phase = 'playing'; hud.message = ''; lastTime = performance.now(); clearInput(); canvas.focus(); initAudio(); publish();
  }
  function captureFailed() {
    if (disposed) return;
    capturePending = false; hud.message = 'Mouse capture was blocked. Click Enter range or Resume exercise to retry. Desktop play requires capture; Escape releases it.'; publish();
  }
  function start() {
    if (disposed || capturePending || !['ready', 'paused'].includes(hud.phase)) return;
    initAudio();
    if (!matchMedia('(pointer: fine)').matches) { enterPlay(); return; }
    if (document.pointerLockElement === canvas) { enterPlay(); return; }
    if (!canvas.requestPointerLock) { captureFailed(); return; }
    capturePending = true;
    // Called directly by the user's Enter/Resume click. Gameplay waits for pointerlockchange.
    try {
      Promise.resolve(canvas.requestPointerLock()).catch(captureFailed);
    } catch { captureFailed(); }
  }
  function reload() {
    if (hud.phase === 'playing') canvas.focus({ preventScroll: true });
    if (hud.phase === 'playing' && !vehicles.active && beginReload(loadout[hud.weapon], hud.weapon, specs)) { ads = false; touchAim = false; publish(); }
  }
  function switchWeapon(index: number) {
    if (hud.phase === 'loading' || hud.phase === 'error' || index === hud.weapon || index < 0 || index >= FPS_WEAPONS.length) return;
    loadout[hud.weapon].reloadRemaining = 0;
    trigger = false; ads = false; touchAim = false; kick = 0;
    hud.weapon = index; weapons.forEach((w, i) => w.visible = i === index);
    if (hud.phase === 'playing') canvas.focus({ preventScroll: true });
    weapons[index]?.getObjectByName(`${FPS_WEAPONS[index].id}__socket_muzzle`)?.add(flash); publish();
  }
  function reset() {
    if (hud.phase === 'loading' || hud.phase === 'error') return;
    capturePending = false; hud.phase = 'ready'; hud.hits = 0; hud.shots = 0; hud.landed = 0; hud.elapsed = 0; hud.message = '';
    hud.health = 100; hud.armor = equipment.armor; hud.incoming = false; hud.hurt = false; hud.earned = 0; hud.earnedXp = 0; hud.lastDamage = 0; hud.callout = ''; hud.chain = 0;
    killChain = { count: 0, lastAt: -Infinity }; calloutTime = 0; stopVoice();
    roundId = crypto.randomUUID(); attackTimer = 3; pendingAttack = null; hurtTime = 0;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    vehicles.reset(); loadout = createLoadout(specs); position = { x: FPS_SPAWN.x, z: FPS_SPAWN.z }; yaw = FPS_SPAWN.yaw; pitch = FPS_SPAWN.pitch;
    vertical = velocityY = kick = bob = hitTime = effectTime = flashTime = 0; clearInput();
    targets.forEach(t => { t.alive = true; t.root.visible = true; t.health = t.maxHealth; t.bar.scale.x = 1; });
    flash.visible = tracer.visible = impact.visible = false; updateCameras(0, false, false); publish();
  }
  function interactVehicle() {
    if (hud.phase !== 'playing') return;
    const change = vehicles.interact(position);
    if (change) {
      clearInput(); actualAim = false; loadout[hud.weapon].reloadRemaining = 0;
      position = { x: change.x, z: change.z }; vertical = velocityY = kick = 0;
      if (change.entered) { yaw = change.yaw; pitch = -.23; }
      else pitch = -.03;
      updateCameras(0, false, false);
    }
    canvas.focus({ preventScroll: true }); publish();
  }
  function jump() { if (hud.phase === 'playing') { canvas.focus({ preventScroll: true }); if (!vehicles.active && vertical === 0 && !keys.has('c')) velocityY = 5.2; } }
  function setInput(key: string, held: boolean) {
    if (hud.phase !== 'playing') return;
    if (key === 'fire') trigger = held && !vehicles.active;
    else if (held) keys.add(key); else keys.delete(key);
  }
  const keyboardKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'c', ' ', 'r', '1', '2', 'e', 'f', 'control', 'escape'];
  const keydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === 'f' && !event.repeat) { event.preventDefault(); options.onFullscreen?.(); return; }
    if (hud.phase !== 'playing' || !keyboardKeys.includes(key)) return;
    event.preventDefault();
    if (key === 'escape') pause();
    else if (key === 'e') { if (!event.repeat) interactVehicle(); }
    else if (key === 'r') reload();
    else if (key === '1' || key === '2') switchWeapon(Number(key) - 1);
    else if (key === ' ') { if (vehicles.active) keys.add(' '); else if (!event.repeat) jump(); }
    else keys.add(key);
  };
  const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const look = (dx: number, dy: number) => {
    if (hud.phase !== 'playing') return;
    const sensitivity = ads || touchAim ? 0.0013 : 0.0023;
    yaw -= dx * sensitivity; pitch = THREE.MathUtils.clamp(pitch - dy * sensitivity, -1.35, 1.35);
  };
  const mousemove = (event: MouseEvent) => { if (document.pointerLockElement === canvas) look(event.movementX, event.movementY); };
  const pointerdown = (event: PointerEvent) => {
    if (hud.phase !== 'playing') return;
    canvas.focus();
    if (document.pointerLockElement === canvas) {
      if (event.button === 0) trigger = true;
      if (event.button === 2) ads = true;
    } else if (!matchMedia('(pointer: fine)').matches) {
      canvas.setPointerCapture(event.pointerId); drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  };
  const pointermove = (event: PointerEvent) => {
    if (document.pointerLockElement === canvas || !drag || event.pointerId !== drag.id) return;
    look(event.clientX - drag.x, event.clientY - drag.y); drag.x = event.clientX; drag.y = event.clientY;
  };
  const pointerup = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') { if (event.button === 0) trigger = false; if (event.button === 2) ads = false; }
    if (drag?.id === event.pointerId) drag = null;
  };
  const releasePointer = () => { trigger = false; ads = false; drag = null; };
  const lockchange = () => {
    const locked = document.pointerLockElement === canvas;
    if (locked && capturePending) enterPlay();
    else if (locked && hud.phase !== 'playing') document.exitPointerLock();
    if (wasLocked && !locked) pause(); wasLocked = locked; publish();
  };
  const lockerror = () => captureFailed();
  const contextmenu = (event: Event) => event.preventDefault();
  const visibility = () => { if (document.hidden) pause(); };
  canvas.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup);
  canvas.addEventListener('pointerdown', pointerdown); canvas.addEventListener('pointermove', pointermove);
  window.addEventListener('pointerup', pointerup); canvas.addEventListener('pointercancel', releasePointer); canvas.addEventListener('lostpointercapture', releasePointer);
  canvas.addEventListener('contextmenu', contextmenu); document.addEventListener('mousemove', mousemove);
  document.addEventListener('pointerlockchange', lockchange); document.addEventListener('pointerlockerror', lockerror);
  window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility);

  function updateCameras(dt: number, moving: boolean, sprinting: boolean) {
    if (vehicles.mounted) {
      actualAim = false; rig.visible = false;
      const v = vehicles.mounted, target = new THREE.Vector3(v.x, v.y + 1.65, v.z);
      const distance = v.kind === 'car' ? 8.5 : 13;
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const wanted = target.clone().addScaledVector(direction, distance); wanted.y = Math.max(.7, wanted.y);
      const offset = wanted.clone().sub(target); chaseRay.set(target, offset.clone().normalize()); chaseRay.near = .2; chaseRay.far = offset.length();
      const obstruction = firstVisibleHit(chaseRay, world.scene.children.filter(o => o !== vehicles.root && o !== tracer && o !== impact));
      camera.position.copy(obstruction ? target.clone().addScaledVector(offset.normalize(), Math.max(.5, obstruction.distance - .4)) : wanted);
      camera.lookAt(target); camera.fov = THREE.MathUtils.damp(camera.fov, 68, 8, dt); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); return;
    }
    const aiming = (ads || touchAim) && !sprinting && loadout[hud.weapon].reloadRemaining === 0;
    actualAim = aiming;
    // An optical overlay supplies a clear sight picture; exported lenses are opaque.
    rig.visible = !aiming;
    const crouching = keys.has('c');
    camera.position.set(position.x, (crouching ? 1.15 : 1.75) + vertical, position.z);
    camera.rotation.set(pitch + kick * 0.22, yaw, 0, 'YXZ');
    camera.fov = THREE.MathUtils.damp(camera.fov, aiming ? specs[hud.weapon].aimFov : sprinting ? 71 : 65, 12, dt);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    viewCamera.fov = THREE.MathUtils.damp(viewCamera.fov, aiming ? 54 : 65, 12, dt); viewCamera.updateProjectionMatrix();
    bob += moving ? dt * (sprinting ? 13 : 8) : 0;
    const sway = moving && !aiming ? Math.sin(bob) * 0.006 : 0;
    rig.position.set(aiming ? 0 : 0.17 + sway, (aiming ? -specs[hud.weapon].sightHeight : -0.40) + Math.abs(sway) - (sprinting ? 0.08 : 0), -0.64 + kick * 0.9);
    const state = loadout[hud.weapon], reloadProgress = state.reloadRemaining > 0 ? 1 - state.reloadRemaining / specs[hud.weapon].reload : 0;
    const reloadPose = Math.sin(reloadProgress * Math.PI);
    rig.rotation.set(kick + (sprinting ? -0.18 : 0) - reloadPose * 0.3, reloadPose * 0.2, reloadPose * -0.25);
    weapons.forEach((weapon, i) => {
      const magazine = weapon.getObjectByName(`${FPS_WEAPONS[i].id}__magazine`);
      if (magazine) magazine.position.y = i === hud.weapon ? -reloadPose * 0.18 : 0;
    });
    viewScene.updateMatrixWorld(true);
  }
  function shoot() {
    if (vehicles.active || !fireWeapon(loadout[hud.weapon], hud.weapon, specs)) return;
    hud.shots++; shotSound();
    world.scene.updateMatrixWorld(true); ray.setFromCamera(center, camera);
    // Effects/viewmodel never obstruct the gameplay ray.
    const hit = firstVisibleHit(ray, world.scene.children.filter(o => o !== tracer && o !== impact));
    if (hit && typeof hit.object.userData.fpsTarget === 'number') {
      const target = targets[hit.object.userData.fpsTarget];
      if (target.alive) {
        hud.landed++; hud.lastDamage = Math.min(target.health, specs[hud.weapon].damage); target.health = Math.max(0, target.health - specs[hud.weapon].damage);
        target.bar.scale.x = target.health / target.maxHealth; hitTime = .20;
        if (target.health === 0) { target.alive = false; target.root.visible = false; hud.hits++;
          const chain = registerElimination(killChain, hud.elapsed); killChain = chain; hud.chain = chain.count;
          hud.callout = chain.label;
          calloutTime = hud.callout ? 2.4 : 0; hud.earnedXp += ELIMINATION_XP;
          options.onElimination?.(`${roundId}:kill:${hud.hits}`);
          if (hud.callout) announce(hud.callout, killChain.count); }
      }
    }
    const end = hit?.point ?? ray.ray.at(180, new THREE.Vector3());
    const muzzle = weapons[hud.weapon].getObjectByName(`${FPS_WEAPONS[hud.weapon].id}__socket_muzzle`);
    if (muzzle) { muzzle.getWorldPosition(muzzlePoint); camera.localToWorld(muzzlePoint); }
    else muzzlePoint.copy(camera.position);
    const attr = tracerGeometry.getAttribute('position'); attr.setXYZ(0, muzzlePoint.x, muzzlePoint.y, muzzlePoint.z); attr.setXYZ(1, end.x, end.y, end.z); attr.needsUpdate = true;
    tracer.visible = true; impactActive = !!hit; impact.visible = impactActive; impact.position.copy(end); effectTime = 0.055;
    kick = Math.min(kick + specs[hud.weapon].recoil, 0.10); flashTime = 0.045; flash.visible = true;
    if (hud.hits === FPS_TARGETS.length) {
      hud.phase = 'complete'; hud.incoming = false; clearInput();
      const reward = { id: roundId, hits: hud.hits, shots: hud.shots, landed: hud.landed, elapsed: hud.elapsed, combat: !!options.combat };
      hud.earned = rewardAmount(reward); hud.earnedXp += completionXp(reward); options.onComplete?.(reward);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
    publish();
  }

  function playerPoint() { return vehicles.mounted ? new THREE.Vector3(position.x, vehicles.mounted.y + 1.65, position.z) : camera.position.clone(); }
  function hasLineOfSight(index: number) {
    const target = targets[index];
    if (!target?.alive) return false;
    target.hitZone.getWorldPosition(attackOrigin);
    const direction = playerPoint().sub(attackOrigin), distance = direction.length();
    if (distance > 65) return false;
    attackRay.set(attackOrigin, direction.normalize()); attackRay.near = .07; attackRay.far = Math.max(.07, distance - .1);
    return !firstVisibleHit(attackRay, world.scene.children.filter(o => o !== target.root && o !== tracer && o !== impact && (!vehicles.active || o !== vehicles.root)));
  }
  function counterFire(dt: number) {
    if (pendingAttack) {
      pendingAttack.remaining -= dt;
      if (pendingAttack.remaining <= 0) {
        const attack = pendingAttack; pendingAttack = null; hud.incoming = false;
        if (hasLineOfSight(attack.target) && playerPoint().distanceTo(attack.aim) < .75) {
          const damage = applyArmorDamage(hud.health, hud.armor, 18, equipment.absorption);
          hud.health = damage.health; hud.armor = damage.armor; hurtTime = .35;
          if (hud.health <= 0) { hud.phase = 'defeated'; clearInput(); if (document.pointerLockElement === canvas) document.exitPointerLock(); }
          publish();
        }
      }
      return;
    }
    attackTimer -= dt;
    if (attackTimer > 0) return;
    attackTimer = 2.2;
    const index = targets.findIndex((_, i) => hasLineOfSight(i));
    if (index >= 0) { pendingAttack = { target: index, remaining: .7, aim: playerPoint() }; hud.incoming = true; publish(); }
  }

  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height); camera.aspect = viewCamera.aspect = width / height;
    camera.updateProjectionMatrix(); viewCamera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const animate = (now: number) => {
    if (disposed) return;
    const realDt = Math.max((now - lastTime) / 1000, 0), dt = Math.min(realDt, 0.05); lastTime = now;
    let moving = false, sprinting = false;
    if (hud.phase === 'playing') {
      calloutTime = Math.max(0, calloutTime - realDt); if (!calloutTime) hud.callout = '';
      hud.elapsed += realDt; loadout.forEach((state, i) => advanceWeapon(state, i, realDt, specs));
      if (vehicles.mounted) {
        yaw += vehicles.step(keys, dt); position = { x: vehicles.mounted.x, z: vehicles.mounted.z };
      } else {
      vehicles.step(keys, dt);
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const side = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      sprinting = keys.has('shift') && forward > 0 && !keys.has('c');
      const speed = keys.has('c') ? 2.1 : sprinting ? 7 : (ads || touchAim) ? 2.5 : 4.2;
      const delta = movementInput(forward, side, yaw, speed * equipment.mobility * specs[hud.weapon].mobility, dt), next = moveInMarina(position, delta.x, delta.z, 0.38, vehicles.footObstacles());
      moving = Math.hypot(next.x - position.x, next.z - position.z) > 0.0001; position = next;
      // Ground-plane jump; map obstacle collision remains active at every height.
      velocityY -= 15 * dt; vertical = Math.max(0, vertical + velocityY * dt); if (vertical === 0) velocityY = 0;
      }
      kick = THREE.MathUtils.damp(kick, 0, 12, dt);
      updateCameras(dt, moving, sprinting);
      if (trigger && !sprinting && !vehicles.active) shoot();
      if (hud.phase === 'playing' && options.combat) counterFire(realDt);
    } else updateCameras(dt, false, false);
    hurtTime = Math.max(0, hurtTime - dt); hud.hurt = hurtTime > 0;
    hitTime = Math.max(0, hitTime - dt); flashTime = Math.max(0, flashTime - dt); effectTime = Math.max(0, effectTime - dt);
    flash.visible = flashTime > 0; tracer.visible = effectTime > 0; impact.visible = effectTime > 0 && impactActive;
    if (motor && motorGain && audio) {
      const active = hud.phase === 'playing' && vehicles.mounted && !hud.muted;
      motorGain.gain.setTargetAtTime(active ? .035 : 0, audio.currentTime, .08);
      motor.frequency.setTargetAtTime(vehicles.active === 'helicopter' ? 54 + Math.sin(hud.elapsed * 24) * 8 : 35 + Math.abs(vehicles.mounted?.speed || 0) * 4, audio.currentTime, .05);
    }
    world.animate(hud.elapsed);
    renderer.clear(); renderer.render(world.scene, camera); renderer.clearDepth(); renderer.render(viewScene, viewCamera);
    if (now - lastReport > 100) { publish(); lastReport = now; }
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);

  const assetIds = ['sar21-inspired', 'ultimax-inspired', 'range-target', 'supply-crate', 'sandbag-wall', 'traffic-cone'];
  void Promise.all(assetIds.map(async id => {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/field-kit/${id}.glb`);
    if (disposed) disposeAssets([gltf.scene]); else templates.push(gltf.scene);
    return gltf.scene;
  })).then(loaded => {
    if (disposed) return;
    weapons.push(loaded[0], loaded[1]); weapons.forEach((w, i) => { undress.push(dressWeapon(w, specs[i])); rig.add(w); w.visible = i === 0; });
    weapons[0].getObjectByName('sar21-inspired__socket_muzzle')?.add(flash);
    FPS_TARGETS.forEach((p, i) => {
      const root = new THREE.Group(); root.position.set(p.x, 0.13, p.z);
      root.rotation.y = Math.atan2(FPS_SPAWN.x - p.x, FPS_SPAWN.z - p.z);
      root.add(loaded[2].clone(true));
      const hitZone = new THREE.Mesh(targetGeometry, targetMaterial); hitZone.position.set(0, 1.3, 0.026); hitZone.userData.fpsTarget = i; root.add(hitZone);
      const maxHealth = i % 2 ? 115 : 100;
      const bar = new THREE.Mesh(healthGeometry, healthMaterial); bar.position.set(0, 1.91, .04); root.add(bar);
      world.scene.add(root); targets.push({ root, hitZone, alive: true, health: maxHealth, maxHealth, bar });
      world.obstacles.push({ minX: p.x - 0.42, maxX: p.x + 0.42, minZ: p.z - 0.42, maxZ: p.z + 0.42 });
    });
    for (const [asset, x, z, width, depth] of [[3, -48, 71, .77, .52], [4, -40, 63, 1.87, .41], [4, -52, 64, 1.87, .41], [5, -45, 72, .37, .37], [5, -43, 72, .37, .37]]) {
      const prop = loaded[asset].clone(true); prop.position.set(x, 0.14, z); decorations.add(prop);
      world.obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
    }
    hud.phase = 'ready'; updateCameras(0, false, false); publish();
  }).catch(() => {
    if (!disposed) { hud.phase = 'error'; hud.message = 'The range assets could not load. Retry to load the local models.'; publish(); }
  });

  return {
    start, pause, reset, reload, switchWeapon, jump, setInput, interactVehicle,
    toggleAim() { if (hud.phase === 'playing' && !vehicles.active) { touchAim = !touchAim; canvas.focus({ preventScroll: true }); publish(); } },
    toggleSound() { hud.muted = !hud.muted; if (hud.muted) stopVoice(); if (hud.phase === 'playing') { canvas.focus({ preventScroll: true }); if (!hud.muted) initAudio(); } publish(); },
    dispose() {
      disposed = true; stopVoice(); cancelAnimationFrame(frame); observer.disconnect(); clearInput();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      canvas.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('pointerdown', pointerdown); canvas.removeEventListener('pointermove', pointermove);
      window.removeEventListener('pointerup', pointerup); canvas.removeEventListener('pointercancel', releasePointer); canvas.removeEventListener('lostpointercapture', releasePointer);
      canvas.removeEventListener('contextmenu', contextmenu); document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('pointerlockchange', lockchange); document.removeEventListener('pointerlockerror', lockerror);
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility);
      void audio?.close().catch(() => {}); vehicles.dispose(); undress.forEach(fn => fn()); disposeAssets(templates); world.dispose();
      healthGeometry.dispose(); healthMaterial.dispose();
      targetGeometry.dispose(); targetMaterial.dispose(); flashGeometry.dispose(); flashMaterial.dispose(); tracerGeometry.dispose(); tracerMaterial.dispose(); impactGeometry.dispose(); impactMaterial.dispose();
      renderer.dispose(); canvas.remove();
    },
  };
}
export type FpsEngine = ReturnType<typeof createFpsEngine>;
