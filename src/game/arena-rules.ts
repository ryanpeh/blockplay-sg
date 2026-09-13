import { MARINA_BOUNDS, moveInMarina, type Obstacle } from './marina-collision';
import { FPS_WEAPONS, type WeaponSpec } from './fps-rules';
import { getArenaRole, type ArenaRolePlugin } from './arena-roles';

/** All coordinates use metres; actor y is eye height, not the feet. */
export interface ArenaActor {
  id: string; name: string; bot: boolean; x: number; y: number; z: number; yaw: number; pitch: number;
  health: number; armor: number; kills: number; deaths: number; alive: boolean; respawnIn: number; weapon: number;
  shots: number; role: string;
}
export interface ArenaFeed { id: string; text: string; killerId?: string; victimId?: string }
export interface ArenaSnapshot {
  type: 'arena-snapshot'; tick: number; elapsed: number; actors: ArenaActor[];
  feed: ArenaFeed[]; finished: boolean; winner: string;
}
export interface ArenaInput { x: number; y: number; z: number; yaw: number; pitch: number; weapon: number; playing: boolean; reloading?: boolean }
export type ArenaWeapon = Pick<WeaponSpec, 'damage' | 'interval' | 'capacity' | 'reload'>;
export interface ArenaPoint { x: number; y: number; z: number }
export interface ArenaShot { hitId: string | null; killed: boolean; damage: number }
export interface ArenaVitals { health: number; armor: number }
export interface ArenaEnvironment {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  move: (position: { x: number; z: number }, dx: number, dz: number, radius: number, obstacles: readonly Obstacle[]) => { x: number; z: number };
  spawns: readonly { x: number; z: number }[];
  endless?: boolean;
  playerSpawn?: { x: number; z: number; yaw?: number; pitch?: number };
}
export const ARENA_DURATION = 180;
export const ARENA_KILL_LIMIT = 15;
export const ARENA_RESPAWN_SECONDS = 3;
const EMPTY_SHOT: ArenaShot = { hitId: null, killed: false, damage: 0 };
const SPAWNS = [
  { x: -44, z: 68 }, { x: -65, z: 72 }, { x: -20, z: 73 }, { x: -52, z: 55 },
  { x: -8, z: 64 }, { x: -73, z: 60 }, { x: -34, z: 58 }, { x: 4, z: 74 },
];
interface InternalActor {
  actor: ArenaActor; healthMax: number; armorMax: number; absorption: number; weapons: ArenaWeapon[]; role?: ArenaRolePlugin;
  cooldown: number[]; rounds: number[]; reload: number[]; playing: boolean; movementBudget: number; wasReloading: boolean;
  usePlayerSpawn: boolean;
  reaction: number; target: string; strafe: number; patrol: { x: number; z: number }; patrolTime: number;
}
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const finitePoint = (p: ArenaPoint) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const distance = (a: ArenaPoint, b: ArenaPoint) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Distance to a solid scene box, or Infinity. Unspecified height means a tall wall. */
export function arenaWallDistance(origin: ArenaPoint, direction: ArenaPoint, obstacles: readonly Obstacle[]) {
  let closest = Infinity;
  for (const obstacle of obstacles) {
    let near = 0; let far = 150;
    const limits = [[obstacle.minX, obstacle.maxX], [0, obstacle.maxY ?? 200], [obstacle.minZ, obstacle.maxZ]];
    const starts = [origin.x, origin.y, origin.z]; const rays = [direction.x, direction.y, direction.z];
    for (let axis = 0; axis < 3; axis++) {
      const [min, max] = limits[axis]; const d = rays[axis]; const o = starts[axis];
      if (Math.abs(d) < 1e-8) { if (o < min || o > max) { far = -1; break; } }
      else { const t1 = (min - o) / d; const t2 = (max - o) / d; near = Math.max(near, Math.min(t1, t2)); far = Math.min(far, Math.max(t1, t2)); }
    }
    if (far >= near) closest = Math.min(closest, near);
  }
  return closest;
}
function sphereDistance(origin: ArenaPoint, direction: ArenaPoint, center: ArenaPoint, radius: number) {
  const x = origin.x - center.x; const y = origin.y - center.y; const z = origin.z - center.z;
  const b = x * direction.x + y * direction.y + z * direction.z;
  const determinant = b * b - (x * x + y * y + z * z - radius * radius);
  if (determinant < 0) return Infinity;
  const t = -b - Math.sqrt(determinant); return t >= 0 ? t : Infinity;
}
function bodyDistance(origin: ArenaPoint, direction: ArenaPoint, actor: ArenaActor) {
  return Math.min(...[[0.13, 0.29], [0.62, 0.43], [1.12, 0.4]].map(([offset, radius]) =>
    sphereDistance(origin, direction, { x: actor.x, y: actor.y - offset, z: actor.z }, radius)));
}

