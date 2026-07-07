// Engine truth-tests for ch.22 (Processes & scheduling). Same Node harness;
// CI-gated. Locks scheduler-sim/model against the canonical Silberschatz
// instances (Operating System Concepts): FCFS, SJF, SRTF, RR, Priority Gantt
// charts + average waiting/turnaround, plus context-switch accounting, RR
// tie-breaks, work-conservation, and MLFQ/aging behaviour.

import {
  ALGOS,
  coalesce,
  isPreemptive,
  overlayContextSwitch,
  simulate,
  type Algo,
  type Proc,
  type Segment,
  type SchedResult,
} from "../src/components/sims/scheduler-sim/model.ts";

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
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}

/** Compact Gantt string of the run segments only: "P1:0-4 P2:4-7". */
function gantt(r: SchedResult): string {
  return r.timeline
    .filter((s: Segment) => s.kind === "run")
    .map((s) => `${s.pid}:${s.start}-${s.end}`)
    .join(" ");
}
const noCS = { quantum: 4, contextSwitch: 0, aging: false };

// ================= (A) FCFS =================
{
  console.log("FCFS · Silberschatz P1=24,P2=3,P3=3 (all arrive 0):");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 24, priority: 1 },
    { id: "P2", arrival: 0, burst: 3, priority: 1 },
    { id: "P3", arrival: 0, burst: 3, priority: 1 },
  ];
  const r = simulate(procs, { algo: "fcfs", ...noCS });
  eq("Gantt", gantt(r), "P1:0-24 P2:24-27 P3:27-30");
  eq("avg waiting = 17", r.avgWaiting, 17);
  eq("avg turnaround = 27", r.avgTurnaround, 27);
  eq("makespan = 30 (work-conserving, no idle)", r.makespan, 30);
}

// ================= (B) SJF (non-preemptive) =================
{
  console.log("SJF · Silberschatz P1=6,P2=8,P3=7,P4=3 (all arrive 0):");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 6, priority: 1 },
    { id: "P2", arrival: 0, burst: 8, priority: 1 },
    { id: "P3", arrival: 0, burst: 7, priority: 1 },
    { id: "P4", arrival: 0, burst: 3, priority: 1 },
  ];
  const r = simulate(procs, { algo: "sjf", ...noCS });
  eq("Gantt (P4,P1,P3,P2)", gantt(r), "P4:0-3 P1:3-9 P3:9-16 P2:16-24");
  eq("avg waiting = 7", r.avgWaiting, 7);
  eq("avg turnaround = 13", r.avgTurnaround, 13);
}

// ================= (C) SRTF (preemptive SJF) =================
{
  console.log("SRTF · Silberschatz P1@0=8,P2@1=4,P3@2=9,P4@3=5:");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 8, priority: 1 },
    { id: "P2", arrival: 1, burst: 4, priority: 1 },
    { id: "P3", arrival: 2, burst: 9, priority: 1 },
    { id: "P4", arrival: 3, burst: 5, priority: 1 },
  ];
  const r = simulate(procs, { algo: "srtf", ...noCS });
  eq("Gantt", gantt(r), "P1:0-1 P2:1-5 P4:5-10 P1:10-17 P3:17-26");
  eq("avg waiting = 6.5", r.avgWaiting, 6.5);
  eq("avg turnaround = 13", r.avgTurnaround, 13);
}

