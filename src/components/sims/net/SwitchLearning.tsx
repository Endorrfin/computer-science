// [micro] switch-learning — ch.26 "How networks work". A LAN toy: one Ethernet
// switch, four ports, four hosts (A–D). A switch boots knowing nothing, so the
// first time it must reach an unknown host it FLOODS the frame out every other
// port. But every frame it sees teaches it one thing — the source MAC now lives
// on the ingress port — so its MAC table fills, and soon it can FORWARD straight
// to the right port instead. Step a preset conversation through it and watch the
// "floods so far" counter climb, then flatline once everyone is learned. Every
// decision comes verbatim from runSwitch() in ./switching.ts (the tested engine);
// nothing is recomputed here. Reduced motion → Step only.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { runSwitch, floodCount } from "./switching.ts";
import type { Frame, SwitchStep } from "./switching.ts";
import "../../../theme/_p7css/switch-learning.css";

const ACCENT = "#38bdf8";
const N_PORTS = 4;
const HOSTS = ["A", "B", "C", "D"] as const; // host on port === index

// A conversation that shows the whole arc: flood → learn → forward. Floods
// happen only while the destination is still unknown, so the "floods so far"
// counter climbs to 2 early, then flatlines once every host is in the table.
//  1. A→B  B unknown         → FLOOD    (A learned on p0)   floods 1
//  2. B→A  A already known   → FORWARD  (B learned on p1)   floods 1
//  3. C→D  D unknown         → FLOOD    (C learned on p2)   floods 2
//  4. D→C  C already known   → FORWARD  (D learned on p3)   floods 2  — table full
//  5. A→C  C known           → FORWARD                       floods 2
//  6. D→B  B known           → FORWARD                       floods 2  (never floods again)
const DEFAULT_FRAMES: Frame[] = [
  { src: "A", dst: "B", inPort: 0 },
  { src: "B", dst: "A", inPort: 1 },
  { src: "C", dst: "D", inPort: 2 },
  { src: "D", dst: "C", inPort: 3 },
  { src: "A", dst: "C", inPort: 0 },
  { src: "D", dst: "B", inPort: 3 },
];

