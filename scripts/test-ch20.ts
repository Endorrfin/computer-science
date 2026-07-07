// Engine truth-tests for ch.20 (Computability). Same Node harness; CI-gated.
// Locks the turing-machine engine and its presets:
//   • the presets are REAL machines with the verified outcomes the chapter cites
//     (unary addition sums; palindrome decides; the 3- and 4-state busy beavers
//     halt after exactly 14 and 107 steps — Radó's Σ(3)=6, Σ(4)=13);
//   • the accept/reject/timeout trichotomy behaves (a missing rule rejects; a
//     looping machine times out — the finite-run face of the halting problem);
//   • the P5 boss is well-posed: the reference aⁿbⁿ decider passes the suite and
//     the empty starter fails it, so `checkAnBnTM` genuinely grades the boss.

import {
  BOSS_TESTS,
  PRESETS,
  REFERENCE_ANBN,
  bossStarter,
  checkAnBnTM,
  countNonBlank,
  isAnBn,
  runTM,
  tapeString,
  type TM,
} from "../src/components/sims/turing/model.ts";

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
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}
const byName = (n: string): TM => PRESETS.find((p) => p.name === n) as TM;

// ================= (A) unary addition (a transducer) =================
{
  console.log("turing-machine · unary addition:");
  const tm = byName("Unary addition");
  const sum = (a: number, b: number): number => {
    const input = "1".repeat(a) + "+" + "1".repeat(b);
    const r = runTM(tm, input);
    return countNonBlank(r.frames[r.frames.length - 1].tape, tm.blank);
  };
  eq("111+11 → 5 ones", sum(3, 2), 5);
  eq("1+1 → 2 ones", sum(1, 1), 2);
  eq("1111+1 → 5 ones", sum(4, 1), 5);
  const r = runTM(tm, "11+111");
  eq("halts in accept", r.status, "accept");
  eq("tape reads 11111", tapeString(r.frames[r.frames.length - 1].tape, tm.blank), "11111");
}

// ================= (B) palindrome (a decider) =================
{
  console.log("turing-machine · palindrome decider:");
  const tm = byName("Palindrome checker");
  const acc = (s: string): boolean => runTM(tm, s).status === "accept";
  for (const s of ["", "a", "b", "aa", "bb", "aba", "bab", "abba", "baab", "aabaa"]) {
    ok(`accepts "${s || "ε"}"`, acc(s));
  }
  for (const s of ["ab", "ba", "aab", "abb", "abab", "aabb"]) {
    ok(`rejects "${s}"`, !acc(s));
  }
  eq('"ab" halts in reject (not timeout)', runTM(tm, "ab").status, "reject");
}

// ================= (C) busy beavers (verified champions) =================
{
  console.log("turing-machine · busy beavers on a blank tape:");
  const bb3 = runTM(byName("3-state busy beaver"), "");
  eq("BB(3) halts (accept)", bb3.status, "accept");
  eq("BB(3) steps = 14", bb3.steps, 14);
  eq("BB(3) ones = 6  (Σ(3))", bb3.ones, 6);

  const bb4 = runTM(byName("4-state busy beaver"), "");
  eq("BB(4) halts (accept)", bb4.status, "accept");
  eq("BB(4) steps = 107", bb4.steps, 107);
  eq("BB(4) ones = 13 (Σ(4))", bb4.ones, 13);
}

// ================= (D) the trichotomy: accept / reject / timeout =================
{
  console.log("turing-machine · halting trichotomy:");
  // a machine with no rule for what it reads must REJECT, not hang
  const noRule: TM = {
    name: "no-rule", blurb: "", blank: "_", input: ["a"], tape: ["a", "_"],
    start: "q", states: ["q"], rules: [],
  };
  eq("missing rule ⇒ reject", runTM(noRule, "a").status, "reject");

  // a machine that runs right forever must TIME OUT within the step bound
  const loop: TM = {
    name: "loop", blurb: "", blank: "_", input: [], tape: ["_", "x"],
    start: "go", states: ["go"],
    rules: [
      { state: "go", read: "_", write: "x", move: "R", next: "go" },
      { state: "go", read: "x", write: "x", move: "R", next: "go" },
    ],
  };
  eq("runaway machine ⇒ timeout", runTM(loop, "", 500).status, "timeout");
  eq("timeout used the whole step budget", runTM(loop, "", 500).steps, 500);
}

// ================= (E) the P5 boss is well-posed =================
{
  console.log("turing-machine · aⁿbⁿ boss grader:");
  eq("isAnBn('aaabbb')", isAnBn("aaabbb"), true);
  eq("isAnBn('') (n=0)", isAnBn(""), true);
  eq("isAnBn('aab')", isAnBn("aab"), false);
  eq("isAnBn('ba')", isAnBn("ba"), false);
  ok("boss suite matches the predicate", BOSS_TESTS.every((t) => t.accept === isAnBn(t.input)));

  const ref = checkAnBnTM(REFERENCE_ANBN);
  ok("reference aⁿbⁿ machine PASSES every case", ref.passed, JSON.stringify(ref.results.filter((r) => !r.ok)));
  ok("empty starter machine FAILS the suite", !checkAnBnTM(bossStarter()).passed);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch20: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch20: all checks pass");
