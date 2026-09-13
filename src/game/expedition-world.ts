import { buildMarinaScene } from './marina-scene';
import { buildRafflesScene } from './raffles-scene';
import { buildQueenstownScene } from './queenstown-scene';
import { MARINA_BOUNDS, moveInMarina } from './marina-collision';
import { RAFFLES_BOUNDS, moveInRaffles } from './raffles-collision';
import { QUEENSTOWN_BOUNDS, moveInQueenstown } from './queenstown-collision';
import { getWorldZone, type WorldZoneId, type ZoneSpawn } from './world-zones';
import type { ArenaEnvironment } from './arena-rules';

/** Build exactly one district. The caller disposes it before entering another. */
export function buildExpeditionWorld(id: WorldZoneId, arrival?: ZoneSpawn) {
  const zone = getWorldZone(id);
  const world = id === 'raffles-place' ? buildRafflesScene() : id === 'queenstown' ? buildQueenstownScene() : buildMarinaScene();
  const bounds = id === 'raffles-place' ? RAFFLES_BOUNDS : id === 'queenstown' ? QUEENSTOWN_BOUNDS : MARINA_BOUNDS;
  const move = id === 'raffles-place' ? moveInRaffles : id === 'queenstown' ? moveInQueenstown : moveInMarina;
  const environment: ArenaEnvironment = { bounds, move, spawns: zone.encounterSpawns, endless: true, playerSpawn: arrival ?? zone.spawn };
  return { ...world, zone, bounds, move, environment };
}
