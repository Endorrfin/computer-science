// [HERO] combinatorics-counter (ch.0b, Math toolkit) — the four fundamental
// counting rules on one screen. Pick n and r, flip the ordered?/repetition?
// switches (or the 2×2 grid), and read the exact big-integer count: P(n,r)
// ordered no-repeat, C(n,r) unordered no-repeat, nʳ ordered with-repeat, and
// stars-and-bars multisets unordered with-repeat. A capped Pascal's triangle
// makes C(n,r) visible — it is the (n,r) cell. All arithmetic is BigInt inside
// combinatorics.ts; this component only calls count()/pascalRow() and renders via
// formatBig. Reactive → SimShell without transport. Prefix: cc-.
//
// Single default export (react-refresh).
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx, clamp } from "../../../lib/utils.ts";
import { count, pascalRow, formatBig } from "./combinatorics.ts";
import type { CountKind } from "./combinatorics.ts";
import "../../../theme/_p0css/combinatorics-counter.css";

const ACCENT = "#94A3B8";

const N_MAX = 60; // exact BigInt handles far more; keep inputs sane for the UI
const PASCAL_ROWS = 12; // triangle capped at rows 0…12 to stay readable

// The four counting rules, framed by the two questions the 2×2 grid asks.
type Mode = {
  kind: CountKind;
  label: string;
  ordered: boolean; // does order matter?
  repeat: boolean; // is repetition allowed?
  formula: (n: number, r: number) => string;
  meaning: string;
};

const MODES: readonly Mode[] = [
  {
    kind: "permutation",
    label: "Permutation",
    ordered: true,
    repeat: false,
    formula: (n, r) => `P(${n},${r}) = ${n}! / (${n}−${r})!`,
    meaning: "ordered, no repetition — arrangements of r distinct items from n",
  },
  {
    kind: "combination",
    label: "Combination",
    ordered: false,
    repeat: false,
    formula: (n, r) => `C(${n},${r}) = ${n}! / (${r}! · (${n}−${r})!)`,
    meaning: "unordered, no repetition — subsets of size r chosen from n",
  },
  {
    kind: "tuple",
    label: "Tuple",
    ordered: true,
    repeat: true,
    formula: (n, r) => `${n}^${r}`,
    meaning: "ordered, with repetition — length-r strings over an n-symbol alphabet",
  },
  {
    kind: "multiset",
    label: "Multiset",
    ordered: false,
    repeat: true,
    formula: (n, r) => `C(${n}+${r}−1, ${r})`,
    meaning: "unordered, with repetition — stars & bars: r picks from n types",
  },
];

function modeOf(kind: CountKind): Mode {
  return MODES.find((m) => m.kind === kind) ?? MODES[0];
}

/** The unique mode for a given (ordered?, repeat?) pair — powers the 2×2 grid. */
function kindFor(ordered: boolean, repeat: boolean): CountKind {
  if (ordered && !repeat) return "permutation";
  if (!ordered && !repeat) return "combination";
  if (ordered && repeat) return "tuple";
  return "multiset";
}

