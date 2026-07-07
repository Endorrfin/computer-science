// Engine — dp-table-filler (ch.18 micro). The longest common subsequence, told
// twice. NAIVE recursion re-solves the same overlapping subproblems again and
// again — lcs(i,j) fans out into lcs(i−1,j) and lcs(i,j−1), and the identical
// (i,j) states reappear all over the tree, so the call count explodes roughly
// like 2^(m+n). DYNAMIC PROGRAMMING fills each (i,j) state exactly once into a
// table of (m+1)(n+1) cells — every cell is O(1) from its top/left/diagonal
// neighbours — turning exponential into O(m·n). The sim shows the exploding tree
// next to the table filling cell-by-cell; this module supplies both, and
// test-ch18.ts pins that lengths agree and that recursion ≫ cells.
//
// No React import — runs under Node for the tests.

export type Origin = "diag" | "up" | "left" | "none";

export type LcsTable = {
  a: string;
  b: string;
  m: number; // a.length
  n: number; // b.length
  dp: number[][]; // (m+1) × (n+1)
  origin: Origin[][]; // how each cell got its value (for the backtrace arrows)
  length: number; // dp[m][n]
  subsequence: string;
  cells: number; // (m+1)*(n+1) — states DP fills
};

/** Fill the LCS table bottom-up and record where each cell's value came from. */
export function lcsTable(a: string, b: string): LcsTable {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  const origin: Origin[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => "none" as Origin));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        origin[i][j] = "diag";
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        dp[i][j] = dp[i - 1][j];
        origin[i][j] = "up";
      } else {
        dp[i][j] = dp[i][j - 1];
        origin[i][j] = "left";
      }
    }
  }
  // backtrace the actual subsequence from (m, n)
  let i = m;
  let j = n;
  const chars: string[] = [];
  while (i > 0 && j > 0) {
    if (origin[i][j] === "diag") {
      chars.push(a[i - 1]);
      i--;
      j--;
    } else if (origin[i][j] === "up") {
      i--;
    } else {
      j--;
    }
  }
  return { a, b, m, n, dp, origin, length: dp[m][n], subsequence: chars.reverse().join(""), cells: (m + 1) * (n + 1) };
}

export function lcsLength(a: string, b: string): number {
  return lcsTable(a, b).length;
}

/** Count invocations of the NAIVE (memo-free) recursion — the exploding tree.
    Capped so a careless UI input can't hang; the cap is far above any demo. */
export function lcsRecursionCalls(a: string, b: string, cap = 500000): number {
  let calls = 0;
  let hitCap = false;
  const rec = (i: number, j: number): number => {
    if (hitCap) return 0;
    calls++;
    if (calls >= cap) {
      hitCap = true;
      return 0;
    }
    if (i === 0 || j === 0) return 0;
    if (a[i - 1] === b[j - 1]) return rec(i - 1, j - 1) + 1;
    const up = rec(i - 1, j);
    const left = rec(i, j - 1);
    return up >= left ? up : left;
  };
  rec(a.length, b.length);
  return calls;
}

/** Row-major fill order (skipping the zero border) — the cells the sim lights up
    one at a time as the table is built. */
export function fillOrder(m: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) out.push([i, j]);
  return out;
}

export function demoPair(): { a: string; b: string } {
  return { a: "AGCAT", b: "GAC" };
}
