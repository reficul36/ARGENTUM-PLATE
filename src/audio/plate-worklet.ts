/* The plate DSP core, kept as source text so it can be handed to
   AudioWorklet.addModule() through a Blob URL. This keeps the whole
   plugin self-contained in a single document — no side-car file. */

export const PLATE_WORKLET_SRC = String.raw`
/* =====================================================================
   ARGENTUM PLATE — plate reverberation core
   Topology: Dattorro (JAES 1997) "figure-of-eight" plate tank,
             in the style of Griesinger / EMT 140.
   ===================================================================== */

const BASE_SR = 29761;

class DelayLine {
  constructor(maxLen) {
    let n = 1;
    while (n < maxLen) n <<= 1;
    this.buf = new Float32Array(n);
    this.mask = n - 1;
    this.w = 0;
  }
  clear() { this.buf.fill(0); }
  write(v) { this.buf[this.w] = v; this.w = (this.w + 1) & this.mask; }
  read(d) {
    const p = this.w - d;
    const i = Math.floor(p);
    const f = p - i;
    const a = this.buf[i & this.mask];
    const b = this.buf[(i + 1) & this.mask];
    return a + (b - a) * f;
  }
}

/* Two-multiply lattice all-pass: H(z) = (z^-M - g)/(1 - g z^-M) */
function allpass(line, d, g, x) {
  const dl = line.read(d);
  const v = x + g * dl;
  line.write(v);
  return dl - g * v;
}

const MODES = [
  { name: 'CHROME',     density: 0, hfMul: 1.0,  lowMid: 0.0,  monoIn: 0, diffTrim: 1.0 },
  { name: 'COBALT',     density: 0, hfMul: 0.62, lowMid: 0.34, monoIn: 0, diffTrim: 1.02 },
  { name: 'ALUMINIUM',  density: 1, hfMul: 1.25, lowMid: 0.0,  monoIn: 0, diffTrim: 0.97 },
  { name: 'UNOBTANIUM', density: 1, hfMul: 1.9,  lowMid: 0.0,  monoIn: 0, diffTrim: 0.94 },
  { name: 'OSMIUM',     density: 0, hfMul: 0.5,  lowMid: 0.18, monoIn: 1, diffTrim: 1.0 }
];

class PlateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'predelay',   defaultValue: 12,    minValue: 0,    maxValue: 250,   automationRate: 'k-rate' },
      { name: 'size',       defaultValue: 1.0,   minValue: 0.25, maxValue: 2.5,   automationRate: 'k-rate' },
      { name: 'decay',      defaultValue: 2.4,   minValue: 0.2,  maxValue: 30,    automationRate: 'k-rate' },
      { name: 'diffusion',  defaultValue: 1.0,   minValue: 0.2,  maxValue: 1.0,   automationRate: 'k-rate' },
      { name: 'damp',       defaultValue: 6200,  minValue: 700,  maxValue: 20000, automationRate: 'k-rate' },
      { name: 'bassMul',    defaultValue: 1.35,  minValue: 0.1,  maxValue: 4,     automationRate: 'k-rate' },
      { name: 'crossover',  defaultValue: 380,   minValue: 60,   maxValue: 1600,  automationRate: 'k-rate' },
      { name: 'modDepth',   defaultValue: 0.28,  minValue: 0,    maxValue: 1,     automationRate: 'k-rate' },
      { name: 'modRate',    defaultValue: 0.35,  minValue: 0.02, maxValue: 4,     automationRate: 'k-rate' },
      { name: 'lowCut',     defaultValue: 90,    minValue: 20,   maxValue: 1000,  automationRate: 'k-rate' },
      { name: 'highCut',    defaultValue: 12000, minValue: 1200, maxValue: 20000, automationRate: 'k-rate' },
      { name: 'width',      defaultValue: 1.0,   minValue: 0,    maxValue: 2,     automationRate: 'k-rate' },
      { name: 'mix',        defaultValue: 0.32,  minValue: 0,    maxValue: 1,     automationRate: 'k-rate' },
      { name: 'duck',       defaultValue: 0.0,   minValue: 0,    maxValue: 1,     automationRate: 'k-rate' },
      { name: 'freeze',     defaultValue: 0,     minValue: 0,    maxValue: 1,     automationRate: 'k-rate' },
      { name: 'trueStereo', defaultValue: 1,     minValue: 0,    maxValue: 1,     automationRate: 'k-rate' },
      { name: 'bypass',     defaultValue: 0,     minValue: 0,    maxValue: 1,     automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    const sr = sampleRate;
    this.srScale = sr / BASE_SR;
    const S = this.srScale;
    const MAXSIZE = 2.6;
    const mk = (n) => new DelayLine(Math.ceil(n * S * MAXSIZE) + 8);

    this.N = {
      id1: 142, id2: 107, id3: 379, id4: 277,
      apm1: 672, delA: 4453, apB: 1800, delB: 3720,
      apm2: 908, delC: 4217, apD: 2656, delD: 3163,
      xL: 1074, xR: 1234
    };
    const N = this.N;

    this.idL = [mk(N.id1), mk(N.id2), mk(N.id3), mk(N.id4)];
    this.idR = [mk(N.id1), mk(N.id2), mk(N.id3), mk(N.id4)];

    this.apm1 = mk(N.apm1); this.delA = mk(N.delA);
    this.apB = mk(N.apB);   this.delB = mk(N.delB);
    this.apm2 = mk(N.apm2); this.delC = mk(N.delC);
    this.apD = mk(N.apD);   this.delD = mk(N.delD);
    this.xLn = mk(N.xL);    this.xRn = mk(N.xR);

    this.pdL = new DelayLine(Math.ceil(sr * 0.26) + 8);
    this.pdR = new DelayLine(Math.ceil(sr * 0.26) + 8);

    this.bwL = 0; this.bwR = 0;
    this.dampL = 0; this.dampR = 0;
    this.bassL = 0; this.bassR = 0;
    this.lmL1 = 0; this.lmL2 = 0;
    this.lmR1 = 0; this.lmR2 = 0;
    this.hcL = 0; this.hcR = 0;
    this.lc1L = 0; this.lc1R = 0; this.lc2L = 0; this.lc2R = 0;
    this.env = 0;
    this.duckGain = 1;

    this.lfoPhase = 0;
    this.rw1 = 0; this.rw2 = 0;

    this.sm = { size: 1, decayG: 0.5, dampC: 0, bass: 1, cross: 0, exc: 0, mix: 0.3, width: 1, lc: 0, hc: 0 };
    this.smInit = false;

    this.mode = 0;
    this.denorm = 1e-20;
    this.meterCount = 0;
    this.wetAcc = 0; this.inAcc = 0; this.mCount = 0;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'mode') this.mode = d.value | 0;
      if (d.type === 'flush') this.flush();
    };
  }

  flush() {
    const all = [].concat(this.idL, this.idR, [
      this.apm1, this.delA, this.apB, this.delB,
      this.apm2, this.delC, this.apD, this.delD,
      this.xLn, this.xRn, this.pdL, this.pdR
    ]);
    for (let i = 0; i < all.length; i++) all[i].clear();
    this.bwL = this.bwR = this.dampL = this.dampR = this.bassL = this.bassR = 0;
    this.hcL = this.hcR = this.lc1L = this.lc1R = this.lc2L = this.lc2R = 0;
    this.lmL1 = this.lmL2 = this.lmR1 = this.lmR2 = 0;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0];
    const out = outputs[0];
    const wetOut = outputs[1];
    const nFrames = out[0].length;
    const sr = sampleRate;
    const S = this.srScale;
    const N = this.N;
    const M = MODES[this.mode] || MODES[0];

    const inL = inp && inp[0] ? inp[0] : null;
    const inR = inp && inp[1] ? inp[1] : inL;

    const g = (n) => params[n][0];
    const bypass = g('bypass') > 0.5;

    const size = g('size');
    const k = S * size;
    const loopT = (21589 * k) / sr;
    const freeze = g('freeze') > 0.5;
    const rt60 = g('decay');
    let decayG = freeze ? 0.99995 : Math.pow(10, (-0.75 * loopT) / Math.max(0.05, rt60));
    decayG = Math.min(0.99995, Math.max(0, decayG));

    const diff = g('diffusion') * M.diffTrim;
    const idg1 = 0.75 * diff, idg2 = 0.625 * diff;
    const dd1 = Math.min(0.78, 0.7 * diff);
    const dd2 = Math.min(0.5, Math.max(0.25, 0.5 * diff));

    const dampHz = Math.min(sr * 0.48, g('damp') * M.hfMul);
    const dampC = freeze ? 0 : Math.exp((-2 * Math.PI * dampHz) / sr);

    const bassLimit = 0.9994 / Math.max(1e-6, decayG * decayG);
    const bass = freeze ? 1 : Math.min(g('bassMul'), bassLimit);
    const crossC = Math.exp((-2 * Math.PI * g('crossover')) / sr);

    const exc = 16 * S * g('modDepth') * Math.min(1, size * 1.2);
    const phInc = (2 * Math.PI * g('modRate')) / sr;

    const lcG = Math.tan((Math.PI * Math.min(g('lowCut'), sr * 0.45)) / sr);
    const hcG = Math.tan((Math.PI * Math.min(g('highCut'), sr * 0.45)) / sr);
    const mix = g('mix');
    const width = g('width');
    const duckAmt = g('duck');
    const trueStereo = g('trueStereo') > 0.5 && !M.monoIn;

    const sm = this.sm;
    if (!this.smInit) {
      sm.size = size; sm.decayG = decayG; sm.dampC = dampC; sm.bass = bass;
      sm.cross = crossC; sm.exc = exc; sm.mix = mix; sm.width = width;
      sm.lc = lcG; sm.hc = hcG;
      this.smInit = true;
    }
    const a = 1 - Math.exp(-1 / ((0.02 * sr) / nFrames));
    sm.size += (size - sm.size) * a * 0.6;
    sm.decayG += (decayG - sm.decayG) * a;
    sm.dampC += (dampC - sm.dampC) * a;
    sm.bass += (bass - sm.bass) * a;
    sm.cross += (crossC - sm.cross) * a;
    sm.exc += (exc - sm.exc) * a;
    sm.mix += (mix - sm.mix) * a;
    sm.width += (width - sm.width) * a;
    sm.lc += (lcG - sm.lc) * a;
    sm.hc += (hcG - sm.hc) * a;

    const ks = S * sm.size;
    const dG = sm.decayG;
    const dC = sm.dampC;
    const bM = sm.bass;
    const xC = sm.cross;
    const EX = sm.exc;

    const L_id1 = N.id1 * S, L_id2 = N.id2 * S, L_id3 = N.id3 * S, L_id4 = N.id4 * S;
    const L_apm1 = N.apm1 * ks, L_delA = N.delA * ks, L_apB = N.apB * ks, L_delB = N.delB * ks;
    const L_apm2 = N.apm2 * ks, L_delC = N.delC * ks, L_apD = N.apD * ks, L_delD = N.delD * ks;
    const L_xL = N.xL * ks, L_xR = N.xR * ks;

    const T = (n) => n * ks;
    const t1 = T(266), t2 = T(2974), t3 = T(1913), t4 = T(1996), t5 = T(1990), t6 = T(187), t7 = T(1066);
    const u1 = T(353), u2 = T(3627), u3 = T(1228), u4 = T(2673), u5 = T(2111), u6 = T(335), u7 = T(121);

    const pdSamples = Math.max(1, (g('predelay') / 1000) * sr);
    const bwC = 0.9995;
    const inputGain = freeze ? 0 : 1;

    const atkC = Math.exp(-1 / (0.004 * sr));
    const relC = Math.exp(-1 / (0.18 * sr));

    const lmG = Math.tan((Math.PI * 250) / sr);
    const lmR = 1 / (2 * 1.1);
    const lmD = 1 / (1 + 2 * lmR * lmG + lmG * lmG);

    const oL = out[0], oR = out[1] || out[0];
    const wL = wetOut ? wetOut[0] : null;
    const wR = wetOut ? (wetOut[1] || wetOut[0]) : null;

    for (let i = 0; i < nFrames; i++) {
      const dryL = inL ? inL[i] : 0;
      const dryR = inR ? inR[i] : dryL;

      if (bypass) {
        oL[i] = dryL; oR[i] = dryR;
        if (wL) { wL[i] = 0; wR[i] = 0; }
        continue;
      }

      const rect = Math.max(Math.abs(dryL), Math.abs(dryR));
      this.env = rect > this.env ? atkC * this.env + (1 - atkC) * rect
                                 : relC * this.env + (1 - relC) * rect;
      const dgt = 1 / (1 + duckAmt * 8 * this.env);
      this.duckGain += (dgt - this.duckGain) * 0.01;

      this.pdL.write(dryL);
      this.pdR.write(dryR);
      let pl = this.pdL.read(pdSamples);
      let pr = this.pdR.read(pdSamples);
      if (M.monoIn || !trueStereo) {
        const mm = 0.5 * (pl + pr);
        pl = mm; pr = mm;
      }
      pl *= inputGain; pr *= inputGain;

      this.bwL = (1 - bwC) * this.bwL + bwC * pl;
      this.bwR = (1 - bwC) * this.bwR + bwC * pr;

      let aL = allpass(this.idL[0], L_id1, idg1, this.bwL);
      aL = allpass(this.idL[1], L_id2, idg1, aL);
      aL = allpass(this.idL[2], L_id3, idg2, aL);
      aL = allpass(this.idL[3], L_id4, idg2, aL);

      let aR;
      if (trueStereo) {
        aR = allpass(this.idR[0], L_id1, idg1, this.bwR);
        aR = allpass(this.idR[1], L_id2, idg1, aR);
        aR = allpass(this.idR[2], L_id3, idg2, aR);
        aR = allpass(this.idR[3], L_id4, idg2, aR);
      } else {
        aR = aL;
      }

      this.lfoPhase += phInc;
      if (this.lfoPhase > 2 * Math.PI) this.lfoPhase -= 2 * Math.PI;
      const s1 = Math.sin(this.lfoPhase);
      const s2 = Math.sin(this.lfoPhase + 2.399);
      this.rw1 += 0.00004 * (Math.random() * 2 - 1 - this.rw1 * 0.12);
      this.rw2 += 0.00004 * (Math.random() * 2 - 1 - this.rw2 * 0.12);
      const m1 = 0.7 * s1 + 0.3 * Math.max(-1, Math.min(1, this.rw1 * 90));
      const m2 = 0.7 * s2 + 0.3 * Math.max(-1, Math.min(1, this.rw2 * 90));

      const tailL = this.delB.read(L_delB);
      const tailR = this.delD.read(L_delD);
      const dn = (this.denorm = -this.denorm);

      let x = aL + dG * tailR + dn;
      x = allpass(this.apm1, Math.max(2, L_apm1 + EX * m1), dd1, x);
      this.delA.write(x);
      let v = this.delA.read(L_delA);
      this.dampL = (1 - dC) * v + dC * this.dampL;
      v = this.dampL;
      this.bassL = (1 - xC) * v + xC * this.bassL;
      v = v - this.bassL + bM * this.bassL;
      if (M.lowMid > 0) {
        const hp = (v - (2 * lmR + lmG) * this.lmL1 - this.lmL2) * lmD;
        const bp = lmG * hp + this.lmL1;
        this.lmL1 = lmG * hp + bp;
        this.lmL2 = lmG * bp + (lmG * bp + this.lmL2);
        v += M.lowMid * bp;
      }
      v *= dG;
      v = allpass(this.apB, L_apB, -dd2, v);
      if (M.density) v = allpass(this.xLn, L_xL, 0.5, v);
      this.delB.write(v);

      let y = aR + dG * tailL + dn;
      y = allpass(this.apm2, Math.max(2, L_apm2 + EX * m2), dd1, y);
      this.delC.write(y);
      let w = this.delC.read(L_delC);
      this.dampR = (1 - dC) * w + dC * this.dampR;
      w = this.dampR;
      this.bassR = (1 - xC) * w + xC * this.bassR;
      w = w - this.bassR + bM * this.bassR;
      if (M.lowMid > 0) {
        const hp = (w - (2 * lmR + lmG) * this.lmR1 - this.lmR2) * lmD;
        const bp = lmG * hp + this.lmR1;
        this.lmR1 = lmG * hp + bp;
        this.lmR2 = lmG * bp + (lmG * bp + this.lmR2);
        w += M.lowMid * bp;
      }
      w *= dG;
      w = allpass(this.apD, L_apD, -dd2, w);
      if (M.density) w = allpass(this.xRn, L_xR, 0.5, w);
      this.delD.write(w);

      let yl = this.delC.read(t1) + this.delC.read(t2) - this.apD.read(t3) + this.delD.read(t4)
             - this.delA.read(t5) - this.apB.read(t6) - this.delB.read(t7);
      let yr = this.delA.read(u1) + this.delA.read(u2) - this.apB.read(u3) + this.delB.read(u4)
             - this.delC.read(u5) - this.apD.read(u6) - this.delD.read(u7);
      yl *= 0.6; yr *= 0.6;

      const GL = sm.lc / (1 + sm.lc);
      const v1 = (yl - this.lc1L) * GL, p1 = v1 + this.lc1L;
      this.lc1L = p1 + v1; yl -= p1;
      const v2 = (yl - this.lc2L) * GL, p2 = v2 + this.lc2L;
      this.lc2L = p2 + v2; yl -= p2;

      const v3 = (yr - this.lc1R) * GL, p3 = v3 + this.lc1R;
      this.lc1R = p3 + v3; yr -= p3;
      const v4 = (yr - this.lc2R) * GL, p4 = v4 + this.lc2R;
      this.lc2R = p4 + v4; yr -= p4;

      const GH = sm.hc / (1 + sm.hc);
      const vhl = (yl - this.hcL) * GH;
      const lpl = vhl + this.hcL;
      this.hcL = lpl + vhl;
      yl = lpl;
      const vhr = (yr - this.hcR) * GH;
      const lpr = vhr + this.hcR;
      this.hcR = lpr + vhr;
      yr = lpr;

      const mid = 0.5 * (yl + yr);
      const side = 0.5 * (yl - yr) * sm.width;
      yl = mid + side;
      yr = mid - side;

      yl *= this.duckGain;
      yr *= this.duckGain;
      const wetG = Math.sin((sm.mix * Math.PI) / 2);
      const dryG = Math.cos((sm.mix * Math.PI) / 2);

      oL[i] = dryL * dryG + yl * wetG;
      oR[i] = dryR * dryG + yr * wetG;
      if (wL) { wL[i] = yl; wR[i] = yr; }

      this.wetAcc += yl * yl + yr * yr;
      this.inAcc += dryL * dryL + dryR * dryR;
      this.mCount += 2;
    }

    this.meterCount += nFrames;
    if (this.meterCount >= 512) {
      this.meterCount = 0;
      const n = Math.max(1, this.mCount);
      this.port.postMessage({
        wet: Math.sqrt(this.wetAcc / n),
        in: Math.sqrt(this.inAcc / n),
        duck: this.duckGain
      });
      this.wetAcc = 0; this.inAcc = 0; this.mCount = 0;
    }
    return true;
  }
}

registerProcessor('plate-processor', PlateProcessor);
`;
