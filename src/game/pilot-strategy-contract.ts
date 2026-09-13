import type { PilotGoal, PilotObservation } from './fps-pilot';
export const PILOT_GOALS: readonly PilotGoal[] = ['engage', 'resupply', 'travel', 'explore'];
export interface PilotPlan { goal: PilotGoal; waypointId: string | null; summary: string }
export interface PilotStrategy { id: string; plan(observation: Readonly<PilotObservation>, signal: AbortSignal): Promise<PilotPlan> }
export function validPilotPlan(value: unknown, observation: PilotObservation): value is PilotPlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as PilotPlan;
  return PILOT_GOALS.includes(p.goal) && typeof p.summary === 'string' && p.summary.length > 0 && p.summary.length <= 180 &&
    (p.waypointId === null || observation.waypoints.some(w => w.id === p.waypointId));
}
/** Whitelist the public observation. Even an augmented request cannot leak extra engine fields to a strategy. */
export function parsePilotObservation(value: unknown): PilotObservation | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as PilotObservation;
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e9;
  if (!['time', 'health', 'maxHealth', 'armor', 'magazine', 'reserve', 'weapon', 'yaw', 'pitch'].every(k => finite(o[k as keyof PilotObservation])) ||
    !o.position || !finite(o.position.x) || !finite(o.position.z) || ![0, 1].includes(o.weapon) ||
    !['alive', 'reloading', 'aiming'].every(k => typeof o[k as keyof PilotObservation] === 'boolean') ||
    typeof o.lootPrompt !== 'string' || o.lootPrompt.length > 180 || typeof o.travelPrompt !== 'string' || o.travelPrompt.length > 180 ||
    !Array.isArray(o.contacts) || o.contacts.length > 20 || !Array.isArray(o.waypoints) || o.waypoints.length > 40) return null;
  const id = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 100;
  if (!o.contacts.every(c => c && id(c.id) && finite(c.yawError) && finite(c.pitchError) && finite(c.angularRadius)) ||
    !o.waypoints.every(w => w && id(w.id) && finite(w.x) && finite(w.z) && ['medical', 'ammo', 'armor', 'weapon', 'checkpoint', 'target'].includes(w.kind))) return null;
  return { time: o.time, alive: o.alive, health: o.health, maxHealth: o.maxHealth, armor: o.armor, magazine: o.magazine, reserve: o.reserve,
    reloading: o.reloading, aiming: o.aiming, weapon: o.weapon, position: { x: o.position.x, z: o.position.z }, yaw: o.yaw, pitch: o.pitch,
    contacts: o.contacts.map(c => ({ id: c.id, yawError: c.yawError, pitchError: c.pitchError, angularRadius: c.angularRadius })),
    waypoints: o.waypoints.map(w => ({ id: w.id, x: w.x, z: w.z, kind: w.kind })), lootPrompt: o.lootPrompt, travelPrompt: o.travelPrompt };
}
