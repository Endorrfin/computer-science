// [fig] induction-ladder (ch.0b, front matter) — proof by induction, told as a
// row of dominoes. To prove a statement P(n) for EVERY natural number n you need
// only two things: a BASE CASE (P(0) holds — knock the first domino) and an
// INDUCTIVE STEP (whenever P(k) holds it forces P(k+1) — each falling domino
// pushes the next). Given both, the fall cascades from 0 down the whole row, so
// P(n) is true for all n. We also tie it back to recursion: the base case is
// exactly a recursive function's stopping case.
//
// Schematic: the dominoes' geometry is fixed inline and the "fall" is just a
// per-frame lean angle — nothing is simulated by an engine. FigureStepper
// supplies the parent <svg> and the transport, re-keying per frame so each
// render() rides the enter animation. Styled inline with theme vars; no CSS
// file. Prefix for local ids: il-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const ACCENT = "#94A3B8";

const VB_W = 720;
const VB_H = 420;

// The row of dominoes we knock over. Labels double as the index n.
const N = 6; // dominoes 0..5, with an ellipsis implying "…, n"
const DOM_W = 20;
const DOM_H = 84;
const DOM_GAP = 74; // horizontal spacing between domino centres
const ROW_X0 = 96; // centre x of domino 0
const GROUND_Y = 300; // the baseline the dominoes stand on

function domCx(i: number): number {
  return ROW_X0 + i * DOM_GAP;
}

// ---------------------------------------------------------------------------
// Shared SVG primitives — styled inline with theme vars (Heading / note /
// stageNote), mirroring the house figures.
// ---------------------------------------------------------------------------

