import type { FpsEngine, FpsHud } from '../game/fps-engine';
import './fps-pilot.css';

export default function FpsPilotPanel({ hud, engine, suspended = false }: { hud: FpsHud; engine: FpsEngine | null; suspended?: boolean }) {
  const unavailable = suspended || ['loading', 'error', 'complete', 'defeated'].includes(hud.phase) || hud.vehicle !== 'on-foot' || !hud.arenaConnected;
  return <div className="fps-pilot-panel" data-pilot-active={hud.pilotEnabled}>
    <div><strong>{hud.pilotEnabled ? 'AI PILOT' : 'PLAYER CONTROL'}</strong><span role="status">{hud.pilotEnabled ? `${hud.pilotStatus} · ${hud.pilotContacts} in sight` : 'Let the local AI play your character'}</span></div>
    <label>Strategy<select aria-label="AI strategy" value={hud.pilotStrategy} disabled={suspended} onChange={event => engine?.setPilotStrategy(event.target.value as 'local' | 'llm')}><option value="local">Local planner</option><option value="llm">LLM strategist</option></select></label>
    {hud.pilotEnabled ? <><button onClick={() => engine?.takeControl()} disabled={suspended}>Take control</button><button onClick={() => engine?.pause()}>Stop AI</button></> : <button disabled={unavailable} onClick={() => engine?.startPilot()}>Watch AI play</button>}
    <small>{hud.pilotStrategy === 'llm' ? 'LLM receives visible contacts and HUD via your companion server. ' : 'Local AI · '}{hud.pilotEnabled ? `Goal: ${hud.pilotGoal ?? 'observe'} · ${hud.pilotPlan}` : 'Same player rules · Esc stops AI'}</small>
  </div>;
}
