// [fig] stack-vs-heap — one process's virtual address space as a single tall bar,
// and how it moves at runtime. Fixed at the bottom: CODE (the program's text) and
// DATA (globals/constants). Above them the HEAP grows UPWARD as you malloc/new;
// from the very top the STACK grows DOWNWARD as calls nest; between them a large
// free GAP the two ends eat into. The story: a call pushes a stack frame (down), a
// nested call pushes another, a malloc peppers the heap (up), a return pops its
// frame back (auto-reclaimed) — but a LEAK is heap that was allocated and never
// freed, so the heap's high-water mark ratchets up and never returns. Repeat leaks
// and the heap creeps toward the stack until the gap is gone: out of memory. Ties
// to ch.10's call stack and ch.23's virtual memory. No GIFs (§6): stepped SVG
// frames via FigureStepper. Palette (§7): stack = cyan (data), heap = green (ok),
// leak = red (err), fixed code/data = muted, arrows show growth direction.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

// ── Geometry ────────────────────────────────────────────────────────────────
// The address-space bar. TOP = high addresses, BOTTOM = address 0.
const BAR = { x: 176, w: 168, top: 52, bottom: 430 };
const RIGHT = BAR.x + BAR.w; // right edge of the bar

// Fixed regions pinned to the bottom (address 0 side). Heights in px.
const CODE_H = 34; // program text
const DATA_H = 30; // globals / static data
const CODE_TOP = BAR.bottom - CODE_H;
const DATA_TOP = CODE_TOP - DATA_H;

const HEAP_BASE = DATA_TOP; // heap grows UP from just above data
const STACK_TOP = BAR.top; // stack grows DOWN from the top

const FRAME_H = 30; // one stack frame's height
const BLOCK_H = 26; // one heap allocation's height
const BLOCK_GAP = 6; // vertical spacing between heap blocks

// A heap allocation. `leaked` blocks are drawn red and pin the high-water mark.
type Alloc = { label: string; leaked: boolean };

type Scene = {
  frames: string[]; // stack frames, outermost (main) first
  allocs: Alloc[]; // heap blocks, oldest first (bottom of heap)
  highWater: number | null; // # of block slots the heap high-water mark has reached
  hi: "stack" | "heap" | "leak" | "gap" | null; // region to spotlight this frame
};

