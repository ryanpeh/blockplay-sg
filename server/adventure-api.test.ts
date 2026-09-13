import { expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAdventure } from '../src/game/adventure';
import { createAdventureHandler, interpret, liveSession, validSnapshot } from './adventure-api';
import { learningTopics } from '../src/data/singapore-guide';
const state = createAdventure([{ id: 'waterfront', name: 'Waterfront', x: 100, z: 0 }, { id: 'lotus-museum', name: 'Lotus museum', x: 10, z: 0 }], { x: 0, z: 0 }).read();
it('routes education to curated topics, with active and nearby context', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ intent: 'learn', destinationId: null, topicId: 'artscience-museum' }) }] }] })));
  expect(await interpret('Tell me about the museum', state, 'key', 'https://api.openai.com/v1', fetcher)).toEqual({ intent: 'learn', destinationId: null, topicId: 'artscience-museum' });
  const body = JSON.parse(fetcher.mock.calls[0][1].body), input = JSON.parse(body.input);
  expect(input.nearestStopId).toBe('lotus-museum'); expect(input.topics).toHaveLength(learningTopics.length);
  expect(body.instructions).toContain('Never change an objective merely');
});
it('rejects invented lessons and mixed learning/travel decisions', async () => {
  for (const decision of [{ intent: 'learn', destinationId: null, topicId: 'invented' }, { intent: 'learn', destinationId: 'lotus-museum', topicId: 'artscience-museum' }]) {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(decision) }] }] })));
    await expect(interpret('explain', state, 'key', 'https://api.openai.com/v1', fetcher)).rejects.toThrow('invalid learning topic');
  }
});
it('accepts regional education but never forwards a regional travel proposal', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ intent: 'named', destinationId: 'lotus-museum', topicId: null }) }] }] }))));
  for (const region of ['queenstown', 'raffles-place'] as const) {
    expect(await interpret('take me there', { ...state, region }, 'key', 'https://api.openai.com/v1', fetcher)).toEqual({ intent: 'keep', destinationId: null });
  }
});
it('uses Luna structured IDs and deterministic closer context without exposing the key', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"intent":"closer","destinationId":"lotus-museum"}' }] }] })));
  expect(await interpret('closer', state, 'private-key', 'https://api.openai.com/v1', fetcher)).toEqual({ intent: 'closer', destinationId: 'lotus-museum' });
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.model).toBe('gpt-5.6-luna'); expect(JSON.parse(body.input).nearestCloserId).toBe('lotus-museum'); expect(body.store).toBe(false);
  expect(body.text.format.strict).toBe(true); expect(JSON.stringify(body)).not.toContain('private-key');
});
it('rejects malformed snapshots and invalid model output', async () => {
  expect(validSnapshot(state)).toBe(true); expect(validSnapshot({ ...state, region: 'queenstown' })).toBe(true);
  expect(validSnapshot({ ...state, region: 'unknown' } as never)).toBe(false);
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"intent":"named","destinationId":"invented"}' }] }] })));
  await expect(interpret('museum', state, 'key', 'https://api.openai.com/v1', fetcher)).rejects.toThrow('invalid objective');
});
async function call(handler: ReturnType<typeof createAdventureHandler>, body: unknown, origin = 'http://localhost:5173', url = '/api/adventure/change') {
  const req = Object.assign(Readable.from([JSON.stringify(body)]), { method: 'POST', url, headers: { origin, 'content-type': 'application/json' } });
  let status = 0, value = '';
  const res = { writeHead(code: number) { status = code; }, end(data: string) { value = data; } };
  await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return { status, body: JSON.parse(value) };
}
it('rejects foreign origins and reports missing credentials without making an API call', async () => {
  const fetcher = vi.fn(), handler = createAdventureHandler({}, fetcher);
  expect((await call(handler, {}, 'https://untrusted.example')).status).toBe(403);
  expect((await call(handler, { text: 'closer', state })).status).toBe(503); expect(fetcher).not.toHaveBeenCalled();
});
it('returns 400 for null destinations without calling the model', async () => {
  const fetcher = vi.fn();
  const result = await call(createAdventureHandler({ OPENAI_API_KEY: 'key' }, fetcher), { text: 'closer', state: { ...state, destinations: [null] } });
  expect(result.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it('creates only GPT-Live-1 client-delegation sessions and returns whitelisted connection fields', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ session: { id: 'live_test', private: 'hidden' }, transport: { sdp: 'answer' }, secret: 'hidden' })));
  const result = await call(createAdventureHandler({ OPENAI_API_KEY: 'private-key' }, fetcher), { sdp: 'v=0\r\n' }, undefined, '/api/adventure/voice-session');
  expect(result.status).toBe(201); expect(result.body).toEqual({ session: { id: 'live_test' }, transport: { type: 'webrtc', sdp: 'answer' } });
  expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/live/sessions'); expect(liveSession.model).toBe('gpt-live-1'); expect(liveSession.delegation.type).toBe('client');
});
