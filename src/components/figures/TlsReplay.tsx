// [fig] tls-replay (ch.31) — replay the TLS 1.3 one-RTT handshake step by step
// and, for each step, name the crypto PRIMITIVE it leans on. The chapter's
// payoff: TLS is not a single trick but every primitive in ch.31, assembled —
// key agreement (ECDHE), authentication (signature), key derivation (HKDF),
// integrity (HMAC / AEAD tag) and symmetric AEAD. Each frame draws a Client and
// a Server, an arrow in the step's direction, the primitive it exercises, and
// the `ties` note linking it back to a ch.31 idea; a five-primitive legend
// highlights the one in play. EVERY label comes verbatim from the tested engine
// (TLS_STEPS / PRIMITIVE_LABEL / primitivesUsed in ../sims/crypto/tls-map.ts) —
// nothing is recomputed here. Stepped SVG (§6); never a GIF in-app. Prefix: tls-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import { TLS_STEPS, PRIMITIVE_LABEL, primitivesUsed } from "../sims/crypto/tls-map.ts";
import type { Primitive, TlsStep } from "../sims/crypto/tls-map.ts";
import "../../theme/_p9css/tls-replay.css";

const ACCENT = "#818CF8";

const VB_W = 700;
const VB_H = 420;

// The engine is the source of truth. Five primitives, in first-seen order.
const PRIMS: Primitive[] = primitivesUsed();

// One stable colour per primitive, drawn from the shared semantic palette so the
// legend, the arrow and the primitive chip always agree. The contextual accent
// carries key agreement (the handshake's opening move); the rest map to the
// palette's data/control/state/ok roles.
const PRIM_COLOR: Record<Primitive, string> = {
  "key-agreement": "var(--accent)",
  authentication: "var(--sem-control)",
  "key-derivation": "var(--sem-state)",
  integrity: "var(--sem-data)",
  aead: "var(--sem-ok)",
};

// A short chip label for the legend (the full label lives in the chip below).
const PRIM_SHORT: Record<Primitive, string> = {
  "key-agreement": "Key agreement",
  authentication: "Authentication",
  "key-derivation": "Key derivation",
  integrity: "Integrity",
  aead: "Symmetric AEAD",
};

// Column geometry — Client on the left, Server on the right, wire between.
const CLIENT_X = 60;
const SERVER_X = 470;
const BOX_W = 170;
const BOX_H = 78;
const BOX_Y = 96;
const WIRE_Y = BOX_Y + BOX_H / 2;
const WIRE_X1 = CLIENT_X + BOX_W;
const WIRE_X2 = SERVER_X;

// ---- small SVG primitives ----

