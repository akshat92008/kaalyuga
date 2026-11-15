import type { AstraElement } from './rules';

export type GameSfxEvent =
  | 'slash_light'
  | 'slash_heavy'
  | 'slash_cast'
  | 'hit'
  | 'crit'
  | 'parry'
  | 'dash'
  | 'boss_roar'
  | 'boss_slam'
  | 'pillar_break'
  | 'hurt'
  | 'victory'
  | 'defeat';

export class ChamberSoundEngine {
  private ctx: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;
  private hitAudio: HTMLAudioElement | null = null;
  private drumAudio: HTMLAudioElement | null = null;
  private muted = false;
  private paused = false;
  private startedBgm = false;

  public init() {
    if (typeof window === 'undefined') return;
    if (!this.bgm) {
      try {
        this.bgm = new Audio('/kaalyuga/audio/bgm.mp3');
        this.bgm.loop = true;
        this.bgm.volume = 0.26;

        this.hitAudio = new Audio('/kaalyuga/audio/hit.wav');
        this.hitAudio.volume = 0.36;

        this.drumAudio = new Audio('/kaalyuga/audio/drum.wav');
        this.drumAudio.volume = 0.42;
      } catch {
        // Ignore headless audio restrictions
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        try {
          this.ctx = new AC();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndStartBgm() {
    this.init();
    this.ensureContext();
    if (this.bgm && !this.startedBgm && !this.muted && !this.paused) {
      this.startedBgm = true;
      this.bgm.play().catch(() => {
        this.startedBgm = false;
      });
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.bgm) {
      this.bgm.muted = muted;
      if (!muted && !this.paused && !this.startedBgm) {
        this.unlockAndStartBgm();
      }
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    if (this.bgm) {
      if (paused) {
        this.bgm.pause();
      } else if (!this.muted) {
        this.bgm.play().catch(() => {});
      }
    }
  }

  public playEvent(evt: GameSfxEvent, element: AstraElement) {
    if (this.muted || this.paused) return;
    const ctx = this.ensureContext();

    if ((evt === 'hit' || evt === 'crit') && this.hitAudio) {
      try {
        const clone = this.hitAudio.cloneNode() as HTMLAudioElement;
        clone.volume = evt === 'crit' ? 0.42 : 0.26;
        clone.playbackRate = 0.94 + Math.random() * 0.14;
        clone.play().catch(() => {});
      } catch {}
    }

    if ((evt === 'boss_slam' || evt === 'boss_roar') && this.drumAudio) {
      try {
        const clone = this.drumAudio.cloneNode() as HTMLAudioElement;
        clone.volume = 0.42;
        clone.play().catch(() => {});
      } catch {}
    }

    if (!ctx) return;
    const now = ctx.currentTime;

    if (evt === 'slash_light' || evt === 'slash_heavy' || evt === 'slash_cast' || evt === 'dash') {
      const dur = evt === 'slash_cast' ? 0.34 : evt === 'slash_heavy' ? 0.24 : 0.15;
      const baseFreq =
        element === 'vajra' ? 980 : element === 'vayu' ? 680 : 520;
      this.synthWhoosh(ctx, now, dur, baseFreq * (0.94 + Math.random() * 0.12));
    }

    if (evt === 'parry') {
      // Crisp Demon Slayer metallic sword deflect *SHING!*
      this.synthTone(ctx, now, 1860, 2240, 0.28, 'triangle', 0.16);
      this.synthTone(ctx, now, 2790, 2680, 0.24, 'sine', 0.12);
    } else if (evt === 'crit' || evt === 'pillar_break') {
      this.synthTone(ctx, now, 130, 42, 0.24, 'sawtooth', 0.18);
      this.synthTone(ctx, now, 880, 440, 0.14, 'triangle', 0.09);
    } else if (evt === 'hurt') {
      this.synthTone(ctx, now, 160, 58, 0.22, 'sawtooth', 0.18);
    } else if (evt === 'victory') {
      this.synthTone(ctx, now, 392, 392, 0.25, 'triangle', 0.12);
      this.synthTone(ctx, now + 0.16, 493.88, 493.88, 0.28, 'triangle', 0.12);
      this.synthTone(ctx, now + 0.34, 587.33, 587.33, 0.48, 'triangle', 0.14);
    }
  }

  private synthWhoosh(ctx: AudioContext, start: number, dur: number, freq: number) {
    try {
      const sampleRate = ctx.sampleRate;
      const len = Math.floor(sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, start);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.35, start + dur);
      filter.Q.value = 2.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(start);
    } catch {}
  }

  private synthTone(
    ctx: AudioContext,
    start: number,
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number
  ) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), start + dur);
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    } catch {}
  }

  public dispose() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.src = '';
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
