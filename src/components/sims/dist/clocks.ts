// Engine for ch.30 — the `logical-clocks` figure. Lamport's logical clocks
// (Lamport, "Time, Clocks, and the Ordering of Events in a Distributed System",
// 1978). With no global clock, each process keeps a counter and follows two
// rules:
//   1. before any local event or send, increment your counter;
//   2. on receiving a message stamped `ts`, set counter = max(counter, ts) + 1.
// This guarantees the CLOCK CONDITION: if a → b (a happens-before b) then
// C(a) < C(b). The converse does NOT hold — C(a) < C(b) can also mean the two
// are *concurrent*, which is exactly why vector clocks (Fidge & Mattern, 1988)
// exist. The figure shows both: the arrows that must climb, and a concurrent
// pair whose timestamps order them anyway.
//
// Deterministic. Erasable-syntax only.

export type EventSpec =
  | { proc: number; type: "local"; label: string }
  | { proc: number; type: "send"; label: string; msg: string }
  | { proc: number; type: "recv"; label: string; msg: string };

export type StampedEvent = EventSpec & { index: number; ts: number };

export type LamportResult = {
  events: StampedEvent[];
  messages: { msg: string; sendIndex: number; recvIndex: number }[];
};

/** Compute Lamport timestamps for a scenario (per-process array order = local order). */
export function runLamport(spec: EventSpec[]): LamportResult {
  const n = spec.length;
  const prevOnProc: (number | null)[] = new Array(n).fill(null);
  const lastIndexForProc = new Map<number, number>();
  const sendOf = new Map<string, number>();
  const recvOf = new Map<string, number>();

  // Build dependency edges: process-order (prev event same proc) + message (send→recv).
  const preds: number[][] = spec.map(() => []);
  spec.forEach((e, i) => {
    const prev = lastIndexForProc.get(e.proc);
    if (prev !== undefined) preds[i].push(prev);
    lastIndexForProc.set(e.proc, i);
    prevOnProc[i] = prev ?? null;
    if (e.type === "send") sendOf.set(e.msg, i);
    if (e.type === "recv") recvOf.set(e.msg, i);
  });
  const messages: { msg: string; sendIndex: number; recvIndex: number }[] = [];
  for (const [msg, s] of sendOf) {
    const r = recvOf.get(msg);
    if (r === undefined) throw new Error(`message ${msg} has a send but no recv`);
    preds[r].push(s);
    messages.push({ msg, sendIndex: s, recvIndex: r });
  }

  // Topological order (Kahn) over the dependency DAG.
  const indeg = preds.map((p) => p.length);
  const succ: number[][] = spec.map(() => []);
  preds.forEach((ps, i) => ps.forEach((p) => succ[p].push(i)));
  const queue: number[] = [];
  indeg.forEach((d, i) => { if (d === 0) queue.push(i); });
  const order: number[] = [];
  while (queue.length) {
    const i = queue.shift()!;
    order.push(i);
    for (const j of succ[i]) { if (--indeg[j] === 0) queue.push(j); }
  }
  if (order.length !== n) throw new Error("cycle in event dependencies");

  // Assign timestamps in topological order.
  const ts = new Array<number>(n).fill(0);
  const procCounter = new Map<number, number>();
  const sendTs = new Map<string, number>();
  for (const i of order) {
    const e = spec[i];
    const base = procCounter.get(e.proc) ?? 0;
    let t: number;
    if (e.type === "recv") t = Math.max(base, sendTs.get(e.msg) ?? 0) + 1;
    else t = base + 1;
    ts[i] = t;
    procCounter.set(e.proc, t);
    if (e.type === "send") sendTs.set(e.msg, t);
  }

  const events: StampedEvent[] = spec.map((e, i) => ({ ...e, index: i, ts: ts[i] }));
  return { events, messages };
}

/** happened-before: is there a path x ⇝ y through process-order + message edges? */
export function happensBefore(res: LamportResult, x: number, y: number): boolean {
  const succ = new Map<number, number[]>();
  const add = (a: number, b: number): void => {
    const s = succ.get(a) ?? [];
    s.push(b);
    succ.set(a, s);
  };
  // Forward edges: process-order (consecutive events on a process) + messages.
  const byProc = new Map<number, number[]>();
  res.events.forEach((e) => {
    const a = byProc.get(e.proc) ?? [];
    a.push(e.index);
    byProc.set(e.proc, a);
  });
  for (const idxs of byProc.values()) for (let i = 1; i < idxs.length; i++) add(idxs[i - 1], idxs[i]);
  for (const m of res.messages) add(m.sendIndex, m.recvIndex);

  const seen = new Set<number>([x]);
  const stack = [x];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === y) return true;
    for (const nxt of succ.get(cur) ?? []) if (!seen.has(nxt)) { seen.add(nxt); stack.push(nxt); }
  }
  return false;
}

export function concurrent(res: LamportResult, x: number, y: number): boolean {
  return x !== y && !happensBefore(res, x, y) && !happensBefore(res, y, x);
}

// The canonical three-process scenario the figure renders.
export const CANONICAL: EventSpec[] = [
  { proc: 0, type: "local", label: "a" },
  { proc: 0, type: "send", label: "b", msg: "m1" },
  { proc: 1, type: "recv", label: "c", msg: "m1" },
  { proc: 1, type: "send", label: "d", msg: "m2" },
  { proc: 2, type: "local", label: "e" },
  { proc: 2, type: "recv", label: "f", msg: "m2" },
];
