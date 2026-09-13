import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const MAX_BODY = 48 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const token = () => randomBytes(18).toString('hex');
const cleanName = (value) => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 20) || 'Recruit' : 'Recruit';

/** Small, local-only rendezvous server. Gameplay packets travel over WebRTC. */
export function createLanServer({ distDir = DEFAULT_DIST, peerTimeout = 30_000 } = {}) {
  const rooms = new Map();
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const event = (peer, data) => { peer.events.push({ ...data, sequence: ++peer.sequence }); if (peer.events.length > 100) peer.events.shift(); };
  const remove = (room, id) => {
    room.peers.delete(id);
    if (id === room.hostId) { rooms.delete(room.code); return; }
    for (const peer of room.peers.values()) event(peer, { type: 'left', id });
  };
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) for (const peer of room.peers.values()) if (now - peer.lastSeen > peerTimeout) remove(room, peer.id);
  }, Math.min(peerTimeout, 5_000));
  cleanup.unref();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname.startsWith('/api/lan/')) {
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Use the same LAN address to open the game and its lobby.' });
        if (req.method === 'GET' && url.pathname === '/api/lan/health') return json(res, 200, { service: 'blockplay-lan', maxPlayers: 4 });
        let body = {};
        if (req.method === 'POST') {
          let raw = ''; let bytes = 0;
          for await (const chunk of req) { bytes += chunk.length; if (bytes > MAX_BODY) return json(res, 413, { error: 'Signaling message too large.' }); raw += chunk; }
          try { body = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON.' }); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) return json(res, 400, { error: 'Invalid request.' });
        }
        if (req.method === 'POST' && url.pathname === '/api/lan/rooms') {
          if (rooms.size >= 64) return json(res, 503, { error: 'Too many active rooms. Close an unused room first.' });
          let code; do { code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); } while (rooms.has(code));
          const host = { id: token(), token: token(), name: cleanName(body.name), lastSeen: Date.now(), sequence: 0, events: [] };
          const room = { code, hostId: host.id, peers: new Map([[host.id, host]]) }; rooms.set(code, room);
          return json(res, 201, { code, id: host.id, token: host.token, hostId: host.id, peers: [{ id: host.id, name: host.name }] });
        }
        const match = url.pathname.match(/^\/api\/lan\/rooms\/([A-F0-9]{6})\/(join|poll|signal|leave)$/);
        if (!match) return json(res, 404, { error: 'Unknown LAN endpoint.' });
        const room = rooms.get(match[1]);
        if (!room) return json(res, 404, { error: 'Room closed or not found. Check the code and host LAN address.' });
        if (match[2] === 'join' && req.method === 'POST') {
          if (room.peers.size >= 4) return json(res, 409, { error: 'This room is full (4 players).' });
          const peer = { id: token(), token: token(), name: cleanName(body.name), lastSeen: Date.now(), sequence: 0, events: [] };
          room.peers.set(peer.id, peer);
          event(room.peers.get(room.hostId), { type: 'joined', id: peer.id, name: peer.name });
          return json(res, 201, { code: room.code, id: peer.id, token: peer.token, hostId: room.hostId, peers: [...room.peers.values()].map(({ id, name }) => ({ id, name })) });
        }
        const peer = room.peers.get(req.headers['x-lan-id']);
        if (!peer || peer.token !== req.headers['x-lan-token']) return json(res, 403, { error: 'Session expired. Join the room again.' });
        peer.lastSeen = Date.now();
        if (match[2] === 'poll' && req.method === 'GET') {
          const after = Number(url.searchParams.get('after') || '0');
          if (!Number.isSafeInteger(after) || after < 0) return json(res, 400, { error: 'Invalid cursor.' });
          peer.events = peer.events.filter((message) => message.sequence > after);
          return json(res, 200, { events: peer.events });
        }
        if (match[2] === 'signal' && req.method === 'POST') {
          const target = room.peers.get(body.to);
          if (!target || target.id === peer.id || (peer.id !== room.hostId && target.id !== room.hostId)) return json(res, 400, { error: 'Invalid signaling target.' });
          const description = body.description;
          const expectedType = peer.id === room.hostId ? 'offer' : 'answer';
          if (!description || description.type !== expectedType || typeof description.sdp !== 'string' || description.sdp.length > 32_000) return json(res, 400, { error: 'Invalid session description.' });
          if (target.events.length >= 100) return json(res, 429, { error: 'Too many pending signals.' });
          event(target, { type: 'signal', from: peer.id, description: { type: description.type, sdp: description.sdp } });
          return json(res, 200, { ok: true });
        }
        if (match[2] === 'leave' && req.method === 'POST') { remove(room, peer.id); return json(res, 200, { ok: true }); }
        return json(res, 405, { error: 'Method not allowed.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
      let file = resolve(distDir, '.' + pathname);
      if (file !== resolve(distDir) && !file.startsWith(resolve(distDir) + sep)) { res.writeHead(403); return res.end(); }
      let info;
      try { info = await stat(file); if (info.isDirectory()) { file = resolve(file, 'index.html'); info = await stat(file); } } catch {
        if (extname(pathname)) { res.writeHead(404); return res.end('Asset not found'); }
        file = resolve(distDir, 'index.html');
        try { info = await stat(file); } catch { res.writeHead(503, { 'Content-Type': 'text/plain' }); return res.end('Build the app first with pnpm build, then restart pnpm lan.'); }
      }
      if (!info.isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).on('error', () => res.destroy()).pipe(res);
    } catch { if (!res.headersSent) json(res, 500, { error: 'LAN server could not process the request.' }); else res.destroy(); }
  });
  server.on('close', () => clearInterval(cleanup));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4173);
  const server = createLanServer();
  server.on('error', (error) => { console.error(`LAN server: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => {
    console.log(`Blockplay LAN lobby: http://localhost:${port}`);
    for (const addresses of Object.values(networkInterfaces())) for (const address of addresses || []) if (address.family === 'IPv4' && !address.internal) console.log(`Share on your Wi-Fi/LAN: http://${address.address}:${port}`);
    console.log('All players open the same LAN URL, then use LAN arena → Host LAN / Join LAN. Keep this server and the host tab open.');
  });
}
