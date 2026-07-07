// Engine — ch.21 Complexity. Two sims share this file:
//   • brute-force-death-watch → how fast the search space grows and how long it
//     would take at a fixed rate of operations per second (the "n=… → centuries"
//     shock). Nothing here is solved; it just counts and converts to wall-clock.
//   • tsp-playground → the travelling-salesman problem for real: nearest-neighbour
//     and 2-opt heuristics next to the exact brute-force optimum, so you can see
//     "fast but not optimal" vs "optimal but exponential" as two numbers.
//
// The through-line of the chapter — verifying a solution is easy (P-ish) while
// finding one may be astronomically hard (the NP intuition) — is made concrete:
// tourLength (the "verify" side) is O(n); bruteForceOptimal (the "find" side)
// walks (n−1)!/2 tours. scripts/test-ch21.ts pins the counts, the time math,
// and the heuristic ordering (optimal ≤ 2-opt ≤ nearest-neighbour).
//
// No React import — runs under Node for the tests.

// ------------------------------- growth & time -------------------------------

export function pow2(n: number): number {
  return 2 ** n;
}

export function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Distinct undirected Hamiltonian cycles through n cities: (n−1)!/2. */
export function bruteForceTourCount(n: number): number {
  if (n < 3) return 1;
  return factorial(n - 1) / 2;
}

export type Growth = "linear" | "quadratic" | "exponential" | "factorial";

/** Operation count for a problem size under a chosen growth model — the "work"
    the death-watch displays. */
export function work(kind: Growth, n: number): number {
  switch (kind) {
    case "linear":
      return n;
    case "quadratic":
      return n * n;
    case "exponential":
      return pow2(n);
    case "factorial":
      return factorial(n);
  }
}

const SECONDS_PER_YEAR = 31_557_600; // Julian year, 365.25 d
const AGE_OF_UNIVERSE_YEARS = 1.38e10;

export type TimeEstimate = { seconds: number; human: string };

/** Convert an operation count to wall-clock at `rate` ops/second (default 1e9,
    "a billion operations a second"). */
export function timeAtRate(ops: number, rate: number = 1e9): TimeEstimate {
  const seconds = ops / rate;
  return { seconds, human: humanizeSeconds(seconds) };
}

/** Compact, honest human duration — from nanoseconds to "×10ⁿ years". */
export function humanizeSeconds(s: number): string {
  if (!isFinite(s)) return "essentially forever";
  if (s < 1e-6) return `${(s * 1e9).toFixed(0)} ns`;
  if (s < 1e-3) return `${(s * 1e6).toFixed(1)} µs`;
  if (s < 1) return `${(s * 1e3).toFixed(1)} ms`;
  if (s < 90) return `${s.toFixed(1)} s`;
  if (s < 5400) return `${(s / 60).toFixed(1)} min`;
  if (s < 172_800) return `${(s / 3600).toFixed(1)} hours`;
  if (s < 2 * SECONDS_PER_YEAR) return `${(s / 86_400).toFixed(1)} days`;
  const years = s / SECONDS_PER_YEAR;
  if (years < 1e3) return `${years.toFixed(0)} years`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)} thousand years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  if (years < 1e12) return `${(years / 1e9).toFixed(1)} billion years`;
  return `${sci(years)} years`;
}

/** How many times the age of the universe a duration in years represents. */
export function universeMultiple(years: number): number {
  return years / AGE_OF_UNIVERSE_YEARS;
}

function sci(x: number): string {
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return `${m.toFixed(1)}×10^${e}`;
}

// ------------------------------- subset-sum -------------------------------
// The decision problem "is there a subset summing to target?" — the death-watch
// counts the 2ⁿ subsets; this brute force actually decides it (small n only).

export type SubsetSumResult = { found: boolean; subset: number[]; checked: number; total: number };

export function subsetSumBrute(nums: number[], target: number): SubsetSumResult {
  const n = nums.length;
  const total = pow2(n);
  for (let mask = 0; mask < total; mask++) {
    let sum = 0;
    const subset: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += nums[i];
        subset.push(nums[i]);
      }
    }
    if (sum === target) return { found: true, subset, checked: mask + 1, total };
  }
  return { found: false, subset: [], checked: total, total };
}

// ------------------------------- TSP -------------------------------

export type City = { x: number; y: number };

export function dist(a: City, b: City): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Closed-tour length for a visiting order (returns to the start). */
export function tourLength(cities: City[], order: number[]): number {
  if (order.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < order.length; i++) {
    const a = cities[order[i]];
    const b = cities[order[(i + 1) % order.length]];
    d += dist(a, b);
  }
  return d;
}

/** Greedy nearest-neighbour tour from `start` — fast, often 20–25% over optimal. */
export function nearestNeighbor(cities: City[], start: number = 0): number[] {
  const n = cities.length;
  if (n === 0) return [];
  const visited = new Array<boolean>(n).fill(false);
  const order = [start];
  visited[start] = true;
  let cur = start;
  for (let k = 1; k < n; k++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const d = dist(cities[cur], cities[j]);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    visited[best] = true;
    order.push(best);
    cur = best;
  }
  return order;
}

/** 2-opt local search: repeatedly reverse a segment if it shortens the tour
    (i.e. uncross crossing edges) until no improvement remains. */
export function twoOpt(cities: City[], startOrder: number[]): number[] {
  const order = [...startOrder];
  const n = order.length;
  if (n < 4) return order;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        // Skip the whole-tour reversal (i=0, k=n-1): both removed edges are the
        // same wrap edge, so it's a direction flip — identical length, but the
        // delta below would read as an improvement forever (a non-termination bug).
        if (i === 0 && k === n - 1) continue;
        // edges (i-1,i) and (k,k+1) → reverse i..k
        const a = cities[order[(i - 1 + n) % n]];
        const b = cities[order[i]];
        const c = cities[order[k]];
        const d = cities[order[(k + 1) % n]];
        const before = dist(a, b) + dist(c, d);
        const after = dist(a, c) + dist(b, d);
        if (after + 1e-9 < before) {
          let lo = i;
          let hi = k;
          while (lo < hi) {
            const tmp = order[lo];
            order[lo] = order[hi];
            order[hi] = tmp;
            lo++;
            hi--;
          }
          improved = true;
        }
      }
    }
  }
  return order;
}

export type TspOptimal = { order: number[]; length: number; toursEvaluated: number };

/** Exact optimum by fixing city 0 and permuting the rest — (n−1)! permutations
    (the visible cost of "just try them all"). Only sane for n ≤ ~10. */
export function bruteForceOptimal(cities: City[]): TspOptimal {
  const n = cities.length;
  if (n <= 1) return { order: n === 1 ? [0] : [], length: 0, toursEvaluated: 0 };
  const rest = [];
  for (let i = 1; i < n; i++) rest.push(i);
  let best: number[] = [];
  let bestLen = Infinity;
  let count = 0;
  const permute = (arr: number[], k: number): void => {
    if (k === arr.length) {
      count++;
      const order = [0, ...arr];
      const len = tourLength(cities, order);
      if (len < bestLen) {
        bestLen = len;
        best = order;
      }
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  permute(rest, 0);
  return { order: best, length: bestLen, toursEvaluated: count };
}

/** A small demo instance the sim starts from (deterministic). */
export function demoCities(): City[] {
  return [
    { x: 20, y: 20 },
    { x: 80, y: 30 },
    { x: 60, y: 70 },
    { x: 30, y: 80 },
    { x: 90, y: 90 },
    { x: 50, y: 40 },
  ];
}
