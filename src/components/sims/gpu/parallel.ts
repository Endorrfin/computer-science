// Engine — a CPU-vs-GPU timing model for a data-parallel job (summing/mapping
// N elements). Pure & erasable-syntax (Node-testable). Drives cpu-vs-gpu-race
// (ch.9). Numbers are illustrative-but-honest orders of magnitude, not a spec.
//
// CPU: one fast lane. A modern core is superscalar + SIMD, so it chews a few
//   elements per nanosecond — but it is essentially ONE worker.
// GPU: thousands of slower lanes. Each element is cheaper to *start* but a lane
//   ticks slower; the win is width. Against that width sit two fixed costs the
//   chapter insists on: kernel-launch latency (you pay it even for N=1) and,
//   optionally, host↔device transfer over PCIe (a per-element tax that can make
//   a trivial one-shot job transfer-bound — the reason a lone sum may lose).

export type RaceConfig = {
  cpuElemNs: number; // time per element on the single CPU lane
  gpuLanes: number; // parallel GPU lanes
  gpuElemNs: number; // time per element on one (slower) GPU lane
  launchNs: number; // fixed kernel-launch overhead
  transferNs: number; // per-element host↔device transfer cost
  countTransfer: boolean; // include PCIe transfer in the GPU total?
};

export const DEFAULT_RACE: RaceConfig = {
  cpuElemNs: 0.5,
  gpuLanes: 1024,
  gpuElemNs: 1.5,
  launchNs: 5000,
  transferNs: 0.4,
  countTransfer: false,
};

export type RaceResult = {
  n: number;
  cpuTime: number;
  gpuCompute: number; // parallel compute time (waves × per-lane cost)
  gpuLaunch: number;
  gpuTransfer: number;
  gpuTotal: number;
  waves: number; // ⌈N / lanes⌉ — how many passes the lanes make
  speedup: number; // cpuTime / gpuTotal (>1 ⇒ GPU wins)
  winner: "cpu" | "gpu" | "tie";
};

export function race(n: number, cfg: RaceConfig = DEFAULT_RACE): RaceResult {
  const cpuTime = n * cfg.cpuElemNs;
  const waves = Math.ceil(n / cfg.gpuLanes);
  const gpuCompute = waves * cfg.gpuElemNs;
  const gpuLaunch = cfg.launchNs;
  const gpuTransfer = cfg.countTransfer ? n * cfg.transferNs : 0;
  const gpuTotal = gpuLaunch + gpuCompute + gpuTransfer;
  const speedup = gpuTotal === 0 ? 0 : cpuTime / gpuTotal;
  const winner: "cpu" | "gpu" | "tie" = Math.abs(cpuTime - gpuTotal) / Math.max(cpuTime, gpuTotal) < 0.02 ? "tie" : cpuTime < gpuTotal ? "cpu" : "gpu";
  return { n, cpuTime, gpuCompute, gpuLaunch, gpuTransfer, gpuTotal, waves, speedup, winner };
}

/** Amdahl's law — the ceiling on speedup when a fraction p of the work is
    parallelizable across s workers. The chapter's "why more lanes stop
    helping" note; independent of the timing model above. */
export function amdahl(parallelFraction: number, speedupOfParallelPart: number): number {
  const serial = 1 - parallelFraction;
  return 1 / (serial + parallelFraction / speedupOfParallelPart);
}

export const RACE_SIZES = [1_000, 10_000, 100_000, 1_000_000];
