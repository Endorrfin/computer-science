// Paging engine — ch.23. Two pure sub-engines that both micros skin over:
//   • address translation: virtual address → bit-split → (multi-level) page-table
//     walk → TLB hit/miss → physical address, as an explicit list of steps.
//     Powers [micro] address-translate.
//   • page replacement: FIFO / LRU / Optimal / Clock over a reference string, with
//     per-reference snapshots, fault counts, a fault-vs-frames curve (thrashing),
//     and the canonical Bélády's-anomaly string. Powers [micro] page-fault-lab.
//
// scripts/test-ch23.ts locks both against known-answer instances (Silberschatz
// fault counts; Bélády 3-vs-4-frame anomaly; textbook translation arithmetic).
//
// Address math uses division/modulo (not 32-bit bitwise) so 32-bit addresses
// stay exact and unsigned. Erasable-syntax-only (Node --experimental-strip-types).

// ===========================================================================
// (A) Address translation
// ===========================================================================

export type PagingConfig = {
  virtualBits: number; // width of a virtual address
  offsetBits: number; // page size = 2^offsetBits bytes
  levels: number; // 1 or 2 page-table levels
};

/** Default toy: 32-bit virtual addresses, 4 KiB pages (12 offset bits) → 20-bit
 *  VPN, split 10+10 across two levels when levels === 2. */
export const DEFAULT_PAGING: PagingConfig = { virtualBits: 32, offsetBits: 12, levels: 2 };

export function pageSize(cfg: PagingConfig): number {
  return Math.pow(2, cfg.offsetBits);
}
export function vpnBits(cfg: PagingConfig): number {
  return cfg.virtualBits - cfg.offsetBits;
}
/** Bits consumed by each level, most-significant level first. Any remainder from
 *  an odd split lands on the top (level-0) index. */
export function levelBits(cfg: PagingConfig): number[] {
  const total = vpnBits(cfg);
  const per = Math.floor(total / cfg.levels);
  const bits = new Array(cfg.levels).fill(per);
  bits[0] += total - per * cfg.levels; // remainder to the top level
  return bits;
}

export type Decomp = { vpn: number; offset: number; indices: number[] };

export function decompose(va: number, cfg: PagingConfig): Decomp {
  const ps = pageSize(cfg);
  const offset = va % ps;
  const vpn = Math.floor(va / ps);
  const bits = levelBits(cfg);
  const indices: number[] = [];
  // carve the VPN into level indices, most-significant first
  let shiftBitsBelow = vpnBits(cfg);
  for (let i = 0; i < cfg.levels; i++) {
    shiftBitsBelow -= bits[i];
    const idx = Math.floor(vpn / Math.pow(2, shiftBitsBelow)) % Math.pow(2, bits[i]);
    indices.push(idx);
  }
  return { vpn, offset, indices };
}

export function toBits(value: number, width: number): string {
  const s = Math.max(0, Math.floor(value)).toString(2);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}
export function toHex(value: number, bits: number): string {
  const digits = Math.ceil(bits / 4);
  const s = Math.max(0, Math.floor(value)).toString(16).toUpperCase();
  return "0x" + (s.length >= digits ? s : "0".repeat(digits - s.length) + s);
}

/** A tiny LRU TLB: `entries` holds VPNs, most-recently-used LAST. */
export type TlbState = { entries: number[]; cap: number };
export function tlbInit(cap: number): TlbState {
  return { entries: [], cap: Math.max(1, cap) };
}

export type TranslateStep = { title: string; detail: string; tone: "vpn" | "tlb" | "walk" | "phys" | "fault" };
export type TranslateResult = {
  va: number;
  vpn: number;
  offset: number;
  indices: number[];
  tlbHit: boolean;
  pageFault: boolean;
  frame: number | null;
  physical: number | null;
  steps: TranslateStep[];
};

/**
 * Translate one virtual address. `table` maps VPN → physical frame number for
 * pages that are present. Returns the result plus the NEXT TLB state (immutable
 * update): a hit re-orders to MRU; a present-but-TLB-miss inserts (evicting LRU);
 * a page fault does not populate the TLB (nothing to cache yet).
 */
