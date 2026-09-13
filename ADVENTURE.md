# Change the adventure — Marina Bay

Marina starts with **Waterfront** as its active objective. The companion accepts typed requests or GPT-Live-1 speech, asks GPT-6 Astra for a structured destination ID, and applies the proposal through the same local game interface. Try “give me something closer”, “take me to the museum”, or “skip this stop”. The HUD names the objective and the minimap marks it purple. Other regions are unchanged.

Visibility pass: the active minimap marker has a large white-rimmed purple diamond, pulsing halo (disabled for reduced motion), destination label and dashed straight-line direction. In the 3D world, `objective-highlight.ts` recolors only the selected collectible and adds a purple/white ground ring, light column and floating pointer. Previous materials are restored on switching; collected/absent objectives hide the decoration. The highlight adds no colliders and does not alter arrival distances or stamp positions. Verification: 74 tests/build plus companion and all three region browser regressions pass.

## Run locally

Use the existing pnpm 11 setup (strict 14-day release cooldown). No new packages were added.

1. Put the event/project key in private `.env`: `OPENAI_API_KEY=...`. It needs access to **gpt-6-astra** and **gpt-live-1**. Never use a `VITE_` prefix for this key. Optional `OPENAI_BASE_URL` is server-only and must support both Responses and Live APIs; models are not silently substituted.
2. In one terminal run `pnpm server` (Node 22.12+ with type stripping; tested on Node 26). It reads `.env`, then optional `.env.local`, and binds to `127.0.0.1:3001`.
3. In another terminal run `pnpm dev`. Vite proxies `/api/adventure/*` to the server. Open `http://localhost:5173` or `http://127.0.0.1:5173`.
4. Click the microphone, allow permission, wait for “listening”, and speak. Click Stop to end it. Starting voice sends microphone audio to OpenAI; generated replies use GPT-Live-1. Submitting text ends voice so old spoken work cannot race the typed request.

Restart the **server** after changing the key. A denied microphone, connection failure, missing key or model error leaves the world and text controls usable. Voice requires HTTPS or localhost; local HTTP on another device is not sufficient. The three-minute voice limit is a small demo spending safeguard. No human microphone recording is saved by the app.

## Boundaries and state

- `src/game/adventure.ts`: small `read`/`begin`/`apply`/`cancel` interface, destination IDs derived from the existing stamp names, immutable snapshots, session/revision/request guards. Player position and collected stamps come from Marina’s existing movement/arrival loop. Objective changes never clear or award stamps.
- `src/lib/adventure-client.ts`: shared text and spoken request path, aborts superseded requests and ignores late responses even if abort is ignored. Only the local apply result can confirm success.
- `server/adventure-api.ts`: exactly two POST endpoints, `/api/adventure/change` and `/api/adventure/voice-session`. Astra uses Responses structured output. GPT-Live uses its own WebRTC session API with client delegation. The key never enters client code, session config returned to the browser, or logs.
- `src/lib/live-voice.ts`: media tracks, transcript deltas, delegation events and verified-result commentary. Transcript fragments alone never execute actions. Playback is muted while awaiting a verified application result. The Live model can paraphrase the result; captions are not proof audio was heard. Stop/reset/unmount releases microphone tracks and closes the session, with a bounded wait for finalization.
- `AdventureCompanion.tsx`: compact history, input, send/microphone controls and processing/error states. Keyboard events stay within the panel; the canvas loses movement focus. Reset creates a new keyed panel/session; changing region unmounts it.

“Closer” is a deterministic Euclidean comparison in authored game coordinates, recalculated at apply time. It excludes collected/current objectives and requires a strictly closer alternative. It is **not** navigable route finding. Museum maps to the existing **Lotus museum** stamp. Unknown, collected or unavailable destinations retain the current objective. Existing proximity checks alone collect stamps; completing the active one chooses another uncollected stop locally.

## Verification

Verified on 2026-09-13: **72 unit tests and the production build pass**. Live Astra typed closer/museum/skip requests changed Marina’s HUD and minimap. A live synthetic spoken “Give me something closer” completed the full GPT-Live transcript → Astra → locally applied City skyline objective → GPT-Live commentary acknowledgment and non-silent, unmuted output-audio flow. Its final spoken caption named City Skyline and distinguished straight-line distance from a walking route. This was automated synthetic input, **not a physical-microphone or human listening-quality test**. Earlier short-fixture runs exposed a stopped synthetic audio clock; the harness now pads the fixture to keep the input stream running. Desktop/mobile screenshots were inspected; API failure, invalid ID, denied microphone and stale-response cases use explicit test mocks.

