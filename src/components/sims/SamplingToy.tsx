// [micro] sampling-toy — a smooth sound wave, chopped into samples. Slide the
// sample rate below twice the frequency (Nyquist) and the reconstruction
// collapses onto a lower-frequency ALIAS. Slide the bit depth and the samples
// snap to quantization levels. Reactive (no time axis of its own).
import { useState } from "react";
import SimShell from "./SimShell.tsx";
import { cx } from "../../lib/utils.ts";

const ACCENT = "#FACC15";
const X0 = 40;
const X1 = 540;
const YC = 100;
const AMP = 72;

const px = (t: number) => X0 + t * (X1 - X0); // t in [0,1] → x
const py = (v: number) => YC - v * AMP; // v in [-1,1] → y

function quantize(v: number, depth: number): number {
  const levels = Math.pow(2, depth);
  const step = 2 / (levels - 1);
  return Math.round((v + 1) / step) * step - 1;
}

export default function SamplingToy() {
  const [freq, setFreq] = useState(3); // cycles across the window
  const [rate, setRate] = useState(16); // samples across the window
  const [depth, setDepth] = useState(3); // bits

  const truePath = (() => {
    let d = "M ";
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      d += `${px(t).toFixed(1)} ${py(Math.sin(2 * Math.PI * freq * t)).toFixed(1)} ${i < 240 ? "L " : ""}`;
    }
    return d;
  })();

  const samples = Array.from({ length: rate + 1 }, (_, k) => {
    const t = k / rate;
    const raw = Math.sin(2 * Math.PI * freq * t);
    return { t, raw, q: quantize(raw, depth) };
  });
  const reconPath = "M " + samples.map((s) => `${px(s.t).toFixed(1)} ${py(s.q).toFixed(1)}`).join(" L ");

  const nyquistOk = rate >= 2 * freq;
  const aliasFreq = nyquistOk ? freq : Math.abs(freq - rate * Math.round(freq / rate));
  const levels = Math.pow(2, depth);

  return (
    <SimShell
      title="Sampling & aliasing — turning a wave into numbers"
      simKey="sampling-toy"
      accent={ACCENT}
      onReset={() => {
        setFreq(3);
        setRate(16);
        setDepth(3);
      }}
      status={
        nyquistOk
          ? `Sample rate ${rate} ≥ 2 × ${freq} (Nyquist) — the wave is captured. Amplitude is rounded to ${levels} levels (${depth}-bit).`
          : `⚠ ${rate} < 2 × ${freq}: below Nyquist. The samples now trace a false ${aliasFreq.toFixed(1)}-cycle wave — that's aliasing (the wagon-wheel effect, in sound).`
      }
      controls={
        <>
          <label className="ss-field smp-slider">
            freq {freq}
            <input type="range" min={1} max={10} value={freq} onChange={(e) => setFreq(Number(e.target.value))} aria-label="Signal frequency" />
          </label>
          <label className="ss-field smp-slider">
            rate {rate}
            <input type="range" min={2} max={40} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Sample rate" />
          </label>
          <label className="ss-field smp-slider">
            depth {depth}-bit
            <input type="range" min={1} max={6} value={depth} onChange={(e) => setDepth(Number(e.target.value))} aria-label="Bit depth" />
          </label>
        </>
      }
    >
      <svg viewBox="0 0 560 200" className="smp-svg" aria-label="sampling visualization">
        {/* quantization levels */}
        {Array.from({ length: levels }, (_, i) => {
          const v = -1 + (2 * i) / (levels - 1);
          return <line key={i} x1={X0} y1={py(v)} x2={X1} y2={py(v)} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 5" />;
        })}
        <line x1={X0} y1={YC} x2={X1} y2={YC} stroke="var(--tx3)" strokeWidth="1" />

        {/* true continuous wave */}
        <path d={truePath} fill="none" stroke="var(--tx2)" strokeWidth="1.5" opacity="0.7" />

        {/* reconstruction from samples */}
        <path d={reconPath} fill="none" stroke={nyquistOk ? "var(--sem-data)" : "var(--sem-err)"} strokeWidth="2.5" />

        {/* sample stems + dots */}
        {samples.map((s, i) => (
          <g key={i}>
            <line x1={px(s.t)} y1={YC} x2={px(s.t)} y2={py(s.q)} stroke="var(--sem-control)" strokeWidth="1" opacity="0.5" />
            <circle cx={px(s.t)} cy={py(s.q)} r="3.4" fill="var(--sem-control)" />
          </g>
        ))}

        <text x={X0} y={18} fill="var(--tx2)" fontFamily="var(--font-mono)" fontSize="11">
          true wave
        </text>
        <text x={X0 + 92} y={18} fill={nyquistOk ? "var(--sem-data)" : "var(--sem-err)"} fontFamily="var(--font-mono)" fontSize="11">
          reconstructed
        </text>
        <text x={X0 + 220} y={18} fill="var(--sem-control)" fontFamily="var(--font-mono)" fontSize="11">
          samples
        </text>
      </svg>

      <div className={cx("smp-verdict", nyquistOk ? "ok" : "bad")}>
        {nyquistOk
          ? "Above Nyquist → the orange dots pin the wave down; joined up, they recover it."
          : "Below Nyquist → the dots are too sparse; joined up, they invent a slower wave that was never there."}
      </div>

      <p className="lsb-canvas-hint muted">
        Two independent knobs: <strong>sample rate</strong> (how often you measure — horizontal) sets the highest
        frequency you can capture; <strong>bit depth</strong> (how finely you round each measurement — vertical) sets
        the noise floor. CD audio is 44,100 samples/s × 16-bit, chosen to cover the ~20 kHz limit of human hearing.
      </p>
    </SimShell>
  );
}
