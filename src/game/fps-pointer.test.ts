import { describe, expect, it, vi } from 'vitest';
import { requestFpsPointerLock, turnFpsLook } from './fps-pointer';

describe('FPS relative pointer input', () => {
  it('uses standard capture by default for VM compatibility', async () => {
    const requestPointerLock = vi.fn().mockResolvedValue(undefined);
    await requestFpsPointerLock({ requestPointerLock });
    expect(requestPointerLock).toHaveBeenCalledExactlyOnceWith();
  });
  it('can explicitly request raw relative motion', async () => {
    const requestPointerLock = vi.fn().mockResolvedValue(undefined);
    await requestFpsPointerLock({ requestPointerLock }, () => true, true);
    expect(requestPointerLock).toHaveBeenCalledExactlyOnceWith({ unadjustedMovement: true });
  });
  it('falls back only when raw input is unsupported', async () => {
    const requestPointerLock = vi.fn().mockRejectedValueOnce({ name: 'NotSupportedError' }).mockResolvedValue(undefined);
    await requestFpsPointerLock({ requestPointerLock }, () => true, true);
    expect(requestPointerLock.mock.calls).toEqual([[{ unadjustedMovement: true }], []]);
  });
  it('preserves capture denial and does not retry after cancellation', async () => {
    const denied = { name: 'NotAllowedError' };
    const requestPointerLock = vi.fn().mockRejectedValue(denied);
    await expect(requestFpsPointerLock({ requestPointerLock })).rejects.toEqual(denied);
    expect(requestPointerLock).toHaveBeenCalledTimes(1);
    requestPointerLock.mockReset().mockRejectedValue({ name: 'NotSupportedError' });
    await requestFpsPointerLock({ requestPointerLock }, () => false, true);
    expect(requestPointerLock).toHaveBeenCalledTimes(1);
  });
  it('supports legacy non-promise capture implementations', async () => {
    await expect(requestFpsPointerLock({ requestPointerLock: (() => undefined) as unknown as HTMLElement['requestPointerLock'] })).resolves.toBeUndefined();
  });
  it('continues through multiple revolutions and reverses without horizontal limits', () => {
    let pose = { yaw: 0, pitch: 0 };
    for (let i = 0; i < 1000; i++) pose = turnFpsLook(pose.yaw, pose.pitch, 20, 0, false);
    expect(pose.yaw).toBeCloseTo(-46);
    for (let i = 0; i < 1000; i++) pose = turnFpsLook(pose.yaw, pose.pitch, -20, 0, false);
    expect(pose.yaw).toBeCloseTo(0);
    expect(turnFpsLook(0, 0, NaN, Infinity, false)).toEqual({ yaw: 0, pitch: 0 });
    expect(turnFpsLook(0, 0, 0, 10000, true).pitch).toBe(-1.35);
  });
});
