// [micro] tsp-playground — ch.21. The travelling-salesman problem made tactile:
// drag cities on the map, then race three strategies on the SAME instance —
// nearest-neighbour (greedy, fast, ~20–25% over), 2-opt (uncross the crossings,
// near-optimal), and brute-force optimal (try every tour, exact, exponential).
// The scoreboard shows each length and its % over optimal, and — front and
// centre — bruteForceTourCount(n) = (n−1)!/2, the exact number of tours the exact
// method must weigh. Past n = 9 that number explodes, so the brute-force button
// disables itself and tells you why ("that's N tours — too many"): the same shock
// the brute-force-death-watch sim dramatises, here attached to a map you drew.
//
// Single default export (react-refresh). Functional coloring is inline from theme
// vars so it reads without the sheet; the sheet adds hover/animation/layout only.
import { useMemo, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import SimShell from "../SimShell.tsx";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  bruteForceOptimal,
  bruteForceTourCount,
  demoCities,
  nearestNeighbor,
  tourLength,
  twoOpt,
  type City,
  type TspOptimal,
} from "./model.ts";
import "../../../theme/_p5css/tsp-playground.css";

const ACCENT = "#2DD4BF";
const VB = 100; // viewBox is 0..100 in both axes (engine coordinate space)
const PAD = 3; // keep dots off the very edge
const MIN_CITIES = 3;
const MAX_CITIES = 15;
const BRUTE_LIMIT = 9; // brute force disabled past this many cities

// Which strategy's tour is drawn over the map.
type Method = "none" | "nn" | "2opt" | "optimal";
type Tool = "move" | "delete";

const COLOR: Record<Exclude<Method, "none">, string> = {
  nn: "var(--sem-control)", // greedy = orange (control/active)
  "2opt": "var(--sem-data)", // improved = cyan (data flow)
  optimal: "var(--sem-ok)", // exact best = green (optimal/done)
};
const LABEL: Record<Exclude<Method, "none">, string> = {
  nn: "nearest neighbour",
  "2opt": "2-opt",
  optimal: "optimal",
};

function fmt(n: number): string {
  return n.toFixed(1);
}
/** How many tours (n−1)!/2 — compact, with a scientific tail for the huge ones. */
function fmtCount(c: number): string {
  if (!isFinite(c)) return "∞";
  if (c < 1e6) return Math.round(c).toLocaleString("en-US");
  const e = Math.floor(Math.log10(c));
  return `${(c / 10 ** e).toFixed(1)}×10^${e}`;
}
/** Percent a heuristic length runs over the exact optimum (null until known). */
function pctOver(len: number | null, optimal: number | null): string | null {
  if (len === null || optimal === null || optimal <= 0) return null;
  const p = ((len - optimal) / optimal) * 100;
  return p < 0.05 ? "optimal" : `+${p.toFixed(1)}% over optimal`;
}

