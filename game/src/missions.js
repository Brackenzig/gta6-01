// Missions: Mara Voss's four-job story loop. A gold beacon marks the objective;
// the HUD reads the current objective, distance and timer from here.
import * as THREE from 'three';
import { JOBS, RANKS } from './config.js';
import { LANDMARKS } from './city.js';
import { makeCarMesh } from './traffic.js';

export class Missions {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.jobIndex = 0;
    this.stepIndex = 0;
    this.active = false;
    this.timeLeft = 0;
    this.jobsDone = 0;
    this.loop = 1; // payout multiplier grows with each full loop
    this.goldCar = null; // the Vantara GT, spawned for job 3
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    beam.position.y = 30;
    this.beacon.add(beam);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.35, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    ring.name = 'ring';
    this.beacon.add(ring);
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.markerLight = new THREE.PointLight(0xffd700, 60, 40);
    scene.add(this.markerLight);
  }

  get job() {
    return JOBS[this.jobIndex];
  }
  get step() {
    return this.active ? this.job.steps[this.stepIndex] : null;
  }
  get reward() {
    return Math.round(this.job.reward * this.loop);
  }

  startJob(ctx) {
    this.active = true;
    this.stepIndex = 0;
    this.timeLeft = this.job.timeLimit || 0;
    if (this.job.wanted > 0) ctx.police.addWanted(this.job.wanted);
    this.spawnGoldCarIfNeeded(ctx);
    this.moveBeacon();
    ctx.banner(this.job.title, this.job.blurb);
    ctx.sfx('mission');
  }

  spawnGoldCarIfNeeded(ctx) {
    if (this.job.id !== 'grand-theft' || this.goldCar) return;
    const spot = LANDMARKS.casino;
    const mesh = makeCarMesh(0xd4af37, { gold: true });
    mesh.position.set(spot.x + 14, 0, spot.z + 6);
    mesh.rotation.y = Math.PI / 2;
    this.scene.add(mesh);
    this.goldCar = { mesh, health: 100, gold: true };
    // Park it where the player can steal it.
    ctx.player.parked.push(this.goldCar);
  }

  // Where the current step wants the player to be.
  objectivePos() {
    if (!this.step) return null;
    return LANDMARKS[this.step.place];
  }

  moveBeacon() {
    const pos = this.objectivePos();
    if (!pos) {
      this.beacon.visible = false;
      return;
    }
    this.beacon.visible = true;
    this.beacon.position.set(pos.x, 0, pos.z);
    this.markerLight.position.set(pos.x, 6, pos.z);
  }

  // Distance from the player to the objective, in metres.
  distanceToObjective() {
    const pos = this.objectivePos();
    if (!pos) return 0;
    return Math.hypot(this.player.x - pos.x, this.player.z - pos.z);
  }

  update(dt, ctx) {
    if (!this.active) return;
    const ring = this.beacon.getObjectByName('ring');
    if (ring) {
      ring.rotation.z += dt;
      ring.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.12);
    }
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.failJob(ctx, 'Too slow — Mara gave the job to someone else.');
        return;
      }
    }
    const pos = this.objectivePos();
    if (!pos) return;
    const d = Math.hypot(this.player.x - pos.x, this.player.z - pos.z);
    if (d < 7) this.completeStep(ctx);
  }

  completeStep(ctx) {
    const step = this.step;
    ctx.sfx('pickup');
    if (step.type === 'steal') {
      // The player must be IN the gold car for the theft to count.
      if (!this.player.car || !this.player.car.gold) {
        ctx.toast('That is not the Vantara — steal the gold car!');
        return;
      }
    }
    this.stepIndex += 1;
    if (this.stepIndex >= this.job.steps.length) {
      this.completeJob(ctx);
    } else {
      this.moveBeacon();
      ctx.toast(this.step.text);
      ctx.banner('Objective updated', this.step.text);
    }
  }

  completeJob(ctx) {
    const pay = this.reward;
    this.player.cash += pay;
    this.jobsDone += 1;
    this.active = false;
    this.beacon.visible = false;
    ctx.police.clearWanted();
    ctx.banner('JOB COMPLETE', `Mara paid you $${pay}`);
    ctx.sfx('complete');
    ctx.toast(`+$${pay} — ${RANKS[Math.min(this.jobsDone, RANKS.length - 1)]}`);
    // The gold car is Mara's now: remove it if it is still around.
    if (this.goldCar) {
      this.scene.remove(this.goldCar.mesh);
      const i = ctx.player.parked.indexOf(this.goldCar);
      if (i >= 0) ctx.player.parked.splice(i, 1);
      this.goldCar = null;
    }
    this.jobIndex += 1;
    if (this.jobIndex >= JOBS.length) {
      this.jobIndex = 0;
      this.loop += 1;
      ctx.banner('KING OF SOLMAR', 'All four jobs done. Mara has more work — and it pays double.');
    }
  }

  failJob(ctx, reason) {
    this.active = false;
    this.beacon.visible = false;
    ctx.banner('JOB FAILED', reason);
    ctx.sfx('fail');
  }

  // For the ?shot=mission setup: force a given job/step to be active.
  forceJob(index, stepIndex, ctx) {
    this.jobIndex = index;
    this.startJob(ctx);
    this.stepIndex = stepIndex;
    this.moveBeacon();
  }
}
