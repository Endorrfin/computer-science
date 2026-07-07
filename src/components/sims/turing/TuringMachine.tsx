// [HERO] turing-machine (ch.20) — the machine that draws the edge of the
// computable. A two-way-infinite tape, a head that reads/writes/moves, and a
// rule table you can EDIT: (state, read) → (write, move, next). Load a preset
// (unary addition, palindrome, or a busy beaver), then Step / Play / Run ▶▶ and
// watch the head crawl while the state label rides beneath it. The busy beavers
// halt on a blank tape and "score" the tape (Σ ones) — the uncomputable BB
// function lurking behind the celebration. Then flip to the ♾️ boss and BUILD a
// decider for L = { aⁿbⁿ } — the language ch.19's pumping lemma proved no DFA
// can touch — grading against a fixed suite. Reduced motion: Step is the whole
// interface (Play/Run are disabled), and every run is capped at the engine's
// timeout so a runaway machine always stops. All rendering is driven verbatim
// from ./model.ts (the single source of truth the tests also run).
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  ACCEPT,
  REJECT,
  PRESETS,
  bossStarter,
  checkAnBnTM,
  initialConfig,
  readCell,
  runTM,
  stepTM,
} from "./model.ts";
import type { Move, TM, TMConfig, TMRule, TMStatus } from "./model.ts";
import "../../../theme/_p5css/turing-machine.css";

const ACCENT = "#2DD4BF";
const WINDOW = 17; // cells shown, head kept centered
const HALF = (WINDOW - 1) / 2;
const CELL = 34;
const SVG_H = 96;
const RUN_CAP = 20000; // engine default; runaway machines stop here as "timeout"

type Mode = "lab" | "boss";
type RunResult = { status: TMStatus; steps: number; ones: number };

/** A sensible default input for each preset (busy beavers start blank). */
function defaultInput(tm: TM): string {
  if (tm.name === "Unary addition") return "111+11";
  if (tm.name === "Palindrome checker") return "abba";
  return ""; // busy beavers run on a blank tape
}

/** Live non-halting states = start + every state/next mentioned in the rules
    (halt states accept/reject excluded). Preserves discovery order. */
function liveStates(tm: TM): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    if (!s || s === ACCEPT || s === REJECT || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  add(tm.start);
  for (const s of tm.states) add(s);
  for (const r of tm.rules) {
    add(r.state);
    add(r.next);
  }
  return out;
}

/** Tape alphabet including the blank (deduped, blank last). */
function tapeAlphabet(tm: TM): string[] {
  const out: string[] = [];
  for (const s of tm.tape) if (s !== tm.blank && !out.includes(s)) out.push(s);
  out.push(tm.blank);
  return out;
}

/** Keep only inputs the machine's alphabet can actually type (best-effort;
    an empty alphabet — busy beavers — accepts anything, run as-is). */
function sanitizeInput(tm: TM, raw: string): string {
  if (tm.input.length === 0) return raw;
  return Array.from(raw)
    .filter((ch) => tm.input.includes(ch))
    .join("");
}

