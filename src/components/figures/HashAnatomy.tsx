// [fig] hash-anatomy — the anatomy of ONE hash-table lookup, frame by frame:
// key → hash function → a big raw number → mod tableSize → home bucket → (it's
// taken → resolve the collision, by chaining or by linear probing) → found /
// stored. This zooms into the single operation the hash-collision-lab sim runs
// in bulk. Concrete, deterministic example: inserting "bee" into an 8-slot table
// where "cat" already lives at bucket 7 (both hash there under FNV-1a), so the
// collision path is real, not hand-waved. Semantic palette (§7): the key/data is
// cyan, the active bucket/control is orange, memory/state is violet, found/ok is
// green, the clash is red. Engine numbers mirror hash-collision-lab/model.
import type { ReactNode } from "react";
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

// FNV-1a("bee") = 1370376319; 1370376319 % 8 = 7 (matches goodHash in the model).
const KEY = "bee";
const RAW = 1370376319;
const SIZE = 8;
const HOME = RAW % SIZE; // 7
const PROBE_TO = (HOME + 1) % SIZE; // 0 — first free slot on the linear-probe walk

// 8 slots; "cat" pre-occupies the home bucket so "bee" must resolve a collision.
const SLOTS: (string | null)[] = [null, null, null, null, null, null, null, "cat"];
const SLOT_X = 300;
const SLOT_W = 150;
const SLOT_H = 30;
const SLOT_Y0 = 40;

