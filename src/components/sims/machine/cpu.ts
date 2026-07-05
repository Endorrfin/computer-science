// P2 · the CPU engine — pure, framework-free (erasable-syntax only; runs in
// Node under --experimental-strip-types for the qa gate + test-cpu.ts).
// Powers the ch.7 cpu-8bit HERO and the Fibonacci boss.
//
// This is the moment the parts click together: ch.5's ALU (arith.ts) does the
// computing, ch.6's registers + RAM (memory.ts) do the remembering, and the
// missing third piece — a clock-driven CONTROL loop — is added here. That loop
// is the whole idea of a stored-program computer: fetch a byte from RAM, decode
// what it means, execute it on the datapath, repeat.
//
// Design (Von Neumann accumulator machine, the Ben-Eater / SAP-1 lineage):
//   • 16 bytes of RAM (4-bit addresses) shared by program AND data — code is
//     just bytes, the deepest lesson of the chapter.
//   • one-byte instructions: high nibble = opcode, low nibble = operand
//     (an address 0–15, or a 0–15 immediate for LDI).
//   • registers: A (accumulator), B (the ALU's second-operand latch), PC
//     (program counter, 4-bit), IR (instruction register), MAR (memory address
//     register), flags Z/N/C/V — exactly the ch.6 register file.
// Every instruction runs as a sequence of micro-steps (T-states); each one is a
// single register-transfer over a bus, which is what the datapath animates.

import { alu, asSigned } from "./arith.ts";
import type { AluOp, Flags } from "./arith.ts";

export const RAM_BYTES = 16;
export const ADDR_MASK = RAM_BYTES - 1; // 0x0F
export const BYTE_MASK = 0xff;

// ---- the instruction set ----------------------------------------------------

export type Opcode =
  | "NOP" | "LDA" | "LDI" | "STA" | "ADD" | "SUB" | "AND" | "OR"
  | "JMP" | "JZ" | "JNZ" | "JC" | "JN" | "CMP" | "OUT" | "HLT";

type OpSpec = {
  code: number;               // high-nibble opcode (0x0–0xF)
  operand: boolean;           // does the low nibble carry an address/immediate?
  aluOp?: AluOp;              // ALU-backed data op (writes A + flags)
  cmp?: boolean;              // like an ALU op but discards the result (flags only)
  branch?: (f: Flags) => boolean; // conditional jump predicate (undefined = not a branch)
  jump?: boolean;             // unconditional jump
  summary: string;            // one-liner for decode notes / disassembly help
};

// The 16 opcodes — every nibble used. Order here defines the encoding.
export const OPS: Record<Opcode, OpSpec> = {
  NOP: { code: 0x0, operand: false, summary: "do nothing for one cycle" },
  LDA: { code: 0x1, operand: true, summary: "A ← RAM[addr]" },
  LDI: { code: 0x2, operand: true, summary: "A ← immediate (0–15)" },
  STA: { code: 0x3, operand: true, summary: "RAM[addr] ← A" },
  ADD: { code: 0x4, operand: true, aluOp: "ADD", summary: "A ← A + RAM[addr] (sets flags)" },
  SUB: { code: 0x5, operand: true, aluOp: "SUB", summary: "A ← A − RAM[addr] (sets flags)" },
  AND: { code: 0x6, operand: true, aluOp: "AND", summary: "A ← A AND RAM[addr] (sets flags)" },
  OR: { code: 0x7, operand: true, aluOp: "OR", summary: "A ← A OR RAM[addr] (sets flags)" },
  JMP: { code: 0x8, operand: true, jump: true, summary: "PC ← addr (always)" },
  JZ: { code: 0x9, operand: true, branch: (f) => f.z, summary: "PC ← addr if Z (result was 0)" },
  JNZ: { code: 0xa, operand: true, branch: (f) => !f.z, summary: "PC ← addr if not Z" },
  JC: { code: 0xb, operand: true, branch: (f) => f.c, summary: "PC ← addr if C (carry out of the top bit)" },
  JN: { code: 0xc, operand: true, branch: (f) => f.n, summary: "PC ← addr if N (result negative)" },
  CMP: { code: 0xd, operand: true, cmp: true, aluOp: "CMP", summary: "flags ← A − RAM[addr] (A kept)" },
  OUT: { code: 0xe, operand: false, summary: "print A to the output log" },
  HLT: { code: 0xf, operand: false, summary: "stop the clock" },
};

