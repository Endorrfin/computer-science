// Engine — pathfinder (ch.17 HERO). Four classic graph searches over the SAME
// 4-connected grid, so their differences are visible, not asserted: BFS floods
// in rings and is shortest by HOP count; DFS dives down one corridor and returns
// whatever it stumbles into (not shortest); Dijkstra floods by CUMULATIVE cost
// and is shortest on weighted terrain; A* is Dijkstra plus a heuristic pull
// toward the goal — with the heuristic weight `hw` it MORPHS: hw=0 is exactly
// Dijkstra, hw=1 is admissible/optimal A*, hw≫1 is greedy best-first (fast but
// can miss the shortest path).
//
// Every run returns a deterministic trace (expansion order + the frontier after
// each expansion + came-from links), so the sim replays it frame-by-frame and
// scripts/test-ch17.ts pins the invariants: BFS hop-optimal, Dijkstra == A*(1)
// cost, A*(1) expands ≤ Dijkstra, DFS ≥ BFS, walls block, hw=0 ≡ Dijkstra.
//
// No React import — runs under Node for the tests.

export type Cell = { wall: boolean; weight: number };
export type Grid = {
  w: number;
  h: number;
  cells: Cell[]; // row-major, length w*h
  start: number; // cell index
  goal: number; // cell index
};

export type Algo = "bfs" | "dfs" | "dijkstra" | "astar";

export type SearchResult = {
  algo: Algo;
  order: number[]; // expansion order (closed set); order[0] === start
  frontierAfter: number[][]; // open set after expanding order[k]
  gScore: Record<number, number>; // metric cost to reach each expanded node
  cameFrom: Record<number, number>; // node → predecessor
  path: number[]; // start..goal inclusive; [] if unreachable
  cost: number; // path metric: hops (bfs/dfs) or weighted sum (dijkstra/astar)
  found: boolean;
};

// ------------------------------- geometry -------------------------------

export function xy(i: number, w: number): { x: number; y: number } {
  return { x: i % w, y: Math.floor(i / w) };
}
export function idx(x: number, y: number, w: number): number {
  return y * w + x;
}
export function manhattan(a: number, b: number, w: number): number {
  const pa = xy(a, w);
  const pb = xy(b, w);
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y);
}

// 4-connected neighbours in a fixed order (up, right, down, left) so every
// search is deterministic and the tests can pin exact expansion sequences.
const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function neighbors(g: Grid, i: number): number[] {
  const { x, y } = xy(i, g.w);
  const out: number[] = [];
  for (const d of DIRS) {
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
    const ni = idx(nx, ny, g.w);
    if (g.cells[ni].wall) continue;
    out.push(ni);
  }
  return out;
}

function toRecord(m: Map<number, number>): Record<number, number> {
  const o: Record<number, number> = {};
  for (const [k, v] of m) o[k] = v;
  return o;
}

function reconstruct(cameFrom: Map<number, number>, start: number, goal: number): number[] {
  if (start !== goal && !cameFrom.has(goal)) return [];
  const path = [goal];
  let cur = goal;
  while (cur !== start) {
    cur = cameFrom.get(cur) as number;
    path.push(cur);
  }
  return path.reverse();
}

// ------------------------------- BFS / DFS -------------------------------
// Uninformed searches on hop count (weights ignored). BFS uses a FIFO queue and
// is therefore shortest-by-hops; DFS uses a LIFO stack and is not.

function bfs(g: Grid): SearchResult {
  const order: number[] = [];
  const frontierAfter: number[][] = [];
  const gScore = new Map<number, number>([[g.start, 0]]);
  const cameFrom = new Map<number, number>();
  const seen = new Set<number>([g.start]);
  const queue: number[] = [g.start];
  let found = false;

  while (queue.length > 0) {
    const node = queue.shift() as number;
    order.push(node);
    if (node === g.goal) {
      found = true;
      frontierAfter.push([...queue]);
      break;
    }
    for (const n of neighbors(g, node)) {
      if (seen.has(n)) continue;
      seen.add(n);
      cameFrom.set(n, node);
      gScore.set(n, (gScore.get(node) as number) + 1);
      queue.push(n);
    }
    frontierAfter.push([...queue]);
  }
  const path = found ? reconstruct(cameFrom, g.start, g.goal) : [];
  const cost = found ? (gScore.get(g.goal) as number) : Infinity;
  return { algo: "bfs", order, frontierAfter, gScore: toRecord(gScore), cameFrom: toRecord(cameFrom), path, cost, found };
}

function dfs(g: Grid): SearchResult {
  const order: number[] = [];
  const frontierAfter: number[][] = [];
  const gScore = new Map<number, number>([[g.start, 0]]);
  const cameFrom = new Map<number, number>();
  const seen = new Set<number>();
  const stack: number[] = [g.start];
  let found = false;

  while (stack.length > 0) {
    const node = stack.pop() as number;
    if (seen.has(node)) {
      frontierAfter.push([...stack]);
      continue;
    }
    seen.add(node);
    order.push(node);
    if (node === g.goal) {
      found = true;
      frontierAfter.push([...stack]);
      break;
    }
    // push neighbours in reverse so they pop in the DIRS order
    const ns = neighbors(g, node);
    for (let k = ns.length - 1; k >= 0; k--) {
      const n = ns[k];
      if (seen.has(n)) continue;
      if (!cameFrom.has(n) && n !== g.start) {
        cameFrom.set(n, node);
        gScore.set(n, (gScore.get(node) as number) + 1);
      }
      stack.push(n);
    }
    frontierAfter.push([...stack]);
  }
  const path = found ? reconstruct(cameFrom, g.start, g.goal) : [];
  // DFS path cost is measured in hops along the tree path it actually took.
  const cost = found ? path.length - 1 : Infinity;
  return { algo: "dfs", order, frontierAfter, gScore: toRecord(gScore), cameFrom: toRecord(cameFrom), path, cost, found };
}

