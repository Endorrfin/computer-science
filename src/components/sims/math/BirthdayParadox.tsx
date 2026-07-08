// [HERO] birthday-paradox (ch.0b, Math toolkit) — the exact probability that two
// people in a group of n share a birthday, and a seeded Monte-Carlo that
// converges onto that curve. The whole lesson is "simulation → theory": drag n
// and read P off the exact curve; then run trials and watch the dots settle onto
// it. The three landmarks (50% → 23, 99% → 57, 99.9% → 70) come from
// smallestGroupFor — computed, never hardcoded. All math lives in birthday.ts;
// this component only calls it and draws. Prefix: bp-.
//
// Single default export (react-refresh). Functional SVG color is inline from the
// semantic palette so the plot reads without the sheet; the sheet adds layout,
// controls and the reduced-motion-aware transitions.
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { clamp } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import {
  birthdayProbExact,
  expectedCollidingPairs,
  smallestGroupFor,
  birthdayMonteCarlo,
  exactCurve,
} from "./birthday.ts";
import "../../../theme/_p0css/birthday-paradox.css";

const ACCENT = "#94A3B8";

const MAX_N = 80; // people axis 0…80 (well past the 99.9% landmark at 70)
const N_MIN = 1;

// SVG plot geometry: a padded plane, x = people (0…MAX_N), y = probability (0…1).
const VB_W = 320;
const VB_H = 190;
const PAD_L = 30; // room for y-axis ticks
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 22; // room for x-axis ticks

// Monte-Carlo run schedule: each "run" pushes the trial budget up one rung so
// the estimate visibly tightens onto the exact curve. Seed varies per run.
const MC_BUDGETS = [200, 500, 1000, 2000, 5000, 10000, 20000, 50000] as const;

type McPoint = { trials: number; est: number };

// data → pixel transforms
const px = (n: number): number => PAD_L + (n / MAX_N) * (VB_W - PAD_L - PAD_R);
const py = (p: number): number => PAD_T + (1 - p) * (VB_H - PAD_T - PAD_B);

const pct = (p: number): string => `${(p * 100).toFixed(1)}%`;

/** The three teaching landmarks — computed from the engine, not hardcoded. */
type Landmark = { p: number; label: string; color: string };
function landmarks(): Landmark[] {
  return [
    { p: 0.5, label: "50%", color: "var(--sem-ok)" },
    { p: 0.99, label: "99%", color: "var(--sem-control)" },
    { p: 0.999, label: "99.9%", color: "var(--sem-err)" },
  ];
}

