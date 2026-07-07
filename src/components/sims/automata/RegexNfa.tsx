// [micro] regex-nfa — type a regular expression, watch Thompson's construction
// compile it to an ε-NFA, then feed a test string and see the SET of live states
// light up at once. That simultaneous glow is the whole idea of nondeterminism:
// the machine is in every reachable state at the same time (all guesses run in
// parallel), and it accepts iff any live state is accepting. The footer runs
// subset construction on the fly, so you can watch NFA≡DFA — and the occasional
// blow-up when determinizing costs states. Reduced motion: Step consumes one
// symbol; the whole frame trace is precomputed by runNFA in model.ts.
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { regexToNFA, runNFA, subsetConstruction, type NFA } from "./model.ts";
import "../../../theme/_p5css/regex-nfa.css";

const ACCENT = "#2DD4BF";

// --- layout constants (SVG units; the viewBox scales to width="100%") ---
const NODE_R = 17;
const X_GAP = 118; // horizontal distance between layers
const Y_GAP = 82; // vertical distance between rows in a layer
const PAD_X = 34;
const PAD_Y = 30;
const EPS = "ε";

type Pt = { x: number; y: number };

type Placed = {
  nfa: NFA;
  pos: Record<string, Pt>;
  edges: PlacedEdge[];
  width: number;
  height: number;
};

type EdgeKind = "fwd" | "back" | "self";

type PlacedEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  isEps: boolean;
  kind: EdgeKind;
  d: string; // SVG path
  lx: number; // label position
  ly: number;
};

// Deterministic layer = shortest edge-distance from start (BFS over ε + symbol
// edges alike). Any state the BFS never reaches (shouldn't happen for a Thompson
// NFA, but we never assume) is parked in a trailing layer so nothing is dropped.
function layerOf(nfa: NFA): Record<string, number> {
  const adj: Record<string, string[]> = {};
  for (const s of nfa.states) {
    const outs: string[] = [];
    const row = nfa.delta[s] ?? {};
    for (const sym of Object.keys(row)) for (const t of row[sym]) outs.push(t);
    adj[s] = outs;
  }
  const layer: Record<string, number> = {};
  const queue: string[] = [];
  if (nfa.states.includes(nfa.start)) {
    layer[nfa.start] = 0;
    queue.push(nfa.start);
  }
  while (queue.length) {
    const s = queue.shift() as string;
    for (const t of adj[s] ?? []) {
      if (layer[t] === undefined) {
        layer[t] = layer[s] + 1;
        queue.push(t);
      }
    }
  }
  let extra = Object.values(layer).reduce((m, v) => Math.max(m, v), 0) + 1;
  for (const s of nfa.states) if (layer[s] === undefined) layer[s] = extra++;
  return layer;
}

