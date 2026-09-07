import { DEFAULTS, type ParamValues } from '../audio/params';

export interface Preset {
  name: string;
  cat: 'VOCAL' | 'DRUMS' | 'SYNTH' | 'GLUE' | 'FX';
  mode: number;
  note: string;
  v: Partial<ParamValues>;
}

const P = (name: string, cat: Preset['cat'], mode: number, note: string, v: Partial<ParamValues>): Preset =>
  ({ name, cat, mode, note, v });

export const PRESETS: Preset[] = [
  P('140 Vocal Plate', 'VOCAL', 0, 'The reference. 18 ms pre-delay keeps consonants forward; 6.5 k damping stops sibilance ringing out.',
    { predelay: 18, size: 1, decay: 2.1, diffusion: 1, damp: 6500, bassMul: 1.2, crossover: 340, modDepth: 0.25, modRate: 0.32, lowCut: 120, highCut: 13000, width: 1, mix: 0.3, duck: 0 }),
  P('Cobalt Ballad', 'VOCAL', 1, 'Dark EMT with the 250 Hz resonance. Long, deep, sits behind the singer without EQ surgery.',
    { predelay: 30, size: 1.15, decay: 3.4, diffusion: 1, damp: 5200, bassMul: 1.15, crossover: 300, modDepth: 0.3, modRate: 0.28, lowCut: 140, highCut: 9500, width: 1.1, mix: 0.28 }),
  P('Ducked Lead Vox', 'VOCAL', 0, '4.5 s tail that only exists between phrases. Ducker at 55% — the modern pop plate move.',
    { predelay: 22, size: 1.2, decay: 4.5, damp: 5600, bassMul: 1.0, crossover: 320, modDepth: 0.3, lowCut: 160, highCut: 11000, mix: 0.4, duck: 0.55 }),
  P('Snare Slap 1/16', 'DRUMS', 0, '125 ms pre-delay = a 1/16 at 120 BPM. Tail is short so the groove stays tight.',
    { predelay: 125, size: 0.85, decay: 1.25, diffusion: 1, damp: 7800, bassMul: 0.75, crossover: 420, modDepth: 0.18, lowCut: 220, highCut: 14000, width: 1.15, mix: 0.34 }),
  P('Trap Steel Snare', 'DRUMS', 3, 'Bright stainless tail, aggressive low cut, hard duck so the 808 keeps the low end.',
    { predelay: 60, size: 0.7, decay: 1.8, damp: 11000, bassMul: 0.45, crossover: 500, modDepth: 0.35, lowCut: 320, highCut: 16000, width: 1.3, mix: 0.36, duck: 0.4 }),
  P('Drum Bus Glue', 'GLUE', 0, '0.9 s, 16% wet, 200 Hz low cut. You should only hear it when you bypass it.',
    { predelay: 8, size: 0.8, decay: 0.9, diffusion: 1, damp: 6800, bassMul: 0.6, crossover: 450, modDepth: 0.12, lowCut: 200, highCut: 12000, width: 0.85, mix: 0.16 }),
  P('Parallel Mix Sheen', 'GLUE', 2, 'High modal density at 12% wet across a full mix. Adds depth, not reverb.',
    { predelay: 6, size: 1.05, decay: 1.4, damp: 9000, bassMul: 0.5, crossover: 380, modDepth: 0.2, lowCut: 260, highCut: 15000, width: 1.05, mix: 0.12 }),
  P('Chamber XL', 'SYNTH', 2, 'SIZE 200% pushes the tank past physical-plate density into plaster-chamber territory.',
    { predelay: 40, size: 2.0, decay: 6.5, diffusion: 1, damp: 7000, bassMul: 1.4, crossover: 300, modDepth: 0.4, modRate: 0.22, lowCut: 90, highCut: 12500, width: 1.25, mix: 0.42 }),
  P('Unobtanium Bloom', 'SYNTH', 3, 'Long HF decay + 55% modulation. Made for pads and plucks; would chorus a solo cello.',
    { predelay: 55, size: 1.6, decay: 9, damp: 13000, bassMul: 1.1, crossover: 260, modDepth: 0.55, modRate: 0.45, lowCut: 100, highCut: 18000, width: 1.4, mix: 0.5 }),
  P('Osmium Retro Send', 'VOCAL', 4, 'Mono-in, stereo-out. Dark and booming exactly like a single-driver plate on a 70s desk.',
    { predelay: 24, size: 1.1, decay: 2.6, damp: 4200, bassMul: 1.6, crossover: 260, modDepth: 0.15, lowCut: 150, highCut: 7500, width: 1.2, mix: 0.34 }),
  P('Lo-Fi Tape Plate', 'FX', 1, 'Small, dark, heavily modulated. 3.5 k high cut sells the tape-return illusion.',
    { predelay: 16, size: 0.55, decay: 1.6, diffusion: 0.8, damp: 3000, bassMul: 1.8, crossover: 220, modDepth: 0.65, modRate: 0.8, lowCut: 180, highCut: 3500, width: 0.7, mix: 0.38 }),
  P('Scatter / Low Diffusion', 'FX', 0, 'Diffusion pulled to 35%: discrete lattice echoes instead of a wash. Great on sparse percussion.',
    { predelay: 45, size: 0.95, decay: 3, diffusion: 0.35, damp: 8000, bassMul: 0.9, crossover: 400, modDepth: 0.25, lowCut: 150, highCut: 14000, width: 1.35, mix: 0.4 }),
  P('Infinite Sustain Pad', 'FX', 2, 'Set 28 s and hit FREEZE for an unending bed. Input is muted in freeze, so the tank never overloads.',
    { predelay: 0, size: 1.8, decay: 28, damp: 8500, bassMul: 1.0, crossover: 300, modDepth: 0.45, modRate: 0.18, lowCut: 110, highCut: 14000, width: 1.5, mix: 0.6 }),
  P('Guitar Slapback Plate', 'FX', 0, '95 ms pre-delay, 0.6 s tail, narrow. Rockabilly depth without smearing the pick attack.',
    { predelay: 95, size: 0.6, decay: 0.6, damp: 7500, bassMul: 0.8, crossover: 400, modDepth: 0.1, lowCut: 200, highCut: 11000, width: 0.6, mix: 0.26 }),
];

export function presetValues(p: Preset): ParamValues {
  return { ...DEFAULTS, ...p.v };
}
