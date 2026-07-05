// Engine truth-tests for the ch.11 compiler-pipeline (sims/compiler/*) + its
// presets and the Language Smith boss. Same Node harness as the other suites;
// CI-gated via `npm test`. These lock the four stages end to end: token stream
// + positions, AST shape (precedence/associativity/if-else), bytecode + jump
// targets, and the stack VM's exact results — including integer division,
// divide-by-zero, and infinite-loop detection.
import {
  compile,
  compileAndRun,
  formatInstr,
  lex,
  listing,
  parse,
} from "../src/components/sims/compiler/lang.ts";
import type { Expr, Program, Stmt } from "../src/components/sims/compiler/lang.ts";
import {
  BOSS_STARTER,
  BOSS_TARGET,
  bossResult,
  PRESETS,
  presetById,
} from "../src/components/sims/compiler/presets.ts";
import { STACK_LIMIT, traceFib, traceOverflow } from "../src/components/sims/call-stack-viz/model.ts";
import { assemble } from "../src/components/sims/machine/cpu.ts";
import { ELEVATOR_ASM, ELEVATOR_BYTES } from "../src/components/sims/abstraction-elevator/program.ts";

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
  eq(name, cond, true);
}
const outOf = (src: string): number[] => compileAndRun(src).vm?.output ?? [];

// Compact s-expression of the AST, so precedence/shape is easy to assert.
function sx(prog: Program): string {
  return prog.body.map(stmt).join(" ");
}
function stmt(s: Stmt): string {
  if (s.kind === "let") return `(let ${s.name} ${ex(s.expr)})`;
  if (s.kind === "assign") return `(= ${s.name} ${ex(s.expr)})`;
  if (s.kind === "print") return `(print ${ex(s.expr)})`;
  if (s.kind === "while") return `(while ${ex(s.cond)} [${s.body.map(stmt).join(" ")}])`;
  return `(if ${ex(s.cond)} [${s.then.map(stmt).join(" ")}]${s.els ? " [" + s.els.map(stmt).join(" ") + "]" : ""})`;
}
function ex(e: Expr): string {
  if (e.kind === "num") return String(e.value);
  if (e.kind === "bool") return String(e.value);
  if (e.kind === "var") return e.name;
  if (e.kind === "unary") return `(${e.op} ${ex(e.operand)})`;
  return `(${e.op} ${ex(e.left)} ${ex(e.right)})`;
}

// ================= lexer =================
{
  const t = lex("let x = 5;");
  eq("token types", t.map((x) => x.type), ["kw", "ident", "op", "num", "semi", "eof"]);
  eq("token values", t.slice(0, 5).map((x) => x.value), ["let", "x", "=", "5", ";"]);
  // 1-based line/col of each token on one line
  eq("columns on line 1", t.slice(0, 5).map((x) => x.col), [1, 5, 7, 9, 10]);

  const two = lex("a <= b == c");
  eq("two-char ops stay whole", two.filter((x) => x.type === "op").map((x) => x.value), ["<=", "=="]);

  const ml = lex("let a = 1;\nprint a;");
  const printTok = ml.find((x) => x.value === "print");
  eq("print is on line 2, col 1", [printTok?.line, printTok?.col], [2, 1]);

  ok("// comments are skipped", lex("// hi\nprint 1; // trailing").every((x) => x.value !== "hi" && x.value !== "trailing"));
  ok("keyword vs identifier", lex("while whilex").map((x) => x.type).join(",") === "kw,ident,eof");

  // lex errors carry a stage + position
  const badChar = compile("print 3 @ 1;");
  ok("illegal char → lex-stage error", !badChar.ok && badChar.error?.stage === "lex");
  const bang = compile("print 3 ! 1;");
  ok("lone ! is a lex error naming != / not", !bang.ok && bang.error?.stage === "lex" && /!=|not/.test(bang.error.message));
}

