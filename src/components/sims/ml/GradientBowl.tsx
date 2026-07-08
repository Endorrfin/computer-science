// [micro] gradient-bowl (ch.33) — gradient descent made visible on an honest
// elongated quadratic bowl L(a,b) = ½(a² + κ·b²). Drag the start point, pick a
// learning rate, and watch descend(start, lr, steps) trace a path across the
// contours. The whole lesson is the stability threshold STABLE_LR = 2/κ: below
// it the path spirals into the minimum (converge, green); right at it the steep
// (b) axis rings without decaying (oscillate, orange); above it the step
// overshoots and blows up (explode, red). Same gradient descent the MLP runs —
// here on a surface you can see. Prefix: gb-.
//
// Single default export (react-refresh). Functional colors are inline from the
// semantic palette so the SVG reads without the sheet; the sheet adds layout,
// hover and the reduced-motion-aware transitions only.
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import SimShell from "../SimShell.tsx";
import { cx, clamp, useReducedMotion } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import { KAPPA, STABLE_LR, lossAt, descend } from "./gd.ts";
import type { Outcome } from "./gd.ts";
import "../../../theme/_p10css/gradient-bowl.css";

const ACCENT = "#A78BFA";

// Data-space window (a horizontal, b vertical). Loss contours are ellipses,
// squashed along b because κ > 1.
const A_MIN = -2;
const A_MAX = 2;
const B_MIN = -1.5;
const B_MAX = 1.5;

// SVG viewBox: a padded plane on the left, a slim loss-vs-step strip on the right.
const VB_W = 200;
const VB_H = 150;
const PAD = 14; // inner margin of the contour plane
const PLANE_W = VB_W * 0.66; // the plane occupies the left ~2/3

const STEPS = 40; // how many descent steps to run
const START0: [number, number] = [-1.7, 1.2]; // a corner up the steep wall

// A ladder of learning rates that straddles the stability threshold (~0.333).
const LR_PRESETS: readonly { lr: number; note: string }[] = [
  { lr: 0.1, note: "well below — slow, safe descent" },
  { lr: 0.2, note: "below — brisk and stable" },
  { lr: 0.3, note: "just below the threshold" },
  { lr: STABLE_LR, note: "exactly 2/κ — the knife edge" },
  { lr: 0.42, note: "above — the steep axis rings up" },
  { lr: 0.55, note: "well above — overshoots and explodes" },
];

const OUTCOME_COLOR: Record<Outcome, string> = {
  converge: "var(--sem-ok)",
  oscillate: "var(--sem-control)",
  explode: "var(--sem-err)",
};

// ---- data-space → plane-pixel transforms ----
const ax = (a: number): number => PAD + ((a - A_MIN) / (A_MAX - A_MIN)) * (PLANE_W - 2 * PAD);
const by = (b: number): number => PAD + ((B_MAX - b) / (B_MAX - B_MIN)) * (VB_H - 2 * PAD);

