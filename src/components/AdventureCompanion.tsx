import { useEffect, useRef, useState } from 'react';
import { Mic, Send, Square } from 'lucide-react';
import type { AdventureGame } from '../game/adventure';
import { createAdventureClient } from '../lib/adventure-client';
import { LiveVoice, type VoiceState } from '../lib/live-voice';
import type { LearningTopic } from '../data/singapore-guide';

export default function AdventureCompanion({ game }: { game: AdventureGame }) {
  const [learning, setLearning] = useState<LearningTopic | null>(null);
  const [client] = useState(() => createAdventureClient(game, undefined, setLearning));
  const [text, setText] = useState('');
  const [history, setHistory] = useState<{ role: string; text: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('off');
  const [transcript, setTranscript] = useState('');
  const [spoken, setSpoken] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const voice = useRef<LiveVoice | undefined>(undefined);
  const sequence = useRef(0), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; sequence.current++; client.cancel(); voice.current?.stop(); };
  }, [client]);
  const append = (role: string, value: string) => setHistory(items => [...items.slice(-19), { role, text: value }]);
  const send = async (value: string, signal?: AbortSignal) => {
    const request = ++sequence.current;
    append('You', value); setProcessing(true); setError('');
    const canceled = () => { if (mounted.current && request === sequence.current) setProcessing(false); };
    signal?.addEventListener('abort', canceled, { once: true });
    try {
      const response = await client.send(value, signal);
      if (!mounted.current || signal?.aborted || request !== sequence.current || !response) return null;
      append('Companion', response); return response;
    } catch (failure) {
      if (!mounted.current || signal?.aborted || request !== sequence.current) return null;
      const message = failure instanceof Error ? failure.message : 'Request failed. Try again.';
      setError(message); return message;
    } finally {
      signal?.removeEventListener('abort', canceled);
      if (mounted.current && request === sequence.current) setProcessing(false);
    }
  };
  const stopVoice = () => {
    sequence.current++; client.cancel(); setProcessing(false);
    const previous = voice.current; voice.current = undefined;
    setVoiceState('off'); previous?.stop();
  };
  const startVoice = () => {
    stopVoice(); setError(''); setTranscript(''); setSpoken('');
    const session: LiveVoice = new LiveVoice(audio.current!, {
      state: state => { if (mounted.current && voice.current === session) setVoiceState(state); },
      transcript: (value, speaker) => { if (mounted.current && voice.current === session) { if (speaker === 'user') setTranscript(value); else setSpoken(value); } },
      request: (value, signal) => voice.current === session && mounted.current ? send(value, signal) : Promise.resolve(null),
      error: message => { if (mounted.current && voice.current === session) { client.cancel(); sequence.current++; setProcessing(false); setError(message); } },
    });
    voice.current = session; void session.start();
  };
  return <section className="adventure-companion" aria-label="Change the adventure" onKeyDown={e => e.stopPropagation()} onKeyUp={e => e.stopPropagation()}>
    <div className="companion-heading"><strong>Change the adventure</strong><span role="status">{processing ? 'Processing…' : voiceState === 'off' ? 'Luna · text / voice' : voiceState === 'speaking' ? 'Replying · microphone on' : `${voiceState}…`}</span></div>
    <div className="companion-history" role="log" aria-label="Companion conversation" aria-live="polite">
      {history.length ? history.map((item, i) => <p key={i}><b>{item.role}:</b> {item.text}</p>) : <p>Change your route or learn about Singapore. Try “something closer”, “tell me about this stop”, or “what makes Queenstown special?”. Your stamps stay collected.</p>}
    </div>
    <div className="companion-suggestions" aria-label="Explore and learn">
      {['Tell me about this stop', 'Marina Bay highlights', 'Tell me about Queenstown'].map(prompt => <button key={prompt} type="button" onClick={() => { stopVoice(); void send(prompt); }}>{prompt}</button>)}
    </div>
    {learning && <aside className="companion-learning" aria-label="Singapore learning card">
      <strong>{learning.title}</strong>
      <ul>{learning.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
      <p><b>Think about it:</b> {learning.notice}</p>
      <a href={learning.url} target="_blank" rel="noopener noreferrer">Source: {learning.source} ↗</a>
      <small>Real-place context · stylised game landmarks · facts reviewed 13 Sep 2026. Learning does not change your objective.</small>
    </aside>}
    {transcript && voiceState !== 'off' && <p className="companion-caption">Heard: {transcript}</p>}
    {spoken && voiceState !== 'off' && <p className="companion-caption">Voice: {spoken}</p>}
    {error && <p className="companion-error" role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); if (!text.trim()) return; stopVoice(); void send(text.trim()); setText(''); }}>
      <input aria-label="Adventure request" value={text} maxLength={1200} onChange={e => setText(e.target.value)} placeholder="Where shall we go, or what would you like to learn?" autoComplete="off" />
      <button type="submit" aria-label="Send adventure request" disabled={!text.trim()}><Send size={16} /></button>
      <button type="button" aria-label={voiceState === 'off' ? 'Start microphone' : 'Stop microphone'} aria-pressed={voiceState !== 'off'} onClick={voiceState === 'off' ? startVoice : stopVoice}>{voiceState === 'off' ? <Mic size={16} /> : <Square size={16} />}</button>
    </form>
    <small>AI voice · microphone audio goes to OpenAI only while connected. Text remains available.</small>
    <audio ref={audio} autoPlay />
  </section>;
}
