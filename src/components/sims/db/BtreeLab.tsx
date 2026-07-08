// [HERO] btree-lab (ch.29) — the B+-tree the databases chapter is built
// around. LAB mode grows a real B+-tree by hand (insertKey, with node splits
// that propagate up), searches it (root→leaf path + nodeReads = page reads),
// range-scans it (descend once, then WALK THE LEAF CHAIN — the B+-tree's
// signature), and contrasts an index against a full scan at a realistic page
// fanout via bulkStats. BOSS mode "Query Planner" 📇 hosts boss-p8: pick an
// index set, grade it against three workloads' page-read budgets with
// gradeBoss, and learn why "index everything" fails the write budget.
// Everything numeric comes straight from ./btree.ts / ./planner.ts; this file
// only lays the tree out as SVG and wires the controls. Prefix: bt-.
import { useEffect, useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  createTree,
  fromKeys,
  insertKey,
  search,
  rangeScan,
  height,
  countNodes,
  bulkStats,
} from "./btree.ts";
import type { BPlusTree, BPlusNode, InsertEvent, SearchResult, RangeResult } from "./btree.ts";
import {
  BOSS_TABLE,
  BOSS_WORKLOADS,
  BOSS_INDEXES,
  BOSS_SOLUTION,
  gradeBoss,
} from "./planner.ts";
import type { BossResult } from "./planner.ts";
import "../../../theme/_p8css/btree-lab.css";

const ACCENT = "#60A5FA";

type Mode = "lab" | "boss";

const ORDERS = [3, 4, 6] as const;
const DEFAULT_ORDER = 4;
// ~12–15 keys, chosen so order-4 inserts trigger a couple of leaf AND
// internal splits (root grows past one level) — a legible, non-trivial tree.
const PRESET_KEYS = [50, 20, 80, 10, 30, 60, 90, 25, 5, 35, 70, 100, 15, 45];

// How long a "just happened" highlight (descend path / split flash) stays lit
// before the tree settles back to its resting look. Skipped under reduced motion.
const HIGHLIGHT_MS = 1400;

