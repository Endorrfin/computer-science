// [HERO] dh-color-lab (ch.31) — Diffie–Hellman felt three ways, plus the P9 boss.
// A 🎨 Paint · 🔢 Numbers · 🗝️ Boss segmented toggle picks the lens; every value
// comes verbatim from ./dh.ts and ./classical.ts — nothing is re-derived here.
//   PAINT   — mixing is easy, un-mixing is "hard". paintExchange(base,a,b) drives
//             the swatch flow: base → +secret → public (sent), then the cross-mix
//             lands both sides on the SAME shared colour (mixEqual / agree). An
//             "Eve sees" strip locks the shared swatch behind a "?": she saw the
//             three public mixes but cannot un-stir them.
//   NUMBERS — the real thing. numberExchange(p,g,a,b) → A=gᵃ, B=gᵇ, shared=g^(ab)
//             mod p. A "show the math" transport steps modPowTrace(g,a,p) g¹…gᵃ;
//             "Eve brute-forces" runs discreteLog(g,A,p) — she recovers a at p=23,
//             which is exactly why real primes are 2048-bit.
//   BOSS    — "Codebreaker" 🗝️, two stages. (1) Break a Vigenère ciphertext:
//             guessKeyLengths → IC bars, crackVigenereWithLen at the chosen length,
//             validated against autoCrackVigenere (key "CODE"). (2) DH by hand:
//             compute Bᵃ mod p and enter it, validated with modPow(19,6,23)=2.
//             Both solved → markChallengeDone("boss-p9"); badge 🗝️ Codebreaker
//             persists via useChallengesDone().
// One SimShell; its transport only appears for the Numbers "show the math" trace
// (the sole time axis). Reduced motion → the trace parks at its final frame and
// swatches stop transitioning. Prefix: dh-.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, clamp, useReducedMotion } from "../../../lib/utils.ts";
import {
  paintExchange,
  toRgb,
  rgbToCss,
  numberExchange,
  modPow,
  modPowTrace,
  discreteLog,
  DEFAULT_NUMBER,
} from "./dh.ts";
import type { Mix, DhNumber } from "./dh.ts";
import {
  vigenereEncrypt,
  vigenereDecrypt,
  guessKeyLengths,
  crackVigenereWithLen,
  autoCrackVigenere,
  lettersOnly,
} from "./classical.ts";
import "../../../theme/_p9css/dh-color-lab.css";

const ACCENT = "#818CF8"; // P9 accent

type Mode = "paint" | "numbers" | "boss";

const MODES: readonly { id: Mode; label: string }[] = [
  { id: "paint", label: "🎨 Paint" },
  { id: "numbers", label: "🔢 Numbers" },
  { id: "boss", label: "🗝️ Boss" },
];

// The three physical tints the paint vectors map to, named for the UI.
const TINT_NAMES = ["yellow", "cyan", "magenta"] as const;

// A curated palette of public "base" mixes the learner can pick from.
const BASE_CHOICES: readonly { id: string; mix: Mix }[] = [
  { id: "sand", mix: [2, 1, 0] },
  { id: "teal", mix: [1, 2, 0] },
  { id: "plum", mix: [1, 0, 2] },
  { id: "ash", mix: [1, 1, 1] },
];

// The boss's Vigenère challenge — encrypted once, at module scope, with key "CODE".
const PLAINTEXT =
  "It was the best of times, it was the worst of times, it was the age of wisdom, " +
  "it was the age of foolishness, it was the epoch of belief, it was the epoch of " +
  "incredulity, it was the season of Light, it was the season of Darkness, it was " +
  "the spring of hope, it was the winter of despair, we had everything before us, " +
  "we had nothing before us.";
const BOSS_CIPHERTEXT = vigenereEncrypt(PLAINTEXT, "CODE");
const BOSS_SOLUTION = autoCrackVigenere(BOSS_CIPHERTEXT); // { key: "CODE", plaintext, keyLen }
const BOSS_MAX_KEYLEN = 12;

// Boss stage 2 — DH by hand.
const BOSS_DH = { p: 23, g: 5, a: 6, B: 19 } as const;
const BOSS_DH_SHARED = modPow(BOSS_DH.B, BOSS_DH.a, BOSS_DH.p); // = 2

