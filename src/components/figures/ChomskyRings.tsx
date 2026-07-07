// [fig] chomsky-rings — the Chomsky hierarchy drawn as strictly nested classes of
// formal languages, revealed one ring outward per frame. Each ring is labeled with
// an example language and the machine that recognizes it, and the whole point is
// containment plus what each machine GAINS: Regular (Type 3) needs no memory (a
// finite automaton); Context-free (Type 2) adds a stack (pushdown automaton);
// Context-sensitive (Type 1) adds a bounded tape (linear-bounded automaton);
// Recursively enumerable (Type 0) adds an unbounded tape (Turing machine). A dashed
// sub-boundary marks Decidable (recursive) — where the TM always halts — sitting
// inside Type 0, so the decidable-vs-merely-recognizable line is visible. Outside
// every ring lie languages that are not even recursively enumerable. No GIFs (§6):
// stepped SVG frames via FigureStepper.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

// Each ring is a concentric rounded rectangle, innermost smallest. All rings share a
// center; width/height shrink inward so every class sits strictly inside the next.
const CX = 360;
const CY = 232;

type Ring = {
  key: string;
  hw: number; // half-width
  hh: number; // half-height
  color: string; // stroke / accent color for this band
  title: string;
  type: string;
  example: string;
  machine: string;
  labelY: number; // y for the band's title text (near its top edge)
};

// Ordered innermost -> outermost. The decidable sub-boundary is drawn separately
// (dashed) between context-sensitive and full RE.
const RINGS: Ring[] = [
  { key: "reg", hw: 78, hh: 46, color: "var(--sem-ok)", title: "Regular", type: "Type 3", example: "a*b*", machine: "finite automaton (DFA/NFA)", labelY: CY - 26 },
  { key: "cf", hw: 138, hh: 84, color: "var(--accent)", title: "Context-free", type: "Type 2", example: "aⁿbⁿ", machine: "pushdown automaton — a stack", labelY: CY - 66 },
  { key: "cs", hw: 205, hh: 126, color: "var(--sem-data)", title: "Context-sensitive", type: "Type 1", example: "aⁿbⁿcⁿ", machine: "linear-bounded automaton", labelY: CY - 108 },
  { key: "re", hw: 300, hh: 190, color: "var(--sem-control)", title: "Recursively enumerable", type: "Type 0", example: "halting programs", machine: "Turing machine (unbounded tape)", labelY: CY - 172 },
];

// The dashed "Decidable / recursive" boundary lives between context-sensitive (cs)
// and the RE outer edge — the TM always halts here.
const DECIDABLE = { hw: 252, hh: 158 };

