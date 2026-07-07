// Engine — turing-machine (ch.20 HERO). A single-tape deterministic Turing
// machine in the modern (Sipser) convention: transitions are
//   (state, read) → (write, move L/R, next-state)
// and computation ends by entering one of two distinguished halt states,
// `accept` or `reject`. That accept/reject split is exactly what a *decider*
// needs (the P5 boss "accepts aⁿbⁿ" is "does it halt in accept?"), and it
// still models plain computation: the busy-beaver presets simply halt into
// `accept` and we read the tape / step count off the final config.
//
// Conventions that matter (and are pinned by scripts/test-ch20.ts):
//  • The tape is two-way infinite; unwritten cells read as the machine's blank.
//  • EVERY transition writes and moves — including the transition into a halt
//    state — so `steps` is Radó's max-shifts count. That's why the verified
//    3-state busy beaver reports 14 steps (Σ(3)=6 ones) and BB(4) reports 107.
//  • A missing rule for (state, read) is an implicit move to `reject` (a real
//    machine's "no instruction" = stop-and-reject), so deciders never wedge.
//  • runTM is step-bounded: if it neither accepts nor rejects within maxSteps
//    it returns status "timeout" — the only honest thing a finite run can say
//    about a machine that might loop forever (the halting problem, ch.20 §).
//
// No React import — this file runs under Node for the tests and is the single
// source of truth the component renders from.

export type Move = "L" | "R";

export type TMRule = {
  state: string;
  read: string;
  write: string;
  move: Move;
  next: string;
};

export type TM = {
  name: string;
  blurb: string;
  blank: string; // the symbol an unwritten cell reads as ("_" or "0")
  input: string[]; // input alphabet (what the user may type)
  tape: string[]; // full tape alphabet (input + blank + scratch)
  start: string;
  states: string[]; // non-halting states, start first
  rules: TMRule[]; // partial transition function; missing ⇒ reject
};

export const ACCEPT = "accept";
export const REJECT = "reject";

export type TMStatus = "accept" | "reject" | "timeout";

export type TMConfig = {
  state: string;
  head: number;
  tape: Record<number, string>; // sparse; absent ⇒ blank
};

export type TMTrace = {
  frames: TMConfig[]; // frames[0] = initial; frames[k] = config AFTER k steps
  status: TMStatus;
  steps: number; // shifts taken (= max-shifts convention)
  ones: number; // count of non-blank cells at halt (busy-beaver "score")
};

const DEFAULT_MAX_STEPS = 20000;
const MAX_FRAMES = 4000; // cap stored frames; steps/status stay exact past this

// ------------------------------- tape helpers -------------------------------

export function readCell(tape: Record<number, string>, i: number, blank: string): string {
  const v = tape[i];
  return v === undefined ? blank : v;
}

/** Bounds of the written region (for rendering a centered window). */
export function tapeBounds(tape: Record<number, string>, blank: string): { lo: number; hi: number } {
  const keys = Object.keys(tape)
    .map(Number)
    .filter((k) => tape[k] !== blank);
  if (keys.length === 0) return { lo: 0, hi: 0 };
  return { lo: Math.min(...keys), hi: Math.max(...keys) };
}

/** Count non-blank cells — the busy-beaver Σ ("ones on the tape") score. */
export function countNonBlank(tape: Record<number, string>, blank: string): number {
  let n = 0;
  for (const k of Object.keys(tape)) if (tape[Number(k)] !== blank) n++;
  return n;
}

/** The written tape as a compact string (blanks inside the region kept). */
export function tapeString(tape: Record<number, string>, blank: string): string {
  const { lo, hi } = tapeBounds(tape, blank);
  let s = "";
  for (let i = lo; i <= hi; i++) s += readCell(tape, i, blank);
  return s;
}

// ------------------------------- the machine -------------------------------

function ruleFor(tm: TM, state: string, read: string): TMRule | undefined {
  for (const r of tm.rules) if (r.state === state && r.read === read) return r;
  return undefined;
}

