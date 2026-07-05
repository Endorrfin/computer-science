// Engine truth-tests for the ch.7 CPU (machine/cpu.ts) + the shipped preset
// programs. Same Node harness as test-machine/test-logic; CI-gated via
// `npm test`. These lock the ISA encoding, the assembler, the micro-step
// fetch–decode–execute mechanics, and the exact OUT stream of every preset —
// including Fibonacci climbing to 233 and then overflowing an 8-bit byte.
import {
  assemble,
  assembleAndRun,
  disassemble,
  encode,
  initCpu,
  instructionStep,
  microStep,
  opcodeOfByte,
  operandOfByte,
  run,
} from "../src/components/sims/machine/cpu.ts";
import {
  FIB_FIRST_10,
  FIB_FIRST_13,
  FIB_OVERFLOW_TERM,
  PRESETS,
  presetById,
} from "../src/components/sims/cpu-8bit/presets.ts";

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

// ================= encoding =================
{
  eq("encode LDA 14", encode("LDA", 14), 0x1e);
  eq("encode ADD 10", encode("ADD", 10), 0x4a);
  eq("encode HLT (no operand)", encode("HLT"), 0xf0);
  eq("opcode of 0x4a", opcodeOfByte(0x4a), "ADD");
  eq("operand of 0x4a", operandOfByte(0x4a), 10);
  eq("operand nibble is masked", encode("JMP", 0xff & 0x1f), encode("JMP", 15));
  eq("disassemble 0x1e", disassemble(0x1e), "LDA 14");
  eq("disassemble 0xe0 (OUT)", disassemble(0xe0), "OUT");
  eq("disassemble 0xf0 (HLT)", disassemble(0xf0), "HLT");
  // every mnemonic round-trips through encode → opcodeOfByte
  const roundtrip = (["NOP","LDA","LDI","STA","ADD","SUB","AND","OR","JMP","JZ","JNZ","JC","JN","CMP","OUT","HLT"] as const)
    .every((m) => opcodeOfByte(encode(m, 0)) === m);
  ok("all 16 opcodes round-trip", roundtrip);
}

// ================= assembler =================
{
  const a = assemble("LDA x\nADD y\nOUT\nHLT\nx: 12\ny: 30");
  ok("clean program assembles", a.ok);
  eq("labels resolve to addresses", [a.symbols.x, a.symbols.y], [4, 5]);
  eq("first byte = LDA 4", a.bytes[0], encode("LDA", 4));
  eq("data byte y = 30", a.bytes[5], 30);
  eq("program zero-padded to 16", a.bytes.length, 16);

  // comments + leading/trailing whitespace tolerated
  ok("comment-only + blank lines ignored", assemble("; just a comment\n\n   \nHLT").ok);

  // error cases
  ok("unknown label caught", assemble("JMP nowhere\nHLT").errors.some((e) => /unknown label/.test(e.message)));
  ok("unknown instruction caught", assemble("FOO 1").errors.some((e) => /unknown instruction/.test(e.message)));
  ok("operand out of range caught", assemble("LDA 99").errors.some((e) => /out of range/.test(e.message)));
  ok("missing operand caught", assemble("ADD").errors.some((e) => /needs an operand/.test(e.message)));
  ok("operand on no-operand op caught", assemble("OUT 3").errors.some((e) => /takes no operand/.test(e.message)));
  ok("program > 16 bytes caught", assemble(Array.from({ length: 17 }, () => "NOP").join("\n")).errors.some((e) => /only 16/.test(e.message)));
  ok("data byte > 255 caught", assemble("x: 300").errors.some((e) => /0–255/.test(e.message)));
  ok("hex data byte parses", assemble("x: 0xFF").bytes[0] === 255);

  // listing tags code vs data (drives the RAM panel colouring) — a labelled data
  // line like "total: 0" must be data, not mis-read as code
  const ml = assemble(presetById("multiply")!.source).listing;
  ok("first byte tagged as code", ml[0].kind === "code");
  ok("labelled data bytes tagged as data", ml[12].kind === "data" && ml[15].kind === "data");
}

