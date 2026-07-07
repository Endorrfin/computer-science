// [micro] fsm-builder — ch.19. Assemble a DFA over {0,1} on an SVG canvas, then
// TEST a string: the transport walks runDFA's `visited` trail, lighting the
// current state (orange), and at the end paints the machine's verdict green
// (accept) or red (reject) — or flags "stuck" if a transition was missing.
// Challenge: build a DFA for binary-divisible-by-3. `check` calls
// firstCounterexample against the true language up to length 10 — a real proof
// for a machine this small — and either verifies it or hands you the shortest
// string where your machine disagrees. `load solution` drops the canonical
// 3-state remainder automaton on a circle to compare. Reduced motion: Step
// reveals one symbol; the whole trail is precomputed by runDFA.
//
// Single default export (react-refresh). Functional coloring/layout is inline
// from theme vars so it reads without the sheet; the sheet adds hover/anim only.
import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import {
  divisibleBy3DFA,
  firstCounterexample,
  isBinaryDivisibleBy3,
  runDFA,
  type DFA,
} from "./model.ts";
import "../../../theme/_p5css/fsm-builder.css";

const ACCENT = "#2DD4BF";
const ALPHABET = ["0", "1"] as const;

const VBW = 640;
const VBH = 380;
const R = 26; // node radius

type Tool = "move" | "add-edge" | "start" | "accept" | "delete";
type Node = { id: string; x: number; y: number; accepting: boolean };
// delta[state][symbol] = target (missing ⇒ dead/reject), mirrors engine DFA.
type Delta = Record<string, Record<string, string>>;

type Machine = {
  nodes: Node[];
  startId: string | null;
  delta: Delta;
  nextN: number; // counter for fresh qN ids
};

type CheckResult =
  | { kind: "ok" }
  | { kind: "bad"; input: string; predicate: boolean; machine: boolean }
  | { kind: "empty" };

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "move", label: "move", hint: "drag states" },
  { id: "add-edge", label: "add edge", hint: "click source, then target" },
  { id: "start", label: "start", hint: "click a state" },
  { id: "accept", label: "accept", hint: "click to toggle" },
  { id: "delete", label: "delete", hint: "click to remove" },
];

function emptyMachine(): Machine {
  // Start with a single q0 so the canvas isn't intimidatingly blank.
  return { nodes: [{ id: "q0", x: 150, y: 190, accepting: false }], startId: "q0", delta: {}, nextN: 1 };
}

// Engine DFA view of the assembled machine. States listed in node order; a
// null start is surfaced as "" so callers can detect "unrunnable".
function toDFA(m: Machine): DFA {
  return {
    states: m.nodes.map((n) => n.id),
    alphabet: [...ALPHABET],
    start: m.startId ?? "",
    accept: m.nodes.filter((n) => n.accepting).map((n) => n.id),
    delta: m.delta,
  };
}

// The div-by-3 solution, laid out on a circle so it reads as a cycle.
function solutionMachine(): Machine {
  const dfa = divisibleBy3DFA();
  const cx0 = VBW / 2;
  const cy0 = VBH / 2;
  const rad = 120;
  const nodes: Node[] = dfa.states.map((id, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / dfa.states.length;
    return {
      id,
      x: Math.round(cx0 + rad * Math.cos(a)),
      y: Math.round(cy0 + rad * Math.sin(a)),
      accepting: dfa.accept.includes(id),
    };
  });
  // deep-ish copy of delta (values are strings, so shallow rows suffice)
  const delta: Delta = {};
  for (const s of Object.keys(dfa.delta)) delta[s] = { ...dfa.delta[s] };
  return { nodes, startId: dfa.start, delta, nextN: dfa.states.length };
}

