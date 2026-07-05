// Engine — the classic 5-stage RISC pipeline (IF/ID/EX/MEM/WB), the
// Patterson & Hennessy teaching model. Pure & erasable-syntax so the qa gate
// and test-fast-cpu.ts can run it in Node. Drives pipeline-visualizer (ch.8).
//
// Model (deliberately the standard one, tested in test-fast-cpu.ts):
//  • In-order, one instruction per stage per cycle.
//  • Register file writes in the first half of a cycle, reads in the second —
//    so an instruction in ID can read a value another instruction writes in WB
//    the same cycle (the "no stall once the producer reaches WB" trick).
//  • Data hazard (RAW): a consumer in ID needs a register an in-flight producer
//    hasn't made available yet.
//      – no forwarding: stall while the producer is in EX or MEM (→ 2 bubbles
//        for back-to-back dependent ALU ops).
//      – forwarding: results are bypassed EX→EX / MEM→EX, so only a *load* whose
//        value is used by the very next instruction stalls (→ exactly 1 bubble:
//        the load-use hazard forwarding cannot remove).
//  • Control hazard: a taken branch is resolved in EX under predict-not-taken,
//    so it costs branchPenalty (default 2) flush bubbles before the target is
//    fetched. Branch prediction (this chapter's branch-predictor figure) is
//    what shrinks that penalty toward zero.

export type Stage = "IF" | "ID" | "EX" | "MEM" | "WB";
export const STAGES: Stage[] = ["IF", "ID", "EX", "MEM", "WB"];

export type Instr = {
  label: string; // e.g. "add r3, r1, r2"
  writes: string | null; // destination register, or null (e.g. a store/branch)
  reads: string[]; // source registers
  isLoad?: boolean; // memory load: value ready only after MEM (load-use hazard)
  isBranch?: boolean;
  taken?: boolean; // branch outcome (only meaningful when isBranch)
};

export type PipeOptions = { forwarding: boolean; branchPenalty?: number };

export type Placement = { instr: number; stage: Stage; cycle: number };
export type Bubble = { cycle: number; stage: Stage; kind: "stall" | "flush" };

export type PipeResult = {
  placements: Placement[]; // every (instruction, stage, cycle) occupancy
  bubbles: Bubble[]; // injected stall/flush slots (for the diagram)
  cycles: number; // total cycles to retire every instruction
  stalls: number; // data-hazard bubble cycles
  flushes: number; // control-hazard (branch) bubble cycles
  cpi: number; // cycles / instructions
  idealCycles: number; // N + 4 (a full pipeline with no hazards)
  perInstrStall: number[]; // stall cycles charged to each instruction
};

const MAX_CYCLES = 500;

function producesFor(instr: Instr | undefined, reads: string[]): boolean {
  return !!instr && instr.writes !== null && reads.includes(instr.writes);
}

