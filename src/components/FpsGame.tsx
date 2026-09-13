import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { createFpsEngine, initialFpsHud, type FpsEngine } from '../game/fps-engine';
import { FPS_TARGETS } from '../game/fps-rules';
import { progression } from '../game/progression';
import { resolveLoadout, type ArmoryProfile, type ExerciseReward } from '../game/armory-state';

export default function FpsGame({ suspended = false, profile, onReward, onElimination, onOpenShop }: { suspended?: boolean; profile: ArmoryProfile; onReward: (result: ExerciseReward) => void; onElimination: (id: string) => void; onOpenShop: () => void }) {
  const rank = progression(profile.xp);
  const startingLevel = useRef(rank.level);
  const eliminationCallback = useRef(onElimination); eliminationCallback.current = onElimination;
  const [equipment] = useState(() => resolveLoadout(profile));
  const [combat, setCombat] = useState(false);
  const rewardCallback = useRef(onReward); rewardCallback.current = onReward;
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), engine = useRef<FpsEngine | null>(null);
  const [hud, setHud] = useState(initialFpsHud), [epoch, setEpoch] = useState(0);
  useEffect(() => {
    setHud({ ...initialFpsHud });
    try { engine.current = createFpsEngine(host.current!, setHud, { loadout: equipment, combat, onComplete: result => rewardCallback.current(result), onElimination: id => eliminationCallback.current(id) }); }
    catch { setHud(h => ({ ...h, phase: 'error', message: '3D graphics could not start. Check that WebGL is enabled, then retry.' })); }
    return () => { engine.current?.dispose(); engine.current = null; };
  }, [epoch, combat, equipment]);
  useEffect(() => { if (suspended) engine.current?.pause(); }, [suspended]);
  const resetExercise = () => { startingLevel.current = rank.level; engine.current?.reset(); };
  const chooseDrill = (next: boolean) => { if (combat !== next) { startingLevel.current = rank.level; setCombat(next); } };
  const mounted = hud.vehicle !== 'on-foot';
  const playing = hud.phase === 'playing', weapon = equipment.weapons[hud.weapon];
  const accuracy = hud.shots ? Math.round(hud.landed / hud.shots * 100) : 0;
  const hold = (key: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); engine.current?.setInput(key, true); },
    onPointerUp: () => engine.current?.setInput(key, false),
    onPointerCancel: () => engine.current?.setInput(key, false),
    onLostPointerCapture: () => engine.current?.setInput(key, false),
  });
  return <div className="fps-game" ref={stage} data-phase={hud.phase} data-health={hud.health.toFixed(1)} data-armor={hud.armor.toFixed(1)} data-vehicle={hud.vehicle} data-speed={hud.vehicleSpeed.toFixed(2)} data-altitude={hud.altitude.toFixed(2)} data-player-x={hud.x.toFixed(3)} data-player-z={hud.z.toFixed(3)}>
    <div className="viewport fps-viewport">
      <div className="world" ref={host} />
      <div className="fps-top"><span className="fps-badge"><span className="status-dot" /> MARINA BAY / FIELD RANGE</span><span className="fps-score">{hud.hits} / {FPS_TARGETS.length} TARGETS <b>{hud.elapsed.toFixed(1)}s</b></span></div>
      {playing && <>
        <div className="fps-vitals"><span>HP <b>{Math.ceil(hud.health)}</b></span><span>ARMOR <b>{Math.ceil(hud.armor)}</b></span></div>
        {hud.hurt && <div className="fps-damage-overlay" aria-hidden="true" />}
        {hud.incoming && <div className="fps-incoming">INCOMING · MOVE OR TAKE COVER</div>}
        {!mounted && hud.aiming && <div className="fps-scope" aria-hidden="true" />}
        {!mounted && <div className={`fps-crosshair ${hud.aiming ? 'aiming' : ''} ${hud.hit ? 'hit' : ''}`} aria-hidden="true"><i /><i /><i /><i /><b /></div>}
        {hud.hit && <div className="fps-hit-label" aria-hidden="true">HIT −{hud.lastDamage}</div>}
        {hud.callout && <div key={`${hud.hits}-${hud.callout}`} className="fps-kill-callout" role="status"><span>ELIMINATION CHAIN ×{hud.chain}</span><strong>{hud.callout}</strong><small>+25 XP</small></div>}
        <div className="fps-compass">SG <span>· · ·</span> PROMENADE <span>· · ·</span> 01</div>
        {!mounted && <div className="fps-ammo"><span>{weapon.name} <small>{hud.aiming ? 'AIM' : 'AUTO'}</small></span><strong>{hud.magazine.toString().padStart(2, '0')}<small>/ {hud.reserve}</small></strong><p>{hud.reloading > 0 ? 'RELOADING…' : hud.magazine === 0 ? 'EMPTY · PRESS R' : '1 / 2 SWITCH · R RELOAD'}</p>{hud.reloading > 0 && <div className="fps-reload-track"><i style={{ width: `${(1 - hud.reloading) * 100}%` }} /></div>}</div>}
        <div className="fps-objective">{mounted ? hud.vehicle === 'car' ? 'W / S throttle · A / D steer · Space brake' : 'W / S cruise · A / D yaw · Space climb · C / Ctrl descend' : 'Clear the 8 round targets along the promenade.'}<small>{hud.locked ? 'ESC pauses and releases the mouse' : 'Drag to look · On-screen controls available'}</small></div>
        <div className="fps-vehicle-locator">CAR {Math.round(hud.carDistance)}m <span>·</span> HELI {Math.round(hud.helicopterDistance)}m</div>
        {hud.interact && <div className="fps-interact-prompt">{hud.interact}</div>}
        {hud.vehicleNotice && <div className="fps-vehicle-notice" role="status">{hud.vehicleNotice}</div>}
        {mounted && <div className="fps-vehicle-hud"><span>{hud.vehicle === 'car' ? 'UTILITY 01 / DRIVER' : 'FALCON 01 / PILOT'}</span><strong>{Math.round(hud.vehicleSpeed)}<small>KM/H</small></strong>{hud.vehicle === 'helicopter' && <b>{hud.altitude.toFixed(1)} m ALT</b>}<p>{hud.vehicle === 'helicopter' ? 'SHIFT BOOST · LAND TO DISMOUNT' : 'BRAKE TO DISMOUNT'}</p></div>}
      </>}
      {!playing && <div className="fps-overlay"><div className="fps-start-card">
        <span className="eyebrow">{hud.phase === 'defeated' ? 'EXERCISE ENDED' : hud.phase === 'complete' ? 'RANGE CLEAR' : hud.phase === 'paused' ? 'TAKE A BREATHER' : 'SINGAPORE / FIELD EXERCISE 01'}</span>
        <h2>{hud.phase === 'loading' ? 'Preparing the range.' : hud.phase === 'error' ? 'Range unavailable.' : hud.phase === 'defeated' ? 'Regroup. Re-equip.' : hud.phase === 'complete' ? 'Eight for eight.' : hud.phase === 'paused' ? 'Exercise paused.' : 'Fall in. Take aim.'}</h2>
        <p>{hud.phase === 'loading' ? 'Loading your equipment and the waterfront.' : hud.phase === 'error' ? hud.message : hud.phase === 'defeated' ? 'Your health reached zero. Move during the incoming warning or break line of sight. Armor absorbs a share of each hit until depleted.' : hud.phase === 'complete' ? `${hud.elapsed.toFixed(1)} seconds · ${hud.shots} shots · ${accuracy}% accuracy` : 'Clear eight targets, each with 100–115 health. Your equipped gear applies here. Press E near Utility 01 or Falcon 01 to drive or fly between targets.'}</p>
        {['ready', 'complete', 'defeated'].includes(hud.phase) && <div className="fps-drill-choice"><button aria-pressed={!combat} onClick={() => chooseDrill(false)}>Practice</button><button aria-pressed={combat} onClick={() => chooseDrill(true)}>Counter-fire · +100 CR</button></div>}
        {hud.message && hud.phase !== 'error' && <p className="fps-capture-error" role="alert">{hud.message}</p>}
        {hud.phase !== 'loading' && hud.phase !== 'error' && <p className="fps-armor-note">{equipment.rigName} · {equipment.plateName} · {equipment.armor} AP<br />{combat ? 'Targets return simulated fire. Move when warned to dodge.' : 'Practice mode: targets do not return fire.'}</p>}
        {hud.phase === 'complete' && <div className="fps-reward">+{hud.earned} CR · +{hud.earnedXp} XP earned{rank.level > startingLevel.current && <strong className="fps-level-up">LEVEL UP · LV {rank.level} {rank.rank.toUpperCase()}</strong>}{hud.callout && <span className="fps-final-callout">{hud.callout}</span>}</div>}
        <button className="primary-button" disabled={hud.phase === 'loading' || suspended} onClick={() => { if (hud.phase === 'error') setEpoch(n => n + 1); else if (hud.phase === 'complete' || hud.phase === 'defeated') resetExercise(); else engine.current?.start(); }}>
          {hud.phase === 'complete' || hud.phase === 'defeated' || hud.phase === 'error' ? <RotateCcw size={16} /> : <Play size={16} />} {hud.phase === 'loading' ? 'Loading…' : hud.phase === 'error' ? 'Retry' : hud.phase === 'complete' || hud.phase === 'defeated' ? 'Reset exercise' : hud.phase === 'paused' ? 'Resume exercise' : 'Enter range'} <ArrowRight size={17} />
        </button>
        <button className="fps-shop-link" onClick={onOpenShop}>Open armory · change equipment →</button>
        <div className="fps-control-guide"><span><kbd>WASD</kbd> Move</span><span><kbd>LMB</kbd> Fire</span><span><kbd>RMB</kbd> Aim</span><span><kbd>R</kbd> Reload</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>C</kbd> Crouch</span><span><kbd>Space</kbd> Jump</span><span><kbd>1 / 2</kbd> Switch</span><span><kbd>E</kbd> Enter / exit vehicle</span><span><kbd>Space / C</kbd> Fly up / down</span></div>
        <small className="fps-touch-note">On touchscreens, drag the scene to look and use the controls below.</small>
      </div></div>}
    </div>
    <div className="experience-toolbar fps-toolbar"><div className="experience-title"><span className="mode-icon"><Crosshair size={22} /></span><div><h3>Marina FPS · field range</h3><p>{combat ? 'Counter-fire drill' : 'Practice drill'} · Custom loadout · 8 targets</p></div></div><div className="toolbar-actions">
      <button className="icon-button" aria-label={hud.muted ? 'Enable range sound' : 'Mute range sound'} onClick={() => engine.current?.toggleSound()}>{hud.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      <button className="icon-button" aria-label="Fullscreen range" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stage.current?.requestFullscreen().catch(() => {}); }}><Maximize size={16} /></button>
      <button className="icon-button" aria-label="Reset FPS exercise" disabled={hud.phase === 'loading' || hud.phase === 'error'} onClick={resetExercise}><RotateCcw size={16} /></button>
      <button className="session-button" disabled={hud.phase === 'loading' || hud.phase === 'error' || hud.phase === 'complete' || hud.phase === 'defeated' || suspended} onClick={() => playing ? engine.current?.pause() : engine.current?.start()}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause' : hud.phase === 'ready' ? 'Start' : 'Resume'}</button>
    </div></div>
    <div className="fps-loadout" aria-label="Weapon selection">{equipment.weapons.map((w, i) => <button key={w.id} aria-pressed={i === hud.weapon} disabled={hud.phase === 'loading' || hud.phase === 'error'} onClick={() => engine.current?.switchWeapon(i)}><kbd>{i + 1}</kbd><span>{w.name}<small>{w.role}</small></span><span className="fps-selected">{i === hud.weapon ? 'EQUIPPED' : 'EQUIP'}</span></button>)}<div className="fps-accuracy"><span>ACCURACY</span><strong>{accuracy}%</strong></div></div>
    <div className="fps-inputs" aria-label="On-screen FPS controls">
      <div className="fps-dpad">{(['a', 'w', 's', 'd'] as const).map((key, i) => { const Icon = [ArrowLeft, ArrowUp, ArrowDown, ArrowRight][i]; return <button key={key} disabled={!playing} aria-label={`FPS ${['left', 'forward', 'backward', 'right'][i]}`} {...hold(key)}><Icon size={18} /></button>; })}</div>
      <button disabled={!playing} {...hold('shift')}>{hud.vehicle === 'helicopter' ? 'Boost' : 'Sprint'}</button><button disabled={!playing} {...hold('c')}>{hud.vehicle === 'helicopter' ? 'Descend' : 'Crouch'}</button>{mounted ? <button disabled={!playing} {...hold(' ')}>{hud.vehicle === 'car' ? 'Brake' : 'Climb'}</button> : <button disabled={!playing} onClick={() => engine.current?.jump()}>Jump</button>}<button disabled={!playing || !hud.interact} onClick={() => engine.current?.interactVehicle()}>{mounted ? 'Exit vehicle' : 'Enter vehicle'}</button><button disabled={!playing || mounted} onClick={() => engine.current?.reload()}>Reload</button><button disabled={!playing || mounted} aria-pressed={hud.aiming} onClick={() => engine.current?.toggleAim()}>Aim</button><button className="fps-fire-button" disabled={!playing || mounted} {...hold('fire')}>Fire</button>
    </div>
    <div className="fps-progression-summary"><b>LV {rank.level} · {rank.rank}</b><progress value={rank.progress} max={1} aria-label="FPS level progress" /><span>{rank.remaining ? `${rank.remaining} XP to next level` : 'Maximum level'}</span></div>
    <p className="fps-message" role="status">{hud.message || 'Game balance stats · Scenery blocks shots · Armor replenishes each exercise'}</p>
  </div>;
}
