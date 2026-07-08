// ch.31 · Cryptography — engine checks (DH · SHA-256 vs Node crypto · classical
// ciphers + cracking · RSA · TLS primitive map).
// Run: node --experimental-strip-types scripts/test-ch31.ts
import { createHash } from "node:crypto";
import {
  modPow, modPowTrace, numberExchange, discreteLog,
  paintExchange, mixEqual, type Mix,
} from "../src/components/sims/crypto/dh.ts";
import { sha256Hex, avalanche, leadingZeroBits, mine } from "../src/components/sims/crypto/sha256.ts";
import {
  caesarEncrypt, caesarDecrypt, crackCaesar,
  vigenereEncrypt, vigenereDecrypt, guessKeyLengths, autoCrackVigenere, lettersOnly,
  indexOfCoincidence,
} from "../src/components/sims/crypto/classical.ts";
import { rsaKeygen, rsaEncrypt, rsaDecrypt, rsaSign, rsaVerify, modInverse, gcd } from "../src/components/sims/crypto/rsa.ts";
import { TLS_STEPS, PRIMITIVE_LABEL, primitivesUsed } from "../src/components/sims/crypto/tls-map.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

// ===================== (A) Diffie–Hellman =====================
{
  console.log("dh · modular exponentiation & exchange:");
  eq("5⁶ mod 23 = 8", modPow(5, 6, 23), 8);
  eq("5¹⁵ mod 23 = 19", modPow(5, 15, 23), 19);
  eq("modPow handles large exp without overflow (7^256 mod 13)", modPow(7, 256, 13), Number(7n ** 256n % 13n));
  eq("modPowTrace ends at modPow", modPowTrace(5, 15, 23).at(-1)!.acc, 19);

  const x = numberExchange(23, 5, 6, 15);
  eq("A = 8", x.A, 8);
  eq("B = 19", x.B, 19);
  eq("shared = 2", x.shared, 2);
  ok("both sides agree", x.agree && x.sharedFromA === x.sharedFromB);

  // Exhaustive small-space agreement: every secret pair reaches one secret.
  let allAgree = true;
  for (let a = 1; a < 22; a++) for (let b = 1; b < 22; b++) {
    const e = numberExchange(23, 5, a, b);
    if (!e.agree) allAgree = false;
  }
  ok("all 21×21 secret pairs agree (mod 23, g=5)", allAgree);

  eq("discreteLog recovers Alice's secret (attacker's only move)", discreteLog(5, 8, 23), 6);
}

// ===================== (B) paint mode =====================
{
  console.log("dh · paint mode (commutative mixing):");
  const base: Mix = [2, 0, 0];
  const sa: Mix = [0, 3, 0];
  const sb: Mix = [0, 0, 4];
  const p = paintExchange(base, sa, sb);
  eq("publicA = base + secretA", p.publicA, [2, 3, 0]);
  eq("publicB = base + secretB", p.publicB, [2, 0, 4]);
  eq("shared = base + a + b", p.shared, [2, 3, 4]);
  ok("both sides mix to the identical color", p.agree && mixEqual(p.sharedFromA, p.sharedFromB));
  // Order independence over many random triples.
  let comm = true;
  for (let i = 0; i < 40; i++) {
    const r = (): Mix => [(i * 7) % 5, (i * 3) % 5, (i * 11) % 5];
    const e = paintExchange(r(), [1, 2, 3], [3, 1, 2]);
    if (!e.agree) comm = false;
  }
  ok("mixing is commutative for all sampled triples", comm);
}

