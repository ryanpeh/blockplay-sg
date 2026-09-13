# Deploy to Cloudflare Workers

Live deployment: **https://blockplay-sg.sunjc826.workers.dev** in the Sunjc826 account. `wrangler.jsonc` selects that account explicitly. This is a direct CLI deployment from the local checkout: no GitHub integration or repository administrator privileges are required. Ryan only needs to authorize repository access if you later enable the GitHub integration below. To deploy a separate copy in another account, change `account_id` and, if needed, `name` first.

This deployment serves the Vite game and companion API together on HTTPS. It includes all three maps, FPS, open world, solo bots, loadouts, vehicles and bundled Encik recordings. Text/voice companions and the optional LLM strategist use a private Worker secret. Without that secret, gameplay still works and companion requests return a clear unavailable response.

The Node LAN rendezvous server is not deployed: the cloud build offers Solo arena and disables Host/Join. Internet matchmaking would need shared room storage and STUN/TURN support; uploading the frontend does not provide either. `pnpm lan` continues to work locally.

## First deployment

Use Node 24 and **pnpm 11.22.0**. Wrangler is pinned in the lockfile; `pnpm-workspace.yaml` retains the strict two-week release cooldown. Its `workerd` platform-binary installation is explicitly allowed alongside esbuild.

```sh
pnpm install --frozen-lockfile
pnpm check:cloudflare
pnpm exec wrangler login --device
pnpm deploy:cloudflare
```

Device login works from a host browser even when the terminal is inside UTM: follow the displayed verification URL and code, without a VM-local callback. Wrangler prints the deployed `https://blockplay-sg.<account-subdomain>.workers.dev` URL. If the account already has a different project named `blockplay-sg`, change `name` in `wrangler.jsonc` before deploying.

Enable the companion by supplying its existing server API key at the private prompt:

```sh
pnpm exec wrangler secret put OPENAI_API_KEY
```

Do not upload `.env.local` wholesale. ElevenLabs credentials are not needed: all recordings are bundled. Cloudflare stores the OpenAI key as a Worker secret, not in JavaScript delivered to browsers. Keep `OPENAI_BASE_URL` and `PILOT_MODEL` in `wrangler.jsonc` aligned with the existing event backend; this does not change the companion's requested models or protocols.

The API accepts its own HTTPS origin automatically, including a custom domain. To restrict it to specific origins, set `ADVENTURE_ALLOWED_ORIGINS` in `vars`. `ADVENTURE_ENABLED=false` and `ADVENTURE_VOICE_ENABLED=false` remain available. Existing request quotas are per Worker isolate, not a global billing cap.

## Verify and preview

```sh
pnpm preview:cloudflare
# In another terminal:
pnpm test:cloudflare
```

Preview uses `http://127.0.0.1:8787`. Optional local secrets go in an ignored `.dev.vars` file copied from `.dev.vars.example`. The scripts disable Wrangler's automatic `.env` loading so a preview does not silently inherit all local service credentials. If a VPN proxies loopback requests, set `NO_PROXY=127.0.0.1,localhost` and `no_proxy=127.0.0.1,localhost`.

The smoke check covers production JS/CSS, a GLB weapon, a recorded MP3, SPA navigation, JSON API routing, denied cross-origin requests and a malformed same-origin request. It makes no paid API calls. Run it against the published site with:

```sh
CLOUDFLARE_APP_ORIGIN=https://blockplay-sg.YOUR-SUBDOMAIN.workers.dev pnpm test:cloudflare
```

`/api/health` returns deployment identity and whether the companion has a key and is enabled. It does not check upstream model access. Test one real text request and voice connection manually after configuring the secret to verify those services.

## Automatic deployments from GitHub

In Cloudflare Workers & Pages, connect this repository to a **Worker**, with these build settings:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Production branch | `main` |
| Build command | `pnpm build:cloudflare` |
| Deploy command | `pnpm exec wrangler deploy` |
| Preview deploy command | `pnpm exec wrangler versions upload` |
| Build variable `PNPM_VERSION` | `11.22.0` |
| Build variable `NODE_VERSION` | `24.21.0` |

The build output is `dist`, configured in `wrangler.jsonc`. Set runtime secrets in the Worker's **Settings → Variables and Secrets**, independently from build variables. The checked-in `vars` are the source of truth for non-secret runtime settings; copy dashboard changes into the config so subsequent deployments preserve them.

Live Street View is optional. The cloud build only exposes `GOOGLE_MAPS_DEMO_API_KEY`, never the fallback capture key `VITE_GOOGLE_MAPS_API_KEY`. For Street View, provide the demo key as a build variable and restrict its Google HTTP referrers to the deployed hostname. Authored maps need no Google key or live map requests.

For your own hostname, use the Worker's **Settings → Domains & Routes → Add → Custom Domain** once the domain is in the Cloudflare account. Same-origin companion routing needs no frontend URL changes.

## Implementation and references

`cloudflare/worker.js` adapts the existing Node companion using Cloudflare's HTTP bridge. Assets are served directly; `/api/*` runs the Worker first so unknown API routes never become a misleading HTML success. The cloud build keeps AI features available independently of local multiplayer.

- [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Node HTTP bridge](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Git build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [build versions](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
