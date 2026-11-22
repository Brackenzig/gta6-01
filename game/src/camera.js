// Third-person camera: chase, high, and a front camera that looks back at the
// player — so a chase shot frames the player's car with the police behind it.
import * as THREE from 'three';

export const CAMERA_MODES = ['chase', 'high', 'front'];

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'chase';
    this.yawOffset = 0; // added by mouse drag
    this.pos = new THREE.Vector3(0, 12, -18);
    this.look = new THREE.Vector3(0, 2, 0);
  }

  cycle() {
    const i = CAMERA_MODES.indexOf(this.mode);
    this.mode = CAMERA_MODES[(i + 1) % CAMERA_MODES.length];
    return this.mode;
  }

  // target: {x, z, heading, speed} of whatever the camera follows.
  update(dt, target, input) {
    if (input) this.yawOffset += (input.dragX || 0) * 0.004;
    if (input) input.dragX = 0;
    const h = target.heading + this.yawOffset;
    const fx = Math.sin(h);
    const fz = Math.cos(h);
    const desired = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    if (this.mode === 'chase') {
      const back = 9.5 + Math.min(4, Math.abs(target.speed || 0) * 0.08);
      desired.set(target.x - fx * back, 4.6, target.z - fz * back);
      lookAt.set(target.x + fx * 4.5, 1.6, target.z + fz * 4.5);
    } else if (this.mode === 'high') {
      desired.set(target.x - fx * 4, 26, target.z - fz * 4);
      lookAt.set(target.x + fx * 10, 0, target.z + fz * 10);
    } else {
      // Front camera: ahead of the car, looking back — the player and the
      // police chasing them both end up in frame.
      desired.set(target.x + fx * 15, 3.4, target.z + fz * 15);
      lookAt.set(target.x - fx * 8, 1.6, target.z - fz * 8);
    }
    const k = 1 - Math.exp(-dt * 5);
    this.pos.lerp(desired, k);
    this.look.lerp(lookAt, 1 - Math.exp(-dt * 8));
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }

  // Snap instantly (menus, shot setups).
  snap(target) {
    this.pos.set(target.x, 12, target.z - 18);
    this.look.set(target.x, 2, target.z);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
