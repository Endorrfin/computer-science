// [fig] entropy-meter — Shannon's floor made visible: how many bits per symbol
// a source really needs. Predictable text → near 0; random bytes → 8. No
// lossless coder can go below the entropy line. Order-0 (per-symbol) entropy,
// computed live from the sample by the same engine ch.3 tests.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import { entropyBits } from "../sims/compression/model.ts";

const X0 = 40;
const X1 = 520;
const MAXBITS = 8;
const gaugeY = 96;

function Gauge({ sample, bits, note, tone = "var(--sem-data)" }: { sample: string; bits: number; note: string; tone?: string }) {
  const frac = Math.min(1, bits / MAXBITS);
  const fillW = (X1 - X0) * frac;
  return (
    <g fontFamily="var(--font-mono)">
      <text x={X0} y={40} fill="var(--tx2)" fontSize="13">
        sample: <tspan fill="var(--tx)">“{sample.length > 30 ? sample.slice(0, 30) + "…" : sample}”</tspan>
      </text>

      {/* track */}
      <rect x={X0} y={gaugeY} width={X1 - X0} height={26} rx="5" fill="var(--s2)" stroke="var(--line)" />
      <rect x={X0} y={gaugeY} width={fillW} height={26} rx="5" fill={tone} opacity="0.8" />
      {/* ticks 1..8 bits */}
      {Array.from({ length: MAXBITS + 1 }, (_, i) => {
        const x = X0 + ((X1 - X0) * i) / MAXBITS;
        return (
          <g key={i}>
            <line x1={x} y1={gaugeY - 5} x2={x} y2={gaugeY + 31} stroke="var(--tx3)" strokeWidth={i % 2 === 0 ? 1 : 0.5} opacity="0.5" />
            {i % 2 === 0 && <text x={x} y={gaugeY + 48} textAnchor="middle" fill="var(--tx3)" fontSize="10">{i}</text>}
          </g>
        );
      })}
      <text x={X0} y={gaugeY - 12} fill="var(--tx3)" fontSize="10">bits per symbol →</text>

      {/* needle value */}
      <text x={X0 + fillW} y={gaugeY - 12} textAnchor="middle" fill={tone} fontSize="14" fontWeight="700">
        {bits.toFixed(2)}
      </text>

      <text x={X0} y={172} fill="var(--tx2)" fontSize="12">{note}</text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Entropy measures surprise. A source that always emits the same symbol carries zero information per symbol — you already know what's next. RLE crushes it to almost nothing.",
    render: () => <Gauge sample="AAAAAAAAAAAA" bits={entropyBits("AAAAAAAAAAAA")} note="fully predictable → ~0 bits/symbol → hugely compressible" tone="var(--sem-ok)" />,
  },
  {
    caption:
      "Two symbols, equally likely: one bit of surprise each — a fair coin. That's the honest per-symbol floor; any structure beyond that (here, strict alternation) a smarter model could still exploit.",
    render: () => <Gauge sample="ABABABABABAB" bits={entropyBits("ABABABABABAB")} note="two equally likely symbols → exactly 1 bit/symbol" tone="var(--sem-ok)" />,
  },
  {
    caption:
      "Natural language is redundant. Counting single letters, English sits around 4 bits/symbol — and once you model context (q→u, 'th'→e), Shannon estimated barely ~1 bit/letter. Redundancy is what compressors eat.",
    render: () => <Gauge sample="the quick brown fox jumps over" bits={entropyBits("the quick brown fox jumps over")} note="per-letter ≈ 4 bits; with context, English ≈ 1 bit/letter" tone="var(--sem-data)" />,
  },
  {
    caption:
      "Flatten the distribution — every letter equally likely — and entropy climbs to log₂(26) ≈ 4.70 bits. No redundancy left between letters; only the alphabet size limits you.",
    render: () => <Gauge sample="abcdefghijklmnopqrstuvwxyz" bits={entropyBits("abcdefghijklmnopqrstuvwxyz")} note="26 equally likely symbols → log₂(26) ≈ 4.70 bits" tone="var(--sem-control)" />,
  },
  {
    caption:
      "True random bytes: all 256 values equally likely → 8 bits each, exactly their size. Nothing to predict, nothing to remove — incompressible. This is the wall every codec meets, and why 'compress the already-compressed' does nothing.",
    render: () => <Gauge sample="⋯ random bytes ⋯" bits={8} note="maximum entropy: 8 bits/byte → compression gains nothing" tone="var(--sem-err)" />,
  },
];

export default function EntropyMeter() {
  return <FigureStepper title="Entropy — the floor no lossless coder beats" figKey="entropy-meter" viewBox="0 0 560 190" accent="#FACC15" frames={FRAMES} />;
}
