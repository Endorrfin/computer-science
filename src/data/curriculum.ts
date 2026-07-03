// ============================================================
// SINGLE SOURCE OF TRUTH for parts + chapters (CLAUDE.md §3–§5).
// Chapters are rendered from this data — never hand-written pages.
// Erasable-syntax only: the Node qa gate imports this file directly.
// ============================================================
import type { Chapter, Part } from "../lib/types.ts";

export const PARTS: Part[] = [
  { id: "p0", order: 0, name: "Orientation", accent: "#94A3B8", tagline: "The map and the toolkit", blurb: "What computer science actually is, how this guide works, and an optional math on-ramp for the climb." },
  { id: "p1", order: 1, name: "Information", accent: "#FACC15", tagline: "Everything is bits", blurb: "Numbers, text, pixels and sound as 0s and 1s — and why compression is possible at all.", bossId: "boss-p1" },
  { id: "p2", order: 2, name: "The Machine", accent: "#FB923C", tagline: "From electrons to a computer", blurb: "Transistors become gates, gates become circuits that count and remember, and suddenly — a CPU runs your program.", bossId: "boss-p2" },
  { id: "p3", order: 3, name: "Code", accent: "#A3E635", tagline: "How humans talk to machines", blurb: "From machine code up the abstraction elevator: languages, compilers, and how million-line systems stay sane.", bossId: "boss-p3" },
  { id: "p4", order: 4, name: "Algorithms & Data Structures", accent: "#34D399", tagline: "The art of fast", blurb: "Big-O thinking, the classic structures, sorting, graphs, and the design paradigms behind every clever solution.", bossId: "boss-p4" },
  { id: "p5", order: 5, name: "Theory", accent: "#2DD4BF", tagline: "The limits of computation", blurb: "Automata, Turing machines, the halting problem, and P vs NP — what computers provably can and cannot do.", bossId: "boss-p5" },
  { id: "p6", order: 6, name: "Operating Systems", accent: "#22D3EE", tagline: "The great illusionist", blurb: "How one machine pretends to be many: processes, virtual memory, files, and the dark art of concurrency.", bossId: "boss-p6" },
  { id: "p7", order: 7, name: "Networks", accent: "#38BDF8", tagline: "Computers, together", blurb: "Follow a packet across the planet: layers, routing, TCP's promises, and what really happens when you open a URL.", bossId: "boss-p7" },
  { id: "p8", order: 8, name: "Data", accent: "#60A5FA", tagline: "Remembering at scale", blurb: "Databases, indexes and transactions — then many machines: replication, partitions, and the CAP trade-off.", bossId: "boss-p8" },
  { id: "p9", order: 9, name: "Security", accent: "#818CF8", tagline: "The adversarial mindset", blurb: "Cryptography from Caesar to TLS, the classic attack classes, and defense in depth.", bossId: "boss-p9" },
  { id: "p10", order: 10, name: "Intelligence", accent: "#A78BFA", tagline: "Machines that learn", blurb: "From gradient descent to transformers: how modern AI works, what it can do, and where its limits are.", bossId: "boss-p10" },
  { id: "p11", order: 11, name: "Capstone", accent: "#94A3B8", tagline: "The whole picture", blurb: "One grand traversal of the entire stack — keypress to pixel — and where to go next." },
];

/** Compact stub factory — chapters get real content in their session (§12). */
function stub(
  id: string,
  part: string,
  order: number,
  title: string,
  tagline: string,
  plannedSession: number,
  readMins: { foundations: number; senior: number } = { foundations: 15, senior: 25 },
): Chapter {
  return {
    id, part, order, title, tagline, readMins, plannedSession,
    assumes: [], mentalModel: "", sections: [], keyPoints: [], pitfalls: [],
    interviewIds: [], kataIds: [], seeAlso: [], sources: [],
  };
}

