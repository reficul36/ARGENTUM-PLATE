export interface Section { h: string; body: string[]; }

/* ─────────────── 1. WHY PLATE ─────────────── */
export const WHY: Section[] = [
  {
    h: 'The decision: one reverb, done properly',
    body: [
      'A plugin that tries to be hall + room + plate + spring is four mediocre reverbs sharing a GUI. ARGENTUM is a plate — an electromechanical EMT 140-class reverberator — and every design decision below serves that one target.',
      'Plate is also the highest-leverage choice for a producer: it is the default reverb for vocals, snares, and any source that needs depth without the "which room am I in?" question a hall forces on the listener.',
    ],
  },
  {
    h: 'What a real plate actually does (the four measurable behaviours)',
    body: [
      '1 · INSTANT ECHO DENSITY. A 2 m × 1 m sheet of cold-rolled steel is small, and bending-wave velocity in a plate rises with √f. High frequencies have already reflected dozens of times before the low frequencies complete a single traverse. Perceptually the reverb is "fully mixed" at t = 0 — there are no discrete early reflections to hear.',
      '2 · FREQUENCY-DEPENDENT DECAY, AND IT IS DARK. A well-maintained EMT 140 decays in under 1 second at 10 kHz at *any* damper position. That is the single most misunderstood fact about plates: they are bright in tone but short in HF decay. This is why a plate can be pushed loud in a mix without turning sibilance into hiss.',
      '3 · LOW FREQUENCIES BOOM. The fundamental bending modes of the plate ring far longer than the mids. Authentic — and the exact reason every plate on every classic record was high-passed on the return desk.',
      '4 · CONSTANT MODAL DENSITY VERSUS FREQUENCY. Unlike a 3-D room (where mode count grows with f²), a plate is a 2-D resonator: mode density is essentially flat with frequency. This is why plates sound "even" and why the delay-network approach models them so well.',
      'And the counter-intuitive one: a well-tuned plate is NOT metallic. There is a faint sheen up top, but overall it is smoother than most digital reverbs. Metallic ring is a defect, not a feature.',
    ],
  },
  {
    h: 'Who does it best, and what to steal',
    body: [
      'VALHALLA PLATE (Sean Costello) — the benchmark. What it gets right: modal density exposed as SIZE rather than a fake "room dimension"; twelve alloy models instead of one; and modulation designed specifically to remove metallic artefacts without producing audible pitch change (0.2–0.5 Hz, shallow). ARGENTUM adopts all three ideas.',
      'UAD EMT 140 — best-in-class attack transient and authentic damper behaviour, but the tail is widely criticised as "2-D". Fix: true-stereo injection into the tank halves plus decorrelated modulators, so the tail has front-to-back depth as well as width.',
      'ABBEY ROAD PLATES (Waves) — captures the desk-and-tape colouration around the plate. Worth stealing conceptually: a plate never existed in isolation, it always had a send EQ and a low cut. So the low cut / high cut here live on the wet bus, pre-fader, exactly where the return channel used to be.',
      'FABFILTER PRO-R — not a plate, but the GUI benchmark. Decay Rate EQ is the correct paradigm: you should draw the RT60 curve, not guess at damping percentages. ARGENTUM\'s main display is an analytic RT60-versus-frequency plot derived from the actual feedback transfer function.',
    ],
  },
];

/* ─────────────── 2. WHAT TO AVOID ─────────────── */
export interface Pitfall { bad: string; why: string; fix: string; }

