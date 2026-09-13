export interface PanoramaLink { pano?: string | null; heading?: number | null }

/** Choose a connected photograph in the requested direction, never teleport. */
export function nextPanorama(links: readonly (PanoramaLink | null)[], heading: number, backwards = false) {
  const desired = heading + (backwards ? 180 : 0);
  const candidates = links.flatMap(link => {
    if (!link?.pano || typeof link.heading !== 'number') return [];
    const difference = Math.abs(((link.heading - desired) % 360 + 540) % 360 - 180);
    return difference <= 100 ? [{ ...link, difference }] : [];
  });
  return candidates.sort((a, b) => a.difference - b.difference)[0]?.pano;
}