export default function FsmBuilder() {
  const [machine, setMachine] = useState<Machine>(emptyMachine);
  const [tool, setTool] = useState<Tool>("move");
  const [edgeSrc, setEdgeSrc] = useState<string | null>(null); // add-edge: chosen source
  const [edgePair, setEdgePair] = useState<{ from: string; to: string } | null>(null); // pick symbols

  const [input, setInput] = useState("110"); // 6 → divisible by 3
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [dragId, setDragId] = useState<string | null>(null);

  const [challenge, setChallenge] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const dfa = useMemo(() => toDFA(machine), [machine]);
  const runnable = machine.startId !== null && machine.nodes.length > 0;

  // Precomputed walk over the current input (safe on empty machines).
  const run = useMemo(() => (runnable ? runDFA(dfa, input) : null), [dfa, input, runnable]);
  const trail = run?.visited ?? [];
  const maxStep = trail.length - 1; // step index into `visited`
  const atEnd = run !== null && step >= maxStep;
  const consumed = Math.min(step, input.length); // symbols read so far
  const currentState = run ? trail[Math.min(step, maxStep)] : null;
  const isStuck = run?.stuck === true && atEnd;

  useSimClock(running && run !== null, 2.2 * speed, () => {
    setStep((s) => {
      if (run === null || s >= maxStep) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  });

  // ---- machine mutation helpers ----
  function resetWalk(): void {
    setRunning(false);
    setStep(0);
  }
  function mutate(fn: (m: Machine) => Machine): void {
    setMachine(fn);
    resetWalk();
  }

  function addState(): void {
    mutate((m) => {
      const id = `q${m.nextN}`;
      // stagger new nodes so they don't stack
      const k = m.nodes.length;
      const x = 150 + (k % 4) * 120 + (k >= 4 ? 40 : 0);
      const y = 100 + Math.floor(k / 4) * 120;
      return {
        ...m,
        nodes: [...m.nodes, { id, x: Math.min(x, VBW - R - 10), y: Math.min(y, VBH - R - 10), accepting: false }],
        startId: m.startId ?? id,
        nextN: m.nextN + 1,
      };
    });
  }
  function clearAll(): void {
    setEdgeSrc(null);
    setEdgePair(null);
    setCheckResult(null);
    mutate(() => ({ nodes: [], startId: null, delta: {}, nextN: 0 }));
  }
  function loadSolution(): void {
    setEdgeSrc(null);
    setEdgePair(null);
    setCheckResult(null);
    setInput("110");
    mutate(() => solutionMachine());
  }

  function setStart(id: string): void {
    mutate((m) => ({ ...m, startId: id }));
  }
  function toggleAccept(id: string): void {
    mutate((m) => ({
      ...m,
      nodes: m.nodes.map((n) => (n.id === id ? { ...n, accepting: !n.accepting } : n)),
    }));
  }
  function deleteState(id: string): void {
    setEdgeSrc(null);
    setEdgePair(null);
    mutate((m) => {
      const delta: Delta = {};
      for (const s of Object.keys(m.delta)) {
        if (s === id) continue;
        const row: Record<string, string> = {};
        for (const sym of Object.keys(m.delta[s])) {
          if (m.delta[s][sym] !== id) row[sym] = m.delta[s][sym];
        }
        if (Object.keys(row).length) delta[s] = row;
      }
      const nodes = m.nodes.filter((n) => n.id !== id);
      return {
        ...m,
        nodes,
        startId: m.startId === id ? (nodes[0]?.id ?? null) : m.startId,
        delta,
      };
    });
  }
  // deterministic write: symbol on (state) points at exactly one target.
  function setEdgeSymbol(from: string, to: string, sym: string): void {
    mutate((m) => {
      const row = { ...(m.delta[from] ?? {}) };
      if (row[sym] === to) delete row[sym]; // toggle the same edge off
      else row[sym] = to;
      const delta = { ...m.delta };
      if (Object.keys(row).length) delta[from] = row;
      else delete delta[from];
      return { ...m, delta };
    });
  }

  // ---- node click routing by tool ----
  function onNodeClick(id: string): void {
    if (tool === "start") setStart(id);
    else if (tool === "accept") toggleAccept(id);
    else if (tool === "delete") deleteState(id);
    else if (tool === "add-edge") {
      if (edgeSrc === null) {
        setEdgeSrc(id);
        setEdgePair(null);
      } else {
        setEdgePair({ from: edgeSrc, to: id });
        setEdgeSrc(null);
      }
    }
  }

  // ---- dragging (move tool) ----
  function toLocal(e: ReactPointerEvent, svg: SVGSVGElement): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VBW;
    const y = ((e.clientY - rect.top) / rect.height) * VBH;
    return { x, y };
  }
  function onNodePointerDown(e: ReactPointerEvent, id: string): void {
    if (tool !== "move") return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragId(id);
  }
  function onSvgPointerMove(e: ReactPointerEvent<SVGSVGElement>): void {
    if (dragId === null) return;
    const p = toLocal(e, e.currentTarget);
    const x = Math.max(R + 2, Math.min(VBW - R - 2, p.x));
    const y = Math.max(R + 2, Math.min(VBH - R - 2, p.y));
    setMachine((m) => ({ ...m, nodes: m.nodes.map((n) => (n.id === dragId ? { ...n, x, y } : n)) }));
  }
  function onSvgPointerUp(): void {
    setDragId(null);
  }

  function fullReset(): void {
    setTool("move");
    setEdgeSrc(null);
    setEdgePair(null);
    setChallenge(false);
    setCheckResult(null);
    setInput("110");
    setMachine(emptyMachine());
    resetWalk();
  }

  // ---- challenge grading (local badge; NOT the part boss) ----
  function runCheck(): void {
    if (!runnable) {
      setCheckResult({ kind: "empty" });
      return;
    }
    const ce = firstCounterexample(dfa, isBinaryDivisibleBy3, 10);
    setCheckResult(
      ce === null
        ? { kind: "ok" }
        : { kind: "bad", input: ce.input, predicate: ce.predicate, machine: ce.machine },
    );
  }

  // ---- transport ----
  function onStep(): void {
    if (run === null) return;
    setRunning(false);
    setStep((s) => Math.min(maxStep, s + 1));
  }
  function onToggle(): void {
    if (run === null) return;
    if (running) {
      setRunning(false);
    } else {
      if (atEnd) setStep(0); // replay from the top
      setRunning(true);
    }
  }

  // ---- status line ----
  const verdict = run
    ? isStuck
      ? `stuck — no transition on "${input[run.steps.length - 1] ?? ""}" from ${run.steps[run.steps.length - 1]?.from ?? "?"} → reject`
      : run.accepted
        ? `accept — "${input || "ε"}" is in the language`
        : `reject — "${input || "ε"}" is not in the language`
    : "";
  const status = !runnable
    ? machine.nodes.length === 0
      ? "empty canvas — add a state to begin"
      : "no start state — use the start tool to pick one"
    : tool === "add-edge" && edgeSrc !== null
      ? `add edge: source ${edgeSrc} chosen — click a target state`
      : atEnd
        ? verdict
        : consumed === 0
          ? `at start ${currentState ?? "?"} — Play or Step to read "${input || "ε"}"`
          : `state ${currentState} after reading ${input.slice(0, consumed) || "ε"}…`;

  // Group transitions source→target so multiple symbols share one arrow.
  const edges = useMemo(() => groupEdges(machine), [machine]);
  const nodeById = useMemo(() => {
    const map: Record<string, Node> = {};
    for (const n of machine.nodes) map[n.id] = n;
    return map;
  }, [machine]);

  // active edge for the current step (highlight the transition just taken)
  const activeEdge =
    run && consumed > 0 && !isStuck
      ? { from: trail[consumed - 1], to: trail[consumed] }
      : null;

  const svgMode = tool === "move" ? "is-move" : tool === "add-edge" || tool === "start" || tool === "accept" || tool === "delete" ? "is-pick" : "";

  return (
    <SimShell
      title="FSM builder — assemble a DFA over {0,1}, then test a string"
      simKey="fsm-builder"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={fullReset}
      status={status}
      controls={
        <div className="fsm-ctl">
          <div className="bit-seg" role="group" aria-label="Editing tool">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cx("bit-segbtn", tool === t.id && "on")}
                onClick={() => {
                  setTool(t.id);
                  setEdgeSrc(null);
                  setEdgePair(null);
                }}
                aria-pressed={tool === t.id}
                title={t.hint}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={addState} aria-label="Add a state">
            + state
          </button>
          <button type="button" className="btn" onClick={clearAll} aria-label="Clear all states">
            clear
          </button>
          <label className="ss-field">
            test
            <input
              className="fsm-input"
              type="text"
              inputMode="numeric"
              value={input}
              spellCheck={false}
              onChange={(e) => {
                setInput(e.target.value.replace(/[^01]/g, ""));
                resetWalk();
              }}
              placeholder="0/1…"
              aria-label="Binary test string (0 and 1 only)"
            />
          </label>
          <button
            type="button"
            className={cx("btn", challenge && "btn-primary")}
            onClick={() => setChallenge((c) => !c)}
            aria-pressed={challenge}
            title="Toggle the divisible-by-3 challenge"
          >
            🏆 divisible-by-3
          </button>
        </div>
      }
      footer={
        <div className="fsm-foot">
          {challenge && (
            <div className="fsm-panel">
              <p className="fsm-task">
                <b>Challenge.</b> Build a DFA over {"{0,1}"} accepting binary numbers divisible by 3.
                ε and leading zeros are allowed (ε and "0" have value 0, so both are accepted).
              </p>
              <button type="button" className="btn" onClick={runCheck} disabled={!runnable}>
                check
              </button>
              <button type="button" className="btn" onClick={loadSolution}>
                load solution
              </button>
              {checkResult && checkResult.kind === "ok" && (
                <span className="fsm-badge ok" role="status">
                  ✓ verified — matches the language up to length 10
                </span>
              )}
              {checkResult && checkResult.kind === "bad" && (
                <span className="fsm-badge bad" role="status">
                  ✗ <code>"{checkResult.input}"</code> (
                  {checkResult.input === "ε" ? 0 : parseInt(checkResult.input, 2)}): your DFA{" "}
                  {checkResult.machine ? "accepted" : "rejected"}, should{" "}
                  {checkResult.predicate ? "accept" : "reject"}
                </span>
              )}
              {checkResult && checkResult.kind === "empty" && (
                <span className="fsm-badge bad" role="status">
                  ✗ need a start state and at least one state to check
                </span>
              )}
            </div>
          )}
          {edgePair && (
            <div className="fsm-panel" role="group" aria-label="Choose transition symbols">
              <span className="fsm-task" style={{ flex: "0 0 auto" }}>
                edge <b>{edgePair.from}</b> → <b>{edgePair.to}</b> on:
              </span>
              <div className="bit-seg" role="group" aria-label="Symbols for this edge">
                {ALPHABET.map((sym) => {
                  const on = machine.delta[edgePair.from]?.[sym] === edgePair.to;
                  return (
                    <button
                      key={sym}
                      type="button"
                      className={cx("bit-segbtn", on && "on")}
                      onClick={() => setEdgeSymbol(edgePair.from, edgePair.to, sym)}
                      aria-pressed={on}
                      title={`Toggle symbol ${sym} (deterministic: replaces ${edgePair.from}'s existing ${sym}-edge)`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setEdgePair(null)}
                aria-label="Done choosing symbols"
              >
                done
              </button>
            </div>
          )}
          <div className="fsm-legend" aria-hidden="true">
            <span className="fsm-leg">
              <i className="fsm-sw" style={sw("var(--sem-control)")} /> current
            </span>
            <span className="fsm-leg">
              <i className="fsm-sw" style={sw("var(--sem-ok)")} /> accept
            </span>
            <span className="fsm-leg">
              <i className="fsm-sw" style={sw("var(--sem-err)")} /> reject / stuck
            </span>
            <span className="fsm-leg">
              <i className="fsm-sw" style={{ ...sw("transparent"), borderColor: "var(--sem-state)" }} />{" "}
              accepting = double ring
            </span>
          </div>
        </div>
      }
    >
      <div className="fsm-stage">
        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          className={cx("fsm-svg", svgMode)}
          role="img"
          aria-label={`DFA canvas: ${machine.nodes.length} states, ${
            machine.startId ? `start ${machine.startId}` : "no start"
          }, ${machine.nodes.filter((n) => n.accepting).length} accepting`}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerLeave={onSvgPointerUp}
        >
          <defs>
            <marker
              id="fsm-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--tx2)" />
            </marker>
            <marker
              id="fsm-arrow-hot"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--sem-control)" />
            </marker>
          </defs>

          {machine.nodes.length === 0 && (
            <text className="fsm-hint" x={VBW / 2} y={VBH / 2} textAnchor="middle">
              empty canvas — press “+ state” to add q0
            </text>
          )}

          {/* edges (drawn under nodes) */}
          <g>
            {edges.map((e) => {
              const from = nodeById[e.from];
              const to = nodeById[e.to];
              if (!from || !to) return null;
              const hot = activeEdge && activeEdge.from === e.from && activeEdge.to === e.to;
              return e.from === e.to ? (
                <SelfLoop key={`${e.from}->${e.to}`} node={from} label={e.symbols.join(",")} hot={!!hot} />
              ) : (
                <EdgeArrow
                  key={`${e.from}->${e.to}`}
                  from={from}
                  to={to}
                  label={e.symbols.join(",")}
                  curved={hasReverse(edges, e)}
                  hot={!!hot}
                />
              );
            })}
          </g>

          {/* nodes */}
          <g>
            {machine.nodes.map((n) => {
              const isStart = n.id === machine.startId;
              const isCur = runnable && currentState === n.id;
              const finalHere = atEnd && isCur;
              let ring = "var(--line)";
              let fill = "var(--surface)";
              if (finalHere) {
                if (isStuck || (run !== null && !run.accepted)) {
                  ring = "var(--sem-err)";
                  fill = "color-mix(in srgb, var(--sem-err) 22%, var(--surface))";
                } else {
                  ring = "var(--sem-ok)";
                  fill = "color-mix(in srgb, var(--sem-ok) 22%, var(--surface))";
                }
              } else if (isCur) {
                ring = "var(--sem-control)";
                fill = "color-mix(in srgb, var(--sem-control) 20%, var(--surface))";
              } else if (edgeSrc === n.id) {
                ring = "var(--sem-data)";
                fill = "color-mix(in srgb, var(--sem-data) 16%, var(--surface))";
              }
              const label = isStart ? `${n.id} (start)` : n.id;
              return (
                <g
                  key={n.id}
                  className="fsm-node"
                  role="button"
                  tabIndex={0}
                  aria-label={`state ${label}${n.accepting ? ", accepting" : ""}`}
                  onPointerDown={(e) => onNodePointerDown(e, n.id)}
                  onClick={() => onNodeClick(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onNodeClick(n.id);
                    }
                  }}
                >
                  {/* start arrow marker */}
                  {isStart && (
                    <line
                      x1={n.x - R - 30}
                      y1={n.y}
                      x2={n.x - R - 3}
                      y2={n.y}
                      stroke="var(--sem-state)"
                      strokeWidth={2}
                      markerEnd="url(#fsm-arrow)"
                    />
                  )}
                  {/* accepting = double ring */}
                  {n.accepting && (
                    <circle cx={n.x} cy={n.y} r={R + 4} fill="none" stroke={ring} strokeWidth={2} />
                  )}
                  <circle
                    className="fsm-ring"
                    cx={n.x}
                    cy={n.y}
                    r={R}
                    fill={fill}
                    stroke={ring}
                    strokeWidth={2.5}
                  />
                  <text
                    x={n.x}
                    y={n.y + 5}
                    textAnchor="middle"
                    style={{
                      fill: "var(--tx)",
                      font: "600 14px var(--font-mono)",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {n.id}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </SimShell>
  );
}

// ---- edge grouping / geometry helpers ----

type GroupedEdge = { from: string; to: string; symbols: string[] };

function groupEdges(m: Machine): GroupedEdge[] {
  const byPair = new Map<string, GroupedEdge>();
  for (const from of Object.keys(m.delta)) {
    for (const sym of Object.keys(m.delta[from])) {
      const to = m.delta[from][sym];
      const key = `${from}->${to}`;
      const g = byPair.get(key);
      if (g) g.symbols.push(sym);
      else byPair.set(key, { from, to, symbols: [sym] });
    }
  }
  // stable label order 0 before 1
  for (const g of byPair.values()) g.symbols.sort();
  return [...byPair.values()];
}

function hasReverse(edges: GroupedEdge[], e: GroupedEdge): boolean {
  return e.from !== e.to && edges.some((o) => o.from === e.to && o.to === e.from);
}

const sw = (bg: string): CSSProperties => ({ background: bg });

function EdgeArrow({
  from,
  to,
  label,
  curved,
  hot,
}: {
  from: Node;
  to: Node;
  label: string;
  curved: boolean;
  hot: boolean;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular offset so opposite-direction edges don't overlap
  const off = curved ? 16 : 0;
  const px = -uy * off;
  const py = ux * off;
  const sx = from.x + ux * R + px;
  const sy = from.y + uy * R + py;
  const ex = to.x - ux * (R + 6) + px;
  const ey = to.y - uy * (R + 6) + py;
  // control point for a gentle quadratic curve when curved
  const mx = (sx + ex) / 2 - uy * (curved ? 26 : 0);
  const my = (sy + ey) / 2 + ux * (curved ? 26 : 0);
  const d = curved ? `M${sx},${sy} Q${mx},${my} ${ex},${ey}` : `M${sx},${sy} L${ex},${ey}`;
  const stroke = hot ? "var(--sem-control)" : "var(--tx2)";
  const marker = hot ? "url(#fsm-arrow-hot)" : "url(#fsm-arrow)";
  const lx = curved ? mx : (sx + ex) / 2 - uy * 12;
  const ly = curved ? my : (sy + ey) / 2 + ux * 12;
  return (
    <g className="fsm-edge">
      <path d={d} fill="none" stroke={stroke} strokeWidth={hot ? 2.6 : 1.8} markerEnd={marker} />
      <EdgeLabel x={lx} y={ly} label={label} hot={hot} />
    </g>
  );
}

function SelfLoop({ node, label, hot }: { node: Node; label: string; hot: boolean }) {
  // a small loop rendered above the node
  const cx0 = node.x;
  const top = node.y - R;
  const d = `M${cx0 - 12},${top} C${cx0 - 34},${top - 40} ${cx0 + 34},${top - 40} ${cx0 + 12},${top}`;
  const stroke = hot ? "var(--sem-control)" : "var(--tx2)";
  const marker = hot ? "url(#fsm-arrow-hot)" : "url(#fsm-arrow)";
  return (
    <g className="fsm-edge">
      <path d={d} fill="none" stroke={stroke} strokeWidth={hot ? 2.6 : 1.8} markerEnd={marker} />
      <EdgeLabel x={cx0} y={top - 44} label={label} hot={hot} />
    </g>
  );
}

function EdgeLabel({ x, y, label, hot }: { x: number; y: number; label: string; hot: boolean }) {
  return (
    <>
      <rect
        x={x - 6 * label.length - 2}
        y={y - 10}
        width={12 * label.length + 4}
        height={16}
        rx={3}
        fill="var(--surface)"
        opacity={0.9}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        style={{
          fill: hot ? "var(--sem-control)" : "var(--sem-data)",
          font: "600 13px var(--font-mono)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {label}
      </text>
    </>
  );
}
