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
  // P2 · The Machine (S3)
  "build-an-adder", // ch.5 micro — half → full → 4-bit ripple, carry sweep
  "alu-visualizer", // ch.5 micro — op select + Z/N/C/V flags
  "latch-playground", // ch.6 micro — SR latch feedback + D flip-flop clock edge
  "ram-grid", // ch.6 micro — address decoder + read/write (reused ch.8/14/23)
  // P2 · The Machine (S4)
  "cpu-8bit", // ch.7 HERO — full 8-bit CPU: assembler + micro-stepped emulator + Fibonacci boss
] as const;

export const FIG_KEYS = [
  // P1 · Information (S2)
  "float-number-line", // ch.1 — representable floats, widening gaps
  "unicode-planes", // ch.2 — the code space from ASCII outward
  "entropy-meter", // ch.3 — Shannon's floor
  // P2 · The Machine (S1)
  "transistor-switch", // ch.4 — voltage-controlled switch stepper
  // P2 · The Machine (S3)
  "mux-router", // ch.5 — select lines steer one of N inputs through
  "memory-hierarchy", // ch.6 — register→L1→L2→RAM→SSD as distances (reused ch.8/14/23)
  // P2 · The Machine (S4)
  "datapath", // ch.7 — the CPU block diagram, stepped micro-op by micro-op
] as const;

export type SimKey = (typeof SIM_KEYS)[number];
export type FigKey = (typeof FIG_KEYS)[number];
