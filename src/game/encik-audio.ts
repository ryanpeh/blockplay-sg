/** One interruptible radio channel with a small decoded-audio cache. */
export function createEncikAudio(getContext: () => AudioContext | null, fetcher: typeof fetch = fetch) {
  const cache = new Map<string, AudioBuffer>();
  let sequence = 0, loading: AbortController | null = null;
  let active: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  function stop() {
    sequence++;
    loading?.abort(); loading = null;
    if (active) {
      const { source, gain } = active; active = null;
      source.onended = null; source.stop(); source.disconnect(); gain.disconnect();
    }
  }
  return {
    stop,
    dispose() { stop(); cache.clear(); },
    async play(url: string): Promise<boolean> {
      stop();
      const ticket = sequence, context = getContext();
      if (!context) return false;
      const controller = new AbortController(); loading = controller;
      try {
        let buffer = cache.get(url);
        if (!buffer) {
          const response = await fetcher(url, { signal: controller.signal });
          if (!response.ok) return false;
          buffer = await context.decodeAudioData(await response.arrayBuffer());
        }
        // A pause, mute, interruption or scene disposal invalidates a late fetch/decode.
        if (ticket !== sequence || context.state !== 'running') return false;
        cache.delete(url); cache.set(url, buffer);
        if (cache.size > 8) cache.delete(cache.keys().next().value!);
        const source = context.createBufferSource(), gain = context.createGain();
        source.buffer = buffer; gain.gain.value = .7;
        source.connect(gain).connect(context.destination);
        active = { source, gain };
        source.onended = () => {
          source.disconnect(); gain.disconnect();
          if (active?.source === source) active = null;
        };
        source.start();
        return true;
      } catch { return false; }
      finally { if (loading === controller) loading = null; }
    },
  };
}
