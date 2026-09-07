import { useCallback, useEffect, useRef, useState } from 'react';
import Knob from './components/Knob';
import DecayCurve from './components/DecayCurve';
import DecayScope from './components/DecayScope';
import PlateField from './components/PlateField';
import DocsPanel from './components/DocsPanel';
import { engine, type SourceId } from './audio/engine';
import { DEFAULTS, MODES, PARAMS, type ParamId, type ParamValues } from './audio/params';
import { PRESETS, presetValues } from './data/presets';

const GROUPS: { title: string; ids: ParamId[]; accent: string }[] = [
  { title: 'SPACE', ids: ['predelay', 'size', 'decay', 'diffusion'], accent: '#8ee3ff' },
  { title: 'TONE', ids: ['damp', 'bassMul', 'crossover', 'lowCut', 'highCut'], accent: '#9ad9b0' },
  { title: 'MOTION', ids: ['modDepth', 'modRate', 'width'], accent: '#c8b4ff' },
  { title: 'OUTPUT', ids: ['duck', 'mix'], accent: '#ffcf8e' },
];

const DIVS: [string, number][] = [
  ['1/32', 0.125], ['1/16T', 1 / 6], ['1/16', 0.25], ['1/8T', 1 / 3], ['1/8', 0.5], ['1/4', 1],
];

const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'click', label: 'PINK CLICK' },
  { id: 'snare', label: 'SNARE' },
  { id: 'drums', label: 'DRUMS' },
  { id: 'pluck', label: 'PLUCK' },
  { id: 'vox', label: 'VOICE' },
  { id: 'mic', label: 'MIC' },
];

interface BtnProps {
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'cyan' | 'amber' | 'rose';
  hint?: string;
}

const TONES: Record<string, string> = {
  cyan: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/50 shadow-[0_0_14px_-4px_rgba(126,211,255,0.8)]',
  amber: 'bg-amber-400/15 text-amber-200 border-amber-400/50 shadow-[0_0_14px_-4px_rgba(255,200,120,0.8)]',
  rose: 'bg-rose-500/15 text-rose-200 border-rose-400/50 shadow-[0_0_14px_-4px_rgba(255,120,140,0.8)]',
};

function PlateBtn({ on, onClick, children, tone = 'cyan', hint, onHint }: BtnProps & { onHint: (t: string | null) => void }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => hint && onHint(hint)}
      onMouseLeave={() => hint && onHint(null)}
      className={`rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[9.5px] tracking-[0.12em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 ${on ? TONES[tone] : ''}`}
    >
      {children}
    </button>
  );
}

