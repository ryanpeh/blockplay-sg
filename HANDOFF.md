# Blockplay: portable agent handoff

**Current integration (2026-09-13):** rebased multiplayer/bot-role/expedition work onto `dbeb858`. SingaporeMap now previews checkpoint routes during expeditions and follows actual zone arrivals; outside expeditions it retains upstream region selection. New expeditions start in the selected district. App keeps a stable expedition component while `ExpeditionGame` owns per-zone scene replacement and persistent field loot. Route selection must never remount that session or invoke remote travel. 163 unit tests and build pass, along with expedition UI, four-direction travel, upstream three-region walk/drive/map/mobile and two-browser LAN gameplay checks. See [connected districts](docs/WORLD-ZONES.md), [LAN setup](docs/LAN-ARENA.md), [role plugins](docs/arena-plugins.md), and [feature parity audit](docs/FEATURE-PARITY.md). Region views have local minimaps; FPS views still do not. The entries below document earlier milestones and their then-current limitations.

Last updated: 2026-09-13. Start by reading this file, `PLAN.md`, and `README.md`, then inspect the checkout and any applicable `AGENTS.md` instructions.

Navigation simplification: Joyride and fixed-camera Target practice are removed from the app. Region Walk/Drive, Street View and Marina FPS remain. Armory is reachable only from the Marina FPS briefing/pause screen’s Open armory button, not the sidebar; FPS remains selected while shopping. Historical prototype source remains unmounted. Browser shop scripts enter FPS before opening the shop.

Location/UI follow-up: only Marina Bay, Raffles Place and Queenstown remain selectable. `SingaporeMap.tsx` supplies a local SVG overview and central inset, linked to the same selection handler with click/keyboard controls; no Maps calls. Reset labels disclose stamp/history clearing, Privacy describes region/mode progress loss, The idea covers education/fullscreen, and Joyride is correctly labelled a 240 m checkpoint run. Motor Pool no longer exposes weapon attachment controls; level 50 has maximum-level copy. Tests cover the location list, map selection and keyboard access, About/Privacy, separate armory panels, and maximum-level wording.

Independent follow-up copy review is clear within its reviewed scope after fixing Target practice’s reset label and specifying Marina FPS credit rewards. Verification: 108 tests, production build, companion/copy/armory browser checks and all three regions/map selection/keyboard/mobile checks pass; no Maps calls or uncaught browser errors. Existing Three.js chunk-size warning remains nonblocking.

**Combined companion/FPS checkpoint:** rebased the adventure companion, educational guide and objective highlights onto `2b8257c` (FPS armory/progression/vehicles/fullscreen). Preserved both sets of styles, handoff history, and privacy disclosures for local armory storage and optional OpenAI interaction. Combined unit suite: **106 tests passing**, production build passing with the existing nonblocking Three.js chunk-size warning. Earlier counts below describe individual milestones.

**Current integrated checkpoint:** rebased FPS, armory, XP, vehicle and asset-pack work onto `2f27af2` while preserving all three region refinements and reference caches. Immersive fullscreen is now available through the toolbar or F; Escape pauses/releases capture, and denied native fullscreen has an expanded-view fallback. The session remains intact when changing screen mode. Current verification: **75 tests + production build**, with local FPS/shop/vehicle/fullscreen browser workflows passing during this integration. Aircraft clearance heights also cover the expanded Marina structures. `pnpm test:fullscreen` is the new browser check; see `docs/ARMORY.md`.

**Latest armory / progression / pointer-capture pass:** Field exchange is available in the sidebar. The FPS session now also includes Utility 01 driving, Falcon 01 flight, E entry/exit, chase cameras, a landing pad and five separately equipped vehicle wraps. It includes 27 permanent items, stronger premium variants, skins, attachments, ILBV/LBS-inspired rigs and separate armor inserts. Level-gated purchasing, 50 XP levels, rank badges and timed double/triple/multi-kill callouts are connected to FPS target health and completion rewards. Optional counter-fire applies actual armor/health damage, dodge warnings and defeat. Desktop gameplay now requires successful pointer lock; Escape releases and pauses, and denied capture prevents play. Wallet/XP/inventory/loadout persist locally; no real payments or backend. See [docs/ARMORY.md](docs/ARMORY.md) for balance, architecture and sources.

