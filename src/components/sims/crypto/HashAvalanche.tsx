// [micro] hash-avalanche (ch.31) — why a good hash is a one-way blender. Panel A
// flips ONE character of the input and lights up every one of the 256 output
// bits that changed: ~half of them, no matter how tiny the tweak (the avalanche
// property). Panel B is the same primitive turned into work: pick a target of
// leading zero *bits* and mine a nonce whose sha256(prefix+nonce) clears the
// bar — each extra bit roughly doubles the tries. Purely reactive; the map
// recomputes with useMemo and mining runs on a button click. Nothing here
// re-implements SHA-256 — every value comes from sha256.ts. Prefix: hav-.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  avalanche,
  leadingZeroBits,
  mine,
  sha256Bits,
  sha256Hex,
} from "./sha256.ts";
import type { MineResult } from "./sha256.ts";
import "../../../theme/_p9css/hash-avalanche.css";

const ACCENT = "#818CF8";

const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog";
const GRID = 16; // 16 × 16 = 256 output bits
const TARGET_MIN = 0;
const TARGET_MAX = 20;
const TARGET_DEFAULT = 12;

/** Flip a single character of `text` at `pos` up one code point (wrapping the
 *  printable ASCII band) — the smallest possible change we can point at. */
function bumpChar(text: string, pos: number): string {
  if (text.length === 0 || pos < 0 || pos >= text.length) return text;
  const code = text.charCodeAt(pos);
  // Stay inside printable ASCII 33..126 so the "after" string is still visible.
  const next = code >= 33 && code < 126 ? code + 1 : code >= 126 ? 33 : code + 1;
  return text.slice(0, pos) + String.fromCharCode(next) + text.slice(pos + 1);
}

