// The player: on foot (walk, run, punch) and in a car (steal, drive, crash).
import * as THREE from 'three';
import { CFG } from './config.js';
import { collideCircle } from './city.js';
import { makeCarMesh } from './traffic.js';
import { Rng } from './rng.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xd8b13c });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.4), jacket);
  torso.position.y = 1.25;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.position.y = 1.95;
  head.castShadow = true;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  cap.position.y = 2.14;
  g.add(cap);
  for (const x of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), jeans);
    leg.position.set(x, 0.42, 0);
    leg.name = x < 0 ? 'legL' : 'legR';
    g.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.2), jacket);
    arm.position.set(x * 2.4, 1.25, 0);
    arm.name = x < 0 ? 'armL' : 'armR';
    g.add(arm);
  }
  return g;
}

export class Player {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = new Rng(seed + 303);
    this.mesh = makePlayerMesh();
    this.mesh.position.set(0, 0, 60);
    scene.add(this.mesh);
    this.heading = 0;
    this.onFoot = true;
    this.car = null; // { mesh, speed, heading, health, gold }
    this.parked = []; // cars the player left behind, still enterable
    this.health = CFG.PLAYER_HEALTH;
    this.cash = CFG.START_CASH;
    this.speed = 0; // signed speed along heading, when driving
    this.walkPhase = 0;
    this.punchCooldown = 0;
    this.steer = 0;
  }

  get x() {
    return this.onFoot ? this.mesh.position.x : this.car.mesh.position.x;
  }
  get z() {
    return this.onFoot ? this.mesh.position.z : this.car.mesh.position.z;
  }
  get movingSpeed() {
    if (this.onFoot) return this._footSpeed || 0;
    return this.car ? Math.abs(this.car.speed) : 0;
  }

  // Nearest enterable car (traffic, or one the player parked) within maxDist.
  nearestCar(traffic, maxDist) {
    let best = null;
    let bd = maxDist;
    let kind = null;
    const t = traffic.nearest(this.x, this.z, maxDist);
    if (t) {
      best = t;
      bd = Math.hypot(t.mesh.position.x - this.x, t.mesh.position.z - this.z);
      kind = 'traffic';
    }
    for (const p of this.parked) {
      const d = Math.hypot(p.mesh.position.x - this.x, p.mesh.position.z - this.z);
      if (d < bd) {
        bd = d;
        best = p;
        kind = 'parked';
      }
    }
    return best ? { car: best, kind } : null;
  }

  enterCar(car, kind, ctx) {
    if (kind === 'traffic') {
      ctx.traffic.remove(car);
      // The driver bails out and runs away.
      const driver = ctx.peds.spawnPed();
      driver.mesh.position.set(car.mesh.position.x + 2, 0, car.mesh.position.z);
      driver.flee = 6;
      ctx.addWanted(1);
      ctx.toast('Car stolen — wanted level up!');
      ctx.sfx('steal');
    } else {
      // One of the player's parked cars: take it out of that list.
      const i = this.parked.indexOf(car);
      if (i >= 0) this.parked.splice(i, 1);
    }
    this.car = { mesh: car.mesh, speed: 0, heading: car.mesh.rotation.y, health: car.health ?? CFG.CAR_HEALTH, gold: !!car.gold };
    this.onFoot = false;
    this.mesh.visible = false;
    ctx.sfx('door');
  }

  exitCar(ctx) {
    if (!this.car) return;
    const m = this.car.mesh;
    const side = { x: Math.cos(this.car.heading), z: -Math.sin(this.car.heading) };
    this.mesh.position.set(m.position.x + side.x * 2.5, 0, m.position.z + side.z * 2.5);
    this.mesh.rotation.y = this.car.heading;
    this.mesh.visible = true;
    this.heading = this.car.heading;
    this.parked.push({ mesh: m, health: this.car.health, gold: this.car.gold });
    this.car = null;
    this.onFoot = true;
    this.speed = 0;
    ctx.sfx('door');
  }

  damageCar(amount, ctx) {
    if (!this.car) return;
    this.car.health -= amount;
    if (this.car.health <= 40) ctx.toast('Your car is smoking — find a new ride!');
    if (this.car.health <= 0) {
      // Explosion: the car is gone and the player is thrown out, hurt.
      const cx = this.car.mesh.position.x;
      const cz = this.car.mesh.position.z;
      this.scene.remove(this.car.mesh);
      this.car = null;
      this.onFoot = true;
      this.mesh.visible = true;
      this.mesh.position.set(cx, 0, cz);
      this.health -= 20;
      ctx.addWanted(1);
      ctx.sfx('crash');
      ctx.toast('Your car exploded!');
      if (this.health <= 0) ctx.onWasted();
    }
  }

  punch(ctx) {
    if (this.punchCooldown > 0 || !this.onFoot) return;
    this.punchCooldown = 0.45;
    const ped = ctx.peds.nearest(this.x, this.z, 2.6);
    if (ped) {
      const cash = ctx.peds.knockDown(ped, true);
      this.cash += cash;
      if (cash > 0) ctx.toast(`+$${cash} — nice right hook`);
      ctx.sfx('punch');
      ctx.peds.scare(this.x, this.z, 14);
      return;
    }
    const cop = ctx.police.nearestOfficer(this.x, this.z, 2.6);
    if (cop) {
      ctx.police.stunOfficer(cop, 4);
      ctx.sfx('punch');
      ctx.addWanted(1);
      ctx.toast('You decked a cop!');
    }
  }

  update(dt, keys, camYaw, ctx) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    if (keys.pressed('KeyF')) this.punch(ctx);
    if (keys.pressed('KeyE')) {
      if (this.onFoot) {
        const near = this.nearestCar(ctx.traffic, 4.5);
        if (near) this.enterCar(near.car, near.kind, ctx);
      } else {
        this.exitCar(ctx);
      }
    }

    if (this.onFoot) {
      // WASD, relative to the camera.
      let ix = 0;
      let iz = 0;
      if (keys.down('KeyW')) iz += 1;
      if (keys.down('KeyS')) iz -= 1;
      if (keys.down('KeyA')) ix -= 1;
      if (keys.down('KeyD')) ix += 1;
      const len = Math.hypot(ix, iz);
      const run = keys.down('ShiftLeft') || keys.down('ShiftRight');
      const spd = run ? CFG.RUN_SPEED : CFG.WALK_SPEED;
      this._footSpeed = len > 0 ? spd : 0;
      if (len > 0) {
        ix /= len;
        iz /= len;
        // Camera-relative: forward is where the camera looks.
        const sin = Math.sin(camYaw);
        const cos = Math.cos(camYaw);
        const mx = ix * cos - iz * sin;
        const mz = ix * sin + iz * cos;
        const targetHeading = Math.atan2(mx, mz);
        let dh = targetHeading - this.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        this.heading += dh * Math.min(1, dt * 12);
        let nx = this.mesh.position.x + mx * spd * dt;
        let nz = this.mesh.position.z + mz * spd * dt;
        const fixed = collideCircle(ctx.colliders, nx, nz, 0.7);
        nx = fixed.x;
        nz = fixed.z;
        nx = Math.max(-CFG.WORLD, Math.min(CFG.WORLD, nx));
        nz = Math.max(-CFG.WORLD, Math.min(CFG.WORLD + 160, nz));
        this.mesh.position.x = nx;
        this.mesh.position.z = nz;
        this.mesh.rotation.y = this.heading;
        this.walkPhase += dt * spd * 1.6;
        const swing = Math.sin(this.walkPhase) * 0.6;
        const legL = this.mesh.getObjectByName('legL');
        const legR = this.mesh.getObjectByName('legR');
        const armL = this.mesh.getObjectByName('armL');
        const armR = this.mesh.getObjectByName('armR');
        if (legL) legL.rotation.x = swing;
        if (legR) legR.rotation.x = -swing;
        if (armL) armL.rotation.x = -swing;
        if (armR) armR.rotation.x = swing;
      }
      // Pick up cash lying around.
      const got = ctx.peds.collect(this.x, this.z);
      if (got > 0) {
        this.cash += got;
        ctx.toast(`+$${got} picked up`);
        ctx.sfx('pickup');
      }
    } else {
      // Driving: arcade physics.
      const c = this.car;
      const fwd = keys.down('KeyW') || keys.down('ArrowUp');
      const back = keys.down('KeyS') || keys.down('ArrowDown');
      const left = keys.down('KeyA') || keys.down('ArrowLeft');
      const right = keys.down('KeyD') || keys.down('ArrowRight');
      const brake = keys.down('Space');
      if (fwd) c.speed += CFG.CAR_ACCEL * dt;
      if (back) {
        if (c.speed > 0.5) c.speed -= CFG.CAR_BRAKE * dt;
        else c.speed -= CFG.CAR_REVERSE * dt;
      }
      if (!fwd && !back) {
        // Staged shot cars hold their speed; ordinary cars coast down.
        if (c.cruise) c.speed += (c.cruiseSpeed - c.speed) * Math.min(1, dt * 3);
        else c.speed -= c.speed * 0.9 * dt;
      }
      if (brake) {
        c.speed -= c.speed * 2.4 * dt;
        c.heading += this.steer * CFG.CAR_TURN * 1.6 * dt * Math.sign(c.speed || 1);
      }
      c.speed = Math.max(-CFG.CAR_REVERSE, Math.min(CFG.CAR_TOP_SPEED, c.speed));
      const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
      this.steer += (steerTarget - this.steer) * Math.min(1, dt * 8);
      const speedFactor = Math.min(1, Math.abs(c.speed) / 14);
      c.heading += this.steer * CFG.CAR_TURN * speedFactor * dt * Math.sign(c.speed || 1);
      const fx = Math.sin(c.heading);
      const fz = Math.cos(c.heading);
      let nx = c.mesh.position.x + fx * c.speed * dt;
      let nz = c.mesh.position.z + fz * c.speed * dt;
      const before = { x: nx, z: nz };
      const fixed = collideCircle(ctx.colliders, nx, nz, 2.3);
      nx = fixed.x;
      nz = fixed.z;
      if (Math.hypot(fixed.x - before.x, fixed.z - before.z) > 0.01 && Math.abs(c.speed) > 12) {
        this.damageCar((Math.abs(c.speed) - 12) * 0.9, ctx);
        c.speed *= -0.25;
        ctx.sfx('crash');
      }
      nx = Math.max(-CFG.WORLD, Math.min(CFG.WORLD, nx));
      nz = Math.max(-CFG.WORLD, Math.min(CFG.WORLD + 150, nz));
      c.mesh.position.x = nx;
      c.mesh.position.z = nz;
      c.mesh.rotation.y = c.heading;
      // Run over pedestrians standing in the way.
      const ped = ctx.peds.nearest(nx, nz, 2.1);
      if (ped && Math.abs(c.speed) > 3) {
        ctx.peds.knockDown(ped, true);
        ctx.addWanted(1);
        ctx.sfx('crash');
        ctx.toast('You ran someone over — the cops noticed');
      }
      // Bump traffic cars.
      const other = ctx.traffic.nearest(nx, nz, 4.2);
      if (other && Math.abs(c.speed) > 6) {
        this.damageCar(5 + Math.abs(c.speed) * 0.2, ctx);
        c.speed *= 0.55;
        ctx.sfx('crash');
      }
      // Pick up cash while driving over it.
      const got = ctx.peds.collect(nx, nz);
      if (got > 0) {
        this.cash += got;
        ctx.toast(`+$${got} picked up`);
      }
    }
  }
}
