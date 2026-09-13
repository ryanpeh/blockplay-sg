import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Check, Copy, Crosshair, LoaderCircle, Radio, Shield, Users, Wifi } from 'lucide-react';
import { createSoloSession, hostLan, joinLan, lanServerAvailable, type LanSession } from '../game/lan-peer';
import './lan-lobby.css';

type Mode = 'host' | 'join' | 'solo';
type Squad = 'mixed' | 'assault' | 'tank' | 'sniper';
type Peer = { id: string; name: string };

function invitedRoom() {
  return new URLSearchParams(window.location.search).get('room')?.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || '';
}

export default function LanLobby({ onLaunch, onBack }: { onLaunch: (session: LanSession, bots: number, squad: Squad) => void; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>(() => invitedRoom() ? 'join' : 'host');
  const [name, setName] = useState('Operator');
  const [room, setRoom] = useState(invitedRoom);
  const [bots, setBots] = useState(3);
  const [squad, setSquad] = useState<Squad>('mixed');
  const [session, setSession] = useState<LanSession | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [server, setServer] = useState<boolean | null>(null);
  const owned = useRef<LanSession | null>(null);
  const attempt = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let ignore = false;
    void lanServerAvailable().then(available => { if (!ignore) setServer(available); }).catch(() => { if (!ignore) setServer(false); });
    return () => { ignore = true; alive.current = false; attempt.current++; owned.current?.close(); owned.current = null; };
  }, []);

  useEffect(() => {
    if (!session) { setPeers([]); return; }
    setPeers(session.getPeers());
    return session.onPeers(() => setPeers(session.getPeers()));
  }, [session]);

  const disconnect = () => {
    attempt.current++;
    owned.current?.close();
    owned.current = null;
    setSession(null); setPeers([]); setBusy(false); setError(''); setNotice('');
  };
  const chooseMode = (next: Mode) => {
    if (next === mode) return;
    disconnect(); setMode(next);
    if (next === 'solo') setBots(value => Math.max(1, value));
  };
  const deploy = (connection: LanSession, count: number) => {
    owned.current = null;
    onLaunch(connection, count, squad);
  };
  const connect = async () => {
    const displayName = name.trim().slice(0, 20);
    if (!displayName) { setError('Choose a display name before deploying.'); return; }
    if (mode === 'solo') { deploy(createSoloSession(displayName), Math.max(1, bots)); return; }
    if (mode === 'join' && !/^[A-Z0-9]{6}$/.test(room)) { setError('Enter the six-character room code shared by your host.'); return; }
    const token = ++attempt.current;
    setBusy(true); setError(''); setNotice('');
    try {
      let connection: LanSession;
      if (mode === 'host') {
        const result = await hostLan(displayName);
        connection = result.session;
        if (alive.current && token === attempt.current) setRoom(result.roomCode);
      } else connection = await joinLan(displayName, room);
      if (!alive.current || token !== attempt.current) { connection.close(); return; }
      owned.current = connection; setSession(connection); setServer(true);
    } catch (failure) {
      if (alive.current && token === attempt.current) setError(failure instanceof Error ? failure.message : 'Connection failed. Check the host address and try again.');
    } finally { if (alive.current && token === attempt.current) setBusy(false); }
  };
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set('room', room);
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice('Clipboard unavailable on this LAN address. Select the room code or invite link below and copy it manually.'); }
  };
  const canEnter = session?.role === 'host' || (session?.role === 'guest' && peers.length > 0);

  return <section className="lan-lobby" aria-label="Multiplayer lobby">
    <header className="lan-header"><div><span className="lan-kicker">BLOCKPLAY / LOCAL OPERATIONS</span><h2>Never deploy alone.</h2><p>Marina Bay. Your squad. A few uninvited bots.</p></div><span className="lan-network-badge"><Wifi size={15} /> P2P / LAN</span></header>
    <div className="lan-layout">
      <main className="lan-main">
        <div className="lan-mode-picker" aria-label="Connection mode">
          {([{ id: 'host', icon: Radio, title: 'Host LAN', detail: 'Create a room' }, { id: 'join', icon: Users, title: 'Join LAN', detail: 'Enter a room code' }, { id: 'solo', icon: Bot, title: 'Solo vs bots', detail: 'No connection needed' }] as const).map(option => <button key={option.id} aria-pressed={mode === option.id} onClick={() => chooseMode(option.id)}><option.icon size={23} /><strong>{option.title}</strong><small>{option.detail}</small></button>)}
        </div>
        <div className="lan-briefing"><span className="lan-kicker">{mode === 'solo' ? 'TRAINING OPERATION' : 'SQUAD CONNECTION'}</span><h3>{session ? 'Room secured.' : mode === 'host' ? 'Rally your squad.' : mode === 'join' ? 'Find your host.' : 'Sharpen your instincts.'}</h3><p>{mode === 'solo' ? 'Patrolling opponents, live firefights and respawns. Choose your bot count and bring your equipped loadout.' : mode === 'host' ? 'Start a room, share its code and keep this tab open. Your computer runs the match and the bots.' : 'Open the same host address as your squad, then enter the room code. Your equipped gear deploys with you.'}</p></div>
        <label className="lan-field"><span>DISPLAY NAME <small>20 characters max</small></span><input value={name} maxLength={20} autoComplete="nickname" spellCheck={false} disabled={busy || !!session} onChange={event => setName(event.target.value)} placeholder="Your callsign" /></label>
        {mode === 'join' && !session && <label className="lan-field"><span>ROOM CODE</span><input className="lan-code-input" value={room} maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} disabled={busy} onChange={event => setRoom(event.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase())} onKeyDown={event => { if (event.key === 'Enter' && !busy) void connect(); }} placeholder="ABC123" /></label>}
        {mode !== 'join' && <div className="lan-bot-control"><div><Bot size={19} /><label htmlFor="lan-bot-count">BOT OPPONENTS<small>{mode === 'host' ? 'Simulated by the host' : 'Runs entirely on this device'}</small></label><output htmlFor="lan-bot-count">{bots.toString().padStart(2, '0')}</output></div><input id="lan-bot-count" type="range" min={mode === 'solo' ? 1 : 0} max="6" step="1" value={bots} onChange={event => setBots(Number(event.target.value))} /><div className="lan-slider-scale"><span>{mode === 'solo' ? '1 BOT' : 'PLAYERS ONLY'}</span><span>6 BOTS</span></div></div>}
        {mode !== 'join' && <div className="lan-squad-control"><label htmlFor="lan-squad">OPPONENT SQUAD</label><select id="lan-squad" value={squad} disabled={!bots} onChange={event => setSquad(event.target.value as Squad)}><option value="mixed">Mixed squad</option><option value="assault">Assault squad</option><option value="tank">Tank squad</option><option value="sniper">Sniper squad</option></select><p>{squad === 'mixed' ? 'Assault flankers, armored heavy infantry and distant snipers.' : squad === 'assault' ? 'Mobile infantry close the distance and flank their opponents.' : squad === 'tank' ? 'Heavy infantry trade movement speed for stronger armor.' : 'Snipers keep their distance and look for clear sightlines.'}</p></div>}
        <p className="lan-loadout-note"><Shield size={14} /> Uses your equipped Armory loadout.</p>
        {session?.role === 'host' && <div className="lan-invite"><span className="lan-kicker">INVITE YOUR SQUAD</span><div className="lan-room-code"><output aria-label="Room code">{room}</output><button onClick={() => void copy(room, 'Room code')} aria-label="Copy room code"><Copy size={17} /></button></div><label className="lan-field"><span>SHARE THIS HOST ADDRESS</span><input aria-label="Invite link" readOnly value={shareUrl.toString()} onFocus={event => event.target.select()} /></label><button className="lan-secondary" onClick={() => void copy(shareUrl.toString(), 'Invite link')}><Copy size={14} /> Copy invite link</button>{['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <small className="lan-local-warning">This address only opens on your computer. Use the LAN URL printed by <code>pnpm lan</code> before sharing an invite.</small>}</div>}
        {error && <p className="lan-error" role="alert">{error}</p>}
        {notice && <p className="lan-notice" role="status">{notice}</p>}
        {!session ? <button className="lan-deploy" disabled={busy || !name.trim()} onClick={() => void connect()}>{busy ? <><LoaderCircle size={18} className="lan-spinner" /> {mode === 'host' ? 'Creating room…' : 'Connecting to host…'}</> : <><Crosshair size={18} /> {mode === 'host' ? 'Create LAN room' : mode === 'join' ? 'Connect to room' : 'Deploy against bots'}<ArrowRight size={18} /></>}</button> : <button className="lan-deploy" disabled={!canEnter} onClick={() => deploy(session, session.role === 'guest' ? 0 : bots)}><Crosshair size={18} /> {session.role === 'guest' ? 'Enter multiplayer match' : 'Deploy squad'} <ArrowRight size={18} /></button>}
        {busy && <><small className="lan-connecting-note">Establishing a direct connection. This can take up to 25 seconds.</small><button className="lan-cancel" onClick={disconnect}>Cancel connection</button></>}
        {session && <button className="lan-cancel" onClick={disconnect}>Leave room</button>}
      </main>
      <aside className="lan-sidebar">
        <div className="lan-map"><svg viewBox="0 0 240 135" aria-hidden="true"><defs><pattern id="lan-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".2" /></pattern></defs><rect width="240" height="135" fill="url(#lan-grid)" /><path d="M0 125 28 90 85 88 122 68 150 25 165 0M18 135 48 104 103 98 141 78 170 32 193 0" fill="none" stroke="currentColor" opacity=".4" strokeWidth="2" /><path d="m75 54 7-24 11 3-7 24z m23 5 7-24 11 3-7 24z m23 4 7-24 11 3-7 24z" fill="currentColor" opacity=".6" /><circle cx="115" cy="91" r="19" fill="none" stroke="#eacb81" strokeDasharray="3 4" /><circle cx="115" cy="91" r="4" fill="#eacb81" /><path d="M0 55h46l24 20m85 29 34-24h51" fill="none" stroke="currentColor" opacity=".3" /></svg><span>MARINA BAY <small>1.283° N / 103.860° E</small></span></div>
        <div className="lan-roster"><div className="lan-roster-heading"><span className="lan-kicker">{mode === 'solo' ? 'DEPLOYMENT' : 'CONNECTED ROSTER'}</span><b>{1 + peers.length} <Users size={13} /></b></div><ul><li><span className="lan-player-icon"><Shield size={16} /></span><div><strong>{name.trim() || 'Operator'} <small>YOU</small></strong><span>{mode === 'join' ? session ? 'Connected to host' : 'Not connected' : mode === 'solo' ? 'Local operator' : session ? 'Room host' : 'Host operator'}</span></div>{session || mode === 'solo' ? <Check size={15} /> : <span className="lan-pending-dot" />}</li>{peers.map(peer => <li key={peer.id}><span className="lan-player-icon"><Users size={16} /></span><div><strong>{peer.name}</strong><span>Connected · P2P</span></div><Check size={15} /></li>)}{mode !== 'join' && bots > 0 && <li className="lan-bot-roster"><span className="lan-player-icon"><Bot size={16} /></span><div><strong>{bots} bot {bots === 1 ? 'opponent' : 'opponents'}</strong><span>Patrol · engage · respawn</span></div></li>}</ul>{mode !== 'solo' && !peers.length && <p>{session?.role === 'host' ? 'Waiting for your squad. You can deploy now; friends can join while the room stays open.' : 'Players appear here after connecting.'}</p>}{session?.role === 'guest' && !peers.length && <p className="lan-roster-warning" role="status">Host disconnected. Leave this room and reconnect.</p>}</div>
        <div className="lan-connection-guide"><Wifi size={18} /><h4>Same network. Same fight.</h4><ol><li>On the host computer, run <code>pnpm lan</code>.</li><li>Everyone opens the printed LAN address on the same Wi-Fi.</li><li>Host creates a room. Friends join with its code.</li></ol><p>Gameplay travels directly between browsers. Keep the host tab open. VPNs, guest Wi-Fi and firewalls can block local peers.</p>{server === false && mode !== 'solo' && <div className="lan-service-warning" role="status">LAN signaling is unavailable at this address. Start <code>pnpm lan</code>, then open its printed LAN URL. Solo bots are available now.</div>}</div>
      </aside>
    </div>
    <footer className="lan-footer"><button onClick={() => { disconnect(); onBack(); }}><ArrowLeft size={15} /> Back to range</button><span>HOSTED P2P · NO ACCOUNT REQUIRED</span></footer>
  </section>;
}
