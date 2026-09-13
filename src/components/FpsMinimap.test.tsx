import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import FpsMinimap from './FpsMinimap';
import { WORLD_ZONES } from '../game/world-zones';

it('uses each district map and clips distant loot while keeping distant checkpoint directions', () => {
  for (const zone of WORLD_ZONES) {
    const player = zone.spawn;
    const html = renderToStaticMarkup(<FpsMinimap zone={zone.id} player={player} mode="expedition" markers={[
      { id: 'near', kind: 'loot', label: 'Medical supplies', x: player.x + 10, z: player.z },
      { id: 'distant-loot', kind: 'loot', label: 'Distant loot', x: player.x + 500, z: player.z },
      { id: 'exit', kind: 'checkpoint', label: 'Next district', x: player.x + 500, z: player.z, active: true },
    ]} />);
    expect(html).toContain(`data-map-zone="${zone.id}"`);
    expect(html).toContain('data-minimap-marker="near"');
    expect(html).not.toContain('distant-loot');
    expect(html).toContain('data-minimap-marker="exit" data-marker-kind="checkpoint" data-edge="true" data-active="true"');
    expect(html).toContain('data-minimap-player');
    expect(html).toContain('<polyline');
    expect(html).not.toContain('<canvas');
  }
});

it('renders an arena with only the player and roads when no markers are supplied', () => {
  const html = renderToStaticMarkup(<FpsMinimap zone="marina-bay" player={{ x: 0, z: 0, yaw: 0 }} mode="arena" />);
  expect(html).toContain('data-minimap-player');
  expect(html).not.toContain('data-minimap-marker');
});
