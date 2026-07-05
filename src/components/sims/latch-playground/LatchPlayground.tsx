// [micro] latch-playground — the birth of memory. Mode ①: two cross-coupled
// NOR gates (an SR latch). Toggle Set/Reset, then STEP the feedback loop one
// gate-delay at a time and watch it settle and HOLD — a circuit that remembers,
// built from ch.4 gates wired back on themselves. Mode ②: add a clock and you
// get an edge-triggered D flip-flop — state changes only on the tick.
// Engine: machine/memory.ts. Honors reduced-motion via SimShell's step mode.
import { useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import { dFlipFlop, isValidLatch, risingEdge, srLatchStep } from "../machine/memory.ts";
import type { LatchState } from "../machine/memory.ts";

const ACCENT = "#FB923C";
const ON = "var(--sem-control)";
const DATA = "var(--sem-data)";
const DIM = "var(--tx3)";
type Mode = "sr" | "dff";

export default function LatchPlayground() {
  const [mode, setMode] = useState<Mode>("sr");

  // ---- SR latch ----
  const [s, setS] = useState(0);
  const [r, setR] = useState(0);
  const [latch, setLatch] = useState<LatchState>({ q: 0, qbar: 1 });
  const [running, setRunning] = useState(false);

  const nextLatch = srLatchStep(s, r, latch);
  const settled = nextLatch.q === latch.q && nextLatch.qbar === latch.qbar;
  const forbidden = s === 1 && r === 1;
  const invalid = !isValidLatch(latch);

  // ---- D flip-flop ----
  const [d, setD] = useState(1);
  const [clk, setClk] = useState(0);
  const [dq, setDq] = useState(0);
  const [hist, setHist] = useState<{ clk: number; d: number; q: number }[]>([{ clk: 0, d: 1, q: 0 }]);

  function toggleClock() {
    setClk((prev) => {
      const nc = prev ^ 1;
      const nq = dFlipFlop(prev, nc, d, dq);
      setDq(nq);
      setHist((h) => [...h.slice(-23), { clk: nc, d, q: nq }]);
      return nc;
    });
  }

  useSimClock(running && mode === "sr", 2.4, () => {
    setLatch((cur) => {
      const nx = srLatchStep(s, r, cur);
      if (nx.q === cur.q && nx.qbar === cur.qbar) setRunning(false);
      return nx;
    });
  });
  useSimClock(running && mode === "dff", 1.6, () => toggleClock());

  function onReset() {
    if (mode === "sr") {
      setS(0);
      setR(0);
      setLatch({ q: 0, qbar: 1 });
      setRunning(false);
    } else {
      setD(1);
      setClk(0);
      setDq(0);
      setHist([{ clk: 0, d: 1, q: 0 }]);
      setRunning(false);
    }
  }

  const modeSel = (
    <div className="bit-seg" role="tablist" aria-label="Latch mode">
      <button type="button" role="tab" aria-selected={mode === "sr"} className={cx("bit-segbtn", mode === "sr" && "on")} onClick={() => setMode("sr")}>
        ① SR latch
      </button>
      <button type="button" role="tab" aria-selected={mode === "dff"} className={cx("bit-segbtn", mode === "dff" && "on")} onClick={() => setMode("dff")}>
        ② D flip-flop
      </button>
    </div>
  );

  if (mode === "sr") {
    const status = invalid
      ? "Invalid state (Q = Q̄). The forbidden input S=R=1 drove both outputs low; release it and the latch races — memory needs the inputs to stay legal."
      : settled
        ? `Stable — the loop is holding Q = ${latch.q}. ${s === 0 && r === 0 ? "With S=R=0 (hold), it will keep this value forever with no power spent switching." : ""}`
        : "Not settled yet — the outputs are still feeding back. Press Step (→) to advance one gate-delay and watch the loop resolve.";

    const transport = {
      running,
      onToggle: () => setRunning((x) => !x),
      onStep: () => setLatch((cur) => srLatchStep(s, r, cur)),
      speed: 1,
      onSpeed: () => {},
    };

    return (
      <SimShell title="Latch playground — SR latch" simKey="latch-playground" accent={ACCENT} transport={transport} onReset={onReset} status={status} controls={modeSel}>
        <div className="latch-inputs">
          <InBtn label="S — set" value={s} onClick={() => setS(s ^ 1)} />
          <InBtn label="R — reset" value={r} onClick={() => setR(r ^ 1)} />
          {forbidden && <span className="latch-warn">⚠ S=R=1 is the forbidden input</span>}
          {!settled && <span className="latch-settle">loop settling… press Step</span>}
        </div>

        <svg viewBox="0 0 460 240" width="100%" role="img" aria-label={`SR latch: S=${s}, R=${r}, Q=${latch.q}, Q-bar=${latch.qbar}`} fontFamily="var(--font-mono)" fontSize="13">
          {/* input stubs */}
          <Wire x1={20} y1={70} x2={120} y2={70} on={r === 1} />
          <text x={16} y={62} fill="var(--tx2)" textAnchor="start">R</text>
          <Wire x1={20} y1={170} x2={120} y2={170} on={s === 1} />
          <text x={16} y={162} fill="var(--tx2)" textAnchor="start">S</text>

          {/* NOR gate 1 (top) → Q ; NOR gate 2 (bottom) → Q̄ */}
          <NorBox x={120} y={44} label="NOR" hot={latch.q === 1} />
          <NorBox x={120} y={144} label="NOR" hot={latch.qbar === 1} />

          {/* outputs */}
          <Wire x1={210} y1={70} x2={330} y2={70} on={latch.q === 1} data />
          <Wire x1={210} y1={170} x2={330} y2={170} on={latch.qbar === 1} data />

          {/* cross-coupled feedback */}
          <path d="M300 70 V115 H112 V150" fill="none" stroke={latch.q === 1 ? ON : DIM} strokeWidth={2} strokeDasharray="5 4" />
          <path d="M300 170 V125 H112 V90" fill="none" stroke={latch.qbar === 1 ? ON : DIM} strokeWidth={2} strokeDasharray="5 4" />
          <text x={330} y={112} fill={DIM} fontSize={10}>feedback</text>

          {/* lamps */}
          <Lamp x={355} y={70} on={latch.q === 1} label="Q" />
          <Lamp x={355} y={170} on={latch.qbar === 1} label="Q̄" />
        </svg>

        <p className="lsb-canvas-hint muted">
          Recipe for the “aha”: set <b>S=1</b> then Step until stable → Q locks to 1. Now set <b>S=0</b> (hold) and Step again —
          Q <i>stays</i> 1. The circuit is remembering with no input telling it to. Reset works the same via R. That held bit is
          one cell of everything above: registers, caches, RAM.
        </p>
      </SimShell>
    );
  }

  // ---- D flip-flop mode ----
  const willCapture = risingEdge(clk, clk ^ 1);
  const statusD = `Q = ${dq}. Toggle the clock: Q copies D only on a RISING edge (0→1). ${
    willCapture ? `Next toggle is a rising edge → Q will become ${d}.` : "Next toggle is a falling edge → Q ignores D and holds."
  }`;

  const transportD = {
    running,
    onToggle: () => setRunning((x) => !x),
    onStep: () => toggleClock(),
    speed: 1,
    onSpeed: () => {},
  };

  const cw = Math.max(280, hist.length * 18);
  const px = (i: number) => 10 + i * 18;
  const lvl = (v: number) => (v ? 18 : 46);

  return (
    <SimShell title="Latch playground — D flip-flop" simKey="latch-playground" accent={ACCENT} transport={transportD} onReset={onReset} status={statusD} controls={modeSel}>
      <div className="latch-inputs">
        <InBtn label="D — data" value={d} onClick={() => setD(d ^ 1)} tone="data" />
        <button type="button" className={cx("latch-clk", clk !== 0 && "on")} onClick={toggleClock} aria-label={`Clock is ${clk}, toggle`}>
          <span>CLK</span>
          <b>{clk ? "▔▔" : "__"}</b>
        </button>
        <div className={cx("latch-q", dq !== 0 && "on")}>
          Q<b>{dq}</b>
        </div>
      </div>

      <svg viewBox={`0 0 ${cw} 170`} width="100%" role="img" aria-label="Clock, D and Q waveforms over time" fontFamily="var(--font-mono)" fontSize="11">
        <WaveLabel y={32} text="CLK" />
        <WaveLabel y={92} text="D" />
        <WaveLabel y={132} text="Q" />
        {/* rising-edge guides */}
        {hist.map((h, i) => (i > 0 && hist[i - 1].clk === 0 && h.clk === 1 ? <line key={`g${i}`} x1={px(i)} y1={10} x2={px(i)} y2={150} stroke="var(--sem-control)" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} /> : null))}
        <Wave hist={hist} pick={(h) => h.clk} y0={10} px={px} lvl={lvl} color={ON} />
        <Wave hist={hist} pick={(h) => h.d} y0={70} px={px} lvl={lvl} color={DATA} />
        <Wave hist={hist} pick={(h) => h.q} y0={110} px={px} lvl={lvl} color="var(--sem-state)" />
      </svg>

      <p className="lsb-canvas-hint muted">
        Change <b>D</b> freely between edges — Q doesn’t care. Only at the clock’s <b>rising edge</b> (orange guide) does Q sample D
        and latch it. That’s the discipline that makes a computer <i>synchronous</i>: every register updates together, on the tick,
        so signals never race. A CPU’s clock speed is just how often this edge arrives.
      </p>
    </SimShell>
  );
}

