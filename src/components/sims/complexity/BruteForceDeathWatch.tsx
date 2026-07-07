// [micro] brute-force-death-watch — grow n, watch the runtime explode. Pick a
// problem (linear scan, all-pairs, subset-sum, travelling-salesman), a machine
// (a phone … every computer on Earth), and slide n from 1 to 40. The readout is
// the raw operation count and the honest wall-clock at that rate; the bars put
// n, n², 2ⁿ and n! side by side on a log scale so the gap between "tractable" and
// "astronomical" is a picture, not a claim. Nothing is solved here — the engine
// (./model.ts) only counts and converts. Purely reactive: no transport.
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { clamp, cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import {
  bruteForceTourCount,
  factorial,
  pow2,
  timeAtRate,
  universeMultiple,
  work,
} from "./model.ts";
import type { Growth } from "./model.ts";
import "../../../theme/_p5css/brute-force-death-watch.css";

const ACCENT = "#2DD4BF";
const SECONDS_PER_YEAR = 31_557_600; // matches the engine's Julian year
const AGE_OF_UNIVERSE_YEARS = 1.38e10;

type Problem = {
  id: Growth;
  label: string; // menu text, e.g. "subset-sum, try every subset — O(2ⁿ)"
  short: string; // death-watch subject, e.g. "subset-sum"
  color: string; // CSS var for the matching bar / accents
};

const PROBLEMS: readonly Problem[] = [
  { id: "linear", label: "linear scan — O(n)", short: "linear scan", color: "var(--sem-data)" },
  { id: "quadratic", label: "compare all pairs — O(n²)", short: "all-pairs", color: "var(--sem-state)" },
  { id: "exponential", label: "subset-sum, try every subset — O(2ⁿ)", short: "subset-sum", color: "var(--sem-control)" },
  { id: "factorial", label: "travelling salesman, try every tour — O(n!)", short: "travelling salesman", color: "var(--sem-err)" },
];

type Rate = { value: number; label: string };
const RATES: readonly Rate[] = [
  { value: 1e6, label: "a phone, 10⁶/s" },
  { value: 1e9, label: "a laptop, 10⁹/s" },
  { value: 1e12, label: "a supercomputer, 10¹²/s" },
  { value: 1e18, label: "every computer on Earth, 10¹⁸/s" },
];

const DEFAULT_GROWTH: Growth = "exponential";
const DEFAULT_N = 20;
const DEFAULT_RATE = 1e9;

const SUPERS: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function superscript(n: number): string {
  return String(n).split("").map((d) => SUPERS[d] ?? d).join("");
}

/** Compact scientific count, honest about overflow (factorial(40) is a float). */
function fmtCount(x: number): string {
  if (!Number.isFinite(x)) return "∞ (overflow)";
  if (x < 1e4) return x.toLocaleString("en-US");
  const e = Math.floor(Math.log10(x));
  const m = x / 10 ** e;
  return `${m.toFixed(2)}×10${superscript(e)}`;
}

/** Ops for the four models at a size — the bars & death-watch read from here. */
function opsFor(kind: Growth, n: number): number {
  return work(kind, n);
}

/** Semantic tier from a duration in seconds → color + word. */
function tierOf(seconds: number): { color: string; word: string } {
  if (!Number.isFinite(seconds)) return { color: "var(--sem-err)", word: "essentially forever" };
  if (seconds < 1) return { color: "var(--sem-ok)", word: "tractable" };
  const years = seconds / SECONDS_PER_YEAR;
  if (years < 1) return { color: "var(--sem-control)", word: "slow — noticeable" };
  if (years < AGE_OF_UNIVERSE_YEARS) return { color: "var(--sem-control)", word: "geological" };
  return { color: "var(--sem-err)", word: "astronomical" };
}

// bar chart geometry
const BAR_W = 640;
const BAR_H = 260;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 26;
const PAD_B = 44;

type BarModel = { key: Growth; expr: string; ops: number; color: string };

/** Death-watch: a few representative sizes for the CURRENT problem, all honest. */
function deathWatch(kind: Growth, rate: number): { n: number; time: string }[] {
  const sizes: Record<Growth, number[]> = {
    linear: [1e3, 1e6, 1e9, 1e12],
    quadratic: [1e3, 1e4, 1e5, 1e6],
    exponential: [25, 40, 60, 100],
    factorial: [10, 15, 20, 25],
  };
  return sizes[kind].map((n) => ({ n, time: timeAtRate(opsFor(kind, n), rate).human }));
}

export default function BruteForceDeathWatch() {
  const reduced = useReducedMotion();
  const [growth, setGrowth] = useState<Growth>(DEFAULT_GROWTH);
  const [n, setN] = useState(DEFAULT_N);
  const [rate, setRate] = useState(DEFAULT_RATE);

  const problem = PROBLEMS.find((p) => p.id === growth) ?? PROBLEMS[2];

  const ops = useMemo(() => opsFor(growth, n), [growth, n]);
  const est = useMemo(() => timeAtRate(ops, rate), [ops, rate]);
  const years = est.seconds / SECONDS_PER_YEAR;
  const beyondUniverse = Number.isFinite(years) && years > AGE_OF_UNIVERSE_YEARS;
  const uni = beyondUniverse ? universeMultiple(years) : 0;
  const tier = tierOf(est.seconds);

  // tour count for TSP is (n−1)!/2, though we time the factorial-scale search
  const tourCount = useMemo(() => (growth === "factorial" ? bruteForceTourCount(n) : 0), [growth, n]);

  const bars = useMemo<BarModel[]>(
    () => [
      { key: "linear", expr: "n", ops: n, color: "var(--sem-data)" },
      { key: "quadratic", expr: "n²", ops: n * n, color: "var(--sem-state)" },
      { key: "exponential", expr: "2ⁿ", ops: pow2(n), color: "var(--sem-control)" },
      { key: "factorial", expr: "n!", ops: factorial(n), color: "var(--sem-err)" },
    ],
    [n],
  );

  // log scale over finite bars; overflow (factorial can be Infinity) pins to top
  const finiteLogs = bars.filter((b) => Number.isFinite(b.ops) && b.ops > 0).map((b) => Math.log10(b.ops));
  const maxLog = finiteLogs.length ? Math.max(...finiteLogs, 1) : 1;
  const innerH = BAR_H - PAD_T - PAD_B;
  const innerW = BAR_W - PAD_L - PAD_R;
  const slot = innerW / bars.length;
  const barW = Math.min(96, slot * 0.56);

  const dw = useMemo(() => deathWatch(growth, rate), [growth, rate]);

  const status =
    `${problem.short} · n=${n} · ${RATES.find((r) => r.value === rate)?.label ?? `${rate}/s`} — ` +
    `${fmtCount(ops)} operations ≈ ${est.human}` +
    (beyondUniverse ? ` (≈ ${fmtCount(uni)}× the age of the universe)` : "") +
    `. ${tier.word}.`;

  return (
    <SimShell
      title="Brute-force death-watch — how long would it take?"
      simKey="brute-force-death-watch"
      kind="micro"
      accent={ACCENT}
      onReset={() => {
        setGrowth(DEFAULT_GROWTH);
        setN(DEFAULT_N);
        setRate(DEFAULT_RATE);
      }}
      status={status}
      controls={
        <div className="bf-ctl">
          <label className="ss-field">
            problem
            <select
              value={growth}
              onChange={(e) => setGrowth(e.target.value as Growth)}
              aria-label="Problem and its growth model"
            >
              {PROBLEMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ss-field">
            machine
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              aria-label="Machine speed in operations per second"
            >
              {RATES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ss-field bf-nfield">
            n = <b className="bf-nval">{n}</b>
            <input
              className="bf-slider"
              type="range"
              min={1}
              max={40}
              step={1}
              value={n}
              onChange={(e) => setN(clamp(Number.parseInt(e.target.value, 10) || 1, 1, 40))}
              aria-label="Problem size n, from 1 to 40"
              aria-valuetext={`n equals ${n}`}
              style={{ "--accent": problem.color } as CSSProperties}
            />
          </label>
        </div>
      }
      footer={
        <div className="bf-dw" role="group" aria-label={`Death-watch for ${problem.short}`}>
          <span className="bf-dw-lbl">death-watch · {problem.short}</span>
          <div className="bf-dw-rows">
            {dw.map((d) => (
              <span key={d.n} className="bf-dw-row">
                <span className="bf-dw-n">n={fmtCount(d.n)}</span>
                <span className="bf-dw-arrow" aria-hidden="true">→</span>
                <span className="bf-dw-t">{d.time}</span>
              </span>
            ))}
          </div>
        </div>
      }
    >
      <div className="bf-stage">
        {/* headline readout */}
        <div className="bf-readout">
          <div className="bf-ro-block">
            <span className="bf-ro-lbl">operations</span>
            <span className="bf-ro-count" style={{ color: problem.color }}>
              {fmtCount(ops)}
            </span>
            <span className="bf-ro-sub">
              {problem.label}
              {growth === "factorial" && (
                <>
                  {" "}
                  · <b>{fmtCount(tourCount)}</b> distinct tours
                </>
              )}
            </span>
          </div>
          <div className="bf-ro-arrow" aria-hidden="true">
            @ {RATES.find((r) => r.value === rate)?.label.split(",")[1]?.trim() ?? `${rate}/s`} →
          </div>
          <div className="bf-ro-block bf-ro-time">
            <span className="bf-ro-lbl">wall-clock</span>
            <span className="bf-ro-time-val" style={{ color: tier.color }}>
              {est.human}
            </span>
            <span className="bf-ro-sub" style={{ color: tier.color }}>
              {beyondUniverse ? `≈ ${fmtCount(uni)}× the age of the universe` : tier.word}
            </span>
          </div>
        </div>

        {/* log-scale comparison of the four growth curves at this n */}
        <svg
          className="bf-svg"
          viewBox={`0 0 ${BAR_W} ${BAR_H}`}
          role="img"
          aria-label={
            `Log-scale bar chart at n=${n}: ` +
            bars.map((b) => `${b.expr} is ${fmtCount(b.ops)} operations`).join("; ") +
            `. The ${problem.short} model (${bars.find((b) => b.key === growth)?.expr}) is highlighted.`
          }
          preserveAspectRatio="xMidYMid meet"
        >
          {/* faint decade gridlines */}
          {Array.from({ length: Math.ceil(maxLog) + 1 }, (_v, i) => {
            const yy = PAD_T + innerH - (i / maxLog) * innerH;
            return (
              <g key={i}>
                <line x1={PAD_L} y1={yy} x2={BAR_W - PAD_R} y2={yy} className="bf-grid" />
                <text x={PAD_L} y={yy - 3} className="bf-grid-lbl">
                  10{superscript(i)}
                </text>
              </g>
            );
          })}
          <line x1={PAD_L} y1={PAD_T + innerH} x2={BAR_W - PAD_R} y2={PAD_T + innerH} className="bf-axis" />

          {bars.map((b, i) => {
            const isSel = b.key === growth;
            const overflow = !Number.isFinite(b.ops) || b.ops <= 0;
            const lg = overflow ? maxLog : Math.log10(b.ops);
            const h = overflow ? innerH : Math.max(2, (lg / maxLog) * innerH);
            const cxp = PAD_L + slot * i + slot / 2;
            const x = cxp - barW / 2;
            const y = PAD_T + innerH - h;
            return (
              <g key={b.key} className={cx("bf-bar-g", isSel && "is-sel", reduced && "is-reduced")}>
                <rect
                  className="bf-bar"
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  style={{ fill: b.color, opacity: isSel ? 1 : 0.42 }}
                />
                {overflow && (
                  <text x={cxp} y={y - 14} className="bf-bar-of" textAnchor="middle">
                    ↑
                  </text>
                )}
                <text x={cxp} y={y - 5} className={cx("bf-bar-count", isSel && "is-sel")} textAnchor="middle">
                  {fmtCount(b.ops)}
                </text>
                <text x={cxp} y={PAD_T + innerH + 18} className={cx("bf-bar-expr", isSel && "is-sel")} textAnchor="middle">
                  {b.expr}
                </text>
                <text x={cxp} y={PAD_T + innerH + 34} className="bf-bar-tag" textAnchor="middle">
                  {b.key === "linear" ? "linear" : b.key === "quadratic" ? "quadratic" : b.key === "exponential" ? "exponential" : "factorial"}
                </text>
              </g>
            );
          })}
          <text x={BAR_W - PAD_R} y={PAD_T - 12} className="bf-svg-cap" textAnchor="end">
            operations at n = {n} · log₁₀ scale
          </text>
        </svg>
      </div>
    </SimShell>
  );
}
