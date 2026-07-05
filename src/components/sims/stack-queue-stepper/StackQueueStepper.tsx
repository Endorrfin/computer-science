// [micro] stack-queue-stepper — a stack and a queue, side by side, fed the SAME
// stream of operations so LIFO and FIFO diverge in front of you. push/pop touch
// the stack's TOP; enqueue/dequeue touch the queue's BACK (in) and FRONT (out).
// Run the "fill 1·2·3 then drain" preset and watch the stack hand the numbers
// back reversed while the queue keeps their order — with pointer arrows marking
// the end that just moved, and underflow flagged as a no-op rather than a crash.
// Engine: stack-queue-stepper/model. Reduced motion: Step applies one op.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { applyOps, STACK_QUEUE_PRESETS } from "./model.ts";

const ACCENT = "#34D399";

export default function StackQueueStepper() {
  const [presetId, setPresetId] = useState(STACK_QUEUE_PRESETS[0].id);
  const [i, setI] = useState(0); // ops applied so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const preset = useMemo(() => STACK_QUEUE_PRESETS.find((p) => p.id === presetId) ?? STACK_QUEUE_PRESETS[0], [presetId]);
  const run = useMemo(() => applyOps([...preset.ops]), [preset]);
  const len = run.steps.length;

  const cur = i > 0 ? run.steps[i - 1] : null;
  const stack = cur ? cur.stack : [];
  const queue = cur ? cur.queue : [];

  useSimClock(running, 1.8 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function restart() {
    setI(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }
  function pickPreset(id: string) {
    setPresetId(id);
    setRunning(false);
    setI(0);
  }

  const opLabel = (kind: string): string =>
    kind === "push" ? "push" : kind === "pop" ? "pop" : kind === "enqueue" ? "enqueue" : "dequeue";
  const opText = cur
    ? cur.underflow
      ? `${opLabel(cur.op.kind)} — UNDERFLOW (empty, no-op)`
      : cur.op.kind === "push" || cur.op.kind === "enqueue"
        ? `${opLabel(cur.op.kind)}(${cur.value}) → ${cur.op.kind === "push" ? "top of stack" : "back of queue"}`
        : `${opLabel(cur.op.kind)}() → removed ${cur.value} from ${cur.op.kind === "pop" ? "top of stack" : "front of queue"}`
    : "ready";

  const stackTouched = cur?.op.kind === "push" || cur?.op.kind === "pop";
  const queueTouched = cur?.op.kind === "enqueue" || cur?.op.kind === "dequeue";

  return (
    <SimShell
      title="Stack vs queue — LIFO meets FIFO"
      simKey="stack-queue-stepper"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`${preset.name} · op ${i}/${len} · ${opText}. Stack [${stack.join(", ")}] · Queue [${queue.join(", ")}].`}
      controls={
        <label className="ss-field">
          preset
          <select value={presetId} onChange={(e) => pickPreset(e.target.value)} aria-label="Operation preset">
            {STACK_QUEUE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      }
      footer={
        <div className="sq-tape" role="group" aria-label="Operation sequence">
          {run.steps.map((s, k) => {
            const done = k < i;
            const isCur = k === i - 1;
            const isStack = s.op.kind === "push" || s.op.kind === "pop";
            return (
              <span
                key={k}
                className={cx("sq-op", isStack ? "stackop" : "queueop", done && "done", isCur && "cur", s.underflow && "uf")}
                title={s.underflow ? "underflow (no-op)" : undefined}
              >
                {opLabel(s.op.kind)}
                {(s.op.kind === "push" || s.op.kind === "enqueue") && <b>{s.op.value}</b>}
                {s.underflow && <em>⚠</em>}
              </span>
            );
          })}
        </div>
      }
    >
      <p className="sq-blurb muted">{preset.blurb}</p>

      <div className="sq-panels">
        {/* STACK — grows upward at the TOP; push/pop both touch the top */}
        <div className={cx("sq-panel", stackTouched && "active")}>
          <div className="sq-head">
            <span className="sq-name">stack</span>
            <span className="sq-rule">LIFO · push/pop at top</span>
          </div>
          <div className="sq-stack">
            <div className="sq-ptr top">
              {stackTouched && !cur?.underflow ? "top →" : "top"}
            </div>
            <div className="sq-cells stackcells">
              {stack.length === 0 ? (
                <div className="sq-empty">empty</div>
              ) : (
                // render top-first so the top sits visually at the top
                [...stack]
                  .map((v, idx) => ({ v, idx }))
                  .reverse()
                  .map(({ v, idx }) => {
                    const isTop = idx === stack.length - 1;
                    const justChanged = isTop && stackTouched && cur?.op.kind === "push";
                    return (
                      <div key={idx} className={cx("sq-cell", isTop && "top", justChanged && "enter")}>
                        {v}
                      </div>
                    );
                  })
              )}
            </div>
            <div className="sq-base">bottom</div>
          </div>
        </div>

        {/* QUEUE — grows rightward; enqueue at BACK, dequeue at FRONT */}
        <div className={cx("sq-panel", queueTouched && "active")}>
          <div className="sq-head">
            <span className="sq-name">queue</span>
            <span className="sq-rule">FIFO · in at back, out at front</span>
          </div>
          <div className="sq-queue">
            <div className="sq-qends">
              <span className={cx("sq-end front", queueTouched && cur?.op.kind === "dequeue" && !cur?.underflow && "hot")}>
                ← front (out)
              </span>
              <span className={cx("sq-end back", queueTouched && cur?.op.kind === "enqueue" && "hot")}>
                back (in) ←
              </span>
            </div>
            <div className="sq-cells queuecells">
              {queue.length === 0 ? (
                <div className="sq-empty">empty</div>
              ) : (
                queue.map((v, idx) => {
                  const isFront = idx === 0;
                  const isBack = idx === queue.length - 1;
                  const justChanged = isBack && queueTouched && cur?.op.kind === "enqueue";
                  return (
                    <div key={idx} className={cx("sq-cell", isFront && "front", isBack && "back", justChanged && "enter")}>
                      {v}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {cur?.underflow && (
        <p className="sq-underflow" role="status">
          ⚠ Underflow — tried to {opLabel(cur.op.kind)} from an empty {cur.op.kind === "pop" ? "stack" : "queue"}. A well-behaved
          implementation treats this as a guarded no-op (or an error), never a crash.
        </p>
      )}
    </SimShell>
  );
}
