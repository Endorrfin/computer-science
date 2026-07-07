// [fig] halting-paradox — Turing's 1936 proof that no program can decide halting,
// told as a 6-frame comic of the diagonalization / self-reference argument. We
// ASSUME a perfect decider H(P,x) exists (frame 1), use it to build a
// contrarian D that does the opposite of what H predicts about D itself (frame
// 2), then run D on its own source (frame 3). Both possible answers explode into
// contradiction (frames 4 & 5, drawn as mirror images so the symmetry reads), so
// the assumption must be false: H cannot exist (frame 6). Same trick as the liar
// paradox ("this sentence is false") and Cantor's diagonal. No GIFs (§6):
// stepped SVG frames via FigureStepper. Palette (§7): data = cyan, control =
// orange, state = violet, contradiction = red, resolution = green.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

// Shared geometry so H and D stay put across frames.
const H = { x: 250, y: 90, w: 220, h: 96 };
const D = { x: 250, y: 250, w: 220, h: 120 };

function Box({
  x,
  y,
  w,
  h,
  tone,
  dim,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: string;
  dim?: boolean;
}): ReactNode {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={12}
      fill={dim ? "var(--s2)" : `color-mix(in srgb, ${tone} 16%, var(--surface))`}
      stroke={dim ? "var(--line)" : tone}
      strokeWidth={dim ? 1.5 : 2.5}
    />
  );
}

// The H decider box — kept in a fixed spot every frame.
function HBox({ dim }: { dim?: boolean }): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <Box x={H.x} y={H.y} w={H.w} h={H.h} tone="var(--sem-control)" dim={dim} />
      <text x={H.x + H.w / 2} y={H.y + 26} textAnchor="middle" fontSize="15" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">
        H(P, x)
      </text>
      <text x={H.x + H.w / 2} y={H.y + 47} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        the assumed halting-decider
      </text>
      <text x={H.x + H.w / 2} y={H.y + 68} textAnchor="middle" fontSize="10.5" fill={dim ? "var(--tx3)" : "var(--sem-control)"} fontFamily="var(--font-mono)">
        always halts · never wrong
      </text>
      <text x={H.x + H.w / 2} y={H.y + 85} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        answers "HALTS" or "LOOPS"
      </text>
    </g>
  );
}

// A little verdict pill used to show what H returns.
function Verdict({ x, y, text, tone }: { x: number; y: number; text: string; tone: string }): ReactNode {
  return (
    <g fontFamily="var(--font-mono)">
      <rect x={x} y={y} width={92} height={26} rx={13} fill={`color-mix(in srgb, ${tone} 18%, var(--surface))`} stroke={tone} strokeWidth={1.5} />
      <text x={x + 46} y={y + 17} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--tx)">
        {text}
      </text>
    </g>
  );
}

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="hpArr" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--tx2)" />
      </marker>
      <marker id="hpArrData" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-data)" />
      </marker>
      <marker id="hpArrErr" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-err)" />
      </marker>
    </defs>
  );
}

// ── Frame 1 ────────────────────────────────────────────────────────────────
function f1(): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <Defs />
      <text x={360} y={34} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">
        Step 0 — assume the impossible, then break it
      </text>
      {/* inputs into H */}
      <text x={70} y={H.y + 46} fontSize="12" fontFamily="var(--font-mono)" fill="var(--sem-data)">
        any program P
      </text>
      <text x={70} y={H.y + 66} fontSize="12" fontFamily="var(--font-mono)" fill="var(--sem-data)">
        any input x
      </text>
      <line x1={168} y1={H.y + 48} x2={H.x - 6} y2={H.y + 48} stroke="var(--sem-data)" strokeWidth={1.5} markerEnd="url(#hpArrData)" />
      <HBox />
      {/* outputs */}
      <line x1={H.x + H.w + 6} y1={H.y + 34} x2={H.x + H.w + 40} y2={H.y + 34} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />
      <Verdict x={H.x + H.w + 44} y={H.y + 21} text="HALTS" tone="var(--sem-ok)" />
      <line x1={H.x + H.w + 6} y1={H.y + 62} x2={H.x + H.w + 40} y2={H.y + 62} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />
      <Verdict x={H.x + H.w + 44} y={H.y + 49} text="LOOPS" tone="var(--sem-state)" />
      <text x={360} y={330} textAnchor="middle" fontSize="12" fill="var(--tx2)">
        Suppose such an oracle H could be written. Everything below follows from that one supposition.
      </text>
    </g>
  );
}

