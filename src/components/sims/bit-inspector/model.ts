// bit-inspector core — pure, framework-free number model (ch.1 HERO).
// Two lanes: fixed-width integers (two's complement) and IEEE-754 floats.
// Erasable-syntax only: the Node test runner imports this via
// --experimental-strip-types. BigInt keeps the 32-bit lane honest (JS bit
// ops are 32-bit *signed* — `1 << 31` is negative — so we never use them here).

export type IntWidth = 8 | 16 | 32;
export type FloatKind = 32 | 64;

// ---------------- integer lane ----------------

export function sizeOf(width: IntWidth): bigint {
  return 1n << BigInt(width);
}

/** MSB-first array of 0/1 for the low `width` bits of value (value wraps mod 2^width). */
export function toBits(value: bigint, width: IntWidth): number[] {
  const size = sizeOf(width);
  const v = ((value % size) + size) % size; // wrap into [0, 2^width)
  const bits: number[] = [];
  for (let i = width - 1; i >= 0; i--) bits.push(Number((v >> BigInt(i)) & 1n));
  return bits;
}

export function bitsToUnsigned(bits: number[]): bigint {
  let v = 0n;
  for (const b of bits) v = (v << 1n) | (b ? 1n : 0n);
  return v;
}

/** Two's-complement interpretation: the top bit carries negative weight. */
export function bitsToSigned(bits: number[]): bigint {
  const u = bitsToUnsigned(bits);
  const signWeight = 1n << BigInt(bits.length - 1);
  return u >= signWeight ? u - (1n << BigInt(bits.length)) : u;
}

export function hexOf(bits: number[]): string {
  const digits = Math.ceil(bits.length / 4);
  return "0x" + bitsToUnsigned(bits).toString(16).toUpperCase().padStart(digits, "0");
}

export function signedRange(width: IntWidth): { min: bigint; max: bigint } {
  const half = 1n << BigInt(width - 1);
  return { min: -half, max: half - 1n };
}
export function unsignedRange(width: IntWidth): { min: bigint; max: bigint } {
  return { min: 0n, max: sizeOf(width) - 1n };
}

/** Negate by the physical recipe the chapter teaches: invert every bit, then add 1. */
export function twosComplement(bits: number[]): number[] {
  const out = bits.map((b) => (b ? 0 : 1)); // invert
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] === 0) {
      out[i] = 1;
      break;
    }
    out[i] = 0; // carry
  }
  return out;
}

/** Add delta to the unsigned value and wrap in `width` bits — the MAX+1 demo. */
export function wrapAdd(
  value: bigint,
  delta: bigint,
  width: IntWidth,
): { bits: number[]; wrapped: boolean } {
  const size = sizeOf(width);
  const raw = value + delta;
  return { bits: toBits(raw, width), wrapped: raw >= size || raw < 0n };
}

// ---------------- float lane (IEEE-754) ----------------

export function expLen(kind: FloatKind): number {
  return kind === 32 ? 8 : 11;
}
export function mantLen(kind: FloatKind): number {
  return kind === 32 ? 23 : 52;
}
export function biasOf(kind: FloatKind): number {
  return kind === 32 ? 127 : 1023;
}

/** Raw storage bits, MSB-first: [sign, ...exponent, ...mantissa]. */
export function floatBits(x: number, kind: FloatKind): number[] {
  const bytes = kind / 8;
  const dv = new DataView(new ArrayBuffer(bytes));
  if (kind === 32) dv.setFloat32(0, x);
  else dv.setFloat64(0, x);
  const bits: number[] = [];
  for (let byte = 0; byte < bytes; byte++) {
    const b = dv.getUint8(byte);
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  return bits;
}

/** Round-trip the bit pattern back to a JS number (proves the fields regenerate the value). */
export function bitsToFloat(bits: number[], kind: FloatKind): number {
  const bytes = kind / 8;
  const dv = new DataView(new ArrayBuffer(bytes));
  for (let byte = 0; byte < bytes; byte++) {
    let b = 0;
    for (let i = 0; i < 8; i++) b = (b << 1) | (bits[byte * 8 + i] ?? 0);
    dv.setUint8(byte, b);
  }
  return kind === 32 ? dv.getFloat32(0) : dv.getFloat64(0);
}

export type FloatClass = "normal" | "subnormal" | "zero" | "infinity" | "nan";

export type FloatParts = {
  kind: FloatKind;
  sign: number; // 0 | 1
  exponentBits: number[];
  mantissaBits: number[];
  bias: number;
  rawExponent: number; // biased, as stored
  unbiasedExponent: number | null; // effective power of two; null for zero/inf/nan
  stored: number; // the actual represented value (Math.fround for 32-bit)
  classification: FloatClass;
};

export function decomposeFloat(x: number, kind: FloatKind): FloatParts {
  const bits = floatBits(x, kind);
  const el = expLen(kind);
  const sign = bits[0];
  const exponentBits = bits.slice(1, 1 + el);
  const mantissaBits = bits.slice(1 + el);
  const bias = biasOf(kind);
  const rawExponent = exponentBits.reduce((n, b) => n * 2 + b, 0);
  const mantZero = mantissaBits.every((b) => b === 0);
  const expAllOnes = exponentBits.every((b) => b === 1);
  const expAllZero = rawExponent === 0;

  let classification: FloatClass;
  let unbiasedExponent: number | null;
  if (expAllOnes) {
    classification = mantZero ? "infinity" : "nan";
    unbiasedExponent = null;
  } else if (expAllZero) {
    classification = mantZero ? "zero" : "subnormal";
    unbiasedExponent = mantZero ? null : 1 - bias; // subnormals use the min exponent
  } else {
    classification = "normal";
    unbiasedExponent = rawExponent - bias;
  }

  return {
    kind,
    sign,
    exponentBits,
    mantissaBits,
    bias,
    rawExponent,
    unbiasedExponent,
    stored: kind === 32 ? Math.fround(x) : x,
    classification,
  };
}

/** The next representable float above x — the size of the local gap is its ULP. */
export function nextUp(x: number, kind: FloatKind): number {
  if (Number.isNaN(x) || x === Infinity) return x;
  if (kind === 64) {
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, x === 0 ? 0 : x);
    let pattern = (BigInt(dv.getUint32(0)) << 32n) | BigInt(dv.getUint32(4) >>> 0);
    pattern += x >= 0 ? 1n : -1n;
    dv.setUint32(0, Number((pattern >> 32n) & 0xffffffffn));
    dv.setUint32(4, Number(pattern & 0xffffffffn));
    return dv.getFloat64(0);
  }
  const f = new Float32Array(1);
  const u = new Uint32Array(f.buffer);
  f[0] = Math.fround(x);
  u[0] += x >= 0 ? 1 : -1;
  return f[0];
}

/** Distance to the neighbouring representable value — the precision gap at x. */
export function ulpGap(x: number, kind: FloatKind): number {
  if (!Number.isFinite(x)) return NaN;
  return Math.abs(nextUp(Math.abs(x), kind) - Math.abs(x));
}

/** The famous demonstration that decimals don't fit in binary fractions. */
export const CLASSIC_SUM = { a: 0.1, b: 0.2, sum: 0.1 + 0.2, naive: 0.3 };
