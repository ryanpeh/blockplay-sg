import { MARINA_STAMPS, QUEENSTOWN_STAMPS, RAFFLES_STAMPS } from '../src/data/region-stamps.ts';
import { destinationId, type AdventureSnapshot } from '../src/game/adventure.ts';

const catalogs = { 'marina-bay': MARINA_STAMPS, queenstown: QUEENSTOWN_STAMPS, 'raffles-place': RAFFLES_STAMPS };
export function trustedSnapshot(state: AdventureSnapshot): AdventureSnapshot | null {
  const destinations = catalogs[state.region].map(d => ({ ...d, id: destinationId(d.name) }));
  if (state.destinations.length !== destinations.length || state.destinations.some(d => {
    const known = destinations.find(item => item.id === d.id);
    return !known || d.name !== known.name || d.x !== known.x || d.z !== known.z;
  })) return null;
  // Do not spread client objects: extra fields must never reach the model.
  return { sessionId: state.sessionId, revision: state.revision, region: state.region,
    position: { x: state.position.x, z: state.position.z }, activeId: state.activeId,
    collected: [...state.collected], destinations };
}

export function validRequestText(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 1200
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(text);
}

// Cheap rejection of obvious overrides, not a complete injection detector.
// The trusted catalog and constrained output remain the security boundary.
export function obviousInstructionOverride(text: string) {
  const normalized = text.normalize('NFKC').replace(/[\u200b-\u200f\ufeff]/g, '').replace(/\s+/g, ' ');
  return /\b(?:ignore|override|disregard|forget)\b.{0,50}\b(?:instructions|system prompt|developer message|safety rules)\b/i.test(normalized)
    || /\b(?:reveal|print|dump|show|give)\b.{0,50}\b(?:system prompt|developer prompt|api[ _-]?key|secrets?|environment variables)\b/i.test(normalized)
    || /<\|(?:im_start|im_end|system|developer)\|>|\[(?:INST|\/INST)\]/i.test(normalized);
}

/** Bounded process-local quotas, not authentication or a durable billing limit. */
export function createRequestGuard(now = Date.now) {
  const clients = new Map<string, { start: number; requests: number; voices: number; active: number }>();
  let start = now(), requests = 0, active = 0;
  return (client: string, voice: boolean): (() => void) | null => {
    const time = now();
    if (time - start >= 60000) { start = time; requests = 0; }
    for (const [id, bucket] of clients) if (!bucket.active && time - bucket.start >= 60000) clients.delete(id);
    let bucket = clients.get(client);
    if (!bucket) {
      if (clients.size >= 1024) return null;
      bucket = { start: time, requests: 0, voices: 0, active: 0 }; clients.set(client, bucket);
    }
    if (time - bucket.start >= 60000) { bucket.start = time; bucket.requests = 0; bucket.voices = 0; }
    if (requests >= 30 || active >= 4 || bucket.requests >= 12 || bucket.active >= 2 || (voice && bucket.voices >= 2)) return null;
    requests++; active++; bucket.requests++; bucket.active++; if (voice) bucket.voices++;
    let released = false;
    return () => { if (!released) { released = true; active--; bucket.active--; } };
  };
}