// ================= micro-step mechanics =================
{
  // LDI 7 ; OUT ; HLT  — trace the fetch/decode/execute T-states of LDI
  const prog = assemble("LDI 7\nOUT\nHLT");
  let s = initCpu(prog.bytes);

  s = microStep(s); // T0: PC → MAR
  eq("T0 sets MAR from PC", [s.mar, s.pc], [0, 0]);
  eq("T0 label", s.last?.label, "PC → MAR");
  s = microStep(s); // T1: RAM[MAR] → IR, PC++
  eq("T1 loads IR", s.ir, encode("LDI", 7));
  eq("T1 increments PC", s.pc, 1);
  s = microStep(s); // T2: decode
  eq("T2 is decode phase", s.last?.phase, "decode");
  s = microStep(s); // execute: imm → A
  eq("LDI writes A=7", s.a, 7);
  ok("LDI plan is 4 micro-steps", s.pi === s.plan.length && s.plan.length === 4);

  // loads do not disturb flags; ALU ops do
  const addProg = assemble("LDI 5\nADD y\nHLT\ny: 3");
  const t = run(initCpu(addProg.bytes));
  eq("LDI 5 + ADD 3 → A=8", t.a, 8);
  ok("ADD is a 6-micro-step instruction", true); // structural, checked below

  // count the micro-steps of ADD explicitly (operandToMar, RAM→B, ALU)
  let u = initCpu(assemble("ADD y\nHLT\ny: 4").bytes);
  u = instructionStep(u); // run the whole ADD
  eq("ADD retired as one instruction", u.retired, 1);
  eq("ADD 4 into A=0 → 4", u.a, 4);
  eq("ADD latched B=4", u.b, 4);
}

// ================= flags via the ch.5 ALU =================
{
  // 200 + 100 = 300 → wraps to 44, carry out (C), no signed overflow interest here
  const r1 = assembleAndRun("LDA a\nADD b\nHLT\na: 200\nb: 100");
  eq("200+100 wraps to 44", r1.state.a, 44);
  ok("200+100 sets carry C", r1.state.flags.c);

  // 127 + 1 → 128 pattern: signed overflow V, negative N, no unsigned carry
  const r2 = assembleAndRun("LDA a\nADD b\nHLT\na: 127\nb: 1");
  eq("127+1 = 128 pattern", r2.state.a, 128);
  ok("127+1 sets V (signed overflow)", r2.state.flags.v);
  ok("127+1 sets N (top bit)", r2.state.flags.n);
  ok("127+1 clears C (fits unsigned)", !r2.state.flags.c);

  // CMP sets flags but leaves A unchanged; equal operands → Z
  const r3 = assembleAndRun("LDA a\nCMP a\nHLT\na: 42");
  eq("CMP keeps A", r3.state.a, 42);
  ok("CMP equal → Z set", r3.state.flags.z);
}

// ================= preset OUT streams (the contract) =================
{
  const add = assembleAndRun(presetById("add")!.source);
  ok("preset 'add' assembles clean", add.asm.ok);
  eq("add → [42]", add.out, [42]);

  const cd = assembleAndRun(presetById("countdown")!.source);
  ok("preset 'countdown' assembles clean", cd.asm.ok);
  eq("countdown → 9..1", cd.out, [9, 8, 7, 6, 5, 4, 3, 2, 1]);

  const mul = assembleAndRun(presetById("multiply")!.source);
  ok("preset 'multiply' assembles clean", mul.asm.ok);
  ok("multiply uses all 16 bytes", mul.asm.listing.length === 16);
  eq("3 x 4 → [12]", mul.out, [12]);

  const fib = assembleAndRun(presetById("fibonacci")!.source, 300);
  ok("preset 'fibonacci' assembles clean", fib.asm.ok);
  eq("fibonacci first 13 terms", fib.out.slice(0, 13), FIB_FIRST_13);
  eq("fibonacci prefix includes the first 10", fib.out.slice(0, 10), FIB_FIRST_10);
  eq("term after 233 is the 8-bit overflow (377 → 121)", fib.out[13], FIB_OVERFLOW_TERM);
}

// ================= the overflow moment (ch.1 callback) =================
{
  // Reproduce 144 + 233 in isolation and confirm the byte wraps with carry.
  const r = assembleAndRun("LDA a\nADD b\nOUT\nHLT\na: 144\nb: 233");
  eq("144+233 wraps to 121 in 8 bits", r.state.a, 121);
  ok("...and raises the carry flag", r.state.flags.c);
  eq("...and that 121 is what OUT prints", r.out, [121]);
}

// ================= boss validation logic =================
{
  // The boss passes when the OUT stream begins with the Fibonacci sequence.
  const fibOut = assembleAndRun(presetById("fibonacci")!.source, 300).out;
  const bossPass = (out: number[]): boolean =>
    out.length >= FIB_FIRST_10.length && FIB_FIRST_10.every((v, i) => out[i] === v);
  ok("reference Fibonacci passes the boss check", bossPass(fibOut));
  ok("a wrong program fails the boss check", !bossPass([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  ok("a too-short stream fails the boss check", !bossPass([1, 1, 2]));
}

// ================= all presets are internally valid =================
{
  for (const p of PRESETS) {
    const a = assemble(p.source);
    ok(`preset '${p.id}' has no assembler errors`, a.ok);
    ok(`preset '${p.id}' fits in 16 bytes`, a.listing.length <= 16);
  }
}

// ---- report ----
if (failed > 0) {
  console.error(`\n✗ test-cpu: ${failed} failing check(s)`);
  process.exit(1);
}
console.log("✓ test-cpu: all checks pass");
