// Optional selection helper. Requires Vite and a local Chrome debug session.
// Selection uses the app's configured Maps key without exposing it to this script.
import { readFile, writeFile } from 'node:fs/promises';
import { withBudget } from './api-budget.mjs';
const debugOrigin = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
const appOrigin = process.env.MARINA_APP_ORIGIN || 'http://127.0.0.1:5173';
const pages = await (await fetch(`${debugOrigin}/json`)).json();
const page = pages.find(p => p.type === 'page');
if (!page) throw new Error('Open a local Chrome debugging tab first.');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data), task = pending.get(message.id);
  if (task) { pending.delete(message.id); message.error ? task.reject(new Error('Browser command failed')) : task.resolve(message.result); }
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const next = ++id; pending.set(next, { resolve, reject }); socket.send(JSON.stringify({ id: next, method, params })); });
try {
  await send('Page.navigate', { url: appOrigin });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await withBudget(async request => {
    for (const name of ['west-bay', 'north-bay', 'museum-promenade']) {
      const file = `reconstruction/marina-bay/references/${name}.json`;
      const previous = JSON.parse(await readFile(file, 'utf8'));
      if (previous.selectedGoogle) continue;
      await request('maps-javascript-reference-selection', async () => {
        const { lat, lng } = previous.requested;
        const result = await send('Runtime.evaluate', { expression: `(async()=>{
          const {loadGoogleMaps}=await import('/src/lib/google-maps.ts');
          const maps=await loadGoogleMaps();await maps.importLibrary('streetView');
          const {data}=await new maps.StreetViewService().getPanorama({location:{lat:${lat},lng:${lng}},radius:200,preference:maps.StreetViewPreference.NEAREST,sources:[maps.StreetViewSource.GOOGLE]});
          return {status:'OK',pano_id:data.location.pano,location:{lat:data.location.latLng.lat(),lng:data.location.latLng.lng()},description:data.location.description,copyright:data.copyright,date:data.imageDate};
        })()`, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails || !result.result?.value) throw new Error('Official panorama selection failed');
        const metadata = { ...result.result.value, requested: previous.requested, selectedGoogle: true };
        await writeFile(file, JSON.stringify(metadata, null, 2) + '\n');
        console.log(JSON.stringify({ view: name, location: metadata.location, date: metadata.date }));
        return new Response('Selected', { status: 200 });
      });
    }
  });
} finally { socket.close(); }
