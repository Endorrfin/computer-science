// Engine truth-tests for ch.23 (Memory). Same Node harness; CI-gated. Locks
// paging/model against known-answer instances:
//   • address translation: bit-splitting, single- vs two-level indexing, TLB
//     hit/miss + LRU eviction, page-fault trap, physical-address arithmetic.
//   • page replacement: the canonical Silberschatz fault counts (FIFO 15 / LRU
//     12 / OPT 9 on 3 frames), Optimality of OPT, and Bélády's anomaly (FIFO
//     faults MORE with 4 frames than 3 on the classic string).

import {
  BELADY_STRING,
  DEFAULT_PAGING,
  SILBERSCHATZ_STRING,
  decompose,
  demoTable,
  faultCurve,
  levelBits,
  pageSize,
  POLICIES,
  simulateReplacement,
  tlbInit,
  toBits,
  toHex,
  translate,
  vpnBits,
  workingSet,
  type PagingConfig,
} from "../src/components/sims/paging/model.ts";

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

// ================= (A) address decomposition & geometry =================
{
  console.log("address geometry · 32-bit VA, 4 KiB pages, 2 levels:");
  const cfg = DEFAULT_PAGING; // {32, 12, 2}
  eq("page size = 4096 B", pageSize(cfg), 4096);
  eq("VPN is 20 bits", vpnBits(cfg), 20);
  eq("two levels split 10 + 10", levelBits(cfg), [10, 10]);

  const d = decompose(0x00003abc, cfg);
  eq("offset = low 12 bits (0xABC)", d.offset, 0xabc);
  eq("VPN = high 20 bits (3)", d.vpn, 3);
  eq("2-level indices [dir=0, table=3]", d.indices, [0, 3]);

  // an address that exercises both level indices
  const va = (5 << 22) | (17 << 12) | 42; // dir=5, table=17, offset=42
  const d2 = decompose(va, cfg);
  eq("indices decode back to [5, 17]", d2.indices, [5, 17]);
  eq("offset decodes back to 42", d2.offset, 42);

  eq("toBits pads", toBits(5, 8), "00000101");
  eq("toHex pads to width", toHex(0xabc, 32), "0x00000ABC");

  const single: PagingConfig = { virtualBits: 32, offsetBits: 12, levels: 1 };
  eq("single level → one index = the whole VPN", decompose(0x00003abc, single).indices, [3]);
}

// ================= (B) translation: walk, TLB, faults =================
{
  console.log("translation · walk / TLB hit / page fault:");
  const cfg = DEFAULT_PAGING;
  const table = demoTable(); // VPN 0→5,1→2,2→7,4→3,7→1
  let tlb = tlbInit(2);

  // VPN 2 present (frame 7). First touch = TLB miss + walk.
  const va2 = 2 * 4096 + 100;
  const r1 = translate(va2, cfg, table, tlb);
  tlb = r1.tlb;
  eq("miss → walk → frame 7", r1.result.frame, 7);
  eq("physical = 7×4096 + 100", r1.result.physical, 7 * 4096 + 100);
  eq("first touch is a TLB miss", r1.result.tlbHit, false);
  eq("present page ⇒ no page fault", r1.result.pageFault, false);

  // Touch it again → TLB hit, no walk.
  const r2 = translate(va2, cfg, table, tlb);
  tlb = r2.tlb;
  eq("second touch is a TLB hit", r2.result.tlbHit, true);
  ok("TLB-hit path is short (no per-level walk steps)", r2.result.steps.every((s) => s.tone !== "walk"));

  // VPN 3 is NOT present → page fault, no physical address.
  const r3 = translate(3 * 4096, cfg, table, tlb);
  eq("absent page ⇒ page fault", r3.result.pageFault, true);
  eq("faulting translation has no frame", r3.result.frame, null);
  eq("faulting translation has no physical address", r3.result.physical, null);
}
{
  console.log("translation · TLB is LRU with capacity 2:");
  const cfg = DEFAULT_PAGING;
  const table = demoTable();
  let tlb = tlbInit(2);
  // Load 0, then 1 → TLB {0,1}. Load 2 → evicts LRU (0) → TLB {1,2}.
  tlb = translate(0 * 4096, cfg, table, tlb).tlb;
  tlb = translate(1 * 4096, cfg, table, tlb).tlb;
  tlb = translate(2 * 4096, cfg, table, tlb).tlb;
  eq("TLB holds the 2 most-recent VPNs {1,2}", [...tlb.entries].sort((a, b) => a - b), [1, 2]);
  const rEvicted = translate(0 * 4096, cfg, table, tlb); // 0 was evicted
  eq("re-touching the evicted VPN 0 misses the TLB again", rEvicted.result.tlbHit, false);
}

