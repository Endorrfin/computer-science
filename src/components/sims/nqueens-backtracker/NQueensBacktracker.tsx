// [micro] nqueens-backtracker — backtracking made visible. Place a queen in the
// next row; if it shares a column or diagonal with one already down, REJECT and
// slide to the next column; if a row has no safe square, BACK TRACK and re-try the
// previous row. The "tries" counter is every attempt, safe or not — watch pruning
// keep it far below the Nⁿ brute force. Default stops at the first solution; switch
// to "all" to count them. Reduced motion: Step advances one attempt.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { bruteForceAssignments, solveNQueens } from "./model.ts";

const ACCENT = "#34D399";
type Mode = "first" | "all";

export default function NQueensBacktracker() {
  const [n, setN] = useState(6);
  const [mode, setMode] = useState<Mode>("first");
  const [k, setK] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const full = useMemo(() => solveNQueens(n), [n]);
  const trace = useMemo(() => {
    if (mode === "all") return full.trace;
    const fi = full.trace.findIndex((e) => e.kind === "solution");
    return fi >= 0 ? full.trace.slice(0, fi + 1) : full.trace;
  }, [full, mode]);
  const len = trace.length;
  const atEnd = k >= len;

  useSimClock(running, 6 * speed, () => {
    setK((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  const ev = k > 0 ? trace[k - 1] : null;
  const board = ev ? ev.board : [];
  const triesSoFar = ev ? ev.tries : 0;
  const solutionsSoFar = useMemo(() => trace.slice(0, k).filter((e) => e.kind === "solution").length, [trace, k]);

  function reset(): void { setRunning(false); setK(0); }
  function pickN(next: number): void { setN(next); setRunning(false); setK(0); }
  function pickMode(m: Mode): void { setMode(m); setRunning(false); setK(0); }

  const actionText =
    !ev
      ? `${n}-queens · ${full.count} solution${full.count === 1 ? "" : "s"} exist. Play or Step to watch the search.`
      : ev.kind === "place"
        ? `Place a queen at row ${ev.row + 1}, col ${ev.col + 1} — safe so far.`
        : ev.kind === "reject"
          ? `Reject row ${ev.row + 1}, col ${ev.col + 1} — ${ev.reason} conflict.`
          : ev.kind === "backtrack"
            ? `Dead end — back-track to row ${ev.row + 1}.`
            : `Solution #${solutionsSoFar}! All ${n} queens safe.`;
  const status = `${actionText} · tries ${triesSoFar}${atEnd ? ` · brute force would be ${n}^${n} = ${bruteForceAssignments(n)}` : ""}`;

  return (
    <SimShell
      title="N-queens — place, conflict, back-track"
      simKey="nqueens-backtracker"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : (setK(0), setRunning(true))), onStep: () => { setRunning(false); setK((x) => Math.min(len, x + 1)); }, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <div className="nq-ctl">
          <label className="ss-field">N
            <select value={n} onChange={(e) => pickN(Number(e.target.value))} aria-label="Board size N">
              {[4, 5, 6, 7].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <div className="bit-seg" role="group" aria-label="Search extent">
            <button type="button" className={cx("bit-segbtn", mode === "first" && "on")} onClick={() => pickMode("first")} aria-pressed={mode === "first"}>first solution</button>
            <button type="button" className={cx("bit-segbtn", mode === "all" && "on")} onClick={() => pickMode("all")} aria-pressed={mode === "all"}>all solutions</button>
          </div>
        </div>
      }
      footer={
        <div className="nq-foot" role="status">
          <span className="nq-stat"><b>{triesSoFar}</b> tries</span>
          <span className="nq-stat"><b>{solutionsSoFar}</b>{mode === "all" ? ` / ${full.count}` : ""} found</span>
          <span className="nq-stat nq-stat--dim">brute force {n}<sup>{n}</sup> = {bruteForceAssignments(n).toLocaleString()}</span>
        </div>
      }
    >
      <div className="nq-stage">
        <svg viewBox={`0 0 ${n * 36} ${n * 36}`} width="100%" role="img" aria-label={`${n} by ${n} board`} className="nq-board" style={{ maxWidth: n * 36 }}>
          {Array.from({ length: n }, (_r, row) =>
            Array.from({ length: n }, (_c, col) => {
              const dark = (row + col) % 2 === 1;
              const hasQueen = row < board.length && board[row] === col;
              const isReject = ev?.kind === "reject" && ev.row === row && ev.col === col;
              const isPlace = ev?.kind === "place" && ev.row === row && ev.col === col;
              const rowBack = ev?.kind === "backtrack" && ev.row === row;
              const solved = ev?.kind === "solution";
              return (
                <g key={`${row}-${col}`}>
                  <rect x={col * 36} y={row * 36} width={36} height={36} className={cx("nq-sq", dark ? "dark" : "light", rowBack && "back")} />
                  {hasQueen && <text x={col * 36 + 18} y={row * 36 + 25} textAnchor="middle" className={cx("nq-q", isPlace && "place", solved && "solved")}>♛</text>}
                  {isReject && <text x={col * 36 + 18} y={row * 36 + 25} textAnchor="middle" className="nq-x">✕</text>}
                </g>
              );
            }),
          )}
        </svg>
      </div>
    </SimShell>
  );
}
