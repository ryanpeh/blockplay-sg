# Marina district reference review — 13 September 2026

Plan: `reconstruction/marina-district-browser-plan.json`. Gallery: `marina-district-detail-batch-03-gallery.html` in this directory. Forty 1280 × 900 browser screenshots cover ten newly selected Google panorama positions at headings 0°, 90°, 180° and 270° (zoom 1). Google attribution and image dates remain in each frame. Individual JSON manifests contain `accepted:` or `limited:` review notes, positions, headings, hashes and dates.

All 40 full-size images were visually inspected. **30 are accepted and 10 have limited use**. There are no blank, stale, indoor-only or rejected frames in this batch. Accepted means useful visual reference, not measured geometry or proof of the present-day layout. Source imagery ranges from February 2010 to June 2024. Transient construction, vehicles and signage are not treated as permanent map geometry.

| Source group | Image date | Accepted / limited | Observations and use |
| --- | --- | --- | --- |
| `gardens-grove-03` | 2014-05 | 4 / 0 | Elevated skywalk views show wine-purple branching steel, planted cores, golden rails, grey decking and the pale rear Sands facade. Applied purple frames, forked branches, planted cores and ground-level gold rails. The game does not claim skywalk-height traversal. |
| `conservatory-road-03` | 2014-05 | 3 / 1 | Grey-green glazing, heavy white inclined ribs, yellow path edge, purple bollards and distant wheel silhouette. Applied shell palette, ribs and bollards. Heading 180° is cart/person-occluded and limited to facade material detail. |
| `barrage-approach-03` | 2024-06 | 2 / 2 | Actually Marina Gardens Drive near the barrage approach. Heads 0°/90° are construction-dominated; retain only lamp/road context. Heads 180°/270° show black/white kerbs, layered planting and broad rain-tree canopy. Applied kerbs and roadside detailing, not temporary works. |
| `east-garden-03` | 2018-08 | 4 / 0 | This source is **Bayfront garden access**, not Bay East. Purple handrails, wayfinding, pale structural supports, grey paving, grates and planting are clear. The original eastern requested point had no Google panorama and was replaced before screenshots. |
| `flyer-road-03` | 2010-02 | 2 / 2 | Historical forecourt: irregular light stone, louvers, palms and concrete cable anchors. Heads 0°/180° are coach/utility-wall-dominated. Wheel silhouette is better supported by conservatory, waterfront and promenade views. Do not infer present-day coach operations. |
| `float-waterfront-03` | 2024-06 | 3 / 1 | Actual source is Raffles Avenue. Clear road/lane/kerb context, white mall frontage, distant wheel and Esplanade roof. Heading 180° is coach/construction-occluded. No current floating-platform reconstruction is claimed. |
| `esplanade-road-03` | 2018-11 | 4 / 0 | Useful **outdoor** junction, slab paving, gullies, planting, black/white island kerbs and partial shell views. Complements the older rejected indoor Esplanade batch; the older files are retained unchanged. |
| `promenade-road-03` | 2021-08 | 4 / 0 | Under-flyover coach-bay context: splayed concrete supports, overhead beams, climbing vegetation, double yellow lines and patched asphalt. Applied an overhead viaduct motif with planted supports, clear ground-level routes beneath. |
| `downtown-green-03` | 2024-06 | 4 / 0 | Central Boulevard tower bases show reflective blue/green glazing, stone colonnades, dark louvers, long sheltered frontage, bollards and planted terraces. Refines the southern/civic frontage palette and canopy rhythm. |
| `marina-one-street-03` | 2022-03 | 0 / 4 | Temporary white hoarding obscures most ground layout. Upper glass-canopy grids, grey columns, bronze fins and paving remain useful material details only; no courtyard or entrance footprint inferred. Applied glass-grid arcade detailing. |

## Capture and reuse

- 40 successful screenshots, 10 panorama loads, 130,121 ms, 67,316,134 image bytes, **zero Static API calls**.
- Ten selected panorama IDs were compared against all previous Marina source/frame manifests: no shared panorama IDs and no duplicate camera fingerprints.
- Eleven Maps JavaScript selections were attempted: ten successful, one unavailable eastern point. The failed selection is retained in `reconstruction/api-usage.json`; no ledger history was reset.
- A cached dry run returns 40 cached / 0 new images. Reuse this plan and the checked-in image/manifest pairs; do not rename IDs to trigger another capture.
- Browser captures were serialized after Queenstown and Raffles, using the foreground/POV/repaint readiness checks. No concurrent QA tab switched Chrome during the batch.

## Accuracy boundary

The enlarged 726 × 616 scene is an authored, compressed game interpretation. Screenshots inform visible materials, structural motifs, street furniture and relative massing. They are not photogrammetry, a geographic survey, current traffic evidence or an exact source of distances. The game makes no Maps requests and does not serve these reference images at runtime.
