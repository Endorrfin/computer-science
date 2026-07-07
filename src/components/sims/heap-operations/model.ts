// Engine — the binary heap, the data structure behind every priority queue and
// behind heapsort (ch.16). A heap is a COMPLETE binary tree (every level full
// except possibly the last, filled left-to-right) with the HEAP ORDER property:
// every parent is ≤ its children (a min-heap) — so the smallest key is always at
// the root, pullable in O(1), and re-heapifying after a change is O(log n).
//
// The beautiful part, and the thing the heap-operations sim exists to show, is
// that a complete tree needs no pointers at all: it lives in a flat ARRAY where
//   parent(i) = ⌊(i−1)/2⌋   left(i) = 2i+1   right(i) = 2i+2.
// The "tree" is just an indexing convention over a contiguous array (ch.14) —
// which is exactly why heaps are so cache-friendly and fast.
//
// Both mutating ops restore the invariant by walking ONE root-to-leaf path:
//   push  → append at the end, then SIFT UP  (swap with parent while smaller).
//   pop   → move the last element to the root, then SIFT DOWN (swap with the
//           smaller child while larger).
// build-heap (heapify) sifts down from the last internal node upward — the
// classic O(n) construction, not O(n log n) (see the formal corner in ch.15).
//
// Every op returns a `trace` of steps (the array after each compare/swap) so the
// sim animates it and scripts/test-ch15.ts pins the exact sequences.

export type HeapStepKind = "append" | "compare" | "swap" | "moveRoot" | "pop" | "settle" | "start";

export type HeapStep = {
  kind: HeapStepKind;
  /** The array AFTER this step. */
  array: number[];
  /** Indices this step touches (for highlighting): typically [child, parent]
      for sift-up or [parent, child] for sift-down. */
  active: number[];
  caption: string;
};

export type HeapOpResult = { array: number[]; steps: HeapStep[]; swaps: number; comparisons: number };
export type PopResult = HeapOpResult & { min: number | null };

const parent = (i: number): number => (i - 1) >> 1;
const leftChild = (i: number): number => 2 * i + 1;
const rightChild = (i: number): number => 2 * i + 2;

function swap(a: number[], i: number, j: number): void {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}

// ------------------------------------------------------------------
// push — append, then bubble the newcomer up while it is smaller than its
// parent. Worst case is a full climb to the root: O(log n).
// ------------------------------------------------------------------

export function push(heap: number[], key: number): HeapOpResult {
  const a = [...heap];
  const steps: HeapStep[] = [];
  let swaps = 0;
  let comparisons = 0;

  a.push(key);
  let i = a.length - 1;
  steps.push({ kind: "append", array: [...a], active: [i], caption: `Append ${key} at the end (index ${i}) — the only spot that keeps the tree complete.` });

  while (i > 0) {
    const p = parent(i);
    comparisons++;
    if (a[i] < a[p]) {
      steps.push({ kind: "compare", array: [...a], active: [i, p], caption: `${a[i]} < parent ${a[p]} → swap up.` });
      swap(a, i, p);
      swaps++;
      steps.push({ kind: "swap", array: [...a], active: [p, i], caption: `Swapped — ${a[p]} climbs toward the root.` });
      i = p;
    } else {
      steps.push({ kind: "settle", array: [...a], active: [i, p], caption: `${a[i]} ≥ parent ${a[p]} → heap order restored.` });
      break;
    }
  }
  if (i === 0) steps.push({ kind: "settle", array: [...a], active: [0], caption: `${a[0]} reached the root — done.` });
  return { array: a, steps, swaps, comparisons };
}

// ------------------------------------------------------------------
// pop — remove the minimum (the root). Move the last element up to the root to
// keep the tree complete, then sift it down, always swapping with the SMALLER
// child, until it is ≤ both children. O(log n).
// ------------------------------------------------------------------