export default function BtreeLab() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const won = done.has("boss-p8");

  const [mode, setMode] = useState<Mode>("lab");

  // ---- tree state: insertKey mutates the tree's nodes in place, so every
  // structural change is followed by a shallow copy — a fresh top-level
  // object reference is what makes React (and this file's own useMemo calls)
  // notice the mutation happened. ----
  const [order, setOrder] = useState<number>(DEFAULT_ORDER);
  const [tree, setTree] = useState<BPlusTree>(() => createTree(DEFAULT_ORDER));
  const touch = (t: BPlusTree): void => setTree({ ...t });

  // last insert's trace, for the descend/split highlight
  const [lastEvents, setLastEvents] = useState<InsertEvent[]>([]);
  const [highlightOn, setHighlightOn] = useState(false);

  // ---- controls ----
  const [keyInput, setKeyInput] = useState("55");
  const [insertMsg, setInsertMsg] = useState("Empty tree — insert a key or load the preset.");

  // ---- search ----
  const [searchInput, setSearchInput] = useState("30");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // ---- range ----
  const [loInput, setLoInput] = useState("20");
  const [hiInput, setHiInput] = useState("60");
  const [rangeResult, setRangeResult] = useState<RangeResult | null>(null);

  // A one-shot highlight window: after HIGHLIGHT_MS, fall back to the resting
  // (non-highlighted) tree. Reduced motion never turns it on in the first place.
  useEffect(() => {
    if (!highlightOn) return;
    const id = window.setTimeout(() => setHighlightOn(false), HIGHLIGHT_MS);
    return () => window.clearTimeout(id);
  }, [highlightOn]);

  function doInsert(): void {
    const key = Number(keyInput);
    if (!Number.isInteger(key)) {
      setInsertMsg("Enter a whole number to insert.");
      return;
    }
    const { events, didSplit } = insertKey(tree, key);
    const wasInserted = events.some((e) => e.kind === "insert-key");
    setLastEvents(events);
    setHighlightOn(!reduced && events.length > 0);
    setSearchResult(null);
    setRangeResult(null);
    touch(tree);
    setInsertMsg(
      !wasInserted
        ? `${key} is already in the tree — unique index, duplicate ignored.`
        : didSplit
          ? `Inserted ${key} — that overflowed a node and triggered a split.`
          : `Inserted ${key}.`,
    );
  }

  function doPreset(): void {
    setTree(fromKeys(PRESET_KEYS, order));
    setLastEvents([]);
    setHighlightOn(false);
    setSearchResult(null);
    setRangeResult(null);
    setInsertMsg(`Loaded the preset — ${PRESET_KEYS.length} keys, order ${order}.`);
  }

  function doReset(): void {
    setTree(createTree(order));
    setLastEvents([]);
    setHighlightOn(false);
    setSearchResult(null);
    setRangeResult(null);
    setInsertMsg("Reset to an empty tree.");
  }

  function changeOrder(next: number): void {
    setOrder(next);
    setTree(createTree(next));
    setLastEvents([]);
    setHighlightOn(false);
    setSearchResult(null);
    setRangeResult(null);
    setInsertMsg(`Order changed to ${next} — tree reset (max ${next - 1} keys per node).`);
  }

  function doSearch(): void {
    const key = Number(searchInput);
    if (!Number.isInteger(key)) return;
    setRangeResult(null);
    setSearchResult(search(tree, key));
  }

  function doRange(): void {
    const lo = Number(loInput);
    const hi = Number(hiInput);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo > hi) return;
    setSearchResult(null);
    setRangeResult(rangeScan(tree, lo, hi));
  }

  const h = height(tree);
  const n = countNodes(tree);
  const scoreboard = useMemo(() => bulkStats(100, 10_000, 100), []);
  const speedup = Math.round(scoreboard.fullScanReads / scoreboard.indexReads);

  const status =
    mode === "boss"
      ? "Query Planner — choose indexes to fit every workload's page-read budget"
      : searchResult
        ? `search ${searchInput} · ${searchResult.found ? "found" : "miss"} · ${searchResult.nodeReads} page read${searchResult.nodeReads === 1 ? "" : "s"}`
        : rangeResult
          ? `range [${loInput}, ${hiInput}] · ${rangeResult.keys.length} keys · ${rangeResult.nodeReads} page reads`
          : `${insertMsg} height ${h} · ${n} node${n === 1 ? "" : "s"} · order ${order}`;

  return (
    <SimShell
      title="B+-tree lab — insert, search, range-scan, and index vs. full scan"
      simKey="btree-lab"
      kind="hero"
      accent={ACCENT}
      onReset={doReset}
      status={status}
      controls={
        <div className="bt-ctl">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button type="button" className={cx("bit-segbtn", mode === "lab" && "on")} onClick={() => setMode("lab")} aria-pressed={mode === "lab"}>
              lab
            </button>
            <button type="button" className={cx("bit-segbtn", mode === "boss" && "on")} onClick={() => setMode("boss")} aria-pressed={mode === "boss"}>
              📇 boss
            </button>
          </div>

          {mode === "lab" && (
            <>
              <label className="ss-field">
                key
                <input
                  className="bt-num"
                  type="number"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  aria-label="Key to insert"
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={doInsert}>+ insert</button>
              <label className="ss-field">
                order
                <select
                  className="bt-select"
                  value={order}
                  onChange={(e) => changeOrder(Number(e.target.value))}
                  aria-label="B+-tree order (max children per internal node)"
                >
                  {ORDERS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn" onClick={doPreset}>load preset ({PRESET_KEYS.length} keys)</button>
            </>
          )}
        </div>
      }
      footer={
        mode === "boss" ? (
          <BossPanel won={won} />
        ) : (
          <LabFoot scoreboard={scoreboard} speedup={speedup} />
        )
      }
    >
      {mode === "boss" ? (
        <BossStage />
      ) : (
        <LabStage
          tree={tree}
          reduced={reduced}
          events={highlightOn ? lastEvents : []}
          h={h}
          n={n}
          order={order}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onSearch={doSearch}
          searchResult={searchResult}
          loInput={loInput}
          hiInput={hiInput}
          onLoInput={setLoInput}
          onHiInput={setHiInput}
          onRange={doRange}
          rangeResult={rangeResult}
        />
      )}
    </SimShell>
  );
}

// ===========================================================================
// LAB — tree SVG + search/range boxes
// ===========================================================================

type NodePos = { node: BPlusNode; x: number; y: number; w: number };