// ================= (D) Round-robin =================
{
  console.log("RR · Silberschatz P1=24,P2=3,P3=3 (q=4):");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 24, priority: 1 },
    { id: "P2", arrival: 0, burst: 3, priority: 1 },
    { id: "P3", arrival: 0, burst: 3, priority: 1 },
  ];
  const r = simulate(procs, { algo: "rr", quantum: 4, contextSwitch: 0, aging: false });
  eq("Gantt", gantt(r), "P1:0-4 P2:4-7 P3:7-10 P1:10-30");
  eq("avg turnaround = 15.67", r.avgTurnaround, 15.67);
  eq("avg waiting = 5.67", r.avgWaiting, 5.67);
  eq("avg response = 3.67", r.avgResponse, 3.67);
}
{
  // RR tie-break: an arrival that lands on a quantum boundary queues BEFORE the
  // preempted process. P1@0=5, P2@4=3, q=4 → P1 runs 0-4, P2 (arrived at 4)
  // runs 4-7 ahead of P1's remainder, then P1 finishes 7-8.
  console.log("RR · arrival-vs-preemption tie-break (q=4):");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 5, priority: 1 },
    { id: "P2", arrival: 4, burst: 3, priority: 1 },
  ];
  const r = simulate(procs, { algo: "rr", quantum: 4, contextSwitch: 0, aging: false });
  eq("Gantt (arrival jumps the queue)", gantt(r), "P1:0-4 P2:4-7 P1:7-8");
}

// ================= (E) Priority (non-preemptive) =================
{
  console.log("Priority · Silberschatz (1=highest) P1=10/3,P2=1/1,P3=2/4,P4=1/5,P5=5/2:");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 10, priority: 3 },
    { id: "P2", arrival: 0, burst: 1, priority: 1 },
    { id: "P3", arrival: 0, burst: 2, priority: 4 },
    { id: "P4", arrival: 0, burst: 1, priority: 5 },
    { id: "P5", arrival: 0, burst: 5, priority: 2 },
  ];
  const r = simulate(procs, { algo: "priority", ...noCS });
  eq("Gantt (P2,P5,P1,P3,P4)", gantt(r), "P2:0-1 P5:1-6 P1:6-16 P3:16-18 P4:18-19");
  eq("avg waiting = 8.2", r.avgWaiting, 8.2);
  eq("avg turnaround = 12", r.avgTurnaround, 12);
}

// ================= (F) context-switch overhead =================
{
  console.log("context-switch cost eats throughput:");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 24, priority: 1 },
    { id: "P2", arrival: 0, burst: 3, priority: 1 },
    { id: "P3", arrival: 0, burst: 3, priority: 1 },
  ];
  const base = simulate(procs, { algo: "fcfs", ...noCS });
  const withCS = simulate(procs, { algo: "fcfs", quantum: 4, contextSwitch: 2, aging: false });
  eq("FCFS makes 2 switches (P1→P2→P3)", withCS.csCount, 2);
  eq("2 switches × 2 ticks = 4 lost ticks", withCS.csTicks, 4);
  eq("makespan grows by the CS overhead (30→34)", withCS.makespan, base.makespan + 4);
  ok("utilization drops below 1 once CS costs time", withCS.utilization < 1 && base.utilization === 1);
  // RR switches far more often than FCFS on the same work → more overhead.
  const rr = simulate(procs, { algo: "rr", quantum: 4, contextSwitch: 2, aging: false });
  ok(`RR incurs more switches than FCFS (${rr.csCount} > ${withCS.csCount})`, rr.csCount > withCS.csCount);
}

// ================= (G) starvation vs aging (preemptive priority) =================
{
  console.log("priority starvation is fixed by aging:");
  // A low-priority job vs a steady drip of higher-priority short jobs arriving
  // every 2 ticks — enough to keep the CPU always busy with something urgent, so
  // P1 starves to the very end unless aging lifts its urgency mid-stream.
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 4, priority: 3 }, // low priority
    { id: "P2", arrival: 0, burst: 2, priority: 1 },
    { id: "P3", arrival: 2, burst: 2, priority: 1 },
    { id: "P4", arrival: 4, burst: 2, priority: 1 },
    { id: "P5", arrival: 6, burst: 2, priority: 1 },
    { id: "P6", arrival: 8, burst: 2, priority: 1 },
    { id: "P7", arrival: 10, burst: 2, priority: 1 },
  ];
  const noAge = simulate(procs, { algo: "priority-p", quantum: 4, contextSwitch: 0, aging: false });
  const aged = simulate(procs, { algo: "priority-p", quantum: 4, contextSwitch: 0, aging: true });
  const finish = (r: SchedResult, id: string) => r.stats.find((s) => s.id === id)!.completion;
  ok(`without aging P1 starves to the very end (@${finish(noAge, "P1")} = makespan)`, finish(noAge, "P1") === noAge.makespan);
  ok(
    `aging rescues P1 — it finishes strictly sooner (${finish(aged, "P1")} < ${finish(noAge, "P1")})`,
    finish(aged, "P1") < finish(noAge, "P1"),
  );
}

