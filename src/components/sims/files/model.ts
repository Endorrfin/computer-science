// Engine for ch.24 — Files & storage. Two deterministic models:
//   1. INODE — resolve a byte offset through a classic Unix inode (12 direct +
//      single + double + triple indirect) to a logical block and count the
//      disk reads the walk costs; compute the maximum file size.
//   2. ALLOCATION — contiguous / linked / indexed block allocation on a small
//      device, with first-fit placement, an external-fragmentation measure, and
//      the random-access read cost each method pays.
// Erasable-syntax only (Node runs this via --experimental-strip-types).

// ===========================================================================
// (1) INODE — offset → block, and the indirection it costs
// ===========================================================================

export type InodeConfig = {
  blockSize: number; // bytes per block/frame, e.g. 4096
  pointerSize: number; // bytes per block pointer, e.g. 4  → ppb = blockSize/pointerSize
  nDirect: number; // number of direct pointers in the inode, classically 12
};

export const DEFAULT_INODE: InodeConfig = { blockSize: 4096, pointerSize: 4, nDirect: 12 };

export type Region = "direct" | "single" | "double" | "triple" | "out-of-range";

export type Resolution = {
  logicalBlock: number;
  offsetInBlock: number;
  region: Region;
  reads: number; // disk reads to reach the DATA block (indirection levels + 1)
  path: string[]; // human-readable access path
};

/** Pointers that fit in one block — the fan-out of every indirect level. */
export function pointersPerBlock(cfg: InodeConfig): number {
  return Math.floor(cfg.blockSize / cfg.pointerSize);
}

/** Split a byte offset into its logical block index and the offset within it. */
export function offsetToBlock(cfg: InodeConfig, byteOffset: number): { logicalBlock: number; offsetInBlock: number } {
  return {
    logicalBlock: Math.floor(byteOffset / cfg.blockSize),
    offsetInBlock: byteOffset % cfg.blockSize,
  };
}

/** How many data blocks each region can address. */
export function regionCapacities(cfg: InodeConfig): { direct: number; single: number; double: number; triple: number } {
  const ppb = pointersPerBlock(cfg);
  return {
    direct: cfg.nDirect,
    single: ppb,
    double: ppb * ppb,
    triple: ppb * ppb * ppb,
  };
}

/** Largest file the inode can address, in bytes. */
export function maxFileSize(cfg: InodeConfig): number {
  const c = regionCapacities(cfg);
  return (c.direct + c.single + c.double + c.triple) * cfg.blockSize;
}

/**
 * Resolve a byte offset to its data block, naming the region and counting the
 * disk reads the walk costs (each indirect block is one extra read before the
 * data block itself).
 */
export function resolve(cfg: InodeConfig, byteOffset: number): Resolution {
  const { logicalBlock, offsetInBlock } = offsetToBlock(cfg, byteOffset);
  const c = regionCapacities(cfg);
  const lb = logicalBlock;

  if (lb < 0) {
    return { logicalBlock: lb, offsetInBlock, region: "out-of-range", reads: 0, path: ["invalid offset"] };
  }
  if (lb < c.direct) {
    return {
      logicalBlock: lb,
      offsetInBlock,
      region: "direct",
      reads: 1,
      path: [`inode.direct[${lb}]`, "→ data block"],
    };
  }
  let rem = lb - c.direct;
  if (rem < c.single) {
    return {
      logicalBlock: lb,
      offsetInBlock,
      region: "single",
      reads: 2,
      path: ["inode.singleIndirect", `→ indirect[${rem}]`, "→ data block"],
    };
  }
  rem -= c.single;
  if (rem < c.double) {
    const ppb = pointersPerBlock(cfg);
    const i1 = Math.floor(rem / ppb);
    const i2 = rem % ppb;
    return {
      logicalBlock: lb,
      offsetInBlock,
      region: "double",
      reads: 3,
      path: ["inode.doubleIndirect", `→ L1[${i1}]`, `→ L2[${i2}]`, "→ data block"],
    };
  }
  rem -= c.double;
  if (rem < c.triple) {
    const ppb = pointersPerBlock(cfg);
    const i1 = Math.floor(rem / (ppb * ppb));
    const i2 = Math.floor((rem % (ppb * ppb)) / ppb);
    const i3 = rem % ppb;
    return {
      logicalBlock: lb,
      offsetInBlock,
      region: "triple",
      reads: 4,
      path: ["inode.tripleIndirect", `→ L1[${i1}]`, `→ L2[${i2}]`, `→ L3[${i3}]`, "→ data block"],
    };
  }
  return { logicalBlock: lb, offsetInBlock, region: "out-of-range", reads: 0, path: ["beyond max file size"] };
}

// ===========================================================================
// (2) ALLOCATION — contiguous / linked / indexed, and fragmentation
// ===========================================================================

export type AllocMethod = "contiguous" | "linked" | "indexed";

export const ALLOC_METHODS: { id: AllocMethod; label: string; blurb: string }[] = [
  { id: "contiguous", label: "Contiguous", blurb: "each file is one run of adjacent blocks — fast sequential & random reads, but needs a big-enough hole and suffers external fragmentation." },
  { id: "linked", label: "Linked", blurb: "each block points to the next — no external fragmentation and files grow freely, but random access must walk the chain." },
  { id: "indexed", label: "Indexed", blurb: "one index block lists every data block — random access is cheap, at the cost of an extra block per file (the inode idea)." },
];

/**
 * First-fit for CONTIGUOUS allocation: the start index of the first free run of
 * `length` blocks, or -1 if no hole is large enough.
 */
export function firstFit(free: boolean[], length: number): number {
  if (length <= 0) return -1;
  let run = 0;
  for (let i = 0; i < free.length; i++) {
    if (free[i]) {
      run += 1;
      if (run === length) return i - length + 1;
    } else {
      run = 0;
    }
  }
  return -1;
}

/** Total free blocks. */
export function freeCount(free: boolean[]): number {
  let c = 0;
  for (const b of free) if (b) c += 1;
  return c;
}

/** The longest run of contiguous free blocks. */
export function largestFreeRun(free: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const b of free) {
    if (b) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/** Number of separate free holes (maximal runs of free blocks). */
export function freeHoles(free: boolean[]): number {
  let holes = 0;
  let inHole = false;
  for (const b of free) {
    if (b && !inHole) {
      holes += 1;
      inHole = true;
    } else if (!b) {
      inHole = false;
    }
  }
  return holes;
}

/**
 * External fragmentation in [0,1]: the fraction of free space that is NOT in
 * the single largest hole. 0 means all free space is usable as one contiguous
 * run; near 1 means free space is shattered into little useless gaps.
 */
export function externalFragmentation(free: boolean[]): number {
  const total = freeCount(free);
  if (total === 0) return 0;
  return 1 - largestFreeRun(free) / total;
}

/** Blocks a file of `dataBlocks` data blocks actually consumes on disk. Indexed
    allocation spends one extra block on its index. */
export function blocksConsumed(method: AllocMethod, dataBlocks: number): number {
  if (dataBlocks <= 0) return 0;
  return method === "indexed" ? dataBlocks + 1 : dataBlocks;
}

/**
 * Block reads to reach the i-th data block of a file (0-based):
 *   contiguous — 1 (compute start + i, one read)
 *   indexed    — 2 (read the index block, then the data block)
 *   linked     — i + 1 (walk from the head through i `next` pointers)
 */
export function randomReadCost(method: AllocMethod, i: number): number {
  if (i < 0) return 0;
  if (method === "contiguous") return 1;
  if (method === "indexed") return 2;
  return i + 1; // linked
}
