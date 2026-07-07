// Engine truth-tests for ch.17 (Graphs): the pathfinder HERO (BFS/DFS/Dijkstra/
// A* on a shared grid), the repr-switcher cost model, and the topo-stepper
// (Kahn's algorithm). Same Node harness as test-ch16; CI-gated. These lock the
// claims the chapter and the HERO make:
//   • BFS is shortest by HOPS; on unit weights it equals Dijkstra's cost.
//   • Dijkstra and admissible A* (hw=1) return the SAME cost on weighted terrain,
//     and A* expands no more nodes than Dijkstra (usually fewer).
//   • hw=0 makes A* behave EXACTLY like Dijkstra (same expansion order).
//   • DFS is not shortest; walls make a goal unreachable.
//   • the P4 boss maze is a real challenge: BFS blows the budget, A*(1) beats it.
//   • adjacency matrix vs list op-costs; Kahn topo-order + cycle detection.

import {
  bossMaze,
  checkBoss,
  emptyGrid,
  idx,
  run,
  weightedCost,
} from "../src/components/sims/pathfinder/model.ts";
import type { Grid } from "../src/components/sims/pathfinder/model.ts";
import {
  degree,
  demoGraph,
  edgeCount,
  edgeTestCostList,
  edgeTestCostMatrix,
  listSpace,
  matrixSpace,
  neighborsCostList,
  neighborsCostMatrix,
  toMatrix,
} from "../src/components/sims/repr-switcher/model.ts";
import {
  addEdge,
  demoDag,
  isValidTopoOrder,
  topoSort,
} from "../src/components/sims/topo-stepper/model.ts";

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

// A 7×7 open grid, start top-left, goal bottom-right (Manhattan distance 12).
function openGrid(): Grid {
  const w = 7;
  const h = 7;
  return emptyGrid(w, h, idx(0, 0, w), idx(6, 6, w));
}

// ================= (A) pathfinder — BFS shortest by hops =================
{
  console.log("pathfinder · BFS is hop-optimal:");
  const g = openGrid();
  const bfs = run(g, "bfs", 0);
  ok("BFS reaches the goal", bfs.found);
  eq("BFS path length = Manhattan distance + 1 nodes", bfs.path.length, 13); // 12 hops
  eq("BFS cost = 12 hops", bfs.cost, 12);
  // On unit weights, Dijkstra's cost equals BFS's hop count.
  const dij = run(g, "dijkstra", 0);
  eq("Dijkstra cost = BFS cost on unit weights", dij.cost, bfs.cost);
}

// ============ (B) weighted terrain — Dijkstra == A*(1), both optimal ============
{
  console.log("pathfinder · weighted terrain, Dijkstra == admissible A*:");
  // A straight row is cheap; put heavy terrain in the middle of the direct line
  // so the optimal route must weave. 9×3 grid.
  const w = 9;
  const h = 3;
  const g = emptyGrid(w, h, idx(0, 1, w), idx(8, 1, w));
  for (let x = 2; x <= 6; x++) g.cells[idx(x, 1, w)].weight = 9; // heavy middle row
  const dij = run(g, "dijkstra", 0);
  const astar = run(g, "astar", 1);
  ok("Dijkstra finds a path", dij.found);
  ok("A* finds a path", astar.found);
  eq("Dijkstra and A*(hw=1) agree on cost", astar.cost, dij.cost);
  // both routes are genuinely optimal ⇒ their weighted costs match too
  eq("A* route weighted cost == its reported cost", weightedCost(g, astar.path), astar.cost);
  ok("optimal route avoids the heavy middle (cost < straight 8×9)", dij.cost < 8 * 9);
  // A* never expands MORE than Dijkstra (admissible + consistent heuristic)
  ok(
    `A*(1) expands ≤ Dijkstra (${astar.order.length} ≤ ${dij.order.length})`,
    astar.order.length <= dij.order.length,
  );
}

// ============ (C) A* morphs: hw=0 IS Dijkstra; hw≫1 stays valid ============
{
  console.log("pathfinder · the heuristic-weight morph:");
  const g = openGrid();
  const dij = run(g, "dijkstra", 0);
  const astar0 = run(g, "astar", 0);
  eq("A*(hw=0) expansion order == Dijkstra", astar0.order, dij.order);
  const astar1 = run(g, "astar", 1);
  ok(
    `informed A*(1) expands fewer than blind Dijkstra on open ground (${astar1.order.length} < ${dij.order.length})`,
    astar1.order.length < dij.order.length,
  );
  // greedy-ish weighting still reaches the goal (may not be optimal, that's the point)
  const greedy = run(g, "astar", 5);
  ok("greedy-weighted A* still reaches the goal", greedy.found);
  ok("greedy expands ≤ admissible A* on open ground", greedy.order.length <= astar1.order.length);
}

