// compression core — pure models shared by ch.3's rle-visualizer, lz-window
// and entropy-meter. Erasable-syntax only (Node test runner).

// ---------------- Shannon entropy ----------------

export type SymbolFreq = { symbol: string; count: number; p: number; bits: number };

export function frequencies(str: string): SymbolFreq[] {
  const counts = new Map<string, number>();
  for (const ch of str) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const n = str.length;
  return [...counts.entries()]
    .map(([symbol, count]) => ({
      symbol,
      count,
      p: count / n,
      bits: count === 0 ? 0 : -Math.log2(count / n),
    }))
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
}

/** Shannon entropy in bits/symbol: the information-theoretic floor for per-symbol coding. */
export function entropyBits(str: string): number {
  if (str.length === 0) return 0;
  let h = 0;
  for (const { p } of frequencies(str)) h += p * -Math.log2(p);
  return h;
}

// ---------------- run-length encoding ----------------

export type Run = { char: string; length: number };

export function rleRuns(str: string): Run[] {
  const runs: Run[] = [];
  for (const ch of str) {
    const last = runs[runs.length - 1];
    if (last && last.char === ch) last.length++;
    else runs.push({ char: ch, length: 1 });
  }
  return runs;
}

export function rleExpand(runs: Run[]): string {
  return runs.map((r) => r.char.repeat(r.length)).join("");
}

/** Naive RLE cost model: every run costs one symbol byte + one count byte. The
    adversarial case (no repeats) therefore *doubles* the size — a teachable fail. */
export function rleEncodedLength(runs: Run[]): number {
  return runs.length * 2;
}

// ---------------- LZ77 sliding window ----------------

export type LzToken =
  | { kind: "literal"; char: string }
  | { kind: "match"; offset: number; length: number; next: string };

/** Textbook LZ77: for each position, find the longest match in the window
    (previous `windowSize` chars). Emits (offset, length, nextChar) or a literal. */
export function lz77(str: string, windowSize = 32, maxLen = 15): LzToken[] {
  const tokens: LzToken[] = [];
  let i = 0;
  while (i < str.length) {
    let bestLen = 0;
    let bestOffset = 0;
    const windowStart = Math.max(0, i - windowSize);
    for (let j = windowStart; j < i; j++) {
      let len = 0;
      while (len < maxLen && i + len < str.length && str[j + len] === str[i + len]) len++;
      if (len > bestLen) {
        bestLen = len;
        bestOffset = i - j;
      }
    }
    if (bestLen >= 3) {
      tokens.push({
        kind: "match",
        offset: bestOffset,
        length: bestLen,
        next: str[i + bestLen] ?? "",
      });
      i += bestLen + (str[i + bestLen] !== undefined ? 1 : 0);
    } else {
      tokens.push({ kind: "literal", char: str[i] });
      i += 1;
    }
  }
  return tokens;
}

export function lz77Expand(tokens: LzToken[]): string {
  let out = "";
  for (const t of tokens) {
    if (t.kind === "literal") out += t.char;
    else {
      const start = out.length - t.offset;
      for (let k = 0; k < t.length; k++) out += out[start + k];
      out += t.next;
    }
  }
  return out;
}
