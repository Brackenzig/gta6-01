// The HUD: cash, rank, district, wanted stars, health, speed, mission banner,
// objective + timer, and a live minimap drawn on a 2D canvas.
import { CFG, DISTRICTS } from './config.js';

export class Hud {
  constructor() {
    const root = document.getElementById('hud');
    root.innerHTML = `
      <div id="hud-top-left">
        <div id="hud-cash">$0</div>
        <div id="hud-rank">Wheelman</div>
        <div id="hud-district">Solmar</div>
      </div>
      <div id="hud-top-right"><div id="hud-stars"></div></div>
      <div id="hud-banner"><div id="hud-banner-title"></div><div id="hud-banner-sub"></div></div>
      <div id="hud-objective"></div>
      <div id="hud-bottom-left">
        <div id="hud-health"><div id="hud-health-fill"></div></div>
        <div id="hud-speed">0 km/h</div>
      </div>
      <div id="hud-bottom-right"><canvas id="minimap" width="190" height="190"></canvas></div>
      <div id="hud-toast"></div>
      <div id="hud-help">WASD move / drive &nbsp;·&nbsp; E enter car &nbsp;·&nbsp; F punch &nbsp;·&nbsp; C camera &nbsp;·&nbsp; Space handbrake &nbsp;·&nbsp; M mute &nbsp;·&nbsp; P pause</div>
    `;
    this.cashEl = document.getElementById('hud-cash');
    this.rankEl = document.getElementById('hud-rank');
    this.districtEl = document.getElementById('hud-district');
    this.starsEl = document.getElementById('hud-stars');
    this.bannerEl = document.getElementById('hud-banner');
    this.bannerTitle = document.getElementById('hud-banner-title');
    this.bannerSub = document.getElementById('hud-banner-sub');
    this.objectiveEl = document.getElementById('hud-objective');
    this.healthFill = document.getElementById('hud-health-fill');
    this.speedEl = document.getElementById('hud-speed');
    this.toastEl = document.getElementById('hud-toast');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.bannerTimer = 0;
    this.toastTimer = 0;
    this.lastStars = -1;
  }

  banner(title, sub = '') {
    this.bannerTitle.textContent = title;
    this.bannerSub.textContent = sub;
    this.bannerEl.classList.add('show');
    this.bannerTimer = 4;
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = 2.5;
  }

  setStars(n) {
    if (n === this.lastStars) return;
    this.lastStars = n;
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<span class="star${i < n ? ' on' : ''}">★</span>`;
    }
    this.starsEl.innerHTML = html;
  }

  update(dt, s) {
    this.cashEl.textContent = `$${Math.floor(s.cash).toLocaleString('en-US')}`;
    this.rankEl.textContent = s.rank;
    this.districtEl.textContent = s.district;
    this.setStars(s.wanted);
    this.healthFill.style.width = `${Math.max(0, s.health)}%`;
    this.healthFill.style.background = s.health > 50 ? '#2ecc71' : s.health > 25 ? '#f39c12' : '#e74c3c';
    this.speedEl.textContent = s.onFoot ? 'ON FOOT' : `${Math.round(s.speed * 3.2)} km/h`;
    if (s.objective) {
      const timer = s.timeLeft > 0 ? ` · ${Math.ceil(s.timeLeft)}s` : '';
      this.objectiveEl.textContent = `◆ ${s.objective} — ${Math.round(s.objectiveDist)}m${timer}`;
      this.objectiveEl.classList.add('show');
    } else {
      this.objectiveEl.textContent = 'No job active — press J to call Mara Voss';
      this.objectiveEl.classList.add('show');
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerEl.classList.remove('show');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
    this.drawMinimap(s);
  }

  drawMinimap(s) {
    const g = this.mapCtx;
    const W = 190;
    const H = 190;
    const scale = W / 640; // world ±320 -> map
    const toX = (x) => W / 2 + x * scale;
    const toY = (z) => H / 2 + (z - 60) * scale;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10, 18, 28, 0.82)';
    g.fillRect(0, 0, W, H);
    // Ocean and sand strip at the bottom.
    g.fillStyle = '#1d7fb8';
    g.fillRect(0, toY(380), W, H - toY(380));
    g.fillStyle = '#e8cf9e';
    g.fillRect(0, toY(292), W, toY(380) - toY(292));
    // Roads.
    g.strokeStyle = '#5a6068';
    g.lineWidth = 5;
    for (const p of s.roadLines) {
      g.beginPath();
      g.moveTo(toX(p), 0);
      g.lineTo(toX(p), H);
      g.stroke();
      g.beginPath();
      g.moveTo(0, toY(p));
      g.lineTo(W, toY(p));
      g.stroke();
    }
    // Mission marker.
    if (s.missionPos) {
      g.fillStyle = '#ffd700';
      const mx = toX(s.missionPos.x);
      const my = toY(s.missionPos.z);
      g.beginPath();
      g.moveTo(mx, my - 7);
      g.lineTo(mx + 6, my);
      g.lineTo(mx, my + 7);
      g.lineTo(mx - 6, my);
      g.closePath();
      g.fill();
    }
    // Traffic.
    g.fillStyle = '#cfd6dd';
    for (const t of s.traffic) {
      g.fillRect(toX(t.x) - 1.5, toY(t.z) - 1.5, 3, 3);
    }
    // Police.
    g.fillStyle = '#ff3b30';
    for (const p of s.police) {
      g.beginPath();
      g.arc(toX(p.x), toY(p.z), 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow.
    g.save();
    g.translate(toX(s.px), toY(s.pz));
    g.rotate(Math.PI - s.heading);
    g.fillStyle = '#2ecc71';
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 6);
    g.lineTo(-5, 6);
    g.closePath();
    g.fill();
    g.restore();
    // Border and north tick.
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, W - 1, H - 1);
    g.fillStyle = '#fff';
    g.font = 'bold 11px sans-serif';
    g.fillText('N', W / 2 - 4, 12);
  }
}

// Start / pause / busted / wasted overlays. main.js wires the buttons.
export function showOverlay(id) {
  for (const o of document.querySelectorAll('.overlay')) o.classList.remove('show');
  if (id) document.getElementById(id).classList.add('show');
}
