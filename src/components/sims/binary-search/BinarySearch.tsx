// [micro] binary-search — the payoff of keeping data SORTED. The array is a row
// of cells; a live window [lo, hi] covers the part still in play, and everything
// outside it is greyed out as discarded. Each probe reads the MIDDLE of the
// window and, on a miss, throws away the half that cannot contain the target —
// so the window visibly HALVES and a lookup costs ⌊log₂n⌋+1 probes instead of n
// (a 15-element array is settled in at most 4). The transport steps through the
// recorded probes one at a time; play auto-advances via the shared clock.
//
// Two modes sit behind the toggle. Exact search asks "is target present?" and
// stops the instant a[mid] == target. Lower bound never stops early: it collapses
// the window to the FIRST index whose value is ≥ target — the insertion point,
// which lands on the first of any duplicates and may be n if every element is
// smaller. The boundary math (`<=` vs `<`, `mid ± 1` vs `mid`) is where the
// classic off-by-one / infinite-loop bug lives, so the sim shows lo/mid/hi at
// every step. Reduced motion: Step advances one probe.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { search, lowerBound, worstCaseProbes, type ProbeStep } from "./model.ts";

const ACCENT = "#34D399";

type Mode = "search" | "lower";

// A fresh sorted array of `n` distinct ascending ints with random gaps, so the
// values aren't a trivial 1..n mapping to their own indices.
function makeSortedArray(n: number): number[] {
  const out: number[] = [];
  let v = Math.floor(Math.random() * 8) + 1; // 1..8
  for (let i = 0; i < n; i++) {
    out.push(v);
    v += Math.floor(Math.random() * 6) + 2; // +2..+7, strictly increasing
  }
  return out;
}

const N = 15;

