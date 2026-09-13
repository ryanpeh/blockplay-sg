# Blockplay project plan

Last updated: 2026-09-13 (Singapore time).

## Current milestone: expanded Marina and first Queenstown region

The user requested parallel subagents for both regions, then authorized further delegation. Marina modeling and new viewpoint capture ran in parallel with Queenstown construction; shared capture/ledger operations were serialized. This explicitly expands the earlier Marina-only implementation focus to include Queenstown.

**Current Static allowance: 50 further Marina Bay images**, renewed by the user after this expansion. All 23 image attempts and 7 metadata attempts remain recorded; the conservative total remains 30/1000. The ledger keeps baseline 8 and raises total additional authorization to 65 (15 already used + 50 remaining), without resetting history. Browser screenshots do not consume this allowance. Older allowance figures below are historical; README intentionally omits limits.

- Marina bounds expanded from 396 × 316 to **556 × 466** game units (2.07× area), with inner/outer road loops, three connectors, four added districts and nine stamps. Minimap projects from current bounds and shared road paths; stamp HUD is dynamic. See `MARINA-EXPANSION.md` for scoped detail/reference notes.
- Queenstown has a **distinct 368 × 288-unit** authored estate, open void decks, covered paths, elevated station/train, shops, court and library-inspired garden; five stamps. Region selection opens its own component, rather than a palette variant. See `reconstruction/queenstown/REGION.md`.
- Captured **8 new Marina + 4 Queenstown browser screenshots** across 4 + 2 selected positions. They are cached with source identity, camera settings, attribution/date, checksums, galleries and run reports. No Static API requests. Ledger events identify their region. Two indoor Marina frames were rejected; one Queenstown frame is occluded/limited.
- Browser smoke script included as source (`scripts/smoke-regions.mjs`, `pnpm test:browser`): both regions render, walk/drive/reset, switch and fit a 390px viewport with zero Maps/Street View requests or uncaught errors. Unit coverage includes region selection, minimap projection, both road loops/connectors, bounds and reachability of every stamp. Final verification: **29 tests passed, production build passed, browser checks passed**; nonblocking Three.js chunk-size warning remains. Credential scan and whitespace checks passed. Marina aerial/greenway and Queenstown station renders were visually reviewed.

Next: user review of both region styles/layouts, more geographically coherent reference-informed geometry, actual-phone performance and a complete human-played objective run, then deployment/video. These remain compressed game maps, not automatic photogrammetry or measured navigation tools. Older Marina-only priorities/counts below are historical.

## Latest game improvement from cached screenshots

Release contents: commit/push the refined game together with the portable capture workflow, corrected budget ledger, cached reference assets, metadata, galleries and performance reports. Private environment keys and inference caches stay excluded. Pre-commit credential scan passed; no new capture calls were needed for the game refinement. The current work remains Marina Bay first, with other location-specific maps planned after this approach is accepted.

Used the cached browser references to improve actual game geometry: angular museum shells/supports/pond detail; Fullerton-inspired stone arcade; Shoppes roof louvers/masts/stays; entrance canopy/blue fins/bollards; finer granite paving, inclined railing braces, bench details, curved shade frames and denser planting/shade trees. See `reconstruction/marina-bay/references/GAME-DETAILS.md` for image-to-feature mapping and limitations. No new source images, API calls or dependencies. Repeated box details remain instanced; road loop, spawn and collectible positions remain clear. **20 tests + build and browser walk/drive/reset/mobile checks pass.** Geography is still a compressed authored map, not a surveyed reconstruction. Prior notes saying no game geometry changed apply only to the earlier capture workflow pass.

## Latest workflow and budget correction

The user clarified that screenshots **do not count against Static API limits**. Implemented this for both the 50-additional-image allowance and the 1,000-Static-attempt cap, preserving all historical ledger entries. Current Static allowance: **15/50 used, 35 remaining**. Static attempts: 23 images + 7 metadata = 30/1000 (970 remaining, metadata conservatively included). Browser events are separate: 9 screenshots, 5 panorama loads/changes, 4 selections; 48 total ledger events are not 48 Static calls. Any older shared-allowance figures below are superseded.