export function simulatePipeline(instrs: Instr[], opts: PipeOptions): PipeResult {
  const n = instrs.length;
  const penalty = opts.branchPenalty ?? 2;
  const placements: Placement[] = [];
  const bubbles: Bubble[] = [];
  const perInstrStall = instrs.map(() => 0);

  // pipeline slots hold an instruction index, or -1 for empty/bubble
  const slot: Record<Stage, number> = { IF: -1, ID: -1, EX: -1, MEM: -1, WB: -1 };
  let fetchPtr = 0;
  let flushRemaining = 0; // fetch-suppression cycles owed to a taken branch
  let stalls = 0;
  let flushes = 0;
  let cycles = 0;

  if (n === 0) return { placements, bubbles, cycles: 0, stalls: 0, flushes: 0, cpi: 0, idealCycles: 0, perInstrStall };

  for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
    // 1. hazard detection for the instruction currently in ID (pre-advance)
    let stall = false;
    const idI = slot.ID;
    if (idI >= 0) {
      const reads = instrs[idI].reads;
      if (opts.forwarding) {
        // only a load still in EX (value not ready until end of MEM) stalls
        if (slot.EX >= 0 && instrs[slot.EX].isLoad && producesFor(instrs[slot.EX], reads)) stall = true;
      } else {
        // any producer not yet written back (in EX or MEM) stalls
        if (producesFor(instrs[slot.EX], reads) || producesFor(instrs[slot.MEM], reads)) stall = true;
      }
    }

    // 2. advance the pipeline, back to front
    slot.WB = slot.MEM;
    slot.MEM = slot.EX;
    if (stall) {
      bubbles.push({ cycle, stage: "EX", kind: "stall" });
      slot.EX = -1; // bubble injected; ID and IF hold their instructions
      stalls++;
      perInstrStall[idI]++;
    } else {
      slot.EX = slot.ID;
      slot.ID = slot.IF;
      if (flushRemaining > 0 && fetchPtr < n) {
        bubbles.push({ cycle, stage: "IF", kind: "flush" });
        slot.IF = -1;
        flushRemaining--;
        flushes++;
      } else if (fetchPtr < n) {
        slot.IF = fetchPtr;
        if (instrs[fetchPtr].isBranch && instrs[fetchPtr].taken) flushRemaining += penalty;
        fetchPtr++;
      } else {
        slot.IF = -1;
      }
    }

    // 3. record occupancy for this cycle
    for (const st of STAGES) if (slot[st] >= 0) placements.push({ instr: slot[st], stage: st, cycle });

    // 4. done when the last instruction retires (in-order ⇒ it retires last)
    if (slot.WB === n - 1) {
      cycles = cycle + 1;
      break;
    }
  }

  return {
    placements,
    bubbles,
    cycles,
    stalls,
    flushes,
    cpi: cycles / n,
    idealCycles: n + STAGES.length - 1,
    perInstrStall,
  };
}

// ---- Presets (single source of truth for the sim; locked by tests) ----
export type PipelinePreset = { id: string; name: string; blurb: string; program: Instr[] };

const alu = (label: string, writes: string, reads: string[]): Instr => ({ label, writes, reads });
const load = (label: string, writes: string, reads: string[]): Instr => ({ label, writes, reads, isLoad: true });

export const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: "independent",
    name: "Independent (ideal)",
    blurb: "No instruction needs an earlier result — the pipeline stays full. CPI heads toward 1 as the stream grows; forwarding changes nothing.",
    program: [
      alu("add r1, r8, r9", "r1", ["r8", "r9"]),
      alu("sub r2, r10, r11", "r2", ["r10", "r11"]),
      alu("and r3, r12, r13", "r3", ["r12", "r13"]),
      alu("or  r4, r14, r15", "r4", ["r14", "r15"]),
      alu("xor r5, r6, r7", "r5", ["r6", "r7"]),
    ],
  },
  {
    id: "raw-chain",
    name: "Dependency chain (RAW)",
    blurb: "Each op uses the previous op's result. Without forwarding every pair stalls 2 cycles; turn forwarding on and the bubbles vanish.",
    program: [
      alu("add r1, r8, r9", "r1", ["r8", "r9"]),
      alu("sub r2, r1, r10", "r2", ["r1", "r10"]),
      alu("and r3, r2, r11", "r3", ["r2", "r11"]),
      alu("or  r4, r3, r12", "r4", ["r3", "r12"]),
    ],
  },
  {
    id: "load-use",
    name: "Load-use hazard",
    blurb: "A value is loaded from memory, then used immediately. This is the one hazard forwarding cannot erase — it always costs exactly one bubble.",
    program: [
      load("lw  r1, 0(r8)", "r1", ["r8"]),
      alu("add r2, r1, r1", "r2", ["r1"]),
      alu("sub r3, r2, r9", "r3", ["r2", "r9"]),
      alu("or  r4, r10, r11", "r4", ["r10", "r11"]),
    ],
  },
  {
    id: "branch",
    name: "Taken branch (flush)",
    blurb: "A taken branch is only resolved in EX, so the two instructions fetched behind it are wrong-path and get flushed — pure control-hazard penalty.",
    program: [
      alu("add r1, r8, r9", "r1", ["r8", "r9"]),
      { label: "beq r5, r6, target", writes: null, reads: ["r5", "r6"], isBranch: true, taken: true },
      alu("sub r2, r10, r11", "r2", ["r10", "r11"]),
      alu("and r3, r12, r13", "r3", ["r12", "r13"]),
    ],
  },
];

export function pipelinePresetById(id: string): PipelinePreset | undefined {
  return PIPELINE_PRESETS.find((p) => p.id === id);
}
