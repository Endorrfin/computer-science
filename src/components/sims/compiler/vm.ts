// P3 · the runtime, stage 4 — the STACK VIRTUAL MACHINE.
// Pure, erasable-syntax only. Powers the fourth pane of the compiler-pipeline
// HERO (the running stack you can single-step).
//
// The bytecode from compiler.ts targets this machine: a CPU with NO registers,
// just an operand STACK and a linear program. It runs the same fetch → execute
// loop as ch.7's real CPU — read code[pc], do it, advance pc — but every
// operation works on the stack instead of an accumulator. `PUSH 2; PUSH 3; ADD`
// leaves 5 on top. Control flow is just jumps that reassign pc, exactly like the
// CPU's backward JMP. This is what "interpreting bytecode" means, and it's how
// CPython, the JVM and V8's Ignition tier actually run your code.
//
// We keep it STEPPABLE (one instruction per step, returning a fresh state) so
// the UI can animate the stack growing and shrinking — the mirror of the ch.7
// micro-step model, one level up.

import { formatInstr } from "./compiler.ts";
import type { CodegenResult, Instr } from "./compiler.ts";

export type VmState = {
  code: Instr[];
  varNames: string[];
  pc: number;
  stack: number[];
  vars: number[]; // slot values (0 until first STORE)
  output: number[];
  halted: boolean;
  steps: number; // instructions executed (infinite-loop guard)
  error: string | null; // runtime error (divide by zero, step limit)
  last: { pc: number; instr: Instr; note: string } | null; // the step just run
};

export const STEP_LIMIT = 100_000;

export function initVm(cg: CodegenResult): VmState {
  return {
    code: cg.code,
    varNames: cg.varNames,
    pc: 0,
    stack: [],
    vars: new Array<number>(cg.varNames.length).fill(0),
    output: [],
    halted: false,
    steps: 0,
    error: null,
    last: null,
  };
}

/** Execute exactly one bytecode instruction, returning a new state. Halted or
    errored machines are fixed points. */
export function step(s: VmState): VmState {
  if (s.halted || s.error) return s;
  if (s.steps >= STEP_LIMIT) {
    return { ...s, halted: true, error: `Step limit (${STEP_LIMIT}) exceeded — an infinite loop?` };
  }

  const instr = s.code[s.pc];
  const stack = s.stack.slice();
  const vars = s.vars;
  const output = s.output;
  let pc = s.pc + 1;
  let halted = false;
  let error: string | null = null;
  let out = output;
  let varsNext = vars;

  const name = (slot: number) => s.varNames[slot] ?? `#${slot}`;
  const pop = (): number => {
    if (stack.length === 0) {
      error = "Stack underflow (internal compiler error)";
      return 0;
    }
    return stack.pop() as number;
  };

  let note = "";

  switch (instr.op) {
    case "PUSH": {
      const v = instr.arg ?? 0;
      stack.push(v);
      note = `push ${v}`;
      break;
    }
    case "LOAD": {
      const slot = instr.arg ?? 0;
      const v = vars[slot] ?? 0;
      stack.push(v);
      note = `load ${name(slot)} (= ${v})`;
      break;
    }
    case "STORE": {
      const slot = instr.arg ?? 0;
      const v = pop();
      varsNext = vars.slice();
      varsNext[slot] = v;
      note = `store ${v} → ${name(slot)}`;
      break;
    }
    case "ADD": case "SUB": case "MUL": case "DIV": case "MOD": {
      const b = pop();
      const a = pop();
      let r = 0;
      if (instr.op === "ADD") r = a + b;
      else if (instr.op === "SUB") r = a - b;
      else if (instr.op === "MUL") r = a * b;
      else if (instr.op === "DIV" || instr.op === "MOD") {
        if (b === 0) {
          error = `Division by zero`;
          note = `${a} ${instr.op === "DIV" ? "/" : "%"} 0 — runtime error`;
          break;
        }
        // integer arithmetic: truncate toward zero (C-style), matching %
        r = instr.op === "DIV" ? Math.trunc(a / b) : a % b;
      }
      stack.push(r);
      note = `${a} ${GLYPH[instr.op]} ${b} = ${r}`;
      break;
    }
    case "NEG": {
      const a = pop();
      stack.push(-a);
      note = `negate ${a} = ${-a}`;
      break;
    }
    case "NOT": {
      const a = pop();
      const r = a === 0 ? 1 : 0;
      stack.push(r);
      note = `not ${a} = ${r}`;
      break;
    }
    case "EQ": case "NE": case "LT": case "LE": case "GT": case "GE": {
      const b = pop();
      const a = pop();
      const r = COMPARE[instr.op](a, b) ? 1 : 0;
      stack.push(r);
      note = `${a} ${GLYPH[instr.op]} ${b} → ${r}`;
      break;
    }
    case "AND": case "OR": {
      const b = pop();
      const a = pop();
      const r = instr.op === "AND" ? (a !== 0 && b !== 0 ? 1 : 0) : a !== 0 || b !== 0 ? 1 : 0;
      stack.push(r);
      note = `${a} ${instr.op.toLowerCase()} ${b} → ${r}`;
      break;
    }
    case "PRINT": {
      const v = pop();
      out = [...output, v];
      note = `print ${v}`;
      break;
    }
    case "JUMP": {
      pc = instr.arg ?? 0;
      note = `jump → ${pc}`;
      break;
    }
    case "JUMP_IF_FALSE": {
      const v = pop();
      if (v === 0) {
        pc = instr.arg ?? 0;
        note = `condition is false → jump ${pc}`;
      } else {
        note = `condition is true → fall through`;
      }
      break;
    }
    case "HALT": {
      halted = true;
      pc = s.pc;
      note = `halt — done`;
      break;
    }
  }

  return {
    ...s,
    stack,
    vars: varsNext,
    output: out,
    pc,
    halted: halted || error !== null,
    error,
    steps: s.steps + 1,
    last: { pc: s.pc, instr, note: error ? `${note}` : note },
  };
}

const GLYPH: Record<string, string> = {
  ADD: "+", SUB: "−", MUL: "×", DIV: "÷", MOD: "%",
  EQ: "==", NE: "!=", LT: "<", LE: "≤", GT: ">", GE: "≥",
};
const COMPARE: Record<string, (a: number, b: number) => boolean> = {
  EQ: (a, b) => a === b, NE: (a, b) => a !== b,
  LT: (a, b) => a < b, LE: (a, b) => a <= b,
  GT: (a, b) => a > b, GE: (a, b) => a >= b,
};

/** Run to HALT (or error), returning the final state. Termination is guaranteed
    by step()'s own STEP_LIMIT guard (which flags a runaway loop as an error), so
    the default cap is Infinity; pass a smaller `maxSteps` only to truncate. */
export function run(s: VmState, maxSteps = Infinity): VmState {
  let st = s;
  let n = 0;
  while (!st.halted && !st.error && n < maxSteps) {
    st = step(st);
    n++;
  }
  return st;
}

/** Disassembly of the whole program for the bytecode pane. */
export function listing(cg: CodegenResult): string[] {
  return cg.code.map((instr, i) => `${String(i).padStart(2, " ")}  ${formatInstr(instr, cg.varNames)}`);
}