// ── Frame 2 ────────────────────────────────────────────────────────────────
function f2(): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <Defs />
      <text x={360} y={34} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">
        Step 1 — build a troublemaker D that does the OPPOSITE
      </text>
      <HBox dim />
      {/* D box */}
      <Box x={D.x} y={D.y} w={D.w} h={D.h} tone="var(--accent)" />
      <text x={D.x + D.w / 2} y={D.y + 26} textAnchor="middle" fontSize="15" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">
        D(P)
      </text>
      <text x={D.x + D.w / 2} y={D.y + 47} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
        1. ask H(P, P)
      </text>
      <text x={D.x + D.w / 2} y={D.y + 66} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
        2. then flip the answer
      </text>
      {/* D calls H */}
      <line x1={D.x + D.w / 2} y1={D.y - 6} x2={H.x + H.w / 2} y2={H.y + H.h + 6} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />
      <text x={D.x + D.w / 2 + 10} y={(D.y + H.y + H.h) / 2 + 4} fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx2)">
        calls
      </text>
      {/* the explicit flip */}
      <g fontFamily="var(--font-mono)">
        <text x={112} y={D.y + 40} fontSize="11" fill="var(--sem-ok)">
          H says HALTS
        </text>
        <line x1={200} y1={D.y + 36} x2={230} y2={D.y + 96} stroke="var(--sem-err)" strokeWidth={2} markerEnd="url(#hpArrErr)" />
        <text x={112} y={D.y + 108} fontSize="11" fill="var(--sem-state)">
          H says LOOPS
        </text>
        <line x1={200} y1={D.y + 104} x2={230} y2={D.y + 44} stroke="var(--sem-err)" strokeWidth={2} markerEnd="url(#hpArrErr)" />
        <text x={D.x + D.w + 16} y={D.y + 44} fontSize="11" fontWeight={700} fill="var(--sem-state)">
          D loops ∞
        </text>
        <text x={D.x + D.w + 16} y={D.y + 108} fontSize="11" fontWeight={700} fill="var(--sem-ok)">
          D halts
        </text>
      </g>
      <text x={200} y={D.y + 72} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="var(--sem-err)">
        SWAP
      </text>
    </g>
  );
}

// ── Frame 3 ────────────────────────────────────────────────────────────────
function f3(): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <Defs />
      <text x={360} y={34} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">
        Step 2 — feed D its own source: run D(D)
      </text>
      <HBox dim />
      <Box x={D.x} y={D.y} w={D.w} h={D.h} tone="var(--accent)" />
      <text x={D.x + D.w / 2} y={D.y + 30} textAnchor="middle" fontSize="15" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">
        D(D)
      </text>
      <text x={D.x + D.w / 2} y={D.y + 52} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
        so it asks H(D, D):
      </text>
      <text x={D.x + D.w / 2} y={D.y + 72} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
        "does D halt on D?"
      </text>
      {/* self-reference loop */}
      <path
        d={`M ${D.x} ${D.y + D.h / 2} C ${D.x - 70} ${D.y + D.h / 2}, ${D.x - 70} ${D.y - 10}, ${D.x + D.w / 2 - 20} ${D.y - 6}`}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray="5 4"
        markerEnd="url(#hpArr)"
      />
      <text x={D.x - 66} y={D.y + D.h / 2 + 4} fontSize="10.5" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--accent)">
        D feeds itself
      </text>
      {/* the question */}
      <rect x={200} y={392} width={320} height={30} rx={8} fill="color-mix(in srgb, var(--accent) 14%, var(--surface))" stroke="var(--accent)" strokeWidth={1.5} />
      <text x={360} y={412} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--tx)">
        Self-reference: what can D(D) possibly do?
      </text>
    </g>
  );
}

