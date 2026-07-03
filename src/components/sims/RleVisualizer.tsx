// [micro] rle-visualizer — the simplest compression: collapse runs of the
// same symbol into (symbol × count). Watch it win on repetitive data and
// LOSE — output bigger than input — on data with no runs. Reactive.
import { useState } from "react";
import SimShell from "./SimShell.tsx";
import { cx } from "../../lib/utils.ts";
import { rleEncodedLength, rleRuns } from "./compression/model.ts";

const ACCENT = "#FACC15";
const glyph = (s: string) => (s === " " ? "␣" : s);

const PRESETS: { label: string; text: string }[] = [
  { label: "a scanline", text: "WWWWWWWWWWWWBWWWWWWWWWWWWBBBWWWWWWWWWWWW" },
  { label: "friendly", text: "AAAAAABBBBBBBBCCCCCC" },
  { label: "adversarial", text: "ABABABABABAB" },
];

export default function RleVisualizer() {
  const [text, setText] = useState(PRESETS[0].text);
  const clean = text.slice(0, 48);
  const runs = rleRuns(clean);
  const original = clean.length; // 1 byte/char
  const encoded = rleEncodedLength(runs); // 2 bytes/run
  const grew = encoded > original;
  const ratio = encoded === 0 ? 1 : original / encoded;
  const maxRun = Math.max(1, ...runs.map((r) => r.length));

  return (
    <SimShell
      title="Run-length encoding — and how it backfires"
      simKey="rle-visualizer"
      accent={ACCENT}
      onReset={() => setText(PRESETS[0].text)}
      status={
        grew
          ? `⚠ RLE made it BIGGER: ${original} → ${encoded} bytes. With no runs to collapse, every symbol becomes a (symbol,1) pair — pure overhead. No lossless scheme shrinks every input.`
          : `${original} bytes → ${encoded} bytes (${ratio.toFixed(2)}× smaller). ${runs.length} runs collapsed from ${original} symbols.`
      }
      controls={
        <label className="ss-field">
          text
          <input className="bit-input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to compress" spellCheck={false} />
        </label>
      }
    >
      <div className="rle-presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="btn bit-preset" onClick={() => setText(p.text)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="rle-caption huf-caption">input — {original} symbols</div>
      <div className="rle-strip">
        {[...clean].map((ch, i) => (
          <span key={i} className="rle-in">{glyph(ch)}</span>
        ))}
      </div>

      <div className="rle-caption huf-caption">runs — {runs.length} tokens</div>
      <div className="rle-runs">
        {runs.map((r, i) => (
          <span key={i} className={cx("rle-run", r.length === 1 && "single")} style={{ minWidth: `${28 + (r.length / maxRun) * 90}px` }} title={`${r.length}× ${glyph(r.char)}`}>
            <b>{glyph(r.char)}</b>×{r.length}
          </span>
        ))}
      </div>

      <div className="rle-meter">
        <div className={cx("rle-bar", "in")}><span>input {original}B</span><i style={{ width: "100%" }} /></div>
        <div className={cx("rle-bar", grew ? "grew" : "out")}>
          <span>RLE {encoded}B{grew ? " — grew!" : ""}</span>
          <i style={{ width: `${Math.min(180, (encoded / original) * 100)}%` }} />
        </div>
      </div>

      <p className="lsb-canvas-hint muted">
        RLE stores each run as two bytes: the symbol and its count. Brilliant for fax pages, scanlines and icons (long
        identical runs); worthless for text or photos. It's the seed of every real codec: <em>find the redundancy that's
        actually there</em>. When there's none, you can't win — that's ch.3's headline.
      </p>
    </SimShell>
  );
}
