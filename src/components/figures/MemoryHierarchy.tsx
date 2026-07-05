// [fig] memory-hierarchy — registers → L1 → L2 → L3 → RAM → SSD as growing
// distances from the CPU core. Latency = travel time. Reused in ch.8/14/23.
// Semantic palette (§7): close/fast tiers → green/violet, far/slow → cooler & dimmer;
// data/addresses = cyan.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

type Tier = {
  name: string;
  latency: string; // real-world latency
  size: string; // typical capacity
  place: string; // the "city map" analogy
  scaled: string; // "if a register were 1 second" analogy
  r: number; // outer radius of this ring on the map
  color: string; // ring accent
};

// Origin of the "city map": the CPU core sits at the left, rings grow rightward.
const CX = 120;
const CY = 175;

const TIERS: readonly Tier[] = [
  { name: "Registers", latency: "~0.3 ns", size: "~1 KB", place: "in your hand", scaled: "1 second", r: 46, color: "var(--sem-ok)" },
  { name: "L1 cache", latency: "~1 ns", size: "~32–64 KB", place: "a step away", scaled: "~3 s", r: 82, color: "var(--sem-ok)" },
  { name: "L2 cache", latency: "~4 ns", size: "~256 KB–1 MB", place: "across the room", scaled: "~13 s", r: 122, color: "var(--sem-state)" },
  { name: "L3 cache", latency: "~12 ns", size: "few–tens of MB", place: "down the hall", scaled: "~40 s", r: 165, color: "var(--sem-state)" },
  { name: "Main memory (DRAM)", latency: "~100 ns", size: "GBs", place: "a walk across town", scaled: "~5.5 min", r: 212, color: "var(--tx2)" },
  { name: "SSD (NVMe)", latency: "~100 µs", size: "TBs", place: "another city, by road", scaled: "~3.9 days", r: 262, color: "var(--tx3)" },
];

type Scene = {
  // Reveal tiers 0..upto (inclusive). -1 shows only the core.
  upto: number;
  // Show the scaled "if a register were 1 second" column instead of real latency.
  scaled?: boolean;
};

function Hierarchy({ upto, scaled }: Scene) {
  return (
    <g fontFamily="var(--font-mono)" fontSize="12">
      {/* concentric distance bands, drawn far → near so near rings sit on top */}
      {[...TIERS.keys()].reverse().map((i) => {
        const t = TIERS[i];
        const shown = i <= upto;
        return (
          <circle
            key={i}
            cx={CX}
            cy={CY}
            r={t.r}
            fill="none"
            stroke={shown ? t.color : "var(--line)"}
            strokeWidth={shown ? 2 : 1}
            strokeDasharray={shown ? undefined : "3 6"}
            opacity={shown ? 1 : 0.35}
          />
        );
      })}

      {/* CPU core at the origin */}
      <circle cx={CX} cy={CY} r="20" fill="var(--sem-data)" opacity="0.12" />
      <circle cx={CX} cy={CY} r="14" fill="var(--bg)" stroke="var(--sem-data)" strokeWidth="2" />
      <text x={CX} y={CY + 4} textAnchor="middle" fill="var(--sem-data)" fontWeight="700" fontSize="11">
        CPU
      </text>

      {/* tier callouts stacked in a legend column on the right */}
      <g>
        {TIERS.map((t, i) => {
          const shown = i <= upto;
          const y = 40 + i * 45;
          const time = scaled ? t.scaled : t.latency;
          return (
            <g key={i} opacity={shown ? 1 : 0.28}>
              {/* connector dot on the ring's rightmost point */}
              <circle cx={CX + t.r} cy={CY} r="4" fill={shown ? t.color : "var(--line)"} />
              <line x1={CX + t.r} y1={CY} x2="392" y2={y - 5} stroke={shown ? t.color : "var(--line)"} strokeWidth="1" opacity="0.5" />
              <rect x="392" y={y - 20} width="212" height="40" rx="6" fill="var(--surface)" stroke={shown ? t.color : "var(--line)"} strokeWidth={shown ? 1.5 : 1} />
              <text x="400" y={y - 5} fill={shown ? "var(--tx)" : "var(--tx3)"} fontWeight="700" fontSize="12">
                {t.name}
              </text>
              <text x="400" y={y + 12} fill={shown ? "var(--tx2)" : "var(--tx3)"} fontSize="10">
                {t.size}
              </text>
              <text x="596" y={y - 5} textAnchor="end" fill={shown ? t.color : "var(--tx3)"} fontWeight="700" fontSize="11">
                {time}
              </text>
              <text x="596" y={y + 12} textAnchor="end" fill="var(--tx3)" fontSize="9">
                {t.place}
              </text>
            </g>
          );
        })}
      </g>

      {/* axis hint: farther = slower */}
      <text x={CX} y="330" textAnchor="middle" fill="var(--tx3)" fontSize="10">
        {scaled ? "if a register access took 1 second…" : "farther from the core = longer the wait"}
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Start at the core. Registers live in the CPU itself — ~1 KB, ~0.3 ns. That is data \"in your hand\": the fastest, smallest, closest store there is.",
    render: () => <Hierarchy upto={0} />,
  },
  {
    caption:
      "One ring out: L1 cache, ~32–64 KB at ~1 ns — a step away. Bigger than registers, but already ~3× the wait. The pattern is set: each ring trades speed for room.",
    render: () => <Hierarchy upto={1} />,
  },
  {
    caption: "L2 cache, ~256 KB–1 MB at ~4 ns — across the room. More capacity, farther to reach, so the latency climbs again.",
    render: () => <Hierarchy upto={2} />,
  },
  {
    caption: "L3 cache, a few to tens of MB at ~12 ns — down the hall, and usually shared between cores. Still on-chip, but you feel the distance now.",
    render: () => <Hierarchy upto={3} />,
  },
  {
    caption:
      "Off the chip: main memory (DRAM), GBs at ~100 ns — a walk across town. Roughly 300× a register access. This gap is the whole reason caches exist.",
    render: () => <Hierarchy upto={4} />,
  },
  {
    caption:
      "The SSD (NVMe), TBs at ~100 µs (100,000 ns) — another city, reached by road. A spinning HDD at ~10 ms would be another continent entirely.",
    render: () => <Hierarchy upto={5} />,
  },
  {
    caption:
      "Now scale every real ratio so a register access = 1 second: L1 ≈ 3 s, L2 ≈ 13 s, L3 ≈ 40 s, RAM ≈ 5–6 minutes, SSD ≈ 4 days, HDD ≈ months. That felt distance is why the whole hierarchy — and every cache — exists.",
    render: () => <Hierarchy upto={5} scaled />,
  },
];

export default function MemoryHierarchy() {
  return (
    <FigureStepper
      title="The memory hierarchy: latency is distance"
      figKey="memory-hierarchy"
      viewBox="0 0 620 340"
      accent="#FB923C"
      frames={FRAMES}
    />
  );
}
