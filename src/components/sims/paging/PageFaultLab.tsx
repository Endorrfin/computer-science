// [micro] page-fault-lab — ch.23 "Memory". Run a reference string through a
// page-replacement policy (FIFO / LRU / Optimal / Clock) with a handful of
// physical frames and watch faults happen one reference at a time. Shrink the
// frames below the working set and faults explode (thrashing); the built-in
// Bélády string shows FIFO/Clock faulting MORE with an extra frame. This is a
// thin skin over ./model.ts — every count comes straight from the engine; the
// fault-vs-frames curve is faultCurve(); nothing is recomputed here. Transport
// mirrors cache-sim.
import { useMemo, useState } from "react";
import { clamp, cx } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import SimShell from "../SimShell.tsx";
import {
  BELADY_STRING,
  demoRefString,
  faultCurve,
  POLICIES,
  POLICY_LABEL,
  SILBERSCHATZ_STRING,
  simulateReplacement,
} from "./model.ts";
import type { Policy } from "./model.ts";
import "../../../theme/_p6css/page-fault-lab.css";

const ACCENT = "#22d3ee";
const MAX_FRAMES = 6;

type Preset = { id: string; label: string; refs: number[] };
const PRESETS: readonly Preset[] = [
  { id: "demo", label: "Demo", refs: demoRefString() },
  { id: "silberschatz", label: "Silberschatz", refs: SILBERSCHATZ_STRING },
  { id: "belady", label: "Bélády", refs: BELADY_STRING },
];

