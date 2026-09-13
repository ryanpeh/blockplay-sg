import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir=new URL('../public/models/',import.meta.url);
const assets=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
for(const asset of assets){
 const data=fs.readFileSync(new URL(asset.id+'.glb',dir));
 assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
 const jsonLength=data.readUInt32LE(12),gltf=JSON.parse(data.subarray(20,20+jsonLength).toString());
 assert.equal(gltf.asset.version,'2.0');assert.equal(gltf.buffers.length,1);assert(!gltf.buffers[0].uri);
 const binStart=28+jsonLength,bin=data.subarray(binStart);
 for(const view of gltf.bufferViews)assert((view.byteOffset||0)+view.byteLength<=bin.length,'Buffer view in bounds');
 let triangles=0;
 for(const mesh of gltf.meshes)for(const p of mesh.primitives){
  assert.equal(p.mode??4,4);assert(p.attributes.NORMAL!==undefined);assert(p.attributes.TEXCOORD_0!==undefined);
  const positions=gltf.accessors[p.attributes.POSITION],indices=gltf.accessors[p.indices];
  assert(positions.min.every(Number.isFinite)&&positions.max.every(Number.isFinite));
  triangles+=indices.count/3;
  const view=gltf.bufferViews[indices.bufferView];const start=(view.byteOffset||0)+(indices.byteOffset||0);
  const size={5121:1,5123:2,5125:4}[indices.componentType];assert(size);
  for(let i=0;i<indices.count;i++){const offset=start+i*size;const index=size===1?bin.readUInt8(offset):size===2?bin.readUInt16LE(offset):bin.readUInt32LE(offset);assert(index<positions.count,'Index references valid vertex');}
 }
 assert.equal(triangles,asset.triangles);assert.equal(data.length,asset.bytes);
 for(const image of gltf.images??[])assert(image.bufferView!==undefined,'Image embedded');
 const names=new Set(gltf.nodes.map(n=>n.name));assert.equal(names.size,gltf.nodes.length,'Unique node names');
 for(const socket of asset.sockets)assert(names.has(socket));
 if(asset.category==='Weapon'){
  assert(names.has(asset.id+'__magazine'));
  const muzzle=gltf.nodes.find(n=>n.name===asset.id+'__socket_muzzle');assert(muzzle.translation[2]<0,'Muzzle points down glTF -Z');
  assert(asset.triangles<40000,'Weapon budget below 40k triangles');
 }
 console.log(`PASS ${asset.id}: ${triangles.toLocaleString()} triangles, ${gltf.meshes.reduce((n,m)=>n+m.primitives.length,0)} draw primitives, ${(data.length/1024).toFixed(0)} KB`);
}
console.log('All seven GLBs passed structural, geometry, texture and socket checks.');