/** One step from a config. Returns the next config and whether it halted.
    A missing rule halts in `reject` (writing nothing, not moving). */
export function stepTM(tm: TM, c: TMConfig): { config: TMConfig; halted: boolean; status: TMStatus | null } {
  if (c.state === ACCEPT) return { config: c, halted: true, status: "accept" };
  if (c.state === REJECT) return { config: c, halted: true, status: "reject" };
  const read = readCell(c.tape, c.head, tm.blank);
  const rule = ruleFor(tm, c.state, read);
  if (!rule) {
    return { config: { ...c, state: REJECT }, halted: true, status: "reject" };
  }
  const tape = { ...c.tape };
  tape[c.head] = rule.write;
  const head = c.head + (rule.move === "R" ? 1 : -1);
  const next: TMConfig = { state: rule.next, head, tape };
  if (rule.next === ACCEPT) return { config: next, halted: true, status: "accept" };
  if (rule.next === REJECT) return { config: next, halted: true, status: "reject" };
  return { config: next, halted: false, status: null };
}

export function initialConfig(tm: TM, input: string): TMConfig {
  const tape: Record<number, string> = {};
  for (let i = 0; i < input.length; i++) tape[i] = input[i];
  return { state: tm.start, head: 0, tape };
}

/** Run to a halt or the step bound, recording frames for animation. */
export function runTM(tm: TM, input: string, maxSteps: number = DEFAULT_MAX_STEPS): TMTrace {
  let c = initialConfig(tm, input);
  const frames: TMConfig[] = [c];
  let steps = 0;
  let status: TMStatus = "timeout";
  while (steps < maxSteps) {
    const s = stepTM(tm, c);
    c = s.config;
    steps++;
    if (frames.length < MAX_FRAMES) frames.push(c);
    if (s.halted) {
      status = s.status as TMStatus;
      break;
    }
  }
  return { frames, status, steps, ones: countNonBlank(c.tape, tm.blank) };
}

/** Convenience: does this machine ACCEPT the input within the bound? */
export function accepts(tm: TM, input: string, maxSteps: number = DEFAULT_MAX_STEPS): boolean {
  return runTM(tm, input, maxSteps).status === "accept";
}

// ------------------------------- presets -------------------------------
// Every preset is a real machine the tests execute; they are the chapter's
// touchable claims. Busy beavers use the classic 0/1 tape with blank 0 and
// halt into `accept` (there is no reject branch to reach).

/** Unary addition transducer: `111+11` → tape holds `11111` (m+n ones). */
const unaryAdd: TM = {
  name: "Unary addition",
  blurb: "m ones, a +, n ones → m+n ones. Overwrite the + with a 1, then erase one 1 at the far end.",
  blank: "_",
  input: ["1", "+"],
  tape: ["1", "+", "_"],
  start: "scan",
  states: ["scan", "toEnd", "erase"],
  rules: [
    { state: "scan", read: "1", write: "1", move: "R", next: "scan" },
    { state: "scan", read: "+", write: "1", move: "R", next: "toEnd" },
    { state: "scan", read: "_", write: "_", move: "L", next: "erase" }, // no '+': already a sum
    { state: "toEnd", read: "1", write: "1", move: "R", next: "toEnd" },
    { state: "toEnd", read: "_", write: "_", move: "L", next: "erase" },
    { state: "erase", read: "1", write: "_", move: "L", next: ACCEPT },
    { state: "erase", read: "_", write: "_", move: "R", next: ACCEPT },
  ],
};

