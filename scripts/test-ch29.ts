// ch.29 · Databases — engine checks (B+-tree · query planner + boss · isolation · joins).
// Run: node --experimental-strip-types scripts/test-ch29.ts
import {
  createTree,
  insertKey,
  search,
  rangeScan,
  scanAll,
  height,
  bulkStats,
  fromKeys,
} from "../src/components/sims/db/btree.ts";
import type { BPlusNode, BPlusTree } from "../src/components/sims/db/btree.ts";
import {
  planRead,
  workloadCost,
  gradeBoss,
  BOSS_TABLE,
  BOSS_INDEXES,
  BOSS_WORKLOADS,
  BOSS_SOLUTION,
  indexById,
} from "../src/components/sims/db/planner.ts";
import type { ReadQuery } from "../src/components/sims/db/planner.ts";
import { simulate, anomalyMatrix, SCENARIOS, LEVELS } from "../src/components/sims/db/isolation.ts";
import { nestedLoopJoin, hashJoin, canonicalPairs, DEMO_R, DEMO_S } from "../src/components/sims/db/joins.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

// ===================== (A) B+-tree invariants =====================
{
  console.log("B+-tree · structure & invariants:");

  // Invariant checker: leaves sorted, all keys present, capacity respected, all
  // leaves at the same depth, separator keys route correctly.
  function checkInvariants(tree: BPlusTree, inserted: number[]): string[] {
    const errs: string[] = [];
    const maxKeys = tree.order - 1;
    const leafDepths = new Set<number>();
    function walk(node: BPlusNode, depth: number, lo: number, hi: number): void {
      if (node.keys.length > maxKeys) errs.push(`node ${node.id} overflows (${node.keys.length} > ${maxKeys})`);
      for (let i = 1; i < node.keys.length; i++) if (node.keys[i] <= node.keys[i - 1]) errs.push(`node ${node.id} keys not sorted`);
      for (const k of node.keys) if (k < lo || k >= hi) errs.push(`node ${node.id} key ${k} out of [${lo},${hi})`);
      if (node.leaf) { leafDepths.add(depth); return; }
      if (node.children.length !== node.keys.length + 1) errs.push(`node ${node.id} children != keys+1`);
      for (let i = 0; i < node.children.length; i++) {
        const clo = i === 0 ? lo : node.keys[i - 1];
        const chi = i === node.keys.length ? hi : node.keys[i];
        walk(node.children[i], depth + 1, clo, chi);
      }
    }
    walk(tree.root, 0, -Infinity, Infinity);
    if (leafDepths.size > 1) errs.push(`leaves at differing depths: ${[...leafDepths]}`);
    const scanned = scanAll(tree);
    const want = [...inserted].sort((a, b) => a - b);
    if (JSON.stringify(scanned) !== JSON.stringify(want)) errs.push(`leaf-chain scan != sorted keys`);
    return errs;
  }

  // Ascending insert (the case a plain BST degenerates on) must stay balanced.
  const asc = Array.from({ length: 50 }, (_, i) => i + 1);
  const t1 = fromKeys(asc, 4);
  eq("ascending 1..50 → invariants hold", checkInvariants(t1, asc), []);
  ok("ascending 1..50 stays shallow (height ≤ 5)", height(t1) <= 5, `height=${height(t1)}`);

  // Descending + shuffled inserts.
  const desc = Array.from({ length: 50 }, (_, i) => 50 - i);
  eq("descending 50..1 → invariants hold", checkInvariants(fromKeys(desc, 4), desc), []);
  const shuffled = [17, 3, 42, 8, 25, 1, 33, 19, 6, 48, 12, 29, 37, 2, 45, 22, 9, 40, 14, 31, 5, 27, 50, 11, 36];
  eq("shuffled → invariants hold", checkInvariants(fromKeys(shuffled, 4), shuffled), []);

  // Order-6 tree, 200 keys.
  const big = Array.from({ length: 200 }, (_, i) => (i * 7) % 200);
  const uniqueBig = [...new Set(big)];
  eq("order-6, 200 mixed keys → invariants hold", checkInvariants(fromKeys(uniqueBig, 6), uniqueBig), []);

  // Duplicate keys are ignored (unique index).
  const dup = createTree(4);
  insertKey(dup, 5); insertKey(dup, 5); insertKey(dup, 5);
  eq("duplicate inserts ignored", scanAll(dup), [5]);

  // A split actually happens and grows height off a single leaf.
  const grow = createTree(4);
  eq("empty tree height 1", height(grow), 1);
  [10, 20, 30].forEach((k) => insertKey(grow, k));
  eq("3 keys still one leaf (order 4)", height(grow), 1);
  const ev = insertKey(grow, 40); // 4th key overflows the leaf → split → new root
  ok("4th key splits the leaf", ev.didSplit);
  eq("...height grows to 2", height(grow), 2);
}

