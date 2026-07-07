// [fig] tree-rotation — the single right rotation that fixes an AVL tree's
// "left-left" case. Insert 3, 2, 1 in order and you get a degenerate left-
// leaning stick: node 3 has a left subtree of height 2 and a right subtree of
// height 0, so its balance factor is +2 — out of AVL's allowed [-1, +1].
//
// The cure is one local pointer swap: the left child (2) rotates up to become
// the root, the old root (3) drops to become 2's right child, and the middle
// grandchild slots in between. Height falls from 3 back to 2 and every balance
// factor returns to 0. The lesson is that AVL keeps trees shallow not by
// rebuilding but by these O(1) rotations. Palette (§7): the offending node is
// flagged red (--sem-err), a settled/balanced node is green (--sem-ok), and
// ordinary nodes use the accent green (--p4).
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

const R = 22; // node radius

type Tone = "normal" | "bad" | "good" | "focus";

function toneStroke(t: Tone): string {
  if (t === "bad") return "var(--sem-err)";
  if (t === "good") return "var(--sem-ok)";
  if (t === "focus") return "var(--sem-control)";
  return "var(--p4)";
}

function toneFill(t: Tone): string {
  if (t === "bad") return "color-mix(in srgb, var(--sem-err) 24%, var(--surface))";
  if (t === "good") return "color-mix(in srgb, var(--sem-ok) 24%, var(--surface))";
  if (t === "focus") return "color-mix(in srgb, var(--sem-control) 22%, var(--surface))";
  return "var(--s2)";
}

type NodeSpec = {
  key: number;
  x: number;
  y: number;
  tone: Tone;
  bf?: number; // balance factor label (undefined = hide)
};

// A straight edge between the centres of two nodes, trimmed to the circle rims.
function Edge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return (
    <line
      x1={x1 + ux * R}
      y1={y1 + uy * R}
      x2={x2 - ux * R}
      y2={y2 - uy * R}
      stroke="var(--line)"
      strokeWidth="1.75"
    />
  );
}

function Node({ n }: { n: NodeSpec }) {
  return (
    <g>
      <circle cx={n.x} cy={n.y} r={R} fill={toneFill(n.tone)} stroke={toneStroke(n.tone)} strokeWidth={n.tone === "normal" ? 2 : 3} />
      <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--tx)">
        {n.key}
      </text>
      {n.bf !== undefined && (
        <text
          x={n.x + R + 4}
          y={n.y - R + 4}
          fontSize="9"
          fontFamily="var(--font-mono)"
          fill={Math.abs(n.bf) > 1 ? "var(--sem-err)" : "var(--tx3)"}
          fontWeight={Math.abs(n.bf) > 1 ? 700 : 400}
        >
          bf {n.bf >= 0 ? "+" : ""}
          {n.bf}
        </text>
      )}
    </g>
  );
}

function Frame1() {
  // Left-leaning stick after inserting 3, 2, 1 in order.
  const nodes: NodeSpec[] = [
    { key: 3, x: 380, y: 70, tone: "normal", bf: 2 },
    { key: 2, x: 300, y: 160, tone: "normal", bf: 1 },
    { key: 1, x: 220, y: 250, tone: "normal", bf: 0 },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <Edge x1={380} y1={70} x2={300} y2={160} />
      <Edge x1={300} y1={160} x2={220} y2={250} />
      {nodes.map((n) => (
        <Node key={n.key} n={n} />
      ))}
      <text x={470} y={70} fontSize="11" fill="var(--tx2)">
        insert order: 3 → 2 → 1
      </text>
      <text x={470} y={90} fontSize="10.5" fill="var(--tx3)">
        each new key is smaller,
      </text>
      <text x={470} y={106} fontSize="10.5" fill="var(--tx3)">
        so every link goes left.
      </text>
      <text x={470} y={168} fontSize="10.5" fill="var(--sem-err)" fontWeight={700}>
        node 3: left height 2,
      </text>
      <text x={470} y={184} fontSize="10.5" fill="var(--sem-err)" fontWeight={700}>
        right height 0 → bf +2.
      </text>
    </g>
  );
}

function Frame2() {
  // Identify the unbalanced node (3, red) and the left child (2, focus).
  const nodes: NodeSpec[] = [
    { key: 3, x: 380, y: 70, tone: "bad", bf: 2 },
    { key: 2, x: 300, y: 160, tone: "focus", bf: 1 },
    { key: 1, x: 220, y: 250, tone: "normal", bf: 0 },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <Edge x1={380} y1={70} x2={300} y2={160} />
      <Edge x1={300} y1={160} x2={220} y2={250} />
      {nodes.map((n) => (
        <Node key={n.key} n={n} />
      ))}
      <text x={470} y={70} fontSize="11" fill="var(--sem-err)" fontWeight={700}>
        z = 3 (unbalanced)
      </text>
      <text x={470} y={90} fontSize="11" fill="var(--sem-control)" fontWeight={700}>
        y = 2 (its left child)
      </text>
      <text x={470} y={130} fontSize="10.5" fill="var(--tx2)">
        Left child is heavier and
      </text>
      <text x={470} y={146} fontSize="10.5" fill="var(--tx2)">
        ITS left child is heavier:
      </text>
      <text x={470} y={162} fontSize="10.5" fill="var(--tx2)">
        the classic "left-left" case.
      </text>
      <text x={470} y={188} fontSize="10.5" fill="var(--p4)" fontWeight={700}>
        fix = one right rotation.
      </text>
    </g>
  );
}

