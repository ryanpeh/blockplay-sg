# Marina browser screenshot workflow

## Run / resume

```sh
pnpm marina:browser-capture --batch --dry-run
pnpm marina:browser-capture --batch
pnpm marina:usage
```

Edit `reconstruction/marina-browser-plan.json` to choose views, camera settings, purpose and maximum new screenshots per run. Current batch: eight views across four already-reviewed panorama centers. Group views by source to reuse the same panorama between headings. Only reviewed sources are allowed; add deliberately reviewed metadata to the source allowlist before expanding coverage. These screenshots provide appearance references, not new photogrammetry camera positions.

Fresh capture needs Vite, `GOOGLE_MAPS_DEMO_API_KEY`, and local Chrome debugging as described in `README.md` here. The runner opens/closes its own tab. It verifies the configured demo key, blocks Static endpoints, waits for panorama status and tile-network settling, keeps attribution/date, and records each screenshot and panorama change separately. It does not enumerate unbounded navigation links or auto-retry failures.

Cache preflight happens before opening a browser. PNGs have per-view JSON manifests with camera settings, source date/coordinates, checksum, dimensions, timing and visual review. Changing settings under an existing ID fails rather than overwriting a capture; use a new view ID. Interrupted batches resume from completed pairs. If a PNG exists without a manifest, inspect/recover it manually—don't silently redownload.

`maxNewImages` is a **per-run operational safeguard**, not the user's Static API allowance. Browser screenshots do not consume that allowance. The script validates IDs/paths, camera ranges and batch size before network access.

## Measured performance — 2026-09-13

| Metric | Fresh batch | Complete-cache rerun |
| --- | ---: | ---: |
| New screenshots | 8 | 0 |
| Cache hits | 0 | 8 |
| Panorama load/change reservations | 4 | 0 |
| Static API requests | 0 | 0 |
| Failures | 0 | 0 |
| Runtime (inside script) | 21,826ms | 33ms |
| New PNG bytes | 11,954,805 (~11.4 MiB) | 0 |

Fresh output averaged 2.73s/image including setup. This is a local browser/session measurement, not a cold-machine or billing benchmark. The reused panorama object reduces initialization; panorama changes are counted conservatively, not claimed as exact billable SKU events.

Reports: `reports/marina-detail-batch-01-2026-09-13T03-47-18.597Z.json` (capture), `reports/marina-detail-batch-01-2026-09-13T03-48-04.182Z.json` (cache). Future runs create timestamped reports and refresh the local `marina-detail-batch-01-gallery.html` contact sheet. Open it via Vite or directly from disk; it loads only cached images.

All eight frames were visually reviewed. Attribution and dates remain visible; no blank/loading frame or development dialog was seen. Detail is useful for modeled facades, paving, palm/tree pits, museum supports, canopy, road/curbs and skyline silhouettes. Museum/fullerton shots are close-ups, and the streetscape has a partly occluding column. Imagery dates vary (2012/2021/2022); screenshots are not calibrated scale or current conditions. More pixels do not guarantee more original panorama detail.

## Budget semantics — corrected per user

- Additional **Static API images**: 15 of 50 used, **35 left** (baseline 8 historical images).
- Static image downloads total: 23. Static metadata: 7. Local conservative Static cap: 30/1000, **970 left**; metadata remains included conservatively even though Google's image quota excludes it.
- Browser captures: 9 screenshots total, 5 panorama load/change reservations. Maps JS selections: 4. These **do not reduce either Static cap**; retain them separately in the ledger for visibility into browser use.
- Ledger has 48 total events, not 48 Static calls. No counters were reset. Browser use may have its own Dynamic Street View billing.

All 20 unit tests and production build pass. Tests cover shared-ledger exclusions, exhausted Static cap with browser capture still allowed, batch validation, per-run screenshot bounds, cache fingerprints/checksums and floating-point camera tolerance.
