# Driving and FPS feature comparison

Source review after rebasing onto `dbeb858` (2026-09-13). The region Walk/Drive views and the FPS engine share authored scenery and collision data, but use separate controllers and HUDs. The Singapore locator is an island-level district selector/route planner; it is not the local minimap.

| Feature | Region Walk/Drive | Marina FPS practice | Open-world FPS | LAN arena |
| --- | --- | --- | --- | --- |
| Authored districts | All three, selected separately | Marina | All three, connected | Marina |
| Local minimap | Roads, player position, collectible stamps | Missing | Missing; checkpoint distances and supply coordinates only | Missing |
| Island locator | Select region | Select region, leaves FPS | Current district, route destination, threat/loot preview | Select region, leaves session |
| Vehicles | Car in each region; Walk/Drive buttons | Enter/exit car and helicopter | Infantry only | Infantry only |
| Vehicle camera | Drag orbit, auto-recenter while driving | Captured mouse orbit, obstruction avoidance | — | — |
| Speed display | Car speed and explored distance | Car/heli speed, flight altitude | No explored-distance counter | No explored-distance counter |
| Combat/loadout/armor | No | Yes | Yes, temporary found gear | Yes, host-authoritative combat |
| Progression rewards | In-memory stamps | Persistent Armory XP/credits | Temporary loot; no permanent rewards | Session scores; no permanent rewards |
| Bots and roles | No | Static targets and optional counter-fire | Zone-specific role squads | Configurable role squads |
| Zone transitions | Switching region resets its session | No | Validated on-foot checkpoints; health/gear/ammo carry | No shared zone travel |
| Companion and objective guide | Marina: text/voice, learning cards, beacon/minimap target | No | No | No |
| Immersive fullscreen control | No dedicated control | Yes | Yes | Yes |
| Mouse capture | Drag look/orbit | Pointer lock; Escape releases | Pointer lock; Escape releases | Pointer lock; Escape releases |
| Touch controls | Yes | Yes | Yes | Yes |

## Suggested consolidation

1. Extract a shared local minimap using `minimapProjection` and each district's exported roads/bounds. Feed it player position/heading and mode-specific markers: stamps for regional exploration; vehicles/targets for practice; remaining supplies/checkpoints for expeditions. Keep enemy visibility explicit instead of exposing all LAN opponents by default.
2. Share district metadata and map rendering before unifying game controllers. The FPS engine already uses each region's collision adapter; copying Marina coordinates into other zones would be incorrect.
3. Add expedition vehicles with zone-specific spawn/landing data and a vehicle-aware transition checkpoint. Existing FPS vehicle rules and obstacle heights contain Marina-specific assumptions; simply showing them in Queenstown would not provide correct gameplay.
4. Integrate the companion through a typed objective interface for loot/checkpoints. The existing companion selects collectible stamp IDs; it cannot currently issue expedition objectives. LAN travel also needs a host-controlled zone/load acknowledgement protocol.

## Code references

- Region HUD/minimap/controls: `src/components/MarinaGame.tsx`, `QueenstownGame.tsx`, `RafflesGame.tsx`; projection: `src/game/minimap.ts`.
- FPS HUD: `src/components/FpsGame.tsx`; expedition HUD: `src/components/ExpeditionGame.tsx`.
- Shared FPS engine and vehicles: `src/game/fps-engine.ts`, `fps-vehicles.ts`, `vehicle-rules.ts`.
- District locator and checkpoint graph: `src/components/SingaporeMap.tsx`, `src/game/world-zones.ts`.

This is a source-level feature audit, not a claim that the missing parity features have been implemented. Physical UTM mouse delivery and cross-device LAN routing still require user hardware testing.
