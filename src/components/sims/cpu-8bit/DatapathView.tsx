// The live datapath inside the cpu-8bit HERO: a single-bus (SAP-1 style) block
// diagram whose registers, ALU, RAM, control unit and the two buses glow to
// match the micro-step just executed (state.last.active / .bus). This is what
// makes fetch–decode–execute physical — you watch the byte travel.
// Semantic palette (§7): data bus = cyan, control/active = orange,
// registers/state = violet.
import type { ReactNode } from "react";
import { disassemble, signed8 } from "../machine/cpu.ts";
import type { CpuState } from "../machine/cpu.ts";
import { cx } from "../../../lib/utils.ts";

const hex1 = (v: number) => (v & 0x0f).toString(16).toUpperCase();
const hex2 = (v: number) => (v & 0xff).toString(16).toUpperCase().padStart(2, "0");

export default function DatapathView({ state }: { state: CpuState }) {
  const active = new Set(state.last?.active ?? []);
  const bus = state.last?.bus ?? "none";
  const on = (id: string) => active.has(id);
  const ramByte = state.ram[state.mar & 0x0f] ?? 0;

  return (
    <svg viewBox="0 0 720 400" className="cpu-datapath" role="img" aria-label="CPU datapath — the active bus and registers glow for the current micro-step">
      {/* ---- buses ---- */}
      <line className={cx("cpu-bus", bus === "addr" && "hot")} x1={160} y1={96} x2={160} y2={300} />
      <text x={150} y={92} className="cpu-buslbl" textAnchor="end">address bus</text>
      <line className={cx("cpu-bus", bus === "data" && "hot")} x1={350} y1={70} x2={350} y2={372} />
      <text x={360} y={66} className="cpu-buslbl">data bus</text>

      {/* stubs tapping the buses */}
      <line className={cx("cpu-wire", bus === "addr" && on("pc") && "hot")} x1={142} y1={104} x2={160} y2={104} />
      <line className={cx("cpu-wire", bus === "addr" && on("mar") && "hot")} x1={142} y1={170} x2={160} y2={170} />
      <line className={cx("cpu-wire", bus === "addr" && "hot")} x1={160} y1={200} x2={196} y2={200} />
      <line className={cx("cpu-wire", bus === "data" && "hot")} x1={316} y1={200} x2={350} y2={200} />
      <line className={cx("cpu-wire", bus === "data" && on("ir") && "hot")} x1={350} y1={104} x2={386} y2={104} />
      <line className={cx("cpu-wire", bus === "data" && on("a") && "hot")} x1={350} y1={170} x2={386} y2={170} />
      <line className={cx("cpu-wire", bus === "data" && on("b") && "hot")} x1={350} y1={326} x2={386} y2={326} />

      {/* IR → control */}
      <line className={cx("cpu-wire", on("ctrl") && "hot")} x1={461} y1={84} x2={461} y2={64} />
      {/* A ↔ ALU, B → ALU, ALU → flags */}
      <line className={cx("cpu-wire", bus === "alu" && "hot")} x1={461} y1={190} x2={461} y2={210} />
      <line className={cx("cpu-wire", bus === "alu" && "hot")} x1={461} y1={306} x2={461} y2={276} />
      <line className={cx("cpu-wire", bus === "alu" && on("flags") && "hot")} x1={536} y1={245} x2={568} y2={245} />
      <line className={cx("cpu-wire", on("out") && "hot")} x1={536} y1={326} x2={568} y2={326} />

      {/* ---- control unit ---- */}
      <Box id="ctrl" on={on("ctrl")} x={386} y={20} w={310} h={44} title="CONTROL UNIT" sub={state.last?.phase === "decode" ? "decoding…" : "sequences the micro-steps"} />

      {/* ---- memory side ---- */}
      <Box id="pc" on={on("pc")} x={24} y={84} w={118} h={40} title="PC" value={hex1(state.pc)} sub={`→ addr ${state.pc}`} />
      <Box id="mar" on={on("mar")} x={24} y={150} w={118} h={40} title="MAR" value={hex1(state.mar)} sub={`cell ${state.mar}`} />
      <Box id="ram" on={on("ram")} x={196} y={96} w={120} h={208} title="RAM" sub="16 × 8-bit">
        <text x={256} y={210} textAnchor="middle" className="cpu-box-big">{hex2(ramByte)}</text>
        <text x={256} y={232} textAnchor="middle" className="cpu-box-sub">[{state.mar}] = {ramByte}</text>
      </Box>

      {/* ---- compute side ---- */}
      <Box id="ir" on={on("ir")} x={386} y={84} w={150} h={40} title="IR" value={hex2(state.ir)} sub={disassemble(state.ir)} />
      <Box id="a" on={on("a")} x={386} y={150} w={150} h={40} title="A" value={hex2(state.a)} sub={`${state.a} u · ${signed8(state.a)} s`} />

      {/* ALU trapezoid */}
      <g className={cx("cpu-alu", bus === "alu" && "hot")}>
        <path d="M 386 210 L 536 210 L 506 276 L 416 276 Z" />
        <text x={461} y={242} textAnchor="middle" className="cpu-alu-lbl">ALU</text>
      </g>

      <Box id="b" on={on("b")} x={386} y={306} w={150} h={40} title="B" value={hex2(state.b)} sub={`${state.b} u`} />

      {/* flags + out */}
      <g className={cx("cpu-flags", on("flags") && "hot")}>
        <rect x={568} y={224} width={128} height={44} rx={7} />
        {(["z", "n", "c", "v"] as const).map((k, i) => (
          <g key={k}>
            <text x={588 + i * 30} y={240} textAnchor="middle" className="cpu-flag-name">{k.toUpperCase()}</text>
            <text x={588 + i * 30} y={258} textAnchor="middle" className={cx("cpu-flag-bit", state.flags[k] && "set")}>{state.flags[k] ? 1 : 0}</text>
          </g>
        ))}
      </g>
      <Box id="out" on={on("out")} x={568} y={306} w={128} h={40} title="OUT" value={state.out.length ? String(state.out[state.out.length - 1]) : "—"} sub={`${state.out.length} printed`} />
    </svg>
  );
}

// end DatapathView

function Box({
  id,
  on,
  x,
  y,
  w,
  h,
  title,
  value,
  sub,
  children,
}: {
  id: string;
  on: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  value?: string;
  sub?: string;
  children?: ReactNode;
}) {
  const cx0 = x + w / 2;
  return (
    <g className={cx("cpu-box", on && "hot")} data-id={id}>
      <rect x={x} y={y} width={w} height={h} rx={7} />
      {children ? (
        <>
          <text x={cx0} y={y + 20} textAnchor="middle" className="cpu-box-title">{title}</text>
          {sub && <text x={cx0} y={y + 36} textAnchor="middle" className="cpu-box-sub">{sub}</text>}
          {children}
        </>
      ) : value !== undefined ? (
        <>
          <text x={x + 12} y={y + 25} className="cpu-box-title">{title}</text>
          <text x={x + w - 12} y={y + 20} textAnchor="end" className="cpu-box-val">{value}</text>
          {sub && <text x={x + w - 12} y={y + 34} textAnchor="end" className="cpu-box-sub">{sub}</text>}
        </>
      ) : (
        <>
          <text x={cx0} y={y + 20} textAnchor="middle" className="cpu-box-title">{title}</text>
          {sub && <text x={cx0} y={y + 36} textAnchor="middle" className="cpu-box-sub">{sub}</text>}
        </>
      )}
    </g>
  );
}
