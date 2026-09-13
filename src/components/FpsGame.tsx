import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Maximize, Minimize, Pause, Play, RotateCcw, Users, Volume2, VolumeX } from 'lucide-react';
import { createFpsEngine, initialFpsHud, type FpsEngine } from '../game/fps-engine';
import { FPS_TARGETS } from '../game/fps-rules';
import { useFpsFullscreen } from '../game/use-fps-fullscreen';
import { progression } from '../game/progression';
import { resolveLoadout, type ArmoryProfile, type ExerciseReward } from '../game/armory-state';
import type { LanSession } from '../game/lan-peer';
import { ARENA_DURATION, ARENA_KILL_LIMIT, type ArenaSnapshot } from '../game/arena-rules';
import FpsMinimap from './FpsMinimap';
import FpsWeaponHud from './FpsWeaponHud';
import FpsDebugPanel from './FpsDebugPanel';
import './arena-hud.css';

type ArenaOptions = { session: LanSession; botCount: number; composition: string };
function Scoreboard({ snapshot, selfId }: { snapshot: ArenaSnapshot; selfId: string }) {
  const actors = [...snapshot.actors].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name));
  return <div className="arena-scoreboard"><table><caption>MATCH STANDINGS <span>{actors.filter(actor => !actor.bot).length} PLAYERS · {actors.filter(actor => actor.bot).length} BOTS</span></caption><thead><tr><th scope="col">OPERATOR</th><th scope="col">ROLE</th><th scope="col">K</th><th scope="col">D</th></tr></thead><tbody>{actors.map((actor, index) => <tr key={actor.id} className={actor.id === selfId ? 'is-self' : ''}><td><span className="arena-place">{index + 1}</span>{actor.name}{actor.id === selfId && <small>YOU</small>}{actor.bot && <small>BOT</small>}</td><td>{actor.role === 'player' ? 'Operator' : actor.role}</td><td>{actor.kills}</td><td>{actor.deaths}</td></tr>)}</tbody></table></div>;
}