// ================= (C) page replacement — Silberschatz numbers =================
{
  console.log("page replacement · Silberschatz string, 3 frames (FIFO 15 / LRU 12 / OPT 9):");
  const s = SILBERSCHATZ_STRING;
  const fifo = simulateReplacement(s, 3, "fifo");
  const lru = simulateReplacement(s, 3, "lru");
  const opt = simulateReplacement(s, 3, "optimal");
  const clock = simulateReplacement(s, 3, "clock");
  eq("FIFO → 15 faults", fifo.faults, 15);
  eq("LRU → 12 faults", lru.faults, 12);
  eq("Optimal → 9 faults", opt.faults, 9);
  for (const r of [fifo, lru, opt, clock]) {
    ok(`${r.policy}: faults + hits = string length`, r.faults + r.hits === s.length);
  }
  ok("Optimal is truly minimal (≤ every other policy)", POLICIES.every((p) => opt.faults <= simulateReplacement(s, 3, p).faults));
  ok(`Clock sits between LRU and FIFO (${lru.faults} ≤ ${clock.faults} ≤ ${fifo.faults})`, lru.faults <= clock.faults && clock.faults <= fifo.faults);
}

// ================= (D) Bélády's anomaly =================
{
  console.log("Bélády's anomaly · FIFO faults MORE with 4 frames than 3:");
  const b = BELADY_STRING; // 1 2 3 4 1 2 5 1 2 3 4 5
  const f3 = simulateReplacement(b, 3, "fifo").faults;
  const f4 = simulateReplacement(b, 4, "fifo").faults;
  eq("FIFO, 3 frames → 9 faults", f3, 9);
  eq("FIFO, 4 frames → 10 faults", f4, 10);
  ok("the anomaly: more memory, MORE faults (10 > 9)", f4 > f3);
  // LRU is a stack algorithm — it can NEVER exhibit the anomaly.
  const l3 = simulateReplacement(b, 3, "lru").faults;
  const l4 = simulateReplacement(b, 4, "lru").faults;
  ok(`LRU obeys the inclusion property (${l4} ≤ ${l3})`, l4 <= l3);
}

// ================= (E) sanity cases & analysis helpers =================
{
  console.log("replacement · sanity + working set:");
  // Cold misses only: all-distinct refs, frames ≥ distinct → faults = distinct.
  eq("3 distinct refs, 3 frames → 3 faults, 0 hits", (() => {
    const r = simulateReplacement([1, 2, 3], 3, "fifo");
    return [r.faults, r.hits];
  })(), [3, 0]);
  // One page, hammered: 1 fault then all hits.
  eq("[1,1,1] in 1 frame → 1 fault, 2 hits", (() => {
    const r = simulateReplacement([1, 1, 1], 1, "lru");
    return [r.faults, r.hits];
  })(), [1, 2]);

  // Fault curve is non-increasing for a stack algorithm (LRU) — more frames
  // never hurt — but CAN rise for FIFO (that's the anomaly again).
  const lruCurve = faultCurve(BELADY_STRING, "lru", 5);
  ok(`LRU fault curve is non-increasing: ${lruCurve.join(",")}`, lruCurve.every((v, i) => i === 0 || v <= lruCurve[i - 1]));

  // Denning's working set: distinct pages in the trailing window.
  const refs = [1, 2, 3, 2, 1, 4];
  eq("working set of window 3 ending at index 4 = {1,2,3}", workingSet(refs, 4, 3), [1, 2, 3]);
  eq("working set shrinks with the window", workingSet(refs, 4, 2), [1, 2]);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch23: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch23: all checks pass");
