# Blockplay SG — 90-second demo

- [Demo video](blockplaySG-demo.mp4): 1920 × 1080, 30 fps, H.264/AAC, 90 seconds.
- [Voiceover](narration.mp3): full timed narration track.
- [Narration text](narration.txt) and [optional subtitles](narration.srt): subtitles use approximate sentence timings within each scene.
- [Preview](preview.jpg) and [script](../DEMO-SCRIPT.md).
- Play: **https://blockplaysg.fun/**

This cut includes fresh local Marina driving with a real right turn and safe stop, real companion text responses, Queenstown exploration and a source-linked learning card. It has no multiplayer or FPS segment. The closing panorama has no moving car.

The Raffles sequence preserves credited Google imagery and compares actual scene-builder renders before and after the recorded refinement. The Astra workflow segment presents the documented agent coordination, an actual session-summary/code excerpt, and the recorded refinement checks. The 200-test result is labeled as the refinement's historical verification, not a fresh test count for all later changes. The session summary is not presented as a raw model transcript.

Narration: Coral via OpenAI `gpt-4o-mini-tts`, generated with the user's requested stronger Singaporean English accent direction: local vowels, lightly syllable-timed rhythm and natural Singaporean intonation, without exaggerated slang. The approved words are unchanged. Several segments are modestly time-compressed to fit the 90-second cut, and the narration is loudness-normalized for clear playback. Accent quality remains a listening judgment; the export includes an AI-generated narration disclosure. [Speech API reference](https://developers.openai.com/api/reference/cli/resources/audio/subresources/speech/methods/create).

The companion is demonstrated through text, not a staged microphone exchange. GPT-Live-1 is mentioned as the optional voice capability. Local successful requests do not independently verify the public deployment.

Source footage, editing scripts, narration segments, and the previous cut are preserved in `.cache/demo-video/v3/` (ignored by Git). The previous cut is under `previous/`. No application geometry or gameplay behavior was changed to record this video; capture-only CSS frames the game and companion without outer navigation.
