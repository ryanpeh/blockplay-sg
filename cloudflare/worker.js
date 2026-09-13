import { createServer } from 'node:http';
import { handleAsNodeRequest } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import { createCloudflareAdventureHandler } from '../server/cloudflare-api.ts';

// One handler per isolate preserves the existing concurrency/request guards.
// Only these server bindings can reach the companion; no frontend environment dump.
const companion = createCloudflareAdventureHandler({
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  OPENAI_BASE_URL: env.OPENAI_BASE_URL,
  PILOT_MODEL: env.PILOT_MODEL,
  ADVENTURE_ALLOWED_ORIGINS: env.ADVENTURE_ALLOWED_ORIGINS,
  ADVENTURE_ENABLED: env.ADVENTURE_ENABLED,
  ADVENTURE_VOICE_ENABLED: env.ADVENTURE_VOICE_ENABLED,
});
createServer(companion).listen(3001);

export default {
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/api/health' && request.method === 'GET') {
      return Response.json({ service: 'blockplay-cloudflare', companion: !!env.OPENAI_API_KEY && env.ADVENTURE_ENABLED !== 'false' },
        { headers: { 'Cache-Control': 'no-store' } });
    }
    if (path.startsWith('/api/adventure/')) return handleAsNodeRequest(3001, request);
    return Response.json({ error: path.startsWith('/api/lan/')
      ? 'LAN rooms require the local pnpm lan server. Solo bots are available here.' : 'Not found' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } });
  },
};