- `pnpm test` and `pnpm build`: state, collection preservation, stale requests/reset/disposal, validation, structured API payload, missing credentials/origin checks, and voice delegation tests.
- `pnpm test:adventure`: isolated Chrome browser test with mocked API/media transport, no model spending. Tests HUD/minimap, named/closer/skip, typing, API failures, denied microphone recovery, rapid requests, reset, region switch and mobile layout.
- `pnpm test:adventure --live`: first five text requests use real Astra (two learning, three travel); failure/voice checks remain explicitly mocked.
- `node scripts/smoke-adventure-voice.mjs /absolute/path/request.wav`: opt-in live GPT-Live test using a synthetic spoken WAV as input, not a human microphone. Requires a phrase such as “Give me something closer.” Saves ignored diagnostic output under `.cache/browser-checks/`. This spends voice duration plus an Astra call.
- `pnpm test:browser`: existing three-region rendering/movement/camera regression suite.

All browser scripts require a separate local Chrome debugging session on port 9223 and Vite on 5173. Run them serially. The default app has no mock mode or test hooks; test scripts inject mocks into their own isolated tab. Actual-phone microphone and listening quality should be checked manually before the demo.

Final browser rerun passed: companion failure/race/voice-mock/mobile checks plus all three regions’ render, walk, drive, reset, independent camera orbit/recenter and region-switch checks, with no uncaught errors or Google Maps requests. The production build retains its existing nonblocking Three.js chunk-size warning.

## Deployment and safety

`pnpm build && pnpm server` serves `dist` and the two API endpoints on loopback port 3001. For a shared deployment, place it behind an HTTPS reverse proxy and authentication/access control, and explicitly set `ADVENTURE_ALLOWED_ORIGINS` to the browser origin. The origin allowlist, body size bound, four-request concurrency bound and 30-requests/minute limit are demo safeguards, **not authentication**. Do not publicly expose a spending endpoint based only on an Origin header. A static-only deployment still renders the game but cannot power the companion without a backend.

History and progress are in browser memory, not a database; panel history retains the latest 20 messages. Requests send the player’s text/transcript plus game-state snapshot to OpenAI. Server calls use `store: false`; do not interpret this as overriding the provider’s applicable data-retention policy. No Google API requests or cached-image changes are required for this feature.

## Educational guide

The Marina companion also answers educational questions using eight curated topics. Try “tell me about this stop”, “tell me about the museum”, “Marina Bay highlights”, “what is special about Queenstown?” or “tell me about Raffles Place”. These use the same text/voice pipeline, but return a read-only learning card, official source link and reflection prompt. “Take me to the museum” still changes the objective. Stamps are preserved in either case. Other regions are learning topics but do not yet host their own companion panel.

Facts and source links live in `src/data/singapore-guide.ts`, reviewed 13 September 2026 against PUB, Singapore Tourism Board, Gardens by the Bay, Esplanade and National Heritage Board pages. Astra selects only existing topic IDs; it does not write the facts. Unknown topics and questions not supported by the cards (including current hours/prices) receive an explicit limitation, not invented information. Active/nearest game-stop context is supplied, but this is not camera recognition or accurate geographic positioning. Labels distinguish the stylised game from real places.

Educational regression coverage includes source-card rendering, unchanged objectives/stamps, rejected topic IDs, stale/reset results and simulated spoken education. `pnpm test:adventure --live` now starts with five live Astra requests (two educational, then three travel); remaining failure/voice checks are mocked. The prior live synthetic voice test verified the shared transport; educational speech and physical microphone quality still need a human listening check.

Verified educational pass: 79 unit tests and production build passed; live Astra museum/Queenstown questions displayed sourced cards without changing the objective, followed by successful live closer/museum/skip changes. Mocked browser checks passed for educational voice delegation, failure recovery, typing isolation, stale responses and mobile layout. Mobile screenshot review prompted a fix to quick-question button widths.

## Official API references checked during implementation

- [GPT-Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client)
- [Live transcripts and lifecycle](https://developers.openai.com/api/docs/guides/live-conversations)
- [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
