// [micro] amortized-doubling — push into a dynamic array that DOUBLES capacity
// when full, and watch why the average cost per push is a small constant even
// though individual pushes occasionally cost a fortune. Three linked views: the
// array cells filling (a doubling flashes the freshly-copied prefix), a bar per
// push showing its cost (cheap 1s punctuated by rare tall spikes at 1,2,4,8,…),
// and the running-average line that climbs a little then FLATTENS below ~3. The
// spikes get taller but ever rarer, so the average never runs away — that is
// "amortized O(1)". Engine: amortized-doubling/model. Reduced motion: Step adds
// one push at a time.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { simulateDoubling } from "./model.ts";

const ACCENT = "#34D399";
const MAX_PUSHES = 32; // enough to see 5 doublings (caps 1,2,4,8,16) and the flatten

// chart geometry (viewBox units)
const W = 620;
const H = 200;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

export default function AmortizedDoubling() {
  const [pushes, setPushes] = useState(1); // how many pushes have happened
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // full trace once; slice to the current push count for the live view
  const full = useMemo(() => simulateDoubling(MAX_PUSHES), []);
  const steps = full.steps.slice(0, pushes);
  const cur = pushes > 0 ? full.steps[pushes - 1] : null;
  const capacity = cur ? cur.capacityAfter : 1;
  const size = pushes;

  // metrics so far
  const soFarTotal = steps.reduce((s, x) => s + x.cost, 0);
  const soFarAvg = pushes > 0 ? soFarTotal / pushes : 0;

  // y-scale for the two charts (cost bars + running avg share the plot).
  // Tallest bar is the last resize's cost; keep a little headroom.
  const maxCost = useMemo(() => {
    let m = 3;
    for (const s of full.steps) if (s.cost > m) m = s.cost;
    return m;
  }, [full]);

  useSimClock(running, 3 * speed, () => {
    setPushes((x) => {
      if (x >= MAX_PUSHES) {
        setRunning(false);
        return MAX_PUSHES;
      }
      return x + 1;
    });
  });

  function restart() {
    setPushes(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setPushes((x) => Math.min(MAX_PUSHES, x + 1));
  }
  function onReset() {
    setRunning(false);
    setPushes(1);
  }

  // ---- chart mappers ----
  const barW = PLOT_W / MAX_PUSHES;
  const bx = (i: number): number => PAD_L + barW * i;
  const costY = (cost: number): number => PAD_T + PLOT_H - (PLOT_H * cost) / maxCost;
  const avgY = (avg: number): number => PAD_T + PLOT_H - (PLOT_H * Math.min(avg, maxCost)) / maxCost;

  // running-average polyline over the pushes seen so far
  const avgPath = steps
    .map((s, i) => `${i === 0 ? "M" : "L"} ${(bx(i) + barW / 2).toFixed(1)} ${avgY(s.runningAvg).toFixed(1)}`)
    .join(" ");

  const resizeCount = steps.filter((s) => s.resized).length;

  return (
    <SimShell
      title="Amortized doubling — why a growable array is O(1) per push"
      simKey="amortized-doubling"
      accent={ACCENT}
      transport={{
        running,
        onToggle: () => (running ? setRunning(false) : restart()),
        onStep,
        speed,
        onSpeed: setSpeed,
      }}
      onReset={onReset}
      status={`push ${pushes}/${MAX_PUSHES} · size ${size} in capacity ${capacity} · ${resizeCount} resize${resizeCount === 1 ? "" : "s"} so far · total cost ${soFarTotal}, average ${soFarAvg.toFixed(2)}/push${cur?.resized ? " · ⚡ just doubled (copied " + (cur.cost - 1) + ")" : ""}`}
      footer={
        <div className="ad-metrics" role="group" aria-label="Amortized metrics">
          <div className="ad-metric">
            <span className="ad-mv">{size}</span>
            <span className="ad-ml">elements</span>
          </div>
          <div className="ad-metric">
            <span className="ad-mv">{capacity}</span>
            <span className="ad-ml">capacity</span>
          </div>
          <div className="ad-metric">
            <span className="ad-mv">{soFarTotal}</span>
            <span className="ad-ml">total cost</span>
          </div>
          <div className="ad-metric">
            <span className={cx("ad-mv", "ad-avg")}>{soFarAvg.toFixed(2)}</span>
            <span className="ad-ml">avg / push</span>
          </div>
          <div className="ad-metric">
            <span className="ad-mv ad-bound">&lt; 3</span>
            <span className="ad-ml">amortized bound</span>
          </div>
        </div>
      }
    >
      <p className="ad-blurb muted">
        Each push writes one element (cost 1). When the buffer is full it doubles, first copying the
        old elements over (cost = old size) — the tall spikes. Spikes double in height but halve in
        frequency, so the running average flattens instead of climbing.
      </p>

      {/* the array cells */}
      <div className="ad-array" role="group" aria-label={`Array: ${size} of ${capacity} slots filled`}>
        <div className="ad-arr-lbl">
          array — <b>{size}</b> / <b>{capacity}</b> slots
        </div>
        <div className="ad-cells">
          {Array.from({ length: capacity }, (_, i) => {
            const filled = i < size;
            const isNewest = i === size - 1;
            // on a resize, the copied prefix is [0 .. oldSize-1]; flash it
            const copied = !!cur?.resized && i < cur.capacityBefore && filled;
            return (
              <div
                key={i}
                className={cx("ad-cell", filled && "filled", isNewest && "newest", copied && "copied")}
                title={filled ? `element ${i}` : "empty slot"}
              >
                {filled ? i : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* cost-per-push bars + running-average line */}
      <svg viewBox={`0 0 ${W} ${H}`} className="ad-chart" role="img" aria-label="Cost per push with running average">
        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="var(--surface)" stroke="var(--line)" strokeWidth="1" rx="4" />

        {/* y ticks: 1 and maxCost, plus the amortized bound ~3 */}
        {[1, 3, maxCost].map((v, i) => {
          const gy = costY(v);
          if (gy < PAD_T - 0.5 || gy > PAD_T + PLOT_H + 0.5) return null;
          const isBound = v === 3;
          return (
            <g key={`y${i}`}>
              <line
                x1={PAD_L}
                y1={gy}
                x2={PAD_L + PLOT_W}
                y2={gy}
                stroke={isBound ? "var(--accent)" : "var(--line)"}
                strokeWidth={isBound ? 1 : 0.75}
                strokeDasharray={isBound ? "5 3" : "2 4"}
              />
              <text x={PAD_L - 5} y={gy + 3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill={isBound ? "var(--accent)" : "var(--tx3)"}>
                {v}
              </text>
            </g>
          );
        })}

        {/* cost bars — resize spikes in orange (control), plain writes in cyan */}
        {steps.map((s, i) => {
          const top = costY(s.cost);
          const isCur = i === pushes - 1;
          return (
            <rect
              key={i}
              x={bx(i) + 1}
              y={top}
              width={Math.max(1, barW - 2)}
              height={PAD_T + PLOT_H - top}
              fill={s.resized ? "var(--sem-control)" : "var(--sem-data)"}
              opacity={isCur ? 1 : s.resized ? 0.9 : 0.55}
              stroke={isCur ? "var(--tx)" : "none"}
              strokeWidth={isCur ? 1 : 0}
            />
          );
        })}

        {/* running-average line (state/violet) that flattens */}
        {steps.length > 1 && <path d={avgPath} fill="none" stroke="var(--sem-state)" strokeWidth="2" strokeLinejoin="round" />}
        {cur && (
          <circle cx={bx(pushes - 1) + barW / 2} cy={avgY(cur.runningAvg)} r="3.5" fill="var(--sem-state)" stroke="var(--surface)" strokeWidth="1" />
        )}

        {/* x label */}
        <text x={PAD_L + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--tx2)">
          push number →
        </text>

        {/* legend */}
        <g fontSize="9" fontFamily="var(--font-body)">
          <rect x={PAD_L + 6} y={PAD_T + 4} width="9" height="9" fill="var(--sem-data)" opacity="0.7" />
          <text x={PAD_L + 18} y={PAD_T + 12} fill="var(--tx2)">write (cost 1)</text>
          <rect x={PAD_L + 96} y={PAD_T + 4} width="9" height="9" fill="var(--sem-control)" />
          <text x={PAD_L + 108} y={PAD_T + 12} fill="var(--tx2)">resize spike</text>
          <line x1={PAD_L + 186} y1={PAD_T + 9} x2={PAD_L + 202} y2={PAD_T + 9} stroke="var(--sem-state)" strokeWidth="2" />
          <text x={PAD_L + 206} y={PAD_T + 12} fill="var(--tx2)">running avg</text>
        </g>
      </svg>
    </SimShell>
  );
}
