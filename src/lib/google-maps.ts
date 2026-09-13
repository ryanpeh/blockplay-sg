let mapsPromise: Promise<typeof google.maps> | undefined;
export const MAPS_AUTH_ERROR = 'blockplay:maps-auth-error';
type MapsWindow = Window & { gm_authFailure?: () => void; __blockplayMapsReady?: () => void };

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
    if (!key) { reject(new Error('Add VITE_GOOGLE_MAPS_API_KEY to .env.local to explore real Singapore streets.')); return; }
    if (typeof google !== 'undefined' && typeof google.maps?.importLibrary === 'function') { resolve(google.maps); return; }
    const globals = window as MapsWindow;
    const previousAuthFailure = globals.gm_authFailure;
    globals.gm_authFailure = () => {
      window.dispatchEvent(new Event(MAPS_AUTH_ERROR));
      reject(new Error('Google Maps could not authorize this site. Check billing, Maps JavaScript API, and allowed website referrers.'));
      previousAuthFailure?.();
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__blockplayMapsReady`;
    script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error('Google Maps took too long to load. Check your connection and retry.')); }, 15000);
    globals.__blockplayMapsReady = () => { window.clearTimeout(timeout); resolve(google.maps); delete globals.__blockplayMapsReady; };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error('Google Maps could not load. Check your connection and API key configuration.')); };
    document.head.appendChild(script);
  }).catch(error => { mapsPromise = undefined; throw error; });
  return mapsPromise;
}
