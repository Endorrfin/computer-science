// [HERO] scheduler-sim engine — ch.22. A pure, deterministic CPU-scheduling
// simulator: given processes (arrival / burst / priority) and a policy, it
// produces the exact Gantt timeline plus per-process waiting / turnaround /
// response, and a context-switch overhead accounting. The React sim is a thin
// skin over this; scripts/test-ch22.ts locks it against textbook instances.
//
// Design in two clean stages:
//   1) scheduleTrack() — a UNIT-TIME simulation that answers, tick by tick,
//      "which ready process holds the CPU?" Every algorithm (including the
//      preemptive SRTF / RR / preemptive-priority / MLFQ) reduces to that one
//      question, which is what stays correct across mid-run arrivals, ties and
//      quantum boundaries. This stage ignores context-switch cost, so with the
//      default it reproduces the canonical Silberschatz numbers exactly.
//   2) overlayContextSwitch() — a deterministic pass that inserts csCost ticks
//      of overhead on every switch between two DIFFERENT processes, delaying
//      everything after it. That is what makes "overhead eats throughput"
//      visible (makespan grows, utilization drops) without perturbing the
//      scheduling decisions themselves.
//
// Erasable-syntax-only (imported by Node via --experimental-strip-types): no
// enums / namespaces / parameter properties — `type` unions + `as const`.

export type Proc = {
  id: string; // "P1"
  arrival: number; // integer ticks, >= 0
  burst: number; // integer ticks, > 0
  priority: number; // smaller number = higher priority (textbook convention)
};

export const ALGOS = ["fcfs", "sjf", "srtf", "rr", "priority", "priority-p", "mlfq"] as const;
export type Algo = (typeof ALGOS)[number];

export const ALGO_LABEL: Record<Algo, string> = {
  fcfs: "FCFS — first come, first served",
  sjf: "SJF — shortest job first (non-preemptive)",
  srtf: "SRTF — shortest remaining time (preemptive)",
  rr: "Round-robin — fixed quantum",
  priority: "Priority — non-preemptive",
  "priority-p": "Priority — preemptive",
  mlfq: "MLFQ — multi-level feedback",
};

export function isPreemptive(algo: Algo): boolean {
  return algo === "srtf" || algo === "rr" || algo === "priority-p" || algo === "mlfq";
}
export function usesPriority(algo: Algo): boolean {
  return algo === "priority" || algo === "priority-p";
}

export type SchedConfig = {
  algo: Algo;
  quantum: number; // RR time-slice (>=1); base quantum for MLFQ level 0
  contextSwitch: number; // ticks lost on every switch to a DIFFERENT process
  aging: boolean; // priority modes: raise a waiting job's urgency to kill starvation
};

/** One contiguous stretch of the CPU timeline. */
export type Segment = {
  kind: "run" | "cs" | "idle";
  pid: string | null; // process id for run; null for cs / idle
  start: number;
  end: number; // exclusive
};

export type ProcStat = {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
  start: number; // first tick on the CPU (response = start - arrival)
  completion: number; // exclusive end tick of the final unit
  turnaround: number; // completion - arrival
  waiting: number; // turnaround - burst
  response: number; // start - arrival
};

export type SchedResult = {
  timeline: Segment[];
  stats: ProcStat[];
  avgWaiting: number;
  avgTurnaround: number;
  avgResponse: number;
  makespan: number; // last completion tick
  cpuBusy: number; // total burst ticks executed
  csCount: number; // number of context switches performed
  csTicks: number; // total ticks spent in context switches
  utilization: number; // cpuBusy / makespan (0..1)
};

const SAFETY_CAP = 200_000;
const AGE_STEP = 5; // aging: every AGE_STEP waiting ticks lowers the priority number by 1
const MLFQ_LEVELS = 3;
const MLFQ_BOOST = 200; // periodic top-queue boost (anti-starvation)

