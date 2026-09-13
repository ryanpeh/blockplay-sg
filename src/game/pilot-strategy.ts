import { localPilotPlanner, type PilotObservation, type PilotPlanner } from './fps-pilot';
import { validPilotPlan, type PilotPlan, type PilotStrategy } from './pilot-strategy-contract';
export const localPilotStrategy: PilotStrategy = {
  id: 'local', async plan(o) { return { goal: localPilotPlanner.chooseGoal(o), waypointId: null, summary: 'Local utility planner' }; },
};
export function llmPilotStrategy(fetcher: typeof fetch = (...args) => fetch(...args)): PilotStrategy {
  return { id: 'llm', async plan(observation, signal) {
    const response = await fetcher('/api/adventure/pilot-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation }), signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) });
    if (!response.ok) throw new Error(response.status === 503 ? 'Server API key required' : response.status === 404 ? 'Restart companion server' : 'Strategy service unavailable');
    const { plan } = await response.json();
    if (!validPilotPlan(plan, observation)) throw new Error('Invalid strategy response');
    return plan;
  } };
}

/** Async strategy plugins never block the action loop. Plans expire and late replies are discarded. */
export function createStrategyPlanner(strategy: PilotStrategy, now: () => number = () => performance.now()) {
  let current: PilotPlan | null = null, nextAt = 0, generation = 0, acceptedAt = 0;
  let request: AbortController | null = null, description = 'Local fallback · awaiting strategy';
  let latest: PilotObservation | null = null;
  const planner: PilotPlanner & { status(): string; reset(): void } = {
    chooseGoal(observation) {
      latest = observation;
      if (current && (now() - acceptedAt > 20000 || current.waypointId && !observation.waypoints.some(w => w.id === current!.waypointId))) {
        current = null; description = 'Plan finished or expired · local fallback';
      }
      if (!request && now() >= nextAt && observation.alive) {
        const ticket = generation, controller = new AbortController(); request = controller; nextAt = now() + 10000;
        description = current ? 'Replanning · ' + current.summary : 'Planning · local fallback active';
        void strategy.plan(structuredClone(observation), controller.signal).then(plan => {
          if (ticket !== generation || controller.signal.aborted) return;
          if (!latest || !validPilotPlan(plan, latest)) throw new Error('Strategy waypoint no longer available');
          current = plan; acceptedAt = now(); description = plan.summary;
        }).catch(error => {
          if (ticket !== generation) return;
          current = null; description = `${error instanceof Error ? error.message : 'Strategy unavailable'} · local fallback`;
        }).finally(() => { if (ticket === generation) request = null; });
      }
      return current?.goal ?? localPilotPlanner.chooseGoal(observation);
    },
    preferredWaypoint: () => current?.waypointId ?? null,
    status: () => description,
    reset() { generation++; request?.abort(); request = null; current = null; latest = null; nextAt = 0; description = 'Local fallback · awaiting strategy'; },
  };
  return planner;
}
