// Pure engine — exact big-integer combinatorics for ch.0b (Math toolkit).
// Ordered vs unordered selection, with and without repetition, plus Pascal's
// triangle. BigInt throughout so the numbers stay EXACT past 20! (where doubles
// silently lose precision). Erasable-syntax only (no enums/namespaces): the
// Node qa gate + scripts/test-ch0b.ts import this via --experimental-strip-types.

function requireCount(n: number, label: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${label} must be a non-negative integer (got ${n})`);
  }
}

/** n! — the number of orderings of n distinct items. 0! = 1. */
export function factorial(n: number): bigint {
  requireCount(n, "factorial: n");
  let acc = 1n;
  const big = BigInt(n);
  for (let k = 2n; k <= big; k++) acc *= k;
  return acc;
}

/** P(n, r) = n! / (n−r)! — ORDERED selections of r from n (arrangements).
    Built multiplicatively so no giant intermediate factorial is needed. */
export function permutations(n: number, r: number): bigint {
  requireCount(n, "permutations: n");
  requireCount(r, "permutations: r");
  if (r > n) return 0n;
  let acc = 1n;
  for (let i = 0; i < r; i++) acc *= BigInt(n - i);
  return acc;
}

/** C(n, r) = n! / (r!·(n−r)!) — UNORDERED selections of r from n (subsets).
    Exact multiplicative form using the symmetry C(n,r)=C(n,n−r) to keep the
    running numerator small; every division is exact by construction. */
export function combinations(n: number, r: number): bigint {
  requireCount(n, "combinations: n");
  requireCount(r, "combinations: r");
  if (r > n) return 0n;
  const k = Math.min(r, n - r);
  let num = 1n;
  let den = 1n;
  for (let i = 0; i < k; i++) {
    num *= BigInt(n - i);
    den *= BigInt(i + 1);
  }
  return num / den;
}

/** Multisets — "stars and bars": ways to choose k items from n TYPES with
    repetition allowed, order ignored = C(n+k−1, k). */
export function multisets(n: number, k: number): bigint {
  requireCount(n, "multisets: n");
  requireCount(k, "multisets: k");
  if (n === 0) return k === 0 ? 1n : 0n; // no types → only the empty selection
  return combinations(n + k - 1, k);
}

/** Selections of r from n WITH repetition where order MATTERS = n^r
    (e.g. how many length-r strings over an n-symbol alphabet). */
export function tuples(n: number, r: number): bigint {
  requireCount(n, "tuples: n");
  requireCount(r, "tuples: r");
  return BigInt(n) ** BigInt(r);
}

/** Row n of Pascal's triangle: [C(n,0), C(n,1), …, C(n,n)].
    Each entry from the previous via C(n,k+1) = C(n,k)·(n−k)/(k+1) — exact. */
export function pascalRow(n: number): bigint[] {
  requireCount(n, "pascalRow: n");
  const row: bigint[] = [1n];
  for (let k = 0; k < n; k++) {
    row.push((row[k] * BigInt(n - k)) / BigInt(k + 1));
  }
  return row;
}

/** The four fundamental counting cells, for the sim's "counting rules" table. */
export type CountKind = "permutation" | "combination" | "tuple" | "multiset";

export function count(kind: CountKind, n: number, r: number): bigint {
  if (kind === "permutation") return permutations(n, r);
  if (kind === "combination") return combinations(n, r);
  if (kind === "tuple") return tuples(n, r);
  return multisets(n, r);
}

/** Compact, safe display for arbitrarily large BigInts: exact up to a digit
    budget, then a grouped-digit count + scientific hint. */
export function formatBig(v: bigint, maxDigits = 30): string {
  const s = v.toString();
  if (s.length <= maxDigits) return s;
  const digits = s.length;
  const lead = s.slice(0, 4);
  return `${lead[0]}.${lead.slice(1)}…×10^${digits - 1} (${digits} digits)`;
}
