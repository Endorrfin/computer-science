// Engine — repr-switcher (ch.17 micro). One directed graph, two representations,
// and the operation-cost gap between them. An adjacency MATRIX answers "is u→v an
// edge?" in O(1) (one cell read) but "list u's neighbours" costs O(V) (scan the
// whole row) and always burns V² space. An adjacency LIST lists neighbours in
// O(deg u) and stores only V+E, but an edge test has to scan u's list. The sim
// runs the two query types in both reps and counts the reads; this module is the
// deterministic cost model behind those counters (pinned in test-ch17.ts).
//
// No React import — runs under Node for the tests.

export type Graph = {
  n: number;
  adj: number[][]; // adj[u] = ascending list of v with edge u→v (directed)
  labels: string[];
};

export function edgeCount(g: Graph): number {
  let e = 0;
  for (const list of g.adj) e += list.length;
  return e;
}

export function toMatrix(g: Graph): number[][] {
  const m: number[][] = Array.from({ length: g.n }, () => Array.from({ length: g.n }, () => 0));
  for (let u = 0; u < g.n; u++) for (const v of g.adj[u]) m[u][v] = 1;
  return m;
}

export function hasEdge(g: Graph, u: number, v: number): boolean {
  return g.adj[u].includes(v);
}

// ---- operation costs (reads), the whole point of the sim ----

/** Matrix edge test: exactly one cell read, regardless of the graph. */
export function edgeTestCostMatrix(): number {
  return 1;
}
/** List edge test: linear scan of u's list — comparisons until v is found, or
    the whole list if it isn't. This is what makes lists slow at edge queries. */
export function edgeTestCostList(g: Graph, u: number, v: number): number {
  const list = g.adj[u];
  const at = list.indexOf(v);
  return at === -1 ? list.length : at + 1;
}
/** Matrix neighbour listing: scan the entire row of V cells. */
export function neighborsCostMatrix(g: Graph): number {
  return g.n;
}
/** List neighbour listing: read exactly deg(u) entries. */
export function neighborsCostList(g: Graph, u: number): number {
  return g.adj[u].length;
}

export function matrixSpace(g: Graph): number {
  return g.n * g.n;
}
export function listSpace(g: Graph): number {
  return g.n + edgeCount(g);
}
export function degree(g: Graph, u: number): number {
  return g.adj[u].length;
}

/** The demo graph: 6 labelled nodes, sparse (E ≪ V²) so the space gap is real. */
export function demoGraph(): Graph {
  return {
    n: 6,
    labels: ["A", "B", "C", "D", "E", "F"],
    adj: [
      [1, 2], // A → B, C
      [3], // B → D
      [3, 4], // C → D, E
      [5], // D → F
      [5], // E → F
      [], // F
    ],
  };
}
