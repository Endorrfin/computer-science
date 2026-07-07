// Engine — the sorting race. Seven classic sorts run on the SAME input and are
// instrumented so the sim can race them honestly. This is ch.16's whole thesis:
// "which sort is fastest?" has no single answer — it depends on the data and on
// what you count. So every algorithm here is measured on ONE fair, universal
// metric: ARRAY ACCESSES (reads + writes) — the count of times it touches a
// memory cell, comparison or not. Comparisons are counted too, as a secondary
// readout, because they expose the punchline:
//
//   • The five COMPARISON sorts (insertion, selection, merge, quick, heap)
//     order elements by asking "is a < b?". No comparison sort can beat
//     Ω(n log n) comparisons in the worst case (ch.16 formal corner).
//   • The two NON-COMPARISON sorts (counting, radix) never compare two elements
//     at all — their comparison column is a hard ZERO. They sort by using keys
//     as array indices, escaping the Ω(n log n) bound and running in O(n + k).
//     The catch the race makes visible: their cost carries a `k` term (the key
//     range / digit count), so they only win when k stays small relative to n.
//
// Racing all seven on "comparisons" would be dishonest (two of them make none);
// racing on ACCESSES is fair to all seven and still tells the real story. That
// design decision is the honest way to grant "all seven in one race".
//
// Each run returns a `frames` trace (array snapshot + highlighted indices +
// running meters) so the sim animates bars, plus final totals. Inputs are
// NON-NEGATIVE integers (counting/radix need that); n is kept small so traces
// stay light. No React import — runs under scripts/test-ch16.ts.

export type SortId = "insertion" | "selection" | "merge" | "quick" | "heap" | "counting" | "radix";

export type Frame = {
  /** The main array as it stands after this step (a fresh copy). */
  array: number[];
  /** Indices this step is comparing / writing — for highlighting. */
  active: number[];
  /** Indices considered final/sorted, for a "settled" highlight (optional). */
  settled: number[];
  reads: number;
  writes: number;
  comparisons: number;
  /** reads + writes — the fair race metric. */
  accesses: number;
  note: string;
};

export type SortRun = {
  id: SortId;
  frames: Frame[];
  reads: number;
  writes: number;
  comparisons: number;
  accesses: number;
};

export type SortMeta = {
  id: SortId;
  name: string;
  kind: "comparison" | "non-comparison";
  stable: boolean;
  color: string; // CSS custom property
  best: string;
  worst: string;
  blurb: string;
};

// Display metadata (the claims; scripts/test-ch16.ts verifies stability & the
// zero-comparison property empirically).
export const SORTS: SortMeta[] = [
  { id: "insertion", name: "Insertion", kind: "comparison", stable: true, color: "var(--sem-data)", best: "O(n)", worst: "O(n²)", blurb: "Grow a sorted prefix, sliding each new card into place. Superb on nearly-sorted data (near-linear), quadratic on random." },
  { id: "selection", name: "Selection", kind: "comparison", stable: false, color: "var(--sem-control)", best: "O(n²)", worst: "O(n²)", blurb: "Repeatedly find the minimum and swap it to the front. Always n²/2 comparisons — but only n swaps, the fewest writes of any sort here." },
  { id: "merge", name: "Merge", kind: "comparison", stable: true, color: "var(--p4)", best: "O(n log n)", worst: "O(n log n)", blurb: "Divide in half, sort each, merge. Guaranteed n log n and stable — at the cost of O(n) extra memory for the merge buffer." },
  { id: "quick", name: "Quick", kind: "comparison", stable: false, color: "var(--sem-state)", best: "O(n log n)", worst: "O(n²)", blurb: "Partition around a pivot, recurse. Fast in practice with great cache behavior — but a bad pivot (e.g. already-sorted, last-element pivot) degrades to n²." },
  { id: "heap", name: "Heap", kind: "comparison", stable: false, color: "var(--p1)", best: "O(n log n)", worst: "O(n log n)", blurb: "Build a max-heap in place, then pop the max to the end n times. Worst-case n log n with O(1) extra space — but pointer-jumpy, so cache-unfriendly." },
  { id: "counting", name: "Counting", kind: "non-comparison", stable: true, color: "var(--sem-ok)", best: "O(n + k)", worst: "O(n + k)", blurb: "Tally how many of each key, then place by running totals. Zero comparisons. Wins big when the key range k is O(n); the k term hurts when keys are sparse." },
  { id: "radix", name: "Radix (LSD)", kind: "non-comparison", stable: true, color: "#f472b6", best: "O(d·(n + b))", worst: "O(d·(n + b))", blurb: "Counting-sort the keys one digit at a time, least-significant first. Zero comparisons; cost scales with the number of digits d, not with n log n." },
];

