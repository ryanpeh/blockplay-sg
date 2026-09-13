import { expect, it } from 'vitest';
import { COMMS_HISTORY_LIMIT, createFpsComms } from './fps-comms';
it('bounds the history without mutating published snapshots and retains ordered channel entries', () => {
  const log = createFpsComms(); log.add('radio', 'Encik', 'Move out!', 1);
  const before = log.snapshot();
  for (let i = 0; i < 120; i++) log.add('kills', 'Arena', `Kill ${i}`, i + 2);
  expect(before).toHaveLength(1); expect(log.snapshot()).toHaveLength(COMMS_HISTORY_LIMIT);
  expect(log.snapshot()[0].text).toBe('Kill 20'); expect(log.snapshot().at(-1)?.channel).toBe('kills');
});
it('carries comms through zone replacement without sharing mutable entries or reusing IDs', () => {
  const old = createFpsComms(); old.add('system', 'Travel', 'Moving to CBD', 1);
  const next = createFpsComms(old.snapshot()); next.add('radio', 'Encik · AI', 'Move out!', 2);
  expect(next.snapshot().map(e => e.id)).toEqual([1, 2]); expect(old.snapshot()).toHaveLength(1);
  next.clear(); expect(next.snapshot()).toHaveLength(0); expect(old.snapshot()).toHaveLength(1);
});
