// Engine truth-tests for the P2 machine core (ch.5 adders/ALU + ch.6
// latches/RAM). Same Node harness as test-logic/test-info; CI-gated via
// `npm test`. These lock the exact numbers the sims render and the prose
// claims (two's-complement subtraction, the V flag, edge-triggering, the
// address-width→capacity law).
import { alu, asSigned, fullAdder, halfAdder, rippleAdd } from "../src/components/sims/machine/arith.ts";
import {
  dFlipFlop,
  dLatch,
  decodeOneHot,
  isValidLatch,
  makeRam,
  ramCapacityBytes,
  ramRead,
  ramWrite,
  registerStep,
  risingEdge,
  srLatchSettle,
} from "../src/components/sims/machine/memory.ts";

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

// ================= ch.5 · adders =================
{
  const half = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ].map(([a, b]) => halfAdder(a, b));
  eq("half-adder sum col", half.map((h) => h.sum), [0, 1, 1, 0]); // = XOR
  eq("half-adder carry col", half.map((h) => h.carry), [0, 0, 0, 1]); // = AND

  const full = [
    [0, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 0],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1],
  ].map(([a, b, c]) => fullAdder(a, b, c));
  eq("full-adder sum col", full.map((f) => f.sum), [0, 1, 1, 0, 1, 0, 0, 1]);
  eq("full-adder cout col", full.map((f) => f.cout), [0, 0, 0, 1, 0, 1, 1, 1]);
}

// ripple-carry: value, carry-out, carry propagation
{
  const r1 = rippleAdd(0b0111, 0b0001, 4); // 7+1 = 8
  eq("ripple 7+1 value", r1.value, 8);
  eq("ripple 7+1 no cout", r1.cout, 0);

  const r2 = rippleAdd(0b1111, 0b0001, 4); // 15+1 = 16 → 0 carry 1
  eq("ripple 15+1 wraps to 0", r2.value, 0);
  eq("ripple 15+1 sets cout", r2.cout, 1);
  eq("ripple 15+1 carry swept every bit", r2.carries, [0, 1, 1, 1, 1]);

  const r3 = rippleAdd(0b1010, 0b0110, 4); // 10+6 = 16
  eq("ripple 10+6 value", r3.value, 0);
  eq("ripple 10+6 cout", r3.cout, 1);

  eq("ripple respects carry-in", rippleAdd(0b0001, 0b0001, 4, 1).value, 3); // 1+1+1
}

// ================= ch.5 · ALU =================
{
  const add = alu("ADD", 127, 1, 8); // signed overflow: 127+1
  eq("ALU 127+1 value", add.value, 128);
  eq("ALU 127+1 flags", add.flags, { z: false, n: true, c: false, v: true });
  eq("ALU 127+1 stores", add.writes, true);

  const addc = alu("ADD", 200, 100, 8); // 300 → 44, unsigned carry, no signed overflow (both operands' sign...)
  eq("ALU 200+100 wraps", addc.value, 44);
  eq("ALU 200+100 sets C", addc.flags.c, true);

  const sub = alu("SUB", 5, 8, 8); // 5-8 = -3 → 253, borrow (C=0), no overflow
  eq("ALU 5−8 value", sub.value, 253);
  eq("ALU 5−8 signed", asSigned(sub.value, 8), -3);
  eq("ALU 5−8 flags", sub.flags, { z: false, n: true, c: false, v: false });

  const subNoBorrow = alu("SUB", 8, 5, 8); // 3, no borrow → C=1
  eq("ALU 8−5 value", subNoBorrow.value, 3);
  eq("ALU 8−5 C=1 (no borrow)", subNoBorrow.flags.c, true);

  const subOverflow = alu("SUB", 0x80, 1, 8); // -128 - 1 → signed overflow
  eq("ALU (−128)−1 overflows", subOverflow.flags.v, true);

  const cmp = alu("CMP", 42, 42, 8); // equal → Z, discards result
  eq("ALU CMP equal sets Z", cmp.flags.z, true);
  eq("ALU CMP stores nothing", cmp.writes, false);
  eq("ALU CMP C=1 (42≥42)", cmp.flags.c, true);

  eq("ALU AND masks", alu("AND", 0xf0, 0x3c, 8).value, 0x30);
  eq("ALU OR sets", alu("OR", 0xf0, 0x0f, 8).value, 0xff);
  eq("ALU XOR flips", alu("XOR", 0xff, 0x0f, 8).value, 0xf0);
  eq("ALU logic clears C/V", (() => { const f = alu("AND", 0xff, 0xff, 8).flags; return { c: f.c, v: f.v }; })(), { c: false, v: false });
  eq("ALU AND all-zero sets Z", alu("AND", 0xf0, 0x0f, 8).flags.z, true);

  eq("asSigned 0x80 = −128", asSigned(0x80, 8), -128);
  eq("asSigned 0x7F = 127", asSigned(0x7f, 8), 127);
}

