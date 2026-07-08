// [micro] udp-vs-tcp-race — ch.27 "TCP & UDP". Two lanes race the SAME lossy
// channel, side by side, framed as the choice every network app makes:
//   • TCP  = a FILE TRANSFER (must be perfect). Go-Back-N recovers every dropped
//            segment with a retransmit, so it arrives COMPLETE — but LATER.
//   • UDP  = a VIDEO CALL (must be *now*). It fires each segment once and never
//            looks back, so it arrives SOONER — but whatever dropped is simply a
//            glitch, a hole in the picture.
// A loss slider drops every k-th segment (k → a lossOnce index list). Both lanes
// deliver left→right on one shared clock: UDP crosses the line first with gaps;
// TCP keeps going (the retransmits are the extra time) until every slot is full.
// Every number — delivered / lost / transmissions / timeMs — comes verbatim from
// runUdpVsTcp() + runReliableTransfer() in ./tcp.ts (the tested engine); nothing
// is recomputed here. Reduced motion → Step only, no auto-advance.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { clamp, cx, useReducedMotion } from "../../../lib/utils.ts";
import { runReliableTransfer, runUdpVsTcp } from "./tcp.ts";
import "../../../theme/_p7css/udp-vs-tcp-race.css";

const ACCENT = "#38bdf8"; // P7 accent
const WINDOW = 4; // Go-Back-N send window (fixed — the slider is loss, not window)
const UNIT_MS = 20; // per-transmission cost, so both lanes quote one clock

// The loss slider is an index into this list. "every k-th segment drops" is the
// most legible mapping: k = ∞ → nothing, k = 1 → everything, in between → a
// widening comb of holes. Building the lossOnce list is data, not engine logic.
type LossPreset = { id: string; label: string; k: number };
const LOSS_PRESETS: readonly LossPreset[] = [
  { id: "clean", label: "clean line", k: 0 }, // no drops
  { id: "light", label: "1 in 5", k: 5 },
  { id: "medium", label: "1 in 3", k: 3 },
  { id: "heavy", label: "1 in 2", k: 2 },
  { id: "brutal", label: "every one", k: 1 },
];

/** Segments 1..nSegs where every k-th one is dropped (k = 0 → none). Pure data. */
function lossIndices(nSegs: number, k: number): number[] {
  if (k <= 0) return [];
  const out: number[] = [];
  for (let i = k; i <= nSegs; i += k) out.push(i);
  return out;
}

