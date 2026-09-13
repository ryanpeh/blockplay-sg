import { useCallback, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, CarFront, Check, ChevronRight, Crosshair, Flag, Globe2, MapPin, Pause, Play, RotateCcw, X } from 'lucide-react';
import World, { type GameStats } from './game/World';
import StreetView from './components/StreetView';
import MarinaWorld from './components/MarinaWorld';
import { locations, type Location, type Mode } from './data/locations';

const emptyStats: GameStats = { speed: 0, distance: 0, score: 0, elapsed: 0 };
const modes = [
  { id: 'drive' as const, name: 'Joyride', label: 'Take the scenic route', icon: CarFront },
  { id: 'training' as const, name: 'Target practice', label: 'An NS-inspired arcade drill', icon: Crosshair },
  { id: 'explore' as const, name: 'Street View', label: 'See the real neighborhood', icon: Globe2 },
];

export default function App() {
  const [location, setLocation] = useState<Location>(locations[3]);
  const [marinaOpen, setMarinaOpen] = useState(true);
  const [mode, setMode] = useState<Mode>(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ? 'explore' : 'drive');
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [stats, setStats] = useState(emptyStats);
  const [dialog, setDialog] = useState<'about' | 'privacy' | 'terms' | null>(null);
  const controls = useRef(new Set<string>());
  const onStats = useCallback((value: GameStats) => setStats(value), []);
  const onFinish = useCallback(() => { setFinished(true); setRunning(false); }, []);
  const reset = () => {
    setRunning(false); setStarted(false); setFinished(false); setStats(emptyStats); setEpoch(n => n + 1); controls.current.clear();
  };
  const chooseLocation = (next: Location) => { setLocation(next); setMarinaOpen(next.id === 'marina-bay'); reset(); };
  const chooseMode = (next: Mode) => { setMode(next); setMarinaOpen(false); reset(); };
  const start = () => { setStarted(true); setRunning(true); };
  const total = mode === 'drive' ? 3 : 5;

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" aria-label="Blockplay home"><span className="brand-mark"><span /><span /><span /></span>blockplay<span className="brand-dot">.</span></a>
      <div className="header-center"><span className="status-dot" /> SINGAPORE, PLAYABLE.</div>
      <button className="text-button" onClick={() => { setRunning(false); setDialog('about'); }}>The idea <ArrowUpRight size={16} /></button>
    </header>

    <main>
      <section className="intro">
        <div><div className="eyebrow"><span className="tiny-star">✳</span> A LITTLE CLOSER TO HOME</div><h1>Your neighborhood.<br /><span>Your playground.</span></h1></div>
        <p>Beyond the postcards. Around your block.<br />Rediscover Singapore, one little adventure at a time.</p>
      </section>

      <section className="workspace" aria-label="Singapore playground">
        <aside className="sidebar">
          <div className="section-label"><span>01 / PICK YOUR PLACE</span><MapPin size={15} /></div>
          <div className="location-list">
            {locations.map((item, index) => <button key={item.id} className={`location-card ${location.id === item.id ? 'selected' : ''}`} onClick={() => chooseLocation(item)} aria-pressed={location.id === item.id}>
              <span className={`location-thumbnail thumb-${index}`} style={{ '--block-color': item.color } as React.CSSProperties}><i /><i /><i /><b /></span>
              <span className="location-copy"><strong>{item.name}</strong><small>{item.district}</small></span>
              {location.id === item.id ? <span className="selected-check"><Check size={12} /></span> : <ChevronRight size={15} className="muted" />}
            </button>)}
          </div>

          <div className="section-label mode-label"><span>02 / MAKE IT YOURS</span></div>
          <div className="mode-list">
            {location.id === 'marina-bay' && <button className={`mode-card ${marinaOpen ? 'selected' : ''}`} aria-pressed={marinaOpen} onClick={() => { reset(); setMarinaOpen(true); }}><Globe2 size={20} /><span><strong>Marina 3D</strong><small>Walk / drive the reconstruction</small></span><span className="radio-dot" /></button>}
            {modes.map(({ id, name, label, icon: Icon }) => <button key={id} className={`mode-card ${!marinaOpen && mode === id ? 'selected' : ''}`} onClick={() => chooseMode(id)} aria-pressed={!marinaOpen && mode === id}>
              <Icon size={20} strokeWidth={1.6} /><span><strong>{name}</strong><small>{label}</small></span><span className="radio-dot" />
            </button>)}
          </div>
          <div className="sidebar-note"><span>✳</span><p>Big adventures.<br /><strong>Very local energy.</strong></p></div>
        </aside>

        <div className="experience">
          {marinaOpen ? <MarinaWorld /> : <>
          <div className={`viewport ${mode === 'training' && running ? 'training-active' : ''}`}>
            {mode === 'explore' ? <StreetView key={location.id} location={location} /> : <>
              <World key={epoch} location={location} mode={mode} running={running} controls={controls} onStats={onStats} onFinish={onFinish} />
              <div className="scene-top"><span className="scene-badge"><span className="status-dot" /> PLAYABLE DEMO</span><span className="coordinates">{location.lat.toFixed(4)}° N &nbsp; {location.lng.toFixed(4)}° E</span></div>
              <div className="scene-place"><span>{location.district} / SG</span><h2>{location.name}<span>↗</span></h2><p>Original stylized scene · not a map reconstruction</p></div>

              {!running && <div className="play-overlay"><div className="play-card">
                <span className="eyebrow">{finished ? 'NICELY DONE, LAH.' : started ? 'TAKE YOUR TIME' : mode === 'drive' ? 'NO ERP. NO RUSH.' : 'FALL IN. HAVE FUN.'}</span>
                <h3>{finished ? (mode === 'drive' ? 'Home, the scenic way.' : 'Five for five.') : started ? 'A little pit stop.' : mode === 'drive' ? 'Meet you downstairs.' : 'Ready for your detail?'}</h3>
                <p>{finished ? `Completed in ${stats.elapsed.toFixed(1)} seconds. Another round?` : mode === 'drive' ? 'Cruise through the estate and pass all 3 orange gates.' : 'Click or tap all 5 orange targets. An arcade drill with no weapon simulation.'}</p>
                <button className="primary-button" onClick={event => { event.currentTarget.blur(); if (finished) reset(); else start(); }}>
                  {finished ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />} {finished ? 'Reset circuit' : started ? 'Keep going' : mode === 'drive' ? 'Let’s take a drive' : 'Start practice'} <ArrowRight size={17} />
                </button>
                {!finished && <small>{mode === 'drive' ? 'WASD / arrow keys to drive · Space to brake' : 'Click / tap to aim and hit a target'}</small>}
              </div></div>}

              {running && <div className="live-hud">{mode === 'drive' ? <Flag size={16} /> : <Crosshair size={16} />}<span>{stats.score} / {total} {mode === 'drive' ? 'checkpoints' : 'targets'}</span><span className="hud-divider" />{stats.elapsed.toFixed(1)}s</div>}
              <div className="scene-bottom"><span className="scene-caption">{mode === 'drive' ? 'THE HEARTLAND CIRCUIT' : 'THE VOID DECK DRILL'}</span><span className="compass">N <ArrowUp size={18} /></span></div>
            </>}
          </div>

          <div className="experience-toolbar">
            <div className="experience-title"><span className="mode-icon">{mode === 'drive' ? <CarFront size={22} /> : mode === 'training' ? <Crosshair size={22} /> : <Globe2 size={22} />}</span><div><h3>{mode === 'explore' ? 'The real ' + location.name : location.subtitle}</h3><p>{mode === 'explore' ? 'Google Street View · Drag to look, use arrows to travel' : mode === 'drive' ? 'Free drive · 240 m circuit' : 'Arcade target practice · 5 targets'}</p></div></div>
            {mode !== 'explore' && <div className="toolbar-actions"><button className="icon-button" onClick={reset} title="Reset session" aria-label="Reset session"><RotateCcw size={17} /></button><button className="session-button" disabled={finished} onClick={event => { event.currentTarget.blur(); if (running) setRunning(false); else start(); }}>{running ? <Pause size={15} /> : <Play size={15} />} {running ? 'Pause' : started ? 'Resume' : 'Start'}</button></div>}
          </div>
          {mode !== 'explore' && <div className="session-strip">
            <div><span>{mode === 'drive' ? 'SPEED' : 'HITS'}</span><strong>{mode === 'drive' ? Math.round(stats.speed * 3.6) : stats.score}<small>{mode === 'drive' ? 'km/h' : '/ 5'}</small></strong></div>
            <div className="route-progress"><span>{mode === 'drive' ? 'YOUR LITTLE ADVENTURE' : 'PRACTICE PROGRESS'}</span><div className="progress-track"><i style={{ width: `${mode === 'drive' ? stats.distance / 240 * 100 : stats.score / 5 * 100}%` }} /></div></div>
            <div className="touch-controls" aria-label="Driving controls">{mode === 'drive' ? [ ['a', ArrowLeft, 'Steer left'], ['w', ArrowUp, 'Accelerate'], ['s', ArrowDown, 'Brake'], ['d', ArrowRight, 'Steer right'] ].map(([key, Icon, label]) => {
              const ControlIcon = Icon as typeof ArrowUp;
              return <button key={String(key)} aria-label={String(label)} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); if (running) controls.current.add(String(key)); }} onPointerUp={() => controls.current.delete(String(key))} onPointerCancel={() => controls.current.delete(String(key))} onLostPointerCapture={() => controls.current.delete(String(key))}><ControlIcon size={15} /></button>;
            }) : <span className="practice-hint">Point. Click. Shiok.</span>}</div>
          </div>}
          </>}
        </div>
      </section>

      <section className="below-playground"><div><span className="small-cross">+</span><p>Not just the skyline.<br /><strong>The places that make us, us.</strong></p></div><p>{location.description}</p><span className="edition">BUILT WITH ASTRA<br /><strong>SG / 2026 — PROTOTYPE 01</strong></span></section>
    </main>
    <footer><span>Made for the places we call home.</span><div><button onClick={() => { setRunning(false); setDialog('terms'); }}>Terms</button><button onClick={() => { setRunning(false); setDialog('privacy'); }}>Privacy</button><span>1° N, 103° E <span className="tiny-star">✳</span></span></div></footer>

    {dialog && <div className="modal-backdrop" onClick={() => setDialog(null)}><dialog open aria-labelledby="dialog-title" onCancel={() => setDialog(null)} onClick={event => event.stopPropagation()}><button autoFocus className="icon-button modal-close" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={20} /></button>
      <span className="eyebrow">BLOCKPLAY / SINGAPORE</span><h2 id="dialog-title">{dialog === 'about' ? 'The whole island deserves to be playable.' : dialog === 'privacy' ? 'Privacy' : 'Prototype terms'}</h2>
      {dialog === 'about' ? <><p>Singapore is more than its postcards. Blockplay explores the places we know through real imagery and playable 3D scenes.</p><p>Marina 3D uses depth estimated locally from four authorized Street View images captured in February 2012. Walk or drive inside a small exploration boundary. Geometry, scale, and ground elevation are approximate; this is not a complete district reconstruction.</p><p>The other game modes use original procedural geometry. Live Street View remains available separately. Astra assists engineering; the reconstruction build uses Depth Anything V2 locally, with no live model calls while you play.</p></> : dialog === 'privacy' ? <><p>This prototype has no accounts, analytics, or application database. Session progress stays in memory and resets when the page reloads.</p><p>Marina 3D loads saved assets from this host. Live Street View and Google Fonts connect your browser to Google, which processes connection and usage data under its <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. Your hosting provider may also retain standard access logs.</p></> : <><p>Blockplay is an experimental hackathon prototype, provided as available. Marina 3D has approximate image-derived depth, and the other game scenes have fictional layouts. Neither is a navigation tool. Target practice has no affiliation to the Singapore Armed Forces.</p><p>Marina 3D uses source imagery with permission confirmed by the project owner and retains source credits. The separate live Street View mode uses Google's official viewer. Google Maps features are also subject to <a href="https://www.google.com/help/terms_maps/" target="_blank" rel="noreferrer">Google Maps / Google Earth Additional Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p></>}
    </dialog></div>}
  </div>;
}
