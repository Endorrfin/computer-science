// [micro] dp-table-filler — the longest common subsequence, twice. The left
// panel is the NAIVE recursion: lcs(i,j) forks into lcs(i−1,j) and lcs(i,j−1),
// and the SAME (i,j) subproblem gets recomputed all over the tree, so the call
// count explodes. The right panel is dynamic programming: fill each (i,j) once,
// O(1) from its top/left/diagonal neighbours, into an (m+1)(n+1) table — then
// backtrace the diagonals for the actual subsequence. Step to watch the table
// build cell by cell; the call-count-vs-cells gap is the punchline. Reduced
// motion: Step fills one cell.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { fillOrder, lcsRecursionCalls, lcsTable } from "./model.ts";

const ACCENT = "#34D399";

function sanitize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 7);
}

export default function DpTableFiller() {
  const [a, setA] = useState("AGCAT");
  const [b, setB] = useState("GAC");
  const [k, setK] = useState(0); // cells filled so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const t = useMemo(() => lcsTable(a, b), [a, b]);
  const cells = useMemo(() => fillOrder(t.m, t.n), [t.m, t.n]);
  const calls = useMemo(() => lcsRecursionCalls(a, b), [a, b]);
  const len = cells.length;
  const atEnd = k >= len;

  useSimClock(running, 3 * speed, () => {
    setK((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  const filled = useMemo(() => {
    const set = new Set<string>();
    for (let idx = 0; idx < k; idx++) set.add(`${cells[idx][0]},${cells[idx][1]}`);
    return set;
  }, [cells, k]);
  const cur = k > 0 ? cells[k - 1] : null;

  // backtrace path (only meaningful once the table is complete)
  const trace = useMemo(() => {
    const path = new Set<string>();
    const diag = new Set<string>();
    if (!atEnd) return { path, diag };
    let i = t.m;
    let j = t.n;
    while (i > 0 && j > 0) {
      path.add(`${i},${j}`);
      if (t.origin[i][j] === "diag") { diag.add(`${i},${j}`); i--; j--; }
      else if (t.origin[i][j] === "up") i--;
      else j--;
    }
    return { path, diag };
  }, [atEnd, t]);

  function reset(): void { setRunning(false); setK(0); }
  function editA(s: string): void { setA(sanitize(s)); setRunning(false); setK(0); }
  function editB(s: string): void { setB(sanitize(s)); setRunning(false); setK(0); }

  const status = atEnd
    ? `LCS(${a || "∅"}, ${b || "∅"}) = "${t.subsequence}" (length ${t.length}). DP filled ${t.cells} cells; the naive recursion made ${calls} calls.`
    : k > 0
      ? `Fill dp[${cur?.[0]}][${cur?.[1]}] — ${a[(cur?.[0] ?? 1) - 1] === b[(cur?.[1] ?? 1) - 1] ? "match ↘ diag+1" : "mismatch → max(↑, ←)"}`
      : `Two strings, ${t.cells} table cells vs ${calls} recursive calls. Play or Step to fill the table.`;

  return (
    <SimShell
      title="LCS — exploding recursion vs the DP table"
      simKey="dp-table-filler"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : (setK(0), setRunning(true))), onStep: () => { setRunning(false); setK((x) => Math.min(len, x + 1)); }, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <div className="dp-ctl">
          <label className="ss-field">string A
            <input className="dp-input" value={a} onChange={(e) => editA(e.target.value)} aria-label="String A" spellCheck={false} />
          </label>
          <label className="ss-field">string B
            <input className="dp-input" value={b} onChange={(e) => editB(e.target.value)} aria-label="String B" spellCheck={false} />
          </label>
        </div>
      }
      footer={
        <div className="dp-foot">
          <span className="dp-badge dp-badge--rec">naive recursion: <b>{calls}</b> calls</span>
          <span className="dp-badge dp-badge--dp">DP table: <b>{t.cells}</b> cells</span>
          <span className="dp-badge dp-badge--ans">LCS = <b>{t.length}</b> {t.subsequence && <>· “{t.subsequence}”</>}</span>
        </div>
      }
    >
      <div className="dp-stage">
        <div className="dp-side">
          <div className="dp-head">naive recursion <span className="repr-dim">overlapping subproblems</span></div>
          <svg viewBox="0 0 220 150" width="100%" role="img" aria-label="Recursion tree with a duplicated subproblem" className="dp-tree">
            <g className="dp-tree-g">
              <Node x={110} y={20} label="i,j" />
              <Edge x1={110} y1={28} x2={60} y2={62} />
              <Edge x1={110} y1={28} x2={160} y2={62} />
              <Node x={60} y={72} label="i−1,j" />
              <Node x={160} y={72} label="i,j−1" />
              <Edge x1={60} y1={80} x2={40} y2={114} />
              <Edge x1={60} y1={80} x2={95} y2={114} />
              <Edge x1={160} y1={80} x2={125} y2={114} dup />
              <Edge x1={160} y1={80} x2={190} y2={114} />
              <Node x={40} y={124} label="i−2,j" />
              <Node x={95} y={124} label="i−1,j−1" dup />
              <Node x={125} y={124} label="i−1,j−1" dup />
              <Node x={190} y={124} label="i,j−2" />
            </g>
          </svg>
          <div className="dp-tree-note">the two <b>i−1,j−1</b> nodes are the <em>same</em> subproblem — recomputed. Multiply that across the tree → {calls} calls.</div>
        </div>
        <div className="dp-side">
          <div className="dp-head">DP table <span className="repr-dim">each cell filled once</span></div>
          <table className="dp-table">
            <thead>
              <tr>
                <th aria-hidden="true"></th>
                <th className="dp-eps">∅</th>
                {b.split("").map((ch, j) => <th key={j}>{ch}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: t.m + 1 }, (_r, i) => (
                <tr key={i}>
                  <th>{i === 0 ? "∅" : a[i - 1]}</th>
                  {Array.from({ length: t.n + 1 }, (_c, j) => {
                    const key = `${i},${j}`;
                    const border = i === 0 || j === 0;
                    const show = border || filled.has(key);
                    const isCur = cur && cur[0] === i && cur[1] === j;
                    const onPath = trace.path.has(key);
                    const isDiag = trace.diag.has(key);
                    return (
                      <td key={j} className={cx("dp-cell", border && "border", isCur && "cur", onPath && "path", isDiag && "match")}>
                        {show ? t.dp[i][j] : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SimShell>
  );
}

function Node({ x, y, label, dup }: { x: number; y: number; label: string; dup?: boolean }) {
  return (
    <g className={cx("dp-tnode", dup && "dup")}>
      <rect x={x - 26} y={y - 9} width={52} height={18} rx={4} />
      <text x={x} y={y + 4} textAnchor="middle">{label}</text>
    </g>
  );
}
function Edge({ x1, y1, x2, y2, dup }: { x1: number; y1: number; x2: number; y2: number; dup?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className={cx("dp-tedge", dup && "dup")} />;
}
