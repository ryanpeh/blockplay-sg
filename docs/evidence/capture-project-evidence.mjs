// Documentation-only renders of the existing scene builders. No Google requests.
// Requires Vite on 5173 and an isolated Chrome debug session on 9223.
import {mkdir,writeFile} from 'node:fs/promises';
const origin='http://127.0.0.1:5173',debug='http://127.0.0.1:9223';
async function connect(url){const ws=new WebSocket(url),pending=new Map();let id=0;await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}};return{send:(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))}),close:()=>ws.close()}}
const views=[
 {id:'marina',module:'marina',builder:'buildMarinaScene',camera:[103,6,-78],target:[135,20,-110]},
 {id:'queenstown',module:'queenstown',builder:'buildQueenstownScene',camera:[52,7,60],target:[42,6,39]},
 {id:'raffles',module:'raffles',builder:'buildRafflesScene',camera:[-139,6,-69],target:[-128,5,-85]},
];
const browser=await connect((await(await fetch(debug+'/json/version')).json()).webSocketDebuggerUrl);
const {targetId}=await browser.send('Target.createTarget',{url:origin});let page;
try{
 await new Promise(r=>setTimeout(r,2000));
 page=await connect((await(await fetch(debug+'/json')).json()).find(t=>t.id===targetId).webSocketDebuggerUrl);
 await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*maps.googleapis.com*','*streetviewpixels*','*maps.gstatic.com*']});
 await page.send('Emulation.setDeviceMetricsOverride',{width:640,height:640,deviceScaleFactor:1,mobile:false});
 await mkdir('docs/evidence',{recursive:true});
 for(const view of views.filter(v=>!process.argv[2]||v.id===process.argv[2])){
 const result=await page.send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
 window.__evidenceWorld?.dispose?.();window.__evidenceRenderer?.dispose();
 document.body.innerHTML='';document.body.style.cssText='margin:0;overflow:hidden';
 const THREE=await import('/node_modules/three/build/three.module.js');
 const mod=await import('/src/game/${view.module}-scene.ts');const world=mod.${view.builder}();
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,640);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(65,1,.1,1400);camera.position.set(${view.camera});camera.lookAt(${view.target});world.animate?.(0);renderer.render(world.scene,camera);window.__evidenceWorld=world;window.__evidenceRenderer=renderer;
 return {image:renderer.domElement.toDataURL('image/png'),children:world.scene.children.length};})()`});
 if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
 await writeFile(`docs/evidence/${view.id}-scene.png`,Buffer.from(result.result.value.image.split(',')[1],'base64'));console.log(view.id,'rendered');
 }
 await writeFile('docs/evidence/render-settings.json',JSON.stringify({settingsWrittenAt:new Date().toISOString(),method:'Current scene builders rendered with documentation cameras; not player-camera screenshots or reconstruction output.',viewport:[640,640],fov:65,views},null,2)+'\n');
}finally{page?.close();await browser.send('Target.closeTarget',{targetId});browser.close()}
