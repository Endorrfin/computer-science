// Kata truth-tests — lock the reference solutions and prove the tests bite.
// Run: node --experimental-strip-types scripts/test-katas.ts
//
// Same tiny Node harness style as test-fast-cpu / test-ch14. This imports the
// SAME modules the browser uses (KATAS + runOneCaseSync), so the semantics
// tested here are exactly what a learner experiences in the sandboxed worker.
//
// For every kata we check:
//   (a) each test PASSES against kata.solution  → the reference is correct;
//   (b) kata.starter FAILS at least one test    → the tests are meaningful and
//       the starter is genuinely incomplete;
//   (c) integrity: unique ids, chapterId ∈ {ch13…ch21}, non-empty
//       exportName / prompt / signature / tests.
// Prints a per-kata summary + totals and exits 1 on any failure.

import { KATAS } from "../src/data/katas.ts";
import { runOneCaseSync } from "../src/lib/kataSandbox.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}

// ---- (c) integrity across the whole batch -------------------------------
console.log("integrity");
{
  const ids = KATAS.map((k) => k.id);
  ok("unique kata ids", new Set(ids).size === ids.length, `ids: ${ids.join(", ")}`);
  ok("at least 10 katas", KATAS.length >= 10, `count = ${KATAS.length}`);
  for (const k of KATAS) {
    ok(
      `${k.id}: chapterId in {ch13…ch23}`,
      ["ch13", "ch14", "ch15", "ch16", "ch17", "ch18", "ch19", "ch20", "ch21", "ch22", "ch23"].includes(k.chapterId),
      `got ${k.chapterId}`,
    );
    ok(`${k.id}: non-empty exportName`, k.exportName.trim().length > 0);
    ok(`${k.id}: non-empty prompt`, k.prompt.trim().length > 0);
    ok(`${k.id}: non-empty signature`, k.signature.trim().length > 0);
    ok(`${k.id}: has tests`, k.tests.length > 0, `count = ${k.tests.length}`);
    ok(
      `${k.id}: difficulty is valid`,
      k.difficulty === "intro" || k.difficulty === "core" || k.difficulty === "stretch",
      `got ${k.difficulty}`,
    );
    ok(`${k.id}: starter mentions exportName`, k.starter.includes(k.exportName));
    ok(`${k.id}: solution mentions exportName`, k.solution.includes(k.exportName));
  }
}

// ---- (a) + (b) per-kata solution/starter behaviour ----------------------
let solutionCasesPassed = 0;
let solutionCasesTotal = 0;

for (const k of KATAS) {
  console.log(`\n${k.id} — ${k.title} (${k.tests.length} tests)`);

  // (a) every test passes against the solution.
  let allSolutionPass = true;
  for (const t of k.tests) {
    const r = runOneCaseSync(k.solution, t.body);
    solutionCasesTotal++;
    if (r.ok) solutionCasesPassed++;
    else allSolutionPass = false;
    ok(`solution · ${t.name}`, r.ok, r.error);
  }
  ok(`${k.id}: ALL solution tests pass`, allSolutionPass);

  // (b) the starter fails at least one test.
  const starterResults = k.tests.map((t) => runOneCaseSync(k.starter, t.body));
  const starterFailures = starterResults.filter((r) => !r.ok).length;
  ok(
    `${k.id}: starter fails at least one test (${starterFailures}/${k.tests.length} failing)`,
    starterFailures > 0,
  );
}

// ---- totals -------------------------------------------------------------
console.log(
  `\nsolutions: ${solutionCasesPassed}/${solutionCasesTotal} test cases pass across ${KATAS.length} katas`,
);

if (failed > 0) {
  console.error(`\n✗ test-katas: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("✓ test-katas: all checks pass");
