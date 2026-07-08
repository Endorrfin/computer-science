// [micro] attention-heatmap (ch.34, Part 10 · Intelligence) — REAL scaled
// dot-product self-attention over curated example sentences. The math is the
// genuine article a transformer runs: A = softmax(Q·Kᵀ / √d), applied row-wise,
// each row a probability distribution over the keys (selfAttention in
// attention.ts). What is illustrative — and labeled loudly below — are the tiny
// token vectors: a trained LLM's weights can't run inside a static sim, so each
// sentence carries hand-designed vectors chosen to expose a real linguistic
// pattern (a pronoun attending to its noun, an adjective to the noun it
// modifies, a verb to its subject & object). Purely reactive: pick a sentence,
// hover/focus a query token, and the memoized matrix drives both linked views —
// the token row shades every other token by how much the hovered one attends to
// it, and the full n×n heat-map lights the same weights. Prefix: att-.
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { EXAMPLES, exampleById, selfAttention } from "./attention.ts";
import type { Example } from "./attention.ts";
import "../../../theme/_p10css/attention-heatmap.css";

const ACCENT = "#A78BFA";

// Default to the coreference sentence — the "it" → "animal" story is the clearest.
const DEFAULT_ID = "coref";

// Short labels for the example picker (the note carries the full explanation).
const PICKER_LABEL: Record<string, string> = {
  coref: "coreference · “it”",
  adj: "adjectives → nouns",
  verb: "verb → subject/object",
};

// Weight below this is treated as noise for the "most attends to" readout and
// for drawing arcs (avoids pointing at near-uniform background attention).
const ARC_MIN = 0.12;
const ARC_TOP = 3; // at most this many arcs from the selected token

type ExampleId = string;

// The strongest key a given query row attends to, ignoring a token attending to
// itself (self-attention rows are usually dominated by the diagonal, which isn't
// the interesting linguistic signal here).
function topOther(row: number[], self: number): { j: number; w: number } {
  let bestJ = -1;
  let bestW = -1;
  for (let j = 0; j < row.length; j++) {
    if (j === self) continue;
    if (row[j] > bestW) {
      bestW = row[j];
      bestJ = j;
    }
  }
  return { j: bestJ, w: bestW };
}

// The single most notable off-diagonal pull across the whole matrix — used to
// describe the pattern when nothing is hovered.
function notablePair(A: number[][]): { i: number; j: number; w: number } {
  let bi = 0;
  let bj = 0;
  let bw = -1;
  for (let i = 0; i < A.length; i++) {
    const t = topOther(A[i], i);
    if (t.w > bw) {
      bw = t.w;
      bi = i;
      bj = t.j;
    }
  }
  return { i: bi, j: bj, w: bw };
}

// color-mix ramp toward the accent, gamma-lifted so faint weights stay visible.
function rampMix(w: number): number {
  // w ∈ [0,1] → percentage of accent blended into the surface.
  const g = Math.pow(w, 0.72); // lift small values
  return Math.round(8 + g * 84); // 8%…92%
}

// Compact in-cell weight label: ".31" (leading zero dropped to save room), or a
// bare "1" when a weight rounds up so we never render a misleading ".00".
function cellLabel(w: number): string {
  if (w >= 0.995) return "1";
  return w.toFixed(2).slice(1);
}