Current verification: **47 tests + production build pass**. Both `pnpm test:fps` and `pnpm test:armory` passed against isolated local Chrome, including all-eight completion, XP/level-up/callouts, shop purchases/equipment/save reload, armor absorption/defeat, mouse confinement and capture-denial regression, mobile layout and mode cleanup. No uncaught browser errors or map requests. Preview/FPS screenshots were inspected; `.cache/` holds local evidence. pnpm 11 and the 14-day dependency cooldown remain intact; no dependencies were added.

**Latest local FPS integration:** Marina Bay now has a separate **Marina FPS** sidebar mode. It reuses the authored map and obstacle collision, adds two local GLB weapons, eight targets, pointer-lock/free movement, sprint/crouch/jump, automatic fire, optical aim overlay, recoil/effects, magazines/reserves, animated reload poses, switching, pause/reset and timed accuracy scoring. Touch controls and touch-device drag-look are included. Desktop pointer lock is mandatory. Files: `src/components/FpsGame.tsx`, `src/game/fps-engine.ts`, `fps-rules.ts`, `fps-raycast.ts`; six portable GLBs under `public/models/field-kit/`. Default Marina walk/drive and the old fixed-camera Target practice remain available. No live map requests, capture spending or new runtime dependencies. Keep pnpm 11.22.0 and the strict 14-day cooldown.

Verification for FPS: **26 tests and production build pass**. Local Chrome smoke passed model loading, target hits, ammo/reload with pause, switching, movement, aim, all-eight-target completion, reset, 390px layout and mode cleanup, with zero map requests and no uncaught browser exceptions. Gameplay/aim/completion screenshots were visually inspected. Actual touchscreen play and physical-device performance remain unmeasured.

FPS is an arcade range with optional target counter-fire and player/armor damage; it has no navigating enemy AI, multiplayer or skeletal hand rig. Viewmodel lenses are opaque; aiming uses a separate overlay. Ground-plane jumping does not let players vault building colliders. FPS dynamic shadows are disabled and pixel ratio is capped at 1.35 for this VM. `pnpm test` includes ammo/occlusion/layout checks; `pnpm test:fps` runs the dedicated local Chrome smoke workflow described in README. Commit/copy the public GLBs with the code; the game does not depend on the asset workshop directory or Blender.

## Newest feature: Marina adventure companion

Educational extension: `src/data/singapore-guide.ts` contains eight reviewed, source-linked fact cards and reflection prompts. `server/adventure-api.ts` adds structured `learn` intent/topic ID selection to the existing Astra endpoint; GPT-Live delegates educational questions too. The shared client validates topic IDs and session/revision before showing a card/returning its facts for speech, without calling the game mutation path. `AdventureCompanion.tsx` adds quick questions and source cards. Ask “tell me about the museum” versus “take me to the museum” to check the learning/travel distinction. Questions about Queenstown/Raffles Place work from Marina; those regions do not yet mount the companion. Keep facts curated, source links trusted and operational information (hours/prices/exhibitions) out of scope unless verified. Current unit/build baseline: 79 tests passing; no new dependencies or Maps calls.

Objective visibility was strengthened: named purple/white minimap diamond/halo and straight-line guide, plus a world-space purple beacon, ground ring and recolored active collectible. `src/game/objective-highlight.ts` owns decorative resources/material restoration; do not change collision/arrival behavior. Its selection tracks the same active ID as the HUD. 74 tests and browser regressions pass.

Read `ADVENTURE.md` before changing text/voice behavior. `pnpm server` loads private `OPENAI_API_KEY` and starts the two API endpoints on loopback 3001; `pnpm dev` proxies them. Never put the key in a VITE variable. Requested models are exactly `gpt-6-astra` and `gpt-live-1`; preserve the separate Live protocol and shared local apply logic. No new dependencies. Game geometry, routes and Google image cache/ledger are unchanged.

