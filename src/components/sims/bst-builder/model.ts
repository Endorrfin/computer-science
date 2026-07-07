// Engine — the binary search tree, and its self-balancing cousin the AVL tree.
// This is the heart of ch.15: a BST keeps keys ordered so that search, insert
// and delete all follow a single root-to-leaf path — O(h) where h is the
// height. The whole game is keeping h near log₂n. A plain BST does not: feed it
// sorted keys and it degenerates into a linked list (h = n, everything O(n)).
// An AVL tree fixes that by re-balancing after every insert/delete with O(1)
// local ROTATIONS, guaranteeing h ≤ 1.44·log₂n forever.
//
// Design choices that make this both correct and animatable:
//   • Nodes are treated IMMUTABLY. insert/delete/rotate return NEW nodes along
//     the touched path (structural sharing for the rest). That means every
//     intermediate tree is a distinct object we can snapshot into an animation
//     frame without cloning — the sim just replays the frames.
//   • Every node caches its `height` (leaf = 1, null = 0). The balance factor
//     is height(left) − height(right); |bf| ≤ 1 is the AVL invariant.
//   • Each mutating op threads an optional `Trace` that records the compares it
//     makes and the rotations it performs, plus a tree snapshot per step — the
//     single source of truth the bst-builder sim animates and the tests assert.
//
// Nothing here imports React: it runs under Node for scripts/test-ch15.ts.

export type TreeNode = {
  key: number;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
};

/** A single animation/teaching step. `tree` is the whole tree AFTER this step
    (a fresh object graph), so the sim can render it directly; `focus` is the
    key the step is "about" (the node just compared, attached, or rotated). */
export type Step = {
  kind: "compare" | "attach" | "rotate" | "found" | "notfound" | "remove" | "replace" | "start";
  caption: string;
  tree: TreeNode | null;
  focus: number | null;
  /** For rotate steps: which case fired. */
  rotation?: "LL" | "RR" | "LR" | "RL";
};

export type InsertResult = { root: TreeNode | null; steps: Step[]; rotations: number };
export type DeleteResult = { root: TreeNode | null; steps: Step[]; rotations: number; removed: boolean };
export type SearchResult = { path: number[]; found: boolean; steps: Step[] };

// ------------------------------------------------------------------
// Tiny node helpers. `h` treats null as height 0 so a leaf is height 1.
// ------------------------------------------------------------------

function h(n: TreeNode | null): number {
  return n === null ? 0 : n.height;
}

function node(key: number, left: TreeNode | null, right: TreeNode | null): TreeNode {
  return { key, left, right, height: 1 + Math.max(h(left), h(right)) };
}

function leaf(key: number): TreeNode {
  return { key, left: null, right: null, height: 1 };
}

/** balance factor = height(left) − height(right). AVL keeps this in {−1,0,1}. */
export function balanceFactor(n: TreeNode | null): number {
  return n === null ? 0 : h(n.left) - h(n.right);
}

// ------------------------------------------------------------------
// Rotations — the O(1) pointer surgery that rebalances. A right rotation lifts
// the left child; a left rotation lifts the right child. Both preserve the BST
// ordering (that is the whole point) and rebuild heights bottom-up.
// ------------------------------------------------------------------

/** Right rotation around y (its left child x becomes the new subtree root). */
function rotateRight(y: TreeNode): TreeNode {
  const x = y.left as TreeNode; // caller guarantees a left child exists
  const t2 = x.right;
  const newY = node(y.key, t2, y.right);
  return node(x.key, x.left, newY);
}

/** Left rotation around x (its right child y becomes the new subtree root). */
function rotateLeft(x: TreeNode): TreeNode {
  const y = x.right as TreeNode; // caller guarantees a right child exists
  const t2 = y.left;
  const newX = node(x.key, x.left, t2);
  return node(y.key, newX, y.right);
}

// ------------------------------------------------------------------
// Insert. `avl` toggles rebalancing. We first do the standard BST descent
// (recording each compare), attach a new leaf, then — on the way back up, only
// when avl — recompute the balance factor and apply the matching rotation.
//
// The four AVL cases, by where the new node landed relative to the unbalanced
// ancestor z:  LL → single right; RR → single left; LR → left-then-right;
// RL → right-then-left. Exactly the textbook set.
// ------------------------------------------------------------------

