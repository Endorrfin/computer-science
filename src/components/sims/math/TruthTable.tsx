// [micro] truth-table — ch.0b (Math toolkit). Type a boolean expression over
// single-letter variables and the connectives ¬ ∧ ∨ → ↔; on every keystroke the
// full 2^v truth table is rebuilt and the expression is classified as a
// TAUTOLOGY (always true), a CONTRADICTION (always false), or a CONTINGENCY
// (depends). The presets are the greatest hits — the De Morgan pair, and the
// contrapositive as a tautology you can watch come out all-✓. Reactive (no time
// axis) → SimShell without transport. A parse error never crashes the stage: it
// shows a friendly inline hint instead.
//
// Single default export (react-refresh); helpers are file-local. Colors are
// theme vars; the sheet adds hover/anim only. No localStorage — all state here.
import { useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { truthTable, equivalent } from "./logic.ts";
import type { TruthTable as TruthTableModel } from "./logic.ts";
import "../../../theme/_p0css/truth-table.css";

const ACCENT = "#94A3B8";

type Preset = { label: string; src: string; note: string };
const PRESETS: Preset[] = [
  { label: "p ∧ q", src: "p ∧ q", note: "conjunction" },
  { label: "p ∨ q", src: "p ∨ q", note: "disjunction" },
  { label: "p → q", src: "p → q", note: "implication" },
  { label: "¬(p ∧ q)", src: "¬(p ∧ q)", note: "De Morgan, left" },
  { label: "¬p ∨ ¬q", src: "¬p ∨ ¬q", note: "De Morgan, right" },
  { label: "p ∨ ¬p", src: "p ∨ ¬p", note: "excluded middle" },
  { label: "p ∧ ¬p", src: "p ∧ ¬p", note: "contradiction" },
  { label: "(p → q) ↔ (¬q → ¬p)", src: "(p → q) ↔ (¬q → ¬p)", note: "contrapositive" },
];

// The connectives the engine accepts, shown as a legend so the syntax is never a
// guessing game.
const OPS: { sym: string; also: string; name: string }[] = [
  { sym: "¬", also: "~ ! not", name: "NOT" },
  { sym: "∧", also: "& && and", name: "AND" },
  { sym: "∨", also: "| || or", name: "OR" },
  { sym: "→", also: "-> => implies", name: "IMPLIES" },
  { sym: "↔", also: "<-> <=> iff", name: "IFF" },
];

type Parsed =
  | { ok: true; table: TruthTableModel }
  | { ok: false };

function build(src: string): Parsed {
  const trimmed = src.trim();
  if (trimmed === "") return { ok: false };
  try {
    return { ok: true, table: truthTable(trimmed) };
  } catch {
    return { ok: false };
  }
}

const CLASS_LABEL: Record<TruthTableModel["classification"], string> = {
  tautology: "tautology · always true",
  contradiction: "contradiction · always false",
  contingency: "contingency · depends on the inputs",
};

// De Morgan holds for AND-side; if the current expr is one of the pair, tell the
// reader whether it matches its dual. A quiet nudge toward the engine's `equivalent`.
function morganDual(src: string): { other: string; same: boolean } | null {
  const t = src.trim();
  if (t === "¬(p ∧ q)") return { other: "¬p ∨ ¬q", same: equivalent(t, "¬p ∨ ¬q") };
  if (t === "¬p ∨ ¬q") return { other: "¬(p ∧ q)", same: equivalent(t, "¬(p ∧ q)") };
  return null;
}

export default function TruthTable() {
  const [src, setSrc] = useState<string>("(p → q) ↔ (¬q → ¬p)");
  const parsed = build(src);
  const dual = parsed.ok ? morganDual(src) : null;

  const status = !parsed.ok
    ? src.trim() === ""
      ? "Type a boolean expression — try p ∧ q, or pick a preset."
      : "⚠ can't parse that expression yet — check the operators below."
    : `${src.trim()} over {${parsed.table.variables.join(", ") || "no variables"}} — ${CLASS_LABEL[parsed.table.classification]}.`;

  return (
    <SimShell
      title="Truth table — every row of a boolean expression"
      simKey="truth-table"
      accent={ACCENT}
      onReset={() => setSrc("(p → q) ↔ (¬q → ¬p)")}
      status={status}
      controls={
        <label className="ss-field tt-field">
          expression
          <input
            className="tt-input"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Boolean expression"
            aria-invalid={!parsed.ok && src.trim() !== ""}
            placeholder="p ∧ q"
          />
        </label>
      }
    >
      <div className="tt-presets" role="group" aria-label="Preset expressions">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={cx("tt-preset", src.trim() === p.src && "on")}
            onClick={() => setSrc(p.src)}
            aria-pressed={src.trim() === p.src}
            title={p.note}
          >
            {p.label}
          </button>
        ))}
      </div>

      {parsed.ok ? (
        <Table table={parsed.table} src={src.trim()} />
      ) : (
        <div className="tt-error" role="status">
          <span className="tt-error-mark" aria-hidden="true">
            ⚠
          </span>
          <div>
            <p className="tt-error-lead">Can’t parse that.</p>
            <p className="tt-error-hint muted">
              Try <code>p</code>, <code>q</code>, and <code>and</code>, <code>or</code>, <code>not</code>,{" "}
              <code>-&gt;</code>, <code>&lt;-&gt;</code>. Variables are single letters; wrap sub-parts in{" "}
              <code>( )</code>.
            </p>
          </div>
        </div>
      )}

      {parsed.ok && (
        <div className="tt-verdict-row">
          <span
            className={cx("tt-verdict", `tt-verdict--${parsed.table.classification}`)}
            role="status"
          >
            <span className="tt-verdict-dot" aria-hidden="true" />
            {CLASS_LABEL[parsed.table.classification]}
          </span>
          {dual && (
            <span
              className={cx("tt-dual", dual.same ? "tt-dual--yes" : "tt-dual--no")}
              title="Checked with the engine’s equivalence test"
            >
              {dual.same ? "≡" : "≢"} <code>{dual.other}</code> {dual.same ? "(De Morgan holds)" : "(differs)"}
            </span>
          )}
        </div>
      )}

      <div className="tt-legend" aria-label="Accepted operators">
        <span className="tt-legend-title">operators</span>
        {OPS.map((o) => (
          <span key={o.sym} className="tt-op">
            <span className="tt-op-sym">{o.sym}</span>
            <span className="tt-op-name">{o.name}</span>
            <span className="tt-op-also muted">{o.also}</span>
          </span>
        ))}
        <span className="tt-op tt-op--const">
          <span className="tt-op-sym">1 0</span>
          <span className="tt-op-name">T F</span>
          <span className="tt-op-also muted">constants</span>
        </span>
      </div>

      <p className="lsb-canvas-hint muted">
        Each row is one assignment of the variables; the last column is the whole expression evaluated there. All
        rows ✓ → a tautology (true no matter what). All ✗ → a contradiction. A mix → a contingency, the ordinary case.
      </p>
    </SimShell>
  );
}