`adventure.ts` owns objective IDs, request/revision/session guards and deterministic closer selection; `MarinaGame.tsx` feeds position/collection and draws active HUD/minimap. Reset remounts the panel and invalidates requests. Objective changes must never mutate collected stamps or bypass existing arrival checks. `adventure-client.ts` is shared by text and voice, and only acknowledges a game-applied update. `live-voice.ts` owns microphone/WebRTC/delegation/cleanup; never run actions from transcript-gap heuristics. Origin checks are not authentication: add access control before public deployment. Browser QA commands and synthetic-audio caveats are in `ADVENTURE.md`.

Verified: **72 tests and production build pass**, live Astra text works for closer/museum/skip, and a synthetic spoken request completed real GPT-Live transcription → Astra → applied objective → spoken output. Real microphone and human listening quality remain manual checks. Per-delegation cancellation now blocks stale applies after spontaneous voice closure or newer delegation, even if fetch ignores abort. Pending transcript/reply timers fail back to text; old session cleanup cannot clear a new session’s audio. Secret scan found no OpenAI key in commit candidates or production assets. Keep test input audio streaming after the phrase (the live voice harness pads it), otherwise its media clock can stop before commentary is acknowledged.

## Latest pass: Static references and model refinement

User authorized 25 Static images per region (75 total) to improve model quality, with one refining subagent per world. Root's new `scripts/capture-static-references.mjs` uses the private Static-enabled `VITE_GOOGLE_MAPS_API_KEY`, never the browser-only demo key. Plans: `reconstruction/marina-static-quality-plan.json`, `reconstruction/raffles-static-quality-plan.json`, `reconstruction/queenstown-static-quality-plan.json`. Run `pnpm references:static --plan <path> --dry-run` first. References are original JPEGs plus individual source/camera/checksum/review manifests, retained outside public assets. Reusing stored panorama metadata avoids additional metadata calls. Regional allowance baselines/caps are in the ledger; see newest PLAN section for authority and usage rather than older figures below. Preserve independent driving-camera behavior and the current world bounds/objective counts during this quality pass.

Capture completed: all 75 images saved, no failures, zero metadata requests; all three regional allowances are exhausted. Ledger total is 105 conservative Static attempts, not 105 successful image downloads (98 image attempts plus seven metadata attempts). Cache-only reruns require no credentials/network. New image review: Marina 19 accepted/six limited, Raffles 25 accepted, Queenstown 23 accepted/two limited. Read `MARINA-EXPANSION.md`, Marina `references/static-quality-review.md`, and both other `REGION.md` documents for the image-to-model mapping. All three models now have richer structural/material detail while preserving their extents and 14/11/eight objectives. Full reference cache: 285 images. Do not reinterpret the remaining global safety cap as authorization to fetch more Static images.

Final quality-pass verification: **48 tests across 15 files, production build and all three region browser/camera/mobile checks pass**. Browser checks made zero Maps requests and had no uncaught errors. Targeted model close-ups were reviewed; all 285 reference checksums and the credential scan pass. The existing Three.js chunk-size warning is nonblocking. No dependencies changed; retain pnpm 11 and strict 14-day release age. Remaining work: human full-objective play-through, actual-phone performance, camera occlusion, NPC/traffic behavior and geographic refinement, then deployment/video. All sections below record earlier milestones; their quotas and counts are superseded by this section and the newest PLAN entry.

## Earlier scope: all three regions expanded

Completed the further large reference-and-map expansion with one modeling agent per region; browser operations remain serialized. Current worlds: Marina **726 × 616 / 14 stamps**, Raffles **580 × 399 / 11 stamps**, Queenstown **520 × 424 / eight stamps**. Latest pass added 114 screenshots; the full portable cache contains **210 images** (72 Marina, 64 Raffles, 74 Queenstown), all checksum-valid. Read the newest PLAN section and scoped region documents first. `pnpm references:inventory` is an offline checksum/review inventory; keep the cache and manifests together and preserve rejected captures. Queenstown now uses bounds-derived minimap projection and exported road paths, matching Marina/Raffles; all region HUD stamp counts must remain dynamic.

Latest capture plans: `reconstruction/marina-district-browser-plan.json`, `reconstruction/raffles-expansion-browser-plan.json`, `reconstruction/queenstown-district-browser-plan.json`. Marina/Raffles are fully cached; Queenstown saved 34/40 before stopping, so a full run without `--dry-run` would intentionally fetch missing images. Do not blindly rerun it. Earlier Queenstown plans retain original/replacement frames and their review outcomes. No new dependencies; pnpm 11 and strict two-week cooldown remain intact.

