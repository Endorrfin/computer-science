// Engine — the "growth racer": six algorithms of escalating complexity, each
// one INSTRUMENTED with an operation counter rather than merely plotted from a
// formula. This is the whole pedagogical point of ch.13: Big-O is not a graph
// we draw, it is a count of work that real code actually does. So every
// algorithm here runs on a synthetic input of size n and increments a shared
// `Counter.ops` on each unit of work; the measured count is what the sim shows.
//
// The catch is that the two worst algorithms (2ⁿ and n!) are literally
// unrunnable past small n — 2^60 iterations would hang the browser forever, and
// 30! doesn't even fit in a double. So each algorithm ALSO carries a `formula`:
// the closed-form op count. `run(n)` executes the instrumented code where that
// is feasible and falls back to `formula(n)` past a hard guard. The invariant
// the test pins is: run(n) === formula(n) for every feasible n. The formula is
// therefore not a fudge — it is the exact same number the loop would have
// produced, just computed instead of counted.
//
// Cost model (what counts as "one op"): the dominant repeated step.
//   constant     — one array read.
//   linear       — one add per element.
//   logarithmic  — one probe per binary-search halving.
//   quadratic    — one comparison per inner-loop iteration.
//   exponential  — one visit per subset enumerated.
//   factorial    — one visit per permutation generated.
// These are deliberately the textbook counts (n, ⌊log₂n⌋+1, n(n−1)/2, 2ⁿ, n!)
// so the curves line up with the ladder figure and the prose.

/** The shared operation counter. Passed into each instrumented snippet and
    bumped once per unit of work. A plain object so the mutation is obvious and
    Node-testable — no hidden state, no globals. */
export type Counter = { ops: number };

export function newCounter(): Counter {
  return { ops: 0 };
}

/** One algorithm on the track. `run` measures; `formula` is the closed form. */
export type GrowthAlgo = {
  id: string;
  name: string;
  bigO: string; // display label, e.g. "O(n)"
  color: string; // CSS custom-property reference for the curve
  /** Short real-TS source shown verbatim in the UI (the thing being counted). */
  snippet: string;
  /** Execute the instrumented algorithm on size n and return the op count.
      For guarded algorithms, returns formula(n) past the safe threshold. */
  run: (n: number) => number;
  /** Closed-form op count — exact, used for plotting and for huge n. */
  formula: (n: number) => number;
  /** Beyond this n, `run` returns `formula` without executing (anti-hang). */
  runCap: number;
};

// ------------------------------------------------------------------
// Synthetic inputs. Deterministic so runs are reproducible and the test can
// reason about them. We only need shapes, not real data.
// ------------------------------------------------------------------

/** A sorted array [0,1,…,n-1] — the natural input for scan / binary search. */
function sortedArray(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// ------------------------------------------------------------------
// Instrumented algorithms. Each takes the input and a Counter; the RETURN value
// is thrown away (we care only about c.ops). Kept as tiny, honest code so the
// snippet strings below faithfully mirror what actually runs.
// ------------------------------------------------------------------

/** O(1): look at the first element. One read, whatever n is. */
function opConstant(a: number[], c: Counter): number {
  c.ops++; // the single array read
  return a.length > 0 ? a[0] : -1;
}

/** O(n): sum every element. One add per element ⇒ exactly n ops. */
function opLinear(a: number[], c: Counter): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    c.ops++; // one add
    sum += a[i];
  }
  return sum;
}

/** O(log n): worst-case binary search. Each probe halves the range, so the
    deepest path takes ⌊log₂n⌋+1 probes for n≥1. To force that full depth we
    search for `n − 0.5`: a value that is absent (the array holds integers) yet
    sits just below the top element, so every probe pushes `lo` up by one
    halving and the range never collapses early — the genuine worst case, not
    the lucky short path you'd get searching off the low end. */