export function translate(
  va: number,
  cfg: PagingConfig,
  table: ReadonlyMap<number, number>,
  tlb: TlbState,
): { result: TranslateResult; tlb: TlbState } {
  const { vpn, offset, indices } = decompose(va, cfg);
  const ps = pageSize(cfg);
  const steps: TranslateStep[] = [];
  const lbits = levelBits(cfg);

  steps.push({
    tone: "vpn",
    title: "Split the virtual address",
    detail:
      `VA ${toHex(va, cfg.virtualBits)} = VPN ${vpn} · offset ${offset}. ` +
      `Top ${vpnBits(cfg)} bits pick the page; low ${cfg.offsetBits} bits are the byte offset (page = ${ps} B).`,
  });

  const inTlb = tlb.entries.includes(vpn);
  if (inTlb) {
    const frame = table.get(vpn)!;
    const physical = frame * ps + offset;
    steps.push({
      tone: "tlb",
      title: "TLB hit",
      detail: `VPN ${vpn} is cached in the TLB → frame ${frame}. Skip the page-table walk entirely.`,
    });
    steps.push({
      tone: "phys",
      title: "Form the physical address",
      detail: `frame ${frame} × ${ps} + offset ${offset} = ${toHex(physical, cfg.virtualBits)}.`,
    });
    const entries = [...tlb.entries.filter((v) => v !== vpn), vpn]; // move to MRU
    return {
      result: { va, vpn, offset, indices, tlbHit: true, pageFault: false, frame, physical, steps },
      tlb: { ...tlb, entries },
    };
  }

  steps.push({
    tone: "tlb",
    title: "TLB miss",
    detail: `VPN ${vpn} is not in the TLB — walk the ${cfg.levels === 1 ? "page table" : `${cfg.levels}-level page table`}.`,
  });
  for (let i = 0; i < cfg.levels; i++) {
    steps.push({
      tone: "walk",
      title: cfg.levels === 1 ? "Index the page table" : `Level ${i + 1}: index this table`,
      detail: `index ${indices[i]} (${lbits[i]} bits)` + (i < cfg.levels - 1 ? " → next-level table base" : " → page-table entry"),
    });
  }

  const present = table.has(vpn);
  if (!present) {
    steps.push({
      tone: "fault",
      title: "Page fault",
      detail: `The entry for VPN ${vpn} is not present (valid bit = 0). The CPU traps to the OS, which loads the page, fills the entry, and restarts this instruction.`,
    });
    return {
      result: { va, vpn, offset, indices, tlbHit: false, pageFault: true, frame: null, physical: null, steps },
      tlb,
    };
  }

  const frame = table.get(vpn)!;
  const physical = frame * ps + offset;
  steps.push({
    tone: "walk",
    title: "Read the frame number",
    detail: `Entry is present → frame ${frame}. Cache VPN ${vpn} → frame ${frame} in the TLB for next time.`,
  });
  steps.push({
    tone: "phys",
    title: "Form the physical address",
    detail: `frame ${frame} × ${ps} + offset ${offset} = ${toHex(physical, cfg.virtualBits)}.`,
  });
  const entries = [...tlb.entries, vpn];
  while (entries.length > tlb.cap) entries.shift(); // evict LRU
  return {
    result: { va, vpn, offset, indices, tlbHit: false, pageFault: false, frame, physical, steps },
    tlb: { ...tlb, entries },
  };
}

/** A small present-page table for the demo (VPN → frame). */
export function demoTable(): Map<number, number> {
  return new Map([
    [0, 5],
    [1, 2],
    [2, 7],
    [4, 3],
    [7, 1],
  ]);
}

// ===========================================================================
// (B) Page replacement
// ===========================================================================

export const POLICIES = ["fifo", "lru", "optimal", "clock"] as const;
export type Policy = (typeof POLICIES)[number];
export const POLICY_LABEL: Record<Policy, string> = {
  fifo: "FIFO — evict the oldest-loaded page",
  lru: "LRU — evict the least-recently-used page",
  optimal: "Optimal (MIN) — evict the page used farthest in the future",
  clock: "Clock — second-chance approximation of LRU",
};

export type RefStep = {
  ref: number;
  hit: boolean;
  evicted: number | null;
  frames: (number | null)[]; // snapshot AFTER processing this reference
  hand: number | null; // clock hand position after (clock only)
  refbits: boolean[] | null; // clock reference bits after (clock only)
};

export type ReplacementResult = {
  policy: Policy;
  frames: number;
  steps: RefStep[];
  faults: number;
  hits: number;
};

