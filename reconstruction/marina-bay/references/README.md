# Cached Marina Bay references

**Latest:** use the [batch workflow and benchmark](WORKFLOW.md). Eight additional browser captures completed successfully; all are cached and visually reviewed. Browser screenshots do **not** consume the user's Static API allowance: **15/50 Static images used, 35 remain**. Browser use is tracked separately. Any older combined-budget figures below are historical and superseded. Run `pnpm marina:browser-capture --batch --dry-run`, then `pnpm marina:browser-capture --batch` to resume; complete-cache reruns make no requests.

## Browser/demo-key capture

An additional `north-bay-browser-h160-p15-z1.png` is a reviewed **1280×900 browser screenshot** using `GOOGLE_MAPS_DEMO_API_KEY`. It shows the Sands towers, Shoppes roof and museum pond/promenade, retaining Google's attribution and February 2012 date. No Static API request was made. Its JSON records actual panorama/POV/zoom, dimensions, checksum and visual review.

Use `pnpm marina:browser-capture`. On a complete cache, it verifies the checksum and returns before any browser or network work. For a fresh capture:

1. Configure `GOOGLE_MAPS_DEMO_API_KEY` for Maps JavaScript API and the local referrer, then start/restart Vite. Vite explicitly maps this browser key for the viewer; Static scripts use the original key independently.
2. Start Chrome with a dedicated profile and remote debugging bound to loopback, for example Chrome's `--remote-debugging-port=9223 --remote-debugging-address=127.0.0.1 --user-data-dir=<dedicated-local-profile>` launch arguments. Use your OS's Chrome executable. Do not expose the debug port publicly or use your everyday profile.
3. Run the command. Defaults: Vite at `http://127.0.0.1:5173`, Chrome at `http://127.0.0.1:9223`. Override with `MARINA_APP_ORIGIN` and `CHROME_DEBUG_ORIGIN` if needed. It opens/closes its own tab, blocks Static endpoints and preserves attribution. Inspect every new result before accepting.

Current totals: **16/50 additional images used (15 JPEGs + 1 PNG); 34 remain**. Ledger: 36 conservative entries, including 23 Static images, 7 Static metadata, 4 Maps JS selections, 1 browser panorama load and 1 local screenshot reservation. Screenshot reservations are not Google API calls; [Dynamic Street View has separate billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing). These supersede the pre-browser figures below.

## Earlier Static references

15 JPEGs saved during the 2026-09-13 color/detail pass: one preview and four cardinal headings at each of three Google-selected panorama centers. These authorized reference images and their metadata are intentionally **not ignored by Git**, so they can travel with the project on the next commit/transfer. They are not included in the runtime game or `public/`. Keep the original attribution visible; do not overwrite the captures with edited images.

| File prefix | Actual selected coverage | Imagery date | Use |
| --- | --- | --- | --- |
| `west-bay` | Fullerton-side plaza, 1.2837526, 103.8531635 | 2021-10 | Cool granite slabs, glazed facades, planting, metalwork. Buildings occlude the bay; not a full skyline view. |
| `north-bay` | ArtScience waterfront, 1.2861001, 103.8588555 | 2012-02 | Museum underside/pond, pergola, Sands glass, Shoppes roof, CBD across water. |
| `museum-promenade` | Sands drop-off/entrance, 1.2832655, 103.8596410 | 2022-02 | Blue-gray curtain wall, canopy framing, road finish, curb planting. The query label is not the actual panorama description. |

Each matching JSON preserves panorama ID, actual/requested coordinates, date, copyright, and per-frame heading/pitch/FOV, file size and SHA-256. Sources span different years/lighting conditions; they are visual references, not calibrated simultaneous photogrammetry observations.

## Reuse without requests

Open the saved JPEGs directly. Both commands below reuse the saved images and metadata and were verified to make zero requests on the complete cache:

```sh
pnpm marina:references
pnpm marina:references --surroundings
```

These commands can fetch **missing** images; don't run on a machine missing this folder just to inspect the scene. Copy/restore this folder first. The game itself needs neither images nor a key. Invalid cached JPEGs cause a stop, not an automatic recapture.

Initial Static metadata returned contributed panoramas. `scripts/select-marina-references.mjs` then selected official coverage using Maps JavaScript (requires Vite and an explicitly enabled local Chrome debugging session; `MARINA_APP_ORIGIN` and `CHROME_DEBUG_ORIGIN` are configurable). Do not rerun selection for cached centers. Selection and capture reserve each request in the shared ledger before network access; raw API URLs and keys are never logged or stored here.

Budget after this pass: **34 total recorded attempts; 23 Static images total; 15/50 new images used, 35 remain**. This counts the first three previews against the allowance conservatively. The original 1,000-attempt cap still applies (966 remaining). Use `pnpm marina:usage` for live figures. Never reset the ledger or capture concurrently on separate machines.

## Proportion references

- [Arup's Marina Bay Sands project](https://www.arup.com/projects/marina-bay-sands-integrated-resort/): SkyPark 340m long, 38m wide, 200m above ground. The model uses a shared 0.54 landmark scale: 183.6 × 20.52, elevation 108 game units.
- [Marina Bay Sands architecture](https://www.marinabaysands.com/guides/exceptional-experiences/marina-bay-sands-architecture.html): three towers and the rooftop landmark.
- [ArtScience Museum factsheet](https://www.marinabaysands.com/content/dam/singapore/marinabaysands/master/main/home/company-information/media-centre/factsheets/artscience-museum.pdf): ten fingers, tallest 60m. The stylized model uses this as a relative-height reference, not an exact surface reconstruction.

Human-scale paving/railings, landmark scale and compressed ground layout are separate approximations. Do not claim accurate travel distances or a surveyed map.
