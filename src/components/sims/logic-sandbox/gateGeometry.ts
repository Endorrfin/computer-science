// Gate-glyph geometry — pure data/geometry split out of gateShapes.tsx so that
// the .tsx file exports only the <GateGlyph> component (react-refresh: a module
// should export components OR helpers, not both). Local space: 64 × 40.
import type { LogicGateKind } from "./model.ts";

export const GATE_W = 64;
export const GATE_H = 40;

/** Input port y-offsets within the 64×40 box. */
export function inputOffsets(kind: LogicGateKind): number[] {
  return kind === "NOT" ? [20] : [12, 28];
}
