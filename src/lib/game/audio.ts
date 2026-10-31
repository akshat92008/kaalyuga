// Procedural Web Audio API synthesizer for Black Myth: Wukong — Ashen Mandate

class SoundEngine {
  private ctx: AudioContext | null = null;
  private swingBuffers: { light: AudioBuffer | null; heavy: AudioBuffer | null } = {
    light: null,
    heavy: null,
  };
  public muted: boolean = false;
  public musicEnabled: boolean = true;
  private musicTimer: number | null = null;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSwingBuffer(ctx: AudioContext, weight: 'light' | 'heavy'): AudioBuffer {
    const cached = this.swingBuffers[weight];
    if (cached && cached.sampleRate === ctx.sampleRate) {
      return cached;
    }
    const bufferSize = Math.floor(ctx.sampleRate * (weight === 'heavy' ? 0.24 : 0.12));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    this.swingBuffers[weight] = buffer;
    return buffer;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopMusic();
    } else if (this.musicEnabled) {
      this.startMusic();
    }
  }

  public playSwing(weight: 'light' | 'heavy' = 'light') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchVar = 0.92 + Math.random() * 0.16;

    // Reuse cached noise buffer for staff air whoosh (avoids per-swing Float32Array allocation)
    const buffer = this.getSwingBuffer(ctx, weight);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((weight === 'heavy' ? 320 : 540) * pitchVar, now);
    filter.frequency.exponentialRampToValueAtTime((weight === 'heavy' ? 140 : 220) * pitchVar, now + (weight === 'heavy' ? 0.22 : 0.11));
    filter.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(weight === 'heavy' ? 0.22 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (weight === 'heavy' ? 0.24 : 0.12));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    noise.start(now);
  }

  public playHit(type: 'light' | 'heavy' | 'crit' | 'execute' = 'light') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchVar = 0.93 + Math.random() * 0.14;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'light' ? 'triangle' : 'sawtooth';

    const startFreq = type === 'execute' ? 190 : type === 'heavy' ? 150 : type === 'crit' ? 240 : 125;
    const dur = type === 'execute' ? 0.38 : type === 'heavy' ? 0.26 : 0.12;

    osc.frequency.setValueAtTime(startFreq * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + dur);

    gain.gain.setValueAtTime(type === 'light' ? 0.16 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);

    if (type !== 'light') {
      // Deep 45Hz-68Hz Sub-Bass Seismic Rumble for Heavy Parashu Slams & Executions
      const subBass = ctx.createOscillator();
      const subGain = ctx.createGain();
      subBass.type = 'sine';
      const subDur = type === 'execute' ? 0.48 : 0.34;
      subBass.frequency.setValueAtTime(type === 'execute' ? 68 : 58, now);
      subBass.frequency.exponentialRampToValueAtTime(28, now + subDur);
      subGain.gain.setValueAtTime(type === 'execute' ? 0.38 : 0.28, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + subDur);
      subBass.connect(subGain);
      subGain.connect(ctx.destination);
      subBass.start(now);
      subBass.stop(now + subDur);

      // Metallic bronze-iron ring overtone for Bloodforged Parashu Axe
      const ring = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime((type === 'execute' ? 580 : 440) * pitchVar, now);
      ring.frequency.exponentialRampToValueAtTime(220, now + dur * 1.2);
      ringGain.gain.setValueAtTime(0.12, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.2);
      ring.connect(ringGain);
      ringGain.connect(ctx.destination);
      ring.start(now);
      ring.stop(now + dur * 1.2);
    }
  }

  public playSpell(spell: 'immobilize' | 'parry' | 'clones' | 'gourd' | 'dodge' | 'transform') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (spell === 'immobilize') {
      // Golden singing bowl chord (定身术)
      [528, 792, 1056].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        gain.gain.setValueAtTime(0.11 / (idx + 1), now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.56);
      });
    } else if (spell === 'parry') {
      // Rock Solid (铜头铁臂) bronze gong impact
      [220, 330, 660].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.45);
        gain.gain.setValueAtTime(0.16 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    } else if (spell === 'clones') {
      // A Pluck of Many (身外身法) ascending pentatonic harp
      [293.66, 329.63, 392.0, 440.0, 587.33].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.11, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.34);
      });
    } else if (spell === 'gourd') {
      // Healing Gourd (九转紫金葫) warm harmonic chime
      [392, 587.33, 784].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + 0.46);
      });
    } else if (spell === 'dodge') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.14);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (spell === 'transform') {
      [110, 165, 220, 440].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.6);
        gain.gain.setValueAtTime(0.09 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.64);
      });
    }
  }

  public playTelegraph() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playGong(type: 'chamber' | 'victory' | 'defeat') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs =
      type === 'victory'
        ? [196, 293.66, 392, 587.33]
        : type === 'defeat'
        ? [146.83, 130.81, 98]
        : [146.83, 220, 293.66];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.14 / (i + 1), now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 1.15);
    });
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  public startMusic() {
    if (this.muted || !this.musicEnabled || typeof window === 'undefined') return;
    if (this.musicTimer !== null) return;
    const notes = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 220.0, 196.0];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.musicEnabled || document.body.dataset.state !== 'playing') return;
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freq = notes[step % notes.length];
      step++;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.9);
    }, 950);
  }

  public stopMusic() {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /**
   * Section 35: "The lullaby. Suvarna's tune. Solo female voice or sarangi.
   * It appears in the Mani's hum, in Ila's humming, and in the final walk."
   */
  public playSuvarnaLullaby() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Gentle Bhairavi-inspired 5-note sarangi/vocal phrase
    const motif = [293.66, 311.13, 392.0, 349.23, 293.66];
    motif.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.34;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.5);
    });
  }

  /**
   * Section 35: "The drum. Dundubhi's war-drum is the first thing the player hears
   * and the last thing the Council used to call the families."
   */
  public playDundubhiWarDrum() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.24].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + offset;
      osc.frequency.setValueAtTime(idx === 0 ? 92 : 116, start);
      osc.frequency.exponentialRampToValueAtTime(42, start + 0.32);
      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  /**
   * Section 35: "Look moments. No music. Only room tone and the object."
   */
  public playLookRoomTone() {
    this.stopMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(146.83, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.95);
  }
}

export const soundEngine = new SoundEngine();
