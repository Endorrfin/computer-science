// Engine for the `knn-toy` micro (ch.33): k-nearest-neighbours, the simplest
// "learning" that isn't learning at all — it just memorizes the training set
// and votes among the k closest points at query time. A foil to the MLP: no
// training, no parameters, but the decision regions get jagged and it degrades
// in high dimensions. Deterministic. Erasable-syntax only.
import type { Point } from "./datasets.ts";

function dist2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

export type Vote = { label: number; votes: number[]; neighbors: number[] };

/** Classify a query point by majority vote of its k nearest neighbours.
 *  Ties (possible when k is even) break toward label 0 deterministically. */
export function classify(train: Point[], query: number[], k: number): Vote {
  const idx = train.map((p, i) => ({ i, d: dist2(p.x, query) }));
  idx.sort((a, b) => a.d - b.d || a.i - b.i);
  const kk = Math.max(1, Math.min(k, train.length));
  const neighbors = idx.slice(0, kk).map((o) => o.i);
  const votes = [0, 0];
  for (const ni of neighbors) votes[train[ni].y]++;
  return { label: votes[1] > votes[0] ? 1 : 0, votes, neighbors };
}

/** Grid of predicted labels over the plane — the class-region map. */
export function regionField(train: Point[], res: number, bound: number, k: number): number[][] {
  const grid: number[][] = [];
  for (let gy = 0; gy < res; gy++) {
    const row: number[] = [];
    const y = bound - (2 * bound * gy) / (res - 1);
    for (let gx = 0; gx < res; gx++) {
      const x = -bound + (2 * bound * gx) / (res - 1);
      row.push(classify(train, [x, y], k).label);
    }
    grid.push(row);
  }
  return grid;
}

/** Leave-one-out accuracy on the training set — shows why very small k
 *  overfits (k=1 memorizes) and large k oversmooths. */
export function looAccuracy(train: Point[], k: number): number {
  let correct = 0;
  for (let q = 0; q < train.length; q++) {
    const idx = train
      .map((p, i) => ({ i, d: dist2(p.x, train[q].x) }))
      .filter((o) => o.i !== q)
      .sort((a, b) => a.d - b.d || a.i - b.i);
    const kk = Math.max(1, Math.min(k, idx.length));
    const votes = [0, 0];
    for (let n = 0; n < kk; n++) votes[train[idx[n].i].y]++;
    const label = votes[1] > votes[0] ? 1 : 0;
    if (label === train[q].y) correct++;
  }
  return correct / train.length;
}