Verification at handoff: **41 tests, production build, three-region browser/camera/mobile checks and cache checksums pass**. No live Maps calls occur during game checks. Credential scan passed. The build still emits the nonblocking Three.js chunk-size warning. Remaining follow-ups are human full-objective play-through, actual-phone performance, camera collision/occlusion and geographic refinement; current agents' expansion work is complete.

## Current entry point: three regions and independent car camera

Raffles Place is integrated alongside Marina and the richer Queenstown estate. Read `reconstruction/raffles-place/REGION.md` and `reconstruction/queenstown/REGION.md` for geometry, references and review limitations. App uses location ID for default selection, so adding a location no longer changes the default via an array index. `src/game/drive-camera.ts` is the shared driving orbit helper: drag must never modify vehicle heading while in Drive. All three controllers use independent look state, reset it on travel-mode changes, and recenter only while moving after an idle delay. Preserve this behavior in new controllers. Browser smoke covers stationary/moving drag, no accidental steering, recenter/reset/mode switching in all three regions with test-only WebGL camera observation.

**Capture reliability:** serialize capture, selection AND browser smoke runs; do not switch tabs while capturing. Background Street View may report the right POV with old pixels. `capture-readiness.mjs` and the runner enforce foreground/POV/zoom/overlay/repaint checks and detect exact duplicate images; still inspect every frame. Older rejected files are retained and marked in manifests/region notes, replacements use new IDs. Transfer complete region reference directories plus plans/ledger, never environment credentials. Raffles batch: `reconstruction/raffles-browser-plan.json`; Queenstown expansion and replacement plans are in `reconstruction/`. Use `--dry-run` first; cache-only reruns make no requests. Source cache is not copied to public game assets.

## Previous milestone: two region games

**Latest allowance update:** user renewed the remaining Static allowance to **50 images**. The ledger preserves baseline 8 and all history, with `maxAdditionalImages: 65` (15 used + 50 remaining). PLAN.md is authoritative; older budget figures below are historical. README intentionally omits limits.

The user explicitly expanded work to **Marina Bay and Queenstown** and requested subagents. Marina now spans 556 × 466 game units, with outer road connections and nine collectibles. Queenstown is a separate 368 × 288-unit estate with open void decks, station/train, shops, library-inspired garden and five collectibles. Both are authored compressed interpretations. Prior Marina-only scope notes below are superseded; Tampines/Toa Payoh are still future region maps.

`App.tsx` uses `hasRegionGame`/`regionModeLabel` from `src/game/region-selection.ts` to open the corresponding `MarinaGame` or `QueenstownGame`. Queenstown owns `queenstown-scene.ts`/`queenstown-collision.ts`; Marina uses its expanded bounds/`MARINA_MAP_ROADS`. The Marina minimap is bounds-derived using `src/game/minimap.ts`; HUD stamp count is dynamic. Keyed region switching disposes the outgoing scene.

New cached references: 8 Marina browser screenshots at four new positions; 4 Queenstown screenshots at two positions. Plans: `reconstruction/marina-expansion-browser-plan.json` and `reconstruction/queenstown-browser-plan.json`. Use `pnpm marina:browser-capture --plan <plan-path> --dry-run` before any capture; complete-cache reruns use no requests. Source directories remain `reconstruction/<region>/references/`; preserve metadata/galleries/reports. Budget events now carry the correct region, browser events remain excluded from Static limits, and **35 additional Static images remain**.

Read `MARINA-EXPANSION.md` and `reconstruction/queenstown/REGION.md` for specifics, sources and limitations. `pnpm test:browser` checks both regions with local Vite/Chrome (loopback debugging port 9223 by default; `REGION_APP_ORIGIN`/`CHROME_DEBUG_ORIGIN` overrides). Tests use their own tab, do not load Google Maps, and place screenshots in `.cache/browser-checks/`. Keep checksums, secrets exclusions, pnpm11 and the strict14-day cooldown intact. No public deployment is implied.

