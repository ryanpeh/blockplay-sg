# Field exchange, progression and FPS equipment

The Armory sidebar offers 27 permanent items: six weapon variants across two platforms, five cosmetic finishes, four attachments, three carrying rigs, four insert choices and five vehicle wraps. All prices and stats are original arcade balancing. The prototype starts with 1,600 credits and 300 tokens. The explicit +250 demo-token button does not charge money. There is no checkout, expiry, rental or random purchase.

## Play loop

1. Enter Marina FPS and clear the eight targets. Each elimination earns 25 XP immediately, including kills in an unfinished exercise.
2. Completion earns `250 + round(accuracy × 100) + max(0, 100 − floor(seconds))` credits. Accuracy counts successful damage hits divided by shots, rather than kills divided by shots. Counter-fire adds 100 credits.
3. Completion also adds `200 + round(accuracy × 100)` XP, plus 100 XP in counter-fire. A fully cleared practice drill earns 400–500 XP in total, including its eight eliminations.
4. Level 2 begins at 300 XP, level 3 at 800, level 4 at 1,500 and level 5 at 2,400. The threshold for level `L` is `100 × (L − 1) × (L + 1)`, capped at level 50. Rank titles are Recruit, Operator, Specialist, Veteran, Elite and Legend.
5. Reaching a level unlocks purchasing, not ownership. Credits/tokens are still required. Tokens do not bypass level requirements. Previewing any item is free, even when locked. Buying and equipping are separate actions.

| Level | Newly purchasable equipment |
| --- | --- |
| 1 | Issued weapons/finish/rig, no inserts, soft armor |
| 2 | Ranger, Patrol, jungle/urban skins, precision optic, quick-change magazine, stabilizer, enhanced LBS, ceramic plates |
| 3 | Vanguard, gold skin, extended magazine |
| 4 | Orchid skin, Sentinel rig, Aegis ceramic inserts |
| 5 | Centurion |

No additional item gates currently follow level 5; ranks and XP continue to level 50. Purchases, XP and equipped items persist under `blockplay.armory.v1` in local storage. Old saves without XP migrate to zero XP while retaining valid owned items. Malformed saves fall back to issued equipment; malformed fields and unknown item IDs are sanitized. Existing ownership remains usable. Clearing browser site data resets the profile.

## Weapon differences

| Variant | Damage | Magazine | Cycle | Reload | Recoil |
| --- | ---: | ---: | ---: | ---: | ---: |
| SAR issued | 36 | 30 | .120 s | 1.80 s | .018 |
| SAR Ranger | 39 | 30 | .126 s | 1.65 s | .016 |
| SAR Vanguard | 42 | 36 | .108 s | 1.53 s | .014 |
| Ultimax issued | 30 | 60 | .085 s | 2.50 s | .026 |
| Ultimax Patrol | 32 | 50 | .085 s | 2.10 s | .022 |
| Ultimax Centurion | 35 | 75 | .079 s | 2.10 s | .020 |

Targets alternate 100 and 115 health. Vanguard clears a 115-health target in three landed shots versus four for the issued SAR. Attachments modify reload, capacity, recoil, aiming FOV or movement. The quick-change and extended magazines share one slot, so one replaces the other. Unlocks fit both weapons, with equipment saved separately for each platform. Skin palettes change only materials. Variant accents and equipped attachment markers appear in the preview and viewmodel.

## Armor and counter-fire

The rig slot supplies reserve capacity; the insert slot supplies armor points and absorption. Enhanced LBS adds 60 reserve rounds per weapon at a 2% movement cost; Sentinel adds 90 without a movement penalty. A bare ILBV-inspired carrying rig has zero armor points.

| Insert | Armor | Absorption while available | Movement |
| --- | ---: | ---: | ---: |
| None | 0 | 0% | 100% |
| Soft | 35 | 45% | 98% |
| Ceramic | 75 | 65% | 94% |
| Aegis ceramic | 100 | 72% | 97% |

The optional counter-fire drill uses surviving targets with line of sight within 65 game units. A 0.7-second warning locks an aim point; move at least 0.75 units, clear the attacking target or break line of sight to avoid the shot. A hit deals 18 incoming damage. Armor consumes `min(remaining armor, incoming × absorption)` and health receives the remainder. At zero health, the exercise ends without completion rewards. Pause freezes damage and warning timing. Reset restores health, plates and ammo; owned plates never need repurchasing.

