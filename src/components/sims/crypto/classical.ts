// Engine for ch.31 — the `cipher-cracker` micro and the P9 boss's first half.
// Classical ciphers and the statistics that break them. These are the "before"
// picture: substitution ciphers leak the plaintext's letter distribution, so
// frequency analysis (al-Kindi, 9th century) defeats them regardless of the
// key. Caesar has 25 keys; Vigenère hides the frequencies behind a repeating
// key — until Kasiski (1863) / the index of coincidence recover the key length
// and collapse it back into independent Caesars, one per key position.
//
// The lesson that carries into modern crypto: security must not rest on the
// secrecy of the method (Kerckhoffs, 1883), and a cipher that preserves
// structure of the plaintext is doomed.
//
// Deterministic. Erasable-syntax only.

const A = 65;

/** Relative frequency of A–Z in typical English text (fractions, sum ≈ 1). */
export const ENGLISH_FREQ: readonly number[] = [
  0.08167, 0.01492, 0.02782, 0.04253, 0.12702, 0.02228, 0.02015, 0.06094, 0.06966, 0.00153,
  0.00772, 0.04025, 0.02406, 0.06749, 0.07507, 0.01929, 0.00095, 0.05987, 0.06327, 0.09056,
  0.02758, 0.00978, 0.02360, 0.00150, 0.01974, 0.00074,
];

/** Index of coincidence: English ≈ 0.0667, uniform-random ≈ 0.0385. */
export const IC_ENGLISH = 0.0667;
export const IC_RANDOM = 0.0385;

const isAZ = (code: number): boolean => (code >= 65 && code <= 90) || (code >= 97 && code <= 122);

/** Strip to uppercase A–Z only (what the statistics operate on). */
export function lettersOnly(text: string): string {
  let s = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (isAZ(c)) s += ch.toUpperCase();
  }
  return s;
}

// ------------------------------- Caesar --------------------------------

/** Shift every letter by `shift` (mod 26); non-letters and case preserved. */
export function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  let out = "";
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(((c - A + s) % 26) + A);
    else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + s) % 26) + 97);
    else out += ch;
  }
  return out;
}
export const caesarEncrypt = (text: string, shift: number): string => caesarShift(text, shift);
export const caesarDecrypt = (text: string, shift: number): string => caesarShift(text, -shift);

// ------------------------------ Vigenère -------------------------------

/** Vigenère with a repeating alphabetic key; the key advances only on letters. */
export function vigenere(text: string, key: string, decrypt: boolean): string {
  const k = lettersOnly(key);
  if (k.length === 0) return text;
  let out = "";
  let ki = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    const shift = k.charCodeAt(ki % k.length) - A;
    if (c >= 65 && c <= 90) {
      out += String.fromCharCode(((c - A + (decrypt ? -shift : shift) + 26) % 26) + A);
      ki++;
    } else if (c >= 97 && c <= 122) {
      out += String.fromCharCode(((c - 97 + (decrypt ? -shift : shift) + 26) % 26) + 97);
      ki++;
    } else {
      out += ch;
    }
  }
  return out;
}
export const vigenereEncrypt = (text: string, key: string): string => vigenere(text, key, false);
export const vigenereDecrypt = (text: string, key: string): string => vigenere(text, key, true);

// ----------------------------- statistics ------------------------------

/** Count of each letter A–Z in the text (letters only). */
export function letterCounts(text: string): number[] {
  const counts = new Array<number>(26).fill(0);
  for (const ch of lettersOnly(text)) counts[ch.charCodeAt(0) - A]++;
  return counts;
}

/** Relative frequencies A–Z (fractions), for the live bar chart. */
export function letterFreqs(text: string): number[] {
  const counts = letterCounts(text);
  const n = counts.reduce((a, b) => a + b, 0);
  return n === 0 ? counts.map(() => 0) : counts.map((c) => c / n);
}

/** χ² distance of a text's letter distribution from English (lower = more English-like). */
export function chiSquaredEnglish(text: string): number {
  const counts = letterCounts(text);
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return Infinity;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    const expected = n * ENGLISH_FREQ[i];
    const diff = counts[i] - expected;
    chi += (diff * diff) / expected;
  }
  return chi;
}