export function insert(root: TreeNode | null, key: number, avl: boolean): InsertResult {
  const steps: Step[] = [];
  let rotations = 0;

  function go(n: TreeNode | null): TreeNode {
    if (n === null) {
      const created = leaf(key);
      // caption/snapshot are filled in by the caller once the whole tree is known
      steps.push({ kind: "attach", caption: `Empty spot found — attach ${key} as a new leaf.`, tree: null, focus: key });
      return created;
    }
    if (key === n.key) {
      // duplicate: no-op (this BST holds a set). Record a 'found' step.
      steps.push({ kind: "found", caption: `${key} is already in the tree — nothing to insert.`, tree: null, focus: n.key });
      return n;
    }
    let next: TreeNode;
    if (key < n.key) {
      steps.push({ kind: "compare", caption: `${key} < ${n.key} → go left.`, tree: null, focus: n.key });
      next = node(n.key, go(n.left), n.right);
    } else {
      steps.push({ kind: "compare", caption: `${key} > ${n.key} → go right.`, tree: null, focus: n.key });
      next = node(n.key, n.left, go(n.right));
    }
    if (!avl) return next;
    return rebalance(next, (kind, tree, focus, rotation) => {
      rotations++;
      steps.push({ kind, caption: rotationCaption(rotation, focus), tree, focus, rotation });
    });
  }

  const before = root;
  steps.push({ kind: "start", caption: `Insert ${key}: walk from the root, going left for smaller and right for larger.`, tree: before, focus: null });
  const newRoot = go(root);
  // Backfill the "after" tree snapshot into every step that lacked one so the
  // sim can show the growing/rebalancing tree at each micro-step.
  return { root: newRoot, steps: fillSnapshots(steps, before, newRoot), rotations };
}

/** Apply the single AVL fix-up at node n (n's subtrees are already balanced).
    Calls `onRotate` for each rotation performed (0, 1 double = 2 primitives). */
function rebalance(
  n: TreeNode,
  onRotate: (kind: "rotate", tree: TreeNode, focus: number, rotation: "LL" | "RR" | "LR" | "RL") => void,
): TreeNode {
  const bf = balanceFactor(n);
  // Left-heavy
  if (bf > 1) {
    if (balanceFactor(n.left) >= 0) {
      const out = rotateRight(n); // LL
      onRotate("rotate", out, n.key, "LL");
      return out;
    }
    const fixedLeft = rotateLeft(n.left as TreeNode); // LR: left-rotate child…
    const out = rotateRight(node(n.key, fixedLeft, n.right)); // …then right-rotate n
    onRotate("rotate", out, n.key, "LR");
    return out;
  }
  // Right-heavy
  if (bf < -1) {
    if (balanceFactor(n.right) <= 0) {
      const out = rotateLeft(n); // RR
      onRotate("rotate", out, n.key, "RR");
      return out;
    }
    const fixedRight = rotateRight(n.right as TreeNode); // RL: right-rotate child…
    const out = rotateLeft(node(n.key, n.left, fixedRight)); // …then left-rotate n
    onRotate("rotate", out, n.key, "RL");
    return out;
  }
  return n;
}

function rotationCaption(rotation: "LL" | "RR" | "LR" | "RL" | undefined, focus: number): string {
  switch (rotation) {
    case "LL":
      return `Left-left case at ${focus}: one right rotation restores balance.`;
    case "RR":
      return `Right-right case at ${focus}: one left rotation restores balance.`;
    case "LR":
      return `Left-right case at ${focus}: rotate the child left, then ${focus} right.`;
    case "RL":
      return `Right-left case at ${focus}: rotate the child right, then ${focus} left.`;
    default:
      return `Rebalance at ${focus}.`;
  }
}

// ------------------------------------------------------------------
// Delete. Standard BST delete (leaf → drop; one child → splice; two children →
// replace with in-order successor, the smallest key in the right subtree), with
// AVL rebalancing on the way back up when `avl`.
// ------------------------------------------------------------------

