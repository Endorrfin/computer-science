// ch.25 · Concurrency — engine checks (race lost-updates + dining philosophers).
// Run: node --experimental-strip-types scripts/test-ch25.ts
import {
  expectedCount,
  runRace,
  initDeadlock,
  stepDeadlock,
  detectDeadlock,
  allEaten,
  runDeadlock,
  gradeBoss,
  strategyById,
  STRATEGIES,
  COFFMAN,
} from "../src/components/sims/concurrency/model.ts";
import type { Strategy } from "../src/components/sims/concurrency/model.ts";

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

// ================= (A) race · lost updates =================
{
  console.log("race · shared counter:");
  eq("expected count 2×1", expectedCount(2, 1), 2);
  eq("expected count 4×25", expectedCount(4, 25), 100);
  // Bad interleave: T0.load, T1.load, T0.inc, T0.store, T1.inc, T1.store → one lost.
  eq("interleaved RMW loses an update", runRace(2, 1, [0, 1, 0, 0, 1, 1], false).count, 1);
  eq("...lost = 1", runRace(2, 1, [0, 1, 0, 0, 1, 1], false).lost, 1);
  // Clean order (T0 fully, then T1): no loss.
  eq("serial order is correct", runRace(2, 1, [0, 0, 0, 1, 1, 1], false).count, 2);
  // The SAME bad pick order, but with the mutex on, is repaired: T1 blocks at
  // entry until T0 releases.
  eq("mutex repairs the bad interleave", runRace(2, 1, [0, 1, 0, 0, 1, 1], true).count, 2);
  // Heavy contention: unlocked loses updates; locked is exact.
  ok("unlocked heavy race loses updates", runRace(4, 25, [], false).lost > 0, `lost=${runRace(4, 25, [], false).lost}`);
  eq("locked heavy race is exact", runRace(4, 25, [], true).count, 100);
  eq("locked heavy race loses nothing", runRace(4, 25, [], true).lost, 0);
}

// ================= (B) deadlock · detection =================
{
  console.log("deadlock · detection:");
  const s0 = initDeadlock(5, "naive");
  eq("fresh table (all hungry) is not deadlocked", detectDeadlock(s0).deadlocked, false);
  // One naive tick: everyone grabs their left fork → full circular wait.
  const s1 = stepDeadlock(s0, "naive");
  eq("after 1 naive tick: deadlocked", detectDeadlock(s1).deadlocked, true);
  eq("...cycle spans all five", detectDeadlock(s1).cycle, [0, 1, 2, 3, 4]);
  eq("...and nobody has eaten", allEaten(s1), false);
}

// ================= (C) deadlock · naive freezes, every fix frees =================
{
  console.log("deadlock · strategies:");
  const naive = runDeadlock("naive", 5, 400);
  eq("naive strategy deadlocks", naive.deadlocked, true);
  eq("naive: nobody eats", naive.allEaten, false);

  const fixes: Strategy[] = ["ordering", "waiter", "trylock", "limit"];
  for (const f of fixes) {
    const r = runDeadlock(f, 5, 400);
    ok(`${f}: no deadlock`, !r.deadlocked, `deadlocked=${r.deadlocked} cycle=${JSON.stringify(r.cycle)}`);
    ok(`${f}: everyone eats`, r.allEaten, `allEaten=${r.allEaten} ticks=${r.ticks}`);
  }
  // A different table size still resolves under a fix.
  ok("ordering resolves for n=7", runDeadlock("ordering", 7, 400).allEaten, "");
}

// ================= (D) Coffman mapping + strategy table =================
{
  console.log("deadlock · Coffman mapping:");
  eq("four Coffman conditions", COFFMAN.length, 4);
  eq("ordering breaks circular-wait", strategyById("ordering").breaks, "circular-wait");
  eq("waiter breaks hold-and-wait", strategyById("waiter").breaks, "hold-and-wait");
  eq("trylock breaks no-preemption", strategyById("trylock").breaks, "no-preemption");
  eq("limit breaks circular-wait", strategyById("limit").breaks, "circular-wait");
  eq("naive breaks nothing", strategyById("naive").breaks, null);
  eq("five strategies total", STRATEGIES.length, 5);
}

// ================= (E) boss grading =================
{
  console.log("deadlock · boss grading:");
  eq("right fix + right reason passes", gradeBoss("ordering", "circular-wait", 5).passed, true);
  eq("right fix + wrong reason fails", gradeBoss("ordering", "mutual-exclusion", 5).passed, false);
  eq("...but it did resolve", gradeBoss("ordering", "mutual-exclusion", 5).resolved, true);
  eq("naive never passes", gradeBoss("naive", "circular-wait", 5).passed, false);
  eq("naive does not resolve", gradeBoss("naive", "circular-wait", 5).resolved, false);
  eq("waiter + hold-and-wait passes", gradeBoss("waiter", "hold-and-wait", 5).passed, true);
  eq("trylock + no-preemption passes", gradeBoss("trylock", "no-preemption", 5).passed, true);
  eq("limit + circular-wait passes", gradeBoss("limit", "circular-wait", 5).passed, true);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch25: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch25: all checks pass");
