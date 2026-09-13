import type { FpsHud, FpsEngine } from '../game/fps-engine';
import './fps-debug.css';

export default function FpsDebugPanel({ hud, engine }: { hud: FpsHud; engine: FpsEngine | null }) {
  if (!hud.debugAvailable) return null;
  return <details className="fps-debug-panel">
    <summary>Debug survival <span>{hud.debug.healthMultiplier}× HP{hud.debug.regeneration ? ' · REGEN' : ''}</span></summary>
    <div className="fps-debug-options" role="group" aria-label="Debug maximum health">
      {([1, 5, 10] as const).map(multiplier => <button key={multiplier} aria-pressed={hud.debug.healthMultiplier === multiplier}
        onClick={() => engine?.configureDebug({ ...hud.debug, healthMultiplier: multiplier })}>{multiplier}× <small>{multiplier * 100} HP</small></button>)}
    </div>
    <label><input type="checkbox" checked={hud.debug.regeneration} onChange={event => engine?.configureDebug({ ...hud.debug, regeneration: event.target.checked })} /> Regenerate health</label>
    <p>Recover 10% of maximum HP each second after 3 seconds without damage. Settings last for this tab, including zone travel.</p>
    <button className="fps-debug-heal" disabled={hud.health <= 0 || hud.phase === 'loading'} onClick={() => engine?.refillHealth()}>Refill health · {hud.maxHealth} HP</button>
    <small>Practice, solo bots and expeditions</small>
  </details>;
}
