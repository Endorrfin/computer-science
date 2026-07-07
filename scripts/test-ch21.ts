// Engine truth-tests for ch.21 (Complexity). Same Node harness; CI-gated.
// Locks the two sims' claims:
//   • death-watch counts: 2ⁿ, n!, and the (n−1)!/2 tour count are exact; the
//     time-at-a-billion-ops/s conversion is monotonic and lands where the
//     chapter says (the "years / centuries" shock is real arithmetic).
//   • TSP: verifying a tour is O(n) while finding the optimum walks (n−1)!/2
//     tours; the heuristics order correctly (optimal ≤ 2-opt ≤ nearest-neighbour)
//     and 2-opt genuinely uncrosses a crossed tour.

import {
  bruteForceOptimal,
  bruteForceTourCount,
  demoCities,
  factorial,
  humanizeSeconds,
  nearestNeighbor,
  pow2,
  subsetSumBrute,
  timeAtRate,
  tourLength,
  twoOpt,
  work,
  type City,
} from "../src/components/sims/complexity/model.ts";

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
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}
const approx = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

// ================= (A) growth counts =================
{
  console.log("death-watch · exact growth counts:");
  eq("2^10 = 1024", pow2(10), 1024);
  eq("0! = 1", factorial(0), 1);
  eq("5! = 120", factorial(5), 120);
  eq("10! = 3,628,800", factorial(10), 3_628_800);
  eq("tours(3) = 1", bruteForceTourCount(3), 1);
  eq("tours(4) = 3", bruteForceTourCount(4), 3);
  eq("tours(5) = 12", bruteForceTourCount(5), 12);
  eq("tours(10) = 181,440", bruteForceTourCount(10), 181_440);
  eq("work linear(1000)", work("linear", 1000), 1000);
  eq("work quadratic(1000)", work("quadratic", 1000), 1_000_000);
  eq("work exponential(20)", work("exponential", 20), 1_048_576);
  eq("work factorial(6)", work("factorial", 6), 720);
}

// ================= (B) time at a billion ops/second =================
{
  console.log("death-watch · wall-clock conversion:");
  eq("1e9 ops @ 1e9/s = 1 second", timeAtRate(1e9).seconds, 1);
  ok("2^50 ops ≈ 13 days", approx(timeAtRate(pow2(50)).seconds, 1.1259e6, 1e3));
  ok("bigger n ⇒ longer", timeAtRate(pow2(60)).seconds > timeAtRate(pow2(50)).seconds);
  ok("humanize ns", humanizeSeconds(2e-9).includes("ns"));
  ok("humanize seconds", humanizeSeconds(3).includes("s"));
  ok("humanize years for 2^80", humanizeSeconds(timeAtRate(pow2(80)).seconds).includes("years"));
  // 2^100 checks at a billion/s is far more than the age of the universe
  ok("2^100 ops ≫ age of universe", timeAtRate(pow2(100)).seconds / 3.15e7 > 1.38e10);
}

// ================= (C) subset-sum brute force =================
{
  console.log("death-watch · subset-sum decision (brute):");
  const r = subsetSumBrute([3, 34, 4, 12, 5, 2], 9);
  ok("finds a subset summing to 9 (4+5)", r.found && r.subset.reduce((a, b) => a + b, 0) === 9);
  ok("checked ≤ 2^n", r.checked <= r.total);
  const none = subsetSumBrute([2, 4, 6], 7);
  eq("no odd sum from evens ⇒ not found", none.found, false);
  eq("exhausted the whole 2^n space", none.checked, 8);
}

// ================= (D) TSP: verify is cheap, find is dear =================
{
  console.log("tsp-playground · tour length & exact optimum:");
  const square: City[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ];
  ok("perimeter tour of unit square = 4", approx(tourLength(square, [0, 1, 2, 3]), 4));
  const opt = bruteForceOptimal(square);
  ok("brute-force optimum of the square = 4", approx(opt.length, 4));
  eq("brute force evaluated (4-1)! = 6 tours", opt.toursEvaluated, factorial(3));
}
{
  console.log("tsp-playground · 2-opt uncrosses a crossed tour:");
  const square: City[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ];
  const crossed = [0, 2, 1, 3]; // figure-eight: two diagonals cross
  const crossedLen = tourLength(square, crossed);
  ok("crossed tour is longer than 4", crossedLen > 4 + 1e-6);
  const fixed = twoOpt(square, crossed);
  ok("2-opt shortens it back to 4", approx(tourLength(square, fixed), 4));
}
{
  console.log("tsp-playground · heuristic ordering optimal ≤ 2-opt ≤ NN:");
  const cities = demoCities();
  const nn = nearestNeighbor(cities, 0);
  const nnLen = tourLength(cities, nn);
  const twoLen = tourLength(cities, twoOpt(cities, nn));
  const optLen = bruteForceOptimal(cities).length;
  ok(`2-opt ≤ nearest-neighbour (${twoLen.toFixed(2)} ≤ ${nnLen.toFixed(2)})`, twoLen <= nnLen + 1e-6);
  ok(`optimal ≤ 2-opt (${optLen.toFixed(2)} ≤ ${twoLen.toFixed(2)})`, optLen <= twoLen + 1e-6);
  ok("nearest-neighbour visits every city once", new Set(nn).size === cities.length);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch21: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch21: all checks pass");
