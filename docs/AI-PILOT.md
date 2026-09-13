# AI pilot and strategy plugins

The pilot controls the player's infantry slot in practice, arenas and expeditions. Click **Watch AI play**. **Take control** requests normal pointer capture; **Stop AI** or Escape pauses. Watching needs no mouse capture. In an expedition, select a destination on the island map: the pilot follows the displayed checkpoint route and resumes after district loading with its carried equipment and selected strategy.

## Local and LLM strategies

**Local planner** works offline. It chooses combat, resupply, travel or exploration from current observations. A 10 Hz controller turns, aims, shoots, reloads, switches weapons, moves and interacts through the same engine functions as human input. ADS engages after alignment, retains the current visible target and holds steady while the sight rises. If the scope continues hiding the target, the controller reacquires at hip level and suppresses ADS for three seconds so it can complete a burst without cycling the sight. It never fires or tracks a target while that target is hidden.

**LLM strategist** chooses a high-level goal and optional known waypoint. The local controller keeps running while requests are pending and handles immediate visible threats. Requests are throttled to one per ten seconds with one outstanding request. Plans expire after twenty seconds; missing waypoints, errors and unavailable service fall back to local planning. Pause, respawn, strategy changes and zone disposal cancel outstanding plans.

To try it, configure private `OPENAI_API_KEY` in `.env.local`, run/restart `pnpm server`, and run `pnpm dev` in another terminal. Select **LLM strategist**, then **Watch AI play**. `PILOT_MODEL` optionally overrides the server's `gpt-5.6-luna` default. No key is needed for the local planner. The static public demo needs a separately hosted compatible backend for this option; otherwise it falls back locally.

The server uses the Responses API with [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) to constrain `{ goal, waypointId, summary }`. The UI displays the current plan or fallback reason. Only the server holds credentials; this feature sends the pilot's public observation to the configured model endpoint when selected.

## Information and controls

`fps-pilot-perception.ts` exposes on-screen, line-of-sight checked contact bearings and apparent size, accounting for scene occlusion and the weapon's viewing aperture. It does not expose enemy world coordinates, health, hidden actors or collision maps. Own vitals/ammo/pose, current prompts and waypoints already shown on the HUD/minimap are available. This is structured game perception, not a screenshot vision model.

`PilotAction` permits held movement/aim/fire, bounded relative look deltas, reload, jump, weapon selection, pickup and checkpoint interaction. The pilot may also request `contact`, `moving` or `stuck` radio callouts; the shared radio director applies cooldowns and selects an Encik line. Reload, kill and other action events produce the same radio feedback as human actions. It cannot teleport, grant ammo or directly apply damage. The server independently whitelists observation fields before sending a strategy request.

## Extension points

- `fps-pilot.ts`: observation/action contracts and local action controller. Pass a `PilotPlanner` to `createPlayerPilot` to replace synchronous goal selection.
- `pilot-strategy-contract.ts`: async `PilotStrategy` interface. Implement `plan(observation, signal)` returning a valid `PilotPlan`; respect cancellation and use only observation data.
- `pilot-strategy.ts`: `createStrategyPlanner` adapts an async strategy to a synchronous planner with throttling, expiry, cancellation and fallback. Exported `localPilotStrategy` and `llmPilotStrategy()` implement the same plugin contract.
- `createFpsEngine(..., { playerPilot })`: accepts a custom `PlayerPilot` with `decide` and `reset`. An async adapter's reset should be called from the injected pilot's reset as well as its controller reset. The UI strategy selector restores a built-in controller when changed.

Existing squad NPCs still use their separate role plugins. They have not been migrated to this player perception/control contract. Persistent NPC identities, saved lives and full pathfinding are future work. Current navigation follows known waypoints and recovers from bumps; complex obstacles can still defeat it. The pilot does not drive vehicles.

## Verification

Run `pnpm test` and `pnpm build`. With Vite at `127.0.0.1:5175` and an isolated Chrome profile exposing DevTools on port 9228, run:

```sh
NO_PROXY='*' no_proxy='*' pnpm test:fps:pilot
NO_PROXY='*' no_proxy='*' pnpm test:fps:pilot:travel
```

Override `FPS_APP_ORIGIN` and `FPS_CHROME_ORIGIN` for other ports. The range check covers all eight targets, stopping and pointer-locked takeover. The travel fixture declares a starting position near a real checkpoint and seeded weapon crate, then verifies autonomous pickup, travel and resumption with one renderer. These checks need no model key or external map requests.
