# Two-line Encik audition

The user upgraded to a paid plan and authorized retrying the same two-line audition on 2026-09-13. The API verified Starter with 40,000 included credits and overage disabled. Free-plan API attempts previously returned HTTP 403 `feature_unavailable`; those confirmed denials are archived in the ignored cache.

**Result (2026-09-13):** one request generated three playable MP3 candidates (7.4s, 8.8s, 7.8s), available at `.cache/encik-audition/93f198a2b596/index.html`. The follow-up subscription check reports **118 / 40,000 credits used**. The immediate post-generation check was still zero, so `usage-followup.json` preserves the later reading. User feedback: candidates 1 and 3 sounded British attempting Singaporean; candidate 2 sounded slightly Hong Kong-ish. No candidate was selected. The original files remain available for comparison.

**Round 2:** one authorized request returned three valid MP3 previews (8.0s, 6.8s, 8.0s), at `.cache/encik-audition/7ce08f42e116/index.html`. That page links back to round 1. A later quota check confirmed 118 credits for round 2, 236/40000 total used. Awaiting user feedback on the revised accent.

This is a standalone voice audition; it does not alter game audio or generate the full pack.

1. Use a paid ElevenLabs account and put `ELEVENLABS_API_KEY` in the ignored `.env.local`. The key needs access to Voice Design and reading the user subscription. Never use a `VITE_` prefix or paste the key into chat.
2. `pnpm voice:audition` prints the exact prompt and 118-character, two-line script without network calls.
3. `pnpm voice:audition --generate` checks the paid subscription and available included quota, then submits one Voice Design v3 request. It downloads the returned candidate previews into `.cache/encik-audition/<request-hash>/` and creates an `index.html` listening page.
4. Audition the candidates before making further generations or saving a voice. The full callout pack remains on hold until a candidate is approved.

Round 2 voice description (user authorized one more set, retaining the same two lines, model, seed and guidance):

> Singaporean man in his forties speaking everyday colloquial Singapore English. Conversational, slightly nasal, dry and matter-of-fact. Familiar kopitiam conversation, with mild impatience. Understated delivery.

The preview contains:

> Eh, recruit! You fighting the enemy or fighting the wall? Go around lah!
>
> Reloading, ah! Nobody say can take tea break.

The script saves a permanent attempt marker before submitting. Re-running the same request, including after a timeout, will stop instead of spending credits again. Inspect `attempt.json` and the ElevenLabs dashboard before explicitly deciding to retry. This is not an automatic retry or batch tool. The before/after account quota difference is recorded when available; concurrent account usage may affect that measurement. The quota reserve check is conservative, not a provider-enforced per-request credit cap.

Preview audio and generated voice IDs stay in the ignored cache. No voice is automatically saved to the account, and no preview is shipped in the game. The full batch remains pending the user’s audition choice.

References: [Voice Design API](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [Voice Design guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design), [subscription API](https://elevenlabs.io/docs/api-reference/user/subscription/get).

Checks: `node --test scripts/encik-audition.test.mjs` uses mocked responses, spends no credits and verifies subscription restrictions, one-request caching and timeout protection.
