import * as THREE from 'three';
import { createArena, type ArenaActor, type ArenaEnvironment, type ArenaFeed, type ArenaInput, type ArenaPoint, type ArenaShot, type ArenaSnapshot, type ArenaVitals } from './arena-rules';
import { createProfile, resolveLoadout, restoreProfile, type ArmoryProfile } from './armory-state';
import type { LanSession } from './lan-peer';
import { getArenaRole } from './arena-roles';
import type { Obstacle } from './marina-collision';

export interface ArenaRuntimeFrame {
  snapshot: ArenaSnapshot | null; self: ArenaActor | null; connected: boolean; started: boolean;
  hit: ArenaShot | null; feed: ArenaFeed[]; spawn: boolean; correction?: boolean;
}
export interface ArenaRuntimeOptions {
  scene: THREE.Scene; obstacles: readonly Obstacle[]; session: LanSession;
  profile?: ArmoryProfile; botCount: number; composition?: string;
  environment?: ArenaEnvironment; initialVitals?: Partial<ArenaVitals>;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function validArenaInput(value: unknown): value is ArenaInput {
  return object(value) && ['x', 'y', 'z', 'yaw', 'pitch'].every(key => finite(value[key])) &&
    (value.weapon === 0 || value.weapon === 1) && typeof value.playing === 'boolean' &&
    (value.reloading === undefined || typeof value.reloading === 'boolean');
}
export function validArenaSnapshot(value: unknown, environment?: ArenaEnvironment): value is ArenaSnapshot {
  if (!object(value) || value.type !== 'arena-snapshot' || !finite(value.tick) || value.tick < 0 || !finite(value.elapsed) || value.elapsed < 0 || value.elapsed > (environment?.endless ? 1e9 : 181) ||
    typeof value.finished !== 'boolean' || typeof value.winner !== 'string' || value.winner.length > 80 || !Array.isArray(value.actors) || value.actors.length > 14 || !Array.isArray(value.feed) || value.feed.length > 8) return false;
  const ids = new Set<string>();
  for (const actor of value.actors) {
    if (!object(actor) || typeof actor.id !== 'string' || actor.id.length > 100 || ids.has(actor.id) || typeof actor.name !== 'string' || actor.name.length > 24 ||
      !['x', 'y', 'z', 'yaw', 'pitch', 'health', 'armor', 'kills', 'deaths', 'respawnIn', 'shots', 'weapon'].every(key => finite(actor[key])) ||
      typeof actor.alive !== 'boolean' || typeof actor.bot !== 'boolean' || typeof actor.role !== 'string' || actor.role.length > 32 ||
      (actor.x as number) < (environment?.bounds.minX ?? -500) || (actor.x as number) > (environment?.bounds.maxX ?? 500) ||
      (actor.z as number) < (environment?.bounds.minZ ?? -500) || (actor.z as number) > (environment?.bounds.maxZ ?? 500) || (actor.y as number) < 0 || (actor.y as number) > 100 ||
      (actor.health as number) < 0 || (actor.health as number) > 300 || (actor.armor as number) < 0 || (actor.armor as number) > 150) return false;
    ids.add(actor.id);
  }
  return value.feed.every(entry => object(entry) && typeof entry.id === 'string' && entry.id.length <= 100 && typeof entry.text === 'string' && entry.text.length <= 160 &&
    (entry.killerId === undefined || typeof entry.killerId === 'string') && (entry.victimId === undefined || typeof entry.victimId === 'string'));
}
function point(value: unknown): value is ArenaPoint { return object(value) && finite(value.x) && finite(value.y) && finite(value.z); }

interface Avatar { root: THREE.Group; health: THREE.Sprite; muzzle: THREE.Mesh; shots: number; flash: number; maxHealth: number; resources: { dispose(): void }[] }
function createAvatar(actor: ArenaActor): Avatar {
  const root = new THREE.Group(); root.name = `arena-${actor.id}`; root.userData.arenaActorId = actor.id;
  const color = actor.bot ? actor.role === 'tank' ? '#d95b50' : actor.role === 'sniper' ? '#a37add' : '#d8a24b' : '#53c1d0';
  const fabric = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const armor = new THREE.MeshStandardMaterial({ color: '#26322e', roughness: 0.84 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111e25', metalness: 0.25, roughness: 0.5 });
  const visor = new THREE.MeshStandardMaterial({ color: '#72b1be', metalness: 0.65, roughness: 0.2 });
  const resources: { dispose(): void }[] = [fabric, armor, dark, visor];
  function box(width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material) {
    const geometry = new THREE.BoxGeometry(width, height, depth); resources.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); root.add(mesh); return mesh;
  }
  const heavy = actor.role === 'tank';
  box(heavy ? 0.76 : 0.62, 0.64, 0.37, 0, 1.07, 0, fabric);
  box(heavy ? 0.65 : 0.51, 0.47, 0.12, 0, 1.12, -0.23, armor);
  box(0.25, 0.74, 0.28, -0.18, 0.41, 0, fabric); box(0.25, 0.74, 0.28, 0.18, 0.41, 0, fabric);
  box(0.28, 0.17, 0.43, -0.18, 0.085, -0.06, dark); box(0.28, 0.17, 0.43, 0.18, 0.085, -0.06, dark);
  box(0.22, 0.55, 0.23, -0.41, 1.04, -0.07, fabric); box(0.22, 0.5, 0.23, 0.41, 1.07, -0.15, fabric);
  const helmetGeometry = new THREE.SphereGeometry(0.25, 10, 7); resources.push(helmetGeometry);
  const helmet = new THREE.Mesh(helmetGeometry, armor); helmet.position.set(0, 1.59, 0); helmet.scale.set(1, 1.03, 1.08); root.add(helmet);
  box(0.35, 0.105, 0.04, 0, 1.59, -0.249, visor);
  box(0.12, 0.14, 0.78, 0.27, 1.13, -0.48, dark); box(0.035, 0.04, actor.role === 'sniper' ? 0.47 : 0.25, 0.27, 1.15, actor.role === 'sniper' ? -1.02 : -0.86, dark);
  const glow = new THREE.MeshBasicMaterial({ color: '#ffce72', transparent: true, opacity: 0.9 }); resources.push(glow);
  const muzzle = box(0.13, 0.12, 0.18, 0.27, 1.15, -1.02, glow); muzzle.visible = false;
  const barMaterial = new THREE.SpriteMaterial({ color, depthTest: true }); resources.push(barMaterial);
  const health = new THREE.Sprite(barMaterial); health.position.set(0, 2.02, 0); health.scale.set(0.75, 0.055, 1); health.raycast = () => {}; root.add(health);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 48;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(10,19,25,.8)'; context.fillRect(0, 0, 256, 48); context.font = '600 22px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color; context.fillText(actor.name.slice(0, 20), 128, 25);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true }); resources.push(texture, material);
      const name = new THREE.Sprite(material); name.position.set(0, 2.23, 0); name.scale.set(1.6, 0.3, 1); name.raycast = () => {}; root.add(name);
    }
  }
  return { root, health, muzzle, shots: actor.shots, flash: 0, maxHealth: actor.bot ? getArenaRole(actor.role)?.health ?? Math.max(100, actor.health) : 100, resources };
}

