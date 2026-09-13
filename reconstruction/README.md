# Marina Bay reconstruction and API budget

**Historical experiment:** the default Marina 3D mode now uses authored low-poly geometry in `src/game/marina-scene.ts`, following the user's Joyride-style clarification. It does not load these photo-depth assets. The pipeline and assets below are retained for reference, not the active rendering path. No recapture or inference is needed to run the game.

The owner has confirmed permission to use the source Street View imagery for this project. Current scope: **Marina Bay only**.

## Request ledger

`api-usage.json` is the source of truth for Static API attempts made by the capture script. It has a hard maximum of **1,000**, with no automatic reset. Every attempt is reserved on disk before making the request; failures and interrupted requests still count conservatively. HTTP-successful metadata errors are recorded by their API status.

Current recorded attempts: **13 total: 8 Static image downloads, 4 Static metadata lookups, and 1 Google-only Maps JavaScript panorama selection**. Four images from the first capture were rejected after visual inspection showed an indoor exhibition; four outdoor waterfront images form the current scene. Two early metadata lookups were denied before the key was updated. Read the ledger or run `pnpm marina:usage` for the live count. Earlier interactive Maps JavaScript viewer traffic is not included.

[Google documents metadata requests as free and not quota-consuming](https://developers.google.com/maps/documentation/streetview/metadata); this project nevertheless counts every capture attempt against the stricter local 1,000-attempt cap. That leaves **987 conservative attempts**. This is not a Cloud billing report.

Keep this ledger when moving computers. Do not run captures concurrently on multiple machines: the local lock file cannot synchronize separate checkouts. Use one capture machine or reconcile all ledgers before spending more of the shared quota. Never replace this ledger with a fresh empty file to recover from an error.

## Capture and build

The latest key in `.env` successfully enabled source capture. New machines only need a key if recapturing; the generated scene runs from local assets without one. For recapture, enable **Street View Static API** in the key's Cloud project and restrictions. If a browser-referrer-restricted key is rejected in this CLI context, use an appropriately restricted capture credential locally; do not remove production key restrictions automatically.

```sh
pnpm marina:capture
pnpm marina:reconstruct
pnpm dev
```

The reviewed capture is a waterfront promenade at `1.281178653223573,103.85655765865478`, photographed in **February 2012**. Its selected panorama metadata is in `marina-bay.capture.json`. Four 640×640 images at headings 0/90/180/270 use a 90° field of view. A fresh capture uses that saved selection and costs four image requests; on the original machine all four are cached and reruns use **zero** requests. `--preview` fetches only heading 0 for visual inspection. Source files live under `marina-bay/source/`, ignored by Git; the rejected indoor set is preserved in `marina-bay/rejected-indoor/` and is not used by the build.

If the saved panorama ID expires, select a replacement explicitly and review one preview before downloading more. The initial Static metadata lookup ignored the outdoor filtering expectation and returned contributed indoor imagery; the successful selection used the Maps JavaScript service with `StreetViewSource.GOOGLE`. Do not blindly repeat coordinate searches or assume metadata implies a suitable outdoor photo.

The depth build runs locally using Transformers.js and `onnx-community/depth-anything-v2-small`; its first run downloads model weights into `.cache/models`. No source photographs are uploaded to an inference service. Package dependencies use pnpm 11 and the 14-day cooldown. The scene records the downloaded weights' SHA-256; the download still uses the model repository's default revision, so pin a revision for long-lived reproducibility. An interrupted early download produced a corrupt ONNX cache; it was preserved as `.incomplete` and replaced successfully.

Output: `public/reconstruction/marina-bay/scene.json`, four geometry JSON files, and four textures. The historical `src/components/MarinaWorld.tsx` viewer loads these assets but is no longer mounted by the app. The model/runtime are build tools, not part of the browser bundle. Generated output remains portable without rerunning inference; capture sources and the API key are not required by that viewer.

## Honest scope of this first experiment

This is **monocular depth-estimated geometry**, not multi-view photogrammetry or a surveyed model. Four views share one camera center. Relative depth is mapped to an approximate world scale, with a flat ground assumption and a 4-unit exploration radius. The viewer provides continuous camera translation and walk/drive controls inside that boundary; it does not provide a road network, building interiors, accurate building backs, or a physics collision mesh.

Expect uncertain depth, stretched triangles at occlusions, and missing surfaces when moving away from the capture point. Shared sector edges are stitched to reduce cracks. The real output was visually inspected and browser-tested: scene loading, walking, driving, reset, and a 390 px mobile layout passed; the scene made zero live Static API calls. Eleven unit tests cover physics, panorama navigation, depth geometry/seams, and budget accounting. This validates a small-area proof of concept, not a complete Marina Bay district or accurate physical collision.

For a larger environment, acquire overlapping captures at translated camera positions, solve camera/geometry alignment, and add validated collision geometry. Keep the first four-image experiment small until its visual quality has been checked.
