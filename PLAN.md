## Completed capture and implementation: documented Raffles visual refinement (13 September evening)

User authorized 25 additional Raffles Place Static API image attempts after documentation commit `19ba0c7`. Use cached panorama metadata, preserve ledger history, and record observed image features, a targeted scene change, before/after renders and validation. This adds 25 to the aggregate and Raffles allowances only; failures count and no automatic retries are authorized. All 25 images were captured and directly reviewed (23 accepted, two limited), with zero failures and zero metadata requests. The additional allowance is now exhausted; total Static attempts are 130/1000. One quay facade now has two white window bands, green trim and vents, a sloped scalloped red canopy and low front parapet. See `docs/raffles-refinement.md` for observations, source hashes, before/after renders and validation. Earlier exhausted-allowance statements below describe previous batches.

# Blockplay project plan

## Completed: recorded Encik voice pack (2026-09-13)

- User chose round 4 candidate 3 after four small auditions, then approved all 48 callouts. Bundled MP3s preserve the subtitle script and need no runtime TTS key.
- Shared FPS playback supports human/AI events, priority interruption, mute/pause/reset cancellation and an eight-clip decoded cache. Comms/captions remain when audio is off.
- All 48 files decoded and checked; 220 app tests, nine generation checks, production build and isolated browser playback/mute/pause verification pass.
- Batch used 776 credits; account total 1,266/40,000. See [voice pack](docs/ENCIK-VOICE.md) for review, generation and recovery.

## Completed: trackpad aim toggle (2026-09-13)

- Q toggles human aim; key repeat is ignored. RMB hold remains available. Shared HUD/control guides document both.
- The human aim toggle is ignored during AI play. Existing direct AI aim commands are unchanged.
- Build and 14 focused tests pass. Browser regression verifies scoped left-click firing after releasing Q, aim reset transitions, and all eight AI targets after attempted human toggles.

## Completed: Encik callouts and comms history (2026-09-13)

- 48 local Encik lines; human and AI action events share cooldowns, priority, subtitles and optional installed-voice speech.
- Shared 100-entry speech/kill/system history, filters, expansion, scroll retention and district carry. Voice mute preserves text.
- Fixed the reproduced ADS target-switch loop with transition hold and temporary hip-fire reacquisition. Browser radio regression completes all eight targets after pause/resume, checks muted speech history and filters, and verifies mobile width.
- 213 unit tests and production build pass. Browser checks also verified local voice invocation/mute, fullscreen bounds and district history carry. No dependencies or API keys added.

## Completed: player AI pilot and strategy plugins (2026-09-13)

- Added Watch AI play / Take control / Stop AI in FPS and expeditions, with shared human action functions and restricted visible-contact/HUD observations.
- Local controller handles combat, reloads, supply collection and planned district travel. Stabilized ADS after reproducing repeated scope toggling at four targets; the browser then cleared all eight targets.
- Optional LLM goal selection uses a server-only Responses endpoint, constrained goals/known waypoints, cancellation, stale-plan rejection and local fallback. Local play requires no key.
- Verified 207 unit tests, production build, eight-target browser completion, pause/takeover, live LLM endpoint and UI selection, and autonomous seeded pickup/checkpoint travel with control resuming in CBD. Screenshots are in `.cache/fps-handling/` and `.cache/fps-pilot-expedition/`.
- Navigation uses waypoint steering and bump recovery, not full pathfinding. Existing squad NPCs retain their prior role system; persistent NPC lives remain future work. Setup and plugin contracts: `docs/AI-PILOT.md`.

## Completed: prevent unlocked FPS mouse play (2026-09-13)

- Removed the media-query shortcut that allowed mouse play without pointer lock on devices reporting a coarse primary pointer.
- Actual touch/pen input retains drag-look; mouse/unknown input requires native capture. Touch-to-mouse handoff pauses for a new gesture, and entry/frame guards catch missing capture even if the browser event is delayed.
- Visible MOUSE LOCKED / TOUCH LOOK status in practice, arena and expedition HUDs.
- 168 tests pass. Browser regression covers coarse pointer reporting with real mouse capture, denial, touch drag, mouse handoff, suppressed lock-loss notification and multiple revolutions; expedition/fullscreen/mobile passes. Physical UTM input still requires user verification.

## Completed: local minimaps for FPS (2026-09-13)

