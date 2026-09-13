# Two-line Encik audition

The user upgraded to a paid plan and authorized retrying the same two-line audition on 2026-09-13. The API verified Starter with 40,000 included credits and overage disabled. Free-plan API attempts previously returned HTTP 403 `feature_unavailable`; those confirmed denials are archived in the ignored cache.

**Result (2026-09-13):** one request generated three playable MP3 candidates (7.4s, 8.8s, 7.8s), available at `.cache/encik-audition/93f198a2b596/index.html`. The follow-up subscription check reports **118 / 40,000 credits used**. The immediate post-generation check was still zero, so `usage-followup.json` preserves the later reading. User feedback: candidates 1 and 3 sounded British attempting Singaporean; candidate 2 sounded slightly Hong Kong-ish. No candidate was selected. The original files remain available for comparison.

**Round 2:** one authorized request returned three valid MP3 previews (8.0s, 6.8s, 8.0s), at `.cache/encik-audition/7ce08f42e116/index.html`. That page links back to round 1. A later quota check confirmed 118 credits for round 2, 236/40000 total used. User found all three accents natural, with #2 more hostile, but still lacking Encik coarseness and crudeness. No voice selected.

**Round 3:** one authorized request returned three valid MP3 previews (7.1s, 7.2s, 6.8s), at `.cache/encik-audition/0731c4fd24ac/index.html`, with a link to round 2. User preferred #1, followed by #3; #2 drifted British. #1 is closest so far but sounds too young. Follow-up quota: 127 credits for round 3, 363/40000 total used.

**Round 4:** one authorized request returned three valid MP3 previews (10.0s, 8.8s, 9.3s), at `.cache/encik-audition/36b76e0cf1bd/index.html`. The page embeds round 3 #1 as a reference. The prompt adds an older age, worn texture, chest resonance and measured delivery. Follow-up quota: 127 credits for round 4, 490/40000 total used. Awaiting user feedback.

This is a standalone voice audition; it does not alter game audio or generate the full pack.

1. Use a paid ElevenLabs account and put `ELEVENLABS_API_KEY` in the ignored `.env.local`. The key needs access to Voice Design and reading the user subscription. Never use a `VITE_` prefix or paste the key into chat.
2. `pnpm voice:audition` prints the exact prompt and 127-character, two-line script without network calls.
3. `pnpm voice:audition --generate` checks the paid subscription and available included quota, then submits one Voice Design v3 request. It downloads the returned candidate previews into `.cache/encik-audition/<request-hash>/` and creates an `index.html` listening page.
4. Audition the candidates before making further generations or saving a voice. The full callout pack remains on hold until a candidate is approved.

Round 4 voice description (user requested an older Encik; same 127-character lines, model, seed and guidance):

> Singaporean man around sixty speaking everyday colloquial Singapore English. Familiar kopitiam speech, slightly nasal, with natural Singlish rhythm and vowels. Audibly older, with a heavy chest resonance, coarse grainy rasp and a worn, dry throaty edge. Measured, slightly dragging phrases with gravelly ends; a seasoned uncle who takes his time because everyone waits for him. Blunt, earthy and casually foul-mouthed. An old encik who has spent thirty years scolding recruits: weary irritation, biting dry humour, abrupt bursts of emphasis. Conversational grumbling that snaps into a short bark. Rough, unpolished delivery with clear words.

The preview contains:

> Eh, recruit! Bloody hell, you shooting the wall for what? Go around lah!
>
> Reloading! Don't stand there like a blur sotong. Move!

This creates new candidates from a description; it does not edit or preserve the exact identity of round 3 candidate #1. That candidate remains the preferred reference and is embedded on the round 4 page for direct comparison.

The script saves a permanent attempt marker before submitting. Re-running the same request, including after a timeout, will stop instead of spending credits again. Inspect `attempt.json` and the ElevenLabs dashboard before explicitly deciding to retry. This is not an automatic retry or batch tool. The before/after account quota difference is recorded when available; concurrent account usage may affect that measurement. The quota reserve check is conservative, not a provider-enforced per-request credit cap.

Preview audio and generated voice IDs stay in the ignored cache. No voice is automatically saved to the account, and no preview is shipped in the game. The full batch remains pending the user’s audition choice.

References: [Voice Design API](https://elevenlabs.io/docs/api-reference/text-to-voice/design), [Voice Design guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-design), [subscription API](https://elevenlabs.io/docs/api-reference/user/subscription/get).

Checks: `node --test scripts/encik-audition.test.mjs` uses mocked responses, spends no credits and verifies subscription restrictions, one-request caching and timeout protection.
