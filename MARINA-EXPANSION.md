# Marina Bay expansion — 13 September 2026

## Game changes

- The modeled playable bounds grew from 396 × 316 to 556 × 466 game units (2.07× the area). The inner bay and its original five stamps remain; four district stamps bring the total to nine.
- A connected outer driving circuit runs at x = −223 / 238 and z = −218 / 164. Three clear connector roads join the original loop. `MARINA_MAP_ROADS` is the shared map/route description, and `MARINA_BOUNDS` defines movement limits.
- New districts include the Bayfront greenway, a southern garden court, west-side stone terraces, and a northern pavilion garden. Added exterior skyline blocks, cycle-path surfacing, planting beds, palms, lighting, benches, and road markings make the enlarged area playable rather than only distant scenery.
- Repeated geometry (including palm fronds/trunks and planting) is instanced to keep the larger scene economical. Moving waves, the car and collectibles remain independent.

## Accuracy boundary

This remains an authored, compressed low-poly interpretation, not a surveyed replica or automatic reconstruction. Expanded roads connect destinations for play; they are not an assertion that these exact roads exist. The pavilion roof shapes are architectural motifs, not a measured Esplanade model. Saved reference images inform visible materials and streetscape details; dimensions not supported by measurements remain approximate.

## Validation

- Automated tests cover both road loops, every connector, car clearance at all nine stamps, map boundaries, expanded area, landmark proportions and geometry batching.
- The original bay's road loop and spawn remain intact.
- A collision-aware breadth-first traversal confirms all nine stamps are reachable from the spawn at car radius, not just clear at their endpoints.
- Separate offline aerial and Bayfront-greenway camera renders were visually reviewed. The greenway has a clear walk/cycle corridor alongside its lamps, palms, benches, road markings and new road. The aerial confirms the old bay and outer circuit remain connected. Diagnostic images: `/tmp/marina-expansion-aerial.png` and `/tmp/marina-expansion-greenway.png` (local-only QA, not portable references). The direct aerial render reported 249 draw calls / 110,805 triangles with shadows disabled; this is not a production FPS benchmark.

## New cached references and applied observations

`reconstruction/marina-expansion-browser-plan.json` captures eight browser screenshots across four new panorama positions. See `reconstruction/marina-bay/references/expansion-review.md` and the `marina-expansion-batch-02-gallery.html` gallery for full review, source positions and camera settings.

- Merlion (July 2018): ivory sculpture, blue tiled plinth, grey paving and low planter edge. Applied as a simplified modeled Merlion fountain on the west shore, plus stone terraces. Sculptural proportions remain approximate.
- Sheares Link / Bayfront (June 2024): black-and-white curb blocks, double yellow road lines, tall palms, dense planting, broad rain-tree canopies and green road signs. Applied to the expanded Bayfront greenway and roadside.
- Southern selection (March 2022) actually landed at an MBFC entrance, not the intended promenade. Accepted only for glass, dark canopy beams and silver cylindrical bollard details; applied to an outer city-block entrance, not used as promenade evidence.
- Esplanade (February 2020): both frames are an indoor exhibition. Rejected for exterior modeling and retained with rejection notes to avoid repeat requests. The new northern pavilions are explicitly authored motifs, not inferred from those indoor images.

Eight captures took 20.962 seconds with four panorama loads and zero Static API calls. A cached rerun reused all eight in 12ms with zero network requests. All frames and source metadata are stored locally with attribution; six are useful exterior references, two are rejected. Static allowance is unchanged.

## Next work

Replace compressed layout choices with a consistent geographic coordinate projection if exact distances become a requirement. Add region-specific traffic/pedestrian behavior only after geometry and route QA; improve curved collision shapes for landmarks if close-up movement becomes a priority.
