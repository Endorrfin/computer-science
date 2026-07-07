// [fig] process-states — the process lifecycle as a five-state machine, walked
// once through the life of a single process. A process is born NEW, admitted to
// the READY queue, dispatched to RUNNING by the scheduler, and may be bounced
// back to READY by an involuntary timer interrupt (preemption — the ONE arrow
// only the OS ever draws), or voluntarily give up the CPU to wait on I/O
// (BLOCKED). When the I/O completes it returns to READY (never straight to
// RUNNING — it must be re-scheduled), and eventually RUNNING → TERMINATED on
// exit. Each frame dims the whole graph and lights just the node + transition
// being taken. No GIFs (§6): stepped SVG frames via FigureStepper. Semantic
// palette (§7): RUNNING = green (active), READY = cyan (data/queued), BLOCKED =
// amber/red (waiting), NEW/TERMINATED = muted, the taken arrow = accent.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

// ── Geometry ────────────────────────────────────────────────────────────────
// NEW far left · READY & RUNNING centered (READY ⇄ RUNNING) · BLOCKED below the
// pair · TERMINATED far right. Coordinates are the node CENTERS.
type StateKey = "new" | "ready" | "running" | "blocked" | "terminated";
type Node = { key: StateKey; cx: number; cy: number; label: string; color: string };

const NW = 118; // node width
const NH = 58; // node height

const NODES: Record<StateKey, Node> = {
  new: { key: "new", cx: 80, cy: 120, label: "NEW", color: "var(--tx3)" },
  ready: { key: "ready", cx: 300, cy: 120, label: "READY", color: "var(--sem-data)" },
  running: { key: "running", cx: 520, cy: 120, label: "RUNNING", color: "var(--sem-ok)" },
  blocked: { key: "blocked", cx: 410, cy: 300, label: "BLOCKED", color: "var(--sem-control)" },
  terminated: { key: "terminated", cx: 640, cy: 300, label: "TERMINATED", color: "var(--tx2)" },
};

