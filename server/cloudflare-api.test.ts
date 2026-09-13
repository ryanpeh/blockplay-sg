import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { expect, it, vi } from 'vitest';
import { cloudflareOriginAllowed, createCloudflareAdventureHandler } from './cloudflare-api';

const host = 'blockplay-sg.example.workers.dev';
function request(origin: string | undefined, extra = {}) {
  return { headers: { host, origin, ...extra } } as IncomingMessage;
}
it('accepts only the routed HTTPS origin or an explicit origin allowlist', () => {
  expect(cloudflareOriginAllowed(request(`https://${host}`))).toBe(true);
  for (const origin of [undefined, 'null', `http://${host}`, `https://${host}/`, `https://${host}.evil.test`, `https://user@${host}`]) {
    expect(cloudflareOriginAllowed(request(origin))).toBe(false);
  }
  expect(cloudflareOriginAllowed(request('https://evil.test', { 'x-forwarded-host': 'evil.test' }))).toBe(false);
  expect(cloudflareOriginAllowed(request('http://127.0.0.1:8787', { host: '127.0.0.1:8787' }))).toBe(true);
  expect(cloudflareOriginAllowed(request(`https://${host}`), ' https://game.example.com ')).toBe(false);
  expect(cloudflareOriginAllowed(request('https://game.example.com'), ' https://game.example.com ')).toBe(true);
});

async function call(handler: ReturnType<typeof createCloudflareAdventureHandler>, body: unknown, origin = `https://${host}`) {
  let status = 0, text = '';
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST', url: '/api/adventure/voice-session', headers: { host, origin, 'content-type': 'application/json' },
    socket: { remoteAddress: '192.0.2.1' },
  });
  const res = { writeHead(code: number) { status = code; }, end(value: string) { text = value; } };
  await handler(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return { status, body: JSON.parse(text) };
}
it('retains shared validation, private bindings, response filtering and quotas', async () => {
  const fetcher = vi.fn().mockImplementation(async () => Response.json({
    session: { id: 'demo', secret: 'must-not-reach-browser' }, transport: { sdp: 'v=0' },
  }));
  const handler = createCloudflareAdventureHandler({ OPENAI_API_KEY: 'worker-secret' }, fetcher);
  expect((await call(handler, { sdp: 'v=0' }, 'https://evil.test')).status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
  expect(await call(handler, { sdp: 'v=0' })).toEqual({ status: 201, body: { session: { id: 'demo' }, transport: { type: 'webrtc', sdp: 'v=0' } } });
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer worker-secret');
  expect((await call(handler, { sdp: 'v=0' })).status).toBe(201);
  expect((await call(handler, { sdp: 'v=0' })).status).toBe(429);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('keeps the game usable without a key and honors companion shutdown', async () => {
  const fetcher = vi.fn();
  expect((await call(createCloudflareAdventureHandler({}, fetcher), { sdp: 'v=0' })).status).toBe(503);
  expect((await call(createCloudflareAdventureHandler({ OPENAI_API_KEY: 'key', ADVENTURE_ENABLED: 'false' }, fetcher), { sdp: 'v=0' })).status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