export const PITFALLS: Pitfall[] = [
  {
    bad: 'Metallic ringing / flutter in the tail',
    why: 'Too few diffusion stages, or coefficients that let the tank recirculate as identifiable periodic events. The Ecoplate\'s characteristic ring is exactly this. Digital plates inherit it when designers chase "fast density" with short combs.',
    fix: 'Four series input lattices (142/107/379/277 @ 29.761 kHz) decorrelate the input before it ever reaches the tank, plus two modulated all-passes inside the tank. Coprime lengths keep resonances from stacking. Diffusion gains stay at 0.75/0.625 — high enough for instant density, below the buzz threshold.',
  },
  {
    bad: 'Chorusing on sustained material',
    why: 'The standard "cure" for ringing is heavy modulation. Push depth past ~60% on a pad or a solo cello and the pitch modulation becomes obvious — you have traded a metallic reverb for a seasick one.',
    fix: 'Hybrid modulator: 70% sine at 0.2–0.5 Hz + 30% band-limited random walk, with 137.5° phase offset between the two tank halves. Randomness breaks up periodic pitch movement so a given depth de-metallises more per unit of audible warble. Depth defaults to 28%, and 0% is physically correct.',
  },
  {
    bad: 'Low-mid buildup / boomy mud',
    why: 'A bass-multiply shelf inside a feedback loop multiplies the loop gain. If decayG⁴ · bass² ≥ 1 the low band never decays; even at 0.98 you get a 30-second LF drone that eats the mix. This is the most common complaint levelled at plate plugins with a "bass multiply" control.',
    fix: 'Hard clamp: bass ≤ 0.9994 / decayG². The clamp is enforced in the DSP and mirrored in the RT60 display, so the curve you see is the decay you get. A default 12 dB/oct wet-bus low cut at 90 Hz backs it up.',
  },
  {
    bad: 'Sibilance turning into hiss',
    why: 'Digital reverbs default to flat, long HF decay because it sounds impressive in solo. In a mix it becomes a permanent "ssss" cloud on every vocal.',
    fix: 'HF damping inside the loop (not just an output EQ) so high frequencies lose energy on every pass, matching plate physics. Default 6.2 kHz. Plus a 6 dB/oct wet-bus high cut.',
  },
  {
    bad: 'Zipper noise and clicks on automation',
    why: 'FL Studio automation clips can move a parameter every buffer. Recomputing filter coefficients or delay lengths per block without smoothing produces steps; changing a delay length discontinuously produces a click.',
    fix: 'Every coefficient runs through a one-pole smoother (~20 ms). Delay taps are fractional with linear interpolation, so SIZE sweeps glide like tape rather than clicking.',
  },
  {
    bad: 'Denormal CPU spikes on long tails',
    why: 'When the tail decays below ~1e-38 the x87/SSE units drop into denormal handling and CPU cost can jump by an order of magnitude — audible as crackle when the reverb is nearly silent, which is the worst possible moment.',
    fix: 'FTZ + DAZ set on the audio thread, plus an alternating ±1e-20 DC injection at both tank inputs. Cost: two adds per sample.',
  },
  {
    bad: 'A "2-D" tail',
    why: 'Summing the input to mono before the tank (as the original 1997 topology does) discards the stereo field, and a single modulator pair correlates both halves. Result: wide but flat, with no front-to-back depth.',
    fix: 'Optional true-stereo injection — independent 4-stage diffuser chains per channel feeding their own tank half, decorrelated modulators, M/S width on the output. OSMIUM mode keeps the authentic mono-in behaviour when you want it.',
  },
  {
    bad: 'Wet level swamping the source',
    why: 'Plates are dense from sample zero, so they mask transients faster than a hall does.',
    fix: 'Envelope-follower ducking (4 ms attack / 180 ms release) on the wet bus, and equal-power dry/wet so 50% is genuinely -3 dB on both legs.',
  },
];