export default function SwitchLearning() {
  const reduced = useReducedMotion();

  const steps = useMemo<SwitchStep[]>(() => runSwitch(DEFAULT_FRAMES, N_PORTS), []);
  const totalFloods = useMemo(() => floodCount(steps), [steps]);

  // cursor -1 = idle (before the first frame); 0…n-1 = that frame has been processed.
  const [cursor, setCursor] = useState(-1);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const atEnd = cursor >= steps.length - 1;
  const step = cursor >= 0 ? steps[cursor] : null;
  const nextFrame = cursor + 1 < steps.length ? steps[cursor + 1].frame : null;

  // Floods so far, counting only frames processed up to and including the cursor.
  const floodsSoFar = useMemo(
    () => steps.slice(0, cursor + 1).filter((s) => s.action === "flood").length,
    [steps, cursor],
  );
  // The MAC table snapshot after the current frame (empty at idle).
  const EMPTY_TABLE = useMemo<SwitchStep["table"]>(() => [], []);
  const table = step ? step.table : EMPTY_TABLE;
  const known = useMemo(() => new Map(table.map((e) => [e.mac, e.port])), [table]);

  function advance(): void {
    setCursor((c) => Math.min(steps.length - 1, c + 1));
  }
  useSimClock(running, 1.4 * speed, () => {
    setCursor((c) => {
      if (c >= steps.length - 1) {
        setRunning(false);
        return c;
      }
      return c + 1;
    });
  });

  function onToggle(): void {
    if (reduced) return;
    if (!running && atEnd) {
      setCursor(-1); // replay from the top
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
    setCursor(-1);
  }

  const status = step
    ? `frame ${cursor + 1}/${steps.length}: ${step.frame.src}→${step.frame.dst} · ` +
      `${step.action === "flood" ? "FLOOD (dst unknown)" : `FORWARD → port ${step.outPorts[0]}`} · ` +
      `floods ${floodsSoFar}/${totalFloods} · table ${table.length}/${HOSTS.length}`
    : `idle — table empty. ${nextFrame ? `next: ${nextFrame.src}→${nextFrame.dst}` : ""}`;

  return (
    <SimShell
      title="Learning switch — flood, then forward"
      simKey="switch-learning"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      footer={
        <div className="sw-foot">
          <MacTable table={table} activeMac={step?.learned?.mac ?? null} />
          <FloodMeter floodsSoFar={floodsSoFar} total={totalFloods} atEnd={atEnd} />
        </div>
      }
    >
      <div className="sw-stage">
        <Fabric
          step={step}
          known={known}
          nextFrame={nextFrame}
          reduced={reduced}
        />
        <FrameStrip steps={steps} cursor={cursor} onPick={(i) => { setRunning(false); setCursor(i); }} />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// The switch fabric: a central switch box with four ports fanning out to hosts.
// Egress ports for the current frame light up; ingress is marked; known hosts
// carry a small port badge from the MAC table.
// ---------------------------------------------------------------------------
function Fabric({
  step,
  known,
  nextFrame,
  reduced,
}: {
  step: SwitchStep | null;
  known: Map<string, number>;
  nextFrame: Frame | null;
  reduced: boolean;
}) {
  const W = 620;
  const H = 300;
  const cx0 = W / 2;
  const cy0 = H / 2;
  const swW = 168;
  const swH = 96;

  // Host anchor positions: two per side (top-left, top-right, bottom-left, …).
  // Port index === host index (A=0 top-left, B=1 top-right, C=2 bottom-left, D=3 bottom-right).
  const HOST_POS = [
    { x: 96, y: 56 }, // A / port 0
    { x: W - 96, y: 56 }, // B / port 1
    { x: 96, y: H - 56 }, // C / port 2
    { x: W - 96, y: H - 56 }, // D / port 3
  ];
  // Where each port sits on the switch edge, aligned to its host corner.
  const PORT_POS = [
    { x: cx0 - swW / 2, y: cy0 - 26 }, // 0 left-top
    { x: cx0 + swW / 2, y: cy0 - 26 }, // 1 right-top
    { x: cx0 - swW / 2, y: cy0 + 26 }, // 2 left-bottom
    { x: cx0 + swW / 2, y: cy0 + 26 }, // 3 right-bottom
  ];

  const ingress = step ? step.frame.inPort : nextFrame ? nextFrame.inPort : -1;
  const egress = new Set(step ? step.outPorts : []);
  const isFlood = step?.action === "flood";
  const learnedPort = step?.learned?.port ?? -1;

  const label = step
    ? `Switch ${step.action === "flood" ? "flooding" : "forwarding"} frame ${step.frame.src}→${step.frame.dst}` +
      (step.action === "flood"
        ? ` out ports ${step.outPorts.join(", ")} (destination not in table).`
        : ` out port ${step.outPorts[0]} only (destination learned).`)
    : "Ethernet switch with four ports; MAC table empty, ready for the first frame.";

  return (
    <div className="sw-fabric">
      <svg
        className={cx("sw-svg", !reduced && "sw-anim", isFlood && "sw-is-flood")}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
      >
        <defs>
          <marker id="sw-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-data)" />
          </marker>
          <marker id="sw-arrow-in" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-control)" />
          </marker>
        </defs>

        {/* wires host↔port; egress wires carry the frame color */}
        {HOSTS.map((h, i) => {
          const hp = HOST_POS[i];
          const pp = PORT_POS[i];
          const isIn = i === ingress;
          const isOut = egress.has(i);
          const stroke = isIn
            ? "var(--sem-control)"
            : isOut
              ? "var(--sem-data)"
              : "var(--line)";
          const mid = { x: (hp.x + pp.x) / 2, y: (hp.y + pp.y) / 2 };
          return (
            <g key={`wire-${h}`}>
              <line
                className={cx("sw-wire", isOut && !reduced && "sw-wire-live")}
                x1={hp.x}
                y1={hp.y}
                x2={pp.x}
                y2={pp.y}
                stroke={stroke}
                strokeWidth={isIn || isOut ? 3 : 1.5}
                markerEnd={isOut ? "url(#sw-arrow)" : undefined}
                markerStart={isIn ? "url(#sw-arrow-in)" : undefined}
              />
              {/* travelling frame dot for egress wires */}
              {isOut && step && (
                <g className={cx(!reduced && "sw-pkt")}>
                  <rect x={mid.x - 15} y={mid.y - 9} width={30} height={18} rx={4} className="sw-pkt-box" />
                  <text x={mid.x} y={mid.y + 4} textAnchor="middle" className="sw-pkt-t">
                    {step.frame.src}→{step.frame.dst}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* switch body */}
        <rect
          x={cx0 - swW / 2}
          y={cy0 - swH / 2}
          width={swW}
          height={swH}
          rx={10}
          className="sw-box"
        />
        <text x={cx0} y={cy0 - 12} textAnchor="middle" className="sw-box-t">
          switch
        </text>
        <text x={cx0} y={cy0 + 6} textAnchor="middle" className="sw-box-s">
          {step ? (isFlood ? "FLOOD" : "FORWARD") : "learning…"}
        </text>
        <text x={cx0} y={cy0 + 22} textAnchor="middle" className="sw-box-mac">
          MAC table {step ? step.table.length : 0}/{HOSTS.length}
        </text>

        {/* ports on the switch edge */}
        {PORT_POS.map((pp, i) => {
          const isIn = i === ingress;
          const isOut = egress.has(i);
          const cls = cx("sw-port", isIn && "is-in", isOut && "is-out");
          return (
            <g key={`port-${i}`}>
              <circle cx={pp.x} cy={pp.y} r={9} className={cls} />
              <text x={pp.x + (i % 2 === 0 ? -16 : 16)} y={pp.y + 4} textAnchor={i % 2 === 0 ? "end" : "start"} className="sw-port-t">
                p{i}
              </text>
            </g>
          );
        })}

        {/* hosts */}
        {HOSTS.map((h, i) => {
          const hp = HOST_POS[i];
          const isSrc = step ? step.frame.src === h : nextFrame?.src === h;
          const isDst = step ? step.frame.dst === h : nextFrame?.dst === h;
          const learnedNow = step?.learned?.mac === h;
          const inTable = known.has(h);
          return (
            <g key={`host-${h}`} className="sw-hostg">
              <circle
                cx={hp.x}
                cy={hp.y}
                r={24}
                className={cx("sw-host", isSrc && "is-src", isDst && "is-dst", learnedNow && "is-learned")}
              />
              <text x={hp.x} y={hp.y - 1} textAnchor="middle" className="sw-host-id">
                {h}
              </text>
              <text x={hp.x} y={hp.y + 12} textAnchor="middle" className="sw-host-role">
                {isSrc ? "src" : isDst ? "dst" : `p${i}`}
              </text>
              {/* learned badge — this host's MAC now maps to its port */}
              {inTable && (
                <g className={cx(learnedNow && !reduced && "sw-badge-pop")}>
                  <rect x={hp.x - 20} y={hp.y + 26} width={40} height={15} rx={7} className="sw-badge" />
                  <text x={hp.x} y={hp.y + 37} textAnchor="middle" className="sw-badge-t">
                    ✓ p{learnedNow ? learnedPort : known.get(h)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The MAC table — fills one entry per learned host. The row just learned pulses.
// ---------------------------------------------------------------------------
function MacTable({ table, activeMac }: { table: { mac: string; port: number }[]; activeMac: string | null }) {
  const rows = HOSTS.length;
  return (
    <div className="sw-mac">
      <div className="sw-mac-head">
        <span className="sw-mac-title">MAC address table</span>
        <span className="sw-mac-count">{table.length}/{rows} learned</span>
      </div>
      <div className="sw-mac-grid" role="table" aria-label="Switch MAC address table">
        <div className="sw-mac-row sw-mac-hrow" role="row">
          <span role="columnheader">MAC (host)</span>
          <span role="columnheader">port</span>
        </div>
        {Array.from({ length: rows }, (_, i) => {
          const entry = table[i];
          const active = entry != null && entry.mac === activeMac;
          return (
            <div
              key={i}
              className={cx("sw-mac-row", entry ? "is-set" : "is-empty", active && "is-active")}
              role="row"
            >
              <span role="cell" className="sw-mac-mac">
                {entry ? `host ${entry.mac}` : "—"}
              </span>
              <span role="cell" className="sw-mac-port">
                {entry ? `p${entry.port}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floods-so-far meter: the payoff. It climbs early, then flatlines — proof that
// learning stops the flooding.
// ---------------------------------------------------------------------------
function FloodMeter({ floodsSoFar, total, atEnd }: { floodsSoFar: number; total: number; atEnd: boolean }) {
  const done = atEnd;
  return (
    <div className="sw-flood">
      <div className="sw-flood-head">
        <span className="sw-flood-title">floods so far</span>
        <span className={cx("sw-flood-num", done && "is-settled")}>{floodsSoFar}</span>
      </div>
      <div className="sw-flood-bar" role="img" aria-label={`${floodsSoFar} floods out of ${total} total`}>
        {Array.from({ length: Math.max(1, total) }, (_, i) => (
          <span key={i} className={cx("sw-flood-tick", i < floodsSoFar && "on")} />
        ))}
      </div>
      <p className="sw-flood-note">
        {floodsSoFar === 0
          ? "nothing learned yet — the first unknown destination will flood."
          : done
            ? `stopped climbing: every host is in the table, so no more flooding — just ${total} floods total while learning.`
            : "flooding while the table is still filling…"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline of frames — the conversation, click any to jump.
// ---------------------------------------------------------------------------
function FrameStrip({
  steps,
  cursor,
  onPick,
}: {
  steps: SwitchStep[];
  cursor: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="sw-strip" role="group" aria-label="Frame sequence">
      {steps.map((s, i) => {
        const state = i < cursor ? "past" : i === cursor ? "now" : "future";
        return (
          <button
            key={i}
            type="button"
            className={cx("sw-chip", `is-${state}`, s.action === "flood" ? "is-flood" : "is-fwd")}
            onClick={() => onPick(i)}
            aria-label={`Frame ${i + 1}: ${s.frame.src} to ${s.frame.dst}, ${s.action}`}
            aria-current={i === cursor ? "step" : undefined}
          >
            <span className="sw-chip-n">{i + 1}</span>
            <span className="sw-chip-flow">
              {s.frame.src}
              <span className="sw-chip-arr" aria-hidden="true"> → </span>
              {s.frame.dst}
            </span>
            <span className="sw-chip-act">{s.action === "flood" ? "flood" : "fwd"}</span>
          </button>
        );
      })}
    </div>
  );
}
