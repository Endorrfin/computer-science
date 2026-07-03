// Figure/sim registry (CLAUDE.md §2): content references interactives by
// key; components are lazy-loaded so each chapter only ships its own sims.
// Record<Key, …> makes the mapping total — a key added in registryKeys.ts
// without a component here is a compile error.
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { FigKey, SimKey } from "./registryKeys.ts";

type LazyComp = LazyExoticComponent<ComponentType>;

const sims: Record<SimKey, LazyComp> = {
  "logic-sandbox": lazy(() => import("../components/sims/logic-sandbox/LogicSandbox.tsx")),
  "demorgan-flip": lazy(() => import("../components/sims/DeMorganFlip.tsx")),
};

const figs: Record<FigKey, LazyComp> = {
  "transistor-switch": lazy(() => import("../components/figures/TransistorSwitch.tsx")),
};

export function getSim(key: string): LazyComp | undefined {
  return (sims as Record<string, LazyComp | undefined>)[key];
}
export function getFig(key: string): LazyComp | undefined {
  return (figs as Record<string, LazyComp | undefined>)[key];
}
