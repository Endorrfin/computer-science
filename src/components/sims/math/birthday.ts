// Pure engine — the birthday paradox for ch.0b (Math toolkit): the exact
// probability that two people in a group of n share a birthday, the group size
// needed to cross a probability threshold, and a deterministic Monte-Carlo
// estimate that converges to the exact curve. The lesson: collisions are far
// more likely than intuition says — the engine behind hashing (ch.14) and the
// birthday attack on hashes (ch.31). Erasable-syntax only; imported by
// scripts/test-ch0b.ts via --experimental-strip-types.
import { makeRng } from "../ml/rng.ts";

/** Exact P(at least one shared birthday) among n people over `days` equally
    likely, independent birthdays. Uses the complement:
      P(share) = 1 − ∏_{i=0}^{n−1} (days − i) / days.
    n ≤ 1 → 0; n > days → 1 (pigeonhole: a collision is unavoidable). */
export function birthdayProbExact(n: number, days = 365): number {
  if (n <= 1) return 0;
  if (n > days) return 1;
  let noShare = 1;
  for (let i = 0; i < n; i++) noShare *= (days - i) / days;
  return 1 - noShare;
}

/** The expected number of colliding PAIRS, ≈ C(n,2)/days — a good back-of-the-
    envelope for why the crossover is so small (n≈23 makes ~253 pairs). */
export function expectedCollidingPairs(n: number, days = 365): number {
  if (n < 2) return 0;
  return (n * (n - 1)) / 2 / days;
}

/** Smallest group size whose exact collision probability is ≥ p (0 < p < 1).
    Returns 1 for p ≤ 0; caps at days+1 (where probability is exactly 1). */
export function smallestGroupFor(p: number, days = 365): number {
  if (p <= 0) return 1;
  let n = 1;
  const cap = days + 1;
  while (n < cap && birthdayProbExact(n, days) < p) n++;
  return n;
}

/** Deterministic Monte-Carlo estimate: fraction of `trials` random groups of n
    that contain a shared birthday. Draws n birthdays per trial from a seeded
    mulberry32 RNG (reused from the ML sims), so the same seed always yields the
    same estimate — the Node test can assert it tracks the exact curve. */
export function birthdayMonteCarlo(n: number, trials: number, seed: number, days = 365): number {
  if (n <= 1 || trials <= 0) return 0;
  const rng = makeRng(seed);
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    const seen = new Uint8Array(days);
    let collision = false;
    for (let i = 0; i < n; i++) {
      const b = rng.int(days);
      if (seen[b]) {
        collision = true;
        break;
      }
      seen[b] = 1;
    }
    if (collision) hits++;
  }
  return hits / trials;
}

/** The exact curve as points (n, P) for n = 0…maxN — feeds the sim's plot. */
export function exactCurve(maxN: number, days = 365): { n: number; p: number }[] {
  const pts: { n: number; p: number }[] = [];
  for (let n = 0; n <= maxN; n++) pts.push({ n, p: birthdayProbExact(n, days) });
  return pts;
}
