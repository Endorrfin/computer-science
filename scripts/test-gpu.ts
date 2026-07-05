// Engine truth-tests for ch.9 (GPUs): the triangle rasterizer and the
// CPU-vs-GPU timing model. Same Node harness as the other suites; CI-gated via
// `npm test`. These lock the coverage math (edge functions, barycentric sum,
// degenerate = empty) and the race's story (CPU wins tiny N, GPU wins huge N,
// transfer can erase the win) plus Amdahl's ceiling.
import { DEFAULT_GRID, DEFAULT_TRI, bresenham, rasterize, signedArea, wireframe } from "../src/components/sims/gpu/raster.ts";
import type { Tri } from "../src/components/sims/gpu/raster.ts";
import { DEFAULT_RACE, amdahl, race } from "../src/components/sims/gpu/parallel.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}
function approx(name: string, got: number, want: number, eps = 1e-9): void {
  ok(`${name} (${got} ≈ ${want})`, Math.abs(got - want) < eps);
}

// ================= rasterizer =================
{
  ok("signedArea non-zero for a real triangle", signedArea(DEFAULT_TRI) !== 0);
  const px = rasterize(DEFAULT_TRI, DEFAULT_GRID.w, DEFAULT_GRID.h);
  eq("default triangle covers 77 pixels", px.length, 77);
  ok("every covered pixel is in bounds", px.every((p) => p.x >= 0 && p.x < DEFAULT_GRID.w && p.y >= 0 && p.y < DEFAULT_GRID.h));
  ok("barycentric weights sum to 1", px.every((p) => Math.abs(p.bary[0] + p.bary[1] + p.bary[2] - 1) < 1e-9));
  ok("interpolated depth stays within vertex z range", px.every((p) => p.depth >= 0.15 - 1e-9 && p.depth <= 1.0 + 1e-9));

  // a simple right triangle: containment sanity
  const rt: Tri = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 0, y: 10, z: 0 },
  ];
  const rp = rasterize(rt, 12, 12);
  ok("point (1,1) inside is covered", rp.some((p) => p.x === 1 && p.y === 1));
  ok("point (9,9) outside is not covered", !rp.some((p) => p.x === 9 && p.y === 9));

  // degenerate (collinear) triangle covers nothing
  const degen: Tri = [
    { x: 0, y: 0, z: 0 },
    { x: 5, y: 5, z: 0 },
    { x: 9, y: 9, z: 0 },
  ];
  eq("collinear triangle covers 0 pixels", rasterize(degen, 12, 12).length, 0);
  eq("collinear signedArea is 0", signedArea(degen), 0);

  // bresenham: a horizontal line hits every integer x once
  eq("bresenham (0,0)->(3,0)", bresenham(0, 0, 3, 0).map((p) => `${p.x},${p.y}`), ["0,0", "1,0", "2,0", "3,0"]);
  // wireframe includes the three corners
  const wf = wireframe(rt);
  ok("wireframe includes the corners", wf.some((p) => p.x === 0 && p.y === 0) && wf.some((p) => p.x === 10 && p.y === 0) && wf.some((p) => p.x === 0 && p.y === 10));
}

// ================= CPU-vs-GPU race =================
{
  eq("N=1000 → CPU wins (overhead-bound)", race(1_000).winner, "cpu");
  eq("N=1,000,000 → GPU wins", race(1_000_000).winner, "gpu");
  ok("GPU speedup at 1M is large (>50×)", race(1_000_000).speedup > 50);

  // more elements ⇒ GPU speedup grows monotonically
  const s = [10_000, 100_000, 1_000_000].map((n) => race(n).speedup);
  ok("speedup increases with N", s[0] < s[1] && s[1] < s[2]);

  // counting PCIe transfer only hurts the GPU
  const noX = race(1_000_000);
  const withX = race(1_000_000, { ...DEFAULT_RACE, countTransfer: true });
  ok("transfer raises GPU total", withX.gpuTotal > noX.gpuTotal);
  ok("transfer lowers speedup", withX.speedup < noX.speedup);

  // waves = ceil(N / lanes)
  eq("waves at 1M with 1024 lanes", race(1_000_000).waves, Math.ceil(1_000_000 / DEFAULT_RACE.gpuLanes));
  eq("one wave for a tiny job", race(500).waves, 1);

  // exact cpu time = n * cpuElemNs
  approx("cpu time is linear in N", race(1_000_000).cpuTime, 1_000_000 * DEFAULT_RACE.cpuElemNs);
}

// ================= Amdahl's law =================
{
  approx("amdahl: fully serial (p=0) ⇒ 1×", amdahl(0, 1000), 1);
  approx("amdahl: fully parallel (p=1) ⇒ s×", amdahl(1, 8), 8);
  approx("amdahl: p=0.9, s=2", amdahl(0.9, 2), 1 / (0.1 + 0.45));
  ok("amdahl: 95% parallel caps near 20× even at s=100000", Math.abs(amdahl(0.95, 100_000) - 20) < 0.01);
}

if (failed > 0) {
  console.error(`\n✗ test-gpu: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("✓ test-gpu: all checks pass");
