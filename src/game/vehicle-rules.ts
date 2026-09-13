import { MARINA_BOUNDS, type Obstacle } from './marina-collision';
export type VehicleKind = 'car' | 'helicopter';
export interface VehicleSpawn { x: number; z: number; yaw: number }
export type VehicleWorldBounds = Pick<Obstacle, 'minX' | 'maxX' | 'minZ' | 'maxZ'>;
export interface VehicleState { kind: VehicleKind; x: number; y: number; z: number; yaw: number; speed: number; climb: number }
export interface FlightObstacle extends Obstacle { minY: number; maxY: number }
export const VEHICLE_SPAWNS = { car: { x: -48, z: 68, yaw: -Math.PI / 2 }, helicopter: { x: -65, z: 69, yaw: 0 } };
export const createVehicle = (kind: VehicleKind, spawn: VehicleSpawn = VEHICLE_SPAWNS[kind]): VehicleState => ({ kind, ...spawn, y: .13, speed: 0, climb: 0 });
const damp = (a: number, b: number, rate: number, dt: number) => b + (a - b) * Math.exp(-rate * dt);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function vehicleBounds(v: VehicleState): Obstacle {
  const width = v.kind === 'car' ? 1.25 : 1.35, length = v.kind === 'car' ? 2.35 : 3.8;
  const x = Math.abs(Math.cos(v.yaw)) * width + Math.abs(Math.sin(v.yaw)) * length;
  const z = Math.abs(Math.sin(v.yaw)) * width + Math.abs(Math.cos(v.yaw)) * length;
  return { minX: v.x - x, maxX: v.x + x, minZ: v.z - z, maxZ: v.z + z };
}
export function driveVehicle(v: VehicleState, forward: number, steer: number, brake: boolean, dt: number, obstacles: readonly Obstacle[], bounds: VehicleWorldBounds = MARINA_BOUNDS) {
  dt = clamp(dt, 0, .05);
  let speed = brake ? damp(v.speed, 0, 15, dt) : forward ? clamp(v.speed + forward * 10 * dt, -6, 20) : damp(v.speed, 0, 2, dt);
  let yaw = v.yaw - steer * Math.min(Math.abs(speed) / 8, 1.3) * Math.sign(speed) * dt;
  const clear = (x: number, z: number, heading: number) => {
    const b = vehicleBounds({ ...v, x, z, yaw: heading });
    return b.minX >= bounds.minX && b.maxX <= bounds.maxX && b.minZ >= bounds.minZ && b.maxZ <= bounds.maxZ && !obstacles.some(o => b.maxX > o.minX && b.minX < o.maxX && b.maxZ > o.minZ && b.minZ < o.maxZ);
  };
  if (!clear(v.x, v.z, yaw)) yaw = v.yaw;
  const dx = -Math.sin(yaw) * speed * dt, dz = -Math.cos(yaw) * speed * dt;
  const next = { x: v.x, z: v.z }, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .35));
  for (let i = 0; i < steps; i++) { if (clear(next.x + dx / steps, next.z, yaw)) next.x += dx / steps; if (clear(next.x, next.z + dz / steps, yaw)) next.z += dz / steps; }
  const blocked = Math.hypot(next.x - v.x, next.z - v.z) < Math.hypot(dx, dz) * .2;
  if (blocked) speed = 0;
  return { state: { ...v, ...next, yaw, speed, y: .13 }, blocked };
}
export function canFly(x: number, y: number, z: number, obstacles: readonly FlightObstacle[], bounds: VehicleWorldBounds = MARINA_BOUNDS) {
  const r = 2.5;
  if (x - r < bounds.minX || x + r > bounds.maxX || z - r < bounds.minZ || z + r > bounds.maxZ || y < .13 || y > 120) return false;
  return !obstacles.some(o => y < o.maxY && y + 3.7 > o.minY && x + r > o.minX && x - r < o.maxX && z + r > o.minZ && z - r < o.maxZ);
}
export function flyVehicle(v: VehicleState, forward: number, steer: number, lift: number, boost: boolean, dt: number, obstacles: readonly FlightObstacle[], bounds: VehicleWorldBounds = MARINA_BOUNDS) {
  dt = clamp(dt, 0, .05);
  let speed = damp(v.speed, forward * (boost ? 30 : 20), 1.8, dt), climb = damp(v.climb, lift * 5, 3, dt);
  const yaw = v.yaw - steer * 1.05 * dt;
  const dx = -Math.sin(yaw) * speed * dt, dz = -Math.cos(yaw) * speed * dt, dy = climb * dt;
  let { x, y, z } = v, blocked = false;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / .35));
  for (let i = 0; i < steps; i++) {
    const nextY = clamp(y + dy / steps, .13, 120);
    if (canFly(x, nextY, z, obstacles, bounds)) y = nextY; else { climb = 0; blocked = true; }
    if (canFly(x + dx / steps, y, z, obstacles, bounds)) x += dx / steps; else { speed = 0; blocked = true; }
    if (canFly(x, y, z + dz / steps, obstacles, bounds)) z += dz / steps; else { speed = 0; blocked = true; }
  }
  if (y === .13 || y === 120) climb = 0;
  return { state: { ...v, x, y, z, yaw, speed, climb }, blocked };
}
export function vehicleExit(v: VehicleState, obstacles: readonly Obstacle[], bounds: VehicleWorldBounds = MARINA_BOUNDS) {
  if (Math.abs(v.speed) > 2 || (v.kind === 'helicopter' && (v.y > .3 || Math.abs(v.climb) > .5))) return null;
  const distance = v.kind === 'car' ? 3.2 : 4.3;
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
    const x = v.x - Math.sin(v.yaw + angle) * distance, z = v.z - Math.cos(v.yaw + angle) * distance;
    if (x - .38 >= bounds.minX && x + .38 <= bounds.maxX && z - .38 >= bounds.minZ && z + .38 <= bounds.maxZ && ![...obstacles, vehicleBounds(v)].some(o => x + .38 > o.minX && x - .38 < o.maxX && z + .38 > o.minZ && z - .38 < o.maxZ)) return { x, z };
  }
  return null;
}
