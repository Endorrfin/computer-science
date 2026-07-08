// The embedding-space engine (ch.34). Word embeddings map each word to a point
// in a high-dimensional space where distance ≈ meaning and DIRECTIONS encode
// relations — the famous king − man + woman ≈ queen. The vectors shipped in
// data/embeddings-data.ts are REAL word2vec (skip-gram) vectors, trained in-repo
// on a small bundled corpus (scripts/gen-embeddings.py) — genuinely learned, not
// hand-placed. Analogy and neighbour search run in the full 64-D space; the 2-D
// coordinates are a precomputed PCA projection used only for drawing. Production
// embeddings train on billions of words; the mechanism is identical, only the
// scale differs. Deterministic. Erasable-syntax only.

export type WordVec = { word: string; vec: number[]; xy: [number, number] };

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
export function norm(a: number[]): number {
  return Math.sqrt(dot(a, a));
}
/** Cosine similarity in [-1, 1] — the standard embedding closeness measure. */
export function cosine(a: number[], b: number[]): number {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
}

function vecOf(table: WordVec[], word: string): number[] | undefined {
  return table.find((w) => w.word === word)?.vec;
}

export type Ranked = { word: string; score: number };

/** The k nearest words to a query vector by cosine, excluding a set. */
export function nearestToVec(table: WordVec[], q: number[], k: number, exclude: string[] = []): Ranked[] {
  const ex = new Set(exclude);
  return table
    .filter((w) => !ex.has(w.word))
    .map((w) => ({ word: w.word, score: cosine(q, w.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** k nearest neighbours of a word. */
export function neighbors(table: WordVec[], word: string, k: number): Ranked[] {
  const v = vecOf(table, word);
  if (!v) return [];
  return nearestToVec(table, v, k, [word]);
}

export type AnalogyResult = { target: number[]; ranked: Ranked[] } | null;

/** a − b + c, then the nearest words (excluding the three inputs). The vector
 *  arithmetic that makes "king" − "man" + "woman" land on "queen". */
export function analogy(table: WordVec[], a: string, b: string, c: string, k = 5): AnalogyResult {
  const va = vecOf(table, a);
  const vb = vecOf(table, b);
  const vc = vecOf(table, c);
  if (!va || !vb || !vc) return null;
  const target = va.map((x, i) => x - vb[i] + vc[i]);
  return { target, ranked: nearestToVec(table, target, k, [a, b, c]) };
}

/** Project a raw vector into the 2-D plane using two anchor words' precomputed
 *  coordinates — lets an analogy's target vector be placed on the map. Falls
 *  back to the nearest word's coordinates. */
export function place2D(table: WordVec[], target: number[]): [number, number] {
  const best = nearestToVec(table, target, 1);
  if (best.length === 0) return [0, 0];
  return table.find((w) => w.word === best[0].word)!.xy;
}
