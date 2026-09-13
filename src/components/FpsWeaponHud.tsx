import type { CSSProperties } from 'react';
import type { FpsHud } from '../game/fps-engine';
import type { WeaponSpec } from '../game/fps-rules';
import { reloadStage } from '../game/fps-weapon-motion';
import './fps-weapon-hud.css';

export default function FpsWeaponHud({ hud, weapon, canFight }: { hud: FpsHud; weapon: WeaponSpec; canFight: boolean }) {
  const magnified = weapon.optic !== 'reflex';
  const reloading = hud.reloading > 0, stage = reloadStage(hud.reloading, hud.reloadEmpty);
  return <div className="fps-weapon-hud" data-sight={magnified ? 'scope' : 'reflex'} data-aiming={hud.aiming} data-reloading={reloading}
    style={{ '--fps-aim': hud.aimProgress, '--fps-spread': `${hud.crosshairSpread}px` } as CSSProperties}>
    {canFight && hud.aimProgress > .02 && <div className="fps-scope fps-sight-vignette" aria-hidden="true" />}
    {canFight && <div className={`fps-crosshair fps-tactical-crosshair ${hud.aiming ? 'aiming' : ''}`} aria-hidden="true"><i /><i /><i /><i /><b />{magnified ? <span className="fps-integrated-reticle" /> : <span className="fps-ads-dot-ring" />}</div>}
    {canFight && hud.hit && <div key={`${hud.shots}-${hud.hits}`} className={`fps-impact-marker ${hud.hitKind === 'kill' ? 'is-kill' : ''}`} aria-hidden="true"><i /><i /><i /><i /></div>}
    {canFight && reloading && <div className="fps-reload-cue" aria-hidden="true"><span>{stage}</span><div><i style={{ width: `${(1 - hud.reloading) * 100}%` }} /></div></div>}
    <div className={`fps-ammo ${hud.magazine === 0 ? 'is-empty' : ''}`}>
      <span>{weapon.name} <small>{hud.aiming ? 'ADS' : 'AUTO'}</small></span>
      <strong>{hud.magazine.toString().padStart(2, '0')}<small>/ {hud.reserve}</small></strong>
      <p>{reloading ? `${hud.reloadEmpty ? 'EMPTY' : 'TACTICAL'} RELOAD · ${stage}` : hud.magazine === 0 ? 'EMPTY · PRESS R' : 'R RELOAD · Q TOGGLE AIM · RMB HOLD'}</p>
      {reloading && <div className="fps-reload-track" role="progressbar" aria-label="Reload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - hud.reloading) * 100)}><i style={{ width: `${(1 - hud.reloading) * 100}%` }} /></div>}
    </div>
  </div>;
}
