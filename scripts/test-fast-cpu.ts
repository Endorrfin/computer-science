// Engine truth-tests for ch.8 (fast CPUs): the 5-stage pipeline scheduler,
// the direct-mapped cache, and the 2-bit branch predictor. Same Node harness
// as test-machine/test-cpu; CI-gated via `npm test`. These lock the exact
// numbers the sims render and the prose/quiz claims (forwarding removes RAW
// stalls but not load-use; sequential hitRate = 1 − 1/line; 2-bit beats 1-bit).
import { PIPELINE_PRESETS, simulatePipeline } from "../src/components/sims/fast-cpu/pipeline.ts";
import { blockOf, lineOf, randomPattern, runCache, sequentialPattern, stridedPattern, tagOf } from "../src/components/sims/fast-cpu/cache.ts";
import type { CacheParams } from "../src/components/sims/fast-cpu/cache.ts";
import { loopPattern, predict2, run1bit, run2bit, update2 } from "../src/components/sims/fast-cpu/branch.ts";

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
function approx(name: string, got: number, want: number, eps = 1e-9): void {
  ok(`${name} (${got} ≈ ${want})`, Math.abs(got - want) < eps);
}

// ================= pipeline =================
{
  // [cycles, stalls, flushes] per preset, no-forwarding then forwarding
  const expect: Record<string, { off: [number, number, number]; on: [number, number, number] }> = {
    independent: { off: [9, 0, 0], on: [9, 0, 0] }, // no hazards; forwarding irrelevant
    "raw-chain": { off: [14, 6, 0], on: [8, 0, 0] }, // 3 dependent pairs × 2 stalls; forwarding erases all
    "load-use": { off: [12, 4, 0], on: [9, 1, 0] }, // forwarding leaves exactly the 1 load-use bubble
    branch: { off: [10, 0, 2], on: [10, 0, 2] }, // pure control hazard: 2 flushes, no data stalls
  };
  for (const p of PIPELINE_PRESETS) {
    const off = simulatePipeline(p.program, { forwarding: false });
    const on = simulatePipeline(p.program, { forwarding: true });
    const e = expect[p.id];
    eq(`pipeline ${p.id} no-fwd [cyc,stall,flush]`, [off.cycles, off.stalls, off.flushes], e.off);
    eq(`pipeline ${p.id} fwd    [cyc,stall,flush]`, [on.cycles, on.stalls, on.flushes], e.on);
    // closed form: total = ideal + stalls + flushes
    ok(`pipeline ${p.id} closed-form (off)`, off.cycles === off.idealCycles + off.stalls + off.flushes);
    ok(`pipeline ${p.id} closed-form (on)`, on.cycles === on.idealCycles + on.stalls + on.flushes);
    // forwarding never adds stalls
    ok(`pipeline ${p.id} forwarding ≤ stalls`, on.stalls <= off.stalls);
    // in-order: the last instruction retires (reaches WB)
    const n = p.program.length;
    ok(`pipeline ${p.id} last instr retires`, off.placements.some((x) => x.instr === n - 1 && x.stage === "WB"));
  }
  // idle pipeline
  eq("pipeline empty program", simulatePipeline([], { forwarding: true }).cycles, 0);
}

// ================= direct-mapped cache =================
{
  const P = (lineSize: number): CacheParams => ({ numLines: 8, lineSize, memCells: 64 });
  for (const L of [1, 2, 4]) {
    const p = P(L);
    const seq = runCache(sequentialPattern(64), p);
    eq(`cache seq L${L} misses = 64/L`, seq.misses, 64 / L);
    approx(`cache seq L${L} hitRate = 1 − 1/L`, seq.hitRate, 1 - 1 / L);
    eq(`cache seq L${L} accounts for all 64`, seq.hits + seq.misses, 64);
    if (L > 1) {
      const str = runCache(stridedPattern(64, L), p);
      const rnd = runCache(randomPattern(64, 1337), p);
      ok(`cache strided worse than sequential L${L}`, str.misses > seq.misses);
      ok(`cache random worse than sequential L${L}`, rnd.misses > seq.misses);
    }
  }
  // direct-mapped conflict thrash: two blocks fighting over one line all miss
  eq("cache conflict [0,8,0,8] all miss", runCache([0, 8, 0, 8], P(1)).results.map((r) => r.hit), [false, false, false, false]);
  // simple temporal reuse: miss then hit
  eq("cache reuse [5,5] miss then hit", runCache([5, 5], P(1)).results.map((r) => r.hit), [false, true]);
  // address decode (addr 13, line size 4, 8 lines): block 3 → line 3 → tag 0
  eq("cache decode block/line/tag", [blockOf(13, 4), lineOf(13, P(4)), tagOf(13, P(4))], [3, 3, 0]);
  // an eviction is reported on a conflict miss
  ok("cache reports evicted tag on conflict", runCache([0, 8], P(1)).results[1].evictedTag === 0);
}

// ================= 2-bit branch predictor =================
{
  // saturating transitions
  eq("update2 saturates at strong-taken", update2(3, true), 3);
  eq("update2 saturates at strong-not-taken", update2(0, false), 0);
  eq("update2 weak-taken + not-taken → weak-not-taken", update2(2, false), 1);
  eq("update2 weak-not-taken + taken → weak-taken", update2(1, true), 2);
  eq("predict2 lower half = not taken", predict2(1), false);
  eq("predict2 upper half = taken", predict2(2), true);

  // the headline: 2-bit tolerates the loop-exit anomaly better than 1-bit
  const loop = loopPattern(4, 3); // TTTN ×3 = 12 outcomes
  eq("loop(4,3) 2-bit mispredicts", run2bit(loop).mispredicts, 4);
  eq("loop(4,3) 1-bit mispredicts", run1bit(loop).mispredicts, 6);
  ok("2-bit ≤ 1-bit on the loop", run2bit(loop).mispredicts < run1bit(loop).mispredicts);
  approx("loop(4,3) 2-bit accuracy", run2bit(loop).accuracy, 8 / 12);

  const steady = loopPattern(10, 10); // long steady loop
  eq("steady loop 2-bit mispredicts", run2bit(steady).mispredicts, 11);
  eq("steady loop 1-bit mispredicts", run1bit(steady).mispredicts, 20);
}

if (failed > 0) {
  console.error(`\n✗ test-fast-cpu: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("✓ test-fast-cpu: all checks pass");
