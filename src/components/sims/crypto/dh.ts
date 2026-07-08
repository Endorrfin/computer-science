// Engine for ch.31 — the `dh-color-lab` HERO. Diffie–Hellman key exchange
// (Diffie & Hellman, "New Directions in Cryptography", IEEE Trans. Inf.
// Theory 22 (1976), 644–654 — the paper that opened public-key cryptography;
// Ralph Merkle's concurrent work is why it's often "Diffie–Hellman–Merkle").
//
// Two ways to feel the same idea:
//  • PAINT mode — mixing is easy, un-mixing is "hard". Both sides start from a
//    shared public base, each stirs in a private tint, swap the mixes, then
//    stir their OWN tint into the other's mix. Because mixing is commutative
//    and associative, both reach the identical final mix — while an eavesdropper
//    who saw only base, base+a and base+b cannot produce base+a+b.
//  • NUMBER mode — the real thing. Public prime p and generator g; secrets a,b.
//    A = gᵃ mod p, B = gᵇ mod p; shared = Bᵃ = Aᵇ = g^(ab) mod p. Recovering a
//    from A is the discrete-log problem — believed hard. The paint's "can't
//    un-mix" hand-wave becomes an actual computational assumption.
//
// Deterministic. Erasable-syntax only (runs under --experimental-strip-types).

// ----------------------------- number mode -----------------------------

/** Fast, overflow-safe modular exponentiation baseᵉ mod m (BigInt internally). */
export function modPow(base: number, exp: number, mod: number): number {
  if (mod <= 0 || !Number.isInteger(mod)) throw new Error("modPow: mod must be a positive integer");
  if (exp < 0 || !Number.isInteger(exp)) throw new Error("modPow: exp must be a non-negative integer");
  let result = 1n;
  let b = ((BigInt(base) % BigInt(mod)) + BigInt(mod)) % BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return Number(result);
}

export type ModPowStep = { k: number; acc: number };

/** The "by-hand" trace: g¹, g², … gᵉ mod p by repeated multiply-then-reduce.
 *  Clearer for small exponents than square-and-multiply — this is what the boss
 *  asks the learner to reproduce. */
export function modPowTrace(base: number, exp: number, mod: number): ModPowStep[] {
  const steps: ModPowStep[] = [];
  let acc = 1 % mod;
  for (let k = 1; k <= exp; k++) {
    acc = (acc * base) % mod;
    steps.push({ k, acc });
  }
  return steps;
}

export type DhNumber = {
  p: number;
  g: number;
  a: number; // Alice's secret
  b: number; // Bob's secret
  A: number; // Alice's public = gᵃ mod p
  B: number; // Bob's public   = gᵇ mod p
  sharedFromA: number; // Bᵃ mod p (Alice computes)
  sharedFromB: number; // Aᵇ mod p (Bob computes)
  shared: number; // the agreed secret
  agree: boolean; // sharedFromA === sharedFromB (always true for valid inputs)
};

/** Run a full number-mode exchange and prove both sides land on g^(ab) mod p. */
export function numberExchange(p: number, g: number, a: number, b: number): DhNumber {
  const A = modPow(g, a, p);
  const B = modPow(g, b, p);
  const sharedFromA = modPow(B, a, p);
  const sharedFromB = modPow(A, b, p);
  return { p, g, a, b, A, B, sharedFromA, sharedFromB, shared: sharedFromA, agree: sharedFromA === sharedFromB };
}

/** Brute-force discrete log — the eavesdropper's only move in these toy sizes.
 *  Returns the smallest x with gˣ mod p === target, or null. Exists to SHOW the
 *  attacker must search: fine for p=23, hopeless for real 2048-bit p. */
export function discreteLog(g: number, target: number, p: number): number | null {
  let acc = 1 % p;
  for (let x = 0; x < p; x++) {
    if (acc === target % p) return x;
    acc = (acc * g) % p;
  }
  return null;
}

// ------------------------------ paint mode ------------------------------
// A mix is an integer vector over three base tints. Mixing = vector addition,
// which is commutative + associative, so both parties reach an identical vector.

export type Mix = readonly [number, number, number];

/** The three physical tints the vector components map to (RGB, 0–255). */
export const TINTS: readonly [number, number, number][] = [
  [232, 193, 44], // 0 · yellow
  [46, 176, 199], // 1 · cyan
  [201, 74, 178], // 2 · magenta
];

export function mix(a: Mix, b: Mix): Mix {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function mixEqual(a: Mix, b: Mix): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/** Render a mix as a display RGB: parts-weighted average of the tints, with a
 *  slight darkening as more pigment piles up (paint gets muddier, never lighter). */
export function toRgb(m: Mix): [number, number, number] {
  const total = m[0] + m[1] + m[2];
  if (total === 0) return [242, 245, 247]; // empty = near-white canvas
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < 3; i++) {
    r += (TINTS[i][0] * m[i]) / total;
    g += (TINTS[i][1] * m[i]) / total;
    b += (TINTS[i][2] * m[i]) / total;
  }
  const mud = Math.min(0.35, (total - 1) * 0.05); // ≥2 parts → progressively muddier
  const f = 1 - mud;
  return [Math.round(r * f), Math.round(g * f), Math.round(b * f)];
}

export function rgbToCss(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export type DhPaint = {
  base: Mix;
  secretA: Mix;
  secretB: Mix;
  publicA: Mix; // base + secretA (sent in the clear)
  publicB: Mix; // base + secretB (sent in the clear)
  sharedFromA: Mix; // publicB + secretA
  sharedFromB: Mix; // publicA + secretB
  shared: Mix;
  agree: boolean;
};

/** Run a full paint-mode exchange; both sides reach base+secretA+secretB. */
export function paintExchange(base: Mix, secretA: Mix, secretB: Mix): DhPaint {
  const publicA = mix(base, secretA);
  const publicB = mix(base, secretB);
  const sharedFromA = mix(publicB, secretA);
  const sharedFromB = mix(publicA, secretB);
  return {
    base, secretA, secretB, publicA, publicB,
    sharedFromA, sharedFromB, shared: sharedFromA,
    agree: mixEqual(sharedFromA, sharedFromB),
  };
}

// The lab's default scenario (small enough to verify by hand):
// 5⁶ mod 23 = 8, 5¹⁵ mod 23 = 19, shared = 2.
export const DEFAULT_NUMBER = { p: 23, g: 5, a: 6, b: 15 } as const;
