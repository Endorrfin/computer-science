// [fig] transformer-block (ch.34, Part 10) — one transformer block, built up
// cumulatively. A block is a small, repeatable machine that (1) turns tokens
// into vectors, (2) lets every token MIX IN CONTEXT from every other token via
// self-attention (softmax(Q·Kᵀ/√d)·V), split across parallel heads, (3) wraps
// that in a residual "add" so the input can skip around it, (4) refines each
// token independently with a feed-forward MLP (plus its own residual), and (5)
// emits a representation that, at the top of the stack, becomes a distribution
// over the vocabulary — the next-token prediction. Stack dozens of these and you
// have a language model.
//
// This is a NARRATIVE / schematic figure: there is no engine. The layout below
// (token positions, head lanes, the little probability bars) is illustrative and
// fixed inline — nothing is recomputed. FigureStepper provides the parent <svg>,
// the transport (prev / next / auto), and re-keys per frame so each render()
// rides the enter animation. Styled inline with theme vars; no CSS file. Prefix
// for any local ids: tb-.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

const ACCENT = "#A78BFA";

const VB_W = 720;
const VB_H = 420;

// The tokens we walk through the block. Purely illustrative.
const TOKENS = ["The", "cat", "sat", "on"] as const;

// Token-box geometry along the input row.
const TOK_W = 92;
const TOK_H = 44;
const TOK_GAP = 22;
const ROW_N = TOKENS.length;
const ROW_W = ROW_N * TOK_W + (ROW_N - 1) * TOK_GAP;
const ROW_X0 = (VB_W - ROW_W) / 2; // centred row
const INPUT_Y = 300; // baseline y of the input token row (top of box)

function tokenX(i: number): number {
  return ROW_X0 + i * (TOK_W + TOK_GAP);
}
function tokenCx(i: number): number {
  return tokenX(i) + TOK_W / 2;
}

// ---------------------------------------------------------------------------
// Small SVG primitives — all styled inline with theme vars.
// ---------------------------------------------------------------------------

// Shared arrow-heads, tinted per semantic role.
function Defs(): ReactNode {
  return (
    <defs>
      <marker id="tb-arrow-accent" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={ACCENT} />
      </marker>
      <marker id="tb-arrow-data" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-data)" />
      </marker>
      <marker id="tb-arrow-ok" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-ok)" />
      </marker>
      <marker id="tb-arrow-tx" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--tx2)" />
      </marker>
    </defs>
  );
}

// The top-left frame heading (kicker + title), mirroring the house figures.
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

// The bottom in-SVG note line.
function note(text: string): ReactNode {
  return (
    <text x={26} y={VB_H - 14} fontFamily="var(--font-mono)" fontSize={12} fill="var(--tx2)">
      {text}
    </text>
  );
}

// A stage note: one emphasised mono beat, centred under the stack.
function stageNote({ y, text, tone }: { y: number; text: string; tone: "accent" | "data" | "ok" | "control" }): ReactNode {
  const color =
    tone === "data" ? "var(--sem-data)" : tone === "ok" ? "var(--sem-ok)" : tone === "control" ? "var(--sem-control)" : ACCENT;
  return (
    <text x={VB_W / 2} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12.5} fontWeight={700} fill={color}>
      {text}
    </text>
  );
}

// One token box: a rounded rect with the word on top and a tiny "vector" of
// cells beneath, to convey "this token is an embedding vector".
function TokenBox({
  i,
  active = true,
  showVector = true,
}: {
  i: number;
  active?: boolean;
  showVector?: boolean;
}): ReactNode {
  const x = tokenX(i);
  const stroke = active ? "var(--sem-data)" : "var(--line)";
  const fill = active ? "color-mix(in srgb, var(--sem-data) 12%, var(--surface))" : "var(--surface)";
  const cells = 4;
  const cellW = (TOK_W - 20) / cells;
  const shades = [26, 46, 34, 52];
  return (
    <g>
      <rect x={x} y={INPUT_Y} width={TOK_W} height={TOK_H} rx={8} fill={fill} stroke={stroke} strokeWidth={1.6} />
      <text
        x={x + TOK_W / 2}
        y={INPUT_Y + 18}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={13}
        fontWeight={700}
        fill={active ? "var(--tx)" : "var(--tx2)"}
      >
        {TOKENS[i]}
      </text>
      {showVector &&
        Array.from({ length: cells }, (_, c) => (
          <rect
            key={c}
            x={x + 10 + c * cellW}
            y={INPUT_Y + 26}
            width={cellW - 3}
            height={9}
            rx={2}
            fill={`color-mix(in srgb, var(--sem-data) ${shades[c % shades.length]}%, var(--s2))`}
          />
        ))}
    </g>
  );
}

