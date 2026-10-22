// Original 16-bar chiptune, synthesized locally. No downloaded music or requests.
const AUDIO_KEY = "pokemon-days-audio-v1";
const note = (midi) => 440 * 2 ** ((midi - 69) / 12);
const MELODY = [
  [72, 76, 79, 76, 74, 72, 67, 0],
  [69, 72, 76, 79, 76, 72, 69, 0],
  [65, 69, 72, 76, 74, 72, 69, 0],
  [67, 71, 74, 79, 77, 74, 71, 0],
  [72, 0, 79, 81, 79, 76, 74, 72],
  [69, 72, 76, 0, 79, 76, 72, 69],
  [65, 69, 72, 74, 76, 74, 72, 69],
  [67, 71, 74, 77, 79, 77, 74, 71],
  [84, 79, 76, 79, 81, 79, 76, 72],
  [81, 76, 72, 76, 79, 76, 72, 69],
  [77, 76, 72, 69, 72, 76, 77, 0],
  [79, 77, 74, 71, 74, 77, 79, 0],
  [76, 79, 84, 83, 81, 79, 76, 74],
  [72, 76, 79, 81, 79, 76, 72, 69],
  [77, 76, 74, 72, 69, 72, 74, 71],
  [72, 0, 76, 0, 79, 0, 72, 0],
];
const CHORDS = [
  [48, 52, 55],
  [45, 48, 52],
  [41, 45, 48],
  [43, 47, 50],
];

export class GameAudio {
  constructor(storage, changed = () => {}) {
    this.storage = storage;
    this.changed = changed;
    this.prefs = {
      music: true,
      effects: true,
      musicVolume: 28,
      effectsVolume: 38,
    };
    try {
      const old = JSON.parse(storage.getItem(AUDIO_KEY));
      if (old)
        for (const k of Object.keys(this.prefs)) {
          if (typeof this.prefs[k] === "boolean" && typeof old[k] === "boolean")
            this.prefs[k] = old[k];
          if (typeof this.prefs[k] === "number" && Number.isFinite(old[k]))
            this.prefs[k] = Math.max(0, Math.min(100, old[k]));
        }
    } catch {}
    this.started = false;
    this.hidden = false;
    this.mode = "field";
    this.tick = 0;
    this.context = null;
    this.lastEffect = 0;
  }
  async unlock() {
    if (this.hidden) return false;
    try {
      if (!this.context) {
        const Context =
          globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Context) return false;
        this.context = new Context();
        this.music = this.context.createGain();
        this.effects = this.context.createGain();
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.ratio.value = 6;
        this.music.connect(limiter);
        this.effects.connect(limiter);
        limiter.connect(this.context.destination);
      }
      await this.context.resume();
      this.started = this.context.state === "running";
      this.applyVolume();
      this.startScheduler();
      this.changed();
      return this.started;
    } catch {
      this.started = false;
      this.changed();
      return false;
    }
  }
  applyVolume() {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.music.gain.setTargetAtTime(
      this.prefs.music ? (this.prefs.musicVolume / 100) * 0.42 : 0,
      t,
      0.04,
    );
    this.effects.gain.setTargetAtTime(
      this.prefs.effects ? (this.prefs.effectsVolume / 100) * 0.5 : 0,
      t,
      0.025,
    );
  }
  set(key, value) {
    if (!(key in this.prefs)) return;
    this.prefs[key] =
      typeof this.prefs[key] === "boolean"
        ? Boolean(value)
        : Math.max(0, Math.min(100, Number(value) || 0));
    try {
      this.storage.setItem(AUDIO_KEY, JSON.stringify(this.prefs));
    } catch {}
    this.applyVolume();
    this.changed();
  }
  async toggleMusic() {
    if (!this.started) {
      this.set("music", true);
      await this.unlock();
    } else this.set("music", !this.prefs.music);
  }
  setMode(mode) {
    this.mode = mode;
  }
  tone(midi, time, duration, gain = 0.15, type = "triangle", bus = this.music) {
    if (!midi || !this.context) return;
    const oscillator = this.context.createOscillator(),
      envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = note(midi);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(gain, time + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.025);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  startScheduler() {
    if (this.scheduler) return;
    this.nextNote = this.context.currentTime + 0.06;
    this.scheduler = setInterval(() => this.schedule(), 45);
    this.schedule();
  }
  schedule() {
    if (!this.started || this.hidden || this.context.state !== "running")
      return;
    const seconds =
      60 / (this.mode === "boss" ? 132 : this.mode === "summon" ? 96 : 108) / 2;
    if (this.nextNote < this.context.currentTime - 0.2)
      this.nextNote = this.context.currentTime + 0.03;
    while (this.nextNote < this.context.currentTime + 0.13) {
      const bar = Math.floor(this.tick / 8) % 16,
        beat = this.tick % 8,
        chord = CHORDS[bar % 4],
        t = this.nextNote;
      if (this.prefs.music) {
        const trans = this.mode === "boss" ? -12 : 0;
        this.tone(
          MELODY[bar][beat] + (MELODY[bar][beat] ? trans : 0),
          t,
          seconds * 0.85,
          0.12,
          "triangle",
        );
        this.tone(chord[beat % 3] + 12, t, seconds * 0.65, 0.045, "sine");
        if (beat % 2 === 0)
          this.tone(chord[0] - 12, t, seconds * 1.5, 0.11, "triangle");
        if (beat === 0 || beat === 4)
          for (const n of chord)
            this.tone(n + 12, t, seconds * 3.5, 0.025, "sine");
      }
      this.tick++;
      this.nextNote += seconds;
    }
  }
  effect(kind) {
    if (
      !this.started ||
      this.hidden ||
      !this.prefs.effects ||
      this.context.state !== "running"
    )
      return;
    const now = this.context.currentTime;
    if (kind === "attack" && now - this.lastEffect < 0.12) return;
    const sequences = {
      click: [76],
      attack: [57, 69],
      critical: [72, 79, 84],
      reward: [76, 84],
      level: [60, 64, 67, 72, 79],
      summon: [60, 67, 72, 76, 79, 84],
      reveal: [72, 76, 79, 84],
      legendary: [60, 64, 67, 72, 76, 79, 84, 88],
      boss: [48, 55, 48, 51],
      clear: [67, 72, 76, 79, 84],
      defeat: [64, 60, 55],
    };
    const notes = sequences[kind] || sequences.click;
    notes.forEach((n, j) =>
      this.tone(
        n,
        now + j * (kind === "attack" ? 0.025 : 0.075),
        kind === "attack" ? 0.07 : 0.2,
        kind === "attack" ? 0.07 : 0.16,
        "triangle",
        this.effects,
      ),
    );
    this.lastEffect = now;
  }
  async visibility(hidden) {
    this.hidden = hidden;
    if (hidden) {
      clearInterval(this.scheduler);
      this.scheduler = null;
      if (this.context?.state === "running") await this.context.suspend();
    } else if (this.started) {
      await this.unlock();
    }
  }
  status() {
    return !this.context &&
      !(globalThis.AudioContext || globalThis.webkitAudioContext)
      ? "unavailable"
      : !this.started
        ? "waiting"
        : this.hidden
          ? "paused"
          : this.prefs.music
            ? "playing"
            : "muted";
  }
}
