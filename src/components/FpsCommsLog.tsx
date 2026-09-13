import { useEffect, useRef, useState } from 'react';
import type { CommsChannel, CommsEntry } from '../game/fps-comms';
import './fps-comms.css';
export default function FpsCommsLog({ entries }: { entries: readonly CommsEntry[] }) {
  const [channel, setChannel] = useState<CommsChannel | 'all'>('all'), [expanded, setExpanded] = useState(false);
  const scroll = useRef<HTMLDivElement>(null), following = useRef(true);
  const visible = entries.filter(entry => channel === 'all' || entry.channel === channel);
  const last = visible.at(-1)?.id;
  useEffect(() => { if (following.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [last, channel, expanded]);
  return <section className={`fps-comms ${expanded ? 'is-expanded' : ''}`} aria-label="Combat and speech history">
    <header><strong>COMMS LOG</strong><div role="group" aria-label="Log channels">
      {(['all', 'radio', 'kills', 'system'] as const).map(value => <button key={value} aria-pressed={channel === value} onClick={() => { following.current = true; setChannel(value); }}>{value === 'radio' ? 'Speech' : value[0].toUpperCase() + value.slice(1)}</button>)}
    </div><button aria-label={expanded ? 'Collapse comms history' : 'Expand comms history'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '−' : '+'}</button></header>
    <div className="fps-comms-entries" ref={scroll} role="log" aria-label={`${channel} comms entries`} aria-live="off" tabIndex={0}
      onScroll={event => { const node = event.currentTarget; following.current = node.scrollHeight - node.scrollTop - node.clientHeight < 20; }}>
      {!visible.length && <p className="fps-comms-empty">{channel === 'all' ? 'Section net ready. Callouts and kills appear here.' : `No ${channel === 'radio' ? 'speech' : channel} entries yet.`}</p>}
      {visible.map(entry => <p key={entry.id} className={`fps-comms-entry channel-${entry.channel}`} data-channel={entry.channel}>
        <time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</time>
        <b>{entry.source}</b><span>{entry.text}</span>
      </p>)}
    </div>
  </section>;
}
