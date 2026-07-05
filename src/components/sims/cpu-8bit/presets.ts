// Preset programs for the cpu-8bit HERO (ch.7). Shared by the sim AND
// scripts/test-cpu.ts, so the exact OUT streams are locked by CI. Pure data —
// erasable-syntax only.
//
// The ISA (see machine/cpu.ts): 16 bytes of RAM, one-byte instructions
// (opcode nibble + operand nibble), accumulator A + operand latch B, flags
// Z/N/C/V. Labels resolve to addresses; a bare number is a data byte.

export type CpuPreset = {
  id: string;
  label: string;
  blurb: string;
  source: string;
};

// The Fibonacci targets the boss checks against (first terms of the sequence).
export const FIB_FIRST_10 = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
export const FIB_FIRST_13 = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
export const FIB_OVERFLOW_TERM = 121; // 144 + 233 = 377, wrapped into 8 bits (377 − 256)

export const PRESETS: CpuPreset[] = [
  {
    id: "add",
    label: "Add two numbers",
    blurb: "The smallest real program: load, add, print. Watch A hold the running value while B latches the operand.",
    source: [
      "; add two numbers and print the sum",
      "LDA x      ; A <- x",
      "ADD y      ; A <- x + y   (B latches y, ALU adds)",
      "OUT        ; print the sum",
      "HLT",
      "x: 12",
      "y: 30",
    ].join("\n"),
  },
  {
    id: "countdown",
    label: "Count down from 9",
    blurb: "A loop = a backward JMP. SUB sets the Z flag; JNZ reads it to decide whether to go round again.",
    source: [
      "; count 9,8,...,1 then stop",
      "      LDI 9      ; A <- 9",
      "loop: OUT        ; print A",
      "      SUB one    ; A <- A - 1, set flags",
      "      JNZ loop   ; if A != 0, loop",
      "      HLT",
      "one:  1",
    ].join("\n"),
  },
  {
    id: "multiply",
    label: "Multiply 3 x 4 (by adding)",
    blurb: "The CPU has no multiply instruction — so we build one from a loop of adds. count controls the repeats; total accumulates.",
    source: [
      "; 3 * 4 via repeated addition -> 12",
      "      LDI 0      ; total <- 0",
      "      STA total",
      "loop: LDA total",
      "      ADD add    ; total += 3",
      "      STA total",
      "      LDA count",
      "      SUB one    ; count -= 1",
      "      STA count",
      "      JNZ loop   ; repeat until count = 0",
      "      LDA total",
      "      OUT        ; print 12",
      "      HLT",
      "add:   3",
      "count: 4",
      "one:   1",
      "total: 0",
    ].join("\n"),
  },
  {
    id: "fibonacci",
    label: "Fibonacci (the P2 boss)",
    blurb: "Two variables, an add, and a jump — the whole sequence. It climbs 1,1,2,...,233, then 144+233 = 377 overflows a byte and wraps to 121: the ch.1 lesson, live in silicon.",
    source: [
      "; Fibonacci: print each term forever",
      "loop: LDA x      ; A <- x",
      "      OUT        ; print it",
      "      ADD y      ; A <- x + y  (C=1 when it overflows 8 bits)",
      "      STA t      ; t <- x + y",
      "      LDA y",
      "      STA x      ; x <- old y",
      "      LDA t",
      "      STA y      ; y <- new term",
      "      JMP loop",
      "x: 1",
      "y: 1",
      "t: 0",
    ].join("\n"),
  },
];

// A scaffold shown when the learner opens boss mode: the data + skeleton, with
// the loop body left to them. (They can also just write it from scratch.)
export const BOSS_STARTER = [
  "; BOSS — make the CPU print the Fibonacci sequence: 1, 1, 2, 3, 5, 8, ...",
  "; Tips: keep the two most-recent terms in RAM (x, y). Each pass: print one,",
  "; compute x+y, then shift (x <- old y, y <- sum). A backward JMP is your loop.",
  "",
  "loop: LDA x",
  "      OUT",
  "      ; ... your code: compute x+y and shift x, y ...",
  "      JMP loop",
  "x: 1",
  "y: 1",
  "t: 0",
].join("\n");

export function presetById(id: string): CpuPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