// ================= parser / AST shape =================
{
  eq("× binds tighter than + (precedence in the tree)", sx(parse(lex("print 2 + 3 * 4;"))), "(print (+ 2 (* 3 4)))");
  eq("parentheses override precedence", sx(parse(lex("print (2 + 3) * 4;"))), "(print (* (+ 2 3) 4))");
  eq("− is left-associative", sx(parse(lex("print 10 - 4 - 3;"))), "(print (- (- 10 4) 3))");
  eq("comparison below arithmetic", sx(parse(lex("print 1 + 2 < 4;"))), "(print (< (+ 1 2) 4))");
  eq("and/or precedence (or lowest)", sx(parse(lex("print 1 or 0 and 0;"))), "(print (or 1 (and 0 0)))");
  eq("unary minus & not", sx(parse(lex("print -3 + not 0;"))), "(print (+ (- 3) (not 0)))");
  eq("let + assign", sx(parse(lex("let a = 1; a = a + 2;"))), "(let a 1) (= a (+ a 2))");
  eq("while shape", sx(parse(lex("while (i < 3) { print i; }"))), "(while (< i 3) [(print i)])");
  eq("if/else shape", sx(parse(lex("if (a) { print 1; } else { print 2; }"))), "(if a [(print 1)] [(print 2)])");
  eq("if without else", sx(parse(lex("if (a) { print 1; }"))), "(if a [(print 1)])");

  // parse errors — precise stage
  const cases: [string, RegExp][] = [
    ["print 2 +;", /Expected a value/],
    ["print 2", /Expected ";"/],
    ["let 5 = 1;", /Expected a variable name/],
    ["while 1 { }", /Expected "\("/],
    ["if (a) print 1;", /Expected "\{"/],
    ["x + 1;", /start of a statement/],
    ["} ", /Expected a statement/],
    ["else { }", /without a matching/],
  ];
  for (const [src, re] of cases) {
    const r = compile(src);
    ok(`parse error: ${src.trim()}`, !r.ok && r.error?.stage === "parse" && re.test(r.error.message));
  }
}

// ================= codegen / bytecode =================
{
  const cg = compile("let x = 5; print x;").cg!;
  eq("bytecode listing", listing(cg), [" 0  PUSH 5", " 1  STORE x", " 2  LOAD x", " 3  PRINT", " 4  HALT"]);
  eq("varNames slot map", cg.varNames, ["x"]);

  // while: forward JUMP_IF_FALSE past the loop + backward JUMP to the top
  const w = compile("let i = 1; while (i < 3) { print i; i = i + 1; }").cg!;
  const jif = w.code.findIndex((c) => c.op === "JUMP_IF_FALSE");
  const jmp = w.code.findIndex((c) => c.op === "JUMP");
  ok("while emits JUMP_IF_FALSE then a backward JUMP", jif >= 0 && jmp > jif);
  ok("backward JUMP targets the condition", (w.code[jmp].arg ?? -1) < jmp);
  ok("JUMP_IF_FALSE targets past the loop body", (w.code[jif].arg ?? -1) > jmp);
  eq("HALT terminates the program", w.code[w.code.length - 1].op, "HALT");

  // semantic (compile-stage) errors
  const undef = compile("print y;");
  ok("undefined variable → compile-stage error", !undef.ok && undef.error?.stage === "compile" && /Undefined variable/.test(undef.error.message));
  const redecl = compile("let a = 1; let a = 2;");
  ok("redeclaration → compile-stage error", !redecl.ok && redecl.error?.stage === "compile" && /already declared/.test(redecl.error.message));

  eq("formatInstr renders a slot name", formatInstr({ op: "STORE", arg: 0 }, ["total"]), "STORE total");
}

// ================= VM: expressions =================
{
  eq("2 + 3 * 4 = 14 (precedence)", outOf("print 2 + 3 * 4;"), [14]);
  eq("(2 + 3) * 4 = 20", outOf("print (2 + 3) * 4;"), [20]);
  eq("10 - 4 - 3 = 3 (left assoc)", outOf("print 10 - 4 - 3;"), [3]);
  eq("variables: 10 * 4 - 2 = 38", outOf("let a = 10; let b = 4; print a * b - 2;"), [38]);
  eq("integer division truncates: 17 / 5 = 3", outOf("print 17 / 5;"), [3]);
  eq("modulo: 17 % 5 = 2", outOf("print 17 % 5;"), [2]);
  eq("truncation toward zero: -7 / 2 = -3", outOf("print -7 / 2;"), [-3]);
  eq("unary minus: -7 + 2 = -5", outOf("print -7 + 2;"), [-5]);
  eq("comparisons yield 1/0", outOf("print 3 < 5; print 5 < 3; print 4 == 4; print 4 != 4; print 3 >= 3;"), [1, 0, 1, 0, 1]);
  eq("and/or/not (0 = false, nonzero = true)", outOf("print 1 and 0; print 1 or 0; print not 0; print not 5;"), [0, 1, 1, 0]);
  eq("compound boolean", outOf("print (2 < 3) and (3 < 4);"), [1]);
}

