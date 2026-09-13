import * as THREE from 'three';
import type { Obstacle } from './raffles-collision';

export const RAFFLES_SPAWN = { x: 0, z: 52, yaw: 0 };
export const RAFFLES_STAMPS = [
  { name: 'Raffles square', x: 0, z: -20 }, { name: 'MRT entrance', x: 34, z: 12 },
  { name: 'Battery promenade', x: 145, z: -117 }, { name: 'Boat Quay lane', x: -140, z: -113 },
  { name: 'Market arcade', x: 107, z: 45 }, { name: 'Cecil street', x: -75, z: 96 },
  { name: 'River lookout', x: 0, z: -122 },
  { name: 'Cross Street arcade', x: -242, z: 85 },
  { name: 'Telok market garden', x: -112, z: 214 },
  { name: 'Robinson colonnade', x: 100, z: 222 },
  { name: 'Collyer boulevard', x: 247, z: 16 },
];
export const RAFFLES_MAP_ROADS = [
  ...[-115,45,135].map(z=>({points:[{x:-170,z},{x:170,z}]})),
  ...[-170,-75,80,170].map(x=>({points:[{x,z:-115},{x,z:135}]})),
  {points:[{x:-258,z:-115},{x:-258,z:238},{x:258,z:238},{x:258,z:-115}]},
  ...[-115,45,135].map(z=>({points:[{x:-258,z},{x:-170,z}]})),
  ...[-115,45,135].map(z=>({points:[{x:170,z},{x:258,z}]})),
  ...[-170,-75,80,170].map(x=>({points:[{x,z:135},{x,z:238}]})),
];

