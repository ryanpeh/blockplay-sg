import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { withBudget } from './api-budget.mjs';
import { isCaptureReady, assertFreshPixels, captureFailureCode } from './capture-readiness.mjs';
import { planDirectory, parsePlanArgs, sha256, prepareViews, checkAllowance } from './browser-capture-plan.mjs';

// Default single view, or --batch for the editable reviewed Marina plan.
// No Static API access. Keep Google attribution/date in the screenshot.
async function main() {
  const started = performance.now();
  const args = parsePlanArgs(process.argv.slice(2));
  const plan = args.batch || args.planFile ? JSON.parse(await readFile(args.planFile || 'reconstruction/marina-browser-plan.json', 'utf8')) : {
    name: 'marina-single-view', width: 1280, height: 900, maxNewImages: 1,
    views: [{ id: 'north-bay-browser-h160-p15-z1', source: 'north-bay.json', heading: 160, pitch: 15, zoom: 1, purpose: 'Sands and museum waterfront' }],
  };
  const directory = planDirectory(plan);
  const views = await prepareViews(plan), preflight = checkAllowance(plan, views);
  console.log(JSON.stringify({ plan: plan.name, ...preflight }));
  if (args.dryRun) return;
  const report = { plan: plan.name, startedAt: new Date().toISOString(), cached: preflight.cached, captured: 0, failed: 0, panoramaLoads: 0, staticApiRequests: 0, totalMs: 0, bytes: 0, views: [] };
  const saveReport = async () => {
    report.totalMs = Math.round(performance.now() - started);
    await mkdir(`${directory}/reports`, { recursive: true });
    const reportFile = `${directory}/reports/${plan.name}-${report.startedAt.replaceAll(':', '-')}.json`;
    await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
    const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const cards = views.map(view => `<figure><a href="${view.id}.png"><img loading="lazy" src="${view.id}.png" alt="${escape(view.purpose || view.id)}"></a><figcaption>${escape(view.id)} — ${escape(view.purpose || '')}<br>Source ${escape(view.source.date || 'unknown')}, heading ${view.heading}°, pitch ${view.pitch}°, zoom ${view.zoom}. <a href="${view.id}.json">Metadata / review</a></figcaption></figure>`).join('\n');
    await writeFile(`${directory}/${plan.name}-gallery.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Marina reference review</title><style>body{font:16px system-ui;margin:24px;background:#edf0f2;color:#223}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%}figcaption{padding-top:8px;font-size:14px}</style><h1>${escape(plan.name)}</h1><p>Authorized reference screenshots. Attribution retained. Open full-size images to review clarity; capture success alone is not visual acceptance.</p><main>${cards}</main></html>`);
    console.log(JSON.stringify({ report: reportFile, captured: report.captured, cached: report.cached, failed: report.failed, panoramaLoads: report.panoramaLoads, staticApiRequests: report.staticApiRequests, totalMs: report.totalMs, bytes: report.bytes }));
  };
  for (const view of views.filter(view => view.cached)) report.views.push({ id: view.id, status: 'cached', bytes: view.cached.bytes });
  if (!preflight.newImages) { await saveReport(); return; }
  const env = {};
  for (const file of ['.env', '.env.local']) {
    try { Object.assign(env, parseEnv(await readFile(file, 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const demoKey = (process.env.GOOGLE_MAPS_DEMO_API_KEY || env.GOOGLE_MAPS_DEMO_API_KEY)?.trim();
  if (!demoKey) throw new Error('Set GOOGLE_MAPS_DEMO_API_KEY before browser capture.');
  const debugOrigin = process.env.CHROME_DEBUG_ORIGIN || 'http://127.0.0.1:9223';
  const appOrigin = process.env.MARINA_APP_ORIGIN || 'http://127.0.0.1:5173';
  const version = await (await fetch(`${debugOrigin}/json/version`)).json();
  const connect = async url => {
    const socket = new WebSocket(url); let id = 0; const pending = new Map();
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('Browser connection failed')), { once: true }); });
    const listeners = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data), task = pending.get(message.id);
      if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(new Error('Browser command failed')) : task.resolve(message.result); }
      else listeners.forEach(listener => listener(message));
    };
    return {
      listeners,
      send(method, params = {}) { return new Promise((resolve, reject) => {
        const next = ++id, timer = setTimeout(() => { pending.delete(next); reject(new Error('Browser command timed out')); }, 30000);
        pending.set(next, { resolve, reject, timer }); socket.send(JSON.stringify({ id: next, method, params }));
      }); },
      close() { for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error('Browser connection closed')); } pending.clear(); socket.close(); },
    };
  };
  const browser = await connect(version.webSocketDebuggerUrl);
  let targetId, page;
  try {
    ({ targetId } = await browser.send('Target.createTarget', { url: 'about:blank' }));
    const targets = await (await fetch(`${debugOrigin}/json`)).json();
    page = await connect(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
    const evaluate = async expression => {
      const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error('Street View browser evaluation failed; no raw exception logged to protect credentials.');
      return result.result.value;
    };
    let staticRequests = 0, lastTileActivity = Date.now(); const pendingTiles = new Set();
    page.listeners.push(message => {
      if (message.method === 'Network.requestWillBeSent') {
        const url = message.params.request.url;
        if (url.startsWith('https://maps.googleapis.com/maps/api/streetview')) { staticRequests++; report.staticApiRequests = staticRequests; }
        if (/streetviewpixels|\/cbk|photometa/i.test(url) || message.params.type === 'Image') { pendingTiles.add(message.params.requestId); lastTileActivity = Date.now(); }
      }
      if (['Network.loadingFinished', 'Network.loadingFailed'].includes(message.method) && pendingTiles.delete(message.params.requestId)) lastTileActivity = Date.now();
    });
    await page.send('Network.enable');
    await page.send('Page.enable');
    await page.send('Page.bringToFront');
    await page.send('Network.setBlockedURLs', { urls: ['https://maps.googleapis.com/maps/api/streetview*'] });
    await page.send('Emulation.setDeviceMetricsOverride', { width: plan.width, height: plan.height, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: `${appOrigin}/scripts/pages/capture-streetview.html` });
    for (let i = 0; i < 50; i++) {
      if (await evaluate(`!!document.getElementById('panorama')`)) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await withBudget(async request => {
      let activePano;
      const seenPixels = new Map(views.filter(view => view.cached).map(view => [view.cached.sha256, view.fingerprint]));
      for (const view of views.filter(view => !view.cached)) {
      const { source, imageFile, manifestFile } = view, frameStarted = performance.now();
      try {
      // Record screenshots separately; these do not use the Static API allowance.
      await request(`browser-screenshot-${view.id}`, async () => {
        await page.send('Page.bringToFront');
        const changePanorama = activePano !== source.pano_id;
        const loadOrAim = async () => {
          if (!activePano) {
          const keyHash = await evaluate(`(async()=>{
            window.__captureAuthFailed=false;
            window.addEventListener('blockplay:maps-auth-error',()=>window.__captureAuthFailed=true);
            const {loadGoogleMaps}=await import('/src/lib/google-maps.ts');
            const maps=await loadGoogleMaps();await maps.importLibrary('streetView');
            const script=Array.from(document.scripts).find(s=>s.src.startsWith('https://maps.googleapis.com/maps/api/js?'));
            const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(new URL(script.src).searchParams.get('key')));
            return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
          })()`);
          if (keyHash !== sha256(demoKey)) throw new Error('Browser did not load the demo key; restart Vite.');
          }
          lastTileActivity = Date.now();
          await evaluate(`(()=>{
            const options={
              pano:${JSON.stringify(source.pano_id)},pov:{heading:${view.heading},pitch:${view.pitch}},zoom:${view.zoom},
              disableDefaultUI:true,addressControl:true,imageDateControl:true,
              clickToGo:false,linksControl:false,motionTracking:false,visible:true
            };
            if(!window.__capturePano) window.__capturePano=new google.maps.StreetViewPanorama(document.getElementById('panorama'),options);
            else { if(window.__capturePano.getPano()!==options.pano) window.__capturePano.setPano(options.pano); window.__capturePano.setPov(options.pov);window.__capturePano.setZoom(options.zoom); }
            return true;
          })()`);
          let ready = false;
          for (let i = 0; i < 100; i++) {
            const state = await evaluate(`({status:window.__capturePano.getStatus(),pano:window.__capturePano.getPano(),pov:window.__capturePano.getPov(),zoom:window.__capturePano.getZoom(),hidden:document.hidden,overlay:!!document.querySelector('vite-error-overlay'),authFailed:window.__captureAuthFailed,bad:!!document.querySelector('.gm-err-container')})`);
            if (state.authFailed || state.bad) throw new Error('Demo key authorization failed.');
            if (state.overlay) throw new Error('Development error overlay; capture rejected.');
            if (isCaptureReady(state, view) && pendingTiles.size === 0 && Date.now() - lastTileActivity > 2000) { ready = true; break; }
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          if (!ready || staticRequests) throw new Error('Panorama not ready or unexpected Static request detected.');
          return new Response('Panorama loaded', { status: 200 });
        };
        if (changePanorama) { report.panoramaLoads++; await request('maps-javascript-panorama-load', loadOrAim); }
        else await loadOrAim();
        activePano = source.pano_id;
        const painted = await evaluate(`Promise.race([new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))),new Promise(resolve=>setTimeout(()=>resolve(false),3000))])`);
        if (!painted) throw new Error('Foreground repaint timed out; capture rejected.');
        // Flush a composited frame before saving; background Street View can lag
        // behind getPov/getPano even when tile requests have finished.
        await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await new Promise(resolve => setTimeout(resolve, 350));
        const finalState = await evaluate(`({status:window.__capturePano.getStatus(),pano:window.__capturePano.getPano(),pov:window.__capturePano.getPov(),zoom:window.__capturePano.getZoom(),hidden:document.hidden,overlay:!!document.querySelector('vite-error-overlay')})`);
        if (!isCaptureReady(finalState, view)) throw new Error('View changed before screenshot; capture rejected.');
        const actual = await evaluate(`(()=>{const p=window.__capturePano,l=p.getLocation();return {pano_id:p.getPano(),position:p.getPosition()?.toJSON(),pov:p.getPov(),zoom:p.getZoom(),description:l?.description};})()`);
        const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        const bytes = Buffer.from(shot.data, 'base64');
        assertFreshPixels(sha256(bytes), view.fingerprint, seenPixels);
        seenPixels.set(sha256(bytes), view.fingerprint);
        await writeFile(imageFile, bytes);
        const durationMs = Math.round(performance.now() - frameStarted);
        await writeFile(manifestFile, JSON.stringify({ source: 'Google Maps JavaScript Street View; owner-authorized browser reference', credential: 'GOOGLE_MAPS_DEMO_API_KEY', sourceMetadata: view.sourceMetadata, copyright: source.copyright, sourceDate: source.date, ...actual, width: plan.width, height: plan.height, capturedAt: new Date().toISOString(), file: imageFile, fingerprint: view.fingerprint, sha256: sha256(bytes), bytes: bytes.length, durationMs, staticApiRequests: staticRequests, attribution: 'Retained in screenshot', readinessCheck: 'foreground-pov-repaint-v2', visualReview: 'pending' }, null, 2) + '\n');
        report.captured++; report.bytes += bytes.length; report.views.push({ id: view.id, status: 'captured', durationMs, bytes: bytes.length });
        console.log(`Saved ${imageFile} using demo key; zero Static API requests. Inspect image before accepting.`);
        return new Response('Screenshot saved', { status: 200 });
      });
      } catch (error) { report.failed++; report.views.push({ id: view.id, status: 'failed', durationMs: Math.round(performance.now() - frameStarted), reason: captureFailureCode(error) }); throw error; }
      }
    }, undefined, plan.region || 'marina-bay');
    report.staticApiRequests = staticRequests;
  } finally {
    page?.close();
    if (targetId) await browser.send('Target.closeTarget', { targetId });
    browser.close();
    await saveReport();
  }
}
main().catch(error => { console.error(`Browser capture stopped (${captureFailureCode(error)}). Check local Chrome/Vite setup, demo-key permissions, and the ledger. Raw errors withheld to protect the key.`); process.exitCode = 1; });
