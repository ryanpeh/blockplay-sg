/** Arcade tuning, intentionally independent of real equipment specifications. */
export type WeaponOptic = 'integrated' | 'reflex' | 'precision';
export const HIP_FOV = 65;
export const magnifiedFov = (zoom: number) => 2 * Math.atan(Math.tan(HIP_FOV * Math.PI / 360) / zoom) * 180 / Math.PI;
export const opticMagnification = (weapon: WeaponSpec) => Math.tan(HIP_FOV * Math.PI / 360) / Math.tan(weapon.aimFov * Math.PI / 360);
export interface WeaponSpec { id: string; name: string; role: string; capacity: number; reserve: number; interval: number; reload: number; recoil: number; sightHeight: number; damage: number; aimFov: number; mobility: number; optic?: WeaponOptic }
export const FPS_WEAPONS: readonly WeaponSpec[] = [
  { id: 'sar21-inspired', name: 'SAR 21', role: 'Bullpup rifle', capacity: 30, reserve: 120, interval: 0.12, reload: 1.8, recoil: 0.018, sightHeight: 0.328, damage: 36, aimFov: magnifiedFov(1.5), mobility: 1, optic: 'integrated' },
  { id: 'ultimax-inspired', name: 'Ultimax', role: 'Support weapon', capacity: 60, reserve: 180, interval: 0.085, reload: 2.5, recoil: 0.026, sightHeight: 0.28, damage: 30, aimFov: HIP_FOV, mobility: 1, optic: 'reflex' },
];

export interface WeaponState { magazine: number; reserve: number; cooldown: number; reloadRemaining: number }
export const createLoadout = (weapons = FPS_WEAPONS): WeaponState[] => weapons.map(w => ({ magazine: w.capacity, reserve: w.reserve, cooldown: 0, reloadRemaining: 0 }));
export function beginReload(state: WeaponState, index: number, weapons = FPS_WEAPONS) {
  if (state.reloadRemaining > 0 || state.reserve === 0 || state.magazine === weapons[index].capacity) return false;
  state.reloadRemaining = weapons[index].reload;
  return true;
}
export function advanceWeapon(state: WeaponState, index: number, dt: number, weapons = FPS_WEAPONS) {
  dt = Math.max(0, dt);
  state.cooldown = Math.max(0, state.cooldown - dt);
  if (state.reloadRemaining <= 0) return;
  state.reloadRemaining = Math.max(0, state.reloadRemaining - dt);
  if (state.reloadRemaining === 0) {
    const transfer = Math.min(weapons[index].capacity - state.magazine, state.reserve);
    state.magazine += transfer; state.reserve -= transfer;
  }
}
export function fireWeapon(state: WeaponState, index: number, weapons = FPS_WEAPONS) {
  if (state.magazine <= 0 || state.reloadRemaining > 0 || state.cooldown > 0) return false;
  state.magazine--; state.cooldown = weapons[index].interval; return true;
}
export function movementInput(forward: number, side: number, yaw: number, speed: number, dt: number) {
  const normal = Math.max(1, Math.hypot(forward, side));
  return { x: (-Math.sin(yaw) * forward + Math.cos(yaw) * side) / normal * speed * dt, z: (-Math.cos(yaw) * forward - Math.sin(yaw) * side) / normal * speed * dt };
}
export const FPS_SPAWN = { x: -44, z: 68, yaw: 0, pitch: -0.03 };
export const FPS_TARGETS = [
  { x: -44, z: 56 }, { x: -50, z: 57 }, { x: -38, z: 57 }, { x: -56, z: 62 },
  { x: -32, z: 62 }, { x: -60, z: 55 }, { x: -26, z: 55 }, { x: -14, z: 64 },
];
