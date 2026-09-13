# How the cached references informed the game

Implemented 2026-09-13 in `src/game/marina-scene.ts`. This is authored low-poly geometry based on visual observation, not automated photo reconstruction. No images are fetched or used as photograph textures by the game.

| Cached reference | Implemented game detail |
| --- | --- |
| `museum-shell.png` | Broad angular/tapered museum shells replacing rounded petals; splayed support beams; dark tip glazing; pond rim and lily pads. |
| `bay-skyline.png` | Continued steel/gray waterfront palette and distinct skyline masses; existing bay-facing framing retained. |
| `fullerton-materials.png` | Low stone city-side arcade, arched dark openings, horizontal cornices and hedge planters. This compresses reference motifs, not an exact Fullerton footprint. |
| `fullerton-glazing.png` | Dark glazing and metal/stone contrast in the city-side arcade and its planted frontage. |
| `sands-canopy.png` | Glazed entrance canopy framing and alternating blue/pale vertical fins. |
| `sands-streetscape.png` | Bollards with contrasting bands, denser red/green curb planting and broad shade trees. |
| `south-waterfront.png` | Smaller granite slabs, darker paving bands, inclined railing braces, bench backs/arms and wood-edge detail. |
| `south-palms.png` | Curved overhead shade beams in place of the rectangular pergola; fuller landscaped edges. |
| `north-bay-browser-h160-p15-z1.png` | Bronze roof louvers, sail masts and support stays over the Shoppes podium. |

Most repeated box details remain instanced; slab detail increased from 1,080 to 4,320 instances in one paving batch. New ground-level obstacles have colliders while overhead canopy/roof features remain passable underneath. Road-loop, spawn and stamp-clearance tests pass. No additional API requests or source captures were used.

Verification: all 20 tests and production build pass. Browser smoke checks pass default rendering, walk/drive translation, reset and mobile width with no uncaught errors or Static API requests. Default walk/drive screenshots inspected. These checks do not establish measured geography, automatic image-to-3D accuracy, or performance on an actual phone.
