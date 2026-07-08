// [HERO] neural-playground (ch.33) — the crown jewel: a from-scratch MLP you
// build and train, TensorFlow-Playground style. Pick a dataset, wire input
// features and hidden layers, choose an activation and a learning rate, then
// hit play and watch real backprop (mlp.ts) carve a decision boundary out of
// the plane while the loss curve falls. Every number is honest — the net, the
// gradients, the train/test split (datasets.ts), the RNG (rng.ts) — nothing is
// faked for show. Seeded from liveSeed() so runs genuinely differ: a 🎲 reseed
// button makes the point that initialization matters.
//   BOSS (Model Tamer 🧠) — the spiral is the hard one. Reach ≥95% *test*
// accuracy with ≤3 hidden layers and markChallengeDone("boss-p10") fires. Two
// honest routes both work: 2 layers with engineered features (x², x·y), or 3
// raw layers. The engine is finite-difference-tested, so both really converge.
// One SimShell; its transport drives training (play/pause/step/speed). Reduced
// motion → auto-play is disabled and Step trains exactly one epoch. Prefix: np-.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx, clamp, useReducedMotion } from "../../../lib/utils.ts";
import {
  DATASETS,
  makeDataset,
  trainTestSplit,
  FEATURE_IDS,
  expand,
  type DatasetKind,
  type FeatureId,
  type Point,
} from "./datasets.ts";
import {
  makeNet,
  trainEpoch,
  accuracy,
  loss as netLoss,
  decisionField,
  type Activation,
  type Net,
} from "./mlp.ts";
import { makeRng, liveSeed, type Rng } from "./rng.ts";
import "../../../theme/_p10css/neural-playground.css";

const ACCENT = "#A78BFA"; // P10 accent

// ---- fixed engine knobs (not exposed as UI; the tuned defaults) ----
const N_POINTS = 240;
const NOISE = 0.08;
const TEST_FRAC = 0.25;
const DATA_SEED = 1337; // dataset generation is pinned; only the *net* reseeds
const SPLIT_SEED = 7; // deterministic split — the discipline ch.33 teaches
const L2 = 1e-4;
const BATCH = 16;
const FIELD_RES = 40; // decision-field grid resolution
const BOUND = 1.1; // plot extent: [-1.1, 1.1]²
const FIELD_EVERY = 3; // recompute the boundary every N epochs (perf)
const BASE_TPS = 3; // ticks/sec at speed 1× before reduced-motion gating

// The two class colours for the diverging heat-map / dots.
const C0 = "var(--sem-data)"; // class 0 — cyan
const C1 = "var(--accent)"; // class 1 — violet (P10)

const LR_PRESETS = [0.01, 0.03, 0.1, 0.3] as const;
const MAX_HIDDEN = 3;
const MIN_WIDTH = 2;
const MAX_WIDTH = 16;
const BOSS_ID = "boss-p10";

const ACTS: readonly { id: Activation; label: string }[] = [
  { id: "tanh", label: "tanh" },
  { id: "relu", label: "ReLU" },
];

// Human-readable feature chip labels (aria + display).
const FEAT_LABEL: Record<FeatureId, string> = {
  x1: "x₁",
  x2: "x₂",
  "x1^2": "x₁²",
  "x2^2": "x₂²",
  "x1*x2": "x₁·x₂",
};

type Metrics = { epoch: number; trainAcc: number; testAcc: number; loss: number };
const ZERO: Metrics = { epoch: 0, trainAcc: 0, testAcc: 0, loss: 1 };