// ---------------------------------------------------------------
// ch.4 — From electricity to gates  (GOLDEN CHAPTER, built in S1)
// ---------------------------------------------------------------
const ch4: Chapter = {
  id: "ch4",
  part: "p2",
  order: 6,
  title: "From electricity to gates",
  tagline: "One physical trick — a switch controlling a switch — becomes all of logic",
  readMins: { foundations: 18, senior: 30 },
  storyHook: {
    md:
      "1937. A 21-year-old MIT student, Claude Shannon, spends his days wiring relay circuits for an analog computer — and notices something nobody had seen in 83 years: the algebra of *true* and *false* that George Boole published in 1854, and that mathematicians had filed away as a curiosity, describes switching circuits **exactly**. Switches in series behave like AND. Switches in parallel behave like OR. His master's thesis turned circuit design from craft folklore into mathematics — it has been called \"possibly the most important master's thesis of the century.\" This chapter is that thesis, made touchable.",
  },
  assumes: [
    {
      chapterId: "ch1",
      oneLiner: "Information can be written as bits — 0s and 1s. Here a bit becomes physical: low voltage ≈ 0, high voltage ≈ 1.",
    },
  ],
  mentalModel:
    "A computer is a mountain of one repeated trick: a voltage that opens or closes a path for another voltage. Series paths = AND, parallel paths = OR, a flipping stage = NOT. Everything above — adders, memory, CPUs — is arrangement, not new physics.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Electrons drift through silicon → **you are here: logic gates** → circuits that count (ch.5) → circuits that remember (ch.6) → a CPU (ch.7).\n" +
        "This chapter crosses the strangest border in the whole journey: from *physics* to *logic*. On one side, continuous messy voltages; on the other, crisp 0s and 1s that never blur. The crossing is a single device — a **switch that is controlled by a signal instead of a finger**. A relay does it with an electromagnet, a vacuum tube with a heated filament, a transistor with an electric field. Same idea, a billion times smaller.\n" +
        "One convention before we start: in each circuit, a wire near supply voltage reads as **1**, a wire near zero volts reads as **0**. Why digital survives the messy world: a degraded 0.8·V still counts as 1, and every gate *re-emits* a clean signal — noise gets erased at each step instead of accumulating. That single property is why we can stack millions of these things.",
    },
    { kind: "figure", fig: "transistor-switch", caption: "A MOSFET transistor, stepped: gate voltage builds a field → a channel forms → current flows. No moving parts — just a switch you flip with a voltage." },
    {
      kind: "prose",
      md:
        "## The transistor: a switch you flip with a voltage\n" +
        "A MOSFET has three terminals: current wants to flow from **source** to **drain**, and the **gate** in the middle decides whether it may. Put a voltage on the gate → an electric field pulls charge carriers into a thin channel → the path conducts. Remove it → the channel evaporates. That's the entire trick.\n" +
        "Because nothing mechanical moves, a transistor switches billions of times per second and can be shrunk to a few dozen atoms across. The M1 Max in a 2021 MacBook Pro carries **57 billion** of them; every one is just this figure, repeated.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "CMOS: why chips don't melt (mostly)",
      lens: "senior",
      md:
        "Real gates are built from **complementary pairs**: an nMOS network pulls the output to 0, a mirrored pMOS network pulls it to 1, and by construction exactly one network conducts at rest. Current only really flows *during the flip* — so power scales with switching activity and clock frequency, not with the transistor count sitting idle. That's the deal that made billion-transistor chips thermally possible, and its slow breakdown (leakage, the end of Dennard scaling) is why clock speeds stalled near ~5 GHz while core counts exploded — the full story waits in ch.8.",
    },
    {
      kind: "prose",
      md:
        "## From switches to logic\n" +
        "Now compose the trick. Two switches **in series**: current passes only if the first *and* the second are closed. Two **in parallel**: it passes if *either* is closed. Add a stage that inverts — output high exactly when input is low — and you have three primitive operations: **AND, OR, NOT**.\n" +
        "This is Boole's algebra: values are only 0 and 1, and those three operators replace +, ×. A **logic gate** is a handful of transistors implementing one such operator on voltages. From here on we draw gates as symbols and forget the silicon — that's abstraction, the move this guide makes at every layer.\n" +
        "Meet the whole zoo in the sandbox below. Suggested experiments, in order: ① wire a switch through NOT to a lamp, then a NOT after that NOT; ② build AND and OR and read their truth tables; ③ find every input combination that lights XOR; ④ open the **challenges** and prove something real.",
    },
    { kind: "sim", sim: "logic-sandbox" },
    {
      kind: "table",
      caption: "The gate zoo. Truth columns list output for inputs AB = 11 · 10 · 01 · 00.",
      head: ["Gate", "Reads as", "Output is 1 when…", "11", "10", "01", "00"],
      rows: [
        ["AND", "both", "every input is 1", "1", "0", "0", "0"],
        ["OR", "at least one", "any input is 1", "1", "1", "1", "0"],
        ["NOT", "opposite", "its single input is 0", "—", "0 → 1", "1 → 0", "—"],
        ["XOR", "different", "inputs disagree", "0", "1", "1", "0"],
        ["NAND", "not both", "anything except 1,1", "0", "1", "1", "1"],
        ["NOR", "neither", "every input is 0", "0", "0", "0", "1"],
      ],
    },
    { kind: "quiz", quiz: "gate-predict" },
    {
      kind: "prose",
      md:
        "## One gate to rule them all\n" +
        "Any truth table — any column of desired 0s and 1s — can be built from AND, OR, NOT: for each row that should output 1, AND together the exact input pattern, then OR all those detectors. Wasteful, but it proves a theorem: *three little gates suffice for every possible logic function.*\n" +
        "Manufacturing pushes the idea further. A factory would rather print one perfect cell a billion times than six different ones — and it turns out a single gate type suffices: **NAND alone can build NOT, AND, OR, XOR and therefore everything**. Don't take the claim on faith: open **challenge ③ in the sandbox** and build XOR from four NANDs with your own hands.",
    },
    {
      kind: "code",
      lang: "ts",
      note: "Gates are just tiny functions — and circuits are function composition. This is the exact wiring of sandbox challenge ③.",
      code:
        "const nand = (a: number, b: number) => 1 - (a & b);\n" +
        "\n" +
        "// XOR from NAND only — the classic 4-gate construction:\n" +
        "const xor = (a: number, b: number) => {\n" +
        "  const m = nand(a, b);            // \"not both\"\n" +
        "  return nand(nand(a, m), nand(b, m));\n" +
        "};\n" +
        "\n" +
        "// [0,1].flatMap(a => [0,1].map(b => xor(a,b)))  →  [0, 1, 1, 0]",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Universality in the wild",
      lens: "senior",
      md:
        "The Apollo Guidance Computer that took humans to the Moon was built almost entirely from **one repeated integrated circuit: a dual 3-input NOR gate** — thousands of identical chips, because NOR (like NAND) is universal and one part number meant one thing to qualify for spaceflight. Modern chip design keeps the same instinct: synthesizers map your logic onto a **standard-cell library** dominated by NAND/NOR/inverter variants. In CMOS the NAND is the natural favorite — its series stack uses the faster carriers (electrons, in nMOS), so a NAND is quicker than the equivalent NOR. Universality also explains *why hardware and software are interchangeable*: any function computable by circuits can be expressed in NANDs — silicon or `if`-statements, same math.",
    },
    {
      kind: "prose",
      md:
        "## De Morgan: pushing NOT through the parentheses\n" +
        "Two rewrite rules you will use for the rest of your career, in circuits and in code reviews alike: `!(A && B) === !A || !B` and `!(A || B) === !A && !B`. A NOT pushed through a bracket **flips the operator** and lands on each input. Hardware engineers call it *bubble pushing* — slide the inversion bubbles around until the circuit uses the gates you actually have. It's also how you turn \"not (admin and active)\" into something a human can read.",
    },
    { kind: "sim", sim: "demorgan-flip" },
    {
      kind: "formal",
      title: "Formal corner — the laws of Boolean algebra",
      md:
        "With ∧ = AND, ∨ = OR, ¬ = NOT, over values {0, 1}:\n" +
        "- **Identity / annihilator** — A∧1 = A, A∨0 = A; A∧0 = 0, A∨1 = 1\n" +
        "- **Idempotence** — A∧A = A, A∨A = A\n" +
        "- **Complement** — A∧¬A = 0, A∨¬A = 1; ¬¬A = A\n" +
        "- **Commutativity / associativity** — both ops, like + and ×\n" +
        "- **Distributivity, both ways** — A∧(B∨C) = (A∧B)∨(A∧C) *and* A∨(B∧C) = (A∨B)∧(A∨C) — the second has no arithmetic analogue\n" +
        "- **Absorption** — A∨(A∧B) = A, A∧(A∨B) = A\n" +
        "- **De Morgan** — ¬(A∧B) = ¬A∨¬B, ¬(A∨B) = ¬A∧¬B\n" +
        "**Duality**: swap ∧↔∨ and 0↔1 in any theorem and you get another theorem. XOR in this notation: A⊕B = (A∧¬B)∨(¬A∧B).",
    },
    {
      kind: "compare",
      a: "NAND",
      b: "NOR",
      rows: [
        ["Universal (builds everything)?", "Yes", "Yes"],
        ["Transistors for 2 inputs (CMOS)", "4", "4"],
        ["Relative speed in CMOS", "Faster — series stack uses quick electrons (nMOS)", "Slower — series stack uses slower holes (pMOS)"],
        ["Where you meet it", "Standard-cell workhorse; NAND flash storage", "Famously the only gate type in the Apollo Guidance Computer"],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where the ideal model leaks",
      md:
        "Three lies this chapter told, on purpose. **Gates are not instant** — a signal needs real time (picoseconds) to cross each one; the sandbox's *step mode* is honest about this, advancing one gate-delay per tick, and that delay is exactly what will cap CPU clock speed in ch.8. **Outputs briefly glitch** — while new values ripple through paths of different lengths, an output can flicker before settling; watch it happen on longer chains in step mode. **Disconnected inputs are not 0** — the sandbox charitably reads a floating wire as 0, but a real CMOS input left floating picks up noise and reads garbage; hardware people tie every unused input high or low, always.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You now hold the complete parts kit of digital logic — the same six symbols an Intel engineer holds. Next, ch.5 wires gates into circuits that **count** (an adder is closer than you think), and ch.6 pulls the strangest trick in the book: it wires a gate's output back to its own input and gets **memory**. Want a preview of that strangeness? In the sandbox, wire a NOT gate's output back toward its input and watch the truth table surrender — the `~` it shows you (oscillation) is a bell that rings again in ch.6.",
    },
  ],
  keyPoints: [
    "A transistor is — a voltage-controlled switch: gate voltage builds a channel, current flows source→drain. No moving parts.",
    "A logic gate is — a few transistors implementing one Boolean operation on voltage levels standing for 0 and 1.",
    "AND / OR from plain switches — series switches = AND, parallel switches = OR; an inverting stage gives NOT.",
    "Digital beats noise because — every gate re-emits a clean 0 or 1, so distortion is erased at each stage instead of accumulating.",
    "XOR lights when — its inputs differ; natural-language \"or\" (\"soup or salad\") is usually XOR, not OR.",
    "NAND is universal — NOT, AND, OR, XOR and every other function can be built from NAND alone (NOR too).",
    "De Morgan's laws — ¬(A∧B) = ¬A∨¬B and ¬(A∨B) = ¬A∧¬B: push the NOT through, flip the operator, invert the inputs.",
    "CMOS burns power mainly — while switching, so heat tracks clock frequency; that's what stalled the GHz race (ch.8).",
    "A feedback loop in logic — breaks the truth table (oscillation) and is the seed of memory (ch.6).",
    "Shannon 1937 — mapped Boole's 1854 algebra onto switching circuits; circuit design became mathematics.",
  ],
  pitfalls: [
    {
      title: "XOR is not OR",
      body: "OR includes the both-true case; XOR excludes it. When a requirement says \"either A or B\", ask which one is meant — half of everyday \"or\"s are exclusive.",
      lens: "both",
    },
    {
      title: "Treating gates as instant",
      body: "Signals take real time per gate. Different path lengths mean outputs can glitch before settling — invisible in ideal diagrams, visible in the sandbox's step mode, and the root of timing bugs and max-clock limits.",
      lens: "both",
    },
    {
      title: "De Morgan half-applied",
      body: "Flipping && to || without inverting the operands (or vice versa) is a classic code-review bug: !(a && b) is NOT !a && !b. Push the NOT through both moves at once.",
      lens: "both",
    },
    {
      title: "Floating inputs read as 0",
      body: "Only in simulators. A real CMOS input left unconnected floats to an undefined, noise-driven level. Tie unused inputs to a rail — every hardware checklist says so.",
      lens: "senior",
    },
    {
      title: "\"More gate types = richer design\"",
      body: "Backwards in practice: fabs and synthesis tools want regularity. Real chips are overwhelmingly NAND/NOR/inverter standard cells stamped out by the million — universality makes one cell enough.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch4-1", "iv-ch4-2", "iv-ch4-3", "iv-ch4-4", "iv-ch4-5", "iv-ch4-6"],
  kataIds: [],
  seeAlso: ["ch5", "ch6", "ch11"],
  sources: [
    { title: "C. E. Shannon — A Symbolic Analysis of Relay and Switching Circuits (MIT, 1937)", url: "https://dspace.mit.edu/handle/1721.1/11173" },
    { title: "Crash Course Computer Science #3 — Boolean Logic & Logic Gates", url: "https://www.youtube.com/watch?v=gI-qXk7XojA" },
    { title: "Nand2Tetris — Project 1: Boolean Logic (everything from NAND)", url: "https://www.nand2tetris.org/project01" },
    { title: "Ben Eater — Making logic gates from transistors", url: "https://www.youtube.com/watch?v=sTu3LwpF6XI" },
    { title: "Wikipedia — Apollo Guidance Computer (NOR-only logic)", url: "https://en.wikipedia.org/wiki/Apollo_Guidance_Computer" },
    { title: "Charles Petzold — Code: The Hidden Language of Computer Hardware and Software (ch. 8–11)", url: "https://www.charlespetzold.com/code/" },
  ],
};

