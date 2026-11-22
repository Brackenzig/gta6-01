// SOLMAR's city: grid streets, towers, palms, beach and marina.
// Builds every mesh from a seed; returns colliders and named landmarks.
import * as THREE from 'three';
import { CFG, ROAD_LINES } from './config.js';
import { Rng } from './rng.js';

// Landmarks the missions use — all on road intersections, so cars can reach them.
export const LANDMARKS = {
  marina: { x: 252, z: -180, label: 'Marina' },
  palms: { x: -180, z: 108, label: 'The Palms Hotel' },
  downtown: { x: 36, z: -180, label: 'Downtown' },
  hideout: { x: 108, z: 108, label: 'Hideout' },
  casino: { x: 252, z: 108, label: 'Casino Row' },
  garage: { x: -252, z: -180, label: 'Old Port Garage' },
  docks: { x: 252, z: 252, label: 'Docks' },
};

function windowTexture(rng, base) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng.chance(0.35);
      g.fillStyle = lit ? '#ffe9a8' : '#20262e';
      g.fillRect(x, y, 7, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, seed) {
  const rng = new Rng(seed);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';

  // Base ground: pale concrete across the whole island.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(760, 820),
    new THREE.MeshLambertMaterial({ color: 0xb9b3a4 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 60);
  ground.receiveShadow = true;
  group.add(ground);

  // Roads: dark asphalt strips along every grid line, with centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: CFG.ROAD_COLOR });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  for (const p of ROAD_LINES) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(CFG.ROAD, 620), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(p, 0.02, -10);
    v.receiveShadow = true;
    group.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(620, CFG.ROAD), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.02, p);
    h.receiveShadow = true;
    group.add(h);
    for (let d = -300; d < 300; d += 24) {
      const dv = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 8), dashMat);
      dv.rotation.x = -Math.PI / 2;
      dv.position.set(p, 0.04, d);
      group.add(dv);
      const dh = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), dashMat);
      dh.rotation.x = -Math.PI / 2;
      dh.position.set(d, 0.04, p);
      group.add(dh);
    }
  }

  // Beach sand and ocean to the south.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(760, CFG.OCEAN_Z - CFG.BEACH_Z),
    new THREE.MeshLambertMaterial({ color: CFG.SAND_COLOR })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, (CFG.BEACH_Z + CFG.OCEAN_Z) / 2);
  sand.receiveShadow = true;
  group.add(sand);
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 300),
    new THREE.MeshPhongMaterial({ color: CFG.OCEAN_COLOR, shininess: 120, specular: 0x99ccff })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.4, CFG.OCEAN_Z + 150);
  ocean.name = 'ocean';
  group.add(ocean);

  // Buildings: one to four per block, taller near Downtown.
  const facadeTex = [
    windowTexture(rng, '#8a7f6a'),
    windowTexture(rng, '#6f7d84'),
    windowTexture(rng, '#9a8a7a'),
  ];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < CFG.GRID - 1; i++) {
    for (let j = 0; j < CFG.GRID - 1; j++) {
      const x0 = ROAD_LINES[i] + CFG.ROAD / 2 + 3;
      const x1 = ROAD_LINES[i + 1] - CFG.ROAD / 2 - 3;
      const z0 = ROAD_LINES[j] + CFG.ROAD / 2 + 3;
      const z1 = ROAD_LINES[j + 1] - CFG.ROAD / 2 - 3;
      if (z0 > CFG.BEACH_Z - 10) continue; // the beach strip stays open
      const downtown = Math.abs((x0 + x1) / 2) < 120 && Math.abs((z0 + z1) / 2 + 60) < 160;
      const count = rng.int(1, downtown ? 4 : 3);
      for (let b = 0; b < count; b++) {
        const w = rng.float(14, Math.min(26, (x1 - x0) / count - 4));
        const d = rng.float(14, Math.min(26, z1 - z0 - 4));
        const h = downtown ? rng.float(22, 58) : rng.float(9, 30);
        const cx = rng.float(x0 + w / 2, x1 - w / 2);
        const cz = rng.float(z0 + d / 2, z1 - d / 2);
        const mat = new THREE.MeshLambertMaterial({
          map: rng.pick(facadeTex),
          color: rng.pick(CFG.BUILDING_COLORS),
        });
        const m = new THREE.Mesh(boxGeo, mat);
        m.scale.set(w, h, d);
        m.position.set(cx, h / 2, cz);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
        // Rooftop box for silhouette variety.
        if (rng.chance(0.5)) {
          const r = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x55504a }));
          r.scale.set(w * 0.4, 2.5, d * 0.4);
          r.position.set(cx, h + 1.2, cz);
          group.add(r);
        }
      }
    }
  }

  // Landmark towers: the Palms hotel, the Casino Row tower, the Old Port garage.
  const hotel = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: facadeTex[1], color: 0xe8dcc0 }));
  hotel.scale.set(30, 64, 24);
  hotel.position.set(-180, 32, 140);
  hotel.castShadow = true;
  group.add(hotel);
  colliders.push({ minX: -195, maxX: -165, minZ: 128, maxZ: 152 });
  const casino = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: facadeTex[2], color: 0xd9a0a0 }));
  casino.scale.set(34, 26, 22);
  casino.position.set(228, 13, 132);
  casino.castShadow = true;
  group.add(casino);
  colliders.push({ minX: 211, maxX: 245, minZ: 121, maxZ: 143 });
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(20, 3, 1),
    new THREE.MeshBasicMaterial({ color: 0xff4fd8 })
  );
  neon.position.set(228, 28, 120);
  neon.name = 'casino-neon';
  group.add(neon);

  // Palm trees: a row along the beach, and scattered on sidewalk corners.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b46 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  function palm(x, z, s = 1) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.55 * s, 7 * s, 6), trunkMat);
    trunk.position.y = 3.5 * s;
    trunk.castShadow = true;
    t.add(trunk);
    for (let k = 0; k < 6; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1 * s, 4.5 * s, 4), leafMat);
      const a = (k / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.6 * s, 7.2 * s, Math.sin(a) * 1.6 * s);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      t.add(leaf);
    }
    t.position.set(x, 0, z);
    group.add(t);
  }
  for (let x = -280; x <= 280; x += 28) palm(x + rng.float(-4, 4), CFG.BEACH_Z + 14 + rng.float(0, 20));
  for (let k = 0; k < 40; k++) {
    // Block corners only: a palm on one road's edge can still stand in the
    // middle of the road crossing it, so offset from both axes.
    palm(rng.pick(ROAD_LINES) + rng.pick([-11, 11]), rng.pick(ROAD_LINES) + rng.pick([-11, 11]), rng.float(0.7, 1.1));
  }

  // Street lights along the roads (emissive heads, no real lights — cheap).
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3f45 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const p of ROAD_LINES) {
    for (let d = -270; d <= 270; d += 72) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 8, 6), poleMat);
      pole.position.set(p + 9, 4, d);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), lampMat);
      lamp.position.set(p + 9, 8.2, d);
      group.add(lamp);
    }
  }

  // Traffic lights at four central intersections.
  for (const [x, z] of [[-36, -36], [36, -36], [-36, 36], [36, 36]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 6), poleMat);
    pole.position.set(x + 9, 3.5, z + 9);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 1), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    head.position.set(x + 9, 7.6, z + 9);
    group.add(head);
    const lit = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0x33ff66 }));
    lit.position.set(x + 9, 8.4, z + 8.4);
    group.add(lit);
  }

  // Marina boats near the docks.
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (let k = 0; k < 5; k++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 10), hullMat);
    hull.position.y = 0.6;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
    mast.position.y = 4.5;
    boat.add(mast);
    boat.position.set(180 + k * 26, -0.2, CFG.OCEAN_Z + 18 + (k % 2) * 14);
    boat.rotation.y = rng.float(-0.3, 0.3);
    group.add(boat);
  }

  scene.add(group);
  return { colliders, ocean, group };
}

// Circle (x, z, radius) against building AABBs: push the circle out and
// return the corrected position.
export function collideCircle(colliders, x, z, r) {
  let nx = x;
  let nz = z;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(nx, b.maxX));
    const cz = Math.max(b.minZ, Math.min(nz, b.maxZ));
    const dx = nx - cx;
    const dz = nz - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        nx = cx + (dx / d) * r;
        nz = cz + (dz / d) * r;
      } else {
        // Centre inside the box: push out along the smallest penetration axis.
        const pl = nx - b.minX;
        const pr = b.maxX - nx;
        const pt = nz - b.minZ;
        const pb = b.maxZ - nz;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) nx = b.minX - r;
        else if (m === pr) nx = b.maxX + r;
        else if (m === pt) nz = b.minZ - r;
        else nz = b.maxZ + r;
      }
    }
  }
  return { x: nx, z: nz };
}