- One SVG component for FPS practice, expeditions and LAN, using each district's existing roads/bounds and the projection shared with regional driving.
- Local 180m map window, north-up view-direction arrow, 25m scale; remaining targets and parked vehicles in practice; loot/checkpoints/planned exits in expeditions. Off-map exits remain indicated at the map edge. LAN hides opponents.
- Position and markers use the existing HUD update cadence; no extra WebGL renderer, dependency or live map request.
- 167 unit tests and production build pass. Browser checks verify continuous turns/position, target disappearance, expedition markers/fullscreen and mobile layout. The full FPS drill, car driving and helicopter takeoff/cruise/landing checks pass; mobile minimap screenshots were visually reviewed. Two-browser LAN gameplay passes with both clients showing their own marker and zero opponent/practice markers. Regional map rendering remains unchanged.

## Completed: upstream locator and expedition integration (2026-09-13)

- Rebased LAN multiplayer, role bots, loot, connected districts and pointer fixes onto `dbeb858`, preserving upstream's companion, locator and simplified navigation. Armory remains accessible from the FPS menu.
- Connected the Singapore locator to actual expedition arrivals. Map/card selections preview graph-derived routes and destination threat/loot; they do not unload the current district. New expeditions start in the selected district.
- Kept checkpoint proximity validation and one-scene rendering. Health/armor/ammo/loadout and collected supplies still carry across travel.
- Compared regional Walk/Drive and FPS features in [docs/FEATURE-PARITY.md](docs/FEATURE-PARITY.md). Local minimaps exist in the regional views only; the new locator is district-level navigation. The following pass added a shared FPS minimap, described above.
- Verification: 163 tests and production build pass. Browser expedition checks cover route selection, keyboard map access, selected-district starts, session preservation, capture/fullscreen/mobile and cleanup; the engine travel check passes all four links with loot/vitals persistence. Upstream three-region walk/drive/map/mobile checks and two-browser LAN gameplay also pass. LAN smoke observes death/respawn DOM transitions so slow VM polling cannot miss them, and waits for Chrome exit before removing test profiles.

## Completed: integrated rebase and immersive screen mode

- Preserved the upstream three-region expansion and model refinement through `2f27af2`, resolving the handoff/scene conflicts and restoring the fullscreen autostash.
- Added F/button fullscreen for the same FPS and vehicle session, native-request fallback, Escape pause/release, screen-mode cleanup and a dedicated browser smoke script.
- Combined checkout: 75 unit tests and production build pass. Native fullscreen, car continuity, denied-request fallback, Escape and page-scroll restoration passed in local Chrome.


## Completed: armory, XP and arcade FPS feedback (2026-09-13)

- [x] 27-item permanent shop, stat comparisons, 3D previews, demo credit/token wallet and saved inventory.
- [x] Stronger premium weapon variants, cosmetic finishes, per-weapon attachment slots and actual FPS stat application.
- [x] ILBV/LBS-inspired rig slot plus separate soft/ceramic inserts, reserve/mobility tradeoffs and optional counter-fire damage/defeat.
- [x] Level 1–50 progression, purchase unlock gates, per-elimination XP and completion rewards without replaying awards on rerender.
- [x] Three-second elimination chains with Double Kill through Rampage banners, stingers and available local voice announcements.
- [x] Integrate the car and flyable helicopter into the FPS session, with chase cameras, collision/landing checks, safe dismounts and five shop wraps.
- [x] Fix desktop pointer escape: start only on successful capture, Escape pauses/releases, failed capture leaves play stopped.
- [x] 47 tests and production build; isolated Chrome shop/FPS flows, saves, armor, rewards, pointer capture, mobile layout and cleanup checked. Zero map requests; no added dependencies.

Details, limitations and reference links: [docs/ARMORY.md](docs/ARMORY.md). Demo currency is local only; real payments and multiplayer authority are outside this implementation.


Last updated: 2026-09-13 (Singapore time).

Educational rollout: Raffles Place and Queenstown now have their own text/voice guide panels. Two regional subagents researched six cards each; all 19 regional stops are covered, bringing the shared catalog to 18 topics. A read-only bridge preserves local movement, stamps and completion. Only Marina has changeable active objectives. Reset/region-switch cancellation, sourced cards, live regional text answers and mobile layout are checked; future work remains human microphone/listening tests and broader learning activities rather than unsourced free-form facts.

