// huffman-lab core — deterministic Huffman coding for ch.3's HERO and the
// P1 boss. Pure + erasable-syntax only (Node test runner). Determinism:
// leaves are seeded in (count, symbol) order and every node carries a
// creation `seq`; the queue always merges the two lowest (count, seq) nodes,
// so the same text always builds the same tree (tests depend on this).
import { frequencies } from "../compression/model.ts";
import type { SymbolFreq } from "../compression/model.ts";

export type HuffLeaf = { kind: "leaf"; symbol: string; count: number; seq: number };
export type HuffInternal = {
  kind: "internal";
  count: number;
  seq: number;
  left: HuffNode;
  right: HuffNode;
};
export type HuffNode = HuffLeaf | HuffInternal;

export type BuildStep = {
  a: HuffNode; // the two lowest-weight nodes pulled…
  b: HuffNode;
  parent: HuffInternal; // …and combined
  forestCounts: number[]; // remaining weights after the merge (for the UI)
};

function lower(x: HuffNode, y: HuffNode): boolean {
  return x.count < y.count || (x.count === y.count && x.seq < y.seq);
}

/** Build the tree and record every merge so the HERO can animate assembly. */
export function huffmanBuild(str: string): { root: HuffNode | null; steps: BuildStep[]; freqs: SymbolFreq[] } {
  const freqs = frequencies(str);
  if (freqs.length === 0) return { root: null, steps: [], freqs };

  let seq = 0;
  const forest: HuffNode[] = freqs
    .slice()
    .sort((a, b) => a.count - b.count || a.symbol.localeCompare(b.symbol))
    .map((f) => ({ kind: "leaf", symbol: f.symbol, count: f.count, seq: seq++ }) as HuffLeaf);

  const steps: BuildStep[] = [];
  if (forest.length === 1) return { root: forest[0], steps, freqs }; // lone symbol → 1-bit code

  const pool = forest.slice();
  while (pool.length > 1) {
    pool.sort((x, y) => (lower(x, y) ? -1 : lower(y, x) ? 1 : 0));
    const a = pool.shift() as HuffNode;
    const b = pool.shift() as HuffNode;
    const parent: HuffInternal = { kind: "internal", count: a.count + b.count, seq: seq++, left: a, right: b };
    pool.push(parent);
    steps.push({ a, b, parent, forestCounts: pool.map((n) => n.count).sort((m, n) => m - n) });
  }
  return { root: pool[0], steps, freqs };
}

export function huffmanRoot(str: string): HuffNode | null {
  return huffmanBuild(str).root;
}

/** symbol → prefix-free bit string. Left = 0, right = 1. */
export function codeTable(root: HuffNode | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!root) return map;
  if (root.kind === "leaf") {
    map.set(root.symbol, "0");
    return map;
  }
  const walk = (n: HuffNode, prefix: string): void => {
    if (n.kind === "leaf") map.set(n.symbol, prefix);
    else {
      walk(n.left, prefix + "0");
      walk(n.right, prefix + "1");
    }
  };
  walk(root, "");
  return map;
}

export function encode(str: string, table: Map<string, string>): string {
  let bits = "";
  for (const ch of str) bits += table.get(ch) ?? "";
  return bits;
}

export function decode(bits: string, root: HuffNode | null): string {
  if (!root) return "";
  if (root.kind === "leaf") return root.symbol.repeat(bits.length); // lone-symbol tree
  let out = "";
  let node: HuffNode = root;
  for (const bit of bits) {
    node = bit === "0" ? (node as HuffInternal).left : (node as HuffInternal).right;
    if (node.kind === "leaf") {
      out += node.symbol;
      node = root;
    }
  }
  return out;
}

export type HuffStats = {
  asciiBits: number;
  huffBits: number;
  ratio: number; // ascii / huffman
  savedPct: number;
  avgBitsPerSymbol: number;
};

export function stats(str: string, table: Map<string, string>): HuffStats {
  const asciiBits = str.length * 8;
  let huffBits = 0;
  for (const ch of str) huffBits += (table.get(ch) ?? "").length;
  return {
    asciiBits,
    huffBits,
    ratio: huffBits === 0 ? 1 : asciiBits / huffBits,
    savedPct: asciiBits === 0 ? 0 : (1 - huffBits / asciiBits) * 100,
    avgBitsPerSymbol: str.length === 0 ? 0 : huffBits / str.length,
  };
}

export function depthOf(root: HuffNode | null): number {
  if (!root) return 0;
  if (root.kind === "leaf") return 1;
  return 1 + Math.max(depthOf(root.left), depthOf(root.right));
}

/** Pack a bit string into bytes (zero-padded) — how the stream lands "on disk". */
export function bitsToBytes(bits: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8).padEnd(8, "0"), 2));
  }
  return bytes;
}

// ---------------- P1 boss: the mystery file ----------------
// A short message, Huffman-coded, delivered as raw bytes + its code table.
// The player spots the encoding, walks the tree, and reads the message.

export const MYSTERY_SECRET = "HUFFMAN CODES";

export function mysteryPuzzle(secret: string = MYSTERY_SECRET): {
  secret: string;
  root: HuffNode | null;
  table: Map<string, string>;
  bits: string;
  bytes: number[];
} {
  const root = huffmanRoot(secret);
  const table = codeTable(root);
  const bits = encode(secret, table);
  return { secret, root, table, bits, bytes: bitsToBytes(bits) };
}