export default function NeuralPlayground() {
  const reduced = useReducedMotion();
  const done = useChallengesDone();
  const bossAlready = done.has(BOSS_ID);

  // ---- architecture / data controls ----
  const [dataset, setDataset] = useState<DatasetKind>("circle");
  const [feats, setFeats] = useState<FeatureId[]>(["x1", "x2"]);
  const [hidden, setHidden] = useState<number[]>([4, 4]); // one width per hidden layer
  const [act, setAct] = useState<Activation>("tanh");
  const [lr, setLr] = useState<number>(0.1);

  // ---- transport ----
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // ---- live training state (kept in refs; setState bumps drive re-renders) ----
  const netRef = useRef<Net | null>(null);
  const rngRef = useRef<Rng | null>(null);
  const epochRef = useRef(0); // authoritative epoch counter (no stale closure)
  const [seed, setSeed] = useState<number>(() => liveSeed());
  const [metrics, setMetrics] = useState<Metrics>(ZERO);
  const [field, setField] = useState<number[][] | null>(null);
  const [lossHist, setLossHist] = useState<number[]>([]);

  // Boss: latch the winning snapshot the first time the condition is met.
  const [bossJustWon, setBossJustWon] = useState<Metrics | null>(null);

  // ---- data (regenerates only when the dataset kind changes) ----
  const points = useMemo<Point[]>(
    () => makeDataset({ kind: dataset, n: N_POINTS, noise: NOISE, seed: DATA_SEED }),
    [dataset],
  );
  const split = useMemo(() => trainTestSplit(points, TEST_FRAC, SPLIT_SEED), [points]);

  // Feature-expanded matrices fed to the net (recompute when features change).
  const Xtrain = useMemo(() => split.train.map((p) => expand(p.x, feats)), [split, feats]);
  const Ytrain = useMemo(() => split.train.map((p) => p.y), [split]);
  const Xtest = useMemo(() => split.test.map((p) => expand(p.x, feats)), [split, feats]);
  const Ytest = useMemo(() => split.test.map((p) => p.y), [split]);

  const featCount = feats.length;
  const hiddenCount = hidden.length;
  const sizes = useMemo(() => [featCount, ...hidden, 1], [featCount, hidden]);
  // grid transform: >2 features means the plane must be lifted into feature space
  const transform = useMemo(
    () => (featCount > 2 ? (xy: number[]) => expand(xy, feats) : undefined),
    [featCount, feats],
  );

  // ---- (re)build the net from scratch ----
  const rebuild = useCallback(
    (nextSeed: number) => {
      const net = makeNet(sizes, act, nextSeed);
      netRef.current = net;
      rngRef.current = makeRng(nextSeed ^ 0x9e3779b9); // independent shuffle stream
      epochRef.current = 0;
      const m: Metrics = {
        epoch: 0,
        trainAcc: accuracy(net, Xtrain, Ytrain),
        testAcc: accuracy(net, Xtest, Ytest),
        loss: netLoss(net, Xtrain, Ytrain),
      };
      setMetrics(m);
      setLossHist([m.loss]);
      setField(decisionField(net, FIELD_RES, BOUND, transform));
      setBossJustWon(null);
    },
    [sizes, act, Xtrain, Ytrain, Xtest, Ytest, transform],
  );

  // Any structural change (dataset / features / layers / activation / seed)
  // rebuilds and pauses. rebuild's identity already tracks the deps that matter.
  useEffect(() => {
    setRunning(false);
    rebuild(seed);
  }, [rebuild, seed]);

  // ---- one training epoch (the tick body) ----
  const step = useCallback(() => {
    const net = netRef.current;
    const rng = rngRef.current;
    if (!net || !rng) return;
    const trLoss = trainEpoch(net, Xtrain, Ytrain, { lr, l2: L2, batch: BATCH, rng });
    epochRef.current += 1;
    const epoch = epochRef.current;
    const trainAcc = accuracy(net, Xtrain, Ytrain);
    const testAcc = accuracy(net, Xtest, Ytest);
    const m: Metrics = { epoch, trainAcc, testAcc, loss: trLoss };
    setMetrics(m);
    setLossHist((h) => {
      const next = h.concat(trLoss);
      return next.length > 400 ? next.slice(next.length - 400) : next;
    });
    if (epoch % FIELD_EVERY === 0) {
      setField(decisionField(net, FIELD_RES, BOUND, transform));
    }
    // Boss check — after each epoch, on the spiral, within the layer budget.
    if (
      dataset === "spiral" &&
      hiddenCount <= MAX_HIDDEN &&
      testAcc >= 0.95 &&
      !bossAlready &&
      bossJustWon === null
    ) {
      markChallengeDone(BOSS_ID);
      setBossJustWon(m);
      setRunning(false);
    }
  }, [Xtrain, Ytrain, Xtest, Ytest, lr, transform, dataset, hiddenCount, bossAlready, bossJustWon]);

  // ---- the clock: speed multiplies ticks/sec (auto-play only, gated by RM) ----
  useSimClock(running && !reduced, BASE_TPS * speed, () => step());

  function onToggle(): void {
    if (reduced) return;
    setRunning((r) => !r);
  }
  function onStep(): void {
    setRunning(false);
    step();
  }
  function onReset(): void {
    setRunning(false);
    setSeed(liveSeed()); // fresh init on reset → triggers rebuild
  }
  function reseed(): void {
    setRunning(false);
    setSeed(liveSeed());
  }

  // ---- feature toggles (at least one feature must remain) ----
  function toggleFeat(id: FeatureId): void {
    setFeats((cur) => {
      const on = cur.includes(id);
      if (on) {
        if (cur.length <= 1) return cur; // keep ≥1
        return cur.filter((f) => f !== id);
      }
      // preserve canonical FEATURE_IDS order for a stable expand() layout
      return FEATURE_IDS.filter((f) => f === id || cur.includes(f));
    });
  }

  // ---- layer editing ----
  function addLayer(): void {
    setHidden((h) => (h.length >= MAX_HIDDEN ? h : h.concat(4)));
  }
  function removeLayer(): void {
    setHidden((h) => (h.length <= 0 ? h : h.slice(0, -1)));
  }
  function setWidth(i: number, w: number): void {
    setHidden((h) => h.map((v, k) => (k === i ? clamp(w, MIN_WIDTH, MAX_WIDTH) : v)));
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const status = `epoch ${metrics.epoch} · train ${pct(metrics.trainAcc)} · test ${pct(
    metrics.testAcc,
  )} · loss ${metrics.loss.toFixed(3)}`;

  const bossWon = bossAlready || bossJustWon !== null;

  return (
    <SimShell
      title="Neural playground — build a net, train it, watch the boundary bend"
      simKey="neural-playground"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="np-ctl">
          <label className="ss-field np-field">
            data
            <select
              aria-label="Dataset"
              value={dataset}
              onChange={(e) => setDataset(e.target.value as DatasetKind)}
            >
              {DATASETS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <span className="np-field np-actseg" role="group" aria-label="Activation">
            <span className="np-field-lbl" aria-hidden="true">
              activation
            </span>
            <span className="bit-seg">
              {ACTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={cx("bit-segbtn", act === a.id && "on")}
                  onClick={() => setAct(a.id)}
                  aria-pressed={act === a.id}
                >
                  {a.label}
                </button>
              ))}
            </span>
          </span>

          <label className="ss-field np-field">
            learning rate
            <select
              aria-label="Learning rate"
              value={lr}
              onChange={(e) => setLr(Number(e.target.value))}
            >
              {LR_PRESETS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn np-reseed"
            onClick={reseed}
            title="Fresh random weights — initialization matters"
            aria-label="Reseed the network with fresh random weights"
          >
            🎲 reseed
          </button>
        </div>
      }
      footer={
        <Explainer
          dataset={dataset}
          feats={feats}
          hiddenCount={hiddenCount}
          metrics={metrics}
          bossWon={bossWon}
          bossJustWon={bossJustWon}
          bossAlready={bossAlready}
        />
      }
    >
      <div className="np-stage">
        <div className="np-left">
          <FeaturePicker feats={feats} onToggle={toggleFeat} />
          <LayerColumn
            hidden={hidden}
            onAdd={addLayer}
            onRemove={removeLayer}
            onWidth={setWidth}
          />
        </div>

        <div className="np-center">
          <BoundaryPlot
            field={field}
            train={split.train}
            test={split.test}
          />
          <LossCurve hist={lossHist} />
        </div>

        <div className="np-right">
          <Readout metrics={metrics} pct={pct} act={act} sizes={sizes} />
          {dataset === "spiral" && (
            <BossBanner bossWon={bossWon} bossJustWon={bossJustWon} hiddenCount={hiddenCount} />
          )}
        </div>
      </div>
    </SimShell>
  );
}