// The six transitions, keyed for per-frame highlighting.
type TransKey = "admit" | "dispatch" | "preempt" | "io" | "done" | "exit";

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, var(--surface))`;
}

// ── Arrowhead markers: one muted (idle) + one accent (active) ─────────────────
function Defs(): ReactNode {
  return (
    <defs>
      <marker id="psArr" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="var(--line)" />
      </marker>
      <marker id="psArrHot" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
        <path d="M0,0 L6.5,3 L0,6 Z" fill="var(--accent)" />
      </marker>
    </defs>
  );
}

// ── A single state node. `active` lights it in its own color; otherwise dim. ───
function StateBox({ node, active }: { node: Node; active: boolean }): ReactNode {
  const stroke = active ? node.color : "var(--line)";
  const fill = active ? tint(node.color, 22) : "var(--s2)";
  return (
    <g fontFamily="var(--font-mono)">
      <rect
        x={node.cx - NW / 2}
        y={node.cy - NH / 2}
        width={NW}
        height={NH}
        rx={12}
        fill={fill}
        stroke={stroke}
        strokeWidth={active ? 2.75 : 1.5}
      />
      <text
        x={node.cx}
        y={node.cy + 5}
        textAnchor="middle"
        fontSize="14"
        fontWeight={700}
        fill={active ? "var(--tx)" : "var(--tx3)"}
      >
        {node.label}
      </text>
    </g>
  );
}

// ── Edge geometry ─────────────────────────────────────────────────────────────
// Trim a straight segment to the node rectangles' edges so the arrowhead lands
// on the border, not inside the box. Returns endpoints for a line from `a`→`b`
// offset perpendicular by `off` (to separate the READY⇄RUNNING pair).
function edge(a: Node, b: Node, off: number): { x1: number; y1: number; x2: number; y2: number } {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular unit for the parallel-lane offset
  const px = -uy;
  const py = ux;
  // shrink so both ends sit just outside the half-box in the dominant axis
  const trimA = Math.abs(ux) > Math.abs(uy) ? NW / 2 + 4 : NH / 2 + 4;
  const trimB = trimA;
  return {
    x1: a.cx + ux * trimA + px * off,
    y1: a.cy + uy * trimA + py * off,
    x2: b.cx - ux * trimB + px * off,
    y2: b.cy - uy * trimB + py * off,
  };
}

// A labeled arrow between two states. `active` swaps to the accent color + a
// thicker stroke and the emphatic arrowhead; otherwise it recedes to --line.
function Arrow({
  from,
  to,
  off,
  label,
  labelDx = 0,
  labelDy = -6,
  active,
  involuntary = false,
}: {
  from: StateKey;
  to: StateKey;
  off: number;
  label: string;
  labelDx?: number;
  labelDy?: number;
  active: boolean;
  involuntary?: boolean;
}): ReactNode {
  const e = edge(NODES[from], NODES[to], off);
  const mx = (e.x1 + e.x2) / 2 + labelDx;
  const my = (e.y1 + e.y2) / 2 + labelDy;
  const stroke = active ? "var(--accent)" : "var(--line)";
  return (
    <g fontFamily="var(--font-body)">
      <line
        x1={e.x1}
        y1={e.y1}
        x2={e.x2}
        y2={e.y2}
        stroke={stroke}
        strokeWidth={active ? 3 : 1.5}
        markerEnd={active ? "url(#psArrHot)" : "url(#psArr)"}
      />
      <text
        x={mx}
        y={my}
        textAnchor="middle"
        fontSize="10.5"
        fontWeight={active ? 700 : 400}
        fill={active ? "var(--accent)" : "var(--tx3)"}
      >
        {label}
      </text>
      {involuntary && (
        <text x={mx} y={my + 13} textAnchor="middle" fontSize="8.5" fontStyle="italic" fill={active ? "var(--sem-err)" : "var(--tx3)"}>
          OS-forced
        </text>
      )}
    </g>
  );
}

// ── The scene ─────────────────────────────────────────────────────────────────
// `on` names the transition being taken this frame (or null for the overview);
// `lit` names the state to highlight. Everything not named is dimmed.
function scene(opts: { on: TransKey | null; lit: StateKey | null; note: string }): () => ReactNode {
  const { on, lit, note } = opts;
  return () => (
    <g>
      <Defs />
      {/* All six transitions, drawn faint unless they're the active one. Order:
          admit · dispatch · preempt(involuntary) · io · done · exit. READY and
          RUNNING share a horizontal corridor, so their two arrows ride offset
          lanes (dispatch above, preempt below). */}
      <Arrow from="new" to="ready" off={0} label="admit" active={on === "admit"} />
      <Arrow from="ready" to="running" off={-14} label="scheduler dispatch" labelDy={-10} active={on === "dispatch"} />
      <Arrow from="running" to="ready" off={-14} label="preempt · timer interrupt" labelDy={22} active={on === "preempt"} involuntary />
      <Arrow from="running" to="blocked" off={0} label="I/O / wait" labelDx={26} active={on === "io"} />
      <Arrow from="blocked" to="ready" off={0} label="I/O completes" labelDx={-30} active={on === "done"} />
      <Arrow from="running" to="terminated" off={0} label="exit" labelDx={8} active={on === "exit"} />

      {/* Nodes on top of the wires. */}
      {(Object.keys(NODES) as StateKey[]).map((k) => (
        <StateBox key={k} node={NODES[k]} active={lit === k} />
      ))}

      {/* Per-frame teaching note, pinned bottom-left. */}
      <text x={24} y={410} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
        {note}
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "The process lifecycle as a state machine. A process is always in exactly one of five states: NEW (being created), READY (waiting for the CPU), RUNNING (executing now), BLOCKED (waiting for an event like I/O), or TERMINATED (finished). The arrows are the only legal transitions — the OS moves a process along them. We'll follow one process through its whole life.",
    render: scene({ on: null, lit: null, note: "five states · six legal transitions — the whole map, shown faint" }),
  },
  {
    caption:
      "Birth. The OS creates the process (allocates a PID and control block) — it is NEW. Once admitted, it joins the READY queue: it now has everything it needs to run except a CPU. new → ready is called admission.",
    render: scene({ on: "admit", lit: "ready", note: "new → ready — admitted to the ready queue, awaiting a core" }),
  },
  {
    caption:
      "The scheduler picks this process off the ready queue and dispatches it onto a CPU: ready → running. Now it is actually executing instructions. On a single core only one process is RUNNING at a time.",
    render: scene({ on: "dispatch", lit: "running", note: "ready → running — the scheduler dispatches it onto a core" }),
  },
  {
    caption:
      "Its time slice expires: a timer interrupt fires and the OS preempts it, forcing running → ready. This is the INVOLUNTARY transition — the process didn't ask to stop; only the OS can draw this arrow. It goes back to READY (not BLOCKED — it's still perfectly runnable), and another process gets its turn.",
    render: scene({ on: "preempt", lit: "ready", note: "running → ready — PREEMPTED by a timer interrupt (involuntary, OS-forced)" }),
  },
  {
    caption:
      "Later the scheduler dispatches it again: ready → running. A process can cycle through ready ⇄ running many times over its life, each visit bounded by the scheduler's time slice.",
    render: scene({ on: "dispatch", lit: "running", note: "ready → running — dispatched again (ready ⇄ running can repeat many times)" }),
  },
  {
    caption:
      "This time it issues a blocking I/O request — read a file, wait on a lock, sleep. It cannot proceed until that event happens, so it VOLUNTARILY gives up the CPU: running → blocked. A blocked process is not on the ready queue and will not be scheduled — running it would be pointless.",
    render: scene({ on: "io", lit: "blocked", note: "running → blocked — issues I/O and waits; yields the CPU voluntarily" }),
  },
  {
    caption:
      "The I/O finishes and an interrupt wakes the process: blocked → ready. Note it returns to READY, NOT straight to RUNNING — the event only makes it runnable again; it must be re-scheduled before it can use the CPU. This is why there is no blocked → running arrow.",
    render: scene({ on: "done", lit: "ready", note: "blocked → ready — I/O completes; runnable again, but must be re-scheduled" }),
  },
  {
    caption:
      "Dispatched a final time, it runs to completion and calls exit: running → terminated. Its resources are reclaimed and it leaves the cycle. Every process ends here — the only path out is from RUNNING. That completes one process's journey through NEW → READY ⇄ RUNNING (with detours through BLOCKED) → TERMINATED.",
    render: scene({ on: "exit", lit: "terminated", note: "running → terminated — exits and is reaped; the only way out is from RUNNING" }),
  },
];

export default function ProcessStates() {
  return (
    <FigureStepper
      title="The process lifecycle — a five-state machine"
      figKey="process-states"
      viewBox="0 0 720 430"
      accent="#22d3ee"
      frames={FRAMES}
    />
  );
}
