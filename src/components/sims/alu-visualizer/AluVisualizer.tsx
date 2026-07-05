// [micro] alu-visualizer — the ALU is the CPU's calculator: pick an operation,
// feed two 8-bit words, watch the result and the four condition flags
// (Z zero · N negative · C carry/borrow · V signed overflow) light up.
// SUB reuses the adder (A + ~B + 1), so subtraction is free hardware. Flags
// are what `if` compiles down to. Engine: machine/arith.ts. Reactive.
import { useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { alu, ALU_OP_LABEL, ALU_OPS, asSigned } from "../machine/arith.ts";
import type { AluOp } from "../machine/arith.ts";

const ACCENT = "#FB923C";
const W = 8;

const PRESETS: { label: string; a: number; b: number; op: AluOp }[] = [
  { label: "127 + 1 (overflow)", a: 127, b: 1, op: "ADD" },
  { label: "5 − 8 (borrow)", a: 5, b: 8, op: "SUB" },
  { label: "compare 42 : 42", a: 42, b: 42, op: "CMP" },
  { label: "mask 0xF0 & 0x3C", a: 0xf0, b: 0x3c, op: "AND" },
];

const FLAG_INFO: { key: "z" | "n" | "c" | "v"; name: string; blurb: string }[] = [
  { key: "z", name: "Z", blurb: "Zero — result is all 0s (used by JZ / branch-if-equal)" },
  { key: "n", name: "N", blurb: "Negative — top bit is 1 (two's-complement sign)" },
  { key: "c", name: "C", blurb: "Carry/borrow — carry out of the top bit; on SUB, 1 = no borrow (A ≥ B unsigned)" },
  { key: "v", name: "V", blurb: "oVerflow — signed result wrong: carry into MSB ≠ carry out of MSB" },
];

const bits = (v: number) =>
  Array.from({ length: W }, (_, i) => (v >> (W - 1 - i)) & 1);

export default function AluVisualizer() {
  const [a, setA] = useState(127);
  const [b, setB] = useState(1);
  const [op, setOp] = useState<AluOp>("ADD");

  const r = alu(op, a, b, W);
  const isArith = r.add !== undefined;

  function onReset() {
    setA(127);
    setB(1);
    setOp("ADD");
  }

  return (
    <SimShell
      title="ALU — the CPU's calculator"
      simKey="alu-visualizer"
      accent={ACCENT}
      onReset={onReset}
      status={`${ALU_OP_LABEL[op]}  →  ${r.writes ? r.value : "(discarded)"}   [${(["z", "n", "c", "v"] as const)
        .filter((k) => r.flags[k])
        .map((k) => k.toUpperCase())
        .join(" ") || "no flags set"}]`}
      controls={
        <div className="bit-seg" role="group" aria-label="ALU operation">
          {ALU_OPS.map((o) => (
            <button key={o} type="button" className={cx("bit-segbtn", op === o && "on")} onClick={() => setOp(o)} aria-pressed={op === o}>
              {o}
            </button>
          ))}
        </div>
      }
    >
      <div className="alu-presets bit-presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="btn bit-preset"
            onClick={() => {
              setA(p.a);
              setB(p.b);
              setOp(p.op);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="alu-io">
        <WordRow label="A" value={a} onToggle={(i) => setA(a ^ (1 << i))} />
        <WordRow label="B" value={b} onToggle={(i) => setB(b ^ (1 << i))} />
        <div className="alu-op-badge" aria-hidden="true">
          {ALU_OP_LABEL[op]}
        </div>
        <WordRow label="Y" value={r.value} result faded={!r.writes} />
      </div>

      <div className="alu-decs">
        <DecReadout label="A" value={a} />
        <DecReadout label="B" value={b} />
        <DecReadout label={r.writes ? "Y" : "Y (not stored)"} value={r.value} highlight />
      </div>

      <div className="alu-flags" role="group" aria-label="Condition flags">
        {FLAG_INFO.map((f) => (
          <div key={f.key} className={cx("alu-flag", r.flags[f.key] && "on")} title={f.blurb}>
            <span className="alu-flag-name">{f.name}</span>
            <span className="alu-flag-bit">{r.flags[f.key] ? "1" : "0"}</span>
          </div>
        ))}
      </div>

      <p className="lsb-canvas-hint muted">
        {op === "CMP"
          ? "CMP subtracts but throws the result away — it exists only to set flags. That's how a CPU compares before a branch."
          : isArith
            ? "Subtraction is A + (NOT B) + 1 — the same adder from the last sim, no new hardware. Watch C and V: C is the unsigned carry/borrow, V is the signed overflow, and they can disagree."
            : "Logic ops (AND/OR/XOR) work bit-by-bit with no carry between columns, so C and V stay 0. AND with a mask clears bits; OR sets them; XOR flips them."}
      </p>
    </SimShell>
  );
}

function WordRow({
  label,
  value,
  onToggle,
  result,
  faded,
}: {
  label: string;
  value: number;
  onToggle?: (bitIndex: number) => void;
  result?: boolean;
  faded?: boolean;
}) {
  return (
    <div className={cx("alu-word", result && "result", faded && "faded")}>
      <span className="alu-word-lbl">{label}</span>
      <span className="alu-word-cells">
        {bits(value).map((bv, i) => {
          const bitIndex = W - 1 - i;
          const cls = cx("bit-cell", "alu-cell", bv !== 0 && "on", bitIndex === W - 1 && "sign");
          return onToggle ? (
            <button key={i} type="button" className={cls} onClick={() => onToggle(bitIndex)} aria-label={`${label} bit ${bitIndex} = ${bv}`}>
              {bv}
            </button>
          ) : (
            <span key={i} className={cls} aria-hidden="true">
              {bv}
            </span>
          );
        })}
      </span>
    </div>
  );
}

function DecReadout({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cx("alu-dec", highlight && "hot")}>
      <span className="alu-dec-lbl">{label}</span>
      <span className="alu-dec-u">{value} u</span>
      <span className="alu-dec-s">{asSigned(value, W)} s</span>
    </div>
  );
}