export default function DhColorLab() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const bossWon = done.has("boss-p9");

  const [mode, setMode] = useState<Mode>("paint");

  // ---- PAINT state: a public base + each party's private tint index ----
  const [baseId, setBaseId] = useState<string>(BASE_CHOICES[0].id);
  const [tintA, setTintA] = useState(1); // Alice's private tint (0..2)
  const [tintB, setTintB] = useState(2); // Bob's private tint (0..2)

  // ---- NUMBERS state ----
  const [p, setP] = useState<number>(DEFAULT_NUMBER.p);
  const [g, setG] = useState<number>(DEFAULT_NUMBER.g);
  const [a, setA] = useState<number>(DEFAULT_NUMBER.a);
  const [b, setB] = useState<number>(DEFAULT_NUMBER.b);
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);
  const [traceStep, setTraceStep] = useState(0); // reveal cursor over modPowTrace(g,a,p)
  const [eveGuess, setEveGuess] = useState<number | null | undefined>(undefined); // undefined = not run

  const num: DhNumber = useMemo(() => numberExchange(p, g, a, b), [p, g, a, b]);
  const trace = useMemo(() => modPowTrace(g, a, p), [g, a, p]);
  const maxTrace = trace.length;

  // Any number-mode change re-parks the trace at its final frame (rest = solved),
  // clears Eve's stale answer, and stops the clock. Not on first mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) return;
    setRunning(false);
    setTraceStep(maxTrace);
    setEveGuess(undefined);
  }, [p, g, a, b, maxTrace]);
  useEffect(() => {
    mounted.current = true;
    setTraceStep(modPowTrace(DEFAULT_NUMBER.g, DEFAULT_NUMBER.a, DEFAULT_NUMBER.p).length);
  }, []);
  // Leaving Numbers always parks the transport.
  useEffect(() => {
    setRunning(false);
  }, [mode]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    setTraceStep((x) => {
      if (x >= maxTrace) {
        setRunning(false);
        return x;
      }
      return x + 1;
    });
  };
  useSimClock(running, 1.6 * speed, () => advanceRef.current());

  function traceStepFwd(): void {
    setRunning(false);
    setTraceStep((x) => Math.min(maxTrace, x + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setTraceStep((x) => (x >= maxTrace ? 0 : x)); // replay from the top if finished
    setRunning(true);
  }
  function onReset(): void {
    setRunning(false);
    if (mode === "numbers") {
      setP(DEFAULT_NUMBER.p);
      setG(DEFAULT_NUMBER.g);
      setA(DEFAULT_NUMBER.a);
      setB(DEFAULT_NUMBER.b);
      setEveGuess(undefined);
      setTraceStep(modPowTrace(DEFAULT_NUMBER.g, DEFAULT_NUMBER.a, DEFAULT_NUMBER.p).length);
    } else if (mode === "paint") {
      setBaseId(BASE_CHOICES[0].id);
      setTintA(1);
      setTintB(2);
    }
  }

  const base = useMemo(
    () => BASE_CHOICES.find((c) => c.id === baseId)?.mix ?? BASE_CHOICES[0].mix,
    [baseId],
  );
  const secretA = useMemo<Mix>(() => unit(tintA), [tintA]);
  const secretB = useMemo<Mix>(() => unit(tintB), [tintB]);
  const paint = useMemo(() => paintExchange(base, secretA, secretB), [base, secretA, secretB]);

  const status = useMemo(() => {
    if (mode === "boss") return "Codebreaker — break the Vigenère cipher, then finish a DH exchange by hand";
    if (mode === "paint") {
      return (
        `paint · base ${TINT_NAMES[tintFromUnit(base)] ?? "mix"} + Alice ${TINT_NAMES[tintA]} + Bob ${TINT_NAMES[tintB]} ` +
        `→ shared reached on both sides (${paint.agree ? "agree" : "diverge"})`
      );
    }
    const revealed = traceStep >= maxTrace;
    return (
      `numbers · p=${num.p} g=${num.g} · A=g^${num.a}=${num.A} · B=g^${num.b}=${num.B} · ` +
      `shared=B^a=A^b=${num.shared} (${num.agree ? "agree" : "diverge"})` +
      (revealed ? "" : ` · g^${traceStep} step`)
    );
  }, [mode, base, tintA, tintB, paint.agree, num, traceStep, maxTrace]);

  return (
    <SimShell
      title="Diffie–Hellman — a shared secret, felt three ways"
      simKey="dh-color-lab"
      kind="hero"
      accent={ACCENT}
      transport={mode === "numbers" ? { running, onToggle, onStep: traceStepFwd, speed, onSpeed: setSpeed } : undefined}
      onReset={onReset}
      status={status}
      controls={
        <div className="dh-ctl">
          <div className="bit-seg dh-seg" role="group" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={cx("bit-segbtn", mode === m.id && "on")}
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "paint" && (
            <PaintControls
              baseId={baseId}
              onBase={setBaseId}
              tintA={tintA}
              onTintA={setTintA}
              tintB={tintB}
              onTintB={setTintB}
            />
          )}

          {mode === "numbers" && (
            <NumberControls
              p={p}
              g={g}
              a={a}
              b={b}
              onP={setP}
              onG={setG}
              onA={setA}
              onB={setB}
            />
          )}
        </div>
      }
      footer={
        mode === "boss" ? (
          <BossPanel bossWon={bossWon} />
        ) : mode === "paint" ? (
          <PaintFoot paint={paint} />
        ) : (
          <NumberFoot num={num} eveGuess={eveGuess} onEve={() => setEveGuess(discreteLog(num.g, num.A, num.p))} />
        )
      }
    >
      {mode === "boss" ? (
        <BossStage bossWon={bossWon} />
      ) : mode === "paint" ? (
        <Paint paint={paint} tintA={tintA} tintB={tintB} reduced={reduced} />
      ) : (
        <Numbers num={num} trace={trace} step={Math.min(traceStep, maxTrace)} reduced={reduced} />
      )}
    </SimShell>
  );
}

