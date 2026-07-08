// [micro] cap-explorer (ch.30) — the CAP theorem made concrete. Two replicas,
// A and B, hold one value; a client writes to A and reads from B while a
// partition separates them. A CP|AP toggle picks the trade-off and calls
// simulateCap(choice) once; a transport steps through the engine's own
// `steps` timeline (steady → partition → write → read → heal), and the
// duringPartition / onHeal readouts reveal as the trace reaches them.
// Nothing here recomputes an outcome — every value, badge and note comes
// straight from cap.ts. Reduced motion → step only. Prefix: cap-.
import { useEffect, useMemo, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { simulateCap } from "./cap.ts";
import type { CapResult, Choice } from "./cap.ts";
import "../../../theme/_p8css/cap-explorer.css";

const ACCENT = "#60A5FA";

const CHOICES: readonly { id: Choice; label: string; tag: string }[] = [
  { id: "CP", label: "CP", tag: "consistent, not available" },
  { id: "AP", label: "AP", tag: "available, but stale" },
];

const TRADEOFF: Record<Choice, string> = {
  CP: "CP: consistent, not available — nothing diverged.",
  AP: "AP: available, but a stale read — conflict reconciled on heal (last-write-wins).",
};

export default function CapExplorer() {
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<Choice>("CP");
  const result: CapResult = useMemo(() => simulateCap(choice), [choice]);
  const lastStep = result.steps.length - 1;

  const [step, setStep] = useState(lastStep); // rest at the fully-healed frame
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Switching CP/AP replays from the top so the trade-off is watched, not
  // just read off the resting frame.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setRunning(false);
    setStep(0);
  }, [choice]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    setStep((x) => {
      if (x >= lastStep) {
        setRunning(false);
        return x;
      }
      return x + 1;
    });
  };
  useSimClock(running, 1.4 * speed, () => advanceRef.current());

  function onStep(): void {
    setRunning(false);
    setStep((x) => Math.min(lastStep, x + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setStep((x) => (x >= lastStep ? 0 : x));
    setRunning(true);
  }
  function onReset(): void {
    setRunning(false);
    setStep(0);
  }

  const cur = result.steps[step];
  const partitioned = cur.t >= 1;
  const healed = cur.t >= 4;
  const showDuring = cur.t >= 2;
  const showHeal = healed;

  const status = `${choice} · step ${step + 1}/${result.steps.length} · ${cur.label} · ${cur.note}`;

  return (
    <SimShell
      title="CAP explorer — the choice under a partition"
      simKey="cap-explorer"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="cap-ctl" role="group" aria-label="Consistency choice">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cx("btn", choice === c.id && "btn-primary")}
              onClick={() => setChoice(c.id)}
              aria-pressed={choice === c.id}
              title={c.tag}
            >
              {c.label}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="cap-foot">
          <div className="cap-badges" role="group" aria-label="During the partition">
            <span className="cap-badges-lbl">during partition</span>
            <Badge on={showDuring} label="write" value={result.duringPartition.writeAccepted ? "accepted" : "rejected"} good={result.duringPartition.writeAccepted} />
            <Badge on={showDuring} label="read" value={result.duringPartition.readValue ?? "refused"} good={result.duringPartition.readValue !== null} />
            <Badge on={showDuring} label="available" value={result.duringPartition.available ? "yes" : "no"} good={result.duringPartition.available} />
            <Badge on={showDuring} label="consistent" value={result.duringPartition.consistent ? "yes" : "no"} good={result.duringPartition.consistent} />
          </div>
          <div className="cap-badges" role="group" aria-label="On heal">
            <span className="cap-badges-lbl">on heal</span>
            <Badge on={showHeal} label="A" value={result.onHeal.a} neutral />
            <Badge on={showHeal} label="B" value={result.onHeal.b} neutral />
            <Badge on={showHeal} label="converged" value={result.onHeal.converged ? "yes" : "no"} good={result.onHeal.converged} />
            <Badge on={showHeal} label="conflict resolved" value={result.onHeal.conflictResolved ? "yes (LWW)" : "n/a"} neutral />
          </div>
          <p className="cap-tradeoff">{TRADEOFF[choice]}</p>
        </div>
      }
    >
      <div className="cap-stage">
        <svg
          className={cx("cap-svg", !reduced && "cap-anim")}
          viewBox="0 0 460 260"
          width="100%"
          role="img"
          aria-label={status}
        >
          <defs>
            <marker id="capArrow" markerWidth="9" markerHeight="9" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="currentColor" />
            </marker>
          </defs>

          {/* client */}
          <g className="cap-client">
            <rect x={188} y={12} width={84} height={30} rx={7} />
            <text x={230} y={32} textAnchor="middle" className="cap-client-t">client</text>
          </g>

          {/* link between A and B — breaks once partitioned */}
          <line
            x1={120}
            y1={150}
            x2={340}
            y2={150}
            className={cx("cap-link", partitioned && "is-cut")}
          />
          {partitioned && (
            <g className="cap-cutmark" aria-hidden="true">
              <line x1={220} y1={136} x2={234} y2={164} />
              <line x1={234} y1={136} x2={220} y2={164} />
              <line x1={244} y1={136} x2={258} y2={164} />
              <line x1={258} y1={136} x2={244} y2={164} />
            </g>
          )}

          {/* write arrow: client -> A, only on the write step */}
          {cur.t === 2 && (
            <line x1={215} y1={44} x2={122} y2={128} className="cap-op cap-op-write" markerEnd="url(#capArrow)" />
          )}
          {/* read arrow: B -> client, only on the read step */}
          {cur.t === 3 && (
            <line x1={338} y1={128} x2={245} y2={44} className="cap-op cap-op-read" markerEnd="url(#capArrow)" />
          )}
          {/* reconcile sweep on heal for AP */}
          {healed && choice === "AP" && (
            <line x1={120} y1={150} x2={340} y2={150} className="cap-op cap-op-heal" />
          )}

          {/* replica A */}
          <g className="cap-node">
            <circle cx={100} cy={150} r={34} />
            <text x={100} y={146} textAnchor="middle" className="cap-node-id">A</text>
            <text x={100} y={164} textAnchor="middle" className="cap-node-val">{cur.a ?? "—"}</text>
          </g>

          {/* replica B */}
          <g className="cap-node">
            <circle cx={360} cy={150} r={34} />
            <text x={360} y={146} textAnchor="middle" className="cap-node-id">B</text>
            <text x={360} y={164} textAnchor="middle" className="cap-node-val">{cur.b ?? "—"}</text>
          </g>

          {/* step timeline */}
          {result.steps.map((s, i) => (
            <g key={s.t} className={cx("cap-tick", i <= step && "on", i === step && "is-cur")}>
              <circle cx={46 + i * 92} cy={224} r={5} />
              <text x={46 + i * 92} y={244} textAnchor="middle" className="cap-tick-lbl">{s.label}</text>
            </g>
          ))}
          <line x1={46} y1={224} x2={46 + lastStep * 92} y2={224} className="cap-tick-track" />
        </svg>
      </div>
    </SimShell>
  );
}

function Badge({
  on,
  label,
  value,
  good,
  neutral,
}: {
  on: boolean;
  label: string;
  value: string;
  good?: boolean;
  neutral?: boolean;
}) {
  const tone = neutral ? "neutral" : good ? "good" : "bad";
  return (
    <span className={cx("cap-badge", on && "on", `is-${tone}`)}>
      <span className="cap-badge-k">{label}</span>
      <span className="cap-badge-v">{on ? value : "…"}</span>
    </span>
  );
}
