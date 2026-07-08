// [micro] join-visualizer (ch.29) — the same equi-join, two ways, every row
// touch counted. NESTED-LOOP scans the whole of S for each row of R — touches
// grow with |R|·|S|. HASH JOIN builds a table on S once, then probes it once
// per row of R — touches grow with |S|+|R|. Step through the trace exactly as
// nestedLoopJoin()/hashJoin() emit it: the touched row(s) light up, a match
// draws a link between R and S, and a live touches counter climbs so the
// asymptotic gap is something you watch happen, not a formula to take on
// faith. Reduced motion → step only. Prefix: jn-.
import { useMemo, useState } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import SimShell from "../SimShell.tsx";
import { nestedLoopJoin, hashJoin, DEMO_R, DEMO_S } from "./joins.ts";
import type { JoinStep, JoinResult, Row } from "./joins.ts";
import "../../../theme/_p8css/join-visualizer.css";

const ACCENT = "#60A5FA";

type Algo = "nested-loop" | "hash";

const ALGOS: { id: Algo; label: string }[] = [
  { id: "nested-loop", label: "nested-loop" },
  { id: "hash", label: "hash join" },
];

// ---- SVG geometry (viewBox units). Two fixed columns; rows never move, only
// their highlight state does, so a match is a straight line between two
// precomputed row centers. ----
const W = 640;
const ROW_H = 30;
const ROW_GAP = 6;
const COL_TOP = 34;
const R_X = 96;
const S_X = W - 96;
const ROW_W = 108;

function rowY(index: number): number {
  return COL_TOP + index * (ROW_H + ROW_GAP) + ROW_H / 2;
}

