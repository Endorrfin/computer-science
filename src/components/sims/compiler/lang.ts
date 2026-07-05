// P3 · the whole pipeline in one call — the barrel the HERO + tests import from.
// Pure, erasable-syntax only. Runs source through all four stages and reports
// the FIRST error precisely (which stage complained, and where), which is what
// makes "break the syntax → watch it complain" honest.

import { lex, SyntaxError_ } from "./lexer.ts";
import type { Token } from "./lexer.ts";
import { parse } from "./parser.ts";
import type { Program } from "./parser.ts";
import { codegen } from "./compiler.ts";
import type { CodegenResult } from "./compiler.ts";
import { initVm, run } from "./vm.ts";
import type { VmState } from "./vm.ts";

export type Stage = "lex" | "parse" | "compile";

export type CompileError = {
  stage: Stage;
  message: string;
  pos: number;
  line: number;
  col: number;
};

export type CompileResult = {
  ok: boolean;
  source: string;
  tokens: Token[];
  ast: Program | null;
  cg: CodegenResult | null;
  error: CompileError | null; // the first (and only reported) error
};

function toError(e: unknown, stage: Stage): CompileError {
  if (e instanceof SyntaxError_) {
    return { stage: e.stage, message: e.message, pos: e.pos, line: e.line, col: e.col };
  }
  const message = e instanceof Error ? e.message : String(e);
  return { stage, message, pos: 0, line: 1, col: 1 };
}

/** Lex → parse → codegen. Stops at the first failing stage and reports it. */
export function compile(source: string): CompileResult {
  let tokens: Token[] = [];
  try {
    tokens = lex(source);
  } catch (e) {
    return { ok: false, source, tokens, ast: null, cg: null, error: toError(e, "lex") };
  }
  let ast: Program;
  try {
    ast = parse(tokens);
  } catch (e) {
    return { ok: false, source, tokens, ast: null, cg: null, error: toError(e, "parse") };
  }
  let cg: CodegenResult;
  try {
    cg = codegen(ast);
  } catch (e) {
    return { ok: false, source, tokens, ast, cg: null, error: toError(e, "compile") };
  }
  return { ok: true, source, tokens, ast, cg, error: null };
}

/** Compile then run on the stack VM. Returns the final VM state (or null if it
    didn't compile). Convenience for the boss check and test-p3.ts. */
export function compileAndRun(source: string, maxSteps?: number): { compiled: CompileResult; vm: VmState | null } {
  const compiled = compile(source);
  if (!compiled.ok || !compiled.cg) return { compiled, vm: null };
  return { compiled, vm: run(initVm(compiled.cg), maxSteps) };
}

// Re-exports so the sim + tests import the whole toolchain from one module.
export { lex } from "./lexer.ts";
export type { Token, TokType } from "./lexer.ts";
export { parse, usesWhile, declaresVar } from "./parser.ts";
export type { Program, Stmt, Expr, BinOp, UnaryOp } from "./parser.ts";
export { codegen, formatInstr } from "./compiler.ts";
export type { Instr, OpCode, CodegenResult } from "./compiler.ts";
export { initVm, step, run, listing, STEP_LIMIT } from "./vm.ts";
export type { VmState } from "./vm.ts";
