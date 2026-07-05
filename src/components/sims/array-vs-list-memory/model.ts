// Engine — array (contiguous) vs linked-list (scattered) traversal, measured on
// the SAME direct-mapped cache the chapter-8 sim used. Pure & erasable-syntax
// (Node-testable). Drives array-vs-list-memory (ch.14). Reuses the ch.8 cache
// engine wholesale — the whole point of this widget is cross-chapter continuity:
// the very same cache that explained spatial locality in "Fast CPUs" now
// explains *why an array beats a linked list in practice even when Big-O says
// they tie*. Constant factors, not asymptotics, and the cache is the reason.
//
// Two layouts, one traversal, run through `runCache` from fast-cpu/cache.ts:
//   • ARRAY: the n elements live at n CONSECUTIVE addresses. Walking them in
//     order is `sequentialPattern` in disguise — a wide cache line pulls in the
//     next neighbours for free, so only 1 miss per line (hitRate ≈ 1 − 1/line).
//   • LINKED LIST: the n nodes were allocated at scattered moments in the
//     program's life, so they sit at random addresses far apart. The pointer
//     you chase from node k to node k+1 lands in a DIFFERENT cache line almost
//     every time — the line's free neighbours are wasted, and nearly every hop
//     is a miss. This is the "pointer chasing thrashes the cache" wall.
//
// Cost model (time units): a hit costs 1, a miss costs MISS_PENALTY. Real
// numbers vary, but the ratio (an L1 hit ~ a few cycles, a miss to DRAM ~
// hundreds) is what makes the list traversal cost several times the array's
// even though both touch exactly n elements.

import { runCache } from "../fast-cpu/cache.ts";
import type { CacheParams } from "../fast-cpu/cache.ts";

/** Cost of a cache miss in the same time unit a hit costs 1. A conservative
    stand-in for "L1 hit vs main-memory miss" — the real gap is larger, which
    only sharpens the lesson. */
export const MISS_PENALTY = 10 as const;

/** One traversal step: the address touched and whether the cache served it. */
export type TraverseStep = { addr: number; hit: boolean };

export type TraverseResult = {
  steps: TraverseStep[];
  hits: number;
  misses: number;
  hitRate: number; // 0..1
  cost: number; // Σ (hit ? 1 : MISS_PENALTY)
};

/** ARRAY layout: n elements at n CONSECUTIVE addresses base..base+n-1. Walking
    them front-to-back is the cache's favourite pattern (contiguous = spatial
    locality), so consecutive entries share a cache line. */
export function arrayAddresses(n: number, base = 0): number[] {
  return Array.from({ length: n }, (_, i) => base + i);
}

/** LINKED-LIST layout: n node addresses scattered pseudo-randomly across a
    memory of `memCells` cells. The RETURNED ORDER is the pointer-chase order —
    i.e. index 0 is the head, index 1 is head.next, and so on — so consecutive
    entries are deliberately far apart in memory (that is exactly what a linked
    list does after a lifetime of unrelated allocations).

    Determinism: a Mulberry32 PRNG (identical to cache.ts's `randomPattern`), so
    the sim and the tests always agree. We sample DISTINCT addresses (a node
    can't share a cell with another node) by shuffling the cell indices and
    taking the first n — a partial Fisher–Yates. */
export function listAddresses(n: number, memCells: number, seed: number): number[] {
  const count = Math.min(n, memCells);
  const pool = Array.from({ length: memCells }, (_, i) => i);
  let s = seed >>> 0;
  const next = (): number => {
    // Mulberry32 — same generator cache.ts uses, so behaviour is shared.
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Fisher–Yates, but we only need the first `count` slots filled.
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(next() * (memCells - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count);
}

/** Run a list of addresses through the ch.8 cache and score the traversal.
    A cache LINE pulls in neighbours (that is what rewards the contiguous array
    and punishes the scattered list), so line size lives in `cacheParams`. */
export function traverse(addresses: number[], cacheParams: CacheParams): TraverseResult {
  const run = runCache(addresses, cacheParams);
  const steps: TraverseStep[] = run.results.map((r) => ({ addr: r.addr, hit: r.hit }));
  const cost = steps.reduce((acc, st) => acc + (st.hit ? 1 : MISS_PENALTY), 0);
  return {
    steps,
    hits: run.hits,
    misses: run.misses,
    hitRate: run.hitRate,
    cost,
  };
}

export type CompareParams = { memCells: number; numLines: number; lineSize: number };

export type CompareResult = {
  n: number;
  array: TraverseResult;
  list: TraverseResult;
  arrayAddrs: number[];
  listAddrs: number[];
};

/** Convenience for the sim: build both layouts for the same element count and
    run both through the same cache. The array wins on every metric — high hit
    rate, low cost — while the list mostly misses and pays several times more,
    despite touching the identical number of elements. That gap is the widget's
    entire message. Seed 1337 mirrors cache.ts's "random" pattern for continuity.
    `base` puts the array well clear of the scattered nodes so the two layouts
    read as visually distinct regions of the RAM grid. */
export function compareArrayVsList(
  n: number,
  { memCells, numLines, lineSize }: CompareParams,
): CompareResult {
  const params: CacheParams = { memCells, numLines, lineSize };
  const arrayAddrs = arrayAddresses(n, 0);
  const listAddrs = listAddresses(n, memCells, 1337);
  return {
    n,
    array: traverse(arrayAddrs, params),
    list: traverse(listAddrs, params),
    arrayAddrs,
    listAddrs,
  };
}
