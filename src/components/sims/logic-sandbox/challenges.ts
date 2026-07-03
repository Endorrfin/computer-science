// Challenge mode for the logic-sandbox (INTERACTIVES.md ch.4):
// prove universality with your hands. Validation = truth-table equivalence
// against the target function, with a restricted gate palette.
import type { Circuit, LogicGateKind } from "./model.ts";
import { lampsOf, settle, switchesOf } from "./model.ts";

export type Challenge = {
  id: string;
  name: string;
  goal: string;
  palette: LogicGateKind[];
  switchCount: number;
  target: (ins: boolean[]) => boolean;
  star?: boolean; // the chapter's marquee challenge
};

export const CHALLENGES: Challenge[] = [
  {
    id: "ch4-not-from-nand",
    name: "① Warm-up: NOT from NAND",
    goal: "Light the lamp exactly when switch A is OFF — using only NAND gates.",
    palette: ["NAND"],
    switchCount: 1,
    target: (ins) => !ins[0],
  },
  {
    id: "ch4-or-from-nand",
    name: "② OR from NAND",
    goal: "Lamp ON when A or B (or both) is ON — only NAND gates. De Morgan is your friend.",
    palette: ["NAND"],
    switchCount: 2,
    target: (ins) => ins[0] || ins[1],
  },
  {
    id: "ch4-xor-from-nand",
    name: "③ ★ XOR from NAND only",
    goal: "Lamp ON exactly when A and B differ — only NAND gates. Possible in four.",
    palette: ["NAND"],
    switchCount: 2,
    star: true,
    target: (ins) => ins[0] !== ins[1],
  },
];

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export type CheckResult = { ok: boolean; message: string };

export function checkChallenge(c: Circuit, ch: Challenge): CheckResult {
  const sw = switchesOf(c);
  const lamps = lampsOf(c);
  if (sw.length !== ch.switchCount) {
    return { ok: false, message: `Keep exactly ${ch.switchCount} switch${ch.switchCount > 1 ? "es" : ""} — found ${sw.length}.` };
  }
  if (lamps.length !== 1) {
    return { ok: false, message: `Keep exactly one lamp — found ${lamps.length}.` };
  }
  const illegal = c.nodes.filter(
    (n) => n.kind !== "SWITCH" && n.kind !== "LAMP" && !ch.palette.includes(n.kind as LogicGateKind),
  );
  if (illegal.length > 0) {
    return { ok: false, message: `Only ${ch.palette.join("/")} allowed here — remove: ${[...new Set(illegal.map((n) => n.kind))].join(", ")}.` };
  }
  const gateCount = c.nodes.length - sw.length - lamps.length;
  if (gateCount === 0) {
    return { ok: false, message: "Wire some gates in — the lamp needs logic between it and the switches." };
  }
  const lamp = lamps[0];
  const failures: string[] = [];
  for (let mask = 0; mask < 1 << sw.length; mask++) {
    const vals: Record<string, boolean> = {};
    const ins: boolean[] = [];
    sw.forEach((s, i) => {
      const on = ((mask >> (sw.length - 1 - i)) & 1) === 1;
      vals[s.id] = on;
      ins.push(on);
    });
    const res = settle(c, vals);
    if (!res.stable) {
      return { ok: false, message: "The circuit oscillates (feedback loop) — untangle it first." };
    }
    const got = res.state[lamp.id] ?? false;
    const want = ch.target(ins);
    if (got !== want) {
      failures.push(
        `${sw.map((s, i) => `${s.label}=${ins[i] ? 1 : 0}`).join(" ")} → lamp ${got ? 1 : 0}, expected ${want ? 1 : 0}`,
      );
    }
  }
  if (failures.length > 0) {
    return { ok: false, message: `Not yet — ${failures.length} row${failures.length > 1 ? "s" : ""} wrong. First: ${failures[0]}.` };
  }
  return { ok: true, message: `Solved with ${gateCount} gate${gateCount > 1 ? "s" : ""}! ${ch.star ? "🏅 Universality — proven by hand." : "✔"}` };
}