// ---- table renderer (file-local) -------------------------------------------

function Table({ table, src }: { table: TruthTableModel; src: string }) {
  const { variables, rows } = table;
  // Cap the visible expression header so a long formula doesn't blow the layout.
  const exprHead = src.length > 28 ? src.slice(0, 27) + "…" : src;

  return (
    <div className="tt-table-wrap" tabIndex={0} role="region" aria-label="Truth table">
      <table className="tt-table">
        <thead>
          <tr>
            {variables.map((v) => (
              <th key={v} scope="col" className="tt-th tt-th--var">
                {v}
              </th>
            ))}
            <th
              scope="col"
              className="tt-th tt-th--expr"
              style={{ "--accent": ACCENT } as CSSProperties}
              title={src}
            >
              {exprHead || "value"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cx("tt-row", r.value ? "tt-row--t" : "tt-row--f")}>
              {variables.map((v) => (
                <Cell key={v} on={r.assignment[v]} kind="var" />
              ))}
              <Cell on={r.value} kind="expr" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ on, kind }: { on: boolean; kind: "var" | "expr" }) {
  return (
    <td className={cx("tt-td", `tt-td--${kind}`, on ? "is-t" : "is-f")}>
      <span className="tt-bool" aria-hidden="true">
        {on ? "✓" : "✗"}
      </span>
      <span className="sr-only">{on ? "true" : "false"}</span>
    </td>
  );
}
