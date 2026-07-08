// Engine for ch.29 — the query planner + the P8 "Query Planner" boss.
//
// A cost-based optimizer in miniature: for each query it estimates the number
// of PAGE READS three ways and keeps the cheapest —
//   • SEQ SCAN     — read every heap page. Cost = table.pages. Always available.
//   • INDEX SCAN   — descend a B+-tree (≈ its height), read the matching leaf
//                    pages, then fetch each matching row from the heap.
//   • INDEX-ONLY   — if the chosen index already contains every column the query
//                    needs (a "covering" index), skip the heap fetch entirely.
// The planner picks a plan per query the way a real one does: lowest estimated
// cost wins. Selectivity (what fraction of rows a predicate keeps) is the dial
// that decides whether an index is worth it.
//
// The BOSS: one table, three workloads, one page-read budget each. Every write
// must also maintain every applicable index, so "just index everything" blows
// the write budget — you must choose. Reuses btree.bulkStats for honest heights.
//
// Erasable-syntax only. Deterministic. Numbers tuned so the intended index set
// passes and the naive extremes (none / all) fail.

import { bulkStats } from "./btree.ts";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export type Table = {
  name: string;
  rows: number;
  pages: number; // heap pages
  columns: string[];
};

export type Index = {
  id: string;
  columns: string[]; // leading column drives selectivity; extra columns can make it covering
  label: string;
  hint: string;
};

/** A read query: an equality/range predicate on one column, selecting `select`. */
export type ReadQuery = {
  kind: "read";
  label: string;
  predicateCol: string;
  selectivity: number; // fraction of rows matched (0,1]
  select: string[]; // columns the query returns (for covering-index detection)
  sorted?: string; // ORDER BY column, if any (an index on it avoids a sort)
};

export type WriteQuery = { kind: "write"; label: string }; // INSERT/UPDATE one row

export type Query = ReadQuery | WriteQuery;

export type Workload = {
  id: string;
  title: string;
  blurb: string;
  queries: { q: Query; times: number }[];
  budget: number; // total page reads allowed
};

// ---------------------------------------------------------------------------
// Cost model
// ---------------------------------------------------------------------------

const LEAF_CAP = 100; // index entries per leaf page
const INDEX_ORDER = 100; // index fanout

function indexHeight(rows: number): number {
  // Height of a whole-column index, sized by the row count.
  return bulkStats(INDEX_ORDER, Math.max(1, rows), LEAF_CAP).levels;
}

function covers(index: Index, q: ReadQuery): boolean {
  const needed = new Set([q.predicateCol, ...q.select]);
  return [...needed].every((c) => index.columns.includes(c));
}

/** Best index for a read query: one whose leading column is the predicate. */
function usableIndex(q: ReadQuery, indexes: Index[]): Index | null {
  const candidates = indexes.filter((ix) => ix.columns[0] === q.predicateCol);
  if (candidates.length === 0) return null;
  // Prefer a covering index (enables index-only scan).
  const covering = candidates.find((ix) => covers(ix, q));
  return covering ?? candidates[0];
}

export type Plan = {
  plan: "seq-scan" | "index-scan" | "index-only-scan";
  pages: number;
  indexId: string | null;
  note: string;
};

export function planRead(q: ReadQuery, table: Table, indexes: Index[]): Plan {
  const seq: Plan = { plan: "seq-scan", pages: table.pages, indexId: null, note: "read every heap page" };
  const ix = usableIndex(q, indexes);
  if (!ix) return seq;

  const matchRows = Math.max(1, Math.ceil(table.rows * q.selectivity));
  const h = indexHeight(table.rows);
  const leafPages = Math.max(1, Math.ceil(matchRows / LEAF_CAP));
  const descent = h; // pages to reach the first matching leaf

  if (covers(ix, q)) {
    const pages = descent + leafPages; // index-only: no heap fetch
    const idxOnly: Plan = { plan: "index-only-scan", pages, indexId: ix.id, note: "covering index — no heap fetch" };
    return pages < seq.pages ? idxOnly : seq;
  }
  const heapFetches = Math.min(matchRows, table.pages); // one page per matching row, capped
  const pages = descent + leafPages + heapFetches;
  const idx: Plan = { plan: "index-scan", pages, indexId: ix.id, note: "descend + matching leaves + heap fetches" };
  return pages < seq.pages ? idx : seq;
}