type Live = {
  p: Proc;
  remaining: number;
  started: number; // -1 until first dispatch
};

// ---------------------------------------------------------------------------
// Stage 1 — the ideal (CS-free) per-tick schedule.
// ---------------------------------------------------------------------------

/** Returns the per-tick CPU occupant (process id, or null for idle). */
export function scheduleTrack(procsIn: Proc[], cfg: SchedConfig): (string | null)[] {
  const procs = [...procsIn].sort((a, b) => a.arrival - b.arrival || idNum(a.id) - idNum(b.id));
  const live: Live[] = procs.map((p) => ({ p, remaining: p.burst, started: -1 }));
  const byId = new Map<string, Live>();
  for (const l of live) byId.set(l.p.id, l);
  const quantum = Math.max(1, Math.floor(cfg.quantum));

  if (cfg.algo === "rr") return trackRR(live, byId, quantum);
  if (cfg.algo === "mlfq") return trackMLFQ(live, byId, quantum);
  return trackSelection(live, byId, cfg);
}

/** FCFS / SJF / SRTF / priority — a pure selection over the ready set each tick. */
function trackSelection(live: Live[], byId: Map<string, Live>, cfg: SchedConfig): (string | null)[] {
  const track: (string | null)[] = [];
  let time = 0;
  let running: string | null = null;
  let done = 0;
  const nonPreemptive = cfg.algo === "fcfs" || cfg.algo === "sjf" || cfg.algo === "priority";

  while (done < live.length && time < SAFETY_CAP) {
    const ready = live.filter((l) => l.remaining > 0 && l.p.arrival <= time);
    if (ready.length === 0) {
      track.push(null);
      time++;
      running = null;
      continue;
    }

    let pick: string;
    if (nonPreemptive && running && byId.get(running)!.remaining > 0) {
      pick = running; // hold the CPU until the current job finishes
    } else {
      pick = selectByAlgo(ready, cfg, time);
    }

    const l = byId.get(pick)!;
    if (l.started === -1) l.started = time;
    l.remaining--;
    track.push(pick);
    running = l.remaining > 0 ? pick : null;
    if (l.remaining === 0) done++;
    time++;
  }
  return track;
}

function selectByAlgo(ready: Live[], cfg: SchedConfig, time: number): string {
  switch (cfg.algo) {
    case "fcfs":
      return pickBy(ready, (l) => [l.p.arrival, idNum(l.p.id)]);
    case "sjf":
    case "srtf":
      return pickBy(ready, (l) => [l.remaining, l.p.arrival, idNum(l.p.id)]);
    case "priority":
    case "priority-p":
      return pickBy(ready, (l) => [effPriority(l, time, cfg.aging), l.p.arrival, idNum(l.p.id)]);
    default:
      return ready[0].p.id;
  }
}

/** Round-robin with an explicit FIFO ready queue. Textbook tie-break: when a
 *  quantum expires at the same tick a process arrives, the ARRIVAL enters the
 *  queue before the preempted process is re-queued. */
function trackRR(live: Live[], byId: Map<string, Live>, quantum: number): (string | null)[] {
  const track: (string | null)[] = [];
  const queue: string[] = [];
  let time = 0;
  let done = 0;
  let curr: string | null = null;
  let sliceLeft = 0;
  let pendingRequeue: string | null = null; // preempted last tick; re-queue AFTER arrivals

  const admit = (t: number) => {
    for (const l of live.filter((x) => x.p.arrival === t).sort((a, b) => idNum(a.p.id) - idNum(b.p.id))) {
      queue.push(l.p.id);
    }
  };

  admit(0);
  while (done < live.length && time < SAFETY_CAP) {
    if (pendingRequeue !== null) {
      queue.push(pendingRequeue);
      pendingRequeue = null;
    }
    if (curr === null) {
      curr = queue.shift() ?? null;
      sliceLeft = quantum;
    }
    if (curr === null) {
      track.push(null);
      time++;
      admit(time);
      continue;
    }

    const l = byId.get(curr)!;
    if (l.started === -1) l.started = time;
    l.remaining--;
    sliceLeft--;
    track.push(curr);
    time++;
    admit(time); // arrivals at the new time enter before any requeue

    if (l.remaining === 0) {
      done++;
      curr = null;
    } else if (sliceLeft === 0) {
      pendingRequeue = curr; // re-queued at the top of the next iteration
      curr = null;
    }
  }
  return track;
}