// ===========================================================================
// LEFT RAIL — input features + hidden-layer column
// ===========================================================================
function FeaturePicker({
  feats,
  onToggle,
}: {
  feats: FeatureId[];
  onToggle: (id: FeatureId) => void;
}) {
  const soloId = feats.length === 1 ? feats[0] : null;
  return (
    <section className="np-panel np-feats" aria-label="Input features">
      <div className="np-panel-head">
        <span className="np-panel-title">features</span>
        <span className="np-panel-sub">{feats.length} in</span>
      </div>
      <div className="np-chips" role="group" aria-label="Toggle input features">
        {FEATURE_IDS.map((id) => {
          const on = feats.includes(id);
          const locked = on && id === soloId; // last one standing
          return (
            <button
              key={id}
              type="button"
              className={cx("np-chip", on && "on", locked && "is-locked")}
              onClick={() => onToggle(id)}
              aria-pressed={on}
              disabled={locked}
              title={locked ? "at least one feature must stay on" : `feature ${FEAT_LABEL[id]}`}
              aria-label={`Feature ${FEAT_LABEL[id]}${on ? ", on" : ", off"}`}
            >
              {FEAT_LABEL[id]}
            </button>
          );
        })}
      </div>
      <p className="np-feats-note">
        Raw <code>x₁,x₂</code> alone force the net to bend space itself. Adding{" "}
        <code>x₁²,x₂²,x₁·x₂</code> hands it curvature for free — good features can replace depth.
      </p>
    </section>
  );
}

