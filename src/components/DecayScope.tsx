import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';

interface Props { height?: number; onHint?: (t: string | null) => void }

const LEN = 420; // ~7 s of history at 60 fps

export default function DecayScope({ height = 92, onHint }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const wet = useRef<Float32Array>(new Float32Array(LEN));
  const dry = useRef<Float32Array>(new Float32Array(LEN));
  const duck = useRef<Float32Array>(new Float32Array(LEN));
  const head = useRef(0);

  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const draw = () => {
      const m = engine.meter;
      const i = head.current;
      wet.current[i] = m.wet;
      dry.current[i] = m.in;
      duck.current[i] = m.duck;
      head.current = (i + 1) % LEN;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#080a0e';
      ctx.fillRect(0, 0, w, h);

      const mid = h / 2;
      // time grid: 1 s divisions
      ctx.strokeStyle = '#ffffff0a';
      ctx.font = '8px ui-monospace, monospace';
      for (let s = 1; s <= 7; s++) {
        const x = w - (s * 60 * w) / LEN;
        if (x < 0) break;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        ctx.fillStyle = '#374151';
        ctx.fillText(`-${s}s`, x + 2, h - 3);
      }
      ctx.strokeStyle = '#ffffff12';
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

      const sc = (v: number) => Math.min(1, Math.pow(v * 3.2, 0.62)) * (mid - 3);

      // dry (behind)
      ctx.beginPath();
      for (let k = 0; k < LEN; k++) {
        const idx = (head.current + k) % LEN;
        const x = (k / LEN) * w;
        const a = sc(dry.current[idx]);
        if (k === 0) ctx.moveTo(x, mid - a); else ctx.lineTo(x, mid - a);
      }
      for (let k = LEN - 1; k >= 0; k--) {
        const idx = (head.current + k) % LEN;
        const x = (k / LEN) * w;
        ctx.lineTo(x, mid + sc(dry.current[idx]));
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(148,163,184,0.20)';
      ctx.fill();

      // wet envelope
      ctx.beginPath();
      for (let k = 0; k < LEN; k++) {
        const idx = (head.current + k) % LEN;
        const x = (k / LEN) * w;
        const a = sc(wet.current[idx]);
        if (k === 0) ctx.moveTo(x, mid - a); else ctx.lineTo(x, mid - a);
      }
      for (let k = LEN - 1; k >= 0; k--) {
        const idx = (head.current + k) % LEN;
        ctx.lineTo((k / LEN) * w, mid + sc(wet.current[idx]));
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(142,227,255,0.75)');
      g.addColorStop(0.5, 'rgba(96,180,255,0.45)');
      g.addColorStop(1, 'rgba(142,227,255,0.75)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,240,255,0.85)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ducker gain trace
      let ducked = false;
      ctx.beginPath();
      for (let k = 0; k < LEN; k++) {
        const idx = (head.current + k) % LEN;
        const v = duck.current[idx];
        if (v < 0.985) ducked = true;
        const y = 3 + (1 - v) * (h - 6);
        const x = (k / LEN) * w;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (ducked) {
        ctx.strokeStyle = 'rgba(255,140,90,0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.fillStyle = '#8ee3ff88';
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('WET DECAY ENVELOPE', 8, 12);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-white/10"
      style={{ height }}
      onMouseEnter={() => onHint?.('DECAY ENVELOPE — grey = dry input, cyan = wet return, orange = ducker gain reduction. Watch the pre-delay gap and the tail slope in real time.')}
      onMouseLeave={() => onHint?.(null)}
    >
      <canvas ref={cvs} className="h-full w-full" />
    </div>
  );
}
