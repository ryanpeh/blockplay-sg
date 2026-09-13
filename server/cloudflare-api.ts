import type { IncomingMessage } from 'node:http';
import { createAdventureHandler } from './adventure-api.ts';

/** Cloudflare supplies Host from the routed request; never trust forwarded host headers. */
export function cloudflareOriginAllowed(req: IncomingMessage, configured?: string) {
  const origin = req.headers.origin;
  if (!origin) return false;
  if (configured?.trim()) return configured.split(',').some(value => value.trim() === origin);
  try {
    const url = new URL(origin);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return url.origin === origin && url.host === req.headers.host
      && (url.protocol === 'https:' || (local && url.protocol === 'http:'));
  } catch { return false; }
}

export function createCloudflareAdventureHandler(env: Record<string, string | undefined>, fetcher = fetch) {
  return createAdventureHandler(env, fetcher, {
    isOriginAllowed: req => cloudflareOriginAllowed(req, env.ADVENTURE_ALLOWED_ORIGINS),
  });
}