/** Index of coincidence: P(two random letters match). */
export function indexOfCoincidence(text: string): number {
  const counts = letterCounts(text);
  const n = counts.reduce((a, b) => a + b, 0);
  if (n < 2) return 0;
  let sum = 0;
  for (const c of counts) sum += c * (c - 1);
  return sum / (n * (n - 1));
}

// ------------------------------ cracking -------------------------------

export type CaesarGuess = { shift: number; chi: number; plaintext: string };

/** Try all 25 shifts, rank by χ² to English. Best guess is index 0. */
export function crackCaesar(cipher: string): CaesarGuess[] {
  const guesses: CaesarGuess[] = [];
  for (let shift = 0; shift < 26; shift++) {
    const plaintext = caesarDecrypt(cipher, shift);
    guesses.push({ shift, chi: chiSquaredEnglish(plaintext), plaintext });
  }
  guesses.sort((a, b) => a.chi - b.chi);
  return guesses;
}

export type KeyLenGuess = { len: number; ic: number };

/** Rank candidate Vigenère key lengths by average per-column index of
 *  coincidence. The true length makes each column a single Caesar shift of
 *  English, so its columns' IC ≈ 0.0667; wrong lengths scramble shifts → ≈ 0.0385. */
export function guessKeyLengths(cipher: string, maxLen = 12): KeyLenGuess[] {
  const letters = lettersOnly(cipher);
  const guesses: KeyLenGuess[] = [];
  for (let len = 1; len <= Math.min(maxLen, letters.length); len++) {
    let icSum = 0;
    for (let col = 0; col < len; col++) {
      let column = "";
      for (let i = col; i < letters.length; i += len) column += letters[i];
      icSum += indexOfCoincidence(column);
    }
    guesses.push({ len, ic: icSum / len });
  }
  // The true key length and its multiples make every column a single Caesar
  // shift, so their columns look English (IC ≈ 0.0667); wrong lengths scramble
  // shifts (IC ≈ 0.0385). Rank by closeness to English, but collapse multiples:
  // among lengths within `nearPeak` of the best IC, prefer the smallest period.
  const maxIc = Math.max(...guesses.map((g) => g.ic));
  const nearPeak = 0.012;
  guesses.sort((a, b) => {
    const an = a.ic >= maxIc - nearPeak;
    const bn = b.ic >= maxIc - nearPeak;
    if (an !== bn) return an ? -1 : 1; // near-peak lengths first
    if (an) return a.len - b.len; // among them, the minimal period wins
    return Math.abs(a.ic - IC_ENGLISH) - Math.abs(b.ic - IC_ENGLISH);
  });
  return guesses;
}

export type VigenereCrack = { keyLen: number; key: string; plaintext: string };

/** Given a key length, break each column as an independent Caesar and reassemble. */
export function crackVigenereWithLen(cipher: string, keyLen: number): VigenereCrack {
  const letters = lettersOnly(cipher);
  let key = "";
  for (let col = 0; col < keyLen; col++) {
    let column = "";
    for (let i = col; i < letters.length; i += keyLen) column += letters[i];
    const best = crackCaesar(column)[0];
    key += String.fromCharCode(A + best.shift);
  }
  return { keyLen, key, plaintext: vigenereDecrypt(cipher, key) };
}

/** Full auto-crack. Rather than trust the IC key-length guess alone, crack at
 *  every candidate length and keep the one whose recovered plaintext is most
 *  English (lowest χ²). Iterating lengths ascending and only replacing on a
 *  strict improvement means the minimal period wins ties over its multiples —
 *  so the key comes back as "CODE", not "CODECODE". */
export function autoCrackVigenere(cipher: string, maxLen = 12): VigenereCrack {
  let best: VigenereCrack = crackVigenereWithLen(cipher, 1);
  let bestChi = chiSquaredEnglish(best.plaintext);
  for (let len = 2; len <= maxLen; len++) {
    const c = crackVigenereWithLen(cipher, len);
    const chi = chiSquaredEnglish(c.plaintext);
    if (chi < bestChi - 1e-6) { bestChi = chi; best = c; }
  }
  return best;
}
