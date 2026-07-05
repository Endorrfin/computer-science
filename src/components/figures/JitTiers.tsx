// [fig] jit-tiers — ch.11. How a modern engine (V8, the one in ch.0's Node and
// every browser) runs your code through TIERS: start by interpreting bytecode
// instantly, watch which functions get hot, compile those to optimized machine
// code on ASSUMPTIONS, and bail back (deoptimize) the moment an assumption
// breaks. Trades startup speed for peak speed, adaptively. Palette (§7):
// interpreter/state = violet, fast/optimized = green, hot/control = orange,
// deopt/error = red.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

const TIERS = [
  { x: 40, label: "Interpreter", sub: "Ignition — bytecode", note: "instant start · slow run" },
  { x: 220, label: "Baseline JIT", sub: "Sparkplug", note: "quick compile · faster" },
  { x: 400, label: "Optimizing JIT", sub: "TurboFan", note: "slow compile · fastest" },
];

function Tier(i: number, active: boolean, tone: string) {
  const t = TIERS[i];
  return (
    <g key={i}>
      <rect
        x={t.x}
        y={90}
        width="150"
        height="72"
        rx="10"
        fill={active ? `color-mix(in srgb, ${tone} 20%, var(--surface))` : "var(--s2)"}
        stroke={active ? tone : "var(--line)"}
        strokeWidth={active ? 3 : 1.5}
      />
      <text x={t.x + 75} y={116} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="var(--tx)">{t.label}</text>
      <text x={t.x + 75} y={134} textAnchor="middle" fontSize="10.5" fill="var(--tx2)" fontFamily="var(--font-mono)">{t.sub}</text>
      <text x={t.x + 75} y={152} textAnchor="middle" fontSize="10" fill="var(--tx2)">{t.note}</text>
    </g>
  );
}

function Scene({ step }: { step: number }) {
  // active tier per step: 0 interpret · 1 baseline · 2/3/5 optimizing · 4 deopt→interpreter
  const active = step === 0 ? 0 : step === 1 ? 1 : step === 4 ? 0 : 2;
  const optActive = step === 2 || step === 3 || step === 5;
  const optTone = optActive ? "var(--sem-ok)" : "var(--sem-control)";
  const baseTone = step === 1 ? "var(--sem-control)" : "var(--sem-state)";
  const tone = (i: number) => (i === 2 ? optTone : i === 1 ? baseTone : "var(--sem-state)");
  const hot = step >= 1;
  const assumeBroken = step === 4;

  return (
    <g fontFamily="var(--font-body)">
      <defs>
        <marker id="jtA" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--tx2)" /></marker>
        <marker id="jtBad" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-err)" /></marker>
      </defs>

      <text x="40" y="42" fontSize="12" fill="var(--tx2)">source → bytecode, then up the tiers as a function gets hot →</text>

      {/* speed axis */}
      <line x1="40" y1="76" x2="550" y2="76" stroke="var(--line)" strokeDasharray="3 3" />
      <text x="40" y="70" fontSize="9.5" fill="var(--sem-state)">slower</text>
      <text x="518" y="70" fontSize="9.5" fill="var(--sem-ok)">faster</text>

      {[0, 1, 2].map((i) => Tier(i, i === active, tone(i)))}

      {/* forward arrows between tiers */}
      <line x1="190" y1="126" x2="218" y2="126" stroke="var(--tx2)" strokeWidth="1.5" markerEnd="url(#jtA)" />
      <line x1="370" y1="126" x2="398" y2="126" stroke="var(--tx2)" strokeWidth="1.5" markerEnd="url(#jtA)" />

      {/* hotness counter */}
      <text x="220" y="200" fontSize="11.5" fill={hot ? "var(--sem-control)" : "var(--tx2)"}>
        call counter: {step === 0 ? "37 — still cold" : step === 1 ? "1,240 — warming up" : "10,412 🔥 hot"}
      </text>

      {/* assumption chip */}
      <g>
        <rect x="400" y="188" width="150" height="26" rx="6"
          fill={assumeBroken ? "color-mix(in srgb, var(--sem-err) 18%, var(--surface))" : "color-mix(in srgb, var(--sem-ok) 14%, var(--surface))"}
          stroke={assumeBroken ? "var(--sem-err)" : "var(--sem-ok)"} />
        <text x="475" y="205" textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx)">
          {assumeBroken ? "x is a string ✗" : "assume: x is int ✓"}
        </text>
      </g>

      {/* deopt arrow on the deopt step */}
      {step === 4 && (
        <>
          <path d="M 400 100 Q 250 30 120 84" fill="none" stroke="var(--sem-err)" strokeWidth="2.5" markerEnd="url(#jtBad)" />
          <text x="250" y="34" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--sem-err)">deoptimize — bail out!</text>
        </>
      )}
    </g>
  );
}

const FRAMES: Frame[] = [
  { caption: "Every function starts interpreted: source is compiled to bytecode once and the interpreter (Ignition) runs it. Startup is instant — no waiting for a compiler — but each bytecode op is comparatively slow.", render: () => <Scene step={0} /> },
  { caption: "The engine counts calls. Once a function is warm, a fast BASELINE compiler (Sparkplug) turns its bytecode into machine code almost immediately — a quick, un-clever compile that's already faster than interpreting, without the cost of full optimization.", render: () => <Scene step={1} /> },
  { caption: "When a function gets truly hot it graduates to the OPTIMIZING JIT (TurboFan), which spends real time generating fast code specialized to what it has SEEN — e.g. assuming x is always a small integer, so it can skip type checks and inline aggressively.", render: () => <Scene step={2} /> },
  { caption: "Now the hot function runs as fully optimized native code — often 10–100× faster than interpreting. All of that speed rests on the assumptions the optimizer baked in.", render: () => <Scene step={3} /> },
  { caption: "Then you call it with a string. The 'x is int' assumption is now false, so the optimized code is invalid — the engine DEOPTIMIZES: throws the machine code away and drops back to a lower tier. This is why megamorphic, type-unstable code stays slow.", render: () => <Scene step={4} /> },
  { caption: "With the new information it can re-optimize (perhaps for both types). This adaptive climb — interpret, baseline-compile, optimize on assumptions, deopt when wrong — is how JITs beat both pure interpreters and pure ahead-of-time compilers on real, changing workloads. (Modern V8 adds a fourth mid-tier, Maglev, between Sparkplug and TurboFan.)", render: () => <Scene step={5} /> },
];

export default function JitTiers() {
  return <FigureStepper title="jit-tiers: interpret → optimize on assumptions → deoptimize" figKey="jit-tiers" viewBox="0 0 580 230" accent="#A3E635" frames={FRAMES} />;
}
