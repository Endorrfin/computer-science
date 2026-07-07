// [fig] sort-stability — what it MEANS for a sort to be "stable". A sort is
// stable if, whenever two elements compare equal on the sort key, they keep the
// order they had in the input. The number-only sorting racer can't show this,
// because with bare numbers you cannot tell one "3" from another — so this
// figure carries the idea by giving each equal value a distinct tag and colour.
//
// The input is [3a, 1, 3b, 2, 3c]: three 3's tagged a, b, c. A stable sort emits
// the 3's still in a, b, c order; an unstable sort may scramble them to a, c, b.
// Sorting on value alone, the difference is invisible — but it matters the moment
// the tag stands for a real secondary key (already sorted by name, now sorting by
// score, and wanting ties to stay name-ordered). Tag colour makes the identity
// impossible to miss.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

// A card carries a numeric VALUE and a tag; equal values share a value but have
// distinct tags/colours so we can track identity through a sort.
type Card = { value: number; tag: string; color: string };

// tag colours: the three 3's get distinct hues; 1 and 2 are neutral.
const C_A = "var(--sem-data)"; // cyan  → 3a
const C_B = "var(--sem-state)"; // violet → 3b
const C_C = "var(--sem-control)"; // orange → 3c
const C_N = "var(--tx3)"; // neutral for the unique values

const INPUT: Card[] = [
  { value: 3, tag: "a", color: C_A },
  { value: 1, tag: "", color: C_N },
  { value: 3, tag: "b", color: C_B },
  { value: 2, tag: "", color: C_N },
  { value: 3, tag: "c", color: C_C },
];

const STABLE: Card[] = [
  { value: 1, tag: "", color: C_N },
  { value: 2, tag: "", color: C_N },
  { value: 3, tag: "a", color: C_A },
  { value: 3, tag: "b", color: C_B },
  { value: 3, tag: "c", color: C_C },
];

const UNSTABLE: Card[] = [
  { value: 1, tag: "", color: C_N },
  { value: 2, tag: "", color: C_N },
  { value: 3, tag: "a", color: C_A },
  { value: 3, tag: "c", color: C_C },
  { value: 3, tag: "b", color: C_B },
];

const CARD_W = 66;
const CARD_H = 78;
const GAP = 16;
const ROW_X = 92;

function cardX(i: number): number {
  return ROW_X + i * (CARD_W + GAP);
}

function CardBox({ card, x, y, flag }: { card: Card; x: number; y: number; flag?: boolean }) {
  const tagged = card.tag !== "";
  const stroke = tagged ? card.color : "var(--line)";
  const fill = tagged ? `color-mix(in srgb, ${card.color} 20%, var(--surface))` : "var(--s2)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={CARD_W}
        height={CARD_H}
        rx={8}
        fill={fill}
        stroke={flag ? "var(--sem-err)" : stroke}
        strokeWidth={flag ? 3.5 : tagged ? 2.5 : 1.75}
      />
      {/* the sort key (value) */}
      <text x={x + CARD_W / 2} y={y + 36} textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--tx)">
        {card.value}
      </text>
      {/* the tag / identity */}
      {tagged ? (
        <text x={x + CARD_W / 2} y={y + 62} textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="var(--font-mono)" fill={card.color}>
          {card.value}
          {card.tag}
        </text>
      ) : (
        <text x={x + CARD_W / 2} y={y + 62} textAnchor="middle" fontSize="11" fill="var(--tx3)">
          —
        </text>
      )}
    </g>
  );
}

function Row({ cards, y, flags }: { cards: Card[]; y: number; flags?: number[] }) {
  return (
    <g>
      {cards.map((c, i) => (
        <CardBox key={i} card={c} x={cardX(i)} y={y} flag={flags?.includes(i)} />
      ))}
    </g>
  );
}

function Legend({ y }: { y: number }) {
  return (
    <g fontFamily="var(--font-body)">
      <text x={ROW_X} y={y} fontSize="10.5" fill="var(--tx2)">
        equal 3's tagged by colour:
      </text>
      {[
        { t: "3a", c: C_A },
        { t: "3b", c: C_B },
        { t: "3c", c: C_C },
      ].map((it, i) => (
        <g key={it.t}>
          <rect x={ROW_X + 172 + i * 58} y={y - 11} width={16} height={14} rx={3} fill={`color-mix(in srgb, ${it.c} 20%, var(--surface))`} stroke={it.c} strokeWidth={2} />
          <text x={ROW_X + 172 + i * 58 + 22} y={y} fontSize="10.5" fontFamily="var(--font-mono)" fill={it.c}>
            {it.t}
          </text>
        </g>
      ))}
    </g>
  );
}