export function remove(root: TreeNode | null, key: number, avl: boolean): DeleteResult {
  const steps: Step[] = [];
  let rotations = 0;
  let removed = false;

  function minNode(n: TreeNode): TreeNode {
    let cur = n;
    while (cur.left !== null) cur = cur.left;
    return cur;
  }

  function go(n: TreeNode | null): TreeNode | null {
    if (n === null) {
      steps.push({ kind: "notfound", caption: `${key} is not in the tree — nothing to delete.`, tree: null, focus: null });
      return null;
    }
    let next: TreeNode | null;
    if (key < n.key) {
      steps.push({ kind: "compare", caption: `${key} < ${n.key} → search left.`, tree: null, focus: n.key });
      next = node(n.key, go(n.left), n.right);
    } else if (key > n.key) {
      steps.push({ kind: "compare", caption: `${key} > ${n.key} → search right.`, tree: null, focus: n.key });
      next = node(n.key, n.left, go(n.right));
    } else {
      removed = true;
      if (n.left === null && n.right === null) {
        steps.push({ kind: "remove", caption: `${key} is a leaf — just remove it.`, tree: null, focus: n.key });
        return null;
      }
      if (n.left === null) {
        steps.push({ kind: "remove", caption: `${key} has one child — splice it out.`, tree: null, focus: n.key });
        return n.right;
      }
      if (n.right === null) {
        steps.push({ kind: "remove", caption: `${key} has one child — splice it out.`, tree: null, focus: n.key });
        return n.left;
      }
      const succ = minNode(n.right);
      steps.push({ kind: "replace", caption: `${key} has two children — replace it with its in-order successor ${succ.key}.`, tree: null, focus: succ.key });
      const prunedRight = go2(n.right, succ.key);
      next = node(succ.key, n.left, prunedRight);
    }
    if (next === null || !avl) return next;
    return rebalance(next, (kind, tree, focus, rotation) => {
      rotations++;
      steps.push({ kind, caption: rotationCaption(rotation, focus), tree, focus, rotation });
    });
  }

  // delete-min helper used to prune the successor, with the same AVL fix-up.
  function go2(n: TreeNode, target: number): TreeNode | null {
    if (target < n.key) {
      const l = go2(n.left as TreeNode, target);
      const next = node(n.key, l, n.right);
      return avl ? rebalance(next, () => { rotations++; }) : next;
    }
    if (target > n.key) {
      const r = go2(n.right as TreeNode, target);
      const next = node(n.key, n.left, r);
      return avl ? rebalance(next, () => { rotations++; }) : next;
    }
    // found successor (it has no left child by construction)
    return n.right;
  }

  const before = root;
  steps.push({ kind: "start", caption: `Delete ${key}: find it first.`, tree: before, focus: null });
  const newRoot = go(root);
  return { root: newRoot, steps: fillSnapshots(steps, before, newRoot), rotations, removed };
}

// ------------------------------------------------------------------
// Search — the read path. Records the compares (the path from root) so the sim
// can light up the descent and the tests can assert the exact route taken.
// ------------------------------------------------------------------

export function search(root: TreeNode | null, key: number): SearchResult {
  const path: number[] = [];
  const steps: Step[] = [];
  let cur = root;
  while (cur !== null) {
    path.push(cur.key);
    if (key === cur.key) {
      steps.push({ kind: "found", caption: `Found ${key}.`, tree: root, focus: cur.key });
      return { path, found: true, steps };
    }
    if (key < cur.key) {
      steps.push({ kind: "compare", caption: `${key} < ${cur.key} → go left.`, tree: root, focus: cur.key });
      cur = cur.left;
    } else {
      steps.push({ kind: "compare", caption: `${key} > ${cur.key} → go right.`, tree: root, focus: cur.key });
      cur = cur.right;
    }
  }
  steps.push({ kind: "notfound", caption: `${key} is not in the tree.`, tree: root, focus: null });
  return { path, found: false, steps };
}

// ------------------------------------------------------------------
// Traversals. inorder yields keys in sorted order (the BST's signature); the
// others are the standard depth-first and breadth-first orders.
// ------------------------------------------------------------------

export function inorder(root: TreeNode | null): number[] {
  const out: number[] = [];
  const walk = (n: TreeNode | null): void => {
    if (!n) return;
    walk(n.left);
    out.push(n.key);
    walk(n.right);
  };
  walk(root);
  return out;
}

