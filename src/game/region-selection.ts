export type PlayableRegionId = 'marina-bay' | 'queenstown' | 'raffles-place';

export function hasRegionGame(locationId: string): locationId is PlayableRegionId {
  return locationId === 'marina-bay' || locationId === 'queenstown' || locationId === 'raffles-place';
}

export function regionModeLabel(locationId: PlayableRegionId) {
  if (locationId === 'raffles-place') return { name: 'Raffles 3D', subtitle: 'Explore the city core' };
  return locationId === 'marina-bay'
    ? { name: 'Marina 3D', subtitle: 'Explore the expanded bay' }
    : { name: 'Queenstown 3D', subtitle: 'Walk and drive the estate' };
}
