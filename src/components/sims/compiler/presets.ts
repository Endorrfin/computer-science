// Preset programs for the compiler-pipeline HERO (ch.11), shared by the sim AND
// scripts/test-p3.ts so their exact behavior is locked by CI. Pure data + the
// boss win-condition (one place, tested + used by the UI). Erasable-syntax only.
//
// The mini-language (see lexer/parser/compiler/vm): let + assignment, integer
// + − × ÷ %, comparisons, and/or/not, while, if/else, print. Integer-only,
// one flat scope, no functions — recursion & the call stack are ch.10's story.

import { compileAndRun, declaresVar, usesWhile } from "./lang.ts";

export type LangPreset = {
  id: string;
  label: string;
  blurb: string;
  source: string;
};

export const PRESETS: LangPreset[] = [
  {
    id: "arith",
    label: "Arithmetic & precedence",
    blurb: "Precedence lives in the TREE, not the text: × binds tighter than +, so the AST nests (3 × 4) under +. Watch the bytecode push 2, then 3, 4, MUL, ADD.",
    source: ["// precedence lives in the tree: this parses as 2 + (3 * 4)", "print 2 + 3 * 4;"].join("\n"),
  },
  {
    id: "vars",
    label: "Variables & slots",
    blurb: "`let` declares a variable; every name becomes a numbered slot. LOAD pushes a slot's value, STORE pops into it — the VM has no named registers, just the stack and the slots.",
    source: ["// let declares; each name is a numbered slot", "let a = 10;", "let b = 4;", "print a * b - 2;"].join("\n"),
  },
  {
    id: "countdown",
    label: "A while loop",
    blurb: "A loop is just a backward JUMP in the bytecode — exactly the ch.7 CPU trick, one level up. JUMP_IF_FALSE leaves the loop when the condition hits 0.",
    source: [
      "// a loop compiles to a backward JUMP",
      "let i = 5;",
      "while (i > 0) {",
      "  print i;",
      "  i = i - 1;",
      "}",
    ].join("\n"),
  },
  {
    id: "evens",
    label: "if / else",
    blurb: "if/else is two jumps: JUMP_IF_FALSE skips to the else block, and a JUMP hops the else when the then-branch ran. Here it splits 1..6 into evens and odds.",
    source: [
      "// split 1..6 into evens and odds",
      "let n = 6;",
      "let evens = 0;",
      "let odds = 0;",
      "let i = 1;",
      "while (i <= n) {",
      "  if (i % 2 == 0) {",
      "    evens = evens + i;",
      "  } else {",
      "    odds = odds + i;",
      "  }",
      "  i = i + 1;",
      "}",
      "print evens;",
      "print odds;",
    ].join("\n"),
  },
  {
    id: "sum",
    label: "Sum 1..n (the boss shape)",
    blurb: "A running total accumulated in a loop — the exact shape the boss wants. Change n and watch the printed sum follow.",
    source: [
      "// running total: 1 + 2 + ... + 10 = 55",
      "let n = 10;",
      "let sum = 0;",
      "let i = 1;",
      "while (i <= n) {",
      "  sum = sum + i;",
      "  i = i + 1;",
      "}",
      "print sum;",
    ].join("\n"),
  },
];

export function presetById(id: string): LangPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

// ---- the P3 boss: "Language Smith" ------------------------------------------

export const BOSS_TARGET = 55; // the 10th triangular number — and the 10th Fibonacci (ch.7 callback)

// A scaffold: the data + loop skeleton, body left to the learner. It terminates
// (i increments) but prints 0 until they add the accumulation — a gentle "not
// yet" rather than an infinite loop.
export const BOSS_STARTER = [
  "// BOSS — print the target 55, using a variable and a while loop.",
  "// One path: add 1 + 2 + 3 + ... + 10. Fill in the loop body.",
  "let sum = 0;",
  "let i = 1;",
  "while (i <= 10) {",
  "  // ... add i to sum here ...",
  "  i = i + 1;",
  "}",
  "print sum;",
].join("\n");

export type BossResult = {
  pass: boolean;
  ok: boolean; // compiled + ran without error
  usesLoop: boolean; // contains a while
  usesVar: boolean; // declares a variable
  reachedTarget: boolean; // printed the target
  output: number[];
  errorMsg: string | null;
};

/** The single source of truth for winning the P3 boss: the program must compile,
    run without error, use a variable and a loop, and PRINT the target. Used by
    the sim's boss panel and locked by test-p3.ts. */
export function bossResult(source: string): BossResult {
  const { compiled, vm } = compileAndRun(source);
  const ok = compiled.ok && vm !== null && vm.error === null;
  const output = vm ? vm.output : [];
  const usesLoop = compiled.ast !== null && usesWhile(compiled.ast);
  const usesVar = compiled.ast !== null && declaresVar(compiled.ast);
  const reachedTarget = output.includes(BOSS_TARGET);
  return {
    pass: ok && usesLoop && usesVar && reachedTarget,
    ok,
    usesLoop,
    usesVar,
    reachedTarget,
    output,
    errorMsg: compiled.error ? compiled.error.message : vm && vm.error ? vm.error : null,
  };
}
