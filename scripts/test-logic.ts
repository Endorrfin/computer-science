// Engine truth-tests for the logic-sandbox model (convention from the
// sibling Node-guide: every sim engine gets a Node-run test; CI-gated).
import {
  evalGate,
  settle,
  step,
  truthTable,
} from "../src/components/sims/logic-sandbox/model.ts";
import type { Circuit } from "../src/components/sims/logic-sandbox/model.ts";
import { CHALLENGES, checkChallenge } from "../src/components/sims/logic-sandbox/challenges.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}

// ---- gate semantics ----
{
  const t = (k: Parameters<typeof evalGate>[0]) =>
    [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ].map(([a, b]) => evalGate(k, [a, b]));
  eq("AND", t("AND"), [false, false, false, true]);
  eq("OR", t("OR"), [false, true, true, true]);
  eq("XOR", t("XOR"), [false, true, true, false]);
  eq("NAND", t("NAND"), [true, true, true, false]);
  eq("NOR", t("NOR"), [true, false, false, false]);
  eq("NOT", [evalGate("NOT", [false]), evalGate("NOT", [true])], [true, false]);
}

// ---- settle + truth table on A AND B ----
{
  const c: Circuit = {
    nodes: [
      { id: "s1", kind: "SWITCH", x: 0, y: 0, label: "A" },
      { id: "s2", kind: "SWITCH", x: 0, y: 0, label: "B" },
      { id: "g", kind: "AND", x: 0, y: 0 },
      { id: "l", kind: "LAMP", x: 0, y: 0, label: "L1" },
    ],
    wires: [
      { id: "w1", from: "s1", to: "g", toPort: 0 },
      { id: "w2", from: "s2", to: "g", toPort: 1 },
      { id: "w3", from: "g", to: "l", toPort: 0 },
    ],
  };
  const r = settle(c, { s1: true, s2: true });
  eq("AND settles stable", r.stable, true);
  eq("AND lamp on for 1,1", r.state["l"], true);
  const tt = truthTable(c);
  eq(
    "AND truth column",
    tt?.rows.map((row) => row.outputs[0]),
    [false, false, false, true],
  );
}

// ---- floating input reads 0 ----
{
  const c: Circuit = {
    nodes: [
      { id: "s1", kind: "SWITCH", x: 0, y: 0, label: "A" },
      { id: "g", kind: "AND", x: 0, y: 0 },
      { id: "l", kind: "LAMP", x: 0, y: 0, label: "L1" },
    ],
    wires: [
      { id: "w1", from: "s1", to: "g", toPort: 0 }, // port 1 left floating
      { id: "w2", from: "g", to: "l", toPort: 0 },
    ],
  };
  eq("floating second input → AND stays 0", settle(c, { s1: true }).state["l"], false);
}

// ---- feedback loop oscillates (the ch.6 teaser) ----
{
  const c: Circuit = {
    nodes: [{ id: "n", kind: "NOT", x: 0, y: 0 }],
    wires: [{ id: "w", from: "n", to: "n", toPort: 0 }],
  };
  eq("NOT self-loop never stabilizes", settle(c, {}).stable, false);
  const s1 = step(c, { n: false }, {});
  const s2 = step(c, s1.next, {});
  eq("NOT self-loop flips every tick", [s1.next["n"], s2.next["n"]], [true, false]);
}

// ---- challenges: canonical solutions must pass, wrong ones must fail ----
{
  const notFromNand: Circuit = {
    nodes: [
      { id: "s1", kind: "SWITCH", x: 0, y: 0, label: "A" },
      { id: "g", kind: "NAND", x: 0, y: 0 },
      { id: "l", kind: "LAMP", x: 0, y: 0, label: "L1" },
    ],
    wires: [
      { id: "w1", from: "s1", to: "g", toPort: 0 },
      { id: "w2", from: "s1", to: "g", toPort: 1 },
      { id: "w3", from: "g", to: "l", toPort: 0 },
    ],
  };
  eq("① NOT-from-NAND passes", checkChallenge(notFromNand, CHALLENGES[0]).ok, true);

  // XOR from 4 NANDs: m = A⊼B; out = (A⊼m) ⊼ (B⊼m)
  const xorFromNand: Circuit = {
    nodes: [
      { id: "s1", kind: "SWITCH", x: 0, y: 0, label: "A" },
      { id: "s2", kind: "SWITCH", x: 0, y: 0, label: "B" },
      { id: "m", kind: "NAND", x: 0, y: 0 },
      { id: "g1", kind: "NAND", x: 0, y: 0 },
      { id: "g2", kind: "NAND", x: 0, y: 0 },
      { id: "out", kind: "NAND", x: 0, y: 0 },
      { id: "l", kind: "LAMP", x: 0, y: 0, label: "L1" },
    ],
    wires: [
      { id: "w1", from: "s1", to: "m", toPort: 0 },
      { id: "w2", from: "s2", to: "m", toPort: 1 },
      { id: "w3", from: "s1", to: "g1", toPort: 0 },
      { id: "w4", from: "m", to: "g1", toPort: 1 },
      { id: "w5", from: "s2", to: "g2", toPort: 0 },
      { id: "w6", from: "m", to: "g2", toPort: 1 },
      { id: "w7", from: "g1", to: "out", toPort: 0 },
      { id: "w8", from: "g2", to: "out", toPort: 1 },
      { id: "w9", from: "out", to: "l", toPort: 0 },
    ],
  };
  eq("③ XOR-from-4-NAND passes", checkChallenge(xorFromNand, CHALLENGES[2]).ok, true);
  eq("③ rejects an OR wired instead of XOR", checkChallenge(xorFromNand, CHALLENGES[1]).ok, false);

  const withIllegalGate: Circuit = {
    ...xorFromNand,
    nodes: xorFromNand.nodes.map((n) => (n.id === "m" ? { ...n, kind: "XOR" as const } : n)),
  };
  eq("③ rejects non-NAND gates", checkChallenge(withIllegalGate, CHALLENGES[2]).ok, false);
}

if (failed > 0) {
  console.error(`\n✗ ${failed} logic test(s) failed`);
  process.exit(1);
}
console.log("✓ logic-sandbox engine truth-tests pass");
