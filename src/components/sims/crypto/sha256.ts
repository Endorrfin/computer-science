// Engine for ch.31 — the `hash-avalanche` micro. A self-contained, dependency-
// free SHA-256 (FIPS 180-4). We vendor it rather than call Web Crypto so the
// browser sim and the Node truth-tests run the EXACT same function (Web Crypto
// is async and lives only in the platform) — the test then cross-checks this
// output against Node's built-in crypto to prove correctness.
//
// SHA-256 is the workhorse hash of modern security (TLS, signatures, Bitcoin,
// content addressing). Its predecessors fell: MD5 has had practical collisions
// since the mid-2000s, and SHA-1 was broken in 2017 ("SHAttered", Stevens et
// al. / CWI & Google — two distinct PDFs, one SHA-1 digest, ~2⁶³·¹ work).
//
// Deterministic. Erasable-syntax only.

// Round constants: first 32 bits of the fractional parts of the cube roots of
// the first 64 primes.
const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 of a byte array → 32-byte digest. */
export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  // Padding: append 0x80, then zeros, then the 64-bit big-endian bit length.
  const bitLen = bytes.length * 8;
  const withOne = bytes.length + 1;
  const total = withOne + ((56 - (withOne % 64) + 64) % 64) + 8;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  // 64-bit length; JS bit ops are 32-bit, so write the low 32 bits (ample for
  // the small inputs this sim hashes) and leave the high word zero.
  msg[total - 4] = (bitLen >>> 24) & 0xff;
  msg[total - 3] = (bitLen >>> 16) & 0xff;
  msg[total - 2] = (bitLen >>> 8) & 0xff;
  msg[total - 1] = bitLen & 0xff;

  const w = new Uint32Array(64);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (h[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    out[i * 4 + 3] = h[i] & 0xff;
  }
  return out;
}

const HEX = "0123456789abcdef";
export function toHex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}

const enc = new TextEncoder();
/** SHA-256 of a UTF-8 string → 64-char lowercase hex. */
export function sha256Hex(text: string): string {
  return toHex(sha256Bytes(enc.encode(text)));
}

/** The 256 output bits as 0/1, MSB-first — feeds the avalanche heat-map. */
export function sha256Bits(text: string): number[] {
  const bytes = sha256Bytes(enc.encode(text));
  const bits: number[] = [];
  for (const byte of bytes) for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  return bits;
}

/** Hamming distance between two bit arrays — how many positions differ. */
export function bitDiff(a: number[], b: number[]): number {
  let d = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  return d;
}

/** The avalanche measurement: change one input, ~half the 256 output bits flip. */
export type Avalanche = { before: string; after: string; flipped: number; total: number; ratio: number };
export function avalanche(a: string, b: string): Avalanche {
  const ba = sha256Bits(a);
  const bb = sha256Bits(b);
  const flipped = bitDiff(ba, bb);
  return { before: sha256Hex(a), after: sha256Hex(b), flipped, total: 256, ratio: flipped / 256 };
}

/** Leading zero *bits* in a hex digest — the unit of proof-of-work difficulty. */
export function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { bits += 4; continue; }
    bits += Math.clz32(v) - 28; // v is 1–15 → 0–3 leading zeros within the nibble
    break;
  }
  return bits;
}

export type MineResult = { nonce: number; hash: string; tries: number; found: boolean };
/** Proof-of-work toy: find a nonce so sha256(prefix+nonce) has ≥targetBits
 *  leading zero bits. Each extra bit doubles the expected work. */
export function mine(prefix: string, targetBits: number, maxTries = 500000): MineResult {
  for (let nonce = 0; nonce < maxTries; nonce++) {
    const hash = sha256Hex(prefix + nonce);
    if (leadingZeroBits(hash) >= targetBits) return { nonce, hash, tries: nonce + 1, found: true };
  }
  return { nonce: -1, hash: "", tries: maxTries, found: false };
}
