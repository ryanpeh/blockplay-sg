import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createArenaRuntime, validArenaInput, validArenaSnapshot } from './arena-runtime';
import { createArena, type ArenaInput } from './arena-rules';
import { createProfile } from './armory-state';
import type { LanSession } from './lan-peer';
import { createSoloSession } from './lan-peer';
import { MARINA_BOUNDS, moveInMarina } from './marina-collision';

function localPair() {
  const handlers = [new Set<(from: string, packet: unknown) => void>(), new Set<(from: string, packet: unknown) => void>()];
  const sessions: LanSession[] = [0, 1].map(index => ({
    id: index ? 'guest' : 'host', role: index ? 'guest' : 'host', name: index ? 'Guest' : 'Host',
    send(payload: unknown) { for (const callback of handlers[1 - index]) callback(index ? 'guest' : 'host', payload); },
    subscribe(callback) { handlers[index].add(callback); return () => { handlers[index].delete(callback); }; },
    getPeers: () => [{ id: index ? 'host' : 'guest', name: index ? 'Host' : 'Guest' }], onPeers: () => () => {}, close() {},
  }));
  return sessions;
}
const input = (x = -44, z = 68, playing = false): ArenaInput => ({ x, y: 1.75, z, yaw: 0, pitch: 0, weapon: 0, playing });
afterEach(() => vi.useRealTimers());

