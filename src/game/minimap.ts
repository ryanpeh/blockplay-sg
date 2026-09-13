export interface MapBounds { minX: number; maxX: number; minZ: number; maxZ: number }

/** Uniform scale keeps roads/landmarks aligned when a region expands. */
export function minimapProjection(bounds: MapBounds, width = 200, height = 160, padding = 8) {
  const worldWidth = bounds.maxX - bounds.minX, worldDepth = bounds.maxZ - bounds.minZ;
  if (worldWidth <= 0 || worldDepth <= 0 || width <= padding * 2 || height <= padding * 2) throw new Error('Invalid minimap bounds.');
  const scale = Math.min((width - padding * 2) / worldWidth, (height - padding * 2) / worldDepth);
  const offsetX = (width - worldWidth * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - worldDepth * scale) / 2 - bounds.minZ * scale;
  return { scale, offsetX, offsetY, x: (x: number) => offsetX + x * scale, y: (z: number) => offsetY + z * scale, transform: `translate(${offsetX} ${offsetY}) scale(${scale})` };
}
