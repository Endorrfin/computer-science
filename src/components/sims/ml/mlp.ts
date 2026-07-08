// The neural-playground engine (ch.33 HERO): a from-scratch multilayer
// perceptron — real forward pass, real backpropagation, real gradient descent.
// No framework, no autograd: the chain rule is written out so the Node tests
// can finite-difference-check it. Binary classifier: tanh/relu hidden layers,
// a sigmoid output, binary cross-entropy loss. Seed-injectable init (rng.ts)
// keeps the app live-random but the tests deterministic. Erasable-syntax only.
import { makeRng } from "./rng.ts";
import type { Rng } from "./rng.ts";

export type Activation = "tanh" | "relu";

export type Net = {
  sizes: number[]; // [inputs, ...hidden, 1]
  W: number[][][]; // W[layer][in][out]
  b: number[][]; // b[layer][out]
  act: Activation;
};

function actFn(z: number, act: Activation): number {
  return act === "relu" ? Math.max(0, z) : Math.tanh(z);
}
/** f'(z) expressed purely from the activation value a = f(z):
 *  tanh'(z) = 1 − tanh(z)² = 1 − a²;  relu'(z) = [z>0] = [a>0] (a=0 when z≤0). */
function actDeriv(a: number, act: Activation): number {
  return act === "relu" ? (a > 0 ? 1 : 0) : 1 - a * a;
}
function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/** Build a net. Xavier (tanh) / He (relu) init scaled by fan-in, seeded. */
export function makeNet(sizes: number[], act: Activation, seed: number): Net {
  const rng = makeRng(seed);
  const W: number[][][] = [];
  const b: number[][] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const fanIn = sizes[l];
    const scale = Math.sqrt((act === "relu" ? 2 : 1) / fanIn);
    const w: number[][] = [];
    for (let i = 0; i < fanIn; i++) {
      const row: number[] = [];
      for (let j = 0; j < sizes[l + 1]; j++) row.push(rng.normal() * scale);
      w.push(row);
    }
    W.push(w);
    b.push(new Array(sizes[l + 1]).fill(0));
  }
  return { sizes, W, b, act };
}

type Cache = { A: number[][][]; out: number[] };

/** Forward pass over a batch (rows of X). Returns output probabilities and the
 *  layer activations A (A[0]=input … A[L]=output) needed for backprop. */
function forwardBatch(net: Net, X: number[][]): Cache {
  const L = net.W.length;
  const A: number[][][] = [X];
  let a = X;
  for (let l = 0; l < L; l++) {
    const wl = net.W[l];
    const bl = net.b[l];
    const inN = wl.length;
    const outN = bl.length;
    const next: number[][] = [];
    for (let r = 0; r < a.length; r++) {
      const ar = a[r];
      const row: number[] = new Array(outN);
      for (let j = 0; j < outN; j++) {
        let z = bl[j];
        for (let i = 0; i < inN; i++) z += ar[i] * wl[i][j];
        row[j] = l === L - 1 ? sigmoid(z) : actFn(z, net.act);
      }
      next.push(row);
    }
    A.push(next);
    a = next;
  }
  return { A, out: a.map((r) => r[0]) };
}

export type Grads = { gW: number[][][]; gb: number[][]; loss: number };

/** Backpropagation: the analytic gradient of mean BCE (+ L2 on weights) w.r.t.
 *  every weight and bias. Pure — no mutation — so the Node test can finite-
 *  difference-check it. dz starts as (ŷ−y)/m, the clean BCE∘sigmoid gradient. */
