// [micro] lz-window — LZ77, the idea behind zip/gzip/PNG: replace repeats with
// a back-reference (go back `offset`, copy `length`). Step through the text and
// watch matches point into the sliding window. Transport-stepped.
import { useMemo, useState } from "react";
import SimShell from "./SimShell.tsx";
import { useSimClock } from "../../lib/simClock.ts";
import { cx } from "../../lib/utils.ts";
import { lz77 } from "./compression/model.ts";
import type { LzToken } from "./compression/model.ts";

const ACCENT = "#FACC15";
const CW = 20;
const PAD = 16;
const WINDOW = 24;
const glyph = (s: string) => (s === " " ? "␣" : s);

const PRESETS = ["abracadabra abracadabra", "the cat the cat the cat", "compression compresses"];

type Span = { start: number; len: number; token: LzToken };

export default function LzWindow() {
  const [text, setText] = useState(PRESETS[0]);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const clean = text.slice(0, 44);
  const tokens = useMemo(() => lz77(clean, WINDOW), [clean]);
  const spans = useMemo(() => {
    const out: Span[] = [];
    let idx = 0;
    for (const t of tokens) {
      const len = t.kind === "literal" ? 1 : t.length + (t.next ? 1 : 0);
      out.push({ start: idx, len, token: t });
      idx += len;
    }
    return out;
  }, [tokens]);

  const total = tokens.length;
  const done = step >= total;

  // reset when the text changes
  const [lastText, setLastText] = useState(clean);
  if (clean !== lastText) {
    setLastText(clean);
    setStep(0);
    setRunning(false);
  }

  function tick() {
    setStep((s) => {
      if (s >= total) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  }
  useSimClock(running, 1.6 * speed, tick);

  const active = step > 0 ? spans[step - 1] : null;
  const cursorEnd = active ? active.start + active.len : 0;
  const matches = tokens.slice(0, step).filter((t) => t.kind === "match").length;
  const literals = tokens.slice(0, step).filter((t) => t.kind === "literal").length;

  const W = PAD * 2 + clean.length * CW;

  return (
    <SimShell
      title="LZ77 — compress by pointing backwards"
      simKey="lz-window"
      accent={ACCENT}
      transport={{ running, onToggle: () => setRunning((r) => !r), onStep: tick, speed, onSpeed: setSpeed }}
      onReset={() => { setStep(0); setRunning(false); }}
      status={
        done
          ? `Done · ${literals} literals + ${matches} back-references encode ${clean.length} characters. Every match reuses text already sent — no dictionary shipped.`
          : active
            ? active.token.kind === "match"
              ? `Match! go back ${active.token.offset}, copy ${active.token.length}${active.token.next ? `, then literal '${glyph(active.token.next)}'` : ""} — a repeat replaced by a pointer.`
              : `Literal '${active.token.kind === "literal" ? glyph(active.token.char) : ""}' — nothing to reuse yet, emit it raw.`
            : "Press ▶ or ⏭ step to scan the text left-to-right, emitting literals until a repeat can be pointed at."
      }
      controls={
        <button type="button" className="btn" onClick={() => { setStep(total); setRunning(false); }} disabled={done}>
          ⏩ finish
        </button>
      }
      footer={
        <div className="lz-tokens">
          <div className="huf-caption">output tokens</div>
          <div className="lz-tokrow">
            {spans.slice(0, step).map((s, i) => (
              <span key={i} className={cx("lz-tok", s.token.kind)}>
                {s.token.kind === "literal" ? glyph(s.token.char) : `⟨${s.token.offset},${s.token.length}⟩${s.token.next ? glyph(s.token.next) : ""}`}
              </span>
            ))}
            {step === 0 && <span className="muted">—</span>}
          </div>
        </div>
      }
    >
      <div className="rle-presets">
        {PRESETS.map((p) => (
          <button key={p} type="button" className="btn bit-preset" onClick={() => setText(p)}>
            {p}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} 120`} className="lz-svg" role="img" aria-label="LZ77 sliding window">
        {/* window shading */}
        {active && active.token.kind === "match" && (
          <rect x={PAD + Math.max(0, cursorEnd - active.len - WINDOW) * CW} y={40} width={Math.min(WINDOW, cursorEnd - active.len) * CW} height={CW + 8} fill="var(--sem-data)" opacity="0.07" />
        )}
        {[...clean].map((ch, i) => {
          const inMatchSource =
            active && active.token.kind === "match" && i >= active.start - active.token.offset && i < active.start - active.token.offset + active.token.length;
          const inMatchCopy = active && active.token.kind === "match" && i >= active.start && i < active.start + active.token.length;
          const isLiteralNow = active && i >= active.start && i < active.start + (active.token.kind === "literal" ? 1 : active.len) && !inMatchCopy;
          const emitted = i < cursorEnd;
          return (
            <g key={i}>
              <rect
                x={PAD + i * CW}
                y={48}
                width={CW - 2}
                height={CW + 4}
                rx="3"
                fill={inMatchSource ? "color-mix(in srgb, var(--sem-data) 30%, var(--s2))" : inMatchCopy ? "color-mix(in srgb, var(--sem-control) 30%, var(--s2))" : isLiteralNow ? "color-mix(in srgb, var(--sem-ok) 24%, var(--s2))" : emitted ? "var(--s2)" : "var(--bg)"}
                stroke={inMatchSource ? "var(--sem-data)" : inMatchCopy ? "var(--sem-control)" : "var(--line)"}
                strokeWidth="1.3"
              />
              <text x={PAD + i * CW + (CW - 2) / 2} y={48 + CW / 2 + 5} textAnchor="middle" fill={emitted ? "var(--tx)" : "var(--tx3)"} fontFamily="var(--font-mono)" fontSize="12">
                {glyph(ch)}
              </text>
            </g>
          );
        })}
        {/* back-reference arrow */}
        {active && active.token.kind === "match" && (() => {
          const srcMid = PAD + (active.start - active.token.offset) * CW + CW / 2;
          const dstMid = PAD + active.start * CW + CW / 2;
          return (
            <g>
              <path d={`M ${dstMid} 46 C ${dstMid} 16, ${srcMid} 16, ${srcMid} 46`} fill="none" stroke="var(--sem-control)" strokeWidth="2" />
              <path d={`M ${srcMid - 4} 42 L ${srcMid} 48 L ${srcMid + 4} 42`} fill="var(--sem-control)" />
              <text x={(srcMid + dstMid) / 2} y={12} textAnchor="middle" fill="var(--sem-control)" fontFamily="var(--font-mono)" fontSize="11">
                back {active.token.offset}, copy {active.token.length}
              </text>
            </g>
          );
        })()}
      </svg>

      <p className="lsb-canvas-hint muted">
        The “window” is just the recent past (here up to {WINDOW} chars). A match says “this is the same as something I
        already sent” — so the decoder rebuilds it from its own output, no dictionary attached. gzip = LZ77 + Huffman on
        the tokens; PNG uses the same core.
      </p>
    </SimShell>
  );
}
