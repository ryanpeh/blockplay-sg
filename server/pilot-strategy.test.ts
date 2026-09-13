import { expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAdventureHandler } from './adventure-api';
const observation = { time: 1, alive: true, health: 40, maxHealth: 100, armor: 0, magazine: 30, reserve: 120, weapon: 0,
  reloading: false, aiming: false, position: { x: 0, z: 0 }, yaw: 0, pitch: 0, contacts: [], waypoints: [{ id: 'med', kind: 'medical', x: 5, z: 0 }], lootPrompt: '', travelPrompt: '' };
async function call(body: unknown, fetcher: typeof fetch) {
  let status = 0, text = '';
  const request = Object.assign(Readable.from([JSON.stringify(body)]), { method: 'POST', url: '/api/adventure/pilot-plan', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' } });
  const response = { writeHead(code: number) { status = code; }, end(value: string) { text = value; } };
  await createAdventureHandler({ OPENAI_API_KEY: 'private-key' }, fetcher)(request as unknown as IncomingMessage, response as unknown as ServerResponse);
  return { status, body: JSON.parse(text) };
}
it('requests a strict strategic goal without forwarding hidden state or credentials', async () => {
  const plan = { goal: 'resupply', waypointId: 'med', summary: 'Recover health before travelling' };
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(plan) }] }] })));
  expect(await call({ observation: { ...observation, secretWorld: 'hidden enemies' } }, fetcher)).toEqual({ status: 200, body: { plan } });
  const request = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(request.text.format.strict).toBe(true); expect(request.store).toBe(false);
  expect(request.input).not.toContain('secretWorld'); expect(JSON.stringify(request)).not.toContain('private-key');
});
it('rejects malformed observations and unauthorized model plans', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: '{"goal":"teleport","waypointId":null,"summary":"Cheat"}' }] }] })));
  expect((await call({ observation: { ...observation, contacts: [null] } }, fetcher)).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled(); expect((await call({ observation }, fetcher)).status).toBe(502);
});
