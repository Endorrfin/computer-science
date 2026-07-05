// [fig] mux-router — a 4-to-1 multiplexer: two select bits steer one of four
// data inputs through to a single output. Hardware's switch/if.
// Semantic palette (§7): data values = cyan, select/control + active path = orange.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

// D0..D3 fixed data values the reader can track across frames.
const DATA: readonly number[] = [1, 0, 1, 1];
// Vertical center of each input row, top → bottom (D0..D3).
const ROW_Y: readonly number[] = [70, 110, 150, 190];

type Scene = {
  // Which input (0..3) is selected, or -1 for "none yet".
  sel: number;
  // Show the abstraction note at the bottom.
  note?: boolean;
};

function selBits(sel: number): string {
  return sel < 0 ? "--" : `${(sel >> 1) & 1}${sel & 1}`;
}

function Mux({ sel, note }: Scene) {
  const active = sel >= 0;
  const trapTop = 55;
  const trapBottom = 245;
  const trapLeft = 300;
  const trapRight = 360;
  // Output taps the vertical middle of the trapezoid's right edge.
  const outY = (trapTop + 40 + (trapBottom - 40)) / 2;

  return (
    <g fontFamily="var(--font-mono)" fontSize="12">
      {/* trapezoid mux body */}
      <path
        d={`M ${trapLeft} ${trapTop} L ${trapRight} ${trapTop + 40} L ${trapRight} ${trapBottom - 40} L ${trapLeft} ${trapBottom} Z`}
        fill="var(--s2)"
        stroke="var(--line)"
        strokeWidth="2"
      />
      <text x={trapLeft + 14} y={outY - 8} fill="var(--tx3)" fontSize="11">
        4:1
      </text>
      <text x={trapLeft + 14} y={outY + 8} fill="var(--tx3)" fontSize="11">
        MUX
      </text>

      {/* four data inputs: wire, label, value */}
      {ROW_Y.map((y, d) => {
        const on = sel === d;
        const wireColor = active ? (on ? "var(--sem-control)" : "var(--tx3)") : "var(--tx2)";
        const valColor = on || !active ? "var(--sem-data)" : "var(--tx3)";
        return (
          <g key={d}>
            <line x1="90" y1={y} x2={trapLeft} y2={y} stroke={wireColor} strokeWidth={on ? 3 : 2} />
            <text x="52" y={y + 4} fill={on && active ? "var(--sem-control)" : "var(--tx2)"} fontWeight={on ? 700 : 400}>
              D{d}
            </text>
            <rect x="66" y={y - 11} width="20" height="22" rx="4" fill="var(--bg)" stroke={valColor} strokeWidth={on ? 2 : 1} />
            <text x="76" y={y + 4} textAnchor="middle" fill={valColor} fontWeight={on ? 700 : 400}>
              {DATA[d]}
            </text>
          </g>
        );
      })}

      {/* output wire + Y box */}
      <line x1={trapRight} y1={outY} x2="470" y2={outY} stroke={active ? "var(--sem-control)" : "var(--tx3)"} strokeWidth={active ? 3 : 2} />
      <rect
        x="470"
        y={outY - 15}
        width="30"
        height="30"
        rx="5"
        fill="var(--bg)"
        stroke={active ? "var(--sem-data)" : "var(--tx3)"}
        strokeWidth={active ? 2 : 1}
      />
      <text x="485" y={outY + 5} textAnchor="middle" fill={active ? "var(--sem-data)" : "var(--tx3)"} fontWeight="700">
        {active ? DATA[sel] : "?"}
      </text>
      <text x="485" y={outY - 24} textAnchor="middle" fill="var(--tx2)">
        Y
      </text>

      {/* select lines S1 S0 entering the bottom */}
      <g stroke={active ? "var(--sem-control)" : "var(--tx2)"} strokeWidth="2">
        <line x1="318" y1="290" x2="318" y2={trapBottom - 8} />
        <line x1="342" y1="290" x2="342" y2={trapBottom - 8} />
      </g>
      <text x="300" y="286" fill="var(--sem-control)" fontWeight="700">
        S1
      </text>
      <text x="348" y="286" fill="var(--sem-control)" fontWeight="700">
        S0
      </text>
      <rect x="392" y="262" width="70" height="26" rx="5" fill="var(--bg)" stroke="var(--sem-control)" strokeWidth={active ? 2 : 1} />
      <text x="427" y="279" textAnchor="middle" fill="var(--sem-control)" fontWeight="700">
        S = {selBits(sel)}
      </text>

      {note && (
        <g fontSize="11">
          <text x="30" y="235" fill="var(--tx2)">
            a mux is hardware&apos;s <tspan fill="var(--sem-control)" fontWeight="700">switch</tspan> / <tspan fill="var(--sem-control)" fontWeight="700">if</tspan>:
          </text>
          <text x="30" y="252" fill="var(--tx2)">
            n select bits pick 1 of 2ⁿ inputs.
          </text>
          <text x="30" y="269" fill="var(--tx3)">
            reverse it (a demux / decoder) and you
          </text>
          <text x="30" y="284" fill="var(--tx3)">
            have how RAM finds one cell (ch.6).
          </text>
        </g>
      )}
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "One output Y, but four candidates: D0=1, D1=0, D2=1, D3=1 (cyan). Two select bits S1 S0 (orange) enter the bottom — their value 00/01/10/11 decides which single input reaches the output.",
    render: () => <Mux sel={-1} />,
  },
  {
    caption:
      "S = 00 selects D0. Only its path lights up (orange); the other three are ignored (dimmed). The output copies D0's value: Y = 1.",
    render: () => <Mux sel={0} />,
  },
  {
    caption:
      "S = 01 selects D1. The steered path moves to the second row and Y follows it: Y = 0. Same hardware, different select value, different winner.",
    render: () => <Mux sel={1} />,
  },
  {
    caption: "S = 10 selects D2 → Y = 1. The select bits are an address into the inputs; here they name row 2.",
    render: () => <Mux sel={2} />,
  },
  {
    caption: "S = 11 selects D3 → Y = 1. Four possible sources, exactly one delivered — chosen purely by the two control bits.",
    render: () => <Mux sel={3} />,
  },
  {
    caption:
      "Zoom out: a mux is hardware's switch / if — n select bits choose 1 of 2ⁿ inputs. Run it backwards (a demultiplexer / decoder) and you have exactly how RAM decodes an address to find one cell (ch.6).",
    render: () => <Mux sel={3} note />,
  },
];

export default function MuxRouter() {
  return (
    <FigureStepper
      title="Multiplexer: select lines steer one input through"
      figKey="mux-router"
      viewBox="0 0 560 300"
      accent="#FB923C"
      frames={FRAMES}
    />
  );
}
