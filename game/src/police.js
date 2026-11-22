// The police: wanted stars, pursuing cruisers, officers on foot, and busts.
import * as THREE from 'three';
import { CFG } from './config.js';
import { collideCircle } from './city.js';
import { makeCarMesh } from './traffic.js';
import { Rng } from './rng.js';

function makeOfficerMesh() {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.0, 8), navy);
  torso.position.y = 1.15;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), skin);
  head.position.y = 1.9;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), new THREE.MeshLambertMaterial({ color: 0x0d1520 }));
  cap.position.y = 2.1;
  g.add(cap);
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), navy);
    leg.position.set(x, 0.35, 0);
    leg.name = x < 0 ? 'legL' : 'legR';
    g.add(leg);
  }
  return g;
}

export class Police {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new Rng(seed + 404);
    this.wanted = 0;
    this.cars = [];
    this.officers = [];
    this.group = new THREE.Group();
    this.group.name = 'police';
    scene.add(this.group);
    this.unseenTimer = 0;
    this.bustTimer = 0;
  }

  addWanted(n) {
    const before = this.wanted;
    this.wanted = Math.max(0, Math.min(5, this.wanted + n));
    if (this.wanted > before) this.unseenTimer = 0;
  }

  clearWanted() {
    this.wanted = 0;
    this.unseenTimer = 0;
    this.bustTimer = 0;
  }

  // Closest officer on foot within maxDist (for punching).
  nearestOfficer(x, z, maxDist) {
    let best = null;
    let bd = maxDist;
    for (const o of this.officers) {
      if (o.stun > 0) continue;
      const d = Math.hypot(o.mesh.position.x - x, o.mesh.position.z - z);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  stunOfficer(officer, seconds) {
    officer.stun = seconds;
    officer.mesh.rotation.x = Math.PI / 2;
    officer.mesh.position.y = 0.4;
  }

  spawnCarNear(x, z) {
    const rng = this.rng;
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.float(55, 80);
    const px = x + Math.cos(angle) * dist;
    const pz = z + Math.sin(angle) * dist;
    const car = {
      mesh: makeCarMesh(CFG.POLICE_COLOR, { police: true }),
      heading: rng.float(0, Math.PI * 2),
      speed: 0,
    };
    car.mesh.position.set(px, 0, pz);
    this.group.add(car.mesh);
    this.cars.push(car);
    return car;
  }

  spawnOfficerNear(x, z) {
    const rng = this.rng;
    const angle = rng.float(0, Math.PI * 2);
    const o = {
      mesh: makeOfficerMesh(),
      stun: 0,
      walkPhase: rng.float(0, 6),
    };
    o.mesh.position.set(x + Math.cos(angle) * 18, 0, z + Math.sin(angle) * 18);
    this.group.add(o.mesh);
    this.officers.push(o);
    return o;
  }

  update(dt, player, ctx) {
    const px = player.x;
    const pz = player.z;
    // Keep the right number of cruisers on the road for the wanted level.
    const wantCars = this.wanted === 0 ? 0 : Math.min(4, this.wanted);
    while (this.cars.length < wantCars) this.spawnCarNear(px, pz);
    while (this.cars.length > wantCars) {
      const c = this.cars.pop();
      this.group.remove(c.mesh);
    }
    // Officers on foot only chase a player who is on foot.
    const wantOfficers = !player.onFoot || this.wanted === 0 ? 0 : Math.min(2, this.wanted);
    while (this.officers.length < wantOfficers) this.spawnOfficerNear(px, pz);
    while (this.officers.length > wantOfficers) {
      const o = this.officers.pop();
      this.group.remove(o.mesh);
    }

    // Cruisers pursue: steer toward the player, ram on contact.
    for (const c of this.cars) {
      const m = c.mesh.position;
      const dx = px - m.x;
      const dz = pz - m.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - c.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      const top = CFG.POLICE_TOP_SPEED * (0.85 + this.wanted * 0.05);
      c.speed += (top - c.speed) * Math.min(1, dt * 0.8);
      const nx0 = m.x + Math.sin(c.heading) * c.speed * dt;
      const nz0 = m.z + Math.cos(c.heading) * c.speed * dt;
      const fixed = collideCircle(ctx.colliders, nx0, nz0, 2.3);
      if (Math.hypot(fixed.x - nx0, fixed.z - nz0) > 0.01) {
        c.speed *= 0.4; // bounced off a building
      }
      m.x = fixed.x;
      m.z = fixed.z;
      c.mesh.rotation.y = c.heading;
      // Ram the player.
      if (dist < 4.4) {
        if (player.onFoot) {
          player.health -= CFG.POLICE_RAM_DAMAGE * dt * 2;
          if (player.health <= 0) ctx.onWasted();
        } else {
          player.damageCar(CFG.POLICE_RAM_DAMAGE * dt * 1.4, ctx);
          c.speed *= 0.6;
        }
        ctx.sfx('crash');
      }
      // A cruiser stuck far away respawns closer.
      if (dist > 160) {
        const a = this.rng.float(0, Math.PI * 2);
        m.x = px + Math.cos(a) * 60;
        m.z = pz + Math.sin(a) * 60;
        c.speed = 10;
      }
    }

    // Officers chase on foot and bust the player if they hold them.
    let touching = false;
    for (const o of this.officers) {
      const m = o.mesh;
      if (o.stun > 0) {
        o.stun -= dt;
        if (o.stun <= 0) {
          m.rotation.x = 0;
          m.position.y = 0;
        }
        continue;
      }
      const dx = px - m.position.x;
      const dz = pz - m.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 2.0) touching = true;
      if (dist > 0.1) {
        const step = Math.min(dist, 6.5 * dt);
        m.position.x += (dx / dist) * step;
        m.position.z += (dz / dist) * step;
        m.rotation.y = Math.atan2(dx, dz);
        o.walkPhase += dt * 12;
        const swing = Math.sin(o.walkPhase) * 0.5;
        const legL = m.getObjectByName('legL');
        const legR = m.getObjectByName('legR');
        if (legL) legL.rotation.x = swing;
        if (legR) legR.rotation.x = -swing;
      }
    }
    if (touching && player.onFoot) {
      this.bustTimer += dt;
      if (this.bustTimer > 2) {
        this.bustTimer = 0;
        ctx.onBusted();
      }
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }

    // The wanted level cools off when no police can see the player.
    if (this.wanted > 0) {
      let nearest = Infinity;
      for (const c of this.cars) {
        nearest = Math.min(nearest, Math.hypot(c.mesh.position.x - px, c.mesh.position.z - pz));
      }
      for (const o of this.officers) {
        nearest = Math.min(nearest, Math.hypot(o.mesh.position.x - px, o.mesh.position.z - pz));
      }
      if (nearest > 45) {
        this.unseenTimer += dt;
        if (this.unseenTimer > CFG.WANTED_DECAY_SECONDS) {
          this.wanted -= 1;
          this.unseenTimer = 0;
          if (this.wanted === 0) ctx.toast('You lost the cops.');
        }
      } else {
        this.unseenTimer = 0;
      }
    }
  }
}