Completed the editable browser batch workflow (`reconstruction/marina-browser-plan.json`, `pnpm marina:browser-capture --batch`, `--dry-run`): grouped panorama reuse, per-run bounds, preflight cache validation, no silent overwrites/retries, Static endpoint blocking, PNG/metadata/checksum cache, timing reports and local review gallery. Tested **8 captures / 4 panorama loads / 0 failures / 0 Static calls in 21.826s**, ~11.4 MiB output. Cache-only rerun: **8 hits in 33ms**, no browser/network. All eight images reviewed; detailed reference views are useful, but dates/occlusions prevent claims of calibrated reconstruction. **20 tests and build pass**. See `reconstruction/marina-bay/references/WORKFLOW.md` for commands, reports, limitations and next steps. No game geometry changed in this workflow pass.

## Current milestone: modeled Marina game

### Latest color/detail and sizing pass

**Subsequent browser-capture pass:** `GOOGLE_MAPS_DEMO_API_KEY` now takes precedence for the live browser viewer via an explicit Vite mapping; Static scripts retain the original `VITE_GOOGLE_MAPS_API_KEY`. Added `pnpm marina:browser-capture` with a dedicated capture page, separate Chrome tab, Static endpoint blocking, demo-key verification without exposing its value, readiness checks and a cached PNG/manifest. One 1280×900 screenshot was visually accepted; attribution/date retained, no development warning. Rerun used zero network calls. Build and 17 tests passed, including shared allowance enforcement across Static images and browser screenshots. No game geometry changed in this capture-only pass.

Current totals supersede the figures below: **36 ledger entries = 23 Static images + 7 Static metadata + 4 Maps JS selections + 1 browser panorama load + 1 screenshot reservation**. **16/50 new images used; 34 remain.** Browser rendering has separate billing; screenshots are local operations recorded conservatively, not additional Google API calls. The 1,000-entry local cap remains (964 left).

- User authorized up to **50 additional Marina Bay images**, cached for reuse. Captured **15**, leaving **35**; stored with panorama metadata/frame settings/checksums in `reconstruction/marina-bay/references/`, now eligible for version control and cross-machine transfer. Original source/rejected-image folders remain ignored.
- The live ledger now records **34 attempts = 23 Static images + 7 Static metadata + 4 Maps JavaScript selections**, leaving 966 under the original conservative cap. These figures supersede historical counts below. A separate persisted 50-image allowance (baseline 8) is enforced before every new image request. No further captures are needed to play.
- Replaced the beige/green wash with gray granite, blue-gray glazing, deeper water, silver railings and greener planting. Added slab variation, wood waterfront edge, finer railings, bent palm fronds, lights, bins, crosswalks, planters, Shoppes podium/roof ribs, museum pond/supports, finer tower facades and roof equipment.
- Refined Sands proportions using published 340 × 38m SkyPark dimensions and 200m elevation at a consistent 0.54 landmark scale. Ground geography remains compressed; this is not a metric reconstruction. Source links/observations are in the reference README.
- Static box details are instanced to reduce draw calls; camera starts farther back at a 1.75-unit eye height for a clearer landmark view.
- **17 tests and production build pass**. New tests check the additional-image cap, full road-loop clearance, spawn/stamp clearance, landmark proportions and detail batching. Browser walk/drive/reset/mobile checks passed with no uncaught errors or live Static requests. Both reference commands were rerun against the complete cache with zero additional requests. Full five-stamp gameplay completion and actual-phone performance remain open.

### Prior modeled milestone

The latest user clarification requests **Joyride-style low-poly 3D game art**, not photographs or stretched photo-depth meshes. The default scene now uses authored solid geometry informed by saved waterfront images. Geography and scale are deliberately compressed; this is not automatic or surveyed reconstruction.