export default function HashAvalanche() {
  const reduced = useReducedMotion();

  // -------- Panel A: avalanche --------
  const [text, setText] = useState(DEFAULT_TEXT);
  // Which character we perturb to form the "after" string. Clamp lazily.
  const [flipPos, setFlipPos] = useState(0);

  const pos = text.length === 0 ? 0 : Math.min(flipPos, text.length - 1);
  const after = useMemo(() => bumpChar(text, pos), [text, pos]);

  const av = useMemo(() => avalanche(text, after), [text, after]);
  const beforeHex = useMemo(() => sha256Hex(text), [text]);
  const afterHex = useMemo(() => sha256Hex(after), [after]);
  const beforeBits = useMemo(() => sha256Bits(text), [text]);
  const afterBits = useMemo(() => sha256Bits(after), [after]);
  const flipped = useMemo(
    () => beforeBits.map((b, i) => (b !== afterBits[i] ? 1 : 0)),
    [beforeBits, afterBits],
  );

  const pct = Math.round(av.ratio * 1000) / 10;

  // -------- Panel B: mining toy --------
  const [prefix, setPrefix] = useState("block");
  const [targetBits, setTargetBits] = useState(TARGET_DEFAULT);
  const [result, setResult] = useState<MineResult | null>(null);

  function onMine(): void {
    setResult(mine(prefix, targetBits));
  }

  function onReset(): void {
    setText(DEFAULT_TEXT);
    setFlipPos(0);
    setPrefix("block");
    setTargetBits(TARGET_DEFAULT);
    setResult(null);
  }

  const status =
    `avalanche: 1 char changed → ${av.flipped}/256 output bits flipped ` +
    `(≈${pct}%)` +
    (result
      ? ` · mine: ${result.found ? `${result.tries.toLocaleString()} tries → nonce ${result.nonce}` : "not found"}`
      : "");

  return (
    <SimShell
      title="Hash avalanche — one character in, half the bits out"
      simKey="hash-avalanche"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
    >
      <div className="hav-wrap">
        {/* ================= Panel A — Avalanche ================= */}
        <section className="hav-panel" aria-label="Avalanche">
          <header className="hav-panel-head">
            <h3 className="hav-panel-title">Avalanche</h3>
            <p className="hav-panel-sub">
              Change one character and watch ≈half of the 256 output bits flip.
            </p>
          </header>

          <label className="ss-field hav-field hav-field--block">
            <span className="hav-lbl">message</span>
            <input
              className="hav-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Message to hash"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <div className="hav-charrow" role="group" aria-label="Character to change">
            <span className="hav-lbl">flip a character</span>
            <div className="hav-chars">
              {Array.from(text).map((ch, i) => (
                <button
                  key={`${i}-${ch}`}
                  type="button"
                  className={cx("hav-charbtn", i === pos && "is-sel")}
                  onClick={() => setFlipPos(i)}
                  aria-pressed={i === pos}
                  aria-label={`Change character ${i + 1}: ${ch === " " ? "space" : ch}`}
                  title={`bump “${ch === " " ? "␣" : ch}” by one`}
                >
                  {ch === " " ? "␣" : ch}
                </button>
              ))}
              {text.length === 0 && <span className="hav-empty">type a message…</span>}
            </div>
          </div>

          <dl className="hav-hashes">
            <div className="hav-hashrow">
              <dt>before</dt>
              <dd className="hav-hash">{beforeHex}</dd>
            </div>
            <div className="hav-hashrow">
              <dt>after</dt>
              <dd className="hav-hash hav-hash--after">{afterHex}</dd>
            </div>
          </dl>

          <div className="hav-mapwrap">
            <AvalancheMap flipped={flipped} pct={pct} count={av.flipped} reduced={reduced} />
            <div className="hav-legend" aria-hidden="true">
              <span className="hav-legkey">
                <span className="hav-swatch hav-swatch--flip" /> flipped
              </span>
              <span className="hav-legkey">
                <span className="hav-swatch hav-swatch--same" /> unchanged
              </span>
            </div>
          </div>

          <p className="hav-metric" aria-live="polite">
            flipped <b>{av.flipped}</b> / 256 <span className="hav-metric-pct">(≈{pct}%)</span>
            <span className="hav-metric-note"> — a good hash targets 50%, so the output looks unrelated to the input.</span>
          </p>
        </section>

        {/* ================= Panel B — Mining toy ================= */}
        <section className="hav-panel" aria-label="Mining toy">
          <header className="hav-panel-head">
            <h3 className="hav-panel-title">Mining toy</h3>
            <p className="hav-panel-sub">
              Proof-of-work: find a nonce whose hash starts with enough zero bits.
            </p>
          </header>

          <div className="hav-minerow">
            <label className="ss-field hav-field">
              <span className="hav-lbl">prefix</span>
              <input
                className="hav-input hav-input--sm"
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                aria-label="Block prefix to mine"
                spellCheck={false}
                autoComplete="off"
              />
            </label>

            <label className="ss-field hav-field hav-field--slider">
              <span className="hav-lbl">
                target · <b>{targetBits}</b> zero-bits
              </span>
              <input
                className="hav-slider"
                type="range"
                min={TARGET_MIN}
                max={TARGET_MAX}
                step={1}
                value={targetBits}
                onChange={(e) => setTargetBits(Number(e.target.value))}
                aria-label="Target leading zero bits"
                aria-valuetext={`${targetBits} leading zero bits`}
              />
            </label>

            <button type="button" className="btn btn-primary hav-mine" onClick={onMine}>
              ⛏ mine
            </button>
          </div>

          <MineReadout result={result} targetBits={targetBits} />

          <p className="hav-note">
            Each extra zero-bit roughly <b>doubles</b> the expected work: target {targetBits} bits ⇒
            ≈2<sup>{targetBits}</sup> = {Math.pow(2, targetBits).toLocaleString()} hashes on average.
            That one-way cost is what secures a blockchain.
          </p>
        </section>
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// The 16×16 avalanche heat-map. Each cell is one output bit; a cell lights when
// that bit differs between the before/after digests. role="img" with a spoken
// summary keeps it accessible when the visual can't be seen.
// ---------------------------------------------------------------------------
function AvalancheMap({
  flipped,
  pct,
  count,
  reduced,
}: {
  flipped: number[];
  pct: number;
  count: number;
  reduced: boolean;
}) {
  const cell = 22;
  const gap = 3;
  const pad = 2;
  const span = GRID * cell + (GRID - 1) * gap + pad * 2;
  const label = `Avalanche map: ${count} of 256 output bits flipped, about ${pct} percent, shown as a 16 by 16 grid where lit cells are bits that changed.`;

  return (
    <svg
      className={cx("hav-map", !reduced && "hav-map--anim")}
      viewBox={`0 0 ${span} ${span}`}
      width="100%"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {flipped.map((f, i) => {
        const row = Math.floor(i / GRID);
        const col = i % GRID;
        return (
          <rect
            key={i}
            className={cx("hav-cell", f === 1 && "is-flip")}
            x={pad + col * (cell + gap)}
            y={pad + row * (cell + gap)}
            width={cell}
            height={cell}
            rx={4}
            style={reduced ? undefined : { animationDelay: `${(row + col) * 12}ms` }}
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Mining result card — winning nonce, tries, and the hash with its leading
// zero *hex digits* highlighted (derived from leadingZeroBits).
// ---------------------------------------------------------------------------
function MineReadout({ result, targetBits }: { result: MineResult | null; targetBits: number }) {
  if (!result) {
    return (
      <div className="hav-mineout hav-mineout--idle" aria-live="polite">
        <span className="hav-mineidle">press mine to search for a qualifying nonce…</span>
      </div>
    );
  }

  if (!result.found) {
    return (
      <div className="hav-mineout hav-mineout--miss" aria-live="polite">
        <span className="hav-minemiss">
          no nonce found within the search budget — target {targetBits} bits is too steep for this toy.
        </span>
      </div>
    );
  }

  const zeroDigits = Math.floor(leadingZeroBits(result.hash) / 4);
  const head = result.hash.slice(0, zeroDigits);
  const tail = result.hash.slice(zeroDigits);

  return (
    <div className="hav-mineout" aria-live="polite">
      <div className="hav-minestats">
        <Stat k="nonce" v={result.nonce.toLocaleString()} />
        <Stat k="tries" v={result.tries.toLocaleString()} />
        <Stat k="zero-bits" v={String(leadingZeroBits(result.hash))} tone="ok" />
      </div>
      <div className="hav-minehash">
        <span className="hav-minehash-lbl">hash</span>
        <code className="hav-hash hav-hash--mine">
          <span className="hav-zeros">{head}</span>
          <span className="hav-rest">{tail}</span>
        </code>
      </div>
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: "ok" }) {
  return (
    <span className={cx("hav-stat", tone === "ok" && "is-ok")}>
      <span className="hav-stat-k">{k}</span>
      <span className="hav-stat-v">{v}</span>
    </span>
  );
}