// ================= (H) MLFQ favours short jobs =================
{
  console.log("MLFQ · short interactive job jumps ahead of a demoted CPU hog:");
  // P1 is a long CPU hog present from the start; P2 is a short job arriving later.
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 30, priority: 1 },
    { id: "P2", arrival: 10, burst: 3, priority: 1 },
  ];
  const r = simulate(procs, { algo: "mlfq", quantum: 4, contextSwitch: 0, aging: false });
  const c1 = r.stats.find((s) => s.id === "P1")!.completion;
  const c2 = r.stats.find((s) => s.id === "P2")!.completion;
  ok(`short P2 finishes before long P1 (${c2} < ${c1})`, c2 < c1);
  ok("P2 responds quickly (starts within a quantum of arrival)", r.stats.find((s) => s.id === "P2")!.response <= 4);
  eq("all work accounted for (makespan = 33, no idle)", r.makespan, 33);
}

// ================= (I) universal invariants across all algorithms =================
{
  console.log("invariants hold for every algorithm:");
  const procs: Proc[] = [
    { id: "P1", arrival: 0, burst: 7, priority: 2 },
    { id: "P2", arrival: 2, burst: 4, priority: 1 },
    { id: "P3", arrival: 4, burst: 9, priority: 3 },
    { id: "P4", arrival: 5, burst: 2, priority: 2 },
  ];
  const totalBurst = procs.reduce((s, p) => s + p.burst, 0);
  for (const algo of ALGOS) {
    const r = simulate(procs, { algo, quantum: 3, contextSwitch: 0, aging: false });
    const runTicks = r.timeline.filter((s) => s.kind === "run").reduce((s, x) => s + (x.end - x.start), 0);
    ok(`${algo}: total run ticks = Σ burst (${runTicks}=${totalBurst})`, runTicks === totalBurst);
    ok(`${algo}: every process completes`, r.stats.every((s) => s.completion > 0));
    ok(`${algo}: waiting ≥ 0 and response ≤ waiting`, r.stats.every((s) => s.waiting >= 0 && s.response <= s.waiting));
    ok(`${algo}: turnaround = completion − arrival`, r.stats.every((s) => s.turnaround === s.completion - s.arrival));
    ok(`${algo}: isPreemptive() flag is a boolean`, typeof isPreemptive(algo as Algo) === "boolean");
  }
}

// ================= (J) low-level: coalesce & CS overlay =================
{
  console.log("coalesce & context-switch overlay:");
  eq(
    "coalesce merges consecutive ticks",
    coalesce(["P1", "P1", null, "P2"]).map((s) => `${s.kind}:${s.pid ?? "-"}:${s.start}-${s.end}`),
    ["run:P1:0-2", "idle:-:2-3", "run:P2:3-4"],
  );
  const ov = overlayContextSwitch(["P1", "P1", "P2", "P2"], 2);
  eq("one switch (P1→P2) → 1 CS block of 2 ticks", [ov.csCount, ov.csTicks], [1, 2]);
  eq("CS ticks inserted between the two runs", ov.track.join(","), "P1,P1,__CS__,__CS__,P2,P2");
  const ovIdle = overlayContextSwitch(["P1", null, "P2"], 2);
  eq("a switch straddling idle is NOT charged", ovIdle.csCount, 0);
}

// ---------------------------------------------------------------------------
if (failed > 0) {
  console.error(`\n✗ test-ch22: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\n✓ test-ch22: all checks pass");
