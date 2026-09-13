export interface LanPeer { id: string; name: string }
export interface LanSession {
  id: string; role: 'host' | 'guest' | 'solo'; name: string;
  send(payload: unknown, to?: string): void;
  subscribe(handler: (from: string, payload: unknown) => void): () => void;
  getPeers(): LanPeer[];
  onPeers(handler: () => void): () => void;
  close(): void;
}

const MAX_PACKET = 48 * 1024;
const API = '/api/lan';
export const cleanLanName = (name: string) => name.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 20) || 'Recruit';
export const cleanRoomCode = (code: string) => code.trim().toUpperCase();
interface Credentials { code: string; id: string; token: string; hostId: string; peers: LanPeer[] }
interface SignalEvent { sequence: number; type: 'joined' | 'left' | 'signal'; id?: string; name?: string; from?: string; description?: RTCSessionDescriptionInit }

async function api<T>(path: string, body?: unknown, credentials?: Credentials): Promise<T> {
  const response = await fetch(API + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(credentials ? { 'x-lan-id': credentials.id, 'x-lan-token': credentials.token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(8_000), cache: 'no-store',
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('LAN server is not running here. Run pnpm build, then pnpm lan, and open its LAN URL.'); }
  if (!response.ok) throw new Error(result.error || 'Could not contact the LAN lobby.');
  return result as T;
}

export async function lanServerAvailable(): Promise<boolean> {
  try { return (await api<{ service?: string }>('/health')).service === 'blockplay-lan'; } catch { return false; }
}

export function createSoloSession(name: string): LanSession {
  return { id: `solo-${Math.random().toString(36).slice(2, 10)}`, role: 'solo', name: cleanLanName(name), send() {}, subscribe: () => () => {}, getPeers: () => [], onPeers: () => () => {}, close() {} };
}

function checkWebRtc() {
  if (typeof RTCPeerConnection === 'undefined') throw new Error('This browser does not support WebRTC. Use a recent Chrome, Edge or Firefox browser.');
}

/** Gather host ICE candidates locally: no external STUN, TURN, account or cloud service. */
function gathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); connection.removeEventListener('icegatheringstatechange', change); resolve(); };
    const change = () => { if (connection.iceGatheringState === 'complete') done(); };
    const timer = setTimeout(done, 3_500);
    connection.addEventListener('icegatheringstatechange', change);
  });
}

