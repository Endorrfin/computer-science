// [fig] guide-tour (ch.0a, front matter) — a quick tour of the guide's signature
// reading mechanisms, one per frame. This isn't teaching a CS concept; it's
// teaching how to READ this guide: the Depth lens that re-renders a chapter at
// two levels, the touchable sims, the predict-first quizzes, the boss
// challenges that light badges on the map, and spaced-repetition review. Each
// frame is a little static diagram of that mechanism — nothing here is a live
// control; the widgets are DEPICTED, not wired.
//
// Purely schematic: geometry is fixed inline, no engine, no state beyond the
// FigureStepper transport (which supplies the parent <svg>, prev/next/auto, and
// re-keys per frame so each render() rides the enter animation). Styled inline
// with theme vars; no CSS file. Prefix for local ids: gt-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const ACCENT = "#94A3B8";

const VB_W = 720;
const VB_H = 420;

// ---------------------------------------------------------------------------
// Shared SVG primitives — all styled inline with theme vars, mirroring the
// house figures (Heading / note / stageNote).
// ---------------------------------------------------------------------------

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="gt-arrow-accent" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
      </marker>
      <marker id="gt-arrow-ok" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-ok)" />
      </marker>
    </defs>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }): ReactNode {
  return (
    <g>
      <text x={26} y={34} fontFamily="var(--font-mono)" fontSize={11} letterSpacing="0.09em" fill="var(--tx3)">
        {kicker.toUpperCase()}
      </text>
      <text x={26} y={57} fontFamily="var(--font-head)" fontSize={18} fontWeight={800} fill="var(--tx)">
        {title}
      </text>
    </g>
  );
}

function note(text: string): ReactNode {
  return (
    <text x={26} y={VB_H - 14} fontFamily="var(--font-mono)" fontSize={12} fill="var(--tx2)">
      {text}
    </text>
  );
}

type Tone = "accent" | "data" | "ok" | "control" | "err";

function toneColor(tone: Tone): string {
  return tone === "data"
    ? "var(--sem-data)"
    : tone === "ok"
      ? "var(--sem-ok)"
      : tone === "control"
        ? "var(--sem-control)"
        : tone === "err"
          ? "var(--sem-err)"
          : ACCENT;
}

function stageNote({ y, text, tone }: { y: number; text: string; tone: Tone }): ReactNode {
  return (
    <text x={VB_W / 2} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={700} fill={toneColor(tone)}>
      {text}
    </text>
  );
}

// A rounded panel with an optional title strip — the base "card" shape reused
// across frames.
function Panel({
  x,
  y,
  w,
  h,
  tone = "accent",
  fillMix = 8,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: Tone;
  fillMix?: number;
}): ReactNode {
  const stroke = toneColor(tone);
  return <rect x={x} y={y} width={w} height={h} rx={12} fill={`color-mix(in srgb, ${stroke} ${fillMix}%, var(--s2))`} stroke={stroke} strokeWidth={1.6} />;
}

// A little "content block" bar inside a card (a stand-in for a paragraph).
function Bar({ x, y, w, tone = "accent", op = 0.55 }: { x: number; y: number; w: number; tone?: Tone; op?: number }): ReactNode {
  return <rect x={x} y={y} width={w} height={9} rx={4} fill={toneColor(tone)} opacity={op} />;
}

// A pill toggle with two options, the active one highlighted.
function Toggle({
  x,
  y,
  left,
  right,
  active,
}: {
  x: number;
  y: number;
  left: string;
  right: string;
  active: "left" | "right";
}): ReactNode {
  const w = 190;
  const h = 30;
  const half = w / 2;
  const onLeft = active === "left";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={15} fill="var(--s2)" stroke="var(--line)" strokeWidth={1.4} />
      <rect
        x={onLeft ? x + 2 : x + half}
        y={y + 2}
        width={half - 2}
        height={h - 4}
        rx={13}
        fill={`color-mix(in srgb, ${ACCENT} 26%, var(--s2))`}
        stroke={ACCENT}
        strokeWidth={1.4}
      />
      <text x={x + half / 2} y={y + h / 2 + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11.5} fontWeight={onLeft ? 700 : 500} fill={onLeft ? "var(--tx)" : "var(--tx2)"}>
        {left}
      </text>
      <text x={x + half + half / 2} y={y + h / 2 + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11.5} fontWeight={onLeft ? 500 : 700} fill={onLeft ? "var(--tx2)" : "var(--tx)"}>
        {right}
      </text>
    </g>
  );
}

