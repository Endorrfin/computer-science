// [micro] bst-builder — a binary search tree you grow by hand, with a Senior-
// lens AVL mode that shows the tree REBALANCING itself. Insert keys and watch
// each one walk the root-to-leaf path (left for smaller, right for larger);
// search lights up the path it follows; delete handles the leaf / one-child /
// two-child cases. Flip on AVL and the same inserts trigger animated LL/RR/LR/RL
// rotations the instant a node's balance factor leaves {−1,0,1} — the picture
// that turns "balancing" from a word into something you can see happen.
//
// The engine (bst-builder/model.ts) returns a STEP TRACE per operation, each
// step carrying the whole tree as it stands plus the node the step is about, so
// the transport just replays frames. Reduced motion → Step. Engine is pure and
// Node-tested (scripts/test-ch15.ts); this component only renders + drives it.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import {
  build,
  height,
  inorder,
  insert,
  isAVLBalanced,
  layout,
  levelorder,
  preorder,
  postorder,
  remove,
  search,
  size,
} from "./model.ts";
import type { Step, TreeNode } from "./model.ts";

const ACCENT = "#34D399";
const SEED = [50, 30, 70, 20, 40, 60, 80];

// SVG geometry
const W = 640;
const PAD_X = 26;
const PAD_T = 30;
const LEVEL_GAP = 62;
const R = 15;

type Traversal = "inorder" | "preorder" | "levelorder" | "postorder";

