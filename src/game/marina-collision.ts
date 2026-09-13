export interface Obstacle { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Position2D { x: number; z: number }
export const MARINA_BOUNDS = { minX: -338, maxX: 388, minZ: -328, maxZ: 288 };

export function canOccupy(x: number, z: number, radius: number, obstacles: readonly Obstacle[]) {
  const b = MARINA_BOUNDS;
  if (x - radius < b.minX || x + radius > b.maxX || z - radius < b.minZ || z + radius > b.maxZ) return false;
  return !obstacles.some(o => x + radius > o.minX && x - radius < o.maxX && z + radius > o.minZ && z - radius < o.maxZ);
}

/** Small steps prevent tunnelling; separate axes let the player slide along walls. */
export function moveInMarina(position: Position2D, dx: number, dz: number, radius: number, obstacles: readonly Obstacle[]) {
  let { x, z } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.4));
  for (let i = 0; i < steps; i++) {
    if (canOccupy(x + dx / steps, z, radius, obstacles)) x += dx / steps;
    if (canOccupy(x, z + dz / steps, radius, obstacles)) z += dz / steps;
  }
  return { x, z };
}
