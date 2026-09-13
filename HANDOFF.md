# Blockplay: portable agent handoff

Last updated: 2026-09-13. Start by reading this file, `PLAN.md`, and `README.md`, then inspect the checkout and any applicable `AGENTS.md` instructions.

## Product context

Two-person Singapore hackathon prototype, built with Astra as an engineering collaborator. The user wants realistic, playable experiences in everyday Singapore as well as tourist destinations. Driving and an NS-inspired FPS were the original ideas. A deployed URL and 90-second video are the final event deliverables; neither has been produced yet.

**Latest user clarification:** Build real 3D scenes from street-level images of Singapore and allow continuous walking/driving inside them. The user explicitly corrected the earlier panorama-viewer interpretation. GPT-Image-2.5 may help if useful; a bitmap alone is not the desired result.

**Current implementation:** Marina 3D is a working small-area depth reconstruction from four waterfront images, with continuous walk/drive controls. It is not a complete district or a metric photogrammetry model. The app also retains live Street View and the original procedural game modes; those are separate experiences.

**Latest authority and scope:** The user confirmed permission to reconstruct Street View imagery and selected **Marina Bay first**. Do not ask for permission again. They also imposed a **1,000 Static API query limit**, requested persistent accounting, and asked to minimize images.

**Latest work:** `scripts/capture-marina.mjs` captures one reviewed panorama in four directions; `scripts/reconstruct-marina.mjs` estimates local depth, stitches sector edges, and writes geometry/texture assets; `src/components/MarinaWorld.tsx` provides continuous walk/drive controls. The generated scene is included in `public/reconstruction/marina-bay/` and starts by default. It needs no Maps key or model inference to play. Capture is from **February 2012**, not current imagery. Scale/ground are approximate; exploration is bounded to a 4-unit radius. There is no true vehicle physics or mesh collision system.

**Key issue resolved:** the latest key in `.env` succeeded. No need to ask the user to enable Static API again. `reconstruction/api-usage.json` currently records **13 capture attempts: 8 Static images, 4 Static metadata requests, and 1 Maps JavaScript panorama selection**. Four early image downloads were an unsuitable indoor panorama; they are not in the scene. Check `pnpm marina:usage` for the current count. Preserve the ledger; never reset it. No more image calls are needed to run/build the current scene. See `reconstruction/README.md`.

## Explicit user preferences

- Use **pnpm 11**, currently pinned to **11.22.0**.
- Enforce a **two-week minimum dependency release age** (`20160` minutes).
- Preserve `minimumReleaseAgeStrict: true` and the lockfile. Do not bypass the cooldown to solve an install issue.
- Keep the plan/history and handoff useful for agents on different computers.
- Do not overwrite the user's private environment settings or publish their credentials.

## Transfer the work first

Repository: `git@github.com:ryanpeh/astra-hackathon.git`, branch `main`. The owner requested an initial commit and upstream push of this prototype, its generated assets, and these documents. Use the published branch as the transfer source and run `git status` before starting new work. Source images/caches and `.env` are intentionally excluded; generated scene assets are included so another machine can play immediately.

Include: `src/`, `scripts/`, `public/reconstruction/marina-bay/`, `reconstruction/api-usage.json`, `reconstruction/marina-bay.capture.json`, `reconstruction/README.md`, `index.html`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `.env.example`, `README.md`, `PLAN.md`, `HANDOFF.md`.

Exclude: `node_modules/`, `dist/`, `.cache/`, `*.tsbuildinfo`, actual `.env` / `.env.local`, local browser profiles, and temporary screenshots/scripts. Generated public scene assets are portable and should be included. If rebuilding depth locally, copy the four approved images plus `capture.json` from the ignored `reconstruction/marina-bay/source/` through the owner's normal file transfer process; do not recapture unnecessarily. Do not transfer the rejected indoor set as reconstruction input. Obtain any required keys separately. Never copy the first machine's npm cache paths, process IDs, or browser sessions into setup instructions.

## Bring up a new machine