/** Street-view-informed, compressed playable composition, not a surveyed reconstruction. */
export function buildRafflesScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#b8d1da'); scene.fog = new THREE.Fog('#b8d1da', 280, 750);
  scene.add(new THREE.HemisphereLight('#f1f8ff', '#787366', 1.8));
  const sun = new THREE.DirectionalLight('#fff1dd', 2); sun.position.set(-110, 190, 100); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -230, right: 230, top: 180, bottom: -180, far: 540 }); sun.shadow.normalBias = 0.22; scene.add(sun);
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [], textures: THREE.Texture[] = [], obstacles: Obstacle[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = (color: string) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.76 }); materials.push(m); return m; };
  const unit = geo(new THREE.BoxGeometry(1, 1, 1)), crownGeo = geo(new THREE.IcosahedronGeometry(1, 1));
  const stone = mat('#b8b9b5'), pale = mat('#dadbd4'), glass = mat('#54717c'), blue = mat('#72909c'), dark = mat('#38474b');
  const paving = mat('#b8b1a3'), asphalt = mat('#575d60'), white = mat('#e9e7d8'), red = mat('#a94f49'), terra = mat('#bf8062');
  const grass = mat('#8e9d70'), leaf = mat('#4d7243'), wood = mat('#80654d'), orange = mat('#f0a044'), water = mat('#598e9b');
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = scene, shadow = false) {
    const m = new THREE.Mesh(unit, material); m.position.set(x,y,z); m.scale.set(w,h,d); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
  }
  function solid(x: number,z: number,w: number,d: number) { obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}); }
  function sign(text: string,x: number,y: number,z: number,w=16,h=2,color='#235749') {
    if (typeof document === 'undefined') return;
    const canvas=document.createElement('canvas'); canvas.width=768;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle=color;ctx.fillRect(0,0,768,128);ctx.fillStyle='#fff9e8';ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,66,740);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const material=new THREE.MeshBasicMaterial({map:texture});materials.push(material);
    const panel=new THREE.Mesh(geo(new THREE.PlaneGeometry(w,h)),material);panel.position.set(x,y,z);scene.add(panel);
  }
  box(0,-0.6,62,600,1,430,paving); box(0,-0.2,-161,600,0.15,48,water);
  // New district loop connects old streets without altering the original walk/drive routes.
  for(const x of [-258,258]) {box(x,0,61.5,18,0.12,353,asphalt);for(let z=-107;z<239;z+=12)box(x,0.09,z,0.16,0.025,5,white);}
  box(0,0,238,534,0.12,18,asphalt);for(let x=-251;x<258;x+=12)box(x,0.09,238,5,0.025,0.16,white);
  for(const z of [-115,45,135])for(const x of [-214,214]){box(x,0,z,88,0.12,16,asphalt);for(let dx=-36;dx<44;dx+=12)box(x+dx,0.09,z,5,0.025,0.15,white);}
  for(const x of [-170,-75,80,170]){box(x,0,186.5,16,0.12,103,asphalt);for(let z=143;z<236;z+=12)box(x,0.09,z,0.15,0.025,5,white);}
  for(const x of [-271,-245,245,271])box(x,0.12,61,3,0.22,352,pale);
  for(const z of [225,251])box(0,0.12,z,542,0.22,4,pale);
  // Continuous outer loop, two north/south streets and central Market street.
  for(const z of [-115,45,135]) { box(0,0,z,354,0.12,16,asphalt); for(let x=-165;x<172;x+=12)box(x,0.09,z,5,0.025,0.15,white); }
  for(const x of [-170,-75,80,170]) {box(x,0,10,16,0.12,250,asphalt);for(let z=-108;z<135;z+=12)box(x,0.09,z,0.15,0.025,5,white);}
  for(const x of [-75,80]) for(const z of [-115,45,135]) for(let d=-6;d<=6;d+=2)box(x+d,0.12,z+11,1,0.02,5,white);
  for(const z of [-105,35,55,125])box(0,0.12,z,340,0.22,3,pale);
  for(const x of [-160,-85,-65,70,90,160])box(x,0.12,10,3,0.22,230,pale);
  // Plaza tiles, terraced grass beds and broad pedestrian approaches.
  box(4,0.13,-25,115,0.25,137,pale);
  for(let x=-49;x<60;x+=8)box(x,0.28,-25,0.17,0.02,137,stone);
  for(let z=-90;z<42;z+=8)box(4,0.28,z,115,0.02,0.17,stone);
  for(const x of [-28,28]) {box(x,0.36,-33,22,0.55,44,stone);box(x,0.68,-33,20,0.1,42,grass);solid(x,-33,22,44);}
  function tree(x:number,z:number,h=8) {box(x,h/2,z,0.6,h,0.6,wood,scene,true);solid(x,z,0.8,0.8);for(let i=0;i<3;i++){const m=new THREE.Mesh(crownGeo,leaf);m.position.set(x+(i-1)*1.7,h+i%2,z);m.scale.set(3.6,2.5,3.5);m.castShadow=true;scene.add(m);}}
  for(const x of [-28,28])for(const z of [-48,-19])tree(x,z,7);
  // Paired MRT pavilions: red pitched canopies, low glass walls and recognizable station signs.
  for(const x of [-34,34]) {box(x,1.4,22,12,2.8,7,dark);solid(x,22,12,7);box(x,2,25.6,10,1.5,0.12,glass);for(const side of [-1,1]){const r=box(x+side*3.15,3.9,22,7,0.3,9,red,scene,true);r.rotation.z=-side*0.4;}sign('NS26 / EW14',x,2.8,26.6,11,1.1,'#944740');}
  sign('RAFFLES PLACE',51,2.4,31,7,0.9);
  for(const x of [48.5,53.5]) {box(x,1.2,30.9,0.14,2.4,0.14,dark);solid(x,30.9,0.2,0.2);}
  // Facade rhythms derived from square/Market references: cool glass, pale ribs, deep lobbies.
  function tower(x:number,z:number,w:number,d:number,h:number,style:number,label:string) {
    const shell=style%2?blue:glass;box(x,h/2+6,z,w,h,d,shell,scene,true);box(x,3,z,w+4,6,d+4,dark,scene,true);solid(x,z,w+4,d+4);
    for(let y=9;y<h+6;y+=4.5){box(x,y,z+d/2+0.15,w,0.3,0.25,stone);box(x,y,z-d/2-0.15,w,0.3,0.25,stone);box(x-w/2-0.15,y,z,0.25,0.3,d,stone);box(x+w/2+0.15,y,z,0.25,0.3,d,stone);}
    for(let dx=-w/2;dx<=w/2;dx+=style===2?3:7)for(const side of [-1,1])box(x+dx,h/2+6,z+side*(d/2+0.3),style===2?0.65:0.3,h,0.45,pale);
    for(let dz=-d/2;dz<=d/2;dz+=7)for(const side of [-1,1])box(x+side*(w/2+0.3),h/2+6,z+dz,0.45,h,0.35,stone);
    box(x,h+7,z,w+1,2,d+1,pale);box(x,h+11,z,w*0.65,6,d*0.65,stone);
    box(x,6.3,z+d/2+4,w+5,0.5,8,pale,scene,true);
    for(const dx of [-w/2+2,w/2-2]){box(x+dx,3,z+d/2+6,0.8,6,0.8,pale);solid(x+dx,z+d/2+6,0.8,0.8);}
    sign(label,x,5,z+d/2+4.3,w-3,1.7,'#3d5058');
  }
  tower(-120,-48,55,64,122,2,'ONE RAFFLES');tower(124,-42,55,72,150,1,'BATTERY ROAD');
  tower(-120,88,53,57,112,0,'CECIL STREET');tower(121,94,51,51,95,2,'MARKET STREET');
  tower(-27,91,54,45,156,2,'CITY TOWER');tower(39,94,28,44,103,1,'THE ARCADE');
  // Larger southern/western financial district: clear streets around every block.
  tower(-216,-42,47,69,88,1,'CHURCH STREET');tower(216,-39,43,74,118,2,'COLLYER QUAY');
  tower(216,91,43,50,84,0,'OCEAN ARCADE');tower(124,183,52,46,110,1,'ROBINSON ROAD');
  tower(-217,183,47,46,72,2,'CROSS STREET');
  // Low-rise heritage arcade on the west and green market court on the south.
  box(-216,7,87,47,14,53,pale,scene,true);solid(-216,87,47,53);
  for(const z of [61,113]) {box(-216,4,z,48,0.5,8,terra);for(let x=-238;x<-193;x+=7){box(x,2,z+3.5,0.65,4,0.65,pale);solid(x,z+3.5,0.7,0.7);box(x,9,z,3,3.5,0.2,dark);}}
  sign('CROSS STREET',-216,5.8,114,35,1.6,'#7b6150');
  // church-expansion frames: white plaster, colorful opening shutters and cafe awnings.
  const shutterColors=[red,blue,orange];
  for(let n=0;n<6;n++){const x=-235+n*7.5;for(const y of [7.6,11.2]){
    box(x,y,114,3.2,2.5,0.2,glass);box(x,y+1.4,114.2,4.4,0.3,0.3,pale);
    for(const side of [-1,1]){const shutter=box(x+side*2,y,114.5,1,2.6,0.15,shutterColors[n%3]);shutter.rotation.y=side*0.55;}
    box(x,y-1.3,114.5,4,0.2,0.6,pale);
  }const awning=box(x,4.5,116,7.3,0.18,5,dark);awning.rotation.x=0.08;box(x,1,119,2.5,0.15,1.6,wood);solid(x,119,2.5,1.6);}
  box(-116,0.18,189,59,0.35,71,grass);
  for(const x of [-139,-94])for(const z of [163,193])tree(x,z,7);
  for(let x=-143;x<-90;x+=9){box(x,0.7,218,4,0.2,1.1,wood);solid(x,218,4,1.1);}
  // Market hall silhouette is an authored interpretation; reference review refines details.
  box(0,0.15,183,112,0.3,66,pale);
  for(const x of [-48,48])for(let z=161;z<=205;z+=11){box(x,3.5,z,0.6,7,0.6,dark);solid(x,z,0.7,0.7);}
  for(const side of [-1,1]){const roof=box(side*25,9,183,54,0.5,58,terra,scene,true);roof.rotation.z=-side*0.16;}
  // robinson-expansion-0: terracotta market roof, pale scalloped fascia, green ironwork.
  for(let x=-51;x<=51;x+=2){box(x,5.4,212,1.3,0.7,0.3,pale);box(x,8.9+Math.max(0,1-Math.abs(x)/52)*4,183,0.13,0.18,57,red);}
  for(const side of [-1,1]){const beam=box(side*25,8.8,212,53,0.35,0.35,leaf);beam.rotation.z=-side*0.16;}
  for(let n=0;n<9;n++){const angle=n*Math.PI/8;const length=9;const spoke=box(Math.cos(angle)*length/2,6+Math.sin(angle)*length/2,212,0.18,length,0.18,leaf);spoke.rotation.z=angle-Math.PI/2;}
  box(0,13,183,9,9,9,pale,scene,true);solid(0,183,9,9);
  const clockGeo=geo(new THREE.CylinderGeometry(2.1,2.1,0.2,20));const clock=new THREE.Mesh(clockGeo,white);clock.rotation.x=Math.PI/2;clock.position.set(0,15,187.7);scene.add(clock);
  box(0,15.6,187.9,0.15,1.3,0.1,dark);box(0.55,15,187.9,1.2,0.15,0.1,dark);
  sign('MARKET HALL',0,6.1,212.2,20,1.6,'#735443');
  for(const x of [-32,-16,16,32])for(const z of [168,198]) {box(x,0.9,z,3,0.2,2,terra);box(x,0.45,z,0.3,0.9,0.3,dark);solid(x,z,3,2);for(const dx of [-2.3,2.3]){box(x+dx,0.55,z,0.8,0.15,0.8,wood);solid(x+dx,z,0.8,0.8);}}
  for(const x of [-280,280])for(let z=-103;z<247;z+=26)tree(x,z,7);
  for(let x=-236;x<246;x+=32)tree(x,258,6);
  for(const x of [-244,244])for(let z=-94;z<235;z+=36){box(x,4,z,0.18,8,0.18,dark);box(x,8,z+1,0.2,0.25,2,white);solid(x,z,0.3,0.3);}
  // collyer-expansion-0/90/180: glazed elevated connector and sheltered bus stop.
  box(258,8.5,-25,65,0.8,7,stone,scene,true);box(258,10.2,-25,65,2.6,6.4,glass);
  for(let x=228;x<=288;x+=5){box(x,10.3,-21.7,0.2,3,0.2,pale);box(x,10.3,-28.3,0.2,3,0.2,pale);}
  for(const x of [239,278]){box(x,4,-25,1.2,8,1.2,pale);solid(x,-25,1.2,1.2);}
  box(241,3.5,15,7,0.3,22,pale,scene,true);box(238,1.8,15,0.14,3.6,22,glass);
  for(const z of [6,24]){box(238,1.8,z,0.3,3.6,0.3,stone);solid(238,z,0.4,0.4);}
  box(239,0.85,15,1.1,0.2,12,wood);solid(239,15,1.1,12);
  // cecil-south-270: planted recesses and facade foliage, not just empty colored boxes.
  for(let y=16;y<70;y+=12)for(const x of [108,139]){box(x,y,206.5,6,1,0.9,leaf);box(x,y-1,206.7,6,0.5,1,pale);}
  // Circular Road references: paired lanterns and outdoor planters along the quay lanes.
  for(const x of [-144,-112,-40,-4,14]){box(x,2.6,-103,0.2,5.2,0.2,dark);solid(x,-103,0.3,0.3);for(const dx of [-0.85,0.85]){box(x+dx,4.8,-103,0.5,0.8,0.5,pale);box(x+dx,5.3,-103,0.65,0.18,0.65,dark);}box(x+3,0.6,-102,1.5,1.2,1.5,pale);box(x+3,1.4,-102,1.4,0.7,1.4,leaf);solid(x+3,-102,1.5,1.5);}
  // Red louvered gable motif observed at One Raffles Place entrance.
  const gable=new THREE.Shape();gable.moveTo(-15,0);gable.lineTo(0,17);gable.lineTo(15,0);gable.closePath();
  const gableMesh=new THREE.Mesh(geo(new THREE.ExtrudeGeometry(gable,{depth:0.5,bevelEnabled:false})),red);gableMesh.position.set(-120,6,-11);scene.add(gableMesh);
  for(let y=7;y<22;y+=0.7)box(-120,y,-10.4,(23-y)*1.75,0.13,0.18,stone);
  for(const side of [-1,1]){const edge=box(-120+side*7.5,14.5,-10.3,0.65,22.7,0.7,pale);edge.rotation.z=-side*0.723;}
  // Fan palms and a planted wall from square-0/90; distinctive at pedestrian scale.
  for(const x of [-139,-101]){box(x,0.45,-5,5,0.9,5,stone);solid(x,-5,5,5);box(x,2.2,-5,0.35,4.4,0.35,wood);for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const frond=box(x+Math.cos(a)*1.5,4.4,-5+Math.sin(a)*1.5,3.7,0.13,1.6,leaf);frond.rotation.y=-a;frond.rotation.z=0.2;}}
  box(39,9,70.7,27,11,0.7,leaf);
  for(let x=27;x<54;x+=3)for(let y=5;y<14;y+=3){const m=new THREE.Mesh(crownGeo,y%2?leaf:grass);m.position.set(x,y,71.4);m.scale.set(1.8,1.8,0.5);scene.add(m);}
  box(39,15,73,28,0.3,6,pale,scene,true);
  // Plaza sculpture silhouette and double-yellow curb paint seen in reviewed references.
  const sculptureGeo=geo(new THREE.TorusGeometry(2.2,0.28,6,28));
  for(let i=0;i<3;i++){const m=new THREE.Mesh(sculptureGeo,terra);m.position.set(45,3.8+i*1.2,-71);m.rotation.set(i*0.6,i*0.8,0.3);scene.add(m);}solid(45,-71,4.8,4.8);
  for(const x of [-163,-162.6,162.6,163])box(x,0.12,12,0.14,0.02,236,orange);
  // Quay service lane: narrow colored shophouses, shutters, AC boxes, terracotta roofs.
  const shopColors=[mat('#c7957c'),mat('#d4c6a6'),mat('#9baea5'),mat('#c18675')];
  for(let i=0;i<7;i++){const x=[-146,-128,-110,-40,-22,-4,14][i];box(x,5,-87,16,10,17,shopColors[i%4],scene,true);solid(x,-87,16,17);
    for(const side of [-1,1]){const r=box(x,10.7,-87+side*4.6,17,0.35,10,terra,scene,true);r.rotation.x=side*0.22;}
    for(const dx of [-4,4]){box(x+dx,6.8,-77.9,3,2.4,0.15,dark);box(x+dx,6.8,-77.7,2.5,2,0.1,leaf);for(let y=6;y<8;y+=0.35)box(x+dx,y,-77.5,2.7,0.12,0.14,pale);box(x+dx,1.9,-77.8,3.4,3.4,0.1,dark);box(x+dx,5,-96,2,1.4,0.6,stone);}
    box(x,3.7,-76.6,16,0.25,3.2,i%2?red:grass);sign(i%2?'QUAY CAFE':'RIVER HOUSE',x,4.5,-77.6,13,1.1,'#765646');}
  // Safe waterfront edge, bollards, textured paved promenade and river ripples.
  box(0,0.12,-129,580,0.22,10,pale);box(0,0.65,-135,580,1.3,0.7,stone);solid(0,-135,580,0.7);
  for(let x=-284;x<290;x+=7){box(x,1.6,-135,0.18,1.7,0.18,dark);box(x,2.35,-135,7,0.12,0.12,dark);}
  for(let i=0;i<22;i++)box(-205+i*19,-0.08,-148-i%3*8,11,0.015,0.18,blue);
  for(const x of [-190,190])for(let z=-97;z<=130;z+=25)tree(x,z,8);
  for(const x of [-56,61])for(const z of [-75,0,67,121])tree(x,z,6);
  for(let x=-150;x<160;x+=30){box(x,4,-124,0.2,8,0.2,dark);box(x,8,-123,0.3,0.25,2.2,white);solid(x,-124,0.3,0.3);}
  // Benches, waste bins, hydrants, bicycle stands and a few parked delivery vans.
  for(const x of [-51,54])for(const z of [-65,-10,17]){box(x,0.8,z,3.6,0.22,1.1,wood);box(x,1.25,z-0.5,3.6,0.8,0.12,wood);for(const dx of [-1.3,1.3])box(x+dx,0.4,z,0.2,0.8,0.8,dark);solid(x,z,3.6,1.1);}
  for(const x of [-156,156])for(const z of [-25,65]){box(x,0.7,z,0.9,1.4,0.9,dark);solid(x,z,1,1);box(x-2,0.55,z,0.3,1.1,0.3,red);}
  for(let i=0;i<5;i++){box(97+i*2,0.55,58,0.12,1.1,1.4,stone);solid(97+i*2,58,0.2,1.4);}
  const pedestrians:THREE.Group[]=[];const skin=mat('#b18c71');
  for(let i=0;i<12;i++){const p=new THREE.Group();box(0,1.1,0,0.5,0.7,0.35,i%2?white:blue,p);box(0,1.7,0,0.33,0.35,0.33,skin,p);for(const x of [-0.16,0.16])box(x,0.4,0,0.16,0.8,0.18,dark,p);p.position.set(-58+(i%2)*120,0,-80+Math.floor(i/2)*20);scene.add(p);pedestrians.push(p);}
  const car=new THREE.Group();scene.add(car);box(0,0.7,0,1.8,0.65,3.4,blue,car,true);box(0,1.18,0.1,1.5,0.62,1.65,glass,car);box(0,1.51,0.1,1.6,0.13,1.85,pale,car);box(0,0.65,-1.74,1.55,0.2,0.08,white,car);
  const wheelGeo=geo(new THREE.CylinderGeometry(0.36,0.36,0.24,10));for(const x of [-0.94,0.94])for(const z of [-1.05,1.05]){const wheel=new THREE.Mesh(wheelGeo,dark);wheel.rotation.z=Math.PI/2;wheel.position.set(x,0.38,z);car.add(wheel);}car.visible=false;
  const stampGeo=geo(new THREE.TorusGeometry(1.15,0.16,5,20));const stamps=RAFFLES_STAMPS.map(p=>{const m=new THREE.Mesh(stampGeo,orange);m.position.set(p.x,2.2,p.z);scene.add(m);return m;});
  scene.userData.referenceFeatures=['square-0','battery-90','boat-quay-270','cecil-180'];scene.userData.authoredMeshCount=scene.children.filter(c=>c instanceof THREE.Mesh).length;
  const batches=new Map<string,THREE.Mesh[]>(),instances:THREE.InstancedMesh[]=[];
  for(const c of [...scene.children]){if(!(c instanceof THREE.Mesh)||Array.isArray(c.material)||stamps.includes(c))continue;const key=`${c.geometry.uuid}:${c.material.uuid}:${c.castShadow}:${c.receiveShadow}`;const batch=batches.get(key)??[];batch.push(c);batches.set(key,batch);}
  for(const batch of batches.values()){if(batch.length<2)continue;const m=new THREE.InstancedMesh(batch[0].geometry,batch[0].material,batch.length);m.castShadow=batch[0].castShadow;m.receiveShadow=batch[0].receiveShadow;batch.forEach((b,i)=>{b.updateMatrix();m.setMatrixAt(i,b.matrix);scene.remove(b);});m.computeBoundingSphere();scene.add(m);instances.push(m);}
  return {scene,obstacles,car,stamps,animate(time:number){stamps.forEach((s,i)=>{s.rotation.y=time*0.7;s.position.y=2.2+Math.sin(time*2+i)*0.2;});pedestrians.forEach((p,i)=>{p.position.z=-90+((time*1.1+i*19)%112);p.rotation.y=i%2?0:Math.PI;});},dispose(){instances.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.dispose();}};
}