export function sortMetaById(id: SortId): SortMeta {
  return SORTS.find((s) => s.id === id) as SortMeta;
}

// ------------------------------------------------------------------
// The instrumentation context. A plain mutable object (no classes / TS-only
// syntax) that owns the working array, the three counters, and the frame log.
// Every array touch goes through read()/write() so the metric is exact; frames
// are emitted at compares and writes so the animation is legible but bounded.
// ------------------------------------------------------------------

type Ctx = {
  a: number[];
  reads: number;
  writes: number;
  comparisons: number;
  frames: Frame[];
  settled: number[];
  read: (i: number) => number;
  write: (i: number, v: number) => void;
  /** Compare the VALUES at indices i and j (2 reads + 1 comparison), emit a
      frame, and return a[i] − a[j]. */
  cmp: (i: number, j: number) => number;
  /** Compare a[i] against a saved VALUE (1 read + 1 comparison) — used by
      insertion sort, whose key lives in a register, not in the array. */
  cmpVal: (i: number, val: number, other: number) => number;
  /** Bump the read counter without an array index (aux-array read). */
  auxRead: (k?: number) => void;
  /** Bump the write counter for aux-array writes. */
  auxWrite: (k?: number) => void;
  snap: (active: number[], note: string) => void;
};

function makeCtx(input: number[]): Ctx {
  const ctx: Ctx = {
    a: [...input],
    reads: 0,
    writes: 0,
    comparisons: 0,
    frames: [],
    settled: [],
    read(i) {
      this.reads++;
      return this.a[i];
    },
    write(i, v) {
      this.writes++;
      this.a[i] = v;
    },
    cmp(i, j) {
      this.reads += 2;
      this.comparisons++;
      const d = this.a[i] - this.a[j];
      this.snap([i, j], `compare a[${i}]=${this.a[i]} vs a[${j}]=${this.a[j]}`);
      return d;
    },
    cmpVal(i, val, other) {
      this.reads += 1;
      this.comparisons++;
      const d = this.a[i] - val;
      this.snap([i, other], `compare a[${i}]=${this.a[i]} vs key ${val}`);
      return d;
    },
    auxRead(k = 1) {
      this.reads += k;
    },
    auxWrite(k = 1) {
      this.writes += k;
    },
    snap(active, note) {
      this.frames.push({
        array: [...this.a],
        active,
        settled: [...this.settled],
        reads: this.reads,
        writes: this.writes,
        comparisons: this.comparisons,
        accesses: this.reads + this.writes,
        note,
      });
    },
  };
  return ctx;
}

function finish(id: SortId, ctx: Ctx): SortRun {
  ctx.settled = ctx.a.map((_, i) => i);
  ctx.snap([], "sorted");
  return {
    id,
    frames: ctx.frames,
    reads: ctx.reads,
    writes: ctx.writes,
    comparisons: ctx.comparisons,
    accesses: ctx.reads + ctx.writes,
  };
}

function swap(ctx: Ctx, i: number, j: number): void {
  const vi = ctx.read(i);
  const vj = ctx.read(j);
  ctx.write(i, vj);
  ctx.write(j, vi);
  ctx.snap([i, j], `swap a[${i}] ↔ a[${j}]`);
}

// ------------------------------------------------------------------
// (1) Insertion sort — stable. Grow a sorted prefix; slide each element left
// past larger neighbours. O(n) on sorted input (each element compares once and
// stops), O(n²) on reversed.
// ------------------------------------------------------------------

function insertionSort(input: number[]): SortRun {
  const ctx = makeCtx(input);
  const n = ctx.a.length;
  for (let i = 1; i < n; i++) {
    const key = ctx.read(i); // save the incoming element in a register
    let j = i - 1;
    // slide every element greater than `key` one slot to the right. The compare
    // is against the SAVED key, not a[j+1] — a[j+1] gets overwritten by the shift.
    while (j >= 0 && ctx.cmpVal(j, key, i) > 0) {
      ctx.write(j + 1, ctx.read(j));
      ctx.snap([j, j + 1], `shift ${ctx.a[j + 1]} right`);
      j--;
    }
    ctx.write(j + 1, key);
    ctx.snap([j + 1], `place ${key}`);
  }
  return finish("insertion", ctx);
}

// ------------------------------------------------------------------
// (2) Selection sort — unstable. Find the minimum of the unsorted suffix and
// swap it to the boundary. Always n(n−1)/2 comparisons; only n−1 swaps (the
// fewest writes here — its one virtue).
// ------------------------------------------------------------------

function selectionSort(input: number[]): SortRun {
  const ctx = makeCtx(input);
  const n = ctx.a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      if (ctx.cmp(j, min) < 0) min = j;
    }
    if (min !== i) swap(ctx, i, min);
    ctx.settled.push(i);
  }
  return finish("selection", ctx);
}