export const MNEMONICS = Object.keys(OPS) as Opcode[];
const BY_CODE: Record<number, Opcode> = {};
for (const m of MNEMONICS) BY_CODE[OPS[m].code] = m;

export function opcodeOfByte(byte: number): Opcode {
  return BY_CODE[(byte >> 4) & 0x0f];
}
export function operandOfByte(byte: number): number {
  return byte & 0x0f;
}
export function encode(op: Opcode, operand = 0): number {
  return ((OPS[op].code << 4) | (operand & 0x0f)) & BYTE_MASK;
}

/** Human-readable form of a byte read as an instruction, e.g. "ADD 14". */
export function disassemble(byte: number): string {
  const op = opcodeOfByte(byte);
  return OPS[op].operand ? `${op} ${byte & 0x0f}` : op;
}

// ---- the assembler ----------------------------------------------------------
// Tiny two-pass symbolic assembler: labels, instructions, and raw data bytes.
// One source line → one byte. Grammar per line (comments start with ';'):
//   [label:]  MNEMONIC [operand]     — an instruction
//   [label:]  <number>               — a raw data byte (a variable / constant)
//   label:                           — a label on its own, points at the next byte
// Operands may be a number (0–15) or a label (resolved to its address).

export type AsmError = { line: number; message: string };
export type ListingRow = {
  addr: number;
  byte: number;
  source: string; // the trimmed source that produced this byte
  label?: string;
  kind: "code" | "data"; // an instruction, or a raw data byte
};
export type AsmResult = {
  ok: boolean;
  bytes: number[]; // always length RAM_BYTES (zero-padded)
  symbols: Record<string, number>;
  listing: ListingRow[];
  errors: AsmError[];
};

type PreRow = { lineNo: number; label?: string; text: string; source: string };

function isNumber(tok: string): boolean {
  return /^(0x[0-9a-f]+|\d+)$/i.test(tok);
}
function parseNumber(tok: string): number {
  return tok.toLowerCase().startsWith("0x") ? parseInt(tok, 16) : parseInt(tok, 10);
}

export function assemble(source: string): AsmResult {
  const errors: AsmError[] = [];
  const symbols: Record<string, number> = {};
  const rows: PreRow[] = [];

  // --- pass 1: strip comments, peel labels, assign addresses ---
  const lines = source.split("\n");
  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const noComment = raw.replace(/;.*$/, "");
    let text = noComment.trim();
    if (text === "") return;

    // one or more leading "label:" prefixes
    let labelForRow: string | undefined;
    let guard = 0;
    while (guard++ < 4) {
      const m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (!m) break;
      const name = m[1];
      const addr = rows.length; // this label points at the byte we're about to emit
      if (name in symbols) errors.push({ line: lineNo, message: `duplicate label "${name}"` });
      else symbols[name] = addr;
      labelForRow = labelForRow ?? name;
      text = m[2].trim();
    }

    if (text === "") {
      // a bare "label:" — attach to the next emitted row; if none follows it will
      // resolve to RAM_BYTES (caught as out-of-range on use). Emit nothing here.
      // Re-point: adjust the just-added symbol(s) to the NEXT row index (already is).
      return;
    }
    rows.push({ lineNo, label: labelForRow, text, source: noComment.trim() });
  });

  if (rows.length > RAM_BYTES) {
    errors.push({
      line: rows[RAM_BYTES]?.lineNo ?? 0,
      message: `program is ${rows.length} bytes but RAM holds only ${RAM_BYTES} — trim it`,
    });
  }

  // --- pass 2: encode each row to a byte, resolving operands ---
  const bytes = new Array<number>(RAM_BYTES).fill(0);
  const listing: ListingRow[] = [];

  rows.slice(0, RAM_BYTES).forEach((row, addr) => {
    const parts = row.text.split(/\s+/);
    const head = parts[0];
    const mnemonic = head.toUpperCase();
    let byte = 0;
    let kind: "code" | "data" = "code";

    const resolveOperand = (tok: string | undefined, max: number, what: string): number => {
      if (tok === undefined) {
        errors.push({ line: row.lineNo, message: `${mnemonic} needs an operand` });
        return 0;
      }
      let val: number;
      if (isNumber(tok)) val = parseNumber(tok);
      else if (tok in symbols) val = symbols[tok];
      else {
        errors.push({ line: row.lineNo, message: `unknown label "${tok}"` });
        return 0;
      }
      if (val < 0 || val > max) {
        errors.push({ line: row.lineNo, message: `${what} ${val} out of range 0–${max}` });
        return Math.max(0, Math.min(max, val));
      }
      return val;
    };

    if ((MNEMONICS as string[]).includes(mnemonic)) {
      const spec = OPS[mnemonic as Opcode];
      if (spec.operand) {
        const operand = resolveOperand(parts[1], ADDR_MASK, "operand");
        byte = encode(mnemonic as Opcode, operand);
      } else {
        if (parts[1] !== undefined) {
          errors.push({ line: row.lineNo, message: `${mnemonic} takes no operand` });
        }
        byte = encode(mnemonic as Opcode);
      }
    } else if (isNumber(head)) {
      kind = "data";
      const val = parseNumber(head);
      if (val < 0 || val > BYTE_MASK) {
        errors.push({ line: row.lineNo, message: `data byte ${val} out of range 0–255` });
      }
      byte = val & BYTE_MASK;
    } else {
      errors.push({ line: row.lineNo, message: `unknown instruction "${head}"` });
    }

    bytes[addr] = byte;
    listing.push({ addr, byte, source: row.source, label: row.label, kind });
  });

  return { ok: errors.length === 0, bytes, symbols, listing, errors };
}

