import { randomUuid } from './random-id';

export type VoiceState = 'off' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'closing';
type Transcript = { delta: string; start_ms: number; end_ms: number };
type LiveEvent = { type: string; event_id?: string; delta?: string; start_ms?: number; end_ms?: number; offset_ms?: number; delegation?: { id: string; target: string }; client_event_id?: string };
type Callbacks = {
  state(value: VoiceState): void;
  transcript(value: string, speaker: 'user' | 'assistant'): void;
  request(text: string, signal: AbortSignal): Promise<string | null>;
  error(message: string): void;
};

// Live uses a different protocol from Realtime: no response.create/audio-buffer events.
// Only delegation events (or explicit UI submission) start work, never transcript gaps.
export class LiveVoice {
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private microphone?: MediaStream;
  private outputStream?: MediaStream;
  private controller = new AbortController();
  private requestController?: AbortController;
  private stopped = false;
  private ready = false;
  private timer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private lifetime?: ReturnType<typeof setTimeout>;
  private turnTimer?: ReturnType<typeof setTimeout>;
  private seen = new Set<string>();
  private fragments: Transcript[] = [];
  private assistantText = '';
  private pending?: { id: string; offset: number };
  private lastOffset = -1;
  private generation = 0;
  private playbackEvent = '';
  constructor(private audio: HTMLAudioElement, private callbacks: Callbacks) { audio.muted = true; }

