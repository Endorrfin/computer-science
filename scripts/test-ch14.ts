// Engine truth-tests for ch.14 (Linear structures): array-vs-list-memory (which
// reuses the ch.8 cache), the hash-collision-lab table, and the
// stack-queue-stepper. Same tiny Node harness as test-fast-cpu / test-ch13;
// CI-gated. These lock the exact numbers the sims render and the chapter's
// claims: a contiguous array traversal is nearly all hits while a scattered
// linked-list traversal is nearly all misses (and costs far more); a low-entropy
// hash clusters while a good hash spreads; linear probing lands keys at i,i+1,…;
// rehashing fires over the load threshold and lowers the load factor; and a
// stack reverses a stream a queue preserves, with underflow guarded.

import {
  MISS_PENALTY,
  arrayAddresses,
  compareArrayVsList,
  listAddresses,
  traverse,
} from "../src/components/sims/array-vs-list-memory/model.ts";
import type { CacheParams } from "../src/components/sims/fast-cpu/cache.ts";
import {
  CLUSTERING_KEYS,
  badHash,
  goodHash,
  homeIndex,
  insertAll,
} from "../src/components/sims/hash-collision-lab/model.ts";
import { STACK_QUEUE_PRESETS, applyOps } from "../src/components/sims/stack-queue-stepper/model.ts";

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

// ================= (A) array vs list on the cache =================
{
  const MEM = 64;
  const LINES = 8;
  console.log("array-vs-list-memory:");

  // addresses --------------------------------------------------------------
  eq("arrayAddresses(5,0) is consecutive", arrayAddresses(5, 0), [0, 1, 2, 3, 4]);
  eq("arrayAddresses(3,10) honours base", arrayAddresses(3, 10), [10, 11, 12]);

  const la = listAddresses(10, MEM, 1337);
  eq("listAddresses length", la.length, 10);
  ok("listAddresses in range", la.every((a) => a >= 0 && a < MEM));
  ok("listAddresses distinct", new Set(la).size === la.length);
  eq("listAddresses deterministic", listAddresses(10, MEM, 1337), la);
  // scattered: the chase order is far from contiguous — the mean jump between
  // consecutive nodes is large (a contiguous array would have mean jump 1)
  {
    const jumps = la.slice(1).map((a, i) => Math.abs(a - la[i]));
    const meanJump = jumps.reduce((s, j) => s + j, 0) / jumps.length;
    ok(`listAddresses scattered (mean jump ${meanJump.toFixed(1)} ≫ 1)`, meanJump > 8);
  }

  // traversal on a wide line ----------------------------------------------
  for (const L of [2, 4]) {
    const p: CacheParams = { memCells: MEM, numLines: LINES, lineSize: L };
    const arr = traverse(arrayAddresses(MEM, 0), p);
    // contiguous walk = one miss per line, rest hits → hitRate = 1 − 1/L
    approx(`array hitRate L${L} = 1 − 1/L`, arr.hitRate, 1 - 1 / L);
    eq(`array misses L${L} = MEM/L`, arr.misses, MEM / L);
    eq(`array steps account for all ${MEM}`, arr.hits + arr.misses, MEM);
    // cost = hits*1 + misses*penalty
    eq(`array cost L${L}`, arr.cost, arr.hits + arr.misses * MISS_PENALTY);
  }

  // full comparison: array wins on every axis. These are the sim's own defaults
  // (96 cells, 8 lines, line size 4, 32 nodes) so the numbers here ARE the ones
  // the widget shows.
  const cmp = compareArrayVsList(32, { memCells: 96, numLines: LINES, lineSize: 4 });
  ok(`array hitRate high (${cmp.array.hitRate.toFixed(3)} ≥ 0.7)`, cmp.array.hitRate >= 0.7);
  ok(`list hitRate low (${cmp.list.hitRate.toFixed(3)} ≤ 0.15)`, cmp.list.hitRate <= 0.15);
  ok(`array beats list on hitRate`, cmp.array.hitRate > cmp.list.hitRate);
  ok(`list cost ≫ array cost (${cmp.list.cost} > ${cmp.array.cost})`, cmp.list.cost > cmp.array.cost);
  ok(`list costs ≥ 2.5× the array (${(cmp.list.cost / cmp.array.cost).toFixed(2)}×)`,
    cmp.list.cost >= 2.5 * cmp.array.cost);
  eq("both traversals touch the same element count", [cmp.array.steps.length, cmp.list.steps.length], [32, 32]);
  // list is nearly all misses (scattered nodes across a roomy memory)
  ok(`list is mostly misses (${cmp.list.misses}/32 ≥ 27)`, cmp.list.misses >= 27);
}

