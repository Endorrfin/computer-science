// Engine truth-tests for ch.18 (Design paradigms): dynamic programming (LCS
// table), backtracking (N-queens), and greedy (coin change). Same Node harness
// as test-ch17; CI-gated. These lock the claims the chapter's three sims make:
//   • DP: LCS length is correct on classic cases; the table fills exactly
//     (m+1)(n+1) cells while the NAIVE recursion explodes far past that — the
//     whole reason memoization exists; the backtrace is a real common subsequence.
//   • Backtracking: N-queens solution counts are the famous 1,0,0,2,10,4,40,92,
//     every reported solution is genuinely conflict-free, and pruning makes the
//     attempt count a tiny fraction of the Nⁿ brute force.
//   • Greedy: it's optimal on canonical coin systems and provably beaten on
//     {1,3,4} at amount 6 — found automatically by the counterexample search.

import {
  fillOrder,
  lcsLength,
  lcsRecursionCalls,
  lcsTable,
} from "../src/components/sims/dp-table-filler/model.ts";
import {
  bruteForceAssignments,
  countSolutions,
  solveNQueens,
} from "../src/components/sims/nqueens-backtracker/model.ts";
import {
  findCounterexample,
  greedyChange,
  isCanonical,
  optimalChange,
} from "../src/components/sims/greedy-fails/model.ts";

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

// is `sub` a subsequence of `s` (chars in order, gaps allowed)?
function isSubsequence(sub: string, s: string): boolean {
  let i = 0;
  for (const ch of s) if (i < sub.length && ch === sub[i]) i++;
  return i === sub.length;
}

// ================= (A) dynamic programming — LCS =================
{
  console.log("dp-table-filler · LCS correctness:");
  eq("LCS(AGCAT, GAC) = 2", lcsLength("AGCAT", "GAC"), 2);
  eq("LCS(ABCBDAB, BDCAB) = 4", lcsLength("ABCBDAB", "BDCAB"), 4);
  eq("LCS(empty, ABC) = 0", lcsLength("", "ABC"), 0);
  eq("LCS(ABC, ABC) = 3", lcsLength("ABC", "ABC"), 3);
  eq("LCS(ABCDEF, GHIJK) = 0 (disjoint)", lcsLength("ABCDEF", "GHIJK"), 0);

  const t = lcsTable("ABCBDAB", "BDCAB");
  eq("table corner dp[m][n] == length", t.dp[t.m][t.n], t.length);
  eq("table fills exactly (m+1)(n+1) cells", t.cells, (7 + 1) * (5 + 1));
  eq("fillOrder covers m·n interior cells", fillOrder(t.m, t.n).length, 7 * 5);
  eq("backtraced subsequence has LCS length", t.subsequence.length, t.length);
  ok("backtrace is a subsequence of BOTH inputs", isSubsequence(t.subsequence, t.a) && isSubsequence(t.subsequence, t.b));
}
{
  console.log("dp-table-filler · naive recursion explodes past the table:");
  // For a mismatch-heavy pair the memo-free recursion balloons; DP stays m·n.
  const a = "AGCAT";
  const b = "GAC";
  const t = lcsTable(a, b);
  const calls = lcsRecursionCalls(a, b);
  ok(`recursion calls (${calls}) > table cells (${t.cells}) even on a matchy pair`, calls > t.cells);
  // disjoint length-7 strings: pure O(2^n) shape, thousands of calls vs 64 cells
  const big = lcsRecursionCalls("ABCDEFG", "HIJKLMN");
  ok(`disjoint 7×7 recursion is huge (${big} calls)`, big > 1000);
  eq("…while its DP table is just 64 cells", lcsTable("ABCDEFG", "HIJKLMN").cells, 64);
}

// ================= (B) backtracking — N-queens =================
{
  console.log("nqueens-backtracker · the famous solution counts:");
  const want = [1, 0, 0, 2, 10, 4, 40, 92];
  const got = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => countSolutions(n));
  eq("N=1..8 counts = 1,0,0,2,10,4,40,92", got, want);
}
{
  console.log("nqueens-backtracker · traced solve is consistent & pruned:");
  const r = solveNQueens(6);
  eq("solveNQueens(6).count == 4", r.count, 4);
  eq("count matches solutions array length", r.count, r.solutions.length);
  // every reported solution is a genuine non-attacking placement
  const validSolution = (cols: number[]): boolean => {
    for (let i = 0; i < cols.length; i++)
      for (let j = i + 1; j < cols.length; j++) {
        if (cols[i] === cols[j]) return false; // same column
        if (Math.abs(cols[i] - cols[j]) === j - i) return false; // diagonal
      }
    return true;
  };
  ok("all 6-queens solutions are conflict-free", r.solutions.every(validSolution));
  const solEvents = r.trace.filter((e) => e.kind === "solution").length;
  eq("trace emits one 'solution' event per solution", solEvents, r.count);
  ok(`tries (${r.tries}) ≪ brute force 6⁶ = ${bruteForceAssignments(6)}`, r.tries < bruteForceAssignments(6));
  ok("tries are counted (non-trivial search)", r.tries > r.count);
}

// ================= (C) greedy — when it wins and when it loses =================
{
  console.log("greedy-fails · canonical vs broken coin systems:");
  // US cents: greedy is optimal everywhere
  eq("greedy(1,5,10,25 · 63) = 6 coins", greedyChange([1, 5, 10, 25], 63).count, 6);
  eq("optimal(1,5,10,25 · 63) = 6 coins", optimalChange([1, 5, 10, 25], 63).count, 6);
  ok("US system is canonical (no counterexample ≤ 100)", isCanonical([1, 5, 10, 25], 100));
  eq("no counterexample for US cents", findCounterexample([1, 5, 10, 25], 100), null);

  // the textbook break: {1,3,4} at amount 6
  eq("greedy(1,3,4 · 6) = 3 coins (4+1+1)", greedyChange([1, 3, 4], 6).count, 3);
  eq("optimal(1,3,4 · 6) = 2 coins (3+3)", optimalChange([1, 3, 4], 6).count, 2);
  eq("counterexample search finds amount 6", findCounterexample([1, 3, 4], 20), { amount: 6, greedy: 3, optimal: 2 });
  ok("{1,3,4} is NOT canonical", !isCanonical([1, 3, 4], 20));
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch18: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch18: all checks pass");
