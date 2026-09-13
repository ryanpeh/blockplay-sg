/** Connected authored districts. Coordinates are local game metres, not GPS. */
export type WorldZoneId = 'marina-bay' | 'raffles-place' | 'queenstown';
export interface ZonePosition { readonly x: number; readonly z: number }
/** Ground position and first-person orientation; eye height belongs to the engine. */
export interface ZoneSpawn extends ZonePosition { readonly yaw: number; readonly pitch: number }
export interface WorldZone {
  readonly id: WorldZoneId;
  readonly name: string;
  readonly description: string;
  readonly spawn: ZoneSpawn;
  readonly risk: 'low' | 'medium' | 'high';
  readonly lootTier: 1 | 2 | 3;
  readonly botCount: number;
  readonly composition: 'assault' | 'mixed';
  readonly encounterSpawns: readonly ZonePosition[];
}
export interface WorldGateway {
  readonly id: string;
  readonly from: WorldZoneId;
  readonly to: WorldZoneId;
  readonly name: string;
  readonly position: ZonePosition;
  readonly radius: number;
  readonly arrival: ZoneSpawn;
}
export interface WorldTransition {
  readonly gatewayId: string;
  readonly from: WorldZoneId;
  readonly to: WorldZoneId;
  readonly spawn: ZoneSpawn;
}

// Keep these defaults aligned with the authored scene spawns. Collision tests
// build the actual scenes so later geometry changes cannot silently block travel.
export const WORLD_ZONES: readonly WorldZone[] = [
  { id: 'marina-bay', name: 'Marina Bay', description: 'Waterfront approaches and garden roads.', spawn: { x: -44, z: 67, yaw: -0.82, pitch: 0 },
    risk: 'medium', lootTier: 2, botCount: 4, composition: 'mixed', encounterSpawns: [{ x: -70, z: 65 }, { x: -20, z: 65 }, { x: 25, z: 65 }, { x: -103, z: 10 }, { x: 103, z: 65 }, { x: 0, z: 94 }] },
  { id: 'raffles-place', name: 'Raffles Place', description: 'Contested CBD: heavy patrols guard the highest-tier supplies.', spawn: { x: 0, z: 52, yaw: 0, pitch: 0 },
    risk: 'high', lootTier: 3, botCount: 6, composition: 'mixed', encounterSpawns: [{ x: -75, z: 45 }, { x: 80, z: 45 }, { x: -170, z: 45 }, { x: 170, z: 45 }, { x: 0, z: -115 }, { x: 0, z: 135 }] },
  { id: 'queenstown', name: 'Queenstown', description: 'Residential courtyards, lighter patrols and starter supplies.', spawn: { x: -18, z: 83, yaw: -0.35, pitch: 0 },
    risk: 'low', lootTier: 1, botCount: 3, composition: 'assault', encounterSpawns: [{ x: -15, z: 116 }, { x: 140, z: 116 }, { x: -140, z: 116 }, { x: 140, z: 22 }, { x: -140, z: 22 }, { x: -15, z: 165 }] },
];

// These connections compress travel between districts. They do not claim that
// their scene coordinate systems line up or represent a continuous street map.
// Arrivals face into the new district, twelve metres beyond its return gateway.
export const WORLD_GATEWAYS: readonly WorldGateway[] = [
  { id: 'marina-to-raffles', from: 'marina-bay', to: 'raffles-place', name: 'Raffles Place checkpoint', position: { x: -103, z: 94 }, radius: 4, arrival: { x: 246, z: 45, yaw: Math.PI / 2, pitch: 0 } },
  { id: 'raffles-to-marina', from: 'raffles-place', to: 'marina-bay', name: 'Marina Bay checkpoint', position: { x: 258, z: 45 }, radius: 4, arrival: { x: -91, z: 94, yaw: -Math.PI / 2, pitch: 0 } },
  { id: 'raffles-to-queenstown', from: 'raffles-place', to: 'queenstown', name: 'Queenstown checkpoint', position: { x: -258, z: 45 }, radius: 4, arrival: { x: 223, z: 22, yaw: Math.PI / 2, pitch: 0 } },
  { id: 'queenstown-to-raffles', from: 'queenstown', to: 'raffles-place', name: 'Raffles Place checkpoint', position: { x: 235, z: 22 }, radius: 4, arrival: { x: -246, z: 45, yaw: -Math.PI / 2, pitch: 0 } },
];

export function isWorldZoneId(value: unknown): value is WorldZoneId {
  return typeof value === 'string' && WORLD_ZONES.some(zone => zone.id === value);
}

export function getWorldZone(id: WorldZoneId): WorldZone {
  const zone = WORLD_ZONES.find(candidate => candidate.id === id);
  if (!zone) throw new Error(`Unknown world zone: ${String(id)}`);
  return zone;
}

/** Proximity alone advertises a prompt; the caller must explicitly request travel. */
export function findWorldGateway(zone: WorldZoneId, position: ZonePosition): WorldGateway | null {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  return WORLD_GATEWAYS.find(gateway => gateway.from === zone &&
    Math.hypot(position.x - gateway.position.x, position.z - gateway.position.z) <= gateway.radius) ?? null;
}

/** Pure validation, with no inventory, rewards, scene loading or network mutation. */
export function resolveWorldTransition(zone: WorldZoneId, gatewayId: string, position: ZonePosition): WorldTransition | null {
  const gateway = findWorldGateway(zone, position);
  if (!gateway || gateway.id !== gatewayId) return null;
  return { gatewayId: gateway.id, from: zone, to: gateway.to, spawn: { ...gateway.arrival } };
}