export default function BirthdayParadox() {
  const [n, setN] = useState<number>(23);
  const [mcPoints, setMcPoints] = useState<McPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rung, setRung] = useState(0); // index into MC_BUDGETS for the next run

  // Exact curve is deterministic → compute once.
  const curve = useMemo(() => exactCurve(MAX_N), []);
  const marks = useMemo(() => landmarks(), []);
  const landmarkN = useMemo(
    () => marks.map((m) => ({ ...m, n: smallestGroupFor(m.p) })),
    [marks],
  );

  const pExact = birthdayProbExact(n);
  const pairs = expectedCollidingPairs(n);

  // Latest Monte-Carlo estimate at the current budget (for the status line).
  const lastMc = mcPoints.length ? mcPoints[mcPoints.length - 1] : null;

  // Fire one Monte-Carlo run: fresh seed, next budget rung, append the dot.
  function runOne(): void {
    const budget = MC_BUDGETS[Math.min(rung, MC_BUDGETS.length - 1)];
    const seed = Date.now() + mcPoints.length * 7919; // vary per run, stay honest
    const est = birthdayMonteCarlo(n, budget, seed);
    setMcPoints((pts) => [...pts, { trials: budget, est }]);
    setRung((r) => Math.min(r + 1, MC_BUDGETS.length - 1));
  }

  // Transport drives the converging sequence; stop once the top budget is used.
  useSimClock(running, 1.5 * speed, () => {
    runOne();
    if (rung >= MC_BUDGETS.length - 1) setRunning(false);
  });

  function onToggle(): void {
    if (running) {
      setRunning(false);
      return;
    }
    if (rung >= MC_BUDGETS.length - 1) {
      // restart the sweep from the smallest budget
      setMcPoints([]);
      setRung(0);
    }
    setRunning(true);
  }
  function onStep(): void {
    setRunning(false);
    runOne();
  }
  function clearMc(): void {
    setRunning(false);
    setMcPoints([]);
    setRung(0);
  }
  function setNClamped(v: number): void {
    setN(clamp(Math.round(v), N_MIN, MAX_N));
    // n changed → old estimates are for a different group; clear them
    clearMc();
  }
  function onReset(): void {
    setN(23);
    setSpeed(1);
    clearMc();
  }

  // exact-curve polyline (skip n=0 so the line starts at the axis cleanly)
  const curvePoints = curve.map((d) => `${px(d.n)},${py(d.p)}`).join(" ");

  // y-axis gridlines at 0, .25, .5, .75, 1
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  // x-axis ticks every 20 people
  const xTicks = [0, 20, 40, 60, 80];

  const status =
    `n=${n} · exact P=${pct(pExact)}` +
    (lastMc ? ` · MC(${lastMc.trials})=${pct(lastMc.est)}` : "") +
    ` · ${Math.round(pairs)} expected pairs`;

  const mcActive = mcPoints.length > 0;

  return (
    <SimShell
      title="Birthday paradox — simulation catching up to theory"
      simKey="birthday-paradox"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="bp-ctl" role="group" aria-label="Group size and Monte-Carlo">
          <label className="bp-field">
            <span className="bp-field-lbl">group size n</span>
            <input
              className="bp-range"
              type="range"
              min={N_MIN}
              max={MAX_N}
              step={1}
              value={n}
              onChange={(e) => setNClamped(Number(e.target.value))}
              aria-label="Group size (people)"
            />
            <input
              className="bp-num"
              type="number"
              min={N_MIN}
              max={MAX_N}
              value={n}
              onChange={(e) => setNClamped(Number(e.target.value))}
              aria-label="Group size (people), numeric"
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={clearMc}
            disabled={!mcActive}
            title="Clear the Monte-Carlo dots"
          >
            clear trials
          </button>
        </div>
      }
      footer={
        <div className="bp-foot">
          <div className="bp-landmarks">
            {landmarkN.map((m) => (
              <div className="bp-lm" key={m.label}>
                <span className="bp-lm-swatch" style={{ background: m.color }} aria-hidden="true" />
                <span className="bp-lm-p" style={{ color: m.color }}>
                  {m.label}
                </span>
                <span className="bp-lm-txt">
                  at <b>{m.n}</b> people
                </span>
              </div>
            ))}
          </div>
          <p className="bp-lesson">
            With just <b>{landmarkN[0]?.n ?? 23}</b> people a shared birthday is already{" "}
            <b>more likely than not</b> — because what matters is the number of <i>pairs</i> (
            <b>{Math.round(expectedCollidingPairs(landmarkN[0]?.n ?? 23))}</b> of them at 23), which
            grows as n². Press <b>play</b> to run seeded simulations at rising trial counts and watch
            the estimates <b>converge onto the exact curve</b> — simulation catching up to theory.
          </p>
        </div>
      }
    >
      <div className="bp-stage">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="bp-svg"
          role="img"
          aria-label={`Probability of a shared birthday versus group size. At n=${n}, exact probability ${pct(
            pExact,
          )}.${lastMc ? ` Latest Monte-Carlo estimate over ${lastMc.trials} trials: ${pct(lastMc.est)}.` : ""}`}
        >
          {/* plot background */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={VB_W - PAD_L - PAD_R}
            height={VB_H - PAD_T - PAD_B}
            fill="var(--s2)"
            stroke="var(--line)"
            strokeWidth={0.6}
            rx={3}
          />

          {/* y gridlines + labels */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={PAD_L}
                y1={py(t)}
                x2={VB_W - PAD_R}
                y2={py(t)}
                stroke="var(--line)"
                strokeWidth={0.4}
                strokeOpacity={t === 0 || t === 1 ? 0.9 : 0.5}
              />
              <text
                x={PAD_L - 4}
                y={py(t) + 1.5}
                textAnchor="end"
                style={{ fill: "var(--tx3)", font: "600 5px var(--font-mono)" }}
              >
                {Math.round(t * 100)}
              </text>
            </g>
          ))}
          {/* x ticks + labels */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={px(t)}
                y1={py(0)}
                x2={px(t)}
                y2={py(0) + 2.5}
                stroke="var(--line)"
                strokeWidth={0.5}
              />
              <text
                x={px(t)}
                y={py(0) + 9}
                textAnchor="middle"
                style={{ fill: "var(--tx3)", font: "600 5px var(--font-mono)" }}
              >
                {t}
              </text>
            </g>
          ))}
          {/* axis titles */}
          <text
            x={PAD_L + (VB_W - PAD_L - PAD_R) / 2}
            y={VB_H - 3}
            textAnchor="middle"
            style={{ fill: "var(--tx2)", font: "600 5.5px var(--font-mono)" }}
          >
            people in the group (n)
          </text>
          <text
            x={8}
            y={PAD_T + (VB_H - PAD_T - PAD_B) / 2}
            textAnchor="middle"
            transform={`rotate(-90 8 ${PAD_T + (VB_H - PAD_T - PAD_B) / 2})`}
            style={{ fill: "var(--tx2)", font: "600 5.5px var(--font-mono)" }}
          >
            P(shared) %
          </text>

          {/* landmark reference lines (50 / 99 / 99.9%) */}
          {landmarkN.map((m) => (
            <g key={`lm${m.label}`}>
              <line
                x1={PAD_L}
                y1={py(m.p)}
                x2={px(m.n)}
                y2={py(m.p)}
                stroke={m.color}
                strokeWidth={0.5}
                strokeDasharray="2 2"
                strokeOpacity={0.75}
              />
              <line
                x1={px(m.n)}
                y1={py(m.p)}
                x2={px(m.n)}
                y2={py(0)}
                stroke={m.color}
                strokeWidth={0.5}
                strokeDasharray="2 2"
                strokeOpacity={0.6}
              />
              <text
                x={px(m.n) + 2}
                y={py(m.p) - 2}
                style={{ fill: m.color, font: "700 5px var(--font-mono)" }}
              >
                {m.label}→{m.n}
              </text>
            </g>
          ))}

          {/* Monte-Carlo dots: earlier (smaller-budget) runs faded, latest solid */}
          {mcPoints.map((mp, i) => {
            const isLast = i === mcPoints.length - 1;
            const frac = mcPoints.length <= 1 ? 1 : i / (mcPoints.length - 1);
            return (
              <circle
                key={`${mp.trials}-${i}`}
                className={isLast ? "bp-mc-dot is-last" : "bp-mc-dot"}
                cx={px(n)}
                cy={py(mp.est)}
                r={isLast ? 3.2 : 1.6 + frac * 1.0}
                fill="var(--sem-data)"
                fillOpacity={isLast ? 0.95 : 0.28 + frac * 0.4}
                stroke={isLast ? "var(--bg)" : "none"}
                strokeWidth={0.6}
              />
            );
          })}

          {/* the exact curve on top */}
          <polyline
            points={curvePoints}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* current-n marker: vertical guide + point + big read-out */}
          <line
            x1={px(n)}
            y1={py(0)}
            x2={px(n)}
            y2={py(pExact)}
            stroke="var(--tx)"
            strokeWidth={0.7}
            strokeOpacity={0.55}
          />
          <circle
            className="bp-cursor"
            cx={px(n)}
            cy={py(pExact)}
            r={3.4}
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth={1}
          />
        </svg>

        {/* large probability read-out under the plot */}
        <div className="bp-readout" role="status" aria-live="off">
          <div className="bp-ro-main">
            <span className="bp-ro-n">n = {n}</span>
            <span
              className="bp-ro-p"
              style={{ "--bp-p-color": pExact >= 0.5 ? "var(--sem-ok)" : "var(--tx)" } as CSSProperties}
            >
              {pct(pExact)}
            </span>
            <span className="bp-ro-sub">exact P(shared birthday)</span>
          </div>
          <div className="bp-ro-side">
            <span className="bp-ro-item">
              ≈ <b>{Math.round(pairs)}</b> colliding pairs
            </span>
            {lastMc && (
              <span className="bp-ro-item">
                MC({lastMc.trials.toLocaleString()}) ={" "}
                <b style={{ color: "var(--sem-data)" }}>{pct(lastMc.est)}</b>
                {" · Δ "}
                <b>{pct(Math.abs(lastMc.est - pExact))}</b>
              </span>
            )}
          </div>
        </div>
      </div>
    </SimShell>
  );
}
