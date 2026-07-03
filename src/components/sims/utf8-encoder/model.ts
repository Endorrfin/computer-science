// utf8-encoder core — pure model for ch.2. Turns text into Unicode code
// points and their UTF-8 byte sequences, exposing the leading/continuation
// bit structure and the "chars ≠ code units ≠ bytes" trap. Erasable-syntax
// only (Node test runner).

export type EncodedChar = {
  char: string; // the grapheme as JS sees this code point
  codePoint: number; // Unicode scalar value
  bytes: number[]; // 1–4 UTF-8 bytes
  utf16Units: number; // 1 or 2 (surrogate pair)
};

/** Iterate real code points (handles astral chars / surrogate pairs). */
export function codePointsOf(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) out.push(ch.codePointAt(0) as number);
  return out;
}

/** Encode one code point to UTF-8 bytes (the 1/2/3/4-byte templates). */
export function utf8Bytes(cp: number): number[] {
  if (cp <= 0x7f) return [cp];
  if (cp <= 0x7ff) return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)];
  if (cp <= 0xffff) return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return [
    0xf0 | (cp >> 18),
    0x80 | ((cp >> 12) & 0x3f),
    0x80 | ((cp >> 6) & 0x3f),
    0x80 | (cp & 0x3f),
  ];
}

export function encode(str: string): EncodedChar[] {
  const out: EncodedChar[] = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0) as number;
    out.push({ char: ch, codePoint: cp, bytes: utf8Bytes(cp), utf16Units: ch.length });
  }
  return out;
}

export type EncodeStats = {
  codePoints: number;
  utf16Units: number; // what String.length reports
  utf8Bytes: number;
  utf32Bytes: number; // fixed-width comparison
};

export function stats(str: string): EncodeStats {
  const chars = encode(str);
  return {
    codePoints: chars.length,
    utf16Units: str.length,
    utf8Bytes: chars.reduce((n, c) => n + c.bytes.length, 0),
    utf32Bytes: chars.length * 4,
  };
}

/** Classify a byte for coloring: how UTF-8 self-synchronizes. */
export type ByteRole = "ascii" | "lead2" | "lead3" | "lead4" | "cont";

export function byteRole(b: number): ByteRole {
  if (b < 0x80) return "ascii"; // 0xxxxxxx
  if (b < 0xc0) return "cont"; // 10xxxxxx
  if (b < 0xe0) return "lead2"; // 110xxxxx
  if (b < 0xf0) return "lead3"; // 1110xxxx
  return "lead4"; // 11110xxx
}

export function toBin(b: number): string {
  return b.toString(2).padStart(8, "0");
}
export function toHex(b: number): string {
  return b.toString(16).toUpperCase().padStart(2, "0");
}
