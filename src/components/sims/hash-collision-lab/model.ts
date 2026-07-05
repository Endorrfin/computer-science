// Engine — a hash table you can watch collide. Pure & erasable-syntax
// (Node-testable). Drives hash-collision-lab (ch.14). The lesson is two-sided:
//
//   1. The HASH FUNCTION decides how evenly keys spread. A low-entropy hash
//      (badHash — it looks at nothing but the first character) sends every key
//      that starts with the same letter to the same bucket, so they pile up.
//      A good hash (goodHash — FNV-1a) mixes every byte of the key, so even keys
//      that look alike scatter across the table.
//
//   2. The COLLISION STRATEGY decides what happens once two keys DO want the
//      same bucket:
//        • chaining — the bucket holds a little list; colliders append to it.
//          The cost signal is the longest chain (maxChain).
//        • linear probing — one flat slot array; on a clash you walk forward
//          i, i+1, i+2 … to the next free slot. The cost signal is the longest
//          run of occupied slots (maxCluster) — "primary clustering", where
//          collisions breed more collisions.
//
// A hash table also has to GROW: once it fills past a load-factor threshold,
// lookups slow down, so we double the array and reinsert everything ("rehash").
//
// Determinism: no randomness anywhere. The same keys in the same order always
// produce the same trace, so the sim and the tests agree exactly.

export type HashName = "bad" | "good";
export type Strategy = "chaining" | "linear";

// ---- hash functions over string keys --------------------------------------

/** DELIBERATELY BAD: uses only the first character's code (0 for the empty
    string). Every key sharing a first letter collides on the same home bucket —
    the textbook way to manufacture clustering and show why hash quality matters. */
export function badHash(key: string): number {
  return key.length === 0 ? 0 : key.charCodeAt(0);
}

/** FNV-1a, 32-bit — a solid, fast, well-mixed multiplicative hash. Every byte
    of the key feeds the avalanche, so similar keys land far apart. Returned as
    a non-negative integer (>>> 0). */
