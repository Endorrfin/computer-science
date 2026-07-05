// [HERO] growth-racer — the six complexity classes RACING on shared axes. The
// x-axis is input size n; the y-axis is the number of operations each algorithm
// actually performs (measured by instrumenting real code — see growth.ts, not
// plotted from a formula and hand-waved). A playhead sweeps n as the transport
// advances; at each n we read off every algorithm's live op count. The point
// lands the instant you flip the log-scale toggle: on a linear axis the fast
// curves are pinned to the floor and only n²/2ⁿ/n! are visible; on a log axis
// all six fan out into straight-ish lines whose SLOPES are the complexity — and
// the exponential/factorial ones shoot off the top almost immediately. Engine:
// growth-racer/growth. Reduced motion: Step advances n by one.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { GROWTH_ALGOS, curvePoints, growthAlgoById } from "./growth.ts";

const ACCENT = "#34D399";
const N_MIN = 1;
const N_MAX = 64; // slider ceiling — the visual race distance

// SVG plot box (viewBox units). Margins leave room for axis labels.
const W = 640;
const H = 340;
const PAD_L = 58;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

// Anything above this op count is "off the chart" — the curve is clamped to the
// top edge and flagged, so 2ⁿ/n! don't blow the axis to uselessness.
const OFF_CHART = 1e9;