const NODE_H = 34;
const KEY_W = 34;
const LEVEL_GAP = 78;
const PAD_X = 24;
const PAD_T = 20;

/** Level-order layout: leaves get even width along the bottom; each internal
    node is centered over the midpoint of its children (root ends up centered
    on top). Pure presentation geometry — the tree structure itself is the
    engine's. */
function layoutTree(root: BPlusNode): { positions: Map<number, NodePos>; width: number; depth: number } {
  const levels: BPlusNode[][] = [];
  (function collect(node: BPlusNode, d: number): void {
    if (!levels[d]) levels[d] = [];
    levels[d].push(node);
    if (!node.leaf) node.children.forEach((c) => collect(c, d + 1));
  })(root, 0);

  const depth = levels.length - 1;
  const positions = new Map<number, NodePos>();

  // leaves first, left to right, evenly spaced by key-count width
  const leafLevel = levels[depth];
  let cursor = 0;
  const leafX = new Map<number, number>();
  for (const leaf of leafLevel) {
    const w = Math.max(1, leaf.keys.length) * KEY_W + 12;
    leafX.set(leaf.id, cursor + w / 2);
    cursor += w + 20;
  }
  const totalWidth = Math.max(cursor - 20, KEY_W + 12);
  for (const leaf of leafLevel) {
    const w = Math.max(1, leaf.keys.length) * KEY_W + 12;
    positions.set(leaf.id, { node: leaf, x: leafX.get(leaf.id) ?? 0, y: depth * LEVEL_GAP, w });
  }

  // internal levels bottom-up: center over children's x-midpoint
  for (let d = depth - 1; d >= 0; d--) {
    for (const node of levels[d]) {
      const childXs = node.children.map((c) => positions.get(c.id)?.x ?? 0);
      const x = childXs.length ? (Math.min(...childXs) + Math.max(...childXs)) / 2 : 0;
      const w = Math.max(1, node.keys.length) * KEY_W + 12;
      positions.set(node.id, { node, x, y: d * LEVEL_GAP, w });
    }
  }

  return { positions, width: totalWidth, depth };
}