describe('arena runtime authority and renderer bridge', () => {
  it('carries solo vitals to a zone arrival and applies loot without recreating bots or restoring health', () => {
    vi.useFakeTimers();
    const session = createSoloSession('Explorer');
    const profile = createProfile(); profile.owned.push('plate-ceramic'); profile.plate = 'plate-ceramic';
    const runtime = createArenaRuntime({ scene: new THREE.Scene(), session, obstacles: [], profile, botCount: 1,
      initialVitals: { health: 44, armor: 21 }, environment: { bounds: MARINA_BOUNDS, move: moveInMarina, spawns: [{ x: -44, z: 68 }, { x: 4, z: 74 }], endless: true, playerSpawn: { x: -20, z: 70, yaw: 1.2, pitch: 0.1 } } });
    try {
      const before = runtime.update(0.02, input());
      expect(before.self).toMatchObject({ x: -20, z: 70, yaw: 1.2, pitch: 0.1, health: 44, armor: 21 });
      const next = { ...profile, owned: [...profile.owned, 'sar-vanguard'], guns: [{ ...profile.guns[0], variant: 'sar-vanguard' }, profile.guns[1]] as typeof profile.guns };
      expect(runtime.updateLoadout(next)).toBe(true);
      const after = runtime.update(0.02, input(-20, 70));
      expect(after.self).toEqual(before.self); expect(after.snapshot?.actors.find(a => a.bot)).toEqual(before.snapshot?.actors.find(a => a.bot));
      expect(runtime.setVitals({ health: 200, armor: 200 })).toBe(true);
      expect(runtime.update(0.02, input(-20, 70)).self).toMatchObject({ health: 100, armor: 75 });
    } finally { runtime.dispose(); }
  });
  it('rejects malformed input and snapshots before they reach scene geometry', () => {
    expect(validArenaInput(input())).toBe(true);
    expect(validArenaInput({ ...input(), x: NaN })).toBe(false);
    expect(validArenaInput({ ...input(), weapon: 30 })).toBe(false);
    const snapshot = createArena([], 1).snapshot();
    expect(validArenaSnapshot(snapshot)).toBe(true);
    expect(validArenaSnapshot({ ...snapshot, actors: [...snapshot.actors, snapshot.actors[0]] })).toBe(false);
    expect(validArenaSnapshot({ ...snapshot, actors: [{ ...snapshot.actors[0], health: Infinity }] })).toBe(false);
  });
  it('adopts authoritative spawns, waits for host start, and keeps ticking while the host pauses', () => {
    vi.useFakeTimers();
    const [hostSession, guestSession] = localPair();
    const hostScene = new THREE.Scene(); const guestScene = new THREE.Scene();
    const host = createArenaRuntime({ scene: hostScene, session: hostSession, obstacles: [], botCount: 0 });
    const guest = createArenaRuntime({ scene: guestScene, session: guestSession, obstacles: [], botCount: 0 });
    try {
      const first = host.update(0.02, input(200, 200)); expect(first.spawn).toBe(true); expect(first.self?.x).toBe(-44);
      const joining = guest.update(0.02, input(200, 200, true));
      expect(joining.spawn).toBe(true); expect(joining.self?.x).not.toBe(200); expect(joining.started).toBe(false);
      vi.advanceTimersByTime(500); expect(host.update(0.02, input()).snapshot?.elapsed).toBe(0);
      host.update(0.02, input(-44, 68, true)); vi.advanceTimersByTime(1000);
      const active = host.update(0.02, input()); expect(active.snapshot!.elapsed).toBeGreaterThan(0.9);
      vi.advanceTimersByTime(1000); const paused = host.update(0.02, input());
      expect(paused.snapshot!.elapsed).toBeGreaterThan(1.9);
      expect(guest.update(0.02, input(joining.self!.x, joining.self!.z)).snapshot?.actors).toHaveLength(2);
      expect(hostScene.children.some(child => child.userData.arenaActorId === 'guest')).toBe(true);
    } finally { host.dispose(); guest.dispose(); }
    expect(hostScene.children).toHaveLength(0); expect(guestScene.children).toHaveLength(0);
  });
  it('ignores custom client damage and checks actual host scene cover for guest shots', () => {
    vi.useFakeTimers();
    const [hostSession, guestSession] = localPair();
    const scene = new THREE.Scene();
    const host = createArenaRuntime({ scene, session: hostSession, obstacles: [], botCount: 0 });
    try {
      host.update(0.02, input()); host.update(0.02, input(-44, 68, true));
      guestSession.send({ type: 'arena-hello', profile: { ...createProfile(), weapons: [{ damage: 99999 }] } });
      let state = host.update(0.02, input(-44, 68, true));
      const target = state.self!; const attacker = state.snapshot!.actors.find(actor => actor.id === 'guest')!;
      guestSession.send({ type: 'arena-input', input: { ...input(attacker.x, attacker.z, true) } });
      const vector = new THREE.Vector3(target.x - attacker.x, target.y - 0.65 - attacker.y, target.z - attacker.z).normalize();
      const cover = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), new THREE.MeshBasicMaterial());
      cover.position.set((target.x + attacker.x) / 2, 2, (target.z + attacker.z) / 2); scene.add(cover);
      guestSession.send({ type: 'arena-shot', origin: attacker, direction: vector, weapon: 0, maxDistance: 125 });
      expect(host.update(0.02, input(-44, 68, true)).self?.health).toBe(100);
      scene.remove(cover); cover.geometry.dispose(); (cover.material as THREE.Material).dispose();
      vi.advanceTimersByTime(200);
      guestSession.send({ type: 'arena-shot', origin: attacker, direction: vector, weapon: 0, maxDistance: 125 });
      state = host.update(0.02, input(-44, 68, true));
      expect(state.self?.health).toBe(64);
    } finally { host.dispose(); }
  });
  it('flushes a weapon switch before a guest shot so the first shot uses the selected catalog weapon', () => {
    vi.useFakeTimers();
    const [hostSession, guestSession] = localPair();
    const host = createArenaRuntime({ scene: new THREE.Scene(), session: hostSession, obstacles: [], botCount: 0 });
    const guest = createArenaRuntime({ scene: new THREE.Scene(), session: guestSession, obstacles: [], botCount: 0 });
    try {
      host.update(0.02, input()); host.update(0.02, input(-44, 68, true));
      const joined = guest.update(0.02, input());
      const shooter = joined.self!;
      guest.update(0.02, input(shooter.x, shooter.z, true));
      const target = host.update(0.02, input(-44, 68, true)).self!;
      const direction = new THREE.Vector3(target.x - shooter.x, target.y - 0.65 - shooter.y, target.z - shooter.z).normalize();
      guest.shoot(shooter, direction, 1);
      expect(host.update(0.02, input(-44, 68, true)).self?.health).toBe(70);
      expect(guest.update(0.02, input(shooter.x, shooter.z, true)).hit?.damage).toBe(30);
    } finally { host.dispose(); guest.dispose(); }
  });
  it('ignores hidden vehicle geometry and label sprites when firing an authority world-space ray', () => {
    vi.useFakeTimers();
    const [hostSession, guestSession] = localPair();
    const scene = new THREE.Scene();
    const hiddenVehicle = new THREE.Group(); hiddenVehicle.visible = false;
    const hiddenLabel = new THREE.Sprite(new THREE.SpriteMaterial()); hiddenVehicle.add(hiddenLabel);
    const hiddenBody = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshBasicMaterial()); hiddenVehicle.add(hiddenBody);
    const visibleLabel = new THREE.Sprite(new THREE.SpriteMaterial());
    const hiddenRay = vi.spyOn(hiddenLabel, 'raycast'); const visibleRay = vi.spyOn(visibleLabel, 'raycast');
    scene.add(hiddenVehicle, visibleLabel);
    const host = createArenaRuntime({ scene, session: hostSession, obstacles: [], botCount: 0 });
    try {
      host.update(0.02, input()); host.update(0.02, input(-44, 68, true));
      guestSession.send({ type: 'arena-hello', profile: createProfile() });
      const state = host.update(0.02, input(-44, 68, true));
      const shooter = state.self!; const target = state.snapshot!.actors.find(actor => actor.id === 'guest')!;
      hiddenVehicle.position.set((shooter.x + target.x) / 2, 1.5, (shooter.z + target.z) / 2);
      visibleLabel.position.copy(hiddenVehicle.position);
      const direction = new THREE.Vector3(target.x - shooter.x, target.y - 0.65 - shooter.y, target.z - shooter.z).normalize();
      expect(() => host.shoot(shooter, direction, 0)).not.toThrow();
      const after = host.update(0.02, input(-44, 68, true));
      expect(after.snapshot!.actors.find(actor => actor.id === 'guest')?.health).toBe(64);
      expect(after.hit?.damage).toBe(36);
      expect(hiddenRay).not.toHaveBeenCalled(); expect(visibleRay).not.toHaveBeenCalled();
    } finally {
      host.dispose(); hiddenRay.mockRestore(); visibleRay.mockRestore();
      hiddenLabel.material.dispose(); visibleLabel.material.dispose(); hiddenBody.geometry.dispose(); hiddenBody.material.dispose();
    }
  });
});
