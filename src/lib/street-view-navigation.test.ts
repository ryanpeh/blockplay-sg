import { describe, expect, it } from 'vitest';
import { nextPanorama } from './street-view-navigation';

describe('panorama navigation', () => {
  const links = [{ pano: 'north', heading: 355 }, { pano: 'south', heading: 180 }];
  it('wraps through north when choosing a forward link', () => {
    expect(nextPanorama(links, 5)).toBe('north');
  });
  it('chooses a connected photograph behind the camera for reverse', () => {
    expect(nextPanorama(links, 5, true)).toBe('south');
  });
  it('does not reverse unexpectedly at a dead end or use incomplete links', () => {
    expect(nextPanorama([null, {}, { pano: 'missing-heading' }, { pano: 'behind', heading: 180 }], 0)).toBeUndefined();
  });
});
