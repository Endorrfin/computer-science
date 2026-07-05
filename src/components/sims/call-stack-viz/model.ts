// ch.10 · the CALL STACK engine — pure, erasable-syntax only (runs in Node for
// test-p3.ts). Powers the call-stack-viz micro-sim.
//
// A function call is not magic: the machine keeps a STACK of frames, one per
// in-progress call, each holding that call's arguments, locals and where to
// return. Calling pushes a frame; returning pops it and hands its value back to
// the caller. Recursion is just this happening to the *same* function many
// times — a pile of frames all named fib, each with its own n. And because the
// stack is finite, recursion with no base case doesn't loop forever — it
// overflows. We trace fib(n) into a list of push/work/return snapshots the UI
// can step through, plus a deliberately broken recursion to show the overflow.

export type FrameSnap = {
  id: number;
  label: string; // e.g. "fib(3)"
  sub: string; // e.g. "n=3 · a=2"
  ret: number | null; // filled in once the call has its answer
  active: boolean; // the top frame — the one currently executing
};

export type StackEvent = {
  kind: "call" | "work" | "return" | "overflow";
  note: string;
  stack: FrameSnap[]; // the whole stack at this moment (bottom → top)
  depth: number;
};

export type Trace = {
  events: StackEvent[];
  result: number | null;
  calls: number; // total frames pushed
  maxDepth: number; // deepest the stack ever got
  overflow: boolean;
};

export const STACK_LIMIT = 10; // a tiny, finite stack — real ones are ~10⁴–10⁵ frames

type Frame = { id: number; fn: string; n: number; a: number | null; b: number | null; ret: number | null };

function subOf(f: Frame): string {
  const parts = [`n=${f.n}`];
  if (f.a !== null) parts.push(`a=${f.a}`);
  if (f.b !== null) parts.push(`b=${f.b}`);
  return parts.join(" · ");
}

/** Trace fib(n) with the naive tree recursion:
 *    fib(n) = n            if n < 2   (base case)
 *    fib(n) = fib(n−1) + fib(n−2)     otherwise
 *  Every call pushes a frame; every return pops one. */
export function traceFib(n0: number): Trace {
  const events: StackEvent[] = [];
  const stack: Frame[] = [];
  let nextId = 0;
  let calls = 0;
  let maxDepth = 0;

  const snap = (kind: StackEvent["kind"], note: string): void => {
    maxDepth = Math.max(maxDepth, stack.length);
    events.push({
      kind,
      note,
      depth: stack.length,
      stack: stack.map((f, i) => ({ id: f.id, label: `${f.fn}(${f.n})`, sub: subOf(f), ret: f.ret, active: i === stack.length - 1 })),
    });
  };

  const call = (n: number): number => {
    calls++;
    const frame: Frame = { id: nextId++, fn: "fib", n, a: null, b: null, ret: null };
    stack.push(frame);
    snap("call", `push a frame: call fib(${n})`);
    let result: number;
    if (n < 2) {
      frame.ret = n;
      snap("work", `fib(${n}): n < 2 → base case, return ${n}`);
      result = n;
    } else {
      snap("work", `fib(${n}): needs fib(${n - 1}) + fib(${n - 2})`);
      const a = call(n - 1);
      frame.a = a;
      snap("work", `fib(${n}): left is ${a}; now evaluate fib(${n - 2})`);
      const b = call(n - 2);
      frame.b = b;
      frame.ret = a + b;
      snap("work", `fib(${n}) = ${a} + ${b} = ${frame.ret}`);
      result = a + b;
    }
    snap("return", `return ${result} → pop the fib(${n}) frame`);
    stack.pop();
    return result;
  };

  const result = call(n0);
  events.push({ kind: "return", note: `done — fib(${n0}) = ${result}. The stack is empty again.`, depth: 0, stack: [] });
  return { events, result, calls, maxDepth, overflow: false };
}

/** A recursion with NO base case: countUp(n) → countUp(n+1) forever. Frames pile
 *  up until the finite stack is full — a stack overflow, not an infinite loop. */
export function traceOverflow(): Trace {
  const events: StackEvent[] = [];
  const stack: Frame[] = [];
  let nextId = 0;
  let calls = 0;

  const snap = (kind: StackEvent["kind"], note: string): void => {
    events.push({
      kind,
      note,
      depth: stack.length,
      stack: stack.map((f, i) => ({ id: f.id, label: `${f.fn}(${f.n})`, sub: subOf(f), ret: f.ret, active: i === stack.length - 1 })),
    });
  };

  const boom = (n: number): void => {
    calls++;
    stack.push({ id: nextId++, fn: "countUp", n, a: null, b: null, ret: null });
    if (stack.length >= STACK_LIMIT) {
      snap("overflow", `💥 Stack overflow — ${STACK_LIMIT} frames deep and still recursing. With no base case, nothing ever pops.`);
      return;
    }
    snap("call", `push a frame: call countUp(${n}) — no base case in sight`);
    boom(n + 1);
  };

  boom(1);
  return { events, result: null, calls, maxDepth: STACK_LIMIT, overflow: true };
}
