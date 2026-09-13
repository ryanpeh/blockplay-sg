import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../audio/encik/manifest.json';
import { ENCIK_LINES } from './fps-callouts';
import { encikRecordingUrl } from './encik-recordings';
it('ships one matching audio recording for every subtitle and preserves deployment base paths', () => {
  expect(manifest.clips).toHaveLength(48);
  for (const [event, lines] of Object.entries(ENCIK_LINES)) {
    lines.forEach((text, index) => {
      const clip = manifest.clips.find(c => c.event === event && c.index === index);
      expect(clip?.text).toBe(text);
      const url = encikRecordingUrl({ event: event as keyof typeof ENCIK_LINES, text }, '/demo/');
      expect(url).toBe(`/demo/audio/encik/${clip!.file}`);
      const data = readFileSync(new URL(`../../public/audio/encik/${clip!.file}`, import.meta.url));
      expect(data.length).toBe(clip!.bytes);
      expect(createHash('sha256').update(data).digest('hex')).toBe(clip!.sha256);
    });
  }
});
it('does not play a mismatched recording if a subtitle changes', () => {
  expect(encikRecordingUrl({ event: 'start', text: 'A new line without a recording' })).toBeNull();
});
