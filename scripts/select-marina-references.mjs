// Optional selection helper. Requires Vite and a local Chrome debug session.
// Selection uses the app's configured Maps key without exposing it to this script.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { withBudget } from './api-budget.mjs';
import { parsePlanArgs, planDirectory, validatePlan } from './browser-capture-plan.mjs';
const args = parsePlanArgs(process.argv.slice(2));
const plan = JSON.parse(await readFile(args.planFile || 'reconstruction/marina-browser-plan.json', 'utf8'));
validatePlan(plan);
const directory = planDirectory(plan);
const sources = [...new Set(plan.views.map(view => view.source))].filter(source => source !== 'original-waterfront');
await mkdir(directory, { recursive: true });
const debugOrigin = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
const appOrigin = process.env.MARINA_APP_ORIGIN || 'http://127.0.0.1:5173';
const page = await (await fetch(`${debugOrigin}/json/new?about:blank`, { method: 'PUT' })).json();
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
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://maps.googleapis.com/maps/api/streetview*'] });
  await send('Page.navigate', { url: `${appOrigin}/capture-streetview.html` });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await withBudget(async request => {
    for (const name of sources) {
      const file = `${directory}/${name}`;
      let previous;
      try { previous = JSON.parse(await readFile(file, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; previous = { requested: plan.sources?.[name] }; }
      if (previous.selectedGoogle) continue;
      if (!Number.isFinite(previous.requested?.lat) || !Number.isFinite(previous.requested?.lng) || previous.requested.lat < 1.2 || previous.requested.lat > 1.5 || previous.requested.lng < 103.6 || previous.requested.lng > 104.1) throw new Error('Invalid Singapore source coordinates.');
      if (args.dryRun) { console.log(`Would select ${name}`); continue; }
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
  }, undefined, plan.region || 'marina-bay');
} finally { socket.close(); await fetch(`${debugOrigin}/json/close/${page.id}`); }
