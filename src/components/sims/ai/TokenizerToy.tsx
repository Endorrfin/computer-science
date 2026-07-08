// [micro] tokenizer-toy (ch.34, Part 10 · Intelligence) — a REAL Byte-Pair
// Encoding tokenizer, the same family GPT-class models use. Type text and watch
// `encode(text, BPE_MERGES)` chop it into subword tokens: common words survive
// whole, rare ones fragment, digits split, and a leading space is baked into the
// token ("▁the" ≠ "the"). Purely reactive — no time axis, no transport: every
// keystroke or preset re-runs the memoized encode. The teaching climax is the
// "why letter-counting fails" panel: pick a letter (default r) and a word
// (default strawberry) and `letterView(encode(word), letter)` shows the true
// count while highlighting how those letters are scattered inside opaque tokens
// the model can't see into. Prefix: tok-.
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { encode, letterView, SPACE } from "./bpe.ts";
import type { Token } from "./bpe.ts";
import { BPE_MERGES } from "./data/bpe-data.ts";
import "../../../theme/_p10css/tokenizer-toy.css";

const ACCENT = "#A78BFA";

const DEFAULT_TEXT = "The strawberry tokenization";
const DEFAULT_LETTER = "r";
const DEFAULT_WORD = "strawberry";

// Presets that each tell a slice of the story.
const PRESETS: readonly { label: string; text: string; note: string }[] = [
  { label: "strawberry", text: "strawberry", note: "a rare word fragments into chunks" },
  { label: "the king and the queen", text: "the king and the queen", note: "common words → whole tokens" },
  { label: "tokenization", text: "tokenization", note: "subwords: token · iz · ation-ish pieces" },
  { label: "unbelievable", text: "unbelievable", note: "morphemes get chopped, not understood" },
  { label: "2026", text: "2026", note: "digits split one at a time" },
  { label: "déjà-vu 🍓", text: "déjà-vu 🍓", note: "accents & emoji → many tiny tokens" },
];

// A repeating palette so token boundaries are unmistakable. Cycled by index.
const CHIP_TINTS: readonly string[] = [
  "var(--sem-data)",
  "var(--accent)",
  "var(--sem-control)",
  "var(--sem-state)",
];

// The word being examined in the letter panel is tokenized on its own so the
// counts line up with a single word's chips (leading space stripped).
function pickWord(text: string): string {
  const first = text.trim().split(/\s+/)[0] ?? "";
  return first.length > 0 ? first : DEFAULT_WORD;
}

// Pluralize the letter phrase: 3 r's / 1 r.
function letterPhrase(n: number, letter: string): string {
  return `${n} ${letter}${n === 1 ? "" : "'s"}`;
}

