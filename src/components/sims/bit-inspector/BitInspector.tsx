// bit-inspector [HERO] — ch.1's centerpiece (INTERACTIVES.md). Two lanes:
// • Int lane: flip bits on an 8/16/32-bit register, read unsigned/signed
//   (two's complement) and hex live, watch MAX+1 wrap around, mirror the
//   two's-complement negation.
// • Float lane: type any decimal, watch it snap to the nearest IEEE-754
//   value; sign/exponent/mantissa fields colored; 0.1+0.2 and the widening
//   precision gap made visible.
import { useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import {
  CLASSIC_SUM,
  bitsToSigned,
  bitsToUnsigned,
  decomposeFloat,
  hexOf,
  sizeOf,
  toBits,
  twosComplement,
  ulpGap,
} from "./model.ts";
import type { FloatKind, IntWidth } from "./model.ts";

const ACCENT = "#FACC15"; // P1 · Information

type Lane = "int" | "float";

export default function BitInspector() {
  const [lane, setLane] = useState<Lane>("int");
  return (
    <SimShell
      title="Bit inspector — the same bits, every way to read them"
      simKey="bit-inspector"
      kind="hero"
      accent={ACCENT}
      onReset={() => setLane("int")}
      controls={
        <label className="ss-field">
          lane
          <select aria-label="Choose lane" value={lane} onChange={(e) => setLane(e.target.value as Lane)}>
            <option value="int">integers (two's complement)</option>
            <option value="float">floats (IEEE-754)</option>
          </select>
        </label>
      }
    >
      {lane === "int" ? <IntLane /> : <FloatLane />}
    </SimShell>
  );
}

// ================= integer lane =================

function IntLane() {
  const [width, setWidth] = useState<IntWidth>(8);
  const [signed, setSigned] = useState(true);
  const [pattern, setPattern] = useState<bigint>(5n);
  const [flash, setFlash] = useState<"none" | "wrap">("none");

  const size = sizeOf(width);
  const bits = toBits(pattern, width);
  const unsigned = bitsToUnsigned(bits);
  const signedVal = bitsToSigned(bits);
  const negBits = twosComplement(bits);

  function setWidthKeep(w: IntWidth) {
    setWidth(w);
    setPattern((p) => ((p % (1n << BigInt(w))) + (1n << BigInt(w))) % (1n << BigInt(w)));
  }
  function toggleBit(i: number) {
    const weight = 1n << BigInt(width - 1 - i);
    setPattern((p) => p ^ weight);
    setFlash("none");
  }
  function bump(delta: bigint) {
    setPattern((p) => {
      const raw = p + delta;
      const wrapped = ((raw % size) + size) % size;
      if (raw >= size || raw < 0n) {
        setFlash("wrap");
        window.setTimeout(() => setFlash("none"), 650);
      }
      return wrapped;
    });
  }

  return (
    <div className="bit-lane">
      <div className="bit-controls">
        <div className="bit-seg" role="group" aria-label="Register width">
          {([8, 16, 32] as IntWidth[]).map((w) => (
            <button key={w} type="button" className={cx("bit-segbtn", width === w && "on")} onClick={() => setWidthKeep(w)}>
              {w}-bit
            </button>
          ))}
        </div>
        <div className="bit-seg" role="group" aria-label="Interpretation">
          <button type="button" className={cx("bit-segbtn", !signed && "on")} onClick={() => setSigned(false)}>
            unsigned
          </button>
          <button type="button" className={cx("bit-segbtn", signed && "on")} onClick={() => setSigned(true)}>
            signed
          </button>
        </div>
      </div>

      <div className={cx("bit-register", flash === "wrap" && "wrap")}>
        {bits.map((b, i) => {
          const posFromLsb = width - 1 - i;
          const isSign = signed && i === 0;
          return (
            <div key={i} className={cx("bit-cell-wrap", posFromLsb % 4 === 0 && i !== 0 && "nibble")}>
              <button
                type="button"
                className={cx("bit-cell", b === 1 && "on", isSign && "sign")}
                onClick={() => toggleBit(i)}
                aria-label={`bit ${posFromLsb}, value ${b}${isSign ? ", sign bit" : ""} — click to flip`}
                aria-pressed={b === 1}
              >
                {b}
              </button>
              <span className="bit-weight" aria-hidden="true">
                {isSign ? "−2" : "2"}
                <sup>{posFromLsb}</sup>
              </span>
            </div>
          );
        })}
      </div>

      <div className="bit-readouts">
        <Readout label="unsigned" value={unsigned.toString()} active={!signed} accentClass="rd-plain" />
        <Readout
          label="signed (two's complement)"
          value={signedVal.toString()}
          active={signed}
          accentClass={signedVal < 0n ? "rd-neg" : "rd-plain"}
        />
        <Readout label="hex" value={hexOf(bits)} active accentClass="rd-hex" />
      </div>

      <div className="bit-actions">
        <button type="button" className="btn" onClick={() => bump(-1n)} aria-label="Subtract one">
          − 1
        </button>
        <button type="button" className="btn btn-primary" onClick={() => bump(1n)} aria-label="Add one">
          + 1
        </button>
        <button type="button" className="btn" onClick={() => setPattern(size - 1n)}>
          jump to MAX
        </button>
        <button type="button" className="btn" onClick={() => setPattern(twosNegate())}>
          negate (¬x + 1)
        </button>
        <span className="bit-mirror" aria-live="polite">
          two's-complement mirror: <code>{negBits.join("")}</code> = {signed ? bitsToSigned(negBits).toString() : bitsToUnsigned(negBits).toString()}
        </span>
      </div>

      <p className="ss-status bit-note" aria-live="polite">
        {flash === "wrap"
          ? "⚠ overflow — the value ran off the end of the register and wrapped around. No error is raised; the extra carry is simply discarded."
          : signed && bits[0] === 1
            ? "The top bit is 1, so under two's complement this is negative — the sign bit carries a big NEGATIVE weight."
            : `${width}-bit register · unsigned range 0…${(size - 1n).toString()} · signed range ${(-(size / 2n)).toString()}…${(size / 2n - 1n).toString()}`}
      </p>
    </div>
  );

  function twosNegate(): bigint {
    return bitsToUnsigned(twosComplement(bits));
  }
}

function Readout({ label, value, active, accentClass }: { label: string; value: string; active: boolean; accentClass: string }) {
  return (
    <div className={cx("bit-readout", active && "active", accentClass)}>
      <span className="bit-rlabel">{label}</span>
      <span className="bit-rvalue">{value}</span>
    </div>
  );
}

// ================= float lane =================

const FLOAT_PRESETS = ["0.1", "0.5", "1", "-2.5", "3.14159", "255.75", "1e20", "0.30000000000000004"];

function FloatLane() {
  const [kind, setKind] = useState<FloatKind>(64);
  const [text, setText] = useState("0.1");

  const parsed = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(parsed);
  const parts = valid ? decomposeFloat(parsed, kind) : null;
  const gap = valid ? ulpGap(parsed, kind) : NaN;

  return (
    <div className="bit-lane">
      <div className="bit-controls">
        <div className="bit-seg" role="group" aria-label="Float width">
          {([32, 64] as FloatKind[]).map((k) => (
            <button key={k} type="button" className={cx("bit-segbtn", kind === k && "on")} onClick={() => setKind(k)}>
              {k}-bit ({k === 32 ? "float" : "double"})
            </button>
          ))}
        </div>
        <label className="bit-field">
          type a number
          <input
            className="bit-input"
            value={text}
            inputMode="decimal"
            onChange={(e) => setText(e.target.value)}
            aria-label="Decimal number to encode"
          />
        </label>
      </div>

      <div className="bit-presets">
        {FLOAT_PRESETS.map((p) => (
          <button key={p} type="button" className="btn bit-preset" onClick={() => setText(p)}>
            {p}
          </button>
        ))}
      </div>

      {parts ? (
        <>
          <div className="bit-fields" aria-label="IEEE-754 fields">
            <FieldBlock name="sign" bits={[parts.sign]} tone="sign" note={parts.sign ? "−" : "+"} />
            <FieldBlock
              name={`exponent (bias ${parts.bias})`}
              bits={parts.exponentBits}
              tone="exp"
              note={parts.unbiasedExponent === null ? "special" : `2^${parts.unbiasedExponent}`}
            />
            <FieldBlock name="mantissa (fraction)" bits={parts.mantissaBits} tone="mant" note={`${parts.mantissaBits.length} bits`} />
          </div>

          <div className="bit-readouts">
            <Readout label="you typed" value={text} active accentClass="rd-plain" />
            <Readout
              label={`stored as ${kind}-bit`}
              value={formatStored(parts.stored)}
              active
              accentClass={parts.stored === parsed ? "rd-ok" : "rd-neg"}
            />
            <Readout label="class" value={parts.classification} active accentClass="rd-hex" />
          </div>

          <p className="ss-status bit-note" aria-live="polite">
            {parts.stored === parsed
              ? `Exactly representable. Value = (−1)^${parts.sign} × 1.mantissa × 2^${parts.unbiasedExponent ?? "—"}. Nearest neighbours are ${formatGap(gap)} away.`
              : `Not representable in binary — snapped to the nearest ${kind}-bit value ${formatStored(parts.stored)} (off by ${formatGap(Math.abs(parts.stored - parsed))}). The gap between representable values here is ${formatGap(gap)}.`}
          </p>

          <div className="bit-classic">
            <strong>The famous one:</strong> <code>0.1 + 0.2</code> stores as{" "}
            <code>{CLASSIC_SUM.sum}</code>, not <code>0.3</code> — because neither 0.1 nor 0.2 has an exact binary
            fraction, and their rounding errors don't cancel.{" "}
            <button type="button" className="btn bit-preset" onClick={() => setText(String(CLASSIC_SUM.sum))}>
              show 0.1 + 0.2
            </button>
          </div>
        </>
      ) : (
        <p className="lsb-hint muted">Type a finite decimal number to see how it's stored (try one of the chips above).</p>
      )}
    </div>
  );
}

function FieldBlock({ name, bits, tone, note }: { name: string; bits: number[]; tone: "sign" | "exp" | "mant"; note: string }) {
  return (
    <div className={cx("bit-fieldblock", `f-${tone}`)}>
      <div className="bit-fieldname">{name}</div>
      <div className="bit-fieldbits">
        {bits.map((b, i) => (
          <span key={i} className={cx("bit-fbit", b === 1 && "on")}>
            {b}
          </span>
        ))}
      </div>
      <div className="bit-fieldnote">{note}</div>
    </div>
  );
}

function formatStored(x: number): string {
  if (Object.is(x, -0)) return "-0";
  const s = String(x);
  return s.length > 24 ? x.toPrecision(17) : s;
}
function formatGap(g: number): string {
  if (!Number.isFinite(g)) return "—";
  if (g === 0) return "0";
  return g < 1e-4 || g > 1e6 ? g.toExponential(2) : String(g);
}
