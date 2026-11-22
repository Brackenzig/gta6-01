// SOLMAR — bootstrap, game loop, state machine and save.
import * as THREE from 'three';
import { CFG, ROAD_LINES, districtAt, RANKS } from './config.js';
import { buildCity } from './city.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Hud, showOverlay } from './hud.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { CameraRig } from './camera.js';
import { setupShot } from './shots.js';

const SAVE_KEY = 'solmar-save-v1';
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || String(1000 + Math.floor(Math.random() * 9000)), 10);
const SHOT = params.get('shot');

// Renderer.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

// Scene, sky, sun.
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.SKY);
scene.fog = new THREE.Fog(CFG.FOG_COLOR, 200, 760);
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7f6a, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(CFG.SUN_COLOR, CFG.SUN_INTENSITY);
sun.position.set(140, 190, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -340;
sun.shadow.camera.right = 340;
sun.shadow.camera.top = 340;
sun.shadow.camera.bottom = -340;
sun.shadow.camera.far = 700;
scene.add(sun);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

// World.
const city = buildCity(scene, SEED);
const traffic = new Traffic(scene, SEED);
const peds = new Pedestrians(scene, SEED);
const player = new Player(scene, SEED);
const police = new Police(scene, SEED);
const missions = new Missions(scene, player);
const hud = new Hud();
const audio = new AudioSys();
const input = new Input();
const rig = new CameraRig(camera);

// Save / load.
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: player.cash,
      jobsDone: missions.jobsDone,
      loop: missions.loop,
    }));
  } catch {
    // Storage may be unavailable; the game still plays.
  }
}
const save = loadSave();
if (save) {
  player.cash = save.cash || CFG.START_CASH;
  missions.jobsDone = save.jobsDone || 0;
  missions.loop = save.loop || 1;
}

// Shared context the modules call back through.
const G = {
  scene,
  state: 'menu',
  player,
  traffic,
  peds,
  police,
  missions,
  hud,
  camera: rig,
  framesUntilReady: -1,
  ctx: null,
};
function onBusted() {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  const fine = Math.floor(player.cash * 0.3);
  player.cash -= fine;
  police.clearWanted();
  player.health = CFG.PLAYER_HEALTH;
  if (player.car) {
    scene.remove(player.car.mesh);
    player.car = null;
    player.onFoot = true;
    player.mesh.visible = true;
  }
  player.mesh.position.set(108, 0, 130);
  player.heading = 0;
  saveGame();
  document.getElementById('busted-fine').textContent = `The Solmar PD took $${fine} as a fine.`;
  showOverlay('overlay-busted');
  audio.play('fail');
}
function onWasted() {
  if (G.state !== 'playing') return;
  G.state = 'wasted';
  const lost = Math.floor(player.cash * 0.2);
  player.cash -= lost;
  police.clearWanted();
  player.health = CFG.PLAYER_HEALTH;
  if (player.car) {
    scene.remove(player.car.mesh);
    player.car = null;
    player.onFoot = true;
    player.mesh.visible = true;
  }
  player.mesh.position.set(108, 0, 130);
  saveGame();
  document.getElementById('wasted-lost').textContent = `You lost $${lost} at the hospital.`;
  showOverlay('overlay-wasted');
  audio.play('fail');
}
G.ctx = {
  colliders: city.colliders,
  traffic,
  peds,
  police,
  player,
  addWanted: (n) => police.addWanted(n),
  sfx: (n) => audio.play(n),
  toast: (t) => hud.toast(t),
  banner: (t, s) => hud.banner(t, s),
  onBusted,
  onWasted,
};

// Overlay buttons.
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-continue').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', () => {
  G.state = 'playing';
  showOverlay(null);
});
document.getElementById('btn-restart').addEventListener('click', () => {
  location.reload();
});
if (!save) document.getElementById('btn-continue').style.display = 'none';

