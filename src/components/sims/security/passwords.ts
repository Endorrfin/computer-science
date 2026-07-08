// Engine for ch.32 — the `password-entropy` micro. Turns a password into an
// entropy estimate and a crack-time across realistic attacker rates, and shows
// the trap: naive entropy assumes the password is RANDOM. "P@ssw0rd" scores
// ~53 "bits" by charset math yet dies instantly to a wordlist, because it's a
// leetspeak dictionary word, not 53 random bits.
//
// Rates are grounded in public GPU benchmarks (an RTX 4090 does MD5/NTLM at
// ~10¹¹–10¹²/s but bcrypt at only ~10³/s — slow hashing is the point). Modern
// guidance: store passwords with Argon2id/bcrypt, not a fast hash (OWASP
// Password Storage Cheat Sheet).
//
// Deterministic. Erasable-syntax only.

// ------------------------------ entropy --------------------------------

export type CharsetInfo = { size: number; classes: string[] };

/** The pool size an attacker assumes, from which character classes appear. */
export function charset(pw: string): CharsetInfo {
  const classes: string[] = [];
  let size = 0;
  if (/[a-z]/.test(pw)) { size += 26; classes.push("lowercase"); }
  if (/[A-Z]/.test(pw)) { size += 26; classes.push("uppercase"); }
  if (/[0-9]/.test(pw)) { size += 10; classes.push("digits"); }
  if (/[^A-Za-z0-9]/.test(pw)) { size += 33; classes.push("symbols"); }
  return { size, classes };
}

/** Naive "ideal" entropy: length × log2(poolSize). The optimistic upper bound
 *  that assumes every character was chosen uniformly at random. */
export function idealEntropyBits(pw: string): number {
  const { size } = charset(pw);
  if (size === 0 || pw.length === 0) return 0;
  return pw.length * Math.log2(size);
}

export type Band = "very weak" | "weak" | "reasonable" | "strong" | "very strong";
export function strengthBand(bits: number): Band {
  if (bits < 28) return "very weak";
  if (bits < 36) return "weak";
  if (bits < 60) return "reasonable";
  if (bits < 128) return "strong";
  return "very strong";
}

// --------------------------- dictionary reality ---------------------------

/** A tiny stand-in for the multi-million-entry wordlists real crackers use. */
export const WORDLIST: readonly string[] = [
  "password", "123456", "12345678", "qwerty", "letmein", "admin", "welcome",
  "monkey", "dragon", "football", "iloveyou", "abc123", "login", "master", "hello",
];

const LEET: Record<string, string> = { "@": "a", "4": "a", "0": "o", "1": "i", "3": "e", "5": "s", "7": "t", "$": "s", "!": "i" };

/** Undo common leetspeak substitutions and lowercase — how crackers pre-process. */
export function deLeet(pw: string): string {
  let s = "";
  for (const ch of pw.toLowerCase()) s += LEET[ch] ?? ch;
  return s;
}

export type DictHit = { hit: boolean; base?: string };

/** Does this reduce to a known word? We try both the de-leeted form (for
 *  "P@ssw0rd" → "password") and the plain-lowercase form, each with trailing
 *  digits stripped (for "Monkey1" → "monkey" — note de-leet would turn the '1'
 *  into 'i', so the plain path is what catches trailing-digit patterns). */
export function dictionaryHit(pw: string): DictHit {
  if (pw.length === 0) return { hit: false };
  const strip = (s: string): string => s.replace(/[0-9]+$/, "");
  const plain = pw.toLowerCase();
  const norm = deLeet(pw);
  const candidates = [norm, strip(norm), plain, strip(plain)];
  for (const w of WORDLIST) {
    if (candidates.includes(w)) return { hit: true, base: w };
  }
  return { hit: false };
}

// ----------------------------- crack time -----------------------------

/** Guess rates (attempts/sec) grounded in public 2024–2026 GPU benchmarks. */
export const RATES: readonly { id: string; label: string; rate: number }[] = [
  { id: "online-throttled", label: "Online, rate-limited (10/s)", rate: 10 },
  { id: "online", label: "Online, no throttle (1k/s)", rate: 1e3 },
  { id: "bcrypt", label: "Stolen DB, bcrypt cost-12, 1 GPU (~1k/s)", rate: 1e3 },
  { id: "fast-1gpu", label: "Stolen DB, fast hash (MD5/SHA), 1 GPU (10¹¹/s)", rate: 1e11 },
  { id: "fast-farm", label: "Stolen DB, fast hash, GPU farm (10¹⁴/s)", rate: 1e14 },
];

/** Average guesses to crack = half the keyspace = 2^(bits−1). */
export function averageGuesses(bits: number): number {
  return Math.pow(2, Math.max(0, bits - 1));
}

/** Average crack time in seconds at a given rate. */
export function crackSeconds(bits: number, rate: number): number {
  return averageGuesses(bits) / rate;
}

const YEAR = 365.25 * 24 * 3600;
const plural = (n: number, unit: string): string => `${n} ${unit}${n === 1 ? "" : "s"}`;
/** Human-readable duration, degrading gracefully to scientific + cosmic scale. */
export function humanTime(seconds: number): string {
  if (!isFinite(seconds)) return "effectively forever";
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return plural(Math.round(seconds / 3600), "hour");
  if (seconds < YEAR) return plural(Math.round(seconds / 86400), "day");
  const years = seconds / YEAR;
  if (years < 1e3) return plural(Math.round(years), "year");
  if (years < 1e6) return `${(years / 1e3).toFixed(1)}k years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  if (years < 1.4e10) return `${(years / 1e9).toFixed(1)} billion years`;
  if (years < 1e15) return "longer than the age of the universe";
  return `10^${Math.round(Math.log10(years))} years`;
}

export type PasswordReport = {
  length: number;
  charset: CharsetInfo;
  idealBits: number;
  band: Band;
  dict: DictHit;
  crack: { id: string; label: string; time: string; seconds: number }[];
};

/** The full assessment the meter renders. When the password is a dictionary
 *  hit, the honest crack time collapses to "instant" regardless of ideal bits. */
export function assess(pw: string): PasswordReport {
  const dict = dictionaryHit(pw);
  const idealBits = idealEntropyBits(pw);
  // Effective bits for crack-time: a wordlist hit means ~few million guesses
  // (≈ 21 bits), not the naive charset figure — that's the whole lesson.
  const effectiveBits = dict.hit ? Math.min(idealBits, 21) : idealBits;
  return {
    length: pw.length,
    charset: charset(pw),
    idealBits,
    band: strengthBand(idealBits),
    dict,
    crack: RATES.map((r) => {
      const seconds = crackSeconds(effectiveBits, r.rate);
      return { id: r.id, label: r.label, time: humanTime(seconds), seconds };
    }),
  };
}
