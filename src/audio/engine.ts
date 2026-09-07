import { PARAMS, type ParamId, type ParamValues } from './params';
import { PLATE_WORKLET_SRC } from './plate-worklet';

export type SourceId = 'click' | 'snare' | 'drums' | 'pluck' | 'vox' | 'file' | 'mic';

export interface Meter { wet: number; in: number; duck: number }

let workletUrl: string | null = null;
function getWorkletUrl(): string {
  if (!workletUrl) {
    workletUrl = URL.createObjectURL(new Blob([PLATE_WORKLET_SRC], { type: 'application/javascript' }));
  }
  return workletUrl;
}

export class PlateEngine {
  ctx: AudioContext | null = null;
  node: AudioWorkletNode | null = null;
  private inputBus: GainNode | null = null;
  private wetAnalyser: AnalyserNode | null = null;
  private master: GainNode | null = null;

  private schedTimer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private source: SourceId = 'click';
  private fileBuffer: AudioBuffer | null = null;
  private fileNode: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private pinkBuf: AudioBuffer | null = null;
  private noiseBuf: AudioBuffer | null = null;

  playing = false;
  ready = false;
  meter: Meter = { wet: 0, in: 0, duck: 1 };
  onMeter: ((m: Meter) => void) | null = null;
  spectrum: Float32Array<ArrayBuffer> = new Float32Array(1024).fill(-140);

  async init(): Promise<void> {
    if (this.ready) {
      await this.ctx?.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    await ctx.audioWorklet.addModule(getWorkletUrl());

    const node = new AudioWorkletNode(ctx, 'plate-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 2,
      outputChannelCount: [2, 2],
      channelCount: 2,
      channelCountMode: 'explicit',
      channelInterpretation: 'speakers',
    });
    node.port.onmessage = (e) => {
      const d = e.data as Meter;
      this.meter = d;
      this.onMeter?.(d);
    };
    this.node = node;

    const inputBus = ctx.createGain();
    inputBus.gain.value = 0.85;
    inputBus.connect(node);
    this.inputBus = inputBus;

    const wetAnalyser = ctx.createAnalyser();
    wetAnalyser.fftSize = 4096;
    wetAnalyser.smoothingTimeConstant = 0.72;
    wetAnalyser.minDecibels = -100;
    wetAnalyser.maxDecibels = -6;
    node.connect(wetAnalyser, 1);
    this.wetAnalyser = wetAnalyser;
    this.spectrum = new Float32Array(wetAnalyser.frequencyBinCount).fill(-140);

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 2;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    node.connect(limiter, 0);
    limiter.connect(master);
    master.connect(ctx.destination);
    this.master = master;

    this.buildBuffers();
    this.ready = true;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  /* ------------------------- parameters ------------------------- */
  setParam(id: ParamId, value: number): void {
    const p = this.node?.parameters.get(id);
    if (!p || !this.ctx) return;
    p.setTargetAtTime(value, this.ctx.currentTime, 0.006);
  }
  setAll(values: ParamValues): void {
    (Object.keys(PARAMS) as ParamId[]).forEach((k) => this.setParam(k, values[k]));
  }
  setFlag(name: 'freeze' | 'bypass' | 'trueStereo', on: boolean): void {
    const p = this.node?.parameters.get(name);
    if (!p || !this.ctx) return;
    p.setValueAtTime(on ? 1 : 0, this.ctx.currentTime);
  }
  setMode(i: number): void {
    this.node?.port.postMessage({ type: 'mode', value: i });
  }
  flush(): void {
    this.node?.port.postMessage({ type: 'flush' });
  }
  setOutput(gain: number): void {
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.02);
  }

  readSpectrum(): Float32Array {
    if (this.wetAnalyser) this.wetAnalyser.getFloatFrequencyData(this.spectrum);
    return this.spectrum;
  }

  /* ------------------------- test material ------------------------- */
  private buildBuffers() {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;

    // Dattorro's recommended test signal: a click with a pink spectrum
    const n = 2048;
    const pink = ctx.createBuffer(1, n, sr);
    const d = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = i === 0 ? 1 : 0;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      const v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
      d[i] = v * 0.32 * Math.exp(-i / 260);
    }
    this.pinkBuf = pink;

