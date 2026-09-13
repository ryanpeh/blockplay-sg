import { describe, expect, it, vi } from 'vitest';
import { ARENA_DURATION, arenaWallDistance, createArena, type ArenaActor, type ArenaEnvironment, type ArenaSimulation } from './arena-rules';
import { getArenaRole, listArenaRoles, registerArenaRole } from './arena-roles';
import { canOccupy } from './marina-collision';

const weapon = { damage: 36, interval: 0.12, capacity: 30, reload: 1.8 };
const distantEnvironment = (): ArenaEnvironment => ({
  bounds: { minX: 900, maxX: 1100, minZ: 900, maxZ: 1100 },
  spawns: [{ x: -44, z: 68 }, { x: 1000, z: 1000 }, { x: 930, z: 930 }, { x: 1070, z: 1070 }],
  move: (p, dx, dz, radius) => ({ x: Math.max(900 + radius, Math.min(1100 - radius, p.x + dx)), z: Math.max(900 + radius, Math.min(1100 - radius, p.z + dz)) }),
  endless: true, playerSpawn: { x: 1000, z: 950, yaw: 1.1, pitch: 0.1 },
});
const actor = (arena: ArenaSimulation, id: string) => arena.snapshot().actors.find(a => a.id === id)!;
function aim(shooter: ArenaActor, victim: ArenaActor) {
  const x = victim.x - shooter.x; const y = victim.y - 0.6 - shooter.y; const z = victim.z - shooter.z;
  const length = Math.hypot(x, y, z); return { x: x / length, y: y / length, z: z / length };
}
function fireAt(arena: ArenaSimulation, from = 'one', to = 'two') {
  const shooter = actor(arena, from); const victim = actor(arena, to);
  return arena.shoot(from, shooter, aim(shooter, victim), shooter.weapon);
}
function advance(arena: ArenaSimulation, seconds: number) {
  for (let remaining = seconds; remaining > 1e-8; remaining -= 0.1) arena.step(Math.min(0.1, remaining));
}
function pair(armor = 0, absorption = 0, damage = 36) {
  const arena = createArena([], 0);
  arena.addPlayer('one', 'Alpha', 0, 0, [{ ...weapon, damage }]);
  arena.addPlayer('two', 'Bravo', armor, absorption, [weapon]);
  return arena;
}

