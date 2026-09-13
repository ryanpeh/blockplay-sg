import { FPS_SPAWN, FPS_TARGETS } from './fps-rules';
import { VEHICLE_SPAWNS, type VehicleSpawn, type VehicleKind } from './vehicle-rules';
import type { WorldZoneId, ZonePosition, ZoneSpawn } from './world-zones';

export interface FpsDistrict {
  label: string; setting: string; spawn: ZoneSpawn; targets: readonly ZonePosition[];
  vehicles: Record<VehicleKind, VehicleSpawn>;
  props: readonly (readonly [asset: number, x: number, z: number, width: number, depth: number])[];
}
const districts: Record<WorldZoneId, FpsDistrict> = {
  'marina-bay': {
    label: 'Marina FPS', setting: 'promenade', spawn: FPS_SPAWN, targets: FPS_TARGETS, vehicles: VEHICLE_SPAWNS,
    props: [[3, -48, 71, .77, .52], [4, -40, 63, 1.87, .41], [4, -52, 64, 1.87, .41], [5, -45, 72, .37, .37], [5, -43, 72, .37, .37]],
  },
  'raffles-place': {
    label: 'Raffles FPS', setting: 'city square', spawn: { x: 0, z: 52, yaw: 0, pitch: -.03 },
    targets: [{ x: 0, z: 35 }, { x: -6, z: 34 }, { x: 6, z: 34 }, { x: -12, z: 32 }, { x: 12, z: 32 }, { x: -18, z: 36 }, { x: 18, z: 36 }, { x: 0, z: 22 }],
    vehicles: { car: { x: -6, z: 52, yaw: -Math.PI / 2 }, helicopter: { x: 18, z: 45, yaw: 0 } },
    props: [[3, -4, 56, .77, .52], [4, 4, 49, 1.87, .41], [5, -1, 57, .37, .37], [5, 1, 57, .37, .37]],
  },
  queenstown: {
    label: 'Queenstown FPS', setting: 'estate approach', spawn: { x: -15, z: 116, yaw: 0, pitch: -.03 },
    targets: [{ x: -15, z: 100 }, { x: -18, z: 99 }, { x: -12, z: 99 }, { x: -20, z: 104 }, { x: -10, z: 104 }, { x: -22, z: 112 }, { x: -8, z: 112 }, { x: -15, z: 88 }],
    vehicles: { car: { x: -19, z: 120, yaw: -Math.PI / 2 }, helicopter: { x: 0, z: 116, yaw: 0 } },
    props: [[3, -17, 124, .77, .52], [4, -12, 120, 1.87, .41], [5, -16, 125, .37, .37], [5, -14, 125, .37, .37]],
  },
};
export const getFpsDistrict = (region: WorldZoneId): FpsDistrict => districts[region];
