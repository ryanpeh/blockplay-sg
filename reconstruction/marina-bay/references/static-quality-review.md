# Marina Static quality pass

Plan: `reconstruction/marina-static-quality-plan.json`. Root captured the approved 25 images through the shared Static runner using already selected panorama IDs. No extra API calls were made during review or modeling. The new files are `marina-static-quality-*.jpg` and their adjacent JSON manifests. Each manifest retains attribution, source date, camera settings, checksum and an explicit visual-review classification.

All 25 full-size images were reviewed: **19 accepted, six limited, zero rejected, zero pending**. Images are 640 × 640 with targeted FOV/pitch settings, rather than repeated cardinal overviews. Several targets still crop or obscure the intended subject; those failures are useful guidance for a future separately authorized batch, not a reason to retry automatically.

## Source-to-model mapping

| Frames (prefix `marina-static-quality-`) | Review / use | Applied refinement |
| --- | --- | --- |
| `grove-crown`, `grove-core`, `grove-branches`, `grove-skywalk` | Accepted; core/crown geometry and purple steel, grey backing, irregular planting and gold rails are visible. | Straight planted lower cores, narrower shoulders, flared branching crowns and staggered foliage; no elevated walkability claim. |
| `conservatory-ribs`, `conservatory-glazing`, `conservatory-path`, `conservatory-footing` | Accepted; heavy white ribs and fine dark glass grids are especially clear. | 224 batched dark glazing segments between white ribs; retain grey-green glass and purple bollards. |
| `wheel-silhouette` | Accepted; full distant wheel and rounded dark capsules. | 16 rounded capsules with window divisions and a central axle replace rectangular blue boxes. Capsule count is compressed for the game, not a claim about the real wheel. |
| `wheel-supports` | **Limited**: flyover obscures the wheel; underside beams are clear. | Added flyover cross-beams; no hidden wheel-support dimensions inferred. |
| `sands-entrance` | Accepted; blue entrance fins, pale framing and layered canopy. | Retains/refines the entrance material language alongside the earlier reference set. |
| `sands-rear-grid`, `sands-skypark`, `sands-bayfront-side` | **Limited**: partial edge-of-frame facade, cropped SkyPark under tree branches, and palm/hoarding-obscured side respectively. | Rear mullion rhythm is cross-checked against earlier full garden views. Added 3,240 surface-following mullion segments; retained published SkyPark proportions rather than deriving new dimensions from crops. |
| `merlion-head` | **Limited**: head cropped out; scales and plinth remain visible. | No head reconstruction based on this frame. |
| `merlion-plinth` | Accepted; blue-grey tiles, scale relief, planter and paving despite partial foreground occlusion. | Alternating blue/grey tile bands and grout. All static statue details are flattened into shared instance batches. |
| `museum-petals`, `museum-supports` | Accepted; white concave shell and dark external struts contrast with pale inner supports. | Added dark outer struts while keeping white inner legs, pond and authored petals. |
| `esplanade-shell` | **Limited**: trees hide much of the roof. | Visible triangular shade motif only; no exact panel count/layout inferred. |
| `esplanade-distant`, `esplanade-paving` | Accepted for paired pod silhouette, roof pattern, paving and planting. | Added 472 triangular sunshade meshes, instanced, on the existing compressed pods. |
| `downtown-podium`, `downtown-shelter` | Accepted; dark fins, stone colonnade, silver louvers, slim posts and seating. | Layered southern canopy louvers and the existing glass/stone civic frontage palette. |
| `civic-bronze-fins`, `civic-canopy-grid` | Accepted for clearly visible upper material detail only; ground hoarding remains irrelevant. | Confirms the modeled dark glass-grid civic canopy and facade rhythm; no concealed courtyard reconstructed. |

## Validation and limits

- The map is still 726 × 616 with 14 collectibles and 389 ground colliders. Every road segment and collectible remains car-reachable in automated tests.
- Eight Marina tests cover routes, collision, unchanged bounds, quality-detail counts and batching. Final scene: 14,310 static instances, 42 batches, 211 direct children.
- Offline close-up renders of Esplanade pods, conservatory grids, wheel capsules and garden crowns were inspected. The rendering harness makes no Maps calls and leaves production controllers unchanged.
- These are authored low-poly interpretations, not automatic photogrammetry or measured present-day reconstructions. Historical source dates remain visible in manifests. The reference images are not served by the game at runtime.
