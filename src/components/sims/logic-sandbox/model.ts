// logic-sandbox core — pure, framework-free simulation model.
// Unit-gate-delay tick semantics: every gate recomputes from the PREVIOUS
// tick's wire values. Acyclic circuits settle in ≤ depth ticks; feedback
// loops oscillate honestly (the ch.6 teaser). Floating inputs read 0 —
// a documented simulator convention (see ch.4 pitfalls).

export type GateKind = "SWITCH" | "LAMP" | "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";
export type LogicGateKind = Exclude<GateKind, "SWITCH" | "LAMP">;

export type NodeT = {
  id: string;
  kind: GateKind;
  x: number;
  y: number;
  label?: string; // switches: A/B/C/D · lamps: L1/L2
};

export type Wire = {
  id: string;
  from: string; // source node id (every non-LAMP node has one output)
  to: string;
  toPort: number; // 0 | 1
};

export type Circuit = { nodes: NodeT[]; wires: Wire[] };

/** Output value per node id. A LAMP's "output" is its displayed value. */
export type SimState = Record<string, boolean>;

export const INPUT_COUNT: Record<GateKind, number> = {
  SWITCH: 0,
  LAMP: 1,
  NOT: 1,
  AND: 2,
  OR: 2,
  XOR: 2,
  NAND: 2,
  NOR: 2,
};

export const GATE_ZOO: LogicGateKind[] = ["AND", "OR", "NOT", "XOR", "NAND", "NOR"];

export function evalGate(kind: GateKind, ins: boolean[]): boolean {
  const a = ins[0] ?? false;
  const b = ins[1] ?? false;
  switch (kind) {
    case "AND":
      return a && b;
    case "OR":
      return a || b;
    case "NOT":
      return !a;
    case "XOR":
      return a !== b;
    case "NAND":
      return !(a && b);
    case "NOR":
      return !(a || b);
    case "LAMP":
      return a;
    case "SWITCH":
      return a; // never reached — switches are driven externally
  }
}

export function inputsOf(c: Circuit, node: NodeT, state: SimState): boolean[] {
  const n = INPUT_COUNT[node.kind];
  const ins: boolean[] = [];
  for (let p = 0; p < n; p++) {
    const wire = c.wires.find((w) => w.to === node.id && w.toPort === p);
    ins.push(wire ? (state[wire.from] ?? false) : false); // floating → 0
  }
  return ins;
}

export function step(
  c: Circuit,
  state: SimState,
  switchVals: Record<string, boolean>,
): { next: SimState; changed: string[] } {
  const next: SimState = {};
  const changed: string[] = [];
  for (const node of c.nodes) {
    const v =
      node.kind === "SWITCH"
        ? (switchVals[node.id] ?? false)
        : evalGate(node.kind, inputsOf(c, node, state));
    next[node.id] = v;
    if ((state[node.id] ?? false) !== v) changed.push(node.id);
  }
  return { next, changed };
}

export function settle(
  c: Circuit,
  switchVals: Record<string, boolean>,
  init: SimState = {},
  maxTicks = 64,
): { state: SimState; ticks: number; stable: boolean } {
  let state = init;
  for (let t = 0; t < maxTicks; t++) {
    const { next, changed } = step(c, state, switchVals);
    state = next;
    if (changed.length === 0) return { state, ticks: t, stable: true };
  }
  return { state, ticks: maxTicks, stable: false };
}

export function switchesOf(c: Circuit): NodeT[] {
  return c.nodes.filter((n) => n.kind === "SWITCH").sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
}
export function lampsOf(c: Circuit): NodeT[] {
  return c.nodes.filter((n) => n.kind === "LAMP").sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
}

export type TruthRow = { inputs: boolean[]; outputs: (boolean | null)[] }; // null = oscillates

/** Truth table over all switches (≤4), for lamps + optional extra probes. */
export function truthTable(c: Circuit, extraIds: string[] = []): { switches: NodeT[]; probes: NodeT[]; rows: TruthRow[] } | null {
  const sw = switchesOf(c);
  if (sw.length === 0 || sw.length > 4) return null;
  const probes = [...lampsOf(c), ...c.nodes.filter((n) => extraIds.includes(n.id) && n.kind !== "LAMP" && n.kind !== "SWITCH")];
  if (probes.length === 0) return null;
  const rows: TruthRow[] = [];
  const count = 1 << sw.length;
  for (let mask = 0; mask < count; mask++) {
    const vals: Record<string, boolean> = {};
    const inputs: boolean[] = [];
    sw.forEach((s, i) => {
      const on = ((mask >> (sw.length - 1 - i)) & 1) === 1;
      vals[s.id] = on;
      inputs.push(on);
    });
    const res = settle(c, vals);
    rows.push({
      inputs,
      outputs: probes.map((p) => (res.stable ? (res.state[p.id] ?? false) : null)),
    });
  }
  return { switches: sw, probes, rows };
}
