// Engine — the trie (prefix tree), the structure that powers autocomplete,
// spell-checkers, IP routing tables and dictionary lookups. Where a BST decides
// left/right by comparing whole keys, a trie spends the key ONE CHARACTER AT A
// TIME: each edge is a letter, and the path from the root spells a prefix. A
// node flagged `isWord` means "a real word ends here". Two consequences that the
// trie-autocomplete sim is built to make obvious:
//   • Lookup and insert are O(L) in the KEY LENGTH, independent of how many
//     words the trie holds — a million words don't slow down a 5-letter search.
//   • Words that share a prefix SHARE the nodes for that prefix ("car", "card",
//     "care" all reuse c-a-r), so the subtree under a prefix is exactly the set
//     of completions — autocomplete is just "walk to the prefix, then collect
//     every word below".
//
// Nodes carry a stable numeric `id` so the sim can give React keys and lay them
// out; children live in a Map (insertion-ordered), and every function that
// produces OUTPUT sorts alphabetically so results are deterministic and testable.

export type TrieNode = {
  id: number;
  char: string; // the edge label into this node; "" for the root
  isWord: boolean;
  children: Map<string, TrieNode>;
};

/** A trie plus the id counter used to stamp new nodes. */
export type Trie = { root: TrieNode; nextId: number };

export type TrieStepKind = "start" | "walk" | "create" | "mark" | "exists" | "miss" | "found" | "collect";

export type TrieStep = {
  kind: TrieStepKind;
  /** id of the node the step lands on (or the newly created node). */
  nodeId: number;
  char: string;
  caption: string;
};

export function createTrie(): Trie {
  return { root: { id: 0, char: "", isWord: false, children: new Map() }, nextId: 1 };
}

// ------------------------------------------------------------------
// insert — walk the key character by character, creating nodes where the path
// runs out, and flag the final node as a word. O(L).
// ------------------------------------------------------------------

export function insert(trie: Trie, word: string): { steps: TrieStep[]; created: number } {
  const steps: TrieStep[] = [];
  let created = 0;
  let cur = trie.root;
  steps.push({ kind: "start", nodeId: 0, char: "", caption: `Insert "${word}": start at the root and spend one letter per edge.` });
  for (const ch of word) {
    const existing = cur.children.get(ch);
    if (existing) {
      steps.push({ kind: "walk", nodeId: existing.id, char: ch, caption: `Edge '${ch}' already exists — reuse it (shared prefix).` });
      cur = existing;
    } else {
      const node: TrieNode = { id: trie.nextId++, char: ch, isWord: false, children: new Map() };
      created++;
      cur.children.set(ch, node);
      steps.push({ kind: "create", nodeId: node.id, char: ch, caption: `No '${ch}' edge yet — create a new node.` });
      cur = node;
    }
  }
  if (cur.isWord) {
    steps.push({ kind: "exists", nodeId: cur.id, char: cur.char, caption: `"${word}" was already a word — no change.` });
  } else {
    cur.isWord = true;
    steps.push({ kind: "mark", nodeId: cur.id, char: cur.char, caption: `Mark the last node: "${word}" ends here.` });
  }
  return { steps, created };
}

// ------------------------------------------------------------------
// walkPrefix — follow a prefix as far as the trie allows, returning the node it
// ends at (or null if the path breaks) plus the step trace of the descent.
// ------------------------------------------------------------------

export function walkPrefix(trie: Trie, prefix: string): { node: TrieNode | null; steps: TrieStep[] } {
  const steps: TrieStep[] = [];
  let cur: TrieNode | null = trie.root;
  steps.push({ kind: "start", nodeId: 0, char: "", caption: `Look up "${prefix}": follow one edge per letter.` });
  for (const ch of prefix) {
    const next: TrieNode | undefined = cur ? cur.children.get(ch) : undefined;
    if (!next) {
      steps.push({ kind: "miss", nodeId: cur ? cur.id : 0, char: ch, caption: `No '${ch}' edge — "${prefix}" is not present.` });
      return { node: null, steps };
    }
    steps.push({ kind: "walk", nodeId: next.id, char: ch, caption: `Follow '${ch}'.` });
    cur = next;
  }
  return { node: cur, steps };
}

