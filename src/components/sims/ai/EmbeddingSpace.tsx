// [micro] embedding-space (ch.34, Part 10 · Intelligence) — REAL word2vec
// (skip-gram) vectors, the famous king − man + woman ≈ queen. Every word is a
// point in 64-D space where distance ≈ meaning and DIRECTIONS encode relations;
// the map here is a 2-D PCA projection used ONLY for drawing, while the analogy
// and neighbour math run in the full 64-D space (embeddings.ts). Purely reactive
// — no time axis, no transport: click a word to halo its cosine neighbours, or
// pick three words for A − B + C and watch `analogy(EMBEDDINGS, a, b, c)` place
// the computed target via `place2D` and draw the parallelogram (B→A parallel to
// C→result). The four presets each genuinely resolve rank-1 to the expected word
// — nothing is hand-placed. Prefix: emb-.
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { EMBEDDINGS } from "./data/embeddings-data.ts";
import { analogy, neighbors, place2D } from "./embeddings.ts";
import type { WordVec } from "./embeddings.ts";
import "../../../theme/_p10css/embedding-space.css";

const ACCENT = "#A78BFA";

// king − man + woman → queen. The default the whole sim is built around.
const DEFAULT_A = "king";
const DEFAULT_B = "man";
const DEFAULT_C = "woman";
const NEIGHBOR_K = 5;
const ANALOGY_K = 5;

// A vocabulary sorted for the dropdowns (stable, alphabetical).
const VOCAB: readonly string[] = [...EMBEDDINGS].map((w) => w.word).sort((a, b) => a.localeCompare(b));

// Presets that each genuinely resolve rank-1 to the named word — verified
// against the real vectors, not asserted. All share the − man + woman gender
// axis, so they read as a family.
const PRESETS: readonly { a: string; b: string; c: string; expect: string }[] = [
  { a: "king", b: "man", c: "woman", expect: "queen" },
  { a: "brother", b: "man", c: "woman", expect: "sister" },
  { a: "uncle", b: "man", c: "woman", expect: "aunt" },
  { a: "actor", b: "man", c: "woman", expect: "actress" },
];

// --- SVG viewport & the [-1,1]² → pixel projection --------------------------
const VW = 560;
const VH = 420;
const PAD = 42; // room for labels near the edges

function projX(x: number): number {
  return PAD + ((x + 1) / 2) * (VW - 2 * PAD);
}
function projY(y: number): number {
  // PCA space y grows up; SVG y grows down → flip.
  return VH - (PAD + ((y + 1) / 2) * (VH - 2 * PAD));
}

type Pt = { x: number; y: number };
function proj(xy: [number, number]): Pt {
  return { x: projX(xy[0]), y: projY(xy[1]) };
}

// A short marker-less arrow: line + a small V arrowhead at the tip.
function arrowHead(from: Pt, to: Pt, size = 9): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // two barbs, rotated ±28° from the reverse direction
  const ang = 0.48;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const b1x = to.x - size * (ux * cos - uy * sin);
  const b1y = to.y - size * (uy * cos + ux * sin);
  const b2x = to.x - size * (ux * cos + uy * sin);
  const b2y = to.y - size * (uy * cos - ux * sin);
  return `M ${b1x.toFixed(1)} ${b1y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${b2x.toFixed(1)} ${b2y.toFixed(1)}`;
}

