// [fig] pnp-map — the complexity landscape drawn as a stepped Euler diagram,
// assuming P ≠ NP (the believed-but-unproven case) for the main map. We build it
// one region at a time so the containments stay legible: P (poly-time SOLVABLE)
// sits inside NP (poly-time VERIFIABLE — a lucky guess can be checked fast, so
// P ⊆ NP); NP-complete is the hardest band *inside* NP, disjoint from P under
// P≠NP; NP-hard is "≥ as hard as NP-complete" and reaches *outside* NP (e.g. the
// halting problem, which is NP-hard yet undecidable, so not in NP at all). Then a
// reductions motif shows why one poly-time NP-complete algorithm would crack all
// of NP, and a final two-worlds frame contrasts P≠NP with the collapse P=NP.
// Careful wording throughout: NP is poly-*verifiable*, NOT "not polynomial".
// No GIFs (§6): stepped SVG frames via FigureStepper.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

// Palette (passed via accent = "#2DD4BF"):
//   P → --sem-ok (green)    NP → --sem-data (cyan)
//   NPC → --sem-control (orange, the "hard band")
//   NP-hard → --sem-state (violet)   halting/undecidable → --sem-err (red)
const C_P = "var(--sem-ok)";
const C_NP = "var(--sem-data)";
const C_NPC = "var(--sem-control)";
const C_HARD = "var(--sem-state)";
const C_UND = "var(--sem-err)";

