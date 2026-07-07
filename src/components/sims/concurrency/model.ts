// Engine for ch.25 — Concurrency. Two independent, deterministic models the
// UI renders and the tests exercise:
//   1. RACE — a shared counter under a non-atomic read-modify-write, driven by
//      an explicit interleaving of micro-ops (load · inc · store) so lost
//      updates are visible; a mutex makes the section atomic and the loss goes.
//   2. DEADLOCK — the dining philosophers, plus the four canonical fixes, each
//      mapped to the Coffman condition it breaks. A wait-for-graph cycle finder
//      is the deadlock detector the HERO and the P6 boss both use.
// Erasable-syntax only (Node runs this via --experimental-strip-types): no
// enums/namespaces, `import type` only, unions + `as const`.

// ===========================================================================
// (1) RACE — lost updates on a shared counter
// ===========================================================================

/** One micro-step of an increment. A real `count++` is not atomic: it LOADs
    into a register, INCs the register, then STOREs it back. Interleave two
    threads across these and an update can be lost. */
export type Micro = "load" | "inc" | "store";
export const MICROS: Micro[] = ["load", "inc", "store"];

export type ThreadState = {
  id: number;
  pc: number; // 0..3 — index into MICROS; 3 = finished this increment run
  reg: number; // the thread's private register
  iters: number; // increments still owed after the current one
};

export type RaceState = {
  count: number; // the shared variable
  threads: ThreadState[];
  lockOwner: number; // thread id holding the mutex, or -1 (free / lock disabled)
  useLock: boolean;
  log: string[]; // human-readable trace
};

export function initRace(nThreads: number, incrementsPerThread: number, useLock: boolean): RaceState {
  const threads: ThreadState[] = [];
  for (let i = 0; i < nThreads; i++) {
    threads.push({ id: i, pc: 0, reg: 0, iters: incrementsPerThread - 1 });
  }
  return { count: 0, threads, lockOwner: -1, useLock, log: [] };
}

/** True once every thread has performed all of its increments. */
export function raceDone(s: RaceState): boolean {
  return s.threads.every((t) => t.pc === 3 && t.iters <= 0);
}

/** The value the counter WOULD hold with no lost updates. */
export function expectedCount(nThreads: number, incrementsPerThread: number): number {
  return nThreads * incrementsPerThread;
}

/** Can thread `tid` take its next micro-op right now? Blocked only when the
    lock is on, the section is owned by another thread, and this thread is at
    the start of a section (about to LOAD) — i.e. it must wait to enter. */
export function raceBlocked(s: RaceState, tid: number): boolean {
  const t = s.threads[tid];
  if (!t || (t.pc === 3 && t.iters <= 0)) return true; // finished
  if (!s.useLock) return false;
  if (t.pc === 0 && s.lockOwner !== -1 && s.lockOwner !== tid) return true;
  return false;
}

/** Advance thread `tid` by one micro-op. Returns a NEW state (pure). If the
    thread is blocked or finished, the state is returned unchanged. */
export function raceStep(s: RaceState, tid: number): RaceState {
  if (raceBlocked(s, tid)) return s;
  const threads = s.threads.map((t) => ({ ...t }));
  const t = threads[tid];
  let { count, lockOwner } = s;
  const log = s.log.slice();

  if (t.pc === 0) {
    if (s.useLock) lockOwner = tid; // acquire on section entry
    t.reg = count; // LOAD
    t.pc = 1;
    log.push(`T${tid}: load  → reg=${t.reg}${s.useLock ? " (lock held)" : ""}`);
  } else if (t.pc === 1) {
    t.reg = t.reg + 1; // INC (register only — count untouched)
    t.pc = 2;
    log.push(`T${tid}: inc   → reg=${t.reg}`);
  } else {
    count = t.reg; // STORE (may clobber another thread's write)
    log.push(`T${tid}: store → count=${count}`);
    if (s.useLock) lockOwner = -1; // release on section exit
    if (t.iters > 0) {
      t.iters -= 1;
      t.pc = 0;
    } else {
      t.pc = 3;
    }
  }
  return { count, threads, lockOwner, useLock: s.useLock, log };
}

