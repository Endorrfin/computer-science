// The attention-heatmap engine (ch.34). The attention COMPUTATION here is the
// real thing a transformer runs: scaled dot-product self-attention,
// softmax(Q·Kᵀ / √d) applied row-wise. What is illustrative — and clearly
// labeled as such in the UI — are the token vectors: a real trained LLM's
// weights can't run inside a static sim, so each example sentence carries small
// hand-designed vectors chosen to expose a real linguistic pattern (a pronoun
// attending to the noun it refers to, an adjective to its noun). Every number
// in the heat-map is a genuine softmax weight; only the inputs are toy.
// Deterministic. Erasable-syntax only.

/** Numerically stable softmax over a row. */
export function softmax(row: number[]): number[] {
  const max = Math.max(...row);
  const exps = row.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Scaled dot-product self-attention with the token vectors used directly as
 *  queries and keys (a transparent single head; Wq=Wk=I). Returns the full
 *  attention matrix A where A[i][j] = how much token i attends to token j,
 *  each row a probability distribution summing to 1. */
export function selfAttention(X: number[][]): number[][] {
  const n = X.length;
  const d = X[0].length;
  const scale = Math.sqrt(d);
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const logits: number[] = [];
    for (let j = 0; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < d; k++) dot += X[i][k] * X[j][k];
      logits.push(dot / scale);
    }
    A.push(softmax(logits));
  }
  return A;
}

/** The context vector each position produces: A · X (attention-weighted sum). */
export function contextVectors(X: number[][], A: number[][]): number[][] {
  const n = X.length;
  const d = X[0].length;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const c = new Array(d).fill(0);
    for (let j = 0; j < n; j++) for (let k = 0; k < d; k++) c[k] += A[i][j] * X[j][k];
    out.push(c);
  }
  return out;
}

export type Example = { id: string; tokens: string[]; X: number[][]; note: string };

// ---- curated example sentences (illustrative token vectors) ----
// Feature axes (hand-chosen so dot-products reflect real relatedness):
// [animate, object, action, referent-of-it, place, descriptor, function-word]
const V = (a: number[]): number[] => a;

export const EXAMPLES: Example[] = [
  {
    id: "coref",
    // The classic coreference case: "it" should attend to "animal", not "street".
    tokens: ["The", "animal", "crossed", "the", "road", "because", "it", "was", "tired"],
    X: [
      V([0, 0, 0, 0, 0, 0, 1]), // The
      V([1.0, 0.2, 0, 1.1, 0, 0, 0]), // animal (animate; the referent)
      V([0, 0, 1.0, 0, 0, 0.2, 0]), // crossed (action)
      V([0, 0, 0, 0, 0, 0, 1]), // the
      V([0.1, 1.0, 0, 0.3, 0.6, 0, 0]), // road (object/place)
      V([0, 0, 0, 0, 0, 0, 1]), // because
      V([0.9, 0.1, 0, 1.1, 0, 0, 0.1]), // it (points at the referent axis)
      V([0, 0, 0.3, 0, 0, 0, 0.6]), // was
      V([0.6, 0, 0, 0.2, 0, 1.0, 0]), // tired (descriptor of the animate one)
    ],
    note: "Hover “it” — attention leans on “animal”, the noun it refers to.",
  },
  {
    id: "adj",
    tokens: ["a", "hot", "cup", "of", "black", "coffee"],
    X: [
      V([0, 0, 0, 0, 1]), // a (function)
      V([0.2, 0, 1.0, 0, 0]), // hot (descriptor→cup)
      V([1.0, 0.1, 0.3, 0, 0]), // cup (noun)
      V([0, 0, 0, 0, 1]), // of
      V([0.2, 0, 0, 1.0, 0]), // black (descriptor→coffee)
      V([0.1, 1.0, 0, 0.3, 0]), // coffee (noun)
    ],
    note: "Adjectives “hot” and “black” attend to the nouns they modify.",
  },
  {
    id: "verb",
    tokens: ["the", "cat", "chased", "the", "mouse"],
    X: [
      V([0, 0, 0, 1]), // the
      V([1.0, 0.9, 0.1, 0]), // cat (subject)
      V([0.7, 0.7, 1.0, 0]), // chased (verb links subject & object)
      V([0, 0, 0, 1]), // the
      V([1.0, 0.9, 0.1, 0]), // mouse (object; noun-like as cat)
    ],
    note: "The verb “chased” attends to both its subject and object.",
  },
];

export function exampleById(id: string): Example | undefined {
  return EXAMPLES.find((e) => e.id === id);
}