// Soft fill = the region colour blended into the page background, so nested
// regions read as translucent overlays without needing SVG opacity juggling.
function soft(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, var(--surface))`;
}

// ── geometry of the main (P ≠ NP) map ───────────────────────────────────────
// NP is a big rounded rect; P is a blob low inside it; NP-complete is a band
// across the TOP of NP; NP-hard is a tall region overlapping NP exactly in that
// band and continuing above NP into the undecidable zone.
const NP = { x: 150, y: 150, w: 300, h: 210, r: 26 };
const P = { cx: 250, cy: 292, rx: 92, ry: 50 };
// NP-complete band: inside NP, hugging its top edge.
const NPC = { x: NP.x + 16, y: NP.y + 14, w: NP.w - 32, h: 52, r: 16 };
// NP-hard: a rounded rect whose bottom slice coincides with the NPC band and
// whose body rises above NP's top edge.
const HARD = { x: NP.x + 8, y: 74, w: NP.w - 16, h: 138, r: 20 };

function tag(
  x: number,
  y: number,
  text: string,
  color: string,
  anchor: "start" | "middle" | "end" = "middle",
  size = 13,
): ReactNode {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={700} fill={color} fontFamily="var(--font-mono)">
      {text}
    </text>
  );
}

function note(x: number, y: number, lines: string[], color = "var(--tx2)", anchor: "start" | "middle" | "end" = "middle"): ReactNode {
  return (
    <text x={x} textAnchor={anchor} fontSize="10" fill={color} fontFamily="var(--font-body)">
      {lines.map((ln, k) => (
        <tspan key={k} x={x} y={y + k * 13}>
          {ln}
        </tspan>
      ))}
    </text>
  );
}

// ── region primitives ────────────────────────────────────────────────────────
function NpRegion({ dim = false }: { dim?: boolean }): ReactNode {
  return (
    <g opacity={dim ? 0.55 : 1}>
      <rect x={NP.x} y={NP.y} width={NP.w} height={NP.h} rx={NP.r} fill={soft(C_NP, 12)} stroke={C_NP} strokeWidth={2.5} />
      {tag(NP.x + NP.w - 14, NP.y + NP.h - 14, "NP", C_NP, "end", 15)}
    </g>
  );
}

function PRegion({ dim = false }: { dim?: boolean }): ReactNode {
  return (
    <g opacity={dim ? 0.55 : 1}>
      <ellipse cx={P.cx} cy={P.cy} rx={P.rx} ry={P.ry} fill={soft(C_P, 26)} stroke={C_P} strokeWidth={2.5} />
      {tag(P.cx, P.cy + 5, "P", C_P, "middle", 17)}
    </g>
  );
}

function NpcRegion(): ReactNode {
  return (
    <g>
      <rect x={NPC.x} y={NPC.y} width={NPC.w} height={NPC.h} rx={NPC.r} fill={soft(C_NPC, 30)} stroke={C_NPC} strokeWidth={2.5} />
      {tag(NPC.x + NPC.w / 2, NPC.y + NPC.h / 2 + 5, "NP-complete", C_NPC, "middle", 13)}
    </g>
  );
}

// NP-hard drawn UNDER the NP rect (so NP's fill/stroke overlays the shared band),
// with a dashed outline of its full extent on top so its true shape stays visible.
function HardRegionBase(): ReactNode {
  return <rect x={HARD.x} y={HARD.y} width={HARD.w} height={HARD.h} rx={HARD.r} fill={soft(C_HARD, 24)} stroke="none" />;
}
function HardRegionOutline(): ReactNode {
  return (
    <g>
      <rect x={HARD.x} y={HARD.y} width={HARD.w} height={HARD.h} rx={HARD.r} fill="none" stroke={C_HARD} strokeWidth={2.5} strokeDasharray="7 4" />
      {tag(HARD.x + HARD.w / 2, HARD.y + 24, "NP-hard", C_HARD, "middle", 14)}
    </g>
  );
}

// ── static furniture: examples pinned to each region ─────────────────────────
function PExamples(): ReactNode {
  return note(P.cx, P.cy + 20, ["sorting · shortest path (Dijkstra)", "primality (AKS, 2002)"], "var(--tx2)");
}
function NpExamples(): ReactNode {
  return note(300, NP.y + NP.h - 40, ["Sudoku · SAT · Hamiltonian cycle · TSP (decision)"], "var(--tx3)");
}

// halting-problem chip up in the undecidable zone (outside NP, inside NP-hard)
function HaltChip(): ReactNode {
  return (
    <g>
      <rect x={HARD.x + 22} y={HARD.y + 40} width={196} height={40} rx={9} fill={soft(C_UND, 18)} stroke={C_UND} strokeWidth={1.5} />
      <text x={HARD.x + 120} y={HARD.y + 56} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={C_UND} fontFamily="var(--font-mono)">
        Halting problem
      </text>
      <text x={HARD.x + 120} y={HARD.y + 70} textAnchor="middle" fontSize="9" fill="var(--tx2)" fontFamily="var(--font-body)">
        NP-hard yet undecidable → not in NP
      </text>
    </g>
  );
}

// ── frame 5: reductions motif (a → SAT → everything) ─────────────────────────
function Reductions(): ReactNode {
  const sat = { cx: 360, cy: 235 };
  const feeders = [
    { x: 168, y: 150, label: "3-COLOR" },
    { x: 168, y: 235, label: "CLIQUE" },
    { x: 168, y: 320, label: "VERTEX-COVER" },
  ];
  const outs = [
    { x: 560, y: 150, label: "Hamiltonian" },
    { x: 560, y: 235, label: "TSP (dec.)" },
    { x: 560, y: 320, label: "Knapsack" },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <defs>
        <marker id="pnp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C_NPC} />
        </marker>
      </defs>
      {/* every NP problem reduces (poly-time) INTO an NP-complete problem */}
      {feeders.map((f) => (
        <g key={f.label}>
          <rect x={f.x - 58} y={f.y - 15} width={116} height={30} rx={7} fill={soft(C_NP, 14)} stroke={C_NP} strokeWidth={1.5} />
          <text x={f.x} y={f.y + 4} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={C_NP} fontFamily="var(--font-mono)">
            {f.label}
          </text>
          <line x1={f.x + 60} y1={f.y} x2={sat.cx - 58} y2={sat.cy} stroke={C_NPC} strokeWidth={1.6} markerEnd="url(#pnp-arrow)" opacity={0.85} />
        </g>
      ))}
      {/* the NP-complete hub */}
      <circle cx={sat.cx} cy={sat.cy} r={48} fill={soft(C_NPC, 32)} stroke={C_NPC} strokeWidth={3} />
      <text x={sat.cx} y={sat.cy - 4} textAnchor="middle" fontSize="18" fontWeight={800} fill={C_NPC} fontFamily="var(--font-mono)">
        SAT
      </text>
      <text x={sat.cx} y={sat.cy + 13} textAnchor="middle" fontSize="8.5" fill="var(--tx2)">
        NP-complete
      </text>
      {/* one poly solver here → solve them all */}
      {outs.map((o) => (
        <g key={o.label}>
          <line x1={sat.cx + 50} y1={sat.cy} x2={o.x - 62} y2={o.y} stroke={C_P} strokeWidth={1.6} markerEnd="url(#pnp-arrow)" strokeDasharray="5 4" opacity={0.9} />
          <rect x={o.x - 62} y={o.y - 15} width={124} height={30} rx={7} fill={soft(C_P, 12)} stroke={C_P} strokeWidth={1.5} />
          <text x={o.x} y={o.y + 4} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={C_P} fontFamily="var(--font-mono)">
            {o.label}
          </text>
        </g>
      ))}
      <text x={222} y={402} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={C_NP}>
        every NP problem ⟶ reduces to SAT
      </text>
      <text x={505} y={402} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={C_P}>
        solve SAT fast ⟶ solve them all
      </text>
    </g>
  );
}

// ── frame 6: two worlds side by side ─────────────────────────────────────────
// LEFT: P ≠ NP (separate). RIGHT: P = NP (collapsed into one blob).
function WorldNeq(ox: number): ReactNode {
  const nb = { x: ox + 24, y: 130, w: 250, h: 210, r: 24 };
  const pb = { cx: ox + 149, cy: 288, rx: 86, ry: 44 };
  const nc = { x: nb.x + 16, y: nb.y + 14, w: nb.w - 32, h: 46, r: 14 };
  return (
    <g fontFamily="var(--font-body)">
      <text x={ox + 149} y={104} textAnchor="middle" fontSize="14" fontWeight={800} fill="var(--tx)" fontFamily="var(--font-mono)">
        P ≠ NP
      </text>
      <text x={ox + 149} y={122} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        (what almost everyone believes)
      </text>
      <rect x={nb.x} y={nb.y} width={nb.w} height={nb.h} rx={nb.r} fill={soft(C_NP, 12)} stroke={C_NP} strokeWidth={2.5} />
      <rect x={nc.x} y={nc.y} width={nc.w} height={nc.h} rx={nc.r} fill={soft(C_NPC, 30)} stroke={C_NPC} strokeWidth={2.5} />
      <text x={nb.x + nb.w / 2} y={nc.y + nc.h / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight={700} fill={C_NPC} fontFamily="var(--font-mono)">
        NP-complete
      </text>
      <ellipse cx={pb.cx} cy={pb.cy} rx={pb.rx} ry={pb.ry} fill={soft(C_P, 26)} stroke={C_P} strokeWidth={2.5} />
      <text x={pb.cx} y={pb.cy + 6} textAnchor="middle" fontSize="16" fontWeight={700} fill={C_P} fontFamily="var(--font-mono)">
        P
      </text>
      {tag(nb.x + nb.w - 14, nb.y + nb.h - 12, "NP", C_NP, "end", 13)}
      <text x={ox + 149} y={362} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        hard problems stay hard
      </text>
    </g>
  );
}
function WorldEq(ox: number): ReactNode {
  const b = { cx: ox + 149, cy: 232, rx: 128, ry: 108 };
  return (
    <g fontFamily="var(--font-body)">
      <text x={ox + 149} y={104} textAnchor="middle" fontSize="14" fontWeight={800} fill="var(--tx)" fontFamily="var(--font-mono)">
        P = NP
      </text>
      <text x={ox + 149} y={122} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        (if the collapse were true)
      </text>
      {/* one blob: verifiable == solvable, NP-complete folds into P */}
      <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={soft(C_P, 22)} stroke={C_P} strokeWidth={3} />
      <ellipse cx={b.cx} cy={b.cy} rx={b.rx - 12} ry={b.ry - 12} fill="none" stroke={C_NP} strokeWidth={1.5} strokeDasharray="6 5" opacity={0.7} />
      <text x={b.cx} y={b.cy - 6} textAnchor="middle" fontSize="17" fontWeight={800} fill="var(--tx)" fontFamily="var(--font-mono)">
        P = NP = NPC
      </text>
      <text x={b.cx} y={b.cy + 14} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        checkable ⇒ quickly solvable
      </text>
      <text x={ox + 149} y={362} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        every hard problem gets easy
      </text>
    </g>
  );
}

function TwoWorlds(): ReactNode {
  return (
    <g>
      <text x={360} y={40} textAnchor="middle" fontSize="15" fontWeight={800} fill="var(--accent)" fontFamily="var(--font-mono)">
        Does P = NP?
      </text>
      <text x={360} y={60} textAnchor="middle" fontSize="10.5" fill="var(--tx2)" fontFamily="var(--font-body)">
        a Clay Millennium Prize problem · US $1,000,000 · posed 2000
      </text>
      {WorldNeq(30)}
      <line x1={360} y1={92} x2={360} y2={378} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
      {WorldEq(372)}
    </g>
  );
}

// ── the shared title bar for the main-map frames ─────────────────────────────
function MapTitle(sub: string): ReactNode {
  return (
    <g fontFamily="var(--font-body)">
      <text x={360} y={40} textAnchor="middle" fontSize="14" fontWeight={800} fill="var(--accent)" fontFamily="var(--font-mono)">
        The complexity landscape
      </text>
      <text x={360} y={58} textAnchor="middle" fontSize="10" fill="var(--tx3)">
        {sub}
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Start with P — the problems SOLVABLE in polynomial time: a fast algorithm exists that just computes the answer. Sorting, shortest path (Dijkstra), and primality testing (AKS, 2002) all live here. This is 'efficiently solvable'.",
    render: () => (
      <g>
        {MapTitle("P = solvable in polynomial time (assuming P ≠ NP)")}
        <PRegion />
        <PExamples />
      </g>
    ),
  },
  {
    caption:
      "Now NP — problems whose solutions are VERIFIABLE in polynomial time: given a candidate answer (a lucky guess), you can CHECK it fast, even if finding it seems hard. Sudoku, SAT, Hamiltonian cycle, TSP (decision) are here. Anything you can solve fast you can also check fast, so P ⊆ NP. (NP means 'nondeterministic polynomial' — it does NOT mean 'not polynomial'.)",
    render: () => (
      <g>
        {MapTitle("NP = solutions verifiable in polynomial time · P ⊆ NP")}
        <NpRegion />
        <PRegion />
        <PExamples />
        <NpExamples />
      </g>
    ),
  },
  {
    caption:
      "NP-complete — the HARDEST problems inside NP. Every problem in NP reduces to them in polynomial time, so they capture NP's full difficulty. Cook–Levin (1971) proved SAT is NP-complete; Karp (1972) added 21 classic problems. Assuming P ≠ NP, this band sits inside NP but strictly ABOVE P — no NP-complete problem is known to be in P.",
    render: () => (
      <g>
        {MapTitle("NP-complete = the hardest problems in NP · disjoint from P")}
        <NpRegion />
        <NpcRegion />
        <PRegion />
        <NpExamples />
      </g>
    ),
  },
  {
    caption:
      "NP-hard — 'at least as hard as NP-complete', but NOT required to be in NP (a solution needn't even be checkable in poly time). NP-hard overlaps NP exactly in the NP-complete band and extends OUTSIDE / above NP. The halting problem is NP-hard yet undecidable — no algorithm decides it at all — so it lies outside NP. (TSP as an optimization, not decision, problem is another NP-hard example.)",
    render: () => (
      <g>
        {MapTitle("NP-hard = ≥ as hard as NP-complete · may lie outside NP")}
        <HardRegionBase />
        <NpRegion />
        <NpcRegion />
        <PRegion />
        <HardRegionOutline />
        <HaltChip />
      </g>
    ),
  },
  {
    caption:
      "Why NP-complete is one shared fate: every NP problem reduces (in poly time) to any NP-complete problem such as SAT — so a single polynomial-time algorithm for SAT could be composed with those reductions to solve ALL of NP quickly. That is the whole stakes of P vs NP: thousands of problems rise or fall together.",
    render: () => (
      <g>
        {MapTitle("Reductions — one poly-time NP-complete solver would crack all of NP")}
        <Reductions />
      </g>
    ),
  },
  {
    caption:
      "The million-dollar question — does P = NP? LEFT (P ≠ NP), the believed world: NP-complete sits strictly above P and the regions stay separate; some checkable problems are inherently hard to solve. RIGHT (P = NP): everything collapses into one blob — if verifying is as easy as solving, every checkable problem is also quickly solvable and NP-complete folds into P. This is one of the seven Clay Millennium Prize problems (US $1,000,000, posed 2000); P ≠ NP is widely believed but remains unproven.",
    render: () => <TwoWorlds />,
  },
];

export default function PnpMap() {
  return (
    <FigureStepper
      title="The complexity landscape — P, NP, NP-complete, NP-hard"
      figKey="pnp-map"
      viewBox="0 0 720 470"
      accent="#2DD4BF"
      frames={FRAMES}
    />
  );
}
