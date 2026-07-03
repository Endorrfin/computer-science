// Registry KEYS only — pure data, importable by the Node qa gate
// (no React here; component wiring lives in registry.tsx).
// INTERACTIVES.md is the naming authority: keys are defined there first.

export const SIM_KEYS = [
  // P1 · Information (S2)
  "bit-inspector", // ch.1 HERO — flip bits on int & float lanes
  "base-converter", // ch.1 micro — positional weights, lit up
  "utf8-encoder", // ch.2 micro — text → code points → bytes
  "pixel-zoom", // ch.2 micro — a colour is three numbers
  "sampling-toy", // ch.2 micro — sampling & aliasing
  "huffman-lab", // ch.3 HERO — build a code / decode the mystery file
  "rle-visualizer", // ch.3 micro — run-length encoding (and its backfire)
  "lz-window", // ch.3 micro — LZ77 sliding window
  // P2 · The Machine (S1)
  "logic-sandbox", // ch.4 HERO — drag-drop circuit builder
  "demorgan-flip", // ch.4 micro — De Morgan morph
] as const;

export const FIG_KEYS = [
  // P1 · Information (S2)
  "float-number-line", // ch.1 — representable floats, widening gaps
  "unicode-planes", // ch.2 — the code space from ASCII outward
  "entropy-meter", // ch.3 — Shannon's floor
  // P2 · The Machine (S1)
  "transistor-switch", // ch.4 — voltage-controlled switch stepper
] as const;

export type SimKey = (typeof SIM_KEYS)[number];
export type FigKey = (typeof FIG_KEYS)[number];