// A small control button (play / step / etc.) — depicted, not wired.
function CtrlBtn({ x, y, glyph, w = 34 }: { x: number; y: number; glyph: string; w?: number }): ReactNode {
  const h = 26;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={`color-mix(in srgb, ${ACCENT} 12%, var(--s2))`} stroke={ACCENT} strokeWidth={1.4} />
      <text x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fontWeight={700} fill="var(--tx)">
        {glyph}
      </text>
    </g>
  );
}

// A check badge — a filled disc with a tick, used for "correct" / "cleared".
function CheckBadge({ cx, cy, r = 13, tone = "ok" }: { cx: number; cy: number; r?: number; tone?: Tone }): ReactNode {
  const color = toneColor(tone);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={`color-mix(in srgb, ${color} 22%, var(--s2))`} stroke={color} strokeWidth={1.8} />
      <path
        d={`M ${cx - r * 0.45} ${cy + r * 0.02} L ${cx - r * 0.12} ${cy + r * 0.38} L ${cx + r * 0.5} ${cy - r * 0.4}`}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

// A haloed label so text stays legible over shapes.
function haloText({
  x,
  y,
  text,
  size = 11.5,
  anchor = "middle",
  fill = "var(--tx)",
  weight = 700,
  mono = true,
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  weight?: number;
  mono?: boolean;
}): ReactNode {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontFamily={mono ? "var(--font-mono)" : "var(--font-head)"}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      stroke="var(--bg)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Frame-specific pieces.
// ---------------------------------------------------------------------------

// A chapter "card" rendered with a given number of content blocks, to show the
// Depth lens adding detail. `rows` sets how many bars appear.
function ChapterCard({ x, y, rows, label }: { x: number; y: number; rows: number; label: string }): ReactNode {
  const w = 240;
  const h = 168;
  const bars: ReactNode[] = [];
  let by = y + 46;
  for (let r = 0; r < rows; r++) {
    const wide = r % 3 !== 2;
    bars.push(<Bar key={r} x={x + 18} y={by} w={wide ? w - 36 : w - 96} tone={r % 2 === 0 ? "accent" : "data"} op={0.5} />);
    by += 20;
  }
  return (
    <g>
      <Panel x={x} y={y} w={w} h={h} tone="accent" fillMix={7} />
      {/* title strip */}
      <rect x={x} y={y} width={w} height={30} rx={12} fill={`color-mix(in srgb, ${ACCENT} 16%, var(--s2))`} />
      <rect x={x} y={y + 18} width={w} height={12} fill={`color-mix(in srgb, ${ACCENT} 16%, var(--s2))`} />
      {haloText({ x: x + 14, y: y + 20, text: label, anchor: "start", size: 12, fill: "var(--tx)" })}
      {bars}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frames — one signature mechanism per beat.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — the Depth lens
  {
    caption:
      "The Depth lens is the guide's core control. Every chapter can render at two levels: Foundations gives you the essential picture in a few blocks; flip to Senior and the same chapter re-renders with the deeper detail, edge cases, and formalism added in. Start at Foundations, then raise the depth once the shape is clear — you never leave the page or lose your place.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="How to read this guide · 1 — depth" title="The Depth lens re-renders a chapter" />
        <ChapterCard x={70} y={104} rows={3} label="Ch. 12 · Foundations" />
        <ChapterCard x={410} y={104} rows={6} label="Ch. 12 · Senior" />
        {/* the toggle sits between, with an arrow showing the switch */}
        <Toggle x={VB_W / 2 - 95} y={300} left="Foundations" right="Senior" active="right" />
        <line x1={318} y1={188} x2={402} y2={188} stroke={ACCENT} strokeWidth={2} markerEnd="url(#gt-arrow-accent)" />
        {haloText({ x: VB_W / 2, y: 176, text: "same chapter, more detail", size: 11, fill: "var(--tx2)" })}
        {stageNote({ y: 356, text: "one toggle · same page · deeper on demand", tone: "accent" })}
        {note("read Foundations first, raise to Senior when you want the edge cases and the formal version.")}
      </g>
    ),
  },

  // 1 — touchable sims
  {
    caption:
      "Almost everything here is touchable, not just illustrated. Diagrams like this one are little simulations with their own controls — play to animate, step to advance one beat at a time, reset to start over, and a slider to change a parameter. When you see a control bar, poke it: watching a mechanism run beats reading about it. (The controls in THIS panel are just a picture of that idea.)",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="How to read this guide · 2 — sims" title="Everything is touchable" />
        {/* a mock sim panel: a viewport with a moving dot + a control bar */}
        <Panel x={130} y={92} w={460} h={166} tone="data" fillMix={6} />
        {haloText({ x: 150, y: 114, text: "sim · sorting pass", anchor: "start", size: 11, fill: "var(--sem-data)" })}
        {/* mini bar-chart "state" inside the viewport */}
        {[38, 74, 20, 92, 54, 66].map((hh, k) => (
          <rect
            key={k}
            x={210 + k * 46}
            y={228 - hh}
            width={30}
            height={hh}
            rx={4}
            fill={k === 3 ? "var(--sem-data)" : `color-mix(in srgb, var(--sem-data) 34%, var(--s2))`}
            stroke={k === 3 ? "var(--sem-data)" : "var(--line)"}
            strokeWidth={1.2}
          />
        ))}
        <line x1={200} y1={228} x2={486} y2={228} stroke="var(--line)" strokeWidth={1.4} />
        {/* control bar below the panel */}
        <CtrlBtn x={190} y={276} glyph="⏵" w={40} />
        <CtrlBtn x={238} y={276} glyph="⏭" w={40} />
        <CtrlBtn x={286} y={276} glyph="↺" w={40} />
        {/* a slider */}
        <line x1={352} y1={289} x2={520} y2={289} stroke="var(--line)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={432} cy={289} r={8} fill={ACCENT} stroke="var(--bg)" strokeWidth={1.6} />
        {haloText({ x: 210, y: 268, text: "play", anchor: "middle", size: 9.5, fill: "var(--tx3)" })}
        {haloText({ x: 258, y: 268, text: "step", anchor: "middle", size: 9.5, fill: "var(--tx3)" })}
        {haloText({ x: 306, y: 268, text: "reset", anchor: "middle", size: 9.5, fill: "var(--tx3)" })}
        {haloText({ x: 436, y: 276, text: "speed", anchor: "middle", size: 9.5, fill: "var(--tx3)" })}
        {stageNote({ y: 344, text: "play · step · reset · tweak — then watch it run", tone: "data" })}
        {note("when a figure has a control bar, it's a real sim: stepping through it is the point.")}
      </g>
    ),
  },

  // 2 — predict-quizzes
  {
    caption:
      "Predict-quizzes ask you to COMMIT before you learn. First you choose an answer and lock it in — a real guess, no peeking — and only then does the guide reveal the correct one and explain why. That moment of prediction is what makes the answer stick: you find out exactly where your mental model was right or wrong. Always answer before you reveal.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="How to read this guide · 3 — predict" title="Commit an answer BEFORE the reveal" />
        {/* left card: choose */}
        <Panel x={70} y={100} w={250} h={188} tone="control" fillMix={6} />
        {haloText({ x: 90, y: 124, text: "1 · choose", anchor: "start", size: 12, fill: "var(--sem-control)" })}
        {["O(n)", "O(n log n)", "O(n²)"].map((opt, k) => {
          const oy = 142 + k * 42;
          const picked = k === 1;
          return (
            <g key={k}>
              <rect
                x={90}
                y={oy}
                width={210}
                height={32}
                rx={8}
                fill={picked ? `color-mix(in srgb, ${ACCENT} 20%, var(--s2))` : "var(--s2)"}
                stroke={picked ? ACCENT : "var(--line)"}
                strokeWidth={picked ? 1.9 : 1.3}
              />
              <circle cx={110} cy={oy + 16} r={7} fill={picked ? ACCENT : "none"} stroke={picked ? ACCENT : "var(--tx3)"} strokeWidth={1.6} />
              {haloText({ x: 128, y: oy + 20, text: opt, anchor: "start", size: 12, fill: picked ? "var(--tx)" : "var(--tx2)", weight: picked ? 700 : 500 })}
            </g>
          );
        })}
        {haloText({ x: 195, y: 302, text: "locked in ✓ your guess", size: 10.5, fill: "var(--sem-control)" })}
        {/* arrow → reveal */}
        <line x1={330} y1={194} x2={392} y2={194} stroke={ACCENT} strokeWidth={2} markerEnd="url(#gt-arrow-accent)" />
        {haloText({ x: 361, y: 182, text: "reveal", size: 10, fill: "var(--tx2)" })}
        {/* right card: reveal */}
        <Panel x={400} y={100} w={250} h={188} tone="ok" fillMix={7} />
        {haloText({ x: 420, y: 124, text: "2 · reveal", anchor: "start", size: 12, fill: "var(--sem-ok)" })}
        <rect x={420} y={150} width={210} height={40} rx={8} fill={`color-mix(in srgb, var(--sem-ok) 16%, var(--s2))`} stroke="var(--sem-ok)" strokeWidth={1.8} />
        <CheckBadge cx={440} cy={170} r={11} tone="ok" />
        {haloText({ x: 460, y: 174, text: "O(n log n) — correct", anchor: "start", size: 12, fill: "var(--tx)" })}
        <Bar x={420} y={210} w={210} tone="ok" op={0.45} />
        <Bar x={420} y={228} w={168} tone="ok" op={0.35} />
        <Bar x={420} y={246} w={196} tone="ok" op={0.35} />
        {haloText({ x: 525, y: 276, text: "…then the WHY", size: 10.5, fill: "var(--sem-ok)" })}
        {stageNote({ y: 344, text: "guess first → then see the answer and the reasoning", tone: "control" })}
        {note("the prediction is the learning: committing an answer is what makes the reveal stick.")}
      </g>
    ),
  },

  // 3 — bosses & badges
  {
    caption:
      "Each Part ends with a boss: a harder challenge that pulls its ideas together. Clear it and a badge lights up on your progress map, marking that Part as mastered and unlocking the road ahead. The badges are a map of what you've truly earned — not chapters you scrolled past, but challenges you actually beat.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="How to read this guide · 4 — bosses" title="Clear a boss, light a badge" />
        {/* boss challenge card on the left */}
        <Panel x={70} y={110} w={224} h={168} tone="err" fillMix={7} />
        {haloText({ x: 88, y: 134, text: "PART 3 · boss", anchor: "start", size: 12, fill: "var(--sem-err)" })}
        {haloText({ x: 182, y: 172, text: "◆ challenge", size: 15, fill: "var(--tx)" })}
        <Bar x={90} y={190} w={184} tone="err" op={0.4} />
        <Bar x={90} y={208} w={150} tone="err" op={0.3} />
        <rect x={90} y={232} width={184} height={30} rx={8} fill={`color-mix(in srgb, var(--sem-ok) 20%, var(--s2))`} stroke="var(--sem-ok)" strokeWidth={1.8} />
        {haloText({ x: 182, y: 252, text: "CLEARED ✓", size: 12, fill: "var(--sem-ok)" })}
        {/* arrow to the map */}
        <line x1={304} y1={194} x2={366} y2={194} stroke="var(--sem-ok)" strokeWidth={2} markerEnd="url(#gt-arrow-ok)" />
        {/* progress map: a path of nodes, node 3 newly lit */}
        <Panel x={378} y={110} w={272} h={168} tone="accent" fillMix={6} />
        {haloText({ x: 398, y: 134, text: "your map", anchor: "start", size: 12, fill: "var(--tx2)" })}
        <path d="M 414 236 L 470 200 L 526 236 L 582 176 L 626 200" fill="none" stroke="var(--line)" strokeWidth={2} strokeDasharray="4 4" />
        {[
          { cx: 414, cy: 236, on: true },
          { cx: 470, cy: 200, on: true },
          { cx: 526, cy: 236, on: true, boss: true },
          { cx: 582, cy: 176, on: false },
          { cx: 626, cy: 200, on: false },
        ].map((n, k) => (
          <g key={k}>
            {n.on ? (
              <CheckBadge cx={n.cx} cy={n.cy} r={n.boss ? 14 : 11} tone={n.boss ? "ok" : "accent"} />
            ) : (
              <circle cx={n.cx} cy={n.cy} r={11} fill="var(--s2)" stroke="var(--tx3)" strokeWidth={1.6} strokeDasharray="3 3" />
            )}
            {n.boss && haloText({ x: n.cx, y: n.cy + 30, text: "just earned", size: 9.5, fill: "var(--sem-ok)" })}
          </g>
        ))}
        {stageNote({ y: 344, text: "beat the challenge → the badge lights on your map", tone: "ok" })}
        {note("badges track mastery you earned, not pages you scrolled — and they unlock the next Part.")}
      </g>
    ),
  },

  // 4 — spaced-repetition review
  {
    caption:
      "Finally, review is spaced. Key ideas become flashcards: you see the front (a prompt), try to recall the answer, then flip to check the back. The guide schedules each card to resurface just as you're about to forget it — so a small daily batch of due cards keeps everything you've learned from fading. Clearing your due pile is the cheapest way to make this stick.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="How to read this guide · 5 — review" title="Spaced-repetition flashcards" />
        {/* front card */}
        <Panel x={92} y={112} w={224} h={158} tone="accent" fillMix={7} />
        {haloText({ x: 110, y: 136, text: "front", anchor: "start", size: 11, fill: "var(--tx3)" })}
        {haloText({ x: 204, y: 190, text: "What is a hash", size: 14, fill: "var(--tx)" })}
        {haloText({ x: 204, y: 210, text: "collision?", size: 14, fill: "var(--tx)" })}
        {haloText({ x: 204, y: 250, text: "…try to recall", size: 10.5, fill: "var(--tx2)" })}
        {/* flip arrow */}
        <path d="M 328 176 C 352 164, 376 164, 400 176" fill="none" stroke={ACCENT} strokeWidth={2} markerEnd="url(#gt-arrow-accent)" />
        {haloText({ x: 364, y: 158, text: "flip", size: 10, fill: "var(--tx2)" })}
        {/* back card */}
        <Panel x={410} y={112} w={224} h={158} tone="ok" fillMix={7} />
        {haloText({ x: 428, y: 136, text: "back", anchor: "start", size: 11, fill: "var(--sem-ok)" })}
        {haloText({ x: 522, y: 176, text: "Two keys hash to", size: 12, fill: "var(--tx)" })}
        {haloText({ x: 522, y: 194, text: "the same bucket;", size: 12, fill: "var(--tx)" })}
        {haloText({ x: 522, y: 212, text: "resolve by chaining", size: 12, fill: "var(--tx)" })}
        {haloText({ x: 522, y: 230, text: "or open addressing.", size: 12, fill: "var(--tx)" })}
        <CheckBadge cx={432} cy={250} r={9} tone="ok" />
        {haloText({ x: 500, y: 254, text: "got it", anchor: "start", size: 10.5, fill: "var(--sem-ok)" })}
        {/* due-count chip */}
        <rect x={VB_W / 2 - 66} y={286} width={132} height={26} rx={13} fill={`color-mix(in srgb, var(--sem-control) 16%, var(--s2))`} stroke="var(--sem-control)" strokeWidth={1.4} />
        {haloText({ x: VB_W / 2, y: 303, text: "12 cards due today", size: 11, fill: "var(--sem-control)" })}
        {stageNote({ y: 344, text: "recall → flip → check; cards resurface right before you forget", tone: "accent" })}
        {note("clear the small daily batch of due cards and what you learned stops fading.")}
      </g>
    ),
  },
];

export default function GuideTour(): ReactNode {
  return (
    <FigureStepper
      title="How to travel this guide"
      figKey="guide-tour"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