function Defs(): ReactNode {
  return (
    <defs>
      <marker id="il-arrow-accent" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
      </marker>
      <marker id="il-arrow-ok" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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

function haloText({
  x,
  y,
  text,
  size = 11.5,
  anchor = "middle",
  fill = "var(--tx)",
  weight = 700,
}: {
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  weight?: number;
}): ReactNode {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily="var(--font-mono)" fontSize={size} fontWeight={weight} fill={fill} stroke="var(--bg)" strokeWidth={3} paintOrder="stroke">
      {text}
    </text>
  );
}

// One domino, standing (lean = 0) or tipped by `lean` degrees about its base.
// `tone` colours a standing domino; a fallen one dims to a "used" grey-green.
// `check` draws a tick on it (for the verified base case).
function Domino({
  i,
  lean = 0,
  tone = "accent",
  fallen = false,
  check = false,
  ellipsis = false,
}: {
  i: number;
  lean?: number;
  tone?: Tone;
  fallen?: boolean;
  check?: boolean;
  ellipsis?: boolean;
}): ReactNode {
  const cx = domCx(i);
  const baseY = GROUND_Y;
  const stroke = fallen ? "var(--sem-ok)" : toneColor(tone);
  const fill = fallen ? `color-mix(in srgb, var(--sem-ok) 14%, var(--s2))` : `color-mix(in srgb, ${toneColor(tone)} 12%, var(--s2))`;
  // Rotate the whole domino about the bottom-right pivot so it "falls" forward.
  const pivotX = cx + DOM_W / 2;
  const pivotY = baseY;
  return (
    <g transform={`rotate(${lean} ${pivotX} ${pivotY})`}>
      <rect x={cx - DOM_W / 2} y={baseY - DOM_H} width={DOM_W} height={DOM_H} rx={4} fill={fill} stroke={stroke} strokeWidth={2} />
      {/* the classic centre divider + two pips, so it reads as a domino */}
      <line x1={cx - DOM_W / 2 + 2} y1={baseY - DOM_H / 2} x2={cx + DOM_W / 2 - 2} y2={baseY - DOM_H / 2} stroke={stroke} strokeWidth={1.2} strokeOpacity={0.7} />
      <circle cx={cx} cy={baseY - DOM_H * 0.72} r={2.4} fill={stroke} />
      <circle cx={cx} cy={baseY - DOM_H * 0.28} r={2.4} fill={stroke} />
      {check && (
        <path
          d={`M ${cx - 6} ${baseY - DOM_H / 2} L ${cx - 1} ${baseY - DOM_H / 2 + 6} L ${cx + 7} ${baseY - DOM_H / 2 - 6}`}
          fill="none"
          stroke="var(--sem-ok)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {ellipsis && haloText({ x: cx, y: baseY - DOM_H / 2 + 4, text: "…", size: 18, fill: stroke })}
    </g>
  );
}

// The floor line + the index labels beneath each domino.
function Ground({ nLabel = true }: { nLabel?: boolean }): ReactNode {
  return (
    <g>
      <line x1={ROW_X0 - 44} y1={GROUND_Y} x2={domCx(N - 1) + 60} y2={GROUND_Y} stroke="var(--line)" strokeWidth={2} />
      {Array.from({ length: N }, (_, i) => {
        const isLast = i === N - 1;
        const label = isLast ? "n" : String(i);
        return (
          <text key={i} x={domCx(i)} y={GROUND_Y + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fontWeight={700} fill={isLast ? "var(--tx)" : "var(--tx2)"}>
            {label}
          </text>
        );
      })}
      {/* an ellipsis label between the last explicit index and n */}
      {nLabel && (
        <text x={(domCx(N - 2) + domCx(N - 1)) / 2} y={GROUND_Y + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fill="var(--tx3)">
          …
        </text>
      )}
    </g>
  );
}

// A recursion aside chip tying base case ⇄ stopping case.
function RecursionNote({ x, y }: { x: number; y: number }): ReactNode {
  const w = 300;
  const h = 40;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={9} fill={`color-mix(in srgb, var(--sem-data) 9%, var(--s2))`} stroke="var(--sem-data)" strokeWidth={1.4} />
      <text x={x + 12} y={y + 17} fontFamily="var(--font-mono)" fontSize={11} fontWeight={700} fill="var(--sem-data)">
        ~ recursion link
      </text>
      <text x={x + 12} y={y + 32} fontFamily="var(--font-mono)" fontSize={10.5} fill="var(--tx2)">
        base case = the stopping case that ends the recursion
      </text>
    </g>
  );
}

// Compute the lean of domino i on the "cascade" frame: dominoes up to `front`
// are down (90°), the one at `front` is mid-fall, the rest still stand.
function cascadeLean(i: number, front: number): number {
  if (i < front) return 90;
  if (i === front) return 52; // caught mid-topple
  return 0;
}

// ---------------------------------------------------------------------------
// Frames.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — the whole row standing, labelled 0..n
  {
    caption:
      "We want to prove a statement P(n) holds for EVERY natural number n — 0, 1, 2, 3, and on forever. Picture the claim as an endless row of dominoes, one per n, all standing. Induction is the promise that we can topple the entire row by checking just two simple things — never touching them one by one.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Proof by induction · 1 — the claim" title="A statement P(n) for every n" />
        {Array.from({ length: N }, (_, i) => (
          <Domino key={i} i={i} tone="accent" ellipsis={i === N - 2} />
        ))}
        <Ground />
        {haloText({ x: (ROW_X0 + domCx(N - 1)) / 2, y: 128, text: "prove P(n) for all n = 0, 1, 2, …", size: 12.5, fill: "var(--tx)" })}
        {stageNote({ y: 356, text: "one domino per n — an infinite row, all standing", tone: "accent" })}
        {note("goal: show every P(n) is true — but we will only ever check two things, not each n.")}
      </g>
    ),
  },

  // 1 — base case: verify domino 0
  {
    caption:
      "BASE CASE — verify P(0) directly. This is the one domino we tip by hand: check that the statement genuinely holds for the smallest value. It's usually a quick, concrete calculation. Without a base case the whole chain has nothing to start it — so this small step is doing real work, not a formality.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Proof by induction · 2 — base case" title="Check P(0) directly" />
        {Array.from({ length: N }, (_, i) =>
          i === 0 ? (
            <Domino key={i} i={i} tone="ok" fallen check />
          ) : (
            <Domino key={i} i={i} tone="accent" ellipsis={i === N - 2} />
          ),
        )}
        <Ground />
        {/* callout on domino 0 */}
        <line x1={domCx(0)} y1={168} x2={domCx(0)} y2={GROUND_Y - DOM_H - 6} stroke="var(--sem-ok)" strokeWidth={1.6} markerEnd="url(#il-arrow-ok)" />
        {haloText({ x: domCx(0), y: 156, text: "P(0) holds ✓", size: 12, fill: "var(--sem-ok)" })}
        <RecursionNote x={VB_W - 328} y={132} />
        {stageNote({ y: 356, text: "the base case is the domino you tip by hand", tone: "ok" })}
        {note("verify the smallest case concretely; with no base case nothing can start the chain.")}
      </g>
    ),
  },

  // 2 — inductive step: k ⇒ k+1 as a general rule
  {
    caption:
      "INDUCTIVE STEP — prove the general rule: ASSUME P(k) is true (the inductive hypothesis) and show it forces P(k+1). This is one argument that works for every k at once — the guarantee that any standing domino, once it falls, knocks over its neighbour. You prove the implication P(k) ⇒ P(k+1); you do NOT assume the thing you're proving for all n.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Proof by induction · 3 — inductive step" title="Show P(k) ⇒ P(k+1)" />
        {/* focus on two adjacent dominoes k and k+1 in the middle of the row */}
        {Array.from({ length: N }, (_, i) => {
          const isK = i === 2;
          const isK1 = i === 3;
          const tone: Tone = isK || isK1 ? "accent" : "accent";
          const dim = !(isK || isK1);
          return (
            <g key={i} opacity={dim ? 0.4 : 1}>
              <Domino i={i} tone={tone} ellipsis={i === N - 2} />
            </g>
          );
        })}
        <Ground />
        {/* relabel the two focus dominoes as k and k+1 */}
        {haloText({ x: domCx(2), y: GROUND_Y + 22, text: "k", size: 13, fill: "var(--tx)" })}
        {haloText({ x: domCx(3), y: GROUND_Y + 22, text: "k+1", size: 13, fill: "var(--tx)" })}
        {/* the implication arrow from k to k+1 */}
        <path
          d={`M ${domCx(2) + 12} ${GROUND_Y - DOM_H - 14} C ${domCx(2) + 40} ${GROUND_Y - DOM_H - 46}, ${domCx(3) - 40} ${GROUND_Y - DOM_H - 46}, ${domCx(3) - 12} ${GROUND_Y - DOM_H - 14}`}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2.2}
          markerEnd="url(#il-arrow-accent)"
        />
        {haloText({ x: (domCx(2) + domCx(3)) / 2, y: GROUND_Y - DOM_H - 54, text: "if k falls → k+1 falls", size: 12, fill: ACCENT })}
        {haloText({ x: (domCx(2) + domCx(3)) / 2, y: 130, text: "assume P(k), then derive P(k+1)  —  one rule, every k", size: 12, fill: "var(--tx)" })}
        {stageNote({ y: 356, text: "prove the IMPLICATION, not the conclusion itself", tone: "accent" })}
        {note("inductive hypothesis: assume P(k). The step is a single argument that covers every k.")}
      </g>
    ),
  },

  // 3 — the cascade begins
  {
    caption:
      "Now put the two pieces together and let go. The base case tips domino 0; the inductive step means 0 knocks 1, 1 knocks 2, 2 knocks 3 — the fall PROPAGATES down the line on its own. We never pushed dominoes 1, 2, 3 individually; the general rule did it for us, each fall triggering the next.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Proof by induction · 4 — cascade" title="0 pushes 1 pushes 2 …" />
        {Array.from({ length: N }, (_, i) => {
          const lean = cascadeLean(i, 3);
          const down = lean >= 90;
          return <Domino key={i} i={i} lean={lean} tone="accent" fallen={down} check={i === 0} ellipsis={i === N - 2} />;
        })}
        <Ground />
        {/* propagation arrows over the already-fallen dominoes */}
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M ${domCx(i) + 8} 168 C ${domCx(i) + 30} 150, ${domCx(i + 1) - 30} 150, ${domCx(i + 1) - 8} 168`}
            fill="none"
            stroke="var(--sem-ok)"
            strokeWidth={1.8}
            markerEnd="url(#il-arrow-ok)"
          />
        ))}
        {haloText({ x: (domCx(0) + domCx(3)) / 2, y: 138, text: "each fall triggers the next", size: 12, fill: "var(--sem-ok)" })}
        {stageNote({ y: 356, text: "base case + step, released → the fall propagates", tone: "ok" })}
        {note("we never pushed 1, 2, 3 by hand — the inductive step chains the fall automatically.")}
      </g>
    ),
  },

  // 4 — all n fall
  {
    caption:
      "Because the chain never breaks, EVERY domino falls — the whole infinite row topples. That is the conclusion: P(n) is true for all n. Two finite checks (a base case and one general step) certified an infinite family of statements. This is the whole power of induction — and the base case is exactly a recursion's stopping case, the point where the self-reference finally bottoms out.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Proof by induction · 5 — conclusion" title="Therefore P(n) holds for every n" />
        {Array.from({ length: N }, (_, i) => (
          <Domino key={i} i={i} lean={90} tone="accent" fallen check={i === 0} ellipsis={i === N - 2} />
        ))}
        <Ground />
        <RecursionNote x={VB_W - 328} y={128} />
        {haloText({ x: (ROW_X0 + domCx(N - 3)) / 2, y: 132, text: "∀ n : P(n)  ✓", size: 15, fill: "var(--sem-ok)" })}
        {haloText({ x: (ROW_X0 + domCx(N - 3)) / 2, y: 154, text: "the entire row has toppled", size: 11.5, fill: "var(--tx2)" })}
        {stageNote({ y: 356, text: "two finite checks certify infinitely many n", tone: "ok" })}
        {note("base case + inductive step ⇒ true for all n; the base case mirrors recursion's stopping case.")}
      </g>
    ),
  },
];

export default function InductionLadder(): ReactNode {
  return (
    <FigureStepper
      title="Proof by induction, as dominoes"
      figKey="induction-ladder"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
