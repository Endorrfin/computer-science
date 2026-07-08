// Engine for ch.29 — the `isolation-anomalies` sim. Two transactions interleave
// on a shared timeline; the isolation level decides which classic anomaly slips
// through. It reproduces the ANSI SQL-92 table exactly:
//
//                       dirty read   non-repeatable   phantom
//   READ UNCOMMITTED        ✗              ✗             ✗
//   READ COMMITTED          ✓              ✗             ✗
//   REPEATABLE READ         ✓              ✓             ✗
//   SERIALIZABLE            ✓              ✓             ✓        (✓ = prevented)
//
// The model is a small schedule interpreter with a defensible per-level
// visibility rule (see `readValue`). The chapter's senior lens notes the
// Berenson-1995 caveat that these English phenomena are ambiguous and that
// snapshot isolation (MVCC) doesn't sit neatly in this grid — but for teaching
// the boundary this table is the canon.
//
// Erasable-syntax only. Deterministic.

export type Level = "read-uncommitted" | "read-committed" | "repeatable-read" | "serializable";

export const LEVELS: { id: Level; label: string }[] = [
  { id: "read-uncommitted", label: "Read Uncommitted" },
  { id: "read-committed", label: "Read Committed" },
  { id: "repeatable-read", label: "Repeatable Read" },
  { id: "serializable", label: "Serializable" },
];

export type Anomaly = "dirty" | "non-repeatable" | "phantom";

export type ScenarioId = Anomaly;

export const SCENARIOS: { id: ScenarioId; title: string; blurb: string }[] = [
  { id: "dirty", title: "Dirty read", blurb: "T2 reads a value T1 has written but not committed — then T1 rolls back, so T2 acted on data that never existed." },
  { id: "non-repeatable", title: "Non-repeatable read", blurb: "T1 reads a row, T2 updates and commits it, T1 reads the same row again — and gets a different value inside one transaction." },
  { id: "phantom", title: "Phantom read", blurb: "T1 runs a predicate query, T2 inserts a matching row and commits, T1 re-runs the query — and a new row appears." },
];

// ---------------------------------------------------------------------------
// Schedule interpreter
// ---------------------------------------------------------------------------

type Op =
  | { t: 1 | 2; op: "read"; item: string; predicate?: boolean; tag: string }
  | { t: 1 | 2; op: "write"; item: string; value: number; tag: string }
  | { t: 1 | 2; op: "commit"; tag: string }
  | { t: 1 | 2; op: "abort"; tag: string };

type Schedule = { initial: Record<string, number>; ops: Op[] };

function schedule(id: ScenarioId): Schedule {
  if (id === "dirty") {
    return {
      initial: { x: 100 },
      ops: [
        { t: 1, op: "write", item: "x", value: 150, tag: "T1 writes x = 150 (uncommitted)" },
        { t: 2, op: "read", item: "x", tag: "T2 reads x" },
        { t: 1, op: "abort", tag: "T1 ROLLBACK — x is 100 again" },
      ],
    };
  }
  if (id === "non-repeatable") {
    return {
      initial: { x: 100 },
      ops: [
        { t: 1, op: "read", item: "x", tag: "T1 reads x (first time)" },
        { t: 2, op: "write", item: "x", value: 200, tag: "T2 writes x = 200" },
        { t: 2, op: "commit", tag: "T2 COMMIT" },
        { t: 1, op: "read", item: "x", tag: "T1 reads x (again)" },
      ],
    };
  }
  // phantom — a predicate count over 'pending' rows
  return {
    initial: { pending: 3 },
    ops: [
      { t: 1, op: "read", item: "pending", predicate: true, tag: "T1: SELECT count(*) WHERE status='pending'" },
      { t: 2, op: "write", item: "pending", value: 4, tag: "T2 INSERT a pending order" },
      { t: 2, op: "commit", tag: "T2 COMMIT" },
      { t: 1, op: "read", item: "pending", predicate: true, tag: "T1: same query again" },
    ],
  };
}

type SimState = {
  committed: Record<string, number>;
  uncommitted: Record<1 | 2, Record<string, number>>;
  firstRead: Record<1 | 2, Record<string, number>>; // RR: per-item repeatable snapshot
  startSnapshot: Record<1 | 2, Record<string, number> | null>; // SER: committed store at txn start
};

