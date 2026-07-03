// Figure/sim registry (CLAUDE.md §2): content references interactives by
// key; components are lazy-loaded so each chapter only ships its own sims.
// Record<Key, …> makes the mapping total — a key added in registryKeys.ts
// without a component here is a compile error.
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { FigKey, SimKey } from "./registryKeys.ts";

type LazyComp = LazyExoticComponent<ComponentType>;

const sims: Record<SimKey, LazyComp> = {
  // P1 · Information
  "bit-inspector": lazy(() => import("../components/sims/bit-inspector/BitInspector.tsx")),
  "base-converter": lazy(() => import("../components/sims/BaseConverter.tsx")),
  "utf8-encoder": lazy(() => import("../components/sims/utf8-encoder/Utf8Encoder.tsx")),
  "pixel-zoom": lazy(() => import("../components/sims/PixelZoom.tsx")),
  "sampling-toy": lazy(() => import("../components/sims/SamplingToy.tsx")),
  "huffman-lab": lazy(() => import("../components/sims/huffman-lab/HuffmanLab.tsx")),
  "rle-visualizer": lazy(() => import("../components/sims/RleVisualizer.tsx")),
  "lz-window": lazy(() => import("../components/sims/LzWindow.tsx")),
  // P2 · The Machine
  "logic-sandbox": lazy(() => import("../components/sims/logic-sandbox/LogicSandbox.tsx")),
  "demorgan-flip": lazy(() => import("../components/sims/DeMorganFlip.tsx")),
};

const figs: Record<FigKey, LazyComp> = {
  // P1 · Information
  "float-number-line": lazy(() => import("../components/figures/FloatNumberLine.tsx")),
  "unicode-planes": lazy(() => import("../components/figures/UnicodePlanes.tsx")),
  "entropy-meter": lazy(() => import("../components/figures/EntropyMeter.tsx")),
  // P2 · The Machine
  "transistor-switch": lazy(() => import("../components/figures/TransistorSwitch.tsx")),
};

export function getSim(key: string): LazyComp | undefined {
  return (sims as Record<string, LazyComp | undefined>)[key];
}
export function getFig(key: string): LazyComp | undefined {
  return (figs as Record<string, LazyComp | undefined>)[key];
}