/** A one-hot mix over the three tints (one "unit" of tint i). */
function unit(i: number): Mix {
  return [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];
}
/** Index of the single non-zero tint in a one-hot mix, else the largest. */
function tintFromUnit(m: Mix): number {
  let best = 0;
  for (let i = 1; i < 3; i++) if (m[i] > m[best]) best = i;
  return best;
}

// ===========================================================================
// PAINT — the metaphor
// ===========================================================================
function PaintControls({
  baseId,
  onBase,
  tintA,
  onTintA,
  tintB,
  onTintB,
}: {
  baseId: string;
  onBase: (id: string) => void;
  tintA: number;
  onTintA: (i: number) => void;
  tintB: number;
  onTintB: (i: number) => void;
}) {
  return (
    <>
      <label className="ss-field dh-field">
        base
        <span className="dh-swatchseg" role="group" aria-label="Public base colour">
          {BASE_CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cx("dh-swatchbtn", baseId === c.id && "on")}
              onClick={() => onBase(c.id)}
              aria-pressed={baseId === c.id}
              title={`public base · ${c.id}`}
              aria-label={`Base ${c.id}`}
            >
              <span className="dh-swatchdot" style={{ background: rgbToCss(toRgb(c.mix)) }} aria-hidden="true" />
            </button>
          ))}
        </span>
      </label>
      <TintPicker label="Alice tint" who="A" value={tintA} onChange={onTintA} />
      <TintPicker label="Bob tint" who="B" value={tintB} onChange={onTintB} />
    </>
  );
}

function TintPicker({ label, who, value, onChange }: { label: string; who: "A" | "B"; value: number; onChange: (i: number) => void }) {
  return (
    <label className="ss-field dh-field">
      {who === "A" ? "Alice" : "Bob"}
      <span className={cx("dh-swatchseg", who === "A" ? "is-a" : "is-b")} role="group" aria-label={label}>
        {TINT_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            className={cx("dh-swatchbtn", value === i && "on")}
            onClick={() => onChange(i)}
            aria-pressed={value === i}
            title={`${who === "A" ? "Alice" : "Bob"} secret · ${name}`}
            aria-label={`${label}: ${name}`}
          >
            <span className="dh-swatchdot" style={{ background: rgbToCss(toRgb(unit(i))) }} aria-hidden="true" />
          </button>
        ))}
      </span>
    </label>
  );
}

function Swatch({
  mix,
  label,
  sub,
  size = 64,
  locked = false,
  tone,
  reduced,
}: {
  mix: Mix;
  label: string;
  sub?: string;
  size?: number;
  locked?: boolean;
  tone?: "a" | "b" | "shared" | "base";
  reduced?: boolean;
}) {
  const css = rgbToCss(toRgb(mix));
  return (
    <figure className={cx("dh-swatch", tone && `is-${tone}`, locked && "is-locked", !reduced && "dh-anim")}>
      <span
        className="dh-chip"
        style={{ background: locked ? undefined : css, width: size, height: size }}
        role="img"
        aria-label={locked ? `${label}: hidden` : `${label}: colour ${css}`}
      >
        {locked && <span className="dh-lock" aria-hidden="true">?</span>}
      </span>
      <figcaption className="dh-swatch-cap">
        <span className="dh-swatch-label">{label}</span>
        {sub && <span className="dh-swatch-sub">{sub}</span>}
      </figcaption>
    </figure>
  );
}