function LayerColumn({
  hidden,
  onAdd,
  onRemove,
  onWidth,
}: {
  hidden: number[];
  onAdd: () => void;
  onRemove: () => void;
  onWidth: (i: number, w: number) => void;
}) {
  return (
    <section className="np-panel np-layers" aria-label="Hidden layers">
      <div className="np-panel-head">
        <span className="np-panel-title">hidden layers</span>
        <span className="np-panel-sub">
          {hidden.length}/{MAX_HIDDEN}
        </span>
      </div>

      <div className="np-layerrow">
        <button
          type="button"
          className="btn np-lbtn"
          onClick={onRemove}
          disabled={hidden.length <= 0}
          aria-label="Remove a hidden layer"
          title="Remove a hidden layer"
        >
          −
        </button>
        <div className="np-layercols" role="list" aria-label="Hidden-layer stack">
          {hidden.length === 0 ? (
            <div className="np-nolayer" role="listitem">
              no hidden layers — a single linear boundary
            </div>
          ) : (
            hidden.map((w, i) => (
              <LayerCol key={i} index={i} width={w} onWidth={(nw) => onWidth(i, nw)} />
            ))
          )}
        </div>
        <button
          type="button"
          className="btn np-lbtn"
          onClick={onAdd}
          disabled={hidden.length >= MAX_HIDDEN}
          aria-label="Add a hidden layer"
          title="Add a hidden layer"
        >
          +
        </button>
      </div>
    </section>
  );
}

function LayerCol({
  index,
  width,
  onWidth,
}: {
  index: number;
  width: number;
  onWidth: (w: number) => void;
}) {
  // a little column of neuron dots (capped visually) + a width slider
  const dots = Array.from({ length: width }, (_, k) => k);
  return (
    <div className="np-layercol" role="listitem" aria-label={`Hidden layer ${index + 1}, ${width} neurons`}>
      <div className="np-neurons" aria-hidden="true">
        {dots.map((k) => (
          <span key={k} className="np-neuron" />
        ))}
      </div>
      <div className="np-widthrow">
        <button
          type="button"
          className="np-wbtn"
          onClick={() => onWidth(width - 1)}
          disabled={width <= MIN_WIDTH}
          aria-label={`Fewer neurons in layer ${index + 1}`}
        >
          −
        </button>
        <span className="np-wval" aria-hidden="true">
          {width}
        </span>
        <button
          type="button"
          className="np-wbtn"
          onClick={() => onWidth(width + 1)}
          disabled={width >= MAX_WIDTH}
          aria-label={`More neurons in layer ${index + 1}`}
        >
          +
        </button>
      </div>
      <input
        className="np-wrange"
        type="range"
        min={MIN_WIDTH}
        max={MAX_WIDTH}
        value={width}
        onChange={(e) => onWidth(Number(e.target.value))}
        aria-label={`Neurons in hidden layer ${index + 1}`}
      />
    </div>
  );
}

