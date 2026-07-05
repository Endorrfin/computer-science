// P2 · machine arithmetic engine — pure, framework-free (erasable-syntax
// only: the qa gate + test-machine.ts run this in Node via
// --experimental-strip-types). Shared by build-an-adder + alu-visualizer,
// and asserted bit-for-bit in scripts/test-machine.ts.
//
// Everything here is built from the ch.4 gate primitives (XOR/AND/OR): an
// adder is nothing but gates wired to carry. We keep the gate-level trace so
// the sims can animate the carry rippling, not just show the answer.

// ---- single-bit adders (the whole chapter in two functions) ----

/** Half adder: two bits in, sum + carry out. sum = a⊕b, carry = a∧b. */
export function halfAdder(a: number, b: number): { sum: number; carry: number } {
  return { sum: (a ^ b) & 1, carry: a & b & 1 };
}

/** Full adder: adds a carry-in too. Two half-adders + an OR on the carries. */
export function fullAdder(a: number, b: number, cin: number): { sum: number; cout: number } {
  const h1 = halfAdder(a, b);
  const h2 = halfAdder(h1.sum, cin);
  return { sum: h2.sum, cout: (h1.carry | h2.carry) & 1 };
}

// ---- multi-bit ripple-carry adder ----

export type BitTrace = { i: number; a: number; b: number; cin: number; sum: number; cout: number };
export type AddResult = {
  value: number; // sum masked to `width` bits
  width: number;
  bits: BitTrace[]; // LSB→MSB, one full adder each
  carries: number[]; // length width+1; carries[0]=cin, carries[i+1]=carry out of bit i
  cout: number; // carry out of the MSB (= carries[width])
};

/** Chain `width` full adders, LSB→MSB, threading carry. cin seeds bit 0. */
export function rippleAdd(a: number, b: number, width: number, cin = 0): AddResult {
  const bits: BitTrace[] = [];
  const carries: number[] = [cin & 1];
  let c = cin & 1;
  let value = 0;
  for (let i = 0; i < width; i++) {
    const ai = (a >> i) & 1;
    const bi = (b >> i) & 1;
    const fa = fullAdder(ai, bi, c);
    bits.push({ i, a: ai, b: bi, cin: c, sum: fa.sum, cout: fa.cout });
    value |= fa.sum << i;
    c = fa.cout;
    carries.push(c);
  }
  return { value: value >>> 0, width, bits, carries, cout: c };
}

// ---- the ALU ----

export type AluOp = "ADD" | "SUB" | "AND" | "OR" | "XOR" | "CMP";
export const ALU_OPS: AluOp[] = ["ADD", "SUB", "AND", "OR", "XOR", "CMP"];

export const ALU_OP_LABEL: Record<AluOp, string> = {
  ADD: "A + B",
  SUB: "A − B",
  AND: "A AND B",
  OR: "A OR B",
  XOR: "A XOR B",
  CMP: "A − B → flags only",
};

/** Z zero · N negative (MSB) · C carry/borrow · V signed overflow. */
export type Flags = { z: boolean; n: boolean; c: boolean; v: boolean };

export type AluResult = {
  op: AluOp;
  a: number;
  b: number;
  width: number;
  value: number; // masked result (for CMP: the discarded difference)
  writes: boolean; // CMP updates flags but stores nothing
  flags: Flags;
  add?: AddResult; // present for ADD/SUB/CMP so the datapath can show carries
};

function maskOf(width: number): number {
  return width >= 32 ? 0xffffffff : (1 << width) - 1;
}

/** Interpret a width-bit pattern as a signed two's-complement number. */
export function asSigned(value: number, width: number): number {
  const m = maskOf(width);
  const v = value & m;
  const signBit = 1 << (width - 1);
  return v & signBit ? v - (m + 1) : v;
}

/** One ALU evaluation. Subtraction is A + (~B) + 1 — reuse the adder, no new
    hardware. C on SUB/CMP is the adder carry-out (1 = no borrow, ARM/RISC
    convention). Logic ops clear C and V (carry/overflow are meaningless there). */
export function alu(op: AluOp, aIn: number, bIn: number, width = 8): AluResult {
  const m = maskOf(width);
  const a = aIn & m;
  const b = bIn & m;
  let value: number;
  let c = false;
  let v = false;
  let add: AddResult | undefined;

  if (op === "ADD") {
    add = rippleAdd(a, b, width, 0);
    value = add.value & m;
    c = add.cout === 1;
    v = (add.carries[width] ^ add.carries[width - 1]) === 1;
  } else if (op === "SUB" || op === "CMP") {
    add = rippleAdd(a, (~b) & m, width, 1); // A + ~B + 1
    value = add.value & m;
    c = add.cout === 1; // 1 ⇒ no borrow (A ≥ B unsigned)
    v = (add.carries[width] ^ add.carries[width - 1]) === 1;
  } else if (op === "AND") {
    value = (a & b) & m;
  } else if (op === "OR") {
    value = (a | b) & m;
  } else {
    value = (a ^ b) & m; // XOR
  }

  const flags: Flags = {
    z: value === 0,
    n: ((value >> (width - 1)) & 1) === 1,
    c,
    v,
  };
  return { op, a, b, width, value, writes: op !== "CMP", flags, add };
}
