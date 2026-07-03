// [micro] base-converter — one number, three bases, kept in sync; the
// positional weights light up as you type so "place value" stops being
// an abstraction. Reactive (no time axis) → SimShell without transport.
import { useState } from "react";
import SimShell from "./SimShell.tsx";
import { cx } from "../../lib/utils.ts";

const ACCENT = "#FACC15";
const MAX = (1n << 32n) - 1n; // keep the visual honest to a 32-bit register

type Base = 2 | 10 | 16;
const BASE_NAME: Record<Base, string> = { 2: "binary", 10: "decimal", 16: "hex" };
const DIGITS = "0123456789ABCDEF";

function parseIn(text: string, base: Base): bigint | null {
  const t = text.trim().toUpperCase();
  if (t === "") return 0n;
  const re = base === 2 ? /^[01]+$/ : base === 10 ? /^[0-9]+$/ : /^[0-9A-F]+$/;
  if (!re.test(t)) return null;
  let v = 0n;
  for (const ch of t) v = v * BigInt(base) + BigInt(DIGITS.indexOf(ch));
  return v > MAX ? null : v;
}
function format(v: bigint, base: Base): string {
  return v.toString(base).toUpperCase();
}
/** Digits of v in `base`, most-significant first, with each place value. */
function places(v: bigint, base: Base): { digit: number; place: bigint }[] {
  const s = v.toString(base).toUpperCase();
  const out: { digit: number; place: bigint }[] = [];
  const n = s.length;
  for (let i = 0; i < n; i++) {
    out.push({ digit: DIGITS.indexOf(s[i]), place: BigInt(base) ** BigInt(n - 1 - i) });
  }
  return out;
}

export default function BaseConverter() {
  const [value, setValue] = useState<bigint>(181n);
  const [focus, setFocus] = useState<Base>(2);
  const [drafts, setDrafts] = useState<Record<Base, string> | null>(null);

  const shown = (b: Base): string => (drafts ? drafts[b] : format(value, b));

  function edit(base: Base, text: string) {
    const parsed = parseIn(text, base);
    if (parsed === null) {
      // keep the raw draft visible so the user can fix a typo
      setDrafts((d) => ({ ...(d ?? { 2: format(value, 2), 10: format(value, 10), 16: format(value, 16) }), [base]: text }));
      return;
    }
    setValue(parsed);
    setDrafts(null);
    setFocus(base);
  }

  const invalid = drafts !== null;
  const expansion = places(value, focus);
  const terms = expansion.filter((p) => p.digit !== 0);

  return (
    <SimShell
      title="Base converter — place value, lit up"
      simKey="base-converter"
      accent={ACCENT}
      onReset={() => {
        setValue(181n);
        setFocus(2);
        setDrafts(null);
      }}
      status={
        invalid
          ? "⚠ that's not a valid digit string for this base (or it's over the 32-bit ceiling) — fix it to resync."
          : `Decimal ${value.toString()} — the same quantity, written three ways. Expanding in ${BASE_NAME[focus]}.`
      }
      controls={
        <label className="ss-field">
          expand in
          <select aria-label="Base to expand" value={focus} onChange={(e) => setFocus(Number(e.target.value) as Base)}>
            <option value={2}>binary</option>
            <option value={10}>decimal</option>
            <option value={16}>hex</option>
          </select>
        </label>
      }
    >
      <div className="bc-inputs">
        {([2, 10, 16] as Base[]).map((b) => (
          <label key={b} className={cx("bc-field", focus === b && "focus")}>
            <span className="bc-blabel">
              {BASE_NAME[b]} <span className="bc-bsub">base {b}</span>
            </span>
            <input
              className="bc-input"
              value={shown(b)}
              onChange={(e) => edit(b, e.target.value)}
              onFocus={() => setFocus(b)}
              spellCheck={false}
              aria-label={`${BASE_NAME[b]} value`}
            />
          </label>
        ))}
      </div>

      <div className="bc-expand" aria-label="positional expansion">
        <div className="bc-digits">
          {expansion.map((p, i) => (
            <div key={i} className={cx("bc-place", p.digit !== 0 && "lit")}>
              <span className="bc-digit">{DIGITS[p.digit]}</span>
              <span className="bc-times">×</span>
              <span className="bc-place-val">{focus === 2 ? `2^${expansion.length - 1 - i}` : p.place.toString()}</span>
            </div>
          ))}
        </div>
        <div className="bc-sum">
          {terms.length === 0 ? (
            <span>= 0</span>
          ) : (
            <>
              {terms.map((p, i) => (
                <span key={i}>
                  {i > 0 && " + "}
                  <span className="bc-term">{(BigInt(p.digit) * p.place).toString()}</span>
                </span>
              ))}
              {" = "}
              <span className="bc-total">{value.toString()}</span>
            </>
          )}
        </div>
      </div>

      <p className="lsb-canvas-hint muted">
        Every place is the base to a power. Only the non-zero digits contribute — those are the ones lit up. Hex is
        just binary in groups of four: one hex digit ⇄ one nibble.
      </p>
    </SimShell>
  );
}
