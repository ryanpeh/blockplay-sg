# Blockplay — Singapore, playable.

A hackathon starter for playable Singapore neighborhoods, built with React, TypeScript, Vite, and Three.js. The emphasis is on familiar HDB estates as well as the postcard locations.

See [PLAN.md](PLAN.md) for completed work, experiments, and the roadmap; [HANDOFF.md](HANDOFF.md) for continuing on another computer.

## Current playable regions

- **Marina Bay:** 726 × 616 game units and 14 collectibles. Three connected road circuits extend the waterfront into gardens, conservatory-inspired structures, an observation wheel and more city blocks. Detailed museum/Sands motifs, promenade furniture and planting remain in the original core.
- **Queenstown:** 520 × 424-unit estate and eight collectibles. Expanded district roads connect open void decks, covered paths, shops, court, market/community buildings, playground, greenery and an elevated station/train, with richer facades and street furniture.
- **Raffles Place:** 580 × 399-unit city-core map and 11 collectibles. Plaza/MRT area, detailed office towers, quayside shophouses, heritage arcade, market hall/garden, river promenade and extended road loops. Each region has its own cached reference collection under `reconstruction/<region>/references/`.

Select any of these locations to open its own walk/drive 3D mode. These are authored, compressed interpretations, not surveyed replicas. Tampines and Toa Payoh still use the older generic scaffold. The region games make no Google API calls while playing.

Run `pnpm test:browser` with Vite and local Chrome debugging active to check region rendering, walk/drive, independent car-camera dragging, reset, switching and mobile width. The test uses its own tab, makes no live Maps requests, and saves diagnostic screenshots under ignored `.cache/browser-checks/`.

In Drive, drag to orbit the car without steering it; A/D steers. After you release the drag, the camera gently returns behind the car while moving. Parked views stay where you leave them. Reset or switching travel mode restores the default chase camera. Walking drag controls are unchanged.

**Target experience:** recognizable Singapore locations rendered as playable 3D game worlds in Joyride's low-poly style, using street-level images as references. The latest user clarification favors modeled game art, not photographs stretched onto depth meshes.

**Marina Bay:** solid modeled landmarks, palm promenade, city skyline, connected road loops, visible car, collisions, and 14 collectible stamps. The default scene needs no key or live image requests. It is an authored, compressed interpretation—not automatic photo reconstruction. The earlier depth experiment is retained, inactive, under `public/reconstruction/marina-bay/`. See [capture history](reconstruction/README.md) and [project plan](PLAN.md).

## Run it

Use Node 22.12+ and pnpm 11 (pinned to 11.22.0 in `package.json`).

If pnpm is not installed, `npx --yes pnpm@11.22.0 install` bootstraps the pinned pnpm without a global installation. Use `npx --yes pnpm@11.22.0 dev` to start it the same way. Project dependencies are still installed by pnpm.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. **No API key is needed for the playable demo.**

```sh
pnpm test
pnpm build
pnpm preview
```

