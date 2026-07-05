// Engine — a stack and a queue driven by the SAME stream of operations, so the
// difference between LIFO and FIFO is impossible to miss. Pure & erasable-syntax
// (Node-testable). Drives stack-queue-stepper (ch.14).
//
//   • STACK  — Last In, First Out. push adds to the TOP, pop removes from the
//     TOP. The end that changes is always the top.
//   • QUEUE  — First In, First Out. enqueue adds to the BACK, dequeue removes
//     from the FRONT. Additions and removals touch OPPOSITE ends.
//
// Feed both the values 1,2,3 and then drain them: a stack gives them back
// 3,2,1 (reversed); a queue gives them back 1,2,3 (in order). That reversal is
// the entire personality of a stack, and the presets below stage it.
//
// Underflow guard: pop/dequeue on an empty structure is a no-op, flagged so the
// UI can show "nothing to remove" rather than silently doing nothing (or, worse,
// crashing). Deterministic: same ops in → same trace out.

export type OpKind = "push" | "pop" | "enqueue" | "dequeue";

/** One operation. `value` is required for push/enqueue, ignored for pop/dequeue. */
export type Op = { kind: OpKind; value?: number };

/** Which END of which structure moved — the anchor for the pointer arrow the UI
    draws. Stacks only ever move their "top"; queues move "back" on enqueue and
    "front" on dequeue. `null` when the op was a no-op (underflow). */
export type ChangedEnd = "top" | "front" | "back" | null;

/** The world after applying one op: both structures' contents (bottom/front
    first), what changed, and whether it underflowed. */
export type OpStep = {
  op: Op;
  stack: number[]; // index 0 = bottom, last = top
  queue: number[]; // index 0 = front, last = back
  changedEnd: ChangedEnd;
  value: number | null; // the value pushed/enqueued, or the one popped/dequeued
  underflow: boolean; // pop/dequeue attempted on an empty structure → no-op
};

export type OpsResult = {
  steps: OpStep[];
  stack: number[]; // final stack
  queue: number[]; // final queue
};

/** Apply a sequence of ops, returning one snapshot per op. Stack and queue are
    maintained independently but stepped together, so a "pop" step shows the
    stack shrinking while the queue is untouched, and vice-versa. */
export function applyOps(ops: Op[]): OpsResult {
  const stack: number[] = [];
  const queue: number[] = [];
  const steps: OpStep[] = [];

  for (const op of ops) {
    let changedEnd: ChangedEnd = null;
    let value: number | null = null;
    let underflow = false;

    switch (op.kind) {
      case "push": {
        value = op.value ?? 0;
        stack.push(value); // grows at the TOP (end of the array)
        changedEnd = "top";
        break;
      }
      case "pop": {
        if (stack.length === 0) {
          underflow = true; // nothing to remove — no-op
        } else {
          value = stack.pop() ?? null; // removes from the TOP
          changedEnd = "top";
        }
        break;
      }
      case "enqueue": {
        value = op.value ?? 0;
        queue.push(value); // grows at the BACK
        changedEnd = "back";
        break;
      }
      case "dequeue": {
        if (queue.length === 0) {
          underflow = true; // nothing to remove — no-op
        } else {
          value = queue.shift() ?? null; // removes from the FRONT
          changedEnd = "front";
        }
        break;
      }
    }

    steps.push({
      op,
      stack: stack.slice(),
      queue: queue.slice(),
      changedEnd,
      value,
      underflow,
    });
  }

  return { steps, stack: stack.slice(), queue: queue.slice() };
}

/** Named op sequences the sim offers. Each is built so LIFO vs FIFO diverge on
    the SAME value stream — you push/enqueue the same numbers into both, then
    drain, and read the order back. */
export type OpPreset = { id: string; name: string; blurb: string; ops: Op[] };

/** Fill both with 1,2,3 (push == enqueue for the "add" half), then remove three
    times. The stack hands back 3,2,1; the queue hands back 1,2,3. */
function fillThenDrain(values: number[]): Op[] {
  const ops: Op[] = [];
  for (const v of values) {
    ops.push({ kind: "push", value: v });
    ops.push({ kind: "enqueue", value: v });
  }
  for (let i = 0; i < values.length; i++) {
    ops.push({ kind: "pop" });
    ops.push({ kind: "dequeue" });
  }
  return ops;
}

export const STACK_QUEUE_PRESETS: readonly OpPreset[] = [
  {
    id: "fill-drain",
    name: "Fill 1·2·3, then drain",
    blurb:
      "Add 1, 2, 3 to both, then remove all three. The stack reverses the stream (3,2,1); the queue preserves it (1,2,3). That reversal is what a stack is FOR.",
    ops: fillThenDrain([1, 2, 3]),
  },
  {
    id: "interleaved",
    name: "Interleaved add/remove",
    blurb:
      "Mix additions and removals: push/enqueue 1,2, remove one from each, add 3, remove the rest. The stack pops the most-recent survivor; the queue always serves the oldest.",
    ops: [
      { kind: "push", value: 1 },
      { kind: "enqueue", value: 1 },
      { kind: "push", value: 2 },
      { kind: "enqueue", value: 2 },
      { kind: "pop" }, // stack loses 2 (newest)
      { kind: "dequeue" }, // queue loses 1 (oldest)
      { kind: "push", value: 3 },
      { kind: "enqueue", value: 3 },
      { kind: "pop" }, // stack loses 3
      { kind: "dequeue" }, // queue loses 2
      { kind: "pop" }, // stack loses 1
      { kind: "dequeue" }, // queue loses 3
    ],
  },
  {
    id: "underflow",
    name: "Empty-out (underflow guard)",
    blurb:
      "Add one item, then try to remove twice. The second removal hits an empty structure — an UNDERFLOW, flagged as a no-op rather than a crash.",
    ops: [
      { kind: "push", value: 7 },
      { kind: "enqueue", value: 7 },
      { kind: "pop" },
      { kind: "dequeue" },
      { kind: "pop" }, // underflow — stack already empty
      { kind: "dequeue" }, // underflow — queue already empty
    ],
  },
] as const;