/* ─────────────── 3. TOPOLOGY ─────────────── */
export const TOPOLOGY: Section[] = [
  {
    h: 'Signal flow',
    body: [
      'IN → pre-delay (0–250 ms) → input bandwidth LP (0.9995) → 4 × series lattice all-pass [142, 107, 379, 277] → figure-of-eight tank.',
      'Each tank half: cross-feed × decay → modulated all-pass [672 / 908 ± excursion] → delay [4453 / 4217] → HF damping one-pole → bass-multiply shelf → × decay → all-pass [1800 / 2656] → (optional density stage) → delay [3720 / 3163] → cross-feed to the opposite half.',
      'Output is a weighted 7-tap sum per channel pulled from *inside* the tank (Dattorro Table 2) — never from the tank output. Those interior taps are what make the response read as a plate rather than a generic FDN.',
      'All lengths are quoted at the paper\'s 29 761 Hz and are rescaled by (fs / 29761) × SIZE at runtime, with fractional interpolated reads.',
    ],
  },
  {
    h: 'Why this topology and not an FDN',
    body: [
      'A 16 × 16 Hadamard FDN gives you higher density per sample of memory, but it also gives you a flat, characterless tail and a nasty tendency to ring at the eigenfrequencies of the mixing matrix. The Griesinger figure-of-eight is asymmetric by design: the two halves have different delay lengths and different all-pass characters, so the impulse response never becomes periodic.',
      'It is also cheap: ~40 multiply-adds per sample per channel. The whole plate runs at roughly 0.4% of one core at 48 kHz on a modern x64 CPU.',
    ],
  },
];

/* ─────────────── 4. CODE ─────────────── */
export interface Snippet { title: string; lang: string; sub: string; code: string; }