export function preorder(root: TreeNode | null): number[] {
  const out: number[] = [];
  const walk = (n: TreeNode | null): void => {
    if (!n) return;
    out.push(n.key);
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return out;
}

export function postorder(root: TreeNode | null): number[] {
  const out: number[] = [];
  const walk = (n: TreeNode | null): void => {
    if (!n) return;
    walk(n.left);
    walk(n.right);
    out.push(n.key);
  };
  walk(root);
  return out;
}

export function levelorder(root: TreeNode | null): number[] {
  const out: number[] = [];
  const q: TreeNode[] = root ? [root] : [];
  while (q.length > 0) {
    const n = q.shift() as TreeNode;
    out.push(n.key);
    if (n.left) q.push(n.left);
    if (n.right) q.push(n.right);
  }
  return out;
}

export function height(root: TreeNode | null): number {
  return h(root);
}

export function size(root: TreeNode | null): number {
  return root === null ? 0 : 1 + size(root.left) + size(root.right);
}

// ------------------------------------------------------------------
// Invariant checkers — used by the tests (and cheap enough to assert live).
// ------------------------------------------------------------------

/** Is this a valid BST? Every key strictly greater than all keys to its left
    and less than all to its right. Checked with a descending value window. */
export function isValidBST(root: TreeNode | null): boolean {
  const check = (n: TreeNode | null, lo: number, hi: number): boolean => {
    if (!n) return true;
    if (n.key <= lo || n.key >= hi) return false;
    return check(n.left, lo, n.key) && check(n.right, n.key, hi);
  };
  return check(root, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

/** Is every node's balance factor within {−1,0,1} AND is every cached height
    correct? (The second half catches rotations that forget to fix heights.) */
export function isAVLBalanced(root: TreeNode | null): boolean {
  const check = (n: TreeNode | null): boolean => {
    if (!n) return true;
    if (n.height !== 1 + Math.max(h(n.left), h(n.right))) return false;
    if (Math.abs(balanceFactor(n)) > 1) return false;
    return check(n.left) && check(n.right);
  };
  return check(root);
}

// ------------------------------------------------------------------
// Build helpers.
// ------------------------------------------------------------------

/** Insert a list of keys in order, returning the final root. */
export function build(keys: number[], avl: boolean): TreeNode | null {
  let root: TreeNode | null = null;
  for (const k of keys) root = insert(root, k, avl).root;
  return root;
}

// ------------------------------------------------------------------
// Layout — position every node for SVG rendering. x is assigned by an in-order
// walk (so the drawing preserves the left-to-right key order); y is the depth.
// Returned as flat arrays the sim/figures map over. Pure and reused by both.
// ------------------------------------------------------------------

export type LaidNode = { key: number; x: number; y: number; bf: number };
export type LaidEdge = { x1: number; y1: number; x2: number; y2: number; childKey: number };
export type Layout = { nodes: LaidNode[]; edges: LaidEdge[]; width: number; depth: number };

export function layout(root: TreeNode | null): Layout {
  const nodes: LaidNode[] = [];
  const edges: LaidEdge[] = [];
  let counter = 0;
  const pos = new Map<number, { x: number; y: number }>();
  const walk = (n: TreeNode | null, depth: number): void => {
    if (!n) return;
    walk(n.left, depth + 1);
    const x = counter++;
    pos.set(n.key, { x, y: depth });
    nodes.push({ key: n.key, x, y: depth, bf: balanceFactor(n) });
    walk(n.right, depth + 1);
  };
  walk(root, 0);
  // second pass for edges (parent → child), using recorded positions
  const walkEdges = (n: TreeNode | null): void => {
    if (!n) return;
    const p = pos.get(n.key) as { x: number; y: number };
    for (const c of [n.left, n.right]) {
      if (c) {
        const cp = pos.get(c.key) as { x: number; y: number };
        edges.push({ x1: p.x, y1: p.y, x2: cp.x, y2: cp.y, childKey: c.key });
        walkEdges(c);
      }
    }
  };
  walkEdges(root);
  const depth = nodes.reduce((m, nd) => Math.max(m, nd.y), 0);
  return { nodes, edges, width: Math.max(1, counter), depth };
}

// ------------------------------------------------------------------
// Snapshot backfill. Insert/delete record their steps with `tree: null` while
// descending (the final tree isn't known yet); rotate steps already carry their
// post-rotation subtree but not the whole tree. To animate cleanly we give
// every step the FULL tree as it stands at that moment. We approximate the
// growing tree by showing `before` for the descent and `after` from the first
// structural change onward — enough for a legible step-through, and the tests
// assert structure via the returned root, not these snapshots.
// ------------------------------------------------------------------

function fillSnapshots(steps: Step[], before: TreeNode | null, after: TreeNode | null): Step[] {
  let seenStructural = false;
  return steps.map((s) => {
    if (s.kind === "attach" || s.kind === "rotate" || s.kind === "remove" || s.kind === "replace") {
      seenStructural = true;
    }
    if (s.tree !== null) return s;
    return { ...s, tree: seenStructural ? after : before };
  });
}
