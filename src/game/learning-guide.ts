import type { AdventureGame, AdventureSnapshot, Destination, GuideRegion } from './adventure';
import { randomUuid } from '../lib/random-id.ts';

/** Read-only bridge: the region's existing game remains the sole owner of stamps. */
export function createLearningGuide(region: Exclude<GuideRegion, 'marina-bay'>, current: () => {
  position: { x: number; z: number }; destinations: Destination[]; collected: string[];
}): AdventureGame {
  const sessionId = randomUuid();
  let request = 0, revision = 0, lastCollected = '';
  const read = (): AdventureSnapshot => {
    const state = current(), collected = JSON.stringify(state.collected);
    if (collected !== lastCollected) { lastCollected = collected; revision++; }
    return structuredClone({ ...state, sessionId, revision, region, activeId: null });
  };
  return {
    read,
    begin: () => ({ request: ++request, snapshot: read() }),
    cancel: () => { request++; },
    apply: () => ({ applied: false, message: 'This region’s companion is an educational guide. Ask about its history, highlights or a nearby stop. Keep exploring the orange stamps; your progress is unchanged.' }),
  };
}
