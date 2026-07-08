// [fig] scaling-curves (ch.34, Part 10) — neural scaling laws as clean straight
// lines on a log–log plot. The empirical finding: test loss falls as a POWER LAW
// in each of compute, data, and parameters — so on log(x) vs log(loss) axes the
// trend is a straight, downward line. Scaling the three together (Chinchilla)
// beats pouring compute into a giant, undertrained model; and because the line
// is straight, you can EXTRAPOLATE it to predict a larger model’s loss before
// spending the compute to train it. (Downstream benchmark scores are a different
// story — they eventually saturate.)
//
// This is a SCHEMATIC figure: numbers are illustrative, not measured. Points are
// generated inline from y = c − k·log10(x) so the lines are genuinely straight in
// log–log space; nothing is recomputed by an engine. FigureStepper supplies the
// parent <svg> and the transport, re-keying per frame. Styled inline with theme
// vars; no CSS file. Prefix for local ids: sc-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const ACCENT = "#A78BFA";

const VB_W = 720;
const VB_H = 420;

// ---------------------------------------------------------------------------
// Plot frame. We work in "log decades" on both axes: the x-axis spans several
// decades of (illustrative) compute, the y-axis is test loss shown on a log
// scale (higher = worse, at the top). All lines are straight in this space.
// ---------------------------------------------------------------------------
const PLOT_X = 96; // left edge of plotting area (px)
const PLOT_R = 470; // right edge
const PLOT_TOP = 78; // top edge (low loss lives near the bottom, high near top)
const PLOT_BOT = 336; // bottom edge

// Axis ranges in "decade" units (dimensionless; just for placing points).
const X_MIN = 0; // decade 0  (small compute)
const X_MAX = 6; // decade 6  (large compute)
const Y_MIN = 0; // low loss  (bottom)
const Y_MAX = 4; // high loss (top)

function sx(xDec: number): number {
  return PLOT_X + ((xDec - X_MIN) / (X_MAX - X_MIN)) * (PLOT_R - PLOT_X);
}
// y grows downward in SVG; loss increases UPWARD, so invert.
function sy(yDec: number): number {
  return PLOT_BOT - ((yDec - Y_MIN) / (Y_MAX - Y_MIN)) * (PLOT_BOT - PLOT_TOP);
}

// A power-law line in log–log space: loss(x) = c − k · x  (x already in decades).
// Returns the two endpoints clamped to the plotting window.
function powerLine(c: number, k: number, x0: number, x1: number): { p0: [number, number]; p1: [number, number] } {
  const yAt = (x: number): number => c - k * x;
  return {
    p0: [sx(x0), sy(yAt(x0))],
    p1: [sx(x1), sy(yAt(x1))],
  };
}

// ---------------------------------------------------------------------------
// SVG primitives.
// ---------------------------------------------------------------------------

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="sc-arrow-tx" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--tx2)" />
      </marker>
      <marker id="sc-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
      </marker>
    </defs>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }): ReactNode {
  return (
    <g>
      <text x={26} y={34} fontFamily="var(--font-mono)" fontSize={11} letterSpacing="0.09em" fill="var(--tx3)">
        {kicker.toUpperCase()}
      </text>
      <text x={26} y={57} fontFamily="var(--font-head)" fontSize={18} fontWeight={800} fill="var(--tx)">
        {title}
      </text>
    </g>
  );
}

function note(text: string): ReactNode {
  return (
    <text x={26} y={VB_H - 14} fontFamily="var(--font-mono)" fontSize={12} fill="var(--tx2)">
      {text}
    </text>
  );
}

