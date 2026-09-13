# Evidence verification record

Reviewed 13 September 2026, against application commit `ecf5469721b2f9adcc012407a99096aded083655`. Documentation/rendering files were added afterward. Existing demo artifacts were left untouched.

The team reports that the deadline was extended to end of day on 13 September. This review does not establish the exact submitted revision.

## Raffles refinement verification (13 September, approximately 20:12–20:16 SGT)

The new [Raffles refinement](../raffles-refinement.md) changes scene code after baseline `19ba0c7`; the earlier checks below describe their original revisions.

- Full Vitest suite: **200 tests across 41 files passed**; TypeScript compilation and Sites production build passed. Existing >500 kB bundle warning remains. [Tests](raffles-refinement/tests.txt) · [Build](raffles-refinement/build.txt).
- `node scripts/smoke-regions.mjs`: all three regions passed render/walk/reset/drive, independent camera trajectory, orbit/recenter, mode and region switching, and mobile-width checks; zero Google Maps requests and no uncaught errors. [Browser output](raffles-refinement/browser.txt). These are local checks, not public deployment verification.
- Static capture: **25/25 new Raffles images saved**, zero failures, zero metadata requests. All opened for direct visual review: 23 accepted for stated details and two limited. A cache-only preview reports 25 cached, zero new requests.
- `node scripts/reference-inventory.mjs`: **310 images**, no invalid entries. Capture history retained; total conservative Static attempts 130/1000. Newly authorized allowance exhausted.
- Before/after images use identical camera, lighting and animation settings; visual inspection confirms the two window bands and trim correction. Original reference/render hashes and new refinement artifact hashes were checked against files.

No demo video, narration or script changed. Live companion API calls and the public deployment were not reverified.

## Latest verification rerun

After the README workflow clarification and visual-iteration context were added, checks were rerun on 13 September 2026 at approximately 19:49 SGT, with application code unchanged from `ecf5469` and documentation based on `694880b` plus working-tree edits:

- `node node_modules/vitest/vitest.mjs run`: **200 tests passed across 41 files**.
- `node node_modules/typescript/bin/tsc -b` and `node node_modules/vite/bin/vite.js build --mode sites`: passed; the existing warning about chunks larger than 500 kB remains.
- `node scripts/reference-inventory.mjs`: all **285 cached images** checked, with no invalid entries.
- README and the five evidence documents: **77 local file links resolve**; link fragments and external URLs were not checked.
- All six reference/render image hashes match the manifest; capture helper syntax and `git diff --check` pass.

This rerun made no live model requests or new image captures and did not verify deployment or browser gameplay.

## Earlier focused checks

| Command | Outcome | Scope |
| --- | --- | --- |
| `node node_modules/vitest/vitest.mjs run src/game/adventure.test.ts src/lib/adventure-client.test.ts server/adventure-api.test.ts src/game/learning-guide.test.ts src/lib/live-voice.test.ts` | 36 tests passed across 5 files, 19:07 SGT | Local behavior; API/media dependencies use test doubles. |
| `node node_modules/vitest/vitest.mjs run server/native-import.test.ts server/adventure-security.test.ts` | 11 tests passed across 2 files, 19:07 SGT | Includes actual native Node import of the server graph; no live API calls. |
| `node node_modules/vitest/vitest.mjs run src/game/drive-camera.test.ts src/game/capture-readiness.test.ts src/game/marina-scene.test.ts src/game/queenstown-scene.test.ts src/game/raffles-scene.test.ts` | 19 tests passed across 5 files, 19:26 SGT | Camera orbit, capture readiness, regional scene structure, road clearance and collectible reachability; [run output](world-tests.txt). |
| `node docs/evidence/capture-project-evidence.mjs` | Three scene renders produced and visually inspected; Raffles framing refined with the `raffles` argument | Existing Three.js builders, documentation cameras, no new Google imagery. |

Render settings and the settings-file write time are recorded in [render-settings.json](render-settings.json). Individual render capture times were not retained; the shared timestamp is not a per-image capture timestamp. The images expose the current geometry with fixed cameras and animation time zero. They are not player-camera screenshots, evidence of traversability, or outputs from a reconstruction model. During the original comparison pass, no geometry was edited. The subsequent Raffles refinement changed one facade and replaced its comparison image; the original before render and matching after render are preserved in the [refinement record](../raffles-refinement.md).

The selected original source images were inspected with their metadata. Their accepted review status, source dates, and attribution are retained in the linked cache. “Accepted” means useful for the stated visual features, not a guarantee of geometric accuracy.

The public URL is taken from README. The web tool could not open it during this review; the URL is not newly verified. The project guide describes that deployment as game-only.

Documentation validation: local links in the build-story, engineering, visual-understanding, verification and review documents resolve; all six source/render SHA-256 hashes match the provenance manifest. The capture script passes `node --check`, and `git diff --check` reports no whitespace errors. External source links and the public app were not validated by these filesystem checks.

## Historical reports, not rerun here

[ADVENTURE.md](../ADVENTURE.md) records earlier live typed requests, synthetic-audio GPT-Live tests, browser checks, and builds. Those statements are historical reports with their own limitations. In particular, a synthetic audio test is not a physical-microphone or human listening-quality test. Some early model references in that document predate the switch to Luna.

The earlier demo recording in this workspace captured real local text responses, but it is not evidence that the latest server revision is deployed. No demo footage, narration, or script was changed for this documentation task.