export default function BinarySearch() {
  const [arr, setArr] = useState<number[]>(() => makeSortedArray(N));
  const [target, setTarget] = useState(() => arr[Math.floor(N / 2)] + 1);
  const [mode, setMode] = useState<Mode>("search");
  const [i, setI] = useState(0); // number of probes revealed so far
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Recompute the probe trace whenever the array, target, or mode changes.
  const result = useMemo(() => {
    if (mode === "search") {
      const r = search(arr, target);
      return { steps: r.steps, found: r.found, index: r.index };
    }
    const r = lowerBound(arr, target);
    return { steps: r.steps, found: false, index: r.index };
  }, [arr, target, mode]);

  const steps: ProbeStep[] = result.steps;
  const len = steps.length;
  const cur: ProbeStep | null = i > 0 ? steps[i - 1] : null;
  const atEnd = i >= len;
  const worst = worstCaseProbes(arr.length);

  useSimClock(running, 1.6 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function restart(): void {
    setI(0);
    setRunning(true);
  }
  function onStep(): void {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function onReset(): void {
    setRunning(false);
    setI(0);
  }
  function pickMode(m: Mode): void {
    setMode(m);
    setRunning(false);
    setI(0);
  }
  function regenerate(): void {
    const next = makeSortedArray(N);
    setArr(next);
    setTarget(next[Math.floor(N / 2)] + 1);
    setRunning(false);
    setI(0);
  }
  function onTargetChange(raw: string): void {
    const v = Number.parseInt(raw, 10);
    setTarget(Number.isFinite(v) ? v : 0);
    setRunning(false);
    setI(0);
  }

  // ---- status line ----
  // Before any probe: the setup. Mid-run: the current probe's caption. At the
  // end: the verdict (found index, "not present", or the insertion point).
  let verdict: string;
  if (mode === "search") {
    verdict = result.found
      ? `found ${target} at index ${result.index}`
      : `${target} is not present`;
  } else {
    const ip = result.index;
    verdict =
      ip < arr.length
        ? `lower bound of ${target} is index ${ip} (value ${arr[ip]}) — the insertion point`
        : `lower bound of ${target} is index ${ip} — past the end; every element is smaller`;
  }
  const status = cur
    ? `${cur.caption} · probe ${i}/${len}, worst-case ⌊log₂${arr.length}⌋+1 = ${worst}.`
    : atEnd && len === 0
      ? `${verdict}. (No probes needed — empty window.)`
      : atEnd
        ? `${verdict}. Used ${len} probe${len === 1 ? "" : "s"} of ${worst} worst-case.`
        : `${mode === "search" ? "Exact search" : "Lower bound"} for ${target} in ${arr.length} sorted cells — ⌊log₂${arr.length}⌋+1 = ${worst} probes at worst. Step to begin.`;

  return (
    <SimShell
      title="Binary search — each probe halves the window"
      simKey="binary-search"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="bsearch-ctl">
          <label className="ss-field">
            target
            <input
              className="bsearch-input"
              type="number"
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              aria-label="Value to search for"
            />
          </label>
          <div className="bit-seg" role="group" aria-label="Search mode">
            <button
              type="button"
              className={cx("bit-segbtn", mode === "search" && "on")}
              onClick={() => pickMode("search")}
              aria-pressed={mode === "search"}
            >
              exact search
            </button>
            <button
              type="button"
              className={cx("bit-segbtn", mode === "lower" && "on")}
              onClick={() => pickMode("lower")}
              aria-pressed={mode === "lower"}
            >
              lower bound
            </button>
          </div>
          <button type="button" className="btn" onClick={regenerate} aria-label="Generate a new sorted array">
            ↻ new array
          </button>
        </div>
      }
      footer={
        <div className="bsearch-foot">
          <div className="bsearch-meter" role="status">
            <span className="bsearch-meter-lbl">probes</span>
            <span className="bsearch-meter-val">
              <b>{i}</b> / {worst} worst-case
            </span>
            <span className="bsearch-meter-bar" aria-hidden="true">
              {Array.from({ length: worst }, (_, k) => (
                <span key={k} className={cx("bsearch-pip", k < i && "used")} />
              ))}
            </span>
          </div>
          <div className="bsearch-legend" role="list" aria-label="Colour legend">
            <span className="bsearch-legrow" role="listitem">
              <span className="bsearch-swatch bsearch-swatch--live" aria-hidden="true" /> live window [lo, hi]
            </span>
            <span className="bsearch-legrow" role="listitem">
              <span className="bsearch-swatch bsearch-swatch--mid" aria-hidden="true" /> mid (this probe)
            </span>
            <span className="bsearch-legrow" role="listitem">
              <span className="bsearch-swatch bsearch-swatch--gone" aria-hidden="true" /> discarded half
            </span>
            <span className="bsearch-legrow" role="listitem">
              <span className="bsearch-swatch bsearch-swatch--hit" aria-hidden="true" /> {mode === "search" ? "found" : "insertion point"}
            </span>
          </div>
        </div>
      }
    >
      <div className="bsearch-stage">
        <ol className="bsearch-cells" aria-label={`Sorted array of ${arr.length} values`}>
          {arr.map((v, idx) => {
            // Classify each cell against the current probe (or the final state).
            const inWindow = cur ? idx >= cur.lo && idx <= cur.hi : true;
            const discarded = cur ? !inWindow : false;
            const isLo = cur ? idx === cur.lo : false;
            const isHi = cur ? idx === cur.hi : false;
            const isMid = cur ? idx === cur.mid : false;
            // Final-state highlight: the answer cell once the trace is done.
            const isAnswer =
              atEnd &&
              ((mode === "search" && result.found && idx === result.index) ||
                (mode === "lower" && idx === result.index && result.index < arr.length));
            return (
              <li
                key={idx}
                className={cx(
                  "bsearch-cell",
                  discarded && "is-gone",
                  inWindow && cur && "is-live",
                  isMid && "is-mid",
                  isAnswer && "is-hit",
                )}
                aria-current={isMid ? "true" : undefined}
              >
                <span className="bsearch-brackets" aria-hidden="true">
                  {isLo && <span className="bsearch-lo">lo</span>}
                  {isHi && <span className="bsearch-hi">hi</span>}
                </span>
                <span className="bsearch-val">{v}</span>
                <span className="bsearch-idx" aria-hidden="true">
                  {idx}
                  {isMid && <span className="bsearch-mid-tag">mid</span>}
                </span>
              </li>
            );
          })}
        </ol>
        {/* insertion-point caret for lower bound: names the gap before the
            answer index once the run finishes (may be at the far right = past end). */}
        {mode === "lower" && atEnd && (
          <div className="bsearch-ins" role="status">
            insertion point → index {result.index}
            {result.index < arr.length ? ` (before ${arr[result.index]})` : " (append at end)"}
          </div>
        )}
      </div>
    </SimShell>
  );
}
