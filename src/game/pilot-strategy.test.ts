import { expect, it, vi } from 'vitest';
import { createStrategyPlanner, llmPilotStrategy } from './pilot-strategy';
import { parsePilotObservation, validPilotPlan, type PilotPlan } from './pilot-strategy-contract';
import type { PilotObservation } from './fps-pilot';
const observation: PilotObservation = { time: 1, alive: true, health: 100, maxHealth: 100, armor: 0, magazine: 30, reserve: 120, weapon: 0,
  reloading: false, aiming: false, position: { x: 0, z: 0 }, yaw: 0, pitch: 0, contacts: [], waypoints: [], lootPrompt: '', travelPrompt: '' };
const plan: PilotPlan = { goal: 'explore', waypointId: null, summary: 'Scout for supplies' };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
it('uses local planning while a strategy is pending, throttles calls and cancels stale replies', async () => {
  let finish!: (p: PilotPlan) => void, clock = 0;
  const strategy = { id: 'test', plan: vi.fn((_o, _signal) => new Promise<PilotPlan>(resolve => { finish = resolve; })) };
  const planner = createStrategyPlanner(strategy, () => clock);
  expect(planner.chooseGoal(observation)).toBe('explore'); planner.chooseGoal(observation); expect(strategy.plan).toHaveBeenCalledOnce();
  planner.reset(); expect(strategy.plan.mock.calls[0][1].aborted).toBe(true);
  finish({ ...plan, goal: 'resupply' }); await flush();
  expect(planner.chooseGoal(observation)).toBe('explore');
  finish({ ...plan, goal: 'resupply' }); await flush(); expect(planner.chooseGoal(observation)).toBe('resupply');
  clock = 25000; expect(planner.chooseGoal(observation)).toBe('explore'); planner.reset();
});
it('falls back after service errors and rejects invented waypoints', async () => {
  const planner = createStrategyPlanner({ id: 'broken', plan: async () => { throw new Error('Unavailable'); } });
  planner.chooseGoal(observation); await flush();
  expect(planner.status()).toContain('local fallback'); expect(planner.chooseGoal(observation)).toBe('explore');
  expect(validPilotPlan({ ...plan, waypointId: 'hidden-enemy' }, observation)).toBe(false);
  planner.reset();
});
it('whitelists observations and keeps private actor fields out of model input', () => {
  const parsed = parsePilotObservation({ ...observation, arena: { actors: ['hidden'] }, contacts: [{ id: 'seen', yawError: 0, pitchError: 0, angularRadius: .1, health: 90, x: 12 }] });
  expect(parsed).not.toHaveProperty('arena'); expect(parsed?.contacts[0]).not.toHaveProperty('health'); expect(parsed?.contacts[0]).not.toHaveProperty('x');
  expect(parsePilotObservation({ ...observation, health: Infinity })).toBeNull();
  expect(parsePilotObservation({ ...observation, waypoints: [null] })).toBeNull();
});
it('requests a strategy through the backend and validates its result', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ plan })));
  expect(await llmPilotStrategy(fetcher).plan(observation, new AbortController().signal)).toEqual(plan);
  expect(fetcher.mock.calls[0][0]).toBe('/api/adventure/pilot-plan');
  expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
});
it('discards plans for waypoints removed while the request was in flight and clears completed summaries', async () => {
  let finish!: (p: PilotPlan) => void;
  const planner = createStrategyPlanner({ id: 'delayed', plan: () => new Promise(resolve => { finish = resolve; }) }, () => 0);
  const withLoot: PilotObservation = { ...observation, waypoints: [{ id: 'crate', x: 0, z: 1, kind: 'ammo' }] };
  const lootPlan: PilotPlan = { goal: 'resupply', waypointId: 'crate', summary: 'Collect the crate' };
  planner.chooseGoal(withLoot); planner.chooseGoal(observation);
  finish(lootPlan); await flush();
  expect(planner.preferredWaypoint?.()).toBeNull(); expect(planner.status()).toContain('no longer available');
  planner.reset(); planner.chooseGoal(withLoot); finish(lootPlan); await flush();
  expect(planner.preferredWaypoint?.()).toBe('crate');
  planner.chooseGoal(observation);
  expect(planner.preferredWaypoint?.()).toBeNull(); expect(planner.status()).toContain('finished or expired');
  planner.reset();
});