// ===================== (B) search & range scan cost =====================
{
  console.log("B+-tree · search & range (page-read cost):");
  const t = fromKeys(Array.from({ length: 100 }, (_, i) => i + 1), 4);
  const h = height(t);

  // Every key is found; a search reads exactly `height` nodes (root → leaf).
  let allFound = true, allHeight = true;
  for (let k = 1; k <= 100; k++) {
    const r = search(t, k);
    if (!r.found) allFound = false;
    if (r.nodeReads !== h) allHeight = false;
  }
  ok("all 100 keys found", allFound);
  ok(`every search reads exactly height (${h}) nodes`, allHeight);
  eq("a miss is reported", search(t, 999).found, false);

  // Range scan walks the leaf chain: descend once, then hop leaves.
  const r = rangeScan(t, 20, 35);
  eq("range [20,35] returns exactly those keys", r.keys, Array.from({ length: 16 }, (_, i) => i + 20));
  ok("range descent reads == height", r.descentReads === h, `descentReads=${r.descentReads}`);
  ok("range walks ≥ 2 leaves for 16 rows at order 4", r.leavesWalked >= 2, `leaves=${r.leavesWalked}`);

  // The scoreboard: index vs full scan on 10k rows is a landslide.
  const bs = bulkStats(100, 10_000, 100);
  eq("10k rows → 100 leaf pages", bs.fullScanReads, 100);
  ok("10k-row index reaches a leaf in ≤ 3 reads", bs.indexReads <= 3, `indexReads=${bs.indexReads}`);
  ok("index scan beats full scan by ≥ 30×", bs.fullScanReads / bs.indexReads >= 30);
}

// ===================== (C) query planner & the boss =====================
{
  console.log("query planner · cost-based plan choice:");
  const table = BOSS_TABLE;

  // High selectivity → an index wins; a covering index goes index-only.
  const pointCovering: ReadQuery = { kind: "read", label: "", predicateCol: "customer_id", selectivity: 0.001, select: ["total"] };
  const p1 = planRead(pointCovering, table, [indexById("ix_customer")]);
  eq("covering point lookup → index-only-scan", p1.plan, "index-only-scan");
  ok("index-only is far cheaper than seq scan", p1.pages < table.pages, `pages=${p1.pages} vs ${table.pages}`);

  // Same query, no index → seq scan.
  eq("no usable index → seq scan", planRead(pointCovering, table, []).plan, "seq-scan");

  // Low selectivity (most rows match) → the planner rejects the index.
  const wide: ReadQuery = { kind: "read", label: "", predicateCol: "customer_id", selectivity: 0.9, select: ["total"] };
  eq("low-selectivity predicate → seq scan wins", planRead(wide, table, [indexById("ix_customer")]).plan, "index-only-scan");
  // (covering index-only stays cheap even at 90%: leaves only, no heap — still < 300 pages)
  ok("...covering index-only still < seq pages", planRead(wide, table, [indexById("ix_customer")]).pages < table.pages);

  // A non-covering index at low selectivity must lose to seq scan (heap fetch blowup).
  const wideNonCovering: ReadQuery = { kind: "read", label: "", predicateCol: "status", selectivity: 0.9, select: ["id", "total"] };
  eq("non-covering + low selectivity → seq scan", planRead(wideNonCovering, table, [indexById("ix_status")]).plan, "seq-scan");

  // The boss: the intended index set passes ALL three workloads.
  const sol = gradeBoss(BOSS_SOLUTION);
  ok("intended solution passes the boss", sol.pass, JSON.stringify(sol.perWorkload));

  // No indexes fails (reads too slow); ALL indexes fails (writes too slow).
  ok("no indexes fails (reads blow the budget)", !gradeBoss([]).pass);
  const allIx = gradeBoss(BOSS_INDEXES.map((i) => i.id));
  ok("indexing everything fails (ingest write cost)", !allIx.pass);
  const w3all = allIx.perWorkload.find((p) => p.id === "w3")!;
  ok("...and it's the ingest workload that breaks", !w3all.ok, JSON.stringify(w3all));

  // Each workload's intended plan is under budget with the solution.
  for (const w of BOSS_WORKLOADS) {
    const cost = workloadCost(w, table, BOSS_SOLUTION.map(indexById));
    ok(`workload ${w.id} within budget (${cost} ≤ ${w.budget})`, cost <= w.budget);
  }
}

