// Deterministic PRNG for the ML sims (ch.33). Seed-injectable so the app can
// run live-random (fresh seed each training run — initialization genuinely
// matters, which is itself a lesson) while the Node tests pin a seed and stay
// reproducible. mulberry32 + Box–Muller: tiny, fast, dependency-free.
// Erasable-syntax only (imported by the Node test harness via strip-types).

export type Rng = {
  /** Uniform in [0,1). */
  next: () => number;
  /** Standard normal (mean 0, sd 1). */
  normal: () => number;
  /** Integer in [0,n). */
  int: (n: number) => number;
};

/** mulberry32 — a well-distributed 32-bit PRNG from a single integer seed. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (): number => {
    // Box–Muller; guard against log(0).
    let u = 0;
    let v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const int = (n: number): number => Math.floor(next() * n);
  return { next, normal, int };
}

/** A fresh, hard-to-repeat seed for the app's live-random runs. */
export function liveSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/** In-place Fisher–Yates using an injected Rng (deterministic given the seed). */
export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