function makeSession(name: string, role: 'host' | 'guest', credentials: Credentials): LanSession {
  let closed = false, cursor = 0, failures = 0;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  const links = new Map<string, { connection: RTCPeerConnection; channel?: RTCDataChannel; name: string }>();
  const listeners = new Set<(from: string, payload: unknown) => void>();
  const peerListeners = new Set<() => void>();
  let roster: LanPeer[] = [];
  const roomPath = `/rooms/${credentials.code}`;
  const session: LanSession = {
    id: credentials.id, role, name: cleanLanName(name),
    send(payload, to) {
      if (closed) return;
      let packet: string;
      try { packet = JSON.stringify({ version: 1, kind: 'data', payload }); } catch { return; }
      if (packet.length > MAX_PACKET) return;
      for (const [id, link] of links) if ((!to || id === to) && link.channel?.readyState === 'open' && link.channel.bufferedAmount < 256 * 1024) {
        try { link.channel.send(packet); } catch { /* A peer can leave between readyState and send. */ }
      }
    },
    subscribe(handler) { listeners.add(handler); return () => { listeners.delete(handler); }; },
    getPeers: () => role === 'host'
      ? [...links].filter(([, link]) => link.channel?.readyState === 'open').map(([id, link]) => ({ id, name: link.name }))
      : roster.map((peer) => ({ ...peer })),
    onPeers(handler) { peerListeners.add(handler); return () => { peerListeners.delete(handler); }; },
    close() {
      if (closed) return;
      closed = true; clearTimeout(pollTimer);
      for (const link of links.values()) { link.channel?.close(); link.connection.close(); }
      links.clear(); roster = []; notifyPeers(); listeners.clear(); peerListeners.clear();
      window.removeEventListener('pagehide', session.close);
      void fetch(API + roomPath + '/leave', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-lan-id': credentials.id, 'x-lan-token': credentials.token }, body: '{}', keepalive: true }).catch(() => {});
    },
  };

  function notifyPeers() {
    for (const listener of [...peerListeners]) listener();
    if (role === 'host' && !closed) {
      const packet = JSON.stringify({ version: 1, kind: 'roster', peers: [{ id: session.id, name: session.name }, ...session.getPeers()] });
      for (const link of links.values()) if (link.channel?.readyState === 'open') try { link.channel.send(packet); } catch { /* Closing peer. */ }
    }
  }

  function drop(id: string) {
    const link = links.get(id); if (!link) return;
    links.delete(id); link.channel?.close(); link.connection.close();
    if (role === 'guest') roster = [];
    notifyPeers();
  }

  function channelFor(id: string, channel: RTCDataChannel) {
    const link = links.get(id); if (!link || closed) { channel.close(); return; }
    link.channel = channel;
    channel.onopen = () => {
      if (closed) { channel.close(); return; }
      if (role === 'guest') roster = [{ id, name: link.name }];
      notifyPeers();
    };
    channel.onmessage = (event: MessageEvent) => {
      if (closed || typeof event.data !== 'string' || event.data.length > MAX_PACKET) return;
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (!packet || packet.version !== 1) return;
      if (packet.kind === 'roster' && role === 'guest' && id === credentials.hostId && Array.isArray(packet.peers)) {
        roster = packet.peers.slice(0, 4).filter((peer: unknown): peer is LanPeer => !!peer && typeof peer === 'object' && typeof (peer as LanPeer).id === 'string' && (peer as LanPeer).id.length <= 64 && typeof (peer as LanPeer).name === 'string').filter((peer: LanPeer) => peer.id !== session.id).map((peer: LanPeer) => ({ id: peer.id, name: cleanLanName(peer.name) }));
        notifyPeers();
      } else if (packet.kind === 'data') for (const listener of [...listeners]) listener(id, packet.payload);
    };
    channel.onclose = () => drop(id);
    channel.onerror = () => drop(id);
  }

  function connectionFor(id: string, peerName: string) {
    const existing = links.get(id); if (existing) return existing.connection;
    const connection = new RTCPeerConnection({ iceServers: [] });
    links.set(id, { connection, name: cleanLanName(peerName) });
    connection.ondatachannel = (event) => channelFor(id, event.channel);
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') drop(id);
      // A brief Wi-Fi interruption is allowed to recover before the heartbeat expires.
    };
    return connection;
  }

  async function processSignal(event: SignalEvent) {
    if (closed) return;
    if (event.type === 'left' && event.id) { drop(event.id); return; }
    if (role === 'host' && event.type === 'joined' && event.id) {
      if (links.has(event.id) || links.size >= 3) return;
      const connection = connectionFor(event.id, event.name || 'Recruit');
      channelFor(event.id, connection.createDataChannel('blockplay', { ordered: true }));
      await connection.setLocalDescription(await connection.createOffer());
      await gathered(connection);
      if (!closed && connection.localDescription) await api(roomPath + '/signal', { to: event.id, description: connection.localDescription.toJSON() }, credentials);
    } else if (event.type === 'signal' && event.from && event.description) {
      if (role === 'guest' && event.from !== credentials.hostId) return;
      const peer = credentials.peers.find((candidate) => candidate.id === event.from);
      const connection = role === 'host' ? links.get(event.from)?.connection : connectionFor(event.from, peer?.name || 'Host');
      if (!connection) return;
      await connection.setRemoteDescription(event.description);
      if (role === 'guest') {
        await connection.setLocalDescription(await connection.createAnswer());
        await gathered(connection);
        if (!closed && connection.localDescription) await api(roomPath + '/signal', { to: event.from, description: connection.localDescription.toJSON() }, credentials);
      }
    }
  }

  async function poll() {
    if (closed) return;
    try {
      const result = await api<{ events: SignalEvent[] }>(roomPath + `/poll?after=${cursor}`, undefined, credentials);
      for (const event of result.events) {
        if (closed) return;
        cursor = Math.max(cursor, event.sequence);
        try { await processSignal(event); } catch { if (event.id || event.from) drop((event.id || event.from)!); }
      }
      failures = 0;
    } catch { if (++failures >= 5) { session.close(); return; } }
    if (!closed) pollTimer = setTimeout(() => void poll(), 600);
  }
  window.addEventListener('pagehide', session.close);
  void poll();
  return session;
}

export async function hostLan(name: string): Promise<{ session: LanSession; roomCode: string }> {
  checkWebRtc();
  const credentials = await api<Credentials>('/rooms', { name: cleanLanName(name) });
  return { session: makeSession(name, 'host', credentials), roomCode: credentials.code };
}

export async function joinLan(name: string, roomCode: string): Promise<LanSession> {
  checkWebRtc();
  const code = cleanRoomCode(roomCode);
  if (!/^[A-F0-9]{6}$/.test(code)) throw new Error('Enter the six-character room code shown by the host.');
  const credentials = await api<Credentials>(`/rooms/${code}/join`, { name: cleanLanName(name) });
  const session = makeSession(name, 'guest', credentials);
  return new Promise((resolve, reject) => {
    const unsubscribe = session.onPeers(() => {
      if (session.getPeers().length) { clearTimeout(timeout); unsubscribe(); resolve(session); }
    });
    const timeout = setTimeout(() => { unsubscribe(); session.close(); reject(new Error('Peer connection timed out. Keep the host tab open, use the same Wi-Fi/LAN, and disable Wi-Fi client isolation or VPN routing if it blocks local peers.')); }, 25_000);
  });
}