**Confirmed rollout scope:** this same location-specific, walkable/drivable 3D treatment is eventually required for **all locations: Marina Bay, Tampines, Toa Payoh and Queenstown**, and should extend to future destinations. **Work only on Marina Bay for now** to establish and validate the approach. The other locations are planned deliverables, not optional palette variants or completed reconstructions.

Completed in this pass:

- Modeled Marina Bay Sands/SkyPark, lotus-like ArtScience Museum, stylized Helix crossing, city skyline, water/bumboat, palm promenade, railing, benches and shade pavilion.
- Continuous road loop; first-person walking/running; third-person arcade driving with a visible car; drag-to-look and touch movement.
- Ground-plane obstacle collisions and wall sliding, map bounds, five collectible stamps, minimap/progress, and reset. The old 4-unit exploration limit no longer applies.
- `MarinaGame.tsx` is the active component; `marina-scene.ts` authors geometry and `marina-collision.ts` handles movement. Historical `MarinaWorld.tsx` and depth assets are retained but unmounted.
- No new dependencies, capture requests, or image-generation calls. Ledger unchanged at **13 attempts**, including 8 Static images. Preserve pnpm 11 and strict 14-day release age.
- Updated README, portable handoff and in-app descriptions to distinguish authored art from photo reconstruction.

Verification: production build and **14 tests passed**, including 3 new collision tests for water/high-speed movement, wall sliding and map limits. Browser checks passed rendering, walk/drive translation, reset, 390px width, no uncaught errors and zero live Static image requests. Desktop walk/drive screenshots inspected. Three.js has a non-blocking bundle-size warning. Full five-stamp completion and a full road lap are not yet browser-tested.

## Current next steps (supersedes historical roadmap below)

1. Get the user's visual feedback on the modeled direction; refine landmark proportions, framing and resemblance to the saved references. Keep observed details distinct from invented/compressed layout.
2. Validate all five stamps and a full road lap; add portable browser integration tests. Improve camera collision, vehicle steering/wheel animation, touch camera controls and accessibility. Current motion is flat-plane arcade movement, without gravity, slopes, interiors, traffic or suspension.
3. If tighter location matching is wanted, derive a reviewed structured scene layout from source references. Do not silently increase capture volume. No recapture or inference is needed to run this game.
4. After Marina is accepted, reuse its controls/rendering/collision approach to author distinct reference-informed maps for **Tampines, Toa Payoh and Queenstown**. Each must have recognizable local layout/details and continuous walking/driving in the same low-poly style. Their generic Joyride layouts currently vary color/height rather than real geography and do not complete this rollout. Choose the next location after Marina; do not begin parallel location builds now. Combat/NS equipment remains later work.
5. Add an optional server-side Astra mission feature using event-provided access, then deploy, test on an actual phone and record the 90-second video. No runtime model integration or public deployment exists yet.

## Historical implementation and roadmap

The sections below preserve what was previously done/tried/planned. References to the depth scene as current/default, its 4-unit limit, 11 tests, or photogrammetry as the next priority describe the **previous milestone**, not the active game. The latest steering above supersedes that roadmap. The depth attempt worked technically but did not match the requested art style.

### Previous handoff milestone

The Marina Bay **small-area prototype is ready for review**. Generated geometry/textures are included in the repository, so a new machine can run `pnpm install --frozen-lockfile && pnpm dev` without a Maps key or another capture. Production build and 11 unit tests pass; real-browser checks covered rendering, walking/driving, reset, mobile width, and zero live Static API calls. No public deployment or submission video has been produced.

Known limits at handoff: February 2012 imagery; approximate relative depth and scale; a 4-unit exploration radius; visible stretching; no full-district geometry, true collision mesh, or vehicle physics. Preserve the 13-attempt capture ledger and reuse the existing assets before spending more image quota.

## Goal and event deliverables