// ================= (D) DFS not shortest · walls block =================
{
  console.log("pathfinder · DFS is not shortest; walls block:");
  const g = openGrid();
  const bfsO = run(g, "bfs", 0);
  const dfsO = run(g, "dfs", 0);
  ok("DFS reaches the goal", dfsO.found);
  ok(
    `DFS ≥ BFS in hops on open ground (${dfsO.cost} ≥ ${bfsO.cost})`,
    dfsO.cost >= bfsO.cost,
  );
  // adversarial maze: from S the high-priority (right) branch is a long snake to
  // the goal, while a 2-hop route sits just below — DFS commits to the long one.
  const tw = 4;
  const trap = emptyGrid(tw, 3, idx(0, 0, tw), idx(0, 2, tw));
  trap.cells[idx(1, 1, tw)].wall = true;
  trap.cells[idx(2, 1, tw)].wall = true;
  const bfsT = run(trap, "bfs", 0);
  const dfsT = run(trap, "dfs", 0);
  eq("BFS takes the 2-hop short route", bfsT.cost, 2);
  ok(`DFS is dragged the long way (${dfsT.cost} > ${bfsT.cost})`, dfsT.cost > bfsT.cost);
  // wall the goal off completely → unreachable for every algorithm
  const w = 7;
  const walled = openGrid();
  for (const n of [idx(5, 6, w), idx(6, 5, w)]) walled.cells[n].wall = true;
  for (const a of ["bfs", "dfs", "dijkstra", "astar"] as const) {
    const r = run(walled, a, 1);
    ok(`${a}: walled-off goal is unreachable`, !r.found && r.path.length === 0);
  }
}

// ================= (E) determinism =================
{
  console.log("pathfinder · determinism:");
  const g = openGrid();
  const a = run(g, "astar", 1);
  const b = run(g, "astar", 1);
  eq("repeat A* run gives identical expansion order", a.order, b.order);
}

// ================= (F) the P4 boss maze is a real challenge =================
{
  console.log("pathfinder · P4 boss maze (Pathmaster):");
  const { grid, budget } = bossMaze();
  const bfs = run(grid, "bfs", 0);
  const astar = run(grid, "astar", 1);
  ok("boss maze is solvable", bfs.found && astar.found);
  ok(`blind BFS blows the budget (${bfs.order.length} > ${budget})`, bfs.order.length > budget);
  ok(`admissible A* beats the budget (${astar.order.length} ≤ ${budget})`, astar.order.length <= budget);
  const winA = checkBoss(grid, "astar", 1, budget);
  ok("checkBoss: A*(1) wins and stays optimal", winA.won && winA.optimal);
  const loseB = checkBoss(grid, "bfs", 0, budget);
  ok("checkBoss: BFS loses (over budget)", !loseB.won);
}

// ================= (G) repr-switcher — matrix vs list op-costs =================
{
  console.log("repr-switcher · matrix vs list costs:");
  const g = demoGraph();
  eq("edge count", edgeCount(g), 7);
  eq("matrix space = V²", matrixSpace(g), 36);
  eq("list space = V + E", listSpace(g), 13);
  eq("matrix edge test is O(1)", edgeTestCostMatrix(), 1);
  // A→C present at position 2 in [B,C] ⇒ list scan costs 2; matrix costs 1
  eq("list edge test A→C scans to position 2", edgeTestCostList(g, 0, 2), 2);
  eq("list edge test A→D (absent) scans whole list", edgeTestCostList(g, 0, 3), degree(g, 0));
  eq("matrix neighbours scans the whole row (V)", neighborsCostMatrix(g), 6);
  eq("list neighbours reads exactly deg(A)", neighborsCostList(g, 0), 2);
  const m = toMatrix(g);
  eq("matrix cell A→B set", m[0][1], 1);
  eq("matrix cell A→D clear", m[0][3], 0);
}

// ================= (H) topo-stepper — Kahn order + cycle detection =================
{
  console.log("topo-stepper · Kahn's algorithm:");
  const dag = demoDag();
  const r = topoSort(dag);
  ok("DAG topo-sorts completely", r.ok);
  eq("deterministic peel order A,B,C,D,E,F", r.order, [0, 1, 2, 3, 4, 5]);
  ok("order respects every edge", isValidTopoOrder(dag, r.order));
  ok("a scrambled order is rejected", !isValidTopoOrder(dag, [5, 4, 3, 2, 1, 0]));
  // introduce a back-edge F→A → cycle → Kahn gets stuck
  const cyclic = addEdge(dag, 5, 0);
  const c = topoSort(cyclic);
  ok("cycle blocks completion (ok=false)", !c.ok);
  ok("stuck set is non-empty and traps A", c.stuck.length > 0 && c.stuck.includes(0));
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch17: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch17: all checks pass");
