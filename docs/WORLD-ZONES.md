# Connected Singapore districts

The existing Marina Bay, Raffles Place and Queenstown scenes can support an open-world loop built from connected areas. Each district uses its own local coordinates and collision geometry. Load one district at a time and cross an explicit checkpoint to load the next. This keeps rendering and memory costs close to the existing single-scene game on the VM.

The design borrows the connected-area structure of survival shooters. Singapore locations, equipment and world content remain the project's own. The links compress travel distances; they are not a surveyed route between real streets.

## Playing the expedition

Choose **Open world** in the sidebar, then **Enter district**. The expedition starts in the district selected on the Singapore locator, with a copy of your equipped Armory loadout. Marina Bay remains the default selection. WASD moves, Shift sprints, the mouse looks, left click fires, right click aims, and R reloads. E picks up nearby supplies; T crosses a nearby checkpoint. F toggles fullscreen and Escape opens the operator menu. Touch controls sit beneath the scene; drag the scene to look.

The supply scanner lists the nearest remaining crates with their tier, distance and coordinates. The district network and checkpoint guide show connected destinations. Collecting a weapon equips its weapon slot for this expedition; purchased gear and permanent Armory progression remain separate. Leaving the expedition discards temporary gear and its loot seed. The initial expedition is solo; the existing LAN arena is a separate mode.

## Singapore locator integration

The sidebar locator retains its normal click/keyboard region selection outside expeditions. During an expedition, the location cards and map instead select a route destination without unmounting the current scene or clearing loot. The purple current-district marker follows actual checkpoint arrivals; an orange outline marks the planned destination. Dashed links derive from `WORLD_GATEWAYS`, and `findWorldRoute` chooses the fewest checkpoint crossings. Marina-to-Queenstown trips therefore pass through Raffles CBD.

The selected destination displays threat, loot tier, patrol count, the route and the next checkpoint's local coordinates. The expedition HUD prioritizes that checkpoint's distance. Map selection never calls travel: the existing living-player/proximity validation and T interaction still govern transitions. Arriving updates the route from the new district and retains the planned destination. These island-map links represent compressed district connections, not street routing or a live local minimap.

## Local FPS minimap

While playing, the upper-left minimap follows the operator in the current district using its authored roads and collision bounds. The arrow points in the view direction; the map keeps north up. Nearby remaining loot appears as green squares. Gold diamonds show checkpoints; outlined diamonds on the map edge indicate distant exits. The planned route's next checkpoint is highlighted. Loot markers disappear on collection and update from the cached remaining supplies when returning to a district. Each zone uses the same SVG component with different map data; no additional renderer or Google request is created.

## Random supplies

Each expedition gets a fresh seed. Each district rolls its contents and positions once; re-entry reuses the same remaining crates. Weapon rarity is rolled per crate:

| District | Weapon crates | Issued | Field | Elite | Total supplies |
| --- | ---: | ---: | ---: | ---: | ---: |
| Queenstown | 2 | 65% | 30% | 5% | 6 |
| Marina Bay | 3 | 30% | 55% | 15% | 8 |
| Raffles CBD | 4 | 10% | 40% | 50% | 10 |

Other crates contain ammunition for the selected gun, medical supplies or armor plates. Elite odds apply to weapon rolls; a particular visit does not guarantee an elite drop. Supply locations are checked against each district's bounds and obstacles. Colored case labels show item and tier. Pickups require a living player within 2.8 metres; medkits remain available if health is full.

A found weapon replaces its family slot and uses existing catalog stats. Plates equip and replenish their protection pool. Field changes apply to a private profile copy and never award permanent ownership, levels, credits or tokens. Health, armor, selected weapon and ammunition carry across checkpoints. Patrols repopulate when a district is reloaded; picked-up loot does not. No inventory or expedition state is retained after leaving this mode or reloading the browser.

## Zone contract

`src/game/world-zones.ts` is the pure catalog and transition validator. It owns no Three.js resources, browser state, inventory, loot generation or network sessions.