Make Singapore playable beyond the usual tourist landmarks: HDB estates, everyday streets, and eventually schools and other familiar places. The original concepts were neighborhood driving and an NS-inspired first-person game.

**User clarification, 2026-09-13:** The required experience is a real 3D environment reconstructed from street-level images, with continuous walking and driving. A Street View viewer, panorama hopping, or a generic procedural estate does not satisfy this requirement. GPT-Image-2.5 may be used if useful, but generated pictures alone are not the deliverable. The existing viewer and procedural game are reusable scaffolding, not completion of the core task.

The hackathon allows pairs five hours of building with Astra. Submission: a deployed working prototype and a 90-second video explaining the experience and how Astra helped. Aim to submit by 3:30 pm. The event brief mentions several possible award categories; none is a confirmed project requirement.

## Current implementation

### Marina Bay implementation in progress (latest steering)

- User confirmed permission to reconstruct the source imagery and narrowed the first build to **Marina Bay**. Do not ask for that permission again.
- Added an offline capture/depth-mesh pipeline and a Marina 3D viewer with continuous walking/driving, mouse look, touch controls, reset, and a small exploration boundary.
- This first experiment estimates depth independently from four directional images at one capture point; it is not multi-view reconstruction or a full district. Flat-ground/scale assumptions and visual defects require explicit validation.
- Added a persistent **1,000-attempt capture budget** in `reconstruction/api-usage.json`. Current count: **13 attempts = 8 Static images + 4 Static metadata lookups + 1 Maps JavaScript selection**. Metadata does not consume Google's image quota, but is counted conservatively here. Cached reruns use no further requests.
- The user updated `.env` again and source access succeeded. First coordinate lookup returned indoor contributed imagery; its four images were preserved but rejected. A Google-only panorama selection found a waterfront capture from **February 2012**, reviewed before downloading the remaining directions.
- Real assets now exist in `public/reconstruction/marina-bay/`: four JPEG textures, four stitched depth meshes, and a provenance/limitations manifest. The app defaults to this scene. It runs without live Maps calls.
- Local depth inference, production build, **11 tests**, and browser checks passed. Walking/driving translate continuously; reset and mobile layout work. Screenshots confirm visible geometry/parallax and reveal expected image stretching. This is a bounded proof of concept, not a full district or measured geometry.
- See `reconstruction/README.md` for the pipeline, cost policy, limitations, and resume steps.

### Existing scaffold

- [x] React 19, TypeScript, Vite, and Three.js application with a responsive interface.
- [x] pnpm **11.22.0** pinned in `package.json`; pnpm 11 engine requirement.
- [x] Strict two-week dependency cooldown: `minimumReleaseAge: 20160`, `minimumReleaseAgeStrict: true`, no exemptions, in `pnpm-workspace.yaml`.
- [x] Generated `pnpm-lock.yaml`. Build-script permissions now also allow onnxruntime-node and sharp for local depth inference; protobufjs scripts are explicitly disabled.
- [x] Four destinations: Tampines, Toa Payoh, Queenstown, Marina Bay.
- [x] Original procedural 3D estate: facades, block numbers, trees, road, sidewalks, shelter, street lights.
- [x] Joyride: 240 m course, three checkpoints, steering, acceleration, braking, touch buttons, pause/resume/reset, completion timer.
- [x] Arcade target practice: five clickable targets, hit count, completion timer. This is a fixed-camera prototype, not a complete FPS.
- [x] Google Maps JavaScript Street View integration with browser key configuration.
- [x] Real imagery becomes the initial experience when a nonempty Maps key is configured. Otherwise Joyride starts first.
- [x] Three outdoor panorama search points per destination, for 12 starting viewpoints. Search radius is 200 m; exact photographs are chosen by Google.
- [x] Look left/right, step forward/backward along connected panorama links, and recenter. These steps are transitions between photographs, not continuous driving.
- [x] Google-provided street description, imagery-date control, navigation controls, fullscreen, and attribution retained in the official viewer.
- [x] Missing-key, network timeout, lookup failure, and authorization guidance; retry and cancellation on location/viewpoint changes.
- [x] Setup/deployment README and portable agent handoff.