export default function JoinVisualizer() {
  const reduced = useReducedMotion();

  const [algo, setAlgo] = useState<Algo>("nested-loop");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const result = useMemo<JoinResult>(
    () => (algo === "nested-loop" ? nestedLoopJoin(DEMO_R, DEMO_S) : hashJoin(DEMO_R, DEMO_S)),
    [algo],
  );
  const total = result.trace.length;
  const atEnd = step >= total;

  const touchesSoFar = useMemo(() => countTouches(result.trace, step), [result.trace, step]);
  const matchesSoFar = useMemo(() => result.trace.slice(0, step).filter((s) => s.phase === "match").length, [result.trace, step]);

  function pickAlgo(id: Algo): void {
    setAlgo(id);
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
  useSimClock(running, 4 * speed, () => {
    setStep((s) => {
      if (s >= total) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  });

  const current = step > 0 ? result.trace[step - 1] : null;
  const status = atEnd
    ? `${algo === "nested-loop" ? "nested-loop" : "hash join"} done — ${result.touches} touches, ${result.pairs.length} pairs matched`
    : `${describeStep(current)} · touches ${touchesSoFar} · step ${step}/${total}`;

  return (
    <SimShell
      title="Join visualizer — nested-loop vs. hash, by the touch"
      simKey="join-visualizer"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="jn-ctl">
          <div className="bit-seg" role="group" aria-label="Join algorithm">
            {ALGOS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={cx("bit-segbtn", algo === a.id && "on")}
                onClick={() => pickAlgo(a.id)}
                aria-pressed={algo === a.id}
              >
                {a.label}
              </button>
            ))}
          </div>
          <span className="jn-touches" aria-hidden="true">
            touches <b>{touchesSoFar}</b>
          </span>
        </div>
      }
      footer={<Headline algo={algo} result={result} touchesSoFar={touchesSoFar} matchesSoFar={matchesSoFar} atEnd={atEnd} />}
    >
      <div className="jn-stage">
        <JoinStage trace={result.trace} step={step} reduced={reduced} />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// touches counted directly off the already-produced trace: the engine tags
// every inner-side visit as build, probe, or a scan on the S side — this only
// tallies those tags, it does not recompute the join.
// ---------------------------------------------------------------------------
function countTouches(trace: JoinStep[], upTo: number): number {
  let n = 0;
  for (let i = 0; i < upTo; i++) {
    const s = trace[i];
    if (s.phase === "build" || s.phase === "probe" || (s.phase === "scan" && s.side === "S")) n++;
  }
  return n;
}

function describeStep(s: JoinStep | null): string {
  if (!s) return "ready";
  if (s.phase === "scan") return s.side === "R" ? `scan R#${s.rowId}` : `scan S#${s.rowId}`;
  if (s.phase === "build") return `build hash[${s.key}] ← S#${s.rowId}`;
  if (s.phase === "probe") return `probe hash[${s.key}] with R#${s.rowId} — ${s.hit ? "hit" : "miss"}`;
  return `match R#${s.r} = S#${s.s}`;
}

// ---------------------------------------------------------------------------
// R and S as two fixed columns of labeled rows; the current step highlights
// its touched row(s), and every match revealed so far draws a persistent
// link between the matched R/S rows.
// ---------------------------------------------------------------------------
function JoinStage({ trace, step, reduced }: { trace: JoinStep[]; step: number; reduced: boolean }) {
  const revealed = trace.slice(0, step);
  const current = step > 0 ? trace[step - 1] : null;

  const links = revealed.filter((s): s is Extract<JoinStep, { phase: "match" }> => s.phase === "match");
  const currentLink = current && current.phase === "match" ? current : null;

  const activeR = new Set<number>();
  const activeS = new Set<number>();
  if (current) {
    if (current.phase === "scan") (current.side === "R" ? activeR : activeS).add(current.rowId);
    else if (current.phase === "build") activeS.add(current.rowId);
    else if (current.phase === "probe") activeR.add(current.rowId);
    else {
      activeR.add(current.r);
      activeS.add(current.s);
    }
  }

  const H = COL_TOP + Math.max(DEMO_R.length, DEMO_S.length) * (ROW_H + ROW_GAP) + 14;
  const summary = current
    ? `Current step: ${describeStep(current)}.`
    : "No steps revealed yet — press Step or Play.";

  return (
    <svg
      className={cx("jn-svg", !reduced && "jn-anim")}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Join visualization. ${summary}`}
    >
      <text x={R_X} y={20} textAnchor="middle" className="jn-colhead">
        R
      </text>
      <text x={S_X} y={20} textAnchor="middle" className="jn-colhead">
        S
      </text>

      {links.map((m, i) => (
        <MatchLink key={`${m.r}-${m.s}-${i}`} r={m.r} s={m.s} isNew={m === currentLink} />
      ))}

      {DEMO_R.map((row, i) => (
        <RowBox key={row.id} row={row} x={R_X} y={rowY(i)} active={activeR.has(row.id)} />
      ))}
      {DEMO_S.map((row, i) => (
        <RowBox key={row.id} row={row} x={S_X} y={rowY(i)} active={activeS.has(row.id)} />
      ))}
    </svg>
  );
}

function RowBox({ row, x, y, active }: { row: Row; x: number; y: number; active: boolean }) {
  return (
    <g className={cx("jn-row", active && "is-active")}>
      <rect x={x - ROW_W / 2} y={y - ROW_H / 2} width={ROW_W} height={ROW_H} rx={7} className="jn-row-box" />
      <text x={x} y={y + 4.5} textAnchor="middle" className="jn-row-t">
        #{row.id} : {row.key}
      </text>
    </g>
  );
}

function MatchLink({ r, s, isNew }: { r: number; s: number; isNew: boolean }) {
  const ri = DEMO_R.findIndex((row) => row.id === r);
  const si = DEMO_S.findIndex((row) => row.id === s);
  if (ri === -1 || si === -1) return null;
  const y1 = rowY(ri);
  const y2 = rowY(si);
  const x1 = R_X + ROW_W / 2;
  const x2 = S_X - ROW_W / 2;
  const midX = (x1 + x2) / 2;
  return (
    <path
      className={cx("jn-link", isNew && "is-new")}
      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Footer — final touches + pairs, and the Big-O headline: same pairs, very
// different cost.
// ---------------------------------------------------------------------------
function Headline({
  algo,
  result,
  touchesSoFar,
  matchesSoFar,
  atEnd,
}: {
  algo: Algo;
  result: JoinResult;
  touchesSoFar: number;
  matchesSoFar: number;
  atEnd: boolean;
}) {
  const n = DEMO_R.length;
  const m = DEMO_S.length;
  return (
    <div className="jn-foot">
      <div className="jn-bigo" role="group" aria-label="Complexity comparison">
        <div className={cx("jn-bigo-row", algo === "nested-loop" && "is-active")}>
          <span className="jn-bigo-name">nested-loop</span>
          <span className="jn-bigo-formula">
            |R|·|S| = {n}·{m} = <b>{n * m}</b>
          </span>
          <span className="jn-bigo-tag">O(n·m)</span>
        </div>
        <div className={cx("jn-bigo-row", algo === "hash" && "is-active")}>
          <span className="jn-bigo-name">hash join</span>
          <span className="jn-bigo-formula">
            |R|+|S| = {n}+{m} = <b>{n + m}</b>
          </span>
          <span className="jn-bigo-tag">O(n+m)</span>
        </div>
      </div>
      <div className="jn-stats" role="group" aria-label="Run totals">
        <Stat k="touches" v={atEnd ? result.touches : touchesSoFar} tone={atEnd ? "ok" : undefined} />
        <Stat k="pairs matched" v={atEnd ? result.pairs.length : matchesSoFar} />
        {atEnd && <Stat k="pairs" v={result.pairs.map(([r, s]) => `${r}-${s}`).join(", ")} wide />}
      </div>
    </div>
  );
}

function Stat({ k, v, tone, wide }: { k: string; v: string | number; tone?: "ok"; wide?: boolean }) {
  return (
    <div className={cx("jn-stat", wide && "jn-stat--wide")}>
      <span className="jn-stat-k">{k}</span>
      <span className={cx("jn-stat-v", tone === "ok" && "is-ok")}>{v}</span>
    </div>
  );
}
