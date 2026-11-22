// Traffic: ordinary cars driving the grid, plus the shared car-mesh factory
// the player and the police reuse.
import * as THREE from 'three';
import { CFG, ROAD_LINES } from './config.js';
import { Rng } from './rng.js';

// One car: body, cabin, wheels, headlights and taillights. The group faces
// +Z when rotation.y is 0; callers rotate it to face its heading.
export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x182430 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), paint);
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glass);
  cabin.position.set(0, 1.3, -0.2);
  cabin.castShadow = true;
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [x, z] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    l.position.set(x, 0.7, 2.32);
    g.add(l);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    l.position.set(x, 0.7, -2.32);
    g.add(l);
  }
  if (opts.police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.75, -0.2);
    bar.name = 'lightbar';
    g.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.62), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.66;
    g.add(stripe);
  }
  if (opts.gold) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.18, 4.62), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    stripe.position.y = 0.66;
    g.add(stripe);
  }
  return g;
}

export class Traffic {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new Rng(seed + 101);
    this.cars = [];
    this.group = new THREE.Group();
    this.group.name = 'traffic';
    scene.add(this.group);
    for (let i = 0; i < 14; i++) this.spawnCar(true);
  }

  spawnCar(anywhere = false) {
    const rng = this.rng;
    const axis = rng.chance(0.5) ? 'x' : 'z';
    const line = rng.pick(ROAD_LINES);
    const lane = rng.pick([-4, 4]);
    const dir = lane < 0 ? 1 : -1;
    const pos = anywhere ? rng.float(-280, 280) : rng.pick([-280, 280]);
    const car = {
      mesh: makeCarMesh(rng.pick(CFG.CAR_COLORS)),
      axis,
      line,
      lane,
      dir,
      pos,
      speed: rng.float(9, 15),
      cruise: rng.float(9, 15),
      color: 0,
    };
    car.mesh.position.set(axis === 'x' ? pos : line + lane, 0, axis === 'x' ? line + lane : pos);
    car.mesh.rotation.y = axis === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
    this.group.add(car.mesh);
    this.cars.push(car);
    return car;
  }

  // Nearest car to (x, z) within maxDist, for stealing or entering.
  nearest(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const c of this.cars) {
      const dx = c.mesh.position.x - x;
      const dz = c.mesh.position.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return best;
  }

  remove(car) {
    this.group.remove(car.mesh);
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
  }

  // Keep the streets full: replace cars that wandered off the map.
  update(dt) {
    for (const c of this.cars) {
      // Slow down for a car ahead in the same lane.
      let target = c.cruise;
      for (const o of this.cars) {
        if (o === c || o.axis !== c.axis || o.line !== c.line || o.lane !== c.lane) continue;
        const gap = (o.pos - c.pos) * c.dir;
        if (gap > 0 && gap < 11) target = Math.min(target, o.speed * 0.8);
      }
      c.speed += (target - c.speed) * Math.min(1, dt * 1.5);
      c.pos += c.dir * c.speed * dt;
      if (c.pos > 295) c.pos = -295;
      if (c.pos < -295) c.pos = 295;
      const m = c.mesh.position;
      if (c.axis === 'x') {
        m.x = c.pos;
        m.z = c.line + c.lane;
      } else {
        m.x = c.line + c.lane;
        m.z = c.pos;
      }
    }
    while (this.cars.length < 12) this.spawnCar();
  }
}