/** Host owns bots, damage, spawns and score. The renderer submits only local input. */
export function createArenaRuntime(options: ArenaRuntimeOptions) {
  const { scene, session } = options;
  let profile = restoreProfile(JSON.stringify(options.profile ?? createProfile()));
  const authority = session.role !== 'guest';
  const simulation = authority ? createArena(options.obstacles, options.botCount, options.composition, options.environment) : null;
  const hostId = authority ? session.id : session.getPeers()[0]?.id;
  const avatars = new Map<string, Avatar>();
  const registered = new Set<string>();
  let snapshot: ArenaSnapshot | null = null, started = false, disposed = false, inputTime = 0, helloTime = 3;
  let pendingHit: ArenaShot | null = null, pendingFeed: ArenaFeed[] = [], spawnPending = false, localAdopted = false;
  let lastInput: ArenaInput | null = null;
  let previousSelf: ArenaActor | null = null, lastTick = -1;
  const seenFeed = new Set<string>();
  const initial = resolveLoadout(profile);
  const coverRay = new THREE.Raycaster();
  function coverLimit(origin: ArenaPoint, direction: ArenaPoint, supplied: number) {
    if (!point(origin) || !point(direction)) return 0;
    const vector = new THREE.Vector3(direction.x, direction.y, direction.z);
    if (vector.lengthSq() < 0.01) return 0;
    coverRay.set(new THREE.Vector3(origin.x, origin.y, origin.z), vector.normalize()); coverRay.far = 125;
    scene.updateMatrixWorld(true);
    // Only solid, visible meshes are cover. Sprite raycasts require a render camera;
    // hidden vehicle labels must never enter this world-space authority ray.
    const surfaces: THREE.Mesh[] = [];
    const collect = (node: THREE.Object3D) => {
      if (!node.visible || node.userData.arenaActorId || node.userData.fpsEffect) return;
      if (node instanceof THREE.Mesh) surfaces.push(node);
      node.children.forEach(collect);
    };
    scene.children.forEach(collect);
    const cover = coverRay.intersectObjects(surfaces, false)[0];
    return Math.min(finite(supplied) ? Math.max(0, Math.min(125, supplied)) : 125, cover?.distance ?? 125);
  }
  if (simulation) { simulation.addPlayer(session.id, session.name, initial.armor, initial.absorption, initial.weapons, options.initialVitals, session.role === 'solo'); registered.add(session.id); }
  function accept(next: ArenaSnapshot) {
    if (next.tick < lastTick) { seenFeed.clear(); localAdopted = false; }
    lastTick = next.tick; snapshot = next;
    const self = next.actors.find(actor => actor.id === session.id) ?? null;
    if (self && (!previousSelf || (!previousSelf.alive && self.alive) || (previousSelf.deaths !== self.deaths && self.alive) || !localAdopted)) spawnPending = true;
    previousSelf = self ? { ...self } : null;
    for (const event of next.feed) if (!seenFeed.has(event.id)) { seenFeed.add(event.id); pendingFeed.push(event); }
    if (seenFeed.size > 300) { seenFeed.clear(); for (const event of next.feed) seenFeed.add(event.id); }
  }
  const publish = () => { if (simulation) { accept(simulation.snapshot()); if (session.role === 'host') session.send({ type: 'arena-state', snapshot, started }); } };
  if (simulation) accept(simulation.snapshot());
  const peersChanged = () => {
    if (!simulation) return;
    const present = new Set(session.getPeers().map(peer => peer.id));
    for (const id of registered) if (id !== session.id && !present.has(id)) { simulation.removePlayer(id); registered.delete(id); }
    publish();
  };
  const unsubscribePeers = session.onPeers(peersChanged);
  const unsubscribe = session.subscribe((from, payload) => {
    if (disposed || !object(payload)) return;
    if (simulation) {
      const peer = session.getPeers().find(candidate => candidate.id === from); if (!peer) return;
      if (payload.type === 'arena-hello' && !registered.has(from)) {
        let raw: string;
        try { raw = JSON.stringify(payload.profile); } catch { return; }
        if (typeof raw !== 'string' || raw.length > 16_000) return;
        const loadout = resolveLoadout(restoreProfile(raw));
        simulation.addPlayer(from, peer.name, loadout.armor, loadout.absorption, loadout.weapons); registered.add(from); publish();
      } else if (registered.has(from) && payload.type === 'arena-input' && validArenaInput(payload.input)) simulation.setInput(from, payload.input);
      else if (registered.has(from) && payload.type === 'arena-reload' && (payload.weapon === 0 || payload.weapon === 1)) simulation.reloadPlayer(from, payload.weapon);
      else if (registered.has(from) && started && payload.type === 'arena-shot' && point(payload.origin) && point(payload.direction) && (payload.weapon === 0 || payload.weapon === 1)) {
        const hit = simulation.shoot(from, payload.origin, payload.direction, payload.weapon, coverLimit(payload.origin, payload.direction, finite(payload.maxDistance) ? payload.maxDistance : 125));
        session.send({ type: 'arena-hit', hit }, from); publish();
      }
    } else if (from === hostId) {
      if (payload.type === 'arena-state' && validArenaSnapshot(payload.snapshot, options.environment) && typeof payload.started === 'boolean') { started = payload.started; accept(payload.snapshot); }
      if (payload.type === 'arena-hit' && object(payload.hit) && (payload.hit.hitId === null || typeof payload.hit.hitId === 'string') && typeof payload.hit.killed === 'boolean' && finite(payload.hit.damage) && payload.hit.damage >= 0 && payload.hit.damage <= 100) pendingHit = payload.hit as unknown as ArenaShot;
    }
  });
  let lastTime = performance.now(), broadcastTime = 0;
  const timer = simulation ? setInterval(() => {
    const now = performance.now(); const dt = Math.min(3, (now - lastTime) / 1000); lastTime = now;
    if (disposed || !started) return;
    for (let remaining = dt; remaining > 0.000001; remaining -= Math.min(0.25, remaining)) simulation.step(Math.min(0.25, remaining));
    accept(simulation.snapshot()); broadcastTime += dt;
    if (broadcastTime >= 0.1) { broadcastTime = 0; publish(); }
  }, 50) : undefined;

  function update(dt: number, input: ArenaInput): ArenaRuntimeFrame {
    if (disposed) return { snapshot: null, self: null, connected: false, started: false, hit: null, feed: [], spawn: false };
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.25)) : 0;
    const connected = authority || !!hostId && session.getPeers().some(peer => peer.id === hostId);
    inputTime += dt; helloTime += dt;
    let self = snapshot?.actors.find(actor => actor.id === session.id) ?? null;
    if (!authority && !self && connected && helloTime >= 1) { helloTime = 0; session.send({ type: 'arena-hello', profile }); }
    self = snapshot?.actors.find(actor => actor.id === session.id) ?? null;
    if (validArenaInput(input)) lastInput = { ...input };
    if (simulation && input.playing && !started) { started = true; lastTime = performance.now(); publish(); }
    // Never overwrite an authoritative spawn with the renderer's previous position.
    if (localAdopted && !spawnPending && validArenaInput(input)) {
      if (simulation) simulation.setInput(session.id, input);
      else if (self && connected && inputTime >= 1 / 20) { inputTime = 0; session.send({ type: 'arena-input', input }); }
    }
    const activeIds = new Set<string>();
    for (const actor of snapshot?.actors ?? []) {
      if (actor.id === session.id) continue;
      activeIds.add(actor.id);
      let avatar = avatars.get(actor.id);
      if (!avatar) { avatar = createAvatar(actor); avatars.set(actor.id, avatar); scene.add(avatar.root); avatar.root.position.set(actor.x, actor.y - 1.75, actor.z); }
      avatar.root.visible = actor.alive;
      const destination = new THREE.Vector3(actor.x, Math.max(0, actor.y - 1.75), actor.z);
      avatar.root.position.lerp(destination, avatar.root.position.distanceTo(destination) > 7 ? 1 : 1 - Math.exp(-15 * dt));
      avatar.root.rotation.y = actor.yaw; avatar.root.scale.y = Math.min(1, Math.max(0.6, actor.y / 1.75));
      avatar.health.scale.x = Math.max(0.01, 0.75 * actor.health / avatar.maxHealth);
      if (actor.shots > avatar.shots) avatar.flash = 0.085;
      avatar.shots = actor.shots; avatar.flash = Math.max(0, avatar.flash - dt); avatar.muzzle.visible = avatar.flash > 0;
    }
    for (const [id, avatar] of avatars) if (!activeIds.has(id)) { scene.remove(avatar.root); avatar.resources.forEach(resource => resource.dispose()); avatars.delete(id); }
    const correction = !!self?.alive && localAdopted && !spawnPending && Math.hypot(self.x - input.x, self.y - input.y, self.z - input.z) > 2.5;
    const frame = { snapshot, self, connected, started, hit: pendingHit, feed: pendingFeed, spawn: spawnPending, correction };
    pendingHit = null; pendingFeed = []; if (spawnPending) localAdopted = true; spawnPending = false;
    return frame;
  }
  function shoot(origin: ArenaPoint, direction: ArenaPoint, weapon: number, maxDistance = 125) {
    if (disposed || !started || !localAdopted) return;
    const freshInput = lastInput ? { ...lastInput, weapon, x: origin.x, y: origin.y, z: origin.z } : null;
    if (simulation) {
      if (freshInput && validArenaInput(freshInput)) simulation.setInput(session.id, freshInput);
      pendingHit = simulation.shoot(session.id, origin, direction, weapon, coverLimit(origin, direction, maxDistance)); publish();
    } else {
      if (freshInput && validArenaInput(freshInput)) session.send({ type: 'arena-input', input: freshInput });
      session.send({ type: 'arena-shot', origin, direction, weapon, maxDistance });
    }
  }
  function reload(weapon: number) {
    if (disposed || !localAdopted) return;
    const freshInput = lastInput ? { ...lastInput, weapon, reloading: true } : null;
    if (simulation) {
      if (freshInput && validArenaInput(freshInput)) simulation.setInput(session.id, freshInput);
      simulation.reloadPlayer(session.id, weapon);
    } else {
      if (freshInput && validArenaInput(freshInput)) session.send({ type: 'arena-input', input: freshInput });
      session.send({ type: 'arena-reload', weapon });
    }
  }
  function reset() { if (!simulation || disposed) return; simulation.reset(); started = false; localAdopted = false; previousSelf = null; seenFeed.clear(); publish(); }
  function updateLoadout(nextProfile: ArmoryProfile) {
    if (disposed || session.role !== 'solo' || !simulation) return false;
    profile = restoreProfile(JSON.stringify(nextProfile));
    const loadout = resolveLoadout(profile);
    simulation.setPlayerLoadout(session.id, loadout.armor, loadout.absorption, loadout.weapons); publish(); return true;
  }
  function setVitals(vitals: Partial<ArenaVitals>) {
    if (disposed || session.role !== 'solo' || !simulation) return false;
    simulation.setPlayerVitals(session.id, vitals); publish(); return true;
  }
  function dispose() {
    if (disposed) return; disposed = true; clearInterval(timer); unsubscribe(); unsubscribePeers();
    for (const avatar of avatars.values()) { scene.remove(avatar.root); avatar.resources.forEach(resource => resource.dispose()); }
    avatars.clear();
  }
  return { update, shoot, reload, reset, dispose, updateLoadout, setVitals };
}
export type ArenaRuntime = ReturnType<typeof createArenaRuntime>;