// ================= (B) hash-collision-lab =================
{
  console.log("hash-collision-lab:");

  // hash functions ----------------------------------------------------------
  eq("badHash uses first char code only", badHash("apple"), "a".charCodeAt(0));
  eq("badHash empty string = 0", badHash(""), 0);
  ok("badHash collides same-first-letter keys",
    badHash("apple") === badHash("avocado") && badHash("apple") === badHash("acorn"));
  ok("goodHash returns non-negative 32-bit", goodHash("apple") >= 0 && goodHash("apple") <= 0xffffffff);
  ok("goodHash separates same-first-letter keys",
    goodHash("apple") !== goodHash("avocado") && goodHash("apple") !== goodHash("acorn"));
  // FNV-1a spot check: known 32-bit FNV-1a("a") = 0xE40C292C
  eq("goodHash FNV-1a('a') is the canonical value", goodHash("a"), 0xe40c292c);
  eq("goodHash FNV-1a('') is the offset basis", goodHash(""), 0x811c9dc5);

  // homeIndex always lands in range
  ok("homeIndex in [0,size)", CLUSTERING_KEYS.every((k) => {
    const h = homeIndex(k, 16, "bad");
    return h >= 0 && h < 16;
  }));

  // BAD hash clusters, GOOD hash spreads (chaining, no rehash: size 32 > 10) ---
  const badChain = insertAll([...CLUSTERING_KEYS], { size: 32, hash: "bad", strategy: "chaining", maxLoad: 1 });
  const goodChain = insertAll([...CLUSTERING_KEYS], { size: 32, hash: "good", strategy: "chaining", maxLoad: 1 });
  eq("bad+chaining: all 10 keys pile into one chain", badChain.maxChain, 10);
  ok(`good+chaining: chains stay short (${goodChain.maxChain} ≤ 2)`, goodChain.maxChain <= 2);
  ok("good spreads better than bad (chaining)", goodChain.maxChain < badChain.maxChain);
  eq("bad+chaining totalProbes (1+2+…+10)", badChain.totalProbes, 55);
  ok(`good+chaining far fewer probes (${goodChain.totalProbes} < ${badChain.totalProbes})`,
    goodChain.totalProbes < badChain.totalProbes);
  eq("no rehash when maxLoad=1 and load<1", badChain.rehashes.length, 0);

  // LINEAR probing with the bad hash → i, i+1, i+2 … clustering ----------------
  const badLin = insertAll([...CLUSTERING_KEYS], { size: 32, hash: "bad", strategy: "linear", maxLoad: 1 });
  const home = homeIndex(CLUSTERING_KEYS[0], 32, "bad"); // every key shares this home
  // each key lands one slot further along → a solid run of 10 slots from `home`
  eq("bad+linear: slots are home,home+1,…,home+9",
    badLin.steps.map((s) => s.slot),
    Array.from({ length: 10 }, (_, i) => (home + i) % 32));
  eq("bad+linear: k-th key probes k+1 slots",
    badLin.steps.map((s) => s.probes),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  eq("bad+linear maxCluster = 10 (one long run)", badLin.maxCluster, 10);
  const goodLin = insertAll([...CLUSTERING_KEYS], { size: 32, hash: "good", strategy: "linear", maxLoad: 1 });
  ok(`good+linear: much smaller cluster (${goodLin.maxCluster} < 10)`, goodLin.maxCluster < 10);
  ok(`good+linear fewer probes than bad (${goodLin.totalProbes} < ${badLin.totalProbes})`,
    goodLin.totalProbes < badLin.totalProbes);

  // controlled linear-probe sequence: three keys forced to the same home ------
  // Using badHash, "cat","car","cup" all start with 'c' → home = 'c' % 8.
  const cHome = homeIndex("cat", 8, "bad");
  const forced = insertAll(["cat", "car", "cup"], { size: 8, hash: "bad", strategy: "linear", maxLoad: 1 });
  eq("forced collision lands at i, i+1, i+2",
    forced.steps.map((s) => s.slot),
    [cHome, (cHome + 1) % 8, (cHome + 2) % 8]);
  eq("forced collision probe sequence of 3rd key", forced.steps[2].probeSeq,
    [cHome, (cHome + 1) % 8, (cHome + 2) % 8]);
  eq("2nd and 3rd keys are flagged collided", [forced.steps[0].collided, forced.steps[1].collided, forced.steps[2].collided],
    [false, true, true]);

  // REHASH: crossing the load threshold doubles the table and lowers load -----
  // size 4, chaining, default maxLoad 0.75. Insert 6 keys → must grow.
  const grow = insertAll(["a", "b", "c", "d", "e", "f"], { size: 4, hash: "good", strategy: "chaining" });
  ok("rehash fired at least once", grow.rehashes.length >= 1);
  ok(`final size grew past initial 4 (now ${grow.finalSize})`, grow.finalSize > 4);
  ok(`final load factor ≤ 0.75 (${grow.loadFactor.toFixed(3)})`, grow.loadFactor <= 0.75);
  eq("rehash doubles size", grow.rehashes[0].newSize, grow.rehashes[0].oldSize * 2);
  ok("rehash recorded a load-before over the threshold",
    grow.rehashes[0].loadBefore <= grow.rehashes[0].newSize && grow.rehashes.every((r) => r.newSize === r.oldSize * 2));
  eq("all 6 keys stored after rehash", grow.count, 6);
  // rehash lowers the load factor: the doubling that tripped at loadBefore leaves
  // the post-grow occupancy (same key count, twice the slots) at half that.
  const firstRehash = grow.rehashes[0];
  approx("rehash halves the load it tripped at",
    firstRehash.loadBefore / 2, (firstRehash.oldSize * firstRehash.loadBefore) / firstRehash.newSize, 1e-9);

  // linear default threshold 0.7 also triggers a rehash for a filling table
  const growLin = insertAll(["a", "b", "c", "d", "e", "f"], { size: 4, hash: "good", strategy: "linear" });
  ok("linear rehash keeps a free slot (load < 1)", growLin.loadFactor < 1);
  ok("linear rehash fired", growLin.rehashes.length >= 1);

  // determinism -------------------------------------------------------------
  eq("insertAll deterministic (same trace)",
    insertAll([...CLUSTERING_KEYS], { size: 16, hash: "bad", strategy: "linear" }).steps.map((s) => s.slot),
    insertAll([...CLUSTERING_KEYS], { size: 16, hash: "bad", strategy: "linear" }).steps.map((s) => s.slot));
}

// ================= (C) stack-queue-stepper =================
{
  console.log("stack-queue-stepper:");

  // LIFO vs FIFO on the same 1,2,3 stream -----------------------------------
  const fill = STACK_QUEUE_PRESETS.find((p) => p.id === "fill-drain")!;
  const r = applyOps([...fill.ops]);
  // after fill (before any drain) both hold [1,2,3]
  const afterFill = r.steps[5]; // 3 push + 3 enqueue interleaved = 6 ops (idx 0..5)
  eq("stack after filling = [1,2,3]", afterFill.stack, [1, 2, 3]);
  eq("queue after filling = [1,2,3]", afterFill.queue, [1, 2, 3]);
  // drain order: collect popped vs dequeued values
  const popped = r.steps.filter((s) => s.op.kind === "pop" && !s.underflow).map((s) => s.value);
  const dequeued = r.steps.filter((s) => s.op.kind === "dequeue" && !s.underflow).map((s) => s.value);
  eq("stack drains LIFO 3,2,1", popped, [3, 2, 1]);
  eq("queue drains FIFO 1,2,3", dequeued, [1, 2, 3]);
  eq("both structures end empty", [r.stack, r.queue], [[], []]);

  // changedEnd anchors -------------------------------------------------------
  const pushStep = r.steps.find((s) => s.op.kind === "push")!;
  const enqStep = r.steps.find((s) => s.op.kind === "enqueue")!;
  const popStep = r.steps.find((s) => s.op.kind === "pop" && !s.underflow)!;
  const deqStep = r.steps.find((s) => s.op.kind === "dequeue" && !s.underflow)!;
  eq("push changes the top", pushStep.changedEnd, "top");
  eq("pop changes the top", popStep.changedEnd, "top");
  eq("enqueue changes the back", enqStep.changedEnd, "back");
  eq("dequeue changes the front", deqStep.changedEnd, "front");

  // underflow guard ----------------------------------------------------------
  const uf = STACK_QUEUE_PRESETS.find((p) => p.id === "underflow")!;
  const ur = applyOps([...uf.ops]);
  const underflows = ur.steps.filter((s) => s.underflow);
  eq("exactly two underflows in the underflow preset", underflows.length, 2);
  ok("underflow ops are no-ops (empty structures, null value)",
    underflows.every((s) => s.value === null && s.changedEnd === null));
  eq("structures stay empty after underflow", [ur.stack, ur.queue], [[], []]);

  // a lone pop/dequeue on empty is a flagged no-op
  const bare = applyOps([{ kind: "pop" }, { kind: "dequeue" }]);
  eq("pop on empty underflows", bare.steps[0].underflow, true);
  eq("dequeue on empty underflows", bare.steps[1].underflow, true);

  // interleaved preset: stack keeps newest, queue serves oldest
  const inter = STACK_QUEUE_PRESETS.find((p) => p.id === "interleaved")!;
  const ir = applyOps([...inter.ops]);
  const iPopped = ir.steps.filter((s) => s.op.kind === "pop" && !s.underflow).map((s) => s.value);
  const iDeq = ir.steps.filter((s) => s.op.kind === "dequeue" && !s.underflow).map((s) => s.value);
  eq("interleaved stack pops 2,3,1 (newest-first each time)", iPopped, [2, 3, 1]);
  eq("interleaved queue dequeues 1,2,3 (oldest-first each time)", iDeq, [1, 2, 3]);
}

if (failed > 0) {
  console.error(`\n✗ test-ch14: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch14: all checks pass");
