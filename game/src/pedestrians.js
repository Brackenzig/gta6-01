// Pedestrians: people walking the sidewalks, fleeing from trouble,
// and dropping cash when punched.
import * as THREE from 'three';
import { CFG, ROAD_LINES } from './config.js';
import { Rng } from './rng.js';

const SHIRT_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0xecf0f1, 0x1abc9c, 0xe67e22];
const SKIN_COLORS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRT_COLORS) });
  const skin = new THREE.MeshLambertMaterial({ color: rng.pick(SKIN_COLORS) });
  const pants = new THREE.MeshLambertMaterial({ color: rng.pick([0x2c3e50, 0x34495e, 0x5d6d7e]) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8), shirt);
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.9;
  head.castShadow = true;
  g.add(head);
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pants);
    leg.position.set(x, 0.35, 0);
    leg.name = x < 0 ? 'legL' : 'legR';
    g.add(leg);
  }
  return g;
}

export class Pedestrians {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new Rng(seed + 202);
    this.peds = [];
    this.pickups = [];
    this.group = new THREE.Group();
    this.group.name = 'pedestrians';
    scene.add(this.group);
    this.pickupGroup = new THREE.Group();
    this.pickupGroup.name = 'pickups';
    scene.add(this.pickupGroup);
    for (let i = 0; i < 18; i++) this.spawnPed(true);
  }

  randomSidewalkSpot() {
    const rng = this.rng;
    const line = rng.pick(ROAD_LINES);
    const along = rng.float(-280, 280);
    const side = rng.pick([-11.5, 11.5]);
    return rng.chance(0.5)
      ? { x: line + side, z: along }
      : { x: along, z: line + side };
  }

  spawnPed(anywhere = false) {
    const spot = this.randomSidewalkSpot();
    const ped = {
      mesh: makePedMesh(this.rng),
      target: this.randomSidewalkSpot(),
      speed: this.rng.float(1.2, 2.2),
      walkPhase: this.rng.float(0, 6),
      down: 0, // seconds remaining knocked down
      flee: 0,
    };
    ped.mesh.position.set(spot.x, 0, spot.z);
    this.group.add(ped.mesh);
    this.peds.push(ped);
    return ped;
  }

  // The closest standing ped to (x, z) within maxDist.
  nearest(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const p of this.peds) {
      if (p.down > 0) continue;
      const dx = p.mesh.position.x - x;
      const dz = p.mesh.position.z - z;
      const d = Math.hypot(dx, dz);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  knockDown(ped, dropCash) {
    if (ped.down > 0) return 0;
    ped.down = 8;
    ped.mesh.rotation.x = Math.PI / 2;
    ped.mesh.position.y = 0.4;
    const cash = dropCash ? this.rng.int(CFG.PUNCH_CASH_MIN, CFG.PUNCH_CASH_MAX) : 0;
    if (cash > 0) this.dropPickup(ped.mesh.position.x, ped.mesh.position.z, cash);
    return cash;
  }

  dropPickup(x, z, amount) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.12, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2ecc71 })
    );
    m.position.set(x, 0.5, z);
    m.rotation.y = this.rng.float(0, Math.PI);
    this.pickupGroup.add(m);
    this.pickups.push({ mesh: m, amount, x, z, ttl: 60 });
  }

  // Collect pickups within 1.6 m of (x, z). Returns the cash collected.
  collect(x, z) {
    let got = 0;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(p.x - x, p.z - z) < 1.6) {
        got += p.amount;
        this.pickupGroup.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
    return got;
  }

  // Flee from (x, z): peds within radius run away for a few seconds.
  scare(x, z, radius) {
    for (const p of this.peds) {
      if (p.down > 0) continue;
      const dx = p.mesh.position.x - x;
      const dz = p.mesh.position.z - z;
      if (Math.hypot(dx, dz) < radius) p.flee = 3;
    }
  }

  update(dt, threat) {
    for (const p of this.peds) {
      const m = p.mesh;
      if (p.down > 0) {
        p.down -= dt;
        if (p.down <= 0) {
          m.rotation.x = 0;
          m.position.y = 0;
        }
        continue;
      }
      // Pick a flee direction, or a new sidewalk target.
      let tx = p.target.x;
      let tz = p.target.z;
      let speed = p.speed;
      if (p.flee > 0) {
        p.flee -= dt;
        const dx = m.position.x - threat.x;
        const dz = m.position.z - threat.z;
        const d = Math.hypot(dx, dz) || 1;
        tx = m.position.x + (dx / d) * 20;
        tz = m.position.z + (dz / d) * 20;
        speed = 4.5;
      } else if (Math.hypot(tx - m.position.x, tz - m.position.z) < 1.5) {
        p.target = this.randomSidewalkSpot();
        continue;
      }
      const dx = tx - m.position.x;
      const dz = tz - m.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01) {
        const step = Math.min(d, speed * dt);
        m.position.x += (dx / d) * step;
        m.position.z += (dz / d) * step;
        m.rotation.y = Math.atan2(dx, dz);
        p.walkPhase += dt * speed * 2.4;
        const swing = Math.sin(p.walkPhase) * 0.5;
        const legL = m.getObjectByName('legL');
        const legR = m.getObjectByName('legR');
        if (legL) legL.rotation.x = swing;
        if (legR) legR.rotation.x = -swing;
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.ttl -= dt;
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = 0.5 + Math.sin(p.ttl * 4) * 0.08;
      if (p.ttl <= 0) {
        this.pickupGroup.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
    while (this.peds.length < 16) this.spawnPed();
  }
}
