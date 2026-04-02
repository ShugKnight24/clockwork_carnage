export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.musicOscillators = [];

    // Track system
    this._musicTimer = null;
    this._currentTrack = null; // 'campaign'|'arena'|'boss'|'menu'|'meltdown'
    this._trackBeat = 0;
    this._trackTempo = 130;

    // Ambient system
    this._ambientTimer = null;
    this._ambientType = null;
    this._ambientNodes = [];

    // Footstep system
    this._lastFootstepTime = 0;
    this._footstepCadence = 350; // ms between footsteps
    this._footstepSide = 0;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.15;
    this.musicGain.connect(this.masterGain);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.12;
    this.ambientGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // ─── Low-level primitives ────────────────────────────────────────────

  playNoise(duration, gain, filterFreq, filterType = "lowpass", pan = 0) {
    if (!this.ctx || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    source.connect(filter);
    filter.connect(g);
    g.connect(panner);
    panner.connect(this.sfxGain);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      g.disconnect();
      panner.disconnect();
    };
    source.start();
  }

  playTone(freq, duration, type = "square", gain = 0.3, detune = 0, pan = 0) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    osc.connect(g);
    g.connect(panner);
    panner.connect(this.sfxGain);

    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
      panner.disconnect();
    };
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Tone routed through musicGain
  _playMusicTone(freq, duration, type = "sawtooth", gain = 0.3, detune = 0) {
    if (!this.ctx || !this.musicEnabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Noise routed through musicGain
  _playMusicNoise(duration, gain, filterFreq, filterType = "lowpass") {
    if (!this.ctx || !this.musicEnabled) return;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
    src.start();
  }

  // ─── Spatial audio helpers ───────────────────────────────────────────

  calculatePan(sourceX, sourceY, playerX, playerY, playerAngle) {
    const dx = sourceX - playerX;
    const dy = sourceY - playerY;
    const angleToSource = Math.atan2(dy, dx);
    let relAngle = angleToSource - playerAngle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;
    return Math.sin(relAngle);
  }

  playSpatial(sourceX, sourceY, player, sfxFn) {
    const pan = this.calculatePan(
      sourceX,
      sourceY,
      player.x,
      player.y,
      player.angle,
    );
    sfxFn(pan);
  }

  // ─── Weapon sounds ───────────────────────────────────────────────────

  // Chrono Pistol (id: 0)
  shootPistol() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.02, 0.9, 3500, "bandpass");

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(700, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.8, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.onended = () => { osc1.disconnect(); g1.disconnect(); };
    osc1.start(t);
    osc1.stop(t + 0.1);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1800, t);
    osc2.frequency.exponentialRampToValueAtTime(900, t + 0.1);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.45, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.onended = () => { osc2.disconnect(); g2.disconnect(); };
    osc2.start(t);
    osc2.stop(t + 0.1);

    this.playTone(120, 0.07, "sine", 0.6);
    this.playNoise(0.04, 0.5, 4000, "bandpass");
  }

  // Temporal Shotgun (id: 1)
  shootShotgun() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.025, 1.0, 1200, "lowpass");

    const bass = this.ctx.createOscillator();
    bass.type = "sawtooth";
    bass.frequency.setValueAtTime(140, t);
    bass.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(1.0, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    bass.connect(bg);
    bg.connect(this.sfxGain);
    bass.onended = () => { bass.disconnect(); bg.disconnect(); };
    bass.start(t);
    bass.stop(t + 0.45);

    const tear = this.ctx.createOscillator();
    tear.type = "sawtooth";
    tear.frequency.setValueAtTime(300, t);
    tear.frequency.exponentialRampToValueAtTime(2000, t + 0.06);
    tear.frequency.exponentialRampToValueAtTime(60, t + 0.25);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.5, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    tear.connect(tg);
    tg.connect(this.sfxGain);
    tear.onended = () => { tear.disconnect(); tg.disconnect(); };
    tear.start(t);
    tear.stop(t + 0.28);

    this.playNoise(0.3, 1.0, 700, "lowpass");
    this.playNoise(0.08, 0.7, 5000, "highpass");
    this.playTone(25, 0.4, "sine", 0.9);
    this.playTone(55, 0.3, "sine", 0.7);
  }

  // Phase Rifle (id: 2)
  shootPlasma() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.015, 1.0, 3000, "bandpass");

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(500, t);
    osc1.frequency.exponentialRampToValueAtTime(150, t + 0.1);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.8, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.onended = () => { osc1.disconnect(); g1.disconnect(); };
    osc1.start(t);
    osc1.stop(t + 0.12);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1400, t);
    osc2.frequency.exponentialRampToValueAtTime(700, t + 0.14);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.5, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.onended = () => { osc2.disconnect(); g2.disconnect(); };
    osc2.start(t);
    osc2.stop(t + 0.14);

    const osc3 = this.ctx.createOscillator();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1470, t);
    osc3.frequency.exponentialRampToValueAtTime(740, t + 0.14);
    const g3 = this.ctx.createGain();
    g3.gain.setValueAtTime(0.4, t);
    g3.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc3.connect(g3);
    g3.connect(this.sfxGain);
    osc3.onended = () => { osc3.disconnect(); g3.disconnect(); };
    osc3.start(t);
    osc3.stop(t + 0.14);

    this.playNoise(0.06, 0.6, 3000, "bandpass");
    this.playTone(80, 0.08, "sine", 0.6);
  }

  // Quantum Cannon (id: 3)
  shootCannon() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.02, 1.0, 1500, "lowpass");

    const bass = this.ctx.createOscillator();
    bass.type = "sawtooth";
    bass.frequency.setValueAtTime(100, t);
    bass.frequency.exponentialRampToValueAtTime(12, t + 0.7);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(1.0, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    bass.connect(bg);
    bg.connect(this.sfxGain);
    bass.onended = () => { bass.disconnect(); bg.disconnect(); };
    bass.start(t);
    bass.stop(t + 0.8);

    const tear1 = this.ctx.createOscillator();
    tear1.type = "sawtooth";
    tear1.frequency.setValueAtTime(200, t);
    tear1.frequency.exponentialRampToValueAtTime(3500, t + 0.12);
    tear1.frequency.exponentialRampToValueAtTime(40, t + 0.55);
    const tg1 = this.ctx.createGain();
    tg1.gain.setValueAtTime(0.6, t);
    tg1.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    tear1.connect(tg1);
    tg1.connect(this.sfxGain);
    tear1.onended = () => { tear1.disconnect(); tg1.disconnect(); };
    tear1.start(t);
    tear1.stop(t + 0.55);

    const tear2 = this.ctx.createOscillator();
    tear2.type = "square";
    tear2.frequency.setValueAtTime(60, t + 0.04);
    tear2.frequency.exponentialRampToValueAtTime(1800, t + 0.18);
    tear2.frequency.exponentialRampToValueAtTime(25, t + 0.6);
    const tg2 = this.ctx.createGain();
    tg2.gain.setValueAtTime(0.001, t);
    tg2.gain.linearRampToValueAtTime(0.5, t + 0.06);
    tg2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    tear2.connect(tg2);
    tg2.connect(this.sfxGain);
    tear2.onended = () => { tear2.disconnect(); tg2.disconnect(); };
    tear2.start(t);
    tear2.stop(t + 0.6);

    this.playNoise(0.6, 1.0, 600, "lowpass");
    this.playNoise(0.35, 0.6, 7000, "highpass");
    this.playTone(18, 0.7, "sine", 0.9);
    this.playTone(40, 0.5, "sine", 0.7);
  }

  // Phase Scattergun (id: 4) — wide phase burst, two detuned oscillators
  shootScattergun() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.03, 0.9, 2000, "bandpass");
    this.playNoise(0.06, 0.7, 800, "lowpass");

    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(400, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.7, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.onended = () => { osc1.disconnect(); g1.disconnect(); };
    osc1.start(t);
    osc1.stop(t + 0.2);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(420, t);
    osc2.frequency.exponentialRampToValueAtTime(85, t + 0.18);
    osc2.detune.value = 15;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.6, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.onended = () => { osc2.disconnect(); g2.disconnect(); };
    osc2.start(t);
    osc2.stop(t + 0.2);

    this.playNoise(0.04, 0.5, 6000, "highpass");
    this.playTone(60, 0.15, "sine", 0.5);
  }

  // Temporal Sniper (id: 5) — high-energy crack with temporal destabilization tail
  shootSniper() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.01, 1.0, 5000, "highpass");

    const whip = this.ctx.createOscillator();
    whip.type = "sawtooth";
    whip.frequency.setValueAtTime(3000, t);
    whip.frequency.exponentialRampToValueAtTime(200, t + 0.06);
    const wg = this.ctx.createGain();
    wg.gain.setValueAtTime(0.9, t);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    whip.connect(wg);
    wg.connect(this.sfxGain);
    whip.onended = () => { whip.disconnect(); wg.disconnect(); };
    whip.start(t);
    whip.stop(t + 0.08);

    // Temporal destabilization warble
    const warp = this.ctx.createOscillator();
    warp.type = "sine";
    warp.frequency.setValueAtTime(600, t + 0.05);
    warp.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    warp.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    const warpG = this.ctx.createGain();
    warpG.gain.setValueAtTime(0.001, t);
    warpG.gain.linearRampToValueAtTime(0.35, t + 0.08);
    warpG.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    warp.connect(warpG);
    warpG.connect(this.sfxGain);
    warp.onended = () => { warp.disconnect(); warpG.disconnect(); };
    warp.start(t);
    warp.stop(t + 0.4);

    this.playTone(35, 0.25, "sine", 0.8);
    this.playNoise(0.2, 0.3, 2000, "bandpass");
  }

  // Ricochet Pistol (id: 6) — metallic ping with bounce character
  shootRicochet() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.015, 0.8, 4000, "bandpass");

    const ping = this.ctx.createOscillator();
    ping.type = "square";
    ping.frequency.setValueAtTime(1200, t);
    ping.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    const pg = this.ctx.createGain();
    pg.gain.setValueAtTime(0.7, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    ping.connect(pg);
    pg.connect(this.sfxGain);
    ping.onended = () => { ping.disconnect(); pg.disconnect(); };
    ping.start(t);
    ping.stop(t + 0.08);

    const ric = this.ctx.createOscillator();
    ric.type = "triangle";
    ric.frequency.setValueAtTime(2000, t + 0.03);
    ric.frequency.exponentialRampToValueAtTime(4000, t + 0.06);
    ric.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.001, t);
    rg.gain.linearRampToValueAtTime(0.4, t + 0.04);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    ric.connect(rg);
    rg.connect(this.sfxGain);
    ric.onended = () => { ric.disconnect(); rg.disconnect(); };
    ric.start(t);
    ric.stop(t + 0.15);

    this.playTone(150, 0.06, "sine", 0.5);
  }

  // EMP Launcher (id: 7) — electrical discharge with shield-disruption buzz
  shootEMP() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.playNoise(0.03, 1.0, 2500, "bandpass");

    const bass = this.ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, t);
    bass.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.9, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    bass.connect(bg);
    bg.connect(this.sfxGain);
    bass.onended = () => { bass.disconnect(); bg.disconnect(); };
    bass.start(t);
    bass.stop(t + 0.35);

    // EMP rapid-wobble buzz
    const buzz = this.ctx.createOscillator();
    buzz.type = "square";
    buzz.frequency.setValueAtTime(200, t);
    buzz.frequency.linearRampToValueAtTime(800, t + 0.05);
    buzz.frequency.linearRampToValueAtTime(150, t + 0.1);
    buzz.frequency.linearRampToValueAtTime(600, t + 0.15);
    buzz.frequency.exponentialRampToValueAtTime(50, t + 0.35);
    const buzzG = this.ctx.createGain();
    buzzG.gain.setValueAtTime(0.5, t);
    buzzG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    buzz.connect(buzzG);
    buzzG.connect(this.sfxGain);
    buzz.onended = () => { buzz.disconnect(); buzzG.disconnect(); };
    buzz.start(t);
    buzz.stop(t + 0.35);

    this.playNoise(0.15, 0.5, 7000, "highpass");
    this.playTone(440, 0.12, "sine", 0.3);
    this.playTone(445, 0.12, "sine", 0.25); // slight beat frequency
  }

  // ─── Combat SFX ─────────────────────────────────────────────────────

  enemyShoot(pan = 0) {
    // Distinct zap sound for enemy ranged attacks — higher pitch, short burst
    this.playTone(600, 0.06, "sawtooth", 0.2, 0, pan);
    this.playTone(450, 0.04, "square", 0.15, 0, pan);
    this.playNoise(0.05, 0.1, 2000, "highpass", pan);
  }

  enemyHit(pan = 0) {
    this.playTone(300, 0.08, "square", 0.3, 0, pan);
    this.playTone(200, 0.06, "square", 0.2, 0, pan);
  }

  enemyDeath(pan = 0) {
    this.playTone(400, 0.1, "square", 0.3, 0, pan);
    this.playTone(200, 0.15, "sawtooth", 0.3, 0, pan);
    this.playTone(100, 0.2, "sawtooth", 0.2, 0, pan);
  }

  playerHit() {
    this.playTone(200, 0.15, "sawtooth", 0.4);
    this.playNoise(0.1, 0.3, 1000, "lowpass");
  }

  playerDeath() {
    this.playTone(300, 0.2, "sawtooth", 0.5);
    this.playTone(150, 0.4, "sawtooth", 0.4);
    this.playTone(75, 0.6, "sawtooth", 0.3);
  }

  // ─── Interaction SFX ────────────────────────────────────────────────

  pickup() {
    this.playTone(523, 0.08, "square", 0.2);
    setTimeout(() => this.playTone(659, 0.08, "square", 0.2), 80);
    setTimeout(() => this.playTone(784, 0.12, "square", 0.2), 160);
  }

  doorOpen() {
    this.playNoise(0.3, 0.3, 500, "lowpass");
    this.playTone(100, 0.3, "sawtooth", 0.2);
  }

  secretFound() {
    this.playTone(440, 0.1, "sine", 0.3);
    setTimeout(() => this.playTone(554, 0.1, "sine", 0.3), 100);
    setTimeout(() => this.playTone(659, 0.1, "sine", 0.3), 200);
    setTimeout(() => this.playTone(880, 0.2, "sine", 0.3), 300);
  }

  timerWarning() {
    this.playTone(880, 0.1, "square", 0.3);
  }

  roundComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 0.2, "square", 0.25), i * 150);
    });
  }

  menuSelect() {
    this.playTone(600, 0.06, "square", 0.2);
  }

  menuConfirm() {
    this.playTone(800, 0.05, "square", 0.2);
    setTimeout(() => this.playTone(1000, 0.08, "square", 0.2), 60);
  }

  // ─── Footstep system ─────────────────────────────────────────────────

  /**
   * Call every frame with current movement state.
   * @param {boolean} isMoving - whether the player is moving
   * @param {number} now - performance.now() timestamp
   */
  updateFootsteps(isMoving, now) {
    if (!this.ctx || !this.enabled || !isMoving) return;
    if (now - this._lastFootstepTime < this._footstepCadence) return;
    this._lastFootstepTime = now;
    this._footstepSide ^= 1;
    const pan = this._footstepSide ? -0.15 : 0.15;
    // Low thud
    this.playNoise(0.06, 0.15, 400, "lowpass", pan);
    // Metallic tap (boot on metal floor)
    this.playTone(90 + Math.random() * 30, 0.04, "triangle", 0.07, 0, pan);
  }

  /** Adjust footstep cadence based on player speed multiplier */
  setFootstepCadence(speedMultiplier) {
    this._footstepCadence = Math.max(150, 350 / Math.max(0.5, speedMultiplier));
  }

  // ─── Meltdown SFX ────────────────────────────────────────────────────

  meltdownJump() {
    if (!this.ctx || !this.enabled) return;
    this.playTone(300, 0.08, "square", 0.25);
    this.playTone(500, 0.06, "sine", 0.2);
  }

  meltdownHit() {
    if (!this.ctx || !this.enabled) return;
    this.playNoise(0.08, 0.5, 800, "lowpass");
    this.playTone(150, 0.12, "sawtooth", 0.35);
  }

  meltdownCollect() {
    if (!this.ctx || !this.enabled) return;
    this.playTone(880, 0.05, "square", 0.2);
    setTimeout(() => this.playTone(1100, 0.06, "square", 0.2), 50);
  }

  meltdownDeath() {
    if (!this.ctx || !this.enabled) return;
    this.playTone(400, 0.15, "sawtooth", 0.4);
    this.playTone(200, 0.25, "sawtooth", 0.35);
    this.playTone(100, 0.4, "sawtooth", 0.25);
    this.playNoise(0.3, 0.3, 600, "lowpass");
  }

  meltdownSpeedUp() {
    if (!this.ctx || !this.enabled) return;
    this.playTone(660, 0.06, "square", 0.2);
    setTimeout(() => this.playTone(880, 0.06, "square", 0.2), 60);
    setTimeout(() => this.playTone(1100, 0.08, "square", 0.2), 120);
  }

  // ─── Music track system ───────────────────────────────────────────────
  //
  // Tracks:
  //  campaign  — dark, methodical, industrial. A-minor, 130 BPM.
  //  arena     — aggressive, escalating. Power fifths, 145 BPM.
  //  boss      — intense, dramatic. Tritone tension, 155 BPM.
  //  menu      — ambient, lighter. Am7 arpeggios, 90 BPM.
  //  meltdown  — frantic, driving. Ascending bass, 160 BPM.

  /**
   * Start a named music track.
   * @param {string} track - 'campaign'|'arena'|'boss'|'menu'|'meltdown'
   * @param {number} [tempo] - BPM override
   */
  startTrack(track, tempo) {
    if (!this.ctx || !this.musicEnabled) return;
    const resolvedTempo = tempo || this._defaultTempo(track);
    // Avoid restarting the same track at the same tempo
    if (
      this._currentTrack === track &&
      this._trackTempo === resolvedTempo &&
      this._musicTimer
    ) return;

    this.stopMusic();
    this._currentTrack = track;
    this._trackTempo = resolvedTempo;
    this._trackBeat = 0;

    const beatDur = 60 / this._trackTempo;
    const playBeat = () => {
      if (!this.musicEnabled) return;
      this._dispatchBeat(track, this._trackBeat, beatDur);
      this._trackBeat++;
      this._musicTimer = setTimeout(playBeat, beatDur * 1000);
    };
    playBeat();
  }

  _defaultTempo(track) {
    const tempos = { campaign: 130, arena: 145, boss: 155, menu: 90, meltdown: 160 };
    return tempos[track] || 130;
  }

  _dispatchBeat(track, beat, beatDur) {
    switch (track) {
      case "campaign":  this._beatCampaign(beat, beatDur); break;
      case "arena":     this._beatArena(beat, beatDur); break;
      case "boss":      this._beatBoss(beat, beatDur); break;
      case "menu":      this._beatMenu(beat, beatDur); break;
      case "meltdown":  this._beatMeltdown(beat, beatDur); break;
      default:          this._beatCampaign(beat, beatDur);
    }
  }

  // ── Campaign: dark, methodical, A-minor pentatonic ──

  _beatCampaign(beat, beatDur) {
    const bassNotes = [55, 55, 65, 55, 73, 55, 65, 82]; // A1 pattern
    const note = bassNotes[beat % bassNotes.length];

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = note;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatDur * 0.8);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + beatDur * 0.8);

    // Hi-hat on even beats
    if (beat % 2 === 0) this._musicHiHat(0.05, 0.15);

    // Kick on 1 and 3
    if (beat % 4 === 0) this._musicKick(150, 0.5);

    // Snare on 2 and 4
    if (beat % 4 === 2) this._musicSnare(0.2);

    // Melody — minor key phrase every 2 beats
    const melNotes = [220, 261, 294, 330, 392, 330, 294, 261];
    if (beat % 2 === 0) {
      this._playMusicTone(melNotes[Math.floor(beat / 2) % melNotes.length], beatDur * 0.6, "square", 0.08);
    }

    // Pad chord drone every 8 beats
    if (beat % 8 === 0) {
      this._playMusicTone(110, beatDur * 4, "sine", 0.06); // A2
      this._playMusicTone(165, beatDur * 4, "sine", 0.04); // E3
    }
  }

  // ── Arena: aggressive, escalating, heavy ──

  _beatArena(beat, beatDur) {
    const bassNotes = [55, 55, 82, 55, 73, 98, 73, 110];
    const note = bassNotes[beat % bassNotes.length];

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = note;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatDur * 0.7);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + beatDur * 0.7);

    // Double-time hi-hats
    this._musicHiHat(0.04, 0.18);

    // Driving kick every other beat
    if (beat % 2 === 0) this._musicKick(160, 0.55);

    // Snare on 2 and 4
    if (beat % 4 === 2) this._musicSnare(0.25);

    // Aggressive stab chords every 4 beats
    if (beat % 4 === 0) {
      this._playMusicTone(220, beatDur * 0.3, "sawtooth", 0.12);
      this._playMusicTone(330, beatDur * 0.3, "sawtooth", 0.08);
    }

    // Rising tension line every 16 beats
    if (beat % 16 < 4 && beat % 2 === 0) {
      this._playMusicTone(330 + (beat % 16) * 55, beatDur * 0.5, "square", 0.06);
    }
  }

  // ── Boss: intense, dramatic, tritone tension ──

  _beatBoss(beat, beatDur) {
    const bassNotes = [55, 55, 78, 55, 55, 78, 82, 78]; // A1 / Eb2 tritone
    const note = bassNotes[beat % bassNotes.length];

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = note;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.38, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatDur * 0.6);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + beatDur * 0.6);

    // Double-time kick every beat
    this._musicKick(170, 0.6);

    // Hi-hat accented on off-beats
    this._musicHiHat(0.04, beat % 2 === 1 ? 0.22 : 0.12);

    // Heavy snare on 2 and 4
    if (beat % 4 === 2) this._musicSnare(0.3);

    // Dissonant tritone stab every 2 beats
    if (beat % 2 === 0) {
      this._playMusicTone(220, beatDur * 0.25, "square", 0.1);
      this._playMusicTone(311, beatDur * 0.25, "square", 0.08); // Eb4 — tritone
    }

    // Dramatic descending line in second half of every 8-beat phrase
    if (beat % 8 >= 4) {
      const descNotes = [440, 392, 311, 220];
      this._playMusicTone(descNotes[beat % 4], beatDur * 0.4, "sawtooth", 0.07);
    }

    // Sub bass pulse every 4 beats
    if (beat % 4 === 0) this._playMusicTone(27.5, beatDur * 2, "sine", 0.15);
  }

  // ── Menu: ambient, lighter, slow arpeggios ──

  _beatMenu(beat, beatDur) {
    const arpNotes = [220, 261, 330, 392, 440, 392, 330, 261]; // Am7
    this._playMusicTone(arpNotes[beat % arpNotes.length], beatDur * 1.5, "sine", 0.1);

    // Gentle sustained pad every 8 beats
    if (beat % 8 === 0) {
      this._playMusicTone(110, beatDur * 6, "sine", 0.05);
      this._playMusicTone(165, beatDur * 6, "sine", 0.04);
      this._playMusicTone(196, beatDur * 6, "sine", 0.03);
    }

    // Soft kick every 4 beats
    if (beat % 4 === 0) this._musicKick(80, 0.15);

    // Very soft hi-hat every 2 beats
    if (beat % 2 === 0) this._musicHiHat(0.03, 0.06);
  }

  // ── Meltdown: frantic, driving, relentless ──

  _beatMeltdown(beat, beatDur) {
    const bassNotes = [55, 65, 73, 82, 98, 110, 98, 82]; // ascending urgency
    const note = bassNotes[beat % bassNotes.length];

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = note;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatDur * 0.5);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + beatDur * 0.5);

    // Relentless hi-hats every beat
    this._musicHiHat(0.03, 0.16);

    // Driving kick every beat
    this._musicKick(160, 0.5);

    // Snare on 2 and 4
    if (beat % 4 === 2) this._musicSnare(0.22);

    // Alarm melody
    const alarmNotes = [440, 523, 440, 523, 392, 440, 392, 349];
    if (beat % 2 === 0) {
      this._playMusicTone(alarmNotes[Math.floor(beat / 2) % alarmNotes.length], beatDur * 0.3, "square", 0.07);
    }

    // Extra noise burst every 8 beats for intensity
    if (beat % 8 === 0) this._playMusicNoise(beatDur * 0.2, 0.1, 3000, "bandpass");
  }

  // ── Shared percussion helpers ──

  _musicHiHat(duration, gain) {
    if (!this.ctx || !this.musicEnabled) return;
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hg = this.ctx.createGain();
    hg.gain.setValueAtTime(gain, this.ctx.currentTime);
    hg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    const hf = this.ctx.createBiquadFilter();
    hf.type = "highpass";
    hf.frequency.value = 8000;
    src.connect(hf);
    hf.connect(hg);
    hg.connect(this.musicGain);
    src.onended = () => { src.disconnect(); hf.disconnect(); hg.disconnect(); };
    src.start();
  }

  _musicKick(startFreq, gain) {
    if (!this.ctx || !this.musicEnabled) return;
    const kick = this.ctx.createOscillator();
    kick.type = "sine";
    kick.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    kick.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
    const kg = this.ctx.createGain();
    kg.gain.setValueAtTime(gain, this.ctx.currentTime);
    kg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    kick.connect(kg);
    kg.connect(this.musicGain);
    kick.onended = () => { kick.disconnect(); kg.disconnect(); };
    kick.start();
    kick.stop(this.ctx.currentTime + 0.15);
  }

  _musicSnare(gain) {
    if (!this.ctx || !this.musicEnabled) return;
    // Noise body
    const bufSize = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(gain, this.ctx.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    const sf = this.ctx.createBiquadFilter();
    sf.type = "bandpass";
    sf.frequency.value = 3000;
    src.connect(sf);
    sf.connect(sg);
    sg.connect(this.musicGain);
    src.onended = () => { src.disconnect(); sf.disconnect(); sg.disconnect(); };
    src.start();

    // Tonal snap
    const snap = this.ctx.createOscillator();
    snap.type = "triangle";
    snap.frequency.setValueAtTime(200, this.ctx.currentTime);
    snap.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);
    const snapG = this.ctx.createGain();
    snapG.gain.setValueAtTime(gain * 0.5, this.ctx.currentTime);
    snapG.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    snap.connect(snapG);
    snapG.connect(this.musicGain);
    snap.onended = () => { snap.disconnect(); snapG.disconnect(); };
    snap.start();
    snap.stop(this.ctx.currentTime + 0.06);
  }

  // ─── Ambient soundscape system ────────────────────────────────────────
  //
  //  industrial — low rumble + metallic clanks (campaign, tutorial)
  //  arena      — crowd murmur + distant siren
  //  meltdown   — alarm klaxon + rumbling
  //  menu       — soft electrical hum + wind

  /**
   * Start an ambient soundscape layer.
   * @param {string} type - 'industrial'|'arena'|'meltdown'|'menu'
   */
  startAmbient(type) {
    if (!this.ctx || !this.enabled) return;
    if (this._ambientType === type && this._ambientTimer) return;
    this.stopAmbient();
    this._ambientType = type;

    const pulse = () => {
      if (!this.enabled || this._ambientType !== type) return;
      this._ambientPulse(type);
      const base = type === "menu" ? 3000 : 2000;
      this._ambientTimer = setTimeout(pulse, base + Math.random() * 1000);
    };
    pulse();
  }

  stopAmbient() {
    if (this._ambientTimer) {
      clearTimeout(this._ambientTimer);
      this._ambientTimer = null;
    }
    this._ambientType = null;
    for (const node of this._ambientNodes) {
      try { node.disconnect(); } catch (_) { /* already gone */ }
    }
    this._ambientNodes = [];
  }

  _ambientPulse(type) {
    switch (type) {
      case "industrial": this._ambientIndustrial(); break;
      case "arena":      this._ambientArena(); break;
      case "meltdown":   this._ambientMeltdown(); break;
      case "menu":       this._ambientMenu(); break;
    }
  }

  _ambientIndustrial() {
    // Low rumble
    const bufSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 120;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.setValueAtTime(0.08, this.ctx.currentTime + 1.5);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);
    src.connect(f); f.connect(g); g.connect(this.ambientGain);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start();

    // Random metallic clank (30% chance)
    if (Math.random() < 0.3) {
      const delay = Math.random() * 1500;
      setTimeout(() => {
        if (!this.ctx || !this.enabled) return;
        const pan = (Math.random() - 0.5) * 1.6;
        const freq = 800 + Math.random() * 600;
        const clank = this.ctx.createOscillator();
        clank.type = "triangle";
        clank.frequency.setValueAtTime(freq, this.ctx.currentTime);
        clank.frequency.exponentialRampToValueAtTime(freq * 0.3, this.ctx.currentTime + 0.15);
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(0.06, this.ctx.currentTime);
        cg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        const cp = this.ctx.createStereoPanner();
        cp.pan.value = Math.max(-1, Math.min(1, pan));
        clank.connect(cg); cg.connect(cp); cp.connect(this.ambientGain);
        clank.onended = () => { clank.disconnect(); cg.disconnect(); cp.disconnect(); };
        clank.start();
        clank.stop(this.ctx.currentTime + 0.2);
      }, delay);
    }
  }

  _ambientArena() {
    // Crowd murmur
    const bufSize = this.ctx.sampleRate * 2.5;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 400;
    f.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, this.ctx.currentTime);
    g.gain.setValueAtTime(0.04, this.ctx.currentTime + 2);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);
    src.connect(f); f.connect(g); g.connect(this.ambientGain);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start();

    // Distant siren sweep (20% chance)
    if (Math.random() < 0.2) {
      setTimeout(() => {
        if (!this.ctx || !this.enabled) return;
        const siren = this.ctx.createOscillator();
        siren.type = "sine";
        siren.frequency.setValueAtTime(500, this.ctx.currentTime);
        siren.frequency.linearRampToValueAtTime(700, this.ctx.currentTime + 0.8);
        siren.frequency.linearRampToValueAtTime(500, this.ctx.currentTime + 1.6);
        const sg = this.ctx.createGain();
        sg.gain.setValueAtTime(0.02, this.ctx.currentTime);
        sg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);
        siren.connect(sg); sg.connect(this.ambientGain);
        siren.onended = () => { siren.disconnect(); sg.disconnect(); };
        siren.start();
        siren.stop(this.ctx.currentTime + 1.8);
      }, Math.random() * 1000);
    }
  }

  _ambientMeltdown() {
    // Alarm klaxon — two alternating tones
    const t = this.ctx.currentTime;
    const alarm = this.ctx.createOscillator();
    alarm.type = "square";
    alarm.frequency.setValueAtTime(600, t);
    alarm.frequency.setValueAtTime(800, t + 0.4);
    alarm.frequency.setValueAtTime(600, t + 0.8);
    alarm.frequency.setValueAtTime(800, t + 1.2);
    const ag = this.ctx.createGain();
    ag.gain.setValueAtTime(0.03, t);
    ag.gain.setValueAtTime(0.03, t + 1.4);
    ag.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    alarm.connect(ag); ag.connect(this.ambientGain);
    alarm.onended = () => { alarm.disconnect(); ag.disconnect(); };
    alarm.start(t);
    alarm.stop(t + 1.6);

    // Low rumble
    const bufSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 100;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2);
    src.connect(f); f.connect(g); g.connect(this.ambientGain);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start();
  }

  _ambientMenu() {
    // Soft 60Hz electrical hum
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 60;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.02, this.ctx.currentTime);
    g.gain.setValueAtTime(0.02, this.ctx.currentTime + 2.5);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3);
    osc.connect(g); g.connect(this.ambientGain);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + 3);

    // Soft wind (50% chance)
    if (Math.random() < 0.5) {
      const bufSize = this.ctx.sampleRate * 3;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 200 + Math.random() * 200;
      f.Q.value = 2;
      const wg = this.ctx.createGain();
      wg.gain.setValueAtTime(0.001, this.ctx.currentTime);
      wg.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 1);
      wg.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 3);
      src.connect(f); f.connect(wg); wg.connect(this.ambientGain);
      src.onended = () => { src.disconnect(); f.disconnect(); wg.disconnect(); };
      src.start();
    }
  }

  // ─── Legacy backward-compatible API ──────────────────────────────────

  /**
   * Legacy wrapper — starts campaign track at given tempo.
   * All existing game.js calls continue to work unchanged.
   */
  startMusic(tempo = 140) {
    this.startTrack("campaign", tempo);
  }

  // ─── Volume controls ──────────────────────────────────────────────────

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  setMusicVolume(v) {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, v * 0.15));
    }
  }

  setSfxVolume(v) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  setAmbientVolume(v) {
    if (this.ambientGain) {
      this.ambientGain.gain.value = Math.max(0, Math.min(1, v * 0.12));
    }
  }

  stopMusic() {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
    this._currentTrack = null;
    // Also stop ambient — every stopMusic call is a mode transition
    this.stopAmbient();
  }

  /** One-shot alarm klaxon — two alternating square-wave tones (600/800Hz, ~1.6s) */
  alarmKlaxon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const alarm = this.ctx.createOscillator();
    alarm.type = "square";
    alarm.frequency.setValueAtTime(600, t);
    alarm.frequency.setValueAtTime(800, t + 0.4);
    alarm.frequency.setValueAtTime(600, t + 0.8);
    alarm.frequency.setValueAtTime(800, t + 1.2);
    const ag = this.ctx.createGain();
    ag.gain.setValueAtTime(0.05, t);
    ag.gain.setValueAtTime(0.05, t + 1.4);
    ag.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    alarm.connect(ag); ag.connect(this.sfxGain);
    alarm.onended = () => { alarm.disconnect(); ag.disconnect(); };
    alarm.start(t);
    alarm.stop(t + 1.6);
  }

  /** Stop music and ambient together (alias for stopMusic) */
  stopAll() {
    this.stopMusic();
  }
}