/** Exact-word search: the prefix path must exist AND its final node be a word. */
export function search(trie: Trie, word: string): { found: boolean; steps: TrieStep[] } {
  const { node, steps } = walkPrefix(trie, word);
  if (node && node.isWord) {
    steps.push({ kind: "found", nodeId: node.id, char: node.char, caption: `Path exists and ends on a word marker → "${word}" is present.` });
    return { found: true, steps };
  }
  if (node && !node.isWord) {
    steps.push({ kind: "miss", nodeId: node.id, char: node.char, caption: `Path exists but no word ends here — "${word}" is only a prefix, not a stored word.` });
  }
  return { found: false, steps };
}

export function startsWith(trie: Trie, prefix: string): boolean {
  return walkPrefix(trie, prefix).node !== null;
}

// ------------------------------------------------------------------
// collectWords — every word in the subtree rooted at `node`, prepended with the
// prefix that reaches it, alphabetically sorted (children visited in sorted
// order so the recursion is already ordered). This IS autocomplete's core.
// ------------------------------------------------------------------

export function collectFrom(node: TrieNode, prefix: string): string[] {
  const out: string[] = [];
  const walk = (n: TrieNode, acc: string): void => {
    if (n.isWord) out.push(acc);
    const keys = [...n.children.keys()].sort();
    for (const k of keys) walk(n.children.get(k) as TrieNode, acc + k);
  };
  walk(node, prefix);
  return out;
}

export function allWords(trie: Trie): string[] {
  return collectFrom(trie.root, "");
}

/** Autocomplete: the (optionally capped) list of stored words that begin with
    `prefix`. Empty if the prefix isn't a path in the trie. */
export function autocomplete(trie: Trie, prefix: string, limit = Infinity): string[] {
  const { node } = walkPrefix(trie, prefix);
  if (!node) return [];
  const words = collectFrom(node, prefix);
  return limit === Infinity ? words : words.slice(0, limit);
}

// ------------------------------------------------------------------
// countNodes — the prefix-sharing payoff: inserting words that share prefixes
// adds far fewer nodes than the total characters, because the shared prefix is
// stored once. The tests pin this.
// ------------------------------------------------------------------

export function countNodes(trie: Trie): number {
  let count = 0;
  const walk = (n: TrieNode): void => {
    count++;
    for (const c of n.children.values()) walk(c);
  };
  walk(trie.root);
  return count; // includes the root
}

export function build(words: string[]): Trie {
  const t = createTrie();
  for (const w of words) insert(t, w);
  return t;
}

// ------------------------------------------------------------------
// Layout for the SVG: assign each node an x by an in-order-ish walk over sorted
// children (leaves get consecutive slots; parents center over their children),
// and y by depth. Returns flat arrays the sim maps over.
// ------------------------------------------------------------------

export type TrieLaidNode = { id: number; char: string; isWord: boolean; x: number; y: number };
export type TrieLaidEdge = { x1: number; y1: number; x2: number; y2: number; childId: number };

export function trieLayout(trie: Trie): {
  nodes: TrieLaidNode[];
  edges: TrieLaidEdge[];
  width: number;
  depth: number;
} {
  const nodes: TrieLaidNode[] = [];
  const edges: TrieLaidEdge[] = [];
  const pos = new Map<number, { x: number; y: number }>();
  let leafCounter = 0;

  // Post-order: a node's x is the average of its children's x (or the next leaf
  // slot if it has none), giving a tidy centered tree.
  const place = (n: TrieNode, depth: number): number => {
    const keys = [...n.children.keys()].sort();
    if (keys.length === 0) {
      const x = leafCounter++;
      pos.set(n.id, { x, y: depth });
      return x;
    }
    const xs = keys.map((k) => place(n.children.get(k) as TrieNode, depth + 1));
    const x = xs.reduce((s, v) => s + v, 0) / xs.length;
    pos.set(n.id, { x, y: depth });
    return x;
  };
  place(trie.root, 0);

  const emit = (n: TrieNode): void => {
    const p = pos.get(n.id) as { x: number; y: number };
    nodes.push({ id: n.id, char: n.char, isWord: n.isWord, x: p.x, y: p.y });
    const keys = [...n.children.keys()].sort();
    for (const k of keys) {
      const c = n.children.get(k) as TrieNode;
      const cp = pos.get(c.id) as { x: number; y: number };
      edges.push({ x1: p.x, y1: p.y, x2: cp.x, y2: cp.y, childId: c.id });
      emit(c);
    }
  };
  emit(trie.root);

  const depth = nodes.reduce((m, nd) => Math.max(m, nd.y), 0);
  return { nodes, edges, width: Math.max(1, leafCounter), depth };
}