function Paint({ paint, tintA, tintB, reduced }: { paint: ReturnType<typeof paintExchange>; tintA: number; tintB: number; reduced: boolean }) {
  const secretName = (i: number) => TINT_NAMES[i];
  return (
    <div className="dh-stage">
      <div className="dh-lanes">
        {/* Alice's lane */}
        <PaintLane
          who="Alice"
          tone="a"
          base={paint.base}
          secretName={secretName(tintA)}
          pub={paint.publicA}
          shared={paint.sharedFromA}
          otherPub={paint.publicB}
          reduced={reduced}
        />
        {/* Bob's lane */}
        <PaintLane
          who="Bob"
          tone="b"
          base={paint.base}
          secretName={secretName(tintB)}
          pub={paint.publicB}
          shared={paint.sharedFromB}
          otherPub={paint.publicA}
          reduced={reduced}
        />
      </div>

      {/* the meeting point */}
      <div className={cx("dh-agree", paint.agree ? "is-ok" : "is-bad")}>
        <Swatch mix={paint.shared} label="shared secret" sub="base + Alice + Bob" size={72} tone="shared" reduced={reduced} />
        <p className="dh-agree-note">
          {paint.agree ? (
            <>
              <b>Both mixers landed on the same colour.</b> Alice stirred her secret into Bob&apos;s public mix; Bob stirred his into
              Alice&apos;s. Mixing is commutative, so <code>publicB + secretA = publicA + secretB</code> — the identical shared paint,
              never sent on the wire.
            </>
          ) : (
            <>These two mixes disagree — pick tints that combine cleanly and both sides will meet.</>
          )}
        </p>
      </div>

      {/* Eve's view */}
      <div className="dh-eve" role="group" aria-label="What Eve the eavesdropper sees">
        <div className="dh-eve-head">
          <span className="dh-eve-face" aria-hidden="true">👁️</span>
          <span className="dh-eve-title">Eve sees only the public mixes</span>
        </div>
        <div className="dh-eve-strip">
          <Swatch mix={paint.base} label="base" sub="public" size={44} tone="base" reduced={reduced} />
          <span className="dh-eve-plus" aria-hidden="true">·</span>
          <Swatch mix={paint.publicA} label="Alice → Bob" sub="sent" size={44} tone="a" reduced={reduced} />
          <span className="dh-eve-plus" aria-hidden="true">·</span>
          <Swatch mix={paint.publicB} label="Bob → Alice" sub="sent" size={44} tone="b" reduced={reduced} />
          <span className="dh-eve-arrow" aria-hidden="true">→</span>
          <Swatch mix={paint.shared} label="shared" sub="can't un-mix" size={44} locked tone="shared" reduced={reduced} />
        </div>
      </div>
    </div>
  );
}

function PaintLane({
  who,
  tone,
  base,
  secretName,
  pub,
  shared,
  otherPub,
  reduced,
}: {
  who: string;
  tone: "a" | "b";
  base: Mix;
  secretName: string;
  pub: Mix;
  shared: Mix;
  otherPub: Mix;
  reduced: boolean;
}) {
  return (
    <div className={cx("dh-lane", `is-${tone}`)}>
      <div className="dh-lane-head">
        <span className="dh-lane-who">{who}</span>
        <span className="dh-lane-tag">secret tint · {secretName}</span>
      </div>
      <div className="dh-flow" role="list" aria-label={`${who}'s mixing steps`}>
        <Swatch mix={base} label="base" sub="public" size={54} tone="base" reduced={reduced} />
        <Op sign="+" note={`secret ${secretName}`} tone={tone} />
        <Swatch mix={pub} label={`public ${who[0]}`} sub="sent →" size={54} tone={tone} reduced={reduced} />
        <Op sign="+" note={`+ ${who === "Alice" ? "Bob" : "Alice"}'s public`} tone={tone} otherMix={otherPub} />
        <Swatch mix={shared} label="shared" sub="private" size={54} tone="shared" reduced={reduced} />
      </div>
    </div>
  );
}

function Op({ sign, note, tone, otherMix }: { sign: string; note: string; tone: "a" | "b"; otherMix?: Mix }) {
  return (
    <span className={cx("dh-op", `is-${tone}`)} aria-hidden="true">
      <span className="dh-op-sign">{sign}</span>
      {otherMix ? (
        <span className="dh-op-chip" style={{ background: rgbToCss(toRgb(otherMix)) }} />
      ) : (
        <span className="dh-op-note">{note}</span>
      )}
    </span>
  );
}

function PaintFoot({ paint }: { paint: ReturnType<typeof paintExchange> }) {
  return (
    <div className="dh-foot">
      <p className="dh-explain">
        <b>Easy to mix, hard to un-mix.</b> Both sides begin from the same public <em>base</em>, each stirs in one private tint,
        and they swap the results in the open. Then each stirs their <em>own</em> secret into the other&apos;s mix. Because paint
        mixing is commutative and associative, both jars end identical — while Eve, holding only <code>base</code>,{" "}
        <code>publicA</code> and <code>publicB</code>, has no way to separate a mixture back into its ingredients.
      </p>
      <div className="dh-keyrow" aria-hidden="true">
        <KeyChip tone="base" k="base" v="public start" />
        <KeyChip tone="a" k="publicA" v="base + Alice" />
        <KeyChip tone="b" k="publicB" v="base + Bob" />
        <KeyChip tone="shared" k="shared" v="base + Alice + Bob" strong={paint.agree} />
      </div>
    </div>
  );
}

