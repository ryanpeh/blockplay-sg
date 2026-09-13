export type PlayableRegionId = 'marina-bay' | 'queenstown';

export function hasRegionGame(locationId: string): locationId is PlayableRegionId {
  return locationId === 'marina-bay' || locationId === 'queenstown';
}

export function regionModeLabel(locationId: PlayableRegionId) {
  return locationId === 'marina-bay'
    ? { name: 'Marina 3D', subtitle: 'Explore the expanded bay' }
    : { name: 'Queenstown 3D', subtitle: 'Walk and drive the estate' };
}
