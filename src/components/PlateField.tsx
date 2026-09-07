import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';

interface Props { size: number; modDepth: number; onHint?: (t: string | null) => void }

/* Chladni-style modal visualisation of the steel plate.
   Mode indices are driven by SIZE (modal density); the pattern
   breathes at the modulation rate and lights up with tail energy. */
const W = 108, H = 68;

export default function PlateField({ size, modDepth, onHint }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const p = useRef({ size, modDepth });
  p.current = { size, modDepth };

  useEffect(() => {
    const c = cvs.current!;
    const ctx = c.getContext('2d')!;
    c.width = W; c.height = H;
    const img = ctx.createImageData(W, H);
    let raf = 0;
    let t = 0;
    let lvl = 0;

    // separable cosine tables — 352 trig calls per frame instead of ~29 000
    const cnx = new Float32Array(W), cmx = new Float32Array(W);
    const cmy = new Float32Array(H), cny = new Float32Array(H);

    const draw = () => {
      t += 0.006;
      const s = p.current.size;
      lvl += (Math.min(1, engine.meter.wet * 6) - lvl) * 0.12;
      const n = 1.5 + s * 3.4;
      const m = 2.5 + s * 5.1;
      const wob = 1 + p.current.modDepth * 0.06 * Math.sin(t * 2.1);
      for (let x = 0; x < W; x++) {
        const vx = x / (W - 1);
        cnx[x] = Math.cos(n * Math.PI * vx * wob);
        cmx[x] = Math.cos(m * Math.PI * vx);
      }
      for (let y = 0; y < H; y++) {
        const vy = y / (H - 1);
        cmy[y] = Math.cos(m * Math.PI * vy);
        cny[y] = Math.cos(n * Math.PI * vy * wob);
      }
      const d = img.data;
      for (let y = 0; y < H; y++) {
        const my = cmy[y], ny = cny[y];
        for (let x = 0; x < W; x++) {
          const a = cnx[x] * my - cmx[x] * ny;
          const nodal = 1 - Math.min(1, Math.abs(a) * 3.4);
          const e = Math.pow(nodal, 1.7);
          const i = (y * W + x) * 4;
          const base = 12 + e * 26;
          d[i] = base * 0.5 + e * lvl * 120;
          d[i + 1] = base * 0.9 + e * lvl * 205;
          d[i + 2] = base * 1.5 + e * (110 + lvl * 145);
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-md border border-white/10 bg-black"
      onMouseEnter={() => onHint?.('MODAL FIELD — nodal-line render of the tank\'s eigenmode distribution. Density tracks SIZE; the pattern breathes with the de-metallising modulator.')}
      onMouseLeave={() => onHint?.(null)}
    >
      <canvas ref={cvs} className="h-full w-full" style={{ filter: 'saturate(1.25)' }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
      <div className="pointer-events-none absolute bottom-1 left-2 font-mono text-[8px] tracking-widest text-cyan-200/50">
        MODAL FIELD
      </div>
    </div>
  );
}
