// [fig] rb-intuition — red-black trees explained as intuition, not machinery.
// A red-black tree is a binary search tree where every node is painted red or
// black under two rules that together keep it roughly balanced without the
// tight height bookkeeping AVL uses.
//
// Rule 1: no red node has a red child (reds never stack). Rule 2: every path
// from the root down to a null leaf passes through the same number of BLACK
// nodes (the "black-height"). Together they bound the longest root-to-leaf path
// at no more than twice the shortest — because the longest can only be padded
// with alternating reds — so the height stays O(log n) and every operation with
// it. This figure shows each rule pictorially and lands the conclusion; there is
// no live engine behind it. Palette: real red = --sem-err, black = a dark fill,
// violations flagged and then repaired.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

const R = 20;

const RED_STROKE = "var(--sem-err)";
const RED_FILL = "color-mix(in srgb, var(--sem-err) 30%, var(--surface))";
const BLACK_STROKE = "var(--tx2)";
const BLACK_FILL = "var(--bg)";

type Color = "red" | "black";

type RbNode = {
  key: string;
  x: number;
  y: number;
  color: Color;
  bad?: boolean; // outline the rule-breaker
};

function edge(x1: number, y1: number, x2: number, y2: number, key: string) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return (
    <line
      key={key}
      x1={x1 + ux * R}
      y1={y1 + uy * R}
      x2={x2 - ux * R}
      y2={y2 - uy * R}
      stroke="var(--line)"
      strokeWidth="1.75"
    />
  );
}

function RbCircle({ n }: { n: RbNode }) {
  const red = n.color === "red";
  return (
    <g>
      <circle
        cx={n.x}
        cy={n.y}
        r={R}
        fill={red ? RED_FILL : BLACK_FILL}
        stroke={n.bad ? "var(--sem-control)" : red ? RED_STROKE : BLACK_STROKE}
        strokeWidth={n.bad ? 3.5 : 2.25}
      />
      <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill={red ? "var(--sem-err)" : "var(--tx)"}>
        {n.key}
      </text>
    </g>
  );
}

function Frame1() {
  const nodes: RbNode[] = [
    { key: "13", x: 300, y: 60, color: "black" },
    { key: "8", x: 200, y: 150, color: "red" },
    { key: "17", x: 400, y: 150, color: "red" },
    { key: "1", x: 140, y: 240, color: "black" },
    { key: "11", x: 260, y: 240, color: "black" },
    { key: "25", x: 460, y: 240, color: "black" },
  ];
  return (
    <g fontFamily="var(--font-body)">
      {edge(300, 60, 200, 150, "e1")}
      {edge(300, 60, 400, 150, "e2")}
      {edge(200, 150, 140, 240, "e3")}
      {edge(200, 150, 260, 240, "e4")}
      {edge(400, 150, 460, 240, "e5")}
      {nodes.map((n) => (
        <RbCircle key={n.key} n={n} />
      ))}
      {/* legend */}
      <circle cx={520} cy={70} r={9} fill={RED_FILL} stroke={RED_STROKE} strokeWidth={2.25} />
      <text x={536} y={74} fontSize="10.5" fill="var(--tx2)">red</text>
      <circle cx={520} cy={98} r={9} fill={BLACK_FILL} stroke={BLACK_STROKE} strokeWidth={2.25} />
      <text x={536} y={102} fontSize="10.5" fill="var(--tx2)">black</text>
      <text x={505} y={150} fontSize="10.5" fill="var(--tx3)">Every node</text>
      <text x={505} y={166} fontSize="10.5" fill="var(--tx3)">wears exactly</text>
      <text x={505} y={182} fontSize="10.5" fill="var(--tx3)">one colour.</text>
    </g>
  );
}

function Frame2() {
  // Left: a red-red violation (crossed out). Right: after recolour, fixed.
  const bad: RbNode[] = [
    { key: "8", x: 150, y: 90, color: "red", bad: true },
    { key: "5", x: 100, y: 190, color: "red", bad: true },
    { key: "11", x: 200, y: 190, color: "black" },
  ];
  const good: RbNode[] = [
    { key: "8", x: 440, y: 90, color: "black" },
    { key: "5", x: 390, y: 190, color: "red" },
    { key: "11", x: 490, y: 190, color: "red" },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <text x={150} y={40} textAnchor="middle" fontSize="11" fill="var(--sem-control)" fontWeight={700}>
        illegal: red over red
      </text>
      {edge(150, 90, 100, 190, "be1")}
      {edge(150, 90, 200, 190, "be2")}
      {bad.map((n) => (
        <RbCircle key={`b${n.key}`} n={n} />
      ))}
      {/* strike-through on the red-red link */}
      <line x1={110} y1={130} x2={165} y2={150} stroke="var(--sem-err)" strokeWidth="3" />
      <line x1={165} y1={130} x2={110} y2={150} stroke="var(--sem-err)" strokeWidth="3" />

      {/* arrow to the fix */}
      <line x1={260} y1={150} x2={330} y2={150} stroke="var(--tx3)" strokeWidth="2" markerEnd="url(#rbFix)" />
      <text x={295} y={140} textAnchor="middle" fontSize="9.5" fill="var(--tx3)">recolour</text>
      <defs>
        <marker id="rbFix" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--tx3)" />
        </marker>
      </defs>

      <text x={440} y={40} textAnchor="middle" fontSize="11" fill="var(--sem-ok)" fontWeight={700}>
        legal ✓
      </text>
      {edge(440, 90, 390, 190, "ge1")}
      {edge(440, 90, 490, 190, "ge2")}
      {good.map((n) => (
        <RbCircle key={`g${n.key}`} n={n} />
      ))}
      <text x={320} y={250} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">
        Rule 1 — no red node may have a red child.
      </text>
    </g>
  );
}

