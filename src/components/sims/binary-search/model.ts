// Engine — binary search, the payoff of keeping data SORTED (ch.16). Each probe
// halves the live window, so a lookup costs ⌊log₂n⌋+1 comparisons instead of n:
// a million-element array is found in ~20 steps. The bug that haunts every
// implementation is the boundary math (`<=` vs `<`, `mid±1`), so this engine
// records lo/mid/hi at EVERY probe — the sim lights up the shrinking window and
// scripts/test-ch16.ts pins the exact probe sequences and the off-by-one edges.
//
// Two variants ship:
//   • search()     — is `target` present? return its index or −1.
//   • lowerBound()  — the first index whose value is ≥ target (the insertion
//                     point). This is the real workhorse: it finds the FIRST of
//                     duplicate keys, powers range queries, and is what
//                     std::lower_bound / bisect_left compute.
//
// No React import — runs under Node for the tests.

export type ProbeStep = {
  lo: number;
  mid: number;
  hi: number;
  /** How a[mid] compared to the target at this probe. */
  rel: "lt" | "gt" | "eq";
  caption: string;
};

export type SearchResult = { found: boolean; index: number; probes: number; steps: ProbeStep[] };
export type LowerBoundResult = { index: number; probes: number; steps: ProbeStep[] };

// ------------------------------------------------------------------
// search — classic inclusive-window binary search. Window is [lo, hi]; loop
// while lo ≤ hi; on a miss move the far bound past mid so the window strictly
// shrinks (this is where infinite loops are born if you forget the ±1).
// ------------------------------------------------------------------

export function search(a: number[], target: number): SearchResult {
  const steps: ProbeStep[] = [];
  let lo = 0;
  let hi = a.length - 1;
  let probes = 0;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1); // overflow-safe midpoint
    probes++;
    if (a[mid] === target) {
      steps.push({ lo, mid, hi, rel: "eq", caption: `a[${mid}] = ${a[mid]} = target → found at index ${mid}.` });
      return { found: true, index: mid, probes, steps };
    }
    if (a[mid] < target) {
      steps.push({ lo, mid, hi, rel: "lt", caption: `a[${mid}] = ${a[mid]} < ${target} → discard the left half, lo = ${mid + 1}.` });
      lo = mid + 1;
    } else {
      steps.push({ lo, mid, hi, rel: "gt", caption: `a[${mid}] = ${a[mid]} > ${target} → discard the right half, hi = ${mid - 1}.` });
      hi = mid - 1;
    }
  }
  return { found: false, index: -1, probes, steps };
}

// ------------------------------------------------------------------
// lowerBound — half-open window [lo, hi) that collapses to the first index i
// with a[i] ≥ target. Never returns early; the invariant is "everything left of
// lo is < target, everything at or right of hi is ≥ target". At the end lo = hi
// = the answer (which may be a.length if every element is smaller). For a target
// that is present with duplicates, this lands on the FIRST occurrence.
// ------------------------------------------------------------------

export function lowerBound(a: number[], target: number): LowerBoundResult {
  const steps: ProbeStep[] = [];
  let lo = 0;
  let hi = a.length;
  let probes = 0;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    probes++;
    if (a[mid] < target) {
      steps.push({ lo, mid, hi: hi - 1, rel: "lt", caption: `a[${mid}] = ${a[mid]} < ${target} → answer is to the right, lo = ${mid + 1}.` });
      lo = mid + 1;
    } else {
      steps.push({ lo, mid, hi: hi - 1, rel: "gt", caption: `a[${mid}] = ${a[mid]} ≥ ${target} → answer is here or left, hi = ${mid}.` });
      hi = mid;
    }
  }
  return { index: lo, probes, steps };
}

/** Worst-case probe count for a window of length n: ⌊log₂n⌋+1 (0 for n=0). */
export function worstCaseProbes(n: number): number {
  return n < 1 ? 0 : Math.floor(Math.log2(n)) + 1;
}

export function isSortedAscending(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}
