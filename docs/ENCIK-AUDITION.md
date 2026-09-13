# Two-line Encik audition

**Verified restriction (2026-09-13):** the free account passed the subscription check, but Voice Design returned HTTP 403 `feature_unavailable`: “Creating a voice through the API is only available on a paid plan.” The account quota remained at zero after the first denial. Do not repeat the API audition to fix this; changing key permissions cannot lift the plan restriction.

For the free audition, use the ElevenLabs website: **Voices → My Voices → Add a new voice → Voice Design**. Paste the description printed by `pnpm voice:audition` and the two lines below into its preview text field. Generate one set of previews, then compare them before spending credits on additional attempts. No voice needs to be saved or shipped yet.

The API tooling below remains as a documented experiment; it currently cannot generate this preview on the Free plan. Browser automation from this workspace was blocked by pending macOS Accessibility and Screen Recording permissions.

This is a standalone voice audition; it does not alter game audio or generate the full pack.

1. Create a free ElevenLabs account and put `ELEVENLABS_API_KEY` in the ignored `.env.local`. The key needs access to Voice Design and reading the user subscription. Never use a `VITE_` prefix or paste the key into chat.
2. `pnpm voice:audition` prints the exact prompt and 118-character, two-line script without network calls.
3. `pnpm voice:audition --generate` checks the free subscription and available quota, then submits one Voice Design v3 request. It downloads the returned candidate previews into `.cache/encik-audition/<request-hash>/` and creates an `index.html` listening page.
4. Audition the candidates before making further generations or saving a voice. The full callout pack remains on hold until a candidate is approved.

Voice description:

> Native Singapore English, colloquial Singlish. Male, late forties. A gravelly, booming army warrant officer with a thick Singaporean accent. Clipped commands, expressive intonation, theatrical impatience and dry humour. Loud but intelligible. Clean studio recording.

The preview contains:

> Eh, recruit! You fighting the enemy or fighting the wall? Go around lah!
>
> Reloading, ah! Nobody say can take tea break.

The script saves a permanent attempt marker before submitting. Re-running the same request, including after a timeout, will stop instead of spending credits again. Inspect `attempt.json` and the ElevenLabs dashboard before explicitly deciding to retry. This is not an automatic retry or batch tool. The before/after account quota difference is recorded when available; concurrent account usage may affect that measurement. The quota reserve check is conservative, not a provider-enforced per-request credit cap.

Preview audio and generated voice IDs stay in the ignored cache. No voice is automatically saved to the account, and no preview is shipped in the game. These free-tier outputs are for auditioning; review the provider’s licensing before publishing final assets.

References: [Voice Design API](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [Voice Design guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design), [subscription API](https://elevenlabs.io/docs/api-reference/user/subscription/get).

Checks: `node --test scripts/encik-audition.test.mjs` uses mocked responses, spends no credits and verifies subscription restrictions, one-request caching and timeout protection.
