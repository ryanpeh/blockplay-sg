import { useId } from 'react';
import { MARINA_MAP_ROADS } from '../game/marina-scene';
import { RAFFLES_MAP_ROADS } from '../game/raffles-scene';
import { QUEENSTOWN_MAP_ROADS } from '../game/queenstown-scene';
import { MARINA_BOUNDS } from '../game/marina-collision';
import { RAFFLES_BOUNDS } from '../game/raffles-collision';
import { QUEENSTOWN_BOUNDS } from '../game/queenstown-collision';
import { localMinimapBounds, minimapHeading, minimapProjection, type MinimapMarker } from '../game/minimap';
import { getWorldZone, type WorldZoneId } from '../game/world-zones';
import './fps-minimap.css';

const districts = {
  'marina-bay': { bounds: MARINA_BOUNDS, roads: MARINA_MAP_ROADS },
  'raffles-place': { bounds: RAFFLES_BOUNDS, roads: RAFFLES_MAP_ROADS },
  queenstown: { bounds: QUEENSTOWN_BOUNDS, roads: QUEENSTOWN_MAP_ROADS },
};

/** Presentation only: callers decide which markers the player may see. */
export default function FpsMinimap({ zone, player, markers = [], mode }: {
  zone: WorldZoneId; player: { x: number; z: number; yaw: number };
  markers?: readonly MinimapMarker[]; mode: 'practice' | 'expedition' | 'arena';
}) {
  const clip = useId(), title = useId(), district = districts[zone];
  const bounds = localMinimapBounds(district.bounds, player), map = minimapProjection(bounds);
  return <div className="fps-minimap" data-map-zone={zone} aria-label={`${getWorldZone(zone).name} local minimap`}>
    <div className="fps-minimap-heading"><strong>{getWorldZone(zone).name}</strong><span>↑ N</span></div>
    <svg viewBox="0 0 200 160" role="img" aria-labelledby={title}>
      <title id={title}>{`${getWorldZone(zone).name}: your position and facing direction. ${mode === 'arena' ? 'Opponents are not shown.' : 'Nearby roads and supplies; outlined checkpoint markers at the edge indicate distant exits.'}`}</title>
      <defs><clipPath id={clip}><rect x="6" y="6" width="188" height="148" rx="5" /></clipPath></defs>
      <rect x="6" y="6" width="188" height="148" rx="5" fill="#273b35" />
      <g clipPath={`url(#${clip})`}>
        <g transform={map.transform}>
          {zone === 'marina-bay' && <rect x="-80" y="-90" width="160" height="140" fill="#315e65" />}
          {district.roads.map((road, index) => <polyline key={index} points={road.points.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#63766a" strokeWidth="12" />)}
          {zone === 'raffles-place' && <rect x="-42" y="-65" width="92" height="78" fill="#3d5840" />}
        </g>
        {markers.map(marker => {
          const x = map.x(marker.x), y = map.y(marker.z);
          const outside = x < 14 || x > 186 || y < 14 || y > 146;
          if (outside && marker.kind !== 'checkpoint') return null;
          const px = Math.max(14, Math.min(186, x)), py = Math.max(14, Math.min(146, y));
          return <g key={marker.id} data-minimap-marker={marker.id} data-marker-kind={marker.kind} data-edge={outside} data-active={!!marker.active} transform={`translate(${px} ${py})`}>
            <title>{`${marker.label} · ${Math.round(Math.hypot(marker.x - player.x, marker.z - player.z))}m${outside ? ' · beyond map edge' : ''}`}</title>
            {marker.active && <circle r="9" fill="#efd07733" stroke="#efd077" strokeWidth="1" />}
            {marker.kind === 'checkpoint' ? <path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill={outside ? '#26362c' : '#efd077'} stroke="#efd077" strokeWidth="2" />
              : marker.kind === 'loot' ? <rect x="-3" y="-3" width="6" height="6" fill="#91dcb0" stroke="#172820" />
              : marker.kind === 'target' ? <circle r="3" fill="#ee967c" stroke="#401e18" />
              : <><rect x="-6" y="-6" width="12" height="12" rx="2" fill="#182d35" stroke="#9bdcf0" /><text y="3" textAnchor="middle" fill="#c7f3ff" fontSize="9" fontWeight="700">{marker.kind === 'car' ? 'C' : 'H'}</text></>}
          </g>;
        })}
        <g data-minimap-player data-world-x={player.x} data-world-z={player.z} data-yaw={player.yaw} transform={`translate(${map.x(player.x)} ${map.y(player.z)}) rotate(${minimapHeading(player.yaw)})`}>
          <circle r="8" fill="#13231dcc" />
          <path d="M0 -7 L5 5 L0 2 L-5 5 Z" fill="#fff9db" stroke="#172820" strokeWidth="1" />
        </g>
      </g>
      <path d={`M14 142 v4 h${map.scale * 25} v-4`} fill="none" stroke="#dde7cd" strokeWidth="1" /><text x="14" y="138" fontSize="7" fill="#dde7cd">25m</text>
    </svg>
    <div className="fps-minimap-legend">{mode === 'arena' ? '▲ You · Opponents hidden' : mode === 'expedition' ? '▲ You · ■ Loot · ◆ Exit' : '▲ You · ● Targets · C/H Vehicles'}</div>
  </div>;
}
