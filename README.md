# Blockplay — Singapore, playable.

A hackathon starter for playable Singapore neighborhoods, built with React, TypeScript, Vite, and Three.js. The emphasis is on familiar HDB estates as well as the postcard locations.

See [PLAN.md](PLAN.md) for completed work, experiments, and the roadmap; [HANDOFF.md](HANDOFF.md) for continuing on another computer.

## Current playable regions

- **Marina Bay:** 726 × 616 game units and 14 collectibles. Three connected road circuits extend the waterfront into gardens, conservatory-inspired structures, an observation wheel and more city blocks. Detailed museum/Sands motifs, promenade furniture and planting remain in the original core.
- **Queenstown:** 520 × 424-unit estate and eight collectibles. Expanded district roads connect open void decks, covered paths, shops, court, market/community buildings, playground, greenery and an elevated station/train, with richer facades and street furniture.
- **Raffles Place:** 580 × 399-unit city-core map and 11 collectibles. Plaza/MRT area, detailed office towers, quayside shophouses, heritage arcade, market hall/garden, river promenade and extended road loops. Each region has its own cached reference collection under `reconstruction/<region>/references/`.

Select any of these locations to open its own walk/drive 3D mode. These are authored, compressed interpretations, not surveyed replicas. Only the three developed worlds are listed. The region games make no Google API calls while playing.

The location picker includes a compact Singapore locator map that highlights the selected region. In Open world, it follows your current district and previews checkpoint routes, threat and loot tiers without resetting the expedition. New expeditions start in the selected district. It is an approximate orientation aid, not a navigation map, and requires no map API calls. See [connected districts](docs/WORLD-ZONES.md) and the [mode feature comparison](docs/FEATURE-PARITY.md).

The latest model-quality pass uses 75 newly cached Static reference images: finer Marina landmark framing and patterned shells, more articulated Raffles roofs/shutters/glazing, and deeper Queenstown gallery/station details with more varied trees. Material roughness is differentiated so glass, metal, paint and stone do not all read alike. These changes preserve each region's map extent and collectible routes.

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

- **Open world expedition:** explore connected Marina Bay, Raffles Place and Queenstown zones. Pick up randomized weapons, plates, ammo and medical supplies with E; cross checkpoints with T. The CBD has tougher patrols and better elite weapon odds. Field equipment and collected loot survive zone travel; permanent Armory purchases remain separate. See [zones and loot](docs/WORLD-ZONES.md).

- **LAN arena and bots:** run `pnpm lan`, open **LAN arena**, and host or join using the room code. Supports up to four humans, six bots, Armory loadouts, assault/tank/sniper compositions, respawns and a shared scoreboard. Solo bots also work with `pnpm dev`. See [LAN setup and role plugins](docs/LAN-ARENA.md).

- **Immersive fullscreen:** use the Fullscreen button or F during FPS/vehicle play. Escape pauses and releases the mouse. The same canvas, loadout, vehicle and target progress remain active across screen-mode changes. Browsers that deny native fullscreen get an expanded viewport with an exit control.

- **FPS vehicles:** approach Utility 01 or Falcon 01 and press E to enter/exit. Drive with WASD and Space brake, or fly with WASD, Space climb, C/Ctrl descend and Shift boost. Land before leaving the helicopter. The Armory’s Vehicles tab offers five cosmetic wraps, equipped separately on each vehicle.

- **Field exchange:** Marina FPS → Open armory opens a 27-item equipment shop with interactive 3D previews, permanent purchases, skins, attachment slots, and ILBV/LBS-inspired rigs with separate soft/ceramic inserts. Premium variants provide stronger stats, applied to the FPS. See [armory balance and architecture](docs/ARMORY.md).
- **Progression:** 50 XP levels, rank badges and level-gated purchases. Target eliminations award 25 XP; completing a drill adds XP and earned credits. Double/triple/multi-kill announcements escalate through Rampage for eliminations within three seconds. Stingers and available installed English voices follow the sound toggle.
- **Counter-fire drill:** optional return fire makes armor and movement matter. Incoming shots have a dodge warning, respect scenery, deplete armor and can end the exercise. The default practice drill has no incoming damage.

- **Marina FPS:** choose Marina Bay → Marina FPS → Enter range. A free-moving, eight-target practice exercise on the Marina map, with SAR 21-inspired and Ultimax-inspired GLB viewmodels, automatic hitscan fire, optical aiming overlay, recoil, muzzle flashes/tracers, magazine/reserve ammo, animated reload poses, weapon switching, and completion time/accuracy. WASD moves, mouse looks, left mouse fires, right mouse aims, R reloads, 1/2 switches, Shift sprints, C crouches and Space jumps. Esc pauses and releases the mouse. On-screen controls support touch-device drag-look; desktop play requires mouse capture; sound can be muted and the range can go fullscreen. Scenery blocks shots; player collision reuses the map's ground-plane obstacles. This is a target range with arcade tuning, not PvP or an enemy-AI mode. No Maps calls or credentials are needed.


