import { describe, expect, it } from 'vitest';
import { defaultDriveLook, dragDriveLook, driveCameraOffset, settleDriveLook } from './drive-camera';

describe('independent driving camera', () => {
  it('orbits without mutating inputs and keeps a fixed radius above the ground', () => {
    const initial = defaultDriveLook();
    const look = dragDriveLook(initial, 200, 100);
    expect(initial).toEqual(defaultDriveLook());
    expect(look.yaw).toBeCloseTo(-0.8);
    const offset = driveCameraOffset(1.2, look);
    expect(Math.hypot(offset.x, offset.y, offset.z)).toBeCloseTo(9);
    expect(offset.y).toBeGreaterThan(0);
  });
  it('clamps vertical orbit and wraps horizontal orbit', () => {
    expect(dragDriveLook(defaultDriveLook(), 100000, -100000).elevation).toBe(0.12);
    const look = dragDriveLook(defaultDriveLook(), -100000, 100000);
    expect(look.elevation).toBe(1.15);
    expect(Math.abs(look.yaw)).toBeLessThanOrEqual(Math.PI);
  });
  it('recenters smoothly with frame-rate independent damping', () => {
    const start = dragDriveLook(defaultDriveLook(), 300, 100);
    const once = settleDriveLook(start, 1);
    let many = start;
    for (let i = 0; i < 60; i++) many = settleDriveLook(many, 1 / 60);
    expect(many.yaw).toBeCloseTo(once.yaw);
    expect(many.elevation).toBeCloseTo(once.elevation);
    expect(Math.abs(once.yaw)).toBeLessThan(Math.abs(start.yaw));
  });
});
