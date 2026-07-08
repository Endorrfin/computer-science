// [fig] defense-layers (ch.32) — defense in depth, told as one attacker's walk
// toward the "crown jewels" (user data at the centre) through concentric rings
// of INDEPENDENT controls. The teaching payoff: a system is only as strong as
// its layers. When every ring holds, the attacker is stopped at the outer wall.
// But knock out ONE ring — here parameterized queries, the control that would
// have neutralised an injection — and that single gap is the whole breach: the
// attacker walks past it and reaches the data, no matter how sound the other
// rings are. Layer independent controls so no single failure is fatal.
//
// This is a NARRATIVE figure: there is no separate engine, so the (deterministic)
// scenario — the ring order, which ring is missing, and how far the attacker has
// advanced in each frame — is defined inline below and never recomputed. The
// attacker's inward motion is gated behind prefers-reduced-motion via CSS (the
// step state is always the fallback); FigureStepper handles the transport.
// Stepped SVG (§6); never a GIF in-app. Prefix: def-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import "../../theme/_p9css/defense-layers.css";

const ACCENT = "#818CF8";

const VB_W = 720;
const VB_H = 484;

// Centre of the ring system (the crown jewels sit here).
const CX = 250;
const CY = 230;

// ---------------------------------------------------------------------------
// The scenario — deterministic, inline (no engine for a narrative figure).
// Rings are listed OUTER → INNER; index 0 is the outermost wall, and the data
// core lives just inside the innermost ring. Each ring has a mono label and a
// one-line note describing the control it enforces.
// ---------------------------------------------------------------------------
type Layer = {
  name: string; // mono label on the ring
  guards: string; // what this control stops (shown when the attacker meets it)
};

const LAYERS: readonly Layer[] = [
  { name: "input validation", guards: "rejects malformed / oversized input at the edge" },
  { name: "authentication", guards: "proves who the caller is before anything runs" },
  { name: "authorization", guards: "checks this caller may touch this resource" },
  { name: "parameterized queries", guards: "separates code from data — injection can’t execute" },
  { name: "encryption at rest", guards: "stolen bytes are ciphertext without the key" },
  { name: "logging / monitoring", guards: "flags the anomaly so responders can act" },
] as const;

// The ONE ring that is missing in this scenario: parameterized queries. An app
// that concatenates user input into SQL has left exactly this gap, so an
// injection payload runs and the attacker slips straight through.
const MISSING = 3; // index into LAYERS
const N = LAYERS.length;

// Ring radii, outer → inner. Evenly spaced bands with a data core at the middle.
const R_OUTER = 200;
const R_STEP = 27;
const RINGS: readonly number[] = LAYERS.map((_, i) => R_OUTER - i * R_STEP);
const R_CORE = R_OUTER - N * R_STEP + 8; // the crown-jewels disc

// Depth 0 = outside the outer wall; depth k (1..N) = just inside ring k-1;
// depth N+1 = at the data core. The attacker marker rides the attack ray at the
// radius for its current depth.
const DEPTH_OUTSIDE = 0;
const DEPTH_CORE = N + 1;

function radiusAtDepth(depth: number): number {
  if (depth <= DEPTH_OUTSIDE) return R_OUTER + 34; // waiting outside the wall
  if (depth >= DEPTH_CORE) return 0; // dead centre
  // between ring (depth-1) and ring depth → sit just inside ring (depth-1)
  return RINGS[depth - 1] - R_STEP / 2;
}

// ---------------------------------------------------------------------------
// SVG primitives.
// ---------------------------------------------------------------------------

// A ring's visual state for a given frame.
type RingState = "pending" | "intact" | "breached" | "focus";

function ringColor(state: RingState): string {
  switch (state) {
    case "intact":
      return "var(--sem-ok)"; // green — this control is holding
    case "focus":
      return "var(--sem-ok)"; // green, emphasised (the attacker is testing it)
    case "breached":
      return "var(--sem-err)"; // red — the missing / broken ring
    case "pending":
      return "var(--tx3)"; // muted — not yet reached in the walk
  }
}