export default function EmbeddingSpace() {
  const [selected, setSelected] = useState<string | null>(null);
  const [a, setA] = useState(DEFAULT_A);
  const [b, setB] = useState(DEFAULT_B);
  const [c, setC] = useState(DEFAULT_C);

  function onReset(): void {
    setSelected(null);
    setA(DEFAULT_A);
    setB(DEFAULT_B);
    setC(DEFAULT_C);
  }

  // Neighbour halo for the clicked word (full-64-D cosine, drawn on the 2-D map).
  const near = useMemo(
    () => (selected ? neighbors(EMBEDDINGS, selected, NEIGHBOR_K) : []),
    [selected],
  );
  const neighborSet = useMemo(() => new Set(near.map((n) => n.word)), [near]);

  // The analogy: a − b + c → nearest words, plus a placed 2-D target.
  const result = useMemo(() => analogy(EMBEDDINGS, a, b, c, ANALOGY_K), [a, b, c]);
  const target2D = useMemo<[number, number] | null>(
    () => (result ? place2D(EMBEDDINGS, result.target) : null),
    [result],
  );
  const top = result?.ranked[0] ?? null;

  // Map word → node so the SVG can look up coordinates by name.
  const byWord = useMemo(() => {
    const m = new Map<string, WordVec>();
    for (const w of EMBEDDINGS) m.set(w.word, w);
    return m;
  }, []);

  const selectedNode = selected ? byWord.get(selected) : undefined;

  // Analogy geometry (only when the analogy resolved).
  const pA = byWord.get(a);
  const pB = byWord.get(b);
  const pC = byWord.get(c);
  const showAnalogy = Boolean(result && target2D && pA && pB && pC);
  const ptA = pA ? proj(pA.xy) : null;
  const ptB = pB ? proj(pB.xy) : null;
  const ptC = pC ? proj(pC.xy) : null;
  const ptT = target2D ? proj(target2D) : null;

  const status = top
    ? `${a} − ${b} + ${c} → ${top.word} (${top.score.toFixed(2)})`
    : `${a} − ${b} + ${c} → unknown word — not in this bundled vocabulary`;

  return (
    <SimShell
      title="Embedding space — king − man + woman ≈ queen"
      simKey="embedding-space"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="emb-presets" role="group" aria-label="Preset analogies">
          {PRESETS.map((p) => {
            const on = p.a === a && p.b === b && p.c === c;
            return (
              <button
                key={`${p.a}-${p.b}-${p.c}`}
                type="button"
                className={cx("btn", "emb-preset", on && "btn-primary")}
                onClick={() => {
                  setA(p.a);
                  setB(p.b);
                  setC(p.c);
                }}
                aria-pressed={on}
                title={`${p.a} − ${p.b} + ${p.c} → ${p.expect}`}
              >
                {p.a}−{p.b}+{p.c}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="emb-stage">
        {/* ------------------------------ the 2-D map ------------------------------ */}
        <svg
          className="emb-map"
          viewBox={`0 0 ${VW} ${VH}`}
          role="img"
          aria-label={
            "Two-dimensional PCA projection of the word embeddings. " +
            (selected ? `Selected word ${selected}; its nearest neighbours are haloed. ` : "") +
            (top ? `Analogy ${a} minus ${b} plus ${c} resolves to ${top.word}.` : "")
          }
        >
          {/* faint centre cross — origin of the projection */}
          <line className="emb-grid-line" x1={projX(0)} y1={PAD} x2={projX(0)} y2={VH - PAD} />
          <line className="emb-grid-line" x1={PAD} y1={projY(0)} x2={VW - PAD} y2={projY(0)} />
          <text className="emb-axis-lbl" x={VW - PAD + 2} y={projY(0) - 4} textAnchor="end">
            PC1 →
          </text>
          <text className="emb-axis-lbl" x={projX(0) + 4} y={PAD + 2}>
            PC2 ↑
          </text>

          {/* neighbour links: selected → each neighbour */}
          {selectedNode &&
            near.map((n) => {
              const nn = byWord.get(n.word);
              if (!nn) return null;
              const p0 = proj(selectedNode.xy);
              const p1 = proj(nn.xy);
              return (
                <line
                  key={`link-${n.word}`}
                  className="emb-link"
                  x1={p0.x}
                  y1={p0.y}
                  x2={p1.x}
                  y2={p1.y}
                />
              );
            })}

          {/* analogy parallelogram: B→A (source axis) parallel to C→target (result axis) */}
          {showAnalogy && ptA && ptB && ptC && ptT && (
            <g aria-hidden="true">
              <line className="emb-arrow is-source" x1={ptB.x} y1={ptB.y} x2={ptA.x} y2={ptA.y} />
              <path className="emb-arrow is-source" d={arrowHead(ptB, ptA)} />
              <line className="emb-arrow is-result" x1={ptC.x} y1={ptC.y} x2={ptT.x} y2={ptT.y} />
              <path className="emb-arrow is-result" d={arrowHead(ptC, ptT)} />
              {/* the placed target ring + crosshair */}
              <circle className="emb-target" cx={ptT.x} cy={ptT.y} r={9} />
              <line className="emb-target-x" x1={ptT.x - 5} y1={ptT.y} x2={ptT.x + 5} y2={ptT.y} />
              <line className="emb-target-x" x1={ptT.x} y1={ptT.y - 5} x2={ptT.x} y2={ptT.y + 5} />
              <text className="emb-target-lbl" x={ptT.x + 12} y={ptT.y + 4}>
                {top ? `≈ ${top.word}` : "target"}
              </text>
            </g>
          )}

          {/* word nodes: dot + label, clickable/focusable */}
          {EMBEDDINGS.map((w) => {
            const p = proj(w.xy);
            const isSel = w.word === selected;
            const isNbr = neighborSet.has(w.word);
            // nudge labels left of the dot near the right edge to keep them in-frame
            const rightHalf = p.x > VW * 0.72;
            const lx = rightHalf ? p.x - 8 : p.x + 8;
            const anchor = rightHalf ? "end" : "start";
            return (
              <g
                key={w.word}
                className={cx("emb-node", isSel && "is-selected", isNbr && "is-neighbor")}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                aria-label={`${w.word}${isSel ? ", selected" : isNbr ? ", nearest neighbour" : ""}`}
                onClick={() => setSelected(isSel ? null : w.word)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isSel ? null : w.word);
                  }
                }}
              >
                {isSel && <circle className="emb-node-halo" cx={p.x} cy={p.y} r={10} />}
                <circle className="emb-dot" cx={p.x} cy={p.y} r={isSel ? 5 : 4} />
                <text className="emb-lbl" x={lx} y={p.y + 3.5} textAnchor={anchor}>
                  {w.word}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="emb-proj-note">
          The layout is a <b>PCA projection for display only</b> — a 2-D shadow of
          real 64-D vectors. Neighbours and the analogy are computed in the full
          space, then drawn here.
        </p>

        <div className="emb-legend" aria-hidden="true">
          <span className="emb-leg">
            <span className="emb-swatch" style={{ background: "var(--sem-data)" }} />
            word
          </span>
          <span className="emb-leg">
            <span className="emb-swatch" style={{ background: "var(--accent)" }} />
            selected + neighbours
          </span>
          <span className="emb-leg">
            <span className="emb-swatch" style={{ background: "var(--sem-control)" }} />
            B → A
          </span>
          <span className="emb-leg">
            <span className="emb-swatch" style={{ background: "var(--sem-state)" }} />
            C → result
          </span>
          <span className="emb-leg-hint">click a word to explore its neighbours</span>
        </div>

        {/* ------------------------------ analogy builder ------------------------------ */}
        <div className="emb-analogy">
          <span className="emb-panel-h">analogy — vector arithmetic in 64-D</span>
          <div className="emb-eq" role="group" aria-label="Build an analogy: A minus B plus C">
            <label className="emb-eq-field">
              <span className="emb-eq-tag">A</span>
              <select value={a} onChange={(e) => setA(e.target.value)} aria-label="Word A">
                {VOCAB.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <span className="emb-op" aria-hidden="true">
              −
            </span>
            <label className="emb-eq-field">
              <span className="emb-eq-tag">B</span>
              <select value={b} onChange={(e) => setB(e.target.value)} aria-label="Word B">
                {VOCAB.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <span className="emb-op" aria-hidden="true">
              +
            </span>
            <label className="emb-eq-field">
              <span className="emb-eq-tag">C</span>
              <select value={c} onChange={(e) => setC(e.target.value)} aria-label="Word C">
                {VOCAB.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <span className={cx("emb-op", "is-arrow")} aria-hidden="true">
              →
            </span>
            <div className="emb-eq-field">
              <span className="emb-eq-tag">result</span>
              <span className="emb-op is-arrow" style={{ paddingBottom: 0 } as CSSProperties}>
                {top ? top.word : "—"}
              </span>
            </div>
          </div>

          {top ? (
            <div className="emb-result" aria-live="polite">
              <span className="emb-result-lead">
                <b>{a}</b> − <b>{b}</b> + <b>{c}</b> →
              </span>
              <span className="emb-result-word">{top.word}</span>
              <span className="emb-result-score">cosine {top.score.toFixed(3)}</span>
            </div>
          ) : (
            <div className="emb-hint" role="alert">
              <span className="emb-hint-icon" aria-hidden="true">
                ⚠
              </span>
              <div>
                <b>Word not in this bundled vocabulary.</b> These 29 vectors are a
                tiny gender/royalty corpus — pick words from the dropdowns (they
                only list known words) to run the arithmetic.
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------ ranked lists ------------------------------ */}
        <div className="emb-lists">
          <div className="emb-card emb-neighbors">
            <span className="emb-card-h">
              nearest neighbours {selected ? <b>of {selected}</b> : ""}
            </span>
            {selected && near.length > 0 ? (
              <ol className="emb-rank">
                {near.map((n, i) => (
                  <li key={n.word} className={cx("emb-rank-row", i === 0 && "is-top")}>
                    <span className="emb-rank-n">{i + 1}</span>
                    <span className="emb-rank-word">{n.word}</span>
                    <span className="emb-rank-meter" aria-hidden="true">
                      <span
                        className="emb-rank-fill"
                        style={{ width: `${Math.max(0, n.score) * 100}%` }}
                      />
                    </span>
                    <span className="emb-rank-score">{n.score.toFixed(3)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="emb-card-empty">
                Click any word on the map to see its {NEIGHBOR_K} closest words by cosine similarity.
              </p>
            )}
          </div>

          <div className="emb-card">
            <span className="emb-card-h">
              analogy results {top ? <b>{a}−{b}+{c}</b> : ""}
            </span>
            {result && result.ranked.length > 0 ? (
              <ol className="emb-rank">
                {result.ranked.map((r, i) => (
                  <li key={r.word} className={cx("emb-rank-row", i === 0 && "is-top")}>
                    <span className="emb-rank-n">{i + 1}</span>
                    <span className="emb-rank-word">{r.word}</span>
                    <span className="emb-rank-meter" aria-hidden="true">
                      <span
                        className="emb-rank-fill"
                        style={{ width: `${Math.max(0, r.score) * 100}%` }}
                      />
                    </span>
                    <span className="emb-rank-score">{r.score.toFixed(3)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="emb-card-empty">Pick three known words above to run A − B + C.</p>
            )}
          </div>
        </div>

        {/* ------------------------------ honesty note ------------------------------ */}
        <p className="emb-honesty">
          <span className="emb-honesty-key">These are REAL word2vec vectors</span>{" "}
          trained on a small bundled corpus — <b>king − man + woman → queen</b> is a
          genuine computation, not a placed point. Real embeddings train on billions
          of words; the mechanism is identical, only the scale differs. The 2-D
          layout is a PCA projection; the analogy math runs in the full 64-D space.
        </p>
      </div>
    </SimShell>
  );
}