export default function TspPlayground() {
  const [cities, setCities] = useState<City[]>(demoCities);
  const [tool, setTool] = useState<Tool>("move");
  const [shown, setShown] = useState<Method>("none");
  const [dragI, setDragI] = useState<number>(-1);
  // Exact optimum is expensive, so we compute it only on demand and cache it
  // together with the instance it was computed for; any edit invalidates it.
  const [optimal, setOptimal] = useState<TspOptimal | null>(null);
  const [drawNonce, setDrawNonce] = useState(0); // re-trigger the draw-in animation

  const reduced = useReducedMotion();
  const n = cities.length;

  // Cheap for n ≤ 15 — recompute freely as the map changes.
  const nnOrder = useMemo(() => nearestNeighbor(cities), [cities]);
  const twoOptOrder = useMemo(() => twoOpt(cities, nnOrder), [cities, nnOrder]);
  const nnLen = useMemo(() => tourLength(cities, nnOrder), [cities, nnOrder]);
  const twoLen = useMemo(() => tourLength(cities, twoOptOrder), [cities, twoOptOrder]);
  const optLen = optimal ? optimal.length : null;

  const tourCount = bruteForceTourCount(n);
  const bruteAllowed = n <= BRUTE_LIMIT;

  // The order currently drawn over the map.
  const shownOrder =
    shown === "nn"
      ? nnOrder
      : shown === "2opt"
        ? twoOptOrder
        : shown === "optimal" && optimal
          ? optimal.order
          : null;
  const shownColor = shown === "none" ? "var(--tx3)" : COLOR[shown];

  // Total length of the drawn polyline in viewBox units — feeds the CSS draw-in.
  const shownLen = shownOrder ? tourLength(cities, shownOrder) : 0;

  // ---- edits (any edit clears the cached optimum) ----
  function invalidate(): void {
    setOptimal(null);
    if (shown === "optimal") setShown("none");
  }
  function pick(m: Method): void {
    setShown(m);
    if (!reduced) setDrawNonce((k) => k + 1);
  }

  function reset(): void {
    setCities(demoCities());
    setOptimal(null);
    setShown("none");
    setTool("move");
    setDragI(-1);
  }

  function addCity(x: number, y: number): void {
    if (n >= MAX_CITIES) return;
    setCities((cs) => [...cs, { x: clampVB(x), y: clampVB(y) }]);
    invalidate();
  }
  function removeCity(i: number): void {
    if (n <= MIN_CITIES) return;
    setCities((cs) => cs.filter((_, k) => k !== i));
    invalidate();
  }
  function computeOptimal(): void {
    if (!bruteAllowed) return;
    const result = bruteForceOptimal(cities);
    setOptimal(result);
    setShown("optimal");
    if (!reduced) setDrawNonce((k) => k + 1);
  }

  // ---- pointer / dragging ----
  function toLocal(e: ReactPointerEvent, svg: SVGSVGElement): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * VB,
      y: ((e.clientY - rect.top) / rect.height) * VB,
    };
  }
  function onCityPointerDown(e: ReactPointerEvent, i: number): void {
    e.stopPropagation(); // don't let the stage treat this as "add"
    if (tool === "delete" || e.shiftKey) {
      e.preventDefault();
      removeCity(i);
      return;
    }
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragI(i);
  }
  function onSvgPointerMove(e: ReactPointerEvent<SVGSVGElement>): void {
    if (dragI < 0) return;
    const p = toLocal(e, e.currentTarget);
    const x = clampVB(p.x);
    const y = clampVB(p.y);
    setCities((cs) => cs.map((c, k) => (k === dragI ? { x, y } : c)));
    invalidate();
  }
  function onSvgPointerUp(): void {
    setDragI(-1);
  }
  // Click on empty canvas → add a city (only in move mode; a drag suppresses it).
  function onStagePointerDown(e: ReactPointerEvent<SVGSVGElement>): void {
    if (tool === "delete") return;
    if (dragI >= 0) return;
    const p = toLocal(e, e.currentTarget);
    addCity(p.x, p.y);
  }

  // ---- status line ----
  const status =
    shown === "none"
      ? `${n} cities · drag to move, click empty space to add${n > MIN_CITIES ? ", shift-click to remove" : ""} · then race the three strategies`
      : shown === "optimal"
        ? `optimal tour = ${fmt(shownLen)} after weighing all ${fmtCount(tourCount)} tours`
        : `${LABEL[shown]} tour = ${fmt(shownLen)}${
            optLen !== null ? ` · ${pctOver(shownLen, optLen)}` : " · compute optimal to see the gap"
          }`;

  const svgMode = tool === "delete" ? "is-delete" : "is-move";

  return (
    <SimShell
      title="TSP playground — nearest-neighbour vs 2-opt vs brute-force optimal"
      simKey="tsp-playground"
      kind="micro"
      accent={ACCENT}
      onReset={reset}
      status={status}
      controls={
        <div className="tsp-ctl">
          <div className="bit-seg" role="group" aria-label="Editing tool">
            {(
              [
                { id: "move", label: "move" },
                { id: "delete", label: "delete" },
              ] as { id: Tool; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={cx("bit-segbtn", tool === t.id && "on")}
                onClick={() => setTool(t.id)}
                aria-pressed={tool === t.id}
                title={t.id === "move" ? "Drag cities; click empty space to add" : "Click a city to remove it"}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={cx("btn", shown === "nn" && "btn-primary")}
            onClick={() => pick("nn")}
            aria-pressed={shown === "nn"}
            title="Greedy: always hop to the nearest unvisited city"
          >
            nearest neighbour
          </button>
          <button
            type="button"
            className={cx("btn", shown === "2opt" && "btn-primary")}
            onClick={() => pick("2opt")}
            aria-pressed={shown === "2opt"}
            title="Local search: reverse segments to uncross crossing edges"
          >
            2-opt
          </button>
          <button
            type="button"
            className={cx("btn", shown === "optimal" && "btn-primary")}
            onClick={computeOptimal}
            disabled={!bruteAllowed}
            aria-pressed={shown === "optimal"}
            title={
              bruteAllowed
                ? "Exact: evaluate every distinct tour and keep the shortest"
                : `${fmtCount(tourCount)} tours — too many to brute-force (n > ${BRUTE_LIMIT})`
            }
          >
            brute force optimal
          </button>
          {!bruteAllowed && (
            <span className="tsp-tours-note" role="note">
              that's {fmtCount(tourCount)} tours — too many
            </span>
          )}
        </div>
      }
      footer={
        <div className="tsp-foot">
          <div className={cx("tsp-tours", !bruteAllowed && "is-huge")} role="status">
            <span>tours to check for the exact answer:</span>
            <b>{fmtCount(tourCount)}</b>
            <span className="tsp-tours-note">
              = (n−1)!/2 for n = {n}
              {!bruteAllowed && " — brute force off; this is the wall the death-watch shows"}
            </span>
          </div>

          <div className="tsp-board" role="group" aria-label="Tour lengths by strategy">
            <ScoreCard
              method="nn"
              value={nnLen}
              sub={pctOver(nnLen, optLen)}
              shown={shown === "nn"}
              onShow={() => pick("nn")}
            />
            <ScoreCard
              method="2opt"
              value={twoLen}
              sub={
                twoLen < nnLen - 1e-6
                  ? `${fmt(nnLen)} → ${fmt(twoLen)} (uncrossed)`
                  : (pctOver(twoLen, optLen) ?? "no crossings to fix")
              }
              shown={shown === "2opt"}
              onShow={() => pick("2opt")}
            />
            <ScoreCard
              method="optimal"
              value={optLen}
              sub={
                optimal
                  ? `${optimal.toursEvaluated.toLocaleString("en-US")} tours weighed`
                  : bruteAllowed
                    ? "press “brute force optimal”"
                    : "too many tours to compute"
              }
              shown={shown === "optimal"}
              onShow={optimal ? () => pick("optimal") : undefined}
            />
          </div>

          <div className="tsp-legend" aria-hidden="true">
            <span className="tsp-leg">
              <i className="tsp-swatch" style={{ background: COLOR.nn }} /> nearest neighbour
            </span>
            <span className="tsp-leg">
              <i className="tsp-swatch" style={{ background: COLOR["2opt"] }} /> 2-opt
            </span>
            <span className="tsp-leg">
              <i className="tsp-swatch" style={{ background: COLOR.optimal }} /> optimal
            </span>
          </div>
        </div>
      }
    >
      <div className="tsp-stage">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className={cx("tsp-svg", svgMode)}
          role="img"
          aria-label={`Map of ${n} cities${
            shown === "none" ? "" : `, showing the ${LABEL[shown]} tour of length ${fmt(shownLen)}`
          }`}
          onPointerDown={onStagePointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerLeave={onSvgPointerUp}
        >
          {/* the tour polyline, drawn under the cities */}
          {shownOrder && shownOrder.length > 1 && (
            <polygon
              key={`${shown}-${drawNonce}`}
              className={cx("tsp-tour", !reduced && drawNonce > 0 && "is-draw")}
              points={shownOrder.map((ci) => `${cities[ci].x},${cities[ci].y}`).join(" ")}
              fill="none"
              stroke={shownColor}
              strokeWidth={0.9}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ "--tsp-len": shownLen } as CSSProperties}
            />
          )}

          {/* cities */}
          {cities.map((c, i) => {
            const isStart = i === 0 && shown !== "none";
            const dotFill = isStart ? shownColor : "var(--surface)";
            const dotStroke = shown === "none" ? "var(--accent)" : shownColor;
            return (
              <g
                key={i}
                className="tsp-city"
                role="button"
                tabIndex={0}
                aria-label={`city ${i + 1}${isStart ? " (start)" : ""} at ${Math.round(c.x)}, ${Math.round(
                  c.y,
                )}${n > MIN_CITIES ? " — Delete to remove" : ""}`}
                onPointerDown={(e) => onCityPointerDown(e, i)}
                onKeyDown={(e) => {
                  if ((e.key === "Delete" || e.key === "Backspace") && n > MIN_CITIES) {
                    e.preventDefault();
                    removeCity(i);
                  }
                }}
              >
                {/* generous invisible hit target */}
                <circle className="tsp-city-hit" cx={c.x} cy={c.y} r={4.2} />
                <circle
                  className="tsp-dot"
                  cx={c.x}
                  cy={c.y}
                  r={dragI === i ? 2.6 : 2}
                  fill={dotFill}
                  stroke={dotStroke}
                  strokeWidth={1.1}
                />
                <text
                  x={c.x}
                  y={c.y - 3.1}
                  textAnchor="middle"
                  style={{
                    fill: "var(--tx2)",
                    font: "600 3px var(--font-mono)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          {n < MIN_CITIES + 1 && (
            <text className="tsp-hint" x={VB / 2} y={VB - 3} textAnchor="middle">
              click empty space to add cities (up to {MAX_CITIES})
            </text>
          )}
        </svg>
      </div>
    </SimShell>
  );
}

function clampVB(v: number): number {
  return Math.max(PAD, Math.min(VB - PAD, v));
}

function ScoreCard({
  method,
  value,
  sub,
  shown,
  onShow,
}: {
  method: Exclude<Method, "none">;
  value: number | null;
  sub: string | null;
  shown: boolean;
  onShow?: () => void;
}) {
  const body = (
    <>
      <span className="tsp-card-k">
        <i className="tsp-swatch" style={{ background: COLOR[method] }} aria-hidden="true" />
        {LABEL[method]}
      </span>
      <span className="tsp-card-v">{value === null ? "—" : fmt(value)}</span>
      {sub && <span className="tsp-card-sub">{sub}</span>}
    </>
  );
  if (!onShow) {
    return <div className={cx("tsp-card", shown && "is-shown")}>{body}</div>;
  }
  return (
    <button
      type="button"
      className={cx("tsp-card", shown && "is-shown")}
      onClick={onShow}
      aria-pressed={shown}
      title={`Draw the ${LABEL[method]} tour`}
      style={{ textAlign: "left", cursor: "pointer" }}
    >
      {body}
    </button>
  );
}