export const CHAPTERS: Chapter[] = [
  // P0 · Orientation
  stub("ch0a", "p0", 1, "The Map", "What CS is, and how to travel this guide", 17, { foundations: 10, senior: 12 }),
  stub("ch0b", "p0", 2, "Math toolkit", "Logic, sets, counting, probability — the on-ramp", 17, { foundations: 25, senior: 35 }),
  // P1 · Information
  stub("ch1", "p1", 3, "Bits & numbers", "Binary, two's complement, overflow, IEEE-754", 2, { foundations: 20, senior: 32 }),
  stub("ch2", "p1", 4, "Encoding the world", "Text, color, sound — everything into bits", 2, { foundations: 18, senior: 28 }),
  stub("ch3", "p1", 5, "Compression & entropy", "Information theory, Huffman, LZ, lossy intuition", 2, { foundations: 20, senior: 32 }),
  // P2 · The Machine
  ch4,
  stub("ch5", "p2", 7, "Circuits that count", "Adders, the ALU, multiplexers", 3, { foundations: 18, senior: 28 }),
  stub("ch6", "p2", 8, "Circuits that remember", "Latches, flip-flops, registers, RAM", 3, { foundations: 18, senior: 30 }),
  stub("ch7", "p2", 9, "The CPU", "Fetch–decode–execute — program a real 8-bit machine", 4, { foundations: 25, senior: 40 }),
  stub("ch8", "p2", 10, "Fast CPUs", "Pipelines, caches, branch prediction, multicore", 5, { foundations: 22, senior: 38 }),
  stub("ch9", "p2", 11, "GPUs & parallel hardware", "Why GPUs exist — and why AI loves them", 5, { foundations: 15, senior: 25 }),
  // P3 · Code
  stub("ch10", "p3", 12, "From machine code to languages", "The abstraction elevator; functions, call stack, recursion", 6, { foundations: 22, senior: 35 }),
  stub("ch11", "p3", 13, "Compilers & interpreters", "Lexer → parser → AST → bytecode → JIT", 6, { foundations: 22, senior: 38 }),
  stub("ch12", "p3", 14, "Software engineering", "Abstraction, APIs, testing — how big systems stay sane", 6, { foundations: 15, senior: 22 }),
  // P4 · Algorithms & Data Structures
  stub("ch13", "p4", 15, "Big-O & algorithmic thinking", "Growth, best/avg/worst, amortized cost", 7, { foundations: 20, senior: 32 }),
  stub("ch14", "p4", 16, "Linear structures", "Arrays, lists, stacks, queues, hash tables", 7, { foundations: 22, senior: 35 }),
  stub("ch15", "p4", 17, "Trees & heaps", "BSTs, balancing, heaps, tries", 8, { foundations: 22, senior: 35 }),
  stub("ch16", "p4", 18, "Sorting & searching", "Binary search and the sorting-race classics", 8, { foundations: 22, senior: 35 }),
  stub("ch17", "p4", 19, "Graphs", "BFS/DFS, Dijkstra, A*, MST, topological sort", 9, { foundations: 25, senior: 40 }),
  stub("ch18", "p4", 20, "Design paradigms", "Divide & conquer, greedy, DP, backtracking", 9, { foundations: 25, senior: 40 }),
  // P5 · Theory
  stub("ch19", "p5", 21, "Automata & regular languages", "FSMs, regex↔NFA/DFA, the Chomsky hierarchy", 10, { foundations: 20, senior: 32 }),
  stub("ch20", "p5", 22, "Computability", "Turing machines, universality, the halting problem", 10, { foundations: 22, senior: 35 }),
  stub("ch21", "p5", 23, "Complexity", "P vs NP, NP-completeness, coping strategies", 10, { foundations: 20, senior: 35 }),
  // P6 · Operating Systems
  stub("ch22", "p6", 24, "Processes & scheduling", "Kernel mode, syscalls, threads, schedulers", 11, { foundations: 22, senior: 35 }),
  stub("ch23", "p6", 25, "Memory", "Virtual memory, paging, stack vs heap, GC intuition", 11, { foundations: 22, senior: 38 }),
  stub("ch24", "p6", 26, "Files & storage", "File systems, inodes, journaling, HDD vs SSD", 12, { foundations: 18, senior: 28 }),
  stub("ch25", "p6", 27, "Concurrency", "Races, mutexes, deadlock — and how to break it", 12, { foundations: 22, senior: 38 }),
  // P7 · Networks
  stub("ch26", "p7", 28, "How networks work", "Layers, switching, IP routing, DNS", 13, { foundations: 22, senior: 35 }),
  stub("ch27", "p7", 29, "TCP & UDP", "Handshakes, reliability, congestion control", 13, { foundations: 20, senior: 35 }),
  stub("ch28", "p7", 30, "The Web", "HTTP/1.1→2→3, TLS, caching — URL to pixels", 13, { foundations: 20, senior: 32 }),
  // P8 · Data
  stub("ch29", "p8", 31, "Databases", "SQL, B-tree indexes, transactions, isolation", 14, { foundations: 25, senior: 40 }),
  stub("ch30", "p8", 32, "Distributed systems", "Replication, partitions, CAP, consensus intuition", 14, { foundations: 22, senior: 38 }),
  // P9 · Security
  stub("ch31", "p9", 33, "Cryptography", "Hashes, key exchange, RSA/ECC intuition, TLS", 15, { foundations: 22, senior: 38 }),
  stub("ch32", "p9", 34, "Security", "Threat modeling, attack classes, defense in depth", 15, { foundations: 20, senior: 35 }),
  // P10 · Intelligence
  stub("ch33", "p10", 35, "Machine learning", "Features, loss, gradient descent, overfitting", 16, { foundations: 22, senior: 38 }),
  stub("ch34", "p10", 36, "Modern AI & frontiers", "Transformers, embeddings, capabilities & limits", 16, { foundations: 20, senior: 35 }),
  // P11 · Capstone
  stub("ch35", "p11", 37, "The whole picture", "The entire stack in one animated traversal", 17, { foundations: 15, senior: 20 }),
];

// ---- helpers (shared by app + qa gate) ----
export function partById(id: string): Part | undefined {
  return PARTS.find((p) => p.id === id);
}
export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}
export function chaptersOfPart(partId: string): Chapter[] {
  return CHAPTERS.filter((c) => c.part === partId).sort((a, b) => a.order - b.order);
}
/** Prev/next across the whole journey, in global order. */
export function prevNext(id: string): { prev?: Chapter; next?: Chapter } {
  const sorted = [...CHAPTERS].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((c) => c.id === id);
  if (i === -1) return {};
  return { prev: sorted[i - 1], next: sorted[i + 1] };
}
export function isStub(c: Chapter): boolean {
  return c.sections.length === 0;
}