function LabStage({
  tree,
  reduced,
  events,
  h,
  n,
  order,
  searchInput,
  onSearchInput,
  onSearch,
  searchResult,
  loInput,
  hiInput,
  onLoInput,
  onHiInput,
  onRange,
  rangeResult,
}: {
  tree: BPlusTree;
  reduced: boolean;
  events: InsertEvent[];
  h: number;
  n: number;
  order: number;
  searchInput: string;
  onSearchInput: (v: string) => void;
  onSearch: () => void;
  searchResult: SearchResult | null;
  loInput: string;
  hiInput: string;
  onLoInput: (v: string) => void;
  onHiInput: (v: string) => void;
  onRange: () => void;
  rangeResult: RangeResult | null;
}) {
  const { positions, width, depth } = useMemo(() => layoutTree(tree.root), [tree]);

  const descendIds = new Set(events.filter((e) => e.kind === "descend").map((e) => e.nodeId));
  const splitIds = new Set(
    events.flatMap((e) => (e.kind === "split-leaf" || e.kind === "split-internal" ? [e.nodeId, e.newId] : e.kind === "new-root" ? [e.newId] : [])),
  );

  const pathIds = new Set<number>(searchResult ? searchResult.path : []);
  const walkedLeafIds = new Set<number>();
  if (rangeResult) {
    // Recompute which leaves were walked by re-deriving from the same rule the
    // engine used (descend to lo's leaf, then follow next while keys stay <= hi)
    // — purely for highlighting; the read counts themselves are the engine's.
    const lo = Number(loInput);
    let node = tree.root;
    while (!node.leaf) {
      let i = 0;
      while (i < node.keys.length && lo >= node.keys[i]) i++;
      node = node.children[i];
    }
    let leaf: BPlusNode | null = node;
    let steps = 0;
    while (leaf && steps < rangeResult.leavesWalked) {
      walkedLeafIds.add(leaf.id);
      leaf = leaf.next;
      steps++;
    }
  }

  const innerW = Math.max(width, 200);
  const svgW = innerW + PAD_X * 2;
  const svgH = PAD_T + (depth + 1) * LEVEL_GAP - (LEVEL_GAP - NODE_H) + 30;

  const treeSummary = `B+-tree, order ${order}, height ${h}, ${n} nodes. ${
    events.length > 0 ? "Highlighting the most recent insert's descend path and any split." : ""
  }`;

  return (
    <div className="bt-stage">
      <div className="bt-tree-wrap">
        {tree.root.keys.length === 0 && tree.root.leaf ? (
          <p className="bt-qbox-result" style={{ padding: "24px 8px", textAlign: "center" }}>
            Empty tree — insert a key or load the preset to grow one.
          </p>
        ) : (
          <svg className="bt-svg" viewBox={`0 0 ${svgW} ${svgH}`} width="100%" role="img" aria-label={treeSummary}>
            <defs>
              <marker id="bt-chain-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-ok)" />
              </marker>
            </defs>

            {/* edges: parent center-bottom -> child center-top */}
            {[...positions.values()].map(({ node, x, y }) =>
              node.leaf
                ? null
                : node.children.map((c) => {
                    const cp = positions.get(c.id);
                    if (!cp) return null;
                    const onPath = pathIds.has(node.id) && pathIds.has(c.id);
                    return (
                      <path
                        key={`e-${node.id}-${c.id}`}
                        className={cx("bt-edge", onPath && "on-path")}
                        d={`M ${PAD_X + x} ${PAD_T + y + NODE_H} L ${PAD_X + cp.x} ${PAD_T + cp.y}`}
                      />
                    );
                  }),
            )}

            {/* leaf chain, drawn along the bottom */}
            {[...positions.values()]
              .filter((p): p is NodePos & { node: BPlusNode & { next: BPlusNode } } => p.node.leaf && p.node.next !== null)
              .map(({ node, x, y, w }) => {
                const next = node.next;
                const np = positions.get(next.id);
                if (!np) return null;
                const y1 = PAD_T + y + NODE_H / 2;
                const walked = walkedLeafIds.has(node.id) && walkedLeafIds.has(next.id);
                return (
                  <path
                    key={`chain-${node.id}`}
                    className={cx("bt-chain", walked && "walked")}
                    d={`M ${PAD_X + x + w / 2} ${y1} L ${PAD_X + np.x - np.w / 2} ${PAD_T + np.y + NODE_H / 2}`}
                  />
                );
              })}

            {/* nodes */}
            {[...positions.values()].map(({ node, x, y, w }) => {
              const onPath = pathIds.has(node.id);
              const onDescend = descendIds.has(node.id);
              const isSplit = splitIds.has(node.id);
              const inChain = walkedLeafIds.has(node.id);
              return (
                <g
                  key={node.id}
                  className={cx(
                    "bt-node",
                    node.leaf ? "is-leaf" : "is-internal",
                    (onPath || onDescend || inChain) && "on-path",
                    !reduced && isSplit && "is-split",
                  )}
                  transform={`translate(${PAD_X + x - w / 2}, ${PAD_T + y})`}
                >
                  <rect width={w} height={NODE_H} rx={7} />
                  {node.keys.map((k, i) => (
                    <g key={k}>
                      {i > 0 && <line className="bt-sep" x1={i * (w / node.keys.length)} y1={2} x2={i * (w / node.keys.length)} y2={NODE_H - 2} />}
                      <text className="bt-key" x={(i + 0.5) * (w / node.keys.length)} y={NODE_H / 2 + 1}>
                        {k}
                      </text>
                    </g>
                  ))}
                  <text className="bt-tag" x={w / 2} y={-6}>
                    {node.leaf ? "leaf" : "internal"}
                    {isSplit && !reduced ? " · split!" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        <div className="bt-readout" role="group" aria-label="Tree stats">
          <span><b>height</b> {h}</span>
          <span><b>nodes</b> {n}</span>
          <span><b>order</b> {order} (max {order - 1} keys/node)</span>
        </div>
      </div>

      <div className="bt-queries">
        <div className="bt-qbox">
          <div className="bt-qbox-head">
            <span className="bt-qbox-title">search</span>
          </div>
          <div className="bt-qbox-row">
            <label className="ss-field">
              key
              <input className="bt-num" type="number" value={searchInput} onChange={(e) => onSearchInput(e.target.value)} aria-label="Key to search for" />
            </label>
            <button type="button" className="btn" onClick={onSearch}>find</button>
          </div>
          {searchResult && (
            <p className="bt-qbox-result">
              <span className={searchResult.found ? "bt-hit" : "bt-miss"}>{searchResult.found ? "found" : "not found"}</span> ·{" "}
              path <code>{searchResult.path.join(" → ")}</code> · <b>{searchResult.nodeReads}</b> page read{searchResult.nodeReads === 1 ? "" : "s"} (= tree height) ·{" "}
              {searchResult.comparisons} key comparisons.
            </p>
          )}
        </div>

        <div className="bt-qbox">
          <div className="bt-qbox-head">
            <span className="bt-qbox-title">range scan</span>
          </div>
          <div className="bt-qbox-row">
            <label className="ss-field">
              lo
              <input className="bt-num" type="number" value={loInput} onChange={(e) => onLoInput(e.target.value)} aria-label="Range low bound" />
            </label>
            <label className="ss-field">
              hi
              <input className="bt-num" type="number" value={hiInput} onChange={(e) => onHiInput(e.target.value)} aria-label="Range high bound" />
            </label>
            <button type="button" className="btn" onClick={onRange}>scan</button>
          </div>
          {rangeResult && (
            <p className="bt-qbox-result">
              <b>{rangeResult.keys.length}</b> key{rangeResult.keys.length === 1 ? "" : "s"}: <span className="bt-keylist">{rangeResult.keys.join(", ") || "—"}</span>
              <br />
              descent <b>{rangeResult.descentReads}</b> + walked <b>{rangeResult.leavesWalked}</b> leaf/leaves = <b>{rangeResult.nodeReads}</b> total page reads —
              no re-descending per row, just the chain.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LabFoot({ scoreboard, speedup }: { scoreboard: { levels: number; indexReads: number; fullScanReads: number }; speedup: number }) {
  const maxReads = Math.max(scoreboard.indexReads, scoreboard.fullScanReads);
  const idxPct = (scoreboard.indexReads / maxReads) * 100;
  const scanPct = (scoreboard.fullScanReads / maxReads) * 100;
  return (
    <div className="bt-foot">
      <div className="bt-score">
        <div className="bt-score-head">
          <span className="bt-score-title">index vs. full scan — 10,000 rows</span>
          <span className="bt-score-note">at a realistic page fanout of ~100 (order 100, 100 records/leaf) — separate from the small tree above</span>
        </div>
        <div className="bt-bars">
          <div className="bt-bar-row">
            <span className="bt-bar-lbl">index scan</span>
            <div className="bt-bar-track"><div className="bt-bar-fill index" style={{ width: `${idxPct}%` }} /></div>
            <span className="bt-bar-val">{scoreboard.indexReads} reads</span>
          </div>
          <div className="bt-bar-row">
            <span className="bt-bar-lbl">full scan</span>
            <div className="bt-bar-track"><div className="bt-bar-fill scan" style={{ width: `${scanPct}%` }} /></div>
            <span className="bt-bar-val">{scoreboard.fullScanReads} reads</span>
          </div>
        </div>
        <span className="bt-score-headline">~{speedup}× fewer page reads</span>
      </div>
      <p className="bt-explain">
        <b>All records live in the leaves.</b> Internal nodes hold only separator keys that route a search downward, so high
        fanout (hundreds of keys per disk page) keeps the tree only <code>{scoreboard.levels}</code> levels deep even at 10,000 rows —
        an index lookup is a handful of page reads (<code>{scoreboard.indexReads}</code>) instead of reading every one of the table's{" "}
        <code>{scoreboard.fullScanReads}</code> heap pages. A range query is even cheaper per row: descend once, then just walk the
        leaf chain — no re-descending the tree for each match.
      </p>
      <div className="bt-legend" role="list">
        <span className="bt-leg" role="listitem"><span className="bt-leg-sw internal" /> internal node (separator keys)</span>
        <span className="bt-leg" role="listitem"><span className="bt-leg-sw leaf" /> leaf (records)</span>
        <span className="bt-leg" role="listitem"><span className="bt-leg-sw path" /> descend / search / walked path</span>
        <span className="bt-leg" role="listitem"><span className="bt-leg-sw split" /> just split</span>
        <span className="bt-leg" role="listitem"><span className="bt-leg-sw chain" /> leaf → next chain</span>
      </div>
    </div>
  );
}

// ===========================================================================
// BOSS — "Query Planner": pick indexes, fit every workload's read budget
// ===========================================================================
function BossStage() {
  return (
    <div className="bt-boss-stage" aria-hidden="true">
      <div className="bt-boss-hero">
        <span className="bt-boss-icon">📇</span>
        <div>
          <div className="bt-boss-name">Query Planner</div>
          <div className="bt-boss-tag">choose indexes · fit every budget</div>
        </div>
      </div>
      <p className="bt-boss-lead">
        One table, three workloads, one page-read budget each. Toggle indexes on the <code>orders</code> table below and watch every
        workload's estimated cost update live — including the write workload, which pays to maintain every index you turn on.
      </p>
    </div>
  );
}

function BossPanel({ won }: { won: boolean }) {
  const [chosen, setChosen] = useState<string[]>([]);

  const result: BossResult = useMemo(() => gradeBoss(chosen), [chosen]);
  const everWon = won || result.pass;

  function toggle(id: string): void {
    setChosen((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (gradeBoss(next).pass) markChallengeDone("boss-p8");
      return next;
    });
  }

  return (
    <div className={cx("bt-boss", everWon && "bt-boss--won")}>
      <div className="bt-table-card" role="group" aria-label="Table schema">
        <span><b>{BOSS_TABLE.name}</b></span>
        <span>{BOSS_TABLE.rows.toLocaleString()} rows</span>
        <span>{BOSS_TABLE.pages} heap pages</span>
        <span>columns: {BOSS_TABLE.columns.join(", ")}</span>
      </div>

      <div className="bt-index-chips" role="group" aria-label="Candidate indexes">
        {BOSS_INDEXES.map((ix) => {
          const on = chosen.includes(ix.id);
          return (
            <button
              key={ix.id}
              type="button"
              className={cx("bt-index-chip", on && "on")}
              onClick={() => toggle(ix.id)}
              aria-pressed={on}
            >
              <span className="bt-ic-label">{on ? "✓ " : "+ "}{ix.label}</span>
              <span className="bt-ic-hint">{ix.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="bt-workloads">
        {result.perWorkload.map((w) => {
          const wl = BOSS_WORKLOADS.find((x) => x.id === w.id);
          const pct = Math.min(100, (w.cost / w.budget) * 100);
          return (
            <div key={w.id} className={cx("bt-wl-card", w.ok ? "is-ok" : "is-over")}>
              <div className="bt-wl-head">
                <span className="bt-wl-title">{w.title}</span>
                <span className={cx("bt-wl-verdict", w.ok ? "ok" : "over")}>{w.ok ? "✓ within budget" : "✕ over budget"}</span>
              </div>
              {wl && <p className="bt-wl-blurb">{wl.blurb}</p>}
              <div className="bt-wl-cost">
                <div className="bt-wl-cost-row">
                  <span>cost <b>{w.cost}</b> / budget {w.budget}</span>
                </div>
                <div className="bt-wl-track">
                  <div className={cx("bt-wl-fill", w.ok ? "ok" : "over")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bt-boss-actions">
        <span className={cx("bt-wl-verdict", result.pass ? "ok" : "over")}>
          {result.pass ? "✓ all three workloads fit" : `${result.perWorkload.filter((w) => !w.ok).length} workload(s) over budget`}
        </span>
        <span className="bt-score-note">{chosen.length} index{chosen.length === 1 ? "" : "es"} chosen</span>
      </div>

      <p className="bt-boss-why">
        <b>Why not just index everything?</b> Every write must maintain every index you carry — see the <em>Ingest spike</em>{" "}
        workload above: each index adds its own height to the cost of every insert, so an unused index is a pure tax on writes.
        Carry only what the read workloads truly need.
      </p>

      {everWon && (
        <div className="bt-boss-badge" role="status">
          <span aria-hidden="true">📇</span> <b>Query Planner earned</b> — every workload fits its budget.
        </div>
      )}

      <details className="bt-hint">
        <summary>show a hint</summary>
        <p>
          The intended minimal set is <code>{BOSS_SOLUTION.map((id) => BOSS_INDEXES.find((ix) => ix.id === id)?.label ?? id).join(" and ")}</code> —
          one covering index per read workload, and nothing extra to tax the ingest spike.
        </p>
      </details>
    </div>
  );
}
