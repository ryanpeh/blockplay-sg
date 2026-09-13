# SG Field Kit

An original visual asset pack for the Singapore FPS prototype. Realistic proportions and subdued military materials, with a moderate geometry budget for the current VM. These are an initial art pass, not finished AAA weapon replicas.

## Open and inspect

- Editable library: `blender/sg-field-kit.blend`. Assets occupy named collections, spaced apart along Blender X.
- Exported models: `public/models/*.glb`.
- Studio previews: `renders/*.png`.
- Asset metadata: `public/models/manifest.json` (dimensions are width, height, length in metres).

Run the preview with the installed pnpm 11:

```sh
cd asset-pack
pnpm install
pnpm dev
```

The viewer supports orbit, zoom, wireframe, auto rotation, detachable magazine inspection and first-person scale checks. Pixel ratio is capped at 1.5 and expensive real-time shadows are omitted. There are no Google Maps requests or API keys in this viewer. `pnpm build` builds the standalone viewer. `pnpm validate` checks exported geometry, embedded images, attachment nodes and triangle budgets.

`packageManager` is pinned to pnpm 11.15.0. The viewer enforces the same strict 14-day minimum release age as the main repository; no cooldown exemptions are added.

## Assets

| Asset | Role |
| --- | --- |
| SAR 21-inspired bullpup | Elevated optic, rear magazine, olive polymer |
| Ultimax-inspired support weapon | Drum, carry handle, folded bipod |
| Equipment case | Supply pickup or dressing |
| Concrete barrier | Street cover |
| Sandbag cover | Modular low cover |
| Range target | Practice area |
| Traffic cone | Street dressing |

All assets have embedded PBR material textures, UVs, explicit normals and triangulated geometry. No runtime Draco/KTX decoders or external texture requests are required. Body meshes are merged while detachable magazines remain separate; material slots still produce multiple draw calls. Repeated props should use instancing or merged geometry in the game.

## Three.js integration

Copy the GLBs into your application's public asset directory. They export with **metres, +Y up and -Z forward**, matching a default Three.js camera. Prop origins are at ground level (small construction tolerances); weapon origins are near the rear grip, with explicit grip sockets for precise alignment. Do not apply an additional Blender axis rotation.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const id = 'sar21-inspired';
const { scene: weapon } = await new GLTFLoader().loadAsync(`/models/${id}.glb`);
camera.add(weapon);
scene.add(camera);
weapon.position.set(0.17, -0.235, -0.34); // tune for your game's FOV and hand rig

const muzzle = weapon.getObjectByName(`${id}__socket_muzzle`);
const magazine = weapon.getObjectByName(`${id}__magazine`);
// After updating world matrices, muzzle.getWorldPosition(...) gives effect position.
// Magazine translation can be animated independently during a reload.
```

Weapon attachment nodes use `<asset-id>__socket_muzzle`, `socket_grip`, `socket_support`, `socket_sight` and `socket_eject`. They provide positions; hand orientation and animation must be authored for the game's rig. There are no skeletal hands, recoil/reload clips, collision meshes, LODs, sounds or firing logic in this pack. Optics are opaque coated surfaces, not functioning magnifying sights.

## Rebuild

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/build_assets.py
```

The deterministic script rebuilds all models, embeds textures, saves the Blender library and renders each asset. Tested with Blender 5.2.1 LTS. Rendering uses CPU Cycles at 32 samples. The saved Blender library has render visibility disabled for the asset collections' objects so individual studio renders can be generated without overlap; enable render visibility for any asset you want to render manually. Viewport visibility is enabled.

## Art direction and next pass

The visual references are the SAR 21 family and Ultimax family, with deliberately approximate external details. Manufacturer family references: [SAR 21 MMS](https://www.stengg.com/en/defence/land/integrated-soldier-systems/sar21-mms/) and [Ultimax 100 Mk8](https://www.stengg.com/en/defence/land/integrated-soldier-systems/ultimax-100-mk8/). No manufacturer meshes, photos, insignia or logos are distributed.

For a high-fidelity FPS, the next art pass should refine the silhouettes against a chosen exact variant, add authored wear and normal maps, create a hand rig and reload animations, and produce world-model LODs. The current textures provide subtle material grain, not a full high-resolution wear bake.
