# Evidence verification record

Reviewed 13 September 2026, against application commit `ecf5469721b2f9adcc012407a99096aded083655`. Documentation/rendering files were added afterward. Existing demo artifacts were left untouched.

The team reports that the deadline was extended to end of day on 13 September. This review does not establish the exact submitted revision.

## Current checks

| Command | Outcome | Scope |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run src/game/adventure.test.ts src/lib/adventure-client.test.ts server/adventure-api.test.ts src/game/learning-guide.test.ts src/lib/live-voice.test.ts` | 36 tests passed across 5 files, 19:07 SGT | Local behavior; API/media dependencies use test doubles. |
| `node node_modules/vitest/vitest.mjs run server/native-import.test.ts server/adventure-security.test.ts` | 11 tests passed across 2 files, 19:07 SGT | Includes actual native Node import of the server graph; no live API calls. |
| `node node_modules/vitest/vitest.mjs run src/game/drive-camera.test.ts src/game/capture-readiness.test.ts src/game/marina-scene.test.ts src/game/queenstown-scene.test.ts src/game/raffles-scene.test.ts` | 19 tests passed across 5 files, 19:26 SGT | Camera orbit, capture readiness, regional scene structure, road clearance and collectible reachability; [run output](world-tests.txt). |
| `node docs/evidence/capture-project-evidence.mjs` | Three scene renders produced and visually inspected; Raffles framing refined with the `raffles` argument | Existing Three.js builders, documentation cameras, no new Google imagery. |

Render settings and the settings-file write time are recorded in [render-settings.json](render-settings.json). Individual render capture times were not retained; the shared timestamp is not a per-image capture timestamp. The images expose the current geometry with fixed cameras and animation time zero. They are not player-camera screenshots, evidence of traversability, or outputs from a reconstruction model. No geometry was edited to improve these comparisons.

The selected original source images were inspected with their metadata. Their accepted review status, source dates, and attribution are retained in the linked cache. “Accepted” means useful for the stated visual features, not a guarantee of geometric accuracy.

The public URL is taken from README. The web tool could not open it during this review; the URL is not newly verified. The project guide describes that deployment as game-only.

Documentation validation: local links in the build-story, engineering, visual-understanding, verification and review documents resolve; all six source/render SHA-256 hashes match the provenance manifest. The capture script passes `node --check`, and `git diff --check` reports no whitespace errors. External source links and the public app were not validated by these filesystem checks.

## Historical reports, not rerun here

[ADVENTURE.md](../../ADVENTURE.md) records earlier live typed requests, synthetic-audio GPT-Live tests, browser checks, and builds. Those statements are historical reports with their own limitations. In particular, a synthetic audio test is not a physical-microphone or human listening-quality test. Some early model references in that document predate the switch to Luna.

The earlier demo recording in this workspace captured real local text responses, but it is not evidence that the latest server revision is deployed. No demo footage, narration, or script was changed for this documentation task.
