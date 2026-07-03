// [micro] demorgan-flip — one click morphs a circuit into its De Morgan
// equivalent; the truth tables stay identical row by row. Gate glyphs are
// shared with the logic-sandbox (§6 cross-sim continuity).
import { useState } from "react";
import SimShell from "./SimShell.tsx";
import { GateGlyph } from "./logic-sandbox/gateShapes.tsx";
import { cx } from "../../lib/utils.ts";

type Law = "and" | "or";
const ACCENT = "#FB923C";

function fOriginal(law: Law, a: boolean, b: boolean): boolean {
  return law === "and" ? !(a && b) : !(a || b);
}
function fMorphed(law: Law, a: boolean, b: boolean): boolean {
  return law === "and" ? !a || !b : !a && !b;
}

function Sw({ x, y, label, on, onClick }: { x: number; y: number; label: string; on: boolean; onClick: () => void }) {
  return (
    <g transform={`translate(${x} ${y})`} className={cx("lsb-switch", on && "on")} onClick={onClick} style={{ cursor: "pointer" }}>
      <rect width="44" height="32" rx="7" />
      <text x="12" y="21" className="lsb-swlabel">{label}</text>
      <text x="32" y="21" className="lsb-swval">{on ? "1" : "0"}</text>
      <title>toggle {label}</title>
    </g>
  );
}

function WireC({ x1, y1, x2, y2, on }: { x1: number; y1: number; x2: number; y2: number; on: boolean }) {
  const bend = Math.max(24, (x2 - x1) / 2);
  return <path className={cx("lsb-wire", on && "on")} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} />;
}

function Lamp({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`} className={cx("lsb-lamp", on && "on")}>
      <circle cx="14" cy="14" r="13" />
      <text x="14" y="46" textAnchor="middle" className="gate-label">OUT</text>
    </g>
  );
}

export default function DeMorganFlip() {
  const [law, setLaw] = useState<Law>("and");
  const [morphed, setMorphed] = useState(false);
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);

  const out = morphed ? fMorphed(law, a, b) : fOriginal(law, a, b);
  const inner = law === "and" ? a && b : a || b; // original mid-signal
  const g1 = law === "and" ? "AND" : "OR";
  const g2 = law === "and" ? "OR" : "AND";
  const lhs = law === "and" ? "¬(A ∧ B)" : "¬(A ∨ B)";
  const rhs = law === "and" ? "¬A ∨ ¬B" : "¬A ∧ ¬B";

  const rows = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const;

  return (
    <SimShell
      title="De Morgan flip — same truth, different wiring"
      simKey="demorgan-flip"
      accent={ACCENT}
      onReset={() => {
        setLaw("and");
        setMorphed(false);
        setA(true);
        setB(false);
      }}
      status={`${morphed ? rhs : lhs} — with A=${a ? 1 : 0}, B=${b ? 1 : 0} the lamp reads ${out ? 1 : 0}. Flip the wiring: the lamp never changes.`}
      controls={
        <label className="ss-field">
          law
          <select aria-label="Pick the law" value={law} onChange={(e) => setLaw(e.target.value as Law)}>
            <option value="and">¬(A ∧ B) = ¬A ∨ ¬B</option>
            <option value="or">¬(A ∨ B) = ¬A ∧ ¬B</option>
          </select>
        </label>
      }
      footer={
        <table className="lsb-truth dmf-table">
          <caption>
            both wirings, all four rows — the output columns are identical (that's the law)
          </caption>
          <thead>
            <tr>
              <th>A</th>
              <th>B</th>
              <th className="lsb-outcol">{lhs}</th>
              <th className="lsb-outcol">{rhs}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([ra, rb], i) => {
              const v1 = fOriginal(law, ra, rb);
              const v2 = fMorphed(law, ra, rb);
              const current = ra === a && rb === b;
              return (
                <tr
                  key={i}
                  className={cx(current && "current")}
                  onClick={() => {
                    setA(ra);
                    setB(rb);
                  }}
                >
                  <td>{ra ? 1 : 0}</td>
                  <td>{rb ? 1 : 0}</td>
                  <td className="lsb-outcol">{v1 ? 1 : 0}</td>
                  <td className="lsb-outcol">{v2 ? 1 : 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      }
    >
      <div className="dmf-actions">
        <button type="button" className="btn btn-primary" onClick={() => setMorphed((m) => !m)}>
          ⇄ apply De Morgan {morphed ? `(back to ${lhs})` : `(morph to ${rhs})`}
        </button>
      </div>
      <svg viewBox="0 0 560 230" className="lsb-svg dmf-stage" key={`${law}-${morphed}`} aria-label="De Morgan circuit">
        {!morphed ? (
          <g className="fs-frame">
            <Sw x={20} y={40} label="A" on={a} onClick={() => setA(!a)} />
            <Sw x={20} y={140} label="B" on={b} onClick={() => setB(!b)} />
            <WireC x1={64} y1={56} x2={180} y2={82} on={a} />
            <WireC x1={64} y1={156} x2={180} y2={98} on={b} />
            <g transform="translate(180 70)">
              <GateGlyph kind={g1} active={inner} />
            </g>
            <WireC x1={244} y1={90} x2={330} y2={90} on={inner} />
            <g transform="translate(330 70)">
              <GateGlyph kind="NOT" active={out} />
            </g>
            <WireC x1={394} y1={90} x2={460} y2={90} on={out} />
            <Lamp x={460} y={76} on={out} />
            <text x="180" y="30" fill="var(--tx2)" fontSize="13" fontFamily="var(--font-mono)">
              first {g1}, then NOT — the bracket version
            </text>
          </g>
        ) : (
          <g className="fs-frame">
            <Sw x={20} y={30} label="A" on={a} onClick={() => setA(!a)} />
            <Sw x={20} y={150} label="B" on={b} onClick={() => setB(!b)} />
            <WireC x1={64} y1={46} x2={150} y2={50} on={a} />
            <WireC x1={64} y1={166} x2={150} y2={170} on={b} />
            <g transform="translate(150 30)">
              <GateGlyph kind="NOT" active={!a} />
            </g>
            <g transform="translate(150 150)">
              <GateGlyph kind="NOT" active={!b} />
            </g>
            <WireC x1={214} y1={50} x2={330} y2={102} on={!a} />
            <WireC x1={214} y1={170} x2={330} y2={118} on={!b} />
            <g transform="translate(330 90)">
              <GateGlyph kind={g2} active={out} />
            </g>
            <WireC x1={394} y1={110} x2={460} y2={110} on={out} />
            <Lamp x={460} y={96} on={out} />
            <text x="150" y="18" fill="var(--tx2)" fontSize="13" fontFamily="var(--font-mono)">
              NOT each input first, then {g2} — the pushed-through version
            </text>
          </g>
        )}
      </svg>
    </SimShell>
  );
}