// ------------------------------------------------------------------
// (3) Merge sort — stable. Top-down: split, sort halves, merge with an aux
// buffer written back into the main array (so the bars animate in place).
// Guaranteed O(n log n), at O(n) extra space.
// ------------------------------------------------------------------

function mergeSort(input: number[]): SortRun {
  const ctx = makeCtx(input);

  const merge = (lo: number, mid: number, hi: number): void => {
    // copy [lo..hi] into an aux buffer (reads main, writes aux)
    const buf: number[] = [];
    for (let i = lo; i <= hi; i++) {
      buf.push(ctx.read(i));
      ctx.auxWrite();
    }
    let i = 0; // index into left half within buf
    let j = mid - lo + 1; // index into right half within buf
    const leftEnd = mid - lo;
    const rightEnd = hi - lo;
    for (let k = lo; k <= hi; k++) {
      if (i > leftEnd) {
        ctx.auxRead();
        ctx.write(k, buf[j++]);
      } else if (j > rightEnd) {
        ctx.auxRead();
        ctx.write(k, buf[i++]);
      } else {
        ctx.comparisons++;
        ctx.auxRead(2); // read both buffered operands
        if (buf[i] <= buf[j]) ctx.write(k, buf[i++]);
        else ctx.write(k, buf[j++]);
      }
      ctx.snap([k], `merge → position ${k}`);
    }
  };

  const sort = (lo: number, hi: number): void => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  };

  sort(0, ctx.a.length - 1);
  return finish("merge", ctx);
}

// ------------------------------------------------------------------
// (4) Quick sort — unstable. Lomuto partition around the LAST element as pivot;
// recurse on the two sides. Excellent average behavior; a deliberately naive
// last-element pivot makes already-sorted / reversed input hit the O(n²) worst
// case — a lesson the race shows on the "sorted" preset.
// ------------------------------------------------------------------

function quickSort(input: number[]): SortRun {
  const ctx = makeCtx(input);

  const partition = (lo: number, hi: number): number => {
    const pivot = ctx.read(hi); // pivot value
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      ctx.reads++; // read a[j]
      ctx.comparisons++;
      ctx.snap([j, hi], `compare a[${j}]=${ctx.a[j]} vs pivot ${pivot}`);
      if (ctx.a[j] < pivot) {
        i++;
        if (i !== j) swap(ctx, i, j);
      }
    }
    if (i + 1 !== hi) swap(ctx, i + 1, hi);
    return i + 1;
  };

  const sort = (lo: number, hi: number): void => {
    if (lo >= hi) return;
    const p = partition(lo, hi);
    ctx.settled.push(p);
    sort(lo, p - 1);
    sort(p + 1, hi);
  };

  sort(0, ctx.a.length - 1);
  return finish("quick", ctx);
}

// ------------------------------------------------------------------
// (5) Heap sort — unstable. Build a MAX-heap in place, then repeatedly swap the
// max (root) to the end of the unsorted region and sift down. In-place, worst-
// case O(n log n); comparison-heavy and cache-jumpy.
// ------------------------------------------------------------------

function heapSort(input: number[]): SortRun {
  const ctx = makeCtx(input);
  const n = ctx.a.length;

  const siftDown = (start: number, end: number): void => {
    let root = start;
    for (;;) {
      const l = 2 * root + 1;
      const r = 2 * root + 2;
      let largest = root;
      if (l < end) {
        ctx.comparisons++;
        ctx.reads += 2;
        ctx.snap([l, largest], `compare child a[${l}] vs a[${largest}]`);
        if (ctx.a[l] > ctx.a[largest]) largest = l;
      }
      if (r < end) {
        ctx.comparisons++;
        ctx.reads += 2;
        ctx.snap([r, largest], `compare child a[${r}] vs a[${largest}]`);
        if (ctx.a[r] > ctx.a[largest]) largest = r;
      }
      if (largest === root) break;
      swap(ctx, root, largest);
      root = largest;
    }
  };

  // build max-heap
  for (let start = (n >> 1) - 1; start >= 0; start--) siftDown(start, n);
  // sort: pop max to the end, shrink, sift
  for (let end = n - 1; end > 0; end--) {
    swap(ctx, 0, end);
    ctx.settled.push(end);
    siftDown(0, end);
  }
  return finish("heap", ctx);
}

// ------------------------------------------------------------------
// (6) Counting sort — stable, NON-comparison. Tally occurrences of each key
// 0..k, turn tallies into running totals (start positions), then place each
// element from the right to preserve stability. Zero element comparisons.
// Cost O(n + k): great when k = O(n), wasteful when keys are sparse.
// ------------------------------------------------------------------