function F0() {
  return (
    <g fontFamily="var(--font-body)">
      <text x={ROW_X} y={40} fontSize="12" fill="var(--tx)" fontWeight={700}>
        input order
      </text>
      <Row cards={INPUT} y={70} />
      <Legend y={210} />
      <text x={ROW_X} y={250} fontSize="10.5" fill="var(--tx3)">
        Top number = sort key. Below it = the card's identity (value + tag).
      </text>
    </g>
  );
}

function F1() {
  return (
    <g fontFamily="var(--font-body)">
      <text x={ROW_X} y={40} fontSize="12" fill="var(--sem-ok)" fontWeight={700}>
        stable sort by value
      </text>
      <Row cards={STABLE} y={70} flags={[2, 3, 4]} />
      <text x={ROW_X} y={214} fontSize="10.5" fill="var(--sem-ok)" fontWeight={700}>
        the three 3's come out a, b, c — exactly their input order.
      </text>
      <text x={ROW_X} y={236} fontSize="10.5" fill="var(--tx3)">
        Ties preserved. (green outline marks the equal group)
      </text>
    </g>
  );
}

function F2() {
  return (
    <g fontFamily="var(--font-body)">
      <text x={ROW_X} y={40} fontSize="12" fill="var(--sem-err)" fontWeight={700}>
        unstable sort by value
      </text>
      <Row cards={UNSTABLE} y={70} flags={[3, 4]} />
      <text x={ROW_X} y={214} fontSize="10.5" fill="var(--sem-err)" fontWeight={700}>
        same keys, but the 3's emerge a, c, b — b and c swapped.
      </text>
      <text x={ROW_X} y={236} fontSize="10.5" fill="var(--tx3)">
        The sorted VALUES are identical to the stable result; only identities moved.
      </text>
    </g>
  );
}

function F3() {
  return (
    <g fontFamily="var(--font-body)">
      <text x={320} y={40} textAnchor="middle" fontSize="12" fill="var(--tx)" fontWeight={700}>
        stability = equal keys keep their input order
      </text>

      {/* mini before → after, stable */}
      <text x={130} y={80} textAnchor="middle" fontSize="10.5" fill="var(--sem-ok)" fontWeight={700}>stable</text>
      <text x={130} y={100} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">3a 3b 3c</text>
      <text x={130} y={116} textAnchor="middle" fontSize="9" fill="var(--tx3)">order kept</text>

      {/* mini unstable */}
      <text x={330} y={80} textAnchor="middle" fontSize="10.5" fill="var(--sem-err)" fontWeight={700}>unstable</text>
      <text x={330} y={100} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
        3a <tspan fill="var(--sem-control)">3c</tspan> <tspan fill="var(--sem-state)">3b</tspan>
      </text>
      <text x={330} y={116} textAnchor="middle" fontSize="9" fill="var(--tx3)">order scrambled</text>

      <text x={320} y={168} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        With bare numbers you'd never notice — both look like 1 2 3 3 3.
      </text>
      <text x={320} y={192} textAnchor="middle" fontSize="10.5" fill="var(--p4)" fontWeight={700}>
        It matters when sorting by a SECONDARY key.
      </text>
      <text x={320} y={222} textAnchor="middle" fontSize="10" fill="var(--tx3)">
        Sort a list by name, then stably by score →
      </text>
      <text x={320} y={238} textAnchor="middle" fontSize="10" fill="var(--tx3)">
        equal scores stay in name order. An unstable sort would lose that.
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "The input is five cards. Each shows its sort key on top; below is the card's identity. Three of them share the value 3, tagged a, b, c and coloured cyan / violet / orange so we can follow each one. Their input order is 3a, then 3b, then 3c.",
    render: () => <F0 />,
  },
  {
    caption:
      "A STABLE sort by value. The 1 and 2 fall into place, and the three equal 3's come out still in a, b, c order — the same order they had in the input. A stable sort never reorders elements that compare equal.",
    render: () => <F1 />,
  },
  {
    caption:
      "An UNSTABLE sort of the same input. The values end up correctly sorted, but the equal 3's emerge as a, c, b — b and c have been swapped (flagged red). Nothing is 'wrong' by value; the sort simply made no promise about ties.",
    render: () => <F2 />,
  },
  {
    caption:
      "Takeaway: stability means equal keys keep their input order. On bare numbers it's invisible — both outputs read 1 2 3 3 3. It bites the moment the order carries meaning: sort by name, then STABLY by score, and rows with equal scores stay name-ordered. An unstable sort would scramble that secondary order.",
    render: () => <F3 />,
  },
];

export default function SortStability() {
  return (
    <FigureStepper
      title="Sort stability — do equal keys keep their order?"
      figKey="sort-stability"
      viewBox="0 0 640 320"
      accent="#34D399"
      frames={FRAMES}
    />
  );
}