export default function FpsGame({ suspended = false, profile, onReward, onElimination, onOpenShop, arena, onLeaveArena }: { suspended?: boolean; profile: ArmoryProfile; onReward: (result: ExerciseReward) => void; onElimination: (id: string) => void; onOpenShop: () => void; arena?: ArenaOptions; onLeaveArena?: () => void }) {
  const rank = progression(profile.xp);
  const startingLevel = useRef(rank.level);
  const eliminationCallback = useRef(onElimination); eliminationCallback.current = onElimination;
  const [equipment] = useState(() => resolveLoadout(profile));
  const [arenaOptions] = useState(() => arena ? { ...arena, profile } : undefined);
  const [combat, setCombat] = useState(false);
  const rewardCallback = useRef(onReward); rewardCallback.current = onReward;
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), engine = useRef<FpsEngine | null>(null);
  const fullscreen = useFpsFullscreen(stage, () => engine.current?.pause());
  const fullscreenAction = useRef(fullscreen.toggle); fullscreenAction.current = fullscreen.toggle;
  const [hud, setHud] = useState(initialFpsHud), [epoch, setEpoch] = useState(0);
  useEffect(() => {
    setHud({ ...initialFpsHud });
    try { engine.current = createFpsEngine(host.current!, setHud, { loadout: equipment, combat, arena: arenaOptions, onComplete: result => rewardCallback.current(result), onElimination: id => eliminationCallback.current(id), onFullscreen: () => { void fullscreenAction.current(); } }); }
    catch { setHud(h => ({ ...h, phase: 'error', message: '3D graphics could not start. Check that WebGL is enabled, then retry.' })); }
    return () => { engine.current?.dispose(); engine.current = null; };
  }, [epoch, combat, equipment, arenaOptions]);
  useEffect(() => { if (suspended) engine.current?.pause(); }, [suspended]);
  const resetExercise = () => { startingLevel.current = rank.level; engine.current?.reset(); };
  const chooseDrill = (next: boolean) => { if (combat !== next) { startingLevel.current = rank.level; setCombat(next); } };
  const isArena = !!arenaOptions, guest = arenaOptions?.session.role === 'guest';
  const mounted = !isArena && hud.vehicle !== 'on-foot';
  const playing = hud.phase === 'playing', weapon = equipment.weapons[hud.weapon];
  const canFight = playing && (!isArena || (hud.arenaSelf?.alive === true && hud.arenaConnected));
  const disconnected = isArena && guest && hud.phase !== 'loading' && !hud.arenaConnected;
  const remaining = Math.max(0, Math.ceil(ARENA_DURATION - (hud.arena?.elapsed || 0)));
  const arenaClock = `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
  const accuracy = hud.shots ? Math.round(hud.landed / hud.shots * 100) : 0;
  const hold = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setInput(key, true); },
    onPointerUp: () => engine.current?.setInput(key, false),
    onPointerCancel: () => engine.current?.setInput(key, false),
    onLostPointerCapture: () => engine.current?.setInput(key, false),
  });
  return <div className={`fps-game ${isArena ? 'is-arena' : ''} ${fullscreen.immersive ? 'is-immersive' : ''}`} ref={stage} data-phase={hud.phase} data-pointer-locked={hud.locked} data-health={hud.health.toFixed(1)} data-armor={hud.armor.toFixed(1)} data-vehicle={hud.vehicle} data-speed={hud.vehicleSpeed.toFixed(2)} data-altitude={hud.altitude.toFixed(2)} data-player-x={hud.x.toFixed(3)} data-player-z={hud.z.toFixed(3)} data-arena={isArena || undefined} data-arena-connected={isArena ? hud.arenaConnected : undefined} data-arena-alive={hud.arenaSelf?.alive} data-arena-kills={hud.arenaSelf?.kills}>
    <div className="viewport fps-viewport">
      <div className="world" ref={host} />
      {fullscreen.immersive && fullscreen.notice && <div className="fps-screen-notice" role="status">{fullscreen.notice}</div>}
      {fullscreen.immersive && <div className="fps-immersive-hint">F · FULLSCREEN <span>ESC · PAUSE & RELEASE MOUSE</span></div>}
      {fullscreen.immersive && !playing && <button className="fps-leave-screen" onClick={() => { void fullscreen.toggle(); }}><Minimize size={14} /> Exit fullscreen</button>}
      <div className="fps-top"><span className="fps-badge"><span className="status-dot" /> MARINA BAY / {isArena ? 'ARENA' : 'FIELD RANGE'}</span><span className="fps-score">{isArena ? `${hud.arenaSelf?.kills || 0} K / ${hud.arenaSelf?.deaths || 0} D` : `${hud.hits} / ${FPS_TARGETS.length} TARGETS`} <b>{isArena ? arenaClock : `${hud.elapsed.toFixed(1)}s`}</b></span></div>
      {isArena && playing && <><div className="arena-kill-feed" aria-label="Elimination feed">{hud.arena?.feed.slice(-4).map(event => <p key={event.id} className={event.killerId === arenaOptions.session.id ? 'own-kill' : event.victimId === arenaOptions.session.id ? 'own-death' : ''}>{event.text}</p>)}</div>{hud.arenaSelf && !hud.arenaSelf.alive && <div className="arena-respawn" role="status"><span>ELIMINATED</span><strong>Back in {Math.ceil(hud.arenaSelf.respawnIn)}s</strong><small>Armor and ammunition replenish on respawn.</small></div>}{!hud.arenaStarted && !disconnected && <div className="arena-waiting" role="status">Waiting for the host to start the match.</div>}</>}
      {playing && <>
        <FpsMinimap zone="marina-bay" player={hud} markers={isArena ? [] : hud.mapMarkers} mode={isArena ? 'arena' : 'practice'} />
        <div className="fps-vitals"><span>HP <b>{Math.ceil(hud.health)}</b>{hud.maxHealth > 100 && <small> / {hud.maxHealth}</small>}</span><span>ARMOR <b>{Math.ceil(hud.armor)}</b></span><span aria-label="Mouse capture status">{hud.locked ? 'MOUSE LOCKED' : 'TOUCH LOOK'}</span></div>
        {hud.hurt && <div className="fps-damage-overlay" aria-hidden="true" />}
        {hud.incoming && <div className="fps-incoming">INCOMING · MOVE OR TAKE COVER</div>}
        {hud.hit && <div className="fps-hit-label" aria-hidden="true">HIT −{hud.lastDamage}</div>}
        {hud.callout && <div key={`${hud.hits}-${hud.callout}`} className="fps-kill-callout" role="status"><span>ELIMINATION CHAIN ×{hud.chain}</span><strong>{hud.callout}</strong>{!isArena && <small>+25 XP</small>}</div>}
        <div className="fps-compass">SG <span>· · ·</span> PROMENADE <span>· · ·</span> 01</div>
        {!mounted && <FpsWeaponHud hud={hud} weapon={weapon} canFight={canFight} />}
        <div className="fps-objective">{isArena ? `FREE FOR ALL · First to ${ARENA_KILL_LIMIT} eliminations` : mounted ? hud.vehicle === 'car' ? 'W / S throttle · A / D steer · Space brake' : 'W / S cruise · A / D yaw · Space climb · C / Ctrl descend' : 'Clear the 8 round targets along the promenade.'}<small>{hud.locked ? isArena ? 'ESC opens menu · Match keeps running' : 'ESC pauses and releases the mouse' : 'Drag to look · On-screen controls available'}</small></div>
        {!isArena && <div className="fps-vehicle-locator">CAR {Math.round(hud.carDistance)}m <span>·</span> HELI {Math.round(hud.helicopterDistance)}m</div>}
        {!isArena && hud.interact && <div className="fps-interact-prompt">{hud.interact}</div>}
        {!isArena && hud.vehicleNotice && <div className="fps-vehicle-notice" role="status">{hud.vehicleNotice}</div>}
        {mounted && <div className="fps-vehicle-hud"><span>{hud.vehicle === 'car' ? 'UTILITY 01 / DRIVER' : 'FALCON 01 / PILOT'}</span><strong>{Math.round(hud.vehicleSpeed)}<small>KM/H</small></strong>{hud.vehicle === 'helicopter' && <b>{hud.altitude.toFixed(1)} m ALT</b>}<p>{hud.vehicle === 'helicopter' ? 'SHIFT BOOST · LAND TO DISMOUNT' : 'BRAKE TO DISMOUNT'}</p></div>}
      </>}
      {isArena && (!playing || disconnected) && <div className="fps-overlay arena-overlay"><div className="fps-start-card arena-start-card">
        <span className="eyebrow">{disconnected ? 'CONNECTION LOST' : hud.phase === 'complete' ? 'MATCH COMPLETE' : hud.phase === 'paused' ? 'OPERATOR MENU' : arenaOptions.session.role === 'solo' ? 'SOLO / BOT ARENA' : 'P2P / LAN ARENA'}</span>
        <h2>{disconnected ? 'Host disconnected.' : hud.phase === 'loading' ? 'Preparing the arena.' : hud.phase === 'error' ? 'Arena unavailable.' : hud.phase === 'complete' ? `${hud.arena?.winner || 'Match'} wins.` : hud.phase === 'paused' ? 'Stay in the fight.' : 'Squad up. Stand out.'}</h2>
        <p>{disconnected ? 'The host connection has closed. Return to the lobby and reconnect to a new room.' : hud.phase === 'loading' ? 'Loading your equipped gear and connecting the match.' : hud.phase === 'error' ? hud.message : hud.phase === 'complete' ? `${hud.arenaSelf?.kills || 0} eliminations · ${hud.arenaSelf?.deaths || 0} deaths · ${accuracy}% accuracy` : hud.phase === 'paused' ? 'Your menu is open. The match and other players keep running.' : `Free for all. First to ${ARENA_KILL_LIMIT} eliminations or the highest score after 3 minutes wins. Respawn after 3 seconds and get back in.`}</p>
        {!['loading', 'error', 'complete'].includes(hud.phase) && !disconnected && <p className="fps-armor-note">{equipment.rigName} · {equipment.plateName} · {equipment.armor} AP<br />{guest ? 'The host runs the match and the bots.' : `${arenaOptions.botCount} bots · ${arenaOptions.composition} squad · Infantry combat`}</p>}
        {hud.message && hud.phase !== 'error' && !disconnected && <p className="fps-capture-error" role="alert">{hud.message}</p>}
        <FpsDebugPanel hud={hud} engine={engine.current} />
        {hud.phase === 'complete' && hud.arena && <Scoreboard snapshot={hud.arena} selfId={arenaOptions.session.id} />}
        {!disconnected && <button className="primary-button" disabled={hud.phase === 'loading' || suspended || (guest && hud.phase === 'complete')} onClick={() => { if (hud.phase === 'error') setEpoch(n => n + 1); else if (hud.phase === 'complete') resetExercise(); else engine.current?.start(); }}>
          {hud.phase === 'complete' || hud.phase === 'error' ? <RotateCcw size={16} /> : <Play size={16} />} {hud.phase === 'loading' ? 'Loading…' : hud.phase === 'error' ? 'Retry' : hud.phase === 'complete' ? guest ? 'Waiting for host rematch' : 'Start a rematch' : hud.phase === 'paused' ? 'Resume match' : guest ? 'Enter match' : 'Start match'} <ArrowRight size={17} />
        </button>}
        <button className="fps-shop-link" onClick={onLeaveArena}>Leave match · return to lobby →</button>
        <button className="fps-shop-link arena-armory-link" onClick={onOpenShop}>Leave match · open armory →</button>
        {!['complete', 'loading', 'error'].includes(hud.phase) && !disconnected && <div className="fps-control-guide"><span><kbd>WASD</kbd> Move</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>C</kbd> Crouch</span><span><kbd>Space</kbd> Jump</span><span><kbd>1 / 2</kbd> Switch</span><span><kbd>F</kbd> Fullscreen</span><span><kbd>ESC</kbd> Menu</span></div>}
        <small className="fps-touch-note">Infantry arena · Your equipped Armory loadout · No account required</small>
      </div></div>}
      {!playing && !isArena && <div className="fps-overlay"><div className="fps-start-card">
        <span className="eyebrow">{hud.phase === 'defeated' ? 'EXERCISE ENDED' : hud.phase === 'complete' ? 'RANGE CLEAR' : hud.phase === 'paused' ? 'TAKE A BREATHER' : 'SINGAPORE / FIELD EXERCISE 01'}</span>
        <h2>{hud.phase === 'loading' ? 'Preparing the range.' : hud.phase === 'error' ? 'Range unavailable.' : hud.phase === 'defeated' ? 'Regroup. Re-equip.' : hud.phase === 'complete' ? 'Eight for eight.' : hud.phase === 'paused' ? 'Exercise paused.' : 'Fall in. Take aim.'}</h2>
        <p>{hud.phase === 'loading' ? 'Loading your equipment and the waterfront.' : hud.phase === 'error' ? hud.message : hud.phase === 'defeated' ? 'Your health reached zero. Move during the incoming warning or break line of sight. Armor absorbs a share of each hit until depleted.' : hud.phase === 'complete' ? `${hud.elapsed.toFixed(1)} seconds · ${hud.shots} shots · ${accuracy}% accuracy` : 'Clear eight targets, each with 100–115 health. Your equipped gear applies here. Press E near Utility 01 or Falcon 01 to drive or fly between targets.'}</p>
        {['ready', 'complete', 'defeated'].includes(hud.phase) && <div className="fps-drill-choice"><button aria-pressed={!combat} onClick={() => chooseDrill(false)}>Practice</button><button aria-pressed={combat} onClick={() => chooseDrill(true)}>Counter-fire · +100 CR</button></div>}
        {hud.message && hud.phase !== 'error' && <p className="fps-capture-error" role="alert">{hud.message}</p>}
        <FpsDebugPanel hud={hud} engine={engine.current} />
        {hud.phase !== 'loading' && hud.phase !== 'error' && <p className="fps-armor-note">{equipment.rigName} · {equipment.plateName} · {equipment.armor} AP<br />{combat ? 'Targets return simulated fire. Move when warned to dodge.' : 'Practice mode: targets do not return fire.'}</p>}
        {hud.phase === 'complete' && <div className="fps-reward">+{hud.earned} CR · +{hud.earnedXp} XP earned{rank.level > startingLevel.current && <strong className="fps-level-up">LEVEL UP · LV {rank.level} {rank.rank.toUpperCase()}</strong>}{hud.callout && <span className="fps-final-callout">{hud.callout}</span>}</div>}
        <button className="primary-button" disabled={hud.phase === 'loading' || suspended} onClick={() => { if (hud.phase === 'error') setEpoch(n => n + 1); else if (hud.phase === 'complete' || hud.phase === 'defeated') resetExercise(); else engine.current?.start(); }}>
          {hud.phase === 'complete' || hud.phase === 'defeated' || hud.phase === 'error' ? <RotateCcw size={16} /> : <Play size={16} />} {hud.phase === 'loading' ? 'Loading…' : hud.phase === 'error' ? 'Retry' : hud.phase === 'complete' || hud.phase === 'defeated' ? 'Reset exercise' : hud.phase === 'paused' ? 'Resume exercise' : 'Enter range'} <ArrowRight size={17} />
        </button>
        <button className="fps-shop-link" onClick={onOpenShop}>Open armory · change equipment →</button>
        <div className="fps-control-guide"><span><kbd>WASD</kbd> Move</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>C</kbd> Crouch</span><span><kbd>Space</kbd> Jump</span><span><kbd>1 / 2</kbd> Switch</span><span><kbd>E</kbd> Enter / exit vehicle</span><span><kbd>Space / C</kbd> Fly up / down</span><span><kbd>F</kbd> Fullscreen</span></div>
        <small className="fps-touch-note">On touchscreens, drag the scene to look and use the controls below.</small>
      </div></div>}
    </div>
    <div className="experience-toolbar fps-toolbar"><div className="experience-title"><span className="mode-icon">{isArena ? <Users size={22} /> : <Crosshair size={22} />}</span><div><h3>{isArena ? 'Marina FPS · arena' : 'Marina FPS · field range'}</h3><p>{isArena ? `${arenaOptions.session.role === 'solo' ? 'Solo vs bots' : 'P2P LAN'} · Free for all · ${ARENA_KILL_LIMIT} eliminations` : `${combat ? 'Counter-fire drill' : 'Practice drill'} · Custom loadout · 8 targets`}</p></div></div><div className="toolbar-actions">
      <button className="icon-button" aria-label={hud.muted ? 'Enable range sound' : 'Mute range sound'} onClick={() => engine.current?.toggleSound()}>{hud.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      <button className="session-button fps-fullscreen-button" aria-label={fullscreen.immersive ? 'Exit fullscreen range' : 'Fullscreen range'} aria-pressed={fullscreen.immersive} onClick={() => { void fullscreen.toggle(); }}>{fullscreen.immersive ? <Minimize size={16} /> : <Maximize size={16} />} {fullscreen.immersive ? 'Windowed' : 'Fullscreen'} <kbd>F</kbd></button>
      {!guest && <button className="icon-button" aria-label={isArena ? 'Reset arena match' : 'Reset FPS exercise'} disabled={hud.phase === 'loading' || hud.phase === 'error'} onClick={resetExercise}><RotateCcw size={16} /></button>}
      <button className="session-button" disabled={disconnected || hud.phase === 'loading' || hud.phase === 'error' || hud.phase === 'complete' || hud.phase === 'defeated' || suspended} onClick={() => playing ? engine.current?.pause() : engine.current?.start()}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? isArena ? 'Menu' : 'Pause' : hud.phase === 'ready' ? 'Start' : 'Resume'}</button>
    </div></div>
    <div className="fps-loadout" aria-label="Weapon selection">{equipment.weapons.map((w, i) => <button key={w.id} aria-pressed={i === hud.weapon} disabled={hud.phase === 'loading' || hud.phase === 'error'} onClick={() => engine.current?.switchWeapon(i)}><kbd>{i + 1}</kbd><span>{w.name}<small>{w.role}</small></span><span className="fps-selected">{i === hud.weapon ? 'EQUIPPED' : 'EQUIP'}</span></button>)}<div className="fps-accuracy"><span>ACCURACY</span><strong>{accuracy}%</strong></div></div>
    <div className="fps-inputs" aria-label="On-screen FPS controls">
      <div className="fps-dpad">{(['a', 'w', 's', 'd'] as const).map((key, i) => { const Icon = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight][i]; return <button key={key} disabled={!canFight} aria-label={`FPS ${['left', 'forward', 'backward', 'right'][i]}`} {...hold(key)}><Icon size={18} /></button>; })}</div>
      <button disabled={!canFight} {...hold('shift')}>{hud.vehicle === 'helicopter' ? 'Boost' : 'Sprint'}</button><button disabled={!canFight} {...hold('c')}>{hud.vehicle === 'helicopter' ? 'Descend' : 'Crouch'}</button>{mounted ? <button disabled={!canFight} {...hold(' ')}>{hud.vehicle === 'car' ? 'Brake' : 'Climb'}</button> : <button disabled={!canFight} onClick={() => engine.current?.jump()}>Jump</button>}{!isArena && <button disabled={!playing || !hud.interact} onClick={() => engine.current?.interactVehicle()}>{mounted ? 'Exit vehicle' : 'Enter vehicle'}</button>}<button disabled={!canFight || mounted} onClick={() => engine.current?.reload()}>Reload</button><button disabled={!canFight || mounted} aria-pressed={hud.aiming} onClick={() => engine.current?.toggleAim()}>Aim</button><button className="fps-fire-button" disabled={!canFight || mounted} {...hold('fire')}>Fire</button>
    </div>
    {isArena && hud.arena && hud.phase !== 'complete' && <details className="arena-standings" open={!playing}><summary>Match scoreboard <span>{hud.arena.actors.length} combatants</span></summary><Scoreboard snapshot={hud.arena} selfId={arenaOptions.session.id} /></details>}
    {isArena ? <div className="arena-session-footer"><span>{arenaOptions.session.role === 'solo' ? 'LOCAL BOT MATCH' : hud.arenaConnected ? 'P2P CONNECTED' : 'CONNECTING'} · {arenaOptions.session.name}</span><button onClick={onLeaveArena}>Leave match <ArrowRight size={13} /></button></div> : <div className="fps-progression-summary"><b>LV {rank.level} · {rank.rank}</b><progress value={rank.progress} max={1} aria-label="FPS level progress" /><span>{rank.remaining ? `${rank.remaining} XP to next level` : 'Maximum level'}</span></div>}
    <p className="fps-message" role="status">{fullscreen.notice || hud.message || (isArena ? 'Match scores are session-only · Armor and ammunition replenish on respawn' : 'Game balance stats · Scenery blocks shots · Armor replenishes each exercise')}</p>
  </div>;
}
