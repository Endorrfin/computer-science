// Engine truth-tests for P1 · Information (bit-inspector, utf8-encoder,
// compression, huffman-lab). Same convention as test-logic.ts: pure models,
// Node-run, CI-gated via `npm test`.
import {
  CLASSIC_SUM,
  bitsToFloat,
  bitsToSigned,
  bitsToUnsigned,
  decomposeFloat,
  floatBits,
  hexOf,
  nextUp,
  toBits,
  twosComplement,
  wrapAdd,
} from "../src/components/sims/bit-inspector/model.ts";
import {
  byteRole,
  codePointsOf,
  stats as utf8Stats,
  utf8Bytes,
} from "../src/components/sims/utf8-encoder/model.ts";
import {
  entropyBits,
  lz77,
  lz77Expand,
  rleEncodedLength,
  rleExpand,
  rleRuns,
} from "../src/components/sims/compression/model.ts";
import {
  MYSTERY_SECRET,
  codeTable,
  decode,
  encode as huffEncode,
  huffmanRoot,
  mysteryPuzzle,
  stats as huffStats,
} from "../src/components/sims/huffman-lab/model.ts";

let failed = 0;
const show = (v: unknown): string => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? `${x}n` : x));
function eq<T>(name: string, got: T, want: T): void {
  const g = show(got);
  const w = show(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name} — expected true`);
  }
}

// ---------- bit-inspector: integer lane ----------
{
  eq("8-bit 255 → all ones", toBits(255n, 8), [1, 1, 1, 1, 1, 1, 1, 1]);
  eq("all ones → unsigned 255", bitsToUnsigned([1, 1, 1, 1, 1, 1, 1, 1]), 255n);
  eq("all ones → signed −1 (two's complement)", bitsToSigned([1, 1, 1, 1, 1, 1, 1, 1]), -1n);
  eq("−1 stored as all ones", toBits(-1n, 8), [1, 1, 1, 1, 1, 1, 1, 1]);
  eq("hex of 255 (8-bit)", hexOf(toBits(255n, 8)), "0xFF");
  eq("hex of 32-bit max", hexOf(toBits(4294967295n, 32)), "0xFFFFFFFF");
  // signed overflow: 127 + 1 wraps to −128 (the sign bit flips)
  eq("127+1 (8-bit) → signed −128", bitsToSigned(wrapAdd(127n, 1n, 8).bits), -128n);
  ok("127+1 is NOT an unsigned overflow", wrapAdd(127n, 1n, 8).wrapped === false);
  ok("255+1 IS an unsigned overflow", wrapAdd(255n, 1n, 8).wrapped === true);
  eq("255+1 (8-bit) wraps to 0", bitsToUnsigned(wrapAdd(255n, 1n, 8).bits), 0n);
  eq("two's complement of 1 == −1 bits", twosComplement(toBits(1n, 8)), toBits(-1n, 8));
  eq("negate is reversible", twosComplement(twosComplement(toBits(42n, 8))), toBits(42n, 8));
}

// ---------- bit-inspector: float lane ----------
{
  ok("0.1 + 0.2 !== 0.3", CLASSIC_SUM.sum !== CLASSIC_SUM.naive);
  eq("0.1 + 0.2 === 0.30000000000000004", CLASSIC_SUM.sum, 0.30000000000000004);
  const one = decomposeFloat(1, 64);
  eq("1.0 sign bit", one.sign, 0);
  eq("1.0 unbiased exponent", one.unbiasedExponent, 0);
  eq("1.0 raw (biased) exponent", one.rawExponent, 1023);
  ok("1.0 mantissa is all zero", one.mantissaBits.every((b) => b === 0));
  eq("0.5 unbiased exponent", decomposeFloat(0.5, 64).unbiasedExponent, -1);
  eq("0.0 classifies as zero", decomposeFloat(0, 64).classification, "zero");
  eq("Infinity classifies", decomposeFloat(Infinity, 64).classification, "infinity");
  eq("NaN classifies", decomposeFloat(NaN, 64).classification, "nan");
  for (const x of [1, -2.5, 0.1, 3.141592653589793, 1e10]) {
    ok(`float64 bit round-trip: ${x}`, bitsToFloat(floatBits(x, 64), 64) === x);
  }
  ok("float32 stores 0.1 imprecisely (≠ the double 0.1)", decomposeFloat(0.1, 32).stored !== 0.1);
  ok("ULP gap at 1.0 (double) is 2^-52", nextUp(1, 64) - 1 === Math.pow(2, -52));
}

// ---------- utf8-encoder ----------
{
  eq("ASCII 'A'", utf8Bytes(0x41), [0x41]);
  eq("2-byte '£' U+00A3", utf8Bytes(0xa3), [0xc2, 0xa3]);
  eq("3-byte '€' U+20AC", utf8Bytes(0x20ac), [0xe2, 0x82, 0xac]);
  eq("4-byte '😀' U+1F600", utf8Bytes(0x1f600), [0xf0, 0x9f, 0x98, 0x80]);
  eq("emoji is one code point", codePointsOf("😀"), [0x1f600]);
  // the trap: 'A😀' — 2 code points, 3 UTF-16 units (String.length), 5 UTF-8 bytes
  const s = utf8Stats("A😀");
  eq("chars ≠ code units ≠ bytes", [s.codePoints, s.utf16Units, s.utf8Bytes], [2, 3, 5]);
  eq("byteRole ascii", byteRole(0x41), "ascii");
  eq("byteRole continuation", byteRole(0x80), "cont");
  eq("byteRole lead2", byteRole(0xc2), "lead2");
  eq("byteRole lead3", byteRole(0xe2), "lead3");
  eq("byteRole lead4", byteRole(0xf0), "lead4");
}

// ---------- compression: entropy / RLE / LZ77 ----------
{
  eq("entropy of a constant string is 0", entropyBits("AAAA"), 0);
  eq("entropy of a fair coin is 1 bit", entropyBits("AB"), 1);
  eq("entropy of 4 equal symbols is 2 bits", entropyBits("ABCD"), 2);
  eq("RLE runs", rleRuns("AAAB"), [
    { char: "A", length: 3 },
    { char: "B", length: 1 },
  ]);
  eq("RLE round-trips", rleExpand(rleRuns("AAAABBBCCD")), "AAAABBBCCD");
  ok("RLE doubles alternating input (teachable fail)", rleEncodedLength(rleRuns("ABAB")) === 8);
  for (const s of ["abcabcabcabc", "aaaaaaa", "the cat sat on the mat", "no-repeats-xyz"]) {
    ok(`LZ77 round-trips: "${s}"`, lz77Expand(lz77(s)) === s);
  }
}

// ---------- huffman-lab ----------
{
  const texts = ["HUFFMAN CODES", "mississippi", "ab", "aaaa", "the quick brown fox"];
  for (const t of texts) {
    const root = huffmanRoot(t);
    const table = codeTable(root);
    ok(`Huffman round-trips: "${t}"`, decode(huffEncode(t, table), root) === t);
    // prefix-free: no code is a prefix of another
    const codes = [...table.values()];
    let prefixFree = true;
    for (let i = 0; i < codes.length; i++)
      for (let j = 0; j < codes.length; j++)
        if (i !== j && codes[j].startsWith(codes[i])) prefixFree = false;
    ok(`Huffman codes are prefix-free: "${t}"`, prefixFree);
  }
  const st = huffStats("aaaaaaaaab", codeTable(huffmanRoot("aaaaaaaaab")));
  ok("Huffman never beaten by fixed 8-bit", st.huffBits <= st.asciiBits);
  // Shannon bound: average code length ≥ entropy
  const t2 = "mississippi";
  ok(
    "avg code length ≥ entropy (Shannon)",
    huffStats(t2, codeTable(huffmanRoot(t2))).avgBitsPerSymbol >= entropyBits(t2) - 1e-9,
  );
  // the boss puzzle must decode to its secret
  const m = mysteryPuzzle();
  eq("mystery decodes to its secret", decode(m.bits, m.root), MYSTERY_SECRET);
  ok("mystery packs into whole bytes", m.bytes.length === Math.ceil(m.bits.length / 8));
}

if (failed > 0) {
  console.error(`\n✗ ${failed} info-engine test(s) failed`);
  process.exit(1);
}
console.log("✓ P1 information-engine truth-tests pass");
