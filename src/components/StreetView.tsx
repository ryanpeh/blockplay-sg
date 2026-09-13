import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, MapPin, RotateCcw, RotateCw } from 'lucide-react';
import type { Location } from '../data/locations';
import { loadGoogleMaps, MAPS_AUTH_ERROR } from '../lib/google-maps';
import { nextPanorama } from '../lib/street-view-navigation';

export default function StreetView({ location }: { location: Location }) {
  const host = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const moveLock = useRef(false);
  const [status, setStatus] = useState('Finding your street…');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [viewpoint, setViewpoint] = useState(0);
  const [address, setAddress] = useState('');
  const [canForward, setCanForward] = useState(false);
  const [canBack, setCanBack] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let cancelled = false;
    let panorama: google.maps.StreetViewPanorama | undefined;
    const listeners: google.maps.MapsEventListener[] = [];
    setLoading(true); setStatus('Finding your street…'); setAddress('');
    setCanForward(false); setCanBack(false); moveLock.current = false;
    const fail = (message: string) => { if (!cancelled) { setLoading(false); setStatus(message); } };
    const authorizationFailed = () => fail('Google Maps could not authorize this site. Check billing, Maps JavaScript API, and the key’s allowed website referrers, then reload.');
    window.addEventListener(MAPS_AUTH_ERROR, authorizationFailed);
    const deadline = window.setTimeout(() => {
      fail('This street is taking too long to load. Retry or choose another starting point.');
      cancelled = true;
    }, 25000);
    async function init() {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled) return;
        const lib = await maps.importLibrary('streetView') as google.maps.StreetViewLibrary;
        if (cancelled) return;
        const point = location.viewpoints[viewpoint];
        const result = await new lib.StreetViewService().getPanorama({
          location: { lat: point.lat, lng: point.lng }, radius: 200,
          preference: google.maps.StreetViewPreference.NEAREST,
          sources: [google.maps.StreetViewSource.OUTDOOR],
        });
        if (cancelled) return;
        if (!result.data.location?.pano) throw new Error('No outdoor panorama was found here. Try another starting point.');
        panorama = new lib.StreetViewPanorama(container, {
          pano: result.data.location.pano,
          pov: { heading: point.heading, pitch: 0 }, zoom: 0,
          addressControl: true, fullscreenControl: true, imageDateControl: true,
          motionTracking: false, motionTrackingControl: false,
        });
        panoramaRef.current = panorama;
        const sync = () => {
          if (cancelled || !panorama) return;
          const heading = panorama.getPov().heading;
          const links = panorama.getLinks() ?? [];
          setCanForward(!!nextPanorama(links, heading));
          setCanBack(!!nextPanorama(links, heading, true));
          setAddress(panorama.getLocation()?.description || location.name);
        };
        listeners.push(panorama.addListener('links_changed', () => { moveLock.current = false; sync(); }));
        listeners.push(panorama.addListener('pov_changed', sync));
        listeners.push(panorama.addListener('position_changed', sync));
        listeners.push(panorama.addListener('status_changed', () => {
          if (cancelled || !panorama) return;
          window.clearTimeout(deadline);
          if (panorama.getStatus() === google.maps.StreetViewStatus.OK) {
            setLoading(false); setStatus(''); sync();
          } else fail('This panorama is unavailable. Retry or choose another starting point.');
        }));
        // Google's viewer handles progressive image loading after lookup succeeds.
        window.clearTimeout(deadline); setLoading(false); setStatus(''); sync();
      } catch (error) {
        window.clearTimeout(deadline);
        const code = (error as { code?: string })?.code;
        fail(code === 'ZERO_RESULTS' ? 'No outdoor panorama was found here. Try another starting point.' : error instanceof Error ? error.message : 'Street View is unavailable. Check your connection or choose another starting point.');
      }
    }
    void init();
    return () => {
      cancelled = true; window.clearTimeout(deadline);
      window.removeEventListener(MAPS_AUTH_ERROR, authorizationFailed);
      listeners.forEach(listener => listener.remove()); panoramaRef.current = null;
      if (panorama) { google.maps.event.clearInstanceListeners(panorama); panorama.setVisible(false); panorama.unbindAll(); }
      container.replaceChildren();
    };
  }, [location, viewpoint, retry]);

  function move(backwards = false) {
    const panorama = panoramaRef.current;
    if (!panorama || status || moveLock.current) return;
    const next = nextPanorama(panorama.getLinks() ?? [], panorama.getPov().heading, backwards);
    if (!next) return;
    moveLock.current = true; panorama.setPano(next);
    window.setTimeout(() => { moveLock.current = false; }, 1000);
  }
  function turn(degrees: number) {
    const panorama = panoramaRef.current;
    if (panorama) panorama.setPov({ ...panorama.getPov(), heading: (panorama.getPov().heading + degrees + 360) % 360 });
  }

  return <div className="real-experience">
    <div className="viewpoint-bar"><span className="real-label"><span className="status-dot" /> REAL SINGAPORE</span><div aria-label="Starting viewpoints">
      {location.viewpoints.map((point, index) => <button key={point.label} aria-pressed={viewpoint === index} onClick={() => setViewpoint(index)}>{point.label}</button>)}
    </div></div>
    <div className="panorama-shell"><div ref={host} className="panorama" />
      {status && <div className="viewer-message" role={loading ? 'status' : 'alert'}><MapPin size={30} /><h3>{loading ? `Finding the real ${location.name}…` : 'A window into the real neighborhood.'}</h3><p>{status}</p>
        {!loading && <button className="secondary-button" onClick={() => setRetry(n => n + 1)}><RotateCcw size={15} /> Retry connection</button>}
      </div>}
    </div>
    <div className="street-controls"><div className="street-address"><strong>{address || location.name}</strong><small>Drag to look · Step between real photographs</small></div><div className="street-buttons">
      <button className="icon-button" disabled={!!status} onClick={() => turn(-30)} aria-label="Look left" title="Look left"><RotateCcw size={16} /></button>
      <button className="icon-button" disabled={!!status || !canBack} onClick={() => move(true)} aria-label="Previous street view" title="Step back"><ArrowDown size={16} /></button>
      <button className="icon-button" disabled={!!status || !canForward} onClick={() => move()} aria-label="Next street view" title="Step forward"><ArrowUp size={16} /></button>
      <button className="icon-button" disabled={!!status} onClick={() => turn(30)} aria-label="Look right" title="Look right"><RotateCw size={16} /></button>
      <button className="secondary-button" onClick={() => setRetry(n => n + 1)}>Recenter</button>
    </div></div>
  </div>;
}
