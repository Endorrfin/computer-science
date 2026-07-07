// [micro] repr-switcher — the same directed graph as an adjacency MATRIX and an
// adjacency LIST, side by side, with the operation cost lit up. Ask "is u→v an
// edge?" and the matrix reads one cell (O(1)) while the list scans u's entries;
// ask "list u's neighbours" and the matrix scans a whole V-cell row while the
// list reads exactly deg(u). The counters make the classic trade-off concrete:
// the matrix is fast at edge tests but costs V² space; the list is compact (V+E)
// and fast at neighbour walks but slow at edge tests. Purely reactive — no time
// axis, so no transport.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import {
  demoGraph,
  edgeTestCostList,
  edgeTestCostMatrix,
  listSpace,
  matrixSpace,
  neighborsCostList,
  neighborsCostMatrix,
  toMatrix,
} from "./model.ts";

const ACCENT = "#34D399";
type Op = "edge" | "neighbours";

export default function ReprSwitcher() {
  const g = useMemo(() => demoGraph(), []);
  const matrix = useMemo(() => toMatrix(g), [g]);
  const [op, setOp] = useState<Op>("edge");
  const [u, setU] = useState(0);
  const [v, setV] = useState(2);

  // which cells / entries does the current operation READ?
  const matrixCost = op === "edge" ? edgeTestCostMatrix() : neighborsCostMatrix(g);
  const listCost = op === "edge" ? edgeTestCostList(g, u, v) : neighborsCostList(g, u);
  const vPos = g.adj[u].indexOf(v); // -1 if not an edge
  const scannedList = op === "edge" ? (vPos === -1 ? g.adj[u].length : vPos + 1) : g.adj[u].length;

  const answer =
    op === "edge"
      ? `${g.labels[u]}→${g.labels[v]} is ${matrix[u][v] ? "an edge ✓" : "not an edge ✗"}`
      : `neighbours of ${g.labels[u]}: ${g.adj[u].map((n) => g.labels[n]).join(", ") || "none"}`;

  return (
    <SimShell
      title="Adjacency matrix vs list — the operation-cost trade-off"
      simKey="repr-switcher"
      kind="micro"
      accent={ACCENT}
      onReset={() => { setOp("edge"); setU(0); setV(2); }}
      status={`${op === "edge" ? "Edge test" : "List neighbours"} · ${answer} · matrix ${matrixCost} read${matrixCost === 1 ? "" : "s"}, list ${listCost} read${listCost === 1 ? "" : "s"}`}
      controls={
        <div className="repr-ctl">
          <div className="bit-seg" role="group" aria-label="Operation">
            <button type="button" className={cx("bit-segbtn", op === "edge" && "on")} onClick={() => setOp("edge")} aria-pressed={op === "edge"}>is u→v an edge?</button>
            <button type="button" className={cx("bit-segbtn", op === "neighbours" && "on")} onClick={() => setOp("neighbours")} aria-pressed={op === "neighbours"}>list neighbours</button>
          </div>
          <label className="ss-field">u
            <select value={u} onChange={(e) => setU(Number(e.target.value))} aria-label="Node u">
              {g.labels.map((l, k) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {op === "edge" && (
            <label className="ss-field">v
              <select value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Node v">
                {g.labels.map((l, k) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          )}
        </div>
      }
      footer={
        <div className="repr-foot">
          <div className="repr-cost">
            <span className="repr-cost-lbl">this operation</span>
            <span className="repr-badge repr-badge--mtx">matrix: <b>{matrixCost}</b> read{matrixCost === 1 ? "" : "s"}</span>
            <span className="repr-badge repr-badge--lst">list: <b>{listCost}</b> read{listCost === 1 ? "" : "s"}</span>
          </div>
          <div className="repr-cost">
            <span className="repr-cost-lbl">space</span>
            <span className="repr-badge repr-badge--mtx">matrix: <b>{matrixSpace(g)}</b> (V²)</span>
            <span className="repr-badge repr-badge--lst">list: <b>{listSpace(g)}</b> (V+E)</span>
          </div>
        </div>
      }
    >
      <div className="repr-stage">
        <div className="repr-panel">
          <div className="repr-head">adjacency matrix <span className="repr-dim">V×V bits</span></div>
          <table className="repr-matrix">
            <thead>
              <tr>
                <th aria-hidden="true"></th>
                {g.labels.map((l, k) => <th key={k} className={cx(op === "edge" && k === v && "col-hi")}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {g.labels.map((rl, r) => {
                const rowRead = op === "neighbours" && r === u;
                return (
                  <tr key={r} className={cx(rowRead && "row-hi")}>
                    <th className={cx((r === u) && "row-lbl-hi")}>{rl}</th>
                    {g.labels.map((_c, c) => {
                      const cellRead = (op === "edge" && r === u && c === v) || (op === "neighbours" && r === u);
                      return (
                        <td key={c} className={cx("repr-cell", matrix[r][c] === 1 && "on", cellRead && "read")}>
                          {matrix[r][c]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="repr-panel">
          <div className="repr-head">adjacency list <span className="repr-dim">V + E entries</span></div>
          <ul className="repr-lists">
            {g.labels.map((l, node) => (
              <li key={node} className={cx("repr-row", node === u && "row-hi")}>
                <span className="repr-key">{l}</span>
                <span className="repr-arrow" aria-hidden="true">→</span>
                <span className="repr-vals">
                  {g.adj[node].length === 0 && <span className="repr-dim">∅</span>}
                  {g.adj[node].map((n, pos) => {
                    const read = node === u && pos < scannedList;
                    const isTarget = op === "edge" && node === u && n === v;
                    return (
                      <span key={pos} className={cx("repr-chip", read && "read", isTarget && "target")}>{g.labels[n]}</span>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SimShell>
  );
}