function opLogarithmic(a: number[], c: Counter): number {
  const n = a.length;
  let lo = 0;
  let hi = n - 1;
  let probes = 0;
  const target = n - 0.5; // absent, near the top → drives the deepest path
  while (lo <= hi) {
    c.ops++; // one probe (midpoint compare)
    probes++;
    const mid = (lo + hi) >> 1;
    if (a[mid] === target) return probes;
    if (a[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return probes;
}

/** O(n²): the comparison count of a selection/bubble double loop. The inner
    loop runs (n-1)+(n-2)+…+1 = n(n-1)/2 comparisons. We count comparisons only
    (the classic quadratic term); we do not need to actually sort. */
function opQuadratic(a: number[], c: Counter): number {
  const n = a.length;
  let cmps = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      c.ops++; // one comparison a[i] vs a[j]
      cmps++;
    }
  }
  return cmps;
}

/** O(2ⁿ): enumerate every subset of an n-element set by counting up a binary
    mask 0…2ⁿ-1. Each mask IS one subset, so we visit exactly 2ⁿ of them. This
    is real work (a genuine loop over all subsets), not a formula — but it is
    only ever called under the runCap guard, because 2⁴⁰ would never return. */
function opExponential(n: number, c: Counter): number {
  const total = Math.pow(2, n); // safe: caller guarantees small n
  for (let mask = 0; mask < total; mask++) {
    c.ops++; // visit one subset
  }
  return total;
}

/** O(n!): generate every permutation of [0…n-1] via Heap's algorithm and count
    each complete arrangement. Produces exactly n! visits. Real recursion — but,
    like the exponential case, only invoked for tiny n behind the guard. */
function opFactorial(n: number, c: Counter): number {
  const arr = sortedArray(n);
  // Heap's algorithm (iterative-ish recursion). Counts one op per full perm.
  const permute = (k: number): void => {
    if (k === 1) {
      c.ops++; // one complete permutation emitted
      return;
    }
    for (let i = 0; i < k; i++) {
      permute(k - 1);
      // swap to generate the next arrangement
      const j = k % 2 === 0 ? i : 0;
      const tmp = arr[j];
      arr[j] = arr[k - 1];
      arr[k - 1] = tmp;
    }
  };
  if (n <= 0) {
    c.ops++; // the empty permutation (0! = 1)
    return 1;
  }
  permute(n);
  return c.ops;
}

// ------------------------------------------------------------------
// Closed-form op counts. Exact integers; these are what run() must reproduce
// for feasible n and what the curves are plotted from for all n.
// ------------------------------------------------------------------

function factorialOf(n: number): number {
  // n! as a float. Exact for n ≤ 18; beyond that it's an approximation that
  // still conveys "astronomically large" for the log-scale plot.
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

// ------------------------------------------------------------------
// The algorithm table. `runCap` is the hard anti-hang threshold: at or below
// it we actually execute the instrumented code; above it we return `formula`.
// The caps (20 for 2ⁿ ≈ 1M ops, 9 for n! = 362 880 ops) keep every real run
// well under a millisecond.
// ------------------------------------------------------------------

const CONSTANT: GrowthAlgo = {
  id: "constant",
  name: "constant",
  bigO: "O(1)",
  color: "var(--sem-ok)",
  snippet: "function first(a: number[]) {\n  return a[0]; // 1 read, always\n}",
  formula: () => 1,
  runCap: Number.MAX_SAFE_INTEGER,
  run(n) {
    const c = newCounter();
    opConstant(sortedArray(Math.max(1, Math.min(n, 1))), c);
    return c.ops;
  },
};

const LINEAR: GrowthAlgo = {
  id: "linear",
  name: "linear",
  bigO: "O(n)",
  color: "var(--sem-data)",
  snippet: "function sum(a: number[]) {\n  let s = 0;\n  for (const x of a) s += x; // n adds\n  return s;\n}",
  formula: (n) => Math.max(0, n),
  runCap: 5_000_000, // scanning up to 5M elements is still instant
  run(n) {
    if (n > this.runCap) return this.formula(n);
    const c = newCounter();
    opLinear(sortedArray(Math.max(0, n)), c);
    return c.ops;
  },
};

const LOGARITHMIC: GrowthAlgo = {
  id: "logarithmic",
  name: "logarithmic",
  bigO: "O(log n)",
  color: "var(--p4)",
  snippet:
    "function bsearch(a: number[], x) {\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {         // ⌊log₂n⌋+1 probes\n    const m = (lo + hi) >> 1;\n    if (a[m] === x) return m;\n    a[m] < x ? lo = m+1 : hi = m-1;\n  }\n}",
  // ⌊log₂n⌋+1 probes for n ≥ 1; 0 for n = 0 (empty range, loop never runs).
  formula: (n) => (n < 1 ? 0 : Math.floor(Math.log2(n)) + 1),
  runCap: 5_000_000,
  run(n) {
    if (n > this.runCap) return this.formula(n);
    const c = newCounter();
    opLogarithmic(sortedArray(Math.max(0, n)), c);
    return c.ops;
  },
};

const QUADRATIC: GrowthAlgo = {
  id: "quadratic",
  name: "quadratic",
  bigO: "O(n²)",
  color: "var(--p1)",
  snippet:
    "function pairs(a: number[]) {\n  for (let i = 0; i < a.length; i++)\n    for (let j = i+1; j < a.length; j++)\n      compare(a[i], a[j]); // n(n-1)/2\n}",
  formula: (n) => (n < 1 ? 0 : (n * (n - 1)) / 2),
  runCap: 5000, // 5000² / 2 ≈ 12.5M comparisons — the ceiling for live runs
  run(n) {
    if (n > this.runCap) return this.formula(n);
    const c = newCounter();
    opQuadratic(sortedArray(Math.max(0, n)), c);
    return c.ops;
  },
};

const EXPONENTIAL: GrowthAlgo = {
  id: "exponential",
  name: "exponential",
  bigO: "O(2ⁿ)",
  color: "var(--sem-control)",
  snippet:
    "function subsets(a: number[]) {\n  const n = a.length;\n  for (let m = 0; m < 2**n; m++)  // 2ⁿ subsets\n    visit(m);                    // one per subset\n}",
  formula: (n) => Math.pow(2, Math.max(0, n)),
  runCap: 20, // 2²⁰ ≈ 1.05M visits — anything larger would hang the tab
  run(n) {
    if (n > this.runCap) return this.formula(n); // guard: never enumerate 2^60
    const c = newCounter();
    opExponential(Math.max(0, n), c);
    return c.ops;
  },
};

const FACTORIAL: GrowthAlgo = {
  id: "factorial",
  name: "factorial",
  bigO: "O(n!)",
  color: "var(--sem-err)",
  snippet:
    "function permute(a: number[]) {\n  if (a.length <= 1) { visit(a); return; }\n  for (…) permute(rest); // n! arrangements\n}",
  formula: (n) => factorialOf(Math.max(0, n)),
  runCap: 9, // 9! = 362 880 visits — the last safely-runnable factorial
  run(n) {
    if (n > this.runCap) return this.formula(n); // guard: never generate 30!
    const c = newCounter();
    return opFactorial(Math.max(0, n), c);
  },
};

/** The six racers, ordered best → worst (the ladder order). `as const`-friendly:
    a plain readonly-intent array the sim maps over. */
export const GROWTH_ALGOS: GrowthAlgo[] = [
  CONSTANT,
  LINEAR,
  LOGARITHMIC,
  QUADRATIC,
  EXPONENTIAL,
  FACTORIAL,
];

export function growthAlgoById(id: string): GrowthAlgo | undefined {
  return GROWTH_ALGOS.find((a) => a.id === id);
}

/** Sampled points for plotting a curve up to nMax. Uses the closed-form
    `formula` (smooth, and defined for every n where run() would refuse). Steps
    n by 1 for small ranges and coarsens for large ones so the polyline stays
    light. Always includes n = nMax as the final point. */
export function curvePoints(algoId: string, nMax: number): { n: number; ops: number }[] {
  const algo = growthAlgoById(algoId);
  if (!algo || nMax < 1) return [];
  const step = nMax <= 64 ? 1 : Math.ceil(nMax / 64);
  const pts: { n: number; ops: number }[] = [];
  for (let n = 1; n <= nMax; n += step) pts.push({ n, ops: algo.formula(n) });
  if (pts.length === 0 || pts[pts.length - 1].n !== nMax) {
    pts.push({ n: nMax, ops: algo.formula(nMax) });
  }
  return pts;
}
