// [fig] quantum-coin (ch.35, the frontier) — what actually separates a classical
// bit from a qubit, kept physically honest. A bit is definitely 0 OR 1. A qubit
// lives in a SUPERPOSITION α|0⟩ + β|1⟩ — a specific blend of amplitudes, drawn
// here as a point on a circle, NOT "both values literally at once". Measuring it
// COLLAPSES the state to 0 or 1 with probabilities |α|² and |β|². Two qubits can
// be ENTANGLED so their outcomes are correlated — but that correlation carries no
// signal, so it is not faster-than-light communication. And the payoff is narrow:
// only special problems (factoring, quantum simulation) get speed-ups, and the
// qubits are so fragile they need heavy error correction. It is not a faster
// laptop.
//
// Schematic: the "Bloch circle", amplitudes, and bars are fixed inline — no
// engine, no real quantum state. FigureStepper supplies the parent <svg> and the
// transport, re-keying per frame. Styled inline with theme vars; no CSS file.
// Prefix for local ids: qc-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const ACCENT = "#94A3B8";

const VB_W = 720;
const VB_H = 420;

// ---------------------------------------------------------------------------
// Shared SVG primitives — styled inline with theme vars (Heading / note /
// stageNote), mirroring the house figures.
// ---------------------------------------------------------------------------

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="qc-arrow-accent" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
      </marker>
      <marker id="qc-arrow-data" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-data)" />
      </marker>
      <marker id="qc-arrow-err" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-err)" />
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

type Tone = "accent" | "data" | "ok" | "control" | "err";

function toneColor(tone: Tone): string {
  return tone === "data"
    ? "var(--sem-data)"
    : tone === "ok"
      ? "var(--sem-ok)"
      : tone === "control"
        ? "var(--sem-control)"
        : tone === "err"
          ? "var(--sem-err)"
          : ACCENT;
}

function stageNote({ y, text, tone }: { y: number; text: string; tone: Tone }): ReactNode {
  return (
    <text x={VB_W / 2} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={700} fill={toneColor(tone)}>
      {text}
    </text>
  );
}

function haloText({
  x,
  y,
  text,
  size = 11.5,
  anchor = "middle",
  fill = "var(--tx)",
  weight = 700,
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  weight?: number;
}): ReactNode {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily="var(--font-mono)" fontSize={size} fontWeight={weight} fill={fill} stroke="var(--bg)" strokeWidth={3} paintOrder="stroke">
      {text}
    </text>
  );
}

// A coin depicted edge-on/face-on as an ellipse, showing a value (0 or 1) or a
// blurred "spinning" look. `squash` narrows the ellipse to suggest rotation.
function Coin({
  cx,
  cy,
  r = 40,
  squash = 1,
  value,
  tone = "accent",
  spinning = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  squash?: number;
  value?: string;
  tone?: Tone;
  spinning?: boolean;
}): ReactNode {
  const color = toneColor(tone);
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={r * squash}
        ry={r}
        fill={`color-mix(in srgb, ${color} 14%, var(--s2))`}
        stroke={color}
        strokeWidth={2.2}
        strokeDasharray={spinning ? "5 5" : undefined}
      />
      {spinning ? (
        <>
          {/* motion arcs to say "spinning", not "showing a value" */}
          <path d={`M ${cx - r * squash - 8} ${cy - 6} A ${r * squash + 8} ${r + 8} 0 0 1 ${cx - r * squash - 8} ${cy + 6}`} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={0.7} />
          <path d={`M ${cx + r * squash + 8} ${cy - 6} A ${r * squash + 8} ${r + 8} 0 0 0 ${cx + r * squash + 8} ${cy + 6}`} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={0.7} />
          {haloText({ x: cx, y: cy + 5, text: "?", size: 26, fill: color })}
        </>
      ) : (
        value !== undefined && haloText({ x: cx, y: cy + 8, text: value, size: 26, fill: "var(--tx)" })
      )}
    </g>
  );
}