export function pop(heap: number[]): PopResult {
  const a = [...heap];
  const steps: HeapStep[] = [];
  let swaps = 0;
  let comparisons = 0;

  if (a.length === 0) {
    return { array: a, steps, swaps, comparisons, min: null };
  }
  const min = a[0];
  const last = a.pop() as number;
  if (a.length === 0) {
    steps.push({ kind: "pop", array: [], active: [], caption: `Removed the only element ${min}.` });
    return { array: a, steps, swaps, comparisons, min };
  }
  a[0] = last;
  steps.push({ kind: "moveRoot", array: [...a], active: [0], caption: `Take out the min ${min}; move the last element ${last} to the root to keep the tree complete.` });

  let i = 0;
  const n = a.length;
  for (;;) {
    const l = leftChild(i);
    const r = rightChild(i);
    let smallest = i;
    if (l < n) {
      comparisons++;
      if (a[l] < a[smallest]) smallest = l;
    }
    if (r < n) {
      comparisons++;
      if (a[r] < a[smallest]) smallest = r;
    }
    if (smallest === i) {
      steps.push({ kind: "settle", array: [...a], active: [i], caption: `${a[i]} is ≤ its children → heap order restored.` });
      break;
    }
    steps.push({ kind: "compare", array: [...a], active: [i, smallest], caption: `${a[i]} > smaller child ${a[smallest]} → swap down.` });
    swap(a, i, smallest);
    swaps++;
    steps.push({ kind: "swap", array: [...a], active: [smallest, i], caption: `Swapped — ${a[smallest]} sinks toward the leaves.` });
    i = smallest;
  }
  return { array: a, steps, swaps, comparisons, min };
}

export function peek(heap: number[]): number | null {
  return heap.length > 0 ? heap[0] : null;
}

// ------------------------------------------------------------------
// heapify (build-heap) — turn an arbitrary array into a heap in O(n) by sifting
// down every internal node, starting from the LAST one (index ⌊n/2⌋−1) and
// working back to the root. Leaves are already trivially heaps, so we skip them.
// ------------------------------------------------------------------

export function heapify(input: number[]): HeapOpResult {
  const a = [...input];
  const steps: HeapStep[] = [];
  let swaps = 0;
  let comparisons = 0;
  const n = a.length;

  steps.push({ kind: "start", array: [...a], active: [], caption: `Build-heap: sift down every internal node, from the last one back to the root.` });

  const siftDown = (start: number): void => {
    let i = start;
    for (;;) {
      const l = leftChild(i);
      const r = rightChild(i);
      let smallest = i;
      if (l < n) {
        comparisons++;
        if (a[l] < a[smallest]) smallest = l;
      }
      if (r < n) {
        comparisons++;
        if (a[r] < a[smallest]) smallest = r;
      }
      if (smallest === i) break;
      steps.push({ kind: "compare", array: [...a], active: [i, smallest], caption: `${a[i]} > ${a[smallest]} → swap down.` });
      swap(a, i, smallest);
      swaps++;
      steps.push({ kind: "swap", array: [...a], active: [smallest, i], caption: `Swapped.` });
      i = smallest;
    }
  };

  for (let start = (n >> 1) - 1; start >= 0; start--) {
    steps.push({ kind: "settle", array: [...a], active: [start], caption: `Sift down from index ${start} (value ${a[start]}).` });
    siftDown(start);
  }
  steps.push({ kind: "settle", array: [...a], active: [], caption: `Every parent ≤ its children — the array is now a heap.` });
  return { array: a, steps, swaps, comparisons };
}

// ------------------------------------------------------------------
// Invariant checker — used by tests.
// ------------------------------------------------------------------

export function isMinHeap(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (a[i] < a[parent(i)]) return false;
  }
  return true;
}

/** Repeatedly popping a min-heap yields the keys in ascending order — the tests
    use this to prove the structure is a real priority queue. */
export function drainSorted(heap: number[]): number[] {
  let h = [...heap];
  const out: number[] = [];
  while (h.length > 0) {
    const r = pop(h);
    if (r.min !== null) out.push(r.min);
    h = r.array;
  }
  return out;
}

// ------------------------------------------------------------------
// Array ↔ tree layout for the sim: map each array index to an (x, y) on a
// complete-tree grid. Depth is ⌊log₂(i+1)⌋; x spreads nodes across their level.
// ------------------------------------------------------------------

export type HeapLaidNode = { index: number; value: number; depth: number; x: number };

export function heapLayout(a: number[]): { nodes: HeapLaidNode[]; depth: number } {
  const nodes: HeapLaidNode[] = [];
  let maxDepth = 0;
  for (let i = 0; i < a.length; i++) {
    const depth = Math.floor(Math.log2(i + 1));
    maxDepth = Math.max(maxDepth, depth);
    const levelStart = (1 << depth) - 1; // first index at this depth
    const posInLevel = i - levelStart;
    const levelCount = 1 << depth;
    // center each node in its slot of a [0,1] band
    const x = (posInLevel + 0.5) / levelCount;
    nodes.push({ index: i, value: a[i], depth, x });
  }
  return { nodes, depth: maxDepth };
}

export const parentOf = parent;
export const leftOf = leftChild;
export const rightOf = rightChild;
