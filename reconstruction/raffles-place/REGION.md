# Raffles Place game region

Built 2026-09-13 as a distinct authored low-poly financial-district composition. It uses actual Street View visual observations, not photogrammetry, surveyed coordinates, exact building heights or current-day reconstruction. No external imagery is fetched while playing.

## Implemented

### District expansion (latest)

The newer district is **580 × 399 game units (1.87× the first Raffles area)**. Outer west/east streets and a southern connector form a continuous expanded road loop. Eleven collectible rings now cover the square, quays, Cross Street arcade, market garden, Robinson colonnade and Collyer boulevard. Five additional towers, a west heritage arcade and a low market hall/court enrich these extensions. These remain compressed authored neighborhoods, not surveyed building placements. `RAFFLES_MAP_ROADS` drives the minimap and collision tests; every displayed centerline is checked at car radius, including connectors. This check also caught and corrected an old shophouse blocking the northern -75 street.

New coverage plan: `reconstruction/raffles-expansion-browser-plan.json` captured **40 new views at ten distinct new panoramas**, with no panorama IDs overlapping the first six sources. 40/40 completed in 143.205 seconds, 70,711,871 bytes, ten browser panorama loads and zero Static calls. Complete-cache reruns reuse these files. All 40 were individually visually inspected: **33 accepted, seven limited, zero rejected**. Alongside the first batch this is 64 cached screenshots: 52 accepted, ten limited and two earlier overlay-rejected images.

Reference-to-geometry mapping for this expansion:

- `church-expansion-*` actually selected Pekin Street: white plaster, colorful hinged shutters, cafe tables and fabric awnings → finer west Cross Street arcade and outdoor furniture.
- `cross-expansion-*` selected Telok Ayer Street: lower heritage fronts alongside towers, planting buffers and broad intersections → low-rise/tall-building contrast and clear connecting streets.
- `robinson-expansion-0/90` and `lau-pa-sat-expansion-270`: terracotta market roof, cream fascia and green fan-shaped ironwork → revised market hall roof and entry framing. The game hall is not an exact octagonal Lau Pa Sat reproduction.
- `cecil-south-expansion-0/180/270`: deep dark lobbies, pale cladding, vertical planting and street trees → southern tower facade planting and material variation.
- `quay-west-expansion-*` (Circular Road) and `circular-expansion-0/180`: shophouse shutters, cafe awnings, potted shrubs, paired lanterns and service details → quay lamps/planters plus existing shop detail. The requested quay coordinate selected a nearby street, not the water-facing promenade.
- `collyer-expansion-0/90/180`: glazed elevated connector, pale support columns and long bus shelter → new eastern boulevard bridge/shelter. Supports stay out of the drivable centerline; bridge is visual, not an elevated player route.
- `fullerton-road-expansion-0/270`: useful old skyline/material context only; imagery dates February 2012 and is not evidence of current streetscape.

Limited frames are `telok-expansion-0/180`, `cecil-south-expansion-90`, `circular-expansion-90/270`, `fullerton-road-expansion-90/180`: near walls, loading entries, trucks or old construction hoarding prevent whole-street inference. Reasons are in manifests. New source dates span 2012, 2018, 2021, 2022 and 2024. No duplicate/overlay issues occurred in this batch after the fixed foreground/repaint readiness workflow.

### First-region milestone (historical below)

- 420 × 294-unit navigable district, continuous outer street loop, two north/south links, Market-inspired cross street, plaza and river promenade.
- Six detailed glass/stone towers with floor bands, vertical ribs, lobbies, canopies and roof setbacks; seven colorful quay shophouses with shutters, air-conditioning boxes and pitched roofs.
- Raffles square planting beds, paired MRT entrance pavilions, plaza tile seams, sculpture, fan palms, green wall, red louvered gable, mounted wayfinding, benches, bins, street lamps, railings and twelve animated background pedestrians.
- Seven reachable collectible rings, walk/run/drive/brake/reset, bounds-aware minimap and independent drag-to-orbit car camera.
- Static repeated geometry is instanced; animated car/pedestrians/rings remain independent. Geometry/materials/textures and shadow buffers dispose on unmount.

Files: `src/components/RafflesGame.tsx`, `src/game/raffles-scene.ts`, `src/game/raffles-collision.ts`, `src/game/raffles-scene.test.ts`. Root App/location routing selects `raffles-place`.

## Captures and visual review

Plan: `reconstruction/raffles-browser-plan.json`. Six Google-owned panorama positions, 24 cached 1280 × 900 browser screenshots, 40,164,640 bytes, 64.5 seconds, zero Static API calls. Selection coordinates and actual selected positions/dates remain in per-source JSON files. Four source panoramas date June 2024, Battery July 2018, Boat Quay December 2017: this is a multi-date reference collection, not a synchronized survey.

All 24 images were inspected individually. **19 accepted; 3 detail-only; 2 rejected.** Each manifest now records its review:

- `square-0`: red triangular louvered One Raffles Place entrance, silver edging, dark mullions, fan palms → gable and palm details.
- `square-90/270`: city canyon, green wall, covered entries, narrow roads and double yellow curbs → arcade planting, canopies and street detail.
- `battery-0/90/180`: pale stone plaza paving, dark lobby base, tropical planting and sculpture silhouettes → square materials and objects.
- `boat-quay-0/90/180/270`: outdoor service alleys, pale/terracotta plaster, shutters, utility boxes and AC units → shophouse detail. These do not show a full river-facing elevation; river edge is an authored continuation.
- `cecil-0/90/180/270`: Market Street canopy columns, glazing, pale ribs, planting and pedestrian width → tower facade/podium detail.
- `market-0/90`: Collyer Quay exterior columns, glass facades, landscaped medians and broad arterial street context.
- `chulia-90/270` and `battery-270` are **detail-only**, because loading entrances/nearby walls dominate. Not used for street-scale inference.
- `market-180/270` are **rejected**: a transient Vite development error overlay obscures the images. Cache and failed visual outcomes are retained for audit; do not use these as geometry references. No replacement required for this milestone.

The capture helper originally verified panorama metadata without rejecting development overlays. The runner now requires foreground rendering, matching camera settings, no development overlay and a repaint, and rejects exact duplicate pixels for different views. Keep visual acceptance separate from successful HTTP/browser capture.

## Portable continuation

First run `node scripts/capture-marina-browser.mjs --plan reconstruction/raffles-browser-plan.json --dry-run`; the complete cache needs no browser or key. Only start local Vite/Chrome and run the selector for genuinely new source metadata, or run capture without `--dry-run` for intentionally missing images. Do not delete caches or reset the API ledger. Screenshots use the browser demo key from private `.env`, not Static API permission. No secrets are included in reference metadata. Keep Chrome capture and browser QA serialized.

Tests exercise car-radius flood-fill reachability of all seven collectibles, safe spawn, tower/water/bounds collision and movement anti-tunnelling. Browser verification is handled by the shared region smoke script. Further work: improve skyline silhouettes, add more accurate quay-facing facades from new accepted sources, moving road traffic with collision, camera occlusion and pedestrian routing. Current NPCs are decorative; vehicles can drive pedestrian plazas by design for exploration.
