import { Radio, Volume2, VolumeX } from 'lucide-react';
import type { FpsEngine, FpsHud } from '../game/fps-engine';
import './fps-radio.css';

export default function FpsRadio({ hud }: { hud: FpsHud }) {
  const line = hud.encikCallout;
  return <div className="fps-radio" role="status" aria-live="polite" aria-atomic="true">
    {line && ['playing', 'complete', 'defeated'].includes(hud.phase) && <div key={line.id} className="fps-radio-message" data-callout={line.event}>
      <span><Radio size={13} aria-hidden="true" /> ENCIK · SECTION NET</span>
      <p>{line.text}</p>
    </div>}
  </div>;
}
export function FpsRadioVoice({ hud, engine }: { hud: FpsHud; engine: FpsEngine | null }) {
  return <button className="session-button fps-radio-voice" aria-label={hud.encikVoice ? 'Mute Encik voice' : 'Enable Encik voice'} aria-pressed={hud.encikVoice}
    title="Recorded Encik callouts; subtitles stay on" onClick={() => engine?.toggleEncikVoice()}>
    {hud.encikVoice ? <Volume2 size={14} /> : <VolumeX size={14} />} Encik {hud.encikVoice ? 'on' : 'off'}
  </button>;
}
