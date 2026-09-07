/* Parameter model — the single source of truth shared by the GUI,
   the analytic decay-curve renderer and the AudioWorklet DSP. */

export type Curve = 'lin' | 'log';

export interface ParamSpec {
  id: ParamId;
  label: string;
  short: string;
  min: number;
  max: number;
  def: number;
  curve: Curve;
  unit: string;
  fmt: (v: number) => string;
  tip: string;
}

export type ParamId =
  | 'predelay' | 'size' | 'decay' | 'diffusion' | 'damp' | 'bassMul'
  | 'crossover' | 'modDepth' | 'modRate' | 'lowCut' | 'highCut'
  | 'width' | 'mix' | 'duck';

const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)}k` : `${Math.round(v)}`);

export const PARAMS: Record<ParamId, ParamSpec> = {
  predelay: {
    id: 'predelay', label: 'PRE-DELAY', short: 'PRE', min: 0, max: 250, def: 14, curve: 'lin', unit: 'ms',
    fmt: (v) => `${v.toFixed(1)} ms`,
    tip: 'Gap between dry transient and the onset of plate diffusion. 10–30 ms keeps vocals intelligible; sync to 1/16 for rhythmic depth.',
  },
  size: {
    id: 'size', label: 'SIZE', short: 'SIZE', min: 0.25, max: 2.5, def: 1.0, curve: 'log', unit: '%',
    fmt: (v) => `${Math.round(v * 100)} %`,
    tip: 'Scales every tank delay = modal density. <100% is a small, metallic physical plate. >100% pushes into chamber density (Valhalla-style).',
  },
  decay: {
    id: 'decay', label: 'DECAY', short: 'DEC', min: 0.2, max: 30, def: 2.4, curve: 'log', unit: 's',
    fmt: (v) => (v >= 10 ? `${v.toFixed(1)} s` : `${v.toFixed(2)} s`),
    tip: 'Mid-band RT60. Feedback coefficient is solved from loop time, so decay stays constant when you change SIZE.',
  },
  diffusion: {
    id: 'diffusion', label: 'DIFFUSION', short: 'DIFF', min: 0.2, max: 1, def: 1, curve: 'lin', unit: '%',
    fmt: (v) => `${Math.round(v * 100)} %`,
    tip: 'Lattice all-pass coefficients. High = instant echo density (true plate). Low = discrete, fluttery scatter — useful on sparse sources.',
  },
  damp: {
    id: 'damp', label: 'HF DAMP', short: 'DAMP', min: 700, max: 20000, def: 6200, curve: 'log', unit: 'Hz',
    fmt: (v) => `${hz(v)} Hz`,
    tip: 'In-tank one-pole LP, applied once per half-loop. A real EMT 140 decays <1 s at 10 kHz at ANY damper setting — that is why plates never hiss.',
  },
  bassMul: {
    id: 'bassMul', label: 'BASS MULT', short: 'BASS', min: 0.1, max: 4, def: 1.35, curve: 'log', unit: 'x',
    fmt: (v) => `${v.toFixed(2)} x`,
    tip: 'Low-band decay multiplier. Auto-clamped so decayG⁴·bass² < 1 — the #1 cause of low-mid buildup in plate plugins is an unclamped shelf.',
  },
  crossover: {
    id: 'crossover', label: 'CROSSOVER', short: 'XOVER', min: 60, max: 1600, def: 380, curve: 'log', unit: 'Hz',
    fmt: (v) => `${hz(v)} Hz`,
    tip: 'Corner between the bass-multiplied band and the mid band.',
  },
  modDepth: {
    id: 'modDepth', label: 'MOD DEPTH', short: 'MOD', min: 0, max: 1, def: 0.28, curve: 'lin', unit: '%',
    fmt: (v) => `${Math.round(v * 100)} %`,
    tip: 'Excursion of the two modulated tank all-passes. De-metallizes the tail. 0% = physically accurate plate; >60% will chorus sustained tones.',
  },
  modRate: {
    id: 'modRate', label: 'MOD RATE', short: 'RATE', min: 0.02, max: 4, def: 0.35, curve: 'log', unit: 'Hz',
    fmt: (v) => `${v.toFixed(2)} Hz`,
    tip: 'Hybrid LFO: 70% sine + 30% band-limited random walk. 0.2–0.5 Hz kills ringing without audible pitch movement.',
  },
  lowCut: {
    id: 'lowCut', label: 'LOW CUT', short: 'LC', min: 20, max: 1000, def: 90, curve: 'log', unit: 'Hz',
    fmt: (v) => `${hz(v)} Hz`,
    tip: '12 dB/oct on the wet bus only. Plates were always high-passed on the return desk — this is that move, built in.',
  },
  highCut: {
    id: 'highCut', label: 'HIGH CUT', short: 'HC', min: 1200, max: 20000, def: 12000, curve: 'log', unit: 'Hz',
    fmt: (v) => `${hz(v)} Hz`,
    tip: '6 dB/oct on the wet bus. Tames sibilance ring-out before it becomes hiss.',
  },
  width: {
    id: 'width', label: 'WIDTH', short: 'WID', min: 0, max: 2, def: 1, curve: 'lin', unit: '%',
    fmt: (v) => `${Math.round(v * 100)} %`,
    tip: 'M/S scaling of the wet bus. 0% = mono-compatible plate return; 140% for wide synth beds.',
  },
  mix: {
    id: 'mix', label: 'MIX', short: 'MIX', min: 0, max: 1, def: 0.32, curve: 'lin', unit: '%',
    fmt: (v) => `${Math.round(v * 100)} %`,
    tip: 'Equal-power dry/wet. On an FL Studio send track set this to 100% and drive with the send knob.',
  },
  duck: {
    id: 'duck', label: 'DUCK', short: 'DUCK', min: 0, max: 1, def: 0, curve: 'lin', unit: '%',
    fmt: (v) => (v === 0 ? 'OFF' : `${Math.round(v * 100)} %`),
    tip: 'Envelope-follower ducking of the wet bus from the dry input. 4 ms attack / 180 ms release. Keeps long plates off the lead vocal.',
  },
};

export const PARAM_ORDER: ParamId[] = [
  'predelay', 'size', 'decay', 'diffusion', 'damp', 'bassMul',
  'crossover', 'modDepth', 'modRate', 'lowCut', 'highCut', 'width', 'duck', 'mix',
];

export type ParamValues = Record<ParamId, number>;

export const DEFAULTS: ParamValues = Object.fromEntries(
  (Object.keys(PARAMS) as ParamId[]).map((k) => [k, PARAMS[k].def]),
) as ParamValues;

/* ---------- normalised <-> real mapping ---------- */
export function toNorm(spec: ParamSpec, v: number): number {
  const { min, max, curve } = spec;
  const c = Math.min(max, Math.max(min, v));
  if (curve === 'log') return Math.log(c / min) / Math.log(max / min);
  return (c - min) / (max - min);
}

export function fromNorm(spec: ParamSpec, n: number): number {
  const { min, max, curve } = spec;
  const c = Math.min(1, Math.max(0, n));
  if (curve === 'log') return min * Math.pow(max / min, c);
  return min + (max - min) * c;
}

/* ---------- alloy modes (must mirror MODES[] in the worklet) ---------- */
export interface Mode {
  name: string;
  hfMul: number;
  density: number;
  lowMid: number;
  monoIn: number;
  blurb: string;
}

export const MODES: Mode[] = [
  { name: 'CHROME', hfMul: 1.0, density: 0, lowMid: 0, monoIn: 0, blurb: 'Neutral cold-rolled steel. The reference 140. Soft attack, slightly bright, zero character tax.' },
  { name: 'COBALT', hfMul: 0.62, density: 0, lowMid: 0.34, monoIn: 0, blurb: 'Dark, deeper attack, with the 250 Hz low-mid resonance measured off a specific well-worn EMT 140.' },
  { name: 'ALUMINIUM', hfMul: 1.25, density: 1, lowMid: 0, monoIn: 0, blurb: 'Extra lattice stage: far higher modal density. Above 120% SIZE it behaves like a plaster chamber.' },
  { name: 'UNOBTANIUM', hfMul: 1.9, density: 1, lowMid: 0, monoIn: 0, blurb: 'Stainless / Ecoplate brightness and long HF tail — with the metallic ring engineered out.' },
  { name: 'OSMIUM', hfMul: 0.5, density: 0, lowMid: 0.18, monoIn: 1, blurb: 'Mono-in, stereo-out. Dark and booming; the densest tail here. Retro send-bus behaviour.' },
];

/* =====================================================================
   Analytic decay model — the exact transfer of the tank feedback path.
   Per figure-of-eight loop the signal passes: 4 × decayG,
   2 × damping one-pole, 2 × bass shelf.
   RT60(f) = 3·T_loop / -log10( G(f) )
   ===================================================================== */
const LOOP_SAMPLES = 21589; // 672+4453+1800+3720+908+4217+2656+3163
const BASE_SR = 29761;

export function loopTime(size: number): number {
  return (LOOP_SAMPLES * size) / BASE_SR;
}

export function decayCoeff(p: ParamValues): number {
  const T = loopTime(p.size);
  return Math.min(0.99995, Math.pow(10, (-0.75 * T) / Math.max(0.05, p.decay)));
}

function onePoleMag(f: number, fc: number, sr: number): number {
  const c = Math.exp((-2 * Math.PI * Math.min(fc, sr * 0.48)) / sr);
  const w = (2 * Math.PI * f) / sr;
  return (1 - c) / Math.sqrt(1 - 2 * c * Math.cos(w) + c * c);
}

/** RT60 in seconds at frequency f — mirrors the worklet's feedback path. */
export function rt60At(f: number, p: ParamValues, mode: Mode, sr = 48000): number {
  const T = loopTime(p.size);
  const dG = decayCoeff(p);
  const bassLimit = 0.9994 / (dG * dG);
  const bass = Math.min(p.bassMul, bassLimit);

  const hd = onePoleMag(f, p.damp * mode.hfMul, sr);
  const hlp = onePoleMag(f, p.crossover, sr);
  const hb = Math.abs(1 + (bass - 1) * hlp);

  let G = Math.pow(dG, 4) * hd * hd * hb * hb;
  G = Math.min(0.9999999, Math.max(1e-12, G));
  return (3 * T) / -Math.log10(G);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Inverse of rt60At() w.r.t. the DECAY parameter: what mid-band RT60 puts
 *  the curve at `target` seconds at frequency `f`? Gives 1:1 handle tracking. */
export function solveDecayForRt60(f: number, target: number, p: ParamValues, mode: Mode, sr = 48000): number {
  const T = loopTime(p.size);
  const dG0 = decayCoeff(p);
  const bass = Math.min(p.bassMul, 0.9994 / (dG0 * dG0));
  const hd = onePoleMag(f, p.damp * mode.hfMul, sr);
  const hlp = onePoleMag(f, p.crossover, sr);
  const S = Math.abs(1 + (bass - 1) * hlp);
  const rhs = (3 * T) / Math.max(0.05, target) + 2 * Math.log10(Math.max(1e-6, hd * S));
  const logdG = -rhs / 4;
  if (logdG >= -1e-9) return 30;
  return clamp((-0.75 * T) / logdG, 0.2, 30);
}

/** Inverse of rt60At() w.r.t. BASS MULT, evaluated at the handle frequency. */
export function solveBassForRt60(f: number, target: number, p: ParamValues, mode: Mode, sr = 48000): number {
  const T = loopTime(p.size);
  const dG = decayCoeff(p);
  const hd = onePoleMag(f, p.damp * mode.hfMul, sr);
  const K = -Math.log10(Math.max(1e-12, Math.pow(dG, 4) * hd * hd));
  const S = Math.pow(10, (K - (3 * T) / Math.max(0.05, target)) / 2);
  const h = onePoleMag(f, p.crossover, sr);
  return clamp(1 + (S - 1) / Math.max(0.05, h), 0.1, 4);
}

/** Wet-bus magnitude response of the output low/high cut, in dB. */
export function outputTiltDb(f: number, p: ParamValues, sr = 48000): number {
  const lc = onePoleMag(f, p.lowCut, sr);
  const hp = Math.sqrt(Math.max(0, 1 - lc * lc));
  const hpMag = Math.pow(hp, 2); // 12 dB/oct
  const hcMag = onePoleMag(f, p.highCut, sr);
  return 20 * Math.log10(Math.max(1e-4, hpMag * hcMag));
}
