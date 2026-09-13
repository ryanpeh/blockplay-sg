/** Approximate inverse-depth unprojection. Coordinates: X east, Y up, -Z north. */
export function depthMesh(depth, width, height, heading, { steps = 100, near = 8, far = 120, cameraHeight = 2.5 } = {}) {
  if (width < 2 || height < 2 || depth.length !== width * height) throw new Error('Invalid depth dimensions');
  const positions = [], uvs = [], indices = [];
  const radians = heading * Math.PI / 180;
  // Four adjacent 90° directional images share a single capture position.
  const halfWidth = 1;
  for (let row = 0; row <= steps; row++) {
    const v = row / steps;
    for (let col = 0; col <= steps; col++) {
      const x = (col / steps * 2 - 1) * halfWidth;
      const y = 1 - v * 2;
      const u = (x + 1) / 2;
      const pixel = Math.min(height - 1, Math.round(v * (height - 1))) * width + Math.min(width - 1, Math.round(u * (width - 1)));
      const normalized = Math.max(0, Math.min(1, depth[pixel] / 255));
      let z = 1 / (1 / far + normalized * (1 / near - 1 / far));
      // A flat ground prior fills the area directly below the street camera.
      // This is an assumption, not a measured road elevation.
      if (y < 0) z = Math.min(z, cameraHeight / -y);
      positions.push(z * (x * Math.cos(radians) + Math.sin(radians)), cameraHeight + y * z, z * (x * Math.sin(radians) - Math.cos(radians)));
      uvs.push(u, 1 - v);
    }
  }
  for (let row = 0; row < steps; row++) for (let col = 0; col < steps; col++) {
    const a = row * (steps + 1) + col, b = a + 1, c = a + steps + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  return { positions, uvs, indices };
}

/** Join the four estimated sectors at common rays to avoid open edge cracks. */
export function stitchDepthMeshes(meshes, steps = 100) {
  if (meshes.length !== 4) throw new Error('Four sectors are required for seam stitching');
  for (let sector = 0; sector < 4; sector++) {
    const current = meshes[sector].positions;
    const next = meshes[(sector + 1) % 4].positions;
    for (let row = 0; row <= steps; row++) {
      const right = (row * (steps + 1) + steps) * 3;
      const left = row * (steps + 1) * 3;
      for (let axis = 0; axis < 3; axis++) {
        const value = (current[right + axis] + next[left + axis]) / 2;
        current[right + axis] = value;
        next[left + axis] = value;
      }
    }
  }
  return meshes;
}
