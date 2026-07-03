// [micro] utf8-encoder — type text, watch each character become a Unicode
// code point and its 1–4 UTF-8 bytes. Structural bits (the 0 / 110 / 1110 /
// 11110 leads and the 10 continuation prefix) are dimmed so the payload bits
// stand out — and the char / code-unit / byte counters expose the classic trap.
import { useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { byteRole, encode, stats, toBin, toHex } from "./model.ts";
import type { ByteRole } from "./model.ts";

const ACCENT = "#FACC15";

const STRUCT_LEN: Record<ByteRole, number> = { ascii: 1, lead2: 3, lead3: 4, lead4: 5, cont: 2 };
const ROLE_LABEL: Record<ByteRole, string> = {
  ascii: "1-byte (ASCII)",
  lead2: "lead of 2",
  lead3: "lead of 3",
  lead4: "lead of 4",
  cont: "continuation",
};

const PRESETS = ["Hi!", "café", "€1 = 100¢", "日本語", "emoji 😀🚀", "A👍🏽"];

export default function Utf8Encoder() {
  const [text, setText] = useState("café 😀");
  const chars = encode(text);
  const s = stats(text);

  return (
    <SimShell
      title="UTF-8 encoder — from characters to bytes"
      simKey="utf8-encoder"
      accent={ACCENT}
      onReset={() => setText("café 😀")}
      status={`${s.codePoints} code point${s.codePoints === 1 ? "" : "s"} · ${s.utf16Units} UTF-16 unit${s.utf16Units === 1 ? "" : "s"} (String.length) · ${s.utf8Bytes} UTF-8 byte${s.utf8Bytes === 1 ? "" : "s"} · a fixed UTF-32 store would take ${s.utf32Bytes}.`}
      controls={
        <label className="ss-field">
          text
          <input
            className="bit-input utf-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Text to encode"
            spellCheck={false}
          />
        </label>
      }
      footer={
        <div className="utf-stats">
          <StatChip n={s.codePoints} label="code points" tone="rd-plain" />
          <StatChip n={s.utf16Units} label="UTF-16 units (.length)" tone={s.utf16Units !== s.codePoints ? "rd-neg" : "rd-plain"} />
          <StatChip n={s.utf8Bytes} label="UTF-8 bytes" tone="rd-hex" />
          <StatChip n={s.utf32Bytes} label="UTF-32 bytes (fixed)" tone="rd-plain" />
          {s.utf16Units !== s.codePoints && (
            <span className="utf-trap">
              ⚠ length &gt; code points: an astral character (like an emoji) is <strong>one</strong> code point but{" "}
              <strong>two</strong> UTF-16 units — this is why <code>"😀".length === 2</code>.
            </span>
          )}
        </div>
      }
    >
      <div className="utf-preset-row">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="btn bit-preset" onClick={() => setText(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="utf-grid">
        {chars.map((c, i) => (
          <div key={i} className="utf-char">
            <div className="utf-glyph" title={`U+${c.codePoint.toString(16).toUpperCase().padStart(4, "0")}`}>
              {c.char === " " ? "␣" : c.char}
            </div>
            <div className="utf-cp">U+{c.codePoint.toString(16).toUpperCase().padStart(4, "0")}</div>
            <div className="utf-bytes">
              {c.bytes.map((b, j) => {
                const role = byteRole(b);
                const bin = toBin(b);
                const structLen = STRUCT_LEN[role];
                return (
                  <div key={j} className={cx("utf-byte", `role-${role}`)}>
                    <div className="utf-bin">
                      {bin.split("").map((bit, k) => (
                        <span key={k} className={cx("utf-bit", k < structLen ? "struct" : "payload")}>
                          {bit}
                        </span>
                      ))}
                    </div>
                    <div className="utf-bhex">
                      {toHex(b)} <span className="utf-brole">{ROLE_LABEL[role]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="lsb-canvas-hint muted">
        Dimmed bits are <em>structure</em> (they tell a decoder how many bytes the character spans and which are
        continuations); bright bits are the actual code-point <em>payload</em>. ASCII bytes start with 0, so any pure-ASCII
        text is byte-for-byte identical in UTF-8 — that backward compatibility is why UTF-8 won.
      </p>
    </SimShell>
  );
}

function StatChip({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className={cx("bit-readout active", tone)}>
      <span className="bit-rlabel">{label}</span>
      <span className="bit-rvalue">{n}</span>
    </div>
  );
}