Latest user override: companion text interpretation now uses GPT-5.6 Luna (`gpt-5.6-luna`), including transcripts delegated from voice. GPT-Live-1 speech is unchanged. Earlier references to Astra as the runtime interpreter are historical; Astra was used for building.

Location picker cleanup: only the developed Marina Bay, Raffles Place and Queenstown worlds remain; removed the undeveloped Tampines and Toa Payoh presets. A lightweight Singapore locator highlights the active region, with a central-area inset for the closely spaced downtown locations. This is approximate orientation, not navigation or surveyed geography, and makes no Maps requests.

## Current feature: Change the adventure

Educational companion added: eight source-linked learning topics cover Marina Bay water infrastructure, ArtScience Museum, SkyPark, Gardens by the Bay, Esplanade, Singapore Flyer, Raffles Place and Queenstown. From the Marina companion, ask about this stop, nearby places, highlights or a named topic by text or voice. Astra selects only a curated topic ID; the application supplies verified facts and a reflection prompt, not generated historical claims. Learning never applies an objective change or clears stamps. Unknown facts/current prices and hours receive an explicit knowledge-limit response. The world is labelled as a stylised interpretation of real places. 79 unit tests and production build pass. Future: extend the companion integration to the other playable regions, broaden reviewed learning cards, add multilingual narration and verify educational voice interaction with a human microphone.

Objective visibility follow-up complete: larger white-rimmed purple minimap diamond, halo, name and straight-line guide; matching 3D light column, floating pointer, ground ring and purple active collectible. Decorations track objective changes and hide on collection, without changing collisions or arrival. Material restoration/resource cleanup tests added. **74 tests, production build and companion/three-region browser checks pass**; mobile minimap and museum-beacon renders visually reviewed.

Implemented Marina-only typed/voice objective changes using existing collectible IDs and collision/arrival logic. A default Waterfront objective, named/closer/skip requests, purple minimap highlight, compact companion UI and collected-stamp preservation are in place. Rendering and completion remain local. Astra proposes structured IDs through a private server endpoint; GPT-Live-1 uses its documented WebRTC/client-delegation session API, not a substitute voice model. Request/session/revision guards reject old responses after newer requests, reset, collection or region switching. Closer uses straight-line game-coordinate distance, not route finding.

Setup, module boundaries, test commands and deployment safeguards: `ADVENTURE.md`. No new packages; pnpm 11/two-week release age preserved. The user supplied `OPENAI_API_KEY` in private `.env`; both model access checks succeeded, and live Astra typed closer/museum/skip browser checks changed the HUD/minimap. Failure/race/denied-microphone checks passed with mocked transport. Final code: **72 tests and production build pass**. Live synthetic speech completed GPT-Live transcription, Astra selection, applied City skyline objective and GPT-Live spoken confirmation with non-silent output after playback approval. A real microphone/human listening-quality check is still needed. Initial synthetic tests stopped their audio clock; padding the input fixed the harness, with no voice-model substitution. No Google captures or allowance changes.

The adventure feature also passed the final companion browser suite and existing three-region walk/drive/camera/mobile regression suite, with no uncaught errors or Google Maps requests.

## Previous completed pass: targeted Static API references and model quality

User authorized **25 new Static API images for each of Marina Bay, Raffles Place and Queenstown**, followed by model/world refinements using subagents. This supersedes the earlier 50-image remaining Marina allowance. All historical attempts and baseline 8 remain intact; aggregate additional authorization is now 90 (15 historical + 75 new), with independent regional caps starting at Marina 23, Raffles 0 and Queenstown 0 previous Static image attempts. Each region may make at most 25 new image attempts; failures count and are never silently refunded. The conservative 1,000-Static-attempt safeguard remains unchanged. README intentionally omits allowance limits.

Root owns the cached Static capture runner/ledger; one subagent refines each world. Plans reuse accepted Google panorama metadata and specify targeted 640 × 640 JPEG views with heading, pitch, FOV and a concrete modeling purpose, avoiding new metadata requests. `pnpm references:static --plan reconstruction/<region>-static-quality-plan.json --dry-run` previews work without credentials/network. Complete caches are checksum/fingerprint validated and reused with zero calls; orphan/mismatched files stop the run. Failures stop the batch without automatic retries. Separate regional authorization is enforced by `api-budget.mjs`.

