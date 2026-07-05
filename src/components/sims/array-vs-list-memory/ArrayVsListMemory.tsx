// [micro] array-vs-list-memory — the same n elements, two memory layouts, one
// traversal, judged by the SAME cache the ch.8 sim used. Walk a CONTIGUOUS array
// (elements packed 0,1,2,… — a cache line pulls in the neighbours, so almost
// every step is a HIT) versus a SCATTERED linked list (nodes flung across memory,
// so chasing each .next pointer lands in a fresh line — almost every step a MISS).
// Watch the cost readout diverge even though both touch the identical element
// count: that gap is why "arrays and lists are both O(n) to traverse" is a lie
// the cache tells the truth about. Engine: array-vs-list-memory/model (which
// reuses fast-cpu/cache). Reduced motion: Step advances one node.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { compareArrayVsList, MISS_PENALTY } from "./model.ts";

const ACCENT = "#34D399";
const MEM_CELLS = 96; // roomy enough that scattered nodes rarely share a line
const NUM_LINES = 8;
const LINE_SIZE = 4;
const N = 32; // elements in each structure
const COLS = 12; // 96 / 12 = 8 rows

type Layout = "array" | "list";

export default function ArrayVsListMemory() {
  const [layout, setLayout] = useState<Layout>("array");
  const [i, setI] = useState(0); // nodes visited so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // both traversals precomputed (deterministic); pick the active one to animate
  const cmp = useMemo(() => compareArrayVsList(N, { memCells: MEM_CELLS, numLines: NUM_LINES, lineSize: LINE_SIZE }), []);
  const active = layout === "array" ? cmp.array : cmp.list;
  const addrs = layout === "array" ? cmp.arrayAddrs : cmp.listAddrs;
  const len = active.steps.length;

  // stats for the first i steps (the live view)
  const seen = active.steps.slice(0, i);
  const hits = seen.filter((s) => s.hit).length;
  const misses = seen.length - hits;
  const cost = hits + misses * MISS_PENALTY;
  const hitRate = seen.length === 0 ? 0 : hits / seen.length;
  const cur = i > 0 ? active.steps[i - 1] : null;

  useSimClock(running, 3 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function restart() {
    setI(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }
  function pickLayout(l: Layout) {
    setLayout(l);
    setRunning(false);
    setI(0);
  }

  // map an address → grid (row,col) → svg pixel centre, so pointer arrows can
  // hop between the scattered nodes of the list.
  const CELL = 40;
  const GAP = 6;
  const rows = Math.ceil(MEM_CELLS / COLS);
  const gridW = COLS * CELL + (COLS - 1) * GAP;
  const gridH = rows * CELL + (rows - 1) * GAP;
  const centre = (addr: number): { x: number; y: number } => {
    const r = Math.floor(addr / COLS);
    const c = addr % COLS;
    return { x: c * (CELL + GAP) + CELL / 2, y: r * (CELL + GAP) + CELL / 2 };
  };

  // which visit-index (if any) does each address hold, and was it a hit?
  const visitInfo = useMemo(() => {
    const m = new Map<number, { order: number; hit: boolean }>();
    addrs.forEach((a, k) => m.set(a, { order: k, hit: active.steps[k].hit }));
    return m;
  }, [addrs, active]);

  const finalPct = (active.hitRate * 100).toFixed(0);
  const otherLayout = layout === "array" ? cmp.list : cmp.array;

  return (
    <SimShell
      title="Array vs linked list — the cache decides"
      simKey="array-vs-list-memory"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`${layout === "array" ? "Array (contiguous)" : "Linked list (scattered)"} · node ${i}/${len} · ${hits} hit / ${misses} miss (${(hitRate * 100).toFixed(0)}%) · cost ${cost}. Full traversal: ${finalPct}% hit, cost ${active.cost}.`}
      controls={
        <div className="avl-ctl">
          <div className="bit-seg" role="group" aria-label="Memory layout">
            <button type="button" className={cx("bit-segbtn", layout === "array" && "on")} onClick={() => pickLayout("array")}>
              array
            </button>
            <button type="button" className={cx("bit-segbtn", layout === "list" && "on")} onClick={() => pickLayout("list")}>
              linked list
            </button>
          </div>
        </div>
      }
      footer={
        <div className="avl-metrics" role="group" aria-label="Traversal cost comparison">
          <div className={cx("avl-verdict", cur && (cur.hit ? "hit" : "miss"))}>{cur ? (cur.hit ? "HIT" : "MISS") : "—"}</div>
          <div className="avl-metric">
            <span className="avl-mv ok">{hits}</span>
            <span className="avl-ml">hits</span>
          </div>
          <div className="avl-metric">
            <span className="avl-mv err">{misses}</span>
            <span className="avl-ml">misses</span>
          </div>
          <div className="avl-metric">
            <span className="avl-mv">{(hitRate * 100).toFixed(0)}%</span>
            <span className="avl-ml">hit rate</span>
          </div>
          <div className="avl-metric">
            <span className="avl-mv">{cost}</span>
            <span className="avl-ml">cost so far</span>
          </div>
          <div className="avl-metric avl-compare">
            <span className="avl-mv">
              {active.cost} <span className="muted">vs</span> {otherLayout.cost}
            </span>
            <span className="avl-ml">this layout vs the other (full)</span>
          </div>
        </div>
      }
    >
      <p className="avl-blurb muted">
        {layout === "array"
          ? "Contiguous layout: the elements sit at consecutive addresses, so a single cache line (4 cells) pulls the next neighbours in for free. One miss per line, then three free hits — spatial locality working for you."
          : "Scattered layout: each node was allocated at a different time, so .next points somewhere far away. Every hop lands in a fresh cache line — the line's free neighbours are wasted, and nearly every access misses to slow memory. This is pointer chasing thrashing the cache."}
      </p>

      <div className="avl-stage">
        <div className="avl-lbl">
          RAM — <b>{MEM_CELLS}</b> cells · cache <b>{NUM_LINES}</b> lines × <b>{LINE_SIZE}</b>{" "}
          {cur && (
            <>
              · visiting node <b>{i}</b> at address <b>#{cur.addr}</b> ·{" "}
              <b className={cur.hit ? "avl-hit-t" : "avl-miss-t"}>{cur.hit ? "cache hit (+1)" : `cache miss (+${MISS_PENALTY})`}</b>
            </>
          )}
        </div>

        <svg viewBox={`0 0 ${gridW} ${gridH}`} className="avl-grid" role="img" aria-label={`${layout} traversal over ${MEM_CELLS} memory cells`}>
          <defs>
            <marker id="avlArrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-state)" />
            </marker>
          </defs>

          {/* the memory cells */}
          {Array.from({ length: MEM_CELLS }, (_, a) => {
            const p = centre(a);
            const info = visitInfo.get(a);
            const isMember = info !== undefined; // part of the structure
            const visited = isMember && info.order < i;
            const isCur = cur !== null && a === cur.addr;
            const fill = !isMember
              ? "var(--surface)"
              : visited
                ? info.hit
                  ? "color-mix(in srgb, var(--sem-ok) 26%, var(--surface))"
                  : "color-mix(in srgb, var(--sem-err) 26%, var(--surface))"
                : "color-mix(in srgb, var(--sem-data) 12%, var(--surface))";
            const stroke = isCur ? "var(--tx)" : isMember ? "color-mix(in srgb, var(--sem-data) 55%, var(--line))" : "var(--line)";
            return (
              <g key={a}>
                <rect
                  x={p.x - CELL / 2}
                  y={p.y - CELL / 2}
                  width={CELL}
                  height={CELL}
                  rx="6"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isCur ? 3 : 1}
                />
                <text x={p.x} y={p.y - 3} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--tx3)">
                  {a}
                </text>
                {isMember && (
                  <text x={p.x} y={p.y + 11} textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" fill={visited ? (info.hit ? "var(--sem-ok)" : "var(--sem-err)") : "var(--sem-data)"}>
                    {layout === "array" ? `[${info.order}]` : `n${info.order}`}
                  </text>
                )}
              </g>
            );
          })}

          {/* pointer arrows between consecutive visited nodes (the pointer chase) */}
          {addrs.slice(1, Math.max(1, i)).map((a, k) => {
            const from = centre(addrs[k]);
            const to = centre(a);
            // shorten so the arrowhead sits at the cell edge, not the centre
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy) || 1;
            const pad = CELL / 2 + 3;
            const fx = from.x + (dx / dist) * pad;
            const fy = from.y + (dy / dist) * pad;
            const tx = to.x - (dx / dist) * pad;
            const ty = to.y - (dy / dist) * pad;
            return (
              <line
                key={k}
                x1={fx}
                y1={fy}
                x2={tx}
                y2={ty}
                stroke="var(--sem-state)"
                strokeWidth={layout === "list" ? 1.6 : 1.2}
                opacity={layout === "list" ? 0.85 : 0.5}
                strokeDasharray={layout === "array" ? "3 3" : undefined}
                markerEnd="url(#avlArrow)"
              />
            );
          })}
        </svg>

        <div className="avl-legend muted" aria-hidden="true">
          <span>
            <i className="avl-sw data" /> in structure
          </span>
          <span>
            <i className="avl-sw ok" /> visited · hit
          </span>
          <span>
            <i className="avl-sw err" /> visited · miss
          </span>
          <span>
            <i className="avl-sw arrow" /> pointer / next
          </span>
        </div>
      </div>
    </SimShell>
  );
}
