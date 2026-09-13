import * as THREE from 'three';
import { requestFpsPointerLock, requiresFpsPointerLock, turnFpsLook } from './fps-pointer';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { advanceWeapon, beginReload, createLoadout, fireWeapon, FPS_SPAWN, FPS_WEAPONS, movementInput, type WeaponState } from './fps-rules';
import { firstVisibleHit } from './fps-raycast';
import { applyArmorDamage, createProfile, resolveLoadout, rewardAmount, completionXp, type ResolvedLoadout, type ExerciseReward, type ArmoryProfile } from './armory-state';
import { registerElimination, ELIMINATION_XP, type KillChain } from './progression';
import { createFpsVehicles } from './fps-vehicles';
import type { MinimapMarker } from './minimap';
import type { VehicleKind } from './vehicle-rules';
import { dressWeapon } from './armory-visuals';
import { createArenaRuntime } from './arena-runtime';
import type { ArenaActor, ArenaEnvironment, ArenaSnapshot, ArenaVitals } from './arena-rules';
import { createSoloSession, type LanSession } from './lan-peer';
import { buildDistrictWorld } from './district-world';
import { getFpsDistrict } from './fps-districts';
import { createExpeditionMarkers } from './expedition-visuals';
import { findWorldGateway, resolveWorldTransition, getWorldZone, type WorldZoneId, type WorldTransition, type ZoneSpawn } from './world-zones';
import type { ExpeditionLoot, FieldLoot } from './expedition-loot';
import { itemById } from './armory-catalog';
import { DEFAULT_FPS_DEBUG, FPS_REGEN_DELAY, normalizeFpsDebug, readFpsDebug, regenerateHealth, saveFpsDebug, type FpsDebugSettings } from './fps-debug';
import { createWeaponHandling } from './fps-viewmodel';
import { createScopeRenderer, getWeaponSight } from './weapon-optics';
import { reloadMotion, reloadStage, smoothStep } from './fps-weapon-motion';
import { createFpsComms, type CommsEntry } from './fps-comms';
import { createEncikRadio, type EncikCallout, type EncikEvent } from './fps-callouts';
import { createEncikAudio } from './encik-audio';
import { encikRecordingUrl } from './encik-recordings';
import { createPlayerPilot, normalizePilotAction, PILOT_INTERVAL, type PilotObservation, type PilotGoal, type PlayerPilot } from './fps-pilot';
import { visiblePilotContacts, type PilotSubject } from './fps-pilot-perception';
import { createStrategyPlanner, llmPilotStrategy } from './pilot-strategy';
import { findWorldRoute } from './world-zones';
import { advanceBloom, createWeaponBloom, recordBloomShot, sampleShotSpread, weaponSpread } from './fps-accuracy';