export const SNIPPETS: Snippet[] = [
  {
    title: 'Denormal protection — set once per audio callback (Windows x64)',
    lang: 'cpp',
    sub: 'Without this a 20-second tail can cost 10× CPU as it fades out. MSVC does not enable FTZ/DAZ for you.',
    code: `#include <immintrin.h>

struct ScopedNoDenormals
{
    ScopedNoDenormals() noexcept
        : saved (_mm_getcsr())
    {
        // FTZ (flush-to-zero) + DAZ (denormals-are-zero)
        _mm_setcsr (saved | 0x8040);
    }
    ~ScopedNoDenormals() noexcept { _mm_setcsr (saved); }
    const unsigned int saved;
};

void PlateProcessor::processBlock (juce::AudioBuffer<float>& buf,
                                   juce::MidiBuffer&) override
{
    ScopedNoDenormals guard;          // <- first line, always
    juce::ScopedNoDenormals juceGuard; // belt and braces on all hosts
    ...
}`,
  },
  {
    title: 'The lattice all-pass, scalar reference',
    lang: 'cpp',
    sub: 'Two-multiply lattice (Dattorro §1.3.3). H(z) = (z^-M - g) / (1 - g·z^-M). Fractional read for the modulated stages.',
    code: `struct DelayLine
{
    std::vector<float> buf;   // power-of-two length
    uint32_t mask = 0, w = 0;

    inline void  write (float v) noexcept { buf[w] = v; w = (w + 1) & mask; }
    inline float read  (float d) const noexcept   // d >= 1, fractional
    {
        const float  p = float (w) - d;
        const int32_t i = (int32_t) std::floor (p);
        const float  f = p - float (i);
        const float  a = buf[uint32_t (i)     & mask];
        const float  b = buf[uint32_t (i + 1) & mask];
        return a + (b - a) * f;                    // linear interp
    }
};

inline float allpass (DelayLine& dl, float d, float g, float x) noexcept
{
    const float y = dl.read (d);
    const float v = x + g * y;
    dl.write (v);
    return y - g * v;
}`,
  },
  {
    title: 'AVX2 — the four input diffusers are serial, so vectorise across taps instead',
    lang: 'cpp',
    sub: 'A recursive all-pass cannot be vectorised along time. What IS vectorisable: the 7-tap interior output accumulator, run for L and R simultaneously — 14 fractional reads collapse into 2 AVX2 gathers + FMAs.',
    code: `// Interior tap accumulator, Dattorro Table 2, both channels at once.
// idx[]  : 8 integer read indices (already masked)
// frac[] : 8 interpolation fractions
// sgn[]  : 8 tap signs (+1 / -1), 0.6f folded in
inline void tapSum8 (const float* __restrict base,
                     const __m256i idx, const __m256 frac,
                     const __m256 sgn, float& out) noexcept
{
    const __m256i idx1 = _mm256_add_epi32 (idx, _mm256_set1_epi32 (1));
    const __m256  a    = _mm256_i32gather_ps (base, idx,  4);
    const __m256  b    = _mm256_i32gather_ps (base, idx1, 4);
    // lerp: a + (b - a) * frac
    const __m256  v    = _mm256_fmadd_ps (_mm256_sub_ps (b, a), frac, a);
    const __m256  s    = _mm256_mul_ps (v, sgn);

    // horizontal add of 8 lanes
    __m128 lo = _mm256_castps256_ps128 (s);
    __m128 hi = _mm256_extractf128_ps  (s, 1);
    lo = _mm_add_ps (lo, hi);
    lo = _mm_hadd_ps (lo, lo);
    lo = _mm_hadd_ps (lo, lo);
    _mm_store_ss (&out, lo);
}

// Runtime dispatch — never ship an unconditional AVX2 binary.
// FL Studio users are on everything from a 2012 i5 to a 9950X.
const bool useAVX2 = juce::SystemStats::hasAVX2();`,
  },
  {
    title: 'Coefficient smoothing + the bass-multiply stability clamp',
    lang: 'cpp',
    sub: 'This clamp is the difference between a usable BASS control and a plugin that drones. Derived from loop gain: decayG⁴ · bass² < 1.',
    code: `void PlateProcessor::updateCoefficients (double fs) noexcept
{
    const double sizeScaled = 21589.0 * size / 29761.0;   // full loop, seconds
    const double decayG = std::pow (10.0, -0.75 * sizeScaled
                                          / std::max (0.05f, rt60));
    decaySm.setTargetValue ((float) juce::jmin (0.99995, decayG));

    // hard stability clamp — mirrored 1:1 in the GUI's RT60 curve
    const double bassLimit = 0.9994 / (decayG * decayG);
    bassSm.setTargetValue ((float) juce::jmin ((double) bassMul, bassLimit));

    dampSm.setTargetValue (std::exp (-2.0 * M_PI * dampHz * modeHfMul / fs));

    // 20 ms ramps: FL automation clips move params every 64 samples
    for (auto* s : { &decaySm, &bassSm, &dampSm, &mixSm, &widthSm })
        s->reset (fs, 0.02);
}`,
  },
  {
    title: 'JUCE — parameter layout with FL-friendly automation',
    lang: 'cpp',
    sub: 'Every param gets a stable ID string, a skewed range that feels right under a mouse, and a text/value pair FL can display in its automation clip editor.',
    code: `juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
{
    using P  = juce::AudioParameterFloat;
    using ID = juce::ParameterID;
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> p;

    auto skew = [] (float lo, float hi, float mid)
    {
        auto r = juce::NormalisableRange<float> (lo, hi);
        r.setSkewForCentre (mid);
        return r;
    };

    p.push_back (std::make_unique<P> (ID {"predelay", 1}, "Pre-Delay",
                 juce::NormalisableRange<float> (0.f, 250.f), 14.f,
                 juce::AudioParameterFloatAttributes().withLabel ("ms")));

    p.push_back (std::make_unique<P> (ID {"decay", 1}, "Decay",
                 skew (0.2f, 30.f, 2.5f), 2.4f,
                 juce::AudioParameterFloatAttributes().withLabel ("s")));

    p.push_back (std::make_unique<P> (ID {"size", 1}, "Size",
                 skew (25.f, 250.f, 100.f), 100.f,
                 juce::AudioParameterFloatAttributes().withLabel ("%")));
    ...
    return { p.begin(), p.end() };
}

// Sample-accurate automation: split the block on parameter changes so an
// FL automation clip drawn as a staircase renders as a staircase.
void processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) override
{
    ScopedNoDenormals guard;
    int pos = 0;
    for (const auto meta : m)                      // param + note events
    {
        const int n = meta.samplePosition - pos;
        if (n > 0) renderSlice (b, pos, n);
        applyEvent (meta);
        pos = meta.samplePosition;
    }
    renderSlice (b, pos, b.getNumSamples() - pos);
}`,
  },
  {
    title: 'FL Studio specifics — latency, resizing, state',
    lang: 'cpp',
    sub: 'These four things are what separate a plugin that "works in FL" from one that feels native.',
    code: `// 1. PDC. This plate is zero-latency: pre-delay is a user effect, not
//    algorithmic latency. Report honestly or FL will slide the track.
setLatencySamples (0);

// 2. Resizing. FL redraws plugin windows on a shared timer; an
//    OpenGL context per instance will stall the UI thread on some
//    Windows GPU drivers. Use software rendering with a cached
//    background image, and constrain to an aspect ratio.
editor->setResizable (true, true);
editor->getConstrainer()->setFixedAspectRatio (960.0 / 620.0);
editor->setResizeLimits (760, 490, 1920, 1240);

// 3. State. FL copy-pastes plugin state constantly (Ctrl+C on a
//    Mixer slot). Keep getStateInformation() allocation-free-ish
//    and version it so old projects keep loading.
void getStateInformation (juce::MemoryBlock& dest) override
{
    auto state = apvts.copyState();
    state.setProperty ("schema", 2, nullptr);
    state.setProperty ("mode",   (int) alloyMode, nullptr);
    juce::MemoryOutputStream os (dest, false);
    state.createXml()->writeTo (os);
}

// 4. Wrapper safety. FL's VST3 wrapper may call processBlock with
//    zero channels during scanning, and with a buffer size that
//    changes without a prepareToPlay on some versions.
if (buffer.getNumChannels() == 0 || buffer.getNumSamples() == 0) return;
if (buffer.getNumSamples() > preparedBlockSize) prepareToPlay (fs, buffer.getNumSamples());`,
  },
];