// ---- helpers ----
function InBtn({ label, value, onClick, tone }: { label: string; value: number; onClick: () => void; tone?: "data" }) {
  return (
    <button type="button" className={cx("latch-in", value !== 0 && "on", tone === "data" && "data")} onClick={onClick} aria-pressed={value === 1} aria-label={`${label} = ${value}, toggle`}>
      <span>{label}</span>
      <b>{value}</b>
    </button>
  );
}

function Wire({ x1, y1, x2, y2, on, data }: { x1: number; y1: number; x2: number; y2: number; on: boolean; data?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={on ? (data ? DATA : ON) : DIM} strokeWidth={on ? 3 : 2} />;
}

function NorBox({ x, y, label, hot }: { x: number; y: number; label: string; hot: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={90} height={52} rx={8} fill="var(--s2)" stroke={hot ? ON : "var(--line)"} strokeWidth={hot ? 2 : 1.5} />
      <text x={x + 45} y={y + 26} textAnchor="middle" fill="var(--tx)" fontWeight={700}>{label}</text>
      <text x={x + 45} y={y + 42} textAnchor="middle" fill={DIM} fontSize={9}>output {hot ? "1" : "0"}</text>
    </g>
  );
}

function Lamp({ x, y, on, label }: { x: number; y: number; on: boolean; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={16} fill={on ? DATA : "var(--s2)"} stroke={on ? DATA : "var(--tx3)"} strokeWidth={2} />
      {on && <circle cx={x} cy={y} r={24} fill={DATA} opacity={0.15} />}
      <text x={x} y={y + 5} textAnchor="middle" fill={on ? "var(--bg)" : "var(--tx2)"} fontWeight={700} fontSize={13}>{label}</text>
      <text x={x + 34} y={y + 5} textAnchor="middle" fill="var(--tx2)" fontSize={13}>{on ? 1 : 0}</text>
    </g>
  );
}

function WaveLabel({ y, text }: { y: number; text: string }) {
  return <text x={4} y={y} fill="var(--tx2)" fontSize={11}>{text}</text>;
}

function Wave({ hist, pick, y0, px, lvl, color }: { hist: { clk: number; d: number; q: number }[]; pick: (h: { clk: number; d: number; q: number }) => number; y0: number; px: (i: number) => number; lvl: (v: number) => number; color: string }) {
  let dpath = "";
  hist.forEach((h, i) => {
    const x = px(i);
    const y = y0 + lvl(pick(h));
    if (i === 0) dpath += `M ${x} ${y}`;
    else {
      const py = y0 + lvl(pick(hist[i - 1]));
      dpath += ` L ${x} ${py} L ${x} ${y}`;
    }
  });
  const lastX = px(hist.length - 1);
  const lastY = y0 + lvl(pick(hist[hist.length - 1]));
  dpath += ` L ${lastX + 12} ${lastY}`;
  return <path d={dpath} fill="none" stroke={color} strokeWidth={2.5} />;
}