Real-world naming reference: [CMPB's issued-equipment page](https://www.cmpb.gov.sg/life-in-ns/saf/items-issued/) describes the iLBV's modular load carrying and support for armor inserts. [MINDEF's enhanced-equipment factsheet](https://www.mindef.gov.sg/news-and-events/latest-releases/02dec20_fs/) describes the LBS carrying system. Geometry is an original simplified interpretation. All damage, armor, mobility and capacity values here are fictional game statistics, with no real protection-rating claim.

## Announcements and mouse capture

Only target eliminations advance the chain. Eliminations within three seconds of the previous elimination produce Double Kill, Triple Kill, Multi Kill, Ultra Kill, Monster Kill, Unstoppable and Rampage. A longer gap restarts the chain. Pause freezes gameplay time; reset starts a new chain. Each callout shows a banner and synthesized stinger. An installed local English speech voice is used when the browser exposes one; otherwise the banner and stinger remain. The range sound toggle mutes both.

Desktop Enter/Resume requests browser pointer lock directly from the user click. Gameplay begins on successful capture, and cannot silently fall back to an unconstrained cursor. Escape releases the pointer and pauses. Browser/OS focus loss also pauses. Capture denial leaves the ready/paused screen and a retry message. Touch devices use drag-look and touch controls.

## Implementation and validation

- `src/game/armory-catalog.ts`: item definitions, prices, level requirements and modifiers.
- `src/game/armory-state.ts`, `use-armory.ts`: pure purchase/equip/reward rules, validated persistence, immediate state references to prevent repeated clicks charging twice.
- `src/game/progression.ts`: XP thresholds, rank names and timed elimination chains.
- `src/game/armory-visuals.ts`: shared procedural skins, accents, markers and rig/insert models. Preview resources are disposed on selection changes.
- `src/components/ArmoryShop.tsx`, `ArmoryPreview.tsx`: catalog, comparisons, preview and saved loadout.
- `fps-engine.ts`, `FpsGame.tsx`: snapshot the equipped loadout on entry. XP updates do not recreate the engine. Target health, ammo, handling, armor damage, rewards and callouts use that snapshot. Enter the Armory to change equipment for the next exercise.

47 unit tests cover purchase idempotency, level gates, validation, inventory, attachment slots, actual modified ammo/reload timing, health breakpoints, armor exhaustion, rewards, level boundaries and chain timing, alongside existing world/physics checks. Local Chrome checks cover buying/equipping, preview and skin rendering, persistence, narrow layout, armor damage/defeat/reset, XP/level-up, full drill completion, callouts, mouse confinement, denied capture, Escape/pause, renderer cleanup, no uncaught browser errors and zero map requests. The production build passes with pnpm 11.22.0; the existing Three.js chunk warning remains.

This is a local single-player economy, not an authoritative multiplayer inventory or real-money payment system. Actual mobile-device performance and voice availability vary by browser. No packages or release-age exemptions were added.

## Vehicles in the FPS session

Utility 01 is a driveable 4×4 at the starting promenade. Falcon 01 is a flyable helicopter on a nearby marked pad. Press **E** within interaction distance to enter. Vehicles use a chase camera with mouse free look; the same pointer lock and pause rules remain active. Dismount restores the weapon and preserves ammunition, targets, XP and the equipped loadout.

- **Car:** W/S accelerates or reverses, A/D steers, Space brakes. Maximum forward speed is 72 game km/h. Collision uses the rotating vehicle footprint with small movement steps. Brake below 2 game m/s to dismount.
- **Helicopter:** W/S cruises, A/D yaws, Space climbs, C/Ctrl descends, Shift boosts. Releasing lift stabilizes hover. Land on clear ground and slow down before dismounting. Altitude is capped at 120 game meters. Flight uses simplified obstacle volumes and a body clearance radius; roof interiors, rotor strikes and crash damage are not simulated. Water supports overflight but cannot be used as a landing zone.
- **Wraps:** Motor pool olive, Jungle patrol, Desert convoy, Arctic expedition and Black gold. Unlock once, then equip separately on the car and helicopter. They are cosmetic and use the same XP/level/purchase rules as other shop items.
- **Scope:** vehicles are transport inside the existing target exercise. There is no vehicle combat, fuel system, passenger networking or full flight simulator. Character damage in counter-fire continues to use the player's position rather than the chase camera.

`vehicle-rules.ts` owns movement, clearance and safe exit rules. `vehicle-models.ts` supplies original reusable models and wraps. `fps-vehicles.ts` owns the vehicle instances, pad, labels and transitions. `pnpm test:vehicles` covers shop wraps and the full car/helicopter entry, movement, pause, landing and dismount loop in isolated local Chrome.
