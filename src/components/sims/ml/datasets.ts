// 2D toy datasets for the neural-playground HERO + knn-toy (ch.33). Each point
// is (x1,x2) in roughly [-1,1]² with a binary label. Generators are seeded
// (via rng.ts) so a run reproduces when the seed is pinned. The spiral is the
// boss dataset: two interleaved arms that a linear boundary cannot separate.
// Erasable-syntax only.
import { makeRng, shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";

export type Point = { x: number[]; y: number };
export type DatasetKind = "linear" | "circle" | "xor" | "spiral";

export const DATASETS: { id: DatasetKind; label: string; hint: string }[] = [
  { id: "linear", label: "Linear", hint: "one straight boundary separates them" },
  { id: "circle", label: "Circle", hint: "one class ringed by the other" },
  { id: "xor", label: "XOR", hint: "diagonal quadrants — not linearly separable" },
  { id: "spiral", label: "Spiral", hint: "two interleaved arms — the boss" },
];

function jitter(rng: Rng, noise: number): number {
  return rng.normal() * noise;
}

/** Two Gaussian blobs either side of a slanted line. */
function makeLinear(n: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    const cx = c === 0 ? -0.5 : 0.5;
    const cy = c === 0 ? -0.4 : 0.4;
    pts.push({ x: [cx + jitter(rng, 0.16 + noise), cy + jitter(rng, 0.16 + noise)], y: c });
  }
  return pts;
}

/** Inner disk (class 1) inside an outer ring (class 0). */
function makeCircle(n: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    const r = c === 0 ? 0.75 + jitter(rng, 0.12 + noise) : 0.28 * rng.next() + jitter(rng, noise);
    const t = rng.next() * 2 * Math.PI;
    pts.push({ x: [r * Math.cos(t), r * Math.sin(t)], y: c });
  }
  return pts;
}

/** Diagonal quadrants: class 1 where x1·x2 > 0. */
function makeXor(n: number, noise: number, rng: Rng): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x1 = rng.next() * 1.8 - 0.9 + jitter(rng, noise);
    const x2 = rng.next() * 1.8 - 0.9 + jitter(rng, noise);
    pts.push({ x: [x1, x2], y: x1 * x2 > 0 ? 1 : 0 });
  }
  return pts;
}

/** Two interleaved spiral arms — the classic hard, non-linear dataset. */
function makeSpiral(n: number, noise: number, rng: Rng, turns = 2.0): Point[] {
  const perArm = Math.floor(n / 2);
  const pts: Point[] = [];
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < perArm; i++) {
      const r = (i + 1) / perArm; // 0..1
      const t = c * Math.PI + r * turns * Math.PI + jitter(rng, noise);
      pts.push({ x: [r * Math.cos(t), r * Math.sin(t)], y: c });
    }
  }
  return pts;
}

export type GenOpts = { kind: DatasetKind; n?: number; noise?: number; seed: number };

/** Generate a labeled, shuffled dataset. Defaults match the tuned playground. */
export function makeDataset(opts: GenOpts): Point[] {
  const { kind, seed } = opts;
  const n = opts.n ?? 240;
  const noise = opts.noise ?? 0.08;
  const rng = makeRng(seed);
  let pts: Point[];
  if (kind === "linear") pts = makeLinear(n, noise, rng);
  else if (kind === "circle") pts = makeCircle(n, noise, rng);
  else if (kind === "xor") pts = makeXor(n, noise, rng);
  else pts = makeSpiral(n, noise, rng);
  return shuffle(pts, rng);
}

/** Deterministic train/test split (the discipline ch.33 is about). */
export function trainTestSplit(
  pts: Point[],
  testFrac: number,
  seed: number,
): { train: Point[]; test: Point[] } {
  const idx = shuffle(
    pts.map((_, i) => i),
    makeRng(seed),
  );
  const cut = Math.floor(pts.length * (1 - testFrac));
  const train: Point[] = [];
  const test: Point[] = [];
  idx.forEach((i, k) => (k < cut ? train : test).push(pts[i]));
  return { train, test };
}

// ---- input feature expansion (a real lever: engineering beats depth) ----
export const FEATURE_IDS = ["x1", "x2", "x1^2", "x2^2", "x1*x2"] as const;
export type FeatureId = (typeof FEATURE_IDS)[number];

/** Map raw (x1,x2) → the selected feature vector. `x1`,`x2` are always safe
 *  defaults; adding x1²,x2²,x1·x2 makes the circle/xor/spiral far easier —
 *  the classic lesson that good features can replace network depth. */
export function expand(x: number[], feats: FeatureId[]): number[] {
  const [x1, x2] = x;
  return feats.map((f) => {
    if (f === "x1") return x1;
    if (f === "x2") return x2;
    if (f === "x1^2") return x1 * x1;
    if (f === "x2^2") return x2 * x2;
    return x1 * x2;
  });
}