export default function CombinatoricsCounter() {
  const [n, setN] = useState<number>(5);
  const [r, setR] = useState<number>(3);
  const [kind, setKind] = useState<CountKind>("combination");

  const mode = modeOf(kind);
  // r may exceed n; the engine returns 0n for permutation/combination, and the
  // value stays meaningful for tuple/multiset. We surface that honestly.
  const value = useMemo(() => count(kind, n, r), [kind, n, r]);
  const display = formatBig(value);
  const isZero = value === 0n;

  // Pascal's triangle, rows 0…min(n, cap). Row i has i+1 entries.
  const shownRows = Math.min(n, PASCAL_ROWS);
  const triangle = useMemo(() => {
    const rows: bigint[][] = [];
    for (let i = 0; i <= shownRows; i++) rows.push(pascalRow(i));
    return rows;
  }, [shownRows]);
  // Highlight the C(n,r) cell only when it is actually on the (capped) triangle.
  const highlight =
    kind === "combination" && n <= PASCAL_ROWS && r >= 0 && r <= n
      ? { row: n, col: r }
      : null;
  const pascalCapped = kind === "combination" && n > PASCAL_ROWS;

  function setNClamped(v: number): void {
    const nn = clamp(Math.round(v), 0, N_MAX);
    setN(nn);
    setR((rr) => clamp(rr, 0, mode.repeat ? N_MAX : nn)); // no-repeat modes need r ≤ n
  }
  function setRClamped(v: number): void {
    const cap = mode.repeat ? N_MAX : n;
    setR(clamp(Math.round(v), 0, cap));
  }
  function pickKind(k: CountKind): void {
    setKind(k);
    // entering a no-repeat mode with r > n would silently give 0 — clamp so the
    // switch is legible.
    if (!modeOf(k).repeat) setR((rr) => Math.min(rr, n));
  }
  function onReset(): void {
    setN(5);
    setR(3);
    setKind("combination");
  }

  const status =
    `${mode.label} · n=${n}, r=${r} · ${mode.formula(n, r)} = ${display}` +
    (isZero && !mode.repeat ? " (r > n → 0)" : "");

  return (
    <SimShell
      title="Combinatorics counter — the four ways to count"
      simKey="combinatorics-counter"
      kind="hero"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="cc-ctl" role="group" aria-label="n, r and counting mode">
          <label className="cc-field">
            <span className="cc-field-lbl">n</span>
            <input
              className="cc-num"
              type="number"
              min={0}
              max={N_MAX}
              value={n}
              onChange={(e) => setNClamped(Number(e.target.value))}
              aria-label="n (pool size)"
            />
          </label>
          <label className="cc-field">
            <span className="cc-field-lbl">r</span>
            <input
              className="cc-num"
              type="number"
              min={0}
              max={mode.repeat ? N_MAX : n}
              value={r}
              onChange={(e) => setRClamped(Number(e.target.value))}
              aria-label="r (selection size)"
            />
          </label>
          <div className="cc-modes" role="tablist" aria-label="Counting mode">
            {MODES.map((m) => (
              <button
                key={m.kind}
                type="button"
                role="tab"
                aria-selected={kind === m.kind}
                className={cx("btn", "cc-mode", kind === m.kind && "btn-primary")}
                onClick={() => pickKind(m.kind)}
                title={m.meaning}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="cc-foot">
          <p className="cc-lesson">
            Two questions decide which rule you need: <b>does order matter?</b> and{" "}
            <b>is repetition allowed?</b> That is the 2×2 grid — four cells, four formulas. The count
            can outrun any calculator, so it is kept exact with big integers and only summarized when
            it grows past 30 digits.
          </p>
        </div>
      }
    >
      <div className="cc-stage">
        {/* left: the chosen count, big, with formula + meaning + the 2×2 grid */}
        <div className="cc-panel">
          <div className="cc-count-card">
            <div className="cc-count-head">
              <span className="cc-count-mode">{mode.label}</span>
              <code className="cc-count-formula">{mode.formula(n, r)}</code>
            </div>
            <div className={cx("cc-count-big", isZero && "is-zero")} aria-label={`Result ${display}`}>
              {display}
            </div>
            <p className="cc-count-meaning">{mode.meaning}</p>
            {isZero && !mode.repeat && (
              <p className="cc-count-note">
                r &gt; n with no repetition: there aren&apos;t enough distinct items, so the count is
                0.
              </p>
            )}
          </div>

          {/* the 2×2 order?/repetition? frame */}
          <div className="cc-grid" role="group" aria-label="order and repetition grid">
            <div className="cc-grid-corner" aria-hidden="true" />
            <div className="cc-grid-colhead">no repetition</div>
            <div className="cc-grid-colhead">repetition</div>

            <div className="cc-grid-rowhead">ordered</div>
            {[false, true].map((rep) => {
              const k = kindFor(true, rep);
              return (
                <button
                  key={`o-${rep}`}
                  type="button"
                  className={cx("cc-cell", kind === k && "is-active")}
                  onClick={() => pickKind(k)}
                  aria-pressed={kind === k}
                >
                  <span className="cc-cell-name">{modeOf(k).label}</span>
                  <code className="cc-cell-f">{k === "permutation" ? "n!/(n−r)!" : "nʳ"}</code>
                </button>
              );
            })}

            <div className="cc-grid-rowhead">unordered</div>
            {[false, true].map((rep) => {
              const k = kindFor(false, rep);
              return (
                <button
                  key={`u-${rep}`}
                  type="button"
                  className={cx("cc-cell", kind === k && "is-active")}
                  onClick={() => pickKind(k)}
                  aria-pressed={kind === k}
                >
                  <span className="cc-cell-name">{modeOf(k).label}</span>
                  <code className="cc-cell-f">
                    {k === "combination" ? "C(n,r)" : "C(n+r−1,r)"}
                  </code>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: Pascal's triangle, with the C(n,r) cell lit in Combination mode */}
        <div className="cc-pascal" aria-label="Pascal's triangle">
          <div className="cc-pascal-head">
            <span className="cc-pascal-title">Pascal&apos;s triangle</span>
            <span className="cc-pascal-sub">
              {kind === "combination"
                ? highlight
                  ? `C(${n},${r}) is the lit cell`
                  : pascalCapped
                    ? `n=${n} is past row ${PASCAL_ROWS} (shown up to ${PASCAL_ROWS})`
                    : `C(${n},${r}) — pick 0 ≤ r ≤ n to light it`
                : "switch to Combination to see C(n,r) here"}
            </span>
          </div>
          <div className="cc-tri" role="presentation">
            {triangle.map((row, i) => (
              <div className="cc-tri-row" key={i}>
                {row.map((vBig, j) => {
                  const on = highlight?.row === i && highlight.col === j;
                  return (
                    <span
                      key={j}
                      className={cx("cc-tri-cell", on && "is-hit")}
                      title={`C(${i},${j}) = ${vBig.toString()}`}
                    >
                      {formatBig(vBig, 6)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SimShell>
  );
}
