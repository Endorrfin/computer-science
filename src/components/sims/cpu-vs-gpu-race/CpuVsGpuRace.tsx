// [micro] cpu-vs-gpu-race — sum N numbers two ways: one fast CPU lane versus a
// thousand slower GPU lanes. Watch the CPU win when N is tiny (the GPU is still
// paying its launch/transfer overhead) and lose spectacularly when N is huge
// (width beats speed). Flip "count PCIe transfer" to see a trivial job go
// transfer-bound — the honest catch. Engine: gpu/parallel.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { DEFAULT_RACE, RACE_SIZES, race } from "../gpu/parallel.ts";

const ACCENT = "#FB923C";

function fmt(ns: number): string {
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)} ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(1)} µs`;
  return `${ns.toFixed(0)} ns`;
}

export default function CpuVsGpuRace() {
  const [n, setN] = useState(100_000);
  const [countTransfer, setCountTransfer] = useState(false);
  const [p, setP] = useState(1); // normalized wall-clock 0..1 (1 = race over)
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const r = useMemo(() => race(n, { ...DEFAULT_RACE, countTransfer }), [n, countTransfer]);
  const maxTime = Math.max(r.cpuTime, r.gpuTotal);
  const overhead = r.gpuLaunch + r.gpuTransfer;
  const clock = p * maxTime;
  const cpuProg = Math.min(1, clock / r.cpuTime);
  const gpuProg = clock <= overhead ? 0 : Math.min(1, (clock - overhead) / Math.max(r.gpuCompute, 1e-9));
  const gpuSpinning = clock < overhead && p < 1;

  useSimClock(running, 30 * speed, () => {
    setP((x) => {
      if (x >= 1) {
        setRunning(false);
        return 1;
      }
      return Math.min(1, x + 0.02);
    });
  });

  function restart() {
    setP(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setP((x) => Math.min(1, x + 0.05));
  }
  function onReset() {
    setRunning(false);
    setP(1);
  }

  const winnerText = r.winner === "tie" ? "≈ tie" : r.winner === "gpu" ? `GPU wins · ${r.speedup.toFixed(1)}× faster` : `CPU wins · GPU only ${r.speedup.toFixed(2)}×`;

  return (
    <SimShell
      title="CPU vs GPU — one fast lane vs a thousand slow ones"
      simKey="cpu-vs-gpu-race"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`Sum ${n.toLocaleString()} numbers · CPU ${fmt(r.cpuTime)} vs GPU ${fmt(r.gpuTotal)} (launch ${fmt(r.gpuLaunch)}${countTransfer ? ` + transfer ${fmt(r.gpuTransfer)}` : ""} + ${r.waves} wave${r.waves === 1 ? "" : "s"}). ${winnerText}.`}
      controls={
        <div className="gr-ctl">
          <label className="ss-field">
            N
            <select value={n} onChange={(e) => { setN(Number(e.target.value)); setP(1); setRunning(false); }} aria-label="How many numbers to sum">
              {RACE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label className="pl-switch">
            <input type="checkbox" checked={countTransfer} onChange={(e) => { setCountTransfer(e.target.checked); setP(1); setRunning(false); }} />
            <span>
              count PCIe transfer <span className="pl-senior">senior</span>
            </span>
          </label>
        </div>
      }
      footer={
        <div className={cx("gr-verdict", r.winner)}>
          {winnerText}
          <span className="muted"> — {DEFAULT_RACE.gpuLanes.toLocaleString()} GPU lanes, {r.waves} wave{r.waves === 1 ? "" : "s"} of ⌈N/lanes⌉</span>
        </div>
      }
    >
      <div className="gr-lanes">
        <div className="gr-lane">
          <div className="gr-lanehead">
            <span className="gr-dev">CPU · 1 fast lane</span>
            <span className={cx("gr-time", cpuProg >= 1 && "done")}>{fmt(r.cpuTime)}</span>
          </div>
          <div className="gr-track">
            <div className="gr-fill cpu" style={{ width: `${cpuProg * 100}%` }} />
            <div className="gr-runner" style={{ left: `calc(${cpuProg * 100}% - 8px)` }} aria-hidden="true">🏃</div>
            {cpuProg >= 1 && <span className="gr-flag">✓</span>}
          </div>
        </div>

        <div className="gr-lane">
          <div className="gr-lanehead">
            <span className="gr-dev">GPU · {DEFAULT_RACE.gpuLanes.toLocaleString()} slow lanes</span>
            <span className={cx("gr-time", gpuProg >= 1 && "done")}>{fmt(r.gpuTotal)}</span>
          </div>
          <div className="gr-track">
            <div className="gr-fill gpu" style={{ width: `${gpuProg * 100}%` }} />
            <div className="gr-runner" style={{ left: `calc(${gpuProg * 100}% - 8px)` }} aria-hidden="true">🏎️</div>
            {gpuSpinning && <span className="gr-spin">spinning up… (launch{countTransfer ? " + transfer" : ""})</span>}
            {gpuProg >= 1 && <span className="gr-flag">✓</span>}
          </div>
        </div>
      </div>

      <p className="gr-note muted">
        The GPU sits idle through its <b>fixed launch cost</b> (and PCIe transfer, if counted) before any lane does work — so for small N the CPU
        finishes first. Grow N and the GPU&apos;s <b>{DEFAULT_RACE.gpuLanes.toLocaleString()}</b> lanes crush it in a few waves. This is why AI, which
        is billions of parallel multiply-adds on resident data, lives on GPUs (ch.33–34).
      </p>
    </SimShell>
  );
}
