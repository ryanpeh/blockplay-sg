export interface WeaponBloom { amount: number; delay: number }
const maximum = [.028, .038], perShot = [.003, .004];
export const createWeaponBloom = (): WeaponBloom => ({ amount: 0, delay: 0 });
export function recordBloomShot(state: WeaponBloom, weapon: number) {
  state.amount = Math.min(maximum[weapon] ?? maximum[0], state.amount + (perShot[weapon] ?? perShot[0]));
  state.delay = .2;
}
export function advanceBloom(state: WeaponBloom, dt: number) {
  const elapsed = Math.max(0, Math.min(dt, .1));
  const recovering = Math.max(0, elapsed - state.delay);
  state.delay = Math.max(0, state.delay - elapsed);
  state.amount = Math.max(0, state.amount - recovering * .025);
}
/** Cone half-angle in radians; the HUD projects this same cone into screen pixels. */
export function weaponSpread(state: WeaponBloom, weapon: number, aim: number, crouching: boolean, moving: boolean) {
  const aiming = Math.max(0, Math.min(1, aim));
  return ((weapon ? .007 : .005) + state.amount + (moving ? .007 : 0)) * (1 - aiming * .80) * (crouching ? .65 : 1);
}
export function sampleShotSpread(angle: number, random: () => number = Math.random) {
  const radius = Math.sqrt(random()) * Math.tan(angle), theta = random() * Math.PI * 2;
  return { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius };
}
