import type { MusicalKey } from '../types/music';

export const CHROMATIC_KEYS: MusicalKey[] = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
];

const KEY_FREQUENCIES: Record<MusicalKey, number> = {
  'C': 261.63,
  'C#': 277.18,
  'Db': 277.18,
  'D': 293.66,
  'Eb': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'Ab': 415.30,
  'A': 440.00,
  'Bb': 466.16,
  'B': 493.88,
};

export function keyFrequency(key: MusicalKey): number {
  return KEY_FREQUENCIES[key] || 261.63;
}

const ENHARMONIC_MAP: Record<string, MusicalKey> = {
  'C': 'C',
  'C#': 'C#', 'Db': 'C#',
  'D': 'D',
  'D#': 'Eb', 'Eb': 'Eb',
  'E': 'E',
  'F': 'F',
  'F#': 'F#', 'Gb': 'F#',
  'G': 'G',
  'G#': 'Ab', 'Ab': 'Ab',
  'A': 'A',
  'A#': 'Bb', 'Bb': 'Bb',
  'B': 'B',
};

export function transposeNote(note: string, semitones: number): string {
  const normalized = ENHARMONIC_MAP[note];
  if (!normalized) return note;
  const idx = CHROMATIC_KEYS.indexOf(normalized);
  const nextIdx = (idx + semitones + 120) % 12;
  return CHROMATIC_KEYS[nextIdx];
}

export function transposeChordToken(token: string, semitones: number): string {
  if (semitones === 0) return token;
  return token.replace(/\b([A-G][#b]?)((?:maj|min|dim|aug|sus|add|m|[0-9])*)(\/[A-G][#b]?)?(?![A-Za-z])/g, (_match, root, suffix = '', slash = '') => {
    const newRoot = transposeNote(root, semitones);
    let newSlash = '';
    if (slash) {
      const slashNote = slash.slice(1);
      newSlash = '/' + transposeNote(slashNote, semitones);
    }
    return `${newRoot}${suffix}${newSlash}`;
  });
}

export function transposeLyricsWithBrackets(lyrics: string, semitones: number): string {
  if (semitones === 0) return lyrics;
  return lyrics.replace(/\[([^\]]+)\]/g, (fullMatch, inner: string) => {
    // Only transpose if it looks like a chord (starts with A-G and not a section header like Intro/Verse/Chorus/Bridge)
    if (/^(Intro|Verse|Chorus|Bridge|Section|Spontaneous|Instrumental)/i.test(inner.trim())) {
      return fullMatch;
    }
    return `[${transposeChordToken(inner, semitones)}]`;
  });
}

class GospelAudioSynth {
  private ctx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;
  private volume = 0.35;

  public start(key: MusicalKey, bpm: number) {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.isPlaying = true;
      const rootFreq = KEY_FREQUENCIES[key] || 349.23;

      // Gospel I - vi - IV - V progression intervals in semitones from root
      const progression = [
        [0, 4, 7, 11],     // Imaj7
        [-3, 0, 4, 7],     // vim7
        [-7, -3, 0, 4],    // IVmaj7
        [-5, 0, 2, 7],     // V9sus4
      ];

      let step = 0;
      const beatMs = Math.max(450, Math.round((60 / Math.max(bpm, 60)) * 1000 * 2));

      const playChordStep = () => {
        if (!this.isPlaying || !this.ctx) return;
        const chordSemitones = progression[step % progression.length];
        this.triggerWarmPadChord(rootFreq, chordSemitones, beatMs / 1000);
        step++;
      };

      playChordStep();
      this.intervalId = window.setInterval(playChordStep, beatMs);
    } catch {
      // Fallback if Web Audio API is blocked
    }
  }

  private triggerWarmPadChord(rootFreq: number, semitones: number[], durationSec: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    semitones.forEach((semi, idx) => {
      if (!this.ctx) return;
      const freq = rootFreq * Math.pow(2, semi / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? freq * 0.5 : freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      const noteGain = (this.volume * 0.16) / semitones.length;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, noteGain), now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    });
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const soundEngine = new GospelAudioSynth();
