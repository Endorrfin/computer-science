// [fig] mst-grow — the same weighted graph's minimum spanning tree grown two
// ways, side by side. KRUSKAL is edge-first and global: sort every edge, add the
// cheapest that doesn't make a cycle — so it grabs the globally-cheapest D–E (1)
// first even though it's nowhere near a root, then joins the pieces. PRIM is
// vertex-first and local: start at A and repeatedly add the cheapest edge leaving
// the tree — so it reaches that same D–E last. Different orders, identical tree
// (weight 10). No GIFs (§6): stepped SVG frames via FigureStepper.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

type Pt = { x: number; y: number };
const NODES: Record<string, Pt> = {
  A: { x: 30, y: 120 },
  B: { x: 110, y: 120 },
  C: { x: 190, y: 58 },
  D: { x: 190, y: 182 },
  E: { x: 270, y: 120 },
};
type EdgeSpec = { k: string; a: string; b: string; w: number };
const EDGES: EdgeSpec[] = [
  { k: "AB", a: "A", b: "B", w: 2 },
  { k: "BC", a: "B", b: "C", w: 3 },
  { k: "BD", a: "B", b: "D", w: 4 },
  { k: "CE", a: "C", b: "E", w: 5 },
  { k: "DE", a: "D", b: "E", w: 1 },
  { k: "AC", a: "A", b: "C", w: 6 },
];
const R = 15;

function Panel({ ox, title, on }: { ox: number; title: string; on: string[] }) {
  const onSet = new Set(on);
  const inTree = new Set<string>();
  for (const e of EDGES) if (onSet.has(e.k)) { inTree.add(e.a); inTree.add(e.b); }
  const total = EDGES.filter((e) => onSet.has(e.k)).reduce((s, e) => s + e.w, 0);
  return (
    <g transform={`translate(${ox},0)`} fontFamily="var(--font-body)">
      <text x={150} y={16} textAnchor="middle" fontSize="12.5" fontWeight={700} fill="var(--tx)">{title}</text>
      {EDGES.map((e) => {
        const pa = NODES[e.a];
        const pb = NODES[e.b];
        const hot = onSet.has(e.k);
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2;
        return (
          <g key={e.k}>
            <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={hot ? "var(--p4)" : "var(--line)"} strokeWidth={hot ? 4 : 1.5} strokeDasharray={hot ? undefined : "4 3"} />
            <circle cx={mx} cy={my} r={9} fill="var(--surface)" stroke={hot ? "var(--p4)" : "var(--line)"} strokeWidth={1} />
            <text x={mx} y={my + 3.5} textAnchor="middle" fontSize="10" fontWeight={700} fill={hot ? "var(--p4)" : "var(--tx2)"}>{e.w}</text>
          </g>
        );
      })}
      {Object.entries(NODES).map(([lbl, p]) => {
        const lit = inTree.has(lbl);
        return (
          <g key={lbl}>
            <circle cx={p.x} cy={p.y} r={R} fill={lit ? "color-mix(in srgb, var(--p4) 24%, var(--surface))" : "var(--s2)"} stroke={lit ? "var(--p4)" : "var(--line)"} strokeWidth={2} />
            <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="12" fontWeight={700} fontFamily="var(--font-mono)" fill="var(--tx)">{lbl}</text>
          </g>
        );
      })}
      <text x={150} y={228} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">edges: {on.length} · weight {total}</text>
    </g>
  );
}

function frame(kr: string[], pr: string[]): () => import("react").ReactNode {
  return () => (
    <g>
      <Panel ox={12} title="Kruskal — cheapest edge first" on={kr} />
      <line x1={320} y1={30} x2={320} y2={210} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
      <Panel ox={338} title="Prim — grow from A" on={pr} />
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption: "One weighted graph, two ways to find its minimum spanning tree — the cheapest set of edges that connects all 5 nodes with no cycle. Kruskal sorts all edges; Prim grows outward from A.",
    render: frame([], []),
  },
  {
    caption: "Kruskal takes the globally cheapest edge first — D–E (1) — even though it's a lone fragment far from anywhere. Prim, rooted at A, can only take an edge touching A: the cheapest is A–B (2).",
    render: frame(["DE"], ["AB"]),
  },
  {
    caption: "Kruskal's next-cheapest is A–B (2). Prim extends its tree with the cheapest edge leaving {A,B}: B–C (3).",
    render: frame(["DE", "AB"], ["AB", "BC"]),
  },
  {
    caption: "Kruskal adds B–C (3). Prim adds B–D (4), the cheapest edge leaving {A,B,C}. (Both skip A–C (6) — it would close a cycle / isn't the cheapest cut.)",
    render: frame(["DE", "AB", "BC"], ["AB", "BC", "BD"]),
  },
  {
    caption: "Kruskal adds B–D (4), which finally FUSES its two fragments {A,B,C} and {D,E} into one tree. Prim, now spanning {A,B,C,D}, reaches D–E (1) last — the very edge Kruskal took first.",
    render: frame(["DE", "AB", "BC", "BD"], ["AB", "BC", "BD", "DE"]),
  },
  {
    caption: "Same four edges, same minimum spanning tree, total weight 10 — reached in opposite orders. Kruskal is edge-first and global (union-find guards against cycles); Prim is vertex-first and local (a frontier of cut edges). Both are greedy, and both are provably optimal for MST.",
    render: frame(["AB", "BC", "BD", "DE"], ["AB", "BC", "BD", "DE"]),
  },
];

export default function MstGrow() {
  return <FigureStepper title="Minimum spanning tree — Kruskal vs Prim" figKey="mst-grow" viewBox="0 0 640 240" accent="#34D399" frames={FRAMES} />;
}