/** Palindrome decider over {a,b}: match the ends inward, erasing as it goes. */
const palindrome: TM = {
  name: "Palindrome checker",
  blurb: "Accepts strings over {a,b} that read the same both ways. Erase the left end, march to the right end, check it matches, repeat.",
  blank: "_",
  input: ["a", "b"],
  tape: ["a", "b", "_"],
  start: "read",
  states: ["read", "haveA", "haveB", "endA", "endB", "back"],
  rules: [
    { state: "read", read: "a", write: "_", move: "R", next: "haveA" },
    { state: "read", read: "b", write: "_", move: "R", next: "haveB" },
    { state: "read", read: "_", write: "_", move: "R", next: ACCEPT }, // empty middle ⇒ palindrome
    { state: "haveA", read: "a", write: "a", move: "R", next: "haveA" },
    { state: "haveA", read: "b", write: "b", move: "R", next: "haveA" },
    { state: "haveA", read: "_", write: "_", move: "L", next: "endA" },
    { state: "haveB", read: "a", write: "a", move: "R", next: "haveB" },
    { state: "haveB", read: "b", write: "b", move: "R", next: "haveB" },
    { state: "haveB", read: "_", write: "_", move: "L", next: "endB" },
    { state: "endA", read: "a", write: "_", move: "L", next: "back" },
    { state: "endA", read: "b", write: "b", move: "L", next: REJECT },
    { state: "endA", read: "_", write: "_", move: "R", next: ACCEPT }, // one char left (odd)
    { state: "endB", read: "b", write: "_", move: "L", next: "back" },
    { state: "endB", read: "a", write: "a", move: "L", next: REJECT },
    { state: "endB", read: "_", write: "_", move: "R", next: ACCEPT },
    { state: "back", read: "a", write: "a", move: "L", next: "back" },
    { state: "back", read: "b", write: "b", move: "L", next: "back" },
    { state: "back", read: "_", write: "_", move: "R", next: "read" },
  ],
};

/** Verified 3-state busy beaver (Σ(3)=6 ones, 14 steps). Table from Wikipedia
    (states A/B/C, halt = accept, blank 0). S(3)=21 is a *different* machine —
    the chapter explains the Σ-vs-S distinction. */
const busyBeaver3: TM = {
  name: "3-state busy beaver",
  blurb: "Radó's champion for 3 states: starting on a blank tape it writes six 1s and halts after 14 steps. (Max steps for 3 states, S(3), is 21 — a different machine.)",
  blank: "0",
  input: [],
  tape: ["0", "1"],
  start: "A",
  states: ["A", "B", "C"],
  rules: [
    { state: "A", read: "0", write: "1", move: "R", next: "B" },
    { state: "A", read: "1", write: "1", move: "R", next: ACCEPT },
    { state: "B", read: "0", write: "0", move: "R", next: "C" },
    { state: "B", read: "1", write: "1", move: "R", next: "B" },
    { state: "C", read: "0", write: "1", move: "L", next: "C" },
    { state: "C", read: "1", write: "1", move: "L", next: "A" },
  ],
};

/** Verified 4-state busy beaver (Σ(4)=13 ones, S(4)=107 steps). */
const busyBeaver4: TM = {
  name: "4-state busy beaver",
  blurb: "The 4-state champion: 13 ones, 107 steps on a blank tape. Two more states, and the run is already 7× longer.",
  blank: "0",
  input: [],
  tape: ["0", "1"],
  start: "A",
  states: ["A", "B", "C", "D"],
  rules: [
    { state: "A", read: "0", write: "1", move: "R", next: "B" },
    { state: "A", read: "1", write: "1", move: "L", next: "B" },
    { state: "B", read: "0", write: "1", move: "L", next: "A" },
    { state: "B", read: "1", write: "0", move: "L", next: "C" },
    { state: "C", read: "0", write: "1", move: "R", next: ACCEPT },
    { state: "C", read: "1", write: "1", move: "L", next: "D" },
    { state: "D", read: "0", write: "1", move: "R", next: "D" },
    { state: "D", read: "1", write: "0", move: "R", next: "A" },
  ],
};

export const PRESETS: TM[] = [unaryAdd, palindrome, busyBeaver3, busyBeaver4];

// ------------------------------- the P5 boss -------------------------------
// The boss is "build a TM that accepts L = { aⁿbⁿ : n ≥ 0 }" — the canonical
// non-regular language ch.19 proved no DFA can do (pumping lemma), so it needs
// the tape. The validator runs the USER's machine against a fixed suite and
// requires it to DECIDE correctly: accept every aⁿbⁿ and halt-in-reject on
// everything else (a timeout is a fail — a decider must halt).

