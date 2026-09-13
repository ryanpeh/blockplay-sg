import { useId } from 'react';
import { findWorldRoute, getWorldZone, WORLD_GATEWAYS, type WorldZoneId } from '../game/world-zones';
import { locations, type Location } from '../data/locations';

type Props = {
  selected: Location;
  onSelect: (location: Location) => void;
  expedition?: boolean;
  destination?: WorldZoneId;
};

// Deliberately simplified coastline, not a navigation map. Both views position
// destinations from the same coordinates used by the location picker.
const islandPoint = (location: Location) => ({
  x: 20 + (location.lng - 103.6) / 0.42 * 280,
  y: 145 - (location.lat - 1.24) / 0.23 * 115,
});
const centralPoint = (location: Location) => ({
  x: 24 + (location.lng - 103.795) / 0.076 * 272,
  y: 268 - (location.lat - 1.278) / 0.028 * 72,
});
const labels: Record<Location['id'], { x: number; y: number; width: number }> = {
  queenstown: { x: 10, y: 187, width: 113 },
  'marina-bay': { x: 203, y: 187, width: 106 },
  'raffles-place': { x: 167, y: 271, width: 121 },
};

export default function SingaporeMap({ selected, onSelect, expedition = false, destination }: Props) {
  const titleId = useId();
  const point = islandPoint(selected);
  const route = expedition && destination ? findWorldRoute(selected.id, destination) : [];
  const next = route[0];
  const target = destination ? getWorldZone(destination) : undefined;
  return <section className="singapore-locator" aria-label="Singapore location map">
    <div className="singapore-locator-heading"><strong>{expedition ? 'EXPEDITION ROUTES' : 'YOUR PLACE ON THE ISLAND'}</strong><span>SG</span></div>
    <svg viewBox="0 0 320 309" aria-labelledby={titleId}>
      <title id={titleId}>{`Singapore overview and central-area detail. ${expedition ? 'Current district' : 'Selected'}: ${selected.name}.`}</title>
      <path className="singapore-island" d="M20 114 L29 94 45 88 51 66 72 60 81 43 102 42 111 28 130 35 139 29 158 43 178 42 188 54 201 54 214 66 231 64 246 79 265 84 279 98 302 109 296 122 271 126 253 135 228 137 211 145 190 143 176 137 163 138 150 143 137 138 125 145 111 140 105 131 87 133 78 127 61 132 49 121 34 125 Z" />
      <path className="singapore-island singapore-islets" d="M80 145 l16 -4 12 7 -8 7 -18 -2 Z M130 153 l13 -4 13 4 -8 6 -13 -1 Z M262 62 l17 -3 8 6 -14 5 Z" />
      <text className="singapore-map-country" x="153" y="88" textAnchor="middle">SINGAPORE</text>
      <g className="singapore-map-north" aria-hidden="true"><path d="M294 48 v-19 m-4 6 4 -6 4 6" /><text x="294" y="23" textAnchor="middle">N</text></g>
      <rect className="singapore-map-detail-box" x="144" y="111" width="49" height="26" rx="4" />
      <path className="singapore-map-zoom-line" d="M144 137 L20 164 M193 137 L300 164" />
      {locations.filter(location => location.id !== selected.id).map(location => {
        const marker = islandPoint(location);
        return <circle key={location.id} className="singapore-map-dot" cx={marker.x} cy={marker.y} r="2.5" />;
      })}
      <g className="singapore-map-active" aria-hidden="true" data-map-active={selected.id}>
        <circle cx={point.x} cy={point.y} r="11" className="singapore-map-halo" />
        <circle cx={point.x} cy={point.y} r="5" className="singapore-map-pin" />
      </g>
      <rect className="singapore-map-inset" x="1" y="163" width="318" height="145" rx="9" />
      <text className="singapore-map-caption" x="12" y="179">CENTRAL AREA · ENLARGED</text>
      <path className="singapore-map-water" d="M278 214 Q236 222 247 242 T303 267 L318 269 V307 H290 Q271 270 235 269 T202 244 Q212 223 241 218 Z" />
      {expedition && WORLD_GATEWAYS.filter(gateway => gateway.from < gateway.to).map(gateway => {
        const from = centralPoint(locations.find(location => location.id === gateway.from)!);
        const to = centralPoint(locations.find(location => location.id === gateway.to)!);
        const planned = route.some(step => step.from === gateway.from && step.to === gateway.to || step.from === gateway.to && step.to === gateway.from);
        return <path key={gateway.id} className={`singapore-checkpoint-link ${planned ? 'planned' : ''}`} data-map-link={`${gateway.from}:${gateway.to}`} d={`M${from.x} ${from.y} L${to.x} ${to.y}`}><title>{`${getWorldZone(gateway.from).name} ↔ ${getWorldZone(gateway.to).name} checkpoint link`}</title></path>;
      })}
      {locations.map(location => {
        const marker = centralPoint(location);
        const label = labels[location.id];
        const active = selected.id === location.id;
        return <g key={location.id} className="singapore-map-stop" data-map-location={location.id} data-selected={active ? 'true' : 'false'} data-destination={expedition && destination === location.id ? 'true' : 'false'} role="button" tabIndex={0}
          aria-label={expedition ? `Plan route to ${location.name}, ${getWorldZone(location.id).risk} threat, loot tier ${getWorldZone(location.id).lootTier}` : `Select ${location.name} on Singapore map`} aria-pressed={expedition ? destination === location.id : active} aria-current={expedition && active ? 'location' : undefined}
          onClick={() => onSelect(location)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(location); }
          }}>
          <path className="singapore-map-leader" d={`M${marker.x} ${marker.y} L${label.x + label.width / 2} ${label.y + 14}`} />
          {active && <circle className="singapore-map-halo" cx={marker.x} cy={marker.y} r="11" />}
          <circle className="singapore-map-pin" cx={marker.x} cy={marker.y} r={active ? 5 : 3.5} />
          <rect className="singapore-map-callout" x={label.x} y={label.y} width={label.width} height="28" rx="6" />
          <text x={label.x + label.width / 2} y={label.y + 18} textAnchor="middle">{location.name}</text>
        </g>;
      })}
    </svg>
    <p className="singapore-map-selection" aria-live="polite"><span aria-hidden="true" />{selected.name}<small>{expedition ? 'YOU ARE HERE' : 'SELECTED'}</small></p>
    {expedition && <div className="singapore-route-details" role="status">
      {target ? <><strong>{target.name} · {target.risk} threat · Loot tier {target.lootTier}</strong><p>{target.botCount} defenders · {target.composition} roles</p>
        {next ? <><p>{[selected.name, ...route.map(step => getWorldZone(step.to).name)].join(' → ')}</p><p>Next: {getWorldZone(next.to).name} checkpoint at X {next.position.x}, Z {next.position.z}. Press T within {next.radius}m.</p></> : <p>You are in this district.</p>}
      </> : <p>Select a district to see its threat, loot tier and checkpoint route.</p>}
    </div>}
    <p className="singapore-map-note">{expedition ? 'Map selection plans your route. Walk to checkpoints to travel; your field gear carries across. Links compress travel between districts.' : 'Tap a place to explore. Approximate outline; not for navigation.'}</p>
  </section>;
}
