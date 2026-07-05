// Engine — a direct-mapped cache over a small flat memory. Pure &
// erasable-syntax (Node-testable). Drives cache-sim (ch.8).
//
// Direct-mapped: an address belongs to exactly one line, chosen by index bits.
//   block = ⌊addr / lineSize⌋           (a line caches `lineSize` neighbours)
//   line  = block mod numLines          (the only slot that block may occupy)
//   tag   = ⌊block / numLines⌋          (which of the competing blocks is resident)
// A hit needs the line valid AND holding the same tag. This is the cleanest
// model for the two lessons of the chapter: spatial locality (a bigger line
// pulls in neighbours) and conflict misses (two hot blocks fighting over one
// line). Associativity + replacement policy live in the chapter's senior lens.

export type CacheParams = { numLines: number; lineSize: number; memCells: number };

export type LineState = { valid: boolean; tag: number; base: number }; // base = first addr resident
export type AccessResult = {
  addr: number;
  block: number;
  line: number;
  tag: number;
  hit: boolean;
  evictedTag: number | null; // tag thrown out on a conflict miss, else null
};
export type CacheRun = {
  results: AccessResult[];
  hits: number;
  misses: number;
  hitRate: number; // 0..1
  finalLines: LineState[];
};

export function blockOf(addr: number, lineSize: number): number {
  return Math.floor(addr / lineSize);
}
export function lineOf(addr: number, p: CacheParams): number {
  return blockOf(addr, p.lineSize) % p.numLines;
}
export function tagOf(addr: number, p: CacheParams): number {
  return Math.floor(blockOf(addr, p.lineSize) / p.numLines);
}

export function runCache(addrs: number[], p: CacheParams): CacheRun {
  const lines: LineState[] = Array.from({ length: p.numLines }, () => ({ valid: false, tag: -1, base: -1 }));
  const results: AccessResult[] = [];
  let hits = 0;
  let misses = 0;

  for (const addr of addrs) {
    const block = blockOf(addr, p.lineSize);
    const line = block % p.numLines;
    const tag = Math.floor(block / p.numLines);
    const slot = lines[line];
    const hit = slot.valid && slot.tag === tag;
    let evictedTag: number | null = null;
    if (hit) {
      hits++;
    } else {
      misses++;
      if (slot.valid && slot.tag !== tag) evictedTag = slot.tag;
      lines[line] = { valid: true, tag, base: block * p.lineSize };
    }
    results.push({ addr, block, line, tag, hit, evictedTag });
  }

  const total = hits + misses;
  return { results, hits, misses, hitRate: total === 0 ? 0 : hits / total, finalLines: lines };
}

// ---- Access patterns (deterministic permutations of 0..memCells-1, so the
//       sim and tests always agree; each pass touches every cell exactly once) ----
export type PatternId = "sequential" | "strided" | "random";

export function sequentialPattern(memCells: number): number[] {
  return Array.from({ length: memCells }, (_, i) => i);
}

/** Stride of one whole cache line: touch a single element per line-block,
    sweeping memory offset by offset. Spatial locality is wasted (one useful
    element per line) and, once the blocks outnumber the lines, the later
    sweeps thrash. At lineSize 1 it degenerates to sequential. */
export function stridedPattern(memCells: number, lineSize: number): number[] {
  const step = Math.max(1, lineSize);
  const out: number[] = [];
  for (let offset = 0; offset < step; offset++)
    for (let base = 0; base + offset < memCells; base += step) out.push(base + offset);
  return out;
}

/** Mulberry32-driven permutation (Fisher–Yates): scattered but reproducible. */
export function randomPattern(memCells: number, seed: number): number[] {
  const out = Array.from({ length: memCells }, (_, i) => i);
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = memCells - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export type PatternDef = { id: PatternId; name: string; blurb: string; make: (p: CacheParams) => number[] };

export const CACHE_PATTERNS: PatternDef[] = [
  {
    id: "sequential",
    name: "Sequential",
    blurb: "Walk memory in order 0,1,2,… — the friendliest pattern: a wide cache line pulls the next neighbours in for free (spatial locality).",
    make: (p) => sequentialPattern(p.memCells),
  },
  {
    id: "strided",
    name: "Strided",
    blurb: "Stride by one whole line, so each line yields just one useful element before you move on — spatial locality wasted, and the revisits thrash.",
    make: (p) => stridedPattern(p.memCells, p.lineSize),
  },
  {
    id: "random",
    name: "Random",
    blurb: "Scattered accesses with no locality — the cache can only win by luck. This is the wall pointer-chasing data structures hit.",
    make: (p) => randomPattern(p.memCells, 1337),
  },
];

export function cachePatternById(id: string): PatternDef | undefined {
  return CACHE_PATTERNS.find((x) => x.id === id);
}
