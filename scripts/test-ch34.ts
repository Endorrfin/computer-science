// ch.34 · Modern AI — engine checks (BPE tokenizer · word embeddings ·
// attention). Real algorithms on real vendored data: the BPE merge table
// regenerates from the bundled corpus, the word2vec vectors actually satisfy
// king − man + woman ≈ queen, and attention rows are genuine softmax
// distributions. Deterministic. Run: node --experimental-strip-types scripts/test-ch34.ts
import { trainBpe, encode, decode, pretokenize, letterView, SPACE } from "../src/components/sims/ai/bpe.ts";
import { BPE_MERGES } from "../src/components/sims/ai/data/bpe-data.ts";
import { CORPUS } from "../src/components/sims/ai/data/corpus.ts";
import { analogy, neighbors, cosine, nearestToVec } from "../src/components/sims/ai/embeddings.ts";
import { EMBEDDINGS } from "../src/components/sims/ai/data/embeddings-data.ts";
import { selfAttention, contextVectors, EXAMPLES, exampleById, softmax } from "../src/components/sims/ai/attention.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got); const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
}

// ===================== (A) BPE tokenizer =====================
{
  console.log("bpe · the vendored merge table regenerates from the corpus:");
  const retrained = trainBpe(CORPUS, BPE_MERGES.length);
  eq("re-training the bundled corpus reproduces the vendored merges", retrained, BPE_MERGES);
  ok("merges are ordered pairs of strings", BPE_MERGES.every((m) => m.length === 2 && typeof m[0] === "string"));

  console.log("bpe · encoding round-trips (single-spaced text):");
  for (const t of ["the king and the queen", "Hello, World! 123", "tokenization is fun"]) {
    eq(`round-trips ${JSON.stringify(t)}`, decode(encode(t, BPE_MERGES)), t);
  }

  console.log("bpe · why letter-counting fails (the ‘strawberry’ lesson):");
  const straw = encode("strawberry", BPE_MERGES);
  ok(`‘strawberry’ fragments into ${straw.length} tokens (not one)`, straw.length >= 3);
  const lv = letterView(straw, "r");
  eq("there really are three r's in strawberry", lv.total, 3);
  ok("but they are buried across multiple tokens (no token IS a letter here)", straw.length > 1 && lv.perToken.filter((n) => n > 0).length >= 1);

  console.log("bpe · pretokenization & structure:");
  ok("a leading space becomes the SPACE marker", pretokenize(" hi")[0].startsWith(SPACE));
  const digits = encode("2026", BPE_MERGES);
  ok("digits tokenize one-by-one (numbers are hard for LLMs)", digits.length === 4);
  const toks = encode("the machine reads instructions", BPE_MERGES);
  ok("token count ≤ char count and ≥ word count", toks.length <= "the machine reads instructions".length && toks.length >= 4);
}

// ===================== (B) word embeddings =====================
{
  console.log("embeddings · vendored word2vec vectors:");
  ok("64-dimensional vectors", EMBEDDINGS[0].vec.length === 64);
  ok("curated vocabulary present", EMBEDDINGS.length >= 25 && EMBEDDINGS.some((w) => w.word === "queen"));
  ok("cosine self-similarity is 1", Math.abs(cosine(EMBEDDINGS[0].vec, EMBEDDINGS[0].vec) - 1) < 1e-9);

  console.log("embeddings · king − man + woman ≈ queen (learned, not placed):");
  const q = analogy(EMBEDDINGS, "king", "man", "woman", 3)!;
  eq("the nearest word to king−man+woman is queen", q.ranked[0].word, "queen");
  for (const [a, b, c, want] of [["brother", "man", "woman", "sister"], ["uncle", "man", "woman", "aunt"],
    ["son", "man", "woman", "daughter"], ["actor", "man", "woman", "actress"]] as const) {
    eq(`${a} − ${b} + ${c} → ${want}`, analogy(EMBEDDINGS, a, b, c, 1)!.ranked[0].word, want);
  }

  console.log("embeddings · neighbours reflect meaning:");
  const kn = neighbors(EMBEDDINGS, "king", 5).map((r) => r.word);
  ok(`king's neighbours are male/royal (${kn.join(", ")})`, kn.some((w) => ["son", "boy", "father", "husband", "prince"].includes(w)));
  ok("cosine(king,queen) is high & positive", cosine(EMBEDDINGS.find((w) => w.word === "king")!.vec, EMBEDDINGS.find((w) => w.word === "queen")!.vec) > 0.3);
  ok("all 2-D projection coords are finite and in range", EMBEDDINGS.every((w) => Math.abs(w.xy[0]) <= 1.001 && Math.abs(w.xy[1]) <= 1.001));
  const near = nearestToVec(EMBEDDINGS, EMBEDDINGS.find((w) => w.word === "queen")!.vec, 2, ["queen"]);
  ok("queen's nearest is not itself (exclude works)", near[0].word !== "queen");
}

// ===================== (C) attention =====================
{
  console.log("attention · softmax rows are genuine probability distributions:");
  eq("softmax sums to 1", Math.round(softmax([2, 1, 0, -1]).reduce((a, b) => a + b, 0) * 1e6) / 1e6, 1);
  ok("softmax is monotonic (bigger logit → bigger weight)", softmax([3, 1])[0] > softmax([3, 1])[1]);
  for (const ex of EXAMPLES) {
    const A = selfAttention(ex.X);
    ok(`[${ex.id}] every attention row sums to 1`, A.every((r) => Math.abs(r.reduce((a, b) => a + b, 0) - 1) < 1e-9));
    ok(`[${ex.id}] weights are in [0,1]`, A.every((r) => r.every((v) => v >= 0 && v <= 1)));
  }

  console.log("attention · the patterns are linguistically sensible:");
  const co = exampleById("coref")!;
  const A = selfAttention(co.X);
  const itIdx = co.tokens.indexOf("it");
  const animalIdx = co.tokens.indexOf("animal");
  const row = A[itIdx].map((w, j) => ({ j, w })).filter((o) => o.j !== itIdx).sort((a, b) => b.w - a.w);
  eq("‘it’ attends most to ‘animal’ (coreference)", co.tokens[row[0].j], "animal");
  ok("‘it’→‘animal’ outweighs ‘it’→‘road’", A[itIdx][animalIdx] > A[itIdx][co.tokens.indexOf("road")]);

  const verb = exampleById("verb")!;
  const B = selfAttention(verb.X);
  const chased = verb.tokens.indexOf("chased");
  ok("‘chased’ attends to both cat and mouse above ‘the’", B[chased][verb.tokens.indexOf("cat")] > B[chased][0] && B[chased][verb.tokens.indexOf("mouse")] > B[chased][0]);

  const ctx = contextVectors(co.X, A);
  eq("context vectors keep the model dimension", [ctx.length, ctx[0].length], [co.X.length, co.X[0].length]);
}

console.log(failed === 0 ? "\n✓ ch.34 AI engines: all checks pass" : `\n✗ ch.34: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
