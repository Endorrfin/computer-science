// Engine — nqueens-backtracker (ch.18 micro). Place N queens on an N×N board so
// none attack another. Backtracking is DFS over partial solutions: put a queen in
// the next row, and if it conflicts with one already placed (same column or
// diagonal), reject and try the next column; if a row runs out of safe columns,
// BACK TRACK — undo the previous row's queen and continue from where it left off.
// The "tries" counter is every placement ATTEMPT (safe or not): it's how you feel
// the search tree being pruned. Solution counts are the famous sequence
// 1,0,0,2,10,4,40,92 for N=1..8 — pinned in test-ch18.ts.
//
// No React import — runs under Node for the tests.

// `board` is the committed placement (cols[row]=col) at the moment the event
// fires, so the sim can render the board directly without re-deriving it.
export type QEvent =
  | { kind: "place"; row: number; col: number; tries: number; board: number[] }
  | { kind: "reject"; row: number; col: number; reason: "column" | "diagonal"; tries: number; board: number[] }
  | { kind: "backtrack"; row: number; tries: number; board: number[] }
  | { kind: "solution"; cols: number[]; tries: number; board: number[] };

export type NQueensResult = {
  n: number;
  count: number;
  tries: number; // total placement attempts (safe + rejected)
  solutions: number[][]; // each is cols[row] = column of the queen in that row
  trace: QEvent[];
};

function conflict(cols: number[], row: number, col: number): "column" | "diagonal" | null {
  for (let r = 0; r < row; r++) {
    if (cols[r] === col) return "column";
    if (Math.abs(cols[r] - col) === row - r) return "diagonal";
  }
  return null;
}

/** Full solve WITH an event trace — used by the animated sim. Bounded N keeps
    the trace sane (the sim caps its selector at 8). */
export function solveNQueens(n: number): NQueensResult {
  const solutions: number[][] = [];
  const trace: QEvent[] = [];
  const cols: number[] = [];
  let tries = 0;

  const place = (row: number): void => {
    if (row === n) {
      solutions.push([...cols]);
      trace.push({ kind: "solution", cols: [...cols], tries, board: [...cols] });
      return;
    }
    for (let col = 0; col < n; col++) {
      tries++;
      const c = conflict(cols, row, col);
      if (c) {
        trace.push({ kind: "reject", row, col, reason: c, tries, board: [...cols] });
        continue;
      }
      cols[row] = col;
      trace.push({ kind: "place", row, col, tries, board: [...cols] });
      place(row + 1);
      cols.pop();
    }
    if (row > 0) trace.push({ kind: "backtrack", row: row - 1, tries, board: [...cols] });
  };

  place(0);
  return { n, count: solutions.length, tries, solutions, trace };
}

/** Just the solution count — fast (no trace) so the tests can sweep N=1..8. */
export function countSolutions(n: number): number {
  let count = 0;
  const cols: number[] = [];
  const place = (row: number): void => {
    if (row === n) {
      count++;
      return;
    }
    for (let col = 0; col < n; col++) {
      if (!conflict(cols, row, col)) {
        cols[row] = col;
        place(row + 1);
      }
    }
  };
  place(0);
  return count;
}

/** Brute-force attempts for the naive "try every full assignment" baseline: Nⁿ.
    Contrast with `tries` to show how much backtracking prunes. */
export function bruteForceAssignments(n: number): number {
  return Math.pow(n, n);
}
