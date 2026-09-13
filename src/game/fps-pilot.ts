/** Controller contract: no scene objects, authoritative actors, or hidden coordinates. */
export type PilotGoal = 'engage' | 'resupply' | 'travel' | 'explore';
export interface PilotContact { id: string; yawError: number; pitchError: number; angularRadius: number }
export interface PilotWaypoint { id: string; x: number; z: number; kind: 'medical' | 'ammo' | 'armor' | 'weapon' | 'checkpoint' | 'target' }
export interface PilotObservation {
  time: number; alive: boolean; health: number; maxHealth: number; armor: number;
  magazine: number; reserve: number; reloading: boolean; aiming: boolean; weapon: number;
  position: { x: number; z: number }; yaw: number; pitch: number;
  contacts: readonly PilotContact[]; waypoints: readonly PilotWaypoint[];
  lootPrompt: string; travelPrompt: string;
}
export interface PilotAction {
  forward?: boolean; backward?: boolean; left?: boolean; right?: boolean;
  sprint?: boolean; crouch?: boolean; aim?: boolean; fire?: boolean;
  lookX?: number; lookY?: number; reload?: boolean; jump?: boolean;
  interact?: boolean; travel?: boolean; weapon?: 0 | 1;
  callout?: 'contact' | 'moving' | 'stuck';
}
export interface PilotDecision { goal: PilotGoal; status: string; action: PilotAction }
/** A future strategic planner chooses intentions; only this action path drives the player. */
export interface PilotPlanner { chooseGoal(observation: Readonly<PilotObservation>): PilotGoal; preferredWaypoint?(): string | null }
export interface PlayerPilot { decide(observation: Readonly<PilotObservation>): PilotDecision; reset(): void }
export const PILOT_INTERVAL = .1;
export const MAX_PILOT_MOUSE_DELTA = 100;
const finiteDelta = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(-MAX_PILOT_MOUSE_DELTA, Math.min(MAX_PILOT_MOUSE_DELTA, value)) : 0;
export function normalizePilotAction(action: PilotAction): PilotAction {
  const safe: PilotAction = { lookX: finiteDelta(action.lookX), lookY: finiteDelta(action.lookY) };
  for (const key of ['forward', 'backward', 'left', 'right', 'sprint', 'crouch', 'aim', 'fire', 'reload', 'jump', 'interact', 'travel'] as const) safe[key] = action[key] === true;
  if (action.weapon === 0 || action.weapon === 1) safe.weapon = action.weapon;
  if (action.callout === 'contact' || action.callout === 'moving' || action.callout === 'stuck') safe.callout = action.callout;
  return safe;
}
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
export const localPilotPlanner: PilotPlanner = {
  chooseGoal(o) {
    if (o.contacts.length && o.magazine > 0 && !o.reloading) return 'engage';
    if (o.health < o.maxHealth * .65 || o.reserve < 20) return 'resupply';
    if (o.waypoints.some(p => p.kind === 'checkpoint')) return 'travel';
    return 'explore';
  },
};

