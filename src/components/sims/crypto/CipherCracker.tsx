// [micro] cipher-cracker (ch.31) — classical ciphers and the statistics that
// break them. Encrypt with Caesar or Vigenère, then watch the ciphertext's
// letter frequencies (rendered live against the English baseline) and press
// "crack it": Caesar falls to a 25-way χ² search; Vigenère first gives up its
// key length to the index of coincidence, then collapses into one Caesar per
// column. Purely reactive — every verdict comes from classical.ts via useMemo;
// this file only renders it. Prefix: cc-.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import {
  autoCrackVigenere,
  caesarEncrypt,
  crackCaesar,
  ENGLISH_FREQ,
  guessKeyLengths,
  IC_ENGLISH,
  letterFreqs,
  lettersOnly,
  vigenereEncrypt,
} from "./classical.ts";
import type { CaesarGuess, KeyLenGuess, VigenereCrack } from "./classical.ts";
import "../../../theme/_p9css/cipher-cracker.css";

const ACCENT = "#818CF8";

type Mode = "caesar" | "vigenere";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_KEYLEN = 12;

// A paragraph long enough (≫200 letters) that per-column IC is stable and the
// Vigenère auto-crack lands the real key — the whole point of the demo.
const DEMO_TEXT =
  "The index of coincidence measures how often two letters drawn from a text " +
  "happen to match. English prose repeats its common letters, so that chance " +
  "stays well above what a uniformly random string would show. A repeating key " +
  "cipher smears that signal across its period, yet slice the ciphertext into " +
  "columns spaced by the true key length and each column becomes a simple shift " +
  "of ordinary English again, its frequencies restored for anyone patient enough to look.";