/** MLFQ: MLFQ_LEVELS queues, quantum doubling per level, demotion on quantum
 *  exhaustion, periodic boost back to level 0. CPU-bound jobs sink; short jobs
 *  finish high. Higher (lower-index) queues always preempt lower ones. */
function trackMLFQ(live: Live[], byId: Map<string, Live>, base: number): (string | null)[] {
  const track: (string | null)[] = [];
  const queues: string[][] = Array.from({ length: MLFQ_LEVELS }, () => []);
  const level = new Map<string, number>();
  const used = new Map<string, number>(); // ticks used in the current quantum
  let time = 0;
  let done = 0;

  const admit = (t: number) => {
    for (const l of live.filter((x) => x.p.arrival === t).sort((a, b) => idNum(a.p.id) - idNum(b.p.id))) {
      level.set(l.p.id, 0);
      used.set(l.p.id, 0);
      queues[0].push(l.p.id);
    }
  };
  const quantumOf = (lv: number) => Math.min(base * Math.pow(2, lv), 1 << 20);
  const topReady = (): string | null => {
    for (let lv = 0; lv < MLFQ_LEVELS; lv++) {
      const id = queues[lv][0];
      if (id !== undefined) return id;
    }
    return null;
  };

  admit(0);
  while (done < live.length && time < SAFETY_CAP) {
    if (time > 0 && time % MLFQ_BOOST === 0) {
      for (let lv = 1; lv < MLFQ_LEVELS; lv++) {
        for (const id of queues[lv]) {
          level.set(id, 0);
          used.set(id, 0);
          queues[0].push(id);
        }
        queues[lv] = [];
      }
    }

    const curr = topReady();
    if (curr === null) {
      track.push(null);
      time++;
      admit(time);
      continue;
    }
    const l = byId.get(curr)!;
    if (l.started === -1) l.started = time;
    l.remaining--;
    used.set(curr, (used.get(curr) ?? 0) + 1);
    track.push(curr);
    time++;
    admit(time);

    const lv = level.get(curr)!;
    if (l.remaining === 0) {
      queues[lv].shift();
      done++;
    } else if ((used.get(curr) ?? 0) >= quantumOf(lv)) {
      queues[lv].shift();
      const next = Math.min(lv + 1, MLFQ_LEVELS - 1);
      level.set(curr, next);
      used.set(curr, 0);
      queues[next].push(curr);
    }
    // else: keep running (still head of its queue)
  }
  return track;
}

// ---------------------------------------------------------------------------
// Stage 2 — overlay context-switch overhead, then assemble the result.
// ---------------------------------------------------------------------------

/** Insert csCost overhead ticks on every switch between two DIFFERENT processes
 *  (a switch straddling an idle gap is not charged — nothing was mid-flight).
 *  Returns the expanded per-tick track plus switch counts. */
export function overlayContextSwitch(
  ideal: (string | null)[],
  csCost: number,
): { track: (string | null | "__CS__")[]; csCount: number; csTicks: number } {
  if (csCost <= 0) {
    let count = 0;
    for (let i = 1; i < ideal.length; i++) {
      if (ideal[i] !== null && ideal[i - 1] !== null && ideal[i] !== ideal[i - 1]) count++;
    }
    return { track: [...ideal], csCount: count, csTicks: 0 };
  }
  const out: (string | null | "__CS__")[] = [];
  let csCount = 0;
  let prevRun: string | null = null; // last non-null occupant emitted
  let prevTick: string | null = null; // the immediately preceding ideal tick
  for (let i = 0; i < ideal.length; i++) {
    const v = ideal[i];
    if (v !== null && prevTick !== null && v !== prevRun && prevRun !== null) {
      for (let k = 0; k < csCost; k++) out.push("__CS__");
      csCount++;
    }
    out.push(v);
    if (v !== null) prevRun = v;
    prevTick = v;
  }
  return { track: out, csCount, csTicks: csCount * csCost };
}

