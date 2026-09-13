import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Maximize, Minimize, Pause, Play } from 'lucide-react';
import { createFpsEngine, initialFpsHud, type FpsCheckpoint, type FpsEngine } from '../game/fps-engine';
import { resolveLoadout, type ArmoryProfile } from '../game/armory-state';
import { createExpeditionLoot } from '../game/expedition-loot';
import { findWorldRoute, getWorldZone, WORLD_GATEWAYS, WORLD_ZONES, type WorldZoneId, type ZoneSpawn } from '../game/world-zones';
import { useFpsFullscreen } from '../game/use-fps-fullscreen';
import './expedition.css';

interface ExpeditionScene { zone: WorldZoneId; spawn?: ZoneSpawn; checkpoint?: FpsCheckpoint; revision: number }

export default function ExpeditionGame({ profile, onExit, suspended = false, initialZone = 'marina-bay', destination, onZoneChange }: { profile: ArmoryProfile; onExit: () => void; suspended?: boolean; initialZone?: WorldZoneId; destination?: WorldZoneId; onZoneChange?: (zone: WorldZoneId) => void }) {
  const [fieldProfile, setFieldProfile] = useState<ArmoryProfile>(() => structuredClone(profile));
  const fieldProfileRef = useRef(fieldProfile);
  const [loot] = useState(() => createExpeditionLoot(`${Date.now()}-${Math.random()}`));
  const [scene, setScene] = useState<ExpeditionScene>(() => ({ zone: initialZone, revision: 0 }));
  const zoneChanged = useRef(onZoneChange); zoneChanged.current = onZoneChange;
  useEffect(() => { zoneChanged.current?.(scene.zone); }, [scene.zone]);
  const [hud, setHud] = useState(initialFpsHud);
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), engine = useRef<FpsEngine | null>(null);
  const fullscreen = useFpsFullscreen(stage, () => engine.current?.pause());
  const fullscreenAction = useRef(fullscreen.toggle); fullscreenAction.current = fullscreen.toggle;
  useEffect(() => {
    setHud({ ...initialFpsHud });
    try {
      engine.current = createFpsEngine(host.current!, setHud, {
        loadout: resolveLoadout(fieldProfileRef.current),
        expedition: {
          zone: scene.zone, spawn: scene.spawn, checkpoint: scene.checkpoint,
          profile: fieldProfileRef.current, loot,
          onTravel: (transition, checkpoint) => setScene(current => ({ zone: transition.to, spawn: transition.spawn, checkpoint, revision: current.revision + 1 })),
          onEquipment: next => { fieldProfileRef.current = next; setFieldProfile(next); },
        },
        onFullscreen: () => { void fullscreenAction.current(); },
      });
    } catch {
      setHud(current => ({ ...current, phase: 'error', message: 'The district could not load. Check that WebGL is available, then retry.' }));
    }
    return () => { engine.current?.dispose(); engine.current = null; };
  }, [scene, loot]);
  useEffect(() => { if (suspended) engine.current?.pause(); }, [suspended]);

  const zone = getWorldZone(scene.zone), equipment = resolveLoadout(fieldProfile);
  const playing = hud.phase === 'playing', alive = hud.arenaSelf?.alive !== false, canFight = playing && alive;
  const weapon = equipment.weapons[hud.weapon] ?? equipment.weapons[0];
  const gateways = WORLD_GATEWAYS.filter(gateway => gateway.from === scene.zone);
  const plannedRoute = destination ? findWorldRoute(scene.zone, destination) : [];
  const nextCheckpoint = plannedRoute[0];
  const nearbyLoot = [...(hud.fieldLoot ?? [])].sort((a, b) => Math.hypot(a.x - hud.x, a.z - hud.z) - Math.hypot(b.x - hud.x, b.z - hud.z)).slice(0, 5);
  const distance = (point: { x: number; z: number }) => Math.round(Math.hypot(point.x - hud.x, point.z - hud.z));
  const hold = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setInput(key, true); },
    onPointerUp: () => engine.current?.setInput(key, false),
    onPointerCancel: () => engine.current?.setInput(key, false),
    onLostPointerCapture: () => engine.current?.setInput(key, false),
  });
  return <div className={`fps-game expedition-game ${fullscreen.immersive ? 'is-immersive' : ''}`} ref={stage}
    data-phase={hud.phase} data-zone={scene.zone} data-player-x={hud.x.toFixed(3)} data-player-z={hud.z.toFixed(3)}
    data-health={hud.health.toFixed(1)} data-armor={hud.armor.toFixed(1)} data-alive={alive} data-loot-count={hud.fieldLoot?.length ?? 0} data-bot-count={hud.arena?.actors.filter(actor => actor.bot).length ?? 0}>
    <div className="viewport fps-viewport">
      <div className="world" ref={host} />
      <div className="fps-top"><span className="fps-badge"><span className="status-dot" /> {zone.name.toUpperCase()} / EXPEDITION</span><span className={`expedition-risk risk-${zone.risk}`}>{zone.risk.toUpperCase()} THREAT</span></div>
      {fullscreen.immersive && <div className="fps-immersive-hint">F · FULLSCREEN <span>ESC · MENU & RELEASE MOUSE</span></div>}
      {fullscreen.immersive && !playing && <button className="fps-leave-screen" onClick={() => { void fullscreen.toggle(); }}><Minimize size={14} /> Exit fullscreen</button>}
      {playing && <>
        <div className="fps-vitals"><span>HP <b>{Math.ceil(hud.health)}</b></span><span>ARMOR <b>{Math.ceil(hud.armor)}</b></span></div>
        {hud.hurt && <div className="fps-damage-overlay" aria-hidden="true" />}
        {hud.incoming && <div className="fps-incoming">INCOMING · FIND COVER</div>}
        {canFight && hud.aiming && <div className="fps-scope" aria-hidden="true" />}
        {canFight && <div className={`fps-crosshair ${hud.aiming ? 'aiming' : ''} ${hud.hit ? 'hit' : ''}`} aria-hidden="true"><i /><i /><i /><i /><b /></div>}
        {hud.hit && <div className="fps-hit-label">HIT −{hud.lastDamage}</div>}
        {hud.callout && <div className="fps-kill-callout" role="status"><span>ELIMINATION CHAIN ×{hud.chain}</span><strong>{hud.callout}</strong></div>}
        {!alive && <div className="expedition-respawn" role="status"><span>OPERATOR DOWN</span><strong>Regrouping in {Math.ceil(hud.arenaSelf?.respawnIn ?? 0)}s</strong></div>}
        <div className="fps-ammo"><span>{weapon.name}</span><strong>{hud.magazine.toString().padStart(2, '0')}<small>/ {hud.reserve}</small></strong><p>{hud.reloading > 0 ? 'RELOADING…' : '1 / 2 SWITCH · R RELOAD'}</p></div>
        <div className="fps-objective">Explore. Find supplies. Reach the next district.<small>E · PICK UP & EQUIP / T · CROSS CHECKPOINT</small></div>
        <div className="expedition-prompts" role="status">{hud.lootPrompt && <strong>{hud.lootPrompt}</strong>}{hud.travelPrompt && <strong>{hud.travelPrompt}</strong>}{hud.lootNotice && <span>{hud.lootNotice}</span>}</div>
        <div className="expedition-route-hud">{nextCheckpoint && <strong>ROUTE TO {getWorldZone(destination!).name.toUpperCase()}</strong>}{(nextCheckpoint ? [nextCheckpoint] : gateways).map(gateway => <span key={gateway.id}>{getWorldZone(gateway.to).name} <b>{distance(gateway.position)}m</b></span>)}</div>
      </>}
      {!playing && <div className="fps-overlay"><div className="fps-start-card">
        <span className="eyebrow">SOLO EXPEDITION / {zone.risk.toUpperCase()} THREAT</span>
        <h2>{hud.phase === 'loading' ? `Entering ${zone.name}.` : hud.phase === 'error' ? 'District unavailable.' : hud.phase === 'paused' ? 'Operator menu.' : `Welcome to ${zone.name}.`}</h2>
        <p>{hud.phase === 'loading' ? 'Preparing the district, its patrols and supplies.' : hud.phase === 'error' ? hud.message : hud.phase === 'paused' ? 'Your controls are paused. Patrols remain active while the menu is open.' : `${zone.description} Search supply crates, equip weapons and cross marked checkpoints on foot.`}</p>
        {!['loading', 'error'].includes(hud.phase) && <p className="fps-armor-note">{equipment.rigName} · {equipment.plateName}<br />{zone.botCount} defenders · {zone.composition} roles · No match timer</p>}
        {hud.message && hud.phase !== 'error' && <p className="fps-capture-error" role="alert">{hud.message}</p>}
        <button className="primary-button" disabled={hud.phase === 'loading' || suspended} onClick={() => hud.phase === 'error' ? setScene(current => ({ ...current, revision: current.revision + 1 })) : engine.current?.start()}><Play size={16} />{hud.phase === 'loading' ? 'Loading…' : hud.phase === 'error' ? 'Retry district' : hud.phase === 'paused' ? 'Resume expedition' : 'Enter district'}<ArrowRight size={17} /></button>
        <button className="fps-shop-link" onClick={onExit}>Leave expedition →</button>
        <div className="fps-control-guide"><span><kbd>WASD</kbd> Move</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>E</kbd> Take supplies</span><span><kbd>T</kbd> Travel</span><span><kbd>F</kbd> Fullscreen</span></div>
        <small className="fps-touch-note">Field equipment lasts for this expedition. Your permanent Armory stays saved.</small>
      </div></div>}
    </div>
    <div className="experience-toolbar fps-toolbar"><div className="experience-title"><span className="mode-icon"><Compass size={22} /></span><div><h3>{zone.name} · expedition</h3><p>Connected districts · Random supplies · Solo survival</p></div></div><div className="toolbar-actions">
      <button className="session-button" aria-label={fullscreen.immersive ? 'Exit expedition fullscreen' : 'Fullscreen expedition'} onClick={() => { void fullscreen.toggle(); }}>{fullscreen.immersive ? <Minimize size={16} /> : <Maximize size={16} />} Fullscreen</button>
      <button className="session-button" disabled={['loading', 'error'].includes(hud.phase) || suspended} onClick={() => playing ? engine.current?.pause() : engine.current?.start()}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Menu' : 'Resume'}</button>
    </div></div>
    <div className="fps-loadout" aria-label="Field loadout">{equipment.weapons.map((item, index) => <button key={index} disabled={!canFight} aria-pressed={index === hud.weapon} onClick={() => engine.current?.switchWeapon(index)}><kbd>{index + 1}</kbd><span>{item.name}<small>{item.role}</small></span><span className="fps-selected">{index === hud.weapon ? 'EQUIPPED' : 'EQUIP'}</span></button>)}</div>
    <div className="fps-inputs" aria-label="Expedition touch controls">
      <div className="fps-dpad">{(['a', 'w', 's', 'd'] as const).map((key, index) => { const Icon = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight][index]; return <button key={key} disabled={!canFight} aria-label={`Expedition ${['left', 'forward', 'backward', 'right'][index]}`} {...hold(key)}><Icon size={18} /></button>; })}</div>
      <button disabled={!canFight} {...hold('shift')}>Sprint</button><button disabled={!canFight} onClick={() => engine.current?.jump()}>Jump</button><button disabled={!canFight} onClick={() => engine.current?.reload()}>Reload</button><button disabled={!canFight} aria-pressed={hud.aiming} onClick={() => engine.current?.toggleAim()}>Aim</button><button disabled={!canFight || !hud.lootPrompt} onClick={() => engine.current?.interactLoot()}>Pick up · E</button><button disabled={!canFight || !hud.travelPrompt} onClick={() => engine.current?.travelZone()}>Travel · T</button><button className="fps-fire-button" disabled={!canFight} {...hold('fire')}>Fire</button>
    </div>
    <div className="expedition-intel">
      <section><h3>District network</h3><div className="expedition-network">{WORLD_ZONES.map(item => <div key={item.id} className={item.id === scene.zone ? 'current' : ''}><strong>{item.name}</strong><span className={`risk-${item.risk}`}>{item.risk} threat · Tier {item.lootTier}</span>{item.id === scene.zone && <small>YOU ARE HERE</small>}</div>)}</div><p>Queenstown ↔ Raffles Place ↔ Marina Bay</p><p>Raffles is the contested CBD: stronger patrols, better odds of elite weapons.</p></section>
      <section><h3>Checkpoints</h3>{destination && <p className="expedition-planned-route" role="status">{scene.zone === destination ? `You are in ${zone.name}.` : `Planned route: ${[zone.name, ...plannedRoute.map(step => getWorldZone(step.to).name)].join(" → ")}`}</p>}{gateways.map(gateway => <p key={gateway.id}><strong>{getWorldZone(gateway.to).name} · {distance(gateway.position)}m</strong><br /><span>Head to X {gateway.position.x}, Z {gateway.position.z}. Press T within 4m.</span></p>)}<small>Your position: X {Math.round(hud.x)}, Z {Math.round(hud.z)}</small></section>
      <section><h3>Supply scanner</h3>{nearbyLoot.length ? nearbyLoot.map(item => <p key={item.id}><strong>{item.name} · {distance(item)}m</strong><br /><span>{item.tier.toUpperCase()} · X {Math.round(item.x)}, Z {Math.round(item.z)}</span></p>) : <p>{hud.phase === 'loading' ? 'Scanning the district…' : 'No supplies remain nearby.'}</p>}<small>Ground crates: walk close and press E. Picked-up crates stay collected when you return.</small></section>
    </div>
    <div className="expedition-footer"><span>Field gear is temporary · Armory purchases stay saved</span><button onClick={onExit}>Leave expedition <ArrowRight size={14} /></button></div>
    <p className="fps-message" role="status">{fullscreen.notice || hud.message || 'Drag the scene to look on touchscreens. ESC opens the menu; the district remains active.'}</p>
  </div>;
}