// One concentric defense ring. `broken` renders it dashed + red (the gap the
// attacker exploits); `focus` gives it an emphasised glow.
function Ring({ r, label, state }: { r: number; label: string; state: RingState }): ReactNode {
  const color = ringColor(state);
  const broken = state === "breached";
  const cls =
    state === "focus"
      ? "def-ring is-focus"
      : state === "breached"
        ? "def-ring is-breached"
        : state === "intact"
          ? "def-ring is-intact"
          : "def-ring is-pending";
  // Label sits on the top arc of the ring, centred above the core.
  const labelY = CY - r + 4;
  return (
    <g className={cls} fontFamily="var(--font-mono)">
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={broken ? 3 : 2.25}
        strokeDasharray={broken ? "7 8" : undefined}
      />
      {/* a small chip carrying the mono ring name, seated on the top arc */}
      <rect
        className="def-ring-chip"
        x={CX - label.length * 3.35 - 7}
        y={labelY - 11}
        width={label.length * 6.7 + 14}
        height={16}
        rx={8}
      />
      <text x={CX} y={labelY} textAnchor="middle" className="def-ring-lbl" style={{ fill: color }}>
        {label}
      </text>
    </g>
  );
}

// The crown-jewels core: the user data the whole system exists to protect.
function DataCore({ breached }: { breached: boolean }): ReactNode {
  const color = breached ? "var(--sem-err)" : "var(--accent)";
  return (
    <g className={breached ? "def-core is-breached" : "def-core"} fontFamily="var(--font-mono)">
      <circle cx={CX} cy={CY} r={R_CORE} fill="none" stroke={color} strokeWidth={2.5} />
      <text x={CX} y={CY - 3} textAnchor="middle" className="def-core-lbl" style={{ fill: color }}>
        DATA
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" className="def-core-sub">
        crown jewels
      </text>
    </g>
  );
}

// The attacker marker riding the attack ray. It approaches along a fixed bearing
// (up-left → centre); `reached` flips it red once it has touched the core.
const RAY_DX = -1;
const RAY_DY = -1;
const RAY_LEN = Math.hypot(RAY_DX, RAY_DY);
const UX = RAY_DX / RAY_LEN;
const UY = RAY_DY / RAY_LEN;

function attackerPoint(depth: number): { x: number; y: number } {
  const r = radiusAtDepth(depth);
  return { x: CX + UX * r, y: CY + UY * r };
}

function Attacker({ depth, reached }: { depth: number; reached: boolean }): ReactNode {
  const { x, y } = attackerPoint(depth);
  // The dashed attack ray from far outside down to the attacker's current point.
  const start = attackerPoint(DEPTH_OUTSIDE);
  return (
    <g className={reached ? "def-attacker is-in" : "def-attacker"} fontFamily="var(--font-mono)">
      <line className="def-ray" x1={start.x} y1={start.y} x2={x} y2={y} />
      <circle className="def-atk-dot" cx={x} cy={y} r={9} />
      <text x={x} y={y + 3.5} textAnchor="middle" className="def-atk-glyph">
        ⚿
      </text>
      <text x={x} y={y - 15} textAnchor="middle" className="def-atk-lbl">
        attacker
      </text>
    </g>
  );
}

