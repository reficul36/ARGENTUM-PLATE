import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { MODES, rt60At, solveBassForRt60, solveDecayForRt60, type ParamId, type ParamValues } from '../audio/params';

interface Props {
  values: ParamValues;
  mode: number;
  onChange: (id: ParamId, v: number) => void;
  onHint?: (t: string | null) => void;
  height?: number;
}

const FMIN = 20, FMAX = 20000;
const TMIN = 0.08, TMAX = 40;
const fx = (f: number, w: number) => (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * w;
const xf = (x: number, w: number) => FMIN * Math.pow(FMAX / FMIN, x / w);
const ty = (t: number, h: number) => h - (Math.log(Math.max(TMIN, t) / TMIN) / Math.log(TMAX / TMIN)) * h;
const yt = (y: number, h: number) => TMIN * Math.pow(TMAX / TMIN, (h - y) / h);

type Handle = 'decay' | 'bass' | 'damp' | 'lowCut' | 'highCut' | null;

export default function DecayCurve({ values, mode, onChange, onHint, height = 260 }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const vals = useRef(values);
  const md = useRef(mode);
  const drag = useRef<Handle>(null);
  const hover = useRef<Handle>(null);
  vals.current = values;
  md.current = mode;

  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr; c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const p = vals.current;
      const M = MODES[md.current];
      const sr = engine.sampleRate;

      // background
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#0d1016');
      bg.addColorStop(1, '#080a0e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.font = '9px ui-monospace, monospace';
      ctx.lineWidth = 1;
      const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      freqs.forEach((f) => {
        const x = fx(f, w);
        ctx.strokeStyle = f === 1000 ? '#ffffff14' : '#ffffff0a';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 12); ctx.stroke();
        ctx.fillStyle = '#4b5563';
        const lbl = f >= 1000 ? `${f / 1000}k` : `${f}`;
        ctx.fillText(lbl, Math.min(w - 16, Math.max(2, x - 6)), h - 3);
      });
      [0.1, 0.3, 1, 3, 10, 30].forEach((t) => {
        const y = ty(t, h);
        ctx.strokeStyle = '#ffffff0a';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.fillStyle = '#4b5563';
        ctx.fillText(`${t < 1 ? t.toFixed(1) : t}s`, 3, y - 3);
      });

      // live wet spectrum
      const spec = engine.readSpectrum();
      if (spec.length) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        const bins = spec.length;
        for (let i = 1; i < bins; i++) {
          const f = (i * sr) / (bins * 2);
          if (f < FMIN) continue;
          if (f > FMAX) break;
          const db = spec[i];
          const nrm = Math.min(1, Math.max(0, (db + 96) / 90));
          ctx.lineTo(fx(f, w), h - nrm * h * 0.92);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        const sg = ctx.createLinearGradient(0, 0, 0, h);
        sg.addColorStop(0, 'rgba(120,200,255,0.20)');
        sg.addColorStop(1, 'rgba(80,140,255,0.02)');
        ctx.fillStyle = sg;
        ctx.fill();
      }

      // band-limit walls (wet-bus low/high cut)
      const xlc = fx(p.lowCut, w), xhc = fx(p.highCut, w);
      const gl = ctx.createLinearGradient(0, 0, xlc, 0);
      gl.addColorStop(0, 'rgba(255,90,90,0.14)');
      gl.addColorStop(1, 'rgba(255,90,90,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, xlc, h - 12);
      const gh = ctx.createLinearGradient(xhc, 0, w, 0);
      gh.addColorStop(0, 'rgba(255,90,90,0)');
      gh.addColorStop(1, 'rgba(255,90,90,0.14)');
      ctx.fillStyle = gh; ctx.fillRect(xhc, 0, w - xhc, h - 12);
      [xlc, xhc].forEach((x) => {
        ctx.strokeStyle = 'rgba(255,120,120,0.5)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 12); ctx.stroke();
        ctx.setLineDash([]);
      });

      // RT60 curve
      ctx.beginPath();
      for (let x = 0; x <= w; x += 1.5) {
        const f = xf(x, w);
        const t = rt60At(f, p, M, sr);
        const y = ty(t, h);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#8ee3ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(140,225,255,0.55)';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // fill under curve
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const cg = ctx.createLinearGradient(0, 0, 0, h);
      cg.addColorStop(0, 'rgba(142,227,255,0.10)');
      cg.addColorStop(1, 'rgba(142,227,255,0.01)');
      ctx.fillStyle = cg; ctx.fill();

      // handles
      const drawHandle = (x: number, y: number, label: string, key: Handle) => {
        const active = drag.current === key || hover.current === key;
        ctx.beginPath();
        ctx.arc(x, y, active ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#bdf0ff' : '#0f1319';
        ctx.strokeStyle = '#8ee3ff';
        ctx.lineWidth = 2;
        ctx.fill(); ctx.stroke();
        if (active) {
          ctx.fillStyle = '#cfe9f5';
          ctx.font = '9px ui-monospace, monospace';
          ctx.fillText(label, Math.min(w - 60, x + 10), Math.max(11, y - 9));
        }
      };
      const hz = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
      drawHandle(fx(1000, w), ty(rt60At(1000, p, M, sr), h), `DECAY ${p.decay.toFixed(2)}s`, 'decay');
      drawHandle(fx(p.crossover, w), ty(rt60At(p.crossover * 0.5, p, M, sr), h), `BASS ${p.bassMul.toFixed(2)}x @ ${hz(p.crossover)}`, 'bass');
      const fdamp = Math.min(FMAX * 0.97, p.damp * M.hfMul);
      drawHandle(fx(fdamp, w), ty(rt60At(fdamp, p, M, sr), h), `DAMP ${hz(p.damp)}Hz × ${M.hfMul}`, 'damp');
      drawHandle(xlc, h - 20, `LOW CUT ${hz(p.lowCut)}Hz`, 'lowCut');
      drawHandle(xhc, h - 20, `HIGH CUT ${hz(p.highCut)}Hz`, 'highCut');

      // readouts
      ctx.font = '9.5px ui-monospace, monospace';
      const stats: [string, number][] = [
        ['100Hz', rt60At(100, p, M, sr)],
        ['1kHz', rt60At(1000, p, M, sr)],
        ['10kHz', rt60At(10000, p, M, sr)],
      ];
      let sx = w - 8;
      stats.reverse().forEach(([k, v]) => {
        const txt = `${k} ${v.toFixed(2)}s`;
        const tw = ctx.measureText(txt).width;
        sx -= tw + 12;
        ctx.fillStyle = '#64748b';
        ctx.fillText(txt, sx, 14);
      });
      ctx.fillStyle = '#8ee3ff99';
      ctx.fillText('RT60 / FREQUENCY', 8, 14);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pick = (mx: number, my: number, w: number, h: number): Handle => {
    const p = vals.current;
    const M = MODES[md.current];
    const sr = engine.sampleRate;
    const cands: [Handle, number, number][] = [
      ['decay', fx(1000, w), ty(rt60At(1000, p, M, sr), h)],
      ['bass', fx(p.crossover, w), ty(rt60At(p.crossover * 0.5, p, M, sr), h)],
      ['damp', fx(Math.min(FMAX * 0.97, p.damp * M.hfMul), w), ty(rt60At(Math.min(FMAX * 0.97, p.damp * M.hfMul), p, M, sr), h)],
      ['lowCut', fx(p.lowCut, w), h - 20],
      ['highCut', fx(p.highCut, w), h - 20],
    ];
    let best: Handle = null, bd = 18 * 18;
    cands.forEach(([k, x, y]) => {
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };

  const pos = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const { x, y, w, h } = pos(e);
    const hit = pick(x, y, w, h);
    if (!hit) return;
    drag.current = hit;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const { x, y, w, h } = pos(e);
    if (!drag.current) {
      hover.current = pick(x, y, w, h);
      return;
    }
    const f = Math.min(FMAX, Math.max(FMIN, xf(x, w)));
    const t = yt(y, h);
    const P = vals.current;
    const MD = MODES[md.current];
    const sr = engine.sampleRate;
    switch (drag.current) {
      case 'decay':
        onChange('decay', solveDecayForRt60(1000, t, P, MD, sr));
        break;
      case 'bass': {
        const xover = Math.min(1600, Math.max(60, f));
        onChange('crossover', xover);
        onChange('bassMul', solveBassForRt60(xover * 0.5, t, { ...P, crossover: xover }, MD, sr));
        break;
      }
      case 'damp':
        onChange('damp', Math.min(20000, Math.max(700, f / MODES[md.current].hfMul)));
        break;
      case 'lowCut':
        onChange('lowCut', Math.min(1000, Math.max(20, f)));
        break;
      case 'highCut':
        onChange('highCut', Math.min(20000, Math.max(1200, f)));
        break;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  return (
    <div
      ref={wrap}
      className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-[#0a0c11]"
      style={{ height }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => { hover.current = null; onHint?.(null); }}
      onMouseEnter={() => onHint?.('DECAY-RATE DISPLAY — drag the nodes: 1 kHz node = global RT60 · bass node = multiplier + crossover · damp node = HF absorption · dashed nodes = wet-bus band limits.')}
    >
      <canvas ref={cvs} className="h-full w-full cursor-crosshair" />
    </div>
  );
}
