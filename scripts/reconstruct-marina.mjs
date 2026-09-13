import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline, env } from '@huggingface/transformers';
import { depthMesh, stitchDepthMeshes } from './depth-mesh.mjs';

const input = resolve('reconstruction/marina-bay/source');
const output = resolve('public/reconstruction/marina-bay');
let capture;
try { capture = JSON.parse(await readFile(resolve(input, 'capture.json'), 'utf8')); }
catch { throw new Error('No Marina Bay source capture. Run pnpm marina:capture first.'); }
if (capture.frames?.length !== 4) throw new Error('Expected four directional source images.');
env.cacheDir = resolve('.cache/models');
const model = 'onnx-community/depth-anything-v2-small';
console.log('Loading depth model; the first run downloads its weights. Images are processed locally.');
const estimator = await pipeline('depth-estimation', model, { device: 'cpu', dtype: 'q8', progress_callback: event => {
  if (event.status === 'download' || event.status === 'done') console.log(`Model ${event.status}: ${event.file}`);
} });
await mkdir(output, { recursive: true });
const meshes = [];
const geometryData = [];
for (const frame of capture.frames) {
  console.log(`Estimating geometry for heading ${frame.heading}°…`);
  const { depth } = await estimator(resolve(input, frame.file));
  const data = depth.channels === 1 ? depth.data : Uint8Array.from({ length: depth.width * depth.height }, (_, i) => depth.data[i * depth.channels]);
  const mesh = depthMesh(data, depth.width, depth.height, frame.heading);
  geometryData.push(mesh);
  const filename = `mesh-${frame.heading}.json`;
  await copyFile(resolve(input, frame.file), resolve(output, frame.file));
  meshes.push({ geometry: filename, texture: frame.file });
}
stitchDepthMeshes(geometryData);
for (let i = 0; i < meshes.length; i++) await writeFile(resolve(output, meshes[i].geometry), JSON.stringify(geometryData[i]));
await estimator.dispose();
const modelWeightsSha256 = createHash('sha256').update(await readFile(resolve(env.cacheDir, model, 'onnx/model_quantized.onnx'))).digest('hex');
// Written last, so the viewer never sees a manifest for an incomplete first build.
await writeFile(resolve(output, 'scene.json'), JSON.stringify({
  version: 1, id: 'marina-bay', method: 'monocular-depth-estimate', model, modelWeightsSha256,
  location: capture.location, captureDate: capture.date, copyright: capture.copyright,
  cameraHeight: 2.5, explorationRadius: 4, meshes,
  limitations: 'Approximate relative depth; a single camera center; flat ground prior; no surveyed scale or unseen building backs. Small-area prototype, not a full district reconstruction.',
}, null, 2));
console.log('Marina Bay depth meshes built. Open Marina 3D in the app.');
