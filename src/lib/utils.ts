import { useSyncExternalStore } from "react";

/** Conditional classnames. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** "front — back" keyPoint convention (types.ts) → flashcard sides. */
export function splitKeyPoint(kp: string): { front: string; back: string } {
  const i = kp.indexOf(" — ");
  if (i === -1) return { front: kp, back: "" };
  return { front: kp.slice(0, i), back: kp.slice(i + 3) };
}

// prefers-reduced-motion, as a reactive hook. Every sim/figure must honor
// it (§6 mandate): animation off → step mode is the fallback.
const rmQuery = "(prefers-reduced-motion: reduce)";
function rmSubscribe(cb: () => void): () => void {
  const mq = window.matchMedia(rmQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function rmSnapshot(): boolean {
  return window.matchMedia(rmQuery).matches;
}
export function useReducedMotion(): boolean {
  return useSyncExternalStore(rmSubscribe, rmSnapshot);
}