/** Run a full interleaving. `schedule` is a flat list of thread ids to advance
    in order; picks for finished/blocked threads are skipped. When the schedule
    runs out, any unfinished threads are drained in id order so the run always
    completes. Returns the final count and the number of lost updates. */
export function runRace(
  nThreads: number,
  incrementsPerThread: number,
  schedule: number[],
  useLock: boolean,
): { count: number; lost: number } {
  let s = initRace(nThreads, incrementsPerThread, useLock);
  for (const tid of schedule) {
    if (tid >= 0 && tid < nThreads) s = raceStep(s, tid);
  }
  // Drain the rest deterministically (id order), skipping blocked picks.
  let guard = 0;
  const cap = nThreads * incrementsPerThread * 6 + 16;
  while (!raceDone(s) && guard++ < cap) {
    for (let i = 0; i < nThreads; i++) if (!raceBlocked(s, i)) s = raceStep(s, i);
  }
  const expected = expectedCount(nThreads, incrementsPerThread);
  return { count: s.count, lost: expected - s.count };
}

// ===========================================================================
// (2) DEADLOCK — the dining philosophers + the four canonical fixes
// ===========================================================================

/** Philosopher i sits between fork i (its LEFT) and fork (i+1)%n (its RIGHT). */
export type PhilPhase = "thinking" | "hungry" | "hasOne" | "eating" | "done";

export type Philosopher = {
  id: number;
  phase: PhilPhase;
  holds: number[]; // fork ids currently held (0, 1, or 2)
  eaten: number;
  backoff: number; // trylock strategy: ticks to wait before the next attempt
};

export type DeadlockState = {
  n: number;
  forks: number[]; // forks[f] = owner philosopher id, or -1 if free
  phil: Philosopher[];
  seated: number; // "limit" strategy: how many philosophers are currently seated
  tick: number;
};

/** The four fixes, plus the naive (deadlock-prone) baseline. */
export type Strategy = "naive" | "ordering" | "waiter" | "trylock" | "limit";

/** The four Coffman conditions that must ALL hold for deadlock to be possible. */
export type Coffman = "mutual-exclusion" | "hold-and-wait" | "no-preemption" | "circular-wait";

export const COFFMAN: { id: Coffman; label: string; blurb: string }[] = [
  { id: "mutual-exclusion", label: "Mutual exclusion", blurb: "a fork is held by at most one philosopher at a time" },
  { id: "hold-and-wait", label: "Hold and wait", blurb: "a philosopher keeps a held fork while waiting for another" },
  { id: "no-preemption", label: "No preemption", blurb: "a fork can't be forcibly taken; only its holder releases it" },
  { id: "circular-wait", label: "Circular wait", blurb: "a closed chain where each philosopher waits for the next" },
];

export const STRATEGIES: { id: Strategy; label: string; breaks: Coffman | null; how: string }[] = [
  { id: "naive", label: "Naive (grab left, then right)", breaks: null, how: "Every philosopher grabs its left fork, then reaches for its right — the textbook path straight into a circular wait." },
  { id: "ordering", label: "Resource ordering (lowest fork first)", breaks: "circular-wait", how: "Number the forks and always pick up the lower-numbered one first. No cycle can form, because the last philosopher reaches for fork 0 before fork n−1." },
  { id: "waiter", label: "Arbitrator / both-or-none", breaks: "hold-and-wait", how: "A philosopher takes BOTH forks atomically or neither — it never holds one while waiting for the other, so hold-and-wait is impossible." },
  { id: "trylock", label: "Trylock + backoff", breaks: "no-preemption", how: "If the second fork is busy, put the first one back down and retry after a short wait — a held fork is released rather than pinned, so no one is stuck forever." },
  { id: "limit", label: "Bounded diners (≤ n−1 seated)", breaks: "circular-wait", how: "Admit at most n−1 philosophers to the table at once. With a seat to spare there is always a fork free somewhere, so a full circle can never close." },
];