// ---- the machine: state + micro-stepped fetch/decode/execute ----------------

export type BusName = "addr" | "data" | "alu" | "ctrl" | "none";
export type Phase = "fetch" | "decode" | "execute";

/** One T-state: a single register transfer, which is what the datapath draws.
    `active` is a list of datapath element ids that light up this step. */
export type MicroStep = {
  phase: Phase;
  label: string; // e.g. "PC → MAR"
  note: string; // plain-language explanation
  active: string[]; // datapath ids: pc, mar, ir, a, b, alu, ram, out, ctrl, flags, bus-addr, bus-data
  bus: BusName;
  apply: (s: CpuState) => CpuState; // performs the transfer, returns new state
};

export type CpuState = {
  ram: number[]; // RAM_BYTES bytes
  a: number;
  b: number;
  pc: number; // 0–15
  ir: number; // last fetched instruction byte
  mar: number; // memory address register
  flags: Flags;
  out: number[]; // OUT log
  halted: boolean;
  retired: number; // instructions completed (for run caps / display)
  plan: MicroStep[]; // micro-steps of the instruction currently in flight
  pi: number; // index of the next micro-step to run within `plan`
  last?: MicroStep; // the micro-step just executed (for the status line)
};

const ZERO_FLAGS: Flags = { z: false, n: false, c: false, v: false };

export function initCpu(bytes: number[]): CpuState {
  const ram = new Array<number>(RAM_BYTES).fill(0);
  for (let i = 0; i < RAM_BYTES; i++) ram[i] = (bytes[i] ?? 0) & BYTE_MASK;
  return {
    ram,
    a: 0,
    b: 0,
    pc: 0,
    ir: 0,
    mar: 0,
    flags: { ...ZERO_FLAGS },
    out: [],
    halted: false,
    retired: 0,
    plan: [],
    pi: 0,
  };
}

// --- the fixed fetch + decode micro-steps (identical for every instruction) ---
function fetchAndDecode(op: Opcode, operand: number): MicroStep[] {
  return [
    {
      phase: "fetch",
      label: "PC → MAR",
      note: "The Program Counter holds the address of the next instruction. It drives that address onto the address bus into the Memory Address Register.",
      active: ["pc", "bus-addr", "mar"],
      bus: "addr",
      apply: (s) => ({ ...s, mar: s.pc & ADDR_MASK }),
    },
    {
      phase: "fetch",
      label: "RAM[MAR] → IR · PC++",
      note: "Fetch: the byte at that address is read over the data bus into the Instruction Register — and the PC increments so it already points at the next instruction.",
      active: ["ram", "bus-data", "ir", "pc"],
      bus: "data",
      apply: (s) => ({ ...s, ir: s.ram[s.mar & ADDR_MASK] & BYTE_MASK, pc: (s.pc + 1) & ADDR_MASK }),
    },
    {
      phase: "decode",
      label: "decode",
      note: `The control unit reads the IR's top nibble → ${op} (${OPS[op].summary}). ${OPS[op].operand ? `Low nibble = operand ${operand}.` : "No operand."} This wires up the right control lines for the execute steps.`,
      active: ["ir", "ctrl"],
      bus: "ctrl",
      apply: (s) => s,
    },
  ];
}

