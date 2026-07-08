// [HERO] tcp-lab (ch.27) — TCP, taken apart three ways, plus the P7 boss.
// LAB mode stacks three panels, each driven verbatim from ./tcp.ts:
//   1. HANDSHAKE  — step SYN → SYN-ACK → ACK from correctHandshake(x,y),
//      showing the real seq/ackNum and why a SYN eats a sequence number.
//   2. RELIABILITY — a Go-Back-N sender (runReliableTransfer): a window slides,
//      one segment drops, a timeout fires, everything after the gap is resent.
//   3. CONGESTION — the Reno sawtooth (renoTrace): cwnd over RTT rounds with
//      slow-start vs congestion-avoidance shaded and the ssthresh line drawn;
//      inject a triple-dup (halve) or timeout (collapse to 1) and watch it react.
// BOSS mode "Wire Shark" 🦈 — three broken handshakes (BOSS_TRACES); read each
// trace's fields, name the fault from FAULTS, grade with gradeHandshakeBoss.
// Diagnose all three → markChallengeDone("boss-p7") and the badge persists.
// One SimShell; its transport drives whichever lab panel owns the time axis.
// Everything animates from the engine; nothing is recomputed. Reduced motion →
// step only. Prefix: tcp-.
import { useEffect, useMemo, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  correctHandshake,
  runReliableTransfer,
  renoTrace,
  BOSS_TRACES,
  FAULTS,
  gradeHandshakeBoss,
  faultById,
} from "./tcp.ts";
import type { Segment, RenoState, RenoEvent, TcpFault } from "./tcp.ts";
import "../../../theme/_p7css/tcp-lab.css";

const ACCENT = "#38bdf8"; // P7 accent

type Mode = "lab" | "boss";
type Panel = "handshake" | "reliability" | "congestion";

const PANELS: { id: Panel; label: string; hint: string }[] = [
  { id: "handshake", label: "handshake", hint: "SYN · SYN-ACK · ACK" },
  { id: "reliability", label: "reliability", hint: "Go-Back-N window" },
  { id: "congestion", label: "congestion", hint: "Reno sawtooth" },
];

// The client's & server's initial sequence numbers for the lab handshake —
// deliberately un-round so ISN + 1 has to be *read*, not assumed.
const CLIENT_ISN = 1000;
const SERVER_ISN = 3200;

