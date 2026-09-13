# blockplaySG — Singapore, playable.

Explore familiar Singapore neighborhoods as stylized 3D game worlds.

**[Play the demo](https://blockplay-sg.qwertz0808.chatgpt.site)**

## What you can play

- Walk or drive around **Marina Bay**, **Queenstown** and **Raffles Place**, collecting stamps.
- Explore connected districts in **Open world**, finding equipment and facing bots.
- Try **Marina FPS**, its armory, vehicles and target range.
- Play **Solo arena** against configurable bots.

The public demo is game-only: AI companions, multiplayer host/join and live Street View are unavailable. These optional features are supported in the local project with additional setup.

The worlds are authored, compressed interpretations inspired by street-level references—not surveyed maps or navigation tools.

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