// --- the per-opcode execute micro-steps ---
function executeSteps(op: Opcode, operand: number): MicroStep[] {
  const spec = OPS[op];

  const operandToMar: MicroStep = {
    phase: "execute",
    label: "IR.addr → MAR",
    note: `The operand nibble (${operand}) is the address of the data. It goes onto the address bus to select RAM cell ${operand}.`,
    active: ["ir", "bus-addr", "mar"],
    bus: "addr",
    apply: (s) => ({ ...s, mar: operand & ADDR_MASK }),
  };

  if (op === "NOP") {
    return [{ phase: "execute", label: "—", note: "Nothing to do; the cycle passes.", active: ["ctrl"], bus: "none", apply: (s) => s }];
  }
  if (op === "LDA") {
    return [
      operandToMar,
      {
        phase: "execute",
        label: "RAM[MAR] → A",
        note: `Load: RAM cell ${operand} is copied over the data bus into the accumulator A. (Loads don't touch the flags.)`,
        active: ["ram", "bus-data", "a"],
        bus: "data",
        apply: (s) => ({ ...s, a: s.ram[operand & ADDR_MASK] & BYTE_MASK }),
      },
    ];
  }
  if (op === "LDI") {
    return [
      {
        phase: "execute",
        label: "IR.imm → A",
        note: `Load-immediate: the operand nibble (${operand}) is itself the value — straight into A, no RAM access.`,
        active: ["ir", "bus-data", "a"],
        bus: "data",
        apply: (s) => ({ ...s, a: operand & 0x0f }),
      },
    ];
  }
  if (op === "STA") {
    return [
      operandToMar,
      {
        phase: "execute",
        label: "A → RAM[MAR]",
        note: `Store: the accumulator is written back over the data bus into RAM cell ${operand}.`,
        active: ["a", "bus-data", "ram"],
        bus: "data",
        apply: (s) => {
          const ram = s.ram.slice();
          ram[operand & ADDR_MASK] = s.a & BYTE_MASK;
          return { ...s, ram };
        },
      },
    ];
  }
  if (spec.aluOp) {
    const aluOp = spec.aluOp;
    const isCmp = spec.cmp === true;
    return [
      operandToMar,
      {
        phase: "execute",
        label: "RAM[MAR] → B",
        note: `The operand is loaded into B, the ALU's second input — exactly the ch.6 operand register.`,
        active: ["ram", "bus-data", "b"],
        bus: "data",
        apply: (s) => ({ ...s, b: s.ram[operand & ADDR_MASK] & BYTE_MASK }),
      },
      {
        phase: "execute",
        label: isCmp ? "ALU: A − B → flags" : `ALU: A ${aluGlyph(aluOp)} B → A`,
        note: isCmp
          ? "Compare: the ALU subtracts but throws the result away — only the flags update, ready for a following branch."
          : `The ch.5 ALU computes A ${aluGlyph(aluOp)} B; the result lands back in A and the Z/N/C/V flags update.`,
        active: isCmp ? ["a", "b", "alu", "flags"] : ["a", "b", "alu", "flags"],
        bus: "alu",
        apply: (s) => {
          const r = alu(aluOp, s.a, s.b, 8);
          return { ...s, a: r.writes ? r.value & BYTE_MASK : s.a, flags: r.flags };
        },
      },
    ];
  }
  if (op === "JMP") {
    return [
      {
        phase: "execute",
        label: "IR.addr → PC",
        note: `Unconditional jump: the operand (${operand}) is loaded into the PC, so the next fetch comes from there.`,
        active: ["ir", "pc"],
        bus: "ctrl",
        apply: (s) => ({ ...s, pc: operand & ADDR_MASK }),
      },
    ];
  }
  if (spec.branch) {
    const pred = spec.branch;
    const cond = op === "JZ" ? "Z is set" : op === "JNZ" ? "Z is clear" : op === "JC" ? "C is set" : "N is set";
    return [
      {
        phase: "execute",
        label: `if ${op.slice(1)}: IR.addr → PC`,
        note: `Conditional jump: the control unit checks the flags. If ${cond}, PC ← ${operand}; otherwise the PC keeps pointing at the next instruction and execution falls through.`,
        active: ["ir", "pc", "flags"],
        bus: "ctrl",
        apply: (s) => (pred(s.flags) ? { ...s, pc: operand & ADDR_MASK } : s),
      },
    ];
  }
  if (op === "OUT") {
    return [
      {
        phase: "execute",
        label: "A → OUT",
        note: "The accumulator is copied to the output register and appended to the log.",
        active: ["a", "out"],
        bus: "data",
        apply: (s) => ({ ...s, out: [...s.out, s.a & BYTE_MASK] }),
      },
    ];
  }
  // HLT
  return [
    {
      phase: "execute",
      label: "HALT",
      note: "The control unit stops the clock. The machine is done — registers hold their final values.",
      active: ["ctrl"],
      bus: "ctrl",
      apply: (s) => ({ ...s, halted: true }),
    },
  ];
}