function Frame3() {
  // Mid-rotation: 2 rising toward the root position, 3 swinging down-right.
  const nodes: NodeSpec[] = [
    { key: 2, x: 300, y: 120, tone: "focus", bf: 1 },
    { key: 1, x: 220, y: 210, tone: "normal", bf: 0 },
    { key: 3, x: 380, y: 210, tone: "bad", bf: 2 },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <defs>
        <marker id="trArc" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-control)" />
        </marker>
      </defs>
      <Edge x1={300} y1={120} x2={220} y2={210} />
      <Edge x1={300} y1={120} x2={380} y2={210} />
      {/* rotation arc hint */}
      <path
        d="M 330 92 Q 400 90 402 178"
        fill="none"
        stroke="var(--sem-control)"
        strokeWidth="2"
        strokeDasharray="4 3"
        markerEnd="url(#trArc)"
      />
      {nodes.map((n) => (
        <Node key={n.key} n={n} />
      ))}
      <text x={470} y={80} fontSize="11" fill="var(--sem-control)" fontWeight={700}>
        RIGHT ROTATION
      </text>
      <text x={470} y={110} fontSize="10.5" fill="var(--tx2)">
        2 rises to become root.
      </text>
      <text x={470} y={130} fontSize="10.5" fill="var(--tx2)">
        3 swings down to be
      </text>
      <text x={470} y={146} fontSize="10.5" fill="var(--tx2)">
        2's RIGHT child.
      </text>
      <text x={470} y={172} fontSize="10.5" fill="var(--tx3)">
        1 stays as 2's left child.
      </text>
      <text x={470} y={192} fontSize="10.5" fill="var(--tx3)">
        (Only 3 pointers change.)
      </text>
    </g>
  );
}

function Frame4() {
  // Balanced result: root 2, children 1 and 3, all bf 0, height 2.
  const nodes: NodeSpec[] = [
    { key: 2, x: 300, y: 90, tone: "good", bf: 0 },
    { key: 1, x: 220, y: 200, tone: "good", bf: 0 },
    { key: 3, x: 380, y: 200, tone: "good", bf: 0 },
  ];
  return (
    <g fontFamily="var(--font-body)">
      <Edge x1={300} y1={90} x2={220} y2={200} />
      <Edge x1={300} y1={90} x2={380} y2={200} />
      {nodes.map((n) => (
        <Node key={n.key} n={n} />
      ))}
      <text x={470} y={90} fontSize="11" fill="var(--sem-ok)" fontWeight={700}>
        balanced ✓
      </text>
      <text x={470} y={118} fontSize="10.5" fill="var(--tx2)">
        Every balance factor is 0.
      </text>
      <text x={470} y={138} fontSize="10.5" fill="var(--tx2)">
        Height dropped 3 → 2.
      </text>
      <text x={470} y={166} fontSize="10.5" fill="var(--tx3)">
        In-order 1, 2, 3 preserved:
      </text>
      <text x={470} y={182} fontSize="10.5" fill="var(--tx3)">
        the rotation kept the sort.
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Insert 3, then 2, then 1 into an AVL tree. Each key is smaller than the last, so every link goes left and we get a degenerate stick. Node 3's left subtree has height 2 but its right is empty — balance factor +2, outside AVL's allowed [-1, +1].",
    render: () => <Frame1 />,
  },
  {
    caption:
      "Find the trouble. The lowest node whose balance factor exceeds 1 is z = 3 (red). Its heavier side is the left child y = 2, and y's heavier side is ITS left child — the 'left-left' shape. The single-rotation cure applies.",
    render: () => <Frame2 />,
  },
  {
    caption:
      "Perform a RIGHT rotation about z = 3. The left child 2 rotates up into the root slot, 3 swings down to become 2's right child, and 1 stays put as 2's left child. Only three parent/child pointers are rewired — it is an O(1) operation.",
    render: () => <Frame3 />,
  },
  {
    caption:
      "Balanced. The root is now 2 with children 1 and 3, every balance factor is 0, and the height fell from 3 back to 2. In-order traversal still reads 1, 2, 3 — a rotation reshapes the tree without disturbing the sorted order.",
    render: () => <Frame4 />,
  },
];

export default function TreeRotation() {
  return (
    <FigureStepper
      title="AVL right rotation — fixing the left-left case"
      figKey="tree-rotation"
      viewBox="0 0 640 320"
      accent="#34D399"
      frames={FRAMES}
    />
  );
}