/** A write costs 1 heap page + (index height) to maintain EACH index. */
export function writeCost(indexes: Index[]): number {
  return 1 + indexes.length * bulkStats(INDEX_ORDER, 1_000_000, LEAF_CAP).levels;
}

export function workloadCost(w: Workload, table: Table, chosen: Index[]): number {
  let total = 0;
  for (const { q, times } of w.queries) {
    const per = q.kind === "read" ? planRead(q, table, chosen).pages : writeCost(chosen);
    total += per * times;
  }
  return total;
}

// ---------------------------------------------------------------------------
// The boss scenario — `orders` (10k rows), 3 workloads, tuned budgets
// ---------------------------------------------------------------------------

export const BOSS_TABLE: Table = {
  name: "orders",
  rows: 10_000,
  pages: 300,
  columns: ["id", "customer_id", "status", "created_at", "total"],
};

export const BOSS_INDEXES: Index[] = [
  { id: "ix_customer", columns: ["customer_id", "total"], label: "orders(customer_id, total)", hint: "covers a per-customer total lookup → index-only" },
  { id: "ix_status", columns: ["status"], label: "orders(status)", hint: "narrow the ops queue by status" },
  { id: "ix_status_created", columns: ["status", "created_at"], label: "orders(status, created_at)", hint: "status filter AND the ORDER BY, in one index" },
  { id: "ix_created", columns: ["created_at"], label: "orders(created_at)", hint: "a date-range index" },
];

export function indexById(id: string): Index {
  const ix = BOSS_INDEXES.find((x) => x.id === id);
  if (!ix) throw new Error(`unknown index ${id}`);
  return ix;
}

const qCustomer: ReadQuery = { kind: "read", label: "SELECT total WHERE customer_id = ?", predicateCol: "customer_id", selectivity: 0.001, select: ["total"] };
const qStatusSorted: ReadQuery = { kind: "read", label: "SELECT created_at WHERE status='pending' ORDER BY created_at", predicateCol: "status", selectivity: 0.05, select: ["created_at"], sorted: "created_at" };
const qInsert: WriteQuery = { kind: "write", label: "INSERT INTO orders …" };

export const BOSS_WORKLOADS: Workload[] = [
  {
    id: "w1",
    title: "Customer dashboard",
    blurb: "Thousands of point lookups: one customer's order totals. High selectivity — an index earns its keep, and a covering (customer_id, total) one skips the heap entirely (index-only scan).",
    queries: [{ q: qCustomer, times: 20 }],
    budget: 200,
  },
  {
    id: "w2",
    title: "Ops queue",
    blurb: "List the pending orders by date. A composite (status, created_at) index both filters and already covers this query — an index-only scan, no heap fetch. A plain status index would fall back to a full scan.",
    queries: [{ q: qStatusSorted, times: 6 }],
    budget: 250,
  },
  {
    id: "w3",
    title: "Ingest spike",
    blurb: "A flood of inserts. Every index must be maintained on each write, so here indexes are a TAX — carry only the ones the read workloads truly need, or the write budget blows.",
    queries: [{ q: qInsert, times: 60 }],
    budget: 500,
  },
];

export type BossResult = {
  pass: boolean;
  perWorkload: { id: string; title: string; cost: number; budget: number; ok: boolean }[];
  chosen: string[];
};

/** Grade a chosen index set against ALL three workloads at once. */
export function gradeBoss(chosenIds: string[]): BossResult {
  const chosen = chosenIds.map(indexById);
  const perWorkload = BOSS_WORKLOADS.map((w) => {
    const cost = workloadCost(w, BOSS_TABLE, chosen);
    return { id: w.id, title: w.title, cost, budget: w.budget, ok: cost <= w.budget };
  });
  return { pass: perWorkload.every((p) => p.ok), perWorkload, chosen: chosenIds };
}

/** The intended minimal solution (used by tests + the "reveal"). */
export const BOSS_SOLUTION = ["ix_customer", "ix_status_created"];
