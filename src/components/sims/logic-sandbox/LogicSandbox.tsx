// logic-sandbox [HERO] — ch.4's centerpiece (INTERACTIVES.md):
// drag gates onto the canvas, wire outputs→inputs (drag or click-click),
// toggle switches, watch signals ripple one gate-delay per tick, read the
// auto-derived truth table, and prove NAND universality in challenge mode.
import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx } from "../../../lib/utils.ts";
import { GateGlyph, inputOffsets } from "./gateShapes.tsx";
import { CHALLENGES, challengeById, checkChallenge } from "./challenges.ts";
import type { Challenge, CheckResult } from "./challenges.ts";
import {
  GATE_ZOO,
  INPUT_COUNT,
  settle,
  step,
  switchesOf,
  truthTable,
} from "./model.ts";
import type { Circuit, GateKind, NodeT, SimState } from "./model.ts";

const VBW = 860;
const VBH = 440;
const ACCENT = "#FB923C"; // P2 accent

// ---------- geometry ----------
function nodeSize(kind: GateKind): { w: number; h: number } {
  if (kind === "SWITCH") return { w: 48, h: 36 };
  if (kind === "LAMP") return { w: 40, h: 40 };
  return { w: 64, h: 40 };
}
function outputPos(n: NodeT): { x: number; y: number } {
  if (n.kind === "SWITCH") return { x: n.x + 48, y: n.y + 18 };
  return { x: n.x + 64, y: n.y + 20 };
}
function inputPos(n: NodeT, port: number): { x: number; y: number } {
  if (n.kind === "LAMP") return { x: n.x, y: n.y + 20 };
  if (n.kind === "NOT") return { x: n.x, y: n.y + 20 };
  return { x: n.x, y: n.y + (port === 0 ? 12 : 28) };
}

// ---------- presets ----------
type PresetId = "playground" | "xor-anatomy" | "feedback" | "empty";

function makePreset(id: PresetId): Circuit {
  switch (id) {
    case "playground":
      return {
        nodes: [
          { id: "s1", kind: "SWITCH", x: 60, y: 110, label: "A" },
          { id: "s2", kind: "SWITCH", x: 60, y: 250, label: "B" },
          { id: "g1", kind: "AND", x: 330, y: 170 },
          { id: "l1", kind: "LAMP", x: 640, y: 170, label: "L1" },
        ],
        wires: [
          { id: "w1", from: "s1", to: "g1", toPort: 0 },
          { id: "w2", from: "s2", to: "g1", toPort: 1 },
          { id: "w3", from: "g1", to: "l1", toPort: 0 },
        ],
      };
    case "xor-anatomy":
      return {
        nodes: [
          { id: "s1", kind: "SWITCH", x: 40, y: 100, label: "A" },
          { id: "s2", kind: "SWITCH", x: 40, y: 290, label: "B" },
          { id: "n1", kind: "NOT", x: 200, y: 30 },
          { id: "n2", kind: "NOT", x: 200, y: 340 },
          { id: "a1", kind: "AND", x: 390, y: 100 },
          { id: "a2", kind: "AND", x: 390, y: 270 },
          { id: "o1", kind: "OR", x: 580, y: 185 },
          { id: "l1", kind: "LAMP", x: 750, y: 185, label: "L1" },
        ],
        wires: [
          { id: "w1", from: "s1", to: "n1", toPort: 0 },
          { id: "w2", from: "s2", to: "n2", toPort: 0 },
          { id: "w3", from: "s1", to: "a1", toPort: 0 },
          { id: "w4", from: "n2", to: "a1", toPort: 1 },
          { id: "w5", from: "n1", to: "a2", toPort: 0 },
          { id: "w6", from: "s2", to: "a2", toPort: 1 },
          { id: "w7", from: "a1", to: "o1", toPort: 0 },
          { id: "w8", from: "a2", to: "o1", toPort: 1 },
          { id: "w9", from: "o1", to: "l1", toPort: 0 },
        ],
      };
    case "feedback":
      return {
        nodes: [
          { id: "n1", kind: "NOT", x: 330, y: 180 },
          { id: "l1", kind: "LAMP", x: 610, y: 180, label: "L1" },
        ],
        wires: [
          { id: "w1", from: "n1", to: "n1", toPort: 0 }, // the forbidden move
          { id: "w2", from: "n1", to: "l1", toPort: 0 },
        ],
      };
    case "empty":
      return { nodes: [], wires: [] };
  }
}

