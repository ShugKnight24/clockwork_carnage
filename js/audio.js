export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.musicOscillators = [];
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
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playNoise(duration, gain, filterFreq, filterType = "lowpass") {
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
    source.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    source.start();
  }

  playTone(freq, duration, type = "square", gain = 0.3, detune = 0) {
    if (!this.ctx || !this.enabled) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Sound effects

  // Plasma Pistol
  shootPistol() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Attack
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
    osc1.start(t);
    osc1.stop(t + 0.1);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1800, t);
    osc2.frequency.exponentialRampToValueAtTime(900, t + 0.1);

    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.45, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    // Connect and play
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.1);
    this.playTone(120, 0.07, "sine", 0.6);
    this.playNoise(0.04, 0.5, 4000, "bandpass");
  }

  // Shotgun
  shootShotgun() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    // Initial blast impact
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
    tear.start(t);
    tear.stop(t + 0.28);

    this.playNoise(0.3, 1.0, 700, "lowpass");
    this.playNoise(0.08, 0.7, 5000, "highpass");
    this.playTone(25, 0.4, "sine", 0.9);
    this.playTone(55, 0.3, "sine", 0.7);
  }

  // Plasma Rifle
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
    osc3.start(t);
    osc3.stop(t + 0.14);
    this.playNoise(0.06, 0.6, 3000, "bandpass");
    this.playTone(80, 0.08, "sine", 0.6);
  }

  // Cannon
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
    tear2.start(t);
    tear2.stop(t + 0.6);

    this.playNoise(0.6, 1.0, 600, "lowpass");
    this.playNoise(0.35, 0.6, 7000, "highpass");
    this.playTone(18, 0.7, "sine", 0.9);
    this.playTone(40, 0.5, "sine", 0.7);
  }

  enemyHit() {
    this.playTone(300, 0.08, "square", 0.3);
    this.playTone(200, 0.06, "square", 0.2);
  }

  enemyDeath() {
    this.playTone(400, 0.1, "square", 0.3);
    this.playTone(200, 0.15, "sawtooth", 0.3);
    this.playTone(100, 0.2, "sawtooth", 0.2);
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

  // Ambient music
  // TODO: add more layers (melody, chords) and variation over time
  // TODO: add additional tracks for different levels/modes
  startMusic(tempo = 140) {
    if (!this.ctx || !this.musicEnabled) return;
    this.stopMusic();

    const beatDur = 60 / tempo;
    const bassNotes = [55, 55, 65, 55, 73, 55, 65, 82];
    let beat = 0;

    const playBeat = () => {
      if (!this.musicEnabled) return;
      const note = bassNotes[beat % bassNotes.length];

      // Bass
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = note;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.3, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + beatDur * 0.8,
      );
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + beatDur * 0.8);

      // Hi-hat on every beat
      if (beat % 2 === 0) {
        const bufSize = this.ctx.sampleRate * 0.05;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const hg = this.ctx.createGain();
        hg.gain.setValueAtTime(0.15, this.ctx.currentTime);
        hg.gain.exponentialRampToValueAtTime(
          0.001,
          this.ctx.currentTime + 0.05,
        );
        const hf = this.ctx.createBiquadFilter();
        hf.type = "highpass";
        hf.frequency.value = 8000;
        src.connect(hf);
        hf.connect(hg);
        hg.connect(this.musicGain);
        src.start();
      }

      // Kick on 1 and 3
      if (beat % 4 === 0) {
        const kick = this.ctx.createOscillator();
        kick.type = "sine";
        kick.frequency.setValueAtTime(150, this.ctx.currentTime);
        kick.frequency.exponentialRampToValueAtTime(
          30,
          this.ctx.currentTime + 0.15,
        );
        const kg = this.ctx.createGain();
        kg.gain.setValueAtTime(0.5, this.ctx.currentTime);
        kg.gain.exponentialRampToValueAtTime(
          0.001,
          this.ctx.currentTime + 0.15,
        );
        kick.connect(kg);
        kg.connect(this.musicGain);
        kick.start();
        kick.stop(this.ctx.currentTime + 0.15);
      }

      beat++;
      this._musicTimer = setTimeout(playBeat, beatDur * 1000);
    };

    playBeat();
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  stopMusic() {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
