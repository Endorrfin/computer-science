// Engine for ch.31 — the `rsa-locks` figure. Textbook RSA (Rivest, Shamir &
// Adleman, 1977) at toy sizes, to make the public-lock / private-key metaphor
// concrete and steppable. The trapdoor: multiplying primes p·q=n is easy;
// factoring n back is (believed) hard, and without the factors you can't derive
// the private exponent d from the public (e, n). Anyone can lock with the public
// key; only the holder of d unlocks — and running it backwards (sign with d,
// verify with e) proves authorship.
//
// Real RSA pads (OAEP/PSS) and uses 2048-bit+ moduli; this is the arithmetic
// skeleton only, for intuition. Deterministic. Erasable-syntax only.
import { modPow } from "./dh.ts";

export function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return Math.abs(a);
}

/** Extended Euclid: returns [g, x, y] with a·x + b·y = g = gcd(a,b). */
export function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - Math.floor(a / b) * y1];
}

/** Modular inverse of a mod m (the private exponent d = e⁻¹ mod φ). */
export function modInverse(a: number, m: number): number {
  const [g, x] = egcd(((a % m) + m) % m, m);
  if (g !== 1) throw new Error(`no inverse: gcd(${a}, ${m}) = ${g}`);
  return ((x % m) + m) % m;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

export type RsaKey = { p: number; q: number; n: number; phi: number; e: number; d: number };

/** Build a key from two primes and a public exponent e (coprime to φ). */
export function rsaKeygen(p: number, q: number, e: number): RsaKey {
  if (!isPrime(p) || !isPrime(q)) throw new Error("p and q must be prime");
  if (p === q) throw new Error("p and q must differ");
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  if (gcd(e, phi) !== 1) throw new Error(`e=${e} not coprime to φ=${phi}`);
  const d = modInverse(e, phi);
  return { p, q, n, phi, e, d };
}

export const rsaEncrypt = (m: number, key: RsaKey): number => modPow(m, key.e, key.n); // lock with public e
export const rsaDecrypt = (c: number, key: RsaKey): number => modPow(c, key.d, key.n); // unlock with private d
export const rsaSign = (m: number, key: RsaKey): number => modPow(m, key.d, key.n); // sign with private d
export const rsaVerify = (s: number, key: RsaKey): number => modPow(s, key.e, key.n); // verify with public e

// Small enough to step by hand for the figure: n=55, φ=40, e=3, d=27.
export const DEFAULT_RSA = { p: 5, q: 11, e: 3 } as const;
