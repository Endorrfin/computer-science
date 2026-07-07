// [HERO] pathfinder — one grid, four searches, and a boss. Paint walls and heavy
// terrain, pick BFS / DFS / Dijkstra / A*, then watch the frontier flood: BFS in
// even rings, DFS down one corridor, Dijkstra by cost, A* pulled toward the goal.
// The A* heuristic-weight slider MORPHS the search — hw=0 is Dijkstra (blind but
// optimal), hw=1 is admissible A* (optimal, informed), hw≫1 is greedy (fast, may
// miss the shortest path). Visited-count and path-cost update live so the
// trade-off is a number, not a claim. Boss mode loads the revealed maze and a
// visited-node budget: reach the goal under budget to earn Pathmaster. Reduced
// motion: Step reveals one expansion; the whole trace is precomputed in model.ts.
import { useEffect, useMemo, useRef, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import {
  bossMaze,
  emptyGrid,
  idx,
  run,
  xy,
  type Algo,
  type Grid,
} from "./model.ts";

const ACCENT = "#34D399";
const CELL = 30;
const W = 17;
const H = 11;
const START = idx(1, 5, W);
const GOAL = idx(15, 5, W);
const HEAVY = 6; // terrain weight painted by the "weight" tool

type Tool = "wall" | "weight" | "erase";

function freshGrid(): Grid {
  return emptyGrid(W, H, START, GOAL);
}

function randomMaze(): Grid {
  const g = freshGrid();
  for (let i = 0; i < g.cells.length; i++) {
    if (i === START || i === GOAL) continue;
    const r = Math.random();
    if (r < 0.24) g.cells[i].wall = true;
    else if (r < 0.32) g.cells[i].weight = HEAVY;
  }
  return g;
}

export default function Pathfinder() {
  const [grid, setGrid] = useState<Grid>(freshGrid);
  const [algo, setAlgo] = useState<Algo>("bfs");
  const [hw, setHw] = useState(1);
  const [tool, setTool] = useState<Tool>("wall");
  const [boss, setBoss] = useState(false);
  const [budget, setBudget] = useState(0);
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const painting = useRef<Tool | null>(null);

  const done = useChallengesDone();
  const bossWon = done.has("boss-p4");

  const result = useMemo(() => run(grid, algo, hw), [grid, algo, hw]);
  const len = result.order.length;
  const atEnd = i >= len;

  // stop the clock when the trace is fully revealed
  useSimClock(running, 16 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  // reveal sets for the current step
  const visited = useMemo(() => new Set(result.order.slice(0, i)), [result, i]);
  const frontier = useMemo(
    () => new Set(i === 0 ? [] : result.frontierAfter[i - 1] ?? []),
    [result, i],
  );
  const current = i > 0 ? result.order[i - 1] : -1;
  const pathSet = useMemo(
    () => (atEnd && result.found ? new Set(result.path) : new Set<number>()),
    [atEnd, result],
  );
  // hop-count of the true shortest route (for the boss "optimal" praise)
  const optimalHops = useMemo(() => (boss ? run(grid, "bfs", 0).path.length - 1 : 0), [boss, grid]);

  // boss: award the badge the moment a run finishes under budget
  useEffect(() => {
    if (!boss || !atEnd) return;
    if (result.found && len <= budget && budget > 0) markChallengeDone("boss-p4");
  }, [boss, atEnd, result, len, budget]);

  function reset(keepGrid: boolean): void {
    setRunning(false);
    setI(0);
    if (!keepGrid && !boss) setGrid(freshGrid());
  }
  function restart(): void {
    setI(0);
    setRunning(true);
  }
  function onStep(): void {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function paint(cell: number): void {
    if (boss || cell === START || cell === GOAL) return;
    setGrid((g) => {
      const cells = g.cells.slice();
      const c = { ...cells[cell] };
      if (tool === "wall") {
        c.wall = true;
        c.weight = 1;
      } else if (tool === "weight") {
        c.wall = false;
        c.weight = HEAVY;
      } else {
        c.wall = false;
        c.weight = 1;
      }
      cells[cell] = c;
      return { ...g, cells };
    });
    setRunning(false);
    setI(0);
  }
  function enterBoss(): void {
    const m = bossMaze();
    setGrid(m.grid);
    setBudget(m.budget);
    setBoss(true);
    setAlgo("astar");
    setHw(1);
    setRunning(false);
    setI(0);
  }
  function leaveBoss(): void {
    setBoss(false);
    setBudget(0);
    setGrid(freshGrid());
    setRunning(false);
    setI(0);
  }

  // ---- status line ----
  const costLabel =
    algo === "bfs" || algo === "dfs" ? `${result.cost} hops` : `cost ${result.cost}`;
  const verdict = result.found
    ? `reached the goal — path ${result.path.length - 1} hops, ${costLabel}, ${len} nodes expanded`
    : `no path — ${len} nodes expanded, goal unreachable`;
  const bossLine = boss
    ? result.found && len <= budget
      ? `✓ Pathmaster — ${len} ≤ budget ${budget}${result.path.length - 1 === optimalHops ? ", optimal route" : ""}`
      : result.found
        ? `over budget: ${len} expanded, limit ${budget} — try A* with a sharper heuristic`
        : `blocked — reach the goal within ${budget} expansions`
    : "";
  const status = boss
    ? `Boss · ${algoName(algo)}${algo === "astar" ? ` (h×${hw})` : ""} · ${atEnd ? bossLine : `expanding… ${i}/${len}`}`
    : !atEnd && i > 0
      ? `${algoName(algo)} · expanded ${i}/${len} · frontier ${frontier.size}`
      : atEnd
        ? `${algoName(algo)} · ${verdict}`
        : `${algoName(algo)}${algo === "astar" ? ` · heuristic ×${hw}` : ""} · paint the grid, then Play or Step`;

  return (
    <SimShell
      title="Pathfinder — BFS · DFS · Dijkstra · A* on a grid"
      simKey="pathfinder"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={() => reset(true)}
      status={status}
      controls={
        <div className="pf-ctl">
          <label className="ss-field">
            algorithm
            <select value={algo} onChange={(e) => { setAlgo(e.target.value as Algo); setRunning(false); setI(0); }} aria-label="Search algorithm">
              <option value="bfs">BFS (breadth-first)</option>
              <option value="dfs">DFS (depth-first)</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
            </select>
          </label>
          {algo === "astar" && (
            <label className="ss-field pf-slider">
              heuristic ×{hw}
              <input
                type="range"
                min={0}
                max={3}
                step={0.5}
                value={hw}
                onChange={(e) => { setHw(Number(e.target.value)); setRunning(false); setI(0); }}
                aria-label="A* heuristic weight (0 = Dijkstra, 1 = optimal, higher = greedy)"
              />
              <span className="pf-slider-ends" aria-hidden="true">Dijkstra · optimal · greedy</span>
            </label>
          )}
          {!boss && (
            <div className="bit-seg" role="group" aria-label="Paint tool">
              {(["wall", "weight", "erase"] as Tool[]).map((t) => (
                <button key={t} type="button" className={cx("bit-segbtn", tool === t && "on")} onClick={() => setTool(t)} aria-pressed={tool === t}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {!boss ? (
            <>
              <button type="button" className="btn" onClick={() => { setGrid(randomMaze()); setRunning(false); setI(0); }}>⤨ maze</button>
              <button type="button" className="btn" onClick={() => { setGrid(freshGrid()); setRunning(false); setI(0); }}>▢ clear</button>
              <button type="button" className={cx("btn", "pf-boss-btn")} onClick={enterBoss}>🧭 boss</button>
            </>
          ) : (
            <button type="button" className="btn" onClick={leaveBoss}>← exit boss</button>
          )}
        </div>
      }
      footer={
        <div className="pf-foot">
          <div className="pf-readout" role="status">
            <span className="pf-stat"><b>{visited.size}</b> visited</span>
            <span className="pf-stat"><b>{frontier.size}</b> frontier</span>
            <span className="pf-stat"><b>{result.found && atEnd ? result.path.length - 1 : "—"}</b> path hops</span>
            <span className="pf-stat"><b>{atEnd ? (result.found ? result.cost : "∞") : "—"}</b> cost</span>
            {boss && <span className={cx("pf-stat", "pf-budget", atEnd && result.found && len <= budget && "ok")}><b>{budget}</b> budget</span>}
          </div>
          <div className="pf-legend" aria-hidden="true">
            <span className="pf-leg"><i className="pf-sw pf-sw--visited" /> visited</span>
            <span className="pf-leg"><i className="pf-sw pf-sw--frontier" /> frontier</span>
            <span className="pf-leg"><i className="pf-sw pf-sw--path" /> path</span>
            <span className="pf-leg"><i className="pf-sw pf-sw--weight" /> heavy ×{HEAVY}</span>
            <span className="pf-leg"><i className="pf-sw pf-sw--wall" /> wall</span>
          </div>
          {boss && bossWon && <div className="pf-badge" role="status">🧭 <b>Pathmaster</b> earned — you beat the blind race.</div>}
        </div>
      }
    >
      <div className="pf-stage" onPointerUp={() => (painting.current = null)} onPointerLeave={() => (painting.current = null)}>
        <svg
          viewBox={`0 0 ${W * CELL} ${H * CELL}`}
          width="100%"
          role="img"
          aria-label={`Pathfinding grid, ${algoName(algo)}, ${visited.size} nodes visited`}
          className="pf-svg"
        >
          {grid.cells.map((c, ci) => {
            const p = xy(ci, W);
            const kind = classify(ci, c.wall, c.weight, current, pathSet, visited, frontier);
            return (
              <rect
                key={ci}
                x={p.x * CELL}
                y={p.y * CELL}
                width={CELL - 1}
                height={CELL - 1}
                rx={3}
                className={cx("pf-cell", `pf-cell--${kind}`)}
                onPointerDown={(e) => { e.preventDefault(); painting.current = tool; paint(ci); }}
                onPointerEnter={() => { if (painting.current) paint(ci); }}
              />
            );
          })}
          {/* heavy-terrain weight numerals */}
          {grid.cells.map((c, ci) =>
            c.weight > 1 && !c.wall ? (
              <text key={`w${ci}`} className="pf-weight" x={xy(ci, W).x * CELL + (CELL - 1) / 2} y={xy(ci, W).y * CELL + (CELL - 1) / 2 + 4} textAnchor="middle">{c.weight}</text>
            ) : null,
          )}
          {/* start & goal markers */}
          <text className="pf-marker" x={xy(START, W).x * CELL + (CELL - 1) / 2} y={xy(START, W).y * CELL + (CELL - 1) / 2 + 6} textAnchor="middle">◉</text>
          <text className="pf-marker pf-marker--goal" x={xy(GOAL, W).x * CELL + (CELL - 1) / 2} y={xy(GOAL, W).y * CELL + (CELL - 1) / 2 + 6} textAnchor="middle">★</text>
        </svg>
      </div>
    </SimShell>
  );
}

function algoName(a: Algo): string {
  return a === "bfs" ? "BFS" : a === "dfs" ? "DFS" : a === "dijkstra" ? "Dijkstra" : "A*";
}

type CellKind = "start" | "goal" | "wall" | "path" | "current" | "visited" | "frontier" | "weight" | "base";

function classify(
  i: number,
  wall: boolean,
  weight: number,
  current: number,
  path: Set<number>,
  visited: Set<number>,
  frontier: Set<number>,
): CellKind {
  if (i === START) return "start";
  if (i === GOAL) return "goal";
  if (wall) return "wall";
  if (path.has(i)) return "path";
  if (i === current) return "current";
  if (visited.has(i)) return "visited";
  if (frontier.has(i)) return "frontier";
  if (weight > 1) return "weight";
  return "base";
}