export default function UdpVsTcpRace() {
  const reduced = useReducedMotion();

  const [nSegs, setNSegs] = useState(8);
  const [lossIdx, setLossIdx] = useState(2); // "1 in 3" by default — a lively race
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const preset = LOSS_PRESETS[lossIdx];
  const lossOnce = useMemo(() => lossIndices(nSegs, preset.k), [nSegs, preset.k]);
  const dropSet = useMemo(() => new Set(lossOnce), [lossOnce]);

  // ---- everything is a pure function of (nSegs, lossOnce) via the engine ----
  const race = useMemo(() => runUdpVsTcp(nSegs, WINDOW, lossOnce, UNIT_MS), [nSegs, lossOnce]);
  const tcpDetail = useMemo(() => runReliableTransfer(nSegs, WINDOW, lossOnce), [nSegs, lossOnce]);

  // Both lanes ride ONE clock. UDP spends exactly nSegs transmissions (one per
  // segment, no retries); TCP spends race.tcp.transmissions (the retransmits are
  // the extra ticks). The race length is the slower of the two, so UDP visibly
  // finishes first and TCP keeps working after.
  const udpTx = nSegs;
  const tcpTx = race.tcp.transmissions;
  const raceLen = Math.max(udpTx, tcpTx);

  // cursor 0 = the gun hasn't fired; cursor t = t transmissions have happened on
  // the shared wire. A single monotone cursor drives both lanes.
  const [cursor, setCursor] = useState(0);
  const atEnd = cursor >= raceLen;

  // How many segments each lane has *delivered* by this tick. UDP delivers its
  // (non-dropped) segments one per tick, in order, skipping the holes. TCP fills
  // every slot but takes tcpTx ticks to do it, so its fill lags — the retransmits
  // are visible as the slower climb. Derived from engine totals, monotone in t.
  const udpArrived = deliveredByTick(cursor, udpTx, nSegs, dropSet, "udp");
  const tcpArrived = deliveredByTick(cursor, tcpTx, nSegs, dropSet, "tcp");

  const udpDone = cursor >= udpTx;
  const tcpDone = cursor >= tcpTx;

  function advance(): void {
    setCursor((c) => Math.min(raceLen, c + 1));
  }
  useSimClock(running, 3 * speed, () => {
    setCursor((c) => {
      if (c >= raceLen) {
        setRunning(false);
        return c;
      }
      return c + 1;
    });
  });

  function onToggle(): void {
    if (reduced) return;
    if (!running && atEnd) {
      setCursor(0); // replay from the gun
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }
  function onStep(): void {
    setRunning(false);
    advance();
  }
  function onReset(): void {
    setRunning(false);
    setCursor(0);
  }
  function loadSegs(n: number): void {
    setRunning(false);
    setCursor(0);
    setNSegs(clamp(n, 4, 12));
  }
  function loadLoss(i: number): void {
    setRunning(false);
    setCursor(0);
    setLossIdx(i);
  }

  // Time each lane has *spent* so far, on the engine's clock, capped at its total.
  const udpMsNow = Math.min(cursor, udpTx) * UNIT_MS;
  const tcpMsNow = Math.min(cursor, tcpTx) * UNIT_MS;

  const status = atEnd
    ? `finished · TCP ${race.tcp.delivered}/${nSegs} in ${race.tcp.timeMs}ms (${race.tcp.transmissions} sends) · ` +
      `UDP ${race.udp.delivered}/${nSegs} in ${race.udp.timeMs}ms (${race.udp.lost} lost)`
    : cursor === 0
      ? `ready · ${nSegs} segments, ${preset.label}${lossOnce.length ? ` (drops ${lossOnce.join(", ")})` : ""}`
      : `t=${cursor}/${raceLen} · UDP ${udpArrived}/${nSegs}${udpDone ? " ✓" : ""} · ` +
        `TCP ${tcpArrived}/${nSegs}${tcpDone ? " ✓" : ""}`;

  return (
    <SimShell
      title="TCP vs UDP — same lossy wire, one must be perfect, one must be now"
      simKey="udp-vs-tcp-race"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="uvt-ctl" role="group" aria-label="Race controls">
          <label className="ss-field uvt-field">
            loss
            <input
              className="uvt-slider"
              type="range"
              min={0}
              max={LOSS_PRESETS.length - 1}
              step={1}
              value={lossIdx}
              onChange={(e) => loadLoss(Number(e.target.value))}
              aria-label="Channel loss rate"
              aria-valuetext={preset.label}
              list="uvt-loss-ticks"
            />
            <datalist id="uvt-loss-ticks">
              {LOSS_PRESETS.map((p, i) => (
                <option key={p.id} value={i} label={p.label} />
              ))}
            </datalist>
            <span className="uvt-numval">{preset.label}</span>
          </label>

          <label className="ss-field uvt-field">
            segments
            <input
              className="uvt-slider"
              type="range"
              min={4}
              max={12}
              step={1}
              value={nSegs}
              onChange={(e) => loadSegs(Number(e.target.value))}
              aria-label="Number of segments to send"
            />
            <span className="uvt-numval">{nSegs}</span>
          </label>
        </div>
      }
      footer={
        <Verdict
          race={race}
          tcpDetail={tcpDetail}
          nSegs={nSegs}
          lossOnce={lossOnce}
          preset={preset}
        />
      }
    >
      <div className="uvt-stage">
        <Lane
          kind="tcp"
          title="TCP"
          role="file transfer"
          motto="must be perfect"
          nSegs={nSegs}
          arrived={tcpArrived}
          dropSet={dropSet}
          fillGaps
          done={tcpDone}
          winner={atEnd}
          msNow={tcpMsNow}
          totalMs={race.tcp.timeMs}
          extra={`${race.tcp.transmissions} sends · +${tcpDetail.retransmissions} retransmits`}
          reduced={reduced}
        />
        <Lane
          kind="udp"
          title="UDP"
          role="video call"
          motto="must be now"
          nSegs={nSegs}
          arrived={udpArrived}
          dropSet={dropSet}
          fillGaps={false}
          done={udpDone}
          winner={atEnd}
          msNow={udpMsNow}
          totalMs={race.udp.timeMs}
          extra={race.udp.lost > 0 ? `${race.udp.lost} lost — gaps in the picture` : "nothing dropped"}
          reduced={reduced}
        />
        <FinishLine />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// How many segments a lane has delivered by tick t.
//   UDP: one transmission per segment, in order; a dropped segment still costs a
//        tick but is never delivered — so "arrived" counts the non-dropped
//        segments among the first t. Reaches nSegs-lost at t = nSegs.
//   TCP: fills all nSegs, but over `total` ticks (retransmits included). We fill
//        one slot per (total/nSegs) ticks so the climb visibly lags UDP and
//        reaches nSegs exactly at t = total. Purely a monotone reveal over the
//        engine's own transmission count — no Go-Back-N re-simulation.
// ---------------------------------------------------------------------------
function deliveredByTick(
  t: number,
  total: number,
  nSegs: number,
  dropSet: Set<number>,
  lane: "tcp" | "udp",
): number {
  if (t <= 0 || nSegs <= 0) return 0;
  if (lane === "udp") {
    let count = 0;
    for (let seg = 1; seg <= nSegs && seg <= t; seg++) {
      if (!dropSet.has(seg)) count++;
    }
    return count;
  }
  // TCP — spread nSegs deliveries across `total` ticks (total ≥ nSegs).
  const denom = Math.max(1, total);
  return Math.min(nSegs, Math.floor((t * nSegs) / denom));
}

// ---------------------------------------------------------------------------
// One racing lane: a track of nSegs slots that fill left→right toward a finish
// line, plus a live readout (delivered / time / the lane's cost story).
// ---------------------------------------------------------------------------
function Lane({
  kind,
  title,
  role,
  motto,
  nSegs,
  arrived,
  dropSet,
  fillGaps,
  done,
  winner,
  msNow,
  totalMs,
  extra,
  reduced,
}: {
  kind: "tcp" | "udp";
  title: string;
  role: string;
  motto: string;
  nSegs: number;
  arrived: number;
  dropSet: Set<number>;
  fillGaps: boolean;
  done: boolean;
  winner: boolean;
  msNow: number;
  totalMs: number;
  extra: string;
  reduced: boolean;
}) {
  // Per-slot state. For UDP, a dropped index is a permanent hole. For TCP, the
  // gap is eventually filled (fillGaps), so a slot is either "sent" (arrived) or
  // pending — and dropped slots wear a faint "recovered" tint once filled.
  const delivered = fillGaps ? arrived : countNonDropped(arrived, nSegs, dropSet);
  const glitchPct = kind === "udp" && nSegs > 0 ? Math.round((dropSet.size / nSegs) * 100) : 0;

  const laneLabel =
    `${title} (${role}): delivered ${fillGaps ? arrived : delivered} of ${nSegs} segments` +
    (kind === "udp" && dropSet.size > 0 ? `, ${dropSet.size} lost` : "") +
    `, ${msNow} of ${totalMs} milliseconds.`;

  return (
    <div
      className={cx("uvt-lane", `uvt-lane--${kind}`, done && "is-done", winner && done && "is-final")}
      aria-label={laneLabel}
    >
      <div className="uvt-lane-head">
        <span className="uvt-lane-badge">{title}</span>
        <span className="uvt-lane-role">
          {role} · <span className="uvt-lane-motto">{motto}</span>
        </span>
        <span className={cx("uvt-lane-flag", done && "is-lit")} aria-hidden="true">
          {done ? (kind === "tcp" ? "✓ complete" : dropSet.size > 0 ? "▷ live, glitchy" : "▷ live") : "…"}
        </span>
      </div>

      <div className="uvt-track" role="img" aria-label={`${title} delivery track`}>
        {Array.from({ length: nSegs }, (_, i) => {
          const seg = i + 1;
          const dropped = dropSet.has(seg);
          // Which segment index has "landed" so far.
          const landed = fillGaps
            ? seg <= arrived
            : seg <= arrived && !dropped; // UDP never lands a dropped slot
          const recovered = fillGaps && dropped && landed; // TCP filled a hole
          const hole = !fillGaps && dropped; // UDP permanent gap
          return (
            <span
              key={seg}
              className={cx(
                "uvt-slot",
                landed && "is-landed",
                recovered && "is-recovered",
                hole && "is-hole",
                landed && !reduced && "uvt-pop",
              )}
              aria-hidden="true"
            >
              <span className="uvt-slot-n">{seg}</span>
            </span>
          );
        })}
        <span className="uvt-finish" aria-hidden="true" />
      </div>

      <div className="uvt-lane-read">
        <span className="uvt-read-metric">
          <span className="uvt-read-k">delivered</span>
          <span className={cx("uvt-read-v", kind === "tcp" ? "is-ok" : dropSet.size > 0 && done && "is-warn")}>
            {fillGaps ? arrived : delivered}
            <span className="uvt-read-tot">/{nSegs}</span>
          </span>
        </span>
        {kind === "udp" && (
          <span className="uvt-read-metric">
            <span className="uvt-read-k">lost</span>
            <span className={cx("uvt-read-v", dropSet.size > 0 && "is-err")}>{dropSet.size}</span>
          </span>
        )}
        <span className="uvt-read-metric">
          <span className="uvt-read-k">time</span>
          <span className="uvt-read-v">
            {msNow}
            <span className="uvt-read-tot">/{totalMs}ms</span>
          </span>
        </span>
        <span className="uvt-read-extra">
          {kind === "udp" && glitchPct > 0 ? `${extra} · ${glitchPct}% glitch` : extra}
        </span>
      </div>
    </div>
  );
}

function countNonDropped(arrived: number, nSegs: number, dropSet: Set<number>): number {
  let c = 0;
  for (let seg = 1; seg <= nSegs && seg <= arrived; seg++) if (!dropSet.has(seg)) c++;
  return c;
}

// A thin finish-line marker column shared visually by both lanes (drawn per lane
// via .uvt-finish; this is the label above them).
function FinishLine() {
  return (
    <div className="uvt-finishline" aria-hidden="true">
      <span className="uvt-finishline-lbl">finish</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The verdict — the trade-off made unmistakable, with the final engine numbers.
// ---------------------------------------------------------------------------
function Verdict({
  race,
  tcpDetail,
  nSegs,
  lossOnce,
  preset,
}: {
  race: ReturnType<typeof runUdpVsTcp>;
  tcpDetail: ReturnType<typeof runReliableTransfer>;
  nSegs: number;
  lossOnce: number[];
  preset: LossPreset;
}) {
  const clean = lossOnce.length === 0;
  const slower = race.tcp.timeMs - race.udp.timeMs;
  const slowerPct = race.udp.timeMs > 0 ? Math.round((slower / race.udp.timeMs) * 100) : 0;

  return (
    <div className="uvt-verdict">
      <div className="uvt-verdict-cols">
        <div className="uvt-vcol uvt-vcol--tcp">
          <span className="uvt-vcol-head">TCP — reliability</span>
          <div className="uvt-vcol-body">
            <span className="uvt-vstat">
              <b className="is-ok">{race.tcp.delivered}/{nSegs}</b> delivered, in order
            </span>
            <span className="uvt-vstat">
              <b>{race.tcp.timeMs}ms</b> · {race.tcp.transmissions} sends
            </span>
            <span className="uvt-vstat uvt-vsub">
              {tcpDetail.retransmissions} retransmit{tcpDetail.retransmissions === 1 ? "" : "s"} over{" "}
              {tcpDetail.rounds} window{tcpDetail.rounds === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="uvt-vcol uvt-vcol--udp">
          <span className="uvt-vcol-head">UDP — latency</span>
          <div className="uvt-vcol-body">
            <span className="uvt-vstat">
              <b className={race.udp.lost > 0 ? "is-warn" : "is-ok"}>{race.udp.delivered}/{nSegs}</b> delivered
            </span>
            <span className="uvt-vstat">
              <b>{race.udp.timeMs}ms</b> · {nSegs} sends, no retries
            </span>
            <span className="uvt-vstat uvt-vsub">
              {race.udp.lost > 0 ? (
                <>
                  <b className="is-err">{race.udp.lost}</b> gone for good — a glitch in the call
                </>
              ) : (
                <>nothing dropped — nothing to miss</>
              )}
            </span>
          </div>
        </div>
      </div>

      <p className="uvt-verdict-line">
        {clean ? (
          <>
            On a <b>clean line</b> both arrive whole. Add loss with the slider: TCP will trade{" "}
            <b>time</b> to stay <b>perfect</b>, while UDP keeps its <b>speed</b> and simply drops what it loses.
          </>
        ) : (
          <>
            Same {preset.label} channel: <b>TCP delivered every segment</b> but paid{" "}
            <b>{slower}ms</b> extra (<b>+{slowerPct}%</b>) to retransmit the {lossOnce.length} it lost. <b>UDP</b>{" "}
            was <b>faster</b> but <b>{race.udp.lost} segment{race.udp.lost === 1 ? "" : "s"}</b> never arrived —{" "}
            perfect for a video frame you&apos;d rather skip than wait for. <b>Reliability vs. latency</b>: you
            pick one.
          </>
        )}
      </p>
    </div>
  );
}