export default function AttentionHeatmap() {
  const [id, setId] = useState<ExampleId>(DEFAULT_ID);
  // The query token currently hovered or focused, or null when idle.
  const [query, setQuery] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const ex: Example = useMemo(() => exampleById(id) ?? EXAMPLES[0], [id]);
  const A = useMemo(() => selfAttention(ex.X), [ex]);

  const n = ex.tokens.length;

  function onReset(): void {
    setId(DEFAULT_ID);
    setQuery(null);
  }

  // Whenever we change example, drop any stale hovered index that no longer
  // exists in the new (possibly shorter) sentence.
  const safeQuery = query != null && query < n ? query : null;

  // The active row of weights driving both views. When idle we still describe the
  // matrix, but no row is emphasized.
  const activeRow = safeQuery != null ? A[safeQuery] : null;
  const activeTop = activeRow != null ? topOther(activeRow, safeQuery as number) : null;

  // Arcs from the selected token to the few keys it attends to most.
  const arcs = useMemo(() => {
    if (safeQuery == null || activeRow == null) return [] as { j: number; w: number }[];
    return activeRow
      .map((w, j) => ({ j, w }))
      .filter((d) => d.j !== safeQuery && d.w >= ARC_MIN)
      .sort((a, b) => b.w - a.w)
      .slice(0, ARC_TOP);
  }, [safeQuery, activeRow]);

  const notable = useMemo(() => notablePair(A), [A]);

  // ---- status line -------------------------------------------------------
  const status =
    safeQuery != null && activeTop != null && activeTop.j >= 0
      ? `hovering “${ex.tokens[safeQuery]}” → most attends to “${ex.tokens[activeTop.j]}” (${activeTop.w.toFixed(2)})`
      : notable.w > 0
        ? `idle — strongest link: “${ex.tokens[notable.i]}” → “${ex.tokens[notable.j]}” (${notable.w.toFixed(2)}). Hover a token.`
        : "hover a token to trace its attention";

  // ---- heat-map geometry -------------------------------------------------
  const CELL = 34;
  const GAP = 3;
  const step = CELL + GAP;
  const rowLabelW = 74; // room for the query token names on the left
  const colLabelH = 62; // room for rotated key token names on top
  const gridW = n * step - GAP;
  const gridH = n * step - GAP;
  const svgW = rowLabelW + gridW + 8;
  const svgH = colLabelH + gridH + 8;

  // Center of cell (row i, col j) in SVG coords.
  const cx0 = (j: number): number => rowLabelW + j * step + CELL / 2;
  const cy0 = (i: number): number => colLabelH + i * step + CELL / 2;

  return (
    <SimShell
      title="Attention heat-map — softmax(Q·Kᵀ/√d) in the open"
      simKey="attention-heatmap"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="att-ctl" role="group" aria-label="Choose an example sentence">
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={cx("btn", "att-pick", id === e.id && "btn-primary")}
              onClick={() => {
                setId(e.id);
                setQuery(null);
              }}
              aria-pressed={id === e.id}
              title={e.note}
            >
              {PICKER_LABEL[e.id] ?? e.id}
            </button>
          ))}
        </div>
      }
    >
      <div className="att-stage">
        {/* ------------------------- honesty callout ------------------------- */}
        <div className="att-honesty" role="note">
          <span className="att-honesty-badge" aria-hidden="true">
            real math · toy inputs
          </span>
          <p className="att-honesty-body">
            The attention math is <b>real</b> — <code>softmax(Q·Kᵀ/√d)</code>, every cell a genuine
            softmax weight. The tiny token vectors here are <b>illustrative</b> (a real trained
            transformer can’t run in a static sim), hand-chosen to expose a real pattern.
          </p>
        </div>

        {/* --------------------------- token row --------------------------- */}
        <div className="att-tokrow-panel">
          <span className="att-panel-h">
            {safeQuery != null
              ? <>attention <b>from</b> “{ex.tokens[safeQuery]}” — brighter = attends more</>
              : <>hover or focus a token to see where its attention goes</>}
          </span>
          <div
            className="att-tokrow"
            role="list"
            aria-label="Sentence tokens — hover a token to trace its attention"
          >
            {ex.tokens.map((tok, j) => {
              // How much the active query attends to this token j.
              const w = activeRow != null ? activeRow[j] : 0;
              const isQuery = safeQuery === j;
              const mix = activeRow != null ? rampMix(w) : 0;
              const style =
                activeRow != null && !isQuery
                  ? ({
                      background: `color-mix(in srgb, var(--accent) ${mix}%, var(--s2))`,
                      borderColor: `color-mix(in srgb, var(--accent) ${Math.min(mix + 12, 96)}%, var(--line))`,
                    } as CSSProperties)
                  : undefined;
              return (
                <button
                  key={j}
                  type="button"
                  role="listitem"
                  className={cx("att-tok", isQuery && "is-query", activeRow != null && !isQuery && w >= ARC_MIN && "is-attended")}
                  style={style}
                  onMouseEnter={() => setQuery(j)}
                  onFocus={() => setQuery(j)}
                  onMouseLeave={() => setQuery((q) => (q === j ? null : q))}
                  onBlur={() => setQuery((q) => (q === j ? null : q))}
                  aria-pressed={isQuery}
                  aria-label={
                    activeRow != null
                      ? isQuery
                        ? `Query token ${tok}`
                        : `${tok}: attention ${w.toFixed(2)} from ${ex.tokens[safeQuery as number]}`
                      : `Token ${tok}`
                  }
                  title={
                    isQuery
                      ? `“${tok}” — the query`
                      : activeRow != null
                        ? `“${ex.tokens[safeQuery as number]}” → “${tok}” = ${w.toFixed(2)}`
                        : `“${tok}”`
                  }
                >
                  <span className="att-tok-text">{tok}</span>
                  {activeRow != null && !isQuery && (
                    <span className="att-tok-w" aria-hidden="true">
                      {w.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="att-note">{ex.note}</p>
        </div>

        {/* ---------------------------- heat map ---------------------------- */}
        <div className="att-heat-panel">
          <span className="att-panel-h">
            attention matrix A — row = query token, column = key token, each row sums to 1
          </span>
          <div className="att-heat-scroll">
            <svg
              className="att-heat-svg"
              viewBox={`0 0 ${svgW} ${svgH}`}
              width={svgW}
              height={svgH}
              role="img"
              aria-label={`Attention heat-map for: ${ex.tokens.join(" ")}. ${status}`}
            >
              {/* column (key) labels, rotated */}
              {ex.tokens.map((tok, j) => (
                <text
                  key={`c${j}`}
                  className={cx("att-axis", activeTop && activeTop.j === j && "is-hot")}
                  x={cx0(j)}
                  y={colLabelH - 8}
                  transform={`rotate(-40 ${cx0(j)} ${colLabelH - 8})`}
                  textAnchor="start"
                >
                  {tok}
                </text>
              ))}

              {/* row (query) labels */}
              {ex.tokens.map((tok, i) => (
                <text
                  key={`r${i}`}
                  className={cx("att-axis", "att-axis-row", safeQuery === i && "is-hot")}
                  x={rowLabelW - 8}
                  y={cy0(i)}
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {tok}
                </text>
              ))}

              {/* the cells */}
              {A.map((rowArr, i) =>
                rowArr.map((w, j) => {
                  const mix = rampMix(w);
                  const rowHot = safeQuery === i;
                  const dim = safeQuery != null && !rowHot; // fade non-active rows
                  return (
                    <g key={`${i}-${j}`}>
                      <rect
                        className={cx("att-cell", rowHot && "is-row", dim && "is-dim")}
                        x={rowLabelW + j * step}
                        y={colLabelH + i * step}
                        width={CELL}
                        height={CELL}
                        rx={5}
                        style={{ fill: `color-mix(in srgb, var(--accent) ${mix}%, var(--surface))` } as CSSProperties}
                      >
                        <title>{`“${ex.tokens[i]}” → “${ex.tokens[j]}” = ${w.toFixed(3)}`}</title>
                      </rect>
                      {/* weight label on cells that carry real mass */}
                      {w >= 0.16 && (
                        <text
                          className={cx("att-cell-w", w >= 0.5 && "is-strong")}
                          x={rowLabelW + j * step + CELL / 2}
                          y={colLabelH + i * step + CELL / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          aria-hidden="true"
                        >
                          {cellLabel(w)}
                        </text>
                      )}
                    </g>
                  );
                })
              )}

              {/* arcs from the selected query to its top keys (nice-to-have) */}
              {safeQuery != null &&
                arcs.map((d) => {
                  const x1 = cx0(safeQuery);
                  const y1 = cy0(safeQuery);
                  const x2 = cx0(d.j);
                  const y2 = cy0(d.j);
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2 - Math.max(24, Math.abs(x2 - x1) * 0.28);
                  return (
                    <path
                      key={`arc${d.j}`}
                      className="att-arc"
                      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                      style={{ opacity: 0.35 + d.w * 0.6, strokeWidth: 1 + d.w * 3 } as CSSProperties}
                      markerEnd="url(#att-arrow)"
                    />
                  );
                })}

              <defs>
                <marker
                  id="att-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path className="att-arrow-head" d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* legend */}
          <div className="att-legend" aria-hidden="true">
            <span className="att-legend-lbl">weight</span>
            <span className="att-legend-ramp" />
            <span className="att-legend-ends">
              <span>0</span>
              <span>1</span>
            </span>
          </div>
        </div>

        {/* ---------------------------- verdict ---------------------------- */}
        <p className="att-verdict" role="status" aria-live="polite">
          {safeQuery != null && activeTop != null && activeTop.j >= 0 ? (
            <>
              “{ex.tokens[safeQuery]}” spreads its attention across all {n} tokens, but leans hardest
              on <b>“{ex.tokens[activeTop.j]}”</b> at <b>{activeTop.w.toFixed(2)}</b> — exactly the
              link the sentence needs. Every weight is a genuine <code>softmax</code> output; only
              the input vectors are illustrative.
            </>
          ) : notable.w > 0 ? (
            <>
              Idle: the strongest off-diagonal pull is{" "}
              <b>
                “{ex.tokens[notable.i]}” → “{ex.tokens[notable.j]}”
              </b>{" "}
              at <b>{notable.w.toFixed(2)}</b>. Hover any token to trace where its attention flows —
              rows always sum to 1.
            </>
          ) : (
            <>Hover a token to trace where its attention flows.</>
          )}
        </p>

        {reduced && (
          <p className="att-rm-note">
            Reduced motion is on — the views update instantly on hover/focus; nothing here animates.
          </p>
        )}
      </div>
    </SimShell>
  );
}
