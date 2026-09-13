export const CHECKPOINTS = [80, 160, 240];

export function advanceSpeed(speed: number, throttle: boolean, brake: boolean, dt: number) {
  const acceleration = brake ? -20 : throttle ? 10 : -5;
  return Math.max(0, Math.min(24, speed + acceleration * dt));
}

export function checkpointCount(distance: number) {
  return CHECKPOINTS.filter((checkpoint) => distance >= checkpoint).length;
}
