// P3 · the compiler BACK-END, stage 3 — CODE GENERATION.
// Pure, erasable-syntax only. Powers the third pane of the compiler-pipeline
// HERO (the bytecode listing).
//
// The AST says WHAT the program means; codegen decides HOW to run it on a
// concrete machine. Our target is a tiny STACK MACHINE (see vm.ts): a virtual
// CPU with no registers, just a push-down stack. `2 + 3` becomes:
//     PUSH 2 ; PUSH 3 ; ADD        (ADD pops two, pushes their sum)
// This is exactly the same idea as ch.7's real CPU — a linear list of simple
// instructions — but the machine is *invented*, not silicon. That's the whole
// trick of a virtual machine / bytecode: compile once to a made-up instruction
// set, then run it anywhere you can write a small interpreter (JVM, CPython,
// V8's Ignition, WebAssembly all do this).
//
// Two jobs live here beyond translation:
//  • a SYMBOL TABLE mapping each variable name to a numbered slot, which is
//    where "undefined variable" / "already declared" errors are caught (a third
//    error stage, distinct from lexing and parsing);
//  • BACKPATCHING jumps: when we emit a forward jump for a while/if we don't yet
//    know the target address, so we leave a hole and fill it once we do.

import { SyntaxError_ } from "./lexer.ts";
import type { Token } from "./lexer.ts";
import type { BinOp, Expr, Program, Stmt } from "./parser.ts";

export type OpCode =
  | "PUSH" // push a constant onto the stack
  | "LOAD" // push a variable's value (arg = slot)
  | "STORE" // pop, write into a variable (arg = slot)
  | "ADD" | "SUB" | "MUL" | "DIV" | "MOD" | "NEG"
  | "EQ" | "NE" | "LT" | "LE" | "GT" | "GE"
  | "AND" | "OR" | "NOT"
  | "PRINT" // pop and print
  | "JUMP" // pc = arg
  | "JUMP_IF_FALSE" // pop; if it's 0, pc = arg
  | "HALT";

export type Instr = {
  op: OpCode;
  arg?: number; // PUSH value · LOAD/STORE slot · JUMP* target
};

export type CodegenResult = {
  code: Instr[];
  varNames: string[]; // slot index → variable name (for the UI + tracing)
};

const BIN_TO_OP: Record<BinOp, OpCode> = {
  "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD",
  "==": "EQ", "!=": "NE", "<": "LT", "<=": "LE", ">": "GT", ">=": "GE",
  and: "AND", or: "OR",
};

class Codegen {
  private code: Instr[] = [];
  private slots = new Map<string, number>();
  private names: string[] = [];

  // A compile-stage error still carries a token position, so the pipeline can
  // point at the offending name. We reuse SyntaxError_ with stage "compile".
  private fail(message: string, tok: Token): never {
    const e = new SyntaxError_(message, tok, "parse");
    e.stage = "compile";
    e.name = "CompileError";
    throw e;
  }

  private declareSlot(name: string, tok: Token): number {
    if (this.slots.has(name)) this.fail(`Variable "${name}" is already declared`, tok);
    const slot = this.names.length;
    this.slots.set(name, slot);
    this.names.push(name);
    return slot;
  }
  private resolve(name: string, tok: Token): number {
    const slot = this.slots.get(name);
    if (slot === undefined) this.fail(`Undefined variable "${name}" — declare it with "let" first`, tok);
    return slot;
  }

  private emit(op: OpCode, arg?: number): number {
    this.code.push(arg === undefined ? { op } : { op, arg });
    return this.code.length - 1; // index, for backpatching
  }

  run(prog: Program): CodegenResult {
    for (const s of prog.body) this.stmt(s);
    this.emit("HALT");
    return { code: this.code, varNames: this.names };
  }

  private stmt(s: Stmt): void {
    if (s.kind === "let") {
      this.expr(s.expr);
      this.emit("STORE", this.declareSlot(s.name, s.tok));
      return;
    }
    if (s.kind === "assign") {
      this.expr(s.expr);
      this.emit("STORE", this.resolve(s.name, s.tok));
      return;
    }
    if (s.kind === "print") {
      this.expr(s.expr);
      this.emit("PRINT");
      return;
    }
    if (s.kind === "while") {
      //   start: <cond> ; JUMP_IF_FALSE end ; <body> ; JUMP start ; end:
      const start = this.code.length;
      this.expr(s.cond);
      const jifOut = this.emit("JUMP_IF_FALSE"); // target patched below
      for (const b of s.body) this.stmt(b);
      this.emit("JUMP", start);
      this.code[jifOut].arg = this.code.length; // end = here
      return;
    }
    // if / if-else
    //   <cond> ; JUMP_IF_FALSE else ; <then> ; JUMP end ; else: <else> ; end:
    this.expr(s.cond);
    const jifElse = this.emit("JUMP_IF_FALSE");
    for (const t of s.then) this.stmt(t);
    if (s.els !== null) {
      const jmpEnd = this.emit("JUMP");
      this.code[jifElse].arg = this.code.length; // else starts here
      for (const e of s.els) this.stmt(e);
      this.code[jmpEnd].arg = this.code.length; // end
    } else {
      this.code[jifElse].arg = this.code.length; // no else — skip to here
    }
  }

  private expr(e: Expr): void {
    if (e.kind === "num") {
      this.emit("PUSH", e.value);
      return;
    }
    if (e.kind === "bool") {
      this.emit("PUSH", e.value ? 1 : 0);
      return;
    }
    if (e.kind === "var") {
      this.emit("LOAD", this.resolve(e.name, e.tok));
      return;
    }
    if (e.kind === "unary") {
      this.expr(e.operand);
      this.emit(e.op === "-" ? "NEG" : "NOT");
      return;
    }
    // binary — evaluate left then right, so the stack is [… left right] and the
    // op pops right (top) then left: correct for non-commutative − / % < etc.
    this.expr(e.left);
    this.expr(e.right);
    this.emit(BIN_TO_OP[e.op]);
  }
}

/** AST → bytecode. Throws SyntaxError_ (stage "compile") on a name error. */
export function codegen(prog: Program): CodegenResult {
  return new Codegen().run(prog);
}

/** Human-readable form of one instruction for the bytecode pane, e.g.
    "LOAD i", "PUSH 3", "JUMP_IF_FALSE 14". */
export function formatInstr(instr: Instr, varNames: string[]): string {
  const { op, arg } = instr;
  if (op === "PUSH" || op === "JUMP" || op === "JUMP_IF_FALSE") return `${op} ${arg}`;
  if (op === "LOAD" || op === "STORE") return `${op} ${varNames[arg ?? 0] ?? arg}`;
  return op;
}