export default function TuringMachine() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const bossWon = done.has("boss-p5");

  const [mode, setMode] = useState<Mode>("lab");
  const [presetIdx, setPresetIdx] = useState(0);
  const [tm, setTm] = useState<TM>(() => PRESETS[0]);
  const [input, setInput] = useState<string>(() => defaultInput(PRESETS[0]));
  const [config, setConfig] = useState<TMConfig>(() => initialConfig(PRESETS[0], defaultInput(PRESETS[0])));
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState<TMStatus | "running">("running");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [runResult, setRunResult] = useState<RunResult | null>(null); // set by "run to halt"

  const halted = status === ACCEPT || status === REJECT || status === "timeout";
  const isBeaver = tm.name.includes("busy beaver");

  // ---- load a machine + input, resetting the run ----
  function load(next: TM, nextInput: string): void {
    const clean = sanitizeInput(next, nextInput);
    setTm(next);
    setInput(clean);
    setConfig(initialConfig(next, clean));
    setSteps(0);
    setStatus("running");
    setRunning(false);
    setRunResult(null);
  }

  function reset(): void {
    setConfig(initialConfig(tm, sanitizeInput(tm, input)));
    setSteps(0);
    setStatus("running");
    setRunning(false);
    setRunResult(null);
  }

  // ---- one step (drives Play, Step key, and the Step button) ----
  function doStep(): void {
    if (halted) {
      setRunning(false);
      return;
    }
    const s = stepTM(tm, config);
    setConfig(s.config);
    setSteps((n) => n + 1);
    if (s.halted && s.status) {
      setStatus(s.status);
      setRunning(false);
    }
  }

  // safety: cap Play at the engine's step bound so a looping machine stops
  useSimClock(running, 6 * speed, () => {
    if (halted || steps >= RUN_CAP) {
      setRunning(false);
      if (steps >= RUN_CAP && !halted) setStatus("timeout");
      return;
    }
    doStep();
  });

  // ---- run straight to a halt (or the cap) via runTM for the exact
  // status/steps, then reconstruct the final config by stepping (runTM caps
  // stored frames at MAX_FRAMES, so its last frame can be stale for long runs) ----
  function runToHalt(): void {
    setRunning(false);
    const clean = sanitizeInput(tm, input);
    const trace = runTM(tm, clean, RUN_CAP);
    let c = initialConfig(tm, clean);
    for (let i = 0; i < trace.steps; i++) c = stepTM(tm, c).config;
    setConfig(c);
    setSteps(trace.steps);
    setStatus(trace.status);
    setRunResult({ status: trace.status, steps: trace.steps, ones: trace.ones });
  }

  function onToggle(): void {
    if (reduced) return;
    if (running) setRunning(false);
    else if (!halted) setRunning(true);
  }

  // ---- preset / mode switches ----
  function pickPreset(idx: number): void {
    setPresetIdx(idx);
    const p = PRESETS[idx];
    load(p, defaultInput(p));
  }
  function enterBoss(): void {
    setMode("boss");
    load(bossStarter(), "");
  }
  function leaveBoss(): void {
    setMode("lab");
    const p = PRESETS[presetIdx];
    load(p, defaultInput(p));
  }

  // ---- status line ----
  const statusLine = useMemo(() => {
    const head = `${tm.name} · ${steps} step${steps === 1 ? "" : "s"} · state ${config.state}`;
    if (status === "running") return `${head} · running…`;
    if (status === ACCEPT) return `${head} · ACCEPT`;
    if (status === REJECT) return `${head} · REJECT`;
    return `${head} · TIMEOUT (halting problem: no finite run can promise more)`;
  }, [tm.name, steps, config.state, status]);

  const inputPlaceholder = tm.input.length ? tm.input.join("") + " …" : "(blank tape)";

  return (
    <SimShell
      title="Turing machine — a tape, a head, and the edge of the computable"
      simKey="turing-machine"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep: doStep, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={statusLine}
      controls={
        <div className="tm-ctl">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button
              type="button"
              className={cx("bit-segbtn", mode === "lab" && "on")}
              onClick={() => mode !== "lab" && leaveBoss()}
              aria-pressed={mode === "lab"}
            >
              lab
            </button>
            <button
              type="button"
              className={cx("bit-segbtn", mode === "boss" && "on")}
              onClick={() => mode !== "boss" && enterBoss()}
              aria-pressed={mode === "boss"}
            >
              ♾️ boss
            </button>
          </div>

          {mode === "lab" && (
            <label className="ss-field">
              machine
              <select
                aria-label="Preset machine"
                value={presetIdx}
                onChange={(e) => pickPreset(Number(e.target.value))}
              >
                {PRESETS.map((p, i) => (
                  <option key={p.name} value={i}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="ss-field">
            input tape
            <input
              className="tm-input"
              type="text"
              value={input}
              placeholder={inputPlaceholder}
              spellCheck={false}
              aria-label="Initial tape string"
              onChange={(e) => load(tm, e.target.value)}
            />
          </label>

          <button
            type="button"
            className="btn"
            onClick={runToHalt}
            disabled={halted}
            title="Run to halt (bounded by the engine's step cap)"
          >
            ▶▶ run
          </button>
        </div>
      }
      footer={
        mode === "boss" ? (
          <BossPanel tm={tm} bossWon={bossWon} onEdit={(next) => load(next, input)} />
        ) : (
          <div className="tm-foot">
            <p className="tm-blurb">{tm.blurb}</p>
            {isBeaver && <BeaverNote result={runResult} halted={halted} status={status} />}
            <RuleEditor tm={tm} onChange={(next) => load(next, input)} />
          </div>
        )
      }
    >
      <TapeView tm={tm} config={config} status={status} reduced={reduced} />
    </SimShell>
  );
}

// ------------------------------- tape (SVG) -------------------------------
function TapeView({
  tm,
  config,
  status,
  reduced,
}: {
  tm: TM;
  config: TMConfig;
  status: TMStatus | "running";
  reduced: boolean;
}) {
  const { head, state, tape } = config;
  const cells: number[] = [];
  for (let d = -HALF; d <= HALF; d++) cells.push(head + d);
  const w = WINDOW * CELL;
  const y = 14;
  const midX = HALF * CELL + CELL / 2;

  const stateColor =
    status === ACCEPT
      ? "var(--sem-ok)"
      : status === REJECT
        ? "var(--sem-err)"
        : status === "timeout"
          ? "var(--sem-state)"
          : "var(--sem-control)";
  const glyph = (v: string) => (v === tm.blank ? tm.blank : v);
  const label = `Turing tape. Head at cell ${head} reading ${readCell(tape, head, tm.blank)}, state ${state}.`;

  return (
    <div className="tm-stage">
      <svg
        className={cx("tm-svg", !reduced && "tm-anim")}
        viewBox={`0 0 ${w} ${SVG_H}`}
        width="100%"
        role="img"
        aria-label={label}
      >
        {cells.map((idx, i) => {
          const isHead = idx === head;
          const x = i * CELL;
          const v = readCell(tape, idx, tm.blank);
          const blankCell = v === tm.blank;
          return (
            <g key={idx} className="tm-cellg">
              <rect
                x={x + 1}
                y={y}
                width={CELL - 2}
                height={CELL + 6}
                rx={4}
                className={cx("tm-cell", isHead && "tm-cell--head", blankCell && "tm-cell--blank")}
                style={isHead ? { stroke: "var(--sem-control)" } : undefined}
              />
              <text
                x={x + CELL / 2}
                y={y + (CELL + 6) / 2 + 5}
                textAnchor="middle"
                className={cx("tm-glyph", blankCell && "tm-glyph--blank")}
              >
                {glyph(v)}
              </text>
              <text x={x + CELL / 2} y={y - 3} textAnchor="middle" className="tm-idx">
                {idx}
              </text>
            </g>
          );
        })}

        {/* head pointer + state label under the centered cell */}
        <polygon
          className="tm-head-tri"
          points={`${midX - 7},${y + CELL + 12} ${midX + 7},${y + CELL + 12} ${midX},${y + CELL + 3}`}
        />
        <text
          x={midX}
          y={y + CELL + 26}
          textAnchor="middle"
          className="tm-statelabel"
          style={{ fill: stateColor }}
        >
          {state}
        </text>
      </svg>
    </div>
  );
}

// ------------------------------- busy-beaver flavor -------------------------------
function BeaverNote({
  result,
  halted,
  status,
}: {
  result: RunResult | null;
  halted: boolean;
  status: TMStatus | "running";
}) {
  const won: RunResult | null =
    halted && status === ACCEPT && result && result.status === ACCEPT ? result : null;
  return (
    <div className={cx("tm-beaver", won && "tm-beaver--win")}>
      {won ? (
        <p className="tm-beaver-hit" role="status">
          <span className="tm-fireworks" aria-hidden="true">
            🎆
          </span>{" "}
          halted after <b>{won.steps}</b> steps, wrote <b>{won.ones}</b> ones.
        </p>
      ) : (
        <p className="tm-beaver-idle">Run it on a blank tape and watch it halt — eventually.</p>
      )}
      <p className="tm-beaver-fact">
        The busy-beaver function is <em>uncomputable</em>: the max steps a halting n-state machine
        takes is S(3) = <b>21</b>, and S(5) = <b>47,176,870</b> (proved 2024). Past that, no formula —
        knowing S(n) would solve the halting problem.
      </p>
    </div>
  );
}

// ------------------------------- rule table editor -------------------------------
function RuleEditor({ tm, onChange }: { tm: TM; onChange: (tm: TM) => void }) {
  const [open, setOpen] = useState(false);
  const [newState, setNewState] = useState("");
  const states = liveStates(tm);
  const alphabet = tapeAlphabet(tm);
  const nextOptions = [...states, ACCEPT, REJECT];

  function patchRule(i: number, patch: Partial<TMRule>): void {
    const rules = tm.rules.map((r, j) => (j === i ? { ...r, ...patch } : r));
    onChange({ ...tm, rules });
  }
  function deleteRule(i: number): void {
    onChange({ ...tm, rules: tm.rules.filter((_, j) => j !== i) });
  }
  function addRule(): void {
    const st = states[0] ?? tm.start;
    const rd = alphabet[0] ?? tm.blank;
    const rule: TMRule = { state: st, read: rd, write: rd, move: "R", next: st };
    onChange({ ...tm, rules: [...tm.rules, rule] });
  }
  function addState(): void {
    const name = newState.trim();
    if (!name || name === ACCEPT || name === REJECT || states.includes(name)) return;
    // introduce it by adding a starter rule that mentions the new state
    const rd = alphabet[0] ?? tm.blank;
    const rule: TMRule = { state: name, read: rd, write: rd, move: "R", next: name };
    onChange({ ...tm, states: [...tm.states, name], rules: [...tm.rules, rule] });
    setNewState("");
  }

  return (
    <div className="tm-editor">
      <button
        type="button"
        className="tm-editor-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} rule table <span className="tm-muted">({tm.rules.length} rules · states: {states.join(", ")})</span>
      </button>

      {open && (
        <div className="tm-editor-body">
          <table className="tm-rules">
            <thead>
              <tr>
                <th scope="col">state</th>
                <th scope="col">read</th>
                <th scope="col" aria-hidden="true">
                  →
                </th>
                <th scope="col">write</th>
                <th scope="col">move</th>
                <th scope="col">next</th>
                <th scope="col">
                  <span className="tm-visually-hidden">delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tm.rules.map((r, i) => (
                <tr key={i}>
                  <td>
                    <select
                      aria-label={`Rule ${i + 1} state`}
                      value={states.includes(r.state) ? r.state : ""}
                      onChange={(e) => patchRule(i, { state: e.target.value })}
                    >
                      {!states.includes(r.state) && <option value="">{r.state}</option>}
                      {states.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      aria-label={`Rule ${i + 1} read`}
                      value={r.read}
                      onChange={(e) => patchRule(i, { read: e.target.value })}
                    >
                      {alphabet.map((s) => (
                        <option key={s} value={s}>
                          {s === tm.blank ? `${s} (blank)` : s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="tm-arrow" aria-hidden="true">
                    →
                  </td>
                  <td>
                    <select
                      aria-label={`Rule ${i + 1} write`}
                      value={r.write}
                      onChange={(e) => patchRule(i, { write: e.target.value })}
                    >
                      {alphabet.map((s) => (
                        <option key={s} value={s}>
                          {s === tm.blank ? `${s} (blank)` : s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="bit-seg tm-move" role="group" aria-label={`Rule ${i + 1} move`}>
                      {(["L", "R"] as Move[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={cx("bit-segbtn", r.move === m && "on")}
                          onClick={() => patchRule(i, { move: m })}
                          aria-pressed={r.move === m}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <select
                      aria-label={`Rule ${i + 1} next state`}
                      className={cx(r.next === ACCEPT && "tm-sel-ok", r.next === REJECT && "tm-sel-err")}
                      value={nextOptions.includes(r.next) ? r.next : ""}
                      onChange={(e) => patchRule(i, { next: e.target.value })}
                    >
                      {!nextOptions.includes(r.next) && <option value="">{r.next}</option>}
                      {nextOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="tm-del"
                      onClick={() => deleteRule(i)}
                      aria-label={`Delete rule ${i + 1}`}
                      title="Delete rule"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tm-editor-actions">
            <button type="button" className="btn" onClick={addRule}>
              ＋ add rule
            </button>
            <span className="tm-newstate">
              <input
                className="tm-input tm-input--sm"
                type="text"
                value={newState}
                placeholder="new state"
                spellCheck={false}
                aria-label="New state name"
                onChange={(e) => setNewState(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addState();
                  }
                }}
              />
              <button type="button" className="btn" onClick={addState} disabled={!newState.trim()}>
                ＋ add state
              </button>
            </span>
          </div>
          <p className="tm-editor-help tm-muted">
            A missing rule for (state, read) rejects — deciders never wedge. Point <code>next</code>{" "}
            at <b>accept</b> or <b>reject</b> to halt.
          </p>
        </div>
      )}
    </div>
  );
}

// ------------------------------- boss mode -------------------------------
function BossPanel({
  tm,
  bossWon,
  onEdit,
}: {
  tm: TM;
  bossWon: boolean;
  onEdit: (tm: TM) => void;
}) {
  const [results, setResults] = useState<ReturnType<typeof checkAnBnTM> | null>(null);
  const [hintOpen, setHintOpen] = useState(false);

  function runSuite(): void {
    const graded = checkAnBnTM(tm);
    setResults(graded);
    if (graded.passed) markChallengeDone("boss-p5");
  }

  const passed = results?.passed ?? false;

  return (
    <div className={cx("tm-boss", passed && "tm-boss--won")}>
      <div className="tm-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>The Halting Oracle</strong>
        <span className="tm-muted">badge: ♾️ Halting Oracle {bossWon && "✓ earned"}</span>
      </div>
      <p className="tm-boss-task">
        Build a Turing machine that <b>ACCEPTS</b> L = {"{ aⁿbⁿ : n ≥ 0 }"} and <b>REJECTS</b>{" "}
        everything else — the language no DFA can recognize. Edit the rule table below (alphabet{" "}
        <code>a b X Y _</code>), then run the suite. A timeout counts as a fail: a decider must halt.
      </p>

      <RuleEditor
        tm={tm}
        onChange={(next) => {
          onEdit(next);
          setResults(null);
        }}
        key="boss-editor"
      />

      <div className="tm-boss-actions">
        <button type="button" className="btn btn-primary" onClick={runSuite}>
          ▶▶ run test suite
        </button>
        {results && !passed && (
          <span className="tm-verdict no">
            {results.results.filter((r) => r.ok).length}/{results.results.length} cases pass — keep
            going.
          </span>
        )}
      </div>

      {results && (
        <table className="tm-boss-results">
          <thead>
            <tr>
              <th scope="col">input</th>
              <th scope="col">expected</th>
              <th scope="col">got</th>
              <th scope="col" aria-label="pass or fail">
                ✓/✗
              </th>
            </tr>
          </thead>
          <tbody>
            {results.results.map((r, i) => (
              <tr key={i} className={cx(r.ok ? "tm-row-ok" : "tm-row-bad")}>
                <td className="tm-mono">{r.input === "" ? "ε" : r.input}</td>
                <td>{r.expect ? "accept" : "reject"}</td>
                <td className="tm-mono">{r.got}</td>
                <td>{r.ok ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(passed || bossWon) && (
        <div className="tm-boss-badge" role="status">
          <span className="tm-fireworks" aria-hidden="true">
            🎆
          </span>{" "}
          <b>♾️ Halting Oracle earned</b> — you built a decider for a language beyond every finite
          automaton.
        </div>
      )}

      <details
        className="tm-hint"
        open={hintOpen}
        onToggle={(e) => setHintOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary>hint — the cross-off-pairs strategy</summary>
        <p>
          At the left end, mark one <code>a</code> as <code>X</code> and walk right to find the first
          unmatched <code>b</code>; mark it <code>Y</code>. Walk back to the last <code>X</code>,
          step right, and repeat with the next <code>a</code>. When no <code>a</code> remains, the
          rest must be all <code>Y</code> (equal counts) followed by blank ⇒ accept; an empty tape is
          also aⁿbⁿ with n = 0. Any leftover <code>a</code>, <code>b</code>, or an out-of-order symbol
          means reject. You supply the exact rules.
        </p>
      </details>
    </div>
  );
}
