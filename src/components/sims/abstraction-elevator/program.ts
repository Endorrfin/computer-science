// ch.10 · data for the abstraction-elevator micro-sim. Pure (no React), so
// test-p3.ts can verify the machine-code floor is the REAL output of ch.7's
// assembler — the same program, shown at four heights.
//
// One program — add two numbers and print — rendered at four levels of
// abstraction. The bottom two floors are honest: the assembly is ch.7's ISA and
// the machine code is exactly what ch.7's assembler emits for it.

export type ElevLink = {
  label: string;
  ts: number[]; // line indices lit on each floor when this concept is active
  c: number[];
  asm: number[];
  mc: number[];
};

export const TS_LINES = ["let a = 6;", "let b = 7;", "let sum = a + b;", "print(sum);"];

export const C_LINES = ["int a = 6;", "int b = 7;", "int sum = a + b;", 'printf("%d\\n", sum);'];

// Display assembly (ch.7 ISA). Order matches the assembler's address order, so
// asm line i corresponds to machine-code byte i.
export const ASM_LINES = [
  "LDA a      ; A ← a",
  "ADD b      ; A ← A + b",
  "OUT        ; print A",
  "HLT        ; stop",
  "a: 6       ; data",
  "b: 7       ; data",
];

// The ch.7 assembly this compiles from, and the exact bytes it assembles to
// (locked against machine/cpu.ts in test-p3.ts). LDA a=0x14, ADD b=0x45,
// OUT=0xE0, HLT=0xF0, then data 6, 7 — a and b live at addresses 4 and 5.
export const ELEVATOR_ASM = "LDA a\nADD b\nOUT\nHLT\na: 6\nb: 7";
export const ELEVATOR_BYTES = [0x14, 0x45, 0xe0, 0xf0, 6, 7];

// Which lines light together across floors: declarations become data bytes; the
// one compute line becomes the two instructions that read a and b.
export const LINKS: ElevLink[] = [
  { label: "declare a = 6", ts: [0], c: [0], asm: [4], mc: [4] },
  { label: "declare b = 7", ts: [1], c: [1], asm: [5], mc: [5] },
  { label: "sum = a + b", ts: [2], c: [2], asm: [0, 1], mc: [0, 1] },
  { label: "print(sum)", ts: [3], c: [3], asm: [2], mc: [2] },
];