// The positional-encoding tag that rides just under a token box.
function PosTag({ i }: { i: number }): ReactNode {
  const x = tokenX(i);
  return (
    <g>
      <rect
        x={x + TOK_W / 2 - 20}
        y={INPUT_Y + TOK_H + 8}
        width={40}
        height={17}
        rx={8}
        fill="color-mix(in srgb, var(--sem-control) 14%, var(--surface))"
        stroke="var(--sem-control)"
        strokeWidth={1.2}
      />
      <text x={x + TOK_W / 2} y={INPUT_Y + TOK_H + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="var(--sem-control)">
        pos {i}
      </text>
    </g>
  );
}

// A labelled processing block (a rounded panel) sitting above the token row.
function Block({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  tone: "accent" | "state" | "data";
}): ReactNode {
  const stroke = tone === "state" ? "var(--sem-state)" : tone === "data" ? "var(--sem-data)" : ACCENT;
  const fill =
    tone === "state"
      ? "color-mix(in srgb, var(--sem-state) 10%, var(--surface))"
      : tone === "data"
        ? "color-mix(in srgb, var(--sem-data) 10%, var(--surface))"
        : "color-mix(in srgb, #A78BFA 12%, var(--surface))";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={1.8} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 2 : h / 2 + 4)} textAnchor="middle" fontFamily="var(--font-head)" fontSize={14} fontWeight={800} fill="var(--tx)">
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill={stroke}>
          {sub}
        </text>
      )}
    </g>
  );
}

// The stack of token boxes with optional positional tags.
function TokenRow({ showPos }: { showPos?: boolean }): ReactNode {
  return (
    <g>
      {TOKENS.map((_, i) => (
        <g key={i}>
          <TokenBox i={i} />
          {showPos && <PosTag i={i} />}
        </g>
      ))}
    </g>
  );
}

// A residual "skip" arc that carries the input up and around a block, landing on
// a ⊕ add node. Drawn to the LEFT of the stack so it reads as "bypass".
function ResidualArc({
  fromY,
  toY,
  addCx,
  addCy,
  label,
}: {
  fromY: number;
  toY: number;
  addCx: number;
  addCy: number;
  label: string;
}): ReactNode {
  const x = ROW_X0 - 34; // the skip lane, left of the token row
  const startX = ROW_X0 - 4;
  const startY = fromY;
  const d = `M ${startX} ${startY} C ${x - 20} ${startY}, ${x - 20} ${toY}, ${addCx - 12} ${addCy}`;
  return (
    <g>
      <path d={d} fill="none" stroke="var(--sem-ok)" strokeWidth={2} strokeDasharray="6 5" markerEnd="url(#tb-arrow-ok)" />
      <PlusNode cx={addCx} cy={addCy} />
      <text x={x - 26} y={(startY + toY) / 2} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10.5} fill="var(--sem-ok)" transform={`rotate(-90 ${x - 26} ${(startY + toY) / 2})`}>
        {label}
      </text>
    </g>
  );
}

// A ⊕ add node where a residual re-joins the main path.
function PlusNode({ cx, cy }: { cx: number; cy: number }): ReactNode {
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="var(--surface)" stroke="var(--sem-ok)" strokeWidth={1.8} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={15} fontWeight={700} fill="var(--sem-ok)">
        +
      </text>
    </g>
  );
}

