# Companion abuse protections

These safeguards apply to the local Node companion backend. The public Sites game-only build still disables AI; this change does not enable or deploy a public spending endpoint.

## Implemented boundaries

- Requests must have an allowed Origin and JSON content type, with no compressed bodies. Bodies are capped at 64 KiB and must finish within 10 seconds; text is limited to 1,200 characters. Empty text, control/bidirectional formatting characters and malformed state are rejected.
- Obvious attempts to override instructions, expose keys/system prompts or inject role delimiters are rejected before model spending. Normal destination, education and multilingual requests remain allowed. This heuristic is deliberately narrow: it is not a complete prompt-injection detector and may still reject a legitimate question about these terms.
- The server checks every destination against the same trusted catalog used by the renderers, including names and coordinates. Missing, invented or modified destinations are rejected. Arbitrary extra snapshot fields and session identifiers are never passed into the model prompt.
- Player requests remain data in a JSON user input, not developer instructions. No model response is executed as code, HTML, SQL, a URL fetch or an arbitrary tool call. The server accepts only known destination/topic IDs and expected decision fields. Learning facts and links come from local curated data, not model-written content.
- Objective changes still pass through the existing local validation, stamp-preservation and stale-response guards. These protections do not establish authoritative anti-cheat: player position and collected state are still client-reported.
- Per socket address: 12 accepted requests/minute, at most two in flight, and two voice-session creation attempts/minute. Across the process: 30 requests/minute and four in flight. The limiter retains at most 1,024 client buckets, expires idle buckets and returns a fixed Retry-After hint. Quota slots are released on success, failure and body timeout; invalid bodies consume admitted request quota.
- Caller-supplied forwarding headers cannot reset a quota. Behind a proxy, visitors share its socket-address quota unless trusted identity handling is added at the hosting layer.
- Error responses are fixed application messages, never raw model errors or secrets. The client explains rejected/throttled requests without changing objectives or stamps; React renders conversation text without HTML interpretation.

Text and delegated voice transcripts use the same interpretation endpoint. Voice-session offers cannot supply alternative model settings or instructions.

## Emergency controls

Set `ADVENTURE_ENABLED=false` to stop new companion requests, or `ADVENTURE_VOICE_ENABLED=false` to stop new voice sessions while retaining text. Restart `pnpm server` after changing these private server settings. Neither switch terminates an already established upstream voice session.

## Before enabling AI publicly

These checks are **defense in depth, not authentication or a guaranteed spend cap**. Origin headers can be spoofed outside a browser. Process-local quotas reset on restart, are independent across replicas and can be exhausted by an attacker. An attacker can also bypass the browser's voice-duration timer; session-creation limits do not bound the duration or cost of existing sessions. Raw speech reaches GPT-Live before delegated transcript validation, so the heuristic cannot guarantee every spoken response remains on topic.

Before public rollout, add authenticated access (or an appropriately verified anti-bot challenge), a shared server-enforced per-user quota, edge body/connection limits and provider-side spending controls. Use a dedicated restricted project key and monitor usage. If reliable voice-session lifetime enforcement is unavailable, leave voice disabled for public visitors. Do not place a reusable backend access secret in the browser.

Keep `OPENAI_API_KEY` on the server. Never add secrets to `VITE_*`, model instructions, logs or the repository. Google browser keys are different: use API and website-referrer restrictions to limit Maps misuse.

## Checks and guidance

`pnpm test` covers forged destinations, injected fields, obvious overrides, oversized/control-character input, malformed model output, per-client/global limits, spoofed forwarding headers, voice-session settings and emergency switches. Client tests check unchanged objectives/stamps after rejection. Tests use mocked model responses and do not prove that every real-model jailbreak is caught.

Design follows [OpenAI's agent safety guidance](https://developers.openai.com/api/docs/guides/agent-builder-safety): keep untrusted inputs separate from instructions, constrain outputs and validate actions outside the model.