export function strategyById(id: Strategy): { id: Strategy; label: string; breaks: Coffman | null; how: string } {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown strategy ${id}`);
  return s;
}

export function leftFork(id: number): number {
  return id;
}
export function rightFork(id: number, n: number): number {
  return (id + 1) % n;
}

/**
 * Start state. For every strategy except "limit" all philosophers start HUNGRY,
 * so the deadlock (naive) or its absence (a fix) is immediate and deterministic.
 * "limit" starts them THINKING and admits at most n−1 to the table over time —
 * keeping one seat empty is the whole mechanism, so it must hold from tick 0.
 */
export function initDeadlock(n: number, strat: Strategy = "naive"): DeadlockState {
  const start: PhilPhase = strat === "limit" ? "thinking" : "hungry";
  const phil: Philosopher[] = [];
  for (let i = 0; i < n; i++) {
    phil.push({ id: i, phase: start, holds: [], eaten: 0, backoff: 0 });
  }
  return { n, forks: new Array(n).fill(-1), phil, seated: 0, tick: 0 };
}

/** The two forks a philosopher needs, in the order this strategy acquires them. */
function acquisitionOrder(id: number, n: number, strat: Strategy): number[] {
  const l = leftFork(id);
  const r = rightFork(id, n);
  if (strat === "ordering") return l < r ? [l, r] : [r, l];
  return [l, r];
}

/**
 * Advance the whole table one tick (pure). Philosophers act in id order; each
 * takes at most one action per tick under the chosen strategy. Deterministic,
 * so the UI animation and the tests agree exactly.
 */
export function stepDeadlock(s: DeadlockState, strat: Strategy): DeadlockState {
  const forks = s.forks.slice();
  const phil = s.phil.map((p) => ({ ...p, holds: p.holds.slice() }));
  let seated = s.seated;
  const n = s.n;

  const release = (p: Philosopher) => {
    for (const f of p.holds) forks[f] = -1;
    p.holds = [];
  };

  for (let i = 0; i < n; i++) {
    const p = phil[i];

    if (p.phase === "thinking") {
      // Only relevant to "limit": a waiting philosopher sits down when a seat frees.
      if (strat !== "limit" || seated < n - 1) {
        p.phase = "hungry";
        if (strat === "limit") seated += 1;
      }
      continue;
    }

    if (p.phase === "done") continue;

    if (p.phase === "eating") {
      p.eaten += 1;
      release(p);
      p.phase = "done";
      if (strat === "limit") seated = Math.max(0, seated - 1);
      continue;
    }

    if (strat === "trylock" && p.backoff > 0) {
      p.backoff -= 1;
      continue;
    }

    if (strat === "waiter") {
      // Both-or-none: only act if BOTH forks are free right now (read the
      // working copy so same-tick acquisitions by lower-id philosophers count).
      const l = leftFork(i);
      const r = rightFork(i, n);
      if (forks[l] === -1 && forks[r] === -1) {
        forks[l] = i;
        forks[r] = i;
        p.holds = [l, r];
        p.phase = "eating";
      }
      continue;
    }

    // naive / ordering / limit / trylock share the grab-one-then-the-other shape.
    const order = acquisitionOrder(i, n, strat);
    if (p.phase === "hungry") {
      const first = order[0];
      if (forks[first] === -1) {
        forks[first] = i;
        p.holds = [first];
        p.phase = "hasOne";
      }
      continue;
    }
    if (p.phase === "hasOne") {
      const second = order[1];
      if (forks[second] === -1) {
        forks[second] = i;
        p.holds.push(second);
        p.phase = "eating";
      } else if (strat === "trylock") {
        // No-preemption broken: drop the held fork and back off (staggered by id
        // so the retries desynchronize and someone makes progress).
        release(p);
        p.phase = "hungry";
        p.backoff = (i % n) + 1;
      }
      continue;
    }
  }

  return { n, forks, phil, seated, tick: s.tick + 1 };
}

/**
 * Deadlock detector. Build the wait-for graph — philosopher i → j when i is
 * blocked wanting a fork that j currently holds — and report any cycle. A
 * non-empty cycle among philosophers that can make no progress IS the deadlock.
 */
export function detectDeadlock(s: DeadlockState): { deadlocked: boolean; cycle: number[] } {
  const n = s.n;
  const waitsFor: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const p = s.phil[i];
    if (p.phase !== "hasOne") continue; // only a philosopher holding exactly one fork can be in the cycle
    const want = rightFork(i, n) === p.holds[0] ? leftFork(i) : rightFork(i, n);
    const owner = s.forks[want];
    if (owner !== -1 && owner !== i) waitsFor[i] = owner;
  }

  // Find a cycle by following waits-for pointers from each node.
  for (let start = 0; start < n; start++) {
    if (waitsFor[start] === -1) continue;
    const seen = new Set<number>();
    let cur = start;
    while (cur !== -1 && !seen.has(cur)) {
      seen.add(cur);
      cur = waitsFor[cur];
    }
    if (cur === start) {
      // reconstruct the cycle
      const cycle: number[] = [];
      let c = start;
      do {
        cycle.push(c);
        c = waitsFor[c];
      } while (c !== start);
      return { deadlocked: true, cycle: cycle.sort((a, b) => a - b) };
    }
  }
  return { deadlocked: false, cycle: [] };
}

export function allEaten(s: DeadlockState): boolean {
  return s.phil.every((p) => p.phase === "done");
}

/** True when the current state is a genuine deadlock: not everyone has finished,
    yet one step can no longer change anything. Used by the live sim to stop the
    clock and light up the circular wait. */
export function isDeadlocked(s: DeadlockState, strat: Strategy): boolean {
  if (allEaten(s)) return false;
  return snapshot(stepDeadlock(s, strat)) === snapshot(s);
}

/** Canonical snapshot for fixpoint comparison — everything that matters for
    progress, minus the ever-incrementing tick counter. */
function snapshot(s: DeadlockState): string {
  return JSON.stringify({
    forks: s.forks,
    seated: s.seated,
    phil: s.phil.map((p) => ({ ph: p.phase, h: p.holds.slice().sort((a, b) => a - b), b: p.backoff, e: p.eaten })),
  });
}

/**
 * Run a strategy from the start state until everyone has eaten, the table hits
 * a TRUE deadlock, or the tick cap is reached. A true deadlock is a *fixpoint*:
 * a non-final state that stepping can no longer change — strictly stronger (and
 * more honest) than an instantaneous wait-for cycle, since trylock briefly
 * forms a cycle every round yet always breaks out of it. The naive strategy
 * freezes into such a fixpoint on tick 1; every fix drains to allEaten.
 */
export function runDeadlock(strat: Strategy, n: number, maxTicks: number): {
  deadlocked: boolean;
  allEaten: boolean;
  ticks: number;
  cycle: number[];
} {
  let s = initDeadlock(n, strat);
  for (let t = 0; t < maxTicks; t++) {
    if (allEaten(s)) return { deadlocked: false, allEaten: true, ticks: s.tick, cycle: [] };
    const next = stepDeadlock(s, strat);
    if (snapshot(next) === snapshot(s)) {
      // No philosopher can ever make progress again → true deadlock.
      return { deadlocked: true, allEaten: false, ticks: s.tick, cycle: detectDeadlock(s).cycle };
    }
    s = next;
  }
  // Cap hit without finishing — treat a non-final stall as stuck.
  return { deadlocked: !allEaten(s), allEaten: allEaten(s), ticks: s.tick, cycle: detectDeadlock(s).cycle };
}

/**
 * Boss grading (P6 — "Unfreeze the philosophers"). To earn the badge the player
 * must (a) choose a fix that actually clears the deadlock in simulation, and
 * (b) correctly name the Coffman condition that fix breaks — the "explain why".
 */
export function gradeBoss(strat: Strategy, chosenCondition: Coffman, n: number): {
  resolved: boolean;
  conditionCorrect: boolean;
  passed: boolean;
} {
  const run = runDeadlock(strat, n, 400);
  const resolved = !run.deadlocked && run.allEaten;
  const def = strategyById(strat);
  const conditionCorrect = def.breaks !== null && def.breaks === chosenCondition;
  return { resolved, conditionCorrect, passed: resolved && conditionCorrect };
}
