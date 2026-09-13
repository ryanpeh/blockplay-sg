import { describe, expect, it } from 'vitest';
import { advanceSpeed, checkpointCount } from './physics';

describe('driving loop', () => {
  it('cannot reverse by braking or exceed the speed limit', () => {
    expect(advanceSpeed(2, false, true, 1)).toBe(0);
    expect(advanceSpeed(23, true, false, 1)).toBe(24);
  });
  it('gives braking priority and coasts to a stop', () => {
    expect(advanceSpeed(20, true, true, 0.5)).toBe(10);
    expect(advanceSpeed(2, false, false, 1)).toBe(0);
  });
  it('awards checkpoints once, including when a frame crosses a boundary', () => {
    expect(checkpointCount(79.9)).toBe(0);
    expect(checkpointCount(80)).toBe(1);
    expect(checkpointCount(161)).toBe(2);
    expect(checkpointCount(500)).toBe(3);
  });
});
