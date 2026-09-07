import { useCallback, useEffect, useRef, useState } from 'react';
import { fromNorm, toNorm, type ParamSpec } from '../audio/params';

interface Props {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
  onHint?: (t: string | null) => void;
  size?: number;
  accent?: string;
  bipolar?: boolean;
}

const A0 = -135;
const A1 = 135;
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};
const arc = (cx: number, cy: number, r: number, a: number, b: number) => {
  const [x0, y0] = polar(cx, cy, r, a);
  const [x1, y1] = polar(cx, cy, r, b);
  const large = Math.abs(b - a) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
};

export default function Knob({ spec, value, onChange, onHint, size = 62, accent = '#7fd4ff', bipolar }: Props) {
  const n = toNorm(spec, value);
  const [drag, setDrag] = useState(false);
  const ref = useRef<{ y: number; n: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nRef = useRef(n);
  nRef.current = n;

  const commit = useCallback(
    (nn: number) => onChange(fromNorm(spec, Math.min(1, Math.max(0, nn)))),
    [onChange, spec],
  );

  // native, non-passive wheel handler so the page never scrolls under the mouse
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      commit(nRef.current - Math.sign(e.deltaY) * (e.shiftKey ? 0.004 : 0.02));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [commit]);

  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    ref.current = { y: e.clientY, n };
    setDrag(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!ref.current) return;
    const fine = e.shiftKey ? 0.22 : 1;
    const dy = ref.current.y - e.clientY;
    commit(ref.current.n + (dy / 180) * fine);
  };
  const up = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    ref.current = null;
    setDrag(false);
  };


  const cx = size / 2;
  const r = size / 2 - 6;
  const ang = A0 + (A1 - A0) * n;
  const startAng = bipolar ? (A0 + A1) / 2 : A0;
  const [px, py] = polar(cx, cx, r - 4, ang);
  const [ix, iy] = polar(cx, cx, r * 0.42, ang);

  return (
    <div
      className="flex select-none flex-col items-center gap-1"
      onMouseEnter={() => onHint?.(`${spec.label} — ${spec.tip}`)}
      onMouseLeave={() => onHint?.(null)}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`cursor-ns-resize touch-none ${drag ? 'drop-shadow-[0_0_10px_rgba(127,212,255,0.45)]' : ''}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={() => onChange(spec.def)}
      >
        <defs>
          <radialGradient id={`kb-${spec.id}`} cx="50%" cy="32%" r="72%">
            <stop offset="0%" stopColor="#3a4250" />
            <stop offset="60%" stopColor="#20252e" />
            <stop offset="100%" stopColor="#12151b" />
          </radialGradient>
        </defs>
        <path d={arc(cx, cx, r, A0, A1)} stroke="#252b36" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <path
          d={arc(cx, cx, r, Math.min(startAng, ang), Math.max(startAng, ang))}
          stroke={accent}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.95}
        />
        <circle cx={cx} cy={cx} r={r - 5} fill={`url(#kb-${spec.id})`} stroke="#0b0d12" strokeWidth={1} />
        <circle cx={cx} cy={cx} r={r - 5} fill="none" stroke="#ffffff10" strokeWidth={0.75} />
        <line x1={ix} y1={iy} x2={px} y2={py} stroke={accent} strokeWidth={2} strokeLinecap="round" />
        <circle cx={px} cy={py} r={1.6} fill={accent} />
      </svg>
      <div className="text-center leading-none">
        <div className="text-[9px] font-medium tracking-[0.14em] text-zinc-500">{spec.short}</div>
        <div className="mt-[3px] font-mono text-[10.5px] tabular-nums text-zinc-200">{spec.fmt(value)}</div>
      </div>
    </div>
  );
}
