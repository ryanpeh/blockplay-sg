import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createAdventureHandler } from './adventure-api.ts';

const api = createAdventureHandler(process.env);
const root = resolve('dist');
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) return api(req, res);
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  try {
    const path = resolve(root, '.' + new URL(req.url ?? '/', 'http://localhost').pathname);
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Invalid path');
    const file = path === root ? resolve(root, 'index.html') : path;
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream'); res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found. Run pnpm build first.'); }
}).listen(Number(process.env.ADVENTURE_PORT || 3001), '127.0.0.1', () => console.log('Blockplay companion server ready on loopback.'));
