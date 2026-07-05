// [fig] datapath — the CPU block diagram, stepped one micro-operation at a time
// for a single example instruction (ADD). Each frame lights the bus + registers
// that move in that T-state, so fetch→decode→execute becomes a sequence of
// concrete register transfers. Shares the visual language of the cpu-8bit HERO
// (same box/bus classes, §7 palette: data=cyan, control/active=orange).
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import { cx } from "../../lib/utils.ts";

type BusName = "addr" | "data" | "alu" | "ctrl" | "none";

function Diagram({ active, bus }: { active: string[]; bus: BusName }) {
  const on = (id: string) => active.includes(id);
  return (
    <g fontFamily="var(--font-mono)">
      {/* buses */}
      <line className={cx("cpu-bus", bus === "addr" && "hot")} x1={138} y1={54} x2={138} y2={200} />
      <text x={130} y={48} className="cpu-buslbl" textAnchor="end">address</text>
      <line className={cx("cpu-bus", bus === "data" && "hot")} x1={300} y1={30} x2={300} y2={250} />
      <text x={308} y={26} className="cpu-buslbl">data</text>

      {/* stubs */}
      <line className={cx("cpu-wire", bus === "addr" && (on("pc") || on("mar")) && "hot")} x1={120} y1={62} x2={138} y2={62} />
      <line className={cx("cpu-wire", bus === "addr" && "hot")} x1={138} y1={120} x2={170} y2={120} />
      <line className={cx("cpu-wire", bus === "data" && "hot")} x1={266} y1={120} x2={300} y2={120} />
      <line className={cx("cpu-wire", bus === "data" && (on("ir") || on("a") || on("b")) && "hot")} x1={300} y1={62} x2={330} y2={62} />
      <line className={cx("cpu-wire", on("ctrl") && "hot")} x1={390} y1={44} x2={390} y2={36} />
      <line className={cx("cpu-wire", bus === "alu" && "hot")} x1={390} y1={134} x2={390} y2={150} />
      <line className={cx("cpu-wire", bus === "alu" && "hot")} x1={390} y1={225} x2={390} y2={205} />
      <line className={cx("cpu-wire", bus === "alu" && on("flags") && "hot")} x1={450} y1={178} x2={480} y2={178} />

      {/* control */}
      <FBox id="ctrl" on={on("ctrl")} x={330} y={6} w={260} h={30} label="CONTROL UNIT" />
      {/* memory side */}
      <FBox id="pc" on={on("pc")} x={24} y={44} w={96} h={34} label="PC" />
      <FBox id="mar" on={on("mar")} x={24} y={100} w={96} h={34} label="MAR" />
      <FBox id="ram" on={on("ram")} x={170} y={54} w={96} h={132} label="RAM" />
      {/* compute side */}
      <FBox id="ir" on={on("ir")} x={330} y={44} w={120} h={34} label="IR" />
      <FBox id="a" on={on("a")} x={330} y={100} w={120} h={34} label="A" />
      <g className={cx("cpu-alu", bus === "alu" && "hot")}>
        <path d="M 330 150 L 450 150 L 424 205 L 356 205 Z" />
        <text x={390} y={182} textAnchor="middle" className="cpu-alu-lbl">ALU</text>
      </g>
      <FBox id="b" on={on("b")} x={330} y={225} w={120} h={34} label="B" />
      <FBox id="flags" on={on("flags")} x={480} y={161} w={110} h={34} label="Z N C V" />
      <FBox id="out" on={on("out")} x={480} y={225} w={110} h={34} label="OUT" />
    </g>
  );
}

function FBox({ id, on, x, y, w, h, label }: { id: string; on: boolean; x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g className={cx("cpu-box", on && "hot")} data-id={id}>
      <rect x={x} y={y} width={w} height={h} rx={6} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="cpu-box-title">{label}</text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption: "Fetch · step 1 — the Program Counter drives its address onto the address bus into the MAR: “read the byte at this location.”",
    render: () => <Diagram active={["pc", "mar"]} bus="addr" />,
  },
  {
    caption: "Fetch · step 2 — RAM returns that byte on the data bus into the Instruction Register. The PC ticks up, already pointing at the next byte.",
    render: () => <Diagram active={["ram", "ir", "pc"]} bus="data" />,
  },
  {
    caption: "Decode — the control unit reads the IR's opcode nibble (here: ADD) and switches on exactly the control lines the execute steps need.",
    render: () => <Diagram active={["ir", "ctrl"]} bus="ctrl" />,
  },
  {
    caption: "Execute · step 1 — the instruction's operand nibble is a RAM address; it goes out on the address bus to the MAR to fetch the data.",
    render: () => <Diagram active={["ir", "mar"]} bus="addr" />,
  },
  {
    caption: "Execute · step 2 — the addressed byte flows over the data bus into B, the ALU's second-operand latch (the ch.6 register).",
    render: () => <Diagram active={["ram", "b"]} bus="data" />,
  },
  {
    caption: "Execute · step 3 — the ch.5 ALU computes A + B, writes the sum back into A, and updates the Z/N/C/V flags. Done — the loop returns to fetch.",
    render: () => <Diagram active={["a", "b", "alu", "flags"]} bus="alu" />,
  },
];

export default function Datapath() {
  return <FigureStepper title="The datapath — one instruction, micro-step by micro-step" figKey="datapath" viewBox="0 0 620 270" frames={FRAMES} accent="#FB923C" />;
}