// ===================== (C) SHA-256 vs Node crypto =====================
{
  console.log("sha256 · correctness vs Node's crypto:");
  const node = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
  eq('sha256("") known vector', sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  eq('sha256("abc") known vector', sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const samples = ["", "a", "abc", "hello world", "The quick brown fox jumps over the lazy dog",
    "P@ssw0rd", "Diffie–Hellman ✓ 2026", "x".repeat(55), "y".repeat(56), "z".repeat(64), "0123456789".repeat(20)];
  let allMatch = true;
  for (const s of samples) if (sha256Hex(s) !== node(s)) { allMatch = false; console.error(`      mismatch on ${JSON.stringify(s.slice(0, 20))}`); }
  ok(`all ${samples.length} samples match Node crypto (incl. block-boundary lengths 55/56/64)`, allMatch);

  console.log("sha256 · avalanche & proof-of-work:");
  const av = avalanche("The quick brown fox", "The quick brown fpx");
  ok(`one-char change flips ~half the 256 bits (got ${av.flipped})`, av.flipped >= 96 && av.flipped <= 160, `flipped=${av.flipped}`);
  eq("leadingZeroBits('00ff') = 8", leadingZeroBits("00ff"), 8);
  eq("leadingZeroBits('1abc') = 3 (hex 1 = 0001)", leadingZeroBits("1abc"), 3);
  eq("leadingZeroBits('8fff') = 0 (hex 8 = 1000)", leadingZeroBits("8fff"), 0);
  eq("leadingZeroBits('08ff') = 4", leadingZeroBits("08ff"), 4);
  const m = mine("block", 12);
  ok(`mined a hash with ≥12 leading zero bits in ${m.tries} tries`, m.found && leadingZeroBits(m.hash) >= 12);
  eq("mined hash actually equals sha256(prefix+nonce)", sha256Hex("block" + m.nonce), m.hash);
}

// ===================== (D) classical ciphers + cracking =====================
{
  console.log("classical · Caesar:");
  eq("caesar +3 round trip", caesarDecrypt(caesarEncrypt("Attack at DAWN!", 3), 3), "Attack at DAWN!");
  const sentence = "The quick brown fox jumps over the lazy dog near the river and the old bridge every single morning";
  const enc = caesarEncrypt(sentence, 7);
  eq("crackCaesar recovers the shift", crackCaesar(enc)[0].shift, 7);
  eq("...and the plaintext", crackCaesar(enc)[0].plaintext, sentence);

  console.log("classical · Vigenère + auto-crack:");
  const plain =
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, " +
    "it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, " +
    "it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us.";
  const KEY = "CODE";
  const ct = vigenereEncrypt(plain, KEY);
  eq("vigenère round trip", vigenereDecrypt(ct, KEY), plain);
  ok("ciphertext IC is random-like (masks frequencies)", indexOfCoincidence(ct) < 0.05, `IC=${indexOfCoincidence(ct).toFixed(4)}`);
  eq("guessKeyLengths finds the minimal period 4", guessKeyLengths(ct, 12)[0].len, 4);
  const crack = autoCrackVigenere(ct, 12);
  eq("auto-crack recovers the key", crack.key, KEY);
  eq("auto-crack recovers the plaintext", crack.plaintext, plain);
  ok("true length's columns are English-like — IC well above the 0.0385 random floor", guessKeyLengths(ct, 12)[0].ic > 0.06, `IC=${guessKeyLengths(ct, 12)[0].ic.toFixed(4)}`);
  eq("lettersOnly strips punctuation/spaces", lettersOnly("a, B! c?"), "ABC");
}

// ===================== (E) RSA =====================
{
  console.log("rsa · textbook keygen / encrypt / sign:");
  const key = rsaKeygen(61, 53, 17);
  eq("n = p·q = 3233", key.n, 3233);
  eq("φ = 3120", key.phi, 3120);
  eq("d = e⁻¹ mod φ = 2753", key.d, 2753);
  eq("encrypt(65) = 2790", rsaEncrypt(65, key), 2790);
  eq("decrypt(2790) = 65", rsaDecrypt(2790, key), 65);
  let rt = true;
  for (let m = 0; m < 60; m++) if (rsaDecrypt(rsaEncrypt(m, key), key) !== m) rt = false;
  ok("encrypt→decrypt round trips for m∈[0,60)", rt);
  ok("verify(sign(m)) = m (signature)", rsaVerify(rsaSign(42, key), key) === 42);

  const small = rsaKeygen(5, 11, 3);
  eq("small key d = 27", small.d, 27);
  eq("small encrypt(7) = 13", rsaEncrypt(7, small), 13);
  eq("modInverse(3, 40) = 27", modInverse(3, 40), 27);
  eq("gcd(3233, 3120) = 1", gcd(3233, 3120), 1);
}

// ===================== (F) TLS primitive map =====================
{
  console.log("tls-map · handshake primitives:");
  eq("handshake exercises all 5 primitives", primitivesUsed().sort(), ["aead", "authentication", "integrity", "key-agreement", "key-derivation"]);
  ok("every step maps to a labelled primitive", TLS_STEPS.every((s) => PRIMITIVE_LABEL[s.primitive] !== undefined));
  ok("steps are numbered 1..7 in order", TLS_STEPS.every((s, i) => s.n === i + 1));
}

console.log(failed === 0 ? "\n✓ ch.31 crypto engines: all checks pass" : `\n✗ ch.31: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