    const nn = Math.floor(sr * 0.6);
    const noise = ctx.createBuffer(1, nn, sr);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nn; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = noise;
  }

  private env(node: AudioParam, t: number, peak: number, atk: number, dec: number) {
    node.cancelScheduledValues(t);
    node.setValueAtTime(0.0001, t);
    node.exponentialRampToValueAtTime(peak, t + atk);
    node.exponentialRampToValueAtTime(0.0001, t + atk + dec);
  }

  private oneShotBuffer(buf: AudioBuffer, t: number, gain: number, filter?: { type: BiquadFilterType; f: number; q: number }, dur?: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (filter) {
      const bq = ctx.createBiquadFilter();
      bq.type = filter.type;
      bq.frequency.value = filter.f;
      bq.Q.value = filter.q;
      s.connect(bq).connect(g);
    } else {
      s.connect(g);
    }
    g.connect(this.inputBus!);
    s.start(t);
    s.stop(t + (dur ?? buf.duration));
    s.onended = () => g.disconnect();
  }

  private snare(t: number, gain = 0.9) {
    const ctx = this.ctx!;
    // noise body
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 380;
    const g = ctx.createGain();
    this.env(g.gain, t, 0.55 * gain, 0.001, 0.19);
    s.connect(bp).connect(hp).connect(g).connect(this.inputBus!);
    s.start(t); s.stop(t + 0.35);
    // tonal shell
    [186, 331].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f * 1.6, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const og = ctx.createGain();
      this.env(og.gain, t, (i ? 0.14 : 0.3) * gain, 0.001, 0.12);
      o.connect(og).connect(this.inputBus!);
      o.start(t); o.stop(t + 0.25);
    });
    s.onended = () => g.disconnect();
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const g = ctx.createGain();
    this.env(g.gain, t, 0.9, 0.002, 0.26);
    o.connect(g).connect(this.inputBus!);
    o.start(t); o.stop(t + 0.32);
  }

  private hat(t: number, open = false) {
    this.oneShotBuffer(this.noiseBuf!, t, open ? 0.1 : 0.07, { type: 'highpass', f: 7800, q: 0.7 }, open ? 0.14 : 0.035);
  }

  private pluck(t: number, freq: number, gain = 0.5) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o.type = 'triangle'; o2.type = 'sawtooth';
    o.frequency.value = freq; o2.frequency.value = freq * 2.005;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    lp.Q.value = 1.1;
    const g = ctx.createGain();
    this.env(g.gain, t, gain, 0.004, 1.1);
    const g2 = ctx.createGain(); g2.gain.value = 0.22;
    o.connect(lp); o2.connect(g2).connect(lp);
    lp.connect(g).connect(this.inputBus!);
    o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
  }

  private voice(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    this.env(out.gain, t, 0.42, 0.09, dur);
    out.connect(this.inputBus!);
    // formant-ish "aah"
    const formants = [[720, 1.0], [1240, 0.5], [2540, 0.22]];
    const src = ctx.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(freq, t);
    const vib = ctx.createOscillator();
    vib.type = 'sine'; vib.frequency.value = 5.1;
    const vibG = ctx.createGain(); vibG.gain.value = freq * 0.008;
    vib.connect(vibG).connect(src.frequency);
    formants.forEach(([f, a]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 7;
      const g = ctx.createGain(); g.gain.value = a as number;
      src.connect(bp).connect(g).connect(out);
    });
    src.start(t); vib.start(t);
    src.stop(t + dur + 0.4); vib.stop(t + dur + 0.4);
  }

  private scheduleStep(t: number, step: number) {
    switch (this.source) {
      case 'click':
        if (step % 4 === 0) this.oneShotBuffer(this.pinkBuf!, t, 0.95);
        break;
      case 'snare':
        if (step % 4 === 0) this.snare(t);
        break;
      case 'drums': {
        const s = step % 8;
        if (s === 0 || s === 3 || s === 6) this.kick(t);
        if (s === 2 || s === 6) this.snare(t, 0.8);
        this.hat(t, s === 7);
        break;
      }
      case 'pluck': {
        const scale = [329.63, 392.0, 493.88, 587.33, 659.25];
        if (step % 2 === 0) this.pluck(t, scale[(step / 2) % scale.length], 0.45);
        break;
      }
      case 'vox': {
        const notes = [261.63, 311.13, 392.0, 466.16];
        if (step % 8 === 0) this.voice(t, notes[(step / 8) % notes.length], 1.5);
        break;
      }
      default:
        break;
    }
  }

  private tick = () => {
    if (!this.ctx || !this.playing) return;
    const stepDur = 0.25; // 120 BPM eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      this.scheduleStep(this.nextTime, this.step);
      this.step++;
      this.nextTime += stepDur;
    }
    this.schedTimer = window.setTimeout(this.tick, 60);
  };

  async setSource(id: SourceId): Promise<void> {
    const wasPlaying = this.playing;
    this.stop();
    this.source = id;
    if (id === 'mic') await this.enableMic();
    if (wasPlaying) this.play();
  }

  get currentSource(): SourceId {
    return this.source;
  }

  play(): void {
    if (!this.ctx) return;
    this.ctx.resume();
    this.playing = true;
    if (this.source === 'file') {
      if (!this.fileBuffer) return;
      const s = this.ctx.createBufferSource();
      s.buffer = this.fileBuffer;
      s.loop = true;
      s.connect(this.inputBus!);
      s.start();
      this.fileNode = s;
      return;
    }
    if (this.source === 'mic') {
      if (this.micNode) this.micNode.connect(this.inputBus!);
      return;
    }
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.tick();
  }

  stop(): void {
    this.playing = false;
    if (this.schedTimer) { clearTimeout(this.schedTimer); this.schedTimer = null; }
    if (this.fileNode) { try { this.fileNode.stop(); } catch { /* noop */ } this.fileNode.disconnect(); this.fileNode = null; }
    if (this.micNode) { try { this.micNode.disconnect(); } catch { /* noop */ } }
  }

  async loadFile(file: File): Promise<void> {
    if (!this.ctx) await this.init();
    const buf = await file.arrayBuffer();
    this.fileBuffer = await this.ctx!.decodeAudioData(buf);
    await this.setSource('file');
  }

  async enableMic(): Promise<void> {
    if (this.micStream) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.micStream = stream;
      this.micNode = this.ctx!.createMediaStreamSource(stream);
    } catch {
      /* denied */
    }
  }
}

export const engine = new PlateEngine();
