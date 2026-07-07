// Engine — greedy-fails (ch.18 micro). Making change is the cleanest place to see
// greedy win AND lose. GREEDY takes the largest coin ≤ what's left, repeatedly —
// dead simple, and provably optimal on "canonical" systems like real currencies
// (1,5,10,25). Change one coin and it breaks: with coins {1,3,4}, making 6 greedily
// gives 4+1+1 = 3 coins, but 3+3 = 2 is better. The only way to KNOW the minimum
// is dynamic programming over every amount. The sim lets you edit the coin set and
// hunts the smallest amount where greedy is beaten; this module is that search,
// pinned in test-ch18.ts.
//
// No React import — runs under Node for the tests.

export type ChangeResult = {
  amount: number;
  count: number; // number of coins used (Infinity if impossible)
  used: { coin: number; times: number }[];
  feasible: boolean;
};

/** Greedy: repeatedly take the largest coin that fits. Can fail to make an
    amount even when a solution exists (e.g. coins {3,4}, amount 5). */
export function greedyChange(coins: number[], amount: number): ChangeResult {
  const desc = [...new Set(coins)].sort((a, b) => b - a);
  const used: { coin: number; times: number }[] = [];
  let rem = amount;
  let count = 0;
  for (const c of desc) {
    if (rem <= 0) break;
    const t = Math.floor(rem / c);
    if (t > 0) {
      used.push({ coin: c, times: t });
      rem -= t * c;
      count += t;
    }
  }
  const feasible = rem === 0;
  return { amount, count: feasible ? count : Infinity, used, feasible };
}

/** Optimal: DP over 0..amount, min coins to make each. The source of truth. */
export function optimalChange(coins: number[], amount: number): ChangeResult {
  const uniq = [...new Set(coins)].filter((c) => c > 0);
  const INF = Infinity;
  const best = Array.from({ length: amount + 1 }, () => INF);
  const pick = Array.from({ length: amount + 1 }, () => -1);
  best[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of uniq) {
      if (c <= a && best[a - c] + 1 < best[a]) {
        best[a] = best[a - c] + 1;
        pick[a] = c;
      }
    }
  }
  const feasible = best[amount] !== INF;
  const tally = new Map<number, number>();
  if (feasible) {
    let a = amount;
    while (a > 0) {
      const c = pick[a];
      tally.set(c, (tally.get(c) ?? 0) + 1);
      a -= c;
    }
  }
  const used = [...tally.entries()].sort((x, y) => y[0] - x[0]).map(([coin, times]) => ({ coin, times }));
  return { amount, count: best[amount], used, feasible };
}

export type Counterexample = { amount: number; greedy: number; optimal: number } | null;

/** Smallest amount in 1..maxAmount where greedy is beaten (or fails while an
    optimal solution exists). null ⇒ greedy is optimal throughout that range
    (the system is canonical up to maxAmount). */
export function findCounterexample(coins: number[], maxAmount = 100): Counterexample {
  for (let a = 1; a <= maxAmount; a++) {
    const g = greedyChange(coins, a);
    const o = optimalChange(coins, a);
    if (!o.feasible) continue; // amount unreachable by any coins → not greedy's fault
    if (!g.feasible || g.count > o.count) return { amount: a, greedy: g.count, optimal: o.count };
  }
  return null;
}

export function isCanonical(coins: number[], maxAmount = 100): boolean {
  return findCounterexample(coins, maxAmount) === null;
}

/** Preset coin systems: real currencies are canonical; the toy ones aren't. */
export function presets(): { name: string; coins: number[]; canonical: boolean }[] {
  return [
    { name: "US ¢ (1,5,10,25)", coins: [1, 5, 10, 25], canonical: true },
    { name: "Euro-ish (1,2,5,10)", coins: [1, 2, 5, 10], canonical: true },
    { name: "Broken (1,3,4)", coins: [1, 3, 4], canonical: false },
    { name: "Broken (1,5,8,12)", coins: [1, 5, 8, 12], canonical: false },
  ];
}
