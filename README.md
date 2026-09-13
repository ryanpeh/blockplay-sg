# blockplaySG — Singapore, playable.

> What if the places we pass every day became worlds we could play in?

Explore familiar Singapore neighborhoods as stylized 3D game worlds, created using **Google Maps Street View imagery as visual references** and **GPT-6 Astra to help build and refine the worlds and game code**.

**[Play the demo](https://blockplay-sg.qwertz0808.chatgpt.site)**

[How we built it: engineering and visual understanding](docs/BUILD-STORY.md) · [Reference-to-game comparisons](docs/visual-understanding.md)

## What you can play

- Walk or drive around **Marina Bay**, **Queenstown** and **Raffles Place**, collecting stamps.
- Explore connected districts in **Open world**, finding equipment and facing bots.
- Try **Marina FPS**, its armory, vehicles and target range.
- Play **Solo arena** against configurable bots.

The public demo is game-only: AI companions, multiplayer host/join and live Street View are unavailable. These optional features are supported in the local project with additional setup.

The worlds are authored, compressed interpretations inspired by street-level references—not surveyed maps or navigation tools.

## How we build locations

Our workflow starts with a place and its Google Maps Street View imagery. We select and cache reference views, retain their attribution and capture metadata, and review which details are clearly visible. Astra helps translate those references into Three.js scene code: landmark shapes, building facades, materials, roads and streetscape details.

We connect each scene to reusable walking and driving controls, collision rules, collectible objectives and minimaps. Comparing rendered views with the references, running automated checks and playtesting lets us refine both resemblance and playability. See the [build story](docs/BUILD-STORY.md) and [three reference-to-game comparisons](docs/visual-understanding.md).

The same workflow could support many more neighbourhoods and cities: gather suitable references for a new location, use Astra to help author its scene, and reuse the existing gameplay systems. Today, each location still needs reference review, layout decisions and validation. Expanding this into reliable generation for arbitrary places would require further automation of reference selection, scene layout and quality checks.

## Run locally

Requires **Node 22.12+** and **pnpm 11.22.0**.

```sh
pnpm install
pnpm dev
```

Open the URL printed in the terminal. No API key is needed for solo gameplay. Dependencies use a two-week minimum release age.

```sh
pnpm test
pnpm build
```

Built with React, TypeScript, Vite and Three.js.

## Documentation

- [Project guide](docs/PROJECT-GUIDE.md) — controls, optional services, testing and deployment.
- [Adventure companions](ADVENTURE.md) — objective changes, educational guides and voice.
- [Open world](docs/WORLD-ZONES.md), [LAN arena](docs/LAN-ARENA.md) and [Armory](docs/ARMORY.md) — mode-specific details.
- [Plan](PLAN.md) and [Handoff](HANDOFF.md) — progress, experiments and continuing development.