function countingSort(input: number[]): SortRun {
  const ctx = makeCtx(input);
  const n = ctx.a.length;
  if (n === 0) return finish("counting", ctx);

  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, ctx.read(i));
  const k = max + 1;
  const count = new Array<number>(k).fill(0);
  ctx.auxWrite(k);
  ctx.snap([], `allocate ${k} counters (key range 0..${max})`);

  // tally
  for (let i = 0; i < n; i++) {
    const v = ctx.read(i);
    ctx.auxRead();
    ctx.auxWrite();
    count[v]++;
    ctx.snap([i], `tally key ${v}`);
  }
  // running totals → each count[v] becomes the start index of value v
  let total = 0;
  for (let v = 0; v < k; v++) {
    const c = count[v];
    ctx.auxRead();
    ctx.auxWrite();
    count[v] = total;
    total += c;
  }
  ctx.snap([], `counts → running totals (start positions)`);

  // place stably, scanning input left-to-right (start-position variant keeps
  // equal keys in their original order)
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const v = ctx.read(i);
    ctx.auxRead(); // read count[v]
    const pos = count[v];
    count[v] = pos + 1;
    ctx.auxWrite(); // update count[v]
    out[pos] = v;
    ctx.auxWrite(); // write out[pos]
  }
  // copy back into the main array (animates the sorted bars)
  for (let i = 0; i < n; i++) {
    ctx.auxRead();
    ctx.write(i, out[i]);
    ctx.snap([i], `place ${out[i]} at index ${i}`);
  }
  return finish("counting", ctx);
}

// ------------------------------------------------------------------
// (7) Radix sort (LSD) — stable, NON-comparison. Counting-sort the keys one
// decimal digit at a time, least-significant first; stability across passes is
// what makes it correct. Zero comparisons; cost O(d·(n + base)) with d = number
// of digits — so it beats n log n once keys have few digits.
// ------------------------------------------------------------------

function radixSort(input: number[]): SortRun {
  const ctx = makeCtx(input);
  const n = ctx.a.length;
  if (n === 0) return finish("radix", ctx);

  const BASE = 10;
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, ctx.read(i));

  for (let exp = 1; Math.floor(max / exp) > 0; exp *= BASE) {
    const count = new Array<number>(BASE).fill(0);
    ctx.auxWrite(BASE);
    // tally this digit
    for (let i = 0; i < n; i++) {
      const v = ctx.read(i);
      const d = Math.floor(v / exp) % BASE;
      ctx.auxRead();
      ctx.auxWrite();
      count[d]++;
      ctx.snap([i], `digit ${d} of ${v} (place ${exp})`);
    }
    // running totals
    let total = 0;
    for (let d = 0; d < BASE; d++) {
      const c = count[d];
      ctx.auxRead();
      ctx.auxWrite();
      count[d] = total;
      total += c;
    }
    // stable placement by this digit (scan left-to-right, start-position variant)
    const out = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const v = ctx.read(i);
      const d = Math.floor(v / exp) % BASE;
      ctx.auxRead();
      const pos = count[d];
      count[d] = pos + 1;
      ctx.auxWrite();
      out[pos] = v;
      ctx.auxWrite();
    }
    // copy back — the array is now sorted by digits up to this place
    for (let i = 0; i < n; i++) {
      ctx.auxRead();
      ctx.write(i, out[i]);
      ctx.snap([i], `pass place ${exp}: index ${i} ← ${out[i]}`);
    }
  }
  return finish("radix", ctx);
}

// ------------------------------------------------------------------
// Dispatch + helpers.
// ------------------------------------------------------------------

const IMPLS: Record<SortId, (input: number[]) => SortRun> = {
  insertion: insertionSort,
  selection: selectionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort,
  counting: countingSort,
  radix: radixSort,
};

export function runSort(id: SortId, input: number[]): SortRun {
  return IMPLS[id](input);
}

/** Run every sort on the same input — the race. */
export function runAll(input: number[]): SortRun[] {
  return SORTS.map((s) => runSort(s.id, input));
}

export function isSorted(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}

// ------------------------------------------------------------------
// Data-shape presets for the race. Deterministic (seeded) so runs reproduce.
// ------------------------------------------------------------------

export type DataShape = "random" | "sorted" | "reversed" | "fewUnique";

/** A tiny deterministic PRNG (mulberry32) so "random" inputs reproduce. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeData(shape: DataShape, n: number, seed = 1): number[] {
  const rnd = mulberry32(seed);
  if (shape === "sorted") return Array.from({ length: n }, (_, i) => i + 1);
  if (shape === "reversed") return Array.from({ length: n }, (_, i) => n - i);
  if (shape === "fewUnique") return Array.from({ length: n }, () => Math.floor(rnd() * 4)); // keys 0..3
  return Array.from({ length: n }, () => 1 + Math.floor(rnd() * (n))); // random 1..n
}
