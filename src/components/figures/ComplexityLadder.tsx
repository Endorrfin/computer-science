// [fig] complexity-ladder — the picture to redraw from memory. Eight rungs from
// O(1) at the bottom (cool green: cheap, scales forever) climbing to O(n!) at
// the top (hot red: hopeless past a handful of items), each revealed one frame
// at a time and annotated with its CONCRETE cost at a fixed n = 1,000. Seeing
// "O(n²) = 500,500 but O(2ⁿ) = a 300-digit number" at the same n is what makes
// the gap between polynomial and exponential visceral. The colour temperature
// IS the message: greener = better, redder = worse. Costs are computed from the
// same closed forms the growth-racer sim instruments (growth.ts), so figure and
// sim never disagree. Semantic-adjacent palette: success/green = good, orange =
// caution, red = catastrophic.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

// One rung of the ladder, ordered best → worst (drawn bottom → top).
// All costs are priced at a fixed input size of n = 1,000.
type Rung = {
  bigO: string;
  name: string;
  cost: string; // human-readable cost at n = 1000
  note: string; // one-line "what this feels like"
  color: string; // CSS var — cool (good) → hot (bad)
};

// Costs at n = 1,000, matching growth.ts formulas:
//   log₂1000 ≈ 9.97 → ~10 probes · n = 1000 · n log n ≈ 10 000 ·
//   n² = 1 000 000 (n(n-1)/2 = 499 500 for the pair-count variant; we quote the
//   familiar n² headline here) · 2ⁿ and n! are beyond astronomical.
const RUNGS: readonly Rung[] = [
  { bigO: "O(1)", name: "constant", cost: "1", note: "hash lookup — free at any scale", color: "var(--sem-ok)" },
  { bigO: "O(log n)", name: "logarithmic", cost: "≈ 10", note: "binary search — 1000× the data, +10 steps", color: "var(--p4)" },
  { bigO: "O(n)", name: "linear", cost: "1,000", note: "one scan — cost tracks the input", color: "var(--p5)" },
  { bigO: "O(n log n)", name: "linearithmic", cost: "≈ 10,000", note: "a good sort — the practical ceiling", color: "var(--sem-data)" },
  { bigO: "O(n²)", name: "quadratic", cost: "1,000,000", note: "nested loops — already a million", color: "var(--p1)" },
  { bigO: "O(n³)", name: "cubic", cost: "1,000,000,000", note: "triple loop — a billion; feel the wall", color: "var(--sem-control)" },
  { bigO: "O(2ⁿ)", name: "exponential", cost: "10³⁰¹", note: "every subset — a 302-digit number", color: "#f97316" },
  { bigO: "O(n!)", name: "factorial", cost: "10²⁵⁶⁷", note: "every ordering — a 2,568-digit number", color: "var(--sem-err)" },
];

// ladder layout (viewBox 0 0 560 360)
const ROW_H = 36;
const BASE_Y = 316; // y of the bottom (best) rung's baseline
const X_LEFT = 30;
const BAR_X = 150;
const BAR_MAX = 300; // px width of the "worst" bar

// A crude visual bar length per rung (NOT to scale — the numbers span 2500+
// orders of magnitude, no bar could show that. Instead it grows steadily so the
// eye reads "worse = longer/hotter", and the printed cost carries the real
// magnitude). Rung index 0..7 → fraction of BAR_MAX.
function barW(idx: number): number {
  return BAR_MAX * ((idx + 1) / RUNGS.length);
}