Capture completed: **75/75 JPEGs saved, no failures and zero metadata requests**. Each region used exactly 25 new Static image attempts; all three regional allowances are now **exhausted**. Totals: **98 historical Static image attempts + seven metadata attempts = 105/1000 conservative attempts**, 895 remaining under the global safeguard. This is not additional permission to capture: obtain new authorization before further Static images. Original history is preserved. Full cache-only reruns for all three quality plans reused every image with zero requests. Image review and model refinement follow separately; a successful request is not visual acceptance.

Refinements from the new views:

- Marina: patterned Esplanade sunshades, rounded glazed wheel capsules, finer conservatory grids/ribs, splayed Sands mullions, curved garden shoulders, museum struts and Merlion plinth details. Static details remain batched; extent, 14 stamps and ground colliders are unchanged. Review: 19 accepted, six limited.
- Raffles: differentiated glass/metal materials and tower crowns, lobby grids, finer paving, arched shutters and tile edges, stepped market roof/tile courses/scalloped fascia/green ironwork, cylindrical bridge supports and shelter brackets. Eleven objectives and all road centerlines remain clear. Review: all 25 accepted.
- Queenstown: rounded station piers and louvers, framed/lattice gallery windows, deeper multi-sided tower articulation, varied branching foliage, roof supports and round community tables. Extent and eight objectives remain unchanged. Review: 23 accepted, two limited; the planned station-roof frame is correctly used for its actual viaduct/louver/column content.

All 75 images were visually reviewed: **67 accepted, eight limited, none rejected**. Limited images remain useful only for their visible details, not unsupported dimensions/landmark silhouettes. Original images, camera settings, dates, checksums and per-image review notes are preserved. Full cache now contains 285 references; the older 24 Marina images without machine-readable annotations remain pending in the inventory. Maps remain authored low-poly interpretations, not surveyed reconstructions.

Final verification: **48 tests across 15 files and production build passed**. All three browser checks passed: walk/drive/reset, independent stationary/moving camera orbit, recenter/mode switching, region switching and mobile width, with zero Maps requests or uncaught errors. Targeted landmark/estate close-ups were visually reviewed. All 285 cached-image checksums pass; credential scan found no configured environment-key values in commit candidates. The existing nonblocking Three.js chunk-size warning remains. No dependencies changed; pnpm 11 and the strict 14-day release age remain intact. Next: human full-objective play-through, actual-phone performance, camera occlusion, richer NPC/traffic behavior and geographic refinement, then deployment/video. Sections below are historical milestones, not current capture authority.

## Expanded scope: larger maps and large reference batches for all three regions

Completed the user's further expansion request using three modeling agents, one per region; the former camera-QA agent was reassigned to Marina after completing the regression checks. The latest pass saved **114 additional browser images: Marina 40, Raffles 40, Queenstown 34**, beyond the earlier Raffles 24/Queenstown 36 pass. Queenstown's final batch stopped after 34 successful captures; the remaining six were not retried. Modeling ran in parallel; Chrome capture/selection/visual-QA used a serialized queue. **Zero Static requests** were used; the 50-image remaining Static allowance is unchanged.

Implemented worlds: **Marina 726 × 616 with 14 stamps; Raffles 580 × 399 with 11 stamps; Queenstown 520 × 424 with eight stamps.** Roads connect the existing districts to new outer districts. Collision-aware reachability, road-clearance and instancing tests pass. Minimap roads and bounds are exported by each scene/collision module, and HUD/objective counts derive from stamp arrays. These remain authored, compressed interpretations rather than surveyed replicas.

Portable cache totals: **210 images** — Marina 72, Raffles 64, Queenstown 74. Machine-readable reviews: 142 accepted, 32 limited, 12 rejected, 24 older Marina images pending manifest annotations (historical reviews exist separately). All checksums pass. Newly captured Marina 40, Raffles 40 and all saved Queenstown frames have been reviewed; rejected captures are retained and explicitly excluded from reference use.

