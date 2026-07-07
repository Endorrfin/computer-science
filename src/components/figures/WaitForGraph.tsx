// [fig] wait-for-graph (ch.25) — how an OS actually detects deadlock: draw who
// waits for whom, and look for a cycle. Frames build from the smallest case (two
// processes each holding what the other wants) to the collapsed wait-for graph,
// state the rule (a cycle IS a deadlock), scale it to the five philosophers, and
// finally break the cycle with resource ordering. Stepped SVG, no GIF (§6).
// Semantic palette: processes = cyan, resources = violet, the deadly cycle =
// red, the broken/safe edge = green.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const CX = 320;

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="wfg" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--tx2)" />
      </marker>
      <marker id="wfgHot" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
        <path d="M0,0 L6.5,3 L0,6 Z" fill="var(--sem-err)" />
      </marker>
      <marker id="wfgOk" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
        <path d="M0,0 L6.5,3 L0,6 Z" fill="var(--sem-ok)" />
      </marker>
    </defs>
  );
}

function Proc({ x, y, label, hot }: { x: number; y: number; label: string; hot?: boolean }): ReactNode {
  return (
    <g fontFamily="var(--font-mono)">
      <circle cx={x} cy={y} r={26} fill="color-mix(in srgb, var(--sem-data) 18%, var(--surface))" stroke={hot ? "var(--sem-err)" : "var(--sem-data)"} strokeWidth={hot ? 3.5 : 2.25} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--tx)">{label}</text>
    </g>
  );
}

function Res({ x, y, label }: { x: number; y: number; label: string }): ReactNode {
  return (
    <g fontFamily="var(--font-mono)">
      <rect x={x - 22} y={y - 22} width={44} height={44} rx={6} fill="color-mix(in srgb, var(--sem-state) 18%, var(--surface))" stroke="var(--sem-state)" strokeWidth={2} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">{label}</text>
    </g>
  );
}

function Edge({ x1, y1, x2, y2, tone = "idle", label, curve = 0 }: { x1: number; y1: number; x2: number; y2: number; tone?: "idle" | "hot" | "ok"; label?: string; curve?: number }): ReactNode {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = x1 + ux * 28;
  const sy = y1 + uy * 28;
  const ex = x2 - ux * 30;
  const ey = y2 - uy * 30;
  const stroke = tone === "hot" ? "var(--sem-err)" : tone === "ok" ? "var(--sem-ok)" : "var(--tx2)";
  const marker = tone === "hot" ? "url(#wfgHot)" : tone === "ok" ? "url(#wfgOk)" : "url(#wfg)";
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const px = -uy * curve;
  const py = ux * curve;
  const d = curve ? `M ${sx} ${sy} Q ${mx + px} ${my + py} ${ex} ${ey}` : `M ${sx} ${sy} L ${ex} ${ey}`;
  return (
    <g fontFamily="var(--font-body)">
      <path d={d} fill="none" stroke={stroke} strokeWidth={tone === "idle" ? 1.75 : 3} markerEnd={marker} />
      {label && (
        <text x={mx + px * 1.4} y={my + py * 1.4 - 4} textAnchor="middle" fontSize="10" fill={stroke}>{label}</text>
      )}
    </g>
  );
}

function note(text: string): ReactNode {
  return (
    <text x={24} y={356} fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx2)">{text}</text>
  );
}

// ring geometry for the five philosophers
function ring(i: number, n: number, r: number): { x: number; y: number } {
  const deg = -90 + (i * 360) / n;
  const rad = (deg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: 170 + r * Math.sin(rad) };
}