export interface FpsArenaOptions { session: LanSession; botCount: number; composition?: string; profile: ArmoryProfile; environment?: ArenaEnvironment; initialVitals?: Partial<ArenaVitals> }
export interface FpsCheckpoint { health: number; armor: number; weapon: number; ammunition: WeaponState[]; pilot?: boolean; pilotStrategy?: 'local' | 'llm'; encikVoice?: boolean; comms?: readonly CommsEntry[] }
export interface FpsExpeditionOptions {
  zone: WorldZoneId; spawn?: ZoneSpawn; checkpoint?: FpsCheckpoint; profile: ArmoryProfile; loot: ExpeditionLoot;
  onTravel: (transition: WorldTransition, checkpoint: FpsCheckpoint) => void; onEquipment: (profile: ArmoryProfile) => void;
}
const randomRoundId = () => globalThis.crypto?.randomUUID?.() ?? `round-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export interface FpsHud {
  encikCallout: EncikCallout | null; encikVoice: boolean; comms: readonly CommsEntry[];
  pilotStrategy: 'local' | 'llm'; pilotPlan: string;
  pilotEnabled: boolean; pilotStatus: string; pilotGoal: PilotGoal | null; pilotContacts: number;
  debug: FpsDebugSettings; debugAvailable: boolean; maxHealth: number;
  aimProgress: number; reloadEmpty: boolean;
  crosshairSpread: number; hitKind: 'hit' | 'kill';
  phase: 'loading' | 'ready' | 'playing' | 'paused' | 'complete' | 'defeated' | 'error';
  weapon: number; magazine: number; reserve: number; reloading: number;
  hits: number; shots: number; landed: number; health: number; armor: number; incoming: boolean; hurt: boolean; lastDamage: number; earned: number; earnedXp: number; callout: string; chain: number; elapsed: number; aiming: boolean; hit: boolean;
  vehicle: VehicleKind | 'on-foot'; vehicleSpeed: number; altitude: number; interact: string; vehicleNotice: string; carDistance: number; helicopterDistance: number;
  locked: boolean; message: string; muted: boolean; x: number; z: number; yaw: number; mapMarkers: MinimapMarker[];
  arena: ArenaSnapshot | null; arenaSelf: ArenaActor | null; arenaConnected: boolean; arenaStarted: boolean;
  expeditionZone: WorldZoneId | null; lootPrompt: string; travelPrompt: string; lootNotice: string; fieldLoot: FieldLoot[];
}
export const initialFpsHud: FpsHud = { encikCallout: null, encikVoice: true, comms: [], pilotStrategy: 'local', pilotPlan: 'Local utility planner', pilotEnabled: false, pilotStatus: 'Player controls', pilotGoal: null, pilotContacts: 0, crosshairSpread: 6, hitKind: 'hit', aimProgress: 0, reloadEmpty: false, debug: { ...DEFAULT_FPS_DEBUG }, debugAvailable: true, maxHealth: 100, phase: 'loading', weapon: 0, magazine: 30, reserve: 120, reloading: 0, hits: 0, shots: 0, landed: 0, health: 100, armor: 0, incoming: false, hurt: false, lastDamage: 0, earned: 0, earnedXp: 0, callout: '', chain: 0, elapsed: 0, aiming: false, hit: false, vehicle: 'on-foot', vehicleSpeed: 0, altitude: 0, interact: '', vehicleNotice: '', carDistance: 0, helicopterDistance: 0, locked: false, message: '', muted: false, x: FPS_SPAWN.x, z: FPS_SPAWN.z, yaw: FPS_SPAWN.yaw, mapMarkers: [], arena: null, arenaSelf: null, arenaConnected: true, arenaStarted: false, expeditionZone: null, lootPrompt: '', travelPrompt: '', lootNotice: '', fieldLoot: [] };

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

export function createFpsEngine(host: HTMLDivElement, onHud: (hud: FpsHud) => void, options: { region?: WorldZoneId; playerPilot?: PlayerPilot; loadout?: ResolvedLoadout; combat?: boolean; arena?: FpsArenaOptions; expedition?: FpsExpeditionOptions; onComplete?: (reward: ExerciseReward) => void; onElimination?: (id: string) => void; onFullscreen?: () => void } = {}) {
  const expedition = options.expedition;
  const region = expedition?.zone ?? options.region ?? 'marina-bay';
  const district = getFpsDistrict(region), spawn = district.spawn, targetPositions = district.targets;
  const copyProfile = (profile: ArmoryProfile): ArmoryProfile => JSON.parse(JSON.stringify(profile));
  let fieldProfile = copyProfile(expedition?.profile ?? options.arena?.profile ?? createProfile());
  let equipment = expedition ? resolveLoadout(fieldProfile) : options.loadout || resolveLoadout(createProfile()), specs = equipment.weapons;
  const undress: (() => void)[] = [];
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  // Shadow-map rendering doubles work on this VM; the existing map still supplies its lighting.
  renderer.shadowMap.enabled = false; renderer.autoClear = false;
  const canvas = renderer.domElement; canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${expedition ? getWorldZone(expedition.zone).name + ' expedition' : district.label + ' range'}. WASD to move, mouse to look, click to fire.`);
  host.append(canvas);
  const zoneWorld = buildDistrictWorld(region, expedition?.spawn);
  const world = zoneWorld; world.stamps.forEach(o => o.visible = false);
  const footMove = zoneWorld.move;
  const expeditionSession = expedition ? createSoloSession('Explorer') : null;
  if (expedition && zoneWorld && expeditionSession) options = { ...options, arena: { session: expeditionSession, profile: fieldProfile, botCount: zoneWorld.zone.botCount, composition: zoneWorld.zone.composition, environment: zoneWorld.environment, initialVitals: expedition.checkpoint } };
  const vehicles = createFpsVehicles(world.scene, world.obstacles, equipment.vehicleSkins, { spawns: district.vehicles, bounds: world.bounds, deriveFlightObstacles: region !== 'marina-bay' });
  if (options.arena) vehicles.root.visible = false;
  let arenaRuntime: ReturnType<typeof createArenaRuntime> | null = null;
  const chaseRay = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.08, 800); camera.rotation.order = 'YXZ';
  const viewScene = new THREE.Scene(), viewCamera = new THREE.PerspectiveCamera(65, 1, 0.01, 3);
  viewScene.add(new THREE.HemisphereLight('#e4efff', '#576350', 2.1));
  const weaponLight = new THREE.DirectionalLight('#fff4dd', 2.5); weaponLight.position.set(1, 2, 1); viewScene.add(weaponLight);
  const scopeRenderer = createScopeRenderer(renderer);
  const rig = new THREE.Group(); viewScene.add(rig);
  const loader = new GLTFLoader(), templates: THREE.Group[] = [], weapons: THREE.Group[] = [];
  const handling: ReturnType<typeof createWeaponHandling>[] = [], emptyReload = [false, false];
  let aimProgress = 0, lastReloadStage = '';
  const bloom = [createWeaponBloom(), createWeaponBloom()];
  let spreadAngle = .005;
  const shotRight = new THREE.Vector3(), shotUp = new THREE.Vector3();
  const targets: { root: THREE.Group; hitZone: THREE.Mesh; alive: boolean; health: number; maxHealth: number; bar: THREE.Mesh }[] = [];
  const decorations = new THREE.Group(); world.scene.add(decorations);
  const targetGeometry = new THREE.CircleGeometry(0.265, 32);
  const targetMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  const flashGeometry = new THREE.SphereGeometry(0.028, 8, 6);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: '#ffd382', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial); flash.scale.set(1, 1, 2.6); flash.visible = false;
  const tracerGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracerMaterial = new THREE.LineBasicMaterial({ color: '#ffe8b0', transparent: true, opacity: 0.6 });
  const tracer = new THREE.Line(tracerGeometry, tracerMaterial); tracer.frustumCulled = false; tracer.visible = false; tracer.userData.fpsEffect = true; world.scene.add(tracer);
  const impactGeometry = new THREE.SphereGeometry(0.05, 8, 6), impactMaterial = new THREE.MeshBasicMaterial({ color: '#f3ae59' });
  const impact = new THREE.Mesh(impactGeometry, impactMaterial); impact.visible = false; impact.userData.fpsEffect = true; world.scene.add(impact);
  const debugAvailable = !options.arena || options.arena.session.role === 'solo';
  let debug = debugAvailable ? readFpsDebug() : { ...DEFAULT_FPS_DEBUG }, recoveryDelay = 0;
  const keys = new Set<string>(); const hud: FpsHud = { ...initialFpsHud, debug, debugAvailable, health: 100 * debug.healthMultiplier, maxHealth: 100 * debug.healthMultiplier, armor: equipment.armor, expeditionZone: expedition?.zone ?? null };
  if (expedition && zoneWorld) hud.fieldLoot = expedition.loot.enterZone({ id: expedition.zone, spawn: zoneWorld.zone.spawn, bounds: zoneWorld.bounds, obstacles: world.obstacles, anchors: zoneWorld.zone.encounterSpawns });
  const markers = expedition ? createExpeditionMarkers(world.scene, expedition.zone, hud.fieldLoot) : null;
  let checkpointPending = expedition?.checkpoint;
  let travelPending = false, lootNoticeTime = 0;
  const encik = createEncikRadio(), comms = createFpsComms(expedition?.checkpoint?.comms);
  hud.encikVoice = expedition?.checkpoint?.encikVoice ?? true;
  let killChain: KillChain = { count: 0, lastAt: -Infinity }, calloutTime = 0;
  let roundId = randomRoundId(), attackTimer = 3, hurtTime = 0;
  let pendingAttack: { target: number; remaining: number; aim: THREE.Vector3 } | null = null;
  const attackRay = new THREE.Raycaster(), attackOrigin = new THREE.Vector3();
  const healthGeometry = new THREE.PlaneGeometry(.54, .055), healthMaterial = new THREE.MeshBasicMaterial({ color: "#e1a74e", side: THREE.DoubleSide });
  let disposed = false, loadout = createLoadout(specs), position = { x: spawn.x, z: spawn.z };
  let yaw: number = spawn.yaw, pitch: number = spawn.pitch, vertical = 0, velocityY = 0;
  let trigger = false, ads = false, touchAim = false, actualAim = false, kick = 0, bob = 0, flashTime = 0, hitTime = 0, effectTime = 0, impactActive = false;
  let strategyMode: 'local' | 'llm' = expedition?.checkpoint?.pilotStrategy ?? 'local';
  let strategicPlanner = strategyMode === 'llm' ? createStrategyPlanner(llmPilotStrategy()) : null;
  let pilot = options.playerPilot ?? createPlayerPilot(strategicPlanner ?? undefined);
  hud.pilotStrategy = strategyMode;
  let pilotEnabled = false, nextPilotAt = 0, pilotDestination: WorldZoneId | undefined;
  let lastPilotObservation: PilotObservation | null = null;
  let capturePending = false, capturePromisePending = false;
  let lastPointerType = 'mouse', inputMode: 'mouse' | 'touch' = 'mouse';
  let lastTime = performance.now(), frame = 0, lastReport = 0, wasLocked = false;
  let drag: { id: number; x: number; y: number } | null = null;
  let motor: OscillatorNode | null = null, motorGain: GainNode | null = null;
  let audio: AudioContext | null = null, soundBuffer: AudioBuffer | null = null;
  const ray = new THREE.Raycaster(); ray.far = 250;
  const center = new THREE.Vector2(), muzzlePoint = new THREE.Vector3();
  const publish = () => {
    if (disposed) return;
    const state = loadout[hud.weapon];
    onHud({ ...hud, comms: comms.snapshot(), pilotEnabled, aimProgress, reloadEmpty: emptyReload[hud.weapon], ...(!options.arena ? vehicles.hud(position) : {}), magazine: state.magazine, reserve: state.reserve, reloading: state.reloadRemaining / specs[hud.weapon].reload, aiming: actualAim, hit: hitTime > 0, locked: document.pointerLockElement === canvas, x: position.x, z: position.z, yaw,
      mapMarkers: options.arena ? [] : [
        ...targetPositions.flatMap((point, index): MinimapMarker[] => targets[index]?.alive ? [{ ...point, id: `target-${index}`, kind: 'target', label: `Target ${index + 1}` }] : []),
        ...(['car', 'helicopter'] as const).filter(kind => kind !== vehicles.active).map((kind): MinimapMarker => ({ id: kind, kind, label: kind === 'car' ? 'Utility 01' : 'Falcon 01', x: vehicles.states[kind].x, z: vehicles.states[kind].z })),
      ],
    });
  };
  const clearInput = () => { keys.clear(); trigger = false; ads = false; touchAim = false; drag = null; };
  function configureDebug(value: FpsDebugSettings) {
    if (!debugAvailable || disposed) return;
    const fraction = hud.health / hud.maxHealth;
    debug = normalizeFpsDebug(value); saveFpsDebug(debug);
    hud.debug = debug; hud.maxHealth = 100 * debug.healthMultiplier; hud.health = hud.maxHealth * fraction;
    arenaRuntime?.setHealthMultiplier(debug.healthMultiplier); publish();
  }
  function refillHealth() {
    if (!debugAvailable || disposed || hud.health <= 0) return;
    hud.health = hud.maxHealth; arenaRuntime?.setVitals({ health: hud.health }); recoveryDelay = 0; publish();
  }
  function pause() {
    pilotEnabled = false; pilot.reset(); strategicPlanner?.reset(); hud.pilotStatus = 'Player controls'; hud.pilotGoal = null; hud.pilotContacts = 0;
    capturePending = false;
    if (hud.phase !== 'playing') return;
    hud.phase = 'paused'; clearInput(); stopVoice(); encik.clear(); hud.encikCallout = null;
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
  function handlingSound(stage: string) {
    if (!audio || !soundBuffer || hud.muted || audio.state !== 'running') return;
    const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    source.buffer = soundBuffer; source.playbackRate.value = stage === 'MAG IN' ? .65 : 1.4;
    filter.type = 'bandpass'; filter.frequency.value = stage === 'CHAMBER' ? 2300 : 1000; filter.Q.value = .7;
    gain.gain.value = stage === 'MAG IN' ? .16 : .09;
    source.connect(filter).connect(gain).connect(audio.destination); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  const encikAudio = createEncikAudio(() => audio);
  function stopVoice() { encikAudio.stop(); }
  function radioCall(event: EncikEvent) {
    if (disposed || !['playing', 'complete', 'defeated'].includes(hud.phase)) return;
    const line = encik.emit(event, performance.now() / 1000); if (!line) return;
    hud.encikCallout = line;
    comms.add('radio', pilotEnabled ? 'Encik · AI' : 'Encik', line.text);
    if (hud.muted || !hud.encikVoice) return;
    const recording = encikRecordingUrl(line);
    // Bundled recordings need no TTS service during gameplay. Captions survive audio failures.
    if (recording) void encikAudio.play(recording);
  }
  function announce(_label: string, count: number) {
    radioCall(count >= 4 ? 'multi' : count === 3 ? 'triple' : count === 2 ? 'double' : 'kill');
    if (hud.muted || audio?.state !== 'running') return;
    const context = audio;
    [0, .09, .18].forEach((offset, i) => {
      const tone = context.createOscillator(), gain = context.createGain(); tone.type = 'triangle';
      tone.frequency.value = 330 + count * 35 + i * 110;
      gain.gain.setValueAtTime(.075, context.currentTime + offset); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + offset + .20);
      tone.connect(gain).connect(context.destination); tone.start(context.currentTime + offset); tone.stop(context.currentTime + offset + .22);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    });
  }
  function enterPlay() {
    if (disposed || !['ready', 'paused'].includes(hud.phase)) return;
    if (!pilotEnabled && inputMode === 'mouse' && document.pointerLockElement !== canvas) { captureFailed(); return; }
    capturePending = false; hud.phase = 'playing'; hud.message = ''; lastTime = performance.now(); clearInput(); canvas.focus(); initAudio(); radioCall('start'); publish();
  }
  function captureFailed() {
    if (disposed) return;
    capturePending = false; hud.message = 'Mouse capture was blocked. Click the Enter or Resume button to retry. Mouse play requires capture; Escape releases it.'; publish();
  }
  function start() {
    if (disposed || capturePending || !['ready', 'paused'].includes(hud.phase)) return;
    initAudio();
    inputMode = requiresFpsPointerLock(lastPointerType) ? 'mouse' : 'touch';
    if (inputMode === 'touch') { enterPlay(); return; }
    if (document.pointerLockElement === canvas) { enterPlay(); return; }
    if (!canvas.requestPointerLock) { captureFailed(); return; }
    capturePending = true;
    // Called directly by the user's Enter/Resume click. Gameplay waits for pointerlockchange.
    try {
      capturePromisePending = true;
      void requestFpsPointerLock(canvas, () => capturePending && !disposed)
        .catch(captureFailed).finally(() => { capturePromisePending = false; });
    } catch { captureFailed(); }
  }
  function reload() {
    if (hud.phase === 'playing') canvas.focus({ preventScroll: true });
    if (hud.phase === 'playing' && (!options.arena || hud.arenaSelf?.alive) && !vehicles.active && beginReload(loadout[hud.weapon], hud.weapon, specs)) {
      emptyReload[hud.weapon] = loadout[hud.weapon].magazine === 0;
      radioCall('reload');
      arenaRuntime?.reload(hud.weapon); ads = false; touchAim = false; actualAim = false; lastReloadStage = ''; publish();
    }
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
    if (options.arena?.session.role === 'guest') return;
    pilotEnabled = false; pilot.reset(); strategicPlanner?.reset();
    arenaRuntime?.reset();
    capturePending = false; hud.phase = 'ready'; hud.hits = 0; hud.shots = 0; hud.landed = 0; hud.elapsed = 0; hud.message = '';
    hud.health = hud.maxHealth; hud.armor = equipment.armor; hud.incoming = false; hud.hurt = false; hud.earned = 0; hud.earnedXp = 0; hud.lastDamage = 0; hud.callout = ''; hud.chain = 0;
    killChain = { count: 0, lastAt: -Infinity }; calloutTime = 0; stopVoice(); encik.reset(); comms.clear(); hud.encikCallout = null;
    roundId = randomRoundId(); attackTimer = 3; pendingAttack = null; hurtTime = 0;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    vehicles.reset(); loadout = createLoadout(specs); position = { x: spawn.x, z: spawn.z }; yaw = spawn.yaw; pitch = spawn.pitch;
    vertical = velocityY = kick = bob = hitTime = effectTime = flashTime = 0; clearInput();
    aimProgress = 0; bloom.forEach(state => { state.amount = 0; state.delay = 0; });
    targets.forEach(t => { t.alive = true; t.root.visible = true; t.health = t.maxHealth; t.bar.scale.x = 1; });
    flash.visible = tracer.visible = impact.visible = false; updateCameras(0, false, false); publish();
  }
  function interactVehicle() {
    if (hud.phase !== 'playing' || options.arena) return;
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
  function updateExpeditionPrompts() {
    if (!expedition) return;
    const alive = !!hud.arenaSelf?.alive;
    const nearest = alive ? expedition.loot.nearest(expedition.zone, position) : null;
    const gateway = alive ? findWorldGateway(expedition.zone, position) : null;
    hud.lootPrompt = nearest ? `E · ${nearest.tier} ${nearest.name}` : '';
    hud.travelPrompt = gateway ? `T · Travel to ${getWorldZone(gateway.to).name}` : '';
  }
  function interactLoot() {
    if (!expedition || hud.phase !== 'playing' || !hud.arenaSelf?.alive || vehicles.active || !arenaRuntime || travelPending) return;
    const nearest = expedition.loot.nearest(expedition.zone, position); if (!nearest) return;
    if (nearest.kind === 'medical' && hud.health >= hud.maxHealth) { hud.lootNotice = 'Health is full. Medical supplies remain here.'; lootNoticeTime = 3; publish(); return; }
    if (nearest.kind === 'ammo' && loadout[hud.weapon].reserve >= 999) { hud.lootNotice = 'Ammunition reserve is full.'; lootNoticeTime = 3; publish(); return; }
    const item = nearest.catalogId ? itemById(nearest.catalogId) : undefined;
    if ((nearest.kind === 'weapon' && (!item || item.category !== 'weapon' || (item.family !== 0 && item.family !== 1))) || (nearest.kind === 'armor' && item?.category !== 'plate')) return;
    const collected = expedition.loot.collect(expedition.zone, nearest.id, position); if (!collected) return;
    if (collected.kind === 'weapon' && item && (item.family === 0 || item.family === 1)) {
      const family = item.family, changed = fieldProfile.guns[family].variant !== item.id;
      const next = copyProfile(fieldProfile); next.owned = [...new Set([...next.owned, item.id])]; next.guns[family].variant = item.id;
      fieldProfile = next; equipment = resolveLoadout(fieldProfile); specs = equipment.weapons;
      if (changed) loadout[family] = createLoadout(specs)[family];
      else loadout[family].reserve = Math.min(999, loadout[family].reserve + specs[family].reserve);
      arenaRuntime.updateLoadout(fieldProfile);
      undress.splice(0).forEach(dispose => dispose()); weapons.forEach((model, index) => undress.push(dressWeapon(model, specs[index])));
      switchWeapon(family); expedition.onEquipment(copyProfile(fieldProfile));
      hud.lootNotice = `${item.name} equipped for this expedition.`;
    } else if (collected.kind === 'armor' && item) {
      const next = copyProfile(fieldProfile); next.owned = [...new Set([...next.owned, item.id])]; next.plate = item.id;
      fieldProfile = next; equipment = resolveLoadout(fieldProfile); specs = equipment.weapons;
      arenaRuntime.updateLoadout(fieldProfile); arenaRuntime.setVitals({ armor: equipment.armor }); hud.armor = equipment.armor;
      expedition.onEquipment(copyProfile(fieldProfile)); hud.lootNotice = `${item.name} equipped · ${Math.round(equipment.armor)} armor.`;
    } else if (collected.kind === 'ammo') {
      const before = loadout[hud.weapon].reserve; loadout[hud.weapon].reserve = Math.min(999, before + collected.amount);
      hud.lootNotice = `+${loadout[hud.weapon].reserve - before} rounds for ${specs[hud.weapon].name}.`;
    } else if (collected.kind === 'medical') {
      const before = hud.health; hud.health = Math.min(hud.maxHealth, hud.health + collected.amount); arenaRuntime.setVitals({ health: hud.health });
      hud.lootNotice = `Recovered ${Math.round(hud.health - before)} health.`;
    }
    comms.add('system', 'Supplies', hud.lootNotice); radioCall('pickup');
    markers?.remove(collected.id); hud.fieldLoot = expedition.loot.remaining(expedition.zone); lootNoticeTime = 4;
    updateExpeditionPrompts(); canvas.focus({ preventScroll: true }); publish();
  }
  function travelZone() {
    if (!expedition || travelPending || hud.phase !== 'playing' || !hud.arenaSelf?.alive || vehicles.active) return;
    const gateway = findWorldGateway(expedition.zone, position); if (!gateway) return;
    const transition = resolveWorldTransition(expedition.zone, gateway.id, position); if (!transition) return;
    comms.add('system', 'Travel', `Moving to ${getWorldZone(transition.to).name}.`);
    const checkpoint: FpsCheckpoint = { comms: comms.snapshot(), pilot: pilotEnabled, pilotStrategy: strategyMode, encikVoice: hud.encikVoice, health: hud.health, armor: hud.armor, weapon: hud.weapon, ammunition: loadout.map(state => ({ ...state, cooldown: 0, reloadRemaining: 0 })) };
    travelPending = true; pause(); expedition.onTravel(transition, checkpoint);
  }
  function jump() { if (hud.phase === 'playing' && (!options.arena || hud.arenaSelf?.alive)) { canvas.focus({ preventScroll: true }); if (!vehicles.active && vertical === 0 && !keys.has('c')) velocityY = 5.2; } }
  function setInput(key: string, held: boolean) {
    if (hud.phase !== 'playing' || (options.arena && !hud.arenaSelf?.alive)) return;
    if (key === 'fire') trigger = held && !vehicles.active;
    else if (held) keys.add(key); else keys.delete(key);
  }
  function toggleAim() {
    if (pilotEnabled || hud.phase !== 'playing' || vehicles.active || hud.arenaSelf?.alive === false || loadout[hud.weapon].reloadRemaining > 0) return;
    touchAim = !touchAim; canvas.focus({ preventScroll: true }); publish();
  }
  const keyboardKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'c', ' ', 'r', 'q', '1', '2', 'e', 't', 'f', 'control', 'escape'];
  const keydown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === 'f' && !event.repeat) { event.preventDefault(); options.onFullscreen?.(); return; }
    if (hud.phase !== 'playing' || !keyboardKeys.includes(key)) return;
    event.preventDefault();
    if (key === 'q') { if (!event.repeat) toggleAim(); return; }
    if (key === 'escape') pause();
    else if (pilotEnabled) { pause(); hud.message = 'AI stopped. Click Resume to take control.'; publish(); }
    else if (key === 'e') { if (!event.repeat) expedition ? interactLoot() : interactVehicle(); }
    else if (key === 't') { if (!event.repeat) travelZone(); }
    else if (key === 'r') reload();
    else if (key === '1' || key === '2') switchWeapon(Number(key) - 1);
    else if (key === ' ') { if (vehicles.active) keys.add(' '); else if (!event.repeat) jump(); }
    else keys.add(key);
  };
  const pilotEscape = (event: KeyboardEvent) => { if (pilotEnabled && event.key === 'Escape') { event.preventDefault(); pause(); } };
  const keyup = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const pointerSource = (event: PointerEvent) => {
    lastPointerType = event.pointerType;
    if (hud.phase === 'playing' && inputMode === 'touch' && requiresFpsPointerLock(event.pointerType)) {
      inputMode = 'mouse'; pause();
      hud.message = 'Mouse detected. Click Resume to capture it; Escape opens the menu.'; publish();
    }
  };
  const look = (dx: number, dy: number) => {
    if (hud.phase !== 'playing') return;
    ({ yaw, pitch } = turnFpsLook(yaw, pitch, dx, dy, ads || touchAim));
  };
  const mousemove = (event: MouseEvent) => { if (!pilotEnabled && document.pointerLockElement === canvas) look(event.movementX, event.movementY); };
  // Pointer events only report the first press and final release of a mouse chord.
  // Mouse events report each button independently, including LMB while RMB is held.
  const mousedown = (event: MouseEvent) => {
    if (pilotEnabled || hud.phase !== 'playing' || document.pointerLockElement !== canvas) return;
    if (event.button === 0) trigger = true;
    if (event.button === 2) ads = true;
  };
  const mouseup = (event: MouseEvent) => {
    if (pilotEnabled || document.pointerLockElement !== canvas) return;
    if (event.button === 0) trigger = false;
    if (event.button === 2) ads = false;
  };
  const pointerdown = (event: PointerEvent) => {
    if (pilotEnabled) return;
    if (hud.phase !== 'playing') return;
    canvas.focus();
    if (document.pointerLockElement === canvas) return;
    if (inputMode === 'touch' && !requiresFpsPointerLock(event.pointerType)) {
      canvas.setPointerCapture(event.pointerId); drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else {
      pause();
    }
  };
  const pointermove = (event: PointerEvent) => {
    if (document.pointerLockElement === canvas || !drag || event.pointerId !== drag.id) return;
    look(event.clientX - drag.x, event.clientY - drag.y); drag.x = event.clientX; drag.y = event.clientY;
  };
  const pointerup = (event: PointerEvent) => {
    if (drag?.id === event.pointerId) drag = null;
  };
  const releasePointer = () => { trigger = false; ads = false; drag = null; };
  const lockchange = () => {
    const locked = document.pointerLockElement === canvas;
    if (locked && capturePending) enterPlay();
    else if (locked && hud.phase !== 'playing') document.exitPointerLock();
    if (!locked && !pilotEnabled && hud.phase === 'playing' && (wasLocked || inputMode === 'mouse')) pause(); wasLocked = locked; publish();
  };
  const lockerror = () => { if (!capturePromisePending) captureFailed(); };
  const contextmenu = (event: Event) => event.preventDefault();
  const visibility = () => { if (document.hidden) pause(); };
  window.addEventListener('keydown', pilotEscape, true);
  canvas.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup);
  window.addEventListener('pointerdown', pointerSource, true); window.addEventListener('pointermove', pointerSource, true);
  canvas.addEventListener('pointerdown', pointerdown); canvas.addEventListener('pointermove', pointermove);
  window.addEventListener('pointerup', pointerup); canvas.addEventListener('pointercancel', releasePointer); canvas.addEventListener('lostpointercapture', releasePointer);
  canvas.addEventListener('contextmenu', contextmenu); document.addEventListener('mousemove', mousemove);
  canvas.addEventListener('mousedown', mousedown); window.addEventListener('mouseup', mouseup);
  document.addEventListener('pointerlockchange', lockchange); document.addEventListener('pointerlockerror', lockerror);
  window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility);

  function startPilot() {
    if (disposed || !['ready', 'paused', 'playing'].includes(hud.phase) || vehicles.active) return;
    capturePending = false; pilot.reset(); strategicPlanner?.reset(); clearInput(); pilotEnabled = true; nextPilotAt = 0;
    hud.pilotStatus = 'Observing'; hud.message = '';
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    if (hud.phase !== 'playing') enterPlay();
    publish();
  }
  function setPilotStrategy(mode: 'local' | 'llm') {
    if (disposed || !['local', 'llm'].includes(mode) || mode === strategyMode) return;
    pilot.reset(); strategicPlanner?.reset(); clearInput();
    strategyMode = mode; strategicPlanner = mode === 'llm' ? createStrategyPlanner(llmPilotStrategy()) : null;
    pilot = createPlayerPilot(strategicPlanner ?? undefined);
    hud.pilotStrategy = mode; hud.pilotPlan = mode === 'llm' ? 'Waiting for the strategist' : 'Local utility planner';
    nextPilotAt = 0; publish();
  }
  function takeControl() {
    if (disposed) return;
    pause(); start();
  }
  function observePilot(time: number): PilotObservation {
    const subjects: PilotSubject[] = [];
    if (options.arena) {
      // Read rendered avatars here, never hand the authoritative actor list to a policy.
      for (const root of world.scene.children) if (root.visible && typeof root.userData.arenaActorId === 'string') {
        const p = root.position;
        subjects.push({ id: root.userData.arenaActorId, root, radius: .3, points: [1.15, 1.62].map(y => new THREE.Vector3(p.x, p.y + y * root.scale.y, p.z)) });
      }
    } else for (let i = 0; i < targets.length; i++) if (targets[i].alive) {
      subjects.push({ id: `target-${i}`, root: targets[i].root, radius: .24, points: [targets[i].hitZone.getWorldPosition(new THREE.Vector3())] });
    }
    const weaponRay = new THREE.Raycaster(), weaponMeshes: THREE.Mesh[] = [];
    rig.traverseVisible(node => { if (node instanceof THREE.Mesh) weaponMeshes.push(node); });
    const sight = weapons[hud.weapon] ? getWeaponSight(weapons[hud.weapon]) : undefined;
    const screenBlocked = (point: THREE.Vector2) => {
      // The live scope image is a viewing aperture, not an opaque piece of cover.
      if (sight?.lens.visible) {
        const centre = sight.lens.getWorldPosition(new THREE.Vector3());
        const radiusY = sight.radius / (-centre.z * Math.tan(THREE.MathUtils.degToRad(viewCamera.fov / 2)));
        centre.project(viewCamera);
        if (Math.hypot(point.x * sight.magnification / (radiusY / viewCamera.aspect), point.y * sight.magnification / radiusY) < .9) return false;
      }
      weaponRay.setFromCamera(point, viewCamera);
      return !!weaponRay.intersectObjects(weaponMeshes, false)[0];
    };
    const state = loadout[hud.weapon];
    const waypoints: PilotObservation['waypoints'][number][] = expedition ? hud.fieldLoot.map(item => ({ id: item.id, x: item.x, z: item.z, kind: item.kind })) :
      options.arena ? [] : targets.flatMap((target, i) => target.alive ? [{ id: `target-${i}`, ...targetPositions[i], kind: 'target' as const }] : []);
    if (expedition && pilotDestination) {
      const gateway = findWorldRoute(expedition.zone, pilotDestination)[0];
      if (gateway) waypoints.push({ id: gateway.id, ...gateway.position, kind: 'checkpoint' });
    }
    return { time, alive: hud.arenaSelf?.alive !== false, health: hud.health, maxHealth: hud.maxHealth, armor: hud.armor,
      magazine: state.magazine, reserve: state.reserve, reloading: state.reloadRemaining > 0, aiming: actualAim, weapon: hud.weapon,
      position: { x: position.x, z: position.z }, yaw, pitch,
      contacts: visiblePilotContacts(camera, world.scene, subjects, screenBlocked), waypoints,
      lootPrompt: hud.lootPrompt, travelPrompt: hud.travelPrompt };
  }
  function updatePilot(time: number) {
    if (!pilotEnabled || hud.phase !== 'playing' || options.arena && !hud.arenaSelf) return;
    try {
      lastPilotObservation = observePilot(time);
      const decision = pilot.decide(structuredClone(lastPilotObservation));
      const action = normalizePilotAction(decision.action);
      hud.pilotPlan = strategicPlanner?.status() ?? 'Local utility planner';
      hud.pilotGoal = decision.goal; hud.pilotStatus = decision.status; hud.pilotContacts = lastPilotObservation.contacts.length;
      if (!lastPilotObservation.alive) { clearInput(); return; }
      if (action.callout) radioCall(action.callout);
      for (const [key, held] of [['w', action.forward], ['s', action.backward], ['a', action.left], ['d', action.right], ['shift', action.sprint], ['c', action.crouch]] as const) setInput(key, held === true);
      setInput('fire', action.fire === true);
      look(action.lookX ?? 0, action.lookY ?? 0);
      touchAim = action.aim === true; ads = false;
      if (action.weapon !== undefined) switchWeapon(action.weapon);
      if (action.reload) reload();
      if (action.jump) jump();
      if (action.interact) expedition ? interactLoot() : interactVehicle();
      if (action.travel) travelZone();
    } catch {
      pause(); hud.message = 'AI pilot stopped because its controller failed. You can resume manually.'; publish();
    }
  }

  function updateCameras(dt: number, moving: boolean, sprinting: boolean) {
    if (vehicles.mounted) {
      actualAim = false; aimProgress = 0; rig.visible = false;
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
    aimProgress = THREE.MathUtils.damp(aimProgress, aiming ? 1 : 0, 15, dt);
    const aim = smoothStep(aimProgress);
    rig.visible = !options.arena || hud.arenaSelf?.alive !== false;
    const crouching = keys.has('c');
    camera.position.set(position.x, (crouching ? 1.15 : 1.75) + vertical, position.z);
    camera.rotation.set(pitch + kick * 0.22, yaw, 0, 'YXZ');
    camera.fov = THREE.MathUtils.lerp(sprinting ? 71 : 65, 65, aim);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    viewCamera.fov = THREE.MathUtils.lerp(65, 54, aim); viewCamera.updateProjectionMatrix();
    bob += moving ? dt * (sprinting ? 13 : 8) : 0;
    const sway = moving ? Math.sin(bob) * .006 * (1 - aim * .94) : 0;
    spreadAngle = weaponSpread(bloom[hud.weapon], hud.weapon, aim, crouching, moving);
    const spreadPixels = Math.tan(spreadAngle) * canvas.clientHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    hud.crosshairSpread = THREE.MathUtils.damp(hud.crosshairSpread, Math.max(3, spreadPixels), 20, dt);
    const state = loadout[hud.weapon], remaining = state.reloadRemaining / specs[hud.weapon].reload;
    const progress = remaining > 0 ? 1 - remaining : null, motion = reloadMotion(progress ?? 0);
    rig.position.set(THREE.MathUtils.lerp(.20, 0, aim) + sway + motion.x,
      THREE.MathUtils.lerp(-.32, -(handling[hud.weapon]?.aimHeight ?? .435), aim) + Math.abs(sway) - (sprinting ? .08 : 0) + motion.y,
      THREE.MathUtils.lerp(-.78, handling[hud.weapon]?.aimDepth ?? -.47, aim) + kick * .6 + motion.z);
    rig.rotation.set(kick * (1 - aim * .8) + (sprinting ? -.18 : 0) + motion.pitch, motion.yaw, motion.roll);
    handling.forEach((model, i) => model.update(i === hud.weapon ? progress : null, emptyReload[i]));
    const stage = reloadStage(remaining, emptyReload[hud.weapon]);
    if (stage && stage !== lastReloadStage && hud.phase === 'playing') handlingSound(stage);
    lastReloadStage = stage;
    canvas.dataset.aimProgress = aimProgress.toFixed(3); canvas.dataset.reloadStage = stage;
    canvas.dataset.weaponVisible = String(rig.visible);
    viewScene.updateMatrixWorld(true);
  }
  function shoot() {
    if (vehicles.active || (options.arena && !hud.arenaSelf?.alive) || !fireWeapon(loadout[hud.weapon], hud.weapon, specs)) return;
    hud.shots++; shotSound();
    world.scene.updateMatrixWorld(true); ray.setFromCamera(center, camera);
    const dispersion = sampleShotSpread(spreadAngle);
    shotRight.set(1, 0, 0).applyQuaternion(camera.quaternion); shotUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    ray.ray.direction.addScaledVector(shotRight, dispersion.x).addScaledVector(shotUp, dispersion.y).normalize();
    recordBloomShot(bloom[hud.weapon], hud.weapon);
    // Effects/viewmodel never obstruct the gameplay ray.
    const hit = firstVisibleHit(ray, world.scene.children.filter(o => o !== tracer && o !== impact && !o.userData.fpsEffect));
    if (arenaRuntime) {
      let hitActor = false;
      for (let object: THREE.Object3D | null = hit?.object ?? null; object; object = object.parent) if (object.userData.arenaActorId) hitActor = true;
      arenaRuntime.shoot(camera.position, ray.ray.direction, hud.weapon, hit ? hit.distance + (hitActor ? 0.7 : 0) : 125);
    } else if (hit && typeof hit.object.userData.fpsTarget === 'number') {
      const target = targets[hit.object.userData.fpsTarget];
      if (target.alive) {
        hud.landed++; hud.lastDamage = Math.min(target.health, specs[hud.weapon].damage); target.health = Math.max(0, target.health - specs[hud.weapon].damage);
        target.bar.scale.x = target.health / target.maxHealth; hitTime = .20; hud.hitKind = target.health === 0 ? 'kill' : 'hit';
        if (target.health === 0) { target.alive = false; target.root.visible = false; hud.hits++;
          const chain = registerElimination(killChain, hud.elapsed); killChain = chain; hud.chain = chain.count;
          hud.callout = chain.label;
          calloutTime = hud.callout ? 2.4 : 0; hud.earnedXp += ELIMINATION_XP;
          options.onElimination?.(`${roundId}:kill:${hud.hits}`);
          comms.add('kills', pilotEnabled ? 'AI pilot' : 'You', `Target ${hit.object.userData.fpsTarget + 1} eliminated${chain.label ? ' · ' + chain.label : ''}.`);
          announce(hud.callout, killChain.count); }
      }
    }
    const end = hit?.point ?? ray.ray.at(180, new THREE.Vector3());
    const muzzle = weapons[hud.weapon].getObjectByName(`${FPS_WEAPONS[hud.weapon].id}__socket_muzzle`);
    if (muzzle) { muzzle.getWorldPosition(muzzlePoint); camera.localToWorld(muzzlePoint); }
    else muzzlePoint.copy(camera.position);
    const attr = tracerGeometry.getAttribute('position'); attr.setXYZ(0, muzzlePoint.x, muzzlePoint.y, muzzlePoint.z); attr.setXYZ(1, end.x, end.y, end.z); attr.needsUpdate = true;
    tracer.visible = true; impactActive = !!hit; impact.visible = impactActive; impact.position.copy(end); effectTime = 0.055;
    kick = Math.min(kick + specs[hud.weapon].recoil, 0.10); flashTime = 0.045; flash.visible = true;
    if (!options.arena && hud.hits === targetPositions.length) {
      hud.phase = 'complete'; hud.incoming = false; clearInput(); radioCall('complete');
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
          hud.health = damage.health; hud.armor = damage.armor; hurtTime = .35; recoveryDelay = FPS_REGEN_DELAY;
          if (hud.health <= 0) { hud.phase = 'defeated'; clearInput(); radioCall('death'); if (document.pointerLockElement === canvas) document.exitPointerLock(); }
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

  function updateArena(dt: number) {
    if (!arenaRuntime) return;
    const frame = arenaRuntime.update(dt, {
      x: position.x, y: (keys.has('c') ? 1.15 : 1.75) + vertical, z: position.z, yaw, pitch,
      weapon: hud.weapon, playing: hud.phase === 'playing', reloading: loadout[hud.weapon].reloadRemaining > 0,
    });
    const previousSelf = hud.arenaSelf;
    const previousMatch = hud.arena;
    // Hosts already reset synchronously in reset(); only guests adopt a remote rematch.
    const newRound = options.arena?.session.role === 'guest' && previousMatch && frame.snapshot && (frame.snapshot.tick < previousMatch.tick || (previousMatch.finished && !frame.snapshot.finished));
    if (newRound) {
      hud.phase = 'ready'; hud.shots = hud.landed = hud.earned = hud.earnedXp = hud.chain = 0;
      hud.callout = ''; hud.message = ''; calloutTime = 0; killChain = { count: 0, lastAt: -Infinity };
      clearInput(); stopVoice(); encik.reset(); comms.clear(); hud.encikCallout = null; loadout = createLoadout(specs);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
    hud.arena = frame.snapshot; hud.arenaSelf = frame.self; hud.arenaConnected = frame.connected; hud.arenaStarted = frame.started;
    if (frame.snapshot) hud.elapsed = frame.snapshot.elapsed;
    if (frame.self) {
      hud.hits = frame.self.kills; hud.health = frame.self.health; hud.armor = frame.self.armor;
      if (previousSelf && frame.self.health < previousSelf.health) { hurtTime = .4; recoveryDelay = FPS_REGEN_DELAY; }
      if (!frame.self.alive && previousSelf?.alive) { radioCall('death'); clearInput(); killChain = { count: 0, lastAt: -Infinity }; hud.chain = 0; hud.callout = ''; calloutTime = 0; }
      if (frame.spawn) {
        if (previousSelf && !previousSelf.alive) radioCall('respawn');
        pilot.reset(); strategicPlanner?.reset();
        position = { x: frame.self.x, z: frame.self.z }; vertical = Math.max(0, frame.self.y - 1.75); velocityY = 0;
        yaw = frame.self.yaw; pitch = frame.self.pitch; loadout = createLoadout(specs); clearInput();
        if (checkpointPending) {
          loadout = loadout.map((fresh, index) => {
            const carried = checkpointPending?.ammunition?.[index]; if (!carried) return fresh;
            return { magazine: Number.isFinite(carried.magazine) ? Math.max(0, Math.min(specs[index].capacity, Math.floor(carried.magazine))) : fresh.magazine,
              reserve: Number.isFinite(carried.reserve) ? Math.max(0, Math.min(999, Math.floor(carried.reserve))) : fresh.reserve, cooldown: 0, reloadRemaining: 0 };
          });
          hud.weapon = checkpointPending.weapon === 1 ? 1 : 0; checkpointPending = undefined;
          weapons.forEach((weapon, index) => weapon.visible = index === hud.weapon);
          weapons[hud.weapon]?.getObjectByName(`${FPS_WEAPONS[hud.weapon].id}__socket_muzzle`)?.add(flash);
        }
        kick = 0; hitTime = 0; bloom.forEach(state => { state.amount = 0; state.delay = 0; }); updateCameras(0, false, false);
      } else if (frame.correction) {
        position = { x: frame.self.x, z: frame.self.z };
        vertical = Math.max(0, frame.self.y - (keys.has('c') ? 1.15 : 1.75)); velocityY = 0;
        updateCameras(0, false, false);
      }
      rig.visible = frame.self.alive && !vehicles.active;
    }
    if (frame.hit?.hitId) { hud.landed++; hud.lastDamage = frame.hit.damage; hitTime = .2; hud.hitKind = frame.hit.killed ? 'kill' : 'hit'; }
    for (const event of frame.feed) {
      comms.add('kills', 'Arena', event.text);
      if (event.killerId !== options.arena!.session.id) continue;
      const chain = registerElimination(killChain, hud.elapsed); killChain = chain; hud.chain = chain.count;
      hud.callout = chain.label || 'ELIMINATION'; calloutTime = 2.4; announce(hud.callout, chain.count);
    }
    if (!frame.connected && options.arena!.session.role === 'guest' && hud.phase !== 'loading') {
      hud.message = 'The host disconnected. Return to the lobby to join another match.';
      if (hud.phase === 'playing') pause();
    }
    if (frame.snapshot?.finished && hud.phase !== 'complete') {
      hud.phase = 'complete'; clearInput(); hud.incoming = false; radioCall('complete');
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      publish();
    }
  }

  const resize = () => {
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height); camera.aspect = viewCamera.aspect = width / height;
    camera.updateProjectionMatrix(); viewCamera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const animate = (now: number) => {
    if (disposed) return;
    // Stop controls even if a browser/VM delays or drops pointerlockchange.
    if (hud.phase === 'playing' && !pilotEnabled && inputMode === 'mouse' && document.pointerLockElement !== canvas) pause();
    const realDt = Math.max((now - lastTime) / 1000, 0), dt = Math.min(realDt, 0.05); lastTime = now;
    if (pilotEnabled && ['complete', 'defeated', 'error'].includes(hud.phase)) { pilotEnabled = false; pilot.reset(); strategicPlanner?.reset(); }
    if (pilotEnabled && hud.phase === 'playing' && now >= nextPilotAt) { nextPilotAt = now + PILOT_INTERVAL * 1000; updatePilot(now / 1000); }
    if (disposed || travelPending) return;
    let moving = false, sprinting = false;
    // The arena keeps running behind pause menus, including magazine reloads.
    if (options.arena) loadout.forEach((state, i) => advanceWeapon(state, i, realDt, specs));
    if (hud.phase === 'playing' && (!options.arena || hud.arenaSelf?.alive)) {
      bloom.forEach(state => advanceBloom(state, dt));
      calloutTime = Math.max(0, calloutTime - realDt); if (!calloutTime) hud.callout = '';
      if (!options.arena) hud.elapsed += realDt;
      if (!options.arena) loadout.forEach((state, i) => advanceWeapon(state, i, realDt, specs));
      if (vehicles.mounted) {
        yaw += vehicles.step(keys, dt); position = { x: vehicles.mounted.x, z: vehicles.mounted.z };
      } else {
      vehicles.step(keys, dt);
      const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
      const side = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
      sprinting = keys.has('shift') && forward > 0 && !keys.has('c');
      const speed = keys.has('c') ? 2.1 : sprinting ? 7 : (ads || touchAim) ? 2.5 : 4.2;
      const delta = movementInput(forward, side, yaw, speed * equipment.mobility * specs[hud.weapon].mobility, dt), next = footMove(position, delta.x, delta.z, 0.38, options.arena ? world.obstacles : vehicles.footObstacles());
      moving = Math.hypot(next.x - position.x, next.z - position.z) > 0.0001; position = next;
      // Ground-plane jump; map obstacle collision remains active at every height.
      velocityY -= 15 * dt; vertical = Math.max(0, vertical + velocityY * dt); if (vertical === 0) velocityY = 0;
      }
      kick = THREE.MathUtils.damp(kick, 0, 12, dt);
      updateCameras(dt, moving, sprinting);
      if (trigger && !sprinting && !vehicles.active) shoot();
      if (hud.phase === 'playing' && options.combat && !options.arena) counterFire(realDt);
    } else updateCameras(dt, false, false);
    updateArena(realDt);
    if (debugAvailable && hud.phase === 'playing' && hud.health > 0) {
      recoveryDelay = Math.max(0, recoveryDelay - dt);
      if (debug.regeneration && recoveryDelay === 0 && hud.health < hud.maxHealth) {
        hud.health = regenerateHealth(hud.health, hud.maxHealth, dt); arenaRuntime?.setVitals({ health: hud.health });
      }
    }
    if (expedition) { updateExpeditionPrompts(); lootNoticeTime = Math.max(0, lootNoticeTime - realDt); if (!lootNoticeTime) hud.lootNotice = ''; }
    hurtTime = Math.max(0, hurtTime - dt); hud.hurt = hurtTime > 0;
    hitTime = Math.max(0, hitTime - dt); flashTime = Math.max(0, flashTime - dt); effectTime = Math.max(0, effectTime - dt);
    flash.visible = flashTime > 0; tracer.visible = effectTime > 0; impact.visible = effectTime > 0 && impactActive;
    if (motor && motorGain && audio) {
      const active = hud.phase === 'playing' && vehicles.mounted && !hud.muted;
      motorGain.gain.setTargetAtTime(active ? .035 : 0, audio.currentTime, .08);
      motor.frequency.setTargetAtTime(vehicles.active === 'helicopter' ? 54 + Math.sin(hud.elapsed * 24) * 8 : 35 + Math.abs(vehicles.mounted?.speed || 0) * 4, audio.currentTime, .05);
    }
    if (hud.phase === 'playing' && hud.health > 0 && hud.arenaSelf?.alive !== false) {
      if (hud.health < hud.maxHealth * .3) radioCall('medical');
      else if (hurtTime > 0) radioCall('hurt');
      else if (hud.incoming) radioCall('contact');
      else if (loadout[hud.weapon].reserve < 20) radioCall('lowAmmo');
    }
    hud.encikCallout = encik.current(now / 1000);
    world.animate(hud.elapsed);
    const scopeActive = scopeRenderer.render(world.scene, camera, viewCamera, weapons[hud.weapon] ? getWeaponSight(weapons[hud.weapon]) : undefined, aimProgress > .85 && rig.visible && !vehicles.active && hud.phase === 'playing');
    canvas.dataset.scopeActive = String(scopeActive);
    renderer.clear(); renderer.render(world.scene, camera); renderer.clearDepth(); renderer.render(viewScene, viewCamera);
    if (now - lastReport > 100) { publish(); lastReport = now; }
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);

  const assetIds = expedition ? ['sar21-inspired', 'ultimax-inspired'] : ['sar21-inspired', 'ultimax-inspired', 'range-target', 'supply-crate', 'sandbag-wall', 'traffic-cone'];
  void Promise.all(assetIds.map(async id => {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/field-kit/${id}.glb`);
    if (disposed) disposeAssets([gltf.scene]); else templates.push(gltf.scene);
    return gltf.scene;
  })).then(loaded => {
    if (disposed) return;
    weapons.push(loaded[0], loaded[1]); weapons.forEach((w, i) => { undress.push(dressWeapon(w, specs[i])); handling.push(createWeaponHandling(w, i)); rig.add(w); w.visible = i === 0; });
    weapons[0].getObjectByName('sar21-inspired__socket_muzzle')?.add(flash);
    if (!options.arena) targetPositions.forEach((p, i) => {
      const root = new THREE.Group(); root.position.set(p.x, 0.13, p.z);
      root.rotation.y = Math.atan2(spawn.x - p.x, spawn.z - p.z);
      root.add(loaded[2].clone(true));
      const hitZone = new THREE.Mesh(targetGeometry, targetMaterial); hitZone.position.set(0, 1.3, 0.026); hitZone.userData.fpsTarget = i; root.add(hitZone);
      const maxHealth = i % 2 ? 115 : 100;
      const bar = new THREE.Mesh(healthGeometry, healthMaterial); bar.position.set(0, 1.91, .04); root.add(bar);
      world.scene.add(root); targets.push({ root, hitZone, alive: true, health: maxHealth, maxHealth, bar });
      world.obstacles.push({ minX: p.x - 0.42, maxX: p.x + 0.42, minZ: p.z - 0.42, maxZ: p.z + 0.42 });
    });
    if (!expedition) for (const [asset, x, z, width, depth] of district.props) {
      const prop = loaded[asset].clone(true); prop.position.set(x, 0.14, z); decorations.add(prop);
      world.obstacles.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, maxY: asset === 3 ? 0.8 : asset === 4 ? 0.9 : 0.7 });
    }
    if (options.arena) {
      arenaRuntime = createArenaRuntime({ scene: world.scene, obstacles: world.obstacles, ...options.arena });
      if (debugAvailable) {
        arenaRuntime.setHealthMultiplier(debug.healthMultiplier);
        if (expedition?.checkpoint) arenaRuntime.setVitals({ health: expedition.checkpoint.health });
      }
    }
    hud.phase = 'ready'; updateCameras(0, false, false); publish();
    if (expedition?.checkpoint?.pilot) startPilot();
  }).catch(() => {
    if (!disposed) { hud.phase = 'error'; hud.message = 'The range assets could not load. Retry to load the local models.'; publish(); }
  });

  return {
    start, startPilot, setPilotStrategy, takeControl, pause, reset, reload, switchWeapon, jump, setInput, interactVehicle, interactLoot, travelZone, configureDebug, refillHealth,
    setPilotDestination(destination?: WorldZoneId) { pilotDestination = destination; },
    getPilotObservation() { return lastPilotObservation ? structuredClone(lastPilotObservation) : null; },
    toggleAim,
    toggleEncikVoice() { hud.encikVoice = !hud.encikVoice; if (!hud.encikVoice) stopVoice(); publish(); },
    toggleSound() { hud.muted = !hud.muted; if (hud.muted) stopVoice(); if (hud.phase === 'playing') { canvas.focus({ preventScroll: true }); if (!hud.muted) initAudio(); } publish(); },
    dispose() {
      disposed = true; pilot.reset(); strategicPlanner?.reset(); encikAudio.dispose(); cancelAnimationFrame(frame); observer.disconnect(); clearInput();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      window.removeEventListener('keydown', pilotEscape, true);
      canvas.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('pointerdown', pointerSource, true); window.removeEventListener('pointermove', pointerSource, true);
      canvas.removeEventListener('pointerdown', pointerdown); canvas.removeEventListener('pointermove', pointermove);
      window.removeEventListener('pointerup', pointerup); canvas.removeEventListener('pointercancel', releasePointer); canvas.removeEventListener('lostpointercapture', releasePointer);
      canvas.removeEventListener('contextmenu', contextmenu); document.removeEventListener('mousemove', mousemove);
      canvas.removeEventListener('mousedown', mousedown); window.removeEventListener('mouseup', mouseup);
      document.removeEventListener('pointerlockchange', lockchange); document.removeEventListener('pointerlockerror', lockerror);
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility);
      void audio?.close().catch(() => {}); arenaRuntime?.dispose(); expeditionSession?.close(); markers?.dispose(); vehicles.dispose(); undress.forEach(fn => fn()); handling.forEach(model => model.dispose()); disposeAssets(templates); world.dispose();
      healthGeometry.dispose(); healthMaterial.dispose();
      targetGeometry.dispose(); targetMaterial.dispose(); flashGeometry.dispose(); flashMaterial.dispose(); tracerGeometry.dispose(); tracerMaterial.dispose(); impactGeometry.dispose(); impactMaterial.dispose();
      scopeRenderer.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
export type FpsEngine = ReturnType<typeof createFpsEngine>;
