// Registry KEYS only — pure data, importable by the Node qa gate
// (no React here; component wiring lives in registry.tsx).
// INTERACTIVES.md is the naming authority: keys are defined there first.

export const SIM_KEYS = [
  "logic-sandbox", // ch.4 HERO — drag-drop circuit builder
  "demorgan-flip", // ch.4 micro — De Morgan morph
] as const;

export const FIG_KEYS = [
  "transistor-switch", // ch.4 fig — voltage-controlled switch stepper
] as const;

export type SimKey = (typeof SIM_KEYS)[number];
export type FigKey = (typeof FIG_KEYS)[number];