// Stable within-layer order: Thompson states are named n0,n1,… so sort by that
// numeric id (falls back to string compare for anything unexpected).
function stateOrder(a: string, b: string): number {
  const na = Number(a.replace(/\D/g, ""));
  const nb = Number(b.replace(/\D/g, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}

function layout(nfa: NFA): Placed {
  const layer = layerOf(nfa);
  const byLayer = new Map<number, string[]>();
  for (const s of nfa.states) {
    const L = layer[s];
    const arr = byLayer.get(L) ?? [];
    arr.push(s);
    byLayer.set(L, arr);
  }
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const maxRows = layers.reduce((m, L) => Math.max(m, (byLayer.get(L) ?? []).length), 1);
  const height = PAD_Y * 2 + (maxRows - 1) * Y_GAP + NODE_R * 2;
  const midY = height / 2;

  const pos: Record<string, Pt> = {};
  for (const L of layers) {
    const col = (byLayer.get(L) ?? []).slice().sort(stateOrder);
    const span = (col.length - 1) * Y_GAP;
    col.forEach((s, r) => {
      pos[s] = { x: PAD_X + NODE_R + L * X_GAP, y: midY - span / 2 + r * Y_GAP };
    });
  }
  const maxLayer = layers[layers.length - 1] ?? 0;
  const width = PAD_X * 2 + NODE_R * 2 + maxLayer * X_GAP;

  // Build edges. Fan-outs from one source and multiple back-edges get their curve
  // nudged by an index so arrowheads and labels don't stack on the same pixels.
  const backSeen: Record<string, number> = {};
  const outSeen: Record<string, number> = {};
  const edges: PlacedEdge[] = [];
  for (const s of nfa.states) {
    const row = nfa.delta[s] ?? {};
    for (const sym of Object.keys(row)) {
      for (const t of row[sym]) {
        const isEps = sym === "";
        const label = isEps ? EPS : sym;
        const p = pos[s];
        const q = pos[t];
        if (!p || !q) continue;
        let kind: EdgeKind = "fwd";
        if (s === t) kind = "self";
        else if (layer[t] <= layer[s]) kind = "back";
        const oi = outSeen[s] ?? 0;
        outSeen[s] = oi + 1;
        let geo: { d: string; lx: number; ly: number };
        if (kind === "self") {
          geo = selfPath(p);
        } else if (kind === "back") {
          const bi = backSeen[s] ?? 0;
          backSeen[s] = bi + 1;
          geo = curvedPath(p, q, bi);
        } else {
          // forward: gently bow multi-edges out of the same source so parallel
          // ε-branches (union/star split) read as two distinct arrows.
          geo = straightOrBowed(p, q, oi, (row[sym]?.length ?? 1) + Object.keys(row).length);
        }
        edges.push({
          id: `${s}-${sym}-${t}-${edges.length}`,
          from: s,
          to: t,
          label,
          isEps,
          kind,
          d: geo.d,
          lx: geo.lx,
          ly: geo.ly,
        });
      }
    }
  }
  return { nfa, pos, edges, width, height };
}

// unit vector p→q
function unit(p: Pt, q: Pt): { ux: number; uy: number; len: number } {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len, len };
}

// Forward edge: straight if it's the lone edge, otherwise a shallow arc so two
// arrows leaving the same node separate. `fanHint` scales the bow a touch.
function straightOrBowed(p: Pt, q: Pt, idx: number, fanHint: number): { d: string; lx: number; ly: number } {
  const { ux, uy } = unit(p, q);
  const sx = p.x + ux * NODE_R;
  const sy = p.y + uy * NODE_R;
  const ex = q.x - ux * (NODE_R + 5);
  const ey = q.y - uy * (NODE_R + 5);
  if (fanHint <= 2 && idx === 0) {
    return { d: `M ${sx} ${sy} L ${ex} ${ey}`, lx: (sx + ex) / 2, ly: (sy + ey) / 2 - 6 };
  }
  const nx = -uy;
  const ny = ux;
  const bow = (idx % 2 === 0 ? 1 : -1) * (16 + 10 * Math.floor(idx / 2));
  const mx = (sx + ex) / 2 + nx * bow;
  const my = (sy + ey) / 2 + ny * bow;
  return {
    d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
    lx: mx,
    ly: my - 3,
  };
}

// Back/same-layer edge: a pronounced arc that bows above the row, so star
// loop-backs never lie on top of the forward chain.
function curvedPath(p: Pt, q: Pt, idx: number): { d: string; lx: number; ly: number } {
  const { ux, uy } = unit(p, q);
  const sx = p.x - ux * NODE_R;
  const sy = p.y - uy * NODE_R;
  const ex = q.x + ux * (NODE_R + 5);
  const ey = q.y + uy * (NODE_R + 5);
  const nx = -uy;
  const ny = ux;
  const lift = 46 + idx * 26;
  // bow toward the top of the diagram (negative y) for legibility
  const dir = ny <= 0 ? 1 : -1;
  const mx = (sx + ex) / 2 + nx * lift * dir;
  const my = (sy + ey) / 2 + ny * lift * dir - 8;
  return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`, lx: mx, ly: my - 2 };
}

// Self-loop: a small circle-ish arc riding above the node.
function selfPath(p: Pt): { d: string; lx: number; ly: number } {
  const sx = p.x - NODE_R * 0.6;
  const sy = p.y - NODE_R * 0.8;
  const ex = p.x + NODE_R * 0.6;
  const ey = p.y - NODE_R * 0.8;
  const top = p.y - NODE_R - 30;
  return { d: `M ${sx} ${sy} C ${p.x - 30} ${top} ${p.x + 30} ${top} ${ex} ${ey}`, lx: p.x, ly: top - 3 };
}

export default function RegexNfa() {
  const reduced = useReducedMotion();
  const [regex, setRegex] = useState("(a|b)*abb");
  const [test, setTest] = useState("aabb");
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // guard empty regex: fall back to ε so the engine (which never throws) still
  // yields a tiny 2-state machine instead of an empty stage.
  const effectiveRe = regex.length > 0 ? regex : "";
  const nfa = useMemo(() => regexToNFA(effectiveRe), [effectiveRe]);
  const placed = useMemo(() => layout(nfa), [nfa]);
  const dfa = useMemo(() => subsetConstruction(nfa), [nfa]);
  const runResult = useMemo(() => runNFA(nfa, test), [nfa, test]);

  const frames = runResult.frames; // frames[k] = ε-closed live set after k symbols
  const lastFrame = frames.length - 1; // = test.length
  const step = Math.min(i, lastFrame);
  const atEnd = step >= lastFrame;

  useSimClock(running, 1.3 * speed, () => {
    setI((x) => {
      if (x >= lastFrame) {
        setRunning(false);
        return lastFrame;
      }
      return x + 1;
    });
  });

  const liveSet = useMemo(() => new Set(frames[step] ?? []), [frames, step]);
  const accepting = new Set(nfa.accept);
  const anyAccepting = (frames[step] ?? []).some((s) => accepting.has(s));

  const nStates = nfa.states.length;
  const nEdges = placed.edges.length;
  const mStates = dfa.states.length;

  function reset(): void {
    setRunning(false);
    setI(0);
  }
  function onToggle(): void {
    if (running) {
      setRunning(false);
    } else {
      setI(0);
      setRunning(true);
    }
  }
  function onStep(): void {
    setRunning(false);
    setI((x) => Math.min(lastFrame, x + 1));
  }
  function onRegex(next: string): void {
    setRegex(next);
    setRunning(false);
    setI(0);
  }
  function onTest(next: string): void {
    setTest(next);
    setRunning(false);
    setI(0);
  }

  // status line: narrate the live-set size per step, then the verdict.
  const consumed = test.slice(0, step);
  const verdict = anyAccepting
    ? `ACCEPT — a live state is accepting`
    : `REJECT — no live state is accepting`;
  const status =
    test.length === 0
      ? `Empty test string. ${liveSet.size} live state(s) after ε-closure of the start — ${anyAccepting ? "ACCEPT" : "REJECT"}.`
      : atEnd
        ? `Consumed "${test}" · ${liveSet.size} live state(s) · ${verdict}.`
        : step === 0
          ? `Start: ${liveSet.size} live state(s) (ε-closure of start). ${reduced ? "Step" : "Play or Step"} to feed "${test}".`
          : `After "${consumed}" (${step}/${test.length}) · ${liveSet.size} states live in parallel.`;

  const detNote =
    mStates > nStates
      ? `M > N: determinizing this NFA costs states (subset blow-up).`
      : `M ≤ N: here the DFA is no larger than the NFA.`;

  return (
    <SimShell
      title="Regex → ε-NFA — watch the parallel live-state set (Thompson's construction)"
      simKey="regex-nfa"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <div className="rx-ctl" style={rowStyle}>
          <label className="ss-field">
            regex
            <input
              type="text"
              value={regex}
              onChange={(e) => onRegex(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Regular expression (literals, | union, * star, + plus, ? optional, () groups)"
              placeholder="(a|b)*abb"
              style={monoInput(150)}
            />
          </label>
          <label className="ss-field">
            test string
            <input
              type="text"
              value={test}
              onChange={(e) => onTest(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Test string to run through the NFA"
              placeholder="aabb"
              style={monoInput(110)}
            />
          </label>
        </div>
      }
      footer={
        <div className="rx-foot" style={footStyle}>
          <div className="rx-readout" role="status" style={readoutStyle}>
            <span style={statPill}>
              <b style={{ color: "var(--tx)" }}>NFA</b> {nStates} states, {nEdges} edges
            </span>
            <span style={statPill}>
              <b style={{ color: "var(--tx)" }}>equivalent DFA</b> (subset construction): {mStates} states
            </span>
            <span
              style={{
                ...noteStyle,
                color: mStates > nStates ? "var(--sem-err)" : "var(--tx2)",
              }}
            >
              {detNote}
            </span>
          </div>
          <div className="rx-legend" aria-hidden="true" style={legendStyle}>
            <span style={legItem}>
              <i style={swatch("var(--sem-control)")} /> live (parallel)
            </span>
            <span style={legItem}>
              <i style={swatch("var(--sem-state)")} /> start
            </span>
            <span style={legItem}>
              <i style={ringSwatch("var(--sem-ok)")} /> accept
            </span>
            <span style={legItem}>
              <i style={dashSwatch()} /> ε edge
            </span>
          </div>
        </div>
      }
    >
      <div className="rx-stage">
        {/* input tape: the symbols consumed so far vs. remaining */}
        {test.length > 0 && (
          <div className="rx-tape" role="group" aria-label="Input tape" style={tapeStyle}>
            {test.split("").map((ch, k) => {
              const past = k < step;
              const isCurrent = k === step - 1 && step > 0;
              return (
                <span
                  key={k}
                  className="rx-tape-cell"
                  style={tapeCell(past, isCurrent)}
                  aria-label={
                    isCurrent
                      ? `symbol ${k + 1} of ${test.length}, ${ch}, just consumed`
                      : `symbol ${k + 1}, ${ch}`
                  }
                >
                  {ch}
                </span>
              );
            })}
          </div>
        )}

        <svg
          viewBox={`0 0 ${Math.round(placed.width)} ${Math.round(placed.height)}`}
          width="100%"
          className="rx-svg"
          role="img"
          aria-label={`Thompson epsilon-NFA for regex ${effectiveRe || "empty"}: ${nStates} states, ${nEdges} edges; ${liveSet.size} state(s) currently live after consuming ${step} of ${test.length} symbols; ${anyAccepting ? "a live state is accepting" : "no live state is accepting"}.`}
          style={{ minWidth: Math.min(placed.width, 560) }}
        >
          <defs>
            <marker
              id="rx-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tx2)" />
            </marker>
            <marker
              id="rx-arrow-eps"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--tx3)" />
            </marker>
          </defs>

          {/* edges under nodes */}
          {placed.edges.map((e) => (
            <g key={e.id} className="rx-edge">
              <path
                d={e.d}
                fill="none"
                stroke={e.isEps ? "var(--tx3)" : "var(--line)"}
                strokeWidth={e.isEps ? 1.4 : 1.8}
                strokeDasharray={e.isEps ? "4 3" : undefined}
                markerEnd={e.isEps ? "url(#rx-arrow-eps)" : "url(#rx-arrow)"}
                opacity={0.9}
              />
              <text
                className="rx-edge-label"
                x={e.lx}
                y={e.ly}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fill: e.isEps ? "var(--tx3)" : "var(--sem-data)",
                  fontStyle: e.isEps ? "italic" : "normal",
                }}
              >
                {e.label}
              </text>
            </g>
          ))}

          {/* start-arrow stub pointing into the start state */}
          {placed.pos[nfa.start] && (
            <line
              x1={placed.pos[nfa.start].x - NODE_R - 18}
              y1={placed.pos[nfa.start].y}
              x2={placed.pos[nfa.start].x - NODE_R - 3}
              y2={placed.pos[nfa.start].y}
              stroke="var(--sem-state)"
              strokeWidth={2}
              markerEnd="url(#rx-arrow)"
            />
          )}

          {/* nodes */}
          {nfa.states.map((s) => {
            const p = placed.pos[s];
            if (!p) return null;
            const live = liveSet.has(s);
            const isStart = s === nfa.start;
            const isAccept = accepting.has(s);
            const fill = live
              ? "var(--sem-control)"
              : isStart
                ? "color-mix(in srgb, var(--sem-state) 22%, var(--surface))"
                : "var(--s2)";
            const stroke = live
              ? "var(--sem-control)"
              : isAccept
                ? "var(--sem-ok)"
                : isStart
                  ? "var(--sem-state)"
                  : "var(--line)";
            const textFill = live ? "#0b0d0f" : "var(--tx2)";
            return (
              <g
                key={s}
                className="rx-node-group"
                opacity={live || step === 0 ? 1 : 0.5}
                aria-hidden="true"
              >
                {/* accept states get a double ring */}
                {isAccept && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={NODE_R + 3.5}
                    fill="none"
                    stroke={live ? "var(--sem-control)" : "var(--sem-ok)"}
                    strokeWidth={1.4}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={NODE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={live ? 2.4 : 1.6}
                  className={cx("rx-node-ring", live && !reduced && "is-live")}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fill: textFill,
                    fontWeight: live ? 700 : 500,
                  }}
                >
                  {s}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </SimShell>
  );
}

// ---- inline style helpers (kept out of shared CSS) ----
const rowStyle: CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" };

function monoInput(w: number): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    width: w,
    padding: "5px 8px",
    background: "var(--surface)",
    color: "var(--tx)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-s)",
  };
}

const tapeStyle: CSSProperties = {
  display: "flex",
  gap: 4,
  padding: "8px 2px 12px",
  flexWrap: "wrap",
};

function tapeCell(past: boolean, current: boolean): CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 15,
    minWidth: 22,
    textAlign: "center",
    padding: "4px 6px",
    borderRadius: "var(--r-s)",
    border: `1px solid ${current ? "var(--sem-control)" : past ? "var(--line)" : "var(--line)"}`,
    background: current ? "var(--sem-control)" : past ? "var(--s2)" : "var(--surface)",
    color: current ? "#0b0d0f" : past ? "var(--tx2)" : "var(--tx3)",
    fontWeight: current ? 700 : 400,
  };
}

const footStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const readoutStyle: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" };
const statPill: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--tx2)",
  padding: "3px 8px",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-s)",
};
const noteStyle: CSSProperties = { fontSize: 12, fontStyle: "italic" };

const legendStyle: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" };
const legItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11.5,
  color: "var(--tx3)",
};
function swatch(color: string): CSSProperties {
  return { width: 12, height: 12, borderRadius: 999, background: color, display: "inline-block" };
}
function ringSwatch(color: string): CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "transparent",
    border: `2px solid ${color}`,
    display: "inline-block",
  };
}
function dashSwatch(): CSSProperties {
  return {
    width: 14,
    height: 0,
    borderTop: "1.5px dashed var(--tx3)",
    display: "inline-block",
  };
}