// ===========================================================================
// NUMBERS — the real thing
// ===========================================================================
function NumberControls({
  p,
  g,
  a,
  b,
  onP,
  onG,
  onA,
  onB,
}: {
  p: number;
  g: number;
  a: number;
  b: number;
  onP: (v: number) => void;
  onG: (v: number) => void;
  onA: (v: number) => void;
  onB: (v: number) => void;
}) {
  return (
    <>
      <NumField label="prime p" value={p} min={5} max={97} onChange={onP} accentClass="is-p" />
      <NumField label="generator g" value={g} min={2} max={Math.max(2, p - 1)} onChange={onG} accentClass="is-g" />
      <NumField label="Alice a" value={a} min={1} max={Math.max(1, p - 1)} onChange={onA} accentClass="is-a" />
      <NumField label="Bob b" value={b} min={1} max={Math.max(1, p - 1)} onChange={onB} accentClass="is-b" />
    </>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onChange,
  accentClass,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accentClass: string;
}) {
  return (
    <label className={cx("ss-field dh-numfield", accentClass)}>
      {label}
      <span className="dh-stepper">
        <button
          type="button"
          className="dh-step"
          onClick={() => onChange(clamp(value - 1, min, max))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          className="dh-numinput"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(clamp(Math.round(v), min, max));
          }}
          aria-label={label}
        />
        <button
          type="button"
          className="dh-step"
          onClick={() => onChange(clamp(value + 1, min, max))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </span>
    </label>
  );
}

function Numbers({ num, trace, step, reduced }: { num: DhNumber; trace: ReturnType<typeof modPowTrace>; step: number; reduced: boolean }) {
  const W = 640;
  const H = 214;
  const midY = H / 2;
  const xL = 116;
  const xR = W - 116;
  const summary =
    `Diffie–Hellman over p=${num.p}, g=${num.g}. Alice sends A=g^${num.a}=${num.A}; Bob sends B=g^${num.b}=${num.B}; ` +
    `both compute the shared secret ${num.shared}.`;

  return (
    <div className="dh-stage">
      <svg className={cx("dh-num-svg", !reduced && "dh-anim")} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary}>
        <defs>
          <marker id="dhArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* party headers */}
        <g className="dh-party is-a">
          <rect x={xL - 60} y={12} width={120} height={30} rx={7} />
          <text x={xL} y={32} textAnchor="middle" className="dh-party-t">Alice</text>
        </g>
        <g className="dh-party is-b">
          <rect x={xR - 60} y={12} width={120} height={30} rx={7} />
          <text x={xR} y={32} textAnchor="middle" className="dh-party-t">Bob</text>
        </g>

        {/* private secrets, pinned under each header */}
        <text x={xL} y={64} textAnchor="middle" className="dh-secret is-a">secret a = {num.a}</text>
        <text x={xR} y={64} textAnchor="middle" className="dh-secret is-b">secret b = {num.b}</text>

        {/* public sends across the wire */}
        <g className="dh-wire">
          <line x1={xL + 30} y1={midY - 20} x2={xR - 40} y2={midY - 20} className="dh-wire-line is-a" markerEnd="url(#dhArrow)" />
          <text x={(xL + xR) / 2} y={midY - 26} textAnchor="middle" className="dh-wire-lbl is-a">A = g^{num.a} mod {num.p} = {num.A}</text>

          <line x1={xR - 30} y1={midY + 20} x2={xL + 40} y2={midY + 20} className="dh-wire-line is-b" markerEnd="url(#dhArrow)" />
          <text x={(xL + xR) / 2} y={midY + 36} textAnchor="middle" className="dh-wire-lbl is-b">B = g^{num.b} mod {num.p} = {num.B}</text>
        </g>

        {/* each side's local compute → the shared value */}
        <text x={xL} y={H - 40} textAnchor="middle" className="dh-compute is-a">B^a mod {num.p}</text>
        <text x={xR} y={H - 40} textAnchor="middle" className="dh-compute is-b">A^b mod {num.p}</text>

        {/* the shared secret capsule */}
        <g className={cx("dh-shared", num.agree && "is-agree")}>
          <rect x={W / 2 - 74} y={H - 34} width={148} height={26} rx={13} />
          <text x={W / 2} y={H - 16} textAnchor="middle" className="dh-shared-t">
            shared = {num.shared}
          </text>
        </g>
      </svg>

      {/* the "show the math" trace: g¹ … gᵃ mod p */}
      <div className="dh-tracebox">
        <div className="dh-trace-head">
          <span className="dh-trace-title">show the math · <code>A = g^a mod p</code> by repeated multiply</span>
          <span className="dh-trace-prog">{Math.min(step, trace.length)}/{trace.length}</span>
        </div>
        <ol className="dh-trace" aria-label="Modular exponentiation trace, g^1 to g^a mod p">
          {trace.map((s, i) => {
            const on = i < step;
            const isLatest = i === step - 1;
            return (
              <li key={s.k} className={cx("dh-trace-row", on && "on", isLatest && !reduced && "latest")}>
                <code className="dh-trace-k">g^{s.k}</code>
                <span className="dh-trace-eq" aria-hidden="true">≡</span>
                <code className="dh-trace-acc">{on ? s.acc : "·"}</code>
                <span className="dh-trace-mod">mod {num.p}</span>
              </li>
            );
          })}
        </ol>
        {step >= trace.length && (
          <p className="dh-trace-done" role="status">
            g^{num.a} mod {num.p} = <b>{num.A}</b> — the same public value Alice puts on the wire.
          </p>
        )}
      </div>
    </div>
  );
}

