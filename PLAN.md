# Blockplay project plan

Last updated: 2026-09-13 (Singapore time).

## Handoff milestone

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
