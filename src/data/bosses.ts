// Boss challenges (§6) — each part's applied capstone, hosted inside a hero
// sim. Metadata ships from S1 so the map and boss gallery can show the road;
// each boss goes live with its host chapter's session.
import type { BossDef } from "../lib/types.ts";

export const BOSSES: BossDef[] = [
  { id: "boss-p1", part: "p1", title: "Decode the mystery file", badge: "Bitreader", icon: "🔍", hostChapterId: "ch3", hostSim: "huffman-lab", blurb: "Raw bytes land on your desk: spot the encoding, undo the compression, read the message.", plannedSession: 2 },
  { id: "boss-p2", part: "p2", title: "Program Fibonacci on the 8-bit CPU", badge: "Machine Whisperer", icon: "⚙️", hostChapterId: "ch7", hostSim: "cpu-8bit", blurb: "Assembly, registers, a loop and a jump — make real iron (well, honest emulated iron) compute Fibonacci.", plannedSession: 4 },
  { id: "boss-p3", part: "p3", title: "Make the pipeline run your program", badge: "Language Smith", icon: "🔨", hostChapterId: "ch11", hostSim: "compiler-pipeline", blurb: "Write a program with variables and a loop that compiles through the mini-pipeline to a target value.", plannedSession: 6 },
  { id: "boss-p4", part: "p4", title: "Beat the blind race", badge: "Pathmaster", icon: "🧭", hostChapterId: "ch17", hostSim: "pathfinder", blurb: "One revealed maze, one visited-node budget: choose the right algorithm and heuristic to make it.", plannedSession: 9 },
  { id: "boss-p5", part: "p5", title: "Build a TM that accepts aⁿbⁿ", badge: "Halting Oracle", icon: "♾️", hostChapterId: "ch20", hostSim: "turing-machine", blurb: "Rule table from scratch; the full test suite must pass. Regular languages need not apply.", plannedSession: 10 },
  { id: "boss-p6", part: "p6", title: "Unfreeze the philosophers", badge: "Deadlock Breaker", icon: "🔓", hostChapterId: "ch25", hostSim: "deadlock-lab", blurb: "Five thinkers, five forks, total gridlock. Pick the right fix — and explain why it works.", plannedSession: 12 },
  { id: "boss-p7", part: "p7", title: "Debug the broken handshake", badge: "Wire Shark", icon: "🦈", hostChapterId: "ch27", hostSim: "tcp-lab", blurb: "Three faulty packet traces, three different failures. Diagnose each like it's production.", plannedSession: 13 },
  { id: "boss-p8", part: "p8", title: "Hit the query budget", badge: "Query Planner", icon: "📇", hostChapterId: "ch29", hostSim: "btree-lab", blurb: "Three workloads, one page-read budget: choose the indexes that make every query fit.", plannedSession: 14 },
  { id: "boss-p9", part: "p9", title: "Break Vigenère, then run DH by hand", badge: "Codebreaker", icon: "🗝️", hostChapterId: "ch31", hostSim: "dh-color-lab", blurb: "Crack a classical cipher with frequency analysis — then perform a real key exchange yourself.", plannedSession: 15 },
  { id: "boss-p10", part: "p10", title: "Train to 95% on the spiral", badge: "Model Tamer", icon: "🧠", hostChapterId: "ch33", hostSim: "neural-playground", blurb: "The spiral dataset, a budget of ≤3 layers, an accuracy bar of 95%. Architecture is your move.", plannedSession: 16 },
];

export function bossById(id: string): BossDef | undefined {
  return BOSSES.find((b) => b.id === id);
}