function Frame3() {
  // Same tree as frame 1; annotate two root-to-leaf paths, each with 2 blacks.
  const nodes: RbNode[] = [
    { key: "13", x: 300, y: 55, color: "black" },
    { key: "8", x: 200, y: 145, color: "red" },
    { key: "17", x: 400, y: 145, color: "red" },
    { key: "1", x: 140, y: 235, color: "black" },
    { key: "11", x: 260, y: 235, color: "black" },
    { key: "25", x: 460, y: 235, color: "black" },
  ];
  return (
    <g fontFamily="var(--font-body)">
      {/* highlighted path 1: 13 → 8 → 1 */}
      <polyline points="300,55 200,145 140,235" fill="none" stroke="var(--sem-data)" strokeWidth="5" strokeOpacity="0.35" strokeLinecap="round" />
      {/* highlighted path 2: 13 → 17 → 25 */}
      <polyline points="300,55 400,145 460,235" fill="none" stroke="var(--sem-state)" strokeWidth="5" strokeOpacity="0.35" strokeLinecap="round" />
      {edge(200, 145, 260, 235, "e4")}
      {nodes.map((n) => (
        <RbCircle key={n.key} n={n} />
      ))}
      <text x={100} y={275} fontSize="10.5" fill="var(--sem-data)" fontWeight={700}>
        path 13·8·1: 2 blacks
      </text>
      <text x={400} y={275} fontSize="10.5" fill="var(--sem-state)" fontWeight={700}>
        path 13·17·25: 2 blacks
      </text>
      <text x={300} y={20} textAnchor="middle" fontSize="11" fill="var(--tx2)" fontWeight={700}>
        Rule 2 — equal black-count on every root-to-leaf path
      </text>
    </g>
  );
}

function Frame4() {
  return (
    <g fontFamily="var(--font-body)">
      <text x={320} y={40} textAnchor="middle" fontSize="12" fill="var(--tx)" fontWeight={700}>
        Why the two rules keep it shallow
      </text>

      {/* shortest path (all black) */}
      <text x={110} y={82} fontSize="10.5" fill="var(--tx2)" fontWeight={700}>shortest path</text>
      {[0, 1, 2].map((i) => (
        <circle key={`s${i}`} cx={90 + i * 46} cy={120} r={16} fill={BLACK_FILL} stroke={BLACK_STROKE} strokeWidth={2.25} />
      ))}
      <text x={90 + 3 * 46} y={125} fontSize="10.5" fill="var(--tx3)">all black</text>

      {/* longest path (alternating red/black) */}
      <text x={110} y={172} fontSize="10.5" fill="var(--tx2)" fontWeight={700}>longest path</text>
      {[0, 1, 2, 3, 4].map((i) => {
        const red = i % 2 === 1;
        return (
          <circle
            key={`l${i}`}
            cx={90 + i * 46}
            cy={210}
            r={16}
            fill={red ? RED_FILL : BLACK_FILL}
            stroke={red ? RED_STROKE : BLACK_STROKE}
            strokeWidth={2.25}
          />
        );
      })}
      <text x={90 + 5 * 46} y={215} fontSize="10.5" fill="var(--tx3)">red/black alt.</text>

      <text x={90} y={252} fontSize="10.5" fill="var(--tx2)">
        Same 3 blacks each — reds can only pad the long path,
      </text>
      <text x={90} y={268} fontSize="10.5" fill="var(--tx2)">
        and never two in a row → longest ≤ 2 × shortest.
      </text>
      <text x={90} y={292} fontSize="11" fill="var(--p4)" fontWeight={700}>
        Height stays O(log n) ⇒ search / insert / delete stay O(log n).
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "A red-black tree is just a binary search tree where every node is painted red or black. Those colours are bookkeeping: two simple rules on them are enough to keep the tree from ever getting badly lopsided.",
    render: () => <Frame1 />,
  },
  {
    caption:
      "Rule 1: no red node may have a red child — reds can never stack. On the left the red-8/red-5 pair is illegal (crossed out); recolouring 8 to black repairs it. This is what stops a run of reds from stretching one branch.",
    render: () => <Frame2 />,
  },
  {
    caption:
      "Rule 2: every path from the root down to a null leaf must pass through the same number of BLACK nodes. Here the blue path 13·8·1 and the violet path 13·17·25 each cross 2 black nodes — the tree's 'black-height' is uniform.",
    render: () => <Frame3 />,
  },
  {
    caption:
      "Put the rules together. Both paths share the same black-count, and because reds can't sit two in a row, the longest path is only ever padded with alternating reds — so it is at most twice the shortest. That caps the height at O(log n), which is exactly why search, insert and delete all stay O(log n).",
    render: () => <Frame4 />,
  },
];

export default function RbIntuition() {
  return (
    <FigureStepper
      title="Red-black trees — the two rules that keep them balanced"
      figKey="rb-intuition"
      viewBox="0 0 640 320"
      accent="#34D399"
      frames={FRAMES}
    />
  );
}