function Meters() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const g = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const m = engine.meter;
      const sc = (v: number) => `${Math.min(100, Math.pow(Math.min(1, v * 3.2), 0.55) * 100)}%`;
      if (a.current) a.current.style.height = sc(m.in);
      if (b.current) b.current.style.height = sc(m.wet);
      if (g.current) g.current.style.height = `${Math.min(100, (1 - m.duck) * 260)}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const Bar = ({ r, c, l }: { r: React.RefObject<HTMLDivElement | null>; c: string; l: string }) => (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-full w-[9px] overflow-hidden rounded-sm border border-white/10 bg-black/60">
        <div ref={r} className={`absolute bottom-0 w-full ${c}`} style={{ height: '0%' }} />
      </div>
      <span className="font-mono text-[8px] tracking-widest text-zinc-600">{l}</span>
    </div>
  );
  return (
    <div className="flex h-full gap-2">
      <Bar r={a} c="bg-gradient-to-t from-slate-500 to-slate-300" l="IN" />
      <Bar r={b} c="bg-gradient-to-t from-cyan-600 via-cyan-400 to-sky-200" l="WET" />
      <Bar r={g} c="bg-gradient-to-t from-orange-600 to-amber-300" l="GR" />
    </div>
  );
}

export default function App() {
  const [values, setValues] = useState<ParamValues>({ ...DEFAULTS });
  const [mode, setMode] = useState(0);
  const [preset, setPreset] = useState(0);
  const [freeze, setFreeze] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [trueStereo, setTrueStereo] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<SourceId>('click');
  const [bpm, setBpm] = useState(140);
  const [started, setStarted] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [ab, setAb] = useState<'A' | 'B'>('A');
  const slots = useRef<Record<'A' | 'B', { v: ParamValues; m: number }>>({
    A: { v: { ...DEFAULTS }, m: 0 },
    B: { v: { ...DEFAULTS }, m: 0 },
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const boot = useCallback(async () => {
    if (engine.ready) return;
    await engine.init();
    engine.setAll(values);
    engine.setMode(mode);
    engine.setFlag('freeze', freeze);
    engine.setFlag('bypass', bypass);
    engine.setFlag('trueStereo', trueStereo);
    setStarted(true);
  }, [values, mode, freeze, bypass, trueStereo]);

  useEffect(() => { if (engine.ready) engine.setAll(values); }, [values]);
  useEffect(() => { if (engine.ready) engine.setMode(mode); }, [mode]);
  useEffect(() => { if (engine.ready) engine.setFlag('freeze', freeze); }, [freeze]);
  useEffect(() => { if (engine.ready) engine.setFlag('bypass', bypass); }, [bypass]);
  useEffect(() => { if (engine.ready) engine.setFlag('trueStereo', trueStereo); }, [trueStereo]);

  const set = useCallback((id: ParamId, v: number) => {
    setValues((p) => ({ ...p, [id]: v }));
  }, []);

  const togglePlay = useCallback(async () => {
    await boot();
    if (playing) { engine.stop(); setPlaying(false); }
    else { engine.play(); setPlaying(true); }
  }, [boot, playing]);

  const pickSource = async (id: SourceId) => {
    await boot();
    setSource(id);
    await engine.setSource(id);
    if (!playing) { engine.play(); setPlaying(true); }
  };

  const loadPreset = (i: number) => {
    setPreset(i);
    setValues(presetValues(PRESETS[i]));
    setMode(PRESETS[i].mode);
  };

  const swapAB = () => {
    const cur = ab;
    const next = cur === 'A' ? 'B' : 'A';
    slots.current[cur] = { v: values, m: mode };
    setValues(slots.current[next].v);
    setMode(slots.current[next].m);
    setAb(next);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).matches('input,select,textarea')) {
        e.preventDefault();
        void togglePlay();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [togglePlay]);

  const load = 0.31 + (trueStereo ? 0.09 : 0) + (MODES[mode].density ? 0.06 : 0) + values.size * 0.02;

  const Btn = (p: BtnProps) => <PlateBtn {...p} onHint={setHint} />;

  return (
    <div className="min-h-screen bg-[#07090c] px-4 py-6 text-zinc-300 selection:bg-cyan-400/30 lg:px-8">
      <div className="mx-auto max-w-[1240px] space-y-4">

        {/* ── plugin window ── */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e13] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">

          {/* header */}
          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/10 bg-[linear-gradient(180deg,#161b22_0%,#0d1117_100%)] px-4 py-3">
            <div className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 3px)' }} />
            <div className="relative flex items-baseline gap-2">
              <span className="font-mono text-[15px] font-semibold tracking-[0.28em] text-zinc-100">ARGENTUM</span>
              <span className="font-mono text-[15px] font-light tracking-[0.28em] text-cyan-300">PLATE</span>
              <span className="ml-1 rounded border border-white/10 px-1.5 py-[1px] font-mono text-[8px] tracking-widest text-zinc-500">VST3 · x64</span>
            </div>

            <div className="relative flex flex-1 flex-wrap items-center justify-end gap-2">
              <select
                value={preset}
                onChange={(e) => loadPreset(Number(e.target.value))}
                onMouseEnter={() => setHint(`PRESET — ${PRESETS[preset].note}`)}
                onMouseLeave={() => setHint(null)}
                className="max-w-[240px] rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[10px] tracking-wider text-zinc-300 outline-none hover:border-cyan-400/40"
              >
                {(['VOCAL', 'DRUMS', 'SYNTH', 'GLUE', 'FX'] as const).map((c) => (
                  <optgroup key={c} label={c}>
                    {PRESETS.map((p, i) => (p.cat === c ? <option key={p.name} value={i}>{p.name}</option> : null))}
                  </optgroup>
                ))}
              </select>
              <Btn onClick={swapAB} on tone="cyan" hint="A/B — hold two complete states including alloy mode. Ctrl+C / Ctrl+V of plugin state works between FL Mixer slots.">{ab}</Btn>
              <Btn onClick={() => { setValues({ ...DEFAULTS }); setMode(0); }} hint="INIT — reset every parameter to the reference 140 state.">INIT</Btn>
              <Btn on={freeze} tone="amber" onClick={() => setFreeze(!freeze)} hint="FREEZE — mutes the tank input and pins feedback at 0.99995. Infinite sustain with no runaway gain. Designed for automation clips.">FREEZE</Btn>
              <Btn on={bypass} tone="rose" onClick={() => setBypass(!bypass)} hint="BYPASS — true bypass of the wet path, dry passes through unchanged.">BYPASS</Btn>
            </div>
          </div>

          {/* hint bar */}
          <div className="flex h-7 items-center gap-2 border-b border-white/10 bg-black/40 px-4">
            <span className="font-mono text-[8.5px] tracking-widest text-cyan-400/60">HINT</span>
            <span className="truncate font-mono text-[10px] text-zinc-500">
              {hint ?? 'Drag knobs vertically · Shift = fine · Double-click = default · Drag the nodes on the decay display · Space = play/stop'}
            </span>
          </div>

          {/* alloy modes */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-600">ALLOY</span>
            <div className="flex flex-wrap gap-1">
              {MODES.map((m, i) => (
                <button
                  key={m.name}
                  onClick={() => setMode(i)}
                  onMouseEnter={() => setHint(`${m.name} — ${m.blurb}`)}
                  onMouseLeave={() => setHint(null)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] transition ${
                    mode === i
                      ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_16px_-6px_rgba(126,211,255,0.9)]'
                      : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Btn on={trueStereo} onClick={() => setTrueStereo(!trueStereo)} hint="TRUE STEREO — independent diffuser chains per channel feeding their own tank half. Defeats the flat, 2-D tail you get from summing to mono. Disable for authentic vintage behaviour.">TRUE ST</Btn>
              <span className="font-mono text-[9px] text-zinc-600">{MODES[mode].name}</span>
            </div>
          </div>

          {/* displays */}
          <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_212px]">
            <div className="space-y-3">
              <DecayCurve values={values} mode={mode} onChange={set} onHint={setHint} height={252} />
              <DecayScope onHint={setHint} height={86} />
            </div>
            <div className="flex flex-col gap-3">
              <div className="h-[118px]">
                <PlateField size={values.size} modDepth={values.modDepth} onHint={setHint} />
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-white/10 bg-[#0a0d12] p-3">
                <div className="h-full">
                  <Meters />
                </div>
                <div className="flex flex-1 flex-col justify-between font-mono text-[9px] leading-relaxed text-zinc-600">
                  <div>
                    <div className="text-zinc-500">SR <span className="text-cyan-300/80">{(engine.sampleRate / 1000).toFixed(1)}k</span></div>
                    <div className="text-zinc-500">PDC <span className="text-cyan-300/80">0.0 ms</span></div>
                    <div className="text-zinc-500">LOAD <span className="text-cyan-300/80">{load.toFixed(2)}%</span></div>
                  </div>
                  <div>
                    <div className="text-zinc-500">LOOP</div>
                    <div className="text-cyan-300/80">{(725.5 * values.size).toFixed(0)} ms</div>
                    <div className="mt-1 text-zinc-500">TAPS</div>
                    <div className="text-cyan-300/80">14 interior</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* knob decks */}
          <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2 xl:grid-cols-4">
            {GROUPS.map((g) => (
              <div key={g.title} className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,#0f1319_0%,#0a0d12_100%)] p-3">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-[3px] w-[3px] rounded-full" style={{ background: g.accent }} />
                  <span className="font-mono text-[9px] tracking-[0.2em]" style={{ color: g.accent }}>{g.title}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                <div className="flex flex-wrap justify-around gap-y-3">
                  {g.ids.map((id) => (
                    <Knob
                      key={id}
                      spec={PARAMS[id]}
                      value={values[id]}
                      onChange={(v) => { void boot(); set(id, v); }}
                      onHint={setHint}
                      accent={g.accent}
                      size={g.ids.length > 4 ? 54 : 60}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* tempo-synced pre-delay */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-2.5">
            <span
              className="font-mono text-[9px] tracking-[0.18em] text-zinc-600"
              onMouseEnter={() => setHint('PRE-DELAY SYNC — snap the pre-delay to a note division of the project tempo. Rhythmic pre-delay is the single fastest way to make a plate sit in a busy arrangement.')}
              onMouseLeave={() => setHint(null)}
            >
              PRE-DELAY SYNC
            </span>
            <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1">
              <span className="font-mono text-[9px] text-zinc-600">BPM</span>
              <input
                type="number"
                value={bpm}
                min={40}
                max={300}
                onChange={(e) => setBpm(Math.min(300, Math.max(40, Number(e.target.value) || 120)))}
                className="w-[46px] bg-transparent font-mono text-[10px] text-cyan-200 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {DIVS.map(([label, f]) => {
                const ms = Math.min(250, (60000 / bpm) * f);
                const active = Math.abs(values.predelay - ms) < 0.35;
                return (
                  <button
                    key={label}
                    onClick={() => { void boot(); set('predelay', ms); }}
                    onMouseEnter={() => setHint(`${label} @ ${bpm} BPM = ${ms.toFixed(1)} ms pre-delay`)}
                    onMouseLeave={() => setHint(null)}
                    className={`rounded-md border px-2 py-1 font-mono text-[9px] tracking-[0.1em] transition ${
                      active ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <span className="ml-auto font-mono text-[9px] tracking-widest text-zinc-600">
              CURRENT <span className="text-cyan-300/80">{values.predelay.toFixed(1)} ms</span>
            </span>
          </div>

          {/* transport */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-black/30 px-4 py-3">
            <button
              onClick={togglePlay}
              className={`rounded-md border px-4 py-2 font-mono text-[10px] tracking-[0.18em] transition ${
                playing
                  ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_-6px_rgba(126,211,255,0.9)]'
                  : 'border-white/15 bg-white/[0.04] text-zinc-300 hover:border-cyan-400/40'
              }`}
            >
              {playing ? '■ STOP' : started ? '▶ PLAY' : '▶ START ENGINE'}
            </button>
            <span className="font-mono text-[9px] tracking-[0.18em] text-zinc-600">SOURCE</span>
            <div className="flex flex-wrap gap-1">
              {SOURCES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => void pickSource(s.id)}
                  onMouseEnter={() => setHint(s.id === 'click' ? 'PINK CLICK — Dattorro\'s recommended test signal. A click with a pink spectrum reveals flutter, ringing and density problems instantly.' : `TEST SOURCE — ${s.label}`)}
                  onMouseLeave={() => setHint(null)}
                  className={`rounded-md border px-2.5 py-1.5 font-mono text-[9px] tracking-[0.12em] transition ${
                    source === s.id
                      ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200'
                      : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[9px] tracking-[0.12em] transition ${
                  source === 'file' ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-200' : 'border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-300'
                }`}
              >
                LOAD FILE
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await boot();
                  await engine.loadFile(f);
                  setSource('file');
                  engine.play();
                  setPlaying(true);
                }}
              />
            </div>
            <div className="ml-auto flex items-center gap-3 font-mono text-[9px] tracking-widest text-zinc-600">
              <span>DATTORRO FIG-8 TANK</span>
              <span className="text-zinc-700">|</span>
              <span className={started ? 'text-emerald-400/80' : 'text-zinc-600'}>{started ? 'DSP ONLINE' : 'DSP IDLE'}</span>
            </div>
          </div>
        </div>

        {/* ── engineering dossier ── */}
        <DocsPanel />

        <p className="pb-6 text-center font-mono text-[9px] tracking-widest text-zinc-700">
          ARGENTUM PLATE — REFERENCE MODEL RUNNING IN AN AUDIOWORKLET · SHIPPING TARGET: JUCE / VST3 / WINDOWS x64 / AVX2
        </p>
      </div>
    </div>
  );
}
