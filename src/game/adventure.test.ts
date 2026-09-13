import { expect, it } from 'vitest';
import { alternatives, createAdventure, destinationId } from './adventure';
import { MARINA_SPAWN, MARINA_STAMPS } from './marina-scene';

const destinations = MARINA_STAMPS.map(d => ({ ...d, id: destinationId(d.name) }));
const make = () => createAdventure(destinations, MARINA_SPAWN);
it('establishes an existing objective and deterministically selects a closer alternative', () => {
  const game = make(); const before = game.read();
  expect(before.activeId).toBe('waterfront');
  const expected = alternatives(before, true)[0]; expect(expected).toBeDefined();
  expect(game.apply(game.begin(), { intent: 'closer', destinationId: expected.id }).applied).toBe(true);
  expect(game.read().activeId).toBe(expected.id);
});
it('selects a named destination, skips without awarding it, and preserves collected stamps', () => {
  const game = make(); game.collect('city-skyline');
  expect(game.apply(game.begin(), { intent: 'named', destinationId: 'lotus-museum' }).applied).toBe(true);
  expect(game.read().activeId).toBe('lotus-museum');
  expect(game.apply(game.begin(), { intent: 'skip', destinationId: 'skypark' }).applied).toBe(true);
  expect(game.read().collected).toEqual(['city-skyline']);
});
it('does not apply invented, collected, malformed or already-active destinations', () => {
  const game = make(); game.collect('city-skyline');
  for (const decision of [{ intent: 'named', destinationId: 'neverland' }, { intent: 'named', destinationId: 'city-skyline' }, { intent: 'skip', destinationId: 'waterfront' }, null, { intent: 'teleport', destinationId: 'skypark' }]) {
    expect(game.apply(game.begin(), decision).applied).toBe(false);
    expect(game.read().activeId).toBe('waterfront');
  }
});
it('retains the current objective when no closer or uncollected alternative exists', () => {
  const game = make(); game.move(destinations[0]);
  expect(game.apply(game.begin(), { intent: 'closer', destinationId: null }).applied).toBe(false);
  destinations.slice(1).forEach(d => game.collect(d.id));
  expect(game.apply(game.begin(), { intent: 'skip', destinationId: null }).applied).toBe(false);
  expect(game.read().activeId).toBe('waterfront');
});
it('uses the current player position and advances only on the game collection callback', () => {
  const game = make(), ticket = game.begin(); game.move(destinations[0]);
  expect(game.apply(ticket, { intent: 'closer', destinationId: 'skypark' }).applied).toBe(false);
  expect(game.read().collected).toEqual([]);
  game.collect('waterfront'); expect(game.read().activeId).not.toBe('waterfront');
  destinations.forEach(d => game.collect(d.id)); expect(game.read().activeId).toBeNull();
});
it('rejects old responses after newer requests, resets, collection or disposal', () => {
  const decision = { intent: 'named', destinationId: 'lotus-museum' };
  for (const change of [(g: ReturnType<typeof make>) => g.begin(), (g: ReturnType<typeof make>) => g.reset(), (g: ReturnType<typeof make>) => g.collect('city-skyline'), (g: ReturnType<typeof make>) => g.dispose()]) {
    const game = make(), ticket = game.begin(); change(game); expect(game.apply(ticket, decision).applied).toBe(false);
  }
});