// The axes, ticks, and log labels — the same chrome for every frame.
function Axes({ xLabel }: { xLabel: string }): ReactNode {
  const xTicks = [1, 2, 3, 4, 5]; // decade gridlines
  const yTicks = [1, 2, 3];
  return (
    <g>
      {/* faint gridlines */}
      {xTicks.map((d) => (
        <line key={`gx${d}`} x1={sx(d)} y1={PLOT_TOP} x2={sx(d)} y2={PLOT_BOT} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} />
      ))}
      {yTicks.map((d) => (
        <line key={`gy${d}`} x1={PLOT_X} y1={sy(d)} x2={PLOT_R} y2={sy(d)} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} />
      ))}

      {/* y-axis (test loss, log) */}
      <line x1={PLOT_X} y1={PLOT_BOT} x2={PLOT_X} y2={PLOT_TOP - 8} stroke="var(--tx2)" strokeWidth={1.6} markerEnd="url(#sc-arrow-tx)" />
      {/* x-axis (compute / data / params, log) */}
      <line x1={PLOT_X} y1={PLOT_BOT} x2={PLOT_R + 8} y2={PLOT_BOT} stroke="var(--tx2)" strokeWidth={1.6} markerEnd="url(#sc-arrow-tx)" />

      {/* axis titles */}
      <text
        x={30}
        y={(PLOT_TOP + PLOT_BOT) / 2}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={12}
        fontWeight={700}
        fill="var(--tx)"
        transform={`rotate(-90 30 ${(PLOT_TOP + PLOT_BOT) / 2})`}
      >
        test loss (log)
      </text>
      <text x={(PLOT_X + PLOT_R) / 2} y={PLOT_BOT + 30} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fontWeight={700} fill="var(--tx)">
        {xLabel}
      </text>

      {/* "worse / better" hints on the y-axis */}
      <text x={PLOT_X - 8} y={PLOT_TOP + 6} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--tx3)">
        worse ↑
      </text>
      <text x={PLOT_X - 8} y={PLOT_BOT - 2} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--tx3)">
        better ↓
      </text>
    </g>
  );
}

// A straight power-law line, optionally dashed (for extrapolation).
function Line({
  c,
  k,
  x0,
  x1,
  color,
  dashed = false,
  width = 2.6,
}: {
  c: number;
  k: number;
  x0: number;
  x1: number;
  color: string;
  dashed?: boolean;
  width?: number;
}): ReactNode {
  const { p0, p1 } = powerLine(c, k, x0, x1);
  return (
    <line
      x1={p0[0]}
      y1={p0[1]}
      x2={p1[0]}
      y2={p1[1]}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dashed ? "8 6" : undefined}
      strokeLinecap="round"
    />
  );
}

// A right-hand text label riding at the end of a line.
function LineLabel({ c, k, xAt, text, color }: { c: number; k: number; xAt: number; text: string; color: string }): ReactNode {
  const x = sx(xAt) + 8;
  const y = sy(c - k * xAt) + 4;
  return (
    <text x={x} y={y} fontFamily="var(--font-mono)" fontSize={11} fontWeight={700} fill={color}>
      {text}
    </text>
  );
}

// A marked data point with a caption bubble.
function Point({
  xDec,
  yDec,
  color,
  label,
  sub,
  anchor = "start",
}: {
  xDec: number;
  yDec: number;
  color: string;
  label: string;
  sub?: string;
  anchor?: "start" | "end" | "middle";
}): ReactNode {
  const px = sx(xDec);
  const py = sy(yDec);
  const dx = anchor === "end" ? -12 : 12;
  return (
    <g>
      <circle cx={px} cy={py} r={6} fill={color} stroke="var(--bg)" strokeWidth={1.5} />
      <circle cx={px} cy={py} r={11} fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
      <text x={px + dx} y={py - 4} textAnchor={anchor} fontFamily="var(--font-mono)" fontSize={11.5} fontWeight={700} fill={color}>
        {label}
      </text>
      {sub && (
        <text x={px + dx} y={py + 11} textAnchor={anchor} fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--tx2)">
          {sub}
        </text>
      )}
    </g>
  );
}

// A compact legend chip.
function Legend({ x, y, items }: { x: number; y: number; items: Array<{ color: string; label: string; dashed?: boolean }> }): ReactNode {
  return (
    <g>
      {items.map((it, k) => (
        <g key={k} transform={`translate(${x} ${y + k * 18})`}>
          <line x1={0} y1={0} x2={22} y2={0} stroke={it.color} strokeWidth={2.6} strokeDasharray={it.dashed ? "5 4" : undefined} strokeLinecap="round" />
          <text x={28} y={4} fontFamily="var(--font-mono)" fontSize={10.5} fill="var(--tx2)">
            {it.label}
          </text>
        </g>
      ))}
    </g>
  );
}

