// ch.33 · Machine learning — engine checks (MLP backprop · datasets · gradient
// descent · kNN). The truth-first bar: the neural net's gradients are finite-
// difference-checked, XOR is learned, and the P10 boss (spiral ≥95% within a
// ≤3-layer budget) is proven winnable across seeds. Deterministic (seeded).
// Run: node --experimental-strip-types scripts/test-ch33.ts
import {
  makeNet, computeGrads, trainBatch, trainEpoch, accuracy, loss, predictProba, decisionField,
} from "../src/components/sims/ml/mlp.ts";
import { makeDataset, trainTestSplit, expand } from "../src/components/sims/ml/datasets.ts";
import { makeRng } from "../src/components/sims/ml/rng.ts";
import { descend, STABLE_LR, lossAt, gradAt } from "../src/components/sims/ml/gd.ts";
import { classify, regionField, looAccuracy } from "../src/components/sims/ml/knn.ts";

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

// ===================== (A) backprop gradient check =====================
{
  console.log("mlp · finite-difference gradient check:");
  const net = makeNet([2, 5, 4, 1], "tanh", 3);
  const ds = makeDataset({ kind: "spiral", n: 40, seed: 1 });
  const X = ds.map((p) => p.x); const Y = ds.map((p) => p.y);
  const { gW } = computeGrads(net, X, Y, 0);
  let maxErr = 0;
  for (let l = 0; l < net.W.length; l++)
    for (let i = 0; i < net.W[l].length; i++)
      for (let j = 0; j < net.W[l][i].length; j++) {
        const e = 1e-5; const orig = net.W[l][i][j];
        net.W[l][i][j] = orig + e; const lp = loss(net, X, Y);
        net.W[l][i][j] = orig - e; const lm = loss(net, X, Y);
        net.W[l][i][j] = orig;
        maxErr = Math.max(maxErr, Math.abs((lp - lm) / (2 * e) - gW[l][i][j]));
      }
  ok(`analytic gradient matches numeric (max err ${maxErr.toExponential(1)} < 1e-6)`, maxErr < 1e-6);

  // ReLU too (subgradient; check off the kinks)
  const rnet = makeNet([2, 6, 1], "relu", 5);
  const g2 = computeGrads(rnet, X, Y, 0).gW;
  let e2 = 0;
  for (let i = 0; i < rnet.W[0].length; i++) for (let j = 0; j < rnet.W[0][i].length; j++) {
    const h = 1e-5; const o = rnet.W[0][i][j];
    rnet.W[0][i][j] = o + h; const lp = loss(rnet, X, Y);
    rnet.W[0][i][j] = o - h; const lm = loss(rnet, X, Y);
    rnet.W[0][i][j] = o; e2 = Math.max(e2, Math.abs((lp - lm) / (2 * h) - g2[0][i][j]));
  }
  ok(`relu gradient matches numeric (max err ${e2.toExponential(1)} < 1e-5)`, e2 < 1e-5);
}

// ===================== (B) learning: XOR & a step decreases loss =====================
{
  console.log("mlp · learns XOR (the non-linearly-separable classic):");
  const xn = makeNet([2, 4, 1], "tanh", 2);
  const XX = [[0, 0], [0, 1], [1, 0], [1, 1]]; const XY = [0, 1, 1, 0];
  const before = loss(xn, XX, XY);
  for (let e = 0; e < 3000; e++) trainBatch(xn, XX, XY, 0.5, 0);
  const after = loss(xn, XX, XY);
  ok("a training run reduces loss", after < before);
  eq("XOR solved to 100% accuracy", accuracy(xn, XX, XY), 1);
  ok("predictions are calibrated (1,0 → ~1)", predictProba(xn, [1, 0]) > 0.9);
  ok("predictions are calibrated (1,1 → ~0)", predictProba(xn, [1, 1]) < 0.1);
}

