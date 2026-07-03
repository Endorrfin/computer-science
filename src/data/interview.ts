// Senior CS interview bank (§6). Filterable hub arrives in S18;
// questions accumulate per chapter from S1 on. Pure data.
import type { InterviewQ } from "../lib/types.ts";

export const INTERVIEW: InterviewQ[] = [
  {
    id: "iv-ch4-1",
    chapterId: "ch4",
    level: "senior",
    q: "Build XOR using only NAND gates. How few can you use?",
    a:
      "Four. With `m = NAND(A,B)`: `XOR = NAND( NAND(A,m), NAND(B,m) )`.\n" +
      "Intuition: m says *\"not both\"*; each side then asks *\"am I 1 while not-both?\"* — together: exactly one is 1.\n" +
      "Interviewers look for method over memory: write the target truth table, express it as ¬/∧/∨ (A∧¬B ∨ ¬A∧B), then mechanically De-Morgan everything into NANDs and merge duplicates.",
  },
  {
    id: "iv-ch4-2",
    chapterId: "ch4",
    level: "senior",
    q: "Why do real chip libraries prefer NAND over NOR, when both are universal?",
    a:
      "CMOS asymmetry. A 2-input NAND stacks its two nMOS transistors in series — and nMOS carriers (electrons) are ~2–3× more mobile than pMOS holes. NOR stacks the *pMOS* side in series, so it's the slower, weaker gate at equal size.\n" +
      "So synthesis targets NAND-heavy standard cells. Historical counterexample: the Apollo Guidance Computer used only NOR ICs — in its RTL technology the trade-off differed, and *one* qualified part number mattered more than speed.",
  },
  {
    id: "iv-ch4-3",
    chapterId: "ch4",
    level: "staff",
    q: "What physically limits how fast a gate can switch — and how does that connect to CPUs plateauing near ~5 GHz?",
    a:
      "Per gate: charging/discharging real capacitance through real resistance (RC delay) — a signal needs picoseconds per stage, so a clock period must cover the *longest* gate chain between two registers (the critical path).\n" +
      "Per chip: dynamic power ≈ C·V²·f. Raising f (and the voltage needed to hit it) grows heat superlinearly, and post-Dennard leakage burns power even at idle. Around ~4–5 GHz, cooling becomes the wall — the industry pivoted to pipelines, caches and more cores (ch.8).",
  },
  {
    id: "iv-ch4-4",
    chapterId: "ch4",
    level: "mid",
    q: "Refactor `!(user.isAdmin && user.isActive)` for readability. What law are you using, and what's the classic bug?",
    a:
      "De Morgan: `!user.isAdmin || !user.isActive` — \"not admin, or not active\".\n" +
      "The classic bug is the half-flip: rewriting to `!user.isAdmin && !user.isActive` (operator kept, operands negated — or vice versa). Push the NOT through **both** moves: flip the operator *and* negate each operand.\n" +
      "Bonus point in review: after De Morgan, short-circuit order changes which property is read first — visible if accessors have side effects or cost.",
  },
  {
    id: "iv-ch4-5",
    chapterId: "ch4",
    level: "senior",
    q: "Why must unused inputs on a real logic IC be tied high or low, when simulators happily treat them as 0?",
    a:
      "A floating CMOS gate input is a tiny capacitor with no defined charge path — it drifts with coupling and noise, can bias both transistors of the complementary pair partially on (shoot-through current, heat), and produces intermittent logic garbage.\n" +
      "Simulators pick a convention (this guide's sandbox reads floating as 0) because *something* deterministic must render — a good example of a simulation being honest about being a model.",
  },
  {
    id: "iv-ch4-6",
    chapterId: "ch4",
    level: "mid",
    q: "Explain to a junior why 'hardware vs software' is a smaller distinction than it looks.",
    a:
      "Both are arrangements of the same math. Any boolean function can be a NAND circuit (universality) *or* an expression in code — `1 - (a & b)` and a 4-transistor cell compute the identical truth table.\n" +
      "What actually differs is the *binding time* of the arrangement: etched at the fab, loaded as microcode/FPGA bitstream, or interpreted at runtime — a spectrum of flexibility vs speed, not a wall. (The full elevator ride is ch.10–11.)",
  },
  // ---- ch.1 · Bits & numbers ----
  {
    id: "iv-ch1-1",
    chapterId: "ch1",
    level: "senior",
    q: "Why do machines use two's complement for signed integers instead of sign-magnitude?",
    a:
      "Three payoffs, all about the hardware. **One zero** — sign-magnitude has +0 and −0; two's complement has a single 0, freeing a code point (that's why the range is asymmetric: −128…127). **One adder** — `a − b` is just `a + (~b + 1)`; the same ripple-carry adder handles signed and unsigned, no special-casing the sign. **Carry just works** — wraparound is modular arithmetic mod 2ⁿ, so overflow is a discarded carry bit, not a branch.\n" +
      "The tell in an interview: can you derive −x = ~x + 1 and explain why the top bit carries weight −2ⁿ⁻¹ rather than 'is the sign'.",
  },
  {
    id: "iv-ch1-2",
    chapterId: "ch1",
    level: "senior",
    q: "Walk me through why `0.1 + 0.2 !== 0.3`, and how you'd compare floats correctly.",
    a:
      "0.1 in binary is `0.0001100110011…` repeating — like 1/3 in decimal, it has no finite representation. A double rounds it to the nearest 52-bit fraction; same for 0.2. Their stored values are each a hair off, the errors compound rather than cancel, and the sum rounds to `0.30000000000000004`, which is a *different* double from the rounded 0.3.\n" +
      "Never `===` floats. Compare with a tolerance: an absolute epsilon near zero, but a **relative** epsilon in general (`|a−b| ≤ ε·max(|a|,|b|)`), because the gap between representable values scales with magnitude. For money, don't use floats at all — integer cents or a decimal type.",
  },
  {
    id: "iv-ch1-3",
    chapterId: "ch1",
    level: "staff",
    q: "In C, signed overflow is undefined behavior but unsigned overflow is defined. Why the split, and why should I care?",
    a:
      "Unsigned is specified to wrap mod 2ⁿ; signed overflow is UB so compilers may **assume it never happens** and optimize on that — e.g. proving `i + 1 > i` is always true and deleting a bounds check, or promoting an `int` loop counter to not wrap. Great for speed, a footgun for safety.\n" +
      "Consequences: `INT_MAX + 1` can miscompile a security check into a no-op; signed loop induction variables can be assumed monotonic. Practical guidance — use unsigned (or `size_t`) for sizes and indices, compile with `-fsanitize=undefined` in CI, and use checked/`__builtin_add_overflow` intrinsics where wraparound matters. Rust's answer: panics in debug, defined wrapping in release, and explicit `wrapping_add`/`checked_add`.",
  },
  {
    id: "iv-ch1-4",
    chapterId: "ch1",
    level: "mid",
    q: "Why is one hex digit exactly four binary digits, and where does that make life easier?",
    a:
      "Because 16 = 2⁴: a hex digit ranges 0–15, precisely what four bits encode. So conversion is mechanical — group bits into nibbles and translate each: `1101_0110` = `D6`. No arithmetic needed, unlike decimal.\n" +
      "That's why hex is everywhere bytes matter: memory addresses, color codes (`#FF8800` = three bytes), bitmasks, hexdumps. Two hex digits = one byte, which is the unit you actually reason about.",
  },
  // ---- ch.2 · Encoding the world ----
  {
    id: "iv-ch2-1",
    chapterId: "ch2",
    level: "senior",
    q: "Compare UTF-8, UTF-16 and UTF-32. Why did UTF-8 win the web?",
    a:
      "**UTF-32** is fixed 4 bytes — random-access by code point, but 4× the size and full of zero bytes. **UTF-16** is 2 or 4 bytes (surrogate pairs above the BMP) and carries an endianness/BOM problem; it's the internal string form in Java, C#, JS. **UTF-8** is 1–4 bytes, variable-width.\n" +
      "UTF-8's wins: **ASCII is a byte-identical subset** (old files/protocols just work), **no endianness** (byte-oriented), **self-synchronizing** (you can find character boundaries from any byte), and it's compact for Latin text. The cost — you can't index the *n*-th character in O(1) — rarely matters. For interchange it's the default; UTF-16's fixed-looking 2 bytes is a trap because of surrogates.",
  },
  {
    id: "iv-ch2-2",
    chapterId: "ch2",
    level: "senior",
    q: "What does it mean that UTF-8 is 'self-synchronizing', and why is that valuable?",
    a:
      "Every byte announces its role by its top bits: `0xxxxxxx` is a standalone ASCII byte, `11xxxxxx` starts a multi-byte sequence (and the count of leading 1s = its length), `10xxxxxx` is a continuation. So from *any* byte you can tell whether you're at a character boundary and, if not, scan a few bytes to the next one.\n" +
      "Value: a corrupted or dropped byte desynchronizes at most one character, not the whole stream; you can seek into the middle of a UTF-8 file and resync; and a naive byte search for an ASCII delimiter can't accidentally match the middle of a multi-byte character (continuation bytes never look like ASCII). Robustness by construction.",
  },
  {
    id: "iv-ch2-3",
    chapterId: "ch2",
    level: "staff",
    q: "Two strings both display as 'é' but `a === b` is false. What's going on, and what are the security angles?",
    a:
      "Unicode often has multiple encodings of the same visual: precomposed `é` (U+00E9) vs `e` + combining acute (U+0065 U+0301). Byte-wise different, canonically equivalent. Fix: **normalize** (NFC to compose, NFD to decompose) before comparing, hashing, or storing — `String.prototype.normalize()`.\n" +
      "Security: **homoglyph/confusable** attacks — Cyrillic 'а' (U+0430) vs Latin 'a' in a spoofed domain or username; normalization + a confusables skeleton or IDNA restrictions are the defense. Also **normalization mismatches** across a trust boundary (validate one form, store/serve another) can bypass filters, and unnormalized input breaks uniqueness constraints. Rule: normalize at the edge, pick one form, enforce it.",
  },
  {
    id: "iv-ch2-4",
    chapterId: "ch2",
    level: "mid",
    q: "What is the Nyquist limit, and why is CD audio sampled at 44.1 kHz with 16-bit depth?",
    a:
      "Nyquist: to capture a signal you must sample at **more than twice its highest frequency**; below that, high frequencies fold down and masquerade as false low ones (aliasing). Human hearing tops out near 20 kHz, so you need >40 kHz — 44.1 kHz leaves headroom for an anti-alias filter's roll-off (and it fit early video-tape storage). **Sample rate** sets the frequency ceiling; **bit depth** sets the amplitude resolution / noise floor: 16 bits ≈ 65,536 levels ≈ ~96 dB dynamic range, past most listening environments. Two orthogonal knobs — time and amplitude.",
  },
  // ---- ch.3 · Compression & entropy ----
  {
    id: "iv-ch3-1",
    chapterId: "ch3",
    level: "senior",
    q: "Huffman is optimal — yet arithmetic coding often beats it. Reconcile that.",
    a:
      "Huffman is optimal *among codes that assign an integer number of bits to each symbol*. That integer constraint is the leak: if a symbol's ideal length is 2.3 bits, Huffman must spend 2 or 3. When one symbol dominates (probability ≫ 0.5, ideal length ≪ 1 bit) Huffman still pays a whole bit — badly suboptimal.\n" +
      "**Arithmetic/range coding** encodes the whole message as one number in [0,1), so symbols effectively get fractional bits and it hugs the entropy bound. Modern coders (ANS in zstd, arithmetic in H.264/H.265) use this. Huffman survives because it's fast, simple, and near-optimal when probabilities are close to powers of two — and DEFLATE pairs it with LZ77.",
  },
  {
    id: "iv-ch3-2",
    chapterId: "ch3",
    level: "mid",
    q: "What is a prefix-free code and why does Huffman require it?",
    a:
      "No codeword is a prefix of another. That's what makes a bitstream **instantaneously decodable** without delimiters: read bits until they match a codeword, emit it, repeat — you never have to look ahead to know a code ended. In the tree, prefix-free = every symbol is a *leaf*, so following bits from the root always lands on exactly one symbol.\n" +
      "If codes could be prefixes (say `0` and `01`), a decoder couldn't tell whether `0` is done or the start of `01`. Prefix-free is precisely what buys the ratio without needing separators.",
  },
  {
    id: "iv-ch3-3",
    chapterId: "ch3",
    level: "senior",
    q: "Prove to me that no lossless compressor can shrink every input.",
    a:
      "Counting. Suppose a compressor maps every 100-bit input to a strictly shorter output. There are 2¹⁰⁰ possible inputs but only 2¹⁰⁰ − 1 shorter strings (all lengths 0…99 summed). By the pigeonhole principle two inputs collide onto the same output — so decompression can't recover both, and it isn't lossless. Therefore any real lossless scheme must *expand* some inputs (it can't be injective while always shrinking).\n" +
      "Intuition: compression buys short codes for likely inputs by charging longer codes to unlikely ones. It works because real data isn't uniform. On truly random data — maximum entropy — there's nothing to exploit, which is also why you can't re-compress a compressed file.",
  },
  {
    id: "iv-ch3-4",
    chapterId: "ch3",
    level: "staff",
    q: "How does gzip/DEFLATE actually work, and why the two-stage design?",
    a:
      "DEFLATE = **LZ77 then Huffman**. LZ77 slides a 32 KB window and replaces repeated substrings with (distance, length) back-references — killing *duplication* (repeated words, boilerplate, structure). That leaves a stream of literals and match tokens whose symbols are still unevenly distributed, so **Huffman** then gives the frequent ones short codes — killing *per-symbol redundancy*. Two different kinds of redundancy, two passes.\n" +
      "Details worth knowing: dynamic Huffman tables are built per block and shipped in the stream; length/distance use extra-bit codes; zlib wraps DEFLATE with a header + Adler-32. Successors swap in stronger primitives — zstd uses larger windows + FSE/ANS entropy coding and optional trained dictionaries for big wins on small payloads.",
  },
  {
    id: "iv-ch3-5",
    chapterId: "ch3",
    level: "senior",
    q: "Lossy vs lossless — when do you reach for lossy, and what's the core trick in JPEG?",
    a:
      "Lossless (PNG, zip, FLAC) reproduces bytes exactly — mandatory for code, text, archives. Lossy (JPEG, MP3, H.264) throws away information a human won't notice, buying far bigger ratios — right for photos, audio, video where perceptual fidelity, not bit-fidelity, is the goal.\n" +
      "JPEG's core: split into 8×8 blocks, **DCT** each into frequency coefficients, then **quantize** — divide by a table that discards high-frequency detail the eye is insensitive to (that's the lossy step; the quality slider scales the table). Convert to YCbCr first and subsample the chroma, because we see luminance detail more than color. Then the survivors are run-length + Huffman coded (lossless tail). MP3 is the same shape with a psychoacoustic model masking inaudible tones.",
  },

];

export function interviewById(id: string): InterviewQ | undefined {
  return INTERVIEW.find((q) => q.id === id);
}
export function interviewOfChapter(chapterId: string): InterviewQ[] {
  return INTERVIEW.filter((q) => q.chapterId === chapterId);
}