function challengeStart(ch: Challenge): Circuit {
  const nodes: NodeT[] = [];
  for (let i = 0; i < ch.switchCount; i++) {
    nodes.push({ id: `s${i + 1}`, kind: "SWITCH", x: 50, y: 90 + i * 150, label: String.fromCharCode(65 + i) });
  }
  nodes.push({ id: "l1", kind: "LAMP", x: 740, y: 180, label: "L1" });
  return { nodes, wires: [] };
}

const PRESET_LABELS: Record<PresetId, string> = {
  playground: "Playground (A AND B)",
  "xor-anatomy": "XOR, dissected",
  feedback: "Feedback loop (!)",
  empty: "Empty canvas",
};

const SWITCH_LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function LogicSandbox() {
  const [presetId, setPresetId] = useState<PresetId>("playground");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [circuit, setCircuit] = useState<Circuit>(() => makePreset("playground"));
  const [switchVals, setSwitchVals] = useState<Record<string, boolean>>({});
  const [simState, setSimState] = useState<SimState>({});
  const [running, setRunning] = useState<boolean>(
    () => !(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const [speed, setSpeed] = useState(1);
  const [sel, setSel] = useState<{ t: "node" | "wire"; id: string } | null>(null);
  const [wiring, setWiring] = useState<{ from: string; x: number; y: number; dragged: boolean } | null>(null);
  const [pulse, setPulse] = useState<ReadonlySet<string>>(() => new Set());
  const [check, setCheck] = useState<CheckResult | null>(null);
  const challengesDone = useChallengesDone();

  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const idRef = useRef(100);

  // ---------- simulation ----------
  function tick() {
    const { next, changed } = step(circuit, simState, switchVals);
    if (changed.length === 0 && pulse.size === 0) return; // stable → no re-render churn
    setSimState(next);
    setPulse(new Set(changed));
  }
  useSimClock(running, 3 * speed, tick);

  const settled = settle(circuit, switchVals);
  const pending = step(circuit, simState, switchVals).changed.length > 0;
  const status = !settled.stable
    ? "⚠ oscillating — a feedback loop is fighting itself (that '~' is the seed of memory → ch.6)"
    : pending
      ? running
        ? "signals rippling…"
        : "unsettled — press ⏭ step to advance one gate-delay"
      : `stable · settles in ${settled.ticks} gate-delay${settled.ticks === 1 ? "" : "s"}`;

  // ---------- editing ----------
  function toSvg(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * VBW) / r.width, y: ((e.clientY - r.top) * VBH) / r.height };
  }

  function addNode(kind: GateKind) {
    const id = `n${idRef.current++}`;
    let label: string | undefined;
    if (kind === "SWITCH") {
      const used = new Set(circuit.nodes.filter((n) => n.kind === "SWITCH").map((n) => n.label));
      label = SWITCH_LETTERS.find((l) => !used.has(l));
      if (!label) return; // 6 switches is plenty
    }
    if (kind === "LAMP") {
      label = `L${circuit.nodes.filter((n) => n.kind === "LAMP").length + 1}`;
    }
    const i = circuit.nodes.length;
    const node: NodeT = {
      id,
      kind,
      x: kind === "SWITCH" ? 50 : 140 + (i % 4) * 130,
      y: kind === "SWITCH" ? 70 + circuit.nodes.filter((n) => n.kind === "SWITCH").length * 90 : 60 + ((i * 67) % 300),
      label,
    };
    setCircuit((c) => ({ ...c, nodes: [...c.nodes, node] }));
    setSel({ t: "node", id });
    setCheck(null);
  }

  function connect(fromId: string, toId: string, port: number) {
    const to = circuit.nodes.find((n) => n.id === toId);
    const from = circuit.nodes.find((n) => n.id === fromId);
    if (!to || !from || from.kind === "LAMP" || INPUT_COUNT[to.kind] <= port) return;
    setCircuit((c) => ({
      ...c,
      wires: [
        ...c.wires.filter((w) => !(w.to === toId && w.toPort === port)),
        { id: `w${idRef.current++}`, from: fromId, to: toId, toPort: port },
      ],
    }));
    setCheck(null);
  }

  function deleteSelected() {
    if (!sel) return;
    if (sel.t === "wire") {
      setCircuit((c) => ({ ...c, wires: c.wires.filter((w) => w.id !== sel.id) }));
    } else {
      setCircuit((c) => ({
        nodes: c.nodes.filter((n) => n.id !== sel.id),
        wires: c.wires.filter((w) => w.from !== sel.id && w.to !== sel.id),
      }));
    }
    setSel(null);
    setCheck(null);
  }

  function loadPreset(pid: PresetId) {
    setPresetId(pid);
    setChallenge(null);
    setCircuit(makePreset(pid));
    setSwitchVals({});
    setSimState({});
    setSel(null);
    setWiring(null);
    setCheck(null);
    setPulse(new Set());
  }

  function loadChallenge(id: string) {
    if (id === "") {
      loadPreset(presetId);
      return;
    }
    const ch = challengeById(id);
    if (!ch) return;
    setChallenge(ch);
    setCircuit(challengeStart(ch));
    setSwitchVals({});
    setSimState({});
    setSel(null);
    setWiring(null);
    setCheck(null);
    setPulse(new Set());
  }

  function reset() {
    if (challenge) loadChallenge(challenge.id);
    else loadPreset(presetId);
  }

  // ---------- pointer plumbing ----------
  function nodePointerDown(e: ReactPointerEvent, n: NodeT) {
    e.stopPropagation();
    const p = toSvg(e);
    dragRef.current = { id: n.id, ox: p.x - n.x, oy: p.y - n.y, moved: false };
    setSel({ t: "node", id: n.id });
  }
  function svgPointerMove(e: ReactPointerEvent) {
    const p = toSvg(e);
    const drag = dragRef.current;
    if (drag) {
      const nx = Math.round((p.x - drag.ox) / 10) * 10;
      const ny = Math.round((p.y - drag.oy) / 10) * 10;
      const node = circuit.nodes.find((n) => n.id === drag.id);
      if (node && (Math.abs(nx - node.x) > 4 || Math.abs(ny - node.y) > 4)) drag.moved = true;
      if (drag.moved) {
        const { w, h } = node ? nodeSize(node.kind) : { w: 64, h: 40 };
        const cx2 = Math.max(0, Math.min(VBW - w, nx));
        const cy2 = Math.max(0, Math.min(VBH - h, ny));
        setCircuit((c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === drag.id ? { ...n, x: cx2, y: cy2 } : n)) }));
      }
    } else if (wiring) {
      setWiring({ ...wiring, x: p.x, y: p.y, dragged: true });
    }
  }
  function svgPointerUp() {
    const drag = dragRef.current;
    if (drag) {
      const node = circuit.nodes.find((n) => n.id === drag.id);
      if (node && !drag.moved && node.kind === "SWITCH") {
        setSwitchVals((v) => ({ ...v, [node.id]: !(v[node.id] ?? false) }));
      }
      dragRef.current = null;
      return;
    }
    if (wiring && wiring.dragged) setWiring(null); // drag released over nothing
    // !dragged → sticky click-click mode: stay armed
  }
  function outputPortDown(e: ReactPointerEvent, n: NodeT) {
    e.stopPropagation();
    const p = outputPos(n);
    setWiring({ from: n.id, x: p.x, y: p.y, dragged: false });
  }
  function inputPortUp(e: ReactPointerEvent, n: NodeT, port: number) {
    e.stopPropagation();
    if (wiring) {
      connect(wiring.from, n.id, port);
      setWiring(null);
    } else {
      const existing = circuit.wires.find((w) => w.to === n.id && w.toPort === port);
      if (existing) {
        setCircuit((c) => ({ ...c, wires: c.wires.filter((w) => w.id !== existing.id) }));
        setCheck(null);
      }
    }
  }
  function bgPointerDown() {
    setSel(null);
    setWiring(null);
  }

  // ---------- truth table ----------
  const selNodeId = sel?.t === "node" ? sel.id : null;
  const table = useMemo(
    () => truthTable(circuit, selNodeId ? [selNodeId] : []),
    [circuit, selNodeId],
  );
  const switchCount = switchesOf(circuit).length;

  function applyRow(inputs: boolean[]) {
    const sw = switchesOf(circuit);
    const vals: Record<string, boolean> = {};
    sw.forEach((s, i) => (vals[s.id] = inputs[i] ?? false));
    setSwitchVals(vals);
  }

  // ---------- challenge ----------
  function runCheck() {
    if (!challenge) return;
    const result = checkChallenge(circuit, challenge);
    setCheck(result);
    if (result.ok) markChallengeDone(challenge.id);
  }

  const palette: GateKind[] = [...(challenge ? challenge.palette : GATE_ZOO), "SWITCH", "LAMP"];

  return (
    <SimShell
      title="Logic sandbox — wire the gate zoo"
      simKey="logic-sandbox"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle: () => setRunning((r) => !r), onStep: tick, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <>
          <label className="ss-field">
            preset
            <select
              aria-label="Load preset circuit"
              value={challenge ? "" : presetId}
              disabled={challenge !== null}
              onChange={(e) => loadPreset(e.target.value as PresetId)}
            >
              {(Object.keys(PRESET_LABELS) as PresetId[]).map((p) => (
                <option key={p} value={p}>
                  {PRESET_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="ss-field">
            challenge
            <select aria-label="Challenge mode" value={challenge?.id ?? ""} onChange={(e) => loadChallenge(e.target.value)}>
              <option value="">— free build —</option>
              {CHALLENGES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {challengesDone.has(c.id) ? " ✓" : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={deleteSelected} disabled={!sel} aria-label="Delete selected element">
            ✕ delete
          </button>
        </>
      }
      footer={
        <div className="lsb-foot">
          {challenge && (
            <div className={cx("lsb-challenge", check?.ok && "ok", check && !check.ok && "fail")}>
              <div className="lsb-goal">
                <strong>{challenge.name}</strong> — {challenge.goal}
              </div>
              <TargetTable challenge={challenge} />
              <button type="button" className="btn btn-primary" onClick={runCheck}>
                Check my circuit
              </button>
              {check && <p className="lsb-verdict" aria-live="polite">{check.message}</p>}
              {challengesDone.has(challenge.id) && !check && <p className="lsb-verdict">✓ already cleared — badge earned</p>}
            </div>
          )}
          {table ? (
            <div className="lsb-truthwrap">
              <table className="lsb-truth">
                <caption>
                  Truth table — derived live from your circuit{selNodeId ? " (+ selected gate probe ✱)" : ""}. Click a row to set the switches.
                </caption>
                <thead>
                  <tr>
                    {table.switches.map((s) => (
                      <th key={s.id}>{s.label}</th>
                    ))}
                    {table.probes.map((p) => (
                      <th key={p.id} className="lsb-outcol">
                        {p.kind === "LAMP" ? `💡${p.label ?? ""}` : `${p.kind}✱`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => {
                    const current = table.switches.every((s, j) => (switchVals[s.id] ?? false) === row.inputs[j]);
                    return (
                      <tr key={i} className={cx(current && "current")} onClick={() => applyRow(row.inputs)}>
                        {row.inputs.map((v, j) => (
                          <td key={j}>{v ? 1 : 0}</td>
                        ))}
                        {row.outputs.map((v, j) => (
                          <td key={`o${j}`} className="lsb-outcol">
                            {v === null ? "~" : v ? 1 : 0}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lsb-hint muted">
              {switchCount > 4
                ? "Truth table hides beyond 4 switches (16 rows is enough honesty for anyone)."
                : "Add at least one switch and one lamp to derive a live truth table."}
            </p>
          )}
        </div>
      }
    >
      <div className="lsb-palette" role="toolbar" aria-label="Add elements">
        {palette.map((k) => (
          <button key={k} type="button" className="btn lsb-add" onClick={() => addNode(k)}>
            + {k}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="lsb-svg"
        onPointerMove={svgPointerMove}
        onPointerUp={svgPointerUp}
        aria-label="Circuit canvas"
      >
        <defs>
          <pattern id="lsb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1.2" fill="var(--line)" />
          </pattern>
        </defs>
        <rect className="lsb-bg" width={VBW} height={VBH} fill="url(#lsb-grid)" onPointerDown={bgPointerDown} />

        {circuit.wires.map((w) => {
          const from = circuit.nodes.find((n) => n.id === w.from);
          const to = circuit.nodes.find((n) => n.id === w.to);
          if (!from || !to) return null;
          const a = outputPos(from);
          const b = inputPos(to, w.toPort);
          const bend = Math.max(40, Math.abs(b.x - a.x) / 2);
          const d = `M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x} ${b.y}`;
          const on = simState[w.from] ?? false;
          return (
            <g key={w.id}>
              <path
                d={d}
                className="lsb-wire-hit"
                onClick={(e) => {
                  e.stopPropagation();
                  setSel({ t: "wire", id: w.id });
                }}
              />
              <path d={d} className={cx("lsb-wire", on && "on", pulse.has(w.from) && "pulse", sel?.t === "wire" && sel.id === w.id && "selected")} />
            </g>
          );
        })}

        {wiring &&
          (() => {
            const from = circuit.nodes.find((n) => n.id === wiring.from);
            if (!from) return null;
            const a = outputPos(from);
            return <path className="lsb-rubber" d={`M ${a.x} ${a.y} L ${wiring.x} ${wiring.y}`} />;
          })()}

        {circuit.nodes.map((n) => {
          const val = simState[n.id] ?? false;
          const isSel = sel?.t === "node" && sel.id === n.id;
          const { w, h } = nodeSize(n.kind);
          return (
            <g key={n.id} transform={`translate(${n.x} ${n.y})`} className={cx("lsb-node", isSel && "selected")} onPointerDown={(e) => nodePointerDown(e, n)}>
              {isSel && <rect x="-6" y="-6" width={w + 12} height={h + 12} rx="8" className="lsb-selring" />}

              {n.kind === "SWITCH" && (
                <g className={cx("lsb-switch", (switchVals[n.id] ?? false) && "on")}>
                  <rect width="48" height="36" rx="8" />
                  <text x="13" y="24" className="lsb-swlabel">
                    {n.label}
                  </text>
                  <text x="35" y="24" className="lsb-swval">
                    {(switchVals[n.id] ?? false) ? "1" : "0"}
                  </text>
                  <title>switch {n.label} — click to toggle, drag to move</title>
                </g>
              )}

              {n.kind === "LAMP" && (
                <g className={cx("lsb-lamp", val && "on")}>
                  <line x1="0" y1="20" x2="6" y2="20" className="lsb-stub" />
                  <circle cx="20" cy="20" r="14" />
                  <text x="20" y="52" textAnchor="middle" className="gate-label">
                    {n.label}
                  </text>
                  <title>lamp {n.label}</title>
                </g>
              )}

              {n.kind !== "SWITCH" && n.kind !== "LAMP" && <GateGlyph kind={n.kind} active={val} />}

              {/* input ports */}
              {Array.from({ length: INPUT_COUNT[n.kind] }, (_, p) => {
                const pos = n.kind === "LAMP" ? { x: 0, y: 20 } : { x: 0, y: inputOffsets(n.kind === "NOT" ? "NOT" : "AND")[p] ?? 20 };
                const wired = circuit.wires.some((wr) => wr.to === n.id && wr.toPort === p);
                return (
                  <circle
                    key={p}
                    cx={pos.x}
                    cy={pos.y}
                    r="5.5"
                    className={cx("lsb-port", "in", wired && "wired", wiring && "target")}
                    onPointerUp={(e) => inputPortUp(e, n, p)}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <title>{wiring ? "connect here" : wired ? "click to unplug" : "input — wire something in"}</title>
                  </circle>
                );
              })}

              {/* output port */}
              {n.kind !== "LAMP" && (
                <circle
                  cx={n.kind === "SWITCH" ? 48 : 64}
                  cy={n.kind === "SWITCH" ? 18 : 20}
                  r="5.5"
                  className={cx("lsb-port", "out", val && "hot")}
                  onPointerDown={(e) => outputPortDown(e, n)}
                >
                  <title>output — drag (or click, then click an input) to wire</title>
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      <p className="lsb-canvas-hint muted">
        wire: drag from a <strong>right port</strong> to a left port (or click-click) · toggle a switch: click it · unplug: click a wired left port
      </p>
    </SimShell>
  );
}

function TargetTable({ challenge }: { challenge: Challenge }) {
  const n = challenge.switchCount;
  const rows: { ins: boolean[]; out: boolean }[] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const ins = Array.from({ length: n }, (_, i) => ((mask >> (n - 1 - i)) & 1) === 1);
    rows.push({ ins, out: challenge.target(ins) });
  }
  return (
    <table className="lsb-truth target">
      <caption>target</caption>
      <thead>
        <tr>
          {Array.from({ length: n }, (_, i) => (
            <th key={i}>{String.fromCharCode(65 + i)}</th>
          ))}
          <th className="lsb-outcol">💡</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.ins.map((v, j) => (
              <td key={j}>{v ? 1 : 0}</td>
            ))}
            <td className="lsb-outcol">{r.out ? 1 : 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