export default function GrowthRacer() {
  const [nMax, setNMax] = useState(32); // axis extent (slider)
  const [pn, setPn] = useState(1); // playhead position = current n
  const [logScale, setLogScale] = useState(true);
  const [selId, setSelId] = useState("quadratic");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const selected = growthAlgoById(selId) ?? GROWTH_ALGOS[0];

  // Precompute each algorithm's plotted curve up to the current axis extent.
  const curves = useMemo(
    () => GROWTH_ALGOS.map((a) => ({ algo: a, pts: curvePoints(a.id, nMax) })),
    [nMax],
  );

  // Highest op value that is still ON the chart, used to scale the y-axis. We
  // cap at OFF_CHART so a single astronomical curve can't crush everything else.
  const yTop = useMemo(() => {
    let top = 1;
    for (const { pts } of curves)
      for (const p of pts) if (p.ops <= OFF_CHART && p.ops > top) top = p.ops;
    return top;
  }, [curves]);

  // advance the playhead one n per tick; stop at the axis extent
  useSimClock(running, 2 * speed, () => {
    setPn((x) => {
      if (x >= nMax) {
        setRunning(false);
        return nMax;
      }
      return x + 1;
    });
  });

  function restart() {
    setPn(N_MIN);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setPn((x) => Math.min(nMax, x + 1));
  }
  function onReset() {
    setRunning(false);
    setPn(N_MIN);
  }
  function pickNMax(v: number) {
    setNMax(v);
    setRunning(false);
    setPn((x) => Math.min(v, x));
  }

  // ---- coordinate mappers ----
  const x = (n: number): number => PAD_L + (PLOT_W * (n - N_MIN)) / Math.max(1, nMax - N_MIN);
  const yLin = (ops: number): number => PAD_T + PLOT_H - (PLOT_H * Math.min(ops, yTop)) / yTop;
  const yLog = (ops: number): number => {
    // log10 scale from 1 (bottom) to yTop (top); clamp ops≥1
    const v = Math.max(1, Math.min(ops, yTop));
    const frac = Math.log10(v) / Math.log10(Math.max(10, yTop));
    return PAD_T + PLOT_H - PLOT_H * frac;
  };
  const yOf = (ops: number): number => (logScale ? yLog(ops) : yLin(ops));

  // polyline for one algorithm's curve (points already sampled)
  const pathFor = (pts: { n: number; ops: number }[]): string =>
    pts
      .filter((p) => p.n <= nMax)
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.n).toFixed(1)} ${yOf(p.ops).toFixed(1)}`)
      .join(" ");

  // live op counts at the playhead, per algorithm (real instrumented numbers)
  const readouts = useMemo(
    () =>
      GROWTH_ALGOS.map((a) => {
        const ops = a.run(pn);
        return { algo: a, ops, off: ops > OFF_CHART };
      }),
    [pn],
  );

  // leader (fewest ops) and laggard (most) at the current n → the status line
  const sorted = [...readouts].sort((a, b) => a.ops - b.ops);
  const leader = sorted[0];
  const worst = sorted[sorted.length - 1];
  const spread = worst.ops / Math.max(1, leader.ops);

  const selReadout = readouts.find((r) => r.algo.id === selId)!;

  const fmt = (v: number): string => {
    if (v > OFF_CHART) return "off the chart";
    if (v >= 1e6) return v.toExponential(2);
    return Math.round(v).toLocaleString("en-US");
  };

  // y-axis gridlines: a few reference op counts
  const gridVals = useMemo(() => {
    if (logScale) {
      const out: number[] = [];
      for (let e = 0; Math.pow(10, e) <= yTop; e++) out.push(Math.pow(10, e));
      return out;
    }
    return [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yTop));
  }, [logScale, yTop]);

  return (
    <SimShell
      title="Growth racer — six complexity classes on one track"
      simKey="growth-racer"
      kind="hero"
      accent={ACCENT}
      transport={{
        running,
        onToggle: () => (running ? setRunning(false) : restart()),
        onStep,
        speed,
        onSpeed: setSpeed,
      }}
      onReset={onReset}
      status={`n = ${pn} of ${nMax}. Leader: ${leader.algo.bigO} at ${fmt(leader.ops)} ops. Worst: ${worst.algo.bigO} at ${fmt(worst.ops)} — a ${spread > OFF_CHART ? "runaway" : spread.toExponential(1) + "×"} spread. Scale: ${logScale ? "log" : "linear"}.`}
      controls={
        <div className="gr-ctl">
          <label className="ss-field">
            axis n = {nMax}
            <input
              type="range"
              min={4}
              max={N_MAX}
              value={nMax}
              onChange={(e) => pickNMax(Number(e.target.value))}
              aria-label="Maximum input size (axis extent)"
            />
          </label>
          <div className="bit-seg" role="group" aria-label="Y-axis scale">
            <button
              type="button"
              className={cx("bit-segbtn", !logScale && "on")}
              onClick={() => setLogScale(false)}
              aria-pressed={!logScale}
            >
              linear
            </button>
            <button
              type="button"
              className={cx("bit-segbtn", logScale && "on")}
              onClick={() => setLogScale(true)}
              aria-pressed={logScale}
            >
              log y
            </button>
          </div>
          <label className="ss-field">
            inspect
            <select value={selId} onChange={(e) => setSelId(e.target.value)} aria-label="Algorithm to inspect">
              {GROWTH_ALGOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.bigO}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      footer={
        <div className="gr-foot">
          <div className="gr-code">
            <div className="gr-code-head">
              <span className="gr-swatch" style={{ background: selected.color }} aria-hidden="true" />
              <b>{selected.name}</b> <code className="gr-bigo">{selected.bigO}</code>
              <span className="gr-measure">
                at n={pn}: <b>{fmt(selReadout.ops)}</b> ops
              </span>
            </div>
            <pre className="gr-snippet">
              <code>{selected.snippet}</code>
            </pre>
          </div>
          <div className="gr-legend" role="list" aria-label="Op counts at current n">
            {readouts.map((r) => (
              <button
                key={r.algo.id}
                type="button"
                role="listitem"
                className={cx("gr-legrow", r.algo.id === selId && "on")}
                onClick={() => setSelId(r.algo.id)}
                aria-pressed={r.algo.id === selId}
              >
                <span className="gr-swatch" style={{ background: r.algo.color }} aria-hidden="true" />
                <code className="gr-bigo">{r.algo.bigO}</code>
                <span className="gr-legname">{r.algo.name}</span>
                <span className={cx("gr-legops", r.off && "off")}>{fmt(r.ops)}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="gr-chart" role="img" aria-label={`Operation count versus input size, ${logScale ? "logarithmic" : "linear"} scale`}>
        {/* plot frame */}
        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="var(--surface)" stroke="var(--line)" strokeWidth="1" rx="4" />

        {/* y gridlines + labels */}
        {gridVals.map((v, i) => {
          const gy = yOf(v);
          if (gy < PAD_T - 0.5 || gy > PAD_T + PLOT_H + 0.5) return null;
          return (
            <g key={`gy${i}`}>
              <line x1={PAD_L} y1={gy} x2={PAD_L + PLOT_W} y2={gy} stroke="var(--line)" strokeWidth="0.75" strokeDasharray="2 4" />
              <text x={PAD_L - 6} y={gy + 3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--tx3)">
                {v >= 1e6 ? v.toExponential(0) : v.toLocaleString("en-US")}
              </text>
            </g>
          );
        })}

        {/* x gridlines + labels (a handful of n values) */}
        {Array.from({ length: 5 }, (_, i) => {
          const n = Math.round(N_MIN + ((nMax - N_MIN) * i) / 4);
          const gx = x(n);
          return (
            <g key={`gx${i}`}>
              <line x1={gx} y1={PAD_T} x2={gx} y2={PAD_T + PLOT_H} stroke="var(--line)" strokeWidth="0.75" strokeDasharray="2 4" />
              <text x={gx} y={PAD_T + PLOT_H + 16} textAnchor="middle" fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--tx3)">
                {n}
              </text>
            </g>
          );
        })}
        <text x={PAD_L + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--tx2)">
          input size n
        </text>
        <text x={14} y={PAD_T + PLOT_H / 2} textAnchor="middle" fontSize="10" fill="var(--tx2)" transform={`rotate(-90 14 ${PAD_T + PLOT_H / 2})`}>
          operations {logScale ? "(log)" : ""}
        </text>

        {/* the racing curves */}
        {curves.map(({ algo, pts }) => {
          const d = pathFor(pts);
          if (!d) return null;
          const dim = algo.id !== selId;
          return (
            <path
              key={algo.id}
              d={d}
              fill="none"
              stroke={algo.color}
              strokeWidth={dim ? 1.75 : 3}
              strokeOpacity={dim ? 0.55 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* playhead */}
        <line x1={x(pn)} y1={PAD_T} x2={x(pn)} y2={PAD_T + PLOT_H} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* dots + off-chart flags at the playhead for each algorithm */}
        {readouts.map((r) => {
          const cx0 = x(pn);
          const off = r.ops > OFF_CHART || (!logScale && r.ops > yTop);
          const cy = off ? PAD_T + 3 : yOf(r.ops);
          return (
            <g key={r.algo.id}>
              <circle cx={cx0} cy={cy} r={r.algo.id === selId ? 4.5 : 3} fill={r.algo.color} stroke="var(--surface)" strokeWidth="1" />
              {off && (
                <text x={cx0 + 6} y={PAD_T + 10} fontSize="8" fill={r.algo.color} fontFamily="var(--font-mono)">
                  ↑ off-chart
                </text>
              )}
            </g>
          );
        })}
        {/* current-n badge on the playhead */}
        <g>
          <rect x={x(pn) - 16} y={PAD_T + PLOT_H + 2} width="32" height="14" rx="3" fill="var(--accent)" />
          <text x={x(pn)} y={PAD_T + PLOT_H + 12} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--bg)" fontFamily="var(--font-mono)">
            n={pn}
          </text>
        </g>
      </svg>
    </SimShell>
  );
}
