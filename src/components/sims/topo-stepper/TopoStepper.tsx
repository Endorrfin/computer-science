// [micro] topo-stepper — Kahn's algorithm, one peel at a time. A node with
// in-degree 0 has no unmet prerequisites, so it can run now: remove it, decrement
// its successors, repeat. The peel order IS a valid topological order. Flip on
// "add cycle" (a back-edge F→A) and eventually every remaining node has a
// prerequisite still waiting — no node has in-degree 0, the algorithm is stuck,
// and that stall is exactly how Kahn's proves a graph has a cycle. Reduced
// motion: Step peels one node.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { addEdge, demoDag, inDegrees, topoSort } from "./model.ts";

const ACCENT = "#34D399";
const R = 18;
const POS: { x: number; y: number }[] = [
  { x: 70, y: 55 }, // A
  { x: 205, y: 40 }, // B
  { x: 205, y: 135 }, // C
  { x: 340, y: 90 }, // D
  { x: 70, y: 165 }, // E
  { x: 470, y: 150 }, // F
];

export default function TopoStepper() {
  const [cyclic, setCyclic] = useState(false);
  const graph = useMemo(() => (cyclic ? addEdge(demoDag(), 5, 0) : demoDag()), [cyclic]);
  const result = useMemo(() => topoSort(graph), [graph]);
  const initialIndeg = useMemo(() => inDegrees(graph), [graph]);
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const steps = result.steps;
  const len = steps.length;
  const atEnd = i >= len;

  useSimClock(running, 1.4 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  const removed = result.order.slice(0, i);
  const removedSet = new Set(removed);
  const indeg = i === 0 ? initialIndeg : steps[i - 1].indeg;
  const current = i > 0 ? result.order[i - 1] : -1;
  const ready = graph.labels.map((_l, n) => n).filter((n) => !removedSet.has(n) && indeg[n] === 0);
  const readySet = new Set(ready);

  const stuck = atEnd && !result.ok;
  const doneOk = atEnd && result.ok;

  function reset(): void { setRunning(false); setI(0); }
  function toggleCycle(): void { setCyclic((c) => !c); setRunning(false); setI(0); }

  const status = stuck
    ? `Stuck — no node has in-degree 0, but ${result.stuck.length} remain (${result.stuck.map((n) => graph.labels[n]).join(", ")}). That stall proves a cycle.`
    : doneOk
      ? `Topological order: ${result.order.map((n) => graph.labels[n]).join(" → ")}. Every edge points forward.`
      : i === 0
        ? `${cyclic ? "Cyclic graph" : "DAG"} · ${ready.length} node(s) ready (in-degree 0). Play or Step to peel.`
        : `Peeled ${graph.labels[current]} · order so far: ${removed.map((n) => graph.labels[n]).join(", ")}`;

  return (
    <SimShell
      title="Topological sort — peel the in-degree-0 nodes (Kahn's algorithm)"
      simKey="topo-stepper"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : (setI(0), setRunning(true))), onStep: () => { setRunning(false); setI((x) => Math.min(len, x + 1)); }, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <div className="topo-ctl">
          <button type="button" className={cx("btn", cyclic && "on")} onClick={toggleCycle} aria-pressed={cyclic}>
            {cyclic ? "✓ cycle (F→A)" : "add cycle (F→A)"}
          </button>
        </div>
      }
      footer={
        <div className="topo-foot">
          <div className="topo-order" role="status">
            <span className="topo-order-lbl">order</span>
            {result.order.slice(0, i).map((n, k) => (
              <span key={k} className="topo-pill">{graph.labels[n]}</span>
            ))}
            {i === 0 && <span className="repr-dim">— nothing peeled yet</span>}
            {stuck && <span className="topo-stuck-tag">⟳ cycle — {result.stuck.map((n) => graph.labels[n]).join(", ")} trapped</span>}
          </div>
          <div className="topo-legend" aria-hidden="true">
            <span className="topo-leg"><i className="topo-sw topo-sw--ready" /> in-degree 0 (ready)</span>
            <span className="topo-leg"><i className="topo-sw topo-sw--done" /> peeled</span>
            <span className="topo-leg"><i className="topo-sw topo-sw--wait" /> waiting</span>
          </div>
        </div>
      }
    >
      <div className="topo-stage">
        <svg viewBox="0 0 540 220" width="100%" role="img" aria-label="Dependency graph being topologically sorted" className="topo-svg">
          <defs>
            <marker id="topo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tx3)" />
            </marker>
          </defs>
          {graph.edges.map(([a, b], k) => {
            const pa = POS[a];
            const pb = POS[b];
            const dx = pb.x - pa.x;
            const dy = pb.y - pa.y;
            const d = Math.hypot(dx, dy) || 1;
            const ux = dx / d;
            const uy = dy / d;
            const dim = removedSet.has(a);
            return (
              <line
                key={k}
                x1={pa.x + ux * R}
                y1={pa.y + uy * R}
                x2={pb.x - ux * (R + 4)}
                y2={pb.y - uy * (R + 4)}
                className={cx("topo-edge", dim && "dim")}
                markerEnd="url(#topo-arrow)"
              />
            );
          })}
          {graph.labels.map((l, n) => {
            const p = POS[n];
            const state = removedSet.has(n) ? "done" : readySet.has(n) ? "ready" : "wait";
            return (
              <g key={n} className={cx("topo-node", `is-${state}`, n === current && "is-current")}>
                <circle cx={p.x} cy={p.y} r={R} />
                <text x={p.x} y={p.y + 5} textAnchor="middle" className="topo-label">{l}</text>
                {!removedSet.has(n) && (
                  <g>
                    <circle cx={p.x + R - 2} cy={p.y - R + 2} r={9} className="topo-indeg-bg" />
                    <text x={p.x + R - 2} y={p.y - R + 5} textAnchor="middle" className="topo-indeg">{indeg[n]}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </SimShell>
  );
}