// The stage note under the plot.
function stageNote({ text, tone }: { text: string; tone: "accent" | "data" | "ok" | "control" | "err" }): ReactNode {
  const color =
    tone === "data"
      ? "var(--sem-data)"
      : tone === "ok"
        ? "var(--sem-ok)"
        : tone === "control"
          ? "var(--sem-control)"
          : tone === "err"
            ? "var(--sem-err)"
            : ACCENT;
  return (
    <text x={(PLOT_X + PLOT_R) / 2} y={PLOT_BOT + 52} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={700} fill={color}>
      {text}
    </text>
  );
}

// Shared line parameters (illustrative). Same slope k, different intercepts c so
// the three trends read as parallel power laws.
const COMPUTE = { c: 3.5, k: 0.5 };
const DATA = { c: 3.15, k: 0.5 };
const PARAMS = { c: 2.8, k: 0.5 };

// ---------------------------------------------------------------------------
// Frames.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — one axis: compute vs loss, a straight downward power law.
  {
    caption:
      "Plot test loss against training compute, both on LOG axes, and the trend is a straight line sloping down: loss ≈ c − k·log(compute). This is a power law — every time you multiply compute by a fixed factor, loss drops by a roughly constant amount. The remarkable part is how clean and predictable the line is across many orders of magnitude.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Scaling laws · step 1 — compute" title="Loss falls as a power law in compute" />
        <Axes xLabel="training compute (log FLOPs)" />
        <Line c={COMPUTE.c} k={COMPUTE.k} x0={0.4} x1={5.6} color={ACCENT} width={3} />
        <LineLabel c={COMPUTE.c} k={COMPUTE.k} xAt={5.6} text="compute" color={ACCENT} />
        {stageNote({ text: "straight line on log–log = power law", tone: "accent" })}
        {note("loss ≈ c − k·log(compute): multiply compute ×10, subtract a fixed chunk of loss.")}
      </g>
    ),
  },

  // 1 — three parallel lines: compute, data, parameters.
  {
    caption:
      "The same predictable decline holds for the other two ingredients: more DATA (tokens seen) and more PARAMETERS (model size) each drive loss down along their own straight power-law line. Draw all three and they’re parallel downward trends. In practice they’re bottlenecked together — you need to grow all three; starving any one flattens the gains.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Scaling laws · step 2 — three ingredients" title="Compute, data, and parameters all scale" />
        <Axes xLabel="compute · data · parameters (log)" />
        <Line c={PARAMS.c} k={PARAMS.k} x0={0.4} x1={5.6} color="var(--sem-data)" width={2.6} />
        <Line c={DATA.c} k={DATA.k} x0={0.4} x1={5.6} color="var(--sem-ok)" width={2.6} />
        <Line c={COMPUTE.c} k={COMPUTE.k} x0={0.4} x1={5.6} color={ACCENT} width={2.6} />
        <LineLabel c={PARAMS.c} k={PARAMS.k} xAt={5.6} text="parameters" color="var(--sem-data)" />
        <LineLabel c={DATA.c} k={DATA.k} xAt={5.6} text="data" color="var(--sem-ok)" />
        <LineLabel c={COMPUTE.c} k={COMPUTE.k} xAt={5.6} text="compute" color={ACCENT} />
        <Legend
          x={PLOT_X + 14}
          y={PLOT_TOP + 14}
          items={[
            { color: ACCENT, label: "compute" },
            { color: "var(--sem-ok)", label: "data (tokens)" },
            { color: "var(--sem-data)", label: "parameters" },
          ]}
        />
        {stageNote({ text: "more data · more params · more compute → lower loss", tone: "ok" })}
        {note("three parallel power laws; the practical loss follows whichever ingredient is scarcest.")}
      </g>
    ),
  },

  // 2 — Chinchilla: undertrained big model vs compute-optimal.
  {
    caption:
      "Given a FIXED compute budget, how should you spend it — a huge model on few tokens, or a smaller model on many? The Chinchilla finding: scale parameters AND tokens together. An oversized model trained on too little data (the red point) is UNDERTRAINED and lands high; a compute-optimal split (the green point) reaches a lower loss for the SAME compute. Many early large models sat at the red point.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Scaling laws · step 3 — Chinchilla" title="Scale parameters AND tokens together" />
        <Axes xLabel="training compute (log FLOPs)" />
        {/* the compute-optimal frontier (what you can reach if you split well) */}
        <Line c={COMPUTE.c} k={COMPUTE.k} x0={0.4} x1={5.6} color={ACCENT} width={2.4} />
        <LineLabel c={COMPUTE.c} k={COMPUTE.k} xAt={5.6} text="compute-optimal frontier" color={ACCENT} />
        {/* both points share the SAME x (same compute) but different loss */}
        <Point
          xDec={3.4}
          yDec={COMPUTE.c - COMPUTE.k * 3.4 + 0.95}
          color="var(--sem-err)"
          label="big, undertrained"
          sub="huge model · too few tokens"
        />
        <Point
          xDec={3.4}
          yDec={COMPUTE.c - COMPUTE.k * 3.4}
          color="var(--sem-ok)"
          label="compute-optimal"
          sub="params & tokens balanced"
        />
        {/* the gap between them */}
        <line
          x1={sx(3.4) - 26}
          y1={sy(COMPUTE.c - COMPUTE.k * 3.4)}
          x2={sx(3.4) - 26}
          y2={sy(COMPUTE.c - COMPUTE.k * 3.4 + 0.95)}
          stroke="var(--sem-control)"
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <text
          x={sx(3.4) - 32}
          y={sy(COMPUTE.c - COMPUTE.k * 3.4 + 0.47)}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize={9.5}
          fill="var(--sem-control)"
        >
          wasted
        </text>
        {stageNote({ text: "same compute, better split → lower loss", tone: "ok" })}
        {note("Chinchilla: most models were undertrained — grow the token count alongside the parameter count.")}
      </g>
    ),
  },

  // 3 — extrapolation of the line, and the benchmark caveat.
  {
    caption:
      "Because the fit is a straight line, you can EXTRAPOLATE it: measure a few smaller runs, project the dashed continuation, and you have a principled estimate of a bigger model’s loss before spending the compute to train it — which is exactly how large training runs get budgeted. Caveat: loss extrapolates smoothly, but downstream BENCHMARK scores are a different quantity and eventually saturate (they can’t exceed 100%).",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Scaling laws · step 4 — extrapolate" title="Predict a bigger model before training it" />
        <Axes xLabel="training compute (log FLOPs)" />
        {/* measured portion (solid) then predicted portion (dashed) */}
        <Line c={COMPUTE.c} k={COMPUTE.k} x0={0.4} x1={3.6} color={ACCENT} width={3} />
        <Line c={COMPUTE.c} k={COMPUTE.k} x0={3.6} x1={5.7} color={ACCENT} dashed width={2.6} />
        <Point xDec={3.6} yDec={COMPUTE.c - COMPUTE.k * 3.6} color={ACCENT} label="last measured run" anchor="end" />
        <Point
          xDec={5.4}
          yDec={COMPUTE.c - COMPUTE.k * 5.4}
          color="var(--sem-ok)"
          label="predicted loss"
          sub="of a larger model"
          anchor="end"
        />
        {/* benchmark-saturation aside: an S-curve flattening near the top-right */}
        <g opacity={0.9}>
          <path
            d={`M ${sx(3.9)} ${PLOT_TOP + 78} C ${sx(4.6)} ${PLOT_TOP + 76}, ${sx(4.7)} ${PLOT_TOP + 30}, ${sx(5.6)} ${PLOT_TOP + 28}`}
            fill="none"
            stroke="var(--sem-control)"
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <text x={sx(4.75)} y={PLOT_TOP + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--sem-control)">
            benchmark score saturates
          </text>
        </g>
        <Legend
          x={PLOT_X + 14}
          y={PLOT_TOP + 14}
          items={[
            { color: ACCENT, label: "measured" },
            { color: ACCENT, label: "extrapolated", dashed: true },
            { color: "var(--sem-control)", label: "benchmark (saturates)", dashed: true },
          ]}
        />
        {stageNote({ text: "loss extrapolates · benchmarks eventually plateau", tone: "control" })}
        {note("scaling laws forecast LOSS; task accuracy is a separate curve that flattens as it nears its ceiling.")}
      </g>
    ),
  },
];

export default function ScalingCurves(): ReactNode {
  return (
    <FigureStepper
      title="Scaling laws — loss falls predictably, and you can extrapolate it"
      figKey="scaling-curves"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