function NumberFoot({ num, eveGuess, onEve }: { num: DhNumber; eveGuess: number | null | undefined; onEve: () => void }) {
  const ran = eveGuess !== undefined;
  const recovered = eveGuess !== null && eveGuess !== undefined;
  return (
    <div className="dh-foot">
      <p className="dh-explain">
        <b>The shared secret is never transmitted.</b> Alice broadcasts <code>A = g^a mod p</code>; Bob broadcasts{" "}
        <code>B = g^b mod p</code>. Alice computes <code>B^a</code>, Bob computes <code>A^b</code>, and both equal{" "}
        <code>g^(ab) mod p = {num.shared}</code>. Recovering <code>a</code> from <code>A</code> is the{" "}
        <em>discrete-logarithm problem</em> — trivial at p={num.p}, believed infeasible for the 2048-bit primes used in practice.
      </p>
      <div className="dh-vals" role="group" aria-label="Exchange values">
        <Val k="A = g^a" v={num.A} tone="a" />
        <Val k="B = g^b" v={num.B} tone="b" />
        <Val k="B^a mod p" v={num.sharedFromA} tone="shared" />
        <Val k="A^b mod p" v={num.sharedFromB} tone="shared" />
        <Val k="shared" v={num.shared} tone={num.agree ? "ok" : "err"} strong />
      </div>
      <div className="dh-eve-attack">
        <button type="button" className="btn" onClick={onEve} aria-label="Eve brute-forces the discrete log">
          👁️ Eve brute-forces a
        </button>
        {ran &&
          (recovered ? (
            <span className="dh-eve-result is-broken" role="status">
              cracked — <code>discreteLog(g, A, p)</code> found <b>a = {eveGuess}</b> after up to {num.p} tries. An O(p) search is
              cheap here; a real prime makes it hopeless.
            </span>
          ) : (
            <span className="dh-eve-result is-safe" role="status">
              no exponent recovers A for this g — pick a generator that spans the group.
            </span>
          ))}
      </div>
    </div>
  );
}

// ===========================================================================
// BOSS — "Codebreaker": break Vigenère, then finish a DH exchange by hand
// ===========================================================================
function BossStage({ bossWon }: { bossWon: boolean }) {
  return (
    <div className="dh-boss-stage" aria-hidden="true">
      <div className="dh-boss-hero">
        <span className="dh-boss-key">🗝️</span>
        <div>
          <div className="dh-boss-name">Codebreaker</div>
          <div className="dh-boss-tag">break the cipher · finish the exchange {bossWon && "· ✓ earned"}</div>
        </div>
      </div>
      <p className="dh-boss-lead">
        Two stages stand between you and the badge. First, break a <b>Vigenère</b> ciphertext with nothing but the statistics of
        English. Then step into an exchange and compute the <b>Diffie–Hellman</b> shared secret <em>by hand</em>.
      </p>
    </div>
  );
}

function BossPanel({ bossWon }: { bossWon: boolean }) {
  const [s1Done, setS1Done] = useState(false);
  const [s2Done, setS2Done] = useState(false);

  // Fire the badge exactly once, when both stages are solved (or already were).
  useEffect(() => {
    if (s1Done && s2Done) markChallengeDone("boss-p9");
  }, [s1Done, s2Done]);

  const won = bossWon || (s1Done && s2Done);
  const solvedCount = (s1Done ? 1 : 0) + (s2Done ? 1 : 0);

  const solveS1 = useCallback(() => setS1Done(true), []);
  const solveS2 = useCallback(() => setS2Done(true), []);

  return (
    <div className={cx("dh-boss", won && "dh-boss--won")}>
      <div className="dh-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Codebreaker</strong>
        <span className="dh-muted">badge: 🗝️ Codebreaker {bossWon && "✓ earned"}</span>
        <span className="dh-boss-progress" aria-hidden="true">{solvedCount}/2 stages</span>
      </div>

      <VigenereStage solved={s1Done || bossWon} onSolve={solveS1} />
      <DhByHandStage solved={s2Done || bossWon} onSolve={solveS2} />

      {won ? (
        <div className="dh-boss-badge" role="status">
          <span aria-hidden="true">🗝️</span> <b>Codebreaker earned</b> — you broke a cipher with frequency alone and derived a
          shared key by hand. Both halves of the security story, done.
        </div>
      ) : (
        <p className="dh-verdict" role="status">
          {solvedCount === 0
            ? "Solve both stages to earn the badge."
            : "One stage down — finish the other to earn 🗝️ Codebreaker."}
        </p>
      )}
    </div>
  );
}