// The "Bloch circle": a great-circle cross-section with |0⟩ at top, |1⟩ at
// bottom, and a state vector pointing at angle θ from the |0⟩ pole. This is the
// honest picture of a superposition — a definite direction, not "both at once".
function BlochCircle({
  cx,
  cy,
  r = 78,
  thetaDeg,
  showAmps = true,
}: {
  cx: number;
  cy: number;
  r?: number;
  thetaDeg: number;
  showAmps?: boolean;
}): ReactNode {
  const th = (thetaDeg * Math.PI) / 180; // from the |0⟩ (top) pole, clockwise
  // tip of the state vector on the circle
  const tx = cx + r * Math.sin(th);
  const ty = cy - r * Math.cos(th);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth={1.6} />
      {/* poles */}
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3 4" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--line)" strokeWidth={1} strokeOpacity={0.5} strokeDasharray="3 4" />
      <circle cx={cx} cy={cy - r} r={4} fill="var(--sem-data)" />
      <circle cx={cx} cy={cy + r} r={4} fill="var(--sem-control)" />
      {haloText({ x: cx, y: cy - r - 12, text: "|0⟩", size: 13, fill: "var(--sem-data)" })}
      {haloText({ x: cx, y: cy + r + 20, text: "|1⟩", size: 13, fill: "var(--sem-control)" })}
      {/* the state vector */}
      <line x1={cx} y1={cy} x2={tx} y2={ty} stroke={ACCENT} strokeWidth={2.6} markerEnd="url(#qc-arrow-accent)" />
      <circle cx={tx} cy={ty} r={4} fill={ACCENT} />
      {/* angle arc */}
      <path
        d={`M ${cx} ${cy - r * 0.4} A ${r * 0.4} ${r * 0.4} 0 0 1 ${cx + r * 0.4 * Math.sin(th)} ${cy - r * 0.4 * Math.cos(th)}`}
        fill="none"
        stroke="var(--tx3)"
        strokeWidth={1.4}
      />
      {haloText({ x: cx + 16, y: cy - r * 0.5, text: "θ", size: 12, fill: "var(--tx2)" })}
      {showAmps && haloText({ x: tx + (tx > cx ? 12 : -12), y: ty, text: "α|0⟩ + β|1⟩", size: 12, anchor: tx > cx ? "start" : "end", fill: ACCENT })}
    </g>
  );
}

