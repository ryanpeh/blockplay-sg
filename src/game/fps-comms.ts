export type CommsChannel = 'radio' | 'kills' | 'system';
export interface CommsEntry { id: number; at: number; channel: CommsChannel; source: string; text: string }
export const COMMS_HISTORY_LIMIT = 100;
/** Session history, carried across district engines; no browser storage or network chat. */
export function createFpsComms(seed: readonly CommsEntry[] = []) {
  let entries = seed.slice(-COMMS_HISTORY_LIMIT).map(entry => ({ ...entry }));
  let sequence = Math.max(0, ...entries.map(entry => entry.id));
  return {
    add(channel: CommsChannel, source: string, text: string, at = Date.now()) {
      const entry: CommsEntry = { id: ++sequence, at, channel, source, text };
      entries = [...entries.slice(-(COMMS_HISTORY_LIMIT - 1)), entry];
      return entry;
    },
    snapshot(): readonly CommsEntry[] { return entries; },
    clear() { entries = []; },
  };
}