**Newest gameplay geometry pass:** cached screenshots now inform angular museum shells/supports/lily pond, Fullerton-inspired stone arcade, roof louvers/masts/stays, entrance canopy/blue fins/bollards, finer paving/rail braces, curved shade beams, benches and planting/shade trees. `reconstruction/marina-bay/references/GAME-DETAILS.md` maps observations to changes. Code: `src/game/marina-scene.ts`; static details remain batched and ground obstacles use existing collision handling. All 20 tests/build and browser movement/reset/mobile checks pass. No capture/API spending; Static allowance remains 35. Other locations remain future work, Marina-only focus unchanged.

**Release handoff:** this milestone includes the game improvements, demo-key browser capture workflow, corrected Static-only budget accounting, batch plan, 15 cached reference JPEGs, 9 cached browser PNGs, metadata/checksums, galleries and benchmark reports. Clone/pull the repository to transfer these references; do not recapture. Private `.env`, model caches and older rejected/source captures remain excluded. The credential scan found no configured API-key values in the files prepared for commit. Remaining work: visual feedback, full collectible completion/actual-phone checks, then deployment/video; no public deployment yet.

## Most recent: batch workflow and corrected limits

**Screenshots do not consume Static API allowances**, per the user's explicit clarification. `api-budget.mjs` and usage reporting now separate them. Static: 15/50 additional images used, **35 remaining**; 23 total images + 7 metadata = 30/1000 conservative Static attempts. Browser: 9 screenshots, 5 panorama loads/changes, 4 selections, separately tracked. Historical shared-limit figures below are superseded; never reset the ledger.

`pnpm marina:browser-capture --batch --dry-run` validates the editable `reconstruction/marina-browser-plan.json` without requests. `--batch` resumes eight configured views across four reviewed centers, reusing panoramas by source, caching PNG/metadata/checksums and generating timing reports/contact sheet. Per-run screenshot bounds are operational safeguards, not Static quota. Cache mismatch stops; use a new view ID for changed camera settings. Fresh captures require local Vite + Chrome debugging; complete-cache reruns are offline. Details in `reconstruction/marina-bay/references/WORKFLOW.md`.

Measured: 8/8 screenshots in 21.826s, four panorama loads/changes, zero Static calls/failures, ~11.4 MiB. Cache rerun: 33ms, eight hits, zero browser/network. All images visually reviewed and metadata annotated; source dates span 2012/2021/2022. **20 tests + build pass**. Keep the reference folder, reports, gallery and plan together for cross-machine reuse. No new game geometry in this pass.

## Latest steering — read first

**Browser/demo-key capture now verified:** Vite explicitly maps `GOOGLE_MAPS_DEMO_API_KEY` to the existing frontend browser-key slot when set; otherwise uses `VITE_GOOGLE_MAPS_API_KEY`. This exposes only the intended browser credential, not all `.env` variables. Static scripts continue using the original key. Restart/reload on key changes; do not print keys.

Run `pnpm marina:browser-capture` for the single configured north-bay view. It uses `capture-streetview.html` served by Vite and a separate local Chrome debugging tab; blocks Static endpoints; caches a 1280×900 PNG plus metadata/checksum; leaves attribution/date intact. A fresh capture needs Vite and Chrome debug port 9223 (configurable `MARINA_APP_ORIGIN` / `CHROME_DEBUG_ORIGIN`); a cached rerun needs neither a browser nor credentials. Screenshot was visually checked with the demo key and cache rerun made zero requests. No new dependencies. Build/17 tests passed.

**Latest counters:** 36 conservative ledger entries; 23 Static images unchanged; 1 browser panorama load and 1 screenshot reservation newly recorded. Additional-image allowance **16/50 used, 34 remaining** across both capture paths. These override earlier counts below. Screenshot reservations are not Google API calls; Dynamic Street View loads may be billed independently. Cached screenshots are in the same portable reference folder.

**Latest detail pass:** colors and materials now follow reviewed references; Sands proportions use published dimensions at 0.54 landmark scale (ground layout still compressed). More detailed paving/railings/palms/planting/lights, Shoppes podium/roof, tower facades and museum pond/supports are implemented. Static box details are instanced. Current verification: **17 tests + build**, browser movement/reset/mobile smoke; full road clearance and spawn/stamp clearance are unit-tested.