// ===========================================================================
// CENTER — decision-boundary heat-map + data, and the loss curve
// ===========================================================================
function BoundaryPlot({
  field,
  train,
  test,
}: {
  field: number[][] | null;
  train: Point[];
  test: Point[];
}) {
  const S = 300; // svg square in user units
  // map data coords [-BOUND,BOUND] → [0,S], y flipped (svg y grows down)
  const sx = (x: number) => ((x + BOUND) / (2 * BOUND)) * S;
  const sy = (y: number) => ((BOUND - y) / (2 * BOUND)) * S;

  const res = field ? field.length : 0;
  const cell = res > 0 ? S / res : S;

  return (
    <figure className="np-plotfig">
      <svg
        className="np-plot"
        viewBox={`0 0 ${S} ${S}`}
        width="100%"
        role="img"
        aria-label="Decision-boundary heat-map with training points (solid) and held-out test points (ringed)."
      >
        {/* heat-map: one rect per grid cell, colour by predicted probability */}
        <g className="np-heat">
          {field &&
            field.map((row, gy) =>
              row.map((p, gx) => (
                <rect
                  key={`${gx}-${gy}`}
                  x={gx * cell}
                  y={gy * cell}
                  width={cell + 0.6}
                  height={cell + 0.6}
                  fill={rampColor(p)}
                />
              )),
            )}
        </g>

        {/* the 0.5 iso-line region edge is implied by the ramp midpoint; add a
            subtle frame + axes for legibility */}
        <line className="np-axis" x1={sx(0)} y1={0} x2={sx(0)} y2={S} />
        <line className="np-axis" x1={0} y1={sy(0)} x2={S} y2={sy(0)} />
        <rect className="np-frame" x={0.5} y={0.5} width={S - 1} height={S - 1} rx={6} />

        {/* training points — solid, coloured by true label */}
        <g className="np-pts">
          {train.map((p, i) => (
            <circle
              key={`tr-${i}`}
              cx={sx(p.x[0])}
              cy={sy(p.x[1])}
              r={3.1}
              className={cx("np-pt", p.y === 1 ? "is-c1" : "is-c0")}
            />
          ))}
        </g>

        {/* test points — hollow rings, so you can see generalization */}
        <g className="np-pts">
          {test.map((p, i) => (
            <circle
              key={`te-${i}`}
              cx={sx(p.x[0])}
              cy={sy(p.x[1])}
              r={3.4}
              className={cx("np-pt np-pt-test", p.y === 1 ? "is-c1" : "is-c0")}
            />
          ))}
        </g>
      </svg>
      <figcaption className="np-legend" aria-hidden="true">
        <span className="np-leg-item">
          <span className="np-leg-dot is-c0" /> class 0
        </span>
        <span className="np-leg-item">
          <span className="np-leg-dot is-c1" /> class 1
        </span>
        <span className="np-leg-item">
          <span className="np-leg-ring" /> test (held out)
        </span>
        <span className="np-leg-ramp" aria-hidden="true">
          <span className="np-ramp-bar" />
          <span className="np-ramp-tag">p(class 1)</span>
        </span>
      </figcaption>
    </figure>
  );
}

