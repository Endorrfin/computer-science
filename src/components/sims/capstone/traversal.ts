// Pure engine — the "grand traversal" for ch.35 (Capstone). One keystroke is
// traced as it falls through every layer this guide built — from the bit it
// becomes, down to the gates and the CPU, out across the network, into storage
// and a model, and finally back up to a lit pixel. Each stage names the part it
// belongs to, the chapter that taught it, and the hero sim you can re-open.
// This is DATA with an integrity contract (checked in scripts/test-ch35.ts:
// every partId/chapterId/hostSim resolves, all ten content parts are covered,
// and the indices are contiguous). Erasable-syntax only.

export type Stage = {
  index: number;
  key: string;
  /** Short headline for this stop, e.g. "Keypress → bits". */
  title: string;
  /** The layer/lens name shown as a kicker. */
  layer: string;
  partId: string;
  chapterId: string;
  /** Registry key of the hero sim this stage deep-links to (chapter-level). */
  hostSim: string;
  /** What physically happens at this layer (1–2 sentences). */
  what: string;
  /** The "you built this" tie-back to the chapter's interactive. */
  builtIn: string;
};

// The journey follows CAUSALITY, not part numbers: a keypress hits silicon and
// the CPU first, the OS schedules it, your code runs, it crosses the network
// (secured, then stored), a model reacts, and the GPU paints the answer.
export const STAGES: Stage[] = [
  {
    index: 0,
    key: "keypress",
    title: "A key becomes bits",
    layer: "Information",
    partId: "p1",
    chapterId: "ch1",
    hostSim: "bit-inspector",
    what: "You press ‘A’. The keyboard matrix turns one closed switch into a scancode, which software maps to the Unicode code point 65 — the letter is now a pattern of bits, nothing more.",
    builtIn: "You flipped these bits by hand in ch.1 — bit-inspector.",
  },
  {
    index: 1,
    key: "gates",
    title: "Bits ride on gates",
    layer: "The Machine",
    partId: "p2",
    chapterId: "ch4",
    hostSim: "logic-sandbox",
    what: "Those bits are voltages. Transistors switch, logic gates settle, and a stable 1s-and-0s pattern appears on the wires — Boolean algebra made physical.",
    builtIn: "You wired gates from transistors in ch.4 — logic-sandbox.",
  },
  {
    index: 2,
    key: "cpu",
    title: "The CPU handles the interrupt",
    layer: "The Machine",
    partId: "p2",
    chapterId: "ch7",
    hostSim: "cpu-8bit",
    what: "The keypress raises an interrupt. The CPU fetches, decodes, and executes the handler instruction by instruction, shuffling the byte through its registers and ALU.",
    builtIn: "You programmed this fetch–decode–execute loop in ch.7 — cpu-8bit.",
  },
  {
    index: 3,
    key: "os",
    title: "The kernel schedules it",
    layer: "Operating Systems",
    partId: "p6",
    chapterId: "ch22",
    hostSim: "scheduler-sim",
    what: "The OS fields the interrupt, wakes your program, and hands it CPU time; virtual memory turns the process’s addresses into real ones. The great illusion of one machine per program holds.",
    builtIn: "You ran the scheduler and watched the Gantt in ch.22 — scheduler-sim.",
  },
  {
    index: 4,
    key: "code",
    title: "Your program runs",
    layer: "Code",
    partId: "p3",
    chapterId: "ch11",
    hostSim: "compiler-pipeline",
    what: "The event handler executes — a function, compiled from a high-level language down to the bytecode the machine actually runs, a fresh frame pushed on the call stack.",
    builtIn: "You watched source become tokens, AST, and bytecode in ch.11 — compiler-pipeline.",
  },
  {
    index: 5,
    key: "data-structures",
    title: "Into a buffer",
    layer: "Algorithms & Data Structures",
    partId: "p4",
    chapterId: "ch14",
    hostSim: "stack-queue-stepper",
    what: "The character lands in the editor’s text buffer and the event queue — the linear structures that make insert, undo, and replay fast.",
    builtIn: "You pushed and popped these in ch.14 — stack-queue-stepper.",
  },
  {
    index: 6,
    key: "parse",
    title: "Recognized by a machine",
    layer: "Theory",
    partId: "p5",
    chapterId: "ch19",
    hostSim: "fsm-builder",
    what: "As you type, a finite-state machine validates and tokenizes the input — the same automata that underlie every regex, parser, and protocol on the stack.",
    builtIn: "You built a DFA that accepts a language in ch.19 — fsm-builder.",
  },
  {
    index: 7,
    key: "network",
    title: "Across the network",
    layer: "Networks",
    partId: "p7",
    chapterId: "ch26",
    hostSim: "packet-journey",
    what: "The keystroke is bound for a server. It’s framed into packets, addressed, and routed hop by hop across the planet, TTL ticking down at every router.",
    builtIn: "You followed a packet hop-by-hop in ch.26 — packet-journey.",
  },
  {
    index: 8,
    key: "security",
    title: "Sealed on the wire",
    layer: "Security",
    partId: "p9",
    chapterId: "ch31",
    hostSim: "dh-color-lab",
    what: "Before it leaves, a key exchange and TLS encrypt it and a signature proves who sent it — so an adversary reading the wire sees only ciphertext.",
    builtIn: "You performed a key exchange yourself in ch.31 — dh-color-lab.",
  },
  {
    index: 9,
    key: "data",
    title: "Remembered at scale",
    layer: "Data",
    partId: "p8",
    chapterId: "ch29",
    hostSim: "btree-lab",
    what: "The server persists your message: a B-tree index finds its place in O(log n), a transaction makes the write durable, and replicas copy it for safety.",
    builtIn: "You split B-tree nodes and hit the query budget in ch.29 — btree-lab.",
  },
  {
    index: 10,
    key: "intelligence",
    title: "A model reacts",
    layer: "Intelligence",
    partId: "p10",
    chapterId: "ch33",
    hostSim: "neural-playground",
    what: "An autocomplete or language model reads your text as tokens, attends across them, and predicts what comes next — a trained network doing a forward pass.",
    builtIn: "You trained a network to a decision boundary in ch.33 — neural-playground.",
  },
  {
    index: 11,
    key: "pixel",
    title: "Back up to a pixel",
    layer: "GPUs & parallel hardware",
    partId: "p2",
    chapterId: "ch9",
    hostSim: "rasterizer-toy",
    what: "The response returns and the GPU rasterizes it — triangles become fragments become lit pixels. A photon leaves the screen and reaches your eye. The loop closes.",
    builtIn: "You turned triangles into pixels in ch.9 — rasterizer-toy.",
  },
];

export function stageAt(i: number): Stage | undefined {
  return STAGES[i];
}

/** The distinct content parts (p1…p10) this traversal visits, in first-touch
    order — used by the sim to light the stack map and by the test to prove the
    whole climb is covered. */
export function partsCovered(): string[] {
  const seen: string[] = [];
  for (const s of STAGES) if (!seen.includes(s.partId)) seen.push(s.partId);
  return seen;
}
