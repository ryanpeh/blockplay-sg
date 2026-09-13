export const defaultDriveLook = () => ({ yaw: 0, elevation: 0.4 });
export type DriveLook = ReturnType<typeof defaultDriveLook>;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Camera-only state: never alter the vehicle heading when looking around.
export function dragDriveLook(look: DriveLook, dx: number, dy: number): DriveLook {
  return {
    yaw: Math.atan2(Math.sin(look.yaw - dx * 0.004), Math.cos(look.yaw - dx * 0.004)),
    elevation: clamp(look.elevation + dy * 0.003, 0.12, 1.15),
  };
}

export function settleDriveLook(look: DriveLook, dt: number): DriveLook {
  const weight = Math.exp(-3 * dt);
  return { yaw: look.yaw * weight, elevation: 0.4 + (look.elevation - 0.4) * weight };
}

export function driveCameraOffset(heading: number, look: DriveLook) {
  const radius = 9, horizontal = radius * Math.cos(look.elevation);
  return { x: Math.sin(heading + look.yaw) * horizontal, y: radius * Math.sin(look.elevation), z: Math.cos(heading + look.yaw) * horizontal };
}