// ---- Boss stage 1: break Vigenère ----
function VigenereStage({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [guessedLens, setGuessedLens] = useState(false);
  const [chosenLen, setChosenLen] = useState<number | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [checked, setChecked] = useState(false);

  const lenGuesses = useMemo(() => guessKeyLengths(BOSS_CIPHERTEXT, BOSS_MAX_KEYLEN), []);
  const maxIc = useMemo(() => Math.max(...lenGuesses.map((l) => l.ic)), [lenGuesses]);
  const bestLen = lenGuesses[0].len; // the collapsed minimal period (= 4)

  // Cracking at the chosen length yields a candidate key + plaintext.
  const crack = useMemo(
    () => (chosenLen ? crackVigenereWithLen(BOSS_CIPHERTEXT, chosenLen) : null),
    [chosenLen],
  );

  const normKey = lettersOnly(keyInput);
  const target = lettersOnly(BOSS_SOLUTION.key); // "CODE"
  const keyRight = normKey === target;
  // Reveal the recovered plaintext live once the player has the right key.
  const preview = normKey.length > 0 ? vigenereDecrypt(BOSS_CIPHERTEXT, normKey) : "";

  useEffect(() => {
    if (keyRight && !solved) onSolve();
  }, [keyRight, solved, onSolve]);

  function recoverWithLen(): void {
    if (!chosenLen) return;
    const c = crackVigenereWithLen(BOSS_CIPHERTEXT, chosenLen);
    setKeyInput(c.key);
    setChecked(true);
  }

  return (
    <section className={cx("dh-stage-card", solved && "is-solved")} aria-label="Boss stage 1: break the Vigenère cipher">
      <header className="dh-stage-head">
        <span className={cx("dh-stage-num", solved && "on")}>{solved ? "✓" : "1"}</span>
        <h4 className="dh-stage-title">Break the Vigenère</h4>
        {solved && <span className="dh-stage-badge">solved</span>}
      </header>

      <p className="dh-stage-lead">
        This ciphertext hides a passage of English behind a repeating key. Frequency analysis defeats it: recover the{" "}
        <em>key length</em> from the index of coincidence, then crack each column as an independent Caesar.
      </p>

      <pre className="dh-cipher" aria-label="Ciphertext to break">{wrap(BOSS_CIPHERTEXT, 56)}</pre>

      <div className="dh-stage-actions">
        <button type="button" className="btn" onClick={() => setGuessedLens(true)} aria-expanded={guessedLens}>
          📊 guess key length
        </button>
        {guessedLens && (
          <span className="dh-hint-inline">
            columns closest to English (IC ≈ 0.067) reveal the period — the tallest bars share the true key length.
          </span>
        )}
      </div>

      {guessedLens && (
        <div className="dh-icchart" role="img" aria-label={`Index of coincidence per candidate key length; the true length ${bestLen} peaks near English 0.067.`}>
          {lenGuesses
            .slice()
            .sort((x, y) => x.len - y.len)
            .map((l) => {
              const h = Math.round((l.ic / (maxIc || 1)) * 100);
              const peak = l.ic >= maxIc - 0.012;
              return (
                <button
                  key={l.len}
                  type="button"
                  className={cx("dh-icbar", peak && "is-peak", chosenLen === l.len && "is-chosen")}
                  onClick={() => { setChosenLen(l.len); setChecked(false); }}
                  aria-pressed={chosenLen === l.len}
                  title={`key length ${l.len} · IC ${l.ic.toFixed(4)}`}
                  aria-label={`Choose key length ${l.len}, index of coincidence ${l.ic.toFixed(3)}`}
                >
                  <span className="dh-icbar-fill" style={{ height: `${Math.max(6, h)}%` }} />
                  <span className="dh-icbar-len">{l.len}</span>
                </button>
              );
            })}
        </div>
      )}

      {chosenLen && (
        <div className="dh-stage-actions">
          <span className="dh-chosen-note">
            key length <b>{chosenLen}</b> chosen{crack ? ` · candidate key "${crack.key}"` : ""}
          </span>
          <button type="button" className="btn" onClick={recoverWithLen} aria-label={`Recover the key assuming length ${chosenLen}`}>
            🔓 recover with this length
          </button>
        </div>
      )}

      <div className="dh-keytry">
        <label className="dh-keytry-field">
          your key
          <input
            className="dh-keyinput"
            type="text"
            value={keyInput}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => { setKeyInput(e.target.value); setChecked(false); }}
            placeholder="e.g. CODE"
            aria-label="Enter the recovered Vigenère key"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setChecked(true)} disabled={normKey.length === 0} aria-label="Check this key">
          check key
        </button>
      </div>

      {keyRight ? (
        <div className="dh-crack-ok" role="status">
          <div className="dh-crack-badge">✓ key recovered · <code>{target}</code></div>
          <pre className="dh-plain" aria-label="Recovered plaintext">{wrap(preview, 56)}</pre>
        </div>
      ) : checked && normKey.length > 0 ? (
        <p className="dh-crack-no" role="status">
          <code>{normKey}</code> isn&apos;t it — the plaintext still looks scrambled. Try the peak key length, then{" "}
          <b>recover with this length</b>.
        </p>
      ) : preview ? (
        <pre className="dh-plain is-dim" aria-label="Plaintext preview with the current key">{wrap(preview, 56)}</pre>
      ) : null}
    </section>
  );
}

