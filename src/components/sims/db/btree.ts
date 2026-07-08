// Engine for ch.29 — Databases, the `btree-lab` HERO. A real, framework-free
// B+-tree: the structure every relational database reaches for when you ask it
// to index a column.
//
// Why a B+-tree (not a plain B-tree)? Because that is what Postgres, InnoDB,
// Oracle and SQLite actually build:
//   • ALL records live in the LEAVES; internal nodes hold only *separator keys*
//     that route a search downward.
//   • Leaves are chained left-to-right (`next`), so a range query finds one end
//     and then just walks the chain — no re-descending the tree per row.
//   • High fanout (a node = one disk page holding hundreds of keys) keeps the
//     tree only 3–4 levels deep for millions of rows, so a lookup is a handful
//     of page reads instead of a full-table scan.
//
// Everything here is deterministic and counts *node accesses* (= page reads),
// the currency the chapter and the query-planner boss trade in.
//
// Erasable-syntax only (Node runs this via --experimental-strip-types): no
// enums/namespaces, `import type` only, unions + `as const`.

// ===========================================================================
// Structure
// ===========================================================================

export type BPlusNode = {
  id: number;
  leaf: boolean;
  keys: number[];
  children: BPlusNode[]; // internal only; length === keys.length + 1
  next: BPlusNode | null; // leaf-chain pointer (leaves only)
};

export type BPlusTree = {
  root: BPlusNode;
  order: number; // max children of an internal node (fanout); maxKeys = order - 1
  nextId: number;
};

/** One thing that happened during an insert — drives the sim's animation. */
export type InsertEvent =
  | { kind: "descend"; nodeId: number }
  | { kind: "insert-key"; nodeId: number; key: number }
  | { kind: "split-leaf"; nodeId: number; newId: number; copyUp: number }
  | { kind: "split-internal"; nodeId: number; newId: number; pushUp: number }
  | { kind: "new-root"; newId: number; pushUp: number };

const DEFAULT_ORDER = 4; // small on purpose: splits happen early, so they're visible

export function createTree(order: number = DEFAULT_ORDER): BPlusTree {
  if (order < 3) throw new Error("B+-tree order must be ≥ 3");
  return { root: { id: 0, leaf: true, keys: [], children: [], next: null }, order, nextId: 1 };
}

function maxKeys(tree: BPlusTree): number {
  return tree.order - 1;
}

// ===========================================================================
// Insert (with node splitting that propagates up and can grow the height)
// ===========================================================================

type Split = { promoteKey: number; right: BPlusNode } | null;

/**
 * Insert one key. Returns the animation trace and whether a split occurred.
 * Duplicate keys are ignored (a unique index) — keeps the teaching model clean.
 */
export function insertKey(tree: BPlusTree, key: number): { events: InsertEvent[]; didSplit: boolean } {
  const events: InsertEvent[] = [];
  const split = insertInto(tree, tree.root, key, events);
  if (split) {
    // Root overflowed: build a new root one level up — the only way height grows.
    const newRoot: BPlusNode = {
      id: tree.nextId++,
      leaf: false,
      keys: [split.promoteKey],
      children: [tree.root, split.right],
      next: null,
    };
    tree.root = newRoot;
    events.push({ kind: "new-root", newId: newRoot.id, pushUp: split.promoteKey });
    return { events, didSplit: true };
  }
  return { events, didSplit: events.some((e) => e.kind === "split-leaf" || e.kind === "split-internal") };
}

function insertInto(tree: BPlusTree, node: BPlusNode, key: number, events: InsertEvent[]): Split {
  events.push({ kind: "descend", nodeId: node.id });
  if (node.leaf) {
    if (node.keys.includes(key)) return null; // unique index: ignore duplicates
    insertSorted(node.keys, key);
    events.push({ kind: "insert-key", nodeId: node.id, key });
    if (node.keys.length > maxKeys(tree)) return splitLeaf(tree, node, events);
    return null;
  }
  const i = childIndex(node, key);
  const res = insertInto(tree, node.children[i], key, events);
  if (!res) return null;
  // A child split: absorb its promoted key + new right sibling.
  insertSorted(node.keys, res.promoteKey);
  const at = node.keys.indexOf(res.promoteKey);
  node.children.splice(at + 1, 0, res.right);
  if (node.keys.length > maxKeys(tree)) return splitInternal(tree, node, events);
  return null;
}

function splitLeaf(tree: BPlusTree, leaf: BPlusNode, events: InsertEvent[]): Split {
  const mid = Math.ceil(leaf.keys.length / 2);
  const right: BPlusNode = {
    id: tree.nextId++,
    leaf: true,
    keys: leaf.keys.slice(mid),
    children: [],
    next: leaf.next,
  };
  leaf.keys = leaf.keys.slice(0, mid);
  leaf.next = right;
  const copyUp = right.keys[0]; // B+-tree COPIES the leaf's first key up (it stays in the leaf)
  events.push({ kind: "split-leaf", nodeId: leaf.id, newId: right.id, copyUp });
  return { promoteKey: copyUp, right };
}

