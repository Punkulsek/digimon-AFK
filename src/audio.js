// User-provided Oldale Town recording; synthesized sound effects only.
const AUDIO_KEY = "pokemon-days-audio-v1";
const note = (midi) => 440 * 2 ** ((midi - 69) / 12);
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
      await this.startMusic();
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
  async startMusic() {
    if (this.track) return;
    if (!this.loading) {
      this.loading = (async () => {
        const response = await fetch(globalThis.POKEMON_BGM || "/audio/oldale-town.mp3");
        if (!response.ok) throw new Error("BGM load failed");
        return this.context.decodeAudioData(await response.arrayBuffer());
      })().catch(error => { this.loading = null; throw error; });
    }
    const buffer = await this.loading;
    if (this.track) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.music);
    source.start();
    this.track = source;
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