/** Local finite-state pilot. Memory contains only prior observations and attempted movement. */
export function createPlayerPilot(planner: PilotPlanner = localPilotPlanner): PlayerPilot {
  let target = '', seenSince = 0, lastSeenAt = -Infinity, lastPosition: PilotObservation['position'] | undefined;
  let adsBlockedUntil = 0;
  let stuck = 0, moving = false, evadeUntil = 0, previousTime = 0;
  const reset = () => { target = ''; seenSince = 0; lastSeenAt = -Infinity; adsBlockedUntil = 0; lastPosition = undefined; stuck = 0; moving = false; evadeUntil = 0; previousTime = 0; };
  return { reset, decide(o) {
    const dt = Math.min(.25, Math.max(0, o.time - previousTime)); previousTime = o.time;
    const goal = planner.chooseGoal(o);
    const result = (status: string, action: PilotAction): PilotDecision => {
      moving = !!(action.forward || action.backward || action.left || action.right);
      lastPosition = { ...o.position };
      return { goal, status, action: normalizePilotAction(action) };
    };
    if (!o.alive) { reset(); return result('Waiting to respawn', {}); }
    if (moving && lastPosition && Math.hypot(o.position.x - lastPosition.x, o.position.z - lastPosition.z) < .04) stuck += dt;
    else stuck = 0;
    if (stuck > .8) { evadeUntil = o.time + 1.2; stuck = 0; }
    if (!o.magazine && o.reserve) return result('Reloading', { reload: !o.reloading });
    if (!o.magazine && !o.reserve && o.weapon === 0) return result('Trying support weapon', { weapon: 1 });
    const nearSupply = [...o.waypoints].filter(p => !['checkpoint', 'target'].includes(p.kind) && Math.hypot(p.x - o.position.x, p.z - o.position.z) <= 2.8)
      .sort((a, b) => Math.hypot(a.x - o.position.x, a.z - o.position.z) - Math.hypot(b.x - o.position.x, b.z - o.position.z))[0];
    const canUseSupply = nearSupply && !(nearSupply.kind === 'medical' && o.health >= o.maxHealth) && !(nearSupply.kind === 'ammo' && o.reserve >= 999);
    if (o.lootPrompt && canUseSupply && !o.contacts.length) return result('Taking nearby supplies', { interact: true });
    // Raising the scope can briefly cover the current target. Hold the view rather
    // than snapping to a peripheral contact; do not shoot or track through cover.
    if (target && o.aiming && !o.contacts.some(c => c.id === target) && !o.reloading) {
      if (o.time - lastSeenAt < .6) return result('Checking sight picture', { aim: true });
      // If the sight still hides the target, reacquire at hip for a full burst.
      // Immediately raising it again would recreate the same visibility loop.
      adsBlockedUntil = o.time + 3; target = '';
      return result('Reacquiring without scope', {});
    }
    const contact = o.contacts.find(c => c.id === target) ?? [...o.contacts].sort((a, b) => Math.hypot(a.yawError, a.pitchError) - Math.hypot(b.yawError, b.pitchError))[0];
    if (contact && o.magazine > 0 && !o.reloading) {
      lastSeenAt = o.time;
      if (target !== contact.id) { target = contact.id; seenSince = o.time; }
      const sensitivity = o.aiming ? .0013 : .0023;
      const aligned = Math.hypot(contact.yawError, contact.pitchError) < Math.max(.004, Math.min(.025, contact.angularRadius * .65));
      return result('Engaging visible target', {
        callout: 'contact', lookX: -contact.yawError / sensitivity * .7, lookY: -contact.pitchError / sensitivity * .7,
        aim: o.time >= adsBlockedUntil && Math.hypot(contact.yawError, contact.pitchError) < (o.aiming ? .15 : .035), fire: aligned && o.time - seenSince >= .35,
      });
    }
    target = ''; // Never track an enemy once it leaves view.
    if (o.aiming && o.time - lastSeenAt < .45 && !o.reloading) return result('Checking sight picture', { aim: true });
    if (o.reloading) return result('Reloading', {});
    if (o.magazine < 5 && o.reserve) return result('Reloading before moving', { reload: true });
    if (o.time < evadeUntil) return result('Finding a way around cover', { callout: 'stuck', backward: true, right: true, lookX: 50 });
    const preferred = planner.preferredWaypoint?.();
    const priority = (p: PilotWaypoint) => {
      if (p.id === preferred) return -1;
      if (goal === 'resupply' && p.kind === 'medical' && o.health < o.maxHealth * .65) return 0;
      if (goal === 'resupply' && p.kind === 'ammo' && o.reserve < 20) return 0;
      if (goal === 'travel' && p.kind === 'checkpoint') return 0;
      return 1;
    };
    const waypoint = [...o.waypoints].filter(p => !(p.kind === 'medical' && o.health >= o.maxHealth) && !(p.kind === 'ammo' && o.reserve >= 999))
      .sort((a, b) => priority(a) - priority(b) || Math.hypot(a.x - o.position.x, a.z - o.position.z) - Math.hypot(b.x - o.position.x, b.z - o.position.z))[0];
    if (waypoint) {
      if (waypoint.kind === 'checkpoint' && o.travelPrompt) return result('Crossing checkpoint', { travel: true });
      const dx = waypoint.x - o.position.x, dz = waypoint.z - o.position.z;
      const turn = wrapAngle(Math.atan2(-dx, -dz) - o.yaw);
      return result(waypoint.kind === 'checkpoint' ? 'Following planned route' : 'Searching for supplies and targets', {
        callout: 'moving', lookX: -turn / .0023 * .65, lookY: o.pitch / .0023 * .5,
        forward: Math.abs(turn) < .5, sprint: goal === 'travel' && Math.abs(turn) < .15,
      });
    }
    return result('Scanning and patrolling', { forward: true, lookX: 15, lookY: o.pitch / .0023 * .5 });
  } };
}
