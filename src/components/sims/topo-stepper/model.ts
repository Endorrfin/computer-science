// Engine — topo-stepper (ch.17 micro). Topological order by Kahn's algorithm:
// repeatedly remove a node with in-degree 0 (nothing left pointing at it) and
// decrement its successors. The order you peel them off IS a valid topological
// order — the schedule in which tasks can run once their prerequisites are done.
// The teachable failure: add a back-edge to make a cycle, and eventually NO node
// has in-degree 0 while nodes remain → the algorithm is stuck, which is exactly
// how Kahn's detects a cycle (a graph is a DAG iff it topo-sorts completely).
//
// Deterministic: among zero-in-degree nodes we always take the smallest index,
// so the trace is reproducible and test-ch17.ts can pin it.
//
// No React import — runs under Node for the tests.

export type Digraph = {
  n: number;
  edges: [number, number][]; // u → v : v depends on u
  labels: string[];
};

export function inDegrees(g: Digraph): number[] {
  const indeg = Array.from({ length: g.n }, () => 0);
  for (const [, v] of g.edges) indeg[v]++;
  return indeg;
}

export function successors(g: Digraph, u: number): number[] {
  return g.edges.filter(([a]) => a === u).map(([, b]) => b).sort((a, b) => a - b);
}

export type TopoStep = {
  removed: number; // node peeled this step
  indeg: number[]; // in-degrees AFTER peeling
  remaining: number[]; // nodes not yet peeled, ascending
  note: string;
};

export type TopoResult = {
  order: number[]; // peel order = a valid topological order (if ok)
  ok: boolean; // false → a cycle blocked completion
  steps: TopoStep[];
  stuck: number[]; // nodes trapped in the cycle (empty if ok)
};

export function topoSort(g: Digraph): TopoResult {
  const indeg = inDegrees(g);
  const removedSet = new Set<number>();
  const order: number[] = [];
  const steps: TopoStep[] = [];

  const zeroReady = (): number[] => {
    const out: number[] = [];
    for (let i = 0; i < g.n; i++) if (!removedSet.has(i) && indeg[i] === 0) out.push(i);
    return out;
  };

  while (order.length < g.n) {
    const ready = zeroReady();
    if (ready.length === 0) break; // cycle: nothing can be scheduled
    const node = ready[0]; // deterministic: smallest index
    removedSet.add(node);
    order.push(node);
    for (const v of successors(g, node)) if (!removedSet.has(v)) indeg[v]--;
    const remaining: number[] = [];
    for (let i = 0; i < g.n; i++) if (!removedSet.has(i)) remaining.push(i);
    steps.push({
      removed: node,
      indeg: [...indeg],
      remaining,
      note:
        remaining.length === 0
          ? `Peel ${g.labels[node]} (in-degree 0). Everything scheduled — a full topological order.`
          : `Peel ${g.labels[node]} (in-degree 0), decrement its successors.`,
    });
  }

  const ok = order.length === g.n;
  const stuck: number[] = [];
  if (!ok) for (let i = 0; i < g.n; i++) if (!removedSet.has(i)) stuck.push(i);
  return { order, ok, steps, stuck };
}

export function addEdge(g: Digraph, u: number, v: number): Digraph {
  if (g.edges.some(([a, b]) => a === u && b === v)) return g;
  return { ...g, edges: [...g.edges, [u, v]] };
}

/** Valid iff every edge points from an earlier position to a later one. */
export function isValidTopoOrder(g: Digraph, order: number[]): boolean {
  if (order.length !== g.n) return false;
  const pos = Array.from({ length: g.n }, () => -1);
  order.forEach((node, i) => (pos[node] = i));
  return g.edges.every(([u, v]) => pos[u] !== -1 && pos[v] !== -1 && pos[u] < pos[v]);
}

/** Demo DAG — a tiny build/dependency graph. The cycle button adds F→A. */
export function demoDag(): Digraph {
  return {
    n: 6,
    labels: ["A", "B", "C", "D", "E", "F"],
    edges: [
      [0, 1], // A → B
      [0, 2], // A → C
      [1, 3], // B → D
      [2, 3], // C → D
      [3, 5], // D → F
      [4, 5], // E → F
    ],
  };
}
