// [HERO] scheduler-sim — ch.22 "Processes & scheduling". Edit a process table
// (arrival / burst / priority), pick a policy (FCFS … MLFQ), and watch the Gantt
// chart fill in live along a time axis while the waiting / turnaround / response
// numbers settle. The context-switch slider makes "overhead eats throughput"
// visible. This is a thin skin over ./model.ts — every number comes straight from
// simulate(); nothing is recomputed here. Transport + reveal mirror cache-sim.
import { useEffect, useMemo, useState } from "react";
import { clamp, cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { ALGO_LABEL, ALGOS, demoProcs, simulate, usesPriority } from "./model.ts";
import type { Algo, Proc, Segment, SchedConfig } from "./model.ts";
import "../../../theme/_p6css/scheduler-sim.css";

const ACCENT = "#22d3ee";

// ~6 distinct hues for per-process bars (cyan / green / purple / amber / pink /
// blue). Assigned by a process's index in the current table, so a given row
// keeps its color as the workload plays.
const PROC_HUES = [
  "#22d3ee",
  "#4ade80",
  "#a78bfa",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
] as const;
const hueFor = (idx: number): string => PROC_HUES[((idx % PROC_HUES.length) + PROC_HUES.length) % PROC_HUES.length];

type Preset = { id: string; label: string; procs: () => Proc[] };
const PRESETS: readonly Preset[] = [
  {
    id: "convoy",
    label: "Convoy",
    procs: () => [
      { id: "P1", arrival: 0, burst: 20, priority: 1 },
      { id: "P2", arrival: 0, burst: 2, priority: 1 },
      { id: "P3", arrival: 0, burst: 2, priority: 1 },
    ],
  },
  { id: "mixed", label: "Mixed arrivals", procs: () => demoProcs() },
  {
    id: "rr",
    label: "RR quantum",
    procs: () => [
      { id: "P1", arrival: 0, burst: 6, priority: 2 },
      { id: "P2", arrival: 0, burst: 6, priority: 1 },
      { id: "P3", arrival: 0, burst: 6, priority: 3 },
    ],
  },
];

// SVG Gantt geometry.
const AXIS_H = 18; // space under the bar for tick labels
const BAR_H = 46;
const BAR_TOP = 6;
const PAD_X = 8;
const MIN_TICK_PX = 34; // don't crowd the axis with labels

export default function SchedulerSim() {
  const reduced = useReducedMotion();

  const [procs, setProcs] = useState<Proc[]>(() => demoProcs());
  const [algo, setAlgo] = useState<Algo>("fcfs");
  const [quantum, setQuantum] = useState(3);
  const [contextSwitch, setContextSwitch] = useState(0);
  const [aging, setAging] = useState(false);

  const [t, setT] = useState(0); // reveal cursor, in ticks
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const cfg = useMemo<SchedConfig>(
    () => ({ algo, quantum, contextSwitch, aging }),
    [algo, quantum, contextSwitch, aging],
  );
  const result = useMemo(() => simulate(procs, cfg), [procs, cfg]);
  const makespan = result.makespan;
  const showPriority = usesPriority(algo);

  // A stable index per process id → its color, from the current table order.
  const colorOf = useMemo(() => {
    const m = new Map<string, string>();
    procs.forEach((p, i) => m.set(p.id, hueFor(i)));
    return m;
  }, [procs]);

  // Any change to the workload or policy restarts the reveal from t=0.
  useEffect(() => {
    setRunning(false);
    setT(0);
  }, [procs, cfg]);

  // Clamp the cursor if the makespan shrinks under us.
  useEffect(() => {
    setT((x) => clamp(x, 0, makespan));
  }, [makespan]);

  // Play loop: ~4 ticks/sec at 1× (a beat you can read), scaled by speed.
  useEffect(() => {
    if (!running) return;
    const tps = 4 * speed;
    const ms = Math.max(16, 1000 / tps);
    const id = window.setInterval(() => {
      setT((x) => {
        if (x >= makespan) {
          setRunning(false);
          return makespan;
        }
        return x + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [running, speed, makespan]);

  function onToggle() {
    if (running) {
      setRunning(false);
      return;
    }
    setT((x) => (x >= makespan ? 0 : x)); // replay from the start if finished
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setT((x) => clamp(x + 1, 0, makespan));
  }
  function onReset() {
    setRunning(false);
    setT(0);
  }

  // ---- process table editing ----
  function patchProc(idx: number, field: keyof Proc, value: number) {
    setProcs((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function addProc() {
    setProcs((rows) => {
      const used = new Set(rows.map((r) => r.id));
      let n = rows.length + 1;
      while (used.has(`P${n}`)) n++;
      return [...rows, { id: `P${n}`, arrival: 0, burst: 4, priority: rows.length + 1 }];
    });
  }
  function removeProc(idx: number) {
    setProcs((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));
  }
  function loadPreset(p: Preset) {
    setProcs(p.procs());
  }

  const status = `t=${t} / ${makespan} · avg wait ${result.avgWaiting} · util ${Math.round(result.utilization * 100)}%`;
  const revealed = `${result.timeline.filter((s) => s.start < t).length}/${result.timeline.length}`;
  const ganttSummary =
    `Gantt timeline for ${ALGO_LABEL[algo].split(" — ")[0]}: ${result.timeline.length} segments over ` +
    `${makespan} ticks, ${result.csCount} context switches. Revealed ${revealed}.`;

  return (
    <SimShell
      title="CPU scheduler — watch the Gantt fill"
      simKey="scheduler-sim"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="sch-ctl">
          <label className="ss-field">
            algorithm
            <select value={algo} onChange={(e) => setAlgo(e.target.value as Algo)} aria-label="Scheduling algorithm">
              {ALGOS.map((a) => (
                <option key={a} value={a}>
                  {ALGO_LABEL[a]}
                </option>
              ))}
            </select>
          </label>

          {(algo === "rr" || algo === "mlfq") && (
            <label className="ss-field">
              quantum
              <input
                className="sch-slider"
                type="range"
                min={1}
                max={8}
                step={1}
                value={quantum}
                onChange={(e) => setQuantum(Number(e.target.value))}
                aria-label="Time quantum"
              />
              <span className="sch-numval">{quantum}</span>
            </label>
          )}

          <label className="ss-field">
            switch cost
            <input
              className="sch-slider"
              type="range"
              min={0}
              max={4}
              step={1}
              value={contextSwitch}
              onChange={(e) => setContextSwitch(Number(e.target.value))}
              aria-label="Context-switch cost in ticks"
            />
            <span className="sch-numval">{contextSwitch}</span>
          </label>

          {showPriority && (
            <label className="sch-toggle ss-field">
              <input
                type="checkbox"
                checked={aging}
                onChange={(e) => setAging(e.target.checked)}
                aria-label="Priority aging"
              />
              aging
            </label>
          )}
        </div>
      }
      footer={
        <StatsPanel
          result={result}
          showPriority={showPriority}
          colorOf={colorOf}
          utilizationPct={Math.round(result.utilization * 100)}
        />
      }
    >
      <div className="sch-stage">
        <div className="sch-presets" role="group" aria-label="Preset workloads">
          <span className="sch-preset-lbl">presets</span>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="sch-preset" onClick={() => loadPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>

        <ProcessEditor
          procs={procs}
          showPriority={showPriority}
          colorOf={colorOf}
          onPatch={patchProc}
          onAdd={addProc}
          onRemove={removeProc}
        />

        <Gantt
          timeline={result.timeline}
          makespan={makespan}
          t={t}
          colorOf={colorOf}
          summary={ganttSummary}
          reduced={reduced}
        />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// Process table editor.
// ---------------------------------------------------------------------------
function ProcessEditor({
  procs,
  showPriority,
  colorOf,
  onPatch,
  onAdd,
  onRemove,
}: {
  procs: Proc[];
  showPriority: boolean;
  colorOf: Map<string, string>;
  onPatch: (idx: number, field: keyof Proc, value: number) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="sch-panel">
      <div className="sch-panel-head">
        <span className="sch-panel-title">processes</span>
        <span className="sch-panel-title" style={{ color: "var(--tx3)" }}>
          {procs.length} {procs.length === 1 ? "job" : "jobs"}
        </span>
      </div>
      <div className="sch-proc-table" role="table" aria-label="Process table editor">
        <div className="sch-proc-row sch-proc-head" role="row">
          <span role="columnheader" aria-hidden="true" />
          <span role="columnheader">id</span>
          <span role="columnheader">arrival</span>
          <span role="columnheader">burst</span>
          <span role="columnheader">{showPriority ? "priority" : "prio."}</span>
          <span role="columnheader" aria-hidden="true" />
        </div>
        {procs.map((p, i) => (
          <div className="sch-proc-row" role="row" key={p.id}>
            <span
              className="sch-swatch"
              style={{ background: colorOf.get(p.id) ?? "var(--tx3)" }}
              aria-hidden="true"
            />
            <input
              className="sch-num"
              value={p.id}
              disabled
              readOnly
              aria-label={`Process ${p.id} id`}
              style={{ textAlign: "center", color: "var(--tx2)" }}
            />
            <input
              className="sch-num"
              type="number"
              min={0}
              value={p.arrival}
              onChange={(e) => onPatch(i, "arrival", clampInt(e.target.value, 0))}
              aria-label={`${p.id} arrival time`}
            />
            <input
              className="sch-num"
              type="number"
              min={1}
              value={p.burst}
              onChange={(e) => onPatch(i, "burst", clampInt(e.target.value, 1))}
              aria-label={`${p.id} burst length`}
            />
            <input
              className="sch-num"
              type="number"
              min={0}
              value={p.priority}
              onChange={(e) => onPatch(i, "priority", clampInt(e.target.value, 0))}
              aria-label={`${p.id} priority (lower is higher)`}
              style={showPriority ? undefined : { opacity: 0.55 }}
            />
            <button
              type="button"
              className="sch-iconbtn"
              onClick={() => onRemove(i)}
              disabled={procs.length <= 1}
              aria-label={`Remove ${p.id}`}
              title={procs.length <= 1 ? "Keep at least one process" : `Remove ${p.id}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="sch-addbtn" onClick={onAdd}>
        + add process
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gantt chart — single lane, revealed up to the cursor t.
// ---------------------------------------------------------------------------
function Gantt({
  timeline,
  makespan,
  t,
  colorOf,
  summary,
  reduced,
}: {
  timeline: Segment[];
  makespan: number;
  t: number;
  colorOf: Map<string, string>;
  summary: string;
  reduced: boolean;
}) {
  const span = Math.max(1, makespan);
  const width = 640;
  const inner = width - PAD_X * 2;
  const scale = inner / span;
  const height = BAR_TOP + BAR_H + AXIS_H;
  const x = (tick: number) => PAD_X + tick * scale;

  // Integer ticks, thinned so labels never crowd.
  const tickEvery = Math.max(1, Math.ceil(MIN_TICK_PX / scale));
  const ticks: number[] = [];
  for (let i = 0; i <= span; i += tickEvery) ticks.push(i);
  if (ticks[ticks.length - 1] !== span) ticks.push(span);

  const fill = (seg: Segment): string => {
    if (seg.kind === "idle") return "var(--surface)";
    if (seg.kind === "cs") return "var(--sem-control)";
    return colorOf.get(seg.pid ?? "") ?? "var(--tx3)";
  };
  // Which segment holds the CPU at the reveal edge (t-1 is the last shown tick)?
  const headStart = timeline.reduce<number>((best, s) => (s.start < t && s.start >= best ? s.start : best), -1);

  return (
    <div className="sch-gantt">
      <svg
        className="sch-gantt-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* baseline track */}
        <rect
          x={PAD_X}
          y={BAR_TOP}
          width={inner}
          height={BAR_H}
          rx={6}
          fill="var(--bg)"
          stroke="var(--line)"
          strokeWidth={1}
        />

        {timeline.map((seg, idx) => {
          const x0 = x(seg.start);
          const x1 = x(seg.end);
          const w = Math.max(0, x1 - x0);
          const before = seg.end <= t; // fully in the past → solid
          const started = seg.start < t; // partially revealed
          const revealFrac = before ? 1 : started ? (t - seg.start) / (seg.end - seg.start) : 0;
          const revealedW = w * clamp(revealFrac, 0, 1);
          const color = fill(seg);
          const isHead = seg.start === headStart && started;
          const wide = revealedW > 20 && seg.kind === "run";
          const isHatch = seg.kind === "cs";
          return (
            <g key={idx} className={cx("sch-seg", isHead && !reduced && "is-head")} style={{ color }}>
              {/* faint full extent so the whole schedule is legible before reveal */}
              <rect
                x={x0}
                y={BAR_TOP}
                width={w}
                height={BAR_H}
                rx={4}
                fill={color}
                opacity={seg.kind === "idle" ? 0.18 : 0.14}
              />
              {/* the revealed portion, drawn on top */}
              {revealedW > 0.5 && (
                <rect
                  className="sch-seg-rect"
                  x={x0}
                  y={BAR_TOP}
                  width={revealedW}
                  height={BAR_H}
                  rx={4}
                  fill={isHatch ? "url(#sch-hatch)" : color}
                  stroke={color}
                  strokeWidth={seg.kind === "idle" ? 0 : 1}
                  opacity={seg.kind === "idle" ? 0.35 : 0.95}
                />
              )}
              {wide && (
                <text
                  className="sch-seg-lbl"
                  x={x0 + w / 2}
                  y={BAR_TOP + BAR_H / 2 + 4}
                  textAnchor="middle"
                  style={{ fill: seg.kind === "run" ? "var(--bg)" : "var(--tx)" }}
                >
                  {seg.pid}
                </text>
              )}
            </g>
          );
        })}

        {/* reveal cursor */}
        {t > 0 && t < makespan && (
          <line
            className="sch-cursor"
            x1={x(t)}
            y1={BAR_TOP - 3}
            x2={x(t)}
            y2={BAR_TOP + BAR_H + 3}
            stroke="var(--accent)"
            strokeWidth={2}
          />
        )}

        {/* time axis ticks + labels */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line className="sch-tick" x1={x(tk)} y1={BAR_TOP + BAR_H} x2={x(tk)} y2={BAR_TOP + BAR_H + 5} />
            <text className="sch-tick-lbl" x={x(tk)} y={BAR_TOP + BAR_H + AXIS_H - 3} textAnchor="middle">
              {tk}
            </text>
          </g>
        ))}

        <defs>
          <pattern id="sch-hatch" width={6} height={6} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width={6} height={6} fill="var(--sem-control)" opacity={0.28} />
            <line x1={0} y1={0} x2={0} y2={6} stroke="var(--sem-control)" strokeWidth={3} />
          </pattern>
        </defs>
      </svg>

      <div className="sch-legend" aria-hidden="true">
        <span className="sch-legend-item">
          <span className="sch-legend-chip is-cs" />
          context switch
        </span>
        <span className="sch-legend-item">
          <span className="sch-legend-chip" style={{ background: "var(--surface)", border: "1px solid var(--line)" }} />
          idle
        </span>
        <span className="sch-legend-item" style={{ color: "var(--tx3)" }}>
          faint = not yet reached
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-process stats + summary. Numbers are read straight from the engine.
// ---------------------------------------------------------------------------
function StatsPanel({
  result,
  showPriority,
  colorOf,
  utilizationPct,
}: {
  result: ReturnType<typeof simulate>;
  showPriority: boolean;
  colorOf: Map<string, string>;
  utilizationPct: number;
}) {
  // total columns in the table; the summary labels span all but the last 3,
  // so their value cells line up under turnaround / waiting / response.
  const totalCols = showPriority ? 9 : 8;
  const labelSpan = totalCols - 3;
  return (
    <div className="sch-stats">
      <table>
        <caption>per-process results</caption>
        <thead>
          <tr>
            <th className="sch-cell-id" scope="col">
              id
            </th>
            <th scope="col">arrival</th>
            <th scope="col">burst</th>
            {showPriority && <th scope="col">priority</th>}
            <th scope="col">start</th>
            <th scope="col">completion</th>
            <th scope="col">turnaround</th>
            <th scope="col">waiting</th>
            <th scope="col">response</th>
          </tr>
        </thead>
        <tbody>
          {result.stats.map((s) => (
            <tr key={s.id}>
              <td className="sch-cell-id">
                <span
                  className="sch-swatch"
                  style={{ background: colorOf.get(s.id) ?? "var(--tx3)" }}
                  aria-hidden="true"
                />
                {s.id}
              </td>
              <td>{s.arrival}</td>
              <td>{s.burst}</td>
              {showPriority && <td>{s.priority}</td>}
              <td>{s.start}</td>
              <td>{s.completion}</td>
              <td>{s.turnaround}</td>
              <td className="sch-stat-strong">{s.waiting}</td>
              <td>{s.response}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="sch-summary-lbl" colSpan={labelSpan}>
              averages
            </td>
            <td>
              <span style={{ color: "var(--tx3)" }}>turn </span>
              <span className="sch-stat-strong">{result.avgTurnaround}</span>
            </td>
            <td>
              <span style={{ color: "var(--tx3)" }}>wait </span>
              <span className="sch-stat-strong" style={{ color: "var(--sem-ok)" }}>
                {result.avgWaiting}
              </span>
            </td>
            <td>
              <span style={{ color: "var(--tx3)" }}>resp </span>
              <span className="sch-stat-strong">{result.avgResponse}</span>
            </td>
          </tr>
          <tr>
            <td className="sch-summary-lbl" colSpan={labelSpan}>
              throughput
            </td>
            <td colSpan={3} style={{ textAlign: "right" }}>
              <span style={{ color: "var(--tx3)" }}>makespan </span>
              <span className="sch-stat-strong">{result.makespan}</span>
              <span style={{ color: "var(--tx3)" }}> · util </span>
              <span className="sch-stat-strong" style={{ color: "var(--accent)" }}>
                {utilizationPct}%
              </span>
              <span style={{ color: "var(--tx3)" }}> · switches </span>
              <span className="sch-stat-strong">{result.csCount}</span>
              <span style={{ color: "var(--tx3)" }}> · ticks lost </span>
              <span className="sch-stat-strong" style={{ color: result.csTicks > 0 ? "var(--sem-control)" : "var(--tx2)" }}>
                {result.csTicks}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------
function clampInt(raw: string, min: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, n);
}