Dependency installs enforce a two-week cooldown (`minimumReleaseAge: 20160`) in `pnpm-workspace.yaml`, with strict checking and no package exemptions. esbuild, onnxruntime-node, and sharp may run build scripts; protobufjs scripts are disabled. See [pnpm configuration](https://pnpm.io/settings).

## What works

Latest Marina pass adds reference-matched gray paving, blue glass, deeper water, silver railings, fuller palms, planting, lights and a detailed Shoppes roofline. Sands landmark proportions use published dimensions; the overall map remains compressed. Static and browser reference images are cached in [the reference folder](reconstruction/marina-bay/references/README.md); use `pnpm marina:usage` for live usage counts.

- **Marina 3D / Queenstown 3D / Raffles 3D:** location-specific low-poly games. Click the scene; WASD walks, drag looks, Shift runs. Drive switches to a visible car with a chase camera; W/S accelerate/reverse, A/D steer, Space brakes. Collect 14 orange rings in Marina, eight in Queenstown or 11 in Raffles Place. Water/buildings block movement; reset clears progress. Arcade handling, not full vehicle physics. No Google requests while playing.
- **Joyride:** drive a 240 m circuit through an original, procedurally built neighborhood. WASD / arrow keys accelerate, brake, and steer; Space brakes. Touch controls work too. Cross three gates to finish. The vehicle stays within the road; there is no traffic, vehicle model, or collision simulation yet.
- **Target practice:** click / tap five targets in a fixed first-person view. This is a small NS-inspired arcade foundation, not a full FPS or an authentic equipment simulation. No enemies or real weapon mechanics are implemented.
- **Street View:** a separate live viewer requiring a Maps key. Three starting viewpoints per location display imagery, with look left/right, step forward/backward, and recenter controls. Google's descriptions, image-date control, navigation arrows, and attribution remain available. The search finds nearby panoramas within 200 m; positions and outdoor classification are not guarantees. Loading, missing-key, request-error, authorization-error, and retry states are included.
- Tampines, Toa Payoh, Queenstown, Marina Bay and Raffles Place presets. Each has approximate search coordinates and a distinct palette for the procedural demo. Street View availability and exact panorama positions depend on Google.
- Start, pause, resume, reset, progress, timers, completion states, and responsive controls.

Joyride and Target practice use fictional original layouts. **Marina 3D uses authored solid geometry**, with reference-informed waterfront details and deliberately compressed landmark placement. Displayed distances are game units treated as meters, not surveyed distances. The earlier four-photo depth experiment did not satisfy the desired game art style and is no longer mounted.

## Enable real Street View

Optional separate browser credential: set `GOOGLE_MAPS_DEMO_API_KEY` in `.env` or `.env.local`. Vite prefers it for the live viewer and browser screenshots, falling back to `VITE_GOOGLE_MAPS_API_KEY` when absent. Static capture scripts still use `VITE_GOOGLE_MAPS_API_KEY` only. Both are browser credentials; the demo key is explicitly exposed to the client. Restart Vite/reload after changes.

`pnpm marina:browser-capture` captures one reviewed Marina view; add `--batch` for the editable eight-view workflow, or `--batch --dry-run` for a no-request preflight. Static endpoints are blocked. Requires local Vite plus Chrome remote debugging on loopback (default port 9223); complete cached reruns need neither browser nor credentials. See the [workflow and benchmark](reconstruction/marina-bay/references/WORKFLOW.md).

Region-specific batches use the same workflow: `pnpm marina:browser-capture --plan reconstruction/raffles-browser-plan.json --dry-run` or `--plan reconstruction/queenstown-expansion-browser-plan.json --dry-run`. Remove `--dry-run` only when fetching missing references intentionally; complete caches are reused automatically. Run capture batches one at a time and transfer `reconstruction/<region>/references/` with the checkout to avoid re-querying on another computer.

Do not run browser smoke checks or switch Chrome tabs during captures. The capture tab must render in the foreground: metadata can update before Street View pixels repaint. The workflow checks viewpoint/visibility, waits for repaint, rejects development overlays and exact duplicate frames, but visual review is still required. Rejected historical frames stay in the cache with review notes; capture success is not acceptance.

`pnpm references:inventory` checks cached image hashes and reports image counts, bytes and accepted/limited/rejected/pending review totals for all three regions without network access. Some older reviews exist only in documents and therefore appear pending until their manifests are annotated.

Browser screenshots/loads are tracked separately from Static downloads. Browser Street View can still have separate billing. The initial batch saved eight 1280×900 images in 21.8s; cache-only rerun took 33ms, with zero Static requests in either run.

1. Create a Google Cloud project with billing and enable **Maps JavaScript API**.
2. Create a browser API key, restrict its API access, and configure HTTP referrer restrictions for your localhost and deployment origins.
3. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY`.
4. Restart Vite, then select **Street View**.

Vite embeds `VITE_*` variables into the public browser bundle. A Google browser key is intended for this use with restrictions. **Never put an OpenAI secret or another server credential in a `VITE_*` variable.**

The live viewer lives in `src/lib/google-maps.ts` and `src/components/StreetView.tsx` and retains Google's controls and attribution. A separate capture/build pipeline uses the owner's confirmed permission to save source images and derive the Marina geometry. Its requests are budgeted and recorded; source files and API keys are not needed to play the generated scene.

- [Google Street View guide](https://developers.google.com/maps/documentation/javascript/streetview)
- [Google Maps policies and attribution](https://developers.google.com/maps/documentation/javascript/policies)
- [Google API security guidance](https://developers.google.com/maps/api-security-best-practices)

Terms and privacy disclosures are available from the footer. Review them for your deployed operator and any services you add before launch.

## Project layout

```text
src/
  App.tsx                    Experience selection, session state, interface
  styles.css                 Responsive visual system
  data/locations.ts          Singapore presets and mode types
  game/World.tsx             Original Three.js scene and game loop
  game/marina-scene.ts       Modeled Marina landmarks, road loop, car, stamps
  game/marina-collision.ts   Bounds, obstacle collision, wall sliding
  components/MarinaGame.tsx  Default Marina walk/drive game and HUD
  game/physics.ts            Speed and checkpoint rules
  game/physics.test.ts       Core driving behavior checks
  components/StreetView.tsx  Official panorama viewer
  lib/google-maps.ts         Optional browser SDK loader
```

The game and Google viewer are independent. Extend the original world without mixing Google imagery into custom 3D materials. All gameplay state is currently in memory; there is no backend, account system, leaderboard, or persistence.

## Deploy

This is a static application. Import the repository into Vercel, Netlify, or your static host:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`
- Optional build-time variable: `VITE_GOOGLE_MAPS_API_KEY`

Add your deployed origin to the Google key's allowed referrers. Rebuild after changing environment variables. No special client-route rewrites are needed. Google Fonts are loaded externally with local sans-serif fallbacks.

## Five-hour build priorities

1. Get this scaffold running and deploy it early. Confirm Street View credentials on the deployed domain.
2. Pick one hero experience: location-aware exploration, a much richer driving game, or a polished arcade training range.
3. Add one memorable feature. For example, a mission director that chooses from approved locations and structured objective types, or original neighborhood props and vehicle visuals.
4. If adding runtime Astra, put the model call behind a server endpoint, validate its structured output, and configure the model identifier and credentials supplied by the event. This scaffold uses Astra for engineering; it makes **no runtime model calls** and assumes no unreleased API signatures.
5. Use the last hour for deployed-browser checks and the 90-second video.

Suggested video: show the neighborhood selection (10 s), complete the driving circuit (25 s), show target practice (15 s), explore a real neighborhood in Street View (20 s), and explain Astra's concrete engineering contributions and the next milestone (20 s).

Before presenting, verify the live Google integration with your own key and test desktop + phone controls. No public deployment is created by this scaffold itself.