function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, var(--surface))`;
}

// ── Static markers (arrow heads) ──────────────────────────────────────────────
function Defs(): ReactNode {
  return (
    <defs>
      <marker id="shDown" markerWidth="10" markerHeight="10" refX="4" refY="7" orient="auto">
        <path d="M1,1 L4,7 L7,1" fill="none" stroke="var(--sem-data)" strokeWidth="1.6" />
      </marker>
      <marker id="shUp" markerWidth="10" markerHeight="10" refX="4" refY="1" orient="auto">
        <path d="M1,7 L4,1 L7,7" fill="none" stroke="var(--sem-ok)" strokeWidth="1.6" />
      </marker>
    </defs>
  );
}

// A left-side address tick + label, from the bar out to the left.
function AddrTick(y: number, text: string, sub: string): ReactNode {
  return (
    <g fontFamily="var(--font-mono)">
      <line x1={BAR.x - 8} y1={y} x2={BAR.x} y2={y} stroke="var(--tx3)" strokeWidth={1.25} />
      <text x={BAR.x - 12} y={y - 2} textAnchor="end" fontSize="11" fontWeight={700} fill="var(--tx2)">
        {text}
      </text>
      <text x={BAR.x - 12} y={y + 10} textAnchor="end" fontSize="9" fill="var(--tx3)">
        {sub}
      </text>
    </g>
  );
}

// A region band with a centered label; `dim` mutes it, `hl` thickens the border.
function Band(y: number, h: number, color: string, label: string, sub: string, opts: { dim?: boolean; hl?: boolean } = {}): ReactNode {
  const stroke = opts.dim ? "var(--line)" : color;
  const strong = opts.dim ? "var(--tx3)" : "var(--tx)";
  return (
    <g fontFamily="var(--font-mono)">
      <rect x={BAR.x} y={y} width={BAR.w} height={h} fill={tint(color, opts.dim ? 8 : 16)} stroke={stroke} strokeWidth={opts.hl ? 2.5 : 1.5} />
      <text x={BAR.x + BAR.w / 2} y={y + h / 2 + (sub ? -1 : 4)} textAnchor="middle" fontSize="11.5" fontWeight={700} fill={strong}>
        {label}
      </text>
      {sub && (
        <text x={BAR.x + BAR.w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize="9" fill={opts.dim ? "var(--tx3)" : "var(--tx2)"}>
          {sub}
        </text>
      )}
    </g>
  );
}

// ── The full picture for a scene ──────────────────────────────────────────────
function draw(s: Scene): () => ReactNode {
  return () => {
    // Stack occupies STACK_TOP downward, one FRAME_H per frame.
    const stackBottom = STACK_TOP + s.frames.length * FRAME_H;
    // Heap occupies HEAP_BASE upward, one (BLOCK_H+BLOCK_GAP) per block.
    const heapSlot = BLOCK_H + BLOCK_GAP;
    const heapTop = HEAP_BASE - s.allocs.length * heapSlot;
    const waterTop = s.highWater != null ? HEAP_BASE - s.highWater * heapSlot : heapTop;
    const gapShrunk = s.hi === "gap";

    return (
      <g fontFamily="var(--font-body)">
        <Defs />
        <text x={BAR.x + BAR.w / 2} y={30} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--tx)">
          One process — its virtual address space
        </text>

        {/* the address-space frame */}
        <rect x={BAR.x} y={BAR.top} width={BAR.w} height={BAR.bottom - BAR.top} fill="var(--s2)" stroke="var(--line)" strokeWidth={1.5} rx={4} />

        {/* address labels: top = high, bottom = 0 */}
        {AddrTick(BAR.top, "0xFFFF…", "high addresses")}
        {AddrTick(BAR.bottom, "0x0000", "address 0")}

        {/* ── STACK: grows DOWN from the top ── */}
        {s.frames.map((f, i) => {
          const y = STACK_TOP + i * FRAME_H;
          const newest = i === s.frames.length - 1;
          const hot = s.hi === "stack" && newest;
          return <g key={`sf-${i}`}>{Band(y, FRAME_H, "var(--sem-data)", f, i === 0 ? "" : "call frame", { hl: hot })}</g>;
        })}
        {/* stack region label + downward growth arrow, just under the frames */}
        <text x={BAR.x + BAR.w / 2} y={stackBottom + 16} textAnchor="middle" fontSize="10.5" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--sem-data)">
          STACK ↓
        </text>
        <line x1={RIGHT + 18} y1={STACK_TOP + 4} x2={RIGHT + 18} y2={stackBottom + 8} stroke="var(--sem-data)" strokeWidth={1.5} markerEnd="url(#shDown)" />
        <text x={RIGHT + 24} y={STACK_TOP + 28} fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-data)">
          grows
        </text>
        <text x={RIGHT + 24} y={STACK_TOP + 40} fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-data)">
          down
        </text>

        {/* ── free GAP between the two ends ── */}
        {(() => {
          const gTop = stackBottom;
          const gBottom = waterTop; // gap ends at the highest the heap has ever reached
          const gh = Math.max(0, gBottom - gTop);
          return (
            <g fontFamily="var(--font-mono)">
              <rect x={BAR.x + 2} y={gTop} width={BAR.w - 4} height={gh} fill="none" stroke={gapShrunk ? "var(--sem-err)" : "var(--tx3)"} strokeWidth={gapShrunk ? 1.75 : 1} strokeDasharray="4 5" />
              {gh > 26 && (
                <text x={BAR.x + BAR.w / 2} y={(gTop + gBottom) / 2 + 4} textAnchor="middle" fontSize="10.5" fill={gapShrunk ? "var(--sem-err)" : "var(--tx3)"} fontWeight={gapShrunk ? 700 : 400}>
                  {gapShrunk ? "gap shrinking →" : "free gap"}
                </text>
              )}
            </g>
          );
        })()}

        {/* high-water mark: dashed line the leaked heap never falls below */}
        {s.highWater != null && s.highWater > s.allocs.length && (
          <g fontFamily="var(--font-mono)">
            <line x1={BAR.x} y1={waterTop} x2={RIGHT} y2={waterTop} stroke="var(--sem-err)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text x={BAR.x + 4} y={waterTop - 4} fontSize="9" fill="var(--sem-err)">
              high-water mark
            </text>
          </g>
        )}

        {/* ── HEAP: grows UP from just above DATA ── */}
        {s.allocs.map((a, i) => {
          const y = HEAP_BASE - (i + 1) * heapSlot + BLOCK_GAP / 2;
          const color = a.leaked ? "var(--sem-err)" : "var(--sem-ok)";
          const newest = i === s.allocs.length - 1;
          const hot = (s.hi === "heap" && newest) || (s.hi === "leak" && a.leaked);
          return (
            <g key={`hb-${i}`} fontFamily="var(--font-mono)">
              <rect x={BAR.x + 10} y={y} width={BAR.w - 20} height={BLOCK_H} rx={4} fill={tint(color, hot ? 26 : 15)} stroke={color} strokeWidth={hot ? 2.5 : 1.5} />
              <text x={BAR.x + BAR.w / 2} y={y + BLOCK_H / 2 + 4} textAnchor="middle" fontSize="10" fontWeight={a.leaked ? 700 : 400} fill={a.leaked ? "var(--sem-err)" : "var(--tx)"}>
                {a.label}
              </text>
            </g>
          );
        })}
        {/* heap region label + upward growth arrow */}
        {heapTop < HEAP_BASE && (
          <text x={BAR.x + BAR.w / 2} y={heapTop - 8} textAnchor="middle" fontSize="10.5" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--sem-ok)">
            HEAP ↑
          </text>
        )}
        <line x1={BAR.x - 22} y1={HEAP_BASE} x2={BAR.x - 22} y2={HEAP_BASE - 60} stroke="var(--sem-ok)" strokeWidth={1.5} markerEnd="url(#shUp)" />
        <text x={BAR.x - 40} y={HEAP_BASE - 20} fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-ok)" textAnchor="middle">
          grows
        </text>
        <text x={BAR.x - 40} y={HEAP_BASE - 8} fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-ok)" textAnchor="middle">
          up
        </text>

        {/* ── fixed regions pinned to the bottom ── */}
        {Band(DATA_TOP, DATA_H, "var(--tx3)", "DATA", "globals · statics", { dim: true })}
        {Band(CODE_TOP, CODE_H, "var(--tx3)", "CODE", "program text · read-only", { dim: true })}
      </g>
    );
  };
}

// ── Scenes, in narrative order ────────────────────────────────────────────────
const S_EMPTY: Scene = { frames: ["main()"], allocs: [], highWater: null, hi: null };
const S_CALL1: Scene = { frames: ["main()", "greet()"], allocs: [], highWater: null, hi: "stack" };
const S_CALL2: Scene = { frames: ["main()", "greet()", "format()"], allocs: [], highWater: null, hi: "stack" };
const S_MALLOC: Scene = { frames: ["main()", "greet()", "format()"], allocs: [{ label: "buf = malloc()", leaked: false }], highWater: null, hi: "heap" };
const S_RETURN: Scene = { frames: ["main()", "greet()"], allocs: [{ label: "buf = malloc()", leaked: false }], highWater: null, hi: "stack" };
const S_LEAK: Scene = {
  frames: ["main()"],
  allocs: [{ label: "buf (leaked)", leaked: true }],
  highWater: 1,
  hi: "leak",
};
const S_OOM: Scene = {
  frames: ["main()", "loop()"],
  allocs: [
    { label: "buf (leaked)", leaked: true },
    { label: "leak #2", leaked: true },
    { label: "leak #3", leaked: true },
    { label: "leak #4", leaked: true },
  ],
  highWater: 4,
  hi: "gap",
};

const FRAMES: Frame[] = [
  {
    caption:
      "One running program sees a single tall address space. TOP = high addresses, BOTTOM = address 0. At the bottom sit the fixed regions: CODE (the compiled instructions, read-only) and DATA (globals and static constants). Above them the HEAP grows UPWARD; from the very top the STACK grows DOWNWARD; between them a large free GAP. The two ends grow toward each other.",
    render: draw(S_EMPTY),
  },
  {
    caption:
      "Call a function and one stack frame is PUSHED — the stack extends down a notch. That frame holds the function's parameters, locals, and return address: exactly ch.10's call stack, now shown as real memory. Pushing is just moving the stack pointer down; no allocator, no search.",
    render: draw(S_CALL1),
  },
  {
    caption:
      "A nested call — greet() calls format() — pushes another frame, so the stack extends further down. Each active call owns one frame; the depth of this pile is your call depth. Recurse too deep and the stack runs into the gap: a stack overflow.",
    render: draw(S_CALL2),
  },
  {
    caption:
      "Now format() runs malloc()/new: it asks the allocator for memory that must outlive this call, and a block appears on the HEAP, extending it UPWARD. Unlike a stack frame, a heap block has no fixed lifetime — it lives until something explicitly frees it (or a garbage collector proves it dead).",
    render: draw(S_MALLOC),
  },
  {
    caption:
      "format() returns. Its stack frame is POPPED and the stack shrinks back up — automatically, just by moving the stack pointer. All of that frame's locals vanish for free. The heap block, though, is untouched: heap memory is never reclaimed by returning.",
    render: draw(S_RETURN),
  },
  {
    caption:
      "Here is the bug: that heap block is never freed, and the last pointer to it is now gone — so it can never be freed. That is a LEAK (marked red): heap memory still reserved but unreachable. The heap's high-water mark ratchets UP and does NOT come back down when calls return.",
    render: draw(S_LEAK),
  },
  {
    caption:
      "Leak in a loop and the high-water mark keeps climbing — the heap creeps toward the stack and the free gap shrinks. Enough leaks and the two ends collide: out of memory. A garbage collector or a disciplined free() reclaims dead heap so the mark can fall; a leak is precisely the memory neither ever gets back.",
    render: draw(S_OOM),
  },
];

export default function StackVsHeap() {
  return <FigureStepper title="Stack vs heap — one process's address space at runtime" figKey="stack-vs-heap" viewBox="0 0 520 470" accent="#22d3ee" frames={FRAMES} />;
}