// ---- Boss stage 2: DH by hand ----
function DhByHandStage({ solved, onSolve }: { solved: boolean; onSolve: () => void }) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const val = answer.trim() === "" ? null : Number(answer);
  const correct = val === BOSS_DH_SHARED;
  const hintTrace = useMemo(() => modPowTrace(BOSS_DH.B, BOSS_DH.a, BOSS_DH.p), []);

  useEffect(() => {
    if (correct && !solved) onSolve();
  }, [correct, solved, onSolve]);

  return (
    <section className={cx("dh-stage-card", solved && "is-solved")} aria-label="Boss stage 2: Diffie–Hellman by hand">
      <header className="dh-stage-head">
        <span className={cx("dh-stage-num", solved && "on")}>{solved ? "✓" : "2"}</span>
        <h4 className="dh-stage-title">Diffie–Hellman by hand</h4>
        {solved && <span className="dh-stage-badge">solved</span>}
      </header>

      <p className="dh-stage-lead">
        You are Alice. The public parameters are <code>p = {BOSS_DH.p}</code> and <code>g = {BOSS_DH.g}</code>. Bob has sent his
        public value <code>B = {BOSS_DH.B}</code>, and your private secret is <code>a = {BOSS_DH.a}</code>. Compute the shared
        secret.
      </p>

      <div className="dh-hand-eq" aria-hidden="true">
        <span className="dh-hand-target">shared</span>
        <span className="dh-hand-op">=</span>
        <span className="dh-hand-expr">B<sup>a</sup> mod p</span>
        <span className="dh-hand-op">=</span>
        <span className="dh-hand-expr">{BOSS_DH.B}<sup>{BOSS_DH.a}</sup> mod {BOSS_DH.p}</span>
        <span className="dh-hand-op">=</span>
        <span className="dh-hand-blank">?</span>
      </div>

      <div className="dh-keytry">
        <label className="dh-keytry-field">
          shared secret
          <input
            className="dh-numanswer"
            type="number"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setChecked(false); }}
            placeholder="?"
            aria-label="Enter the shared secret you computed"
          />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setChecked(true)} disabled={val === null} aria-label="Check your answer">
          check
        </button>
        <button type="button" className="btn" onClick={() => setShowHint((s) => !s)} aria-expanded={showHint} aria-label="Toggle hint">
          {showHint ? "hide hint" : "hint"}
        </button>
      </div>

      {correct ? (
        <p className="dh-crack-ok-line" role="status">
          ✓ <b>{BOSS_DH_SHARED}</b> is the shared secret — exactly what Bob gets from <code>A^b mod p</code>. You never sent it; you
          both computed it.
        </p>
      ) : checked && val !== null ? (
        <p className="dh-crack-no" role="status">
          <code>{val}</code> isn&apos;t it. Reduce mod {BOSS_DH.p} at every multiply so the numbers stay small — or open the hint.
        </p>
      ) : null}

      {showHint && (
        <div className="dh-hint-panel">
          <p className="dh-hint-lead">
            <code>modPowTrace(B, a, p)</code> — multiply by {BOSS_DH.B} and reduce mod {BOSS_DH.p}, one step at a time:
          </p>
          <ol className="dh-hint-trace" aria-label="Hint: repeated multiplication trace">
            {hintTrace.map((s) => (
              <li key={s.k} className="dh-hint-row">
                <code>{BOSS_DH.B}^{s.k}</code>
                <span aria-hidden="true">≡</span>
                <code className="dh-hint-acc">{s.acc}</code>
                <span className="dh-hint-mod">mod {BOSS_DH.p}</span>
              </li>
            ))}
          </ol>
          <p className="dh-hint-tail">The final accumulator is your answer.</p>
        </div>
      )}
    </section>
  );
}

// ===========================================================================
// tiny shared bits
// ===========================================================================
function KeyChip({ tone, k, v, strong }: { tone: "a" | "b" | "shared" | "base"; k: string; v: string; strong?: boolean }) {
  return (
    <span className={cx("dh-keychip", `is-${tone}`, strong && "is-strong")}>
      <b>{k}</b> <span>{v}</span>
    </span>
  );
}

function Val({ k, v, tone, strong }: { k: string; v: number; tone: "a" | "b" | "shared" | "ok" | "err"; strong?: boolean }) {
  return (
    <div className={cx("dh-val", `is-${tone}`, strong && "is-strong")}>
      <span className="dh-val-k">{k}</span>
      <span className="dh-val-v">{v}</span>
    </div>
  );
}

/** Hard-wrap a long string every `n` chars for a readable <pre>. */
function wrap(s: string, n: number): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out.join("\n");
}