describe('expedition arena environments', () => {
  it('uses zone bounds, valid candidate spawns and delegated collision for players and bots', () => {
    const environment = distantEnvironment(); const movement = vi.fn(environment.move); environment.move = movement;
    const obstacles = [{ minX: 999, maxX: 1001, minZ: 999, maxZ: 1001 }];
    const arena = createArena(obstacles, 2, 'assault', environment);
    arena.addPlayer('traveller', 'Traveller', 75, 0.65, [weapon], { health: 44, armor: 21 }, true);
    expect(actor(arena, 'traveller')).toMatchObject({ x: 1000, z: 950, yaw: 1.1, pitch: 0.1, health: 44, armor: 21 });
    expect(arena.snapshot().actors.filter(a => a.bot).every(a => a.x >= 900 && a.z >= 900 && !(a.x === 1000 && a.z === 1000))).toBe(true);
    arena.setInput('traveller', { ...actor(arena, 'traveller'), x: 99999, playing: true }); arena.step(0.1);
    expect(movement.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(movement.mock.calls.every(call => call[0].x >= 900)).toBe(true);
    expect(actor(arena, 'traveller').x).toBeLessThan(1100);
  });
  it('continues beyond both the arena kill limit and its three-minute clock', () => {
    const environment: ArenaEnvironment = { ...distantEnvironment(), bounds: { minX: -80, maxX: 20, minZ: 50, maxZ: 90 }, spawns: [{ x: -44, z: 68 }, { x: 4, z: 74 }], move: p => p };
    const arena = createArena([], 0, 'mixed', environment);
    arena.addPlayer('one', 'Alpha', 0, 0, [{ ...weapon, damage: 100 }]); arena.addPlayer('two', 'Bravo');
    for (let i = 0; i < 16; i++) { expect(fireAt(arena).killed).toBe(true); advance(arena, 3.1); }
    advance(arena, ARENA_DURATION + 1);
    expect(actor(arena, 'one').kills).toBe(16); expect(arena.snapshot().finished).toBe(false); expect(arena.snapshot().elapsed).toBeGreaterThan(ARENA_DURATION);
  });
  it('changes carried equipment without resetting actors, scores, damage or existing armor durability', () => {
    const arena = pair(0, 0, 100); fireAt(arena); advance(arena, 3.1);
    arena.setPlayerVitals('one', { health: 44 });
    const before = actor(arena, 'one');
    arena.setPlayerLoadout('one', 100, 0.72, [{ ...weapon, damage: 42 }]);
    expect(actor(arena, 'one')).toEqual(before);
    expect(fireAt(arena).damage).toBe(42);
    arena.setPlayerVitals('one', { health: 500, armor: 500 });
    expect(actor(arena, 'one')).toMatchObject({ health: 100, armor: 100, kills: 1 });
    arena.setPlayerLoadout('one', 35, 0.45, [weapon]); expect(actor(arena, 'one').armor).toBe(35);
  });
});

describe('host-authoritative arena', () => {
  it('assigns clear separated spawns and returns detached snapshots', () => {
    const arena = pair(); const snapshot = arena.snapshot();
    expect(Math.hypot(snapshot.actors[0].x - snapshot.actors[1].x, snapshot.actors[0].z - snapshot.actors[1].z)).toBeGreaterThan(15);
    snapshot.actors[0].health = 0; snapshot.feed[0].text = 'corrupted';
    expect(actor(arena, 'one').health).toBe(100);
    expect(arena.snapshot().feed[0].text).toContain('joined');
  });
  it('uses host damage and armor, refuses cooldown spam and unselected weapons', () => {
    const arena = pair(10, 0.5);
    expect(fireAt(arena)).toEqual({ hitId: 'two', killed: false, damage: 26 });
    expect(actor(arena, 'two').armor).toBe(0); expect(actor(arena, 'two').health).toBe(74);
    expect(fireAt(arena).hitId).toBeNull();
    arena.step(0.13);
    const shooter = actor(arena, 'one');
    expect(arena.shoot('one', shooter, aim(shooter, actor(arena, 'two')), 9).hitId).toBeNull();
    expect(fireAt(arena).damage).toBe(36);
  });
  it('rejects spoofed shot origins, invalid vectors, non-finite input and teleport spam', () => {
    const arena = pair(); const start = actor(arena, 'one'); const victim = actor(arena, 'two');
    expect(arena.shoot('one', victim, aim(start, victim), 0).hitId).toBeNull();
    expect(arena.shoot('one', start, { x: Infinity, y: 0, z: 0 }, 0).hitId).toBeNull();
    arena.setInput('one', { ...start, x: NaN, playing: true }); expect(actor(arena, 'one').x).toBe(start.x);
    for (let i = 0; i < 20; i++) arena.setInput('one', { ...start, x: 10000, playing: true });
    expect(actor(arena, 'one').x - start.x).toBeLessThanOrEqual(2.001);
    arena.step(0.25);
    arena.setInput('one', { ...start, x: 10000, playing: true });
    expect(actor(arena, 'one').x - start.x).toBeLessThanOrEqual(10.001);
  });
  it('blocks shots through walls but lets a high ray clear low cover', () => {
    const wall = { minX: -26, maxX: -24, minZ: 0, maxZ: 100, maxY: 5 };
    const arena = createArena([wall], 0); arena.addPlayer('one', 'Alpha'); arena.addPlayer('two', 'Bravo');
    expect(fireAt(arena).hitId).toBeNull(); expect(actor(arena, 'two').health).toBe(100);
    expect(arenaWallDistance({ x: 0, y: 2, z: 0 }, { x: 1, y: 0, z: 0 }, [{ minX: 2, maxX: 4, minZ: -2, maxZ: 2, maxY: 1 }])).toBe(Infinity);
    expect(arenaWallDistance({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0, z: 0 }, [{ minX: 2, maxX: 4, minZ: -2, maxZ: 2, maxY: 1 }])).toBe(2);
  });
  it('counts each elimination once, exposes kill metadata and restores health after respawn', () => {
    const arena = pair(0, 0, 100);
    expect(fireAt(arena).killed).toBe(true);
    expect(actor(arena, 'one').kills).toBe(1); expect(actor(arena, 'two')).toMatchObject({ alive: false, deaths: 1, respawnIn: 3 });
    expect(arena.snapshot().feed.at(-1)).toMatchObject({ killerId: 'one', victimId: 'two' });
    arena.step(0.2); expect(fireAt(arena).killed).toBe(false);
    advance(arena, 2.9); expect(actor(arena, 'two')).toMatchObject({ alive: true, health: 100, deaths: 1, respawnIn: 0 });
  });
  it('paused players cannot fire but remain vulnerable to the continuing match', () => {
    const arena = pair(); const player = actor(arena, 'one');
    arena.setInput('one', { ...player, playing: false });
    expect(fireAt(arena).hitId).toBeNull(); expect(fireAt(arena, 'two', 'one').hitId).toBe('one');
    advance(arena, 1); expect(arena.snapshot().elapsed).toBeGreaterThan(0.9);
  });
  it('enforces magazine reload downtime on the host', () => {
    const arena = pair(); arena.removePlayer('one'); arena.addPlayer('one', 'Alpha', 0, 0, [{ ...weapon, capacity: 1, reload: 0.8 }]);
    expect(fireAt(arena).hitId).toBe('two');
    advance(arena, 0.4); expect(fireAt(arena).hitId).toBeNull();
    advance(arena, 0.5); expect(fireAt(arena).hitId).toBe('two');
  });
  it('supports a tactical reload request and does not restart it every input frame', () => {
    const arena = pair(); fireAt(arena);
    const player = actor(arena, 'one');
    arena.setInput('one', { ...player, playing: true, reloading: true });
    advance(arena, 0.9); expect(fireAt(arena).hitId).toBeNull();
    arena.setInput('one', { ...player, playing: true, reloading: true });
    advance(arena, 1); expect(fireAt(arena).hitId).toBe('two');
  });
  it('accepts a rendered-cover distance only as a further restriction', () => {
    const arena = pair(); const shooter = actor(arena, 'one'); const victim = actor(arena, 'two');
    expect(arena.shoot('one', shooter, aim(shooter, victim), 0, 1).hitId).toBeNull();
    advance(arena, 0.2);
    expect(arena.shoot('one', shooter, aim(shooter, victim), 0, Number.NaN).hitId).toBeNull();
    expect(actor(arena, 'two').health).toBe(100);
  });
  it('ends at 15 eliminations, stops damage and resets the match', () => {
    const arena = pair(0, 0, 100);
    for (let i = 0; i < 15; i++) { expect(fireAt(arena).killed).toBe(true); if (i < 14) advance(arena, 3.1); }
    expect(arena.snapshot()).toMatchObject({ finished: true, winner: 'Alpha' });
    const elapsed = arena.snapshot().elapsed; arena.step(0.2); expect(arena.snapshot().elapsed).toBe(elapsed);
    arena.reset(); expect(arena.snapshot()).toMatchObject({ elapsed: 0, finished: false, winner: '' });
    expect(actor(arena, 'one').kills).toBe(0); expect(actor(arena, 'two').alive).toBe(true);
  });
  it('ends at the time limit and removes disconnected players', () => {
    const arena = pair(); arena.removePlayer('two'); expect(arena.snapshot().actors).toHaveLength(1);
    advance(arena, ARENA_DURATION + 0.2); expect(arena.snapshot()).toMatchObject({ finished: true, winner: 'Alpha', elapsed: 180 });
  });
  it('caps bots at six, moves them on clear land and allows them to attack', () => {
    const arena = createArena([], 100); const initial = arena.snapshot().actors;
    expect(initial).toHaveLength(6); advance(arena, 5);
    const updated = arena.snapshot().actors;
    expect(updated.some((a, i) => Math.hypot(a.x - initial[i].x, a.z - initial[i].z) > 0.5)).toBe(true);
    expect(updated.every(a => canOccupy(a.x, a.z, 0.35, []))).toBe(true);
    expect(updated.reduce((sum, a) => sum + a.shots, 0)).toBeGreaterThan(0);
    expect(updated.some(a => a.health < 100 || a.deaths > 0 || a.armor < 10)).toBe(true);
  });
  it('bots do not fire through scenery and spawn outside obstacles', () => {
    const walls = [{ minX: -26, maxX: -24, minZ: -100, maxZ: 200, maxY: 10 }];
    const arena = createArena(walls, 2, 'assault'); advance(arena, 10);
    for (const bot of arena.snapshot().actors) { expect(bot.shots).toBe(0); expect(bot.health).toBe(100); expect(canOccupy(bot.x, bot.z, 0.35, walls)).toBe(true); }
  });
});

describe('bot role plugins', () => {
  const context = { distance: 12, visible: true, healthFraction: 1, strafeDirection: 1 };
  it('gives tanks heavier armor, slower speed and support weapons', () => {
    const assault = getArenaRole('assault')!; const tank = getArenaRole('tank')!;
    expect(tank.armor).toBeGreaterThan(assault.armor); expect(tank.health).toBeGreaterThan(assault.health);
    expect(tank.speed).toBeLessThan(assault.speed); expect(tank.weaponIndex).toBe(1);
    const arena = createArena([], 2, 'tank');
    expect(arena.snapshot().actors.every(a => a.role === 'tank' && a.health === 130 && a.armor === 100 && a.weapon === 1)).toBe(true);
  });
  it('makes snipers retreat while tanks advance and assault bots flank', () => {
    const sniper = getArenaRole('sniper')!.think(context); const tank = getArenaRole('tank')!.think(context); const assault = getArenaRole('assault')!.think(context);
    expect(sniper.approach).toBeLessThan(0); expect(tank.approach).toBeGreaterThan(0); expect(assault.approach).toBe(0);
    expect(Math.abs(assault.strafe)).toBeGreaterThan(Math.abs(tank.strafe));
    expect(sniper.shotDelay).toBeGreaterThan(tank.shotDelay); expect(sniper.spread).toBeLessThan(assault.spread);
    expect(getArenaRole('sniper')!.think({ ...context, distance: 40 })).toMatchObject({ approach: 0, strafe: 0 });
  });
  it('builds a mixed squad with all three roles and suppresses fire without sight', () => {
    expect(createArena([], 3).snapshot().actors.map(a => a.role)).toEqual(['assault', 'tank', 'sniper']);
    for (const role of listArenaRoles()) expect(role.think({ ...context, visible: false }).fire).toBe(false);
  });
  it('allows a local role plugin to change simulated behavior and rejects duplicate or invalid registration', () => {
    const guard = { ...getArenaRole('assault')!, id: 'test-guard', name: 'Guard', think: () => ({ approach: 0, strafe: 0, fire: false, shotDelay: 1, spread: 0.1 }) };
    registerArenaRole(guard); expect(() => registerArenaRole(guard)).toThrow(/unique/);
    expect(() => registerArenaRole({ ...guard, id: 'invalid-role', speed: Infinity })).toThrow(/finite/);
    const arena = createArena([], 2, 'test-guard'); const before = arena.snapshot().actors; advance(arena, 10);
    expect(arena.snapshot().actors.map(a => ({ x: a.x, z: a.z, shots: a.shots }))).toEqual(before.map(a => ({ x: a.x, z: a.z, shots: 0 })));
  });
});