/** Parse a free-text field of space/comma-separated non-negative integers. */
function parseRefs(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .map((tok) => tok.trim())
    .filter((tok) => tok.length > 0)
    .map((tok) => Math.floor(Number(tok)))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

const POLICY_SHORT: Record<Policy, string> = {
  fifo: "FIFO",
  lru: "LRU",
  optimal: "Optimal",
  clock: "Clock",
};

export default function PageFaultLab() {
  const [text, setText] = useState(() => demoRefString().join(" "));
  const [frames, setFrames] = useState(3);
  const [policy, setPolicy] = useState<Policy>("fifo");
  const [i, setI] = useState(0); // references processed so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Parse once; fall back to a single page 0 so the stage never renders empty.
  const safeRefs = useMemo(() => {
    const parsed = parseRefs(text);
    return parsed.length > 0 ? parsed : [0];
  }, [text]);
  const result = useMemo(() => simulateReplacement(safeRefs, frames, policy), [safeRefs, frames, policy]);
  const steps = result.steps;
  const len = steps.length;

  // The step at the reveal edge: steps[i-1] is the reference just processed.
  const cur = i > 0 ? steps[i - 1] : null;
  const curFrames = cur ? cur.frames : new Array(frames).fill(null);
  const curIdx = i - 1; // index into the reference string, -1 before we start

  // Running fault/hit tallies up to (and including) the current reference.
  const seen = steps.slice(0, i);
  const faultsSoFar = seen.filter((s) => !s.hit).length;
  const hitsSoFar = seen.filter((s) => s.hit).length;

  // Fault-vs-frames curve (thrashing / anomaly). Read straight from the engine.
  const curve = useMemo(() => faultCurve(safeRefs, policy, MAX_FRAMES), [safeRefs, policy]);
  const curveMax = Math.max(1, ...curve);
  const anomaly = detectAnomaly(curve);
  const isStack = policy === "lru" || policy === "optimal";

  useSimClock(running, 2.5 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function onToggle() {
    if (running) {
      setRunning(false);
      return;
    }
    setI((x) => (x >= len ? 0 : x)); // replay from the start if finished
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => clamp(x + 1, 0, len));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }
  function loadPreset(p: Preset) {
    setText(p.refs.join(" "));
    setRunning(false);
    setI(0);
  }
  function editText(v: string) {
    setText(v);
    setRunning(false);
    setI(0);
  }
  function pickPolicy(p: Policy) {
    setPolicy(p);
    setRunning(false);
    setI(0);
  }
  function pickFrames(n: number) {
    setFrames(n);
    setRunning(false);
    setI(0);
  }

  const faultRate = result.faults + result.hits > 0 ? (result.faults / (result.faults + result.hits)) * 100 : 0;
  const verdict = cur ? (cur.hit ? "HIT" : "FAULT") : null;

  const status =
    cur !== null
      ? `ref ${cur.ref} (idx ${curIdx}/${len - 1}) · ${cur.hit ? "HIT" : "FAULT"}` +
        `${cur.evicted !== null ? ` · evict ${cur.evicted}` : ""} · ${faultsSoFar} faults / ${hitsSoFar} hits · policy ${POLICY_SHORT[policy]}`
      : `${len} references · ${frames} frames · policy ${POLICY_SHORT[policy]} — press play or step`;

  // Live summary for the frame grid (role="img").
  const gridSummary =
    `Physical memory: ${frames} frames. ` +
    (cur
      ? `Reference ${cur.ref} was a ${cur.hit ? "hit" : "fault"}${cur.evicted !== null ? `, evicting page ${cur.evicted}` : ""}. ` +
        `Resident pages: ${curFrames.filter((f) => f !== null).join(", ") || "none"}.`
      : "No references processed yet.");

  return (
    <SimShell
      title="Page-fault lab — faults, thrashing & Bélády"
      simKey="page-fault-lab"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="pfl-ctl">
          <label className="ss-field">
            policy
            <select value={policy} onChange={(e) => pickPolicy(e.target.value as Policy)} aria-label="Replacement policy">
              {POLICIES.map((p) => (
                <option key={p} value={p}>
                  {POLICY_LABEL[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="ss-field">
            frames
            <input
              className="pfl-slider"
              type="range"
              min={1}
              max={MAX_FRAMES}
              step={1}
              value={frames}
              onChange={(e) => pickFrames(Number(e.target.value))}
              aria-label="Number of physical frames"
            />
            <span className="pfl-numval">{frames}</span>
          </label>
        </div>
      }
      footer={
        <div className="pfl-counters" role="group" aria-label="Replacement metrics (full run)">
          <div className={cx("pfl-verdict", verdict === "HIT" && "hit", verdict === "FAULT" && "fault")}>
            {verdict ?? "—"}
          </div>
          <div className="pfl-metric">
            <span className="pfl-mv" style={{ color: "var(--sem-err)" }}>
              {result.faults}
            </span>
            <span className="pfl-ml">faults</span>
          </div>
          <div className="pfl-metric">
            <span className="pfl-mv" style={{ color: "var(--sem-ok)" }}>
              {result.hits}
            </span>
            <span className="pfl-ml">hits</span>
          </div>
          <div className="pfl-metric">
            <span className="pfl-mv">{faultRate.toFixed(0)}%</span>
            <span className="pfl-ml">fault rate</span>
          </div>
          <div className="pfl-metric">
            <span className="pfl-mv" style={{ color: "var(--sem-data)" }}>
              {curFrames.filter((f) => f !== null).length}/{frames}
            </span>
            <span className="pfl-ml">resident now</span>
          </div>
        </div>
      }
    >
      <div className="pfl-stage">
        {/* editable reference string + presets */}
        <div className="pfl-input-row">
          <label className="pfl-field">
            <span className="pfl-lbl">reference string</span>
            <input
              className="pfl-input"
              value={text}
              onChange={(e) => editText(e.target.value)}
              spellCheck={false}
              aria-label="Reference string (space or comma separated page numbers)"
              placeholder="1 2 3 4 1 2 5 …"
            />
          </label>
          <div className="pfl-presets" role="group" aria-label="Preset reference strings">
            <span className="pfl-lbl">presets</span>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className="pfl-preset" onClick={() => loadPreset(p)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* the reference string as a track, current index highlighted */}
        <div className="pfl-refs" role="list" aria-label="Reference string, current position highlighted">
          {safeRefs.map((r, idx) => (
            <span
              key={idx}
              role="listitem"
              className={cx("pfl-ref", idx === curIdx && "cur", idx < curIdx && "past")}
              style={
                idx === curIdx && cur
                  ? { borderColor: cur.hit ? "var(--sem-ok)" : "var(--sem-err)", color: cur.hit ? "var(--sem-ok)" : "var(--sem-err)" }
                  : undefined
              }
              aria-current={idx === curIdx ? "true" : undefined}
            >
              {r}
            </span>
          ))}
        </div>

        {/* physical frames + fault curve, side by side */}
        <div className="pfl-panels">
          <div className="pfl-frames-panel">
            <div className="pfl-lbl">
              physical memory — <b>{frames}</b> {frames === 1 ? "frame" : "frames"}
              {policy === "clock" && <span className="pfl-clock-note"> · clock hand ▸ ref-bit</span>}
            </div>
            <div className="pfl-frames" role="img" aria-label={gridSummary}>
              {curFrames.map((page, f) => {
                const isHand = policy === "clock" && cur?.hand === f;
                const bit = policy === "clock" && cur?.refbits ? cur.refbits[f] : null;
                const justLoaded = cur !== null && !cur.hit && page === cur.ref;
                return (
                  <div
                    key={f}
                    className={cx("pfl-frame", page !== null && "filled", justLoaded && "loaded", isHand && "hand")}
                    style={page !== null ? { borderColor: "var(--sem-data)", color: "var(--sem-data)" } : undefined}
                  >
                    <span className="pfl-frame-no" aria-hidden="true">
                      f{f}
                    </span>
                    <span className="pfl-frame-page">{page === null ? "·" : page}</span>
                    {policy === "clock" && page !== null && (
                      <span
                        className={cx("pfl-refbit", bit && "on")}
                        title={bit ? "reference bit set (second chance)" : "reference bit clear"}
                        aria-hidden="true"
                      >
                        {bit ? "1" : "0"}
                      </span>
                    )}
                    {isHand && (
                      <span className="pfl-hand" aria-hidden="true" title="clock hand">
                        ▸
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {cur !== null && (
              <div className="pfl-frame-note muted">
                {cur.hit ? (
                  <>
                    <b style={{ color: "var(--sem-ok)" }}>hit</b> — page {cur.ref} already resident.
                  </>
                ) : cur.evicted !== null ? (
                  <>
                    <b style={{ color: "var(--sem-err)" }}>fault</b> — loaded {cur.ref}, evicted{" "}
                    <b style={{ color: "var(--sem-state)" }}>{cur.evicted}</b>.
                  </>
                ) : (
                  <>
                    <b style={{ color: "var(--sem-err)" }}>fault</b> — loaded {cur.ref} into a free frame.
                  </>
                )}
              </div>
            )}
          </div>

          {/* fault-vs-frames curve (thrashing / Bélády) */}
          <div className="pfl-curve-panel">
            <div className="pfl-lbl">
              faults vs. frames — <span style={{ color: "var(--tx2)" }}>{POLICY_SHORT[policy]}</span>
            </div>
            <div className="pfl-curve" role="img" aria-label={curveSummary(curve, frames, policy, anomaly)}>
              {curve.map((f, idx) => {
                const nf = idx + 1;
                const h = Math.max(4, Math.round((f / curveMax) * 100));
                const isCur = nf === frames;
                return (
                  <div key={nf} className={cx("pfl-bar-col", isCur && "cur")}>
                    <span className="pfl-bar-val">{f}</span>
                    <div className="pfl-bar-track">
                      <div
                        className="pfl-bar-fill"
                        style={{
                          height: `${h}%`,
                          background: isCur ? "var(--accent)" : "color-mix(in srgb, var(--sem-data) 45%, var(--surface))",
                        }}
                      />
                    </div>
                    <span className={cx("pfl-bar-x", isCur && "cur")}>{nf}</span>
                  </div>
                );
              })}
            </div>
            {anomaly ? (
              <div className="pfl-callout anomaly" role="note">
                <b>Bélády&apos;s anomaly.</b> {POLICY_SHORT[policy]}: {anomaly.lowFrames} frames → {anomaly.lowFaults} faults, but{" "}
                {anomaly.highFrames} frames → {anomaly.highFaults}. More memory, <i>more</i> faults — FIFO/Clock lack the stack
                property.
              </div>
            ) : isStack ? (
              <div className="pfl-callout" role="note">
                {POLICY_SHORT[policy]} is a <b>stack algorithm</b>: the curve is non-increasing, so more frames never cost extra
                faults. Try FIFO or Clock on the Bélády string.
              </div>
            ) : (
              <div className="pfl-callout muted" role="note">
                No anomaly on this string. FIFO/Clock <i>can</i> fault more with an extra frame — load the Bélády preset at 3 vs.
                4 frames.
              </div>
            )}
          </div>
        </div>
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// A curve is anomalous when a LATER (more-frames) bar is taller than an earlier
// one — a page-fault increase from adding a frame. Report the sharpest such
// adjacent step so the callout can quote two concrete counts.
// ---------------------------------------------------------------------------
type Anomaly = { lowFrames: number; lowFaults: number; highFrames: number; highFaults: number };
function detectAnomaly(curve: number[]): Anomaly | null {
  let best: Anomaly | null = null;
  for (let i = 1; i < curve.length; i++) {
    if (curve[i] > curve[i - 1]) {
      const delta = curve[i] - curve[i - 1];
      if (!best || delta > best.highFaults - best.lowFaults) {
        best = { lowFrames: i, lowFaults: curve[i - 1], highFrames: i + 1, highFaults: curve[i] };
      }
    }
  }
  return best;
}

function curveSummary(curve: number[], frames: number, policy: Policy, anomaly: Anomaly | null): string {
  const pairs = curve.map((f, idx) => `${idx + 1} frame${idx === 0 ? "" : "s"}: ${f} faults`).join("; ");
  const marker = ` Current selection: ${frames} frames.`;
  const note = anomaly
    ? ` Bélády's anomaly: faults rise from ${anomaly.lowFaults} to ${anomaly.highFaults} between ${anomaly.lowFrames} and ${anomaly.highFrames} frames.`
    : "";
  return `Fault-vs-frames curve for ${POLICY_SHORT[policy]}. ${pairs}.${marker}${note}`;
}
