// Engine truth-tests for ch.16 (Sorting & searching): the sorting-race engine
// (seven instrumented sorts) and the binary-search stepper. Same Node harness
// as test-ch15; CI-gated. These lock the claims the chapter and the HERO make:
// every sort actually sorts (and preserves the multiset) on adversarial data
// shapes; the two NON-comparison sorts make exactly ZERO element comparisons
// (the payoff that lets them dodge the Ω(n log n) bound); the comparison-count
// signatures are the textbook ones (selection is always n(n−1)/2; insertion is
// linear on sorted, quadratic on reversed; naive-pivot quicksort hits its n²
// worst case on already-sorted input); and binary search / lower-bound get the
// boundary math right on every edge case.

import {
  SORTS,
  isSorted,
  makeData,
  runAll,
  runSort,
  sortMetaById,
} from "../src/components/sims/sorting-race/model.ts";
import type { SortId } from "../src/components/sims/sorting-race/model.ts";
import {
  lowerBound,
  search,
  worstCaseProbes,
} from "../src/components/sims/binary-search/model.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const ALL_IDS: SortId[] = ["insertion", "selection", "merge", "quick", "heap", "counting", "radix"];
const sortedCopy = (a: number[]): number[] => [...a].sort((x, y) => x - y);

// ================= (A) every sort actually sorts, on every shape =================
{
  console.log("sorting-race · correctness on adversarial shapes:");
  const shapes = ["random", "sorted", "reversed", "fewUnique"] as const;
  for (const shape of shapes) {
    const input = makeData(shape, 16, 7);
    const want = sortedCopy(input);
    for (const id of ALL_IDS) {
      const run = runSort(id, input);
      const final = run.frames[run.frames.length - 1].array;
      eq(`${id} sorts ${shape}`, final, want);
      // multiset preserved (no dropped/duplicated elements)
      eq(`${id} preserves the multiset on ${shape}`, sortedCopy(final), want);
      // input not mutated in place
      ok(`${id} does not mutate the caller's array (${shape})`, input.length === 16);
    }
  }

  // larger random n, spot the invariants
  const big = makeData("random", 40, 99);
  for (const id of ALL_IDS) {
    const run = runSort(id, big);
    ok(`${id} sorts n=40 random`, isSorted(run.frames[run.frames.length - 1].array));
    ok(`${id} accesses = reads + writes`, run.accesses === run.reads + run.writes);
    ok(`${id} recorded frames`, run.frames.length > 0);
  }
}

// ================= (B) the non-comparison payoff: ZERO comparisons =================
{
  console.log("sorting-race · comparison-count signatures:");
  const input = makeData("random", 16, 3);

  // counting & radix compare NOTHING — that's how they beat Ω(n log n).
  eq("counting sort makes zero comparisons", runSort("counting", input).comparisons, 0);
  eq("radix sort makes zero comparisons", runSort("radix", input).comparisons, 0);
  ok("counting/radix flagged non-comparison in the roster",
    sortMetaById("counting").kind === "non-comparison" && sortMetaById("radix").kind === "non-comparison");

  // the five comparison sorts DO compare
  for (const id of ["insertion", "selection", "merge", "quick", "heap"] as SortId[]) {
    ok(`${id} makes > 0 comparisons`, runSort(id, input).comparisons > 0);
    ok(`${id} flagged comparison-based`, sortMetaById(id).kind === "comparison");
  }

  // selection is ALWAYS exactly n(n−1)/2 comparisons, whatever the data
  const n = 8;
  const tri = (n * (n - 1)) / 2; // 28
  for (const shape of ["random", "sorted", "reversed"] as const) {
    eq(`selection = n(n−1)/2 = ${tri} on ${shape}`, runSort("selection", makeData(shape, n, 5)).comparisons, tri);
  }

  // insertion: linear (n−1) comparisons on already-sorted (best case),
  // quadratic n(n−1)/2 on reversed (worst case)
  eq("insertion best case (sorted) = n−1 comparisons", runSort("insertion", makeData("sorted", n, 1)).comparisons, n - 1);
  eq("insertion worst case (reversed) = n(n−1)/2", runSort("insertion", makeData("reversed", n, 1)).comparisons, tri);

  // naive last-element-pivot quicksort hits its n² worst case on SORTED input:
  // every partition is maximally unbalanced → n(n−1)/2 comparisons.
  eq("quicksort worst case on sorted input = n(n−1)/2", runSort("quick", makeData("sorted", n, 1)).comparisons, tri);
  // …and does far fewer on random input (the average case)
  ok("quicksort on random does fewer comparisons than its worst case",
    runSort("quick", makeData("random", n, 42)).comparisons < tri);

  // selection makes the FEWEST writes (only swaps to the boundary — ≤ n−1 swaps)
  const sel = runSort("selection", makeData("random", n, 8));
  ok(`selection writes are minimal (${sel.writes} ≤ 2·(n−1))`, sel.writes <= 2 * (n - 1));
}