Latest Marina pass adds reference-matched gray paving, blue glass, deeper water, silver railings, fuller palms, planting, lights and a detailed Shoppes roofline. Sands landmark proportions use published dimensions; the overall map remains compressed. Static and browser reference images are cached in [the reference folder](reconstruction/marina-bay/references/README.md); use `pnpm marina:usage` for live usage counts.

- **Marina 3D / Queenstown 3D / Raffles 3D:** location-specific low-poly games. Click the scene; WASD walks, drag looks, Shift runs. Drive switches to a visible car with a chase camera; W/S accelerate/reverse, A/D steer, Space brakes. Collect 14 orange rings in Marina, eight in Queenstown or 11 in Raffles Place. Water/buildings block movement; reset clears progress. Arcade handling, not full vehicle physics. No Google requests while playing.
- **Street View:** a separate live viewer requiring a Maps key. Three starting viewpoints per location display imagery, with look left/right, step forward/backward, and recenter controls. Google's descriptions, image-date control, navigation arrows, and attribution remain available. The search finds nearby panoramas within 200 m; positions and outdoor classification are not guarantees. Loading, missing-key, request-error, authorization-error, and retry states are included.
- Queenstown, Marina Bay and Raffles Place presets. Each has approximate search coordinates and its own authored 3D world. Street View availability and exact panorama positions depend on Google.
- Start, pause, resume, reset, progress, timers, completion states, and responsive controls.

The legacy Joyride and Target practice modes are no longer exposed in the app. **Marina 3D uses authored solid geometry**, with reference-informed waterfront details and deliberately compressed landmark placement. Displayed distances are game units treated as meters, not surveyed distances. The earlier four-photo depth experiment did not satisfy the desired game art style and is no longer mounted.

## Enable real Street View

Optional separate browser credential: set `GOOGLE_MAPS_DEMO_API_KEY` in `.env` or `.env.local`. Vite prefers it for the live viewer and browser screenshots, falling back to `VITE_GOOGLE_MAPS_API_KEY` when absent. Static capture scripts still use `VITE_GOOGLE_MAPS_API_KEY` only. Both are browser credentials; the demo key is explicitly exposed to the client. Restart Vite/reload after changes.

`pnpm marina:browser-capture` captures one reviewed Marina view; add `--batch` for the editable eight-view workflow, or `--batch --dry-run` for a no-request preflight. Static endpoints are blocked. Requires local Vite plus Chrome remote debugging on loopback (default port 9223); complete cached reruns need neither browser nor credentials. See the [workflow and benchmark](reconstruction/marina-bay/references/WORKFLOW.md).

Region-specific batches use the same workflow: `pnpm marina:browser-capture --plan reconstruction/raffles-browser-plan.json --dry-run` or `--plan reconstruction/queenstown-expansion-browser-plan.json --dry-run`. Remove `--dry-run` only when fetching missing references intentionally; complete caches are reused automatically. Run capture batches one at a time and transfer `reconstruction/<region>/references/` with the checkout to avoid re-querying on another computer.

Do not run browser smoke checks or switch Chrome tabs during captures. The capture tab must render in the foreground: metadata can update before Street View pixels repaint. The workflow checks viewpoint/visibility, waits for repaint, rejects development overlays and exact duplicate frames, but visual review is still required. Rejected historical frames stay in the cache with review notes; capture success is not acceptance.

`pnpm references:inventory` checks cached image hashes and reports image counts, bytes and accepted/limited/rejected/pending review totals for all three regions without network access. Some older reviews exist only in documents and therefore appear pending until their manifests are annotated.

### Targeted Static references

The quality-pass plans use existing Google panorama metadata to fetch focused, original 640 × 640 JPEGs with explicit heading, pitch and field of view. `pnpm references:static --plan reconstruction/marina-static-quality-plan.json --dry-run` previews cache reuse; substitute `raffles-static-quality-plan.json` or `queenstown-static-quality-plan.json` for the other regions. Without `--dry-run`, only missing images are requested using the Static-enabled `VITE_GOOGLE_MAPS_API_KEY`. Complete cached reruns require no key and make no requests. Camera settings, source dates, attribution, checksums and visual review notes remain alongside each image. Budget authority and usage are maintained in PLAN.md and the ledger, not in this README.

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

## FPS implementation and checks

