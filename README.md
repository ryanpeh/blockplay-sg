# Blockplay — Singapore, playable.

A hackathon starter for playable Singapore neighborhoods, built with React, TypeScript, Vite, and Three.js. The emphasis is on familiar HDB estates as well as the postcard locations.

See [PLAN.md](PLAN.md) for completed work, experiments, and the roadmap; [HANDOFF.md](HANDOFF.md) for continuing on another computer.

**Target experience:** reconstruct real 3D Singapore locations from street-level imagery, then walk and drive through them. The current Marina Bay prototype is a small, approximate depth-derived scene; a full street/district reconstruction remains future work.

**Marina Bay first:** four authorized waterfront photographs → local estimated-depth meshes → continuous walk/drive viewer. The generated assets are included under `public/reconstruction/marina-bay/`; the scene starts by default and needs no live API requests. Imagery is from February 2012, with approximate scale and a 4-unit exploration radius. See [reconstruction setup and request budget](reconstruction/README.md). The persistent [API ledger](reconstruction/api-usage.json) currently records 13 capture attempts, including 8 image downloads, under a 1,000-attempt cap.

## Run it

Use Node 22.12+ and pnpm 11 (pinned to 11.22.0 in `package.json`).

If pnpm is not installed, `npx --yes pnpm@11.22.0 install` bootstraps the pinned pnpm without a global installation. Use `npx --yes pnpm@11.22.0 dev` to start it the same way. Project dependencies are still installed by pnpm.

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. **No API key is needed for the playable demo.**

```sh
pnpm test
pnpm build
pnpm preview
```

Dependency installs enforce a two-week cooldown (`minimumReleaseAge: 20160`) in `pnpm-workspace.yaml`, with strict checking and no package exemptions. esbuild, onnxruntime-node, and sharp may run build scripts; protobufjs scripts are disabled. See [pnpm configuration](https://pnpm.io/settings).

## What works

- **Marina 3D:** the default scene, built from four real waterfront images and estimated depth. Click the scene and use WASD to move, drag to look, switch Walk/Drive, and reset position. A gold ring marks the small exploration boundary. The driving mode is a camera controller, not a full vehicle physics simulation. Reopening the scene makes no new Google requests.
- **Joyride:** drive a 240 m circuit through an original, procedurally built neighborhood. WASD / arrow keys accelerate, brake, and steer; Space brakes. Touch controls work too. Cross three gates to finish. The vehicle stays within the road; there is no traffic, vehicle model, or collision simulation yet.
- **Target practice:** click / tap five targets in a fixed first-person view. This is a small NS-inspired arcade foundation, not a full FPS or an authentic equipment simulation. No enemies or real weapon mechanics are implemented.
- **Street View:** a separate live viewer requiring a Maps key. Three starting viewpoints per location display imagery, with look left/right, step forward/backward, and recenter controls. Google's descriptions, image-date control, navigation arrows, and attribution remain available. The search finds nearby panoramas within 200 m; positions and outdoor classification are not guarantees. Loading, missing-key, request-error, authorization-error, and retry states are included.
- Tampines, Toa Payoh, Queenstown, and Marina Bay presets. Each has approximate search coordinates and a distinct palette for the procedural demo. Street View availability and exact panorama positions depend on Google.
- Start, pause, resume, reset, progress, timers, completion states, and responsive controls.

Joyride and Target practice use fictional original layouts. **Marina 3D is image-derived geometry**, with estimated depth and a flat-ground assumption. Four images at one camera center cannot recover unseen building backs or guarantee accurate distances; larger reconstruction needs additional translated captures and alignment.

## Enable real Street View

1. Create a Google Cloud project with billing and enable **Maps JavaScript API**.
2. Create a browser API key, restrict its API access, and configure HTTP referrer restrictions for your localhost and deployment origins.
3. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_MAPS_API_KEY`.
4. Restart Vite, then select **Street View**.

Vite embeds `VITE_*` variables into the public browser bundle. A Google browser key is intended for this use with restrictions. **Never put an OpenAI secret or another server credential in a `VITE_*` variable.**

The live viewer lives in `src/lib/google-maps.ts` and `src/components/StreetView.tsx` and retains Google's controls and attribution. A separate capture/build pipeline uses the owner's confirmed permission to save source images and derive the Marina geometry. Its requests are budgeted and recorded; source files and API keys are not needed to play the generated scene.

- [Google Street View guide](https://developers.google.com/maps/documentation/javascript/streetview)
- [Google Maps policies and attribution](https://developers.google.com/maps/documentation/javascript/policies)
- [Google API security guidance](https://developers.google.com/maps/api-security-best-practices)

Terms and privacy disclosures are available from the footer. Review them for your deployed operator and any services you add before launch.

## Project layout

```text
src/
  App.tsx                    Experience selection, session state, interface
  styles.css                 Responsive visual system
  data/locations.ts          Singapore presets and mode types
  game/World.tsx             Original Three.js scene and game loop
  game/physics.ts            Speed and checkpoint rules
  game/physics.test.ts       Core driving behavior checks
  components/StreetView.tsx  Official panorama viewer
  lib/google-maps.ts         Optional browser SDK loader
```

The game and Google viewer are independent. Extend the original world without mixing Google imagery into custom 3D materials. All gameplay state is currently in memory; there is no backend, account system, leaderboard, or persistence.

## Deploy

This is a static application. Import the repository into Vercel, Netlify, or your static host:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: `dist`
- Optional build-time variable: `VITE_GOOGLE_MAPS_API_KEY`

Add your deployed origin to the Google key's allowed referrers. Rebuild after changing environment variables. No special client-route rewrites are needed. Google Fonts are loaded externally with local sans-serif fallbacks.

## Five-hour build priorities

1. Get this scaffold running and deploy it early. Confirm Street View credentials on the deployed domain.
2. Pick one hero experience: location-aware exploration, a much richer driving game, or a polished arcade training range.
3. Add one memorable feature. For example, a mission director that chooses from approved locations and structured objective types, or original neighborhood props and vehicle visuals.
4. If adding runtime Astra, put the model call behind a server endpoint, validate its structured output, and configure the model identifier and credentials supplied by the event. This scaffold uses Astra for engineering; it makes **no runtime model calls** and assumes no unreleased API signatures.
5. Use the last hour for deployed-browser checks and the 90-second video.

Suggested video: show the neighborhood selection (10 s), complete the driving circuit (25 s), show target practice (15 s), explore a real neighborhood in Street View (20 s), and explain Astra's concrete engineering contributions and the next milestone (20 s).

Before presenting, verify the live Google integration with your own key and test desktop + phone controls. No public deployment is created by this scaffold itself.