function rect(hw: number, hh: number, stroke: string, fill: string, dash?: string, sw = 2) {
  return (
    <rect
      x={CX - hw}
      y={CY - hh}
      width={hw * 2}
      height={hh * 2}
      rx={22}
      ry={22}
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeDasharray={dash}
    />
  );
}

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, var(--surface))`;
}

// bandLabel: title + type just inside a ring's top edge; example + machine one line
// below. `dim` desaturates rings from earlier frames.
function bandLabel(r: Ring, dim: boolean) {
  const strong = dim ? "var(--tx3)" : "var(--tx)";
  const soft = dim ? "var(--tx3)" : "var(--tx2)";
  const acc = dim ? "var(--tx3)" : r.color;
  return (
    <g key={`lbl-${r.key}`} fontFamily="var(--font-mono)">
      <text x={CX} y={r.labelY} textAnchor="middle" fontSize="12.5" fontWeight={700} fill={strong}>
        {r.title} <tspan fill={acc}>· {r.type}</tspan>
      </text>
      <text x={CX} y={r.labelY + 15} textAnchor="middle" fontSize="10.5" fill={soft}>
        <tspan fontWeight={700} fill={acc}>{r.example}</tspan> — {r.machine}
      </text>
    </g>
  );
}

// Draw all rings up to and including index `upto`. Rings before `upto` are dimmed
// (drawn already, kept visible per the spec); the newest ring is highlighted.
// `showDecidable` toggles the dashed sub-boundary; `outside` toggles the
// not-even-RE label in the corner region; `full` labels every band at once.
function scene(opts: { upto: number; showDecidable: boolean; hlDecidable: boolean; outside: boolean; full: boolean }): () => ReactNode {
  const { upto, showDecidable, hlDecidable, outside, full } = opts;
  return () => {
    const outer = RINGS[Math.min(upto, RINGS.length - 1)];
    return (
      <g>
        {/* Outermost region backdrop: the "everything else" plane. Only meaningful
            once the outer RE ring is shown; carries the not-even-RE marker. */}
        {outside && (
          <>
            <rect x={2} y={2} width={716} height={466} rx={16} fill={tint("var(--sem-err)", 7)} stroke="var(--sem-err)" strokeWidth={1.25} strokeDasharray="2 5" />
            <text x={16} y={26} fontFamily="var(--font-mono)" fontSize="11.5" fontWeight={700} fill="var(--sem-err)">
              Not even recursively enumerable
            </text>
            <text x={16} y={42} fontFamily="var(--font-mono)" fontSize="10" fill="var(--sem-err)">
              e.g. the complement of the halting problem — no machine, not even in principle
            </text>
          </>
        )}

        {/* Rings, outermost first so inner ones paint on top. Fill tints darken
            inward so nesting reads as depth. */}
        {RINGS.slice(0, upto + 1)
          .slice()
          .reverse()
          .map((r) => {
            const isNewest = r.key === outer.key && !full;
            const dim = !full && !isNewest;
            const stroke = dim ? "var(--line)" : r.color;
            const fill = tint(r.color, dim ? 8 : 15);
            return <g key={`ring-${r.key}`}>{rect(r.hw, r.hh, stroke, fill, undefined, isNewest ? 2.75 : 2)}</g>;
          })}

        {/* Dashed decidable / recursive sub-boundary, between context-sensitive and
            RE's outer edge. Highlighted violet on its reveal frame. */}
        {showDecidable && (
          <g>
            {rect(DECIDABLE.hw, DECIDABLE.hh, hlDecidable ? "var(--sem-state)" : "var(--tx3)", "none", "7 5", hlDecidable ? 2.5 : 1.75)}
            <text
              x={CX}
              y={CY - DECIDABLE.hh + 16}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10.5"
              fontWeight={700}
              fill={hlDecidable ? "var(--sem-state)" : "var(--tx2)"}
            >
              Decidable / recursive — the TM always halts
            </text>
          </g>
        )}

        {/* Labels. In `full` mode every band is labeled; otherwise dim old ones and
            keep the newest crisp. */}
        {RINGS.slice(0, upto + 1).map((r) => bandLabel(r, !full && r.key !== outer.key))}
      </g>
    );
  };
}

const FRAMES: Frame[] = [
  {
    caption:
      "Start at the center. Regular languages (Chomsky Type 3), like a*b*, are exactly what a finite automaton can recognize — a machine with a fixed set of states and NO memory. It can't even count matched pairs.",
    render: scene({ upto: 0, showDecidable: false, hlDecidable: false, outside: false, full: false }),
  },
  {
    caption:
      "Add a stack and you get context-free languages (Type 2). Now aⁿbⁿ is recognizable: push on each a, pop on each b, accept if the stack empties. A pushdown automaton. Every regular language is still context-free — Type 3 ⊂ Type 2.",
    render: scene({ upto: 1, showDecidable: false, hlDecidable: false, outside: false, full: false }),
  },
  {
    caption:
      "Bound the tape to the input's length and you get context-sensitive languages (Type 1). aⁿbⁿcⁿ needs this: one stack can't check three matched counts, but a linear-bounded automaton can. Type 2 ⊂ Type 1.",
    render: scene({ upto: 2, showDecidable: false, hlDecidable: false, outside: false, full: false }),
  },
  {
    caption:
      "Remove the bound — give the machine an UNBOUNDED tape — and you reach recursively enumerable languages (Type 0): everything a Turing machine can recognize. The set of halting programs lives here. Type 1 ⊂ Type 0.",
    render: scene({ upto: 3, showDecidable: false, hlDecidable: false, outside: true, full: false }),
  },
  {
    caption:
      "Inside Type 0, a dashed line: the DECIDABLE (recursive) languages, where the Turing machine always halts with yes or no. The halting set is recursively enumerable but NOT decidable — you can confirm a 'yes' by running it, but never rule out every 'no'.",
    render: scene({ upto: 3, showDecidable: true, hlDecidable: true, outside: true, full: false }),
  },
  {
    caption:
      "The whole hierarchy: Type 3 ⊂ Type 2 ⊂ Type 1 ⊂ Type 0. Each ring outward adds power — no memory → a stack → a bounded tape → an unbounded tape — and inside Type 0, decidable sits within merely recognizable. Beyond every ring: languages no machine can even enumerate, like the complement of the halting problem.",
    render: scene({ upto: 3, showDecidable: true, hlDecidable: false, outside: true, full: true }),
  },
];

export default function ChomskyRings() {
  return (
    <FigureStepper
      title="The Chomsky hierarchy — nested classes of languages"
      figKey="chomsky-rings"
      viewBox="0 0 720 470"
      accent="#2DD4BF"
      frames={FRAMES}
    />
  );
}
