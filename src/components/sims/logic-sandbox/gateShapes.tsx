// ANSI-style gate glyphs, shared across sims (§6 cross-sim continuity:
// gates look identical in the sandbox, the De Morgan micro, and every
// later chapter). Local coordinate space: 64 × 40, output at (64, 20).
import type { ReactNode } from "react";
import type { LogicGateKind } from "./model.ts";

export const GATE_W = 64;
export const GATE_H = 40;

/** Input port y-offsets within the 64×40 box. */
export function inputOffsets(kind: LogicGateKind): number[] {
  return kind === "NOT" ? [20] : [12, 28];
}

const BODY: Record<LogicGateKind, ReactNode> = {
  AND: <path d="M10 6 H38 A14 14 0 0 1 38 34 H10 Z" />,
  NAND: (
    <>
      <path d="M4 6 H32 A14 14 0 0 1 32 34 H4 Z" />
      <circle cx="51" cy="20" r="5" />
    </>
  ),
  OR: <path d="M8 6 C 22 6, 38 10, 50 20 C 38 30, 22 34, 8 34 C 14 26, 14 14, 8 6 Z" />,
  NOR: (
    <>
      <path d="M2 6 C 16 6, 32 10, 44 20 C 32 30, 16 34, 2 34 C 8 26, 8 14, 2 6 Z" />
      <circle cx="49" cy="20" r="5" />
    </>
  ),
  XOR: (
    <>
      <path d="M12 6 C 26 6, 42 10, 54 20 C 42 30, 26 34, 12 34 C 18 26, 18 14, 12 6 Z" />
      <path d="M4 6 C 10 14, 10 26, 4 34" fill="none" />
    </>
  ),
  NOT: (
    <>
      <path d="M14 8 L14 32 L40 20 Z" />
      <circle cx="45" cy="20" r="5" />
    </>
  ),
};

const RIGHT_EDGE: Record<LogicGateKind, number> = {
  AND: 52,
  NAND: 56,
  OR: 50,
  NOR: 54,
  XOR: 54,
  NOT: 50,
};

export function GateGlyph({ kind, active }: { kind: LogicGateKind; active?: boolean }) {
  const ins = inputOffsets(kind);
  return (
    <g className={`gate-glyph${active ? " active" : ""}`}>
      {/* input + output stubs */}
      {ins.map((y) => (
        <line key={y} x1="0" y1={y} x2="12" y2={y} />
      ))}
      <line x1={RIGHT_EDGE[kind]} y1="20" x2={GATE_W} y2="20" />
      {BODY[kind]}
      <text x="26" y="52" textAnchor="middle" className="gate-label">
        {kind}
      </text>
    </g>
  );
}