// ================= ch.6 · SR latch =================
{
  const set = srLatchSettle(1, 0, { q: 0, qbar: 1 }); // Set
  const setEnd = set.trace[set.trace.length - 1];
  eq("SR Set → Q=1, stable", [setEnd.q, set.stable], [1, true]);
  eq("SR Set → valid (Q≠Q̄)", isValidLatch(setEnd), true);

  const hold = srLatchSettle(0, 0, setEnd); // Hold after set
  eq("SR Hold keeps Q=1", hold.trace[hold.trace.length - 1].q, 1);

  const reset = srLatchSettle(0, 1, setEnd); // Reset
  eq("SR Reset → Q=0", reset.trace[reset.trace.length - 1].q, 0);

  const forbidden = srLatchSettle(1, 1, { q: 1, qbar: 0 }); // both inputs high
  const fEnd = forbidden.trace[forbidden.trace.length - 1];
  eq("SR forbidden → both outputs 0", [fEnd.q, fEnd.qbar], [0, 0]);
  eq("SR forbidden state is invalid", isValidLatch(fEnd), false);
}

// ================= ch.6 · D latch + flip-flop =================
{
  eq("D latch transparent when enabled", dLatch(1, 1, 0), 1);
  eq("D latch holds when disabled", dLatch(1, 0, 0), 0);

  eq("rising edge 0→1 detected", risingEdge(0, 1), true);
  eq("no edge on 1→1", risingEdge(1, 1), false);
  eq("no edge on 1→0 (falling)", risingEdge(1, 0), false);

  eq("DFF captures D on rising edge", dFlipFlop(0, 1, 1, 0), 1);
  eq("DFF ignores D on high level (no edge)", dFlipFlop(1, 1, 0, 1), 1);
  eq("DFF holds through falling edge", dFlipFlop(1, 0, 0, 1), 1);

  // register: only a rising edge WITH load writes
  eq("register loads on edge+load", registerStep(0, 1, 1, 0xab, 0x00, 8), 0xab);
  eq("register ignores edge without load", registerStep(0, 1, 0, 0xab, 0x12, 8), 0x12);
  eq("register holds between edges", registerStep(1, 1, 1, 0xab, 0x12, 8), 0x12);
}

// ================= ch.6 · RAM =================
{
  eq("decoder is one-hot (addr 5 of 8)", decodeOneHot(5, 3), [0, 0, 0, 0, 0, 1, 0, 0]);
  eq("decoder wraps to bus width", decodeOneHot(9, 3).filter((x) => x).length, 1);

  let ram = makeRam(4, 8); // 16 × 8-bit
  eq("fresh RAM is zeroed", ramRead(ram, 7), 0);
  ram = ramWrite(ram, 7, 0xab, 1);
  eq("write then read round-trips", ramRead(ram, 7), 0xab);
  eq("write-enable=0 is a no-op", ramRead(ramWrite(ram, 7, 0x00, 0), 7), 0xab);
  eq("byte is masked to word width", ramRead(ramWrite(ram, 2, 300, 1), 2), 300 & 0xff);
  eq("writes don't disturb neighbors", ramRead(ram, 8), 0);

  // the headline law: +1 address wire doubles capacity
  eq("3 wires → 8 bytes", ramCapacityBytes(3, 8), 8);
  eq("4 wires → 16 bytes", ramCapacityBytes(4, 8), 16);
  eq("16 wires → 64 KiB", ramCapacityBytes(16, 8), 65536);
  eq("32 wires → 4 GiB (no 32-bit shift overflow)", ramCapacityBytes(32, 8), 4294967296);
}

if (failed > 0) {
  console.error(`\n✗ ${failed} machine test(s) failed`);
  process.exit(1);
}
console.log("✓ machine-core engine truth-tests pass (adders · ALU · latches · RAM)");