1. Install Node **22.12+** (a supported even-numbered LTS release is appropriate).
2. Make pnpm **11.22.0** available. If it is absent, use `npx --yes pnpm@11.22.0` as the launcher for the commands below; npm here bootstraps pnpm, it does not install the app dependencies.
3. From the project root:

```sh
pnpm --version
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

If pnpm is not installed globally:

```sh
npx --yes pnpm@11.22.0 install --frozen-lockfile
npx --yes pnpm@11.22.0 test
npx --yes pnpm@11.22.0 build
npx --yes pnpm@11.22.0 dev
```

Read the URL Vite prints; it normally uses port 5173 but may select another if occupied. No absolute filesystem paths, OS-specific shell commands, global pnpm install, or old running processes are required.

### Google Maps setup

Create `.env.local` from `.env.example` and set:

```dotenv
VITE_GOOGLE_MAPS_API_KEY=your_browser_key
```

Vite also reads `.env`; `.env.local` overrides a conflicting `.env` value. `.env.example` is documentation only. Restart Vite after configuring the key. Both real environment files are ignored by Git.

Enable Maps JavaScript API and billing. Restrict the browser key to this API and the relevant HTTP referrers. `http://localhost:5173/*` and `http://127.0.0.1:5173/*` are different referrers; allow whichever you use, plus the deployed site. A browser key is public in the client bundle by design. Never use a secret OpenAI key in a `VITE_*` variable.

The first machine has a user-provided `.env`; its value is deliberately not in this handoff. The app now starts in **Marina 3D**, using local generated assets regardless of key presence. The key is only needed for the separate live Street View mode or recapturing sources. Source images are processed locally; no image-generation API is used.

## Architecture and extension points

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Selected location/mode, game session state, overall UI, information dialogs. Keys `StreetView` by location to reset viewpoint state. |
| `src/data/locations.ts` | Four destinations and three approximate panorama search points each. Edit starting positions/headings here. |
| `src/components/StreetView.tsx` | Official panorama viewer; 200 m outdoor nearest search; viewpoint tabs; look/move/recenter controls; status/errors; listener cleanup. |
| `src/lib/google-maps.ts` | Shared browser SDK Promise, async callback loader, timeout/network/auth reporting. |
| `src/lib/street-view-navigation.ts` | Selects a forward/backward connected panorama by heading, handling north wraparound and dead ends. |
| `src/game/World.tsx` | Procedural Three.js world; requestAnimationFrame loop; camera movement; click raycasting; resource disposal. |
| `src/game/physics.ts` | Speed limits, acceleration/braking, and checkpoint count. |
| `src/styles.css` | Responsive styling, including dedicated Street View frame and controls. |
| `src/components/MarinaWorld.tsx` | Loads estimated-depth meshes; walk/drive, mouse look, touch controls, reset, bounded exploration. Shows an explicit missing-assets status until reconstruction is built. |
| `scripts/capture-marina.mjs` | Budgeted, cached four-image capture. Reads the local key without logging it. |
| `scripts/api-budget.mjs` | Reserves attempts before network access, persistent 1,000-attempt cap, and local capture lock. |
| `scripts/reconstruct-marina.mjs`, `scripts/depth-mesh.mjs` | Local ONNX depth inference and approximate textured geometry export. |
| `reconstruction/api-usage.json` | Persistent request ledger; include when transferring work. |
| `src/**/*.test.ts` | Eleven current unit tests, run through Vitest. |
| `pnpm-workspace.yaml` | Dependency cooldown and esbuild-only build-script allowance. |

All game state is in React/in-memory refs. No database, auth, backend, saved progress, multiplayer, traffic, collision engine, or full FPS exists. External services are Google Maps and Google Fonts, plus a model-weight download for the local reconstruction build. Authorized captures and derived scene assets now exist. The browser loads only generated assets in Marina 3D; the model runs offline at build time. See the reconstruction README for limitations.

## What was verified