const FRAMES: Frame[] = [
  {
    caption:
      "Two processes, two resources. P1 holds R1 and wants R2; P2 holds R2 and wants R1. Each is waiting for something the other refuses to release. This is a resource-allocation graph: solid = holds, dashed = wants.",
    render: () => (
      <g>
        <Defs />
        <Proc x={180} y={150} label="P1" />
        <Proc x={460} y={150} label="P2" />
        <Res x={180} y={280} label="R1" />
        <Res x={460} y={280} label="R2" />
        {/* holds (resource → process, solid, idle) */}
        <Edge x1={180} y1={258} x2={180} y2={176} label="holds" />
        <Edge x1={460} y1={258} x2={460} y2={176} label="holds" />
        {/* wants (process → resource) */}
        <Edge x1={180} y1={150} x2={438} y2={272} label="wants" curve={30} />
        <Edge x1={460} y1={150} x2={202} y2={272} label="wants" curve={30} />
        {note("holds + wants, tangled — is anyone stuck? collapse it to see.")}
      </g>
    ),
  },
  {
    caption:
      "Collapse the resources away and keep only 'process waits for process': P1 → P2 (P1 needs what P2 holds) and P2 → P1. This is the wait-for graph — the same information, one node type.",
    render: () => (
      <g>
        <Defs />
        <Proc x={220} y={190} label="P1" />
        <Proc x={420} y={190} label="P2" />
        <Edge x1={220} y1={190} x2={420} y2={190} label="waits for" curve={34} />
        <Edge x1={420} y1={190} x2={220} y2={190} label="waits for" curve={34} />
        {note("wait-for graph: P1 → P2 and P2 → P1")}
      </g>
    ),
  },
  {
    caption:
      "There's the rule. A cycle in the wait-for graph IS a deadlock: every process on the cycle waits for the next, forever. No process can move, so none ever releases what the others need. Detecting deadlock = finding a cycle.",
    render: () => (
      <g>
        <Defs />
        <Proc x={220} y={190} label="P1" hot />
        <Proc x={420} y={190} label="P2" hot />
        <Edge x1={220} y1={190} x2={420} y2={190} tone="hot" curve={34} />
        <Edge x1={420} y1={190} x2={220} y2={190} tone="hot" curve={34} />
        <text x={CX} y={110} textAnchor="middle" fontSize="15" fontWeight={700} fill="var(--sem-err)" fontFamily="var(--font-head)">cycle ⇒ deadlock</text>
        {note("a 2-cycle here; real systems scan for cycles of any length")}
      </g>
    ),
  },
  {
    caption:
      "The dining philosophers are the same picture at n = 5. Each grabbed a left fork and waits for the right one its neighbour holds: P0 → P1 → P2 → P3 → P4 → P0. One big cycle — the whole table is deadlocked.",
    render: () => {
      const n = 5;
      return (
        <g>
          <Defs />
          {Array.from({ length: n }).map((_, i) => {
            const a = ring(i, n, 120);
            const b = ring((i + 1) % n, n, 120);
            return <Edge key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} tone="hot" curve={20} />;
          })}
          {Array.from({ length: n }).map((_, i) => {
            const p = ring(i, n, 120);
            return <Proc key={`p${i}`} x={p.x} y={p.y} label={`P${i}`} hot />;
          })}
          {note("P0→P1→P2→P3→P4→P0 — a five-node cycle")}
        </g>
      );
    },
  },
  {
    caption:
      "Break the cycle and the deadlock cannot form. Resource ordering makes P4 reach for fork 0 before fork 4 — so P4 no longer waits on P0; it competes for the low fork first. The chain P0→P1→P2→P3→P4 has no back-edge: no cycle, no deadlock.",
    render: () => {
      const n = 5;
      return (
        <g>
          <Defs />
          {Array.from({ length: n }).map((_, i) => {
            const a = ring(i, n, 120);
            const b = ring((i + 1) % n, n, 120);
            if (i === n - 1) return null; // the removed back-edge P4 → P0
            return <Edge key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} tone="idle" curve={20} />;
          })}
          {/* the edge that would have closed the loop, now cut */}
          {(() => {
            const a = ring(n - 1, n, 120);
            const b = ring(0, n, 120);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <g key="cut">
                <Edge x1={a.x} y1={a.y} x2={b.x} y2={b.y} tone="ok" curve={20} />
                <text x={mx + 40} y={my} fontSize="16" fill="var(--sem-ok)">✂</text>
              </g>
            );
          })()}
          {Array.from({ length: n }).map((_, i) => {
            const p = ring(i, n, 120);
            return <Proc key={`p${i}`} x={p.x} y={p.y} label={`P${i}`} />;
          })}
          <text x={CX} y={54} textAnchor="middle" fontSize="14" fontWeight={700} fill="var(--sem-ok)" fontFamily="var(--font-head)">no cycle ⇒ deadlock-free</text>
          {note("remove one edge (order the forks) → the loop can never close")}
        </g>
      );
    },
  },
];

export default function WaitForGraph() {
  return <FigureStepper title="The wait-for graph — a cycle is a deadlock" figKey="wait-for-graph" viewBox="0 0 640 380" accent="#22d3ee" frames={FRAMES} />;
}
