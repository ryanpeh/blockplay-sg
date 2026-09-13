// Metadata alone can advance before the panorama pixels repaint.
export function isCaptureReady(state, view) {
  const headingError = Math.abs(Math.atan2(
    Math.sin((state.pov?.heading - view.heading) * Math.PI / 180),
    Math.cos((state.pov?.heading - view.heading) * Math.PI / 180),
  )) * 180 / Math.PI;
  return state.status === 'OK' && state.pano === view.source.pano_id && !state.hidden && !state.overlay &&
    headingError < 0.1 && Math.abs(state.pov?.pitch - view.pitch) < 0.1 && Math.abs(state.zoom - view.zoom) < 0.01;
}

export function assertFreshPixels(hash, fingerprint, seen) {
  if (seen.has(hash) && seen.get(hash) !== fingerprint) throw new Error('Duplicate pixels for a different view; capture rejected.');
}

export function captureFailureCode(error) {
  return new Map([
    ['Duplicate pixels for a different view; capture rejected.', 'DUPLICATE_PIXELS'],
    ['Development error overlay; capture rejected.', 'DEVELOPMENT_OVERLAY'],
    ['Foreground repaint timed out; capture rejected.', 'REPAINT_TIMEOUT'],
    ['View changed before screenshot; capture rejected.', 'VIEW_CHANGED'],
    ['Panorama not ready or unexpected Static request detected.', 'PANORAMA_NOT_READY'],
    ['Demo key authorization failed.', 'AUTHORIZATION_FAILED'],
  ]).get(error?.message) || 'CAPTURE_STOPPED';
}
