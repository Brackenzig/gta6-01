// Screenshot mode: ?shot=<name>&seed=1 stages a deterministic scene so each
// screenshot shows several systems at once, then the page flags itself ready.
import { makeCarMesh } from './traffic.js';
import { LANDMARKS } from './city.js';

// Reposition the first few traffic cars onto chosen lanes, so a shot has
// cars in frame instead of an empty road.
function stageTraffic(G, specs) {
  specs.forEach((s, i) => {
    const c = G.traffic.cars[i];
    if (!c) return;
    c.axis = s.axis;
    c.line = s.line;
    c.lane = s.lane;
    c.dir = s.dir;
    c.pos = s.pos;
    c.speed = s.speed;
    c.cruise = s.speed;
    c.mesh.rotation.y = s.axis === 'x' ? (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : s.dir > 0 ? 0 : Math.PI;
  });
}

function putPlayerInCar(G, x, z, heading, speed, color = 0xc0392b) {
  const mesh = makeCarMesh(color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  // cruise holds the staged speed so the shot stays dynamic.
  G.player.car = { mesh, speed, heading, health: 100, gold: false, cruise: true, cruiseSpeed: speed };
  G.player.onFoot = false;
  G.player.mesh.visible = false;
  G.player.speed = speed;
}

function putPoliceBehind(G, x, z, heading, count) {
  // Exactly three stars for the shot, whatever the mission set before.
  G.police.wanted = 3;
  G.police.unseenTimer = 0;
  while (G.police.cars.length < count) G.police.spawnCarNear(x, z);
  const offsets = [
    { dx: -4, dz: -18, speed: 34 },
    { dx: 4, dz: -30, speed: 32 },
    { dx: -2, dz: -46, speed: 30 },
  ];
  G.police.cars.slice(0, count).forEach((c, i) => {
    const o = offsets[i % offsets.length];
    // Behind means opposite the player's heading.
    const bx = -Math.sin(heading);
    const bz = -Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    c.mesh.position.set(x + bx * -o.dz + rx * o.dx, 0, z + bz * -o.dz + rz * o.dx);
    c.heading = heading;
    c.mesh.rotation.y = heading;
    c.speed = o.speed;
  });
}

export function setupShot(name, G) {
  const ctx = G.ctx;
  G.state = 'playing';
  // Hide every overlay; the HUD stays visible.
  document.querySelectorAll('.overlay').forEach((o) => o.classList.remove('show'));
  G.camera.mode = 'chase';

  if (name === 'chase') {
    // Front camera: the player's car in frame with the cruisers behind it,
    // wanted stars, minimap and a live mission objective on the HUD.
    putPlayerInCar(G, -36, -60, 0, 30, 0xc0392b);
    G.missions.forceJob(1, 1, ctx);
    putPoliceBehind(G, -36, -60, 0, 3);
    G.camera.mode = 'front';
    G.camera.yawOffset = 0;
  } else if (name === 'street') {
    // On foot at a busy Downtown intersection: traffic, pedestrians,
    // the mission beacon in the distance.
    G.player.mesh.position.set(36, 0, 36);
    G.player.heading = Math.PI;
    G.player.mesh.rotation.y = Math.PI;
    G.missions.forceJob(0, 0, ctx);
    // Traffic in frame: two cars on the player's street, one crossing it.
    stageTraffic(G, [
      { axis: 'z', line: 36, lane: -4, dir: 1, pos: -6, speed: 12 },
      { axis: 'z', line: 36, lane: 4, dir: -1, pos: -50, speed: 11 },
      { axis: 'x', line: 36, lane: 4, dir: -1, pos: 100, speed: 12 },
    ]);
    G.camera.mode = 'chase';
    G.camera.yawOffset = 0;
  } else if (name === 'drive') {
    // Cruising the beach road with the ocean beside the car. Left lane, so
    // the street lights on the right stay out of the camera's way.
    putPlayerInCar(G, 248, 200, 0, 32, 0x2471a3);
    G.missions.forceJob(0, 1, ctx);
    G.camera.mode = 'chase';
    G.camera.yawOffset = 0;
  } else if (name === 'mission') {
    // On foot at the Marina pickup, gold beacon overhead, banner up.
    // On the road itself, so no building wall crowds the camera.
    G.player.mesh.position.set(256, 0, -158);
    G.player.heading = Math.PI;
    G.player.mesh.rotation.y = Math.PI;
    G.missions.forceJob(0, 0, ctx);
    G.camera.mode = 'chase';
    G.camera.yawOffset = 0;
  }
  G.camera.snap({ x: G.player.x, z: G.player.z, heading: G.player.heading });
  G.hud.banner(G.missions.job.title, G.missions.step ? G.missions.step.text : '');
  // Let the scene settle, then flag readiness for the screenshot tool.
  G.framesUntilReady = 30;
  return true;
}

export const SHOT_NAMES = ['chase', 'street', 'drive', 'mission'];
export const SHOT_LANDMARKS = LANDMARKS;
