import { expect, it, vi } from 'vitest';
import { createEncikAudio } from './encik-audio';

function harness(fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))) {
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  const gain = { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    state: 'running', destination: {},
    decodeAudioData: vi.fn(async () => ({ duration: 3 })),
    createGain: () => gain,
    createBufferSource: () => {
      const source = { start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: () => gain, onended: null };
      sources.push(source); return source;
    },
  };
  const player = createEncikAudio(() => context as unknown as AudioContext, fetcher);
  return { player, sources, context, fetcher };
}
it('plays one channel, interrupts its predecessor and reuses decoded clips', async () => {
  const h = harness();
  expect(await h.player.play('/a.mp3')).toBe(true);
  expect(h.sources[0].start).toHaveBeenCalledOnce();
  await h.player.play('/a.mp3');
  expect(h.sources[0].stop).toHaveBeenCalledOnce();
  expect(h.fetcher).toHaveBeenCalledOnce();
  expect(h.context.decodeAudioData).toHaveBeenCalledOnce();
  h.player.stop(); expect(h.sources[1].stop).toHaveBeenCalledOnce();
});
it('pause or mute prevents late network audio from starting', async () => {
  let resolve!: (r: Response) => void;
  const h = harness(vi.fn(() => new Promise<Response>(r => { resolve = r; })));
  const pending = h.player.play('/slow.mp3'); h.player.stop();
  resolve(new Response(new Uint8Array([1])));
  expect(await pending).toBe(false); expect(h.sources).toHaveLength(0);
});
it('disposal during decoding prevents playback and clears cached buffers', async () => {
  const h = harness();
  let resolve!: (buffer: { duration: number }) => void;
  h.context.decodeAudioData.mockImplementation(() => new Promise(r => { resolve = r; }));
  const pending = h.player.play('/slow.mp3');
  await vi.waitFor(() => expect(h.context.decodeAudioData).toHaveBeenCalledOnce());
  h.player.dispose(); resolve({ duration: 3 });
  expect(await pending).toBe(false); expect(h.sources).toHaveLength(0);
});
it('failed recordings and suspended contexts stay silent without throwing', async () => {
  const h = harness(vi.fn(async () => new Response('', { status: 404 })));
  expect(await h.player.play('/missing.mp3')).toBe(false);
  h.fetcher.mockImplementation(async () => new Response(new Uint8Array([1])));
  h.context.state = 'suspended';
  expect(await h.player.play('/valid.mp3')).toBe(false); expect(h.sources).toHaveLength(0);
});
it('bounds the decoded cache and releases it on disposal', async () => {
  const h = harness();
  for (let i = 0; i < 9; i++) await h.player.play(`/${i}.mp3`);
  await h.player.play('/0.mp3'); expect(h.fetcher).toHaveBeenCalledTimes(10);
  h.player.dispose(); await h.player.play('/0.mp3'); expect(h.fetcher).toHaveBeenCalledTimes(11);
});