export function simulate(procs: Proc[], cfg: SchedConfig): SchedResult {
  const ideal = scheduleTrack(procs, cfg);
  const { track, csCount, csTicks } = overlayContextSwitch(ideal, Math.max(0, Math.floor(cfg.contextSwitch)));
  return assemble(procs, track, csCount, csTicks);
}

function assemble(
  procs: Proc[],
  track: (string | null | "__CS__")[],
  csCount: number,
  csTicks: number,
): SchedResult {
  const timeline = coalesce(track);
  const totalBurst = procs.reduce((s, p) => s + p.burst, 0);
  const stats: ProcStat[] = procs.map((p) => {
    let start = -1;
    let completion = -1;
    for (const seg of timeline) {
      if (seg.kind === "run" && seg.pid === p.id) {
        if (start === -1) start = seg.start;
        completion = seg.end;
      }
    }
    const turnaround = completion - p.arrival;
    return {
      id: p.id,
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      start,
      completion,
      turnaround,
      waiting: turnaround - p.burst,
      response: start - p.arrival,
    };
  });
  const n = stats.length || 1;
  const makespan = Math.max(0, ...stats.map((s) => s.completion));
  return {
    timeline,
    stats,
    avgWaiting: round2(stats.reduce((s, x) => s + x.waiting, 0) / n),
    avgTurnaround: round2(stats.reduce((s, x) => s + x.turnaround, 0) / n),
    avgResponse: round2(stats.reduce((s, x) => s + x.response, 0) / n),
    makespan,
    cpuBusy: totalBurst,
    csCount,
    csTicks,
    utilization: makespan > 0 ? round2(totalBurst / makespan) : 0,
  };
}

/** Merge a per-tick occupant array into contiguous Gantt segments. */
export function coalesce(track: (string | null | "__CS__")[]): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  while (i < track.length) {
    const v = track[i];
    let j = i + 1;
    while (j < track.length && track[j] === v) j++;
    segs.push({
      kind: v === "__CS__" ? "cs" : v === null ? "idle" : "run",
      pid: v === "__CS__" || v === null ? null : v,
      start: i,
      end: j,
    });
    i = j;
  }
  return segs;
}

// ---- helpers ----------------------------------------------------------------

function effPriority(l: Live, time: number, aging: boolean): number {
  if (!aging) return l.p.priority;
  const waited = Math.max(0, time - l.p.arrival);
  return l.p.priority - Math.floor(waited / AGE_STEP);
}

function pickBy(ready: Live[], key: (l: Live) => number[]): string {
  let best = ready[0];
  let bestKey = key(best);
  for (let i = 1; i < ready.length; i++) {
    const k = key(ready[i]);
    if (lexLess(k, bestKey)) {
      best = ready[i];
      bestKey = k;
    }
  }
  return best.p.id;
}
function lexLess(a: number[], b: number[]): boolean {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
/** "P10" -> 10; used for stable, human-natural tie-breaking. */
function idNum(id: string): number {
  const m = id.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Convenience for the sim UI / demos. */
export function demoProcs(): Proc[] {
  return [
    { id: "P1", arrival: 0, burst: 8, priority: 3 },
    { id: "P2", arrival: 1, burst: 4, priority: 1 },
    { id: "P3", arrival: 2, burst: 9, priority: 4 },
    { id: "P4", arrival: 3, burst: 5, priority: 2 },
  ];
}
