# Handoff to the Blockplay game owner

Reviewed against `main` at `7b9d58f` on 2026-09-13. The original standalone handoff below describes the first pack. A subsequent local integration now runs under Marina Bay → Marina FPS. See `src/components/FpsGame.tsx` and `src/game/fps-engine.ts`; the game loads copied assets from `public/models/field-kit/`. The guidance below remains useful for further asset work.

## What the repository actually runs

- React + TypeScript + Three.js 0.180.x; the asset viewer uses the same Three.js minor.
- `src/components/MarinaGame.tsx` is the active walk/drive experience. `src/game/marina-scene.ts` builds the authored, compressed Marina map; `src/game/marina-collision.ts` handles ground-plane AABB collision.
- `src/game/World.tsx` owns the separate `training` mode. It currently uses a fixed 62-degree camera and click-position raycasts against five procedural targets.
- `src/components/MarinaWorld.tsx` is the older, inactive depth experiment. It is not the integration target.
- The game's pnpm pin remains 11.22.0. The independent asset viewer uses this VM's installed 11.15.0. Both enforce the strict 14-day dependency cooldown.

## Recommended integration order

1. Copy selected GLBs from `asset-pack/public/models/` into the game's `public/models/field-kit/`. Use `GLTFLoader` from the already installed `three/addons/loaders/GLTFLoader.js`; no extra runtime package is needed.
2. Add a weapon viewmodel to the existing training mode first. Match its 62-degree FOV and tune its camera-local position. Its camera currently has a 0.1 near plane: consider a dedicated viewmodel camera with a smaller near plane to avoid clipping near the stock. Exclude the viewmodel from target raycasts. Adding a weapon should not imply that fixed-camera target practice is already a walking FPS.
3. Keep asynchronous loading cancellable at React unmount, show a loading/error state, and dispose geometries, materials and embedded textures in the existing effect cleanup. `Object3D.clone` shares those resources, so centralize ownership when reusing models.
4. Replace visual targets while keeping explicit hit proxies and current score/reset behavior. Props have no physics bodies: add simple AABBs or other collision proxies when placing them in Marina.
5. Before adding weapons to the Marina walking camera, agree on the mode UX with the map owner. The map's current visual style is low-poly, while this user's equipment direction is more realistic. The assets are an initial art pass that can be revised independently.

## Budget and interfaces

| Asset | Triangles | Material draw primitives | GLB |
| --- | ---: | ---: | ---: |
| SAR 21-inspired | 17,556 | 9 | 1,045 KB |
| Ultimax-inspired | 21,232 | 7 | 1,050 KB |
| Equipment case | 5,264 | 6 | 594 KB |
| Concrete barrier | 2,584 | 4 | 377 KB |
| Sandbag cover | 4,136 | 2 | 279 KB |
| Range target | 6,792 | 6 | 706 KB |
| Traffic cone | 1,316 | 3 | 281 KB |

Dimensions, filenames and exact socket names are recorded in `public/models/manifest.json`. Metres, +Y up, -Z forward. Magazines are separate meshes. No high-resolution wear bake, skeletal hands, reload clips, LODs, collision meshes, sound or multiplayer logic is included.

The GLB geometry budget is intended for one close-up weapon; it is not a measured frame-rate guarantee on this VM. Use lower-detail world models for remote players and instancing/merged batches for repeated props.

## Verification

- All seven GLBs passed the local structural check: valid binary lengths, in-bounds indices, UVs, normals, embedded images, unique node names, expected sockets and triangle budgets.
- All seven Blender studio renders were visually inspected.
- The standalone viewer production build passes with pnpm 11.15.0. Vite reports a non-blocking Three.js bundle-size warning.
- Headless Chrome loaded and rendered the SAR GLB in the standalone viewer; the browser screenshot was inspected. The full interactive control flow has not been automated.
- These checks do not claim that the models are wired into or tested inside the main game.
