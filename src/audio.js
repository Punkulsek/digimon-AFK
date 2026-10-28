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
      !this.exclusiveVideo && this.prefs.music ? (this.prefs.musicVolume / 100) * 0.42 : 0,
      t,
      0.04,
    );
    this.effects.gain.setTargetAtTime(
      !this.exclusiveVideo && this.prefs.effects ? (this.prefs.effectsVolume / 100) * 0.5 : 0,
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
  setVideoExclusive(value) {
    this.exclusiveVideo=value;this.applyVolume();
    if(value&&this.context){for(const bus of [this.music,this.effects]){bus.gain.cancelScheduledValues(this.context.currentTime);bus.gain.setValueAtTime(0,this.context.currentTime);}}
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
      this.exclusiveVideo || !this.started ||
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
  skillPhase(phase, recipe) {
    if (this.exclusiveVideo || !this.started || this.hidden || !this.prefs.effects || this.context?.state !== 'running') return;
    const now = this.context.currentTime;
    // Ten simultaneous casts share a short sound budget instead of stacking ten loud hits.
    this.skillSoundTimes ??= {};
    if (now - (this.skillSoundTimes[phase] ?? -Infinity) < .09) return;
    this.skillSoundTimes[phase] = now;
    const gentle = ['heal','shield','boost','copy','song','sleep','kiss'].includes(recipe);
    const electric = recipe === 'thunder', water = recipe === 'water';
    const duration = phase === 'charge' ? .32 : phase === 'release' ? .2 : gentle ? .45 : .28;
    const oscillator = this.context.createOscillator(), envelope = this.context.createGain();
    oscillator.type = electric ? 'sawtooth' : gentle || water ? 'sine' : 'triangle';
    const start = phase === 'charge' ? 180 : phase === 'release' ? 620 : gentle ? 660 : electric ? 480 : 150;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(phase === 'charge' ? 520 : gentle ? 880 : 65, now + duration);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(phase === 'impact' ? .09 : .045, now + .015);
    envelope.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(envelope); envelope.connect(this.effects);
    oscillator.start(now); oscillator.stop(now + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    if (phase === 'impact' && !gentle) {
      this.skillNoise ??= (() => {
        const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * .35), this.context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        return buffer;
      })();
      const burst = this.context.createBufferSource(), filter = this.context.createBiquadFilter(), gain = this.context.createGain();
      burst.buffer = this.skillNoise; filter.type = water ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(electric ? 7000 : water ? 1800 : 900, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + .26);
      gain.gain.setValueAtTime(.08, now); gain.gain.exponentialRampToValueAtTime(.001, now + .28);
      burst.connect(filter); filter.connect(gain); gain.connect(this.effects);
      burst.start(now); burst.stop(now + .3);
      burst.onended = () => { burst.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
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
