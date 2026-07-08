// [micro] isolation-anomalies (ch.29) — two transactions interleave on one
// shared timeline; the isolation level decides which classic anomaly slips
// through. Pick a SCENARIO (dirty read / non-repeatable read / phantom) and a
// LEVEL (Read Uncommitted … Serializable), then step the schedule and watch
// T1/T2 race down two lanes. The verdict — anomaly occurs or is prevented —
// comes straight from simulate(); the 3×4 staircase below (anomalyMatrix())
// shows the same boundary ANSI SQL-92 draws: each stronger level plugs one
// more hole. Nothing here recomputes the engine's logic — it only renders it.
// Reduced motion → step only. Prefix: iso-.
import { useMemo, useState } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import SimShell from "../SimShell.tsx";
import { simulate, anomalyMatrix, SCENARIOS, LEVELS } from "./isolation.ts";
import type { Level, ScenarioId, Step } from "./isolation.ts";
import "../../../theme/_p8css/isolation-anomalies.css";

const ACCENT = "#60A5FA";

const OK = "#4ADE80";
const BAD = "#F87171";

export default function IsolationAnomalies() {
  const reduced = useReducedMotion();

  const [scenario, setScenario] = useState<ScenarioId>("dirty");
  const [level, setLevel] = useState<Level>("read-uncommitted");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const result = useMemo(() => simulate(scenario, level), [scenario, level]);
  const matrix = useMemo(() => anomalyMatrix(), []);
  const total = result.steps.length;
  const atEnd = step >= total;

  function pickScenario(id: ScenarioId): void {
    setScenario(id);
    setStep(0);
    setRunning(false);
  }
  function pickLevel(id: Level): void {
    setLevel(id);
    setStep(0);
    setRunning(false);
  }
  function onReset(): void {
    setStep(0);
    setRunning(false);
  }
  function onStep(): void {
    setRunning(false);
    setStep((s) => Math.min(total, s + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setStep((s) => (s >= total ? 0 : s)); // replay from the top if finished
    setRunning(true);
  }
  useSimClock(running, 1.5 * speed, () => {
    setStep((s) => {
      if (s >= total) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  });

  const scenarioMeta = SCENARIOS.find((s) => s.id === scenario);
  const levelMeta = LEVELS.find((l) => l.id === level);
  const name = scenarioMeta?.title ?? scenario;

  // "Read Committed — dirty read prevented, phantom still possible" — the
  // selected level's verdict on this scenario, plus a pointer to a scenario
  // it still lets through (from the matrix), so the staircase reads as prose.
  const status = useMemo(() => {
    const verdict = result.anomaly ? `${name.toLowerCase()} occurs` : `${name.toLowerCase()} prevented`;
    const stillOpen = SCENARIOS.find((s) => matrix[s.id][level]);
    const tail = !atEnd
      ? `step ${step}/${total}`
      : stillOpen
        ? `${stillOpen.title.toLowerCase()} still possible`
        : "every anomaly prevented";
    return `${levelMeta?.label ?? level} — ${verdict}, ${tail}`;
  }, [result.anomaly, name, matrix, level, levelMeta, atEnd, step, total]);

  return (
    <SimShell
      title="Isolation anomalies — same schedule, four verdicts"
      simKey="isolation-anomalies"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="iso-ctl">
          <div className="bit-seg" role="group" aria-label="Scenario">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cx("bit-segbtn", scenario === s.id && "on")}
                onClick={() => pickScenario(s.id)}
                aria-pressed={scenario === s.id}
                title={s.blurb}
              >
                {s.title}
              </button>
            ))}
          </div>
          <label className="ss-field">
            isolation level
            <select
              aria-label="Isolation level"
              value={level}
              onChange={(e) => pickLevel(e.target.value as Level)}
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      }
      footer={<MatrixGrid matrix={matrix} scenario={scenario} level={level} />}
    >
      <div className="iso-stage">
        {scenarioMeta && <p className="iso-blurb">{scenarioMeta.blurb}</p>}
        <Timeline steps={result.steps} shown={step} />
        <Verdict anomaly={result.anomaly} explain={result.explain} revealed={atEnd} />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// Two-lane T1/T2 timeline — each revealed step lands in its transaction's
// lane, in order, showing the op and any observed value.
// ---------------------------------------------------------------------------
function Timeline({ steps, shown }: { steps: Step[]; shown: number }) {
  const visible = steps.slice(0, shown);
  const summary =
    visible.length === 0
      ? "No steps revealed yet."
      : `${visible.length} of ${steps.length} steps revealed: ${visible.map((s) => s.tag).join("; ")}.`;

  return (
    <div className="iso-timeline" role="group" aria-label={summary}>
      <ol className="iso-steps">
        {steps.map((s, i) => {
          const on = i < shown;
          const isLatest = i === shown - 1;
          return (
            <li
              key={i}
              className={cx(
                "iso-step",
                `iso-step--t${s.t}`,
                on && "is-on",
                isLatest && "is-latest",
                !on && "is-pending",
              )}
            >
              <span className="iso-step-lane" aria-hidden="true">
                T{s.t}
              </span>
              <span className="iso-step-body">
                <code className="iso-step-op">{s.op}</code>
                <span className="iso-step-tag">{s.tag}</span>
                {s.observed !== undefined && on && (
                  <span className="iso-step-observed">
                    observed <b>{s.observed}</b>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Verdict({ anomaly, explain, revealed }: { anomaly: boolean; explain: string; revealed: boolean }) {
  const tone = anomaly ? BAD : OK;
  return (
    <div
      className={cx("iso-verdict", revealed && (anomaly ? "is-bad" : "is-ok"))}
      style={{ ["--tone" as string]: tone }}
      aria-live="polite"
    >
      <span className="iso-verdict-pill">
        <span className="iso-verdict-dot" />
        {revealed ? (anomaly ? "anomaly occurs" : "anomaly prevented") : "step through to reveal"}
      </span>
      <p className="iso-verdict-text">{revealed ? explain : "Play or Step through the schedule to see whether this level lets the anomaly through."}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The 3×4 truth table — every scenario × every level, ✓ prevented / ✗ occurs,
// the selected cell highlighted so the "one more hole plugged" staircase
// reads at a glance.
// ---------------------------------------------------------------------------
function MatrixGrid({
  matrix,
  scenario,
  level,
}: {
  matrix: Record<ScenarioId, Record<Level, boolean>>;
  scenario: ScenarioId;
  level: Level;
}) {
  return (
    <div className="iso-matrix-wrap">
      <span className="iso-panel-title">the full boundary — scenario × isolation level</span>
      <table className="iso-matrix" aria-label="Anomaly matrix: scenario by isolation level, checkmark means prevented">
        <thead>
          <tr>
            <th scope="col" className="iso-matrix-corner" />
            {LEVELS.map((l) => (
              <th key={l.id} scope="col" className={cx("iso-matrix-colhead", l.id === level && "is-sel")}>
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCENARIOS.map((s) => (
            <tr key={s.id}>
              <th scope="row" className={cx("iso-matrix-rowhead", s.id === scenario && "is-sel")}>
                {s.title}
              </th>
              {LEVELS.map((l) => {
                const prevented = !matrix[s.id][l.id];
                const isCurrent = s.id === scenario && l.id === level;
                return (
                  <td key={l.id} className={cx("iso-matrix-cell", isCurrent && "is-current")}>
                    <span className={cx("iso-matrix-mark", prevented ? "is-ok" : "is-bad")}>
                      {prevented ? "✓" : "✗"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
