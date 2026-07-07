// [micro] heap-operations — a binary MIN-heap you can push into, pop from, and
// build. A heap is a heap-ordered COMPLETE binary tree (every parent ≤ its
// children, so the smallest key sits at the root) that lives entirely inside a
// flat array — no pointers. The whole point of this sim is that the tree you see
// and the array you see are the SAME object: index i's parent is ⌊(i−1)/2⌋ and
// its children are 2i+1 / 2i+2, so "walking up to the parent" is just integer
// arithmetic on a subscript. We highlight the same indices in both panes at once.
//
// The two mutating ops each restore heap order by walking one root-to-leaf path.
// push appends the new key at the end (the only spot that keeps the tree
// complete) and SIFTS UP, swapping with the parent while it is smaller. pop takes
// the min off the root, moves the last element up to fill it, and SIFTS DOWN,
// swapping with the smaller child while it is larger. heapify sifts down every
// internal node from the last one back to the root — the O(n) build. Each op
// returns a list of steps; the transport plays them one compare/swap at a time,
// and the final array is committed as the new heap when the trace ends.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import {
  push,
  pop,
  heapify,
  heapLayout,
  isMinHeap,
  parentOf,
  leftOf,
  rightOf,
  type HeapStep,
} from "./model.ts";

const ACCENT = "#34D399";

// Seed heap — built via repeated push so the invariant holds from the start.
function seedHeap(): number[] {
  let h: number[] = [];
  for (const k of [42, 17, 63, 8, 25, 91, 4]) h = push(h, k).array;
  return h;
}

// A finished op we are stepping through: its trace plus the running counters it
// accumulated, and a verb for the status line.
type ActiveOp = {
  label: string;
  steps: HeapStep[];
  swaps: number;
  comparisons: number;
  min: number | null; // pop only
};

// ---- SVG tree geometry (viewBox units). heapLayout gives x in 0..1 and an
// integer depth; we map x → horizontal position and depth → row. ----
const W = 560;
const PAD_X = 30; // keep root/leaf nodes off the edges
const PAD_T = 26;
const LEVEL_GAP = 62;
const NODE_R = 17;

const randInt = (): number => Math.floor(Math.random() * 100); // 0..99