// ===================== (D) isolation anomalies — the ANSI matrix =====================
{
  console.log("isolation · ANSI SQL-92 anomaly matrix:");
  const m = anomalyMatrix();
  // dirty read: only Read Uncommitted lets it through.
  eq("dirty @ read-uncommitted → occurs", m.dirty["read-uncommitted"], true);
  eq("dirty @ read-committed → prevented", m.dirty["read-committed"], false);
  eq("dirty @ serializable → prevented", m.dirty["serializable"], false);
  // non-repeatable: RU and RC.
  eq("non-repeatable @ read-committed → occurs", m["non-repeatable"]["read-committed"], true);
  eq("non-repeatable @ repeatable-read → prevented", m["non-repeatable"]["repeatable-read"], false);
  // phantom: RU, RC, RR — only Serializable stops it.
  eq("phantom @ repeatable-read → occurs", m.phantom["repeatable-read"], true);
  eq("phantom @ serializable → prevented", m.phantom["serializable"], false);

  // The staircase: each stronger level prevents strictly more.
  const order: Array<"read-uncommitted" | "read-committed" | "repeatable-read" | "serializable"> =
    ["read-uncommitted", "read-committed", "repeatable-read", "serializable"];
  let monotone = true;
  for (const s of SCENARIOS) {
    const flags = order.map((l) => m[s.id][l]);
    for (let i = 1; i < flags.length; i++) if (flags[i] && !flags[i - 1]) monotone = false; // can't re-appear
  }
  ok("stronger levels only ever prevent more (monotone staircase)", monotone);

  // The dirty-read value really is the rolled-back one under RU.
  const d = simulate("dirty", "read-uncommitted");
  eq("RU dirty read observes the uncommitted 150", d.reads[0], 150);
  eq("RC reads the committed 100 instead", simulate("dirty", "read-committed").reads[0], 100);

  // Exactly the canonical count of ✗ per level (prevented cells).
  const preventedByLevel = LEVELS.map((l) => SCENARIOS.filter((s) => !m[s.id][l.id]).length);
  eq("prevented counts per level = [0,1,2,3]", preventedByLevel, [0, 1, 2, 3]);
}

// ===================== (E) joins — nested-loop vs hash =====================
{
  console.log("joins · nested-loop vs hash (row touches):");
  const nl = nestedLoopJoin(DEMO_R, DEMO_S);
  const hj = hashJoin(DEMO_R, DEMO_S);

  eq("both algorithms produce the same matches", canonicalPairs(nl), canonicalPairs(hj));
  eq("nested-loop touches |R|·|S|", nl.touches, DEMO_R.length * DEMO_S.length);
  eq("hash touches |R|+|S|", hj.touches, DEMO_R.length + DEMO_S.length);
  ok("hash join does strictly less work here", hj.touches < nl.touches);

  // Correct match set on the demo: R keys {10,20,30,40} vs S keys — key 20 has
  // two S rows, key 30 has two S rows, key 10 one, key 40 none, key 50 unmatched.
  eq("match count is right", nl.pairs.length, 5);

  // Scale: nested-loop is quadratic, hash linear.
  const bigR = Array.from({ length: 100 }, (_, i) => ({ id: i, key: i }));
  const bigS = Array.from({ length: 100 }, (_, i) => ({ id: 1000 + i, key: i }));
  eq("100×100 nested-loop = 10,000 touches", nestedLoopJoin(bigR, bigS).touches, 10_000);
  eq("100+100 hash = 200 touches", hashJoin(bigR, bigS).touches, 200);
}

console.log(failed === 0 ? "\n✓ ch.29 engines: all checks pass" : `\n✗ ch.29 engines: ${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
