import { expect, it } from 'vitest';
// @ts-expect-error Node-only capture helper has no declaration file.
import { isCaptureReady, assertFreshPixels, captureFailureCode } from '../../scripts/capture-readiness.mjs';

const view = { heading: 0, pitch: 12, zoom: 1, source: { pano_id: 'selected' } };
const ready = { status: 'OK', pano: 'selected', hidden: false, overlay: false, pov: { heading: 360, pitch: 12 }, zoom: 1 };
it('requires the requested camera, panorama, foreground and no development overlay', () => {
  expect(isCaptureReady(ready, view)).toBe(true);
  for (const change of [{ hidden: true }, { overlay: true }, { pano: 'old' }, { zoom: 2 }, { pov: { heading: 90, pitch: 12 } }]) {
    expect(isCaptureReady({ ...ready, ...change }, view)).toBe(false);
  }
});
it('rejects duplicate pixels labeled as different camera views', () => {
  const seen = new Map([['hash', 'camera-one']]);
  expect(() => assertFreshPixels('hash', 'camera-two', seen)).toThrow('Duplicate pixels');
  expect(() => assertFreshPixels('hash', 'camera-one', seen)).not.toThrow();
  expect(() => assertFreshPixels('new-hash', 'camera-two', seen)).not.toThrow();
});

it('reports known failure categories without exposing raw error text', () => {
  expect(captureFailureCode(new Error('Development error overlay; capture rejected.'))).toBe('DEVELOPMENT_OVERLAY');
  expect(captureFailureCode(new Error('sensitive network URL'))).toBe('CAPTURE_STOPPED');
});