export function goodHash(key: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    // h *= 16777619, kept in 32-bit range via Math.imul
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashByName(name: HashName): (key: string) => number {
  return name === "bad" ? badHash : goodHash;
}

/** The bucket a key wants: hash(key) mod tableSize. Always in [0, size). */
export function homeIndex(key: string, size: number, name: HashName): number {
  return hashByName(name)(key) % size;
}

// ---- per-key trace ----------------------------------------------------------

/** One insertion's story. `probes` is how many slots we had to look at before
    landing (1 = home was free; for chaining it is 1 + the length of the chain
    we walked past). `slot` is where the key finally lives (the home bucket for
    chaining; the resolved slot after probing for linear). `rehashed` marks the
    insertion that first pushed the load factor over the line and triggered a
    doubling BEFORE this key went in. */
export type InsertStep = {
  key: string;
  home: number; // hash(key) % size, in the table size CURRENT for this key
  slot: number; // where it ended up
  probes: number; // slots inspected (linear) / chain hops + 1 (chaining)
  probeSeq: number[]; // the exact indices visited, in order (great for arrows)
  chainLen: number; // resulting length of this key's chain (chaining only; 1 for linear)
  collided: boolean; // was the home bucket already occupied?
  rehashed: boolean; // did a rehash fire just before inserting this key?
  sizeAfter: number; // table size after this insertion (post any rehash)
};

export type RehashEvent = {
  atKeyIndex: number; // which insertion (0-based) triggered it
  oldSize: number;
  newSize: number;
  loadBefore: number; // load factor that tripped the threshold
};

export type HashRun = {
  steps: InsertStep[];
  rehashes: RehashEvent[];
  finalSize: number;
  count: number; // keys stored
  loadFactor: number; // count / finalSize
  maxChain: number; // longest chain (chaining) — clustering signal
  maxCluster: number; // longest run of occupied slots (linear) — clustering signal
  totalProbes: number;
  avgProbes: number;
  strategy: Strategy;
  hash: HashName;
  /** Final table contents for rendering: for chaining, buckets[i] is the list
      of keys in bucket i; for linear, slots[i] is the single key (or null). */
  buckets: string[][]; // chaining view (empty arrays for linear)
  slots: (string | null)[]; // linear view (all null for chaining)
};

export type InsertOptions = {
  size: number; // initial table size
  hash: HashName;
  strategy: Strategy;
  maxLoad?: number; // rehash threshold (defaults: 0.75 chaining, 0.7 linear)
};

/** Longest run of consecutive occupied slots in a linear-probing table, treated
    CIRCULARLY (a cluster can wrap past the end). This is the "primary
    clustering" number: the bigger it is, the longer future probes run. */
function longestCluster(occupied: boolean[]): number {
  const n = occupied.length;
  if (occupied.every((x) => x)) return n; // fully packed: one big cluster
  if (occupied.every((x) => !x)) return 0;
  // find a gap to start from so wrap-around clusters are counted once
  let start = 0;
  while (occupied[start]) start++;
  let best = 0;
  let run = 0;
  for (let k = 1; k <= n; k++) {
    const idx = (start + k) % n;
    if (occupied[idx]) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

/** Insert every key in order, recording a full trace. Rehash (double + reinsert)
    fires whenever the load factor would exceed `maxLoad`. Deterministic. */
export function insertAll(keys: string[], opts: InsertOptions): HashRun {
  const { hash, strategy } = opts;
  const maxLoad = opts.maxLoad ?? (strategy === "chaining" ? 0.75 : 0.7);
  const h = hashByName(hash);

  let size = Math.max(1, opts.size);
  // Two parallel representations; only one is "live" per strategy, but we keep
  // both shaped so the return type is uniform.
  let chains: string[][] = Array.from({ length: size }, () => []);
  let slots: (string | null)[] = new Array<string | null>(size).fill(null);
  let count = 0;

  const steps: InsertStep[] = [];
  const rehashes: RehashEvent[] = [];

  // Place one key into the CURRENT table; returns the resolved slot, the probe
  // path (indices visited), and the probe COUNT. For chaining the count is the
  // number of chain nodes we walk to reach the tail (existing length + 1) — the
  // real lookup cost of a chained bucket — while probeSeq stays [home] since
  // every chained key shares the home index. Used both for fresh inserts and
  // reinsertion during a rehash; does not itself trigger rehashing.
  const place = (
    key: string,
  ): { home: number; slot: number; probeSeq: number[]; probes: number } => {
    const home = h(key) % size;
    if (strategy === "chaining") {
      const probes = chains[home].length + 1; // walk the chain, then append
      chains[home].push(key);
      return { home, slot: home, probeSeq: [home], probes };
    }
    // linear probing: walk forward until an empty slot (guaranteed: we always
    // rehash before the table can fill, so a hole exists)
    const probeSeq: number[] = [];
    for (let step = 0; step < size; step++) {
      const idx = (home + step) % size;
      probeSeq.push(idx);
      if (slots[idx] === null) {
        slots[idx] = key;
        return { home, slot: idx, probeSeq, probes: probeSeq.length };
      }
    }
    // unreachable given the load invariant, but keep the types honest
    return { home, slot: home, probeSeq, probes: probeSeq.length };
  };

  const grow = (): { oldSize: number; newSize: number } => {
    const oldSize = size;
    const survivors: string[] =
      strategy === "chaining"
        ? chains.flat()
        : (slots.filter((x) => x !== null) as string[]);
    size = oldSize * 2;
    chains = Array.from({ length: size }, () => []);
    slots = new Array<string | null>(size).fill(null);
    for (const k of survivors) place(k); // reinsert into the bigger table
    return { oldSize, newSize: size };
  };

  keys.forEach((key, i) => {
    // Would adding this key push us over the threshold? If so, grow first, so
    // the key lands in the roomier table (and probe sequences reflect that).
    let rehashed = false;
    const loadIfAdded = (count + 1) / size;
    if (loadIfAdded > maxLoad) {
      const loadBefore = count / size;
      const { oldSize, newSize } = grow();
      rehashes.push({ atKeyIndex: i, oldSize, newSize, loadBefore });
      rehashed = true;
    }

    const homeBefore = h(key) % size;
    const collided =
      strategy === "chaining" ? chains[homeBefore].length > 0 : slots[homeBefore] !== null;

    const { home, slot, probeSeq, probes } = place(key);
    count++;

    const chainLen = strategy === "chaining" ? chains[home].length : 1;
    steps.push({
      key,
      home,
      slot,
      probes,
      probeSeq,
      chainLen,
      collided,
      rehashed,
      sizeAfter: size,
    });
  });

  const totalProbes = steps.reduce((a, s) => a + s.probes, 0);
  const maxChain =
    strategy === "chaining" ? chains.reduce((m, c) => Math.max(m, c.length), 0) : 1;
  const occupied = slots.map((x) => x !== null);
  const maxCluster = strategy === "linear" ? longestCluster(occupied) : 0;

  return {
    steps,
    rehashes,
    finalSize: size,
    count,
    loadFactor: count / size,
    maxChain,
    maxCluster,
    totalProbes,
    avgProbes: steps.length === 0 ? 0 : totalProbes / steps.length,
    strategy,
    hash,
    buckets: strategy === "chaining" ? chains.map((c) => c.slice()) : chains.map(() => []),
    slots: strategy === "linear" ? slots.slice() : slots.map(() => null),
  };
}

// ---- demo key sets ----------------------------------------------------------

/** A batch of keys that all START WITH THE SAME LETTER — so badHash sends every
    one to the same home bucket (maximal clustering), while goodHash still
    spreads them. This is the pair the sim contrasts. */
export const CLUSTERING_KEYS: readonly string[] = [
  "apple",
  "avocado",
  "apricot",
  "almond",
  "arugula",
  "artichoke",
  "asparagus",
  "acai",
  "anise",
  "acorn",
] as const;
