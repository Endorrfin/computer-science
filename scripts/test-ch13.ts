// Engine truth-tests for ch.13 (Big-O & algorithmic thinking): the growth
// racer's six instrumented algorithms and the amortized-doubling model. Same
// tiny Node harness as test-fast-cpu; CI-gated. These lock the exact op counts
// the hero sim renders (run(n) must equal the closed-form formula for every
// feasible n) and the amortized claims (doubling ⇒ total < 3N, resizes at the
// powers of two, running average bounded below 3).
import { GROWTH_ALGOS, growthAlgoById } from "../src/components/sims/growth-racer/growth.ts";
import { fixedGrowthCost, simulateDoubling } from "../src/components/sims/amortized-doubling/model.ts";

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

// ================= growth racer =================
{
  const constant = growthAlgoById("constant")!;
  const linear = growthAlgoById("linear")!;
  const log = growthAlgoById("logarithmic")!;
  const quad = growthAlgoById("quadratic")!;
  const exp = growthAlgoById("exponential")!;
  const fact = growthAlgoById("factorial")!;

  ok("all six algorithms present", GROWTH_ALGOS.length === 6);
  ok("growthAlgoById unknown → undefined", growthAlgoById("nope") === undefined);

  // constant: 1 op for every n
  for (const n of [1, 2, 10, 1000]) eq(`constant.run(${n}) === 1`, constant.run(n), 1);

  // linear: exactly n
  for (const n of [0, 1, 5, 100, 4096]) eq(`linear.run(${n}) === ${n}`, linear.run(n), n);

  // logarithmic: ⌊log₂n⌋+1 probes; the headline anchors
  eq("logarithmic.run(16) === 5", log.run(16), 5);
  eq("logarithmic.run(1) === 1", log.run(1), 1);
  eq("logarithmic.run(1024) === 11", log.run(1024), 11);
  eq("logarithmic.run(0) === 0 (empty range)", log.run(0), 0);

  // quadratic: n(n-1)/2 comparisons
  eq("quadratic.run(5) === 10", quad.run(5), 10);
  eq("quadratic.run(1) === 0", quad.run(1), 0);
  eq("quadratic.run(0) === 0", quad.run(0), 0);
  eq("quadratic.run(10) === 45", quad.run(10), 45);

  // exponential: 2ⁿ subsets, actually enumerated below the cap
  eq("exponential.run(10) === 1024", exp.run(10), 1024);
  eq("exponential.run(10) === formula", exp.run(10), exp.formula(10));
  eq("exponential.run(20) === 2^20 (at cap)", exp.run(20), Math.pow(2, 20));

  // factorial: n! permutations, actually generated below the cap
  eq("factorial.run(5) === 120", fact.run(5), 120);
  eq("factorial.run(5) === formula", fact.run(5), fact.formula(5));
  eq("factorial.run(9) === 362880 (at cap)", fact.run(9), 362880);
  eq("factorial.run(0) === 1 (0! = 1)", fact.run(0), 1);
  eq("factorial.run(1) === 1", fact.run(1), 1);

  // run(n) === formula(n) for EVERY feasible sampled n, across all six algos
  const sample = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const algo of GROWTH_ALGOS) {
    for (const n of sample) {
      if (n > algo.runCap) continue; // guarded — skip (tested separately below)
      eq(`${algo.id}.run(${n}) === formula(${n})`, algo.run(n), algo.formula(n));
    }
  }

  // GUARDS must not hang: past the cap, run() returns formula() instantly.
  const t0 = Date.now();
  eq("exponential.run(60) === 2^60 (guarded, no hang)", exp.run(60), Math.pow(2, 60));
  eq("factorial.run(30) === formula (guarded, no hang)", fact.run(30), fact.formula(30));
  const t1 = Date.now();
  ok(`guarded runs are fast (${t1 - t0}ms < 50ms)`, t1 - t0 < 50);

  // curves: worse complexities dominate at large n (the whole point of the race)
  const at = (id: string, n: number): number => growthAlgoById(id)!.formula(n);
  ok("at n=32, factorial ≥ exponential ≥ quadratic ≥ linear ≥ log ≥ constant",
    at("factorial", 32) >= at("exponential", 32) &&
      at("exponential", 32) >= at("quadratic", 32) &&
      at("quadratic", 32) >= at("linear", 32) &&
      at("linear", 32) >= at("logarithmic", 32) &&
      at("logarithmic", 32) >= at("constant", 32));
}

// ================= amortized doubling =================
{
  const N = 1000;
  const r = simulateDoubling(N);

  // total cost stays below 3N — the amortized-O(1) headline
  ok(`simulateDoubling(${N}).totalCost (${r.totalCost}) < 3N (${3 * N})`, r.totalCost < 3 * N);
  ok(`amortized (${r.amortized.toFixed(4)}) < 3`, r.amortized < 3);

  // resizes occur exactly at capacities-before 1,2,4,…,512 (the powers of two)
  const resizeAt = r.steps.filter((s) => s.resized).map((s) => s.capacityBefore);
  eq("resizes at sizes 1,2,4,…,512", resizeAt, [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]);
  // the very first push (into empty) also resizes from capacity 0? No — start
  // capacity is 1, so the first resize is when the 2nd element overflows cap 1.
  eq("first push does not resize (cap starts at 1)", r.steps[0].resized, false);
  eq("first push cost === 1", r.steps[0].cost, 1);

  // running average is bounded and small by the end (never grows unbounded)
  const finalAvg = r.steps[r.steps.length - 1].runningAvg;
  ok(`final runningAvg (${finalAvg.toFixed(4)}) < 3.0`, finalAvg < 3.0);
  ok("every runningAvg < 3.0 (bounded throughout the tail)",
    r.steps.slice(4).every((s) => s.runningAvg < 3.0));

  // amortized cost does not grow with N: doubling N keeps avg roughly constant
  const r2 = simulateDoubling(2 * N);
  ok(`doubling N keeps amortized ~constant (${r2.amortized.toFixed(3)} < 3)`, r2.amortized < 3);

  // capacity always covers size, and size == number of pushes
  eq("final capacity ≥ pushes (1024 ≥ 1000)", r.steps[N - 1].capacityAfter >= N, true);

  // CONTRAST: fixed +1 growth is Θ(N²) — amortized grows with N (≫ doubling)
  const fixed = fixedGrowthCost(N, 1);
  ok(`fixed +1 amortized (${fixed.amortized.toFixed(1)}) ≫ doubling`, fixed.amortized > 10 * r.amortized);
  ok(`fixed +1 totalCost (${fixed.totalCost}) ≈ N²/2`, fixed.totalCost > (N * N) / 4);
  // fixed +4 is still Θ(N²) but a constant factor cheaper than +1
  const fixed4 = fixedGrowthCost(N, 4);
  ok("fixed +4 cheaper than +1 but still ≫ doubling", fixed4.totalCost < fixed.totalCost && fixed4.amortized > r.amortized * 5);
}

if (failed > 0) {
  console.error(`\n✗ test-ch13: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch13: all checks pass");
