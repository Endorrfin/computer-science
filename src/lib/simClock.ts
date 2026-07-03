import { useEffect, useRef } from "react";

/** Shared tick loop for sims: stable interval driven by running/ticksPerSec,
    latest onTick always called (no stale closures, no effect churn). */
export function useSimClock(running: boolean, ticksPerSec: number, onTick: () => void): void {
  const cb = useRef(onTick);
  useEffect(() => {
    cb.current = onTick;
  });
  useEffect(() => {
    if (!running || ticksPerSec <= 0) return;
    const ms = Math.max(16, 1000 / ticksPerSec);
    const id = window.setInterval(() => cb.current(), ms);
    return () => window.clearInterval(id);
  }, [running, ticksPerSec]);
}
