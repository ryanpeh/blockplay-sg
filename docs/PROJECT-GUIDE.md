# blockplaySG project guide

[Back to README](../README.md) · [Play the public demo](https://blockplay-sg.qwertz0808.chatgpt.site)

## Game modes and controls

### Regional exploration

Select Marina Bay, Queenstown or Raffles Place to open its walk/drive world. The Singapore locator highlights your selection; each region has a local minimap.

| Region | Approximate game extent | Collectible stamps |
| --- | --- | --- |
| Marina Bay | 726 × 616 units | 14 |
| Queenstown | 520 × 424 units | 8 |
| Raffles Place | 580 × 399 units | 11 |

Marina includes waterfront landmarks, gardens and road circuits. Queenstown includes HDB blocks, void decks, shops and an elevated station. Raffles Place includes office towers, plazas, shophouses and riverfront streets.

- **Walk:** click the scene, use WASD to move, drag to look and Shift to run.
- **Drive:** W/S accelerates or reverses, A/D steers and Space brakes.
- **Car camera:** drag to orbit without steering. While moving, releasing the drag gently returns the camera behind the car; parked views stay where you leave them.
- **Stamps:** approach orange rings to collect them. Switching Walk/Drive preserves stamps; resetting or leaving the region clears the session.

Water and buildings block movement. Layouts are deliberately compressed and handling is arcade-style. Distances are game coordinates, not surveyed distances. Playing these worlds makes no Google API requests.

### Marina FPS and armory

Select Marina Bay → Marina FPS → Enter range. Practice against eight targets, with optional counter-fire.

WASD moves, mouse looks, left mouse fires, Q toggles aim, right mouse holds aim, R reloads and 1/2 switches weapons. Shift sprints, C crouches and Space jumps. Escape pauses and releases the pointer. Desktop play requires pointer capture; touch devices use drag-look controls.

Tap **Q** once to aim and again to lower the scope; left-click fires while aim stays toggled on. This works with a trackpad without holding two buttons. Holding Q does not repeatedly toggle. You can also hold right mouse to aim or use the on-screen Aim button. Reloading, switching weapons, pausing and handing control to/from the AI clear toggled aim. The human toggle is ignored while the AI pilot is running; its direct aim commands are unchanged. The issued SAR 21 uses its integrated 1.5× picture-in-picture sight with an etched reticle and unzoomed peripheral vision. In the armory’s Attachments tab, the 350 CR red-dot conversion replaces the scope and bridge with a rail-mounted 1× reflex sight. Removing the optic attachment restores the integrated sight. The level-2 precision lens kit uses 1.75× PiP; only one optic attachment can be equipped per weapon. Shop previews and gameplay use the same optic model. PiP uses one reusable 384×384 render target and renders only while aiming; red dots use no extra world pass. Reloads animate a magazine swap and gloved hands; empty reloads add a chambering gesture. Sustained fire builds real shot spread and widens the hip-fire crosshair. Releasing the trigger lets accuracy recover; aiming and crouching tighten the cone. White hit markers confirm hits; amber marks confirm eliminations.

In the ready/pause menu, open **Debug survival** for 1×, 5× or 10× maximum health, a health refill, and optional regeneration (10% of maximum HP per second after three seconds without damage). These tab-local settings persist through zone changes and apply to practice, solo bots and expeditions. Network rooms keep their normal health rules.

**Encik radio** adds Singaporean callouts for combat, reloads, low health/ammo, supplies and AI movement. The pilot can request contact and stuck callouts through its action interface. Voice uses an installed local English voice (Singapore English preferred); **Encik on/off** mutes only speech, with subtitles retained. The existing sound mute silences speech too. No API key is needed.

The **Comms log** retains the latest 100 speech, kill and supply/travel entries. Filter All / Speech / Kills / System, expand to browse history, or scroll up without incoming messages pulling you back down. Expedition travel carries the log into the next district; restarting a round clears it. It is a local session log, not player text chat.

Use Fullscreen or F for immersive play. A denied fullscreen request falls back to an expanded viewport.

**Watch AI play** lets a local controller operate your character in practice, solo arena or expeditions. **Take control** returns to mouse capture; **Stop AI** or Escape pauses it. Choose Local planner for offline play, or LLM strategist for optional server-backed goals. Select an expedition destination on the island map to give it a checkpoint route. See [AI pilot and strategy plugins](AI-PILOT.md) for setup and limitations.

Approach Utility 01 or Falcon 01 and press E to enter or exit. Drive with WASD and Space brake; fly with WASD, Space climb, C/Ctrl descend and Shift boost. Land before leaving the helicopter.

The armory is accessed from Marina FPS, not regional exploration. It includes equipment, attachments, armor and cosmetic vehicle wraps. Purchases, equipped loadouts, credits and XP persist in this browser. There are no real payments. See [armory details](ARMORY.md).

### Open world and solo arena

**Open world** connects all three districts through checkpoints. E collects supplies and T crosses a nearby checkpoint. Temporary gear, health and ammo carry between districts; permanent armory purchases remain separate. The island locator previews routes and threat/loot tiers without resetting the expedition. See [zones and loot](WORLD-ZONES.md).

**Solo arena** runs locally against up to six bots with mixed, assault, tank or sniper compositions. The full local build labels this entry **LAN arena**; choose **Solo vs bots** inside it. Multiplayer host/join requires the separate LAN server.

FPS modes share a lightweight local minimap using regional road data: practice shows targets and parked vehicles, expeditions show loot/checkpoints, and LAN hides opponents. Regional collectible maps and companions remain separate. Expedition and arena modes are infantry-only; cars and helicopters are available in FPS practice. See [mode comparison](FEATURE-PARITY.md).

## Local setup

Use Node 22.12+ and pnpm 11.22.0, pinned in `package.json`.

```sh
pnpm install
pnpm dev
```

If pnpm is unavailable, use `npx --yes pnpm@11.22.0 install` and `npx --yes pnpm@11.22.0 dev`.

`pnpm-workspace.yaml` enforces a two-week dependency cooldown (`minimumReleaseAge: 20160`), with strict checking and no exemptions. Preserve this configuration and the lockfile.

### Optional AI companions

Read [companion abuse protections](COMPANION-SECURITY.md) before exposing an AI endpoint publicly. Validation and process-local rate limits do not replace authentication or durable spending controls.

These are **not enabled in the public game-only demo**.

Set private `OPENAI_API_KEY` in `.env` or `.env.local`, then run `pnpm server` alongside `pnpm dev`. The server reads those files; Vite proxies `/api/adventure/*` to `127.0.0.1:3001`. Restart the server after changing credentials and restart Vite if its proxy configuration is stale.

The key needs access to **gpt-5.6-luna** for request interpretation and **gpt-live-1** for voice. Never put an OpenAI secret in a `VITE_*` variable or browser code.

- **Marina 3D:** “give me something closer”, “take me to the museum” and “skip this stop” change an existing objective and its HUD/minimap/in-world highlight. Stamps are preserved.
- **All three regional worlds:** educational questions select from 18 curated, source-linked learning cards. Queenstown and Raffles Place guides are education-only.
- **Voice:** requires microphone permission and HTTPS or localhost. Plain HTTP at another computer’s LAN address is insufficient. Audio failure leaves text usable.

“Closer” uses deterministic straight-line distance, not navigable route finding. Local game logic validates destination IDs, checks arrival and rejects stale responses after resets or region changes. See [companion architecture and tests](../ADVENTURE.md).

### Optional LAN multiplayer

```sh
pnpm lan
```

This builds the app and serves it on port 4173. Players open the same server URL, then host or join a room. Matches support up to four humans and six bots, using WebRTC with host-authoritative combat.

This is intended for a trusted local network, without Internet matchmaking, external STUN/TURN or host migration. Firewall rules and Wi-Fi isolation can block peers. See [LAN setup and role plugins](LAN-ARENA.md).

The LAN and companion servers are separate. Neither automatically proxies the other.

### Optional Street View

The live viewer is separate from the authored worlds and is disabled in the public demo.

1. Enable Maps JavaScript API in a Google Cloud project with billing.
2. Restrict a browser key to the required APIs and your localhost/deployment referrers.
3. Set `GOOGLE_MAPS_DEMO_API_KEY` in `.env` or `.env.local`. The viewer falls back to `VITE_GOOGLE_MAPS_API_KEY` if it is absent.
4. Restart Vite and select Street View.

These Google browser keys are exposed to the client by design; referrer/API restrictions matter. Static capture scripts use only the Static-enabled `VITE_GOOGLE_MAPS_API_KEY`. Never reuse this browser configuration for private server secrets.

The viewer retains Google controls, dates and attribution. Panorama availability and exact positions are not guaranteed. See [Google Street View documentation](https://developers.google.com/maps/documentation/javascript/streetview).

## Reference images and model work

The worlds use authored solid geometry informed by cached street-level images. They are not automatic photo reconstructions. The earlier four-photo depth experiment is retained but inactive under `public/reconstruction/marina-bay/`.

Each region’s references are under `reconstruction/<region>/references/`. Transfer these caches between computers to avoid repeating requests. Keep attribution, camera settings, checksums and review notes alongside images.

```sh
pnpm references:inventory
pnpm marina:usage
pnpm marina:browser-capture --batch --dry-run
pnpm references:static --plan reconstruction/marina-static-quality-plan.json --dry-run
```

Browser capture requires Vite and Chrome remote debugging on loopback, default port 9223. Regional batches accept `--plan reconstruction/raffles-browser-plan.json` or `--plan reconstruction/queenstown-expansion-browser-plan.json`. Static quality plans also exist for Raffles Place and Queenstown.

Remove `--dry-run` only when intentionally fetching missing references. Complete caches are reused. Browser captures block Static endpoints, but browser Street View may have separate billing.

Run captures serially and keep the capture tab foregrounded. Do not run browser smoke checks during capture: metadata can change before pixels repaint. Successful capture still needs visual review.

See [capture history](../reconstruction/README.md) and the [Marina workflow](../reconstruction/marina-bay/references/WORKFLOW.md). Static authorization and usage limits belong in [PLAN.md](../PLAN.md) and the usage ledger.

## Testing

FPS handling checks use an isolated Chrome with remote debugging on port 9228 and Vite on 5175: `pnpm test:fps:handling` and `pnpm test:fps:survival`. Set `FPS_APP_ORIGIN` to the VM’s HTTP LAN address to verify startup outside localhost. The survival check creates a zero-bot fixture through the engine’s public API, then verifies authoritative boosted health, regeneration, refill and reset.

```sh
pnpm test
pnpm build
pnpm build:sites
```

The production build has a nonblocking large-chunk warning for the game/Three.js bundles.

Browser checks require a running app and a separate Chrome profile with remote debugging. Run them serially; some reset the demo armory save on the test origin. Do not use a personal browser profile.

| Checks | App / Chrome defaults | Notes |
| --- | --- | --- |
| `pnpm test:browser` | 5173 / 9223 | Regional rendering, movement, camera, resets and mobile layout |
| `pnpm test:adventure` | 5173 / 9223 | Mocked companion, voice, failure and race checks |
| `pnpm test:fps`, `test:armory`, `test:vehicles`, `test:fullscreen` | 5175 / 9224 | Override with `FPS_APP_ORIGIN` and `FPS_CHROME_ORIGIN` |
| `pnpm test:arena:solo`, `test:expedition` | 5175 / 9228 | See script headers for origin overrides |

Use the normal development build for full-feature browser checks; the Sites build intentionally disables online features. `pnpm test:adventure --live` spends real model credits for text checks; other failure/voice checks remain mocked. Actual microphone and listening quality need human verification.

LAN transport/multiplayer and checkpoint-travel checks have separate prerequisites in [LAN documentation](LAN-ARENA.md) and [Open world documentation](WORLD-ZONES.md). Browser diagnostics are saved under ignored `.cache/` folders. If a VPN proxies localhost, set `NO_PROXY=127.0.0.1,localhost`.

## Deployment

### Current GPT Sites demo

The [public deployment](https://blockplay-sg.qwertz0808.chatgpt.site) contains solo gameplay only.

`pnpm build:sites` emits `dist`; `.openai/hosting.json` identifies the existing Site and its static output. The build disables AI companions, host/join and Street View, and deliberately excludes the local Google browser key. Do not include `.env` files or server secrets in an archive.

Reuse the existing Site when publishing updates. Save and deploy output built from the exact source revision pushed to Sites. GitHub pushes alone do not update the live game. New Sites start private; this project’s audience was explicitly changed to public. Preserve that audience unless asked to change it.

Adding a key alone does not enable AI here: the companion backend must first be adapted to the Sites runtime, configured with server-only secrets and re-enabled in the client.

### Other hosts

For the same game-only experience, install with `pnpm install --frozen-lockfile`, build with `pnpm build:sites` and publish `dist`. Use the normal `pnpm build` when intentionally configuring the optional integrations.

For a full companion deployment, `pnpm build` then `pnpm server` serves assets and the two companion endpoints on `127.0.0.1:3001`. Put it behind an HTTPS reverse proxy with authentication/access controls and an explicit `ADVENTURE_ALLOWED_ORIGINS` value. The origin and rate checks are not authentication.

To serve companions and LAN from one origin, route `/api/adventure/*` to the companion server and `/api/lan/*` to the LAN server. Add any Street View deployment origin to the Google key’s allowed referrers and rebuild after changing browser variables.

## Code map and persistence

- `src/App.tsx`: region/mode selection and session transitions.
- `src/components/*Game.tsx`: game views and HUDs; `SingaporeMap.tsx`: island locator.
- `src/game/*-scene.ts` and `*-collision.ts`: authored worlds and deterministic collisions.
- `src/game/fps-engine.ts`: shared FPS rendering/input; `arena-*.ts`: bots and match rules.
- `src/game/world-zones.ts`: district/checkpoint graph.
- `src/components/AdventureCompanion.tsx`, `RegionGuide.tsx`: companion panels.
- `src/game/adventure.ts`, `learning-guide.ts`: objective and read-only guide adapters.
- `src/data/*-guide.ts`: curated facts and source links.
- `src/lib/deployment.ts`: game-only build switch.
- `server/`: private companion API; `scripts/lan-server.mjs`: LAN signaling/static server.
- `public/models/field-kit/`: original GLB assets; `asset-pack/`: editable art sources.

Stamps, conversations, expedition loot and arena scores are session-only. Armory credits, XP, ownership and equipped loadouts persist in browser local storage. There are no accounts, cloud saves or persistent online leaderboards.

See [PLAN.md](../PLAN.md) for experiments and future work, and [HANDOFF.md](../HANDOFF.md) for continuing on another computer.
