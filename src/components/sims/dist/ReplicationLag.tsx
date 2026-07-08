// [micro] replication-lag (ch.30) — a primary takes a write; a read-replica
// applies it `lag` seconds later. Read the replica inside that window and you
// get the OLD value back — eventual consistency, the everyday way it bites.
// Slide the lag, slide when the read happens, and flip read-your-writes to
// see the fix: route the writer's own read to the primary so it never lies.
// Purely reactive — simulateReplication() owns every verdict; this file only
// renders it. An optional Play advances the read clock so the stale window
// is visible without touching the slider by hand. Prefix: rep-.
import { useMemo, useState } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import SimShell from "../SimShell.tsx";
import { simulateReplication } from "./replication.ts";
import type { ReplResult, ReplStep } from "./replication.ts";
import "../../../theme/_p8css/replication-lag.css";

const ACCENT = "#60A5FA";

const STALE = "#F87171";
const FRESH = "#4ADE80";

const WRITE_TIME = 2; // fixed write instant — keeps the two sliders the whole story
const LAG_MIN = 1;
const LAG_MAX = 6;
const READ_MAX = 10;

export default function ReplicationLag() {
  const reduced = useReducedMotion();

  const [lag, setLag] = useState(3);
  const [readTime, setReadTime] = useState(4);
  const [readYourWrites, setReadYourWrites] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const result = useMemo<ReplResult>(
    () => simulateReplication(WRITE_TIME, readTime, lag, readYourWrites),
    [readTime, lag, readYourWrites],
  );

  const appliedAt = WRITE_TIME + lag;

  function onReset(): void {
    setLag(3);
    setReadTime(4);
    setReadYourWrites(false);
    setRunning(false);
  }
  function onStep(): void {
    setRunning(false);
    setReadTime((t) => Math.min(READ_MAX, t + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setReadTime((t) => (t >= READ_MAX ? 0 : t));
    setRunning(true);
  }
  useSimClock(running, 0.9 * speed, () => {
    setReadTime((t) => {
      if (t >= READ_MAX) {
        setRunning(false);
        return t;
      }
      return t + 1;
    });
  });

  const tone = result.stale ? STALE : FRESH;
  const status =
    `read@${readTime}s from ${result.servedBy} → "${result.readValue}" · ` +
    `${result.stale ? "STALE" : "fresh"} · replica applies write at ${appliedAt}s`;

  return (
    <SimShell
      title="Replication lag — read the replica too soon, get the old value"
      simKey="replication-lag"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="rep-ctl">
          <label className="ss-field rep-field">
            lag
            <input
              className="rep-slider"
              type="range"
              min={LAG_MIN}
              max={LAG_MAX}
              step={1}
              value={lag}
              onChange={(e) => setLag(Number(e.target.value))}
              aria-label="Replication lag in seconds"
            />
            <span className="rep-numval">{lag}s</span>
          </label>

          <label className="ss-field rep-field">
            read time
            <input
              className="rep-slider"
              type="range"
              min={0}
              max={READ_MAX}
              step={1}
              value={readTime}
              onChange={(e) => setReadTime(Number(e.target.value))}
              aria-label="When the read happens, in seconds"
            />
            <span className="rep-numval">t={readTime}s</span>
          </label>

          <label className="rep-toggle ss-field">
            <input
              type="checkbox"
              checked={readYourWrites}
              onChange={(e) => setReadYourWrites(e.target.checked)}
              aria-label="Read-your-writes — route this client's read to the primary"
            />
            read-your-writes
          </label>
        </div>
      }
    >
      <div className="rep-stage">
        <Timelines
          timeline={result.timeline}
          writeTime={WRITE_TIME}
          appliedAt={appliedAt}
          readTime={readTime}
          servedBy={result.servedBy}
          tone={tone}
        />
        <Verdict result={result} tone={tone} readYourWrites={readYourWrites} readTime={readTime} appliedAt={appliedAt} />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// Two horizontal timelines — primary on top, replica below — sharing one time
// axis. The write lands on the primary; the shaded band is the lag window
// during which the replica still holds the old value; the read marker sits
// on whichever lane actually served it.
// ---------------------------------------------------------------------------
function Timelines({
  timeline,
  writeTime,
  appliedAt,
  readTime,
  servedBy,
  tone,
}: {
  timeline: ReplStep[];
  writeTime: number;
  appliedAt: number;
  readTime: number;
  servedBy: "primary" | "replica";
  tone: string;
}) {
  const W = 640;
  const H = 190;
  const padL = 44;
  const padR = 24;
  const tMax = timeline.length > 0 ? timeline[timeline.length - 1].t : Math.max(readTime, appliedAt);
  const trackW = W - padL - padR;
  const xOf = (t: number): number => padL + (tMax > 0 ? (t / tMax) * trackW : 0);

  const primaryY = 62;
  const replicaY = 138;
  const lagX1 = xOf(writeTime);
  const lagX2 = xOf(appliedAt);
  const readX = xOf(readTime);

  const primaryVal = readTime >= writeTime ? "v1" : "v0";
  const replicaVal = readTime >= appliedAt ? "v1" : "v0";

  const summary =
    `Two timelines, primary and replica, from t=0 to t=${tMax}. ` +
    `The write of v1 lands on the primary at t=${writeTime}. ` +
    `The replica applies it at t=${appliedAt}, after the shaded lag window. ` +
    `The read happens at t=${readTime} and is served by the ${servedBy}.`;

  return (
    <div className="rep-timelines">
      <svg className="rep-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="rep-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={tone} />
          </marker>
        </defs>

        {/* lag window shading — spans both lanes so it reads as "the gap" */}
        <rect
          className="rep-lagband"
          x={lagX1}
          y={primaryY - 22}
          width={Math.max(0, lagX2 - lagX1)}
          height={replicaY - primaryY + 44}
          rx={6}
        />
        <text x={(lagX1 + lagX2) / 2} y={primaryY - 30} textAnchor="middle" className="rep-lagband-lbl">
          lag window · {appliedAt - writeTime}s
        </text>

        {/* time axis ticks */}
        {Array.from({ length: tMax + 1 }, (_, t) => (
          <g key={t} className="rep-tick">
            <line x1={xOf(t)} y1={H - 30} x2={xOf(t)} y2={H - 24} />
            <text x={xOf(t)} y={H - 12} textAnchor="middle">
              {t}
            </text>
          </g>
        ))}
        <text x={padL} y={H - 2} className="rep-axis-lbl">
          t (s)
        </text>

        {/* primary lane */}
        <Lane
          y={primaryY}
          w={trackW}
          padL={padL}
          label="primary"
          value={primaryVal}
          active={servedBy === "primary"}
          tone={tone}
        />
        {/* write marker */}
        <g className="rep-mark rep-mark--write">
          <line x1={xOf(writeTime)} y1={primaryY - 20} x2={xOf(writeTime)} y2={primaryY + 20} markerEnd="url(#rep-arrow)" />
          <text x={xOf(writeTime)} y={primaryY - 26} textAnchor="middle">
            write v1
          </text>
        </g>

        {/* replica lane */}
        <Lane
          y={replicaY}
          w={trackW}
          padL={padL}
          label="replica"
          value={replicaVal}
          active={servedBy === "replica"}
          tone={tone}
        />
        {/* apply marker */}
        <g className="rep-mark rep-mark--apply">
          <line x1={xOf(appliedAt)} y1={replicaY - 20} x2={xOf(appliedAt)} y2={replicaY + 20} />
          <text x={xOf(appliedAt)} y={replicaY + 38} textAnchor="middle">
            replica applies v1
          </text>
        </g>

        {/* read marker — drawn on whichever lane served it */}
        <g className="rep-readmark" style={{ ["--tone" as string]: tone }}>
          <line
            x1={readX}
            y1={servedBy === "primary" ? primaryY - 30 : replicaY + 30}
            x2={readX}
            y2={servedBy === "primary" ? primaryY : replicaY}
          />
          <circle cx={readX} cy={servedBy === "primary" ? primaryY : replicaY} r={7} />
          <text x={readX} y={servedBy === "primary" ? primaryY - 36 : replicaY + 48} textAnchor="middle">
            read here
          </text>
        </g>
      </svg>
    </div>
  );
}

function Lane({
  y,
  w,
  padL,
  label,
  value,
  active,
  tone,
}: {
  y: number;
  w: number;
  padL: number;
  label: string;
  value: string;
  active: boolean;
  tone: string;
}) {
  return (
    <g className={cx("rep-lane", active && "is-active")} style={active ? { ["--tone" as string]: tone } : undefined}>
      <line className="rep-lane-track" x1={padL} y1={y} x2={padL + w} y2={y} />
      <text x={padL - 10} y={y + 4} textAnchor="end" className="rep-lane-lbl">
        {label}
      </text>
      <rect x={padL + w + 8} y={y - 12} width={44} height={24} rx={5} className="rep-lane-val" />
      <text x={padL + w + 30} y={y + 5} textAnchor="middle" className="rep-lane-val-t">
        {value}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// The verdict card: what the read actually returned, stale/fresh, who served
// it, and — when read-your-writes is on — the routing explanation.
// ---------------------------------------------------------------------------
function Verdict({
  result,
  tone,
  readYourWrites,
  readTime,
  appliedAt,
}: {
  result: ReplResult;
  tone: string;
  readYourWrites: boolean;
  readTime: number;
  appliedAt: number;
}) {
  const note = readYourWrites
    ? "read-your-writes is on: this client's read is routed to the primary, so it always reflects its own write — never stale."
    : result.stale
      ? `the replica hasn't applied the write yet (catches up at t=${appliedAt}s) — this read returns the old value.`
      : readTime >= appliedAt
        ? "the replica already caught up — this read matches the primary."
        : "no write has landed yet on either copy.";

  return (
    <div className="rep-verdict" style={{ ["--tone" as string]: tone }} aria-live="polite">
      <div className="rep-verdict-top">
        <span className="rep-pill" style={{ ["--tone" as string]: tone }}>
          <span className="rep-pill-dot" />
          {result.stale ? "stale" : "fresh"}
        </span>
        <span className="rep-verdict-value">
          read value <b>{result.readValue}</b>
        </span>
        <span className="rep-verdict-servedby">
          served by <b>{result.servedBy}</b>
        </span>
      </div>
      <p className="rep-verdict-note">{note}</p>
      <p className="rep-takeaway">
        Eventual consistency means the replica is <em>eventually</em> right — read inside the lag window and you can see the past.
      </p>
    </div>
  );
}