function splitInternal(tree: BPlusTree, node: BPlusNode, events: InsertEvent[]): Split {
  const mid = Math.floor(node.keys.length / 2);
  const pushUp = node.keys[mid]; // internal PUSHES the middle key up (it leaves this node)
  const right: BPlusNode = {
    id: tree.nextId++,
    leaf: false,
    keys: node.keys.slice(mid + 1),
    children: node.children.slice(mid + 1),
    next: null,
  };
  node.keys = node.keys.slice(0, mid);
  node.children = node.children.slice(0, mid + 1);
  events.push({ kind: "split-internal", nodeId: node.id, newId: right.id, pushUp });
  return { promoteKey: pushUp, right };
}

// ===========================================================================
// Search — counts node accesses (= disk page reads), the whole point of an index
// ===========================================================================

export type SearchResult = {
  found: boolean;
  path: number[]; // node ids visited root → leaf
  nodeReads: number; // === path.length === tree height; the index's payoff
  comparisons: number;
};

export function search(tree: BPlusTree, key: number): SearchResult {
  const path: number[] = [];
  let comparisons = 0;
  let node = tree.root;
  for (;;) {
    path.push(node.id);
    if (node.leaf) {
      for (const k of node.keys) {
        comparisons++;
        if (k === key) return { found: true, path, nodeReads: path.length, comparisons };
        if (k > key) break;
      }
      return { found: false, path, nodeReads: path.length, comparisons };
    }
    const i = childIndex(node, key, () => comparisons++);
    node = node.children[i];
  }
}

// ===========================================================================
// Range scan — find one end, then WALK THE LEAF CHAIN (the B+-tree superpower)
// ===========================================================================

export type RangeResult = {
  keys: number[];
  descentReads: number; // nodes touched descending to the first leaf
  leavesWalked: number; // leaves visited along the `next` chain
  nodeReads: number; // descentReads + (leavesWalked - 1); total pages touched
};

export function rangeScan(tree: BPlusTree, lo: number, hi: number): RangeResult {
  // Descend to the leaf that could hold `lo`.
  let node = tree.root;
  let descentReads = 0;
  while (!node.leaf) {
    descentReads++;
    node = node.children[childIndex(node, lo)];
  }
  descentReads++; // the leaf itself
  const keys: number[] = [];
  let leaf: BPlusNode | null = node;
  let leavesWalked = 0;
  while (leaf) {
    leavesWalked++;
    let past = false;
    for (const k of leaf.keys) {
      if (k >= lo && k <= hi) keys.push(k);
      if (k > hi) { past = true; break; }
    }
    if (past) break;
    leaf = leaf.next;
  }
  return { keys, descentReads, leavesWalked, nodeReads: descentReads + (leavesWalked - 1) };
}

// ===========================================================================
// Introspection for the UI + the "index vs full scan" scoreboard
// ===========================================================================

export function height(tree: BPlusTree): number {
  let h = 1;
  let node = tree.root;
  while (!node.leaf) { h++; node = node.children[0]; }
  return h;
}

/** In-order key list by walking the leaf chain — the sorted index order. */
export function scanAll(tree: BPlusTree): number[] {
  let leaf: BPlusNode | null = leftmostLeaf(tree.root);
  const out: number[] = [];
  while (leaf) { out.push(...leaf.keys); leaf = leaf.next; }
  return out;
}

export function countNodes(tree: BPlusTree): number {
  let n = 0;
  const walk = (node: BPlusNode): void => { n++; if (!node.leaf) node.children.forEach(walk); };
  walk(tree.root);
  return n;
}

/**
 * Analytic height / read cost for a big table WITHOUT building it — powers the
 * scoreboard's honest "10,000 rows" claim. A leaf page holds `leafCap` records,
 * an internal page fans out to `order` children.
 */
export function bulkStats(order: number, rows: number, leafCap: number): { levels: number; indexReads: number; fullScanReads: number } {
  const leaves = Math.max(1, Math.ceil(rows / leafCap));
  let levels = 1;
  let nodes = leaves;
  while (nodes > 1) { nodes = Math.ceil(nodes / order); levels++; }
  return { levels, indexReads: levels, fullScanReads: leaves }; // full scan reads every leaf/heap page
}

// ===========================================================================
// helpers
// ===========================================================================

function insertSorted(arr: number[], key: number): void {
  let i = arr.length;
  while (i > 0 && arr[i - 1] > key) i--;
  arr.splice(i, 0, key);
}

/** Which child subtree holds `key`: first index whose separator key > key. */
function childIndex(node: BPlusNode, key: number, onCompare?: () => void): number {
  let i = 0;
  while (i < node.keys.length) {
    if (onCompare) onCompare();
    if (key < node.keys[i]) break;
    i++;
  }
  return i;
}

function leftmostLeaf(node: BPlusNode): BPlusNode {
  let n = node;
  while (!n.leaf) n = n.children[0];
  return n;
}

/** Build a tree from a list of keys (test + preset helper). */
export function fromKeys(keys: number[], order: number = DEFAULT_ORDER): BPlusTree {
  const t = createTree(order);
  for (const k of keys) insertKey(t, k);
  return t;
}
