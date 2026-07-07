// [HERO] deadlock-lab (ch.25) — the dining philosophers, and the four ways out.
// Five philosophers, five forks, one shared plate. In "Naive" mode each grabs
// its left fork then reaches for the right, and the table locks solid — a
// circular wait the sim lights up in red. Switch strategy and watch the same
// five philosophers all eat: resource ordering, an arbitrator (both-or-none),
// trylock+backoff, or a bounded table. Each fix is annotated with the Coffman
// condition it breaks. Then flip to the 🔓 boss: pick a fix AND name the
// condition it breaks to earn Deadlock Breaker. Everything animates verbatim
// from ./model.ts (the engine the tests also run). Reduced motion → Step only.
import { useEffect, useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  initDeadlock,
  stepDeadlock,
  detectDeadlock,
  allEaten,
  isDeadlocked,
  gradeBoss,
  strategyById,
  STRATEGIES,
  COFFMAN,
} from "./model.ts";
import type { Strategy, Coffman, DeadlockState, PhilPhase } from "./model.ts";
import "../../../theme/_p6css/deadlock-lab.css";

const ACCENT = "#22d3ee"; // P6 accent
const BOSS_N = 5;

type Mode = "lab" | "boss";

const PHASE_COLOR: Record<PhilPhase, string> = {
  thinking: "var(--tx3)",
  hungry: "var(--sem-state)",
  hasOne: "var(--sem-control)",
  eating: "var(--sem-ok)",
  done: "var(--sem-ok)",
};
const PHASE_LABEL: Record<PhilPhase, string> = {
  thinking: "thinking",
  hungry: "hungry",
  hasOne: "holds 1 — waiting",
  eating: "eating",
  done: "fed",
};