/* ─────────────── 5. FL WORKFLOW ─────────────── */
export const FLNOTES: Section[] = [
  {
    h: 'Send-bus first',
    body: [
      'On a Mixer send track set MIX to 100% and drive the plate from FL\'s send knob. The GUI detects a fully-wet state and greys the dry path so you can see at a glance that you are in send mode.',
      'On an insert (guitar, keys), leave MIX around 25–35% and use DUCK instead of automating the send.',
    ],
  },
  {
    h: 'Automation that behaves',
    body: [
      'Right-click any knob → Create automation clip. Because every coefficient is ramped over 20 ms and the delay taps are fractional, you can draw a staircase SIZE automation and it will glide like varispeed tape rather than clicking.',
      'DECAY is solved from loop time, so automating SIZE does not change your RT60 — the two controls are genuinely orthogonal. That is unusual and it matters when you are automating a riser.',
      'FREEZE is a binary parameter designed for automation clips: it mutes the tank input and pins the feedback at 0.99995, so you can hold a chord under a drop indefinitely with no runaway gain.',
    ],
  },
  {
    h: 'Presets and state',
    body: [
      'Presets are plain state, so Ctrl+C / Ctrl+V between Mixer slots works. A/B holds two full states including alloy mode. Double-click any knob to return it to default; Shift-drag for fine resolution; mouse wheel for one-step nudges.',
      'The hint bar at the top of the window mirrors FL\'s own hint bar behaviour — hover anything and read what it does without leaving the mouse.',
    ],
  },
];

export const REFS: string[] = [
  'Dattorro, J. — "Effect Design Part 1: Reverberator and Other Filters", JAES vol. 45 no. 9, Sept 1997 (figure-of-eight topology, Tables 1 & 2).',
  'Dattorro, J. — "Effect Design Part 2: Delay-Line Modulation and Chorus", JAES vol. 45 no. 10, 1997 (all-pass interpolation for modulated taps).',
  'Griesinger, D. — Lexicon 224 / 480L design notes on plate-class recirculating networks.',
  'Costello, S. (Valhalla DSP) — "The Physics and Psychophysics of Plates" and "ValhallaPlate: The Reverb Modes".',
  'EMT 140 service documentation — damper mechanics and measured RT60 versus frequency.',
];
