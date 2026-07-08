// [fig] logical-clocks (ch.30) — Lamport's logical clocks: no shared clock, so
// each process keeps a counter and bumps it before a local event or send, and
// to max(mine, received)+1 on receive. That guarantees C(a) < C(b) whenever
// a happens-before b — the arrows in this figure always climb. But the
// converse fails: two timestamps can be ordered even when the events are
// CONCURRENT (neither happens-before the other), which is exactly why vector
// clocks exist. Every timestamp and every happens-before/concurrent claim
// comes straight from runLamport()/happensBefore()/concurrent() in
// ../sims/dist/clocks.ts — nothing is recomputed here. Stepped SVG (§6); never
// a GIF in-app. Prefix: lclk-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import { runLamport, happensBefore, concurrent, CANONICAL } from "../sims/dist/clocks.ts";
import type { StampedEvent } from "../sims/dist/clocks.ts";
import "../../theme/_p8css/logical-clocks.css";

const ACCENT = "#60A5FA";

const VB_W = 720;
const VB_H = 340;

// The canonical 3-process, 6-event, 2-message scenario the engine ships.
const RES = runLamport(CANONICAL);
const [A, B, C, D, E, F] = RES.events; // indices 0..5, in spec order

// Lane geometry — three horizontal process timelines.
const LANE_X0 = 90;
const LANE_X1 = 660;
const LANE_Y = [72, 176, 280]; // proc 0, 1, 2
const PROC_NAME = ["process 0", "process 1", "process 2"];

// Per-process event slots, evenly spaced along the lane by LOCAL order (not by
// timestamp) — with only 1-2 events per lane this stays legible and avoids
// two same-timestamp events (a and e are both ts=1) colliding on screen.
const SLOT_X: Record<number, number> = {
  [A.index]: 220, // proc 0, slot 1
  [B.index]: 420, // proc 0, slot 2
  [C.index]: 420, // proc 1, slot 1 (receives m1 alongside b's column)
  [D.index]: 560, // proc 1, slot 2
  [E.index]: 300, // proc 2, slot 1
  [F.index]: 620, // proc 2, slot 2
};

function laneY(procIdx: number): number {
  return LANE_Y[procIdx];
}

function note(text: string): ReactNode {
  return (
    <text x={24} y={326} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
      {text}
    </text>
  );
}

// ---- small SVG primitives ----

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="lclk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-control)" />
      </marker>
      <marker id="lclk-arrow-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-err)" />
      </marker>
    </defs>
  );
}

// The three empty process lanes, always drawn as the base layer.
function Lanes({ upTo }: { upTo: number }): ReactNode {
  return (
    <g fontFamily="var(--font-mono)">
      {LANE_Y.map((y, i) => (
        <g key={i} className={i <= upTo ? "lclk-lane is-on" : "lclk-lane"}>
          <line x1={LANE_X0} y1={y} x2={LANE_X1} y2={y} />
          <text x={LANE_X0 - 12} y={y + 4} textAnchor="end" className="lclk-lane-lbl">
            {PROC_NAME[i]}
          </text>
        </g>
      ))}
    </g>
  );
}

// One event dot with its label and Lamport timestamp.
function EventDot({
  e,
  hot,
  dim,
}: {
  e: StampedEvent;
  hot?: boolean;
  dim?: boolean;
}): ReactNode {
  const x = SLOT_X[e.index];
  const y = laneY(e.proc);
  return (
    <g className={dim ? "lclk-evt is-dim" : hot ? "lclk-evt is-hot" : "lclk-evt"} fontFamily="var(--font-mono)">
      <circle cx={x} cy={y} r={hot ? 12 : 10} />
      <text x={x} y={y + 4.5} textAnchor="middle" className="lclk-evt-label">
        {e.label}
      </text>
      <text x={x} y={y - 20} textAnchor="middle" className="lclk-evt-ts">
        C={e.ts}
      </text>
    </g>
  );
}

// A message arrow from a send event to a recv event, possibly across lanes.
// `hot` draws it emphasized (used to call out that it "climbs": send ts <
// recv ts).
function MessageArrow({
  send,
  recv,
  msg,
  hot,
}: {
  send: StampedEvent;
  recv: StampedEvent;
  msg: string;
  hot?: boolean;
}): ReactNode {
  const x1 = SLOT_X[send.index];
  const y1 = laneY(send.proc) + (send.proc < recv.proc ? 12 : -12);
  const x2 = SLOT_X[recv.index];
  const y2 = laneY(recv.proc) + (send.proc < recv.proc ? -12 : 12);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g className={hot ? "lclk-msg is-hot" : "lclk-msg"} fontFamily="var(--font-mono)">
      <path d={`M ${x1} ${y1} L ${x2} ${y2}`} markerEnd={hot ? "url(#lclk-arrow-hot)" : "url(#lclk-arrow)"} />
      <text x={mx} y={my - 8} textAnchor="middle" className="lclk-msg-lbl">
        {msg}: C={send.ts} → C={recv.ts}
      </text>
    </g>
  );
}