Final verification: **41 tests passed; production build passed; all three region browser checks passed** (walk/drive/reset, stationary and moving camera orbit without steering, recenter/mode switching, mobile width, zero Maps requests and no uncaught exceptions). Final gameplay screenshots were reviewed; Marina's additional aerial/garden/wheel/south views were also reviewed. Credential scan across all tracked/untracked candidate files found no environment-key values. The existing nonblocking Three.js bundle-size warning remains. User requested commit and push of this completed milestone.

Next: human play-through of all 33 objectives, actual-phone performance, camera occlusion handling near buildings, richer NPC/traffic behavior and geographically coherent reference refinements, then deployment/video. Do not mistake stylized landmark placement or decorative pedestrians for surveyed geography or traffic simulation. The historical milestones below are superseded by this section.

New offline command `pnpm references:inventory` counts cached images/bytes, visual acceptance categories and checksum failures across all three regions (including legacy multi-frame Static manifests). It performs no requests. Pending means the image lacks a machine-readable acceptance record; some older Marina reviews live only in historical documents. Never infer visual acceptance from a successful download or checksum.

## Earlier milestone: Raffles Place, richer Queenstown and independent car camera

User requested a new Raffles Place region, many more browser references for it and Queenstown, and substantially richer game worlds. Dedicated region agents implemented Raffles creation and Queenstown detail work; a third agent checked driving-camera behavior. Captures are serialized, cached and reviewed, with no Static downloads. Previous remaining Static allowance stays 50.

Driving-camera diagnosis: pointer drag previously modified the same yaw used to steer/move the car. Both existing controllers now keep camera orbit separate from vehicle heading, clamp vertical orbit, and gently recenter while moving after a short idle delay. Stationary views persist; reset/mode switching restore the chase view. Walking controls are unchanged. Shared implementation: `src/game/drive-camera.ts`; three unit tests cover orbit/clamping/damping. Final regional verification follows integration.

- **Raffles Place:** integrated independent 420 × 294-unit walk/drive region, seven stamps, plaza/MRT shelters, six detailed towers, red louvered entrance motif, planted wall, fan palms, quayside shophouses, river promenade and animated pedestrians. `reconstruction/raffles-place/REGION.md` maps references to authored geometry. Of 24 cached screenshots, 19 are accepted, three are limited detail references and two are rejected due to a development overlay. Rejected files/history remain preserved, not used as visual truth.
- **Queenstown:** richer instanced estate details include open-deck lobbies/mailboxes, facade and rooftop services, platform screens, playground/pavilion, bus shelters, seating/bins, parked cars, court fence and denser greenery. All five stamps remain reachable by car. Expanded reference review and replacement capture details are recorded in its region document.
- **Capture issue found and fixed:** metadata/POV can update while background Street View pixels are stale. Concurrent browser QA can steal the capture tab's foreground rendering. Captures now require foreground visibility, matching POV/zoom, no Vite overlay, two animation frames plus a composited warm-up frame, and reject exact duplicate pixels for different views. Visual acceptance is still required: changed UI text can conceal stale underlying pixels from hash comparisons. Serialize **all** capture/selection/browser-QA activity, not just ledger writes. New helper/tests: `scripts/capture-readiness.mjs`, `src/game/capture-readiness.test.ts`. Rejected frames are retained and replacements use new IDs.

## Earlier milestone: expanded Marina and first Queenstown region

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

## Local FPS integration — 2026-09-13

Implemented as **Marina FPS**, a separate mode on the existing Marina map. Includes local weapon/prop GLBs, free movement and collision, sprint/crouch/jump, mouse capture and drag fallback, automatic hitscan fire with scenery occlusion, aim overlay, recoil/effects/sound, ammo/reserves, reload poses, weapon switching, eight-target exercise, timer/accuracy, pause/reset/fullscreen and on-screen controls. Main walk/drive geometry remains owned by the existing Marina scene. No capture calls or runtime dependency additions.

Verification for FPS: **26 tests and production build pass**. Local Chrome smoke passed model loading, target hits, ammo/reload with pause, switching, movement, aim, all-eight-target completion, reset, 390px layout and mode cleanup, with zero map requests and no uncaught browser exceptions. Gameplay/aim/completion screenshots were visually inspected. Actual touchscreen play and physical-device performance remain unmeasured.

Next FPS work: visual feedback, hand rig and authored reload clips, world-model LODs, richer moving targets or enemy gameplay, and actual-device performance/accessibility testing. This is not multiplayer or a complete high-fidelity combat game.

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