  private send(event: object) { if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event)); }
  private fail(message: string) { if (!this.stopped) { this.callbacks.error(message); this.stop(); } }
  async start() {
    this.callbacks.state('connecting');
    this.timer = setTimeout(() => this.fail('Voice connection timed out. Text is still available.'), 35000);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone requires HTTPS or localhost.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (this.stopped) { stream.getTracks().forEach(t => t.stop()); return; }
      this.microphone = stream;
      const peer = this.peer = new RTCPeerConnection();
      peer.ontrack = event => {
        if (this.stopped) return;
        this.outputStream = new MediaStream([event.track]); this.audio.srcObject = this.outputStream;
        void this.audio.play().catch(() => this.fail('Audio playback was blocked. Text is still available; retry the microphone.'));
      };
      peer.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(peer.connectionState)) this.fail('Voice disconnected. Text is still available.');
      };
      stream.getTracks().forEach(track => { peer.addTrack(track, stream); track.onended = () => this.fail('Microphone stopped. Text is still available.'); });
      const channel = this.channel = peer.createDataChannel('oai-events');
      channel.onmessage = event => {
        try { this.handle(JSON.parse(event.data)); } catch { this.fail('Voice event failed. Text is still available.'); }
      };
      channel.onclose = () => { if (!this.stopped) this.fail('Voice connection closed. Text is still available.'); };
      channel.onerror = () => this.fail('Voice connection failed. Text is still available.');
      await peer.setLocalDescription(await peer.createOffer());
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { peer.removeEventListener('icegatheringstatechange', check); reject(new Error('ICE timeout')); }, 10000);
        const check = () => { if (peer.iceGatheringState === 'complete') { clearTimeout(timeout); peer.removeEventListener('icegatheringstatechange', check); resolve(); } };
        peer.addEventListener('icegatheringstatechange', check); check();
      });
      if (this.stopped) return;
      const response = await fetch('/api/adventure/voice-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sdp: peer.localDescription?.sdp }), signal: this.controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 503 ? 'Configure OPENAI_API_KEY on the server.' : 'GPT-Live-1 connection failed. Check model access.');
      const result = await response.json();
      if (this.stopped) return;
      await peer.setRemoteDescription({ type: 'answer', sdp: result.transport.sdp });
    } catch (error) {
      this.fail(error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone permission denied. You can still type your request.'
        : 'Voice could not connect. Check microphone permission and GPT-Live-1 access; text is still available.');
    }
  }

  handle(event: LiveEvent) {
    if (event.type === 'session.closed') { this.cleanup(); return; }
    if (this.stopped) return;
    if (event.event_id) { if (this.seen.has(event.event_id)) return; this.seen.add(event.event_id); }
    if (event.type === 'session.started') {
      this.ready = true; clearTimeout(this.timer); this.callbacks.state('listening');
      this.lifetime = setTimeout(() => this.fail('Voice session ended after three minutes. Tap the microphone to reconnect.'), 180000);
    } else if (event.type === 'session.input_transcript.delta' && typeof event.delta === 'string') {
      this.fragments.push({ delta: event.delta, start_ms: event.start_ms ?? 0, end_ms: event.end_ms ?? 0 });
      this.audio.muted = true;
      this.playbackEvent = '';
      this.callbacks.state('listening');
      this.callbacks.transcript(this.fragments.filter(f => f.end_ms > this.lastOffset).map(f => f.delta).join(''), 'user');
      this.dispatch();
    } else if (event.type === 'session.output_transcript.delta' && typeof event.delta === 'string') {
      // Do not display or play unverified success claims while a game request is pending.
      if (!this.audio.muted) { this.assistantText += event.delta; this.callbacks.transcript(this.assistantText, 'assistant'); }
    } else if (event.type === 'session.delegation.created' && event.delegation?.target === 'client') {
      this.audio.muted = true;
      this.playbackEvent = '';
      this.requestController?.abort();
      clearTimeout(this.turnTimer);
      this.turnTimer = setTimeout(() => this.fail('Voice transcript did not arrive. Please try typing your request.'), 15000);
      this.generation++;
      this.pending = { id: event.delegation.id, offset: event.offset_ms ?? 0 };
      this.dispatch();
    } else if (event.type === 'session.commentary.appended' && this.playbackEvent && event.client_event_id === this.playbackEvent) {
      clearTimeout(this.turnTimer);
      this.audio.muted = false; this.callbacks.state('speaking');
    } else if (event.type === 'error') this.fail('GPT-Live-1 reported an error. Text is still available.');
  }

  private dispatch() {
    if (!this.pending || !this.ready) return;
    const text = this.fragments.filter(f => f.end_ms > this.lastOffset).map(f => f.delta).join('').trim();
    if (!text) return; // A delegation can arrive before its transcript; wait for the latter.
    const { id, offset } = this.pending; this.pending = undefined;
    clearTimeout(this.turnTimer);
    this.lastOffset = Math.max(offset, ...this.fragments.map(f => f.end_ms));
    const current = ++this.generation;
    const controller = this.requestController = new AbortController();
    this.callbacks.state('processing'); this.assistantText = '';
    void this.callbacks.request(text.slice(-1200), controller.signal).then(message => {
      if (this.stopped || current !== this.generation || !message) return;
      this.playbackEvent = randomUuid();
      this.turnTimer = setTimeout(() => this.fail('Voice reply did not arrive. Check the objective HUD; text is still available.'), 15000);
      this.send({ type: 'session.commentary.append', event_id: this.playbackEvent, delegation_id: id, content: message });
    }).catch(() => { if (!this.stopped && current === this.generation) this.fail('Voice request failed. Try typing.'); });
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true; this.generation++; this.controller.abort(); clearTimeout(this.timer); clearTimeout(this.lifetime);
    this.requestController?.abort();
    clearTimeout(this.turnTimer);
    this.audio.muted = true; this.microphone?.getTracks().forEach(t => { t.enabled = false; t.stop(); });
    if (this.ready && this.channel?.readyState === 'open') {
      this.callbacks.state('closing'); this.send({ type: 'session.close' });
      this.closeTimer = setTimeout(() => { this.callbacks.error('Voice disconnected before final usage was confirmed.'); this.cleanup(); }, 5000);
    } else this.cleanup();
  }
  private cleanup() {
    this.stopped = true; this.generation++; this.controller.abort(); clearTimeout(this.timer); clearTimeout(this.closeTimer); clearTimeout(this.lifetime);
    this.requestController?.abort();
    clearTimeout(this.turnTimer);
    this.microphone?.getTracks().forEach(t => t.stop()); this.channel?.close(); this.peer?.close();
    if (this.outputStream && this.audio.srcObject === this.outputStream) { this.audio.pause(); this.audio.srcObject = null; }
    this.callbacks.state('off');
  }
}