// A dashed link (not a message) drawn between two concurrent events to show
// that neither happens-before the other, despite ordered timestamps.
function ConcurrentLink({ x, e1, e2 }: { x: number; e1: StampedEvent; e2: StampedEvent }): ReactNode {
  const x1 = SLOT_X[e1.index];
  const y1 = laneY(e1.proc);
  const x2 = SLOT_X[e2.index];
  const y2 = laneY(e2.proc);
  return (
    <g className="lclk-conc" fontFamily="var(--font-mono)">
      <path d={`M ${x1} ${y1} C ${x} ${y1} ${x} ${y2} ${x2} ${y2}`} />
      <text x={x + 14} y={(y1 + y2) / 2} className="lclk-conc-lbl">
        concurrent
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frames. Each caption states a fact derived from RES via happensBefore /
// concurrent — nothing about ordering is hard-coded prose.
// ---------------------------------------------------------------------------
const m1Climbs = B.ts < C.ts; // send b → recv c always climbs by the clock condition
const m2Climbs = D.ts < F.ts;
const eBeforeB = happensBefore(RES, E.index, B.index);
const bBeforeE = happensBefore(RES, B.index, E.index);
const eConcurrentB = concurrent(RES, E.index, B.index);

const FRAMES: Frame[] = [
  // 0 — three empty timelines
  {
    caption:
      "Three processes, no shared clock. Each keeps its own counter. Lamport's rule: bump it before every local event or send; on receiving a message stamped C, jump to max(mine, C) + 1. Watch the six events land and see whether the counters still agree on an order.",
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={-1} />
        {note("rule: local/send → C += 1 · receive(msg C) → C = max(mine, C) + 1")}
      </g>
    ),
  },

  // 1 — proc 0: a=1, then send b=2
  {
    caption: `Process 0 starts. Local event a bumps its counter to C(a)=${A.ts}. Then it sends message m1 — another bump before sending — so b is stamped C(b)=${B.ts}. The message m1 carries that timestamp to whoever receives it.`,
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={0} />
        <EventDot e={A} />
        <EventDot e={B} hot />
      </g>
    ),
  },

  // 2 — proc 1 receives m1 → c = max(0,2)+1 = 3, then sends d=4
  {
    caption: `Process 1 receives m1 (stamped C=${B.ts}). Its own counter was 0, so it jumps to max(0, ${B.ts}) + 1 = ${C.ts} — event c. The message arrow climbs: C(b)=${B.ts} < C(c)=${C.ts}, exactly as the clock condition requires. Then process 1 sends m2, bumping to C(d)=${D.ts}.`,
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={1} />
        <EventDot e={A} dim />
        <EventDot e={B} dim />
        <MessageArrow send={B} recv={C} msg="m1" hot={m1Climbs} />
        <EventDot e={C} />
        <EventDot e={D} hot />
      </g>
    ),
  },

  // 3 — proc 2: e = 1
  {
    caption: `Meanwhile process 2 has been idle. Its first event, e, is purely local: counter 0 → C(e)=${E.ts}. Notice e's timestamp is small — process 2 hasn't heard from anyone yet, so its counter has no reason to be large.`,
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={2} />
        <EventDot e={A} dim />
        <EventDot e={B} dim />
        <MessageArrow send={B} recv={C} msg="m1" />
        <EventDot e={C} dim />
        <EventDot e={D} dim />
        <EventDot e={E} hot />
      </g>
    ),
  },

  // 4 — proc 2 receives m2 → f = max(1,4)+1 = 5
  {
    caption: `Process 2 receives m2 (stamped C=${D.ts}). Its counter was ${E.ts} (from e), so it jumps to max(${E.ts}, ${D.ts}) + 1 = ${F.ts} — event f. Again the arrow climbs: C(d)=${D.ts} < C(f)=${F.ts}. Every message in this run obeys the same rule.`,
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={2} />
        <EventDot e={A} dim />
        <EventDot e={B} dim />
        <MessageArrow send={B} recv={C} msg="m1" />
        <EventDot e={C} dim />
        <EventDot e={D} dim />
        <MessageArrow send={D} recv={F} msg="m2" hot={m2Climbs} />
        <EventDot e={E} dim />
        <EventDot e={F} hot />
      </g>
    ),
  },

  // 5 — the payoff: e and b are concurrent, yet C(e) < C(b)
  {
    caption: `Here's the catch. e and b${eConcurrentB ? " are CONCURRENT" : ""}: ${!eBeforeB ? "no chain of local steps or messages makes e → b" : "e → b"}, and ${!bBeforeE ? "none makes b → e" : "b → e"} either — yet C(e)=${E.ts} < C(b)=${B.ts}. A smaller Lamport timestamp does NOT mean "happened first": C(x) < C(y) only proves x → y once you already know one direction holds. That gap — order without causality — is why vector clocks (Fidge & Mattern, 1988) exist: they can detect concurrency, not just impose a total order.`,
    render: () => (
      <g>
        <Defs />
        <Lanes upTo={2} />
        <EventDot e={A} dim />
        <MessageArrow send={B} recv={C} msg="m1" />
        <EventDot e={C} dim />
        <EventDot e={D} dim />
        <MessageArrow send={D} recv={F} msg="m2" />
        <EventDot e={F} dim />
        <ConcurrentLink x={160} e1={B} e2={E} />
        <EventDot e={B} hot />
        <EventDot e={E} hot />
        <text x={LANE_X0} y={40} className="lclk-callout">
          {`C(e)=${E.ts} < C(b)=${B.ts}, but e and b are concurrent — order ≠ causality`}
        </text>
      </g>
    ),
  },
];

export default function LogicalClocks() {
  return (
    <FigureStepper
      title="Lamport clocks — order without a shared clock (and where it lies)"
      figKey="logical-clocks"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