function aluGlyph(op: AluOp): string {
  return op === "ADD" ? "+" : op === "SUB" ? "−" : op === "AND" ? "AND" : op === "OR" ? "OR" : op === "XOR" ? "XOR" : "−";
}

/** Peek the instruction at PC and build the full micro-step plan for it. The
    fetch/decode steps are the same for every instruction; execute steps depend
    on the opcode. (Peeking is honest: real control logic sequences off exactly
    the opcode it fetches — we just precompute the sequence so the UI can show
    how many steps are coming.) */
function buildPlan(s: CpuState): MicroStep[] {
  const byte = s.ram[s.pc & ADDR_MASK] & BYTE_MASK;
  const op = opcodeOfByte(byte);
  const operand = operandOfByte(byte);
  return [...fetchAndDecode(op, operand), ...executeSteps(op, operand)];
}

/** Advance exactly one micro-step (one T-state). Builds the next instruction's
    plan when the previous one finishes. Halted machines are a fixed point. */
export function microStep(s: CpuState): CpuState {
  if (s.halted) return s;
  let st = s;
  if (st.pi >= st.plan.length) st = { ...st, plan: buildPlan(st), pi: 0 };
  const step = st.plan[st.pi];
  const applied = step.apply(st);
  const pi = st.pi + 1;
  const finishedInstr = pi >= st.plan.length;
  return { ...applied, pi, last: step, retired: applied.retired + (finishedInstr && !applied.halted ? 1 : 0) };
}

/** Run whole micro-steps until the current instruction retires (or halts). */
export function instructionStep(s: CpuState): CpuState {
  if (s.halted) return s;
  let st = microStep(s);
  while (!st.halted && st.pi < st.plan.length) st = microStep(st);
  return st;
}

/** Run to completion (HLT) or until `maxInstr` instructions retire — the guard
    against infinite loops. Returns the final state. */
export function run(s: CpuState, maxInstr = 500): CpuState {
  let st = s;
  let n = 0;
  while (!st.halted && n < maxInstr) {
    st = instructionStep(st);
    n++;
  }
  return st;
}

/** Convenience for tests/presets: assemble + run, returning the OUT stream. */
export function assembleAndRun(source: string, maxInstr = 500): { out: number[]; state: CpuState; asm: AsmResult } {
  const asm = assemble(source);
  const state = run(initCpu(asm.bytes), maxInstr);
  return { out: state.out, state, asm };
}

// ---- display helpers (shared by sim + tests) --------------------------------

export function flagString(f: Flags): string {
  return (["z", "n", "c", "v"] as const).filter((k) => f[k]).map((k) => k.toUpperCase()).join(" ") || "—";
}

export function signed8(v: number): number {
  return asSigned(v & BYTE_MASK, 8);
}