export function computeGrads(net: Net, X: number[][], y: number[], l2: number): Grads {
  const L = net.W.length;
  const { A, out } = forwardBatch(net, X);
  const m = X.length;
  const gW: number[][][] = new Array(L);
  const gb: number[][] = new Array(L);

  let dz: number[][] = out.map((o, r) => [(o - y[r]) / m]);

  for (let l = L - 1; l >= 0; l--) {
    const aPrev = A[l]; // m × in  (activations feeding layer l)
    const wl = net.W[l];
    const inN = wl.length;
    const outN = net.b[l].length;

    // gW = aPrevᵀ · dz  (+ L2·W);  gb = Σ dz
    const gWl: number[][] = [];
    for (let i = 0; i < inN; i++) {
      const grow: number[] = new Array(outN).fill(0);
      for (let r = 0; r < m; r++) {
        const av = aPrev[r][i];
        const dr = dz[r];
        for (let j = 0; j < outN; j++) grow[j] += av * dr[j];
      }
      for (let j = 0; j < outN; j++) grow[j] += l2 * wl[i][j];
      gWl.push(grow);
    }
    const gbl: number[] = new Array(outN).fill(0);
    for (let r = 0; r < m; r++) for (let j = 0; j < outN; j++) gbl[j] += dz[r][j];
    gW[l] = gWl;
    gb[l] = gbl;

    // propagate to the previous layer (chain rule through f').
    // dz_new = (dz · Wᵀ) ⊙ f'(z_{l-1}), and f'(z_{l-1}) reads off a_l = A[l].
    if (l > 0) {
      const aCur = A[l];
      const next: number[][] = [];
      for (let r = 0; r < m; r++) {
        const da: number[] = new Array(inN).fill(0);
        const dr = dz[r];
        for (let i = 0; i < inN; i++) {
          let s = 0;
          for (let j = 0; j < outN; j++) s += dr[j] * wl[i][j];
          da[i] = s * actDeriv(aCur[r][i], net.act);
        }
        next.push(da);
      }
      dz = next;
    }
  }
  return { gW, gb, loss: bceOf(out, y) };
}

/** One gradient-descent update on a batch. Mutates net; returns batch loss. */
export function trainBatch(net: Net, X: number[][], y: number[], lr: number, l2: number): number {
  const { gW, gb, loss: batchLoss } = computeGrads(net, X, y, l2);
  for (let l = 0; l < net.W.length; l++) {
    const inN = net.W[l].length;
    const outN = net.b[l].length;
    for (let i = 0; i < inN; i++) for (let j = 0; j < outN; j++) net.W[l][i][j] -= lr * gW[l][i][j];
    for (let j = 0; j < outN; j++) net.b[l][j] -= lr * gb[l][j];
  }
  return batchLoss;
}

function bceOf(out: number[], y: number[]): number {
  const eps = 1e-9;
  let s = 0;
  for (let i = 0; i < out.length; i++) s += -(y[i] * Math.log(out[i] + eps) + (1 - y[i]) * Math.log(1 - out[i] + eps));
  return s / out.length;
}

export type TrainOpts = { lr: number; l2: number; batch: number; rng: Rng };

/** One full pass over the data in mini-batches (shuffled by the injected rng).
 *  Returns the mean loss across batches — one point on the loss curve. */
export function trainEpoch(net: Net, X: number[][], y: number[], opts: TrainOpts): number {
  const n = X.length;
  const order: number[] = [];
  for (let i = 0; i < n; i++) order.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = opts.rng.int(i + 1);
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  const bs = Math.max(1, Math.min(opts.batch, n));
  let loss = 0;
  let batches = 0;
  for (let s = 0; s < n; s += bs) {
    const idx = order.slice(s, s + bs);
    loss += trainBatch(net, idx.map((k) => X[k]), idx.map((k) => y[k]), opts.lr, opts.l2);
    batches++;
  }
  return loss / batches;
}

// ---------------------------- read-out helpers ----------------------------

export function predictProba(net: Net, x: number[]): number {
  return forwardBatch(net, [x]).out[0];
}

export function accuracy(net: Net, X: number[][], y: number[]): number {
  const { out } = forwardBatch(net, X);
  let correct = 0;
  for (let i = 0; i < out.length; i++) if ((out[i] > 0.5 ? 1 : 0) === y[i]) correct++;
  return correct / out.length;
}

export function loss(net: Net, X: number[][], y: number[]): number {
  return bceOf(forwardBatch(net, X).out, y);
}

/** Probability field over the plane for the boundary heat-map. `transform`
 *  maps a raw (x1,x2) grid cell into the net's feature space. */
export function decisionField(
  net: Net,
  res: number,
  bound: number,
  transform: (xy: number[]) => number[] = (v) => v,
): number[][] {
  const grid: number[][] = [];
  for (let gy = 0; gy < res; gy++) {
    const row: number[] = [];
    const y = bound - (2 * bound * gy) / (res - 1);
    for (let gx = 0; gx < res; gx++) {
      const x = -bound + (2 * bound * gx) / (res - 1);
      row.push(predictProba(net, transform([x, y])));
    }
    grid.push(row);
  }
  return grid;
}