export default function BstBuilder() {
  const [avl, setAvl] = useState(false);
  const [root, setRoot] = useState<TreeNode | null>(() => build(SEED, false));
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [value, setValue] = useState("55");
  const [traversal, setTraversal] = useState<Traversal>("inorder");
  const [msg, setMsg] = useState("Binary search tree seeded. Insert a key, or flip on AVL to watch it self-balance.");

  const last = steps.length - 1;
  // The tree to draw: the current step's snapshot while animating, else the root.
  const shown = steps.length > 0 ? steps[Math.min(idx, last)].tree : root;
  const focus = steps.length > 0 ? steps[Math.min(idx, last)].focus : null;

  useSimClock(running, 1.6 * speed, () => {
    setIdx((i) => {
      if (i >= last) {
        setRunning(false);
        return last;
      }
      return i + 1;
    });
  });

  function runSteps(newSteps: Step[], committedRoot: TreeNode | null, note: string): void {
    setRoot(committedRoot);
    setSteps(newSteps);
    setIdx(0);
    setMsg(note);
    setRunning(newSteps.length > 1);
  }

  function parseVal(): number | null {
    const n = Number(value);
    return Number.isInteger(n) ? n : null;
  }

  function doInsert(): void {
    const v = parseVal();
    if (v === null) return;
    const res = insert(root, v, avl);
    runSteps(res.steps, res.root, `Insert ${v}${res.rotations > 0 ? ` — ${res.rotations} rotation${res.rotations > 1 ? "s" : ""} rebalanced the tree` : ""}.`);
  }
  function doDelete(): void {
    const v = parseVal();
    if (v === null) return;
    const res = remove(root, v, avl);
    runSteps(res.steps, res.root, res.removed ? `Deleted ${v}.` : `${v} was not in the tree.`);
  }
  function doSearch(): void {
    const v = parseVal();
    if (v === null) return;
    const res = search(root, v);
    runSteps(res.steps, root, res.found ? `Found ${v} in ${res.path.length} step${res.path.length > 1 ? "s" : ""}: ${res.path.join(" → ")}.` : `${v} is absent (searched ${res.path.join(" → ") || "empty tree"}).`);
  }
  function doReset(): void {
    setAvl(false);
    setRoot(build(SEED, false));
    setSteps([]);
    setIdx(0);
    setRunning(false);
    setMsg("Reset to the seed tree.");
  }
  function toggleMode(next: boolean): void {
    setAvl(next);
    setSteps([]);
    setIdx(0);
    setRunning(false);
    if (next) {
      // rebuild the CURRENT keys as an AVL tree so the invariant holds from here
      const keys = inorder(root);
      setRoot(build(keys, true));
      setMsg("AVL mode on — the tree is now height-balanced; new inserts/deletes rotate to keep it that way.");
    } else {
      setMsg("Plain BST mode — no rebalancing (feed it sorted keys to watch it degenerate).");
    }
  }
  function onStep(): void {
    setRunning(false);
    setIdx((i) => Math.min(last, i + 1));
  }

  const laid = useMemo(() => layout(shown), [shown]);
  const innerW = W - PAD_X * 2;
  const px = (x: number): number => PAD_X + ((x + 0.5) / laid.width) * innerW;
  const py = (y: number): number => PAD_T + y * LEVEL_GAP;
  const svgH = PAD_T + (laid.depth + 1) * LEVEL_GAP;

  const seq = useMemo(() => {
    if (traversal === "inorder") return inorder(root);
    if (traversal === "preorder") return preorder(root);
    if (traversal === "postorder") return postorder(root);
    return levelorder(root);
  }, [root, traversal]);

  const h = height(root);
  const balanced = isAVLBalanced(root);
  const caption = steps.length > 0 ? steps[Math.min(idx, last)].caption : "";
  const status = `${caption || msg} · ${size(root)} node${size(root) === 1 ? "" : "s"}, height ${h}${avl ? `, ${balanced ? "balanced ✓" : "unbalanced!"}` : ""}.`;

  return (
    <SimShell
      title="BST builder — grow a search tree, and watch AVL rebalance it"
      simKey="bst-builder"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : (setIdx(0), setRunning(steps.length > 1))), onStep, speed, onSpeed: setSpeed }}
      onReset={doReset}
      status={status}
      controls={
        <div className="bst-ctl">
          <label className="ss-field">
            key
            <input
              className="bst-input"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label="Key to insert, delete, or find"
            />
          </label>
          <button type="button" className="btn" onClick={doInsert}>insert</button>
          <button type="button" className="btn" onClick={doDelete}>delete</button>
          <button type="button" className="btn" onClick={doSearch}>find</button>
          <div className="bit-seg" role="group" aria-label="Tree mode">
            <button type="button" className={cx("bit-segbtn", !avl && "on")} onClick={() => toggleMode(false)} aria-pressed={!avl}>BST</button>
            <button type="button" className={cx("bit-segbtn", avl && "on")} onClick={() => toggleMode(true)} aria-pressed={avl}>AVL</button>
          </div>
        </div>
      }
      footer={
        <div className="bst-foot">
          <div className="bst-traversal">
            <label className="ss-field">
              traversal
              <select value={traversal} onChange={(e) => setTraversal(e.target.value as Traversal)} aria-label="Traversal order">
                <option value="inorder">in-order (sorted)</option>
                <option value="preorder">pre-order</option>
                <option value="postorder">post-order</option>
                <option value="levelorder">level-order (BFS)</option>
              </select>
            </label>
            <code className="bst-seq">{seq.length ? seq.join(", ") : "—"}</code>
          </div>
          <div className="bst-legend" role="list">
            <span className="bst-legrow" role="listitem"><span className="bst-swatch bst-swatch--node" /> node · <span className="bst-bf">bf</span> = balance factor</span>
            <span className="bst-legrow" role="listitem"><span className="bst-swatch bst-swatch--focus" /> current step</span>
          </div>
        </div>
      }
    >
      {shown === null ? (
        <div className="bst-empty">empty tree — insert a key to begin</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${svgH}`} width="100%" className="bst-tree" role="img" aria-label="Binary search tree diagram">
          {laid.edges.map((e) => (
            <line
              key={`e-${e.childKey}`}
              x1={px(e.x1)}
              y1={py(e.y1)}
              x2={px(e.x2)}
              y2={py(e.y2)}
              stroke="var(--line)"
              strokeWidth="1.5"
            />
          ))}
          {laid.nodes.map((n) => {
            const isFocus = focus === n.key;
            const unbal = avl && Math.abs(n.bf) > 1;
            return (
              <g key={`n-${n.key}`}>
                <circle
                  cx={px(n.x)}
                  cy={py(n.y)}
                  r={R}
                  fill="var(--surface)"
                  stroke={isFocus ? "var(--sem-control)" : unbal ? "var(--sem-err)" : "var(--p4)"}
                  strokeWidth={isFocus ? 3 : 2}
                />
                <text x={px(n.x)} y={py(n.y) + 4} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx)">
                  {n.key}
                </text>
                {avl && (
                  <text x={px(n.x) + R + 2} y={py(n.y) - R + 4} fontSize="8.5" fontFamily="var(--font-mono)" fill={unbal ? "var(--sem-err)" : "var(--tx3)"}>
                    {n.bf > 0 ? `+${n.bf}` : n.bf}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </SimShell>
  );
}