function Ladder({ upto }: { upto: number }) {
  return (
    <g fontFamily="var(--font-body)">
      {/* axis hint on the left */}
      <text x={X_LEFT} y={BASE_Y + 30} fontSize="10" fill="var(--sem-ok)" fontWeight="700">
        cheaper ↓
      </text>
      <text x={X_LEFT} y={BASE_Y - RUNGS.length * ROW_H + 4} fontSize="10" fill="var(--sem-err)" fontWeight="700">
        costlier ↑
      </text>

      {/* n badge */}
      <g>
        <rect x={BAR_X + BAR_MAX - 84} y={8} width="94" height="22" rx="5" fill="var(--s2)" stroke="var(--line)" />
        <text x={BAR_X + BAR_MAX - 37} y={23} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx)">
          n = 1,000
        </text>
      </g>

      {RUNGS.map((r, idx) => {
        if (idx >= upto) return null;
        const y = BASE_Y - idx * ROW_H;
        const revealing = idx === upto - 1;
        const w = barW(idx);
        return (
          <g key={r.bigO} opacity={revealing ? 1 : 0.92}>
            {/* the rung bar */}
            <rect
              x={BAR_X}
              y={y - ROW_H + 8}
              width={w}
              height={ROW_H - 12}
              rx="4"
              fill={`color-mix(in srgb, ${r.color} ${revealing ? 30 : 18}%, var(--surface))`}
              stroke={r.color}
              strokeWidth={revealing ? 2.25 : 1.25}
            />
            {/* Big-O label on the rung */}
            <text
              x={BAR_X + 10}
              y={y - ROW_H / 2 + 5}
              fontSize="13"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              fill={r.color}
            >
              {r.bigO}
            </text>
            {/* name, left gutter */}
            <text x={X_LEFT} y={y - ROW_H / 2 + 5} fontSize="10.5" fill="var(--tx2)">
              {r.name}
            </text>
            {/* concrete cost at the bar's right */}
            <text
              x={BAR_X + w + 8}
              y={y - ROW_H / 2 + 1}
              fontSize="11.5"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              fill={r.color}
            >
              {r.cost}
            </text>
            {/* the "feel" note, dimmer, beneath the cost */}
            {revealing && (
              <text x={BAR_X + w + 8} y={y - ROW_H / 2 + 13} fontSize="8.5" fill="var(--tx3)">
                {r.note}
              </text>
            )}
          </g>
        );
      })}

      {/* polynomial / exponential divider once we cross into 2ⁿ */}
      {upto >= 7 && (
        <g>
          <line
            x1={X_LEFT}
            y1={BASE_Y - 6 * ROW_H + 8}
            x2={BAR_X + BAR_MAX + 4}
            y2={BASE_Y - 6 * ROW_H + 8}
            stroke="var(--sem-err)"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x={X_LEFT} y={BASE_Y - 6 * ROW_H + 2} fontSize="8.5" fill="var(--sem-err)">
            ↑ intractable — grows faster than any polynomial
          </text>
        </g>
      )}
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "The ladder, priced at one fixed input size n = 1,000. We build it from the floor up: O(1) — constant. A hash lookup does the same tiny work whether n is 1 or 1,000,000. Cost at n=1,000: 1 operation.",
    render: () => <Ladder upto={1} />,
  },
  {
    caption:
      "O(log n) — logarithmic. Each step halves what's left (binary search), so multiplying the data by 1,000 adds only ~10 steps. Cost at n=1,000: ≈ 10. Still essentially free.",
    render: () => <Ladder upto={2} />,
  },
  {
    caption:
      "O(n) — linear. One pass over the input; cost tracks n exactly. Cost at n=1,000: 1,000. This is the honest baseline: you looked at everything once.",
    render: () => <Ladder upto={3} />,
  },
  {
    caption:
      "O(n log n) — linearithmic. A good comparison sort (mergesort, heapsort). Cost at n=1,000: ≈ 10,000 — only 10× linear. This is the practical ceiling for 'scales fine'.",
    render: () => <Ladder upto={4} />,
  },
  {
    caption:
      "O(n²) — quadratic. Nested loops, comparing every pair. Cost at n=1,000: 1,000,000. A million operations from a thousand items — the first rung that stings on real data.",
    render: () => <Ladder upto={5} />,
  },
  {
    caption:
      "O(n³) — cubic. A third nested loop (naïve matrix multiply). Cost at n=1,000: 1,000,000,000 — a billion. You can feel the wall now; each added factor of n multiplies the whole cost.",
    render: () => <Ladder upto={6} />,
  },
  {
    caption:
      "O(2ⁿ) — exponential. Enumerate every subset. At n=1,000 the cost is 2¹⁰⁰⁰ ≈ 10³⁰¹ — a 302-digit number, more than the atoms in the universe. Past a few dozen items this is simply impossible, forever. Note the red line: we've left the polynomial world.",
    render: () => <Ladder upto={7} />,
  },
  {
    caption:
      "O(n!) — factorial, the top rung. Every ordering of the input (brute-force travelling salesman). At n=1,000 the number has thousands of digits; even n=20 is 2.4 × 10¹⁸. This is the whole map: greener rungs scale, redder rungs don't — and the jump from O(n²) to O(2ⁿ) is the cliff worth memorising.",
    render: () => <Ladder upto={8} />,
  },
];

export default function ComplexityLadder() {
  return (
    <FigureStepper
      title="The complexity ladder — costs at n = 1,000"
      figKey="complexity-ladder"
      viewBox="0 0 560 360"
      accent="#34D399"
      frames={FRAMES}
    />
  );
}