/** Simulate a reference string under a policy with `frames` physical frames. */
export function simulateReplacement(refs: number[], frames: number, policy: Policy): ReplacementResult {
  const n = Math.max(1, Math.floor(frames));
  if (policy === "clock") return simulateClock(refs, n);

  const slots: (number | null)[] = new Array(n).fill(null);
  const loadOrder: number[] = []; // frame indices, oldest first (FIFO)
  const lastUsed: number[] = new Array(n).fill(-1); // slot → tick (LRU)
  const steps: RefStep[] = [];
  let faults = 0;
  let hits = 0;

  for (let t = 0; t < refs.length; t++) {
    const ref = refs[t];
    const hitIdx = slots.indexOf(ref);
    let evicted: number | null = null;

    if (hitIdx >= 0) {
      hits++;
      lastUsed[hitIdx] = t;
    } else {
      faults++;
      let slot = slots.indexOf(null);
      if (slot < 0) slot = victim(policy, slots, loadOrder, lastUsed, refs, t);
      evicted = slots[slot];
      if (evicted !== null) removeFirst(loadOrder, slot);
      slots[slot] = ref;
      loadOrder.push(slot);
      lastUsed[slot] = t;
    }
    steps.push({ ref, hit: hitIdx >= 0, evicted, frames: [...slots], hand: null, refbits: null });
  }
  return { policy, frames: n, steps, faults, hits };
}

function victim(
  policy: Policy,
  slots: (number | null)[],
  loadOrder: number[],
  lastUsed: number[],
  refs: number[],
  t: number,
): number {
  if (policy === "fifo") return loadOrder[0];
  if (policy === "lru") {
    let best = 0;
    for (let i = 1; i < slots.length; i++) if (lastUsed[i] < lastUsed[best]) best = i;
    return best;
  }
  // optimal: evict the slot whose page is used farthest in the future (or never).
  let best = 0;
  let bestNext = -1;
  for (let i = 0; i < slots.length; i++) {
    const next = nextUse(refs, slots[i]!, t + 1);
    if (next > bestNext) {
      bestNext = next;
      best = i;
    }
  }
  return best;
}

/** Index of the next use of `page` at or after `from`, or +∞ if never again. */
function nextUse(refs: number[], page: number, from: number): number {
  for (let i = from; i < refs.length; i++) if (refs[i] === page) return i;
  return Number.POSITIVE_INFINITY;
}

/** Clock / second-chance: a circular buffer of reference bits. On a fault with no
 *  free frame, advance the hand, clearing set reference bits, until one is clear;
 *  evict there. A hit sets the page's reference bit. */
function simulateClock(refs: number[], frames: number): ReplacementResult {
  const slots: (number | null)[] = new Array(frames).fill(null);
  const refbit: boolean[] = new Array(frames).fill(false);
  const steps: RefStep[] = [];
  let hand = 0;
  let faults = 0;
  let hits = 0;

  for (let t = 0; t < refs.length; t++) {
    const ref = refs[t];
    const hitIdx = slots.indexOf(ref);
    let evicted: number | null = null;

    if (hitIdx >= 0) {
      hits++;
      refbit[hitIdx] = true; // second chance granted
    } else {
      faults++;
      const free = slots.indexOf(null);
      if (free >= 0) {
        slots[free] = ref;
        refbit[free] = true;
        hand = (free + 1) % frames;
      } else {
        while (refbit[hand]) {
          refbit[hand] = false; // consume the second chance
          hand = (hand + 1) % frames;
        }
        evicted = slots[hand];
        slots[hand] = ref;
        refbit[hand] = true;
        hand = (hand + 1) % frames;
      }
    }
    steps.push({ ref, hit: hitIdx >= 0, evicted, frames: [...slots], hand, refbits: [...refbit] });
  }
  return { policy: "clock", frames, steps, faults, hits };
}

function removeFirst(arr: number[], v: number): void {
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1);
}

// ---- analysis helpers (thrashing / anomaly) --------------------------------

/** Fault count for each frame count 1..maxFrames — the fault-vs-frames curve. */
export function faultCurve(refs: number[], policy: Policy, maxFrames: number): number[] {
  const out: number[] = [];
  for (let f = 1; f <= maxFrames; f++) out.push(simulateReplacement(refs, f, policy).faults);
  return out;
}

/** Distinct pages referenced in the window (t-window, t] — Denning's working set. */
export function workingSet(refs: number[], t: number, window: number): number[] {
  const set = new Set<number>();
  for (let i = Math.max(0, t - window + 1); i <= t && i < refs.length; i++) set.add(refs[i]);
  return [...set].sort((a, b) => a - b);
}

/** The classic Bélády's-anomaly reference string: under FIFO, 3 frames → 9
 *  faults but 4 frames → 10 faults (more memory, MORE faults). */
export const BELADY_STRING = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];

/** Silberschatz's canonical comparison string (3 frames: FIFO 15, LRU 12, OPT 9). */
export const SILBERSCHATZ_STRING = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1];

/** A locality-bearing default for the lab (a small working set, then a shift). */
export function demoRefString(): number[] {
  return [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5, 6, 7, 6, 7, 6, 7];
}