function LossCurve({ hist }: { hist: number[] }) {
  const W = 300;
  const H = 78;
  const pad = 4;
  const n = hist.length;
  // fixed y-scale on a sensible BCE range so the curve reads cleanly.
  const yMax = Math.max(0.7, ...hist.slice(0, 1), ...hist);
  const path = useMemo(() => {
    if (n === 0) return "";
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;
    const xAt = (i: number) => pad + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v: number) => pad + innerH - clamp(v / yMax, 0, 1) * innerH;
    let d = `M ${xAt(0).toFixed(1)} ${yAt(hist[0]).toFixed(1)}`;
    for (let i = 1; i < n; i++) d += ` L ${xAt(i).toFixed(1)} ${yAt(hist[i]).toFixed(1)}`;
    return d;
  }, [hist, n, yMax]);

  const last = n > 0 ? hist[n - 1] : 0;
  return (
    <figure className="np-lossfig">
      <figcaption className="np-loss-cap">
        <span className="np-loss-title">training loss</span>
        <span className="np-loss-val">{n > 0 ? last.toFixed(3) : "—"}</span>
      </figcaption>
      <svg
        className="np-loss"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Training loss over ${n} epochs, currently ${n > 0 ? last.toFixed(3) : "n/a"}.`}
      >
        <rect className="np-loss-bg" x={0.5} y={0.5} width={W - 1} height={H - 1} rx={5} />
        {/* baseline (loss 0) */}
        <line className="np-loss-base" x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} />
        {path && <path className="np-loss-line" d={path} fill="none" />}
      </svg>
    </figure>
  );
}

// ===========================================================================
// RIGHT RAIL — live readout + boss banner
// ===========================================================================
function Readout({
  metrics,
  pct,
  act,
  sizes,
}: {
  metrics: Metrics;
  pct: (v: number) => string;
  act: Activation;
  sizes: number[];
}) {
  return (
    <section className="np-panel np-readout" aria-label="Training metrics">
      <div className="np-panel-head">
        <span className="np-panel-title">metrics</span>
        <span className="np-panel-sub">{act === "relu" ? "ReLU" : "tanh"}</span>
      </div>
      <dl className="np-stats">
        <div className="np-stat">
          <dt>epoch</dt>
          <dd className="np-stat-epoch">{metrics.epoch}</dd>
        </div>
        <div className="np-stat">
          <dt>train acc</dt>
          <dd className="np-stat-acc is-train">{pct(metrics.trainAcc)}</dd>
        </div>
        <div className="np-stat">
          <dt>test acc</dt>
          <dd className="np-stat-acc is-test">{pct(metrics.testAcc)}</dd>
        </div>
        <div className="np-stat">
          <dt>loss</dt>
          <dd className="np-stat-loss">{metrics.loss.toFixed(3)}</dd>
        </div>
      </dl>
      <div className="np-arch" aria-label={`Architecture ${sizes.join(" → ")}`}>
        <span className="np-arch-lbl">shape</span>
        <code className="np-arch-val">{sizes.join(" → ")}</code>
      </div>
      {/* the train/test gap is the generalization story */}
      <GapMeter train={metrics.trainAcc} test={metrics.testAcc} />
    </section>
  );
}

function GapMeter({ train, test }: { train: number; test: number }) {
  const gap = Math.max(0, train - test);
  const wide = gap > 0.1;
  return (
    <div className={cx("np-gap", wide && "is-wide")} title="train − test accuracy (overfitting gap)">
      <span className="np-gap-lbl">gap</span>
      <span className="np-gap-track" aria-hidden="true">
        <span className="np-gap-fill" style={{ width: `${clamp(gap / 0.3, 0, 1) * 100}%` }} />
      </span>
      <span className="np-gap-val">{(gap * 100).toFixed(0)}%</span>
    </div>
  );
}

function BossBanner({
  bossWon,
  bossJustWon,
  hiddenCount,
}: {
  bossWon: boolean;
  bossJustWon: Metrics | null;
  hiddenCount: number;
}) {
  return (
    <section className={cx("np-boss", bossWon && "is-won")} aria-label="Model Tamer boss challenge">
      <div className="np-boss-head">
        <span className="np-boss-icon" aria-hidden="true">
          🧠
        </span>
        <span className="np-boss-title">Model Tamer</span>
        {bossWon && <span className="np-boss-tag">✓ earned</span>}
      </div>
      {bossJustWon ? (
        <p className="np-boss-badge" role="status">
          🧠 <b>Model Tamer</b> — spiral cracked at {Math.round(bossJustWon.testAcc * 100)}% with{" "}
          {hiddenCount} layer{hiddenCount === 1 ? "" : "s"}.
        </p>
      ) : (
        <p className="np-boss-goal">
          <b>Boss:</b> train to <b>95% test accuracy</b> with <b>≤3 hidden layers</b> on the spiral.
        </p>
      )}
    </section>
  );
}

// ===========================================================================
// FOOTER — the lesson, boss detail, and the winning badge
// ===========================================================================
function Explainer({
  dataset,
  feats,
  hiddenCount,
  metrics,
  bossWon,
  bossJustWon,
  bossAlready,
}: {
  dataset: DatasetKind;
  feats: FeatureId[];
  hiddenCount: number;
  metrics: Metrics;
  bossWon: boolean;
  bossJustWon: Metrics | null;
  bossAlready: boolean;
}) {
  const hint = DATASETS.find((d) => d.id === dataset)?.hint ?? "";
  const engineered = feats.some((f) => f !== "x1" && f !== "x2");
  return (
    <div className="np-foot">
      <p className="np-explain">
        <b>This is real gradient descent.</b> The net does a forward pass, backprop writes the exact
        chain-rule gradient of binary cross-entropy, and each epoch nudges every weight downhill.
        The heat-map is the raw output probability over the plane; the boundary <em>bends</em> as the
        hidden units warp input space. Dataset: <code>{dataset}</code> — {hint}.
      </p>

      {dataset === "spiral" ? (
        <div className={cx("np-bosscard", bossWon && "is-won")}>
          <div className="np-bosscard-head">
            <span className="quiz-tag">boss</span>
            <strong>Model Tamer</strong>
            <span className="np-bosscard-badge">
              badge: 🧠 Model Tamer {bossAlready && "✓ earned"}
            </span>
          </div>
          {bossJustWon ? (
            <p className="np-bosscard-win" role="status">
              🧠 <b>Model Tamer earned</b> — the spiral yielded at{" "}
              <b>{Math.round(bossJustWon.testAcc * 100)}%</b> test accuracy with{" "}
              <b>{hiddenCount}</b> hidden layer{hiddenCount === 1 ? "" : "s"}. Architecture was your move.
            </p>
          ) : (
            <p className="np-bosscard-goal">
              Reach <b>≥95% test accuracy</b> with <b>≤3 hidden layers</b>. You are currently at{" "}
              <b>{Math.round(metrics.testAcc * 100)}%</b> test with{" "}
              <b>{hiddenCount}</b> layer{hiddenCount === 1 ? "" : "s"}.
            </p>
          )}
          <p className="np-bosscard-hint">
            Two honest routes both work:{" "}
            <b>2 layers with engineered features</b> (turn on <code>x₁²,x₂²,x₁·x₂</code> — the curvature does
            the heavy lifting){engineered ? " ✓ you have them on" : ""}, or <b>3 raw layers</b> of
            width ~8 on <code>x₁,x₂</code> alone. A learning rate of 0.1 (tanh) is a good starting point;
            reseed if a run stalls in a bad basin.
          </p>
        </div>
      ) : (
        <p className="np-note">
          Warm up on <code>circle</code> and <code>xor</code>, then switch to <b>spiral</b> to take on the
          <b> Model Tamer</b> boss. Notice how the <em>test</em> ring points are the honest score — a net
          can memorize the training dots and still miss the held-out ones.
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// colour ramp — diverging cyan(0) → violet(1), midpoint neutral surface
// ===========================================================================
function rampColor(p: number): string {
  // p in [0,1]; below 0.5 lean to class-0 (cyan), above to class-1 (violet).
  // alpha grows toward the extremes so the ~0.5 boundary reads as a soft seam.
  const t = clamp(p, 0, 1);
  if (t >= 0.5) {
    const a = (t - 0.5) * 2; // 0..1
    return `color-mix(in srgb, ${C1} ${Math.round(a * 72)}%, var(--surface))`;
  }
  const a = (0.5 - t) * 2; // 0..1
  return `color-mix(in srgb, ${C0} ${Math.round(a * 72)}%, var(--surface))`;
}