export default function TcpLab() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const bossWon = done.has("boss-p7");

  const [mode, setMode] = useState<Mode>("lab");
  const [panel, setPanel] = useState<Panel>("handshake");
  const [speed, setSpeed] = useState(1);
  const [running, setRunning] = useState(false);

  // --- panel 1: handshake — how many of the 3 segments are revealed (0..3) ---
  const handshake = useMemo(() => correctHandshake(CLIENT_ISN, SERVER_ISN), []);
  const [shakeStep, setShakeStep] = useState(0);

  // --- panel 2: reliability — window + which segment index drops ---
  const N_SEGS = 6;
  const [window, setWindow] = useState(3);
  const [dropAt, setDropAt] = useState(2);
  const reliable = useMemo(
    () => runReliableTransfer(N_SEGS, window, [dropAt]),
    [window, dropAt],
  );
  const rounds = useMemo(
    () => buildGbnRounds(N_SEGS, window, dropAt),
    [window, dropAt],
  );
  const [relStep, setRelStep] = useState(() => buildGbnRounds(N_SEGS, 3, 2).length); // full at rest

  // --- panel 3: congestion — Reno over RTT rounds, with injected events ---
  const RENO_ROUNDS = 14;
  const RENO_SSTHRESH = 8;
  const [events, setEvents] = useState<Record<number, RenoEvent>>({ 6: "triple-dup", 11: "timeout" });
  const reno = useMemo(
    () => renoTrace(RENO_ROUNDS, events, RENO_SSTHRESH),
    [events],
  );
  const [renoStep, setRenoStep] = useState(RENO_ROUNDS); // reveal cursor, 0..rounds

  // Switching panels always parks the transport at a readable resting frame.
  useEffect(() => {
    setRunning(false);
  }, [panel, mode]);

  // Re-parameterising reliability / congestion rewinds that panel's cursor so
  // the new run plays from the top — but not on first mount (panels rest full).
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) return;
    setRelStep(0);
    setRunning(false);
  }, [window, dropAt]);
  useEffect(() => {
    if (!mounted.current) return;
    setRenoStep(0);
    setRunning(false);
  }, [events]);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // ---- transport wiring: one Play/Step, routed to the active panel ----
  const maxStep =
    panel === "handshake" ? handshake.length
    : panel === "reliability" ? rounds.length
    : RENO_ROUNDS;
  const setCur =
    panel === "handshake" ? setShakeStep
    : panel === "reliability" ? setRelStep
    : setRenoStep;

  // keep the latest setter without re-creating the clock callback
  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    setCur((x) => {
      if (x >= maxStep) {
        setRunning(false);
        return x;
      }
      return x + 1;
    });
  };
  function doStep(): void {
    setRunning(false);
    setCur((x) => Math.min(maxStep, x + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setCur((x) => (x >= maxStep ? 0 : x)); // replay from the top if finished
    setRunning(true);
  }
  function onReset(): void {
    setRunning(false);
    setCur(0);
  }
  // handshake ~1.4/s (slow, it is only 3 beats); sawtooth ~3/s.
  const tps = (panel === "handshake" ? 1.4 : panel === "reliability" ? 1.8 : 3) * speed;
  useSimClock(running, tps, () => advanceRef.current());

  const status = useMemo(() => {
    if (mode === "boss") return "Wire Shark — diagnose three broken handshakes";
    if (panel === "handshake") {
      return shakeStep >= 3
        ? "handshake · established — every ack is the peer's seq + 1"
        : `handshake · ${shakeStep}/3 segments sent`;
    }
    if (panel === "reliability") {
      const r = rounds[Math.min(relStep, rounds.length) - 1];
      const head = `reliability · window ${window} · drop seg ${dropAt} · round ${Math.min(relStep, rounds.length)}/${rounds.length}`;
      return relStep >= rounds.length
        ? `${head} · delivered ${reliable.delivered}/${N_SEGS} · ${reliable.retransmissions} retransmits`
        : r ? `${head} · ${r.note}` : head;
    }
    const st = reno.states[Math.min(renoStep, RENO_ROUNDS)];
    return `congestion · round ${renoStep}/${RENO_ROUNDS} · cwnd ${st.cwnd} · ssthresh ${st.ssthresh} · ${st.phase}`;
  }, [mode, panel, shakeStep, relStep, renoStep, rounds, reliable, reno, window, dropAt]);

  return (
    <SimShell
      title="TCP, three ways — handshake, reliability, congestion"
      simKey="tcp-lab"
      kind="hero"
      accent={ACCENT}
      transport={mode === "lab" ? { running, onToggle, onStep: doStep, speed, onSpeed: setSpeed } : undefined}
      onReset={onReset}
      status={status}
      controls={
        <div className="tcp-ctl">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button type="button" className={cx("bit-segbtn", mode === "lab" && "on")} onClick={() => setMode("lab")} aria-pressed={mode === "lab"}>
              lab
            </button>
            <button type="button" className={cx("bit-segbtn", mode === "boss" && "on")} onClick={() => setMode("boss")} aria-pressed={mode === "boss"}>
              🦈 boss
            </button>
          </div>

          {mode === "lab" && (
            <div className="bit-seg tcp-panels" role="group" aria-label="Lab panel">
              {PANELS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cx("bit-segbtn", panel === p.id && "on")}
                  onClick={() => setPanel(p.id)}
                  aria-pressed={panel === p.id}
                  title={p.hint}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {mode === "lab" && panel === "reliability" && (
            <>
              <label className="ss-field tcp-slide">
                window
                <input
                  className="tcp-range"
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={window}
                  onChange={(e) => setWindow(Number(e.target.value))}
                  aria-label="Sender window size"
                />
                <span className="tcp-numval">{window}</span>
              </label>
              <label className="ss-field">
                drop segment
                <select aria-label="Which segment index is dropped" value={dropAt} onChange={(e) => setDropAt(Number(e.target.value))}>
                  {Array.from({ length: N_SEGS }, (_, i) => i + 1).map((v) => (
                    <option key={v} value={v}>#{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {mode === "lab" && panel === "congestion" && (
            <RenoInject rounds={RENO_ROUNDS} events={events} onChange={setEvents} />
          )}
        </div>
      }
      footer={
        mode === "boss" ? (
          <BossPanel bossWon={bossWon} />
        ) : panel === "handshake" ? (
          <HandshakeFoot handshake={handshake} step={shakeStep} />
        ) : panel === "reliability" ? (
          <ReliabilityFoot result={reliable} nSegs={N_SEGS} dropAt={dropAt} />
        ) : (
          <CongestionFoot state={reno.states[Math.min(renoStep, RENO_ROUNDS)]} ssthresh={RENO_SSTHRESH} />
        )
      }
    >
      {mode === "boss" ? (
        <BossStage />
      ) : panel === "handshake" ? (
        <Handshake handshake={handshake} step={shakeStep} reduced={reduced} />
      ) : panel === "reliability" ? (
        <Reliability rounds={rounds} step={relStep} nSegs={N_SEGS} window={window} dropAt={dropAt} reduced={reduced} />
      ) : (
        <Congestion cwnd={reno.cwnd} states={reno.states} ssthresh={RENO_SSTHRESH} step={Math.min(renoStep, RENO_ROUNDS)} events={events} reduced={reduced} />
      )}
    </SimShell>
  );
}

// ===========================================================================
// PANEL 1 — the 3-way handshake
// ===========================================================================
function Handshake({ handshake, step, reduced }: { handshake: Segment[]; step: number; reduced: boolean }) {
  const W = 640;
  const laneY = 62;
  const H = laneY + handshake.length * 74 + 26;
  const xClient = 120;
  const xServer = W - 120;

  const shown = handshake.slice(0, step);
  const summary =
    step >= 3
      ? "Handshake complete: SYN, SYN-ACK, ACK — the connection is established."
      : `Handshake in progress: ${step} of 3 segments exchanged.`;

  return (
    <div className="tcp-stage">
      <svg className={cx("tcp-hs-svg", !reduced && "tcp-anim")} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary}>
        <defs>
          <marker id="tcpArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* host headers */}
        <g className="tcp-host">
          <rect x={xClient - 58} y={14} width={116} height={30} rx={6} />
          <text x={xClient} y={34} textAnchor="middle" className="tcp-host-t">client</text>
        </g>
        <g className="tcp-host">
          <rect x={xServer - 58} y={14} width={116} height={30} rx={6} />
          <text x={xServer} y={34} textAnchor="middle" className="tcp-host-t">server</text>
        </g>

        {/* lifelines */}
        <line x1={xClient} y1={laneY - 8} x2={xClient} y2={H - 10} className="tcp-life" />
        <line x1={xServer} y1={laneY - 8} x2={xServer} y2={H - 10} className="tcp-life" />

        {handshake.map((seg, i) => {
          const y = laneY + i * 74 + 28;
          const fromClient = seg.from === "client";
          const x1 = fromClient ? xClient : xServer;
          const x2 = fromClient ? xServer : xClient;
          const isShown = i < step;
          const isLatest = i === step - 1;
          const color = seg.syn && seg.ack ? "var(--sem-state)" : seg.syn ? "var(--sem-data)" : "var(--sem-ok)";
          const mid = (x1 + x2) / 2;
          return (
            <g key={i} className={cx("tcp-seg", isShown && "on", isLatest && !reduced && "latest")} style={{ color, opacity: isShown ? 1 : 0.16 }}>
              <line x1={x1} y1={y} x2={x2 + (fromClient ? -10 : 10)} y2={y} className="tcp-seg-line" markerEnd="url(#tcpArrow)" />
              <g className="tcp-seg-badge">
                <rect x={mid - 42} y={y - 30} width={84} height={20} rx={5} />
                <text x={mid} y={y - 16} textAnchor="middle" className="tcp-seg-label">{seg.label}</text>
              </g>
              <text x={mid} y={y + 18} textAnchor="middle" className="tcp-seg-nums">
                seq={seg.seq}{seg.ack ? `  ack=${seg.ackNum}` : ""}
              </text>
              <text x={fromClient ? x1 + 6 : x1 - 6} y={y - 6} textAnchor={fromClient ? "start" : "end"} className="tcp-flag">
                {flagStr(seg)}
              </text>
            </g>
          );
        })}
      </svg>

      <ol className="tcp-hs-trace" aria-label="Segment trace">
        {handshake.map((seg, i) => (
          <li key={i} className={cx("tcp-trace-row", i < step && "on")}>
            <span className="tcp-trace-dir">{seg.from === "client" ? "→" : "←"}</span>
            <code className="tcp-trace-flags">{flagStr(seg)}</code>
            <code className="tcp-trace-seq">seq={seg.seq}</code>
            <code className="tcp-trace-ack">{seg.ack ? `ack=${seg.ackNum}` : "—"}</code>
            <span className="tcp-trace-note">{shown[i] ? handshakeNote(i) : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function handshakeNote(i: number): string {
  if (i === 0) return "opening SYN — no ack yet";
  if (i === 1) return "ack = clientISN + 1 (the SYN consumed one seq)";
  return "ack = serverISN + 1 — established";
}

function HandshakeFoot({ handshake, step }: { handshake: Segment[]; step: number }) {
  const syn = handshake[0];
  const synack = handshake[1];
  return (
    <div className="tcp-foot">
      <p className="tcp-explain">
        <b>A SYN consumes a sequence number.</b> The client opens with{" "}
        <code>seq={syn.seq}</code>; because that lone SYN counts as one byte of the stream, the server must acknowledge{" "}
        <code>{syn.seq} + 1 = {synack.ackNum}</code> — not <code>{syn.seq}</code>. The same rule runs the other way for the final ACK,
        so every acknowledgement is exactly <em>the peer's sequence number plus one</em>.
      </p>
      <div className="tcp-keyrow" aria-hidden="true">
        <Chip on={step >= 1} color="var(--sem-data)" k="SYN" v="opens · eats a seq" />
        <Chip on={step >= 2} color="var(--sem-state)" k="SYN-ACK" v="acks + opens back" />
        <Chip on={step >= 3} color="var(--sem-ok)" k="ACK" v="acks the peer SYN" />
      </div>
    </div>
  );
}

// ===========================================================================
// PANEL 2 — Go-Back-N reliability
// ===========================================================================
type GbnRound = {
  round: number;
  base: number; // first unacked segment this round
  sent: number[]; // segments put on the wire this round
  dropped: number; // segment that vanished this round, or -1
  ackUpTo: number; // cumulative ACK the receiver returns (highest in-order)
  note: string;
};

/**
 * Replay Go-Back-N round by round for the animation. Mirrors the engine's
 * runReliableTransfer loop exactly (same drop-once, same cumulative-ACK,
 * same base advance) so the visual and the engine's totals always agree.
 */
function buildGbnRounds(nSegs: number, window: number, dropAt: number): GbnRound[] {
  const dropped = new Set([dropAt]);
  const firedLoss = new Set<number>();
  const out: GbnRound[] = [];
  let base = 1;
  let guard = 0;
  const cap = (nSegs + 1) * 4 + 32;

  while (base <= nSegs && guard++ < cap) {
    let highestAcked = base - 1;
    const sent: number[] = [];
    let dropThisRound = -1;
    for (let seg = base; seg < base + window && seg <= nSegs; seg++) {
      sent.push(seg);
      if (dropped.has(seg) && !firedLoss.has(seg)) {
        firedLoss.add(seg);
        dropThisRound = seg;
        break; // receiver discards everything after the gap
      }
      highestAcked = seg;
    }
    const note =
      dropThisRound !== -1
        ? `seg ${dropThisRound} dropped → timeout, Go-Back-N from ${dropThisRound}`
        : highestAcked >= nSegs
          ? `cumulative ACK ${highestAcked} — all delivered`
          : `cumulative ACK ${highestAcked}, window slides`;
    out.push({ round: out.length + 1, base, sent, dropped: dropThisRound, ackUpTo: highestAcked, note });
    base = highestAcked + 1;
  }
  return out;
}

function Reliability({
  rounds,
  step,
  nSegs,
  window,
  dropAt,
  reduced,
}: {
  rounds: GbnRound[];
  step: number;
  nSegs: number;
  window: number;
  dropAt: number;
  reduced: boolean;
}) {
  // status of each segment after the revealed rounds
  const shown = rounds.slice(0, step);
  const delivered = shown.reduce((m, r) => Math.max(m, r.ackUpTo), 0);
  const active = shown[shown.length - 1];
  const droppedNow = active?.dropped ?? -1;

  const W = 640;
  const cell = Math.min(84, (W - 40) / nSegs);
  const gx = (i: number) => 20 + (i - 1) * cell;
  const trackY = 40;
  const H = trackY + 58 + rounds.length * 26 + 12;

  const segState = (seg: number): "delivered" | "dropped" | "inflight" | "pending" => {
    if (seg === droppedNow) return "dropped";
    if (seg <= delivered) return "delivered";
    if (active && active.sent.includes(seg)) return "inflight";
    return "pending";
  };
  const SEG_FILL: Record<string, string> = {
    delivered: "var(--sem-ok)",
    dropped: "var(--sem-err)",
    inflight: "var(--sem-data)",
    pending: "var(--line)",
  };

  const summary = `Go-Back-N: ${nSegs} segments, window ${window}, segment ${dropAt} dropped. ` +
    `${delivered} delivered after ${step} of ${rounds.length} rounds.`;

  return (
    <div className="tcp-stage">
      <svg className={cx("tcp-rel-svg", !reduced && "tcp-anim")} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary}>
        {/* segment lane */}
        {Array.from({ length: nSegs }, (_, k) => k + 1).map((seg) => {
          const s = segState(seg);
          const x = gx(seg);
          return (
            <g key={seg} className={cx("tcp-cell", `is-${s}`)}>
              <rect x={x} y={trackY} width={cell - 8} height={38} rx={6} fill={SEG_FILL[s]} opacity={s === "pending" ? 0.22 : 0.9} />
              <text x={x + (cell - 8) / 2} y={trackY + 23} textAnchor="middle" className="tcp-cell-t" style={{ fill: s === "pending" ? "var(--tx3)" : "var(--bg)" }}>
                {seg}
              </text>
              {s === "dropped" && <text x={x + (cell - 8) / 2} y={trackY - 6} textAnchor="middle" className="tcp-cell-x">✕ lost</text>}
              {s === "delivered" && <text x={x + (cell - 8) / 2} y={trackY - 6} textAnchor="middle" className="tcp-cell-ok">✓</text>}
            </g>
          );
        })}

        {/* the sliding window bracket over the active round's base..base+window */}
        {active && (
          <g className={cx("tcp-winbracket", !reduced && "slide")}>
            <rect
              x={gx(active.base) - 4}
              y={trackY - 4}
              width={Math.min(window, nSegs - active.base + 1) * cell + 0}
              height={46}
              rx={8}
            />
            <text x={gx(active.base) - 2} y={trackY + 58} className="tcp-win-lbl">window · base {active.base}</text>
          </g>
        )}

        {/* per-round log */}
        {rounds.map((r, i) => {
          const y = trackY + 58 + 16 + i * 26;
          const on = i < step;
          const isLatest = i === step - 1;
          return (
            <g key={i} className={cx("tcp-roundrow", on && "on", isLatest && "latest")} style={{ opacity: on ? 1 : 0.28 }}>
              <text x={20} y={y} className="tcp-round-n">R{r.round}</text>
              <text x={64} y={y} className="tcp-round-sent">send [{r.sent.join(", ")}]</text>
              <text x={W - 20} y={y} textAnchor="end" className={cx("tcp-round-note", r.dropped !== -1 && "bad")}>{r.note}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ReliabilityFoot({ result, nSegs, dropAt }: { result: ReturnType<typeof runReliableTransfer>; nSegs: number; dropAt: number }) {
  return (
    <div className="tcp-foot">
      <p className="tcp-explain">
        <b>Loss is recovered, not ignored.</b> Segment <code>{dropAt}</code> vanishes once; the receiver keeps re-acking the last
        in-order byte, so the sender's timer expires and it goes back to the gap and resends from there. Cumulative ACKs mean
        everything after the hole is sent again — the price of guaranteed, in-order delivery.
      </p>
      <div className="tcp-stats" role="group" aria-label="Transfer totals">
        <Stat k="delivered" v={`${result.delivered}/${nSegs}`} tone="ok" />
        <Stat k="transmissions" v={result.transmissions} />
        <Stat k="retransmits" v={result.retransmissions} tone={result.retransmissions > 0 ? "warn" : undefined} />
        <Stat k="rounds" v={result.rounds} />
      </div>
    </div>
  );
}

// ===========================================================================
// PANEL 3 — the Reno congestion sawtooth
// ===========================================================================
function RenoInject({ rounds, events, onChange }: { rounds: number; events: Record<number, RenoEvent>; onChange: (e: Record<number, RenoEvent>) => void }) {
  const [round, setRound] = useState(6);
  const [kind, setKind] = useState<Exclude<RenoEvent, "ack">>("triple-dup");

  function inject(): void {
    onChange({ ...events, [round]: kind });
  }
  function clearAll(): void {
    onChange({});
  }

  return (
    <>
      <label className="ss-field tcp-slide">
        at round
        <input
          className="tcp-range"
          type="range"
          min={1}
          max={rounds}
          step={1}
          value={round}
          onChange={(e) => setRound(Number(e.target.value))}
          aria-label="Round to inject a congestion event at"
        />
        <span className="tcp-numval">{round}</span>
      </label>
      <label className="ss-field">
        event
        <select aria-label="Congestion event kind" value={kind} onChange={(e) => setKind(e.target.value as Exclude<RenoEvent, "ack">)}>
          <option value="triple-dup">triple-dup (halve)</option>
          <option value="timeout">timeout (→ 1)</option>
        </select>
      </label>
      <button type="button" className="btn" onClick={inject} aria-label="Inject congestion event">+ inject</button>
      <button type="button" className="btn" onClick={clearAll} aria-label="Clear injected events" disabled={Object.keys(events).length === 0}>clear</button>
    </>
  );
}

function Congestion({
  cwnd,
  states,
  ssthresh,
  step,
  events,
  reduced,
}: {
  cwnd: number[];
  states: RenoState[];
  ssthresh: number;
  step: number;
  events: Record<number, RenoEvent>;
  reduced: boolean;
}) {
  const W = 660;
  const H = 320;
  const padL = 40;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const rounds = cwnd.length - 1; // x from 0..rounds
  const maxCwnd = Math.max(ssthresh + 2, ...cwnd, 4);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const X = (r: number) => padL + (r / rounds) * plotW;
  const Y = (v: number) => padT + plotH - (v / maxCwnd) * plotH;

  // area/line only up to the reveal cursor
  const pts = cwnd.slice(0, step + 1).map((v, r) => ({ x: X(r), y: Y(v), v, r }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = pts.length > 1 ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${Y(0)} L ${pts[0].x.toFixed(1)} ${Y(0)} Z` : "";

  // shade congestion-avoidance rounds (phase of the state entering that round)
  const caSpans: { x0: number; x1: number }[] = [];
  for (let r = 1; r <= step; r++) {
    if (states[r].phase === "congestion-avoidance") caSpans.push({ x0: X(r - 1), x1: X(r) });
  }

  const yTicks = niceTicks(maxCwnd);
  const cursor = states[step];
  const summary =
    `TCP Reno cwnd over ${rounds} RTT rounds. Now at round ${step}: cwnd ${cursor.cwnd} MSS, ssthresh ${cursor.ssthresh}, ${cursor.phase}.`;

  return (
    <div className="tcp-stage">
      <svg className={cx("tcp-cong-svg", !reduced && "tcp-anim")} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={summary}>
        <defs>
          <linearGradient id="tcpCwndFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sem-data)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--sem-data)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* congestion-avoidance shading (behind the grid) */}
        {caSpans.map((s, i) => (
          <rect key={i} className="tcp-ca-band" x={s.x0} y={padT} width={s.x1 - s.x0} height={plotH} />
        ))}

        {/* y grid + labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL} y1={Y(v)} x2={W - padR} y2={Y(v)} className="tcp-grid" />
            <text x={padL - 6} y={Y(v) + 3.5} textAnchor="end" className="tcp-axis-lbl">{v}</text>
          </g>
        ))}
        {/* x labels (every other round to avoid crowding) */}
        {Array.from({ length: rounds + 1 }, (_, r) => r).filter((r) => r % 2 === 0).map((r) => (
          <text key={r} x={X(r)} y={H - padB + 15} textAnchor="middle" className="tcp-axis-lbl">{r}</text>
        ))}
        <text x={padL - 26} y={padT + plotH / 2} textAnchor="middle" transform={`rotate(-90 ${padL - 26} ${padT + plotH / 2})`} className="tcp-axis-title">cwnd (MSS)</text>
        <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" className="tcp-axis-title">RTT round</text>

        {/* ssthresh line — the frontier between slow-start and AIMD */}
        <line x1={padL} y1={Y(cursor.ssthresh)} x2={W - padR} y2={Y(cursor.ssthresh)} className="tcp-ssthresh" />
        <text x={W - padR} y={Y(cursor.ssthresh) - 5} textAnchor="end" className="tcp-ssthresh-lbl">ssthresh = {cursor.ssthresh}</text>

        {/* area + line */}
        {areaPath && <path d={areaPath} fill="url(#tcpCwndFill)" className="tcp-area" />}
        {linePath && <path d={linePath} fill="none" className="tcp-line" />}

        {/* per-round dots, event markers */}
        {pts.map((p) => {
          const ev = events[p.r];
          const phase = states[p.r].phase;
          return (
            <g key={p.r} className={cx("tcp-dot", ev && "is-event", p.r === step && "is-cursor")}>
              <circle cx={p.x} cy={p.y} r={p.r === step ? 4.5 : 3} style={{ fill: phase === "slow-start" ? "var(--sem-data)" : "var(--sem-state)" }} />
              {ev && (
                <>
                  <line x1={p.x} y1={p.y} x2={p.x} y2={padT} className={cx("tcp-evline", ev === "timeout" ? "to" : "td")} />
                  <text x={p.x} y={padT - 3} textAnchor="middle" className={cx("tcp-evlbl", ev === "timeout" ? "to" : "td")}>
                    {ev === "timeout" ? "timeout" : "3-dup"}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* current cwnd read-out at the cursor */}
        {step > 0 && (
          <g className="tcp-readout">
            <circle cx={X(step)} cy={Y(cursor.cwnd)} r={7} className="tcp-readdot" />
            <text x={X(step)} y={Y(cursor.cwnd) - 12} textAnchor="middle" className="tcp-readval">{cursor.cwnd}</text>
          </g>
        )}
      </svg>

      <div className="tcp-phase-legend" aria-hidden="true">
        <span className="tcp-leg"><span className="tcp-leg-sw" style={{ background: "var(--sem-data)" }} /> slow-start (×2 / RTT)</span>
        <span className="tcp-leg"><span className="tcp-leg-sw tcp-leg-band" /> congestion-avoidance (+1 / RTT)</span>
        <span className="tcp-leg"><span className="tcp-leg-sw tcp-leg-td" /> triple-dup → halve</span>
        <span className="tcp-leg"><span className="tcp-leg-sw tcp-leg-to" /> timeout → cwnd 1</span>
      </div>
    </div>
  );
}

function CongestionFoot({ state, ssthresh }: { state: RenoState; ssthresh: number }) {
  return (
    <div className="tcp-foot">
      <p className="tcp-explain">
        <b>Additive-increase, multiplicative-decrease.</b> cwnd doubles every RTT in <em>slow-start</em> until it hits ssthresh
        (starts at {ssthresh}), then climbs by one MSS per RTT in <em>congestion-avoidance</em>. A <b className="tcp-td-tx">triple-dup</b> means
        one packet was lost but ACKs still flow, so Reno halves cwnd and stays linear (fast recovery). A <b className="tcp-to-tx">timeout</b> is
        the pipe going quiet — the harsh reset to cwnd 1, back to slow-start. That is the sawtooth.
      </p>
      <div className="tcp-stats" role="group" aria-label="Current Reno state">
        <Stat k="round" v={state.round} />
        <Stat k="cwnd" v={`${state.cwnd} MSS`} tone="data" />
        <Stat k="ssthresh" v={state.ssthresh} />
        <Stat k="phase" v={state.phase === "slow-start" ? "slow-start" : "cong-avoid"} tone={state.phase === "slow-start" ? "data" : "state"} />
      </div>
    </div>
  );
}

// ===========================================================================
// BOSS — "Wire Shark": diagnose three broken handshakes
// ===========================================================================
function BossStage() {
  return (
    <div className="tcp-boss-stage" aria-hidden="true">
      <div className="tcp-boss-hero">
        <span className="tcp-boss-shark">🦈</span>
        <div>
          <div className="tcp-boss-name">Wire Shark</div>
          <div className="tcp-boss-tag">read the packets · name the bug</div>
        </div>
      </div>
      <p className="tcp-boss-lead">
        Three captured handshakes below each have exactly one broken field. Compare each segment's <code>seq</code> and{" "}
        <code>ack</code> against the rule — every ack is the peer's sequence number plus one — and diagnose the fault.
      </p>
    </div>
  );
}

function BossPanel({ bossWon }: { bossWon: boolean }) {
  const [picks, setPicks] = useState<Record<string, TcpFault | "">>({});
  const [checked, setChecked] = useState(false);

  const results = useMemo(() => {
    if (!checked) return null;
    return BOSS_TRACES.map((bt) => {
      const chosen = picks[bt.id];
      if (!chosen) return { id: bt.id, passed: false, correctFault: gradeHandshakeBoss(bt.id, "none").correctFault, answered: false };
      const g = gradeHandshakeBoss(bt.id, chosen);
      return { id: bt.id, passed: g.passed, correctFault: g.correctFault, answered: true };
    });
  }, [checked, picks]);

  const allDone = results?.every((r) => r.passed) ?? false;

  function check(): void {
    setChecked(true);
    const solved = BOSS_TRACES.every((bt) => {
      const chosen = picks[bt.id];
      return chosen ? gradeHandshakeBoss(bt.id, chosen).passed : false;
    });
    if (solved) markChallengeDone("boss-p7");
  }

  const won = allDone || bossWon;
  const answeredCount = BOSS_TRACES.filter((bt) => picks[bt.id]).length;

  return (
    <div className={cx("tcp-boss", won && "tcp-boss--won")}>
      <div className="tcp-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Wire Shark</strong>
        <span className="tcp-muted">badge: 🦈 Wire Shark {bossWon && "✓ earned"}</span>
      </div>

      <div className="tcp-cases">
        {BOSS_TRACES.map((bt) => {
          const res = results?.find((r) => r.id === bt.id) ?? null;
          return (
            <BossCase
              key={bt.id}
              id={bt.id}
              title={bt.title}
              trace={bt.trace}
              chosen={picks[bt.id] ?? ""}
              onPick={(f) => { setPicks((p) => ({ ...p, [bt.id]: f })); setChecked(false); }}
              result={res}
            />
          );
        })}
      </div>

      <div className="tcp-boss-actions">
        <button type="button" className="btn btn-primary" onClick={check} disabled={answeredCount < BOSS_TRACES.length}>
          ▶ diagnose all
        </button>
        {answeredCount < BOSS_TRACES.length && (
          <span className="tcp-muted">pick a fault for all {BOSS_TRACES.length} traces</span>
        )}
      </div>

      {(won) && (
        <div className="tcp-boss-badge" role="status">
          <span aria-hidden="true">🦈</span> <b>Wire Shark earned</b> — you read the sequence numbers and pinned every bug.
        </div>
      )}
      {checked && !won && results && (
        <p className="tcp-verdict no" role="status">
          {results.filter((r) => r.passed).length}/{BOSS_TRACES.length} correct — re-read the ack numbers on the ones still marked wrong.
        </p>
      )}

      <details className="tcp-hint">
        <summary>hint — the three rules a handshake must obey</summary>
        <p>
          (1) the opening segment is a <b>lone SYN</b> (no ACK flag). (2) the reply must set <b>both SYN and ACK</b>, and its{" "}
          <code>ackNum</code> must be <b>clientISN + 1</b> — the SYN ate a sequence number. (3) the final segment is a <b>pure ACK</b>
          whose <code>ackNum</code> is <b>serverISN + 1</b> and whose own <code>seq</code> is <b>clientISN + 1</b>. Whichever of these
          fails first is the fault.
        </p>
      </details>
    </div>
  );
}

function BossCase({
  id,
  title,
  trace,
  chosen,
  onPick,
  result,
}: {
  id: string;
  title: string;
  trace: Segment[];
  chosen: TcpFault | "";
  onPick: (f: TcpFault) => void;
  result: { passed: boolean; correctFault: TcpFault; answered: boolean } | null;
}) {
  const verdict = result ? (result.passed ? "ok" : "no") : null;
  return (
    <div className={cx("tcp-case", verdict === "ok" && "is-ok", verdict === "no" && "is-no")}>
      <div className="tcp-case-head">
        <span className="tcp-case-title">{title}</span>
        {verdict === "ok" && <span className="tcp-case-verdict ok">✓ diagnosed</span>}
        {verdict === "no" && <span className="tcp-case-verdict no">✕ not it</span>}
      </div>

      <ol className="tcp-case-trace" aria-label={`Captured trace: ${title}`}>
        {trace.map((seg, i) => (
          <li key={i} className="tcp-case-row">
            <span className="tcp-case-dir">{seg.from === "client" ? "client →" : "← server"}</span>
            <code className="tcp-case-flags">{flagStr(seg)}</code>
            <code className="tcp-case-seq">seq={seg.seq}</code>
            <code className="tcp-case-ack">{seg.ack ? `ack=${seg.ackNum}` : "ack=—"}</code>
          </li>
        ))}
      </ol>

      <fieldset className="tcp-faults">
        <legend>diagnosis for “{title}”</legend>
        {FAULTS.map((f) => (
          <label key={f.id} className={cx("tcp-fault", chosen === f.id && "on")}>
            <input
              type="radio"
              name={`fault-${id}`}
              value={f.id}
              checked={chosen === f.id}
              onChange={() => onPick(f.id)}
            />
            <span className="tcp-fault-label">{f.label}</span>
          </label>
        ))}
      </fieldset>

      {verdict === "no" && result && (
        <p className="tcp-case-tell" role="status">
          correct diagnosis: <b>{faultById(result.correctFault).label}</b> — {faultById(result.correctFault).blurb}
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// tiny shared bits
// ===========================================================================
function Chip({ on, color, k, v }: { on: boolean; color: string; k: string; v: string }) {
  return (
    <span className={cx("tcp-chip", on && "on")} style={{ ["--c" as string]: color }}>
      <b>{k}</b> <span>{v}</span>
    </span>
  );
}

function Stat({ k, v, tone }: { k: string; v: string | number; tone?: "ok" | "warn" | "data" | "state" }) {
  return (
    <div className={cx("tcp-stat", tone && `is-${tone}`)}>
      <span className="tcp-stat-k">{k}</span>
      <span className="tcp-stat-v">{v}</span>
    </div>
  );
}

function flagStr(seg: Segment): string {
  const flags = [seg.syn && "SYN", seg.ack && "ACK"].filter(Boolean);
  return flags.length ? flags.join("+") : "—";
}

function niceTicks(max: number): number[] {
  const step = max <= 8 ? 2 : max <= 20 ? 4 : 8;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  return out;
}
