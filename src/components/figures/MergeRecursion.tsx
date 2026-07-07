// [fig] merge-recursion — merge sort drawn as its recursion tree over [5, 2, 8,
// 1]. Merge sort has two phases. Going DOWN, it splits the array in half again
// and again until every piece is a single element (a run of length 1, which is
// trivially sorted). Coming back UP, it MERGES neighbouring sorted runs by
// repeatedly taking the smaller front element, so two sorted runs fuse into one
// larger sorted run at each level.
//
// The picture makes the shape obvious: a balanced binary tree of splits, then
// the same tree read upward as merges, ending in the fully sorted array. The
// two runs being merged at a step glow orange (--sem-control); the freshly
// merged, sorted result glows green (--sem-ok). That divide-and-merge is why
// merge sort is O(n log n): log n levels, O(n) merging work per level.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

type Cell = "idle" | "src" | "done";

// A horizontal run of numbers as boxed cells, centred on cx.
function Run({
  values,
  cx,
  y,
  state,
}: {
  values: number[];
  cx: number;
  y: number;
  state: Cell;
}) {
  const w = 26;
  const gap = 3;
  const totalW = values.length * w + (values.length - 1) * gap;
  const x0 = cx - totalW / 2;
  const stroke = state === "src" ? "var(--sem-control)" : state === "done" ? "var(--sem-ok)" : "var(--line)";
  const fill =
    state === "src"
      ? "color-mix(in srgb, var(--sem-control) 22%, var(--surface))"
      : state === "done"
        ? "color-mix(in srgb, var(--sem-ok) 22%, var(--surface))"
        : "var(--s2)";
  return (
    <g>
      {values.map((v, i) => {
        const x = x0 + i * (w + gap);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={26} rx={4} fill={fill} stroke={stroke} strokeWidth={state === "idle" ? 1.5 : 2.5} />
            <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--tx)">
              {v}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function connector(x1: number, y1: number, x2: number, y2: number, key: string) {
  return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 3" />;
}

// Levels of the recursion tree (top = whole array).
// L0: [5,2,8,1] @ cx 320 y 20
// L1: [5,2] @ 180, [8,1] @ 460  y 110
// L2: [5]@120 [2]@240  [8]@400 [1]@520  y 200
const L0 = { cx: 320, y: 20 };
const L1 = [
  { cx: 180, y: 110 },
  { cx: 460, y: 110 },
];
const L2 = [
  { cx: 120, y: 205 },
  { cx: 240, y: 205 },
  { cx: 400, y: 205 },
  { cx: 520, y: 205 },
];

// Draw the split-tree connectors (parent bottom → child top), shown up to a
// given depth reached.
function Connectors({ depth }: { depth: number }) {
  return (
    <g>
      {depth >= 1 && (
        <>
          {connector(L0.cx, L0.y + 26, L1[0].cx, L1[0].y, "c0a")}
          {connector(L0.cx, L0.y + 26, L1[1].cx, L1[1].y, "c0b")}
        </>
      )}
      {depth >= 2 && (
        <>
          {connector(L1[0].cx, L1[0].y + 26, L2[0].cx, L2[0].y, "c1a")}
          {connector(L1[0].cx, L1[0].y + 26, L2[1].cx, L2[1].y, "c1b")}
          {connector(L1[1].cx, L1[1].y + 26, L2[2].cx, L2[2].y, "c1c")}
          {connector(L1[1].cx, L1[1].y + 26, L2[3].cx, L2[3].y, "c1d")}
        </>
      )}
    </g>
  );
}

function Label({ x, y, text, tone }: { x: number; y: number; text: string; tone: string }) {
  return (
    <text x={x} y={y} fontSize="11" fill={tone} fontWeight={700}>
      {text}
    </text>
  );
}

// Frame 0: whole array at the top, "split" about to begin.
function F0() {
  return (
    <g fontFamily="var(--font-body)">
      <Run values={[5, 2, 8, 1]} cx={L0.cx} y={L0.y} state="src" />
      <Label x={40} y={L0.y + 18} text="divide ↓" tone="var(--sem-control)" />
    </g>
  );
}

// Frame 1: split into two halves.
function F1() {
  return (
    <g fontFamily="var(--font-body)">
      <Connectors depth={1} />
      <Run values={[5, 2, 8, 1]} cx={L0.cx} y={L0.y} state="idle" />
      <Run values={[5, 2]} cx={L1[0].cx} y={L1[0].y} state="src" />
      <Run values={[8, 1]} cx={L1[1].cx} y={L1[1].y} state="src" />
      <Label x={40} y={L1[0].y + 18} text="split in half" tone="var(--sem-control)" />
    </g>
  );
}

// Frame 2: split down to singletons.
function F2() {
  return (
    <g fontFamily="var(--font-body)">
      <Connectors depth={2} />
      <Run values={[5, 2, 8, 1]} cx={L0.cx} y={L0.y} state="idle" />
      <Run values={[5, 2]} cx={L1[0].cx} y={L1[0].y} state="idle" />
      <Run values={[8, 1]} cx={L1[1].cx} y={L1[1].y} state="idle" />
      <Run values={[5]} cx={L2[0].cx} y={L2[0].y} state="src" />
      <Run values={[2]} cx={L2[1].cx} y={L2[1].y} state="src" />
      <Run values={[8]} cx={L2[2].cx} y={L2[2].y} state="src" />
      <Run values={[1]} cx={L2[3].cx} y={L2[3].y} state="src" />
      <Label x={40} y={L2[0].y + 18} text="singletons" tone="var(--sem-control)" />
      <Label x={40} y={L2[0].y + 34} text="(each sorted)" tone="var(--tx3)" />
    </g>
  );
}

// Frame 3: merge singletons back into sorted pairs.
function F3() {
  return (
    <g fontFamily="var(--font-body)">
      <Connectors depth={2} />
      <Run values={[5, 2, 8, 1]} cx={L0.cx} y={L0.y} state="idle" />
      <Run values={[2, 5]} cx={L1[0].cx} y={L1[0].y} state="done" />
      <Run values={[1, 8]} cx={L1[1].cx} y={L1[1].y} state="done" />
      <Run values={[5]} cx={L2[0].cx} y={L2[0].y} state="src" />
      <Run values={[2]} cx={L2[1].cx} y={L2[1].y} state="src" />
      <Run values={[8]} cx={L2[2].cx} y={L2[2].y} state="src" />
      <Run values={[1]} cx={L2[3].cx} y={L2[3].y} state="src" />
      <Label x={40} y={L1[0].y + 18} text="merge ↑" tone="var(--sem-ok)" />
      <text x={L1[0].cx} y={L1[0].y - 8} textAnchor="middle" fontSize="9.5" fill="var(--sem-ok)">5,2 → 2,5</text>
      <text x={L1[1].cx} y={L1[1].y - 8} textAnchor="middle" fontSize="9.5" fill="var(--sem-ok)">8,1 → 1,8</text>
    </g>
  );
}

// Frame 4: merge the two sorted pairs — show the interleave.
function F4() {
  return (
    <g fontFamily="var(--font-body)">
      <Connectors depth={1} />
      <Run values={[1, 2, 5, 8]} cx={L0.cx} y={L0.y} state="done" />
      <Run values={[2, 5]} cx={L1[0].cx} y={L1[0].y} state="src" />
      <Run values={[1, 8]} cx={L1[1].cx} y={L1[1].y} state="src" />
      <Label x={40} y={L1[0].y + 18} text="merge two runs" tone="var(--sem-ok)" />
      <text x={320} y={165} textAnchor="middle" fontSize="10" fill="var(--tx2)">
        compare fronts, take the smaller each time:
      </text>
      <text x={320} y={182} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx3)">
        1 · 2 · 5 · 8
      </text>
    </g>
  );
}

// Frame 5: fully sorted result.
function F5() {
  return (
    <g fontFamily="var(--font-body)">
      <Run values={[1, 2, 5, 8]} cx={L0.cx} y={90} state="done" />
      <text x={320} y={60} textAnchor="middle" fontSize="12" fill="var(--sem-ok)" fontWeight={700}>
        sorted ✓
      </text>
      <text x={320} y={155} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        log₂ 4 = 2 levels of splitting, then 2 levels of merging.
      </text>
      <text x={320} y={175} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        Each level touches all n elements once.
      </text>
      <text x={320} y={200} textAnchor="middle" fontSize="11" fill="var(--p4)" fontWeight={700}>
        n items × log n levels = O(n log n)
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Merge sort starts with the whole array [5, 2, 8, 1]. The plan going down is simple: split it in half, and keep splitting each half, until every piece is a single element.",
    render: () => <F0 />,
  },
  {
    caption:
      "First split: [5, 2, 8, 1] becomes the two halves [5, 2] and [8, 1]. Neither is sorted yet — splitting only divides the work; the sorting happens on the way back up.",
    render: () => <F1 />,
  },
  {
    caption:
      "Split again. Each half divides into singletons: [5], [2], [8], [1]. A run of one element is already sorted by definition, so the recursion bottoms out here. This is the deepest level — 2 splits for 4 elements (log₂4).",
    render: () => <F2 />,
  },
  {
    caption:
      "Now merge upward. Merging [5] with [2] compares their fronts and emits the smaller first → [2, 5]; likewise [8] and [1] merge to [1, 8]. Two sorted runs of length 1 become sorted runs of length 2.",
    render: () => <F3 />,
  },
  {
    caption:
      "The final merge fuses the two sorted halves [2, 5] and [1, 8]. Walk both fronts, always taking the smaller: 1, then 2, then 5, then 8. This is the whole trick — merging two already-sorted runs is a single linear pass.",
    render: () => <F4 />,
  },
  {
    caption:
      "Done: [1, 2, 5, 8]. The tree had log n levels of splitting and log n of merging, and each merge level does O(n) work across all the runs. n elements times log n levels is why merge sort runs in O(n log n) — and always, regardless of the input's starting order.",
    render: () => <F5 />,
  },
];

export default function MergeRecursion() {
  return (
    <FigureStepper
      title="Merge sort — divide down, merge up"
      figKey="merge-recursion"
      viewBox="0 0 640 320"
      accent="#34D399"
      frames={FRAMES}
    />
  );
}
