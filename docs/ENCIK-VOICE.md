# Encik recorded callouts

The user selected **round 4 candidate 3** on 2026-09-13, ahead of round 4 #1 and round 3 #1. The selected synthetic voice is saved in the ElevenLabs account as **Blockplay Encik — Round 4 Candidate 3**.

The pack contains all **48 existing lines** in `src/game/fps-callouts.ts` (16 events, three variants each). It was generated with Eleven v3, natural stability 0.5, using the selected voice. The subtitle script was preserved exactly. The MP3s total **2,534,088 bytes** and approximately **157 seconds**, at mono 44.1kHz/128kbps. Each clip decoded successfully and passed non-silence and checksum checks; individual delivery remains subject to listening review.

Listen to the complete pack at `/audio/encik/index.html` on the running game server, or open `public/audio/encik/index.html` locally. `src/audio/encik/manifest.json` records each event, variant, exact text, filename, size and SHA-256 checksum. Content hashes in filenames prevent stale browser audio after a clip is replaced.

## Game playback

The shared FPS engine uses these bundled recordings in practice, arena and expeditions, including AI pilot callouts. No ElevenLabs API key or TTS request is needed during play. Audio loads on demand through the existing Web Audio context; at most eight decoded clips remain cached. A higher-priority callout replaces the active clip. Voice mute, sound mute, pause, reset and disposal stop the channel and invalidate pending audio. Captions and the comms history remain available when muted or when a recording fails to load. The former installed-OS-voice fallback has been removed to keep the chosen accent consistent.

## Generation and recovery

- `pnpm voice:batch` prints the plan without requests.
- `pnpm voice:batch --generate` explicitly performs generation using the private `ELEVENLABS_API_KEY`; keep it out of `VITE_` variables.
- The approved selection is pinned in `scripts/encik-batch.mjs`, independently of future auditions. It is verified against the original cached audition before saving the voice.
- Voice creation and every individual clip have permanent attempt markers. Complete clips are reused after checksum verification; failed or interrupted requests stop for inspection rather than automatically retrying. Requests have a five-minute network timeout.
- The current batch cache is `.cache/encik-batch/01a0d406e267/`; saved voice metadata is in `.cache/encik-batch/voice-round4-candidate3.json`. Preserve these caches when resuming generation. They are intentionally ignored by Git and contain no API key.
- Source audio is cached before publishing. The source manifest is written only when all 48 clips have completed. JavaScript imports this manifest from `src`; MP3s and the listening page are served by URL from `public`. The audio and manifest are committed so teammates need neither the private cache nor an ElevenLabs account to play.

Observed batch cost: **776 credits**, matching the sum of the 48 response `character-cost` headers and the subscription delta. Account usage after the batch was **1,266 / 40,000**, including the four auditions. Before/after readings and per-request receipts are in the ignored cache. The quota reserve is an estimate, not a provider-enforced per-request spending cap.

## Verification

`pnpm test` covers exact manifest/subtitle matching, audio checksums, base paths, interruption, late fetch/decode cancellation, mute/context failure and cache bounds. `node --experimental-strip-types --test scripts/encik-audition-check.mjs scripts/encik-batch-check.mjs` tests generation guards with mocked requests and spends no credits. Node test files use `-check.mjs` to avoid Vitest collecting them.

The browser check is `node scripts/encik-playback-smoke.mjs`, using an isolated Chrome debugging endpoint at port 9331 and Vite at 5175 by default (`FPS_CHROME_ORIGIN` and `FPS_APP_ORIGIN` override them). Where the environment proxies Node traffic, set `NO_PROXY=127.0.0.1,localhost` and `no_proxy=127.0.0.1,localhost` for this local check.

API references: [save a designed voice](https://elevenlabs.io/docs/api-reference/text-to-voice/create), [generate speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert), [voice settings](https://elevenlabs.io/docs/api-reference/voices/settings/get-default). Audition history: [ENCIK-AUDITION.md](ENCIK-AUDITION.md).