export default function CipherCracker() {
  const [mode, setMode] = useState<Mode>("caesar");
  const [plaintext, setPlaintext] = useState(DEMO_TEXT);
  const [caesarKey, setCaesarKey] = useState(3);
  const [vigenereKey, setVigenereKey] = useState("LEMON");

  const ciphertext = useMemo(
    () =>
      mode === "caesar"
        ? caesarEncrypt(plaintext, caesarKey)
        : vigenereEncrypt(plaintext, vigenereKey),
    [mode, plaintext, caesarKey, vigenereKey],
  );

  const freqs = useMemo(() => letterFreqs(ciphertext), [ciphertext]);
  const letterCount = useMemo(() => lettersOnly(ciphertext).length, [ciphertext]);

  // Caesar crack: full 25-shift ranking (index 0 is the best).
  const caesarRanking = useMemo<CaesarGuess[]>(
    () => (mode === "caesar" ? crackCaesar(ciphertext) : []),
    [mode, ciphertext],
  );

  // Vigenère crack: IC-per-length chart + the full auto-crack.
  const keyLens = useMemo<KeyLenGuess[]>(
    () => (mode === "vigenere" ? guessKeyLengths(ciphertext, MAX_KEYLEN) : []),
    [mode, ciphertext],
  );
  const vigCrack = useMemo<VigenereCrack | null>(
    () => (mode === "vigenere" ? autoCrackVigenere(ciphertext, MAX_KEYLEN) : null),
    [mode, ciphertext],
  );
  // The IC peak the crack keys off — the length with the highest coincidence.
  const peakLen = useMemo(
    () =>
      keyLens.reduce(
        (best, g) => (g.ic > best.ic ? g : best),
        keyLens[0] ?? { len: 0, ic: 0 },
      ).len,
    [keyLens],
  );

  const [revealed, setRevealed] = useState(false);

  function onReset(): void {
    setMode("caesar");
    setPlaintext(DEMO_TEXT);
    setCaesarKey(3);
    setVigenereKey("LEMON");
    setRevealed(false);
  }

  function pickMode(m: Mode): void {
    setMode(m);
    setRevealed(false);
  }

  const status =
    `${mode === "caesar" ? "Caesar" : "Vigenère"} · ${letterCount} letters · ` +
    (revealed
      ? mode === "caesar"
        ? `cracked: shift ${caesarRanking[0]?.shift ?? "?"}`
        : `cracked: key "${vigCrack?.key ?? "?"}"`
      : "encrypted — press Crack it");

  return (
    <SimShell
      title="Cipher cracker — how frequency analysis breaks classical ciphers"
      simKey="cipher-cracker"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="cc-ctl">
          <div className="bit-seg" role="group" aria-label="Cipher">
            <button
              type="button"
              className={cx("bit-segbtn", mode === "caesar" && "on")}
              onClick={() => pickMode("caesar")}
              aria-pressed={mode === "caesar"}
            >
              Caesar
            </button>
            <button
              type="button"
              className={cx("bit-segbtn", mode === "vigenere" && "on")}
              onClick={() => pickMode("vigenere")}
              aria-pressed={mode === "vigenere"}
            >
              Vigenère
            </button>
          </div>

          {mode === "caesar" ? (
            <label className="ss-field cc-keyfield">
              <span className="cc-lbl">
                shift · <b>{caesarKey}</b>
              </span>
              <input
                className="cc-slider"
                type="range"
                min={1}
                max={25}
                step={1}
                value={caesarKey}
                onChange={(e) => setCaesarKey(Number(e.target.value))}
                aria-label="Caesar shift key"
                aria-valuetext={`shift ${caesarKey}`}
              />
            </label>
          ) : (
            <label className="ss-field cc-keyfield">
              <span className="cc-lbl">key</span>
              <input
                className="cc-input cc-input--key"
                type="text"
                value={vigenereKey}
                onChange={(e) => setVigenereKey(e.target.value)}
                aria-label="Vigenère key word"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
          )}
        </div>
      }
    >
      <div className="cc-wrap">
        {/* -------------------- plaintext → ciphertext -------------------- */}
        <div className="cc-io">
          <label className="cc-iofield">
            <span className="cc-lbl">plaintext</span>
            <textarea
              className="cc-text"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              rows={3}
              aria-label="Plaintext to encrypt"
              spellCheck={false}
            />
          </label>
          <div className="cc-iofield">
            <span className="cc-lbl">ciphertext</span>
            <output className="cc-text cc-text--out" aria-label="Ciphertext">
              {ciphertext}
            </output>
          </div>
        </div>

        {/* -------------------- live frequency analysis -------------------- */}
        <div className="cc-section">
          <div className="cc-section-head">
            <h3 className="cc-section-title">Frequency analysis</h3>
            <span className="cc-legend" aria-hidden="true">
              <span className="cc-legkey">
                <span className="cc-swatch cc-swatch--obs" /> observed
              </span>
              <span className="cc-legkey">
                <span className="cc-swatch cc-swatch--eng" /> English
              </span>
            </span>
          </div>
          <FreqChart freqs={freqs} mode={mode} />
          <p className="cc-hint">
            {mode === "caesar"
              ? "A Caesar shift just slides the whole distribution — the tell-tale English shape is intact, only rotated."
              : "A Vigenère key flattens the distribution toward random, because each position uses a different shift. Frequency alone no longer names a letter."}
          </p>
        </div>

        {/* -------------------- the crack -------------------- */}
        <div className="cc-section">
          <div className="cc-section-head">
            <h3 className="cc-section-title">Crack it</h3>
            <button
              type="button"
              className={cx("btn", "cc-crack", revealed && "btn-done")}
              onClick={() => setRevealed(true)}
              aria-pressed={revealed}
            >
              {revealed ? "✓ cracked" : "🔓 crack it"}
            </button>
          </div>

          {mode === "caesar" ? (
            <CaesarCrack ranking={caesarRanking} revealed={revealed} />
          ) : (
            <VigenereCrackView
              keyLens={keyLens}
              peakLen={peakLen}
              crack={vigCrack}
              revealed={revealed}
            />
          )}
        </div>
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// 26-bar frequency chart: observed frequencies (--sem-data bars) overlaid with
// the English baseline drawn as a faint marker line per letter.
// ---------------------------------------------------------------------------
function FreqChart({ freqs, mode }: { freqs: number[]; mode: Mode }) {
  const W = 640;
  const H = 190;
  const padL = 26;
  const padR = 10;
  const padT = 10;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const bandW = plotW / 26;
  const barW = bandW * 0.62;

  const maxObs = Math.max(...freqs, 0);
  const maxEng = Math.max(...ENGLISH_FREQ);
  const yMax = Math.max(maxObs, maxEng, 0.13) * 1.08;
  const yOf = (v: number): number => padT + plotH - (v / yMax) * plotH;
  const xOf = (i: number): number => padL + i * bandW;

  const topObs = freqs.reduce((mi, v, i) => (v > freqs[mi] ? i : mi), 0);
  const summary =
    `Bar chart of letter frequencies A to Z in the ciphertext (${mode === "caesar" ? "Caesar" : "Vigenère"}), ` +
    `overlaid with the English baseline. The most common ciphertext letter is ${ALPHABET[topObs]}.`;

  // gridlines at a few frequency levels
  const grid = [0.04, 0.08, 0.12].filter((g) => g < yMax);

  return (
    <svg
      className="cc-chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={summary}
      preserveAspectRatio="xMidYMid meet"
    >
      {grid.map((g) => (
        <g key={g} className="cc-grid">
          <line x1={padL} y1={yOf(g)} x2={W - padR} y2={yOf(g)} />
          <text x={padL - 4} y={yOf(g) + 3} textAnchor="end" className="cc-grid-lbl">
            {Math.round(g * 100)}
          </text>
        </g>
      ))}

      {/* observed bars */}
      {freqs.map((v, i) => (
        <rect
          key={`bar-${i}`}
          className={cx("cc-bar", i === topObs && v > 0 && "is-top")}
          x={xOf(i) + (bandW - barW) / 2}
          y={yOf(v)}
          width={barW}
          height={Math.max(0, padT + plotH - yOf(v))}
          rx={1.5}
        />
      ))}

      {/* English baseline markers — a faint tick per letter */}
      {ENGLISH_FREQ.map((v, i) => (
        <line
          key={`eng-${i}`}
          className="cc-engmark"
          x1={xOf(i) + (bandW - barW) / 2 - 1}
          y1={yOf(v)}
          x2={xOf(i) + (bandW - barW) / 2 + barW + 1}
          y2={yOf(v)}
        />
      ))}

      {/* axis labels */}
      {ALPHABET.split("").map((ch, i) => (
        <text
          key={`x-${ch}`}
          className={cx("cc-xlbl", i === topObs && "is-top")}
          x={xOf(i) + bandW / 2}
          y={H - padB + 16}
          textAnchor="middle"
        >
          {ch}
        </text>
      ))}
      <line className="cc-axis" x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} />
      <text className="cc-ylbl" x={padL - 4} y={padT - 1} textAnchor="end">
        %
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Caesar crack: the χ² ranking. Show the best guess prominently, then the next
// few contenders so the χ² gap is visible.
// ---------------------------------------------------------------------------
function CaesarCrack({ ranking, revealed }: { ranking: CaesarGuess[]; revealed: boolean }) {
  if (!revealed) {
    return (
      <p className="cc-idle">
        Trying all 25 shifts and scoring each against English (χ²) — press
        <b> crack it</b> to reveal the ranking.
      </p>
    );
  }
  const best = ranking[0];
  const rest = ranking.slice(1, 5);
  if (!best) return <p className="cc-idle">Nothing to crack yet.</p>;

  return (
    <div className="cc-caesar">
      <div className="cc-best">
        <div className="cc-best-head">
          <span className="cc-best-tag">best fit</span>
          <span className="cc-best-shift">shift {best.shift}</span>
          <span className="cc-best-chi">χ² {best.chi.toFixed(1)}</span>
        </div>
        <p className="cc-best-plain">{best.plaintext}</p>
      </div>

      <ol className="cc-rank" aria-label="Runner-up shifts by chi-squared">
        {rest.map((g) => (
          <li key={g.shift} className="cc-rankrow">
            <span className="cc-rank-shift">shift {g.shift}</span>
            <span className="cc-rank-chi">χ² {g.chi.toFixed(0)}</span>
            <span className="cc-rank-snip">{g.plaintext.slice(0, 40)}…</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vigenère crack: the IC-per-key-length bar chart (peak highlighted against the
// IC_ENGLISH line), then the recovered key + plaintext from autoCrackVigenere.
// ---------------------------------------------------------------------------
function VigenereCrackView({
  keyLens,
  peakLen,
  crack,
  revealed,
}: {
  keyLens: KeyLenGuess[];
  peakLen: number;
  crack: VigenereCrack | null;
  revealed: boolean;
}) {
  if (!revealed) {
    return (
      <p className="cc-idle">
        First recover the key length via the index of coincidence, then break
        each column as a Caesar — press <b>crack it</b>.
      </p>
    );
  }

  return (
    <div className="cc-vig">
      <div className="cc-icchart-wrap">
        <span className="cc-lbl">index of coincidence, by candidate key length</span>
        <ICChart keyLens={keyLens} peakLen={peakLen} />
        <p className="cc-hint">
          The true key length (and its multiples) makes every column a single
          shift of English, so its IC climbs toward{" "}
          <b>{IC_ENGLISH.toFixed(4)}</b>; wrong lengths sit near random (0.0385).
          The peak is length <b>{peakLen}</b>.
        </p>
      </div>

      {crack && (
        <div className="cc-recovered">
          <div className="cc-rechead">
            <span className="cc-rec-tag">recovered key</span>
            <code className="cc-reckey">{crack.key}</code>
            <span className="cc-reclen">length {crack.keyLen}</span>
          </div>
          <p className="cc-best-plain">{crack.plaintext}</p>
        </div>
      )}
    </div>
  );
}

// IC-per-length bar chart. The peak bar is tinted with --sem-ok, and a dashed
// line marks IC_ENGLISH so the reader sees which lengths "look English".
function ICChart({ keyLens, peakLen }: { keyLens: KeyLenGuess[]; peakLen: number }) {
  const W = 640;
  const H = 150;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = Math.max(1, keyLens.length);
  const bandW = plotW / n;
  const barW = bandW * 0.6;

  const yMax = Math.max(IC_ENGLISH, ...keyLens.map((g) => g.ic), 0.07) * 1.12;
  const yOf = (v: number): number => padT + plotH - (v / yMax) * plotH;
  const engY = yOf(IC_ENGLISH);

  const summary =
    `Bar chart of index of coincidence for candidate key lengths 1 to ${keyLens.length}. ` +
    `The peak is at length ${peakLen}, near the English value ${IC_ENGLISH}. ` +
    `A dashed line marks the English index of coincidence.`;

  return (
    <svg
      className="cc-icchart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={summary}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* English IC reference line */}
      <line className="cc-icref" x1={padL} y1={engY} x2={W - padR} y2={engY} />
      <text className="cc-icref-lbl" x={W - padR} y={engY - 4} textAnchor="end">
        English IC {IC_ENGLISH}
      </text>

      {keyLens.map((g, i) => {
        const isPeak = g.len === peakLen;
        const x = padL + i * bandW + (bandW - barW) / 2;
        return (
          <g key={g.len}>
            <rect
              className={cx("cc-icbar", isPeak && "is-peak")}
              x={x}
              y={yOf(g.ic)}
              width={barW}
              height={Math.max(0, padT + plotH - yOf(g.ic))}
              rx={2}
            />
            <text className={cx("cc-iclbl", isPeak && "is-peak")} x={x + barW / 2} y={H - padB + 15} textAnchor="middle">
              {g.len}
            </text>
          </g>
        );
      })}

      <line className="cc-axis" x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} />
      <text className="cc-ylbl" x={padL - 4} y={padT + 4} textAnchor="end">
        IC
      </text>
    </svg>
  );
}
