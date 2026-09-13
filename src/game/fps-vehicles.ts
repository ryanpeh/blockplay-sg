import * as THREE from 'three';
import { disposeModel } from './armory-visuals';
import { buildVehicleModel } from './vehicle-models';
import { createVehicle, driveVehicle, flyVehicle, vehicleBounds, vehicleExit, VEHICLE_SPAWNS, type FlightObstacle, type VehicleKind, type VehicleSpawn, type VehicleWorldBounds } from './vehicle-rules';
import { MARINA_BOUNDS, type Obstacle } from './marina-collision';
import { sceneFlightObstacles } from './flight-obstacles';

export function createFpsVehicles(scene: THREE.Scene, obstacles: Obstacle[], skins: Record<VehicleKind, string>, options: { spawns?: Record<VehicleKind, VehicleSpawn>; bounds?: VehicleWorldBounds; deriveFlightObstacles?: boolean } = {}) {
  const spawns = options.spawns ?? VEHICLE_SPAWNS, bounds = options.bounds ?? MARINA_BOUNDS;
  const sceneObstacles = options.deriveFlightObstacles ? sceneFlightObstacles(scene) : null;
  const root = new THREE.Group(); scene.add(root);
  const states = { car: createVehicle('car', spawns.car), helicopter: createVehicle('helicopter', spawns.helicopter) };
  const models = { car: buildVehicleModel('car', skins.car), helicopter: buildVehicleModel('helicopter', skins.helicopter) };
  root.add(models.car, models.helicopter);
  let active: VehicleKind | null = null, notice = '', noticeTime = 0;
  const pad = new THREE.Mesh(new THREE.RingGeometry(5.7, 5.88, 48), new THREE.MeshBasicMaterial({ color: '#d1cfaa', side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(spawns.helicopter.x, .145, spawns.helicopter.z); root.add(pad);
  const paint = new THREE.MeshBasicMaterial({ color: '#d1cfaa' });
  for (const [x, z, w, d] of [[-1, 0, .28, 2.6], [1, 0, .28, 2.6], [0, 0, 2, .28]]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w, .012, d), paint); stripe.position.set(pad.position.x + x, .145, pad.position.z + z); root.add(stripe);
  }
  const labels: Record<VehicleKind, THREE.Sprite> = {} as Record<VehicleKind, THREE.Sprite>;
  for (const kind of ['car', 'helicopter'] as const) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#15231fdd'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = '#ebdfb4'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(kind === 'car' ? 'UTILITY 01 · DRIVE' : 'FALCON 01 · PILOT', 256, 61);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false })); sprite.scale.set(4.5, .85, 1); labels[kind] = sprite; root.add(sprite);
    // Floating labels are UI, not cover. Sprite raycasts also require a camera,
    // which target-to-player counter-fire rays intentionally do not have.
    sprite.raycast = () => {};
  }
  function footObstacles(except?: VehicleKind) {
    return [...obstacles, ...(['car', 'helicopter'] as const).filter(kind => kind !== except && states[kind].y < 2).map(kind => vehicleBounds(states[kind]))];
  }
  function airObstacles(): FlightObstacle[] {
    return [
      ...obstacles.map(o => ({ ...o, minY: 0, maxY: o.maxY ?? 2.5 })),
      ...(sceneObstacles ?? [
      { minX: -56, maxX: -24, minZ: 69, maxZ: 83, minY: 4.8, maxY: 6.9 },
      { minX: 140, maxX: 163, minZ: -108, maxZ: 78, minY: 108, maxY: 114 },
      { minX: 21, maxX: 90, minZ: -103, maxZ: -93, minY: 0, maxY: 6.5 },
      { minX: 229, maxX: 286, minZ: -281, maxZ: -253, minY: 0, maxY: 67 },
      ]),
      { ...vehicleBounds(states.car), minY: 0, maxY: 2.7 },
    ];
  }
  function nearest(player: { x: number; z: number }) {
    const kinds = (['car', 'helicopter'] as const).filter(kind => states[kind].y < .4);
    return kinds.sort((a, b) => distance(player, a) - distance(player, b)).find(kind => distance(player, kind) <= (kind === 'car' ? 4.5 : 6));
  }
  function distance(player: { x: number; z: number }, kind: VehicleKind) { return Math.hypot(player.x - states[kind].x, player.z - states[kind].z); }
  function interact(player: { x: number; z: number }) {
    if (active) {
      const point = vehicleExit(states[active], footObstacles(active), bounds);
      if (!point) { notice = active === 'helicopter' ? 'Land on clear ground and slow down to exit.' : 'Brake to a stop and leave space beside the car.'; noticeTime = 3; return null; }
      states[active].speed = states[active].climb = 0; active = null; notice = ''; return { ...point, entered: false, yaw: 0 };
    }
    const kind = nearest(player);
    if (!kind) { notice = 'Approach a parked car or helicopter to enter.'; noticeTime = 3; return null; }
    active = kind; notice = ''; return { x: states[kind].x, z: states[kind].z, entered: true, yaw: states[kind].yaw };
  }
  function sync(dt: number) {
    for (const kind of ['car', 'helicopter'] as const) {
      const v = states[kind], model = models[kind]; model.position.set(v.x, v.y, v.z); model.rotation.y = v.yaw;
      labels[kind].position.set(v.x, v.y + (kind === 'car' ? 3.3 : 4.4), v.z); labels[kind].visible = active !== kind;
      if (kind === 'car') model.traverse(o => { if (o.name === 'vehicle-wheel') o.rotation.x -= v.speed * dt / .51; });
      else {
        model.rotation.x = THREE.MathUtils.damp(model.rotation.x, active === kind ? -v.speed * .007 : 0, 3, dt);
        const rotor = model.getObjectByName('main-rotor')!, tail = model.getObjectByName('tail-rotor')!;
        if (active === kind) { rotor.rotation.y += dt * 34; tail.rotation.x += dt * 51; }
      }
    }
  }
  function step(keys: ReadonlySet<string>, dt: number) {
    noticeTime = Math.max(0, noticeTime - dt); if (!noticeTime) notice = '';
    if (!active) return 0;
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const steer = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const beforeYaw = states[active].yaw;
    const result = active === 'car' ? driveVehicle(states.car, forward, steer, keys.has(' '), dt, footObstacles('car'), bounds) : flyVehicle(states.helicopter, forward, steer, Number(keys.has(' ')) - Number(keys.has('c') || keys.has('control')), keys.has('shift'), dt, airObstacles(), bounds);
    states[active] = result.state;
    if (result.blocked) { notice = active === 'car' ? 'Route blocked · reverse or steer clear' : 'Airframe clearance · move away from the obstacle'; noticeTime = .5; }
    sync(dt); return states[active].yaw - beforeYaw;
  }
  sync(0);
  return {
    root, models, states, footObstacles, interact, step,
    get active() { return active; },
    get mounted() { return active ? states[active] : null; },
    hud(player: { x: number; z: number }) {
      const near = nearest(player);
      return { vehicle: active || 'on-foot' as const, vehicleSpeed: active ? Math.abs(states[active].speed) * 3.6 : 0, altitude: active ? Math.max(0, states[active].y - .13) : 0,
        interact: active ? `E · Exit ${active}` : near ? `E · ${near === 'car' ? 'Drive Utility 01' : 'Pilot Falcon 01'}` : '', vehicleNotice: notice,
        carDistance: distance(player, 'car'), helicopterDistance: distance(player, 'helicopter') };
    },
    reset() { active = null; notice = ''; noticeTime = 0; states.car = createVehicle('car', spawns.car); states.helicopter = createVehicle('helicopter', spawns.helicopter); models.helicopter.rotation.x = 0; sync(0); },
    dispose() { root.removeFromParent(); disposeModel(root); Object.values(labels).forEach(sprite => { sprite.material.map?.dispose(); sprite.material.dispose(); }); },
  };
}