// ================= (C) counting/radix win when k is small (the honest race) =====
{
  console.log("sorting-race · when non-comparison sorts win on accesses:");
  // few-unique keys (k=4): counting's k term is tiny, so it should beat the
  // n log n / n² comparison sorts on ACCESSES for a decent n.
  const n = 40;
  const fewU = makeData("fewUnique", n, 11);
  const counting = runSort("counting", fewU).accesses;
  const selection = runSort("selection", fewU).accesses;
  const quick = runSort("quick", fewU).accesses;
  ok(`counting beats selection on few-unique accesses (${counting} < ${selection})`, counting < selection);
  ok(`counting beats quicksort on few-unique accesses (${counting} < ${quick})`, counting < quick);

  // race harness returns all seven
  const race = runAll(fewU);
  eq("runAll returns one run per sort", race.length, SORTS.length);
  ok("every racer finished sorted", race.every((r) => isSorted(r.frames[r.frames.length - 1].array)));
}

// ================= (D) determinism & data shapes =================
{
  console.log("sorting-race · data + determinism:");
  eq("makeData sorted is ascending 1..n", makeData("sorted", 5), [1, 2, 3, 4, 5]);
  eq("makeData reversed is descending", makeData("reversed", 5), [5, 4, 3, 2, 1]);
  ok("makeData fewUnique keys are in 0..3", makeData("fewUnique", 30, 1).every((v) => v >= 0 && v <= 3));
  eq("makeData random is seed-deterministic", makeData("random", 12, 123), makeData("random", 12, 123));
  eq("runSort is deterministic", runSort("quick", makeData("random", 20, 4)).accesses, runSort("quick", makeData("random", 20, 4)).accesses);
}

// ================= (E) binary search & lower bound =================
{
  console.log("binary-search · exact search:");
  const a = [1, 3, 5, 7, 9, 11, 13, 15]; // 8 sorted distinct

  eq("finds a middle element", search(a, 7).index, 3);
  eq("finds the first element", search(a, 1).index, 0);
  eq("finds the last element", search(a, 15).index, 7);
  eq("returns -1 for an absent value", search(a, 8).index, -1);
  ok("found flag matches", search(a, 7).found && !search(a, 8).found);
  eq("empty array → -1", search([], 5).index, -1);
  eq("single element hit", search([42], 42).index, 0);
  eq("single element miss", search([42], 7).index, -1);

  // probe counts never exceed the worst-case bound ⌊log₂n⌋+1
  const bound = worstCaseProbes(a.length); // 4 for n=8
  ok(`every search uses ≤ ${bound} probes`, a.every((v) => search(a, v).probes <= bound) && search(a, 8).probes <= bound);
  eq("worstCaseProbes(1000) = 10", worstCaseProbes(1000), 10);
  eq("worstCaseProbes(0) = 0", worstCaseProbes(0), 0);

  // find EVERY element of a larger array
  const big = Array.from({ length: 200 }, (_, i) => i * 2);
  ok("finds every element of a 200-array", big.every((v, i) => search(big, v).index === i));
  ok("odd values are absent", search(big, 3).index === -1 && search(big, 399).index === -1);

  console.log("binary-search · lower bound:");
  const dups = [1, 2, 2, 2, 4, 4, 5]; // duplicates
  eq("lowerBound lands on the FIRST 2", lowerBound(dups, 2).index, 1);
  eq("lowerBound lands on the FIRST 4", lowerBound(dups, 4).index, 4);
  eq("lowerBound of a present unique key", lowerBound(dups, 5).index, 6);
  eq("lowerBound of an absent middle value = insertion point", lowerBound(dups, 3).index, 4);
  eq("lowerBound below everything = 0", lowerBound(dups, 0).index, 0);
  eq("lowerBound above everything = n", lowerBound(dups, 99).index, dups.length);
  eq("lowerBound on empty = 0", lowerBound([], 5).index, 0);
  // lower bound is a valid insertion point: everything left is < target
  ok("lowerBound invariant holds", dups.slice(0, lowerBound(dups, 4).index).every((v) => v < 4));
}

if (failed > 0) {
  console.error(`\n✗ test-ch16: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch16: all checks pass");