export default function TokenizerToy() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [letter, setLetter] = useState(DEFAULT_LETTER);
  const [word, setWord] = useState(DEFAULT_WORD);

  const tokens = useMemo<Token[]>(() => encode(text, BPE_MERGES), [text]);

  // Letter panel: its own encode of `word`, plus the scatter view for `letter`.
  const wordTokens = useMemo<Token[]>(() => encode(word, BPE_MERGES), [word]);
  const scatter = useMemo(() => letterView(wordTokens, letter), [wordTokens, letter]);

  const charCount = Array.from(text).length;
  const tokenCount = tokens.length;
  const denser = charCount > 0 && tokenCount < charCount; // fewer tokens than chars

  const status =
    charCount === 0 ? "empty input" : `${charCount} chars → ${tokenCount} tokens`;

  // How many chips actually contain the chosen letter (for the summary line).
  const litTokens = scatter.perToken.filter((n) => n > 0).length;

  function onReset(): void {
    setText(DEFAULT_TEXT);
    setLetter(DEFAULT_LETTER);
    setWord(DEFAULT_WORD);
  }

  // Clicking a preset sets the main text AND, when it's a single word, seeds the
  // letter panel with it so the demo follows along.
  function applyPreset(t: string): void {
    setText(t);
    const w = pickWord(t);
    if (!/\s/.test(t.trim())) setWord(w);
  }

  return (
    <SimShell
      title="Tokenizer toy — how a model reads text (BPE)"
      simKey="tokenizer-toy"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="tok-ctl" role="group" aria-label="Try a preset phrase">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={cx("btn", "tok-preset", text === p.text && "btn-primary")}
              onClick={() => applyPreset(p.text)}
              aria-pressed={text === p.text}
              title={p.note}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="tok-stage">
        {/* ------------------------------ input ------------------------------ */}
        <label className="tok-input-field">
          <span className="tok-input-lbl">text to tokenize</span>
          <textarea
            className="tok-input"
            value={text}
            rows={2}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            onChange={(e) => setText(e.target.value)}
            aria-label="Text to tokenize"
            placeholder="type anything…"
          />
        </label>

        {/* ------------------------------ counts ------------------------------ */}
        <div className="tok-counts" role="group" aria-label="Character and token counts">
          <div className="tok-count">
            <span className="tok-count-n">{charCount}</span>
            <span className="tok-count-lbl">characters</span>
          </div>
          <span className="tok-count-arrow" aria-hidden="true">
            →
          </span>
          <div className="tok-count tok-count-tokens">
            <span className="tok-count-n">{tokenCount}</span>
            <span className="tok-count-lbl">tokens</span>
          </div>
          <p className="tok-count-note">
            {charCount === 0
              ? "The model never sees characters — only tokens."
              : denser
                ? "Fewer tokens than characters: common text packs into whole-word tokens."
                : "More tokens than a whole word: rare/odd text fragments into many pieces."}
          </p>
        </div>

        {/* ------------------------------ chips ------------------------------ */}
        <div className="tok-chips-panel">
          <span className="tok-panel-h">tokens (each box is one opaque id the model sees)</span>
          <div className="tok-chips" role="list" aria-label="Tokens">
            {tokens.length === 0 ? (
              <span className="tok-empty">— nothing to tokenize —</span>
            ) : (
              tokens.map((t, i) => {
                const tint = CHIP_TINTS[i % CHIP_TINTS.length];
                return (
                  <span
                    key={i}
                    role="listitem"
                    className="tok-chip"
                    style={{ "--chip-tint": tint } as CSSProperties}
                    title={`token #${i} · ${t.leadingSpace ? "with leading space" : "no leading space"}`}
                  >
                    {t.leadingSpace && (
                      <span className="tok-chip-space" aria-label="leading space" title="leading space is part of the token">
                        ␣
                      </span>
                    )}
                    <span className="tok-chip-text">{t.text}</span>
                    <span className="tok-chip-idx" aria-hidden="true">
                      {i}
                    </span>
                  </span>
                );
              })
            )}
          </div>
          <p className="tok-chips-cap">
            A leading <b>{SPACE}</b> (shown <code>␣</code>) is part of the token: <code>▁the</code>{" "}
            and <code>the</code> can tokenize differently.
          </p>
        </div>

        {/* --------------------- why letter-counting fails --------------------- */}
        <div className="tok-letter-panel">
          <div className="tok-letter-head">
            <span className="tok-panel-h">why models miscount letters</span>
            <div className="tok-letter-inputs">
              <label className="tok-mini-field">
                <span className="tok-mini-lbl">letter</span>
                <input
                  className="tok-mini-input"
                  type="text"
                  value={letter}
                  maxLength={2}
                  spellCheck={false}
                  onChange={(e) => setLetter(e.target.value.slice(0, 1))}
                  aria-label="Letter to count"
                />
              </label>
              <label className="tok-mini-field tok-mini-field-word">
                <span className="tok-mini-lbl">in word</span>
                <input
                  className="tok-mini-input"
                  type="text"
                  value={word}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => setWord(e.target.value)}
                  aria-label="Word to examine"
                />
              </label>
            </div>
          </div>

          {/* the word re-tokenized, with letter-bearing chips lit up */}
          <div className="tok-scatter" role="list" aria-label={`Tokens of ${word}, highlighting the letter ${letter}`}>
            {wordTokens.length === 0 ? (
              <span className="tok-empty">— type a word —</span>
            ) : (
              wordTokens.map((t, i) => {
                const hits = scatter.perToken[i] ?? 0;
                return (
                  <span
                    key={i}
                    role="listitem"
                    className={cx("tok-scatter-chip", hits > 0 && "has-letter")}
                    title={
                      hits > 0
                        ? `token #${i} hides ${letterPhrase(hits, letter || "?")}`
                        : `token #${i} — no ${letter || "?"}`
                    }
                  >
                    {t.leadingSpace && <span className="tok-chip-space" aria-hidden="true">␣</span>}
                    <span className="tok-chip-text">{t.text}</span>
                    {hits > 0 && (
                      <span className="tok-scatter-badge" aria-hidden="true">
                        {hits}
                      </span>
                    )}
                  </span>
                );
              })
            )}
          </div>

          <p className="tok-letter-verdict" role="status" aria-live="polite">
            {letter && wordTokens.length > 0 ? (
              scatter.total === 0 ? (
                <>
                  There are <b>no {letter}'s</b> in “{word}”, yet the model still only sees{" "}
                  <b>{wordTokens.length} opaque tokens</b>, not letters.
                </>
              ) : (
                <>
                  There are <b>{letterPhrase(scatter.total, letter)}</b> in “{word}”, scattered
                  across <b>{litTokens}</b> of its <b>{wordTokens.length}</b>{" "}
                  {wordTokens.length === 1 ? "token" : "tokens"} — but the model sees{" "}
                  <b>{wordTokens.length} opaque tokens, not letters</b>. It can't just “look and
                  count”.
                </>
              )
            ) : (
              <>Pick a letter and a word to see how the count hides inside the tokens.</>
            )}
          </p>
        </div>

        {/* ------------------------------ caption ------------------------------ */}
        <p className="tok-caption">
          This is a <b>real BPE tokenizer</b> — the exact algorithm GPT-class models use — trained
          on a small bundled corpus. Only the <i>scale</i> differs: a production vocabulary has tens
          of thousands of merges, so more words survive whole. The lesson is the same: the model
          reads <b>tokens, not characters</b>, and a leading space is part of the token.
        </p>
      </div>
    </SimShell>
  );
}
