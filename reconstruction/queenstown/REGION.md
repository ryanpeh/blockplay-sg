# Queenstown game region

Queenstown is a separate, playable low-poly estate, not a colour variant of Marina Bay. The first version is an **authored, compressed heritage-inspired composite**, not a surveyed digital twin or a claim that every model matches a current building. Game units approximate metres for movement only; the HUD is not geographic distance.

## Implemented

- Detail pass: platform screen/edge rhythm, track sleepers, lift-lobby doors/mailboxes and ceiling beams in open decks, end-facade windows and roof service volumes, covered bus waiting areas, community pavilion, playground, permeable court fencing, benches/bins and cars in marked parking bays. Roadside vegetation is layered into mature crowns, curb planters and pocket gardens.
- A 520 × 424 game-unit extent (2.08× the initial 368 × 288 area): original estate loop, central Commonwealth Avenue-inspired arterial, western green walking path and new outer district circuit with four road connectors.
- Elevated Queenstown station-inspired platforms, green roof, EW19 signage, support piers, lift entrances and an animated train.
- Six slab-block clusters with repeated windows, air-conditioning units, accent panels, genuinely open void decks, ground columns and covered walkways; four taller modern residential podium/towers and an older two-storey neighbourhood service row distinguish the outer districts.
- Low neighbourhood shops, kopi tables, a basketball court, trees and a low-rise library-inspired building/garden.
- Walk/run, chase-camera driving with visible car, collision sliding, reset, minimap and eight reachable collectibles. New destinations: Commonwealth gardens, Dawson courtyard and the neighbourhood gateway.
- Resources and event handlers are disposed on region changes. Canvas labels and controls identify Queenstown.

## References and accuracy

### Static API model-quality pass

`reconstruction/queenstown-static-quality-plan.json` adds exactly 25 targeted 640 × 640 JPGs, reusing existing Google-owned panorama IDs without metadata lookups. Root performed the authorized capture and ledger accounting. All 25 were visually inspected: 23 accepted, two limited, none rejected. Queenstown now has 99 cached reference images (74 browser PNGs plus 25 Static JPGs). Per-image JSON retains image date, camera parameters, purpose, checksum, attribution and actual-subject review.

New image-driven geometry/material refinements:

- `static-quality-station-front` and `station-roof`: rounded concrete piers, projecting dark louvers with separate blue framing, and concrete fascia joints. The image named `station-roof` shows the viaduct underside, not the roof silhouette; the authored station roof is unchanged.
- `cyan-gallery`, `cyan-end`, `mei-lattice`, `mei-orange`: raised pale/orange window surrounds, mullions and gallery-end lattice elements add depth to repeated slab facades.
- `shelter-structure`, `mei-gateway`: visible underside rafters, longitudinal beams and timber-louver gateway panels.
- `market-roof`: curved standing seams follow the blue barrel roof rather than using flat stripes. `mei-kopi` replaces square table tops with round geometry and adds small stools.
- `dawson-base`, `dawson-fins`, `modern-podium`: windows and horizontal bands now articulate all four tower sides; entrance recesses have distinct piers/louvers. The buildings remain solid, authored gameplay masses rather than navigable interiors.
- `street-planting`: tapered polygon trunks, actual fork branches and four varied leaf clusters per tree replace uniform three-blob crowns. Leaf tones and canopy orientations vary deterministically; glass, painted metal and plaster have different roughness.

The two limited images are `station-link` (distant/vegetation-obscured link) and `library-screen` (partially obscured civic facade, identity not verified). No further captures were made to replace these. Existing region bounds, eight objectives and road routes are preserved.

Four regression tests pass, including all-objective reachability, clear road connectors, model geometry/material checks and batching. The browser quality render measured 15,111 authored static meshes batched into 77 root children including text signs. Offline review renders: `/tmp/queenstown-static-quality-station.png`, `-gallery.png`, `-market.png`, `-district.png` (temporary QA artifacts, not required runtime assets). The station/gallery/market close-ups visibly show the new model depth; no Maps requests are needed to render them.

### September detail expansion

Seventy new browser screenshot files were stored in this session: 20 initial detail views, four clean replacement frames, 12 additional exterior views and 34 district expansion views. Together with the four earlier frames, Queenstown now has 74 cached PNG references. Every new frame was visually reviewed; individual JSON `visualReview` fields distinguish accepted, limited and rejected imagery. The latest 40-view district plan stopped after 34 captures and one failure at `margaret-north-180`; six views remain uncaptured. Raw error details are intentionally withheld by the capture helper to protect credentials. No automatic retries were spent; rerunning the plan later will reuse the 34 valid cache entries. All screenshot attempts remain recorded even when rejected.

The new district plan is `reconstruction/queenstown-district-browser-plan.json`, with requested areas Commonwealth Close/Crescent, Tanglin Halt, Queen's Close, Stirling, Dawson and Margaret Drive. Capture geography is broader than this compressed authored game map. Several Google-selected sources are pedestrian estate courtyards rather than roads, useful for public-realm details; `margaret-north` selected a landed enclave and is limited rather than treated as HDB reference. Dates range from 2019 to 2025 across the cache and are retained per frame; do not present the composite as a current geographic reconstruction.

The new `queenstown-expansion-browser-plan.json`, `queenstown-retry-browser-plan.json` and `queenstown-exterior-browser-plan.json` broaden coverage around Commonwealth Avenue, Mei Ling Street, Margaret Drive, Dawson and Tanglin Halt. Plan source names describe requested areas, not verified landmark identity: for example `library` selected 74 Margaret Drive, and `margaret` selected 38 Commonwealth Avenue. Source metadata records the actual selected position and date.

