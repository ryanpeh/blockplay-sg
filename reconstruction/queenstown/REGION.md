# Queenstown game region

Queenstown is a separate, playable low-poly estate, not a colour variant of Marina Bay. The first version is an **authored, compressed heritage-inspired composite**, not a surveyed digital twin or a claim that every model matches a current building. Game units approximate metres for movement only; the HUD is not geographic distance.

## Implemented

- An approximately 368 × 288 game-unit extent: continuous estate road loop, central Commonwealth Avenue-inspired arterial and western green walking path.
- Elevated Queenstown station-inspired platforms, green roof, EW19 signage, support piers, lift entrances and an animated train.
- Four slab-block clusters with repeated windows, air-conditioning units, accent panels, genuinely open void decks, ground columns and covered walkways.
- Low neighbourhood shops, kopi tables, a basketball court, trees and a low-rise library-inspired building/garden.
- Walk/run, chase-camera driving with visible car, collision sliding, reset, minimap and five reachable collectibles.
- Resources and event handlers are disposed on region changes. Canvas labels and controls identify Queenstown.

## References and accuracy

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

`src/game/queenstown-scene.test.ts` checks safe walking/driving spawn, all five collectibles reachable with driving clearance, open void-deck passage, solid columns and map bounds. Browser checks should cover both travel modes, reset, switching regions and mobile overflow.

Static scene detail is grouped into instanced draws by geometry, material and shadow flags; train, car and collectibles remain separate animated objects. The regression test checks that more than500 authored static details batch into fewer than100 root scene children.

Next: capture clearer station roof/street views and Margaret Drive/library references, then refine road widths and relative layout. Keep panorama identity, heading, capture date and attribution with cached screenshots; do not spend the Marina Static allowance on Queenstown. Move from this composite into connected geographically calibrated subareas incrementally. Existing four captures do not justify claiming survey accuracy.