function Defs(): ReactNode {
  return (
    <defs>
      {PRIMS.map((p) => (
        <marker
          key={p}
          id={`tls-head-${p}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" fill={PRIM_COLOR[p]} />
        </marker>
      ))}
    </defs>
  );
}

// A titled endpoint box (Client / Server), optionally emphasised when it is the
// active sender of the current step.
function Endpoint({
  x,
  title,
  sub,
  active,
  color,
}: {
  x: number;
  title: string;
  sub: string;
  active: boolean;
  color: string;
}): ReactNode {
  return (
    <g className={active ? "tls-node is-active" : "tls-node"} style={active ? { color } : undefined}>
      <rect x={x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={11} />
      <text x={x + BOX_W / 2} y={BOX_Y + 30} textAnchor="middle" className="tls-node-title">
        {title}
      </text>
      <text x={x + BOX_W / 2} y={BOX_Y + 52} textAnchor="middle" className="tls-node-sub">
        {sub}
      </text>
    </g>
  );
}

// The handshake wire with a directional message arrow for this step. `both`
// draws a double-ended arrow (shared computation, not a one-way message).
function Wire({ actor, color, primitive, name }: { actor: TlsStep["actor"]; color: string; primitive: Primitive; name: string }): ReactNode {
  const head = `url(#tls-head-${primitive})`;
  const mid = (WIRE_X1 + WIRE_X2) / 2;
  // client → left-to-right, server → right-to-left, both → double-headed.
  const start = actor === "server" ? WIRE_X2 : WIRE_X1;
  const end = actor === "server" ? WIRE_X1 : WIRE_X2;
  const markerStart = actor === "both" ? head : undefined;
  return (
    <g className="tls-wire" style={{ color }}>
      <line className="tls-wire-base" x1={WIRE_X1} y1={WIRE_Y} x2={WIRE_X2} y2={WIRE_Y} />
      <line
        className="tls-wire-msg"
        x1={start}
        y1={WIRE_Y}
        x2={end}
        y2={WIRE_Y}
        markerEnd={head}
        markerStart={markerStart}
      />
      <text x={mid} y={WIRE_Y - 14} textAnchor="middle" className="tls-wire-name">
        {name}
      </text>
      <text x={mid} y={WIRE_Y + 22} textAnchor="middle" className="tls-wire-dir">
        {actor === "both" ? "both sides compute locally" : actor === "client" ? "client → server" : "server → client"}
      </text>
    </g>
  );
}

// The prominent primitive chip: which crypto primitive this step relies on.
function PrimitiveChip({ primitive, color }: { primitive: Primitive; color: string }): ReactNode {
  return (
    <g className="tls-chip" style={{ color }}>
      <rect x={90} y={214} width={520} height={48} rx={12} />
      <text x={110} y={234} className="tls-chip-kicker">
        PRIMITIVE IN PLAY
      </text>
      <text x={110} y={252} className="tls-chip-label">
        {PRIMITIVE_LABEL[primitive]}
      </text>
    </g>
  );
}

// The `ties` note — the ch.31 idea this step exercises.
function TiesNote({ ties, color }: { ties: string; color: string }): ReactNode {
  return (
    <g className="tls-ties" style={{ color }}>
      <rect x={90} y={276} width={520} height={44} rx={10} />
      <text x={104} y={294} className="tls-ties-kicker">
        exercises (ch.31)
      </text>
      <text x={104} y={311} className="tls-ties-text">
        {ties}
      </text>
    </g>
  );
}

// The five-primitive legend, current one highlighted. Rendered along the bottom.
function Legend({ current }: { current: Primitive }): ReactNode {
  const cols = PRIMS.length;
  const pad = 26;
  const gap = 8;
  const cellW = (VB_W - pad * 2 - gap * (cols - 1)) / cols;
  const y = 338;
  return (
    <g className="tls-legend" role="list" aria-label="the five crypto primitives TLS assembles">
      <text x={pad} y={y - 10} className="tls-legend-title">
        TLS assembles all five primitives:
      </text>
      {PRIMS.map((p, i) => {
        const x = pad + i * (cellW + gap);
        const on = p === current;
        return (
          <g
            key={p}
            className={on ? "tls-leg is-on" : "tls-leg"}
            style={{ color: PRIM_COLOR[p] }}
            role="listitem"
            aria-current={on ? "step" : undefined}
          >
            <rect x={x} y={y} width={cellW} height={46} rx={9} />
            <circle className="tls-leg-swatch" cx={x + 15} cy={y + 18} r={6} />
            <text x={x + 28} y={y + 22} className="tls-leg-name">
              {PRIM_SHORT[p]}
            </text>
            <text x={x + 12} y={y + 39} className="tls-leg-count">
              {countFor(p)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// How many handshake steps lean on a given primitive (engine-derived).
function countFor(p: Primitive): string {
  const n = TLS_STEPS.filter((s) => s.primitive === p).length;
  return `${n} step${n === 1 ? "" : "s"}`;
}

// A step counter / progress pip row along the top.
function StepBadge({ step }: { step: TlsStep }): ReactNode {
  return (
    <g className="tls-badge" style={{ color: PRIM_COLOR[step.primitive] }}>
      <text x={26} y={34} className="tls-badge-kicker">
        TLS 1.3 · ONE-RTT HANDSHAKE
      </text>
      <text x={26} y={58} className="tls-badge-title">
        Step {step.n} of {TLS_STEPS.length} — {step.name}
      </text>
    </g>
  );
}

// One frame per handshake step.
function stepFrame(step: TlsStep): Frame {
  const color = PRIM_COLOR[step.primitive];
  const clientActive = step.actor === "client" || step.actor === "both";
  const serverActive = step.actor === "server" || step.actor === "both";
  const dir =
    step.actor === "both" ? "Both sides" : step.actor === "client" ? "Client → Server" : "Server → Client";
  return {
    caption: `Step ${step.n}/${TLS_STEPS.length} · ${step.name}. ${step.detail} ${dir}. Primitive: ${PRIMITIVE_LABEL[step.primitive]}. This exercises — ${step.ties}`,
    render: () => (
      <g>
        <Defs />
        <StepBadge step={step} />
        <Endpoint x={CLIENT_X} title="Client" sub="browser" active={clientActive} color={color} />
        <Endpoint x={SERVER_X} title="Server" sub="origin" active={serverActive} color={color} />
        <Wire actor={step.actor} color={color} primitive={step.primitive} name={step.name} />
        <PrimitiveChip primitive={step.primitive} color={color} />
        <TiesNote ties={step.ties} color={color} />
        <Legend current={step.primitive} />
      </g>
    ),
  };
}

const FRAMES: Frame[] = TLS_STEPS.map(stepFrame);

export default function TlsReplay(): ReactNode {
  return (
    <FigureStepper
      title="TLS 1.3 — every crypto primitive, assembled"
      figKey="tls-replay"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