## What we tried and learned

1. **Original no-key scene.** A procedural Three.js world gave us immediate gameplay and a fallback before Maps credentials existed. Its layout is fictional; palette and height variations are not real reconstructions of the four destinations.
2. **Initial Street View viewer.** One coordinate and a 500 m nearest-panorama search per location worked as an integration scaffold but was hidden behind the mode picker and offered limited starting views.
3. **Realism pass.** Made Street View the configured default, added three starting points per location, narrowed the search to 200 m, and added controls that follow actual connected panoramas. All 12 points returned/rendered panorama content during local browser checks. A subsequent screenshot exposed Google's configuration warning and development watermark, so rendering alone is not a clean Maps acceptance pass. Viewpoint labels are broad exploration labels, not verified landmark names; exact framing still merits human curation.
4. **360 imagery versus 3D geometry.** The original viewer supplied photographs rather than gameplay geometry. After the user confirmed source permission, a separate depth-estimation pipeline generated a small mesh experiment. Larger, location-faithful geometry and real collision still require more work.
5. **Package tooling.** Initial npm installation was interrupted before completion. Switched to pnpm 11 as requested, enabled the 14-day cooldown, and installed successfully. No npm lockfile is used. npm/npx was only used to bootstrap the pinned pnpm executable because pnpm was absent on the first machine.
6. **Validation fixes.** Corrected JSX markup and Google loader Promise typing during the first build; accounted for nullable Google panorama links during the realism pass.
7. **Local environment.** The first machine needed sandbox approval for dependency downloads, localhost listeners, and headless browser checks. These are environment permissions, not application requirements or portable configuration.
8. **Direction corrected by the user.** Improving the panorama explorer misunderstood the requested realism. Work shifted to the implemented Marina depth meshes and continuous movement. GPT-Image was not needed for this first experiment; source appearance was preserved rather than regenerated.
9. **Capture and model lessons.** Static metadata is not a reliable outdoor filter; inspect a preview and use a Google-only panorama selection. An interrupted model download produced a partial ONNX file; preserving that file and redownloading fixed inference. Persisting the selected panorama and generated assets makes subsequent runs inexpensive and portable.

## Verification recorded

- Initial scaffold: production build and three physics tests passed.
- Initial browser check: WebGL rendered; keyboard acceleration, pause/reset, five target hits, location switching, and missing-key instructions worked; mobile had no horizontal overflow; no uncaught browser exceptions in that check.
- Realism pass: six unit tests cover driving and directional panorama-link selection, including heading wraparound, reverse travel, and missing/dead-end links.
- Realism pass: production build and all six unit tests passed. All 12 starting viewpoints rendered panorama content; mobile width check passed. Look-right changed camera heading, forward changed the actual panorama ID, and recenter reloaded the starting view.
- **Historical live-viewer issue:** before the final key update, Google showed a configuration dialog/development watermark. The latest key successfully captured valid Static images. Marina 3D uses those local assets and was visually checked; the separate live viewer should be rechecked independently if used in the final demo. The agent did not modify Cloud configuration.
- This is local verification, not proof of availability under another key, origin, network, or future Google imagery updates. No public deployment has been created.

## Next work, in order

### 1. Establish a reconstruction input and prove one small scene