function readValue(st: SimState, t: 1 | 2, item: string, predicate: boolean, level: Level): number {
  const other: 1 | 2 = t === 1 ? 2 : 1;
  if (level === "serializable") {
    // Consistent snapshot as of this txn's start — nothing another txn does is visible.
    return (st.startSnapshot[t] ?? st.committed)[item];
  }
  if (level === "repeatable-read") {
    if (predicate) return st.committed[item]; // predicate re-evaluates → phantoms still appear
    if (item in st.firstRead[t]) return st.firstRead[t][item];
    const v = st.committed[item];
    st.firstRead[t][item] = v;
    return v;
  }
  if (level === "read-committed") {
    return st.committed[item]; // only committed data, at the moment of the read
  }
  // read-uncommitted: another txn's in-flight write is visible → dirty reads
  if (item in st.uncommitted[other]) return st.uncommitted[other][item];
  return st.committed[item];
}

export type Step = { tag: string; t: 1 | 2; op: string; item?: string; observed?: number };

export type SimResult = {
  level: Level;
  scenario: ScenarioId;
  steps: Step[];
  reads: number[]; // values the observing transaction saw, in order
  anomaly: boolean; // did the scenario's anomaly manifest?
  explain: string;
};

export function simulate(scenario: ScenarioId, level: Level): SimResult {
  const sch = schedule(scenario);
  const st: SimState = {
    committed: { ...sch.initial },
    uncommitted: { 1: {}, 2: {} },
    firstRead: { 1: {}, 2: {} },
    startSnapshot: { 1: null, 2: null },
  };
  const steps: Step[] = [];
  const reads: number[] = [];
  const seen: Record<1 | 2, boolean> = { 1: false, 2: false };

  for (const o of sch.ops) {
    if (!seen[o.t]) { seen[o.t] = true; st.startSnapshot[o.t] = { ...st.committed }; }
    if (o.op === "read") {
      const v = readValue(st, o.t, o.item, o.predicate ?? false, level);
      reads.push(v);
      steps.push({ tag: o.tag, t: o.t, op: "read", item: o.item, observed: v });
    } else if (o.op === "write") {
      st.uncommitted[o.t][o.item] = o.value;
      steps.push({ tag: o.tag, t: o.t, op: "write", item: o.item });
    } else if (o.op === "commit") {
      Object.assign(st.committed, st.uncommitted[o.t]);
      st.uncommitted[o.t] = {};
      steps.push({ tag: o.tag, t: o.t, op: "commit" });
    } else {
      st.uncommitted[o.t] = {};
      steps.push({ tag: o.tag, t: o.t, op: "abort" });
    }
  }

  const anomaly = detectAnomaly(scenario, reads);
  return { level, scenario, steps, reads, anomaly, explain: explain(scenario, level, anomaly) };
}

function detectAnomaly(scenario: ScenarioId, reads: number[]): boolean {
  if (scenario === "dirty") return reads[0] === 150; // T2 saw the uncommitted-then-rolled-back value
  return reads.length >= 2 && reads[0] !== reads[1]; // the two reads disagree
}

function explain(scenario: ScenarioId, level: Level, anomaly: boolean): string {
  const name = scenario === "dirty" ? "dirty read" : scenario === "non-repeatable" ? "non-repeatable read" : "phantom";
  if (!anomaly) return `${labelOf(level)} prevents the ${name}: the transaction sees a consistent value.`;
  return `${labelOf(level)} allows the ${name}: the transaction observes the interference.`;
}

function labelOf(level: Level): string {
  return LEVELS.find((l) => l.id === level)?.label ?? level;
}

/** The full 3×4 truth table — asserted by the tests, rendered as the sim's grid. */
export function anomalyMatrix(): Record<ScenarioId, Record<Level, boolean>> {
  const out = {} as Record<ScenarioId, Record<Level, boolean>>;
  for (const s of SCENARIOS) {
    out[s.id] = {} as Record<Level, boolean>;
    for (const l of LEVELS) out[s.id][l.id] = simulate(s.id, l.id).anomaly;
  }
  return out;
}