/** Host-owned match. Clients may submit movement and aim, never damage or scores. */
export function createArena(obstacles: readonly Obstacle[], botCount: number, composition = 'mixed', environment?: ArenaEnvironment) {
  const bounds = environment?.bounds ?? MARINA_BOUNDS;
  const move = environment?.move ?? moveInMarina;
  const members = new Map<string, InternalActor>();
  let tick = 0; let elapsed = 0; let finished = false; let winner = ''; let eventId = 0; let seed = 92371;
  const feed: ArenaFeed[] = [];
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const announce = (text: string, killerId?: string, victimId?: string) => {
    feed.push({ id: String(++eventId), text, ...(killerId ? { killerId } : {}), ...(victimId ? { victimId } : {}) });
    if (feed.length > 8) feed.shift();
  };
  const groundObstacles = obstacles.filter(o => (o.maxY ?? 200) > 0.15);
  const clearSpawn = (p: { x: number; z: number }) => Number.isFinite(p.x) && Number.isFinite(p.z) &&
    p.x - 0.5 >= bounds.minX && p.x + 0.5 <= bounds.maxX && p.z - 0.5 >= bounds.minZ && p.z + 0.5 <= bounds.maxZ &&
    !groundObstacles.some(o => p.x + 0.5 > o.minX && p.x - 0.5 < o.maxX && p.z + 0.5 > o.minZ && p.z - 0.5 < o.maxZ);
  const validSpawns = (environment?.spawns ?? SPAWNS).filter(clearSpawn);
  if (!validSpawns.length) {
    const area = environment ? { minX: bounds.minX + 0.75, maxX: bounds.maxX - 0.75, minZ: bounds.minZ + 0.75, maxZ: bounds.maxZ - 0.75 } : { minX: -78, maxX: 20, minZ: 54, maxZ: 80 };
    const incrementX = environment ? Math.max(3, (area.maxX - area.minX) / 24) : 3;
    const incrementZ = environment ? Math.max(3, (area.maxZ - area.minZ) / 24) : 3;
    for (let z = area.minZ; z <= area.maxZ && validSpawns.length < 8; z += incrementZ) {
      for (let x = area.minX; x <= area.maxX && validSpawns.length < 8; x += incrementX) if (clearSpawn({ x, z })) validSpawns.push({ x, z });
    }
  }
  // Real Marina has many valid spawn points; explicit failure avoids spawning inside walls.
  if (!validSpawns.length) throw new Error('No clear arena spawn point is available.');
  const spawn = (entry: InternalActor) => {
    const others = [...members.values()].filter(m => m !== entry && m.actor.alive);
    const positions = [...validSpawns].sort((a, b) => {
      const safety = (p: { x: number; z: number }) => Math.min(1000, ...others.map(m => Math.hypot(m.actor.x - p.x, m.actor.z - p.z)));
      return safety(b) - safety(a);
    });
    const preferred = entry.usePlayerSpawn && environment?.playerSpawn && clearSpawn(environment.playerSpawn) ? environment.playerSpawn : undefined;
    const p = preferred ?? positions[0];
    Object.assign(entry.actor, { x: p.x, z: p.z }, { y: 1.75, health: entry.healthMax, armor: entry.armorMax, alive: true, respawnIn: 0,
      yaw: Number.isFinite(preferred?.yaw) ? preferred!.yaw! : 0, pitch: Number.isFinite(preferred?.pitch) ? clamp(preferred!.pitch!, -1.5, 1.5) : 0 });
    entry.cooldown = entry.weapons.map(() => 0); entry.reload = entry.weapons.map(() => 0); entry.rounds = entry.weapons.map(w => w.capacity);
    entry.movementBudget = 2; entry.reaction = 1; entry.target = ''; entry.wasReloading = false;
  };
  function sanitizeWeapons(weapons: readonly ArenaWeapon[]) {
    return (weapons.length ? weapons : FPS_WEAPONS).slice(0, 2).map(w => ({
      damage: Number.isFinite(w.damage) ? clamp(w.damage, 1, 100) : 36,
      interval: Number.isFinite(w.interval) ? clamp(w.interval, 0.06, 3) : 0.12,
      capacity: Number.isFinite(w.capacity) ? Math.floor(clamp(w.capacity, 1, 200)) : 30,
      reload: Number.isFinite(w.reload) ? clamp(w.reload, 0.4, 8) : 1.8,
    }));
  }
  function addPlayer(id: string, name: string, armor = 0, absorption = 0, weapons: readonly ArenaWeapon[] = FPS_WEAPONS, initialVitals?: Partial<ArenaVitals>, usePlayerSpawn = false) {
    if (!id || id.length > 100 || members.has(id) || members.size >= 14) return;
    const safeWeapons = sanitizeWeapons(weapons);
    const entry: InternalActor = {
      actor: { id, name: name.trim().slice(0, 24) || 'Player', bot: false, x: 0, y: 1.75, z: 0, yaw: 0, pitch: 0,
        health: 100, armor: 0, kills: 0, deaths: 0, alive: true, respawnIn: 0, weapon: 0, shots: 0, role: 'player' },
      healthMax: 100, armorMax: Number.isFinite(armor) ? clamp(armor, 0, 150) : 0, absorption: Number.isFinite(absorption) ? clamp(absorption, 0, 0.9) : 0,
      weapons: safeWeapons, cooldown: [], rounds: [], reload: [], playing: true, movementBudget: 2, wasReloading: false, usePlayerSpawn,
      reaction: 1, target: '', strafe: random() < 0.5 ? -1 : 1, patrol: validSpawns[0], patrolTime: 0,
    };
    members.set(id, entry); spawn(entry); if (initialVitals) setPlayerVitals(id, initialVitals); announce(`${entry.actor.name} joined`);
  }
  function setPlayerVitals(id: string, vitals: Partial<ArenaVitals>) {
    const entry = members.get(id); if (!entry || entry.actor.bot) return;
    if (Number.isFinite(vitals.health)) {
      entry.actor.health = clamp(vitals.health!, 0, entry.healthMax);
      entry.actor.alive = entry.actor.health > 0;
      entry.actor.respawnIn = entry.actor.alive ? 0 : ARENA_RESPAWN_SECONDS;
    }
    if (Number.isFinite(vitals.armor)) entry.actor.armor = clamp(vitals.armor!, 0, entry.armorMax);
  }
  function setPlayerHealthMultiplier(id: string, multiplier: 1 | 5 | 10) {
    const entry = members.get(id); if (!entry || entry.actor.bot || ![1, 5, 10].includes(multiplier)) return;
    const fraction = entry.actor.health / entry.healthMax;
    entry.healthMax = 100 * multiplier;
    entry.actor.health = entry.healthMax * fraction;
  }
  function setPlayerLoadout(id: string, armor: number, absorption: number, weapons: readonly ArenaWeapon[]) {
    const entry = members.get(id); if (!entry || entry.actor.bot) return;
    entry.armorMax = Number.isFinite(armor) ? clamp(armor, 0, 150) : entry.armorMax;
    entry.absorption = Number.isFinite(absorption) ? clamp(absorption, 0, 0.9) : entry.absorption;
    entry.actor.armor = Math.min(entry.actor.armor, entry.armorMax);
    const next = sanitizeWeapons(weapons);
    next.forEach((weapon, index) => {
      const previous = entry.weapons[index];
      const changed = !previous || Object.keys(weapon).some(key => weapon[key as keyof ArenaWeapon] !== previous[key as keyof ArenaWeapon]);
      if (changed) { entry.rounds[index] = weapon.capacity; entry.cooldown[index] = 0; entry.reload[index] = 0; }
    });
    entry.weapons = next; entry.rounds.length = next.length; entry.cooldown.length = next.length; entry.reload.length = next.length;
    entry.actor.weapon = Math.min(entry.actor.weapon, next.length - 1); entry.wasReloading = false;
  }
  function removePlayer(id: string) {
    const entry = members.get(id); if (!entry || entry.actor.bot) return;
    members.delete(id); announce(`${entry.actor.name} left`);
  }
  function setInput(id: string, input: ArenaInput) {
    const entry = members.get(id); if (!entry || entry.actor.bot || finished || !input || !finitePoint(input)) return;
    if (![input.yaw, input.pitch].every(Number.isFinite)) return;
    entry.playing = input.playing === true;
    const actor = entry.actor; if (!actor.alive) return;
    const target = { x: clamp(input.x, bounds.minX + 0.5, bounds.maxX - 0.5), y: clamp(input.y, 1, 90), z: clamp(input.z, bounds.minZ + 0.5, bounds.maxZ - 0.5) };
    const travel = distance(actor, target); const scale = travel > 0 ? Math.min(1, entry.movementBudget / travel) : 0;
    const y = actor.y + (target.y - actor.y) * scale;
    const solids = obstacles.filter(o => (o.maxY ?? 200) > Math.min(actor.y, y) - 1.45);
    const position = move(actor, (target.x - actor.x) * scale, (target.z - actor.z) * scale, 0.35, solids);
    entry.movementBudget = Math.max(0, entry.movementBudget - Math.hypot(position.x - actor.x, y - actor.y, position.z - actor.z));
    Object.assign(actor, position, { y, yaw: input.yaw % (Math.PI * 2), pitch: clamp(input.pitch, -1.5, 1.5) });
    if (Number.isInteger(input.weapon) && input.weapon >= 0 && input.weapon < entry.weapons.length && input.weapon !== actor.weapon) {
      entry.reload[actor.weapon] = 0; actor.weapon = input.weapon; entry.wasReloading = false;
    }
    if (input.reloading === true && !entry.wasReloading) reloadPlayer(id, actor.weapon);
    entry.wasReloading = input.reloading === true;
  }
  function reloadPlayer(id: string, weapon: number) {
    const entry = members.get(id);
    if (!entry || !entry.actor.alive || finished || !Number.isInteger(weapon) || weapon !== entry.actor.weapon || !entry.weapons[weapon]) return;
    if (entry.reload[weapon] <= 0 && entry.rounds[weapon] < entry.weapons[weapon].capacity) entry.reload[weapon] = entry.weapons[weapon].reload;
  }
  function shoot(id: string, origin: ArenaPoint, direction: ArenaPoint, weapon: number, maxDistance = 125): ArenaShot {
    const entry = members.get(id);
    if (!entry || finished || !entry.actor.alive || !entry.playing || !finitePoint(origin) || !finitePoint(direction)) return { ...EMPTY_SHOT };
    if (!Number.isInteger(weapon) || weapon !== entry.actor.weapon || !entry.weapons[weapon]) return { ...EMPTY_SHOT };
    if (distance(origin, entry.actor) > 1.5 || entry.cooldown[weapon] > 1e-7 || entry.reload[weapon] > 0) return { ...EMPTY_SHOT };
    const length = Math.hypot(direction.x, direction.y, direction.z); if (length < 0.5 || length > 1.5) return { ...EMPTY_SHOT };
    const ray = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
    if (entry.rounds[weapon] <= 0) { entry.reload[weapon] = entry.weapons[weapon].reload; return { ...EMPTY_SHOT }; }
    entry.rounds[weapon]--; entry.cooldown[weapon] = entry.weapons[weapon].interval; entry.actor.shots++;
    if (entry.rounds[weapon] === 0) entry.reload[weapon] = entry.weapons[weapon].reload;
    let nearest = Math.min(Number.isFinite(maxDistance) ? clamp(maxDistance, 0, 125) : 0, arenaWallDistance(origin, ray, obstacles)); let victim: InternalActor | undefined;
    for (const other of members.values()) {
      if (other === entry || !other.actor.alive) continue;
      const intersection = bodyDistance(origin, ray, other.actor);
      if (intersection < nearest) { victim = other; nearest = intersection; }
    }
    if (!victim) return { ...EMPTY_SHOT };
    const damage = entry.weapons[weapon].damage;
    const blocked = Math.min(victim.actor.armor, damage * victim.absorption);
    victim.actor.armor -= blocked; victim.actor.health = Math.max(0, victim.actor.health - damage + blocked);
    const killed = victim.actor.health <= 0;
    if (killed) {
      victim.actor.alive = false; victim.actor.deaths++; victim.actor.respawnIn = ARENA_RESPAWN_SECONDS; entry.actor.kills++;
      announce(`${entry.actor.name} eliminated ${victim.actor.name}`, id, victim.actor.id);
      if (!environment?.endless && entry.actor.kills >= ARENA_KILL_LIMIT) { finished = true; winner = entry.actor.name; }
    }
    return { hitId: victim.actor.id, killed, damage: damage - blocked };
  }
  function stepBot(entry: InternalActor, dt: number) {
    const actor = entry.actor;
    const role = entry.role!;
    const enemies = [...members.values()].filter(m => m !== entry && m.actor.alive);
    const enemy = enemies.sort((a, b) => distance(actor, a.actor) * (a.actor.bot ? 1.1 : 1) - distance(actor, b.actor) * (b.actor.bot ? 1.1 : 1))[0];
    entry.patrolTime -= dt;
    if (entry.patrolTime <= 0) { entry.patrol = validSpawns[Math.floor(random() * validSpawns.length)]; entry.patrolTime = 3 + random() * 3; entry.strafe *= -1; }
    const target = enemy?.actor ?? { ...entry.patrol, y: 1.75 };
    const dx = target.x - actor.x; const dz = target.z - actor.z; const horizontal = Math.hypot(dx, dz);
    const direction = { x: dx / Math.max(horizontal, 0.01), y: 0, z: dz / Math.max(horizontal, 0.01) };
    const line = { x: target.x - actor.x, y: target.y - 0.65 - actor.y, z: target.z - actor.z };
    const length = Math.hypot(line.x, line.y, line.z);
    const ray = { x: line.x / Math.max(length, 0.01), y: line.y / Math.max(length, 0.01), z: line.z / Math.max(length, 0.01) };
    const visible = !!enemy && length < role.sightRange && arenaWallDistance(actor, ray, obstacles) >= length - 0.5;
    const intent = role.think({ distance: horizontal, visible, healthFraction: actor.health / entry.healthMax, strafeDirection: entry.strafe });
    const approach = Number.isFinite(intent.approach) ? clamp(intent.approach, -1, 1) : 0;
    const strafe = Number.isFinite(intent.strafe) ? clamp(intent.strafe, -1, 1) : 0;
    const normal = Math.max(1, Math.hypot(approach, strafe));
    const movement = move(actor, (direction.x * approach - direction.z * strafe) / normal * role.speed * dt,
      (direction.z * approach + direction.x * strafe) / normal * role.speed * dt, 0.4, groundObstacles);
    Object.assign(actor, movement);
    actor.yaw = Math.atan2(-dx, -dz); actor.pitch = Math.atan2(line.y, horizontal);
    if (!visible || !intent.fire) { entry.reaction = role.reaction; entry.target = ''; return; }
    if (entry.target !== enemy.actor.id) { entry.target = enemy.actor.id; entry.reaction = role.reaction + random() * 0.3; }
    entry.reaction -= dt;
    if (entry.reaction <= 0) {
      // Deliberate arcade inaccuracy gives moving players time to react.
      const spread = Number.isFinite(intent.spread) ? clamp(intent.spread, 0.005, 0.2) : 0.05;
      shoot(actor.id, actor, { x: ray.x + (random() - 0.5) * spread, y: ray.y + (random() - 0.5) * spread, z: ray.z + (random() - 0.5) * spread }, actor.weapon);
      entry.reaction = (Number.isFinite(intent.shotDelay) ? clamp(intent.shotDelay, 0.1, 5) : 0.5) + random() * 0.15;
    }
  }
  function step(dt: number) {
    if (finished || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.25); elapsed = environment?.endless ? elapsed + dt : Math.min(ARENA_DURATION, elapsed + dt); tick++;
    for (const entry of members.values()) {
      entry.movementBudget = Math.min(8, entry.movementBudget + 40 * dt);
      if (!entry.actor.alive) { entry.actor.respawnIn = Math.max(0, entry.actor.respawnIn - dt); if (entry.actor.respawnIn === 0) spawn(entry); continue; }
      entry.weapons.forEach((weapon, index) => {
        entry.cooldown[index] = Math.max(0, entry.cooldown[index] - dt);
        if (entry.reload[index] > 0) { entry.reload[index] = Math.max(0, entry.reload[index] - dt); if (entry.reload[index] === 0) entry.rounds[index] = weapon.capacity; }
      });
      if (entry.actor.bot) stepBot(entry, dt);
      if (finished) break;
    }
    if (!environment?.endless && elapsed >= ARENA_DURATION && !finished) {
      finished = true;
      const leaders = [...members.values()].map(m => m.actor).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
      winner = leaders.length > 1 && leaders[0].kills === leaders[1].kills && leaders[0].deaths === leaders[1].deaths ? 'Draw' : leaders[0]?.name ?? 'Draw';
      announce(`${winner === 'Draw' ? 'Draw' : `${winner} wins`} · time limit`);
    }
  }
  function snapshot(): ArenaSnapshot {
    return { type: 'arena-snapshot', tick, elapsed, actors: [...members.values()].map(m => ({ ...m.actor })), feed: feed.map(event => ({ ...event })), finished, winner };
  }
  function reset() {
    tick = 0; elapsed = 0; finished = false; winner = ''; feed.length = 0;
    for (const entry of members.values()) { entry.actor.kills = 0; entry.actor.deaths = 0; entry.actor.shots = 0; spawn(entry); }
    announce('New arena match');
  }
  const count = Number.isFinite(botCount) ? Math.floor(clamp(botCount, 0, 6)) : 0;
  for (let i = 0; i < count; i++) {
    const id = `bot-${i + 1}`;
    const role = getArenaRole(composition === 'mixed' ? ['assault', 'tank', 'sniper'][i % 3] : composition) ?? getArenaRole('assault')!;
    const weapons = FPS_WEAPONS.map((w, index) => index === role.weaponIndex ? role.weapon : w);
    addPlayer(id, `${role.name.split(' ')[0]} ${['Merlion', 'Orchid', 'Sentosa', 'Katong', 'Jewel', 'Kallang'][i]}`, role.armor, role.absorption, weapons);
    const entry = members.get(id)!; entry.role = role; entry.healthMax = role.health;
    Object.assign(entry.actor, { bot: true, role: role.id, weapon: role.weaponIndex }); spawn(entry);
  }
  return { addPlayer, removePlayer, setInput, reloadPlayer, shoot, step, snapshot, reset, setPlayerLoadout, setPlayerVitals, setPlayerHealthMultiplier };
}

export type ArenaSimulation = ReturnType<typeof createArena>;