// The right-hand panel: a compact stack of ring status pills so the reader can
// track, per frame, which controls held and which one is the gap.
function StatusPanel({
  reachedDepth,
  breached,
}: {
  reachedDepth: number;
  breached: boolean;
}): ReactNode {
  const PX = 500;
  const PY = 70;
  const rowH = 34;
  return (
    <g fontFamily="var(--font-mono)">
      <text x={PX} y={PY - 20} className="def-panel-title">
        defense in depth
      </text>
      <text x={PX} y={PY - 4} className="def-panel-sub">
        outer wall → data core
      </text>
      {LAYERS.map((layer, i) => {
        // Three mutually-exclusive per-ring states, driven straight from the
        // attacker's depth (ring i is "passed" once depth is beyond i+1).
        const isMissing = i === MISSING && breached;
        const isHere = !isMissing && reachedDepth === i + 1;
        const isPassed = !isMissing && reachedDepth > i + 1;
        const y = PY + i * rowH;
        const glyph = isMissing ? "✕" : isPassed ? "→" : isHere ? "◉" : "●";
        const glyphColor = isMissing
          ? "var(--sem-err)"
          : isPassed
            ? "var(--sem-control)"
            : "var(--sem-ok)";
        const boxCls = isMissing
          ? "def-pill-box is-gap"
          : isHere
            ? "def-pill-box is-focus"
            : isPassed
              ? "def-pill-box is-passed"
              : "def-pill-box";
        return (
          <g key={i} className="def-pill">
            <rect x={PX} y={y} width={190} height={26} rx={6} className={boxCls} />
            <text x={PX + 14} y={y + 17} textAnchor="middle" fontSize="12" fontWeight={700} style={{ fill: glyphColor }}>
              {glyph}
            </text>
            <text x={PX + 28} y={y + 17} fontSize="10.5" className={isMissing ? "def-pill-lbl is-gap" : "def-pill-lbl"}>
              {layer.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function note(text: string): ReactNode {
  return (
    <text x={26} y={474} fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx2)">
      {text}
    </text>
  );
}

// Build the full ring stack for a frame. `depth` is the attacker's current depth;
// `breached` toggles whether the missing ring is drawn as a gap yet.
function ringStack(depth: number, breached: boolean): ReactNode {
  return (
    <g>
      {LAYERS.map((layer, i) => {
        const isMissing = i === MISSING && breached;
        // The ring the attacker is currently pressing against gets the focus glow.
        const isFocus = depth === i + 1 && !isMissing;
        const state: RingState = isMissing ? "breached" : isFocus ? "focus" : "intact";
        return <Ring key={i} r={RINGS[i]} label={layer.name} state={state} />;
      })}
    </g>
  );
}

// A small caption chip drawn beneath the rings inside the SVG, restating the
// single most important beat of the frame in mono.
function stageNote({
  x,
  y,
  text,
  tone,
}: {
  x: number;
  y: number;
  text: string;
  tone: "ok" | "control" | "err";
}): ReactNode {
  const color = tone === "ok" ? "var(--sem-ok)" : tone === "err" ? "var(--sem-err)" : "var(--sem-control)";
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="12.5" fontFamily="var(--font-mono)" fontWeight={700} style={{ fill: color }}>
      {text}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Frames — the attacker's walk, one ring per beat.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — all rings present; attacker stopped at the wall. Defense in depth works.
  {
    caption:
      "Defense in depth: the data at the centre — the crown jewels — is wrapped in concentric, INDEPENDENT controls. Right now every ring holds, so the attacker is stopped dead at the outer wall. To reach the data they would have to defeat all six in turn, and each one is a separate line of defense.",
    render: () => (
      <g>
        {ringStack(DEPTH_OUTSIDE, false)}
        <DataCore breached={false} />
        <Attacker depth={DEPTH_OUTSIDE} reached={false} />
        <StatusPanel reachedDepth={DEPTH_OUTSIDE} breached={false} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: "all layers intact — stopped at the wall", tone: "ok" })}
        {note("a system is only as strong as its layers — one attacker, six chances to be stopped.")}
      </g>
    ),
  },

  // 1 — input validation would reject the payload.
  {
    caption: `Ring 1 — ${LAYERS[0].name}. Malformed or oversized input never makes it past the edge: the control ${LAYERS[0].guards}. In a healthy system the attacker is turned away here, long before their payload can touch anything that matters.`,
    render: () => (
      <g>
        {ringStack(1, false)}
        <DataCore breached={false} />
        <Attacker depth={1} reached={false} />
        <StatusPanel reachedDepth={1} breached={false} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: `layer 1 · ${LAYERS[0].name} — holds`, tone: "ok" })}
        {note(`${LAYERS[0].name}: ${LAYERS[0].guards}.`)}
      </g>
    ),
  },

  // 2 — authentication would demand proof of identity.
  {
    caption: `Ring 2 — ${LAYERS[1].name}. Even a well-formed request must prove who is behind it: this ring ${LAYERS[1].guards}. An anonymous or forged caller is rejected, so the attacker still cannot advance.`,
    render: () => (
      <g>
        {ringStack(2, false)}
        <DataCore breached={false} />
        <Attacker depth={2} reached={false} />
        <StatusPanel reachedDepth={2} breached={false} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: `layer 2 · ${LAYERS[1].name} — holds`, tone: "ok" })}
        {note(`${LAYERS[1].name}: ${LAYERS[1].guards}.`)}
      </g>
    ),
  },

  // 3 — authorization would deny access to this resource.
  {
    caption: `Ring 3 — ${LAYERS[2].name}. Being logged in is not the same as being allowed: this ring ${LAYERS[2].guards}. A valid account with no rights to the data is denied here — another independent barrier the attacker must beat.`,
    render: () => (
      <g>
        {ringStack(3, false)}
        <DataCore breached={false} />
        <Attacker depth={3} reached={false} />
        <StatusPanel reachedDepth={3} breached={false} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: `layer 3 · ${LAYERS[2].name} — holds`, tone: "ok" })}
        {note(`${LAYERS[2].name}: ${LAYERS[2].guards}.`)}
      </g>
    ),
  },

  // 4 — the MISSING ring: parameterized queries. The attacker slips through.
  {
    caption: `Ring 4 should be ${LAYERS[MISSING].name} — the control that ${LAYERS[MISSING].guards}. But THIS system builds SQL by concatenating user input, so that ring is missing (drawn red and broken). The injection payload is treated as code and runs. With no barrier here, the attacker walks straight through the gap.`,
    render: () => (
      <g>
        {ringStack(4, true)}
        <DataCore breached={false} />
        <Attacker depth={4} reached={false} />
        <StatusPanel reachedDepth={4} breached={true} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: `layer 4 · ${LAYERS[MISSING].name} — MISSING`, tone: "err" })}
        {note(`the one gap: no ${LAYERS[MISSING].name} → the injection executes and the ring is bypassed.`)}
      </g>
    ),
  },

  // 5 — past the gap, the remaining inner rings can't save the data.
  {
    caption: `Past the gap, the inner rings — ${LAYERS[4].name} and ${LAYERS[5].name} — are real controls, but they were never meant to stop this. Encryption protects data on disk from theft, not a query the app itself is authorised to run; monitoring may record the breach but does not block it. The attacker is now inside the last ring.`,
    render: () => (
      <g>
        {ringStack(N, true)}
        <DataCore breached={false} />
        <Attacker depth={N} reached={false} />
        <StatusPanel reachedDepth={N} breached={true} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: "inner rings guard other threats — not this one", tone: "control" })}
        {note(`${LAYERS[4].name} & ${LAYERS[5].name} guard different threats — they can’t close someone else’s gap.`)}
      </g>
    ),
  },

  // 6 — breach: the attacker reaches the data. The closing lesson.
  {
    caption:
      "Breach. One missing ring — parameterized queries — was the whole breach: the attacker reached the crown jewels not because five other controls failed, but because ONE did. A chain is as strong as its weakest link. Layer INDEPENDENT controls, so that no single failure is fatal — and treat every ring as load-bearing, because to an attacker, the gap is the only ring that matters.",
    render: () => (
      <g>
        {ringStack(DEPTH_CORE, true)}
        <DataCore breached={true} />
        <Attacker depth={DEPTH_CORE} reached={true} />
        <StatusPanel reachedDepth={DEPTH_CORE} breached={true} />
        {stageNote({ x: CX, y: CY + R_OUTER + 26, text: "one missing layer = the whole breach", tone: "err" })}
        {note("layer independent controls so no single failure is fatal — the gap is the only ring that matters.")}
      </g>
    ),
  },
];

export default function DefenseLayers(): ReactNode {
  return (
    <FigureStepper
      title="Defense in depth — one missing layer is the whole breach"
      figKey="defense-layers"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