| District | Threat | Loot tier | Patrol preset | Routes |
| --- | --- | --- | --- | --- |
| Queenstown | Low | 1 | 3 assault bots | Raffles Place |
| Marina Bay | Medium | 2 | 4 mixed-role bots | Raffles Place |
| Raffles Place / CBD | High | 3 | 6 mixed-role bots | Marina Bay and Queenstown |

The mixed preset includes the existing heavy and sniper behaviors. These values describe an initial encounter budget, not a guarantee of a particular item drop. Raffles is the contested hub with the most defenders and access to the highest tier. Loot generation consumes this metadata separately.

`WorldZoneId` matches the application's location IDs. `ZoneSpawn` is a ground-level `{x,z,yaw,pitch}` transform; the FPS engine adds eye height. Each zone has several collision-tested `encounterSpawns`. Scene adapters should use the zone's existing `*_BOUNDS`, `moveIn*` function and scene-produced obstacles. Never apply Marina's bounds or movement function to another district.

## Checkpoints

| Route | Departure x,z | Destination arrival x,z |
| --- | --- | --- |
| Marina → Raffles | -103, 94 | 246, 45 |
| Raffles → Marina | 258, 45 | -91, 94 |
| Raffles → Queenstown | -258, 45 | 223, 22 |
| Queenstown → Raffles | 235, 22 | -246, 45 |

These positions lie on the authored Marina inner road, Raffles Market road and Queenstown Commonwealth road. Each trigger has a four-metre radius. Arrival is twelve metres inside the destination's reverse checkpoint and faces into the district, preventing immediate return travel. Marina's checkpoint is roughly 65 metres from its default spawn; crossing the CBD between checkpoints is a longer exposed journey.

Call `findWorldGateway(zone, playerPosition)` to show an interaction prompt. On a deliberate travel input, call `resolveWorldTransition(zone, gatewayId, playerPosition)` again. It returns `{gatewayId,from,to,spawn}` or `null` for an invalid, remote or wrong-zone request. The caller must also require a living on-foot player, stop held fire/movement during loading and prevent overlapping transitions. Proximity does not automatically teleport the player.

## Engine integration

Keep progression, equipped items and field inventory above the scene's lifetime. Snapshot the relevant health, armor and ammunition before unloading; restore that session state after the new scene is ready. Returning to a zone should reuse its cached loot rolls and picked-up state so checkpoint travel cannot reroll supplies. A scene transition must not award practice completion or reset the player's purchased equipment.

Dispose the outgoing scene, avatar geometry, render listeners and pending interactions before mounting the destination. Display a loading state, then require the normal browser gesture to resume pointer capture if scene replacement released it. Never retain three complete scene graphs merely to make transitions appear instant.

The initial combat adapter can run the existing role-based bots with zone-specific collision and spawns in an endless solo session. The pure catalog alone does not add objectives, schedules for unloaded NPCs, faction simulation, persistence across browser restarts or continuous streaming terrain. Those can be added independently after the travel loop works.

LAN currently has a shared arena contract. Multiplayer travel needs host-authoritative zone membership, world/zone IDs on snapshots, a transition acknowledgement and consistent loot claims. A guest must never switch its local scene while remaining in a Marina authority simulation. Keep arena LAN behavior unchanged until that protocol exists, or have the host move the entire party together with an explicit load barrier.

## Validation

`pnpm exec vitest run src/game/world-zones.test.ts` checks reversible graph connectivity, proximity validation, non-finite input rejection, independent returned spawn state and arrival orientation. It builds all three actual scenes, validates checkpoints, arrivals and encounter spawns at 1.35-metre clearance, then flood-fills with each scene's real collision movement to prove those positions are reachable from the authored spawn. Geometry changes that block a route should fail these tests.


Browser verification: `pnpm test:expedition` uses the running app (Vite port 5175, Chrome debug port 9228) for UI, combat inputs, fullscreen, mobile layout and cleanup. `pnpm test:expedition:travel` uses a temporary engine fixture with declared starting locations and vitals (Vite 5175, Chrome 9224); it checks real seeded pickups, live firing, all checkpoint directions, equipment/vitals/ammo carry, collected-crate persistence and renderer disposal. The fixture does not teleport a live player or alter the permanent Armory. Both browser scripts support origin overrides; see their source headers.