// Straight vertical feed arrows from the token row up into a block.
function FeedUp({ y1, y2, marker = "url(#tb-arrow-accent)" }: { y1: number; y2: number; marker?: string }): ReactNode {
  return (
    <g>
      {TOKENS.map((_, i) => (
        <line key={i} x1={tokenCx(i)} y1={y1} x2={tokenCx(i)} y2={y2} stroke="var(--tx3)" strokeWidth={1.4} markerEnd={marker} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frame-specific pieces.
// ---------------------------------------------------------------------------

// Self-attention lines: for a chosen query token, faint weighted links to all
// tokens (including itself). Line thickness ≈ illustrative attention weight.
function AttentionLines({ q }: { q: number }): ReactNode {
  const topY = INPUT_Y - 6;
  // Illustrative weights per source token, keyed by |distance| from q.
  const weightFor = (src: number): number => {
    const dist = Math.abs(src - q);
    return dist === 0 ? 3.4 : dist === 1 ? 2.3 : 1.3;
  };
  return (
    <g>
      {TOKENS.map((_, src) => {
        const w = weightFor(src);
        // Arc from the query token up over to each source token.
        const qx = tokenCx(q);
        const sx = tokenCx(src);
        const midY = topY - 46 - Math.abs(src - q) * 8;
        const d = `M ${qx} ${topY} Q ${(qx + sx) / 2} ${midY}, ${sx} ${topY}`;
        return (
          <path
            key={src}
            d={d}
            fill="none"
            stroke={ACCENT}
            strokeWidth={w}
            strokeOpacity={0.35 + w * 0.15}
            markerEnd="url(#tb-arrow-accent)"
          />
        );
      })}
      {/* highlight the query token */}
      <rect x={tokenX(q) - 3} y={INPUT_Y - 3} width={TOK_W + 6} height={TOK_H + 6} rx={10} fill="none" stroke={ACCENT} strokeWidth={2} strokeDasharray="4 3" />
      <text x={tokenCx(q)} y={INPUT_Y - 60} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10.5} fill={ACCENT}>
        “{TOKENS[q]}” attends to every token
      </text>
    </g>
  );
}

// The attention formula chip.
function AttnFormula({ x, y }: { x: number; y: number }): ReactNode {
  return (
    <g>
      <rect x={x} y={y} width={272} height={34} rx={8} fill="var(--s2)" stroke="var(--line)" strokeWidth={1.2} />
      <text x={x + 136} y={y + 22} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fontWeight={700} fill={ACCENT}>
        softmax(Q·Kᵀ / √d) · V
      </text>
    </g>
  );
}

// Multi-head hint: three stacked lanes feeding a "concat" bar.
function MultiHead({ x, y }: { x: number; y: number }): ReactNode {
  const lanes = ["head 1", "head 2", "head 3"];
  const laneW = 150;
  const laneH = 26;
  const gap = 8;
  return (
    <g>
      {lanes.map((name, k) => (
        <g key={k}>
          <rect
            x={x}
            y={y + k * (laneH + gap)}
            width={laneW}
            height={laneH}
            rx={6}
            fill="color-mix(in srgb, #A78BFA 10%, var(--surface))"
            stroke={ACCENT}
            strokeWidth={1.4}
          />
          <text x={x + 12} y={y + k * (laneH + gap) + 17} fontFamily="var(--font-mono)" fontSize={11.5} fill="var(--tx)">
            {name}
          </text>
          <text x={x + laneW - 10} y={y + k * (laneH + gap) + 17} textAnchor="end" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--tx3)">
            Qₖ Kₖ Vₖ
          </text>
          {/* connector into the concat bar */}
          <line
            x1={x + laneW}
            y1={y + k * (laneH + gap) + laneH / 2}
            x2={x + laneW + 26}
            y2={y + (lanes.length - 1) * (laneH + gap) / 2 + laneH / 2}
            stroke="var(--tx3)"
            strokeWidth={1.2}
          />
        </g>
      ))}
      {/* concat bar */}
      <rect x={x + laneW + 26} y={y} width={30} height={lanes.length * (laneH + gap) - gap} rx={6} fill="var(--surface)" stroke={ACCENT} strokeWidth={1.6} />
      <text
        x={x + laneW + 41}
        y={y + (lanes.length * (laneH + gap) - gap) / 2 + 4}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        fill={ACCENT}
        transform={`rotate(-90 ${x + laneW + 41} ${y + (lanes.length * (laneH + gap) - gap) / 2 + 4})`}
      >
        concat → project
      </text>
    </g>
  );
}

// The final next-token distribution: a little bar chart over a toy vocabulary.
function NextTokenBars({ x, y }: { x: number; y: number }): ReactNode {
  const vocab: Array<{ w: string; p: number }> = [
    { w: "mat", p: 0.52 },
    { w: "floor", p: 0.23 },
    { w: "roof", p: 0.12 },
    { w: "table", p: 0.08 },
    { w: "sun", p: 0.05 },
  ];
  const barW = 30;
  const gap = 16;
  const maxH = 92;
  return (
    <g>
      <text x={x} y={y - 12} fontFamily="var(--font-mono)" fontSize={11} fill="var(--tx2)">
        P(next token | “The cat sat on …”)
      </text>
      {/* baseline */}
      <line x1={x - 4} y1={y + maxH} x2={x + vocab.length * (barW + gap)} y2={y + maxH} stroke="var(--line)" strokeWidth={1.4} />
      {vocab.map((v, k) => {
        const bx = x + k * (barW + gap);
        const h = Math.max(6, v.p * maxH * 1.7);
        const top = y + maxH - h;
        const best = k === 0;
        return (
          <g key={k}>
            <rect
              x={bx}
              y={top}
              width={barW}
              height={h}
              rx={4}
              fill={best ? ACCENT : "color-mix(in srgb, #A78BFA 30%, var(--s2))"}
              stroke={best ? ACCENT : "var(--line)"}
              strokeWidth={1.2}
            />
            <text x={bx + barW / 2} y={top - 5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9.5} fill={best ? ACCENT : "var(--tx3)"}>
              {v.p.toFixed(2)}
            </text>
            <text x={bx + barW / 2} y={y + maxH + 14} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill={best ? "var(--tx)" : "var(--tx2)"}>
              {v.w}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// A compact "×N blocks" stamp for the last frame.
function StackStamp({ x, y }: { x: number; y: number }): ReactNode {
  return (
    <g>
      {[0, 1, 2].map((k) => (
        <rect
          key={k}
          x={x + k * 4}
          y={y - k * 4}
          width={104}
          height={30}
          rx={7}
          fill="color-mix(in srgb, #A78BFA 10%, var(--surface))"
          stroke={ACCENT}
          strokeWidth={1.4}
          opacity={1 - k * 0.22}
        />
      ))}
      <text x={x + 52 + 4} y={y - 8 + 20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11.5} fontWeight={700} fill={ACCENT}>
        × dozens
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frames — one transformer block, built up beat by beat.
// ---------------------------------------------------------------------------
const FRAMES: Frame[] = [
  // 0 — token embeddings + positional info
  {
    caption:
      "Start at the bottom: each input token — “The”, “cat”, “sat”, “on” — becomes a vector (an embedding), the small coloured cells under each word. On its own an embedding has no sense of order, so we add a positional signal (pos 0, 1, 2, …) that tells the model where in the sequence each token sits. This row of position-aware vectors is what a transformer block consumes.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 1 — input" title="Token embeddings + position" />
        <TokenRow showPos />
        {stageNote({ y: INPUT_Y - 40, text: "each token → a vector (embedding)", tone: "data" })}
        {note("embeddings carry meaning; positional encodings add order — together they enter the block.")}
      </g>
    ),
  },

  // 1 — self-attention
  {
    caption:
      "Self-attention is where tokens mix in context. For every token, the block compares its query Q against every token’s key K, scales and softmaxes those scores — softmax(Q·Kᵀ/√d) — and uses them to take a weighted blend of the value vectors V. Here “sat” looks back at “The”, “cat”, and itself: thicker links = more attention. After this step, each token’s vector is contextual — “sat” now knows a cat did the sitting.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 2 — self-attention" title="Every token mixes in context" />
        <TokenRow />
        <AttentionLines q={2} />
        <AttnFormula x={VB_W / 2 - 136} y={90} />
        {stageNote({ y: INPUT_Y + TOK_H + 24, text: "context flows between all tokens", tone: "accent" })}
        {note("attention weight = how much one token pulls from another; softmax makes the weights sum to 1.")}
      </g>
    ),
  },

  // 2 — multi-head
  {
    caption:
      "Attention isn’t done once but in parallel HEADS. Each head gets its own Q/K/V projections and can specialise — one head might track subject↔verb agreement, another nearby word order, another long-range references. The heads run independently, then their outputs are concatenated and projected back down. Multiple heads let the block attend to several kinds of relationship at the same time.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 3 — multi-head" title="Several attention heads in parallel" />
        <MultiHead x={140} y={96} />
        <TokenRow />
        <FeedUp y1={INPUT_Y - 4} y2={INPUT_Y - 34} />
        {stageNote({ y: INPUT_Y - 46, text: "each head learns a different relationship", tone: "accent" })}
        {note("heads run independently, then concat → linear projection recombines them into one vector per token.")}
      </g>
    ),
  },

  // 3 — residual + add around attention
  {
    caption:
      "A residual (skip) connection carries the block’s INPUT around the attention sub-layer and adds it back: output = input + Attention(input). This “add” means attention only has to learn a correction to the input, not rebuild it from scratch — which keeps gradients flowing and lets you stack many blocks without the signal degrading. (A normalization step usually rides along here too.)",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 4 — residual" title="Add the input back around attention" />
        <Block x={ROW_X0} y={150} w={ROW_W} h={64} title="Multi-Head Self-Attention" sub="softmax(Q·Kᵀ / √d) · V" tone="accent" />
        <FeedUp y1={INPUT_Y - 4} y2={214} />
        {/* residual arc from input row up to an add node just above the block */}
        <ResidualArc fromY={INPUT_Y + TOK_H / 2} toY={142} addCx={ROW_X0 + 16} addCy={142} label="residual connection" />
        {/* main path continues up out of the add node */}
        <line x1={ROW_X0 + 16} y1={131} x2={ROW_X0 + 16} y2={110} stroke="var(--tx2)" strokeWidth={1.6} markerEnd="url(#tb-arrow-tx)" />
        <TokenRow />
        {stageNote({ y: INPUT_Y - 14, text: "output = input + Attention(input)", tone: "ok" })}
        {note("the skip path lets the input bypass the layer — attention learns a residual, gradients stay healthy.")}
      </g>
    ),
  },

  // 4 — feed-forward network + its own residual
  {
    caption:
      "After attention has moved information between tokens, a feed-forward network (a two-layer MLP) refines each token’s vector INDEPENDENTLY — same weights applied position-by-position, expanding then contracting the dimension with a nonlinearity in the middle. It gets its own residual add too. So a block is really two mixed steps: attention mixes ACROSS tokens, the FFN transforms EACH token, and residuals wrap both.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 5 — feed-forward" title="A per-token MLP, then another residual" />
        <Block x={ROW_X0} y={72} w={ROW_W} h={54} title="Feed-Forward (MLP)" sub="per-token: expand → GELU → contract" tone="state" />
        <Block x={ROW_X0} y={166} w={ROW_W} h={54} title="Self-Attention (+ residual)" sub="mixes across tokens" tone="accent" />
        <FeedUp y1={INPUT_Y - 4} y2={220} />
        <line x1={VB_W / 2} y1={166} x2={VB_W / 2} y2={126} stroke="var(--tx2)" strokeWidth={1.6} markerEnd="url(#tb-arrow-tx)" />
        {/* FFN residual arc */}
        <ResidualArc fromY={162} toY={66} addCx={ROW_X0 + 16} addCy={66} label="residual" />
        <TokenRow />
        {stageNote({ y: INPUT_Y - 16, text: "attention mixes tokens · FFN transforms each token", tone: "control" })}
        {note("the FFN is applied to every position with the SAME weights — it adds capacity without more mixing.")}
      </g>
    ),
  },

  // 5 — output → next-token distribution, and stacking
  {
    caption:
      "At the top of the stack, the final vector for the last position is projected onto the vocabulary and softmaxed into a probability distribution over the next token — here “mat” wins. Training nudges these probabilities toward the real next word; at generation time you sample from them. One block already does a lot; real models STACK DOZENS of identical blocks, each refining the representation a little more.",
    render: () => (
      <g>
        <Defs />
        <Heading kicker="Transformer · step 6 — output" title="Predict the next token" />
        <StackStamp x={ROW_X0 - 2} y={98} />
        <Block x={ROW_X0 + 130} y={80} w={ROW_W - 130} h={44} title="… output representation" tone="data" />
        <NextTokenBars x={ROW_X0 + 150} y={150} />
        <FeedUp y1={INPUT_Y - 4} y2={INPUT_Y - 34} marker="url(#tb-arrow-data)" />
        <TokenRow />
        {stageNote({ y: INPUT_Y - 16, text: "stack dozens of these blocks → a language model", tone: "data" })}
        {note("logits → softmax → next-token probabilities; sampling one and appending it drives generation.")}
      </g>
    ),
  },
];

export default function TransformerBlock(): ReactNode {
  return (
    <FigureStepper
      title="Inside one transformer block — from tokens to a next-token guess"
      figKey="transformer-block"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
