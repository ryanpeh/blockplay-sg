export interface FpsDebugSettings { healthMultiplier: 1 | 5 | 10; regeneration: boolean }
export const DEFAULT_FPS_DEBUG: FpsDebugSettings = { healthMultiplier: 1, regeneration: false };
export const FPS_REGEN_DELAY = 3;
const key = 'blockplay.fps-debug.v1';
export function normalizeFpsDebug(value: Partial<FpsDebugSettings>): FpsDebugSettings {
  return { healthMultiplier: value.healthMultiplier === 5 ? 5 : value.healthMultiplier === 10 ? 10 : 1, regeneration: value.regeneration === true };
}
export function readFpsDebug(): FpsDebugSettings {
  try { return normalizeFpsDebug(JSON.parse(sessionStorage.getItem(key) || '{}') ?? {}); }
  catch { return { ...DEFAULT_FPS_DEBUG }; }
}
export function saveFpsDebug(value: FpsDebugSettings) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
export function regenerateHealth(health: number, maximum: number, dt: number) {
  return health > 0 ? Math.min(maximum, health + maximum * .1 * Math.max(0, Math.min(dt, .1))) : 0;
}
