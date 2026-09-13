import { afterEach, expect, it, vi } from 'vitest';
import { LiveVoice } from './live-voice';
import { createAdventure } from '../game/adventure';
import { createAdventureClient } from './adventure-client';
afterEach(() => vi.useRealTimers());
it('uses delegation, not partial transcripts, and waits for applied results before speech', async () => {
  vi.useFakeTimers();
  const audio = { muted: true, pause() {} } as HTMLAudioElement;
  let resolve!: (value: string) => void;
  const request = vi.fn().mockImplementation(() => new Promise<string>(r => { resolve = r; }));
  const voice = new LiveVoice(audio, { state: vi.fn(), transcript: vi.fn(), request, error: vi.fn() });
  const send = vi.fn(); Object.assign(voice, { channel: { readyState: 'open', send, close() {} } });
  voice.handle({ type: 'session.started' });
  voice.handle({ type: 'session.input_transcript.delta', delta: 'give me something closer', start_ms: 0, end_ms: 1000 });
  expect(request).not.toHaveBeenCalled();
  voice.handle({ type: 'session.delegation.created', event_id: 'd1', offset_ms: 1000, delegation: { id: 'opaque_id', target: 'client' } });
  expect(request).toHaveBeenCalledWith('give me something closer', expect.any(AbortSignal)); expect(send).not.toHaveBeenCalled(); expect(audio.muted).toBe(true);
  resolve('Objective applied.'); await Promise.resolve();
  const event = JSON.parse(send.mock.calls[0][0]); expect(event.type).toBe('session.commentary.append'); expect(event.delegation_id).toBe('opaque_id');
  voice.handle({ type: 'session.commentary.appended', client_event_id: event.event_id }); expect(audio.muted).toBe(false);
  voice.stop(); voice.handle({ type: 'session.closed' });
});

const setupPendingVoice = () => {
  const game = createAdventure([{ id: 'a', name: 'A', x: 100, z: 0 }, { id: 'b', name: 'B', x: 10, z: 0 }], { x: 0, z: 0 });
  let resolve!: (value: Response) => void;
  const client = createAdventureClient(game, vi.fn().mockImplementation(() => new Promise<Response>(r => { resolve = r; })));
  const request = vi.fn((text: string, signal: AbortSignal) => client.send(text, signal));
  const voice = new LiveVoice({ muted: true, pause: vi.fn() } as unknown as HTMLAudioElement, { state: vi.fn(), transcript: vi.fn(), request, error: vi.fn() });
  voice.handle({ type: 'session.started' });
  voice.handle({ type: 'session.input_transcript.delta', delta: 'closer', end_ms: 1000 });
  voice.handle({ type: 'session.delegation.created', event_id: 'first', offset_ms: 1000, delegation: { id: 'first', target: 'client' } });
  return { game, voice, request, finish: async () => {
    resolve(new Response(JSON.stringify({ decision: { intent: 'named', destinationId: 'b' } })));
    await request.mock.results[0].value;
  } };
};

it('cancels the game request immediately when a newer delegation has no transcript yet', async () => {
  vi.useFakeTimers(); const { game, voice, request, finish } = setupPendingVoice();
  voice.handle({ type: 'session.delegation.created', event_id: 'next', offset_ms: 2000, delegation: { id: 'next', target: 'client' } });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][1].aborted).toBe(true);
  await finish(); expect(game.read().activeId).toBe('a'); voice.stop();
});

it.each(['session.closed', 'stop'])('cancels a pending game change on %s even when fetch ignores abort', async event => {
  vi.useFakeTimers(); const { game, voice, finish } = setupPendingVoice();
  if (event === 'stop') voice.stop(); else voice.handle({ type: event });
  await finish(); expect(game.read().activeId).toBe('a');
});

it('old voice cleanup does not pause or clear a newer output stream', () => {
  const oldStream = {}, newStream = {}, pause = vi.fn();
  const audio = { muted: false, srcObject: newStream, pause } as unknown as HTMLAudioElement;
  const voice = new LiveVoice(audio, { state: vi.fn(), transcript: vi.fn(), request: vi.fn(), error: vi.fn() });
  Object.assign(voice, { outputStream: oldStream }); audio.muted = false;
  voice.handle({ type: 'session.closed' });
  expect(audio.srcObject).toBe(newStream); expect(pause).not.toHaveBeenCalled(); expect(audio.muted).toBe(false);
});