// A pair of probability bars for outcomes 0 and 1, given |α|² and |β|².
function ProbBars({
  x,
  y,
  p0,
  p1,
  w = 150,
}: {
  x: number;
  y: number;
  p0: number;
  p1: number;
  w?: number;
}): ReactNode {
  const barH = 26;
  const gap = 16;
  const row = (label: string, p: number, tone: Tone, ry: number): ReactNode => {
    const color = toneColor(tone);
    return (
      <g key={label}>
        {haloText({ x: x - 8, y: ry + barH / 2 + 4, text: label, anchor: "end", size: 12, fill: color })}
        <rect x={x} y={ry} width={w} height={barH} rx={5} fill="var(--s2)" stroke="var(--line)" strokeWidth={1.2} />
        <rect x={x} y={ry} width={Math.max(3, w * p)} height={barH} rx={5} fill={`color-mix(in srgb, ${color} 32%, var(--s2))`} stroke={color} strokeWidth={1.4} />
        {haloText({ x: x + w + 8, y: ry + barH / 2 + 4, text: `${Math.round(p * 100)}%`, anchor: "start", size: 11.5, fill: color })}
      </g>
    );
  };
  return (
    <g>
      {row("0", p0, "data", y)}
      {row("1", p1, "control", y + barH + gap)}
      {haloText({ x: x + w / 2, y: y - 12, text: "outcome probabilities", size: 10.5, fill: "var(--tx2)" })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frames.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — a classical bit
  {
    caption:
      "A classical BIT is the simplest thing in computing: at any moment it is definitely 0 or definitely 1 — one of two states, nothing in between. Every transistor, file, and pixel is built from bits like this. Think of a coin lying flat on a table, showing exactly one face. Everything a normal computer does is shuffling these definite 0s and 1s.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Qubits · 1 — the classical bit" title="A bit is definitely 0 or 1" />
        <Coin cx={230} cy={190} r={46} value="0" tone="data" />
        <Coin cx={490} cy={190} r={46} value="1" tone="control" />
        {haloText({ x: 230, y: 262, text: "state 0", size: 12.5, fill: "var(--sem-data)" })}
        {haloText({ x: 490, y: 262, text: "state 1", size: 12.5, fill: "var(--sem-control)" })}
        {haloText({ x: VB_W / 2, y: 190, text: "OR", size: 15, fill: "var(--tx2)" })}
        {stageNote({ y: 320, text: "exactly one of two definite values — no in-between", tone: "data" })}
        {note("classical hardware only ever holds crisp 0s and 1s; a coin flat on the table shows one face.")}
      </g>
    ),
  },

  // 1 — a qubit in superposition
  {
    caption:
      "A QUBIT can be in a superposition: a specific blend written α|0⟩ + β|1⟩, where α and β are amplitudes (numbers, possibly negative or complex). Picture it as a definite direction on a circle whose poles are |0⟩ and |1⟩ — the tilt θ sets the blend. This is NOT the coin being 0 and 1 at the same time; it is a single, well-defined in-between state that has no classical counterpart.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Qubits · 2 — superposition" title="A qubit is a blend of 0 and 1" />
        <BlochCircle cx={210} cy={200} r={82} thetaDeg={58} />
        {/* a spinning coin as the intuitive twin of the Bloch picture */}
        <Coin cx={470} cy={200} r={46} squash={0.4} tone="accent" spinning />
        {haloText({ x: 470, y: 276, text: "a coin mid-spin", size: 12, fill: "var(--tx2)" })}
        <line x1={310} y1={200} x2={410} y2={200} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="4 4" markerEnd="url(#qc-arrow-accent)" />
        {haloText({ x: 360, y: 188, text: "same idea", size: 10, fill: "var(--tx3)" })}
        {haloText({ x: 560, y: 330, text: "|α|² + |β|² = 1", size: 12, fill: ACCENT })}
        {stageNote({ y: 328, text: "one definite in-between state — NOT literally both at once", tone: "accent" })}
        {note("α, β are amplitudes; the direction on the circle is exact — superposition is a real, single state.")}
      </g>
    ),
  },

  // 2 — measurement collapses it
  {
    caption:
      "You cannot read the amplitudes directly. The instant you MEASURE a qubit it COLLAPSES to a plain 0 or 1 — and you get 0 with probability |α|² and 1 with probability |β|². Here the tilt gives about 70% for 0 and 30% for 1. After the measurement the superposition is gone; you're left with an ordinary bit. Run it again from scratch and you might get the other outcome.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Qubits · 3 — measurement" title="Measuring collapses it to 0 or 1" />
        {/* before: the superposed state */}
        <BlochCircle cx={170} cy={196} r={72} thetaDeg={46} showAmps={false} />
        {haloText({ x: 170, y: 288, text: "before: α|0⟩ + β|1⟩", size: 11, fill: ACCENT })}
        {/* the measurement act */}
        <line x1={252} y1={196} x2={322} y2={196} stroke="var(--sem-err)" strokeWidth={2.2} markerEnd="url(#qc-arrow-err)" />
        {haloText({ x: 287, y: 182, text: "measure", size: 11, fill: "var(--sem-err)" })}
        {/* after: a collapsed definite bit + the probabilities that governed it */}
        <Coin cx={378} cy={196} r={42} value="0" tone="data" />
        {haloText({ x: 378, y: 260, text: "collapsed → 0", size: 11.5, fill: "var(--sem-data)" })}
        <ProbBars x={490} y={158} p0={0.7} p1={0.3} w={132} />
        {haloText({ x: 556, y: 250, text: "P(0)=|α|² · P(1)=|β|²", size: 10.5, fill: "var(--tx2)" })}
        {stageNote({ y: 324, text: "reading it forces one bit — probabilities |α|², |β|²", tone: "err" })}
        {note("collapse is one-way: after measuring you have a plain bit; the amplitudes are unrecoverable.")}
      </g>
    ),
  },

  // 3 — two entangled qubits
  {
    caption:
      "ENTANGLE two qubits and their outcomes become linked. In a state like (|00⟩ + |11⟩)/√2, each qubit alone looks random, but the two ALWAYS agree: measure one and you instantly know the other, however far apart they are. Crucially this is CORRELATION, not communication — the local result is random, so no message rides along. It cannot send information faster than light.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Qubits · 4 — entanglement" title="Two qubits, correlated outcomes" />
        {/* the joint entangled state */}
        <rect x={VB_W / 2 - 118} y={92} width={236} height={34} rx={9} fill={`color-mix(in srgb, var(--sem-data) 9%, var(--s2))`} stroke="var(--sem-data)" strokeWidth={1.4} />
        {haloText({ x: VB_W / 2, y: 114, text: "(|00⟩ + |11⟩) / √2", size: 13, fill: "var(--sem-data)" })}
        {/* qubit A measured → 1 */}
        <Coin cx={168} cy={214} r={40} value="1" tone="control" />
        {haloText({ x: 168, y: 274, text: "qubit A → 1", size: 11.5, fill: "var(--sem-control)" })}
        {/* qubit B forced to match */}
        <Coin cx={552} cy={214} r={40} value="1" tone="control" />
        {haloText({ x: 552, y: 274, text: "qubit B → 1 (matches)", size: 11.5, fill: "var(--sem-control)" })}
        {/* the correlation link (a wavy tie, labelled as correlation not signal) */}
        <path d={`M 210 214 C 300 176, 420 176, 510 214`} fill="none" stroke="var(--sem-data)" strokeWidth={2} strokeDasharray="6 5" markerEnd="url(#qc-arrow-data)" />
        {haloText({ x: VB_W / 2, y: 172, text: "outcomes always agree", size: 11.5, fill: "var(--sem-data)" })}
        {/* the honesty caption */}
        <rect x={VB_W / 2 - 176} y={296} width={352} height={26} rx={9} fill={`color-mix(in srgb, var(--sem-err) 8%, var(--s2))`} stroke="var(--sem-err)" strokeWidth={1.3} />
        {haloText({ x: VB_W / 2, y: 313, text: "correlation, not a signal — no faster-than-light comms", size: 11, fill: "var(--sem-err)" })}
        {stageNote({ y: 348, text: "measure one → the other is fixed, but nothing was sent", tone: "control" })}
        {note("each side looks random alone; the link shows only when you compare results afterward.")}
      </g>
    ),
  },

  // 4 — why it's narrow
  {
    caption:
      "So why isn't this just a faster laptop? Because the advantage is NARROW. Quantum computers speed up only special problems — factoring large numbers, simulating molecules, a handful of others — while most everyday tasks see no gain. And qubits are extraordinarily fragile: the tiniest disturbance destroys the superposition (decoherence), so real machines need massive quantum error correction. A powerful frontier tool, not a general-purpose replacement.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Qubits · 5 — reality check" title="Why the advantage is narrow" />
        {/* left panel: where it helps */}
        <rect x={54} y={92} width={286} height={196} rx={12} fill={`color-mix(in srgb, var(--sem-ok) 7%, var(--s2))`} stroke="var(--sem-ok)" strokeWidth={1.6} />
        {haloText({ x: 72, y: 116, text: "speed-ups only here", anchor: "start", size: 12, fill: "var(--sem-ok)" })}
        {["factoring big numbers", "simulating molecules", "certain search / optimisation"].map((t, k) => (
          <g key={k}>
            <circle cx={82} cy={148 + k * 34} r={5} fill="var(--sem-ok)" />
            {haloText({ x: 98, y: 152 + k * 34, text: t, anchor: "start", size: 11.5, fill: "var(--tx)" })}
          </g>
        ))}
        {haloText({ x: 72, y: 262, text: "everyday tasks: no gain", anchor: "start", size: 11, fill: "var(--tx3)" })}
        {/* right panel: fragility */}
        <rect x={380} y={92} width={286} height={196} rx={12} fill={`color-mix(in srgb, var(--sem-err) 7%, var(--s2))`} stroke="var(--sem-err)" strokeWidth={1.6} />
        {haloText({ x: 398, y: 116, text: "fragile — needs protection", anchor: "start", size: 12, fill: "var(--sem-err)" })}
        {/* a decohering qubit: circle with a broken state vector */}
        <circle cx={452} cy={188} r={44} fill="none" stroke="var(--line)" strokeWidth={1.4} strokeDasharray="4 5" />
        <line x1={452} y1={188} x2={452 + 44 * Math.sin(0.7)} y2={188 - 44 * Math.cos(0.7)} stroke="var(--sem-err)" strokeWidth={2.2} strokeDasharray="5 4" />
        {haloText({ x: 452, y: 250, text: "decoherence", size: 11, fill: "var(--sem-err)" })}
        {haloText({ x: 588, y: 168, text: "noise", size: 11, fill: "var(--tx3)" })}
        {[0, 1, 2].map((k) => (
          <path key={k} d={`M ${560 + k * 4} ${182 + k * 10} l 12 -6`} stroke="var(--sem-err)" strokeWidth={1.6} markerEnd="url(#qc-arrow-err)" fill="none" />
        ))}
        {haloText({ x: 566, y: 250, text: "→ error correction", anchor: "start", size: 11, fill: "var(--sem-err)" })}
        {stageNote({ y: 320, text: "special problems only · fragile qubits · heavy correction", tone: "control" })}
        {note("not a faster general computer — a frontier tool for a few problems, still fighting noise.")}
      </g>
    ),
  },
];

export default function QuantumCoin(): ReactNode {
  return (
    <FigureStepper
      title="A classical bit vs a qubit"
      figKey="quantum-coin"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