export default function DeadlockLab() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const bossWon = done.has("boss-p6");

  const [mode, setMode] = useState<Mode>("lab");
  const [n, setN] = useState(5);
  const [strategy, setStrategy] = useState<Strategy>("naive");
  const [state, setState] = useState<DeadlockState>(() => initDeadlock(5, "naive"));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const det = useMemo(() => detectDeadlock(state), [state]);
  const frozen = useMemo(() => isDeadlocked(state, strategy), [state, strategy]);
  const fed = allEaten(state);
  const finished = frozen || fed;

  function load(nextN: number, nextStrat: Strategy): void {
    setN(nextN);
    setStrategy(nextStrat);
    setState(initDeadlock(nextN, nextStrat));
    setRunning(false);
  }
  function reset(): void {
    setState(initDeadlock(n, strategy));
    setRunning(false);
  }
  function doStep(): void {
    setState((prev) => (allEaten(prev) || isDeadlocked(prev, strategy) ? prev : stepDeadlock(prev, strategy)));
  }

  useSimClock(running, 2.2 * speed, doStep);
  useEffect(() => {
    if (running && finished) setRunning(false);
  }, [running, finished]);

  function onToggle(): void {
    if (reduced || finished) return;
    setRunning((r) => !r);
  }

  const statusLine = useMemo(() => {
    const head = `${strategyById(strategy).label} · n=${n} · tick ${state.tick} · fed ${state.phil.filter((p) => p.phase === "done").length}/${n}`;
    if (fed) return `${head} · all fed — no deadlock`;
    if (frozen) return `${head} · DEADLOCK — circular wait {${det.cycle.join("→")}→${det.cycle[0]}}`;
    return `${head} · running…`;
  }, [strategy, n, state, fed, frozen, det]);

  const strat = strategyById(strategy);

  return (
    <SimShell
      title="Dining philosophers — freeze the table, then break the deadlock"
      simKey="deadlock-lab"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep: doStep, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={statusLine}
      controls={
        <div className="dl-ctl">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button type="button" className={cx("bit-segbtn", mode === "lab" && "on")} onClick={() => { setMode("lab"); }} aria-pressed={mode === "lab"}>
              lab
            </button>
            <button type="button" className={cx("bit-segbtn", mode === "boss" && "on")} onClick={() => { setMode("boss"); load(BOSS_N, "naive"); }} aria-pressed={mode === "boss"}>
              🔓 boss
            </button>
          </div>

          {mode === "lab" && (
            <>
              <label className="ss-field">
                strategy
                <select aria-label="Deadlock strategy" value={strategy} onChange={(e) => load(n, e.target.value as Strategy)}>
                  {STRATEGIES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="ss-field">
                philosophers
                <select aria-label="Number of philosophers" value={n} onChange={(e) => load(Number(e.target.value), strategy)}>
                  {[5, 6, 7].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
      }
      footer={
        mode === "boss" ? (
          <BossPanel bossWon={bossWon} />
        ) : (
          <div className="dl-foot">
            <p className="dl-how">
              <b>{strat.label}.</b> {strat.how}{" "}
              {strat.breaks ? (
                <span className="dl-breaks">breaks <b>{COFFMAN.find((c) => c.id === strat.breaks)?.label}</b></span>
              ) : (
                <span className="dl-breaks dl-breaks--none">all four Coffman conditions hold → deadlock is possible</span>
              )}
            </p>
            <Legend />
          </div>
        )
      }
    >
      <Table state={state} det={det} frozen={frozen} reduced={reduced} />
    </SimShell>
  );
}

// ------------------------------- the table (SVG) -------------------------------
function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function Table({ state, det, frozen, reduced }: { state: DeadlockState; det: ReturnType<typeof detectDeadlock>; frozen: boolean; reduced: boolean }) {
  const n = state.n;
  const W = 460;
  const H = 420;
  const ox = W / 2;
  const oy = H / 2;
  const R = 150; // philosopher ring
  const Rf = 96; // fork ring
  const philAngle = (i: number) => -90 + (i * 360) / n;
  const forkAngle = (i: number) => -90 + (i * 360) / n - 180 / n; // fork i sits between phil (i-1) and i

  const label = frozen
    ? `Dining table deadlocked — circular wait among philosophers ${det.cycle.join(", ")}.`
    : `Dining table — ${state.phil.filter((p) => p.phase === "eating").length} eating, ${state.phil.filter((p) => p.phase === "done").length} fed.`;

  return (
    <div className="dl-stage">
      <svg className={cx("dl-svg", !reduced && "dl-anim", frozen && "dl-frozen")} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label}>
        <defs>
          <marker id="dlWait" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L6.5,3 L0,6 Z" fill="var(--sem-err)" />
          </marker>
        </defs>

        {/* plate */}
        <circle cx={ox} cy={oy} r={54} className="dl-plate" />
        <text x={ox} y={oy - 4} textAnchor="middle" className="dl-plate-t">{frozen ? "DEADLOCK" : "table"}</text>
        <text x={ox} y={oy + 14} textAnchor="middle" className="dl-plate-s">{frozen ? "circular wait" : `${n} forks`}</text>

        {/* forks */}
        {state.forks.map((owner, f) => {
          const a = forkAngle(f);
          const p1 = polar(ox, oy, Rf - 16, a);
          const p2 = polar(ox, oy, Rf + 16, a);
          const held = owner !== -1;
          const color = held ? PHASE_COLOR[state.phil[owner].phase] : "var(--line)";
          return (
            <g key={`fork-${f}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={held ? 5 : 3} strokeLinecap="round" className="dl-fork" />
              <text {...polar(ox, oy, Rf, a)} dy={-6} textAnchor="middle" className="dl-fork-id">f{f}</text>
            </g>
          );
        })}

        {/* wait-for arrows (only when deadlocked) */}
        {frozen && det.cycle.map((from, idx) => {
          const to = det.cycle[(idx + 1) % det.cycle.length];
          const a = polar(ox, oy, R - 34, philAngle(from));
          const b = polar(ox, oy, R - 34, philAngle(to));
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const bend = polar(mx, my, 26, philAngle(from) + 180 / n);
          return (
            <path key={`wait-${from}`} d={`M ${a.x} ${a.y} Q ${bend.x} ${bend.y} ${b.x} ${b.y}`} className="dl-wait" markerEnd="url(#dlWait)" fill="none" />
          );
        })}

        {/* philosophers */}
        {state.phil.map((p) => {
          const a = philAngle(p.id);
          const c = polar(ox, oy, R, a);
          const color = PHASE_COLOR[p.phase];
          const inCycle = frozen && det.cycle.includes(p.id);
          return (
            <g key={`phil-${p.id}`} className="dl-philg">
              <circle cx={c.x} cy={c.y} r={30} fill={`color-mix(in srgb, ${color} 20%, var(--surface))`} stroke={inCycle ? "var(--sem-err)" : color} strokeWidth={inCycle ? 3.5 : 2.25} className={cx(p.phase === "eating" && "dl-eat")} />
              <text x={c.x} y={c.y - 2} textAnchor="middle" className="dl-phil-id">P{p.id}</text>
              <text x={c.x} y={c.y + 11} textAnchor="middle" className="dl-phil-ph">{p.phase === "done" ? "✓ fed" : p.phase === "eating" ? "🍜" : p.phase === "hasOne" ? "⏳" : p.phase === "hungry" ? "…" : "💭"}</text>
              <text {...polar(ox, oy, R + 40, a)} textAnchor="middle" className="dl-phil-cap" fill={color}>{PHASE_LABEL[p.phase]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend() {
  const items: { ph: PhilPhase; t: string }[] = [
    { ph: "thinking", t: "thinking" },
    { ph: "hungry", t: "hungry" },
    { ph: "hasOne", t: "holds one — waiting" },
    { ph: "eating", t: "eating" },
    { ph: "done", t: "fed" },
  ];
  return (
    <div className="dl-legend" aria-hidden="true">
      {items.map((it) => (
        <span key={it.ph} className="dl-legend-item">
          <span className="dl-swatch" style={{ background: PHASE_COLOR[it.ph] }} /> {it.t}
        </span>
      ))}
    </div>
  );
}

// ------------------------------- boss mode -------------------------------
function BossPanel({ bossWon }: { bossWon: boolean }) {
  const [fix, setFix] = useState<Strategy | "">("");
  const [reason, setReason] = useState<Coffman | "">("");
  const [checked, setChecked] = useState(false);

  const result = fix && reason ? gradeBoss(fix, reason, BOSS_N) : null;
  const passed = checked && result?.passed === true;

  function check(): void {
    setChecked(true);
    if (fix && reason && gradeBoss(fix, reason, BOSS_N).passed) markChallengeDone("boss-p6");
  }

  const fixOptions = STRATEGIES.filter((s) => s.id !== "naive");

  return (
    <div className={cx("dl-boss", passed && "dl-boss--won")}>
      <div className="dl-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Unfreeze the philosophers</strong>
        <span className="dl-muted">badge: 🔓 Deadlock Breaker {bossWon && "✓ earned"}</span>
      </div>
      <p className="dl-boss-task">
        The table is deadlocked (run <b>Naive</b> above to see it lock). Choose a fix that makes all five
        philosophers eat, then name the <b>Coffman condition</b> that fix removes. You need <em>both</em> right.
      </p>

      <div className="dl-boss-picks">
        <label className="ss-field">
          fix
          <select aria-label="Chosen fix" value={fix} onChange={(e) => { setFix(e.target.value as Strategy); setChecked(false); }}>
            <option value="">— pick a fix —</option>
            {fixOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="ss-field">
          condition it breaks
          <select aria-label="Coffman condition broken" value={reason} onChange={(e) => { setReason(e.target.value as Coffman); setChecked(false); }}>
            <option value="">— pick a condition —</option>
            {COFFMAN.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={check} disabled={!fix || !reason}>
          ▶ check answer
        </button>
      </div>

      {checked && result && !passed && (
        <p className="dl-verdict no" role="status">
          {!result.resolved
            ? "That fix doesn't clear the deadlock — pick one where everyone eats."
            : "Right fix, wrong reason — which of the four conditions does it actually remove?"}
        </p>
      )}

      {(passed || bossWon) && (
        <div className="dl-boss-badge" role="status">
          <span aria-hidden="true">🎆</span> <b>🔓 Deadlock Breaker earned</b> — you broke the cycle and can say exactly why it works.
        </div>
      )}

      <details className="dl-hint">
        <summary>hint — match each fix to the condition</summary>
        <p>Four conditions must ALL hold for deadlock. Remove any one and the table can't freeze: <b>resource ordering</b> kills the <i>circular wait</i>; <b>both-or-none</b> kills <i>hold-and-wait</i>; <b>trylock + backoff</b> kills <i>no-preemption</i>; a <b>bounded table</b> also kills the <i>circular wait</i>. Mutual exclusion (a fork is one-at-a-time) is the one you can't give up.</p>
      </details>
    </div>
  );
}
