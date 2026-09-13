import { expect, it, vi } from 'vitest';
import { createLearningGuide } from './learning-guide';
import { createAdventureClient } from '../lib/adventure-client';
import { learningTopics } from '../data/singapore-guide';
import { RAFFLES_STAMPS } from './raffles-scene';
import { QUEENSTOWN_STAMPS } from './queenstown-scene';
import { destinationId } from './adventure';

it('covers each new region stop with one sourced topic and unique topic IDs', () => {
  expect(new Set(learningTopics.map(t => t.id)).size).toBe(learningTopics.length);
  for (const stamps of [RAFFLES_STAMPS, QUEENSTOWN_STAMPS]) for (const stamp of stamps) {
    const cards = learningTopics.filter(t => (t.stops as readonly string[]).includes(destinationId(stamp.name)));
    expect(cards, stamp.name).toHaveLength(1);
    expect(new URL(cards[0].url).protocol).toBe('https:');
  }
});
it('reads current position/stamps but cannot mutate the game for travel requests', () => {
  const local = { position: { x: 0, z: 0 }, destinations: [{ id: 'library-garden', name: 'Library garden', x: 2, z: 0 }], collected: [] as string[] };
  const game = createLearningGuide('queenstown', () => local), before = game.read();
  expect(game.apply(game.begin(), { intent: 'named', destinationId: 'library-garden' }).applied).toBe(false);
  expect(game.read()).toEqual(before);
  local.position.x = 1; local.collected.push('library-garden');
  expect(game.read().position.x).toBe(1); expect(game.read().revision).toBeGreaterThan(before.revision);
});
it('answers learning questions and discards results after cancel or stamp changes', async () => {
  const local = { position: { x: 0, z: 0 }, destinations: [{ id: 'library-garden', name: 'Library garden', x: 2, z: 0 }], collected: [] as string[] };
  const game = createLearningGuide('queenstown', () => local), onLearning = vi.fn();
  let finish!: (response: Response) => void;
  const client = createAdventureClient(game, vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; })), onLearning);
  const reply = () => new Response(JSON.stringify({ decision: { intent: 'learn', destinationId: null, topicId: 'queenstown-library' } }));
  const first = client.send('library'); finish(reply()); expect(await first).toContain('1970');
  onLearning.mockClear(); const stale = client.send('library'); local.collected.push('library-garden'); finish(reply());
  expect(await stale).toBeNull(); expect(onLearning).not.toHaveBeenCalled();
  const canceled = client.send('library'); client.cancel(); finish(reply()); expect(await canceled).toBeNull();
});