/** L(aⁿbⁿ) membership, n ≥ 0 (so "" ∈ L). */
export function isAnBn(s: string): boolean {
  let i = 0;
  while (s[i] === "a") i++;
  const a = i;
  while (s[i] === "b") i++;
  const b = i - a;
  return i === s.length && a === b;
}

export const BOSS_TESTS: { input: string; accept: boolean }[] = [
  { input: "", accept: true },
  { input: "ab", accept: true },
  { input: "aabb", accept: true },
  { input: "aaabbb", accept: true },
  { input: "aaaabbbb", accept: true },
  { input: "a", accept: false },
  { input: "b", accept: false },
  { input: "ba", accept: false },
  { input: "abb", accept: false },
  { input: "aab", accept: false },
  { input: "aba", accept: false },
  { input: "bb", accept: false },
  { input: "aabbb", accept: false },
  { input: "aaabb", accept: false },
  { input: "abab", accept: false },
  { input: "aaabbbb", accept: false },
];

export type BossResult = {
  passed: boolean;
  results: { input: string; expect: boolean; got: TMStatus; ok: boolean }[];
};

/** Grade a candidate aⁿbⁿ machine. A case passes iff the machine halts in the
    expected accept/reject state within the step bound. */
export function checkAnBnTM(tm: TM, maxSteps: number = 4000): BossResult {
  const results = BOSS_TESTS.map((t) => {
    const status = runTM(tm, t.input, maxSteps).status;
    const ok = t.accept ? status === "accept" : status === "reject";
    return { input: t.input, expect: t.accept, got: status, ok };
  });
  return { passed: results.every((r) => r.ok), results };
}

/** A correct reference aⁿbⁿ decider — NOT shown as a preset (it would spoil the
    boss); used only by the tests to prove the suite is satisfiable. Cross off
    matched a/b pairs from the ends until the tape is empty. */
export const REFERENCE_ANBN: TM = {
  name: "aⁿbⁿ (reference)",
  blurb: "reference decider for the tests",
  blank: "_",
  input: ["a", "b"],
  tape: ["a", "b", "X", "Y", "_"],
  start: "q0",
  states: ["q0", "q1", "q2", "q3"],
  rules: [
    // q0: at the left, mark an 'a' as X and go find the matching 'b'
    { state: "q0", read: "a", write: "X", move: "R", next: "q1" },
    { state: "q0", read: "Y", write: "Y", move: "R", next: "q3" }, // only Y's remain ⇒ check
    { state: "q0", read: "_", write: "_", move: "R", next: ACCEPT }, // empty ⇒ accept ("")
    // q1: skip a's and already-matched Y's, find the first b
    { state: "q1", read: "a", write: "a", move: "R", next: "q1" },
    { state: "q1", read: "Y", write: "Y", move: "R", next: "q1" },
    { state: "q1", read: "b", write: "Y", move: "L", next: "q2" },
    // q2: walk back left to the last X, then step right to the next 'a'
    { state: "q2", read: "a", write: "a", move: "L", next: "q2" },
    { state: "q2", read: "Y", write: "Y", move: "L", next: "q2" },
    { state: "q2", read: "X", write: "X", move: "R", next: "q0" },
    // q3: no a's left — the rest must be all Y (equal counts) then blank
    { state: "q3", read: "Y", write: "Y", move: "R", next: "q3" },
    { state: "q3", read: "_", write: "_", move: "R", next: ACCEPT },
  ],
};

/** A blank-ish scaffold the boss editor starts from (a/b alphabet, one state). */
export function bossStarter(): TM {
  return {
    name: "your aⁿbⁿ machine",
    blurb: "Edit the rule table so it accepts exactly aⁿbⁿ.",
    blank: "_",
    input: ["a", "b"],
    tape: ["a", "b", "X", "Y", "_"],
    start: "q0",
    states: ["q0"],
    rules: [{ state: "q0", read: "_", write: "_", move: "R", next: ACCEPT }],
  };
}