function startGame() {
  audio.ensure();
  G.state = 'playing';
  showOverlay(null);
  hud.banner('SOLMAR', 'Mara Voss has work for you — press J to take a job.');
}

// Main loop.
const clock = new THREE.Clock();
let elapsed = 0;
let saveTimer = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  // Global keys.
  if (input.pressed('KeyM')) {
    const muted = audio.toggleMute();
    hud.toast(muted ? 'Sound muted' : 'Sound on');
  }
  if (input.pressed('KeyC') && G.state === 'playing') {
    hud.toast(`Camera: ${rig.cycle()}`);
  }
  if (input.pressed('KeyJ') && G.state === 'playing' && !missions.active) {
    missions.startJob(G.ctx);
    saveGame();
  }
  if ((input.pressed('KeyP') || input.pressed('Escape')) && (G.state === 'playing' || G.state === 'paused')) {
    if (G.state === 'playing') {
      G.state = 'paused';
      showOverlay('overlay-pause');
    } else {
      G.state = 'playing';
      showOverlay(null);
    }
  }
  if (input.pressed('Enter')) {
    if (G.state === 'menu') startGame();
    else if (G.state === 'busted' || G.state === 'wasted') {
      G.state = 'playing';
      showOverlay(null);
    }
  }

  if (G.state === 'menu') {
    // Slow orbit over the city while the title screen is up.
    const t = elapsed * 0.08;
    rig.update(dt, { x: Math.sin(t) * 130, z: Math.cos(t) * 130 - 20, heading: t + Math.PI / 2, speed: 10 }, null);
    traffic.update(dt);
    peds.update(dt, { x: 0, z: 0 });
  } else if (G.state === 'playing') {
    player.update(dt, input, Math.PI - rig.camera.rotation.y, G.ctx);
    traffic.update(dt);
    peds.update(dt, { x: player.x, z: player.z });
    police.update(dt, player, G.ctx);
    missions.update(dt, G.ctx);
    rig.update(dt, {
      x: player.x,
      z: player.z,
      heading: player.onFoot ? player.heading : player.car.heading,
      speed: player.movingSpeed,
    }, input);
    // Camera yaw for on-foot movement: the direction the camera looks.
    audio.update(dt, player.onFoot ? 0 : player.car.speed, police.wanted);
    saveTimer += dt;
    if (saveTimer > 30) {
      saveTimer = 0;
      saveGame();
    }
    // HUD.
    const step = missions.step;
    hud.update(dt, {
      cash: player.cash,
      rank: RANKS[Math.min(missions.jobsDone, RANKS.length - 1)],
      district: districtAt(player.x, player.z),
      wanted: police.wanted,
      health: player.health,
      speed: player.movingSpeed,
      onFoot: player.onFoot,
      objective: step ? step.text : null,
      objectiveDist: missions.distanceToObjective(),
      timeLeft: missions.timeLeft,
      missionPos: missions.objectivePos(),
      roadLines: ROAD_LINES,
      traffic: traffic.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
      police: police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
      px: player.x,
      pz: player.z,
      heading: player.onFoot ? player.heading : player.car.heading,
    });
  }

  // Ambient motion: ocean swell and the casino neon.
  city.ocean.position.y = -0.4 + Math.sin(elapsed * 0.6) * 0.12;
  const neon = scene.getObjectByName('casino-neon');
  if (neon) neon.material.color.setHSL(0.85, 1, 0.55 + Math.sin(elapsed * 2.2) * 0.12);

  renderer.render(scene, camera);
  input.endFrame();

  if (G.framesUntilReady > 0) {
    G.framesUntilReady -= 1;
    if (G.framesUntilReady === 0) window.__shotReady = true;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Shot mode: stage the scene and start playing at once.
if (SHOT) {
  setupShot(SHOT, G);
  showOverlay(null);
}

// Expose the game for debugging and for the screenshot harness.
window.__game = G;
animate();
