import { expect, it } from 'vitest';
import { buildRafflesScene, RAFFLES_MAP_ROADS, RAFFLES_SPAWN, RAFFLES_STAMPS } from './raffles-scene';
import { canOccupy, moveInRaffles, RAFFLES_BOUNDS } from './raffles-collision';

it('builds detailed, batched expanded Raffles Place with eleven drive-reachable stamps', () => {
  const world=buildRafflesScene();
  try {
    expect(world.scene.userData.authoredMeshCount).toBeGreaterThan(2900);
    expect(world.scene.children.length).toBeLessThan(120);
    expect(world.stamps).toHaveLength(11);
    expect((RAFFLES_BOUNDS.maxX-RAFFLES_BOUNDS.minX)*(RAFFLES_BOUNDS.maxZ-RAFFLES_BOUNDS.minZ)/(420*294)).toBeGreaterThan(1.8);
    expect(canOccupy(RAFFLES_SPAWN.x,RAFFLES_SPAWN.z,1.35,world.obstacles)).toBe(true);
    const queue=[{x:RAFFLES_SPAWN.x,z:RAFFLES_SPAWN.z}],seen=new Set<string>();
    for(let i=0;i<queue.length;i++)for(const [dx,dz] of [[2,0],[-2,0],[0,2],[0,-2]]){
      const p=queue[i],x=p.x+dx,z=p.z+dz,key=`${x},${z}`;
      if(seen.has(key)||!canOccupy(x,z,1.35,world.obstacles))continue;
      const moved=moveInRaffles(p,dx,dz,1.35,world.obstacles);
      if(Math.abs(moved.x-x)>0.01||Math.abs(moved.z-z)>0.01)continue;
      seen.add(key);queue.push({x,z});
    }
    for(const stamp of RAFFLES_STAMPS)expect(queue.some(p=>Math.hypot(p.x-stamp.x,p.z-stamp.z)<3),stamp.name).toBe(true);
    world.animate(12);expect(world.stamps.every(s=>Number.isFinite(s.position.y))).toBe(true);
  }finally{world.dispose();}
});

it('blocks tower footprints, water edge and large movement tunnelling',()=>{
  const world=buildRafflesScene();try{
    expect(canOccupy(-120,-48,0.65,world.obstacles)).toBe(false);
    expect(canOccupy(0,-136,0.65,world.obstacles)).toBe(false);
    expect(canOccupy(RAFFLES_BOUNDS.maxX,0,1,[])).toBe(false);
    expect(moveInRaffles({x:0,z:-125},0,-40,1,world.obstacles).z).toBeGreaterThanOrEqual(-133);
  }finally{world.dispose();}
});

it('keeps every displayed road centerline clear for a car including expansion connectors',()=>{
  const world=buildRafflesScene();try{
    for(const road of RAFFLES_MAP_ROADS)for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2);
      for(let n=0;n<=steps;n++)expect(canOccupy(a.x+(b.x-a.x)*n/steps,a.z+(b.z-a.z)*n/steps,1.35,world.obstacles),JSON.stringify({a,b,n})).toBe(true);
    }
  }finally{world.dispose();}
});