// ── Frames 4 & 5 — mirror-image contradictions ──────────────────────────────
// A single parameterised builder so the two cases are provably parallel.
function contradiction(opts: { title: string; assume: string; hSaid: string; hTone: string; rule: string; forced: string; steps: string[] }): ReactNode {
  const cx = 360;
  return (
    <g fontFamily="var(--font-body)">
      <Defs />
      <text x={cx} y={34} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">
        {opts.title}
      </text>

      {/* assumption pill (top) */}
      <rect x={cx - 130} y={54} width={260} height={30} rx={8} fill="color-mix(in srgb, var(--accent) 14%, var(--surface))" stroke="var(--accent)" strokeWidth={1.5} />
      <text x={cx} y={74} textAnchor="middle" fontSize="12" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">
        {opts.assume}
      </text>

      {/* chain of forced steps, vertically centered */}
      <line x1={cx} y1={88} x2={cx} y2={118} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />

      {/* step 1: what H must have said */}
      <rect x={cx - 130} y={122} width={260} height={30} rx={8} fill={`color-mix(in srgb, ${opts.hTone} 16%, var(--surface))`} stroke={opts.hTone} strokeWidth={1.5} />
      <text x={cx} y={142} textAnchor="middle" fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--tx)">
        {opts.hSaid}
      </text>
      <line x1={cx} y1={156} x2={cx} y2={186} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />

      {/* step 2: D's flip rule */}
      <rect x={cx - 130} y={190} width={260} height={30} rx={8} fill="color-mix(in srgb, var(--accent) 12%, var(--surface))" stroke="var(--accent)" strokeWidth={1.5} />
      <text x={cx} y={210} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx)">
        {opts.rule}
      </text>
      <line x1={cx} y1={224} x2={cx} y2={254} stroke="var(--tx2)" strokeWidth={1.5} markerEnd="url(#hpArr)" />

      {/* step 3: forced actual behavior */}
      <rect x={cx - 130} y={258} width={260} height={30} rx={8} fill="color-mix(in srgb, var(--sem-err) 14%, var(--surface))" stroke="var(--sem-err)" strokeWidth={2} />
      <text x={cx} y={278} textAnchor="middle" fontSize="11.5" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">
        {opts.forced}
      </text>

      {/* the clash: assumed vs forced, drawn as a red collision */}
      <line x1={cx} y1={292} x2={cx} y2={322} stroke="var(--sem-err)" strokeWidth={2} markerEnd="url(#hpArrErr)" />
      <rect x={cx - 150} y={326} width={300} height={44} rx={10} fill="color-mix(in srgb, var(--sem-err) 20%, var(--surface))" stroke="var(--sem-err)" strokeWidth={2.5} />
      <text x={cx} y={346} textAnchor="middle" fontSize="12.5" fontWeight={700} fill="var(--sem-err)">
        ⚡ CONTRADICTION
      </text>
      <text x={cx} y={362} textAnchor="middle" fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx)">
        {opts.steps[0]}
      </text>

      {/* case label badge on the side */}
      <text x={cx} y={402} textAnchor="middle" fontSize="11" fill="var(--tx2)">
        {opts.steps[1]}
      </text>
    </g>
  );
}

function f4(): ReactNode {
  return contradiction({
    title: "Case A — suppose D(D) HALTS",
    assume: "assume:  D(D) halts",
    hSaid: 'so H(D,D) answered "HALTS"',
    hTone: "var(--sem-ok)",
    rule: "but D flips: on HALTS → D loops",
    forced: "∴ D(D) loops forever",
    steps: ["assumed halts, but is forced to loop", "The only other possibility is Case B →"],
  });
}

function f5(): ReactNode {
  return contradiction({
    title: "Case B — suppose D(D) LOOPS",
    assume: "assume:  D(D) loops",
    hSaid: 'so H(D,D) answered "LOOPS"',
    hTone: "var(--sem-state)",
    rule: "but D flips: on LOOPS → D halts",
    forced: "∴ D(D) halts",
    steps: ["assumed loops, but is forced to halt", "← Symmetric to Case A: same collision, mirrored"],
  });
}