// --------------------------- Dijkstra / A* ---------------------------
// Best-first on f = g + hw·h. hw=0 → Dijkstra (uniform-cost); hw=1 → admissible
// A*; hw>1 → weighted A* trending to greedy. g accumulates the ENTERED cell's
// terrain weight. A linear-scan open set keeps ties deterministic (min f, then
// min h, then min index) — grids here are small, so O(V²) is irrelevant.

function bestFirst(g: Grid, hw: number): SearchResult {
  const algo: Algo = hw === 0 ? "dijkstra" : "astar";
  const order: number[] = [];
  const frontierAfter: number[][] = [];
  const gScore = new Map<number, number>([[g.start, 0]]);
  const cameFrom = new Map<number, number>();
  const closed = new Set<number>();
  const open = new Set<number>([g.start]);
  let found = false;

  const h = (n: number): number => manhattan(n, g.goal, g.w);
  const f = (n: number): number => (gScore.get(n) as number) + hw * h(n);

  while (open.size > 0) {
    // pick the open node with the smallest f (deterministic tie-breaks)
    let node = -1;
    for (const n of open) {
      if (
        node === -1 ||
        f(n) < f(node) ||
        (f(n) === f(node) && h(n) < h(node)) ||
        (f(n) === f(node) && h(n) === h(node) && n < node)
      ) {
        node = n;
      }
    }
    open.delete(node);
    closed.add(node);
    order.push(node);
    if (node === g.goal) {
      found = true;
      frontierAfter.push([...open]);
      break;
    }
    for (const n of neighbors(g, node)) {
      if (closed.has(n)) continue;
      const tentative = (gScore.get(node) as number) + g.cells[n].weight;
      const prev = gScore.get(n);
      if (prev === undefined || tentative < prev) {
        cameFrom.set(n, node);
        gScore.set(n, tentative);
        open.add(n);
      }
    }
    frontierAfter.push([...open]);
  }
  const path = found ? reconstruct(cameFrom, g.start, g.goal) : [];
  const cost = found ? (gScore.get(g.goal) as number) : Infinity;
  return { algo, order, frontierAfter, gScore: toRecord(gScore), cameFrom: toRecord(cameFrom), path, cost, found };
}

export function run(g: Grid, algo: Algo, hw: number): SearchResult {
  switch (algo) {
    case "bfs":
      return bfs(g);
    case "dfs":
      return dfs(g);
    case "dijkstra":
      return bestFirst(g, 0);
    case "astar":
      return bestFirst(g, hw);
  }
}

/** Weighted path cost under the terrain model (sum of entered cells), for any
    path — lets the sim compare an unweighted search's route fairly. */
export function weightedCost(g: Grid, path: number[]): number {
  let c = 0;
  for (let i = 1; i < path.length; i++) c += g.cells[path[i]].weight;
  return c;
}

// ------------------------------- grids -------------------------------

export function emptyGrid(w: number, h: number, start: number, goal: number): Grid {
  const cells: Cell[] = Array.from({ length: w * h }, () => ({ wall: false, weight: 1 }));
  return { w, h, cells, start, goal };
}

/** The P4 boss maze: a revealed grid with wall baffles. Tuned so a plain flood
    (BFS/Dijkstra) blows the visited-node budget while an informed A* (hw≈1)
    squeaks under it — the lesson of the heuristic. Verified in test-ch17.ts. */
export function bossMaze(): { grid: Grid; budget: number } {
  const w = 15;
  const h = 11;
  const start = idx(1, 5, w);
  const goal = idx(13, 5, w);
  const g = emptyGrid(w, h, start, goal);
  // vertical baffles that force short detours but leave a corridor open
  const walls: [number, number][] = [
    [5, 0], [5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9], [5, 10],
    [9, 1], [9, 2], [9, 3], [9, 4], [9, 6], [9, 7], [9, 8], [9, 9],
  ];
  for (const [x, y] of walls) g.cells[idx(x, y, w)].wall = true;
  return { grid: g, budget: 70 };
}

export type BossOutcome = { won: boolean; found: boolean; visited: number; budget: number; optimal: boolean };

/** Boss check: the chosen algorithm+heuristic must REACH the goal AND expand no
    more than `budget` nodes. Winning runs also flag whether the route stayed
    hop-optimal, so the sim can praise a clean win vs. a lucky greedy dash. */
export function checkBoss(grid: Grid, algo: Algo, hw: number, budget: number): BossOutcome {
  const r = run(grid, algo, hw);
  const opt = bfs(grid);
  const optimal = r.found && opt.found && r.path.length === opt.path.length;
  return { won: r.found && r.order.length <= budget, found: r.found, visited: r.order.length, budget, optimal };
}
