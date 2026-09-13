import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronRight, Crosshair, Globe2, MapPin, Users, X } from 'lucide-react';
import StreetView from './components/StreetView';
import MarinaGame from './components/MarinaGame';
import FpsGame from './components/FpsGame';
import ExpeditionGame from './components/ExpeditionGame';
import LanLobby from './components/LanLobby';
import type { WorldZoneId } from './game/world-zones';
import type { LanSession } from './game/lan-peer';
import ArmoryShop from './components/ArmoryShop';
import { useArmory } from './game/use-armory';
import QueenstownGame from './components/QueenstownGame';
import RafflesGame from './components/RafflesGame';
import SingaporeMap from './components/SingaporeMap';
import { hasRegionGame, regionModeLabel } from './game/region-selection';
import { locations, type Location } from './data/locations';
import { IS_STATIC_SITE } from './lib/deployment';

export default function App() {
  const [location, setLocation] = useState<Location>(locations.find(place => place.id === 'marina-bay')!);
  const [regionOpen, setRegionOpen] = useState(() => !new URLSearchParams(window.location.search).has('room'));
  const [fpsOpen, setFpsOpen] = useState(false);
  const [armoryOpen, setArmoryOpen] = useState(false);
  const [expeditionOpen, setExpeditionOpen] = useState(false);
  const [expeditionStart, setExpeditionStart] = useState<WorldZoneId>('marina-bay');
  const [destination, setDestination] = useState<WorldZoneId | undefined>();
  const [lobbyOpen, setLobbyOpen] = useState(() => new URLSearchParams(window.location.search).has('room'));
  const [arena, setArena] = useState<{ session: LanSession; botCount: number; composition: string } | undefined>();
  const lanSession = useRef<LanSession | null>(null);
  useEffect(() => () => { lanSession.current?.close(); }, []);
  const armory = useArmory();
  const [dialog, setDialog] = useState<'about' | 'privacy' | 'terms' | null>(null);
  const leaveSession = () => { setExpeditionOpen(false); lanSession.current?.close(); lanSession.current = null; setArena(undefined); setLobbyOpen(false); };
  const chooseLocation = (next: Location) => { if (expeditionOpen) { setDestination(next.id); return; } leaveSession(); setLocation(next); setArmoryOpen(false); setFpsOpen(false); setRegionOpen(true); };
  const openStreetView = () => { leaveSession(); setArmoryOpen(false); setFpsOpen(false); setRegionOpen(false); };
  const openArmory = () => { if (!fpsOpen || location.id !== 'marina-bay') return; leaveSession(); setRegionOpen(false); setArmoryOpen(true); };
  const openFps = () => { leaveSession(); setLocation(locations.find(place => place.id === 'marina-bay')!); setArmoryOpen(false); setRegionOpen(false); setFpsOpen(true); };

  const openLobby = () => { leaveSession(); setLocation(locations.find(place => place.id === 'marina-bay')!); setArmoryOpen(false); setFpsOpen(false); setRegionOpen(false); setLobbyOpen(true); };
  const openExpedition = () => { if (expeditionOpen) return; leaveSession(); setExpeditionStart(location.id); setDestination(undefined); setArmoryOpen(false); setFpsOpen(false); setRegionOpen(false); setExpeditionOpen(true); };
  const launchArena = (session: LanSession, bots: number, squad: 'mixed' | 'assault' | 'tank' | 'sniper') => {
    setExpeditionOpen(false); lanSession.current?.close(); lanSession.current = session;
    setArena({ session, botCount: bots, composition: squad }); setLobbyOpen(false); setFpsOpen(true);
  };

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" aria-label="blockplaySG home"><span className="brand-mark"><span /><span /><span /></span>blockplaySG<span className="brand-dot">.</span></a>
      <div className="header-center"><span className="status-dot" /> SINGAPORE, PLAYABLE.</div>
      <button className="text-button" onClick={() => { setDialog('about'); }}>The idea <ArrowUpRight size={16} /></button>
    </header>

    <main>
      <section className="intro">
        <div><div className="eyebrow">A LITTLE CLOSER TO HOME</div><h1>Your neighborhood.<br /><span>Your playground.</span></h1></div>
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

          <SingaporeMap selected={location} onSelect={chooseLocation} expedition={expeditionOpen} destination={destination} />

          <div className="section-label mode-label"><span>02 / MAKE IT YOURS</span></div>
          <div className="mode-list">
            {hasRegionGame(location.id) && <button className={`mode-card ${regionOpen ? 'selected' : ''}`} aria-pressed={regionOpen} onClick={() => { leaveSession(); setArmoryOpen(false); setFpsOpen(false); setRegionOpen(true); }}><Globe2 size={20} /><span><strong>{regionModeLabel(location.id).name}</strong><small>{regionModeLabel(location.id).subtitle}</small></span><span className="radio-dot" /></button>}
            {location.id === 'marina-bay' && <button className={`mode-card ${fpsOpen && !arena ? 'selected' : ''}`} aria-pressed={fpsOpen && !arena} onClick={openFps}><Crosshair size={20} /><span><strong>Marina FPS</strong><small>Weapons ready. Range open.</small></span><span className="radio-dot" /></button>}
            <button className={`mode-card ${expeditionOpen ? 'selected' : ''}`} aria-pressed={expeditionOpen} onClick={openExpedition}><Globe2 size={20} /><span><strong>Open world</strong><small>Three districts. Find your way.</small></span><span className="radio-dot" /></button>
            <button className={`mode-card ${lobbyOpen || arena ? 'selected' : ''}`} aria-pressed={lobbyOpen || !!arena} onClick={openLobby}><Users size={20} /><span><strong>{IS_STATIC_SITE ? 'Solo arena' : 'LAN arena'}</strong><small>{IS_STATIC_SITE ? 'Take on the bots.' : 'Your squad. Live opponents.'}</small></span><span className="radio-dot" /></button>
            <button disabled={IS_STATIC_SITE} className={`mode-card ${!expeditionOpen && !lobbyOpen && !fpsOpen && !regionOpen ? 'selected' : ''}`} onClick={openStreetView} aria-pressed={!expeditionOpen && !lobbyOpen && !fpsOpen && !regionOpen}>
              <Globe2 size={20} /><span><strong>Street View</strong><small>{IS_STATIC_SITE ? 'Unavailable in this demo' : 'See the real neighborhood'}</small></span><span className="radio-dot" />
            </button>
          </div>
          <div className="sidebar-note"><span>✳</span><p>Big adventures.<br /><strong>Very local energy.</strong></p></div>
        </aside>

        <div className="experience">
          {expeditionOpen ? <ExpeditionGame initialZone={expeditionStart} destination={destination} onZoneChange={zone => setLocation(locations.find(place => place.id === zone)!)} profile={armory.profile} onExit={openFps} suspended={dialog !== null} /> : lobbyOpen ? <LanLobby onLaunch={launchArena} onBack={openFps} /> : armoryOpen ? <ArmoryShop store={armory} onEnterRange={openFps} /> : fpsOpen ? <FpsGame key={arena?.session.id || 'practice'} arena={arena} onLeaveArena={openLobby} profile={armory.profile} onReward={armory.award} onElimination={armory.awardElimination} onOpenShop={openArmory} suspended={dialog !== null} /> : regionOpen && hasRegionGame(location.id) ? (location.id === 'raffles-place' ? <RafflesGame key={location.id} /> : location.id === 'queenstown' ? <QueenstownGame key={location.id} /> : <MarinaGame key={location.id} />) : <>
          <div className="viewport"><StreetView key={location.id} location={location} /></div>
          <div className="experience-toolbar"><div className="experience-title"><span className="mode-icon"><Globe2 size={22} /></span><div><h3>The real {location.name}</h3><p>Google Street View · Drag to look, use arrows to travel</p></div></div></div>
          </>}
        </div>
      </section>

      <section className="below-playground"><div><span className="small-cross">+</span><p>Not just the skyline.<br /><strong>The places that make us, us.</strong></p></div><p>{location.description}</p><span className="edition">BUILT WITH ASTRA<br /><strong>SG / 2026 — PROTOTYPE 01</strong></span></section>
    </main>
    <footer><span>Made for the places we call home.</span><div><button onClick={() => { setDialog('terms'); }}>Terms</button><button onClick={() => { setDialog('privacy'); }}>Privacy</button><span>1° N, 103° E <span className="tiny-star">✳</span></span></div></footer>

    {dialog && <div className="modal-backdrop" onClick={() => setDialog(null)}><dialog open aria-labelledby="dialog-title" onCancel={() => setDialog(null)} onClick={event => event.stopPropagation()}><button autoFocus className="icon-button modal-close" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={20} /></button>
      <span className="eyebrow">blockplaySG / SINGAPORE</span><h2 id="dialog-title">{dialog === 'about' ? 'The whole island deserves to be playable.' : dialog === 'privacy' ? 'Privacy' : 'Prototype terms'}</h2>
      {dialog === 'about' ? <><p>Singapore is more than its postcards. blockplaySG explores the places we know through playable 3D scenes.</p><p>Marina 3D, Queenstown 3D and Raffles 3D are distinct walkable and driveable game regions: a waterfront with gardens and landmarks, a detailed estate with an elevated station, and a city core of towers, plazas and riverfront streets. References inform authored geometry; geography is compressed, not automatically reconstructed or surveyed.</p><p>Collect each region’s orange stamps on foot or in the car. Live Street View remains available separately. Luna powers Marina’s optional Change the adventure companion, with GPT-Live-1 for voice. Educational text/voice guides in all three regions offer source-linked facts and reflection questions without changing your progress. Objective changes remain Marina-only. Movement, collisions and stamp collection stay local; exploring alone makes no model calls.</p><p>Marina FPS adds a target exercise, an equipment shop, XP progression and driveable/flyable vehicles on the same Marina map. FPS and vehicle sessions support immersive fullscreen, with an expanded-view fallback when fullscreen is unavailable. No live map or model requests are made during FPS play.</p></> : dialog === 'privacy' ? <><p>This prototype has no accounts, analytics, or application database. Stamps and conversation history stay in memory and reset when you reset the region, leave its game mode, switch regions, or reload. Switching between Walk and Drive within a region preserves stamps. Your demo armory wallet, XP, permanent unlocks and equipped loadout are saved in this browser’s local storage. Clearing site data removes them. There are no real payments or account synchronization. Using Marina’s companion sends your request and game-state snapshot to OpenAI. Starting the microphone sends audio to OpenAI and plays an AI-generated voice; Stop ends the session. The app does not save microphone recordings or conversation history to a database.</p><p>Each region builds its game geometry locally in your browser. Live Street View connects your browser to Google, which processes connection and usage data under its <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. Your hosting provider may also retain standard access logs.</p></> : <><p>blockplaySG is an experimental hackathon prototype, provided as available. Its game maps are stylized interpretations with approximate or fictional layouts, not navigation tools. Marina FPS has no affiliation to the Singapore Armed Forces.</p><p>The owner confirmed permission for the saved imagery used as reference and in the earlier depth experiment; its source credits are preserved with those assets. The separate live Street View mode uses Google's official viewer. Google Maps features are also subject to <a href="https://www.google.com/help/terms_maps/" target="_blank" rel="noreferrer">Google Maps / Google Earth Additional Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>.</p></>}
    </dialog></div>}
  </div>;
}