- Current Marina build: local inference completed, 11 tests and production build passed, and browser checks verified scene loading, walk/drive translation, reset, mobile width, no uncaught errors, and **zero live Static API requests**. Screenshots of the real scene were inspected. Some image stretching is visible and expected from this single-center depth approximation.
- Initial scaffold: production build, physics tests, desktop WebGL/game controls/target hits, missing-key view, and mobile overflow checks passed.
- Latest Street View pass: production build and six unit tests passed; browser rendered content for all 12 starting viewpoints; look-right, actual forward panorama changes, and recenter worked; no horizontal overflow at a 390 px mobile viewport.
- **Historical auxiliary-viewer limitation:** screenshots before the final key update showed a Google configuration warning. The final key successfully fetched valid Static images, and the generated Marina scene was visually checked. Recheck the separate live viewer if needed; do not confuse its earlier warning with the current local-assets scene. The agent did not modify Cloud settings.
- Browser checks used a temporary headless Chrome session on the first machine. Those temporary scripts are not a project dependency or a portable test suite. Recheck with a normal browser on your own origin/key.
- No hosted deployment, actual-phone performance test, or runtime Astra API test has been completed.

## Fast manual acceptance check

1. Reload: Marina 3D should load the waterfront scene without requiring a key or making a Static API request. Click the canvas, use WASD, drag to look, switch Walk/Drive, and reset. The gold ring marks the exploration limit; distances are approximate.
2. For the optional live viewer, choose Street View and try destinations/tabs. This uses the configured key and separate Maps JavaScript traffic.
3. In that viewer, turn left/right, step along the road, and recenter. Step buttons may be disabled if no connected photograph exists in the current direction. Rotate to find a path.
4. Switch to Joyride: start, hold W/up, steer with A/D, brake with S/Space, pause/resume/reset, and complete all three gates.
5. Switch to Target practice: hit all five orange targets and reset.
6. Test a narrow/mobile viewport. Ensure the Google attribution is not obscured and the app does not overflow horizontally.
7. With no key, confirm the no-key demo still works. If testing an invalid key, never print it in logs or commit it.

## Known limits and next steps

- The small four-image Marina proof of concept now works. Next validate depth at more viewing angles and decide whether to extend with translated captures, calibrated geometry/scale, and actual collision. Do not silently spend more image quota. The current asset format is JSON BufferGeometry plus JPEG, not GLB.
- Image generation is optional for texture/appearance completion. Its output does not replace geometry, camera calibration, collision, or validation of spatial consistency. No GPT-Image-2.5 endpoint/access has been verified; use the actual event-provided capability rather than inventing a model/API contract.
- A Google Maps warning was recorded before the final key update. Static API now works; the auxiliary live viewer should be rechecked separately if used in a demo. Preserve source attribution and capture date in the reconstruction.
- Approximate search points are not guaranteed landmark coordinates; Google may snap multiple points to the same panorama. Human curation of heading and distinctness remains useful.
- Street View transitions between capture positions. Do not add fabricated speed/distance claims or imply it supplies depth/collision geometry.
- Test slow networks, failed authorization, unavailable imagery, and rapid viewpoint switching more deeply. The SDK is shared within a page; after changing key restrictions or an authorization failure, a full reload is the reliable recovery path.
- The generic 3D scene varies palette/height, not neighborhood geography. Improving it requires original or suitably licensed data/assets.
- Terms/privacy dialogs are prototype text; keyboard focus trapping and an accessibility pass remain open.
- Highest-value next step: evaluate and improve the bounded depth reconstruction before expanding capture volume. Do not make further panorama navigation the main deliverable. See `PLAN.md` for acceptance criteria and ordered work.

## Deploy on a new host

Static frontend: install `pnpm install --frozen-lockfile`, build `pnpm build`, publish `dist`. Configure the Maps key at **build time**, add the deployed referrer to the key, and rebuild after env changes. No SPA path rewrites are currently needed because there are no pathname routes.

Before finishing a change, run relevant tests and `pnpm build`, record what you actually verified in `PLAN.md`, and update this handoff if setup or architecture changes. Do not claim that a local test proves the public deployment works.
