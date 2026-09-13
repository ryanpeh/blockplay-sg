import { expect, it, vi } from 'vitest';
import { createAdventure } from '../game/adventure';
import { createAdventureClient } from './adventure-client';
const make = () => createAdventure([{ id: 'a', name: 'A', x: 100, z: 0 }, { id: 'b', name: 'B', x: 10, z: 0 }, { id: 'c', name: 'C', x: 20, z: 0 }], { x: 0, z: 0 });
const response = (id: string) => new Response(JSON.stringify({ decision: { intent: 'named', destinationId: id } }));
const lesson = (topicId: string | null) => new Response(JSON.stringify({ decision: { intent: 'learn', destinationId: null, topicId } }));
it('explains rejected and throttled requests without applying changes or clearing stamps', async () => {
  for (const status of [400, 413, 422, 429]) {
    const game = make(); game.collect('c'); const before = game.read();
    const client = createAdventureClient(game, vi.fn().mockResolvedValue(new Response('', { status })));
    await expect(client.send('request')).rejects.toThrow('objective is unchanged');
    expect(game.read()).toEqual(before);
  }
});
it('explains a missing dev proxy instead of blaming the model', async () => {
  const game = make();
  const client = createAdventureClient(game, vi.fn().mockResolvedValue(new Response('', { status: 404 })));
  await expect(client.send('museum')).rejects.toThrow('Restart pnpm dev and pnpm server');
  expect(game.read().activeId).toBe('a');
});
it('teaches from a trusted topic without changing objectives or collected stamps', async () => {
  const game = make(); game.collect('c'); const before = game.read(), onLearning = vi.fn();
  const client = createAdventureClient(game, vi.fn().mockResolvedValue(lesson('queenstown')), onLearning);
  expect(await client.send('Tell me about Queenstown')).toContain('first satellite town');
  expect(game.read()).toEqual(before); expect(onLearning.mock.calls[0][0].url).toContain('roots.gov.sg');
});
it('rejects invented learning topics and safely explains unsupported questions', async () => {
  const game = make(), onLearning = vi.fn();
  await expect(createAdventureClient(game, vi.fn().mockResolvedValue(lesson('invented')), onLearning).send('facts')).rejects.toThrow('Unknown learning topic');
  expect(onLearning).not.toHaveBeenCalled();
  expect(await createAdventureClient(game, vi.fn().mockResolvedValue(lesson(null))).send('ticket prices')).toContain('don’t have verified');
  expect(game.read().activeId).toBe('a');
});
it('discards learning responses after a reset and superseded requests', async () => {
  const game = make(), pending: ((r: Response) => void)[] = [], onLearning = vi.fn();
  const client = createAdventureClient(game, vi.fn().mockImplementation(() => new Promise(resolve => pending.push(resolve))), onLearning);
  const first = client.send('museum'); game.reset(); pending[0](lesson('artscience-museum'));
  expect(await first).toBeNull(); expect(onLearning).not.toHaveBeenCalled();
  const old = client.send('Queenstown'), newer = client.send('B');
  pending[2](response('b')); await newer; pending[1](lesson('queenstown'));
  expect(await old).toBeNull(); expect(onLearning).not.toHaveBeenCalled();
});
it('confirms only after a successful game update', async () => {
  const game = make(), client = createAdventureClient(game, vi.fn().mockResolvedValue(response('b')));
  expect(await client.send('B')).toContain('updated'); expect(game.read().activeId).toBe('b');
});
it('an old voice signal cannot cancel a newer typed request', async () => {
  const game = make(), voice = new AbortController(); const pending: ((r: Response) => void)[] = [];
  const client = createAdventureClient(game, vi.fn().mockImplementation(() => new Promise(resolve => pending.push(resolve))));
  const old = client.send('B', voice.signal), typed = client.send('C');
  voice.abort(); pending[0](response('b')); expect(await old).toBeNull();
  pending[1](response('c')); expect(await typed).toContain('updated'); expect(game.read().activeId).toBe('c');
});
it('ignores late results even when the transport ignores abort', async () => {
  const game = make(); const pending: ((r: Response) => void)[] = [];
  const client = createAdventureClient(game, vi.fn().mockImplementation(() => new Promise(resolve => pending.push(resolve))));
  const old = client.send('B'), newest = client.send('C');
  pending[1](response('c')); await newest; pending[0](response('b'));
  expect(await old).toBeNull(); expect(game.read().activeId).toBe('c');
});
it('keeps gameplay usable on API failure, malformed output and canceled requests', async () => {
  const game = make(), client = createAdventureClient(game, vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
  await expect(client.send('B')).rejects.toThrow('OPENAI_API_KEY'); expect(game.read().activeId).toBe('a');
  const invalid = createAdventureClient(game, vi.fn().mockResolvedValue(response('unknown')));
  expect(await invalid.send('B')).toContain('unchanged'); expect(game.read().activeId).toBe('a');
});