- [x] User confirmed source permission. Scope is Marina Bay first; do not repeat the rights question.
- [x] Capture the approved Marina waterfront panorama, build depth geometry, and visually validate walking/driving. The four-image experiment is implemented; do not expand capture volume automatically.
- [ ] For a larger reconstructed street segment, record source provenance, image projection/calibration, translated capture positions, and scale references. Do not default to Tampines; the user selected Marina Bay.
- [ ] For 360° inputs, use a reconstruction workflow with panorama/rig support or correctly calibrated perspective crops. Rotations/crops from one camera center do not provide new translational observations.
- [ ] Evaluate structure-from-motion plus multi-view reconstruction (for example COLMAP) on the real input set. Estimate camera poses and geometry; inspect alignment and holes before promising usable results. Dense reconstruction may need a GPU worker depending on the chosen implementation.
- [ ] Export a textured, simplified mesh as GLB for the existing Three.js frontend. A Gaussian-splat visual layer is an alternative experiment, but still requires separate collision geometry for gameplay.
- [ ] Use image generation only where helpful for appearance/texture completion on authorized inputs. Keep generated detail distinct from measured geometry; do not rely on independently generated views as geometrically consistent reconstruction observations.

Acceptance: move sideways and forward with genuine parallax; view the same building from several positions; remain on a continuous ground surface. A textured sphere, slideshow, or panorama transition is not acceptance.

### 2. Make the reconstructed scene walkable and drivable

- [ ] Define a scene manifest: location ID, visual asset URL, collision asset URL, units/meters, up axis, origin, player/car spawn transforms, bounds, and source attribution.
- [ ] Load the reconstructed mesh and simplified collision mesh; keep visual detail independent of collision complexity.
- [ ] Add a first-person controller with mouse look, WASD translation, gravity, ground checks, and collision. The existing target-practice camera is fixed and must be extended.
- [ ] Add a vehicle controller on the same surface, with steering and collision; the existing Joyride moves a camera down a straight fictional road.
- [ ] Make walk/drive switch within the same scene while preserving location. Validate scale, slopes, curbs, and boundaries.
- [ ] Once one scene is accepted, repeat the pipeline for Toa Payoh, Queenstown, and Marina Bay; add level-of-detail and loading budgets as needed.
- [ ] Treat combat/NS equipment as a later layer after movement through the reconstructed environment works.

Google Photorealistic 3D Tiles could be evaluated as a separately authorized alternative for already-built 3D geography. It is not our reconstruction from Street View images and must not silently replace the user's requested pipeline.

### 3. Add a compelling Astra feature

- [ ] Add a server-side mission director that returns validated, structured objectives from a fixed set of supported locations/actions.
- [ ] Use model IDs and API access supplied by the event. No runtime Astra/Agents API endpoint or undocumented model identifier is assumed in this scaffold.
- [ ] Keep secret model API keys on the server; never in `VITE_*` variables.
- [ ] Record concrete examples of Astra-assisted engineering for the submission video.

### 4. Finish and submit

- [ ] Deploy an accepted reconstructed scene, configure asset hosting, and verify on the deployment.
- [ ] If retaining the Google viewer as an auxiliary mode, resolve its visible configuration warning. This does not unblock reconstruction input rights or provide geometry.
- [ ] Improve dialog keyboard focus behavior and audit contrast/touch targets.
- [ ] Add repeatable browser integration tests with an SDK mock, then a small optional live smoke check. Current live checks were temporary local scripts, not committed infrastructure.
- [ ] Review map load costs, error recovery, and WebGL performance on an actual phone.
- [ ] Record the video and submit the deployed URL before the event deadline.

## Reference decisions

- [Street View guide](https://developers.google.com/maps/documentation/javascript/streetview)
- [Panorama API reference](https://developers.google.com/maps/documentation/javascript/reference/street-view)
- [Maps policies and attribution](https://developers.google.com/maps/documentation/javascript/policies)
- [Maps terms](https://cloud.google.com/maps-platform/terms)
- [pnpm settings](https://pnpm.io/settings)
- [COLMAP reconstruction workflow and capture guidance](https://colmap.github.io/tutorial.html)
- [COLMAP panorama example](https://github.com/colmap/colmap/blob/main/python/examples/panorama_sfm.py)

Keep this file factual: separate completed work, attempted work, and planned work. Update the verification section after changes.