function slotColumn(highlight: { home?: boolean; probe?: boolean; landed?: boolean; occupied?: number | null }) {
  return (
    <g fontFamily="var(--font-mono)">
      {SLOTS.map((v, idx) => {
        const isHome = highlight.home && idx === HOME;
        const isProbe = highlight.probe && idx === PROBE_TO;
        const isLanded = highlight.landed && idx === PROBE_TO;
        const y = SLOT_Y0 + idx * SLOT_H;
        const filled = v !== null || (highlight.occupied === idx);
        const fill = isLanded
          ? "color-mix(in srgb, var(--sem-ok) 26%, var(--surface))"
          : isHome
            ? "color-mix(in srgb, var(--sem-control) 24%, var(--surface))"
            : isProbe
              ? "color-mix(in srgb, var(--sem-control) 12%, var(--surface))"
              : filled
                ? "var(--s2)"
                : "var(--surface)";
        const stroke = isLanded ? "var(--sem-ok)" : isHome ? "var(--sem-control)" : filled ? "var(--sem-state)" : "var(--line)";
        return (
          <g key={idx}>
            <rect x={SLOT_X} y={y} width={SLOT_W} height={SLOT_H - 4} rx="5" fill={fill} stroke={stroke} strokeWidth={isHome || isLanded ? 2.5 : 1} />
            <text x={SLOT_X - 8} y={y + SLOT_H / 2 - 1} textAnchor="end" fontSize="11" fill="var(--tx3)">
              {idx}
            </text>
            <text x={SLOT_X + 12} y={y + SLOT_H / 2 - 1} fontSize="12" fontWeight="700" fill={v ? "var(--tx)" : "var(--tx3)"}>
              {idx === PROBE_TO && highlight.landed ? KEY : (v ?? "")}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function pill(x: number, y: number, w: number, label: string, value: string, tone: string) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="40" rx="8" fill={`color-mix(in srgb, ${tone} 14%, var(--surface))`} stroke={tone} strokeWidth="1.6" />
      <text x={x + w / 2} y={y + 15} textAnchor="middle" fontSize="9" fill="var(--tx2)">
        {label}
      </text>
      <text x={x + w / 2} y={y + 31} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill={tone}>
        {value}
      </text>
    </g>
  );
}

function arrow(x1: number, y1: number, x2: number, y2: number) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--tx3)" strokeWidth="1.6" markerEnd="url(#haArrow)" />;
}

// The pipeline pills live on the left; the slot column on the right.
const PX = 24;
const PW = 200;

function Pipe({ upto }: { upto: number }) {
  // upto: how many pipeline stages are lit (0..4)
  return (
    <g>
      {upto >= 1 && pill(PX, 40, PW, "key", `"${KEY}"`, "var(--sem-data)")}
      {upto >= 1 && arrow(PX + PW / 2, 82, PX + PW / 2, 100)}
      {upto >= 2 && pill(PX, 102, PW, "FNV-1a hash →", `${RAW}`, "var(--sem-data)")}
      {upto >= 2 && arrow(PX + PW / 2, 144, PX + PW / 2, 162)}
      {upto >= 3 && pill(PX, 164, PW, `mod tableSize (${SIZE})`, `${RAW} % ${SIZE}`, "var(--sem-control)")}
      {upto >= 4 && arrow(PX + PW / 2, 206, PX + PW / 2, 224)}
      {upto >= 4 && pill(PX, 226, PW, "home bucket", `${HOME}`, "var(--sem-control)")}
    </g>
  );
}

function Scene({ children }: { children: ReactNode }) {
  return (
    <g fontFamily="var(--font-body)">
      <defs>
        <marker id="haArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--tx3)" />
        </marker>
        <marker id="haHop" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-control)" />
        </marker>
      </defs>
      <text x={SLOT_X + SLOT_W / 2} y="26" textAnchor="middle" fontSize="10" fill="var(--tx2)">
        table — {SIZE} slots
      </text>
      {children}
    </g>
  );
}

// A curved hop arrow from the home slot down/around to the probed slot.
function ProbeHop() {
  const yHome = SLOT_Y0 + HOME * SLOT_H + (SLOT_H - 4) / 2;
  const yTo = SLOT_Y0 + PROBE_TO * SLOT_H + (SLOT_H - 4) / 2;
  const xEdge = SLOT_X + SLOT_W + 6;
  return (
    <path
      d={`M ${xEdge} ${yHome} C ${xEdge + 52} ${yHome}, ${xEdge + 52} ${yTo}, ${xEdge + 4} ${yTo}`}
      fill="none"
      stroke="var(--sem-control)"
      strokeWidth="2"
      strokeDasharray="4 3"
      markerEnd="url(#haHop)"
    />
  );
}

const FRAMES: Frame[] = [
  {
    caption: `A lookup starts with a key — here the string "${KEY}". We want the one bucket that holds it (or, on insert, the one bucket it belongs in), without scanning the whole table.`,
    render: () => (
      <Scene>
        <Pipe upto={1} />
        {slotColumn({})}
      </Scene>
    ),
  },
  {
    caption: `The hash function chews the key into a big, well-mixed integer. FNV-1a folds in every byte, so "${KEY}" becomes ${RAW}. Change one letter and this number leaps somewhere else entirely — that spread is what keeps buckets balanced.`,
    render: () => (
      <Scene>
        <Pipe upto={2} />
        {slotColumn({})}
      </Scene>
    ),
  },
  {
    caption: `That number is far too big to be a slot index, so we fold it into range with mod tableSize: ${RAW} % ${SIZE} = ${HOME}. This is the O(1) magic — arithmetic on the key jumps us straight to a slot, no searching.`,
    render: () => (
      <Scene>
        <Pipe upto={3} />
        {slotColumn({})}
      </Scene>
    ),
  },
  {
    caption: `The home bucket is ${HOME}. If it were empty we'd be done in one step. But slot ${HOME} already holds "cat" (which also hashed here) — a COLLISION. Two keys, one home. Now the table's collision strategy takes over.`,
    render: () => (
      <Scene>
        <Pipe upto={4} />
        {slotColumn({ home: true })}
        <text x={SLOT_X + SLOT_W + 12} y={SLOT_Y0 + HOME * SLOT_H + 10} fontSize="11" fontWeight="700" fill="var(--sem-err)">
          collision!
        </text>
      </Scene>
    ),
  },
  {
    caption: `Strategy A — CHAINING: the bucket holds a little list, so "${KEY}" simply links on after "cat". Lookups here walk the chain (cat, then bee). Cheap to insert; the cost is a longer walk as chains grow.`,
    render: () => (
      <Scene>
        <Pipe upto={4} />
        {slotColumn({ home: true })}
        <g fontFamily="var(--font-mono)">
          <rect x={SLOT_X + SLOT_W + 20} y={SLOT_Y0 + HOME * SLOT_H - 2} width="58" height={SLOT_H - 4} rx="5" fill="color-mix(in srgb, var(--sem-ok) 22%, var(--surface))" stroke="var(--sem-ok)" strokeWidth="2" />
          <text x={SLOT_X + SLOT_W + 49} y={SLOT_Y0 + HOME * SLOT_H + 13} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--tx)">
            {KEY}
          </text>
          <line x1={SLOT_X + SLOT_W} y1={SLOT_Y0 + HOME * SLOT_H + 11} x2={SLOT_X + SLOT_W + 18} y2={SLOT_Y0 + HOME * SLOT_H + 11} stroke="var(--sem-state)" strokeWidth="2" markerEnd="url(#haArrow)" />
        </g>
        <text x={SLOT_X + SLOT_W + 20} y={SLOT_Y0 + HOME * SLOT_H - 8} fontSize="9" fill="var(--tx2)">
          cat → bee
        </text>
      </Scene>
    ),
  },
  {
    caption: `Strategy B — LINEAR PROBING: no lists. We walk forward from the home slot to the next free one: ${HOME} is taken, so try ${PROBE_TO} (wrapping past the end) — empty, so "${KEY}" lands there. Fast and cache-friendly, but neighbours pile into runs (clustering).`,
    render: () => (
      <Scene>
        <Pipe upto={4} />
        {slotColumn({ home: true, probe: true })}
        <ProbeHop />
        <text x={SLOT_X + SLOT_W + 40} y={SLOT_Y0 + 2 * SLOT_H} fontSize="9" fill="var(--sem-control)">
          probe →
        </text>
      </Scene>
    ),
  },
  {
    caption: `Stored (linear probing shown): "${KEY}" resolved its collision in 2 probes and now lives in slot ${PROBE_TO}. A future lookup for "${KEY}" replays the exact same path — hash, mod, then probe forward — and finds it. That is the whole machine the hash-collision-lab runs at scale.`,
    render: () => (
      <Scene>
        <Pipe upto={4} />
        {slotColumn({ home: true, probe: true, landed: true })}
        <ProbeHop />
        <text x={SLOT_X + SLOT_W + 40} y={SLOT_Y0 + 2 * SLOT_H + 22} fontSize="10" fontWeight="700" fill="var(--sem-ok)">
          found / stored ✓
        </text>
      </Scene>
    ),
  },
];

export default function HashAnatomy() {
  return <FigureStepper title="Anatomy of a hash-table lookup" figKey="hash-anatomy" viewBox="0 0 520 300" accent="#34D399" frames={FRAMES} />;
}
