// Engine for ch.29 — the `join-visualizer` sim. The same equi-join, two ways,
// with every row touch counted so the asymptotics are visible, not asserted:
//   • NESTED-LOOP JOIN — for each outer row, scan the whole inner table.
//     Touches ≈ |R| · |S|  →  O(n·m). Fine when one side is tiny.
//   • HASH JOIN — build a hash table on the inner side once, then probe it once
//     per outer row. Touches = |S| (build) + |R| (probe)  →  O(n + m).
// Both return the same matched pairs; only the work differs.
//
// Erasable-syntax only. Deterministic.

export type Row = { id: number; key: number };

export type JoinStep =
  | { phase: "scan"; side: "R" | "S"; rowId: number }
  | { phase: "build"; rowId: number; key: number }
  | { phase: "probe"; rowId: number; key: number; hit: boolean }
  | { phase: "match"; r: number; s: number };

export type JoinResult = {
  algorithm: "nested-loop" | "hash";
  pairs: [number, number][]; // [R.id, S.id] matched on equal key
  touches: number; // rows read (the fair cost metric)
  trace: JoinStep[];
};

/** Nested-loop join: outer R, inner S. Touches = |R| · |S|. */
export function nestedLoopJoin(R: Row[], S: Row[]): JoinResult {
  const pairs: [number, number][] = [];
  const trace: JoinStep[] = [];
  let touches = 0;
  for (const r of R) {
    trace.push({ phase: "scan", side: "R", rowId: r.id });
    for (const s of S) {
      touches++; // reading an inner row to compare
      trace.push({ phase: "scan", side: "S", rowId: s.id });
      if (r.key === s.key) {
        pairs.push([r.id, s.id]);
        trace.push({ phase: "match", r: r.id, s: s.id });
      }
    }
  }
  return { algorithm: "nested-loop", pairs, touches, trace };
}

/** Hash join: build a multimap on S, probe once per R row. Touches = |S| + |R|. */
export function hashJoin(R: Row[], S: Row[]): JoinResult {
  const pairs: [number, number][] = [];
  const trace: JoinStep[] = [];
  let touches = 0;
  const table = new Map<number, number[]>();
  for (const s of S) {
    touches++; // build
    trace.push({ phase: "build", rowId: s.id, key: s.key });
    const bucket = table.get(s.key);
    if (bucket) bucket.push(s.id);
    else table.set(s.key, [s.id]);
  }
  for (const r of R) {
    touches++; // probe
    const bucket = table.get(r.key);
    trace.push({ phase: "probe", rowId: r.id, key: r.key, hit: !!bucket });
    if (bucket) for (const sid of bucket) {
      pairs.push([r.id, sid]);
      trace.push({ phase: "match", r: r.id, s: sid });
    }
  }
  return { algorithm: "hash", pairs, touches, trace };
}

/** Sorted, canonical pair list — so two algorithms' results can be compared. */
export function canonicalPairs(res: JoinResult): string {
  return res.pairs
    .map(([r, s]) => `${r}-${s}`)
    .sort()
    .join(",");
}

// Small demo tables the sim ships with (a few customers, several orders).
export const DEMO_R: Row[] = [
  { id: 1, key: 10 },
  { id: 2, key: 20 },
  { id: 3, key: 30 },
  { id: 4, key: 40 },
];
export const DEMO_S: Row[] = [
  { id: 101, key: 20 },
  { id: 102, key: 20 },
  { id: 103, key: 30 },
  { id: 104, key: 50 },
  { id: 105, key: 10 },
  { id: 106, key: 30 },
];