export default function GradientBowl() {
  const [start, setStart] = useState<[number, number]>(START0);
  const [lr, setLr] = useState<number>(0.3);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [shownSteps, setShownSteps] = useState(0); // path points revealed so far
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  // The full run for the current start + lr. Deterministic → memoized.
  const run = useMemo(() => descend(start, lr, STEPS), [start, lr]);
  const { path, outcome } = run;

  // Reveal the path one point per tick while playing; stop at the end.
  useSimClock(running && !reduced, 6 * speed, () => {
    setShownSteps((s) => {
      const next = s + 1;
      if (next >= path.length - 1) setRunning(false);
      return Math.min(next, path.length - 1);
    });
  });

  // Editing the start or lr rewinds the animation.
  function rewind(): void {
    setRunning(false);
    setShownSteps(0);
  }
  function pickLr(v: number): void {
    setLr(v);
    rewind();
  }
  function setStartClamped(a: number, b: number): void {
    setStart([clamp(a, A_MIN, A_MAX), clamp(b, B_MIN, B_MAX)]);
    rewind();
  }

  function onReset(): void {
    setStart(START0);
    setLr(0.3);
    setSpeed(1);
    rewind();
  }
  function onToggle(): void {
    if (reduced) return;
    if (shownSteps >= path.length - 1) setShownSteps(0); // replay from the top
    setRunning((r) => !r);
  }
  function onStep(): void {
    setRunning(false);
    setShownSteps((s) => Math.min(path.length - 1, s + 1));
  }

  // ---- dragging / keyboard-nudging the start point ----
  function toData(e: ReactPointerEvent): [number, number] {
    const svg = svgRef.current;
    if (!svg) return start;
    const rect = svg.getBoundingClientRect();
    // client px → viewBox px (uniform scale, preserveAspectRatio default)
    const scale = Math.min(rect.width / VB_W, rect.height / VB_H);
    const offX = (rect.width - VB_W * scale) / 2;
    const offY = (rect.height - VB_H * scale) / 2;
    const vx = (e.clientX - rect.left - offX) / scale;
    const vy = (e.clientY - rect.top - offY) / scale;
    const a = A_MIN + ((vx - PAD) / (PLANE_W - 2 * PAD)) * (A_MAX - A_MIN);
    const b = B_MAX - ((vy - PAD) / (VB_H - 2 * PAD)) * (B_MAX - B_MIN);
    return [a, b];
  }
  function onHandleDown(e: ReactPointerEvent): void {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
  }
  function onHandleMove(e: ReactPointerEvent): void {
    if (!dragging) return;
    const [a, b] = toData(e);
    setStartClamped(a, b);
  }
  function onHandleUp(e: ReactPointerEvent): void {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  }
  function onHandleKey(e: ReactKeyboardEvent): void {
    const stepA = (A_MAX - A_MIN) / 40;
    const stepB = (B_MAX - B_MIN) / 40;
    let [a, b] = start;
    if (e.key === "ArrowLeft") a -= stepA;
    else if (e.key === "ArrowRight") a += stepA;
    else if (e.key === "ArrowUp") b += stepB;
    else if (e.key === "ArrowDown") b -= stepB;
    else return;
    e.preventDefault();
    setStartClamped(a, b);
  }

  // ---- derived render data ----
  // Nested loss contours L = c → ellipse with semi-axes √(2c) (a) and √(2c/κ) (b).
  const contours = useMemo(() => {
    const levels = [0.15, 0.4, 0.8, 1.4, 2.2]; // rising loss values
    return levels.map((c) => ({
      c,
      ra: Math.sqrt(2 * c), // along a
      rb: Math.sqrt((2 * c) / KAPPA), // along b (smaller → squashed)
    }));
  }, []);

  const revealed = path.slice(0, Math.max(1, shownSteps + 1));
  const polyPoints = revealed.map((p) => `${ax(p.a)},${by(p.b)}`).join(" ");
  const cur = revealed[revealed.length - 1];
  const done = shownSteps >= path.length - 1;
  const chipColor = OUTCOME_COLOR[outcome];

  // Loss-vs-step mini plot on the right strip.
  const stripX0 = PLANE_W + 8;
  const stripW = VB_W - stripX0 - 6;
  const stripY0 = PAD;
  const stripH = VB_H - 2 * PAD;
  const lossMax = Math.max(
    ...path.slice(0, revealed.length).map((p) => (Number.isFinite(p.loss) ? p.loss : 0)),
    lossAt(START0[0], START0[1]),
  );
  // log compression so an explosion still fits the strip
  const lossToY = (loss: number): number => {
    const safe = Number.isFinite(loss) ? loss : lossMax;
    const t = lossMax <= 0 ? 0 : Math.min(1, Math.log1p(safe) / Math.log1p(lossMax));
    return stripY0 + (1 - t) * stripH;
  };
  const lossPoints = revealed
    .map((p, i) => {
      const x = stripX0 + (path.length <= 1 ? 0 : (i / (path.length - 1)) * stripW);
      return `${x},${lossToY(p.loss)}`;
    })
    .join(" ");

  const status = `lr ${lr.toFixed(2)} → ${outcome}`;

  return (
    <SimShell
      title="Gradient bowl — one learning rate away from exploding"
      simKey="gradient-bowl"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="gb-ctl" role="group" aria-label="Learning rate">
          <span className="gb-ctl-lbl" aria-hidden="true">
            learning rate
          </span>
          {LR_PRESETS.map((p) => {
            const on = Math.abs(p.lr - lr) < 1e-6;
            const risky = p.lr >= STABLE_LR;
            return (
              <button
                key={p.lr.toFixed(3)}
                type="button"
                className={cx("btn", "gb-lr", on && "btn-primary", risky && "is-risky")}
                onClick={() => pickLr(p.lr)}
                aria-pressed={on}
                title={p.note}
              >
                {p.lr.toFixed(2)}
              </button>
            );
          })}
        </div>
      }
      footer={
        <div className="gb-foot">
          <div className="gb-verdict" role="status">
            <span className="gb-chip" style={{ background: chipColor }}>
              {outcome}
            </span>
            <span className="gb-verdict-txt">
              lr <b style={{ color: "var(--tx)" }}>{lr.toFixed(2)}</b> ·{" "}
              <span style={{ color: lr < STABLE_LR ? "var(--sem-ok)" : "var(--sem-err)" }}>
                {lr < STABLE_LR ? "stable" : "unstable"} while lr &lt; {STABLE_LR.toFixed(2)}
              </span>{" "}
              <span className="gb-verdict-sub">(= 2/κ, κ = {KAPPA})</span>
            </span>
          </div>
          <p className="gb-lesson">
            The bowl is steep along <b>b</b> (curvature κ = {KAPPA}) and gentle along <b>a</b>. One
            shared learning rate must serve both: raise it and the descent along the steep axis{" "}
            <b>overshoots the minimum</b>, ringing back and forth until — past 2/κ — each bounce is
            larger than the last and the loss diverges.
          </p>
        </div>
      }
    >
      <div className="gb-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="gb-svg"
          role="img"
          aria-label={`Loss bowl with a descent path from a=${start[0].toFixed(
            2,
          )}, b=${start[1].toFixed(2)} at learning rate ${lr.toFixed(2)}; outcome ${outcome}.`}
        >
          {/* plane background */}
          <rect
            x={PAD - 6}
            y={PAD - 6}
            width={PLANE_W - 2 * PAD + 12}
            height={VB_H - 2 * PAD + 12}
            rx={4}
            fill="var(--s2)"
            stroke="var(--line)"
            strokeWidth={0.6}
          />

          {/* axes through the minimum (a=0, b=0) */}
          <line x1={ax(A_MIN)} y1={by(0)} x2={ax(A_MAX)} y2={by(0)} stroke="var(--line)" strokeWidth={0.5} />
          <line x1={ax(0)} y1={by(B_MIN)} x2={ax(0)} y2={by(B_MAX)} stroke="var(--line)" strokeWidth={0.5} />

          {/* nested loss contours (ellipses, squashed along b) */}
          {contours.map((ct) => (
            <ellipse
              key={ct.c}
              cx={ax(0)}
              cy={by(0)}
              rx={ax(ct.ra) - ax(0)}
              ry={by(0) - by(ct.rb)}
              fill="none"
              stroke="var(--sem-state)"
              strokeWidth={0.5}
              strokeOpacity={0.42}
            />
          ))}
          {/* the minimum */}
          <circle cx={ax(0)} cy={by(0)} r={1.6} fill="var(--accent)" />
          <text
            x={ax(0)}
            y={by(0) - 3.5}
            textAnchor="middle"
            style={{ fill: "var(--tx3)", font: "600 4px var(--font-mono)", pointerEvents: "none" }}
          >
            min
          </text>

          {/* axis labels */}
          <text
            x={ax(A_MAX) - 1}
            y={by(0) - 2}
            textAnchor="end"
            style={{ fill: "var(--tx3)", font: "600 4px var(--font-mono)", pointerEvents: "none" }}
          >
            a (gentle)
          </text>
          <text
            x={ax(0) + 2.5}
            y={by(B_MAX) + 4}
            style={{ fill: "var(--tx3)", font: "600 4px var(--font-mono)", pointerEvents: "none" }}
          >
            b (steep)
          </text>

          {/* the descent path: polyline + dots */}
          {revealed.length > 1 && (
            <polyline
              points={polyPoints}
              fill="none"
              stroke={chipColor}
              strokeWidth={0.9}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          )}
          {revealed.map((p, i) => {
            // clamp exploded points to the plane edge so the dot stays visible
            const cx0 = clamp(ax(p.a), PAD - 5, PLANE_W - PAD + 5);
            const cy0 = clamp(by(p.b), PAD - 5, VB_H - PAD + 5);
            const isLast = i === revealed.length - 1;
            return (
              <circle
                key={i}
                cx={cx0}
                cy={cy0}
                r={isLast ? 1.9 : 1.1}
                fill={isLast ? chipColor : "var(--surface)"}
                stroke={chipColor}
                strokeWidth={0.9}
              />
            );
          })}

          {/* draggable START handle (also arrow-key nudgeable) */}
          <g
            className={cx("gb-handle", dragging && "is-drag")}
            role="slider"
            tabIndex={0}
            aria-label={`Start point: a ${start[0].toFixed(2)}, b ${start[1].toFixed(
              2,
            )}. Arrow keys to move.`}
            aria-valuetext={`a ${start[0].toFixed(2)}, b ${start[1].toFixed(2)}`}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            onKeyDown={onHandleKey}
            style={{ cursor: dragging ? "grabbing" : "grab" }}
          >
            <circle className="gb-handle-hit" cx={ax(start[0])} cy={by(start[1])} r={6} fill="transparent" />
            <circle
              cx={ax(start[0])}
              cy={by(start[1])}
              r={2.6}
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth={1.4}
            />
            <text
              x={ax(start[0])}
              y={by(start[1]) - 4}
              textAnchor="middle"
              style={{ fill: "var(--accent)", font: "700 4px var(--font-mono)", pointerEvents: "none" }}
            >
              start
            </text>
          </g>

          {/* loss-vs-step strip */}
          <text
            x={stripX0}
            y={stripY0 - 2}
            style={{ fill: "var(--tx3)", font: "600 4px var(--font-mono)", pointerEvents: "none" }}
          >
            loss / step
          </text>
          <rect
            x={stripX0}
            y={stripY0}
            width={stripW}
            height={stripH}
            rx={2}
            fill="var(--s2)"
            stroke="var(--line)"
            strokeWidth={0.5}
          />
          {revealed.length > 1 && (
            <polyline
              points={lossPoints}
              fill="none"
              stroke={chipColor}
              strokeWidth={0.9}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          <text
            x={stripX0 + stripW / 2}
            y={VB_H - 4}
            textAnchor="middle"
            style={{ fill: "var(--tx3)", font: "600 3.6px var(--font-mono)", pointerEvents: "none" }}
          >
            step {shownSteps}/{path.length - 1}
          </text>
        </svg>

        {/* live read-out under the stage */}
        <div className="gb-readout" role="status" aria-live="off">
          <span className="gb-ro-item">
            start <b>a {start[0].toFixed(2)}</b>, <b>b {start[1].toFixed(2)}</b>
          </span>
          <span className="gb-ro-sep" aria-hidden="true">
            ·
          </span>
          <span className="gb-ro-item">
            now <b>a {cur.a.toFixed(2)}</b>, <b>b {cur.b.toFixed(2)}</b>
          </span>
          <span className="gb-ro-sep" aria-hidden="true">
            ·
          </span>
          <span className="gb-ro-item">
            loss{" "}
            <b style={{ color: chipColor }}>
              {Number.isFinite(cur.loss) ? cur.loss.toFixed(3) : "∞"}
            </b>
          </span>
          {done && (
            <span className="gb-ro-verdict" style={{ color: chipColor }}>
              → {outcome}
            </span>
          )}
        </div>

        {reduced && (
          <p className="gb-rm-note" role="note">
            Reduced motion is on — press <b>Step</b> (or →) to advance the descent one iteration at a
            time.
          </p>
        )}
      </div>
    </SimShell>
  );
}
