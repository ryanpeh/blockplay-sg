export type Destination = { id: string; name: string; x: number; z: number };
export type GuideRegion = 'marina-bay' | 'raffles-place' | 'queenstown';
export type AdventureSnapshot = {
  sessionId: string; revision: number; region: GuideRegion;
  position: { x: number; z: number }; activeId: string | null;
  destinations: Destination[]; collected: string[];
};
export type AdventureDecision = { intent: 'closer' | 'named' | 'skip' | 'keep'; destinationId: string | null };
export type AdventureResult = { applied: boolean; message: string };
export interface AdventureGame {
  read(): AdventureSnapshot;
  begin(): { request: number; snapshot: AdventureSnapshot };
  apply(ticket: { request: number; snapshot: AdventureSnapshot }, decision: unknown): AdventureResult;
  cancel(): void;
}

export const destinationId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const distanceTo = (state: AdventureSnapshot, target: Destination) => Math.hypot(target.x - state.position.x, target.z - state.position.z);
export function alternatives(state: AdventureSnapshot, closer = false) {
  const active = state.destinations.find(d => d.id === state.activeId);
  return state.destinations.filter(d => !state.collected.includes(d.id) && d.id !== state.activeId
    && (!closer || !active || distanceTo(state, d) < distanceTo(state, active) - 0.01))
    .sort((a, b) => distanceTo(state, a) - distanceTo(state, b) || a.id.localeCompare(b.id));
}
export function validateDecision(value: unknown): value is AdventureDecision {
  if (!value || typeof value !== 'object') return false;
  const d = value as AdventureDecision;
  return ['closer', 'named', 'skip', 'keep'].includes(d.intent)
    && (d.destinationId === null || typeof d.destinationId === 'string');
}

// Synchronous game-owned state: models propose IDs, never positions, stamps or physics.
export function createAdventure(destinations: Destination[], spawn: { x: number; z: number }, changed: () => void = () => {}) {
  let state: AdventureSnapshot, request = 0, alive = true;
  const reset = () => {
    request++;
    state = { sessionId: crypto.randomUUID(), revision: 0, region: 'marina-bay', position: { ...spawn },
      activeId: destinations[0]?.id ?? null, destinations, collected: [] };
    changed();
  };
  reset();
  const read = () => structuredClone(state);
  return {
    read,
    begin() { return { request: ++request, snapshot: read() }; },
    cancel() { request++; },
    dispose() { alive = false; request++; },
    reset,
    move(position: { x: number; z: number }) { state.position = { ...position }; },
    collect(id: string) {
      if (state.collected.includes(id) || !destinations.some(d => d.id === id)) return;
      state.collected.push(id); state.revision++;
      if (state.activeId === id) state.activeId = alternatives(state)[0]?.id ?? null;
      changed();
    },
    apply(ticket: { request: number; snapshot: AdventureSnapshot }, decision: unknown): AdventureResult {
      if (!alive || ticket.request !== request || ticket.snapshot.sessionId !== state.sessionId || ticket.snapshot.revision !== state.revision)
        return { applied: false, message: 'The adventure changed while I was checking. Please try again.' };
      if (!validateDecision(decision) || (decision.destinationId !== null && !destinations.some(d => d.id === decision.destinationId)))
        return { applied: false, message: 'That destination is not available. Your objective is unchanged.' };
      if (decision.intent === 'keep') return { applied: false, message: 'Try “something closer”, “take me to the museum”, or “skip this stop”. Your objective is unchanged.' };
      // Recalculate at application time because the player may have moved during inference.
      const target = decision.intent === 'closer' ? alternatives(state, true)[0]
        : destinations.find(d => d.id === decision.destinationId && d.id !== state.activeId && !state.collected.includes(d.id));
      if (!target) return { applied: false, message: decision.intent === 'closer'
        ? 'There is no closer uncollected alternative here. Your objective is unchanged.'
        : 'There is no valid alternative for that request. Your objective is unchanged.' };
      state.activeId = target.id; state.revision++; changed();
      return { applied: true, message: `Let’s head to ${target.name}. I’ve updated your objective.${decision.intent === 'closer' ? ' It is closer in a straight line, not a calculated walking route.' : ''}` };
    },
  };
}