// ================= VM: control flow =================
{
  eq("while counts down", outOf("let i = 3; while (i > 0) { print i; i = i - 1; }"), [3, 2, 1]);
  eq("if-else takes the then branch", outOf("let a = 5; if (a > 3) { print 1; } else { print 2; }"), [1]);
  eq("if-else takes the else branch", outOf("let a = 2; if (a > 3) { print 1; } else { print 2; }"), [2]);
  eq("if with false condition, no else → skipped", outOf("if (0) { print 9; } print 7;"), [7]);
  eq("if with true condition runs the block", outOf("if (1) { print 9; } print 7;"), [9, 7]);
  eq("nested if inside while", outOf("let i = 1; while (i <= 4) { if (i % 2 == 0) { print i; } i = i + 1; }"), [2, 4]);
}

// ================= VM: runtime errors =================
{
  const dz = compileAndRun("print 1 / 0;");
  ok("divide by zero → runtime error, halted, no output", dz.vm?.error !== null && dz.vm?.halted === true && dz.vm?.output.length === 0);
  ok("divide-by-zero message", /Division by zero/.test(dz.vm?.error ?? ""));

  const mz = compileAndRun("print 5 % 0;");
  ok("modulo by zero → runtime error", /Division by zero/.test(mz.vm?.error ?? ""));

  const inf = compileAndRun("let i = 0; while (i >= 0) { i = i + 1; }");
  ok("infinite loop is caught by the step limit", /Step limit/.test(inf.vm?.error ?? ""));
}

// ================= presets (the contract) =================
{
  eq("preset 'arith' → 14", outOf(presetById("arith")!.source), [14]);
  eq("preset 'vars' → 38", outOf(presetById("vars")!.source), [38]);
  eq("preset 'countdown' → 5..1", outOf(presetById("countdown")!.source), [5, 4, 3, 2, 1]);
  eq("preset 'evens' → 12 then 9", outOf(presetById("evens")!.source), [12, 9]);
  eq("preset 'sum' → 55", outOf(presetById("sum")!.source), [55]);
  for (const p of PRESETS) ok(`preset '${p.id}' compiles clean`, compile(p.source).ok);
}

// ================= boss: Language Smith =================
{
  const good = "let sum = 0; let i = 1; while (i <= 10) { sum = sum + i; i = i + 1; } print sum;";
  const r = bossResult(good);
  ok("a loop that prints 55 wins the boss", r.pass && r.reachedTarget && r.usesLoop && r.usesVar);
  eq("boss target is 55", BOSS_TARGET, 55);

  ok("`print 55;` fails — no loop, no variable", !bossResult("print 55;").pass);
  ok("a loop reaching the wrong total fails", !bossResult("let s = 0; let i = 1; while (i <= 9) { s = s + i; i = i + 1; } print s;").pass); // 45
  ok("a program that doesn't compile fails the boss", !bossResult("print ;").pass);
  ok("the boss starter scaffold does NOT already pass (body left blank)", !bossResult(BOSS_STARTER).pass);

  // an alternative winning path: the 10th Fibonacci is also 55, via a loop
  const fib = "let a = 0; let b = 1; let t = 0; let i = 0; while (i < 10) { t = a + b; a = b; b = t; i = i + 1; } print a;";
  ok("an alternative loop to 55 also wins", bossResult(fib).pass);
}

// ================= ch.10 · the call stack =================
{
  const t = traceFib(5);
  eq("fib(5) = 5", t.result, 5);
  eq("fib(6) = 8", traceFib(6).result, 8);
  eq("fib(5) pushes 15 frames (1 + C4 + C3)", t.calls, 15);
  eq("fib(5) reaches depth 5", t.maxDepth, 5);
  ok("fib is not an overflow", !t.overflow);
  ok("the first event pushes fib(5)", t.events[0].kind === "call" && t.events[0].depth === 1);
  ok("the trace ends with an empty stack", t.events[t.events.length - 1].depth === 0);

  const ov = traceOverflow();
  ok("no-base-case recursion overflows the finite stack", ov.overflow && ov.maxDepth === STACK_LIMIT);
  ok("overflow trace ends on the overflow event", ov.events[ov.events.length - 1].kind === "overflow");
  ok("overflow has no return value", ov.result === null);
}

// ================= ch.10 · abstraction-elevator (ties to ch.7) =================
{
  const a = assemble(ELEVATOR_ASM);
  ok("elevator program assembles clean on the ch.7 ISA", a.ok);
  eq("machine-code floor is exactly ch.7's assembler output", a.bytes.slice(0, ELEVATOR_BYTES.length), ELEVATOR_BYTES);
}

// ---- report ----
if (failed > 0) {
  console.error(`\n✗ test-p3: ${failed} failing check(s)`);
  process.exit(1);
}
console.log("✓ test-p3: all checks pass");
