# Two-line Encik audition

The user upgraded to a paid plan and authorized retrying the same two-line audition on 2026-09-13. The API verified Starter with 40,000 included credits and overage disabled. Free-plan API attempts previously returned HTTP 403 `feature_unavailable`; those confirmed denials are archived in the ignored cache.

**Result (2026-09-13):** one request generated three playable MP3 candidates (7.4s, 8.8s, 7.8s), available at `.cache/encik-audition/93f198a2b596/index.html`. The follow-up subscription check reports **118 / 40,000 credits used**. The immediate post-generation check was still zero, so `usage-followup.json` preserves the later reading. Awaiting the user’s preferred candidate.

This is a standalone voice audition; it does not alter game audio or generate the full pack.

1. Use a paid ElevenLabs account and put `ELEVENLABS_API_KEY` in the ignored `.env.local`. The key needs access to Voice Design and reading the user subscription. Never use a `VITE_` prefix or paste the key into chat.
2. `pnpm voice:audition` prints the exact prompt and 118-character, two-line script without network calls.
3. `pnpm voice:audition --generate` checks the paid subscription and available included quota, then submits one Voice Design v3 request. It downloads the returned candidate previews into `.cache/encik-audition/<request-hash>/` and creates an `index.html` listening page.
4. Audition the candidates before making further generations or saving a voice. The full callout pack remains on hold until a candidate is approved.

Voice description:

> Native Singapore English, colloquial Singlish. Male, late forties. A gravelly, booming army warrant officer with a thick Singaporean accent. Clipped commands, expressive intonation, theatrical impatience and dry humour. Loud but intelligible. Clean studio recording.

The preview contains:

> Eh, recruit! You fighting the enemy or fighting the wall? Go around lah!
>
> Reloading, ah! Nobody say can take tea break.

The script saves a permanent attempt marker before submitting. Re-running the same request, including after a timeout, will stop instead of spending credits again. Inspect `attempt.json` and the ElevenLabs dashboard before explicitly deciding to retry. This is not an automatic retry or batch tool. The before/after account quota difference is recorded when available; concurrent account usage may affect that measurement. The quota reserve check is conservative, not a provider-enforced per-request credit cap.

Preview audio and generated voice IDs stay in the ignored cache. No voice is automatically saved to the account, and no preview is shipped in the game. The full batch remains pending the user’s audition choice.

References: [Voice Design API](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [Voice Design guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design), [subscription API](https://elevenlabs.io/docs/api-reference/user/subscription/get).

Checks: `node --test scripts/encik-audition.test.mjs` uses mocked responses, spends no credits and verifies subscription restrictions, one-request caching and timeout protection.