Image-to-geometry mapping:

- `stirling-0`, `stirling-90`, `stirling-270-retry`: coral slab end walls, cream galleries, red covered links, teal guard rails and layered mature canopy. Applied to the community pavilion canopy/rails and the estate planting palette; steep terrain remains unmodeled.
- `margaret-0`, `margaret-90`, `library-270`: white vertical residential fins, dark window recesses and planted podiums. Applied to distant modern tower context outside the gameplay boundary, contrasting with the older open-deck slabs.
- `margaret-90`: blue barrel-roof low-rise hall and pale colonnade. Applied as a roof/column motif on the compact authored market, not an exact reconstruction of that hall.
- `margaret-0`, `margaret-180`, `library-270`: red parallel paths, planted verges, clear kerbs, hedges and street lamps. Applied along the station approach/spawn lane and roadside pockets.
- `station-clear-180` and the clean station retries: pale concrete viaduct, train stripe and dense roadside greenery. Supports the existing elevated rail palette and layered planting.
- `commonwealth-close-0/90/180/270`, `commonwealth-crescent-0/90`: cyan/peach access-gallery accents, red roof shelters and pale curved garden benches. Applied to the new northern slab and western sheltered garden; the real slopes remain compressed into a level playable world.
- `mei-ling-road-90/270`: tall red-roof gateway with open passage. Applied to the northern district gateway above a clear road connector.
- `tanglin-market-road-90/180`: older two-storey red-roof service row with small windows and rear air-conditioning units. Applied to the western neighbourhood shops and shaded court.
- `dawson-90/180`, `dawson-east-90/270`: planted podiums and paved residential courts. Applied to the eastern tower district/courtyard; no inaccessible ramps or elevated objectives were introduced.

The first detail run exposed two capture failures despite the helper reporting success: two images contain a development error overlay, and four have stale WebGL pixels after heading/panorama changes. One additional Mei Ling frame is an indoor market. These seven are explicitly rejected in their JSON manifests, retained for audit/cache history, and not used to model exterior geometry. Three other frames are marked limited for foreground occlusion. Four replacement views have clean, distinct pixels after the shared foreground/POV/repaint readiness fix. No Static API calls were made.

Primary public references establish the neighbourhood identity, rather than surveyed dimensions:

- [National Heritage Board — Queenstown Heritage Trail](https://www.roots.gov.sg/places/places-landing/trails/my-queenstown-heritage-trail): estate history, library and neighbourhood amenities.
- [NHB — Queenstown, the Queen of Estates](https://www.roots.gov.sg/stories-landing/stories/queenstown-the-queen-of-housing-estates/story): first satellite-town identity and public-housing development.
- [NLB — Queenstown Library at 50](https://biblioasia.nlb.gov.sg/all-sections/vol-16-issue-3-oct-dec-2020-queenstown/): library heritage. The model is heritage-inspired, not a representation of current renovation status.
- [NHB — Former Malayan Railways](https://www.roots.gov.sg/places/places-landing/Places/landmarks/my-queenstown-heritage-trail/former-malayan-railways): green-corridor context. Its inclusion here compresses a broader Queenstown area.
- [LTA rail map](https://www.lta.gov.sg/content/ltagov/en/map/train.html): station/line identity.

Building footprints, heights, road alignment and co-location are currently authored for gameplay. Do not use this map for navigation. Estate labels are generic, not asserted real block numbers. No new Static API requests were made to create this version.

Browser reference plan: `reconstruction/queenstown-browser-plan.json`. Two Google-owned panoramas were selected near the station (1.294294, 103.806090; imagery March 2025) and nearby estate (1.296019, 103.804818; imagery February 2024). Four directional views and a gallery are cached under `reconstruction/queenstown/references/`; they are not duplicated into the production public directory. Capture reruns reuse matching cached PNG/JSON. Browser loads are tracked separately and do not spend the Static image allowance.

Visual review accepted three images; station-west is limited by a foreground bus, so only the visible upper facade and walkway supports inform detail, not sizing. The scene now uses blue station cladding and louvers, blue covered-walkway posts/gray roofs, cream slab columns with long recessed gray access galleries, coral trim, planted station curbs and parking apron markings from these references. The station roof, library and region layout remain authored approximations. Four captures took 11.676 seconds across two panorama loads (7.59MB PNG total), with zero Static API calls.

## Validation and next work

`src/game/queenstown-scene.test.ts` checks safe walking/driving spawn, all eight collectibles reachable with driving clearance, open void-deck passage, solid columns and map bounds. It also checks that the larger area is genuinely more than twice the initial map and that all outer road/connector centerlines remain clear. Browser checks should cover both travel modes, reset, switching regions and mobile overflow.

Static scene detail is grouped into instanced draws by geometry, material and shadow flags; train, car and collectibles remain separate animated objects. The regression test checks that more than500 authored static details batch into fewer than100 root scene children.

The detail-pass regression also checks the full road-loop lanes and station arterial, open waiting areas, and solid parked cars. More than 2,000 static meshes are authored, then instanced into fewer than 100 root scene children; decorative detail must not turn into thousands of draw calls.

Next: move from this composite into connected geographically calibrated subareas incrementally. Keep panorama identity, heading, capture date and attribution with cached screenshots; do not spend the Static allowance on browser reference collection. Reference images inform material/layout motifs but do not establish surveyed scale. The playground, pavilion and generic shops are gameplay-authored amenities, not claims that these exact structures occupy these positions.