The FPS UI is `src/components/FpsGame.tsx`; rendering/input/resource cleanup live in `src/game/fps-engine.ts`. `fps-rules.ts` handles ammo/cadence/reloading and normalized movement, and `fps-raycast.ts` filters visible, nearest surface hits. Six original GLBs are included under `public/models/field-kit/`; no Blender installation is needed to run the app. Editable art sources and the standalone inspection viewer are under `asset-pack/` in the working copy.

The close-up weapons have approximately 18k/21k triangles. A separate viewmodel camera prevents clipping into world geometry. Pixel ratio is capped at 1.35 and dynamic shadows are disabled in FPS mode for the VM. These choices do not guarantee a particular frame rate. Jumping is ground-plane motion: buildings remain solid at all heights, with no climbing, slopes or interiors. Optional target counter-fire now supplies a player/armor damage loop. There are no skeletal hands, navigating enemy AI or multiplayer yet; aiming uses an overlay because the GLB optic lenses are opaque.

Run `pnpm test` and `pnpm build`. The portable browser smoke test requires a running app and an isolated Chrome debugging session on loopback. It defaults to app port 5175 and Chrome port 9224; override with `FPS_APP_ORIGIN` and `FPS_CHROME_ORIGIN`. Then run `pnpm test:fps` (Node 22.12+ with built-in WebSocket support). If your VPN proxies localhost, use `NO_PROXY=127.0.0.1,localhost pnpm test:fps`. Screenshots go to ignored `.cache/fps-smoke/`. The script checks loading, center-target hits, ammo/reload, pause, weapon switching, movement, aiming, all-eight-target completion, reset, mobile layout, mode cleanup and zero map requests. It uses the isolated browser's DevTools endpoint; do not point it at a personal browser profile.

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

The game and Google viewer are independent. Extend the original world without mixing Google imagery into custom 3D materials. Exercises run in memory. Armory currency, XP, ownership and equipped items persist in browser local storage. No backend is required for local gameplay; the optional adventure companion uses the included server. There is no account system, synchronization or leaderboard.

## Deploy

The game can be hosted statically, but the Marina **Change the adventure** companion requires a server. See [ADVENTURE.md](ADVENTURE.md) for text/voice setup, testing and deployment. Run `pnpm server` alongside `pnpm dev`, with private `OPENAI_API_KEY` in `.env`. The companion uses GPT-6 Astra and GPT-Live-1; ordinary exploration remains local.

For a game-only static deployment, import the repository into Vercel, Netlify, or your static host:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`
- Optional build-time variable: `VITE_GOOGLE_MAPS_API_KEY`

Add your deployed origin to the Google key's allowed referrers. Rebuild after changing environment variables. No special client-route rewrites are needed. Typography uses local sans-serif fallbacks so LAN play does not wait on a font service.

## Five-hour build priorities

1. Get this scaffold running and deploy it early. Confirm Street View credentials on the deployed domain.
2. Pick one hero experience: location-aware exploration, a much richer driving game, or a polished arcade training range.
3. Add one memorable feature. For example, a mission director that chooses from approved locations and structured objective types, or original neighborhood props and vehicle visuals.
4. Demo the Marina companion: use a typed or spoken request to change the actual objective. Runtime Astra calls and GPT-Live-1 session creation use server-only credentials; structured destination proposals are validated locally. See `ADVENTURE.md`.
5. Use the last hour for deployed-browser checks and the 90-second video.

Suggested video: show the Singapore map (10 s), explore a region (20 s), change an objective with the companion (20 s), ask an educational question (15 s), show Marina FPS and its armory (10 s), and explain Astra’s contributions (15 s).

Before presenting, verify the live Google integration with your own key and test desktop + phone controls. No public deployment is created by this scaffold itself.

## Armory browser checks

With Vite running and an isolated Chrome started with `--remote-debugging-port=9224`, run:

```sh
NO_PROXY=127.0.0.1,localhost pnpm test:fps
NO_PROXY=127.0.0.1,localhost pnpm test:armory
NO_PROXY=127.0.0.1,localhost pnpm test:vehicles
NO_PROXY=127.0.0.1,localhost pnpm test:fullscreen
```

Both scripts default to `http://127.0.0.1:5175`; set `FPS_APP_ORIGIN` and `FPS_CHROME_ORIGIN` if needed. Use a separate Chrome `--user-data-dir`: the checks reset the demo armory save on the test origin. Screenshots go to `.cache/fps-smoke/` and `.cache/armory-smoke/`. No browser-testing dependencies were added.

Desktop FPS starts only after the browser captures the pointer. Escape releases it and pauses; Resume recaptures it. Capture denial leaves the exercise stopped and displays a retry message. Touch devices retain drag-look.
