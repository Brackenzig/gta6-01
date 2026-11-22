// Synthesised sound: no audio files — WebAudio oscillators and noise only.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
    this.sirenPhase = 0;
  }

  // Call from a user gesture (the start button, or the first key press).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    // Engine: a sawtooth through a lowpass filter; pitch follows speed.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren: a sine that wails between two tones while the player is wanted.
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 750;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  blip(freq, dur = 0.12, type = 'sine', vol = 0.5) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  noiseBurst(dur = 0.25, vol = 0.6) {
    if (!this.ctx || this.muted) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    src.start();
  }

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'pickup':
        this.blip(880, 0.1);
        setTimeout(() => this.blip(1320, 0.12), 70);
        break;
      case 'mission':
        [523, 659, 784].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.5), i * 110));
        break;
      case 'complete':
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.5), i * 120));
        break;
      case 'fail':
        [392, 330, 262].forEach((f, i) => setTimeout(() => this.blip(f, 0.25, 'sawtooth', 0.3), i * 140));
        break;
      case 'punch':
        this.noiseBurst(0.12, 0.5);
        this.blip(120, 0.1, 'sine', 0.6);
        break;
      case 'crash':
        this.noiseBurst(0.3, 0.7);
        break;
      case 'steal':
        this.blip(220, 0.15, 'square', 0.3);
        break;
      case 'door':
        this.blip(180, 0.08, 'square', 0.25);
        break;
      default:
        break;
    }
  }

  // Every frame: engine pitch from speed, siren wail while wanted.
  update(dt, speed, wanted) {
    if (!this.ctx) return;
    this.sirenPhase += dt;
    if (this.engineOsc) {
      this.engineOsc.frequency.value = 50 + Math.abs(speed) * 2.6;
      this.engineGain.gain.value = this.muted ? 0 : 0.05 + Math.min(0.09, Math.abs(speed) * 0.002);
    }
    if (this.sirenOsc) {
      if (wanted > 0 && !this.muted) {
        this.sirenOsc.frequency.value = this.sirenPhase % 1 < 0.5 ? 720 : 960;
        this.sirenGain.gain.value = 0.045;
      } else {
        this.sirenGain.gain.value = 0;
      }
    }
  }
}