export default function HeapOperations() {
  const [heap, setHeap] = useState<number[]>(seedHeap);
  const [op, setOp] = useState<ActiveOp | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState("50");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // The array currently drawn: mid-op it is the trace frame; otherwise the heap.
  const shownArray = op ? op.steps[stepIdx].array : heap;
  const activeSet = useMemo(
    () => new Set(op ? op.steps[stepIdx].active : []),
    [op, stepIdx],
  );

  const layout = useMemo(() => heapLayout(shownArray), [shownArray]);
  const xOf = (x: number): number => PAD_X + x * (W - PAD_X * 2);
  const yOf = (depth: number): number => PAD_T + NODE_R + depth * LEVEL_GAP;
  // Tall enough for the deepest node plus its index label underneath.
  const svgH = yOf(layout.depth) + NODE_R + 18;

  // Commit the op's final array and clear the trace once we reach the last step.
  function finish(current: ActiveOp): void {
    setHeap(current.steps[current.steps.length - 1].array);
    setOp(null);
    setStepIdx(0);
    setRunning(false);
  }

  // Advance one trace frame. While frames remain, show the next one (so the
  // final "heap order restored" frame is displayed too); once we are already on
  // the last frame, commit the op's array as the heap and clear the trace.
  // Called from the clock tick and the Step button — both see fresh op/stepIdx.
  function advance(): void {
    if (!op) return;
    if (stepIdx >= op.steps.length - 1) finish(op);
    else setStepIdx(stepIdx + 1);
  }

  // Auto-play the current trace: one frame per tick. The clock keeps ticking on
  // the last frame for one beat so advance() can commit (finish sets running
  // false, stopping it). SimShell disables play under reduced motion.
  useSimClock(running && op !== null, 2 * speed, advance);

  // Start a new op. A trace of ≤1 frame (single-element pop, or a degenerate
  // build) has nothing to animate, so commit its result immediately.
  function begin(next: ActiveOp): void {
    setRunning(false);
    if (next.steps.length <= 1) {
      if (next.steps.length === 1) setHeap(next.steps[0].array);
      setOp(null);
      setStepIdx(0);
      return;
    }
    setOp(next);
    setStepIdx(0);
  }

  function runPush(): void {
    if (op) return; // one op at a time
    const key = Number.parseInt(draft, 10);
    if (!Number.isFinite(key)) return;
    const r = push(heap, key);
    begin({ label: `push ${key}`, steps: r.steps, swaps: r.swaps, comparisons: r.comparisons, min: null });
  }

  function runPop(): void {
    if (op || heap.length === 0) return;
    const r = pop(heap);
    begin({ label: "pop min", steps: r.steps, swaps: r.swaps, comparisons: r.comparisons, min: r.min });
  }

  function runHeapify(): void {
    if (op) return;
    const n = 8;
    const arr = Array.from({ length: n }, randInt);
    const r = heapify(arr);
    begin({ label: "heapify", steps: r.steps, swaps: r.swaps, comparisons: r.comparisons, min: null });
  }

  function onStep(): void {
    setRunning(false);
    if (op) advance();
  }

  function onReset(): void {
    setRunning(false);
    setOp(null);
    setStepIdx(0);
    setHeap([]);
  }

  function onToggle(): void {
    if (running) {
      setRunning(false);
      return;
    }
    if (op) setRunning(true); // at the last frame, one tick commits & stops
  }

  // ---- status line ----
  const ordered = isMinHeap(shownArray);
  const caption = op
    ? op.steps[stepIdx].caption
    : shownArray.length === 0
      ? "Empty heap. Push a key, or build one from random values."
      : `Min-heap of ${shownArray.length}. Root ${shownArray[0]} is the minimum; ${ordered ? "every parent ≤ its children" : "restoring order…"}.`;
  const counters = op ? ` · swaps ${op.swaps}, comparisons ${op.comparisons}` : "";
  const popped = op && op.min !== null ? ` · returned min ${op.min}` : "";
  const stepPos = op ? ` [${stepIdx + 1}/${op.steps.length}]` : "";
  const status = `${op ? op.label + ": " : ""}${caption}${popped}${counters}${stepPos}`;

  // Index-arithmetic hint for whichever node is currently active (the teaching
  // beat: the tree edge you just traversed is ⌊(i−1)/2⌋).
  const focus = op ? op.steps[stepIdx].active[0] : undefined;
  const arithHint =
    focus !== undefined && focus > 0
      ? `i=${focus}: parent=⌊(${focus}−1)/2⌋=${parentOf(focus)}, children=2·${focus}+1=${leftOf(focus)}, 2·${focus}+2=${rightOf(focus)}`
      : focus === 0
        ? "i=0: the root — no parent; children=1,2"
        : "parent(i)=⌊(i−1)/2⌋ · left(i)=2i+1 · right(i)=2i+2";

  const busy = op !== null;

  return (
    <SimShell
      title="Heap operations — the tree that is really an array"
      simKey="heap-operations"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="heap-ctl">
          <label className="ss-field">
            key
            <input
              className="heap-input"
              type="number"
              value={draft}
              min={0}
              max={99}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runPush();
              }}
              aria-label="Key to push onto the heap"
              disabled={busy}
            />
          </label>
          <button type="button" className="btn" onClick={runPush} disabled={busy} aria-label="Push key (sift up)">
            push ↑
          </button>
          <button
            type="button"
            className="btn"
            onClick={runPop}
            disabled={busy || heap.length === 0}
            aria-label="Pop the minimum (sift down)"
          >
            pop min ↓
          </button>
          <button type="button" className="btn" onClick={runHeapify} disabled={busy} aria-label="Build a heap from 8 random values">
            heapify random
          </button>
        </div>
      }
      footer={
        <div className="heap-foot">
          <code className="heap-arith">{arithHint}</code>
          <div className="heap-legend" role="list" aria-label="Colour legend">
            <span className="heap-legrow" role="listitem">
              <span className="heap-swatch heap-swatch--node" aria-hidden="true" /> heap node
            </span>
            <span className="heap-legrow" role="listitem">
              <span className="heap-swatch heap-swatch--active" aria-hidden="true" /> active / comparing
            </span>
            <span className="heap-legrow" role="listitem">
              <span className="heap-swatch heap-swatch--root" aria-hidden="true" /> root = min
            </span>
          </div>
        </div>
      }
    >
      <div className="heap-stage">
        {/* View 1 — the flat array as indexed cells. */}
        <div className="heap-pane">
          <div className="heap-pane-title">array</div>
          {shownArray.length === 0 ? (
            <div className="heap-empty">empty</div>
          ) : (
            <ol className="heap-cells" aria-label="Heap as a flat array">
              {shownArray.map((v, i) => (
                <li
                  key={i}
                  className={cx(
                    "heap-cell",
                    activeSet.has(i) && "heap-cell--active",
                    i === 0 && "heap-cell--root",
                  )}
                >
                  <span className="heap-cell-val">{v}</span>
                  <span className="heap-cell-idx" aria-hidden="true">
                    {i}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* View 2 — the same array drawn as a complete binary tree. */}
        <div className="heap-pane heap-pane--tree">
          <div className="heap-pane-title">complete binary tree</div>
          {shownArray.length === 0 ? (
            <div className="heap-empty">empty</div>
          ) : (
            <svg
              className="heap-tree"
              viewBox={`0 0 ${W} ${svgH}`}
              role="img"
              aria-label={`Heap of ${shownArray.length} nodes drawn as a complete binary tree; root value ${shownArray[0]}`}
            >
              {/* edges first (parent → child), so nodes sit on top */}
              {layout.nodes.map((n) => {
                if (n.index === 0) return null;
                const p = layout.nodes[parentOf(n.index)];
                const active = activeSet.has(n.index) && activeSet.has(p.index);
                return (
                  <line
                    key={`e${n.index}`}
                    x1={xOf(p.x)}
                    y1={yOf(p.depth)}
                    x2={xOf(n.x)}
                    y2={yOf(n.depth)}
                    stroke={active ? "var(--sem-control)" : "var(--line)"}
                    strokeWidth={active ? 2.5 : 1.25}
                  />
                );
              })}
              {/* nodes */}
              {layout.nodes.map((n) => {
                const isActive = activeSet.has(n.index);
                const isRoot = n.index === 0;
                const fill = isActive
                  ? "var(--sem-control)"
                  : isRoot
                    ? "var(--sem-ok)"
                    : "var(--p4)";
                return (
                  <g key={`n${n.index}`}>
                    <circle
                      cx={xOf(n.x)}
                      cy={yOf(n.depth)}
                      r={NODE_R}
                      fill={fill}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                    <text
                      x={xOf(n.x)}
                      y={yOf(n.depth) + 4}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                      fill="var(--surface)"
                    >
                      {n.value}
                    </text>
                    <text
                      x={xOf(n.x)}
                      y={yOf(n.depth) + NODE_R + 12}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontFamily="var(--font-mono)"
                      fill={isActive ? "var(--sem-control)" : "var(--tx3)"}
                    >
                      i={n.index}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </SimShell>
  );
}