// ── Frame 6 — conclusion ─────────────────────────────────────────────────────
function f6(): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <Defs />
      <text x={360} y={38} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--tx)">
        Both branches are impossible — so the assumption was false
      </text>

      {/* two dead cases */}
      <g>
        <rect x={90} y={70} width={240} height={54} rx={10} fill="color-mix(in srgb, var(--sem-err) 12%, var(--surface))" stroke="var(--sem-err)" strokeWidth={1.5} />
        <text x={210} y={92} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--sem-err)">
          Case A: halts ⇒ loops ✗
        </text>
        <text x={210} y={112} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
          impossible
        </text>
        <rect x={390} y={70} width={240} height={54} rx={10} fill="color-mix(in srgb, var(--sem-err) 12%, var(--surface))" stroke="var(--sem-err)" strokeWidth={1.5} />
        <text x={510} y={92} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--sem-err)">
          Case B: loops ⇒ halts ✗
        </text>
        <text x={510} y={112} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
          impossible
        </text>
      </g>

      {/* arrows funnel down to the killed assumption */}
      <line x1={210} y1={128} x2={330} y2={168} stroke="var(--sem-err)" strokeWidth={1.5} markerEnd="url(#hpArrErr)" />
      <line x1={510} y1={128} x2={390} y2={168} stroke="var(--sem-err)" strokeWidth={1.5} markerEnd="url(#hpArrErr)" />

      {/* the assumption, struck out */}
      <g>
        <rect x={250} y={172} width={220} height={44} rx={10} fill="var(--s2)" stroke="var(--sem-err)" strokeWidth={2} />
        <text x={360} y={193} textAnchor="middle" fontSize="12.5" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx2)">
          H(P, x) exists
        </text>
        <line x1={264} y1={194} x2={456} y2={194} stroke="var(--sem-err)" strokeWidth={2.5} />
        <text x={360} y={209} textAnchor="middle" fontSize="10" fill="var(--sem-err)">
          the one supposition — refuted
        </text>
      </g>

      <line x1={360} y1={220} x2={360} y2={248} stroke="var(--sem-ok)" strokeWidth={2} markerEnd="url(#hpArr)" />

      {/* the verdict */}
      <rect x={150} y={252} width={420} height={52} rx={12} fill="color-mix(in srgb, var(--sem-ok) 16%, var(--surface))" stroke="var(--sem-ok)" strokeWidth={2.5} />
      <text x={360} y={274} textAnchor="middle" fontSize="13.5" fontWeight={700} fill="var(--tx)">
        No such H can exist.
      </text>
      <text x={360} y={294} textAnchor="middle" fontSize="12" fill="var(--tx)">
        The halting problem is undecidable.  (Turing, 1936)
      </text>

      {/* footer: the family of self-reference tricks */}
      <text x={360} y={334} textAnchor="middle" fontSize="11" fill="var(--tx2)">
        Same diagonal / self-reference move as the liar paradox ("this sentence is false")
      </text>
      <text x={360} y={352} textAnchor="middle" fontSize="11" fill="var(--tx2)">
        and Cantor's diagonal argument: build the one object that defeats every candidate.
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Assume, for contradiction, that a perfect halting-decider H exists. Given the code of ANY program P and ANY input x, H itself always halts and correctly reports whether P(x) would halt (\"HALTS\") or run forever (\"LOOPS\"). This is the one assumption we will overturn.",
    render: f1,
  },
  {
    caption:
      "Using H as a subroutine, build a contrarian program D(P): first compute H(P, P) — does P halt when fed its own code? — then do the OPPOSITE of the verdict. If H says P would HALT, D loops forever; if H says P would LOOP, D halts. D is a legal program because H is (by assumption) a legal program.",
    render: f2,
  },
  {
    caption:
      "Now the diagonal step: run D on its own source code, D(D). By D's definition this evaluates H(D, D) — \"does D halt on input D?\" — and then flips that answer. So D(D)'s behavior is defined to be the negation of what H predicts D(D) does. Ask: what does D(D) actually do?",
    render: f3,
  },
  {
    caption:
      "Case A: suppose D(D) HALTS. Then H(D, D), being correct, must have answered \"HALTS\". But D's rule says: on \"HALTS\", loop forever — so D(D) loops. We assumed it halts, yet it is forced to loop. Contradiction.",
    render: f4,
  },
  {
    caption:
      "Case B (the mirror image): suppose instead D(D) LOOPS. Then H(D, D) must have answered \"LOOPS\". But D's rule says: on \"LOOPS\", halt — so D(D) halts. We assumed it loops, yet it is forced to halt. Contradiction again — the exact symmetric twin of Case A.",
    render: f5,
  },
  {
    caption:
      "D(D) must either halt or loop, and BOTH lead to contradiction. The reasoning was airtight except for one step — assuming H exists — so that assumption is false. No program can decide, in general, whether an arbitrary program halts: the halting problem is undecidable (Turing, 1936). It's the same self-reference trap as the liar paradox and Cantor's diagonal — construct the single object that contradicts every possible decider.",
    render: f6,
  },
];

export default function HaltingParadox() {
  return <FigureStepper title="Why no program can decide halting (Turing, 1936)" figKey="halting-paradox" viewBox="0 0 720 450" accent="#2DD4BF" frames={FRAMES} />;
}
