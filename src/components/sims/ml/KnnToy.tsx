// [micro] knn-toy (ch.33) — k-nearest-neighbours, the "learning" that isn't:
// no training, no parameters, it just memorizes the points and votes among the
// k closest at query time. Move the crosshair to poll a query — its k nearest
// neighbours light up, the votes tally, a label is predicted — while the painted
// region map (regionField) shows the decision boundary the whole plane would get.
// The k slider is the bias/variance dial: k=1 memorizes (jagged islands, high
// leave-one-out accuracy that won't generalize); large k oversmooths into a
// blurry split. A foil to the MLP. Prefix: knn-.
//
// Single default export (react-refresh). Purely reactive — no time axis, so no
// transport (SimShell still gets onReset). Functional colors are inline from the
// semantic palette; the sheet handles layout, the slider and hover only.
import { useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import SimShell from "../SimShell.tsx";
import { cx, clamp, useReducedMotion } from "../../../lib/utils.ts";
import { classify, regionField, looAccuracy } from "./knn.ts";
import { makeDataset, DATASETS } from "./datasets.ts";
import type { DatasetKind, Point } from "./datasets.ts";
import { liveSeed } from "./rng.ts";
import "../../../theme/_p10css/knn-toy.css";

const ACCENT = "#A78BFA";

const BOUND = 1.2; // plane spans [-BOUND, BOUND]²
const VB = 240; // square viewBox
const RES = 44; // region-map resolution (RES × RES cells)
const N_POINTS = 60; // training points (kept small so regionField stays snappy)

// class colors: 0 = cyan (data), 1 = accent (violet)
const CLASS_COLOR = ["var(--sem-data)", "var(--accent)"] as const;
const K_MIN = 1;
const K_MAX = 25;

// ---- data-space → viewBox-pixel transforms ----
const px = (x: number): number => ((x + BOUND) / (2 * BOUND)) * VB;
const py = (y: number): number => ((BOUND - y) / (2 * BOUND)) * VB;
const cell = VB / RES;

export default function KnnToy() {
  const [kind, setKind] = useState<DatasetKind>("circle");
  const [seed, setSeed] = useState<number>(1);
  const [k, setK] = useState<number>(5);
  const [query, setQuery] = useState<[number, number]>([0.15, 0.1]);
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  // Dataset is deterministic in (kind, seed) → memoized; "new points" bumps seed.
  const train = useMemo<Point[]>(
    () => makeDataset({ kind, n: N_POINTS, noise: 0.08, seed }),
    [kind, seed],
  );

  // Region map + LOO both depend on (train, k) only.
  const field = useMemo(() => regionField(train, RES, BOUND, k), [train, k]);
  const loo = useMemo(() => looAccuracy(train, k), [train, k]);

  // The query vote is cheap → recompute on every crosshair move.
  const vote = useMemo(() => classify(train, [query[0], query[1]], k), [train, query, k]);
  const neighborSet = useMemo(() => new Set(vote.neighbors), [vote.neighbors]);

  function onReset(): void {
    setKind("circle");
    setSeed(1);
    setK(5);
    setQuery([0.15, 0.1]);
  }
  function reseed(): void {
    setSeed(liveSeed());
  }

  // ---- move the query crosshair ----
  function toData(e: ReactPointerEvent): [number, number] {
    const svg = svgRef.current;
    if (!svg) return query;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / VB, rect.height / VB);
    const offX = (rect.width - VB * scale) / 2;
    const offY = (rect.height - VB * scale) / 2;
    const vx = (e.clientX - rect.left - offX) / scale;
    const vy = (e.clientY - rect.top - offY) / scale;
    const x = (vx / VB) * 2 * BOUND - BOUND;
    const y = BOUND - (vy / VB) * 2 * BOUND;
    return [clamp(x, -BOUND, BOUND), clamp(y, -BOUND, BOUND)];
  }
  function onPlaneMove(e: ReactPointerEvent): void {
    // follow the pointer while it's over the plane (buttons or hover both work)
    setQuery(toData(e));
  }
  function onPlaneDown(e: ReactPointerEvent): void {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setQuery(toData(e));
  }

  // ---- derived render data ----
  const kk = Math.max(1, Math.min(k, train.length));
  const [v0, v1] = vote.votes;
  const kindHint = DATASETS.find((d) => d.id === kind)?.hint ?? "";

  const status =
    `k=${kk} · predicts class ${vote.label} (${v0}–${v1}) · LOO ${(loo * 100).toFixed(0)}%`;

  return (
    <SimShell
      title="k-nearest-neighbours — memorize, then vote"
      simKey="knn-toy"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="knn-ctl">
          <div className="bit-seg" role="group" aria-label="Dataset shape">
            {DATASETS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={cx("bit-segbtn", kind === d.id && "on")}
                onClick={() => setKind(d.id)}
                aria-pressed={kind === d.id}
                title={d.hint}
              >
                {d.label}
              </button>
            ))}
          </div>
          <label className="knn-kslider">
            <span className="knn-kslider-lbl" aria-hidden="true">
              k = <b>{kk}</b>
            </span>
            <input
              type="range"
              min={K_MIN}
              max={K_MAX}
              step={1}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              aria-label={`Number of neighbours k, currently ${kk}`}
              aria-valuetext={`k equals ${kk}`}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={reseed}
            title="Resample the training points from a fresh random seed"
          >
            ↻ new points
          </button>
        </div>
      }
      footer={
        <div className="knn-foot">
          <div className="knn-cards">
            {/* prediction card */}
            <div className="knn-card" role="status">
              <span className="knn-card-h">prediction at crosshair</span>
              <div className="knn-pred">
                <span className="knn-pred-swatch" style={{ background: CLASS_COLOR[vote.label] }} aria-hidden="true" />
                <b className="knn-pred-label" style={{ color: CLASS_COLOR[vote.label] }}>
                  class {vote.label}
                </b>
                <span className="knn-tally">
                  {kk} neighbours vote{" "}
                  <b style={{ color: CLASS_COLOR[0] }}>{v0}</b> –{" "}
                  <b style={{ color: CLASS_COLOR[1] }}>{v1}</b>
                </span>
              </div>
              <div className="knn-votebar" aria-hidden="true">
                <span style={{ flex: v0 || 0.0001, background: CLASS_COLOR[0] }} />
                <span style={{ flex: v1 || 0.0001, background: CLASS_COLOR[1] }} />
              </div>
            </div>

            {/* leave-one-out card */}
            <div className="knn-card">
              <span className="knn-card-h">leave-one-out accuracy</span>
              <div className="knn-loo">
                <b
                  className="knn-loo-val"
                  style={{
                    color:
                      loo >= 0.9 ? "var(--sem-ok)" : loo >= 0.75 ? "var(--sem-control)" : "var(--sem-err)",
                  }}
                >
                  {(loo * 100).toFixed(0)}%
                </b>
                <span className="knn-loo-sub">each point classified by its neighbours (itself excluded)</span>
              </div>
              <div className="knn-loobar" aria-hidden="true">
                <span style={{ width: `${loo * 100}%` }} />
              </div>
            </div>
          </div>

          <p className="knn-lesson">
            KNN never trains — it stores every point and, for a query, lets the <b>k</b> closest
            vote. <b>k = 1</b> memorizes: the map fractures into little islands and leave-one-out
            looks great but won't generalize (that's overfitting you can see). Turn <b>k</b> up and
            the boundary smooths, until a large k <b>oversmooths</b> and washes real structure away.
            The sweet spot balances the two — the bias/variance trade-off, on a plane.
          </p>
        </div>
      }
    >
      <div className="knn-stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB} ${VB}`}
          className="knn-svg"
          role="img"
          aria-label={`Decision map for the ${kind} dataset with k = ${kk}. Query at x ${query[0].toFixed(
            2,
          )}, y ${query[1].toFixed(2)} predicts class ${vote.label} by a ${v0} to ${v1} vote.`}
          onPointerDown={onPlaneDown}
          onPointerMove={onPlaneMove}
        >
          {/* region map: one translucent rect per grid cell */}
          <g className="knn-field" shapeRendering="crispEdges">
            {field.map((row, gy) =>
              row.map((label, gx) => (
                <rect
                  key={`${gx}-${gy}`}
                  x={gx * cell}
                  y={gy * cell}
                  width={cell + 0.5}
                  height={cell + 0.5}
                  fill={CLASS_COLOR[label]}
                  fillOpacity={0.16}
                />
              )),
            )}
          </g>

          {/* faint lines from the query to its k neighbours */}
          {vote.neighbors.map((ni) => (
            <line
              key={`nl-${ni}`}
              x1={px(query[0])}
              y1={py(query[1])}
              x2={px(train[ni].x[0])}
              y2={py(train[ni].x[1])}
              stroke="var(--tx2)"
              strokeWidth={0.8}
              strokeOpacity={0.5}
              strokeDasharray="2 2"
            />
          ))}

          {/* training points, colored by TRUE label; neighbours get a ring */}
          {train.map((p, i) => {
            const isN = neighborSet.has(i);
            return (
              <circle
                key={i}
                cx={px(p.x[0])}
                cy={py(p.x[1])}
                r={isN ? 3.4 : 2.4}
                fill={CLASS_COLOR[p.y]}
                stroke={isN ? "var(--tx)" : "var(--bg)"}
                strokeWidth={isN ? 1.4 : 0.7}
                fillOpacity={0.95}
              />
            );
          })}

          {/* the query crosshair */}
          <g className="knn-query" pointerEvents="none">
            <circle
              cx={px(query[0])}
              cy={py(query[1])}
              r={6}
              fill="none"
              stroke={CLASS_COLOR[vote.label]}
              strokeWidth={1.6}
            />
            <line
              x1={px(query[0]) - 9}
              y1={py(query[1])}
              x2={px(query[0]) + 9}
              y2={py(query[1])}
              stroke="var(--tx)"
              strokeWidth={0.9}
            />
            <line
              x1={px(query[0])}
              y1={py(query[1]) - 9}
              x2={px(query[0])}
              y2={py(query[1]) + 9}
              stroke="var(--tx)"
              strokeWidth={0.9}
            />
          </g>
        </svg>

        {/* legend + move hint */}
        <div className="knn-legend">
          <span className="knn-leg">
            <i className="knn-swatch" style={{ background: CLASS_COLOR[0] }} /> class 0
          </span>
          <span className="knn-leg">
            <i className="knn-swatch" style={{ background: CLASS_COLOR[1] }} /> class 1
          </span>
          <span className="knn-leg-hint">{kindHint}</span>
          <span className="knn-leg-move">
            {reduced ? "tap the plane to place the query" : "move over the plane to poll a query"}
          </span>
        </div>
      </div>
    </SimShell>
  );
}