**New capture authority/cache:** up to 50 additional Marina Bay images authorized; **15 used, 35 remain**. All 15 JPEGs and per-view JSON are saved in `reconstruction/marina-bay/references/`, intentionally eligible for Git/transfer (not public runtime assets). Include this folder on the next commit or cross-machine transfer so agents do not re-query it. Each frame has heading/pitch/FOV, size and SHA-256. The reference README explains actual coverage and source dates (2012, 2021, 2022).

**Updated budget:** `pnpm marina:usage` now reports **34 total attempts, 23 Static images**, 966 conservative attempts remaining. `api-usage.json.imageAllowance` enforces a separate 50-image cap from baseline 8, including the first three previews. This supersedes the older 13-attempt figures below; never reset either counter. `pnpm marina:references` and `pnpm marina:references --surroundings` reuse the complete cache with zero requests, but may fetch missing files—transfer the cache first. No key is needed to play the game.

The user clarified: **3D game rendering of Marina Bay in Joyride's low-poly art style**, not photographs or depth-warped imagery. The active default is now `src/components/MarinaGame.tsx`, using authored solid geometry in `src/game/marina-scene.ts`. Saved photos informed waterfront details, but the map is compressed and authored, **not automatically reconstructed or surveyed**.

**Confirmed scope:** eventually apply this location-specific walkable/drivable 3D treatment to **all locations**, including Tampines, Toa Payoh and Queenstown. **Marina Bay is the only current implementation focus.** Establish and validate the approach there before expanding; existing generic Joyride presets do not count as completed location maps.

Current game: modeled Sands/SkyPark, lotus-like museum, Helix crossing, city skyline, palm promenade, bay road loop, visible mint car, walk/run/drive, obstacle collisions, five collectible stamps, minimap and reset. `src/game/marina-collision.ts` provides subdivided AABB collision and wall sliding. The historical `MarinaWorld.tsx` depth viewer is unmounted; assets/pipeline remain for reference. Do not restore it as the default.

Validation: production build and **14 tests pass**. Local browser smoke checks passed rendering, walk/drive movement, reset, mobile width, no uncaught errors and zero live Static requests; walk/drive screenshots inspected. Full five-stamp completion, full road-lap verification, actual-phone performance and portable end-to-end tests remain open. A non-blocking Three.js chunk-size warning remains.

Controls: click canvas; WASD walks, drag looks, Shift runs. Drive gives a chase camera and visible car; W/S throttle/reverse, A/D steer, Space brakes. Switching modes preserves location. Reset clears stamps and distance. Movement is flat-ground arcade handling, with water/building obstacles but no gravity, slopes, suspension or camera collision. Distances are game-scale estimates.

No new API or image-generation calls were made for this pass; ledger stays **13 attempts (8 images)**. No key, capture, model inference or saved photo asset is needed to play the new game. Keep pnpm 11.22.0 and strict 14-day cooldown. Never reset the capture ledger or print/commit environment secrets.

Next: get visual feedback; refine landmark proportions/reference fidelity; validate all stamps and the road loop; improve camera/vehicle/accessibility; then expand other locations only after Marina is accepted. See the top of `PLAN.md`. No public deployment or video yet.

Portable setup remains `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm build`, `pnpm marina:usage`, `pnpm dev`, using Node 22.12+ and pnpm 11.22.0. If absent, bootstrap with `npx --yes pnpm@11.22.0`. Never copy the original machine's absolute cache paths or process IDs. The repository's initial published milestone is `a8a6eba`; inspect checkout status for subsequent work.

## Historical handoff below

The remaining sections preserve prior implementation history and detailed setup. Statements describing the depth viewer as the current/default scene, no collisions, 11 tests, or improving depth as the highest priority are historical and superseded by the section above. Setup, secret handling and budget constraints still apply.

## Product context (previous depth milestone)

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

Historical scaffold state was in React/in-memory refs. The current app adds the local armory save and FPS/collision described above; there is still no database, authentication, backend or multiplayer. External services are Google Maps and Google Fonts, plus a model-weight download for the local reconstruction build. Authorized captures and derived scene assets now exist. The browser loads only generated assets in Marina 3D; the model runs offline at build time. See the reconstruction README for limitations.

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