// ===================== (C) the P10 boss is winnable =====================
function spiralRun(arch: number[], feats: string[] | null, epochs: number, lr: number, seed: number): number {
  const data = makeDataset({ kind: "spiral", n: 240, noise: 0.08, seed });
  const tf = feats ? (v: number[]) => expand(v, feats as never) : (v: number[]) => v;
  const { train, test } = trainTestSplit(data, 0.3, seed + 100);
  const Xtr = train.map((p) => tf(p.x)); const Ytr = train.map((p) => p.y);
  const Xte = test.map((p) => tf(p.x)); const Yte = test.map((p) => p.y);
  const net = makeNet(arch, "tanh", seed * 7 + 1); const rng = makeRng(seed + 9);
  for (let e = 0; e < epochs; e++) trainEpoch(net, Xtr, Ytr, { lr, l2: 1e-4, batch: 32, rng });
  return accuracy(net, Xte, Yte);
}
{
  console.log("boss-p10 · ‘train to 95% on the spiral, ≤3 layers’ is winnable:");
  const N = 16;
  // Path 1: three raw hidden layers.
  const raw: number[] = [];
  for (let s = 0; s < N; s++) raw.push(spiralRun([2, 16, 16, 8, 1], null, 500, 0.15, s));
  const rawMean = raw.reduce((a, b) => a + b, 0) / N;
  const rawHits = raw.filter((a) => a >= 0.95).length;
  ok(`3 raw hidden layers: mean ${rawMean.toFixed(3)} ≥ 0.95`, rawMean >= 0.95);
  ok(`3 raw hidden layers: ${rawHits}/${N} seeds hit ≥95%`, rawHits >= N - 5);
  // Path 2: two hidden layers + engineered features (feature-engineering beats depth).
  const F = ["x1", "x2", "x1^2", "x2^2", "x1*x2"];
  const feat: number[] = [];
  for (let s = 0; s < 12; s++) feat.push(spiralRun([5, 20, 12, 1], F, 800, 0.05, s));
  const featHits = feat.filter((a) => a >= 0.95).length;
  ok(`2 layers + features: ${featHits}/12 seeds hit ≥95% (features can replace depth)`, featHits >= 9);
}

// ===================== (D) decision field & linear separability =====================
{
  console.log("mlp · a trained net draws a sensible boundary:");
  const lin = makeDataset({ kind: "linear", n: 160, seed: 4 });
  const X = lin.map((p) => p.x); const Y = lin.map((p) => p.y);
  const net = makeNet([2, 4, 1], "tanh", 1); const rng = makeRng(2);
  for (let e = 0; e < 200; e++) trainEpoch(net, X, Y, { lr: 0.2, l2: 1e-4, batch: 16, rng });
  ok("linear data is learned to ≥95%", accuracy(net, X, Y) >= 0.95);
  const field = decisionField(net, 20, 1.2);
  eq("decision field is a 20×20 grid", [field.length, field[0].length], [20, 20]);
  ok("field values are probabilities in [0,1]", field.every((r) => r.every((v) => v >= 0 && v <= 1)));
}

// ===================== (E) gradient descent: the learning-rate lesson =====================
{
  console.log("gradient-bowl · lr controls converge / oscillate / explode:");
  eq("∇L(1,1) = (1, κ)", gradAt(1, 1), [1, 6]);
  ok("loss at the minimum is 0", lossAt(0, 0) === 0);
  eq("small lr converges", descend([1.5, 1.2], 0.1, 300).outcome, "converge");
  eq("lr just below 2/κ oscillates but survives", descend([1.5, 1.2], STABLE_LR * 0.999, 200).outcome, "oscillate");
  eq("lr above 2/κ explodes", descend([1.5, 1.2], STABLE_LR * 1.2, 200).outcome, "explode");
  const conv = descend([1.5, 1.2], 0.1, 300).path;
  ok("converging loss is monotone-ish and → 0", conv[conv.length - 1].loss < 1e-3);
}

// ===================== (F) kNN: memorize vs smooth =====================
{
  console.log("knn-toy · k trades memorization for smoothing:");
  const data = makeDataset({ kind: "circle", n: 120, seed: 5 });
  const field = regionField(data, 16, 1.2, 5);
  eq("region field is 16×16 of labels", [field.length, field[0].length], [16, 16]);
  ok("labels are 0/1", field.every((r) => r.every((v) => v === 0 || v === 1)));
  ok("k=1 memorizes the training set (LOO high)", looAccuracy(data, 1) >= 0.9);
  const c = classify(data, [0, 0], 5);
  ok("centre of the circle classifies via 5 neighbours", c.votes[0] + c.votes[1] === 5);
  ok("very large k oversmooths (LOO drops vs k=1)", looAccuracy(data, 41) < looAccuracy(data, 1));
}

console.log(failed === 0 ? "\n✓ ch.33 ML engines: all checks pass" : `\n✗ ch.33: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