it('does not unmute an old commentary acknowledgement after a newer delegation', async () => {
  vi.useFakeTimers(); const send = vi.fn();
  const audio = { muted: true } as HTMLAudioElement;
  const voice = new LiveVoice(audio, { state: vi.fn(), transcript: vi.fn(), request: vi.fn().mockResolvedValue('Applied'), error: vi.fn() });
  Object.assign(voice, { channel: { readyState: 'open', send, close() {} } });
  voice.handle({ type: 'session.started' });
  voice.handle({ type: 'session.input_transcript.delta', delta: 'closer', end_ms: 1000 });
  voice.handle({ type: 'session.delegation.created', delegation: { id: 'first', target: 'client' }, offset_ms: 1000 });
  await Promise.resolve(); const commentary = JSON.parse(send.mock.calls[0][0]);
  voice.handle({ type: 'session.delegation.created', delegation: { id: 'next', target: 'client' }, offset_ms: 2000 });
  voice.handle({ type: 'session.commentary.appended', client_event_id: commentary.event_id });
  expect(audio.muted).toBe(true); voice.stop(); voice.handle({ type: 'session.closed' });
});

it('returns to listening for new speech and falls back if its delegated transcript never arrives', () => {
  vi.useFakeTimers(); const state = vi.fn(), error = vi.fn();
  const voice = new LiveVoice({ muted: true } as HTMLAudioElement, { state, error, transcript: vi.fn(), request: vi.fn() });
  voice.handle({ type: 'session.started' });
  voice.handle({ type: 'session.input_transcript.delta', delta: '', end_ms: 0 });
  expect(state).toHaveBeenLastCalledWith('listening');
  voice.handle({ type: 'session.delegation.created', delegation: { id: 'missing', target: 'client' }, offset_ms: 1000 });
  vi.advanceTimersByTime(15000);
  expect(error).toHaveBeenCalledWith(expect.stringContaining('transcript did not arrive'));
  expect(state).toHaveBeenLastCalledWith('off');
});

it('bounds the wait for spoken acknowledgement without falsely reporting unchanged objective', async () => {
  vi.useFakeTimers(); const error = vi.fn();
  const voice = new LiveVoice({ muted: true } as HTMLAudioElement, { state: vi.fn(), error, transcript: vi.fn(), request: vi.fn().mockResolvedValue('Applied') });
  voice.handle({ type: 'session.started' });
  voice.handle({ type: 'session.input_transcript.delta', delta: 'museum', end_ms: 1000 });
  voice.handle({ type: 'session.delegation.created', delegation: { id: 'd', target: 'client' }, offset_ms: 1000 });
  await Promise.resolve(); vi.advanceTimersByTime(15000);
  expect(error).toHaveBeenCalledWith(expect.stringContaining('Check the objective HUD'));
});
it('waits for missing transcript and ignores duplicate delegation or closed-session events', async () => {
  vi.useFakeTimers(); const request = vi.fn().mockResolvedValue(null);
  const voice = new LiveVoice({ muted: true, pause() {} } as HTMLAudioElement, { state: vi.fn(), transcript: vi.fn(), request, error: vi.fn() });
  voice.handle({ type: 'session.started' });
  const event = { type: 'session.delegation.created', event_id: 'once', offset_ms: 1000, delegation: { id: 'd', target: 'client' } };
  voice.handle(event); expect(request).not.toHaveBeenCalled();
  voice.handle({ type: 'session.input_transcript.delta', delta: 'museum', start_ms: 0, end_ms: 900 }); expect(request).toHaveBeenCalledTimes(1);
  voice.handle(event); expect(request).toHaveBeenCalledTimes(1);
  voice.stop(); voice.handle({ ...event, event_id: 'late' }); expect(request).toHaveBeenCalledTimes(1);
});
