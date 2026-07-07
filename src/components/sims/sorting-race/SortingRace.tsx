// [HERO] sorting-race — seven classic sorts racing on the SAME data, on a fair
// shared clock. "Which sort is fastest?" has no single answer, so we don't fake
// one: the race advances by ARRAY ACCESSES (reads + writes), the one metric that
// is fair to a comparison sort and a counting sort alike, and every lane shows
// its live access count as the playhead sweeps. The secondary readout is the
// punchline — the two non-comparison sorts (counting, radix) show a hard ZERO in
// the comparisons column: they sort without ever asking "is a < b?", which is
// exactly how they slip under the Ω(n log n) comparison bound. Change the data
// shape and watch the winner change: insertion wins when it's nearly sorted,
// quicksort collapses to O(n²) on the already-sorted preset, counting/radix run
// away when the key range is small.
//
// Engine (sorting-race/model.ts) is pure and Node-tested (scripts/test-ch16.ts):
// every sort is instrumented and returns a frame trace keyed by cumulative
// accesses. This component only replays those frames against a global access
// clock. Reduced motion → Step advances the clock to the next event.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { SORTS, makeData, runAll } from "./model.ts";
import type { DataShape, Frame, SortRun } from "./model.ts";

const ACCENT = "#34D399";

const SHAPES: { id: DataShape; label: string }[] = [
  { id: "random", label: "random" },
  { id: "sorted", label: "sorted" },
  { id: "reversed", label: "reversed" },
  { id: "fewUnique", label: "few-unique" },
];

/** Binary search: the last frame whose cumulative accesses ≤ budget A. */
function frameAt(run: SortRun, A: number, input: number[]): Frame {
  const f = run.frames;
  if (f.length === 0 || A < f[0].accesses) {
    return { array: input, active: [], settled: [], reads: 0, writes: 0, comparisons: 0, accesses: 0, note: "start" };
  }
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (f[mid].accesses <= A) lo = mid;
    else hi = mid - 1;
  }
  return f[lo];
}

export default function SortingRace() {
  const [shape, setShape] = useState<DataShape>("random");
  const [n, setN] = useState(18);
  const [seed, setSeed] = useState(7);
  const [e, setE] = useState(0); // index into the access timeline
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const input = useMemo(() => makeData(shape, n, seed), [shape, n, seed]);
  const runs = useMemo(() => runAll(input), [input]);

  // The shared "event timeline": every distinct cumulative-access value at which
  // some lane does something, ascending, starting at 0 (the unsorted state).
  const timeline = useMemo(() => {
    const set = new Set<number>([0]);
    for (const r of runs) for (const f of r.frames) set.add(f.accesses);
    return [...set].sort((a, b) => a - b);
  }, [runs]);

  const last = timeline.length - 1;
  const A = timeline[Math.min(e, last)];
  const maxVal = useMemo(() => Math.max(1, ...input), [input]);

  useSimClock(running, 12 * speed, () => {
    setE((i) => {
      if (i >= last) {
        setRunning(false);
        return last;
      }
      return i + 1;
    });
  });

  function regenerate(nextShape: DataShape, nextN: number): void {
    setShape(nextShape);
    setN(nextN);
    setE(0);
    setRunning(false);
  }
  function onStep(): void {
    setRunning(false);
    setE((i) => Math.min(last, i + 1));
  }
  function onReset(): void {
    setE(0);
    setRunning(false);
  }
  function onToggle(): void {
    if (running) {
      setRunning(false);
    } else {
      if (e >= last) setE(0);
      setRunning(true);
    }
  }

  // Per-lane current frame + finished flag, ranked by total accesses.
  const lanes = runs.map((r) => {
    const meta = SORTS.find((s) => s.id === r.id)!;
    const frame = frameAt(r, A, input);
    const finished = A >= r.accesses;
    return { run: r, meta, frame, finished };
  });
  const ranked = [...lanes].sort((a, b) => a.run.accesses - b.run.accesses);
  const winner = ranked[0];
  const leader = [...lanes].filter((l) => !l.finished).sort((a, b) => b.frame.accesses - a.frame.accesses);
  const doneCount = lanes.filter((l) => l.finished).length;

  const status =
    `${A.toLocaleString("en-US")} accesses · ${doneCount}/7 finished` +
    (doneCount === 7
      ? ` · winner: ${winner.meta.name} in ${winner.run.accesses.toLocaleString("en-US")} accesses (${winner.run.comparisons} comparisons).`
      : leader.length
        ? ` · still working: ${leader[0].meta.name}.`
        : ".");

  return (
    <SimShell
      title="Sorting race — seven sorts, one dataset, a fair access clock"
      simKey="sorting-race"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="sort-ctl">
          <div className="bit-seg" role="group" aria-label="Data shape">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={cx("bit-segbtn", shape === s.id && "on")}
                onClick={() => regenerate(s.id, n)}
                aria-pressed={shape === s.id}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="ss-field">
            n = {n}
            <input
              type="range"
              min={8}
              max={32}
              value={n}
              onChange={(ev) => regenerate(shape, Number(ev.target.value))}
              aria-label="Number of elements"
            />
          </label>
          <button type="button" className="btn" onClick={() => { setSeed((s) => s + 1); setE(0); setRunning(false); }}>
            ⟳ shuffle
          </button>
        </div>
      }
      footer={
        <div className="sort-rank">
          <span className="sort-rank-head">accesses so far (fewer = ahead):</span>
          {ranked.map((l, i) => (
            <span key={l.run.id} className={cx("sort-rank-row", l.finished && "done")}>
              <span className="sort-rank-pos">{l.finished ? `${i + 1}.` : "·"}</span>
              <span className="sort-swatch" style={{ background: l.meta.color }} aria-hidden="true" />
              <span className="sort-rank-name">{l.meta.name}</span>
              <span className="sort-rank-acc">{l.frame.accesses.toLocaleString("en-US")}</span>
              <span className={cx("sort-rank-cmp", l.meta.kind === "non-comparison" && "zero")}>
                {l.frame.comparisons} cmp
              </span>
            </span>
          ))}
        </div>
      }
    >
      <div className="sort-grid">
        {lanes.map((l) => {
          const active = new Set(l.frame.active);
          const settled = new Set(l.frame.settled);
          return (
            <div key={l.run.id} className={cx("sort-lane", l.finished && "done")}>
              <div className="sort-lane-head">
                <span className="sort-swatch" style={{ background: l.meta.color }} aria-hidden="true" />
                <b className="sort-lane-name">{l.meta.name}</b>
                <span className={cx("sort-kind", l.meta.kind === "non-comparison" && "nc")}>
                  {l.meta.kind === "non-comparison" ? "no compares" : l.meta.worst}
                </span>
                {l.finished && <span className="sort-done-badge">✓</span>}
              </div>
              <div className="sort-bars" role="img" aria-label={`${l.meta.name}: ${l.frame.note}`}>
                {l.frame.array.map((v, i) => (
                  <span
                    key={i}
                    className={cx("sort-bar", active.has(i) && "active", settled.has(i) && "settled")}
                    style={{ height: `${(v / maxVal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="sort-meters">
                <span className="sort-meter">
                  <span className="sort-meter-v">{l.frame.accesses.toLocaleString("en-US")}</span> accesses
                </span>
                <span className={cx("sort-meter", l.meta.kind === "non-comparison" && "zero")}>
                  <span className="sort-meter-v">{l.frame.comparisons}</span> compares
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SimShell>
  );
}
