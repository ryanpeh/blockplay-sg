# FPS on all three maps

Select Marina Bay, Queenstown or Raffles Place, then choose **Marina FPS**, **Queenstown FPS** or **Raffles FPS**. Each range uses the selected authored map, eight targets, the same weapon/loadout system, optional counter-fire, XP/rewards, Encik recordings, minimap, debug health controls and fullscreen. Each has its own parked car and helicopter.

Changing regions while in a practice FPS session starts a fresh range on the newly selected map. Permanent equipment and progression remain in the shared armory. Opening the shop and deploying returns to the selected region. Selecting the current region again does not restart the session. Open-world checkpoint travel retains its existing session behavior. LAN/solo arena matchmaking still uses Marina; district practice does not change the multiplayer map protocol.

## Shared implementation

- `fps-districts.ts` supplies map labels, spawn/orientation, target positions, vehicle parking and range props. Marina retains its original range layout.
- `district-world.ts` builds the selected scene with its movement/collision adapter and bounds. Expedition's existing import forwards to the same factory.
- `FpsGame` and `fps-engine.ts` use that district configuration for scene creation, reset, target orientation, minimap markers, completion and pilot waypoints. Map switching disposes the previous engine instead of keeping multiple renderers alive.
- Vehicle creation, driving, flight and dismounting accept regional spawns/bounds; existing callers retain Marina defaults. Queenstown/Raffles flight clearance is computed once from visible mesh bounds, including individual instances, so towers and elevated structures have height. This is conservative static clearance geometry; it is not a moving-object physics system.

## Verification

`fps-districts.test.ts` builds all three authored scenes and checks spawn/target clearance, target sightlines, vehicle parking/exits, regional bounds and instanced flight obstacles. Existing world-zone and vehicle tests cover transition compatibility and Marina defaults.

`pnpm test:fps:districts` checks selected-map entry, map switching without dropping FPS mode, same-map armory return, local minimap, captured mouse aiming/fire, all eight targets on each map, and scene cleanup. `node scripts/fps-district-vehicles-smoke.mjs` checks human movement, car drive/brake/dismount, helicopter takeoff/landing, airborne exit prevention, fullscreen and mobile width on the new maps. Both use Vite 5175 and isolated Chrome debugging port 9331 by default. Local proxy environments may need `NO_PROXY=127.0.0.1,localhost` and the lowercase equivalent.

An exploratory AI-pilot run stalled at five of eight Queenstown targets. Direct mouse input subsequently cleared all eight on every map; do not treat that pilot run as successful autonomous completion. The pilot's aiming/reacquisition limitation remains separate follow-up work.
