// [micro] pipeline-visualizer — the classic 5-stage pipeline as an occupancy
// chart: rows are stages (IF/ID/EX/MEM/WB), columns are cycles, each cell shows
// which instruction is in that stage. Watch instructions flow diagonally, a
// data hazard punch a stall bubble, and a taken branch flush the wrong-path
// slots. Toggle forwarding to see the bubbles shrink. Engine: fast-cpu/pipeline.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { PIPELINE_PRESETS, STAGES, pipelinePresetById, simulatePipeline } from "../fast-cpu/pipeline.ts";
import type { Stage } from "../fast-cpu/pipeline.ts";

const ACCENT = "#FB923C";
// stable per-instruction colours so you can trace one instruction diagonally
const PALETTE = ["#22d3ee", "#a78bfa", "#4ade80", "#facc15", "#f472b6", "#38bdf8", "#fb923c", "#f87171"];

export default function PipelineVisualizer() {
  const [presetId, setPresetId] = useState("raw-chain");
  const [forwarding, setForwarding] = useState(false);
  const [t, setT] = useState<number>(-1); // cycles revealed (−1 sentinel = "show all")
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const preset = pipelinePresetById(presetId) ?? PIPELINE_PRESETS[0];
  const res = useMemo(() => simulatePipeline(preset.program, { forwarding }), [preset, forwarding]);
  const total = res.cycles;
  const shown = t < 0 ? total : Math.min(t, total);

  useSimClock(running, 2.2 * speed, () => {
    setT((x) => {
      const cur = x < 0 ? total : x;
      if (cur >= total) {
        setRunning(false);
        return total;
      }
      return cur + 1;
    });
  });

  // occupancy + bubble lookup, indexed [stageIndex][cycle]
  const { occ, bub } = useMemo(() => {
    const occ: number[][] = STAGES.map(() => Array(total).fill(-1));
    const bub: (string | null)[][] = STAGES.map(() => Array(total).fill(null));
    const si = (s: Stage) => STAGES.indexOf(s);
    for (const p of res.placements) occ[si(p.stage)][p.cycle] = p.instr;
    for (const b of res.bubbles) bub[si(b.stage)][b.cycle] = b.kind;
    return { occ, bub };
  }, [res, total]);

  function restart() {
    setT(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setT((x) => {
      const cur = x < 0 ? 0 : x;
      return Math.min(total, cur + 1);
    });
  }
  function onReset() {
    setRunning(false);
    setT(-1);
  }
  function pickPreset(id: string) {
    setPresetId(id);
    setRunning(false);
    setT(-1);
  }

  const cpi = res.cpi.toFixed(2);
  const util = ((res.idealCycles / total) * 100).toFixed(0);

  return (
    <SimShell
      title="5-stage pipeline — flow, stall, flush"
      simKey="pipeline-visualizer"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`${preset.name} · forwarding ${forwarding ? "ON" : "OFF"} · ${total} cycles for ${preset.program.length} instr · CPI ${cpi} · ${res.stalls} stall + ${res.flushes} flush bubbles`}
      controls={
        <div className="pl-ctl">
          <label className="ss-field">
            program
            <select value={presetId} onChange={(e) => pickPreset(e.target.value)} aria-label="Pipeline program preset">
              {PIPELINE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="pl-switch">
            <input type="checkbox" checked={forwarding} onChange={(e) => setForwarding(e.target.checked)} />
            <span>
              forwarding <span className="pl-senior">senior</span>
            </span>
          </label>
        </div>
      }
      footer={
        <div className="pl-metrics" role="group" aria-label="Pipeline metrics">
          <div className="pl-metric">
            <span className="pl-mv">{shown < 0 ? total : shown}</span>
            <span className="pl-ml">cycle</span>
          </div>
          <div className="pl-metric">
            <span className="pl-mv">{total}</span>
            <span className="pl-ml">total ({res.idealCycles} ideal)</span>
          </div>
          <div className="pl-metric">
            <span className={cx("pl-mv", res.stalls > 0 && "warn")}>{res.stalls}</span>
            <span className="pl-ml">stall ⊘</span>
          </div>
          <div className="pl-metric">
            <span className={cx("pl-mv", res.flushes > 0 && "err")}>{res.flushes}</span>
            <span className="pl-ml">flush ✕</span>
          </div>
          <div className="pl-metric">
            <span className="pl-mv">{cpi}</span>
            <span className="pl-ml">CPI ({util}% full)</span>
          </div>
        </div>
      }
    >
      <p className="pl-blurb muted">{preset.blurb}</p>

      <div className="pl-gridwrap" role="img" aria-label={`Pipeline diagram: ${total} cycles, ${res.stalls} stalls, ${res.flushes} flushes`}>
        <div className="pl-grid" style={{ gridTemplateColumns: `48px repeat(${total}, 1fr)` }}>
          <div className="pl-corner" />
          {Array.from({ length: total }, (_, c) => (
            <div key={c} className={cx("pl-cyc", c < shown && "on")}>
              {c + 1}
            </div>
          ))}
          {STAGES.map((stage, sIdx) => (
            <div key={stage} className="pl-row" style={{ display: "contents" }}>
              <div className="pl-stage">{stage}</div>
              {Array.from({ length: total }, (_, c) => {
                const instr = occ[sIdx][c];
                const bubble = bub[sIdx][c];
                const visible = c < shown;
                if (!visible) return <div key={c} className="pl-cell" />;
                if (instr >= 0) {
                  const color = PALETTE[instr % PALETTE.length];
                  return (
                    <div
                      key={c}
                      className="pl-cell filled"
                      style={{ background: `color-mix(in srgb, ${color} 26%, var(--surface))`, borderColor: color }}
                      title={`cycle ${c + 1} · ${stage} · ${preset.program[instr].label}`}
                    >
                      <span className="pl-i" style={{ color }}>
                        {instr}
                      </span>
                    </div>
                  );
                }
                if (bubble) return <div key={c} className={cx("pl-cell", bubble === "stall" ? "stall" : "flush")}>{bubble === "stall" ? "⊘" : "✕"}</div>;
                return <div key={c} className="pl-cell" />;
              })}
            </div>
          ))}
        </div>
      </div>

      <ol className="pl-legend">
        {preset.program.map((ins, i) => (
          <li key={i} className="pl-leg">
            <span className="pl-swatch" style={{ background: PALETTE[i % PALETTE.length] }}>
              {i}
            </span>
            <code>{ins.label}</code>
            {ins.isLoad && <span className="pl-tag data">load</span>}
            {ins.isBranch && <span className="pl-tag ctl">branch {ins.taken ? "taken" : "not taken"}</span>}
          </li>
        ))}
      </ol>
    </SimShell>
  );
}
