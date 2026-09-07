import { useState } from 'react';
import { FLNOTES, PITFALLS, REFS, SNIPPETS, TOPOLOGY, WHY } from '../data/docs';

const TABS = ['RESEARCH', 'TOPOLOGY', 'PITFALLS', 'WIN / JUCE CODE', 'FL WORKFLOW'] as const;
type Tab = (typeof TABS)[number];

function Code({ code }: { code: string }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-md border border-white/10 bg-[#06080b] p-3 font-mono text-[11px] leading-[1.55] text-zinc-300">
      {code.split('\n').map((ln, i) => {
        const t = ln.trimStart();
        const isComment = t.startsWith('//') || t.startsWith('#');
        const idx = ln.indexOf(' //');
        if (isComment) return <div key={i} className="text-emerald-400/60">{ln || ' '}</div>;
        if (idx > 0) {
          return (
            <div key={i}>
              <span>{ln.slice(0, idx)}</span>
              <span className="text-emerald-400/60">{ln.slice(idx)}</span>
            </div>
          );
        }
        return <div key={i}>{ln || ' '}</div>;
      })}
    </pre>
  );
}

function Block({ x, y, w, label, sub, tone = 'a' }: { x: number; y: number; w: number; label: string; sub?: string; tone?: 'a' | 'b' | 'c' }) {
  const fill = tone === 'a' ? '#141a22' : tone === 'b' ? '#122029' : '#1b1626';
  const stroke = tone === 'a' ? '#3b4756' : tone === 'b' ? '#2f6f86' : '#6b4a7a';
  return (
    <g>
      <rect x={x} y={y} width={w} height={34} rx={5} fill={fill} stroke={stroke} strokeWidth={1} />
      <text x={x + w / 2} y={sub ? y + 15 : y + 21} textAnchor="middle" className="fill-zinc-200" style={{ font: '10px ui-monospace, monospace' }}>{label}</text>
      {sub && <text x={x + w / 2} y={y + 26} textAnchor="middle" className="fill-cyan-300/60" style={{ font: '8px ui-monospace, monospace' }}>{sub}</text>}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, dash }: { x1: number; y1: number; x2: number; y2: number; dash?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" strokeDasharray={dash ? '3 3' : undefined} />;
}

function FlowDiagram() {
  return (
    <svg viewBox="0 0 980 300" className="w-full rounded-md border border-white/10 bg-[#06080b]">
      <defs>
        <marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" fill="#4b5b6b" />
        </marker>
      </defs>
      <text x={12} y={18} className="fill-cyan-300/70" style={{ font: '9px ui-monospace, monospace' }}>FIGURE-OF-EIGHT PLATE TANK — lengths @ 29 761 Hz, scaled by (fs/29761) × SIZE</text>

      <Block x={12} y={38} w={62} label="IN L/R" />
      <Arrow x1={74} y1={55} x2={92} y2={55} />
      <Block x={92} y={38} w={86} label="PRE-DELAY" sub="0–250 ms" />
      <Arrow x1={178} y1={55} x2={196} y2={55} />
      <Block x={196} y={38} w={74} label="BW LP" sub="0.9995" />
      <Arrow x1={270} y1={55} x2={288} y2={55} />
      <Block x={288} y={38} w={64} label="AP 142" tone="b" />
      <Arrow x1={352} y1={55} x2={362} y2={55} />
      <Block x={362} y={38} w={64} label="AP 107" tone="b" />
      <Arrow x1={426} y1={55} x2={436} y2={55} />
      <Block x={436} y={38} w={64} label="AP 379" tone="b" />
      <Arrow x1={500} y1={55} x2={510} y2={55} />
      <Block x={510} y={38} w={64} label="AP 277" tone="b" />
      <text x={288} y={30} className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>INPUT DIFFUSERS — instant echo density</text>

      {/* split */}
      <path d="M574 55 L600 55 L600 118" fill="none" stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" />
      <path d="M600 55 L600 220" fill="none" stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" strokeDasharray="3 3" />

      {/* left half */}
      <text x={16} y={112} className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>TANK HALF A</text>
      <Block x={16} y={120} w={96} label="MOD AP 672" sub="±exc" tone="c" />
      <Arrow x1={112} y1={137} x2={126} y2={137} />
      <Block x={126} y={120} w={80} label="DELAY 4453" />
      <Arrow x1={206} y1={137} x2={220} y2={137} />
      <Block x={220} y={120} w={78} label="HF DAMP" sub="one-pole" tone="b" />
      <Arrow x1={298} y1={137} x2={312} y2={137} />
      <Block x={312} y={120} w={84} label="BASS SHELF" sub="× clamp" tone="b" />
      <Arrow x1={396} y1={137} x2={410} y2={137} />
      <Block x={410} y={120} w={54} label="× dcy" />
      <Arrow x1={464} y1={137} x2={478} y2={137} />
      <Block x={478} y={120} w={72} label="AP 1800" tone="c" />
      <Arrow x1={550} y1={137} x2={564} y2={137} />
      <Block x={564} y={120} w={80} label="DELAY 3720" />

      {/* right half */}
      <text x={16} y={214} className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>TANK HALF B</text>
      <Block x={16} y={222} w={96} label="MOD AP 908" sub="±exc" tone="c" />
      <Arrow x1={112} y1={239} x2={126} y2={239} />
      <Block x={126} y={222} w={80} label="DELAY 4217" />
      <Arrow x1={206} y1={239} x2={220} y2={239} />
      <Block x={220} y={222} w={78} label="HF DAMP" sub="one-pole" tone="b" />
      <Arrow x1={298} y1={239} x2={312} y2={239} />
      <Block x={312} y={222} w={84} label="BASS SHELF" sub="× clamp" tone="b" />
      <Arrow x1={396} y1={239} x2={410} y2={239} />
      <Block x={410} y={222} w={54} label="× dcy" />
      <Arrow x1={464} y1={239} x2={478} y2={239} />
      <Block x={478} y={222} w={72} label="AP 2656" tone="c" />
      <Arrow x1={550} y1={239} x2={564} y2={239} />
      <Block x={564} y={222} w={80} label="DELAY 3163" />

      {/* cross feedback */}
      <path d="M644 137 L668 137 L668 190 L6 190 L6 239 L14 239" fill="none" stroke="#7fd4ff" strokeWidth={1.1} opacity={0.55} markerEnd="url(#ah)" />
      <path d="M644 239 L690 239 L690 96 L6 96 L6 137 L14 137" fill="none" stroke="#7fd4ff" strokeWidth={1.1} opacity={0.55} markerEnd="url(#ah)" />
      <text x={700} y={175} className="fill-cyan-300/70" style={{ font: '8px ui-monospace, monospace' }}>× decay cross-feed</text>

      {/* output taps */}
      <rect x={760} y={110} width={200} height={104} rx={6} fill="#0d1620" stroke="#2f6f86" />
      <text x={860} y={132} textAnchor="middle" className="fill-cyan-200" style={{ font: '10px ui-monospace, monospace' }}>INTERIOR TAP MATRIX</text>
      <text x={860} y={148} textAnchor="middle" className="fill-zinc-400" style={{ font: '8px ui-monospace, monospace' }}>7 signed taps per channel</text>
      <text x={860} y={162} textAnchor="middle" className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>yL: +266 +2974 −1913 +1996</text>
      <text x={860} y={174} textAnchor="middle" className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>    −1990 −187 −1066  × 0.6</text>
      <text x={860} y={192} textAnchor="middle" className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>yR: +353 +3627 −1228 +2673</text>
      <text x={860} y={204} textAnchor="middle" className="fill-zinc-500" style={{ font: '8px ui-monospace, monospace' }}>    −2111 −335 −121   × 0.6</text>
      <path d="M700 137 L756 137" stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" strokeDasharray="2 2" />
      <path d="M700 239 L740 239 L740 190 L756 190" fill="none" stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" strokeDasharray="2 2" />

      <Block x={790} y={244} w={140} label="LOW/HIGH CUT → M/S → DUCK" />
      <path d="M860 214 L860 242" stroke="#4b5b6b" strokeWidth={1.2} markerEnd="url(#ah)" />
    </svg>
  );
}

export default function DocsPanel() {
  const [tab, setTab] = useState<Tab>('RESEARCH');
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0e13]">
      <div className="flex flex-wrap gap-1 border-b border-white/10 px-3 pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-3 py-2 font-mono text-[10px] tracking-[0.12em] transition ${
              tab === t ? 'bg-cyan-400/10 text-cyan-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-h-[560px] overflow-y-auto p-5">
        {tab === 'RESEARCH' && (
          <div className="space-y-6">
            {WHY.map((s) => (
              <section key={s.h}>
                <h3 className="mb-2 font-mono text-[11px] tracking-[0.16em] text-cyan-300">{s.h.toUpperCase()}</h3>
                {s.body.map((b, i) => (
                  <p key={i} className="mb-2 max-w-4xl text-[12.5px] leading-relaxed text-zinc-400">{b}</p>
                ))}
              </section>
            ))}
            <section>
              <h3 className="mb-2 font-mono text-[11px] tracking-[0.16em] text-cyan-300">SOURCES</h3>
              <ul className="space-y-1">
                {REFS.map((r) => (
                  <li key={r} className="text-[11.5px] leading-relaxed text-zinc-500">— {r}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'TOPOLOGY' && (
          <div className="space-y-5">
            <FlowDiagram />
            {TOPOLOGY.map((s) => (
              <section key={s.h}>
                <h3 className="mb-2 font-mono text-[11px] tracking-[0.16em] text-cyan-300">{s.h.toUpperCase()}</h3>
                {s.body.map((b, i) => (
                  <p key={i} className="mb-2 max-w-4xl text-[12.5px] leading-relaxed text-zinc-400">{b}</p>
                ))}
              </section>
            ))}
          </div>
        )}

        {tab === 'PITFALLS' && (
          <div className="grid gap-3 lg:grid-cols-2">
            {PITFALLS.map((p) => (
              <div key={p.bad} className="rounded-lg border border-white/10 bg-[#0e1116] p-4">
                <div className="mb-2 flex items-start gap-2">
                  <span className="mt-[2px] rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-rose-300">AVOID</span>
                  <h4 className="text-[13px] font-medium text-zinc-200">{p.bad}</h4>
                </div>
                <p className="mb-2 text-[12px] leading-relaxed text-zinc-500">{p.why}</p>
                <div className="flex items-start gap-2">
                  <span className="mt-[2px] rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-emerald-300">FIX</span>
                  <p className="text-[12px] leading-relaxed text-zinc-400">{p.fix}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'WIN / JUCE CODE' && (
          <div className="space-y-6">
            {SNIPPETS.map((s) => (
              <section key={s.title}>
                <h3 className="mb-1 font-mono text-[11px] tracking-[0.14em] text-cyan-300">{s.title}</h3>
                <p className="mb-2 max-w-4xl text-[12px] leading-relaxed text-zinc-500">{s.sub}</p>
                <Code code={s.code} />
              </section>
            ))}
          </div>
        )}

        {tab === 'FL WORKFLOW' && (
          <div className="space-y-6">
            {FLNOTES.map((s) => (
              <section key={s.h}>
                <h3 className="mb-2 font-mono text-[11px] tracking-[0.16em] text-cyan-300">{s.h.toUpperCase()}</h3>
                {s.body.map((b, i) => (
                  <p key={i} className="mb-2 max-w-4xl text-[12.5px] leading-relaxed text-zinc-400">{b}</p>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
