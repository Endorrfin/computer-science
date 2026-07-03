// [fig] float-number-line — why floats "lose precision far from zero":
// each power-of-two octave holds the SAME number of representable values,
// so as the octave doubles in width the values spread twice as far apart.
// Semantic palette: representable ticks = cyan; the danger zone = red.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

const X0 = 40;
const X1 = 540;
const AXIS_Y = 120;

function axis(min: number, max: number) {
  const map = (v: number) => X0 + ((v - min) / (max - min)) * (X1 - X0);
  return { map };
}

function Axis({ label }: { label: string }) {
  return (
    <>
      <line x1={X0} y1={AXIS_Y} x2={X1} y2={AXIS_Y} stroke="var(--tx2)" strokeWidth="2" />
      <path d={`M ${X1} ${AXIS_Y} l -10 -5 l 0 10 z`} fill="var(--tx2)" />
      <text x={X0} y={AXIS_Y + 34} fill="var(--tx3)" fontFamily="var(--font-mono)" fontSize="11">
        {label}
      </text>
    </>
  );
}

/** `count` evenly spaced representable ticks across [from,to] under `map`. */
function Ticks({ from, to, count, map, tone = "var(--sem-data)" }: { from: number; to: number; count: number; map: (v: number) => number; tone?: string }) {
  const ticks = [];
  for (let i = 0; i <= count; i++) {
    const v = from + ((to - from) * i) / count;
    ticks.push(<line key={i} x1={map(v)} y1={AXIS_Y - 9} x2={map(v)} y2={AXIS_Y + 9} stroke={tone} strokeWidth="2" />);
  }
  return <g>{ticks}</g>;
}

function Marker({ x, label, tone = "var(--tx2)" }: { x: number; label: string; tone?: string }) {
  return (
    <g fontFamily="var(--font-mono)" fontSize="11">
      <line x1={x} y1={AXIS_Y - 20} x2={x} y2={AXIS_Y + 20} stroke={tone} strokeWidth="1" strokeDasharray="3 3" />
      <text x={x} y={AXIS_Y - 26} textAnchor="middle" fill={tone}>
        {label}
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "A float packs a fixed number of significand steps into whatever octave [2ⁿ, 2ⁿ⁺¹) it lands in. Start in [1, 2): the representable values are evenly, tightly spaced.",
    render: () => {
      const { map } = axis(1, 2);
      return (
        <g>
          <Axis label="the octave [1, 2)" />
          <Ticks from={1} to={2} count={16} map={map} />
          <Marker x={map(1)} label="1" />
          <Marker x={map(2)} label="2" />
          <text x={X0} y={40} fill="var(--sem-data)" fontFamily="var(--font-mono)" fontSize="12">
            same # of ticks live in every octave
          </text>
        </g>
      );
    },
  },
  {
    caption:
      "Now show three octaves at once on one linear ruler. Each holds the same tick count — but [2,4) is twice as wide as [1,2), and [4,8) twice as wide again. The ticks visibly spread.",
    render: () => {
      const { map } = axis(1, 8);
      return (
        <g>
          <Axis label="[1,2) · [2,4) · [4,8) — one linear ruler" />
          <Ticks from={1} to={2} count={16} map={map} />
          <Ticks from={2} to={4} count={16} map={map} />
          <Ticks from={4} to={8} count={16} map={map} />
          <Marker x={map(1)} label="1" />
          <Marker x={map(2)} label="2" />
          <Marker x={map(4)} label="4" />
          <Marker x={map(8)} label="8" />
        </g>
      );
    },
  },
  {
    caption:
      "So the gap DOUBLES every octave. Near 1 the spacing is 2⁻⁵² (a double); by the time you reach large numbers the spacing has doubled hundreds of times. Precision is relative, not absolute.",
    render: () => {
      const { map } = axis(1, 8);
      return (
        <g>
          <Axis label="gap doubles each octave" />
          <Ticks from={1} to={2} count={16} map={map} />
          <Ticks from={2} to={4} count={8} map={map} />
          <Ticks from={4} to={8} count={4} map={map} />
          <g fontFamily="var(--font-mono)" fontSize="10" fill="var(--tx3)">
            <text x={map(1.5)} y={AXIS_Y + 28} textAnchor="middle">gap g</text>
            <text x={map(3)} y={AXIS_Y + 28} textAnchor="middle">2g</text>
            <text x={map(6)} y={AXIS_Y + 28} textAnchor="middle">4g</text>
          </g>
          <Marker x={map(1)} label="1" />
          <Marker x={map(8)} label="8" />
        </g>
      );
    },
  },
  {
    caption:
      "Push far enough and the gap grows past 1. At 2⁵³ a double can no longer represent every integer: 2⁵³ and 2⁵³+1 collapse onto the same value. Beyond here, +1 can silently do nothing.",
    render: () => {
      const { map } = axis(0, 6);
      const marks = [0, 1, 2, 3, 4, 5, 6];
      return (
        <g>
          <Axis label="near 2⁵³ (integers, spacing = 2)" />
          <rect x={map(0)} y={AXIS_Y - 26} width={map(6) - map(0)} height="52" fill="var(--sem-err)" opacity="0.08" />
          {marks.map((k) => (
            <g key={k}>
              {k % 2 === 0 ? (
                <line x1={map(k)} y1={AXIS_Y - 9} x2={map(k)} y2={AXIS_Y + 9} stroke="var(--sem-data)" strokeWidth="2" />
              ) : (
                <line x1={map(k)} y1={AXIS_Y - 6} x2={map(k)} y2={AXIS_Y + 6} stroke="var(--sem-err)" strokeWidth="1.5" strokeDasharray="2 3" />
              )}
              <text x={map(k)} y={AXIS_Y + 30} textAnchor="middle" fill={k % 2 === 0 ? "var(--sem-data)" : "var(--sem-err)"} fontFamily="var(--font-mono)" fontSize="10">
                2⁵³{k === 0 ? "" : `+${k}`}
              </text>
            </g>
          ))}
          <text x={map(3)} y={40} textAnchor="middle" fill="var(--sem-err)" fontFamily="var(--font-mono)" fontSize="12">
            odd integers are NOT representable here
          </text>
        </g>
      );
    },
  },
  {
    caption:
      "The mirror image near zero: below the smallest normal float, subnormals fill the gap down to 0 with even spacing — a graceful underflow — and then, finally, exactly 0. Floats are a logarithmic ruler with a linear patch at the bottom.",
    render: () => {
      const { map } = axis(0, 8);
      return (
        <g>
          <Axis label="toward zero: subnormals, then 0" />
          <circle cx={map(0)} cy={AXIS_Y} r="4" fill="var(--sem-state)" />
          <Ticks from={0.1} to={1} count={6} map={map} tone="var(--sem-state)" />
          <Ticks from={1} to={2} count={8} map={map} />
          <Ticks from={2} to={4} count={8} map={map} />
          <Ticks from={4} to={8} count={8} map={map} />
          <Marker x={map(0)} label="0" tone="var(--sem-state)" />
          <text x={map(0.55)} y={AXIS_Y - 26} textAnchor="middle" fill="var(--sem-state)" fontFamily="var(--font-mono)" fontSize="10">
            subnormals
          </text>
        </g>
      );
    },
  },
];

export default function FloatNumberLine() {
  return (
    <FigureStepper
      title="Representable floats on a number line"
      figKey="float-number-line"
      viewBox="0 0 560 175"
      accent="#FACC15"
      frames={FRAMES}
    />
  );
}
