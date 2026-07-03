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

// ---------------------------------------------------------------
// ch.1 — Bits & numbers  (P1 · Information, built in S2)
// ---------------------------------------------------------------
const ch1: Chapter = {
  id: "ch1",
  part: "p1",
  order: 3,
  title: "Bits & numbers",
  tagline: "One row of switches, read three different ways, becomes every number a computer knows",
  readMins: { foundations: 20, senior: 32 },
  storyHook: {
    md:
      "1948, Bell Labs. Claude Shannon publishes *A Mathematical Theory of Communication* and, needing a name for the atom of information — a single yes/no, heads/tails, on/off — borrows a word his colleague John Tukey had coined: **bit**, from *binary digit*. In one stroke, messages, numbers, music and pictures all became the same substance: sequences of bits. The idea that *everything is bits* — the spine of this whole guide — starts here. This chapter makes that atom concrete: how a finite row of 0s and 1s becomes a number, why the *same* row can mean 200, −56, or 3.14, and where the arithmetic quietly lies.",
  },
  assumes: [],
  mentalModel:
    "A fixed-width row of switches. The bits carry no meaning by themselves — read the row as unsigned, as two's-complement signed, or as an IEEE-754 float and you get three different numbers from the identical pattern. Meaning lives in the interpretation, not the bits.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "**You are here: bits & numbers** → encoding text, color & sound (ch.2) → compression (ch.3) → and later, in Part 2, these same bits become *physical* voltages in logic gates (ch.4).\n" +
        "A computer has exactly one kind of thing inside it: a **bit** — a switch that is either off (**0**) or on (**1**). That's the whole vocabulary. Everything else — this sentence, your bank balance, a 4K movie — is an arrangement of bits plus an agreement about what the arrangement *means*. One bit distinguishes two things; *n* bits distinguish 2ⁿ. Eight bits (a **byte**) name 256 possibilities; 32 bits name over four billion. Scarcity of symbols, abundance of meaning — that trade is the beginning of computing.",
    },
    {
      kind: "prose",
      md:
        "## Counting in twos\n" +
        "Decimal writes numbers as sums of powers of ten; binary uses powers of **two**. The byte `1011_0101` reads, from the right, as 1·1 + 0·2 + 1·4 + 0·8 + 1·16 + 1·32 + 0·64 + 1·128 = **181**. Same positional idea you learned as a child, only each place is worth twice the one to its right instead of ten times.\n" +
        "Long binary strings are miserable for humans, so we group bits into fours and write each group as one **hexadecimal** digit (0–9 then A–F for 10–15). One hex digit *is* exactly four bits, no arithmetic required — `1011_0101` = `B5`. That's why memory addresses, colors and byte dumps are written in hex: two hex digits per byte, and the grouping never lies. Try it — type a number below and watch which places light up.",
    },
    { kind: "sim", sim: "base-converter" },
    {
      kind: "prose",
      md:
        "## How many things fit\n" +
        "A register has a **fixed width** — 8, 16, 32, or 64 bits — chosen when the hardware or the type is defined. Width sets the ceiling: an 8-bit box holds 0–255 and no more. Ask for 256 and there is simply no bit to put the 1 in. This single fact — that numbers live in boxes of a fixed size — is behind a whole family of bugs we'll meet in a moment.",
    },
    {
      kind: "table",
      caption: "Width sets the range. Signed ranges are asymmetric — one extra negative, because 0 uses up a positive slot.",
      head: ["Width", "Unsigned range", "Signed range (two's complement)", "Everyday name"],
      rows: [
        ["8-bit", "0 … 255", "−128 … 127", "byte / char"],
        ["16-bit", "0 … 65,535", "−32,768 … 32,767", "short"],
        ["32-bit", "0 … ~4.29 billion", "−2.15B … 2.15B", "int"],
        ["64-bit", "0 … ~1.8 × 10¹⁹", "±9.2 × 10¹⁸", "long / size_t"],
      ],
    },
    {
      kind: "prose",
      md:
        "## Negative numbers: two's complement\n" +
        "How do you store −5 with only 0s and 1s? The clumsy answer (steal the top bit as a 'minus sign') wastes a pattern on −0 and forces the hardware to special-case signs. The elegant answer every real machine uses is **two's complement**: to negate a number, **flip every bit and add one**. So in 8 bits, 5 is `0000_0101`; invert to `1111_1010`, add one → `1111_1011`, which is −5. The magic: the top bit now carries weight **−2ⁿ⁻¹** instead of +2ⁿ⁻¹, and ordinary binary addition of these patterns just *works* for negatives too. Subtraction becomes addition of a negation — one adder for everything.",
    },
    {
      kind: "code",
      lang: "ts",
      note: "The same 8 bits, read three ways — and the recipe for negation. Two's complement is why `a - b` is just `a + (~b + 1)`.",
      code:
        "const bits = 0b1000_0000;        // one 8-bit pattern\n" +
        "asUnsigned8(bits);               // 128\n" +
        "asSigned8(bits);                 // -128   (top bit weighs -2^7)\n" +
        "\n" +
        "// negate = flip every bit, add one:\n" +
        "((~5) + 1) & 0xff;               // 251  ==  -5 read as unsigned 8-bit\n" +
        "\n" +
        "(0.1 + 0.2) === 0.3;             // false → 0.30000000000000004 (see below)",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Why two's complement, really: one adder, modular arithmetic",
      lens: "senior",
      md:
        "Two's complement isn't a trick, it's arithmetic **mod 2ⁿ**. The n-bit values form a ring; −x is the additive inverse 2ⁿ − x, which is exactly `~x + 1`. Because the ring wraps, the *same* ripple-carry adder that adds unsigned numbers adds signed ones — the CPU needn't know or care which interpretation you intended, and subtraction is just adding an inverse. That hardware economy (no separate sign logic, one zero instead of two) is why sign-magnitude and one's-complement lost. It also means the sign bit is not a flag bolted on top; it's the natural −2ⁿ⁻¹ place value falling out of the wrap. We'll wire the adder itself in ch.5.",
    },
    { kind: "sim", sim: "bit-inspector" },
    {
      kind: "prose",
      md:
        "## When the odometer rolls over\n" +
        "Because the box is fixed, arithmetic is **modular**: exceed the top and it wraps to the bottom, like a car odometer rolling from 999999 to 000000. An unsigned 8-bit 255 + 1 becomes 0. A *signed* 8-bit 127 + 1 becomes −128 — the sign bit flips and a large positive silently turns large negative. No alarm sounds; the extra carry bit is just discarded. This is **integer overflow**, and it has sunk real systems: the Ariane 5 rocket's 1996 maiden flight was destroyed 37 seconds in when a 64-bit float was forced into a 16-bit integer and overflowed. Predict a few before you trust your instincts:",
    },
    { kind: "quiz", quiz: "overflow-predict" },
    {
      kind: "prose",
      md:
        "## Numbers with a fractional point\n" +
        "Integers can't express 3.14 or 6.022×10²³. For those we use **floating point**, which is binary **scientific notation**: store a sign, a fraction (the *mantissa*), and an exponent, so the value is *± mantissa × 2^exponent*. The point 'floats' — the exponent slides it — which is how a mere 64 bits can span from 10⁻³⁰⁸ to 10³⁰⁸. The price of that enormous range is that precision is **relative, not absolute**: you get roughly 15–17 significant decimal digits *wherever* you are on the line, so the gap between representable values is tiny near zero and enormous near 10³⁰⁸.",
    },
    {
      kind: "prose",
      md:
        "## Inside an IEEE-754 number\n" +
        "The standard every CPU implements, **IEEE-754**, lays a 64-bit *double* out as **1 sign bit · 11 exponent bits · 52 mantissa bits** (a 32-bit *float* is 1 · 8 · 23). The exponent is stored *biased* (add 1023, so it can encode negatives without its own sign), and normal numbers get a free leading 1 on the mantissa that isn't even stored. Special bit patterns are reserved for **±0, ±∞, and NaN** ('not a number', the result of 0/0). Flip the colored fields in the inspector above, then watch the values thin out along the line:",
    },
    { kind: "figure", fig: "float-number-line", caption: "Each power-of-two octave holds the same count of representable values, so the spacing doubles every octave — precision you can see leaking away from zero." },
    {
      kind: "callout",
      tone: "warn",
      title: "The most famous bug that isn't a bug: 0.1 + 0.2",
      md:
        "`0.1 + 0.2` gives `0.30000000000000004`, and every newcomer files a bug report. It's correct. 0.1 has no exact binary fraction (it repeats forever, like 1/3 in decimal), so it's rounded on the way in; ditto 0.2; the two rounding errors don't cancel. The lesson is iron: **never compare floats with `==`**. Use a tolerance — an absolute epsilon near zero, a *relative* one otherwise (`|a−b| ≤ ε·max(|a|,|b|)`), because the gap scales with magnitude. And never store money in a float: use integer cents or a decimal type.",
    },
    {
      kind: "formal",
      title: "Formal corner — the IEEE-754 value formula",
      md:
        "For a normal binary64 number with sign *s*, stored exponent *e* (0 < e < 2047) and 52-bit fraction *f*:\n" +
        "- **value = (−1)ˢ × (1 + f/2⁵²) × 2^(e − 1023)** — note the implicit leading 1 and the bias of 1023.\n" +
        "- **Subnormals** (e = 0, f ≠ 0): value = (−1)ˢ × (f/2⁵²) × 2^(−1022) — no leading 1, filling the gap down to 0 (graceful underflow).\n" +
        "- **Specials**: e = 0, f = 0 → ±0; e = 2047, f = 0 → ±∞; e = 2047, f ≠ 0 → NaN.\n" +
        "- The **machine epsilon** for binary64 is 2⁻⁵² ≈ 2.22×10⁻¹⁶ — the gap between 1.0 and the next representable value; the gap at magnitude *x* is about ε·2^⌊log₂x⌋.\n" +
        "- NaN ≠ NaN (it compares unequal to everything, itself included) — the one value where `x === x` is false.",
    },
    {
      kind: "compare",
      a: "Integers (two's complement)",
      b: "Floats (IEEE-754)",
      rows: [
        ["Spacing on the number line", "Exactly even (step of 1)", "Uneven — gaps double each octave"],
        ["Failure at the edge", "Wrap around (mod 2ⁿ), silent", "Round to nearest; overflow → ±∞"],
        ["Exactness", "Every value in range is exact", "Most decimals are approximated"],
        ["Reach for it when", "Counts, indices, money (as cents), bitmasks", "Measurements, science, graphics, ML"],
      ],
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You now have the two number systems every program runs on, and a healthy suspicion of both. But a computer must store far more than numbers — letters, emoji, colors, sound. The move is always the same: agree on a **code** that maps things to numbers, and numbers you already know are bits. That's ch.2. And once everything is bits, a natural question follows — can we use *fewer* of them? That's ch.3, compression.",
    },
  ],
  keyPoints: [
    "A bit is — the smallest unit of information: one binary choice (0/1). n bits name 2ⁿ possibilities; 8 bits = a byte = 256.",
    "Bits carry no meaning alone — the same pattern is a different number as unsigned, signed, or float; the interpretation supplies the meaning.",
    "Positional binary — each place is a power of two; one hex digit packs exactly four bits, which is why bytes are written in hex.",
    "Two's complement — negate by flipping every bit and adding one; the top bit weighs −2ⁿ⁻¹, so one adder serves signed and unsigned.",
    "Fixed width wraps — integer arithmetic is mod 2ⁿ; overflow is silent (unsigned 255+1 → 0; signed 127+1 → −128).",
    "Floating point — binary scientific notation (sign · mantissa · 2^exponent); huge range bought with relative, not absolute, precision.",
    "0.1 + 0.2 ≠ 0.3 — most decimals have no exact binary fraction; compare floats with a tolerance, never with ==, and never store money in them.",
  ],
  pitfalls: [
    {
      title: "Comparing floats with ==",
      body: "Rounding makes 0.1 + 0.2 differ from 0.3. Test with a tolerance (relative epsilon for general magnitudes); reserve == for integers and exactly-representable values.",
      lens: "both",
    },
    {
      title: "Assuming arithmetic can't overflow",
      body: "Fixed-width integers wrap silently. A 32-bit counter, a size computed as int, a timestamp in seconds — all have a ceiling. In C, signed overflow is undefined behavior the optimizer may exploit; use unsigned/size_t and checked arithmetic.",
      lens: "both",
    },
    {
      title: "Confusing bits and bytes",
      body: "8 bits = 1 byte. Network speeds are in bits (Mb/s), file sizes in bytes (MB) — a factor-of-8 trap. And KB/MB are ambiguous (1000 vs 1024); use KiB/MiB when it matters.",
      lens: "both",
    },
    {
      title: "Sign- vs zero-extending on widening",
      body: "Promoting an 8-bit value to 32 bits: a signed value must copy the sign bit (sign-extend), an unsigned one pads with zeros. Get it wrong and 0xFF becomes 255 where you meant −1, or vice versa — a classic source of off-by-huge bugs.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch1-1", "iv-ch1-2", "iv-ch1-3", "iv-ch1-4"],
  kataIds: [],
  seeAlso: ["ch2", "ch3", "ch5"],
  sources: [
    { title: "David Goldberg — What Every Computer Scientist Should Know About Floating-Point Arithmetic", url: "https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html" },
    { title: "Two's complement — Wikipedia", url: "https://en.wikipedia.org/wiki/Two%27s_complement" },
    { title: "Float Exposed — inspect any IEEE-754 value bit by bit", url: "https://float.exposed/" },
    { title: "C. E. Shannon — A Mathematical Theory of Communication (1948), where the 'bit' debuts", url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf" },
  ],
};

// ---------------------------------------------------------------
// ch.2 — Encoding the world  (P1 · Information, built in S2)
// ---------------------------------------------------------------
const ch2: Chapter = {
  id: "ch2",
  part: "p1",
  order: 4,
  title: "Encoding the world",
  tagline: "Text, color and sound are all just agreements about which number means what",
  readMins: { foundations: 18, senior: 28 },
  storyHook: {
    md:
      "1838. Samuel Morse and Alfred Vail need to squeeze the alphabet down a single wire as dots and dashes. Instead of guessing, Vail reportedly walks into a local newspaper's print shop and counts the letters in the compositors' type cases — the more of a letter the printers kept on hand, the more common it must be. **E**, the most common English letter, gets the shortest possible code: a single dot. **Q** and **Z** get long ones. A century before information theory had a name, telegraphy already knew its central trick — *frequent things should be cheap to send*. This chapter is about codes: the agreements that turn letters, pixels and sound waves into the numbers of ch.1. The frequency idea returns, formalized, in ch.3.",
  },
  assumes: [
    { chapterId: "ch1", oneLiner: "Everything is bits, and a fixed-width pattern of bits is a number. Here we map the rest of the world onto those numbers." },
  ],
  mentalModel:
    "Nothing 'textual', 'visual' or 'audible' lives in the machine — only numbers, and numbers are bits. Pick an encoding (a table mapping things to numbers) and the world becomes storable. Different encodings are just different tables, with different trade-offs of size, range and compatibility.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Bits & numbers (ch.1) → **you are here: encoding text, color & sound** → compression (ch.3).\n" +
        "A number, on its own, means nothing until two parties agree what it stands for. An **encoding** is that agreement: a table mapping the things we care about — the letter *A*, the color of a pixel, the pressure of a sound wave at an instant — onto numbers. Once mapped, the world is just ch.1's bits. Morse's insight was that the *choice* of table matters; the twentieth century's insight was that one table should work for *everyone*.",
    },
    {
      kind: "prose",
      md:
        "## ASCII: 128 characters, 7 bits\n" +
        "The 1963 standard **ASCII** gave each English character a number 0–127 — `A` = 65, `a` = 97, `0` = 48 — which fits in **7 bits**. It bundled digits, punctuation, and 33 invisible **control codes** (newline, tab, the still-living 'bell'). It was clean, tiny, and hopelessly parochial: no é, no ß, no Cyrillic, no 中文, no emoji. The other half of the byte (128–255) became a free-for-all of mutually incompatible 'code pages', and the same byte meant different letters in different countries. Text stopped being portable.",
    },
    { kind: "figure", fig: "unicode-planes", caption: "From ASCII's 128 slots to Unicode's 1.1 million — the code space, stepped outward. 297,334 code points are assigned as of Unicode 17.0 (2026)." },
    {
      kind: "prose",
      md:
        "## Unicode: one number per character\n" +
        "**Unicode** cut the knot by separating two ideas people used to conflate. A **code point** is a character's permanent identity — U+0041 is LATIN CAPITAL A, U+1F600 is GRINNING FACE — independent of how it's stored. *How* those code points become bytes is a separate choice of **encoding**: UTF-8, UTF-16, or UTF-32. One universal catalog (172 scripts and counting), many ways to serialize it. The winner, by a landslide on the web, is UTF-8 — type into it and watch characters become bytes:",
    },
    { kind: "sim", sim: "utf8-encoder" },
    {
      kind: "prose",
      md:
        "## How UTF-8 works\n" +
        "UTF-8 is **variable-width**: 1 to 4 bytes per character. ASCII code points (0–127) stay a single byte *identical to old ASCII* — so every ASCII file is already valid UTF-8. Bigger code points spill into 2, 3, or 4 bytes using a self-describing pattern: a lead byte whose top bits announce the length (`110…`, `1110…`, `11110…`), followed by continuation bytes that all start `10…`. The structural bits tell a decoder exactly how to regroup the payload — no separators needed.",
    },
    {
      kind: "code",
      lang: "ts",
      note: "One emoji, three different counts — the single most common Unicode bug in production code.",
      code:
        '"😀".length;                          // 2  — UTF-16 code units (surrogate pair)\n' +
        '[..."😀"].length;                     // 1  — actual code points\n' +
        'new TextEncoder().encode("😀").length; // 4  — UTF-8 bytes',
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Why UTF-8 won: self-synchronization and no endianness",
      lens: "senior",
      md:
        "Two properties beyond ASCII-compatibility sealed it. **Self-synchronizing**: because continuation bytes (`10xxxxxx`) can never be mistaken for a lead byte, you can drop into the middle of a stream and find the next character boundary by scanning a byte or two — a corrupted byte damages one character, not the rest of the file. **No endianness**: UTF-8 is a byte sequence, so there's no big/little-endian ambiguity and no byte-order mark needed, unlike UTF-16/32. The cost is that you can't index the *n*-th character in O(1) — you must walk the bytes — but in practice you almost always iterate anyway. UTF-16 survives as the *in-memory* form of JavaScript, Java and C# strings, which is exactly why `\"😀\".length` is 2.",
    },
    {
      kind: "prose",
      md:
        "## Images: a color is three numbers\n" +
        "Encode a picture by chopping it into a grid of **pixels** and storing each pixel's color as numbers. The usual scheme is **RGB**: three bytes giving the intensity of red, green and blue, 0–255 each — 256³ ≈ 16.7 million colors, 24 bits per pixel. Zoom in far enough and the image dissolves into exactly that: a spreadsheet of triples. Which also reveals the problem — a 12-megapixel photo is 36 million numbers, begging to be compressed (ch.3).",
    },
    { kind: "sim", sim: "pixel-zoom" },
    {
      kind: "prose",
      md:
        "## Sound: measuring a wave on a schedule\n" +
        "Sound is a continuous pressure wave; storing it means **sampling** — measuring its height many thousands of times per second and writing down each measurement. Two independent knobs govern fidelity: the **sample rate** (how often you measure) sets the highest frequency you can capture, and the **bit depth** (how finely you round each measurement) sets the noise floor. Sample too slowly and something strange happens — high frequencies masquerade as low ones. Slide the rate below the red line and watch:",
    },
    { kind: "sim", sim: "sampling-toy" },
    { kind: "quiz", quiz: "encoding-predict" },
    {
      kind: "callout",
      tone: "warn",
      title: "Where encodings bite: mojibake, the length trap, and normalization",
      md:
        "Three real hazards. **Mojibake** — decode bytes with the wrong table and you get 'Ã©' where 'é' should be; always know your input's encoding, and default to UTF-8. **The length trap** — `String.length` counts UTF-16 units, not characters, so an emoji reads as 2 and slicing a string can cut a character in half; count grapheme clusters for anything user-visible. **Normalization** — 'é' can be one code point (U+00E9) or two (e + combining accent), so visually identical strings compare unequal; normalize (NFC) before comparing, hashing, or storing, and beware homoglyph spoofing in names and URLs.",
    },
    {
      kind: "formal",
      title: "Formal corner — the UTF-8 encoding templates",
      md:
        "A code point *U* is encoded by range:\n" +
        "- **U+0000 … U+007F** → `0xxxxxxx` (1 byte; the 7 ASCII bits).\n" +
        "- **U+0080 … U+07FF** → `110xxxxx 10xxxxxx` (2 bytes; 11 payload bits).\n" +
        "- **U+0800 … U+FFFF** → `1110xxxx 10xxxxxx 10xxxxxx` (3 bytes; 16 bits — the whole BMP).\n" +
        "- **U+10000 … U+10FFFF** → `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` (4 bytes; 21 bits — the astral planes).\n" +
        "The number of leading 1s in the lead byte equals the total byte count; continuation bytes always match `10xxxxxx`. Overlong encodings (padding a small code point into more bytes) are illegal, which keeps the mapping one-to-one and closes a class of security bypasses.",
    },
    {
      kind: "compare",
      a: "Fixed-width encoding (e.g. UTF-32)",
      b: "Variable-width encoding (e.g. UTF-8)",
      rows: [
        ["Bytes per character", "Always the same (simple)", "1–4 (compact for common text)"],
        ["Index the n-th character", "O(1) random access", "O(n) — must scan"],
        ["ASCII text size", "4× larger", "Identical to ASCII"],
        ["Corruption / seeking", "Fragile to byte loss", "Self-synchronizing"],
      ],
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "Every encoding here is *literal* — it spends the same bits on a common letter and a rare one, on a flat blue sky and a busy crowd. Morse already knew that's wasteful. Ch.3 asks the payoff question: given that the world's data is deeply *redundant*, how few bits can we actually get away with — and what's the hard floor set by information itself?",
    },
  ],
  keyPoints: [
    "An encoding is — an agreed table mapping things (letters, colors, sound samples) to numbers, and numbers are bits.",
    "ASCII — 128 characters in 7 bits; enough for English, blind to the rest of the world, so bytes 128–255 became incompatible chaos.",
    "Unicode separates identity from storage — a code point (U+XXXX) is the character; UTF-8/16/32 are different ways to serialize it.",
    "UTF-8 — variable 1–4 bytes, byte-for-byte ASCII-compatible, self-synchronizing and endian-free; the web's default.",
    "The length trap — characters ≠ UTF-16 units ≠ bytes; 😀 is one code point, two units (String.length), four UTF-8 bytes.",
    "Images are numbers — each pixel is three bytes (R,G,B, 0–255) = 16.7M colors; megapixels × 3 bytes is why photos must be compressed.",
    "Sound is sampled — sample rate sets the frequency ceiling (Nyquist), bit depth sets the noise floor; too slow → aliasing.",
  ],
  pitfalls: [
    {
      title: "Assuming one character is one byte",
      body: "Only true for ASCII. Non-ASCII takes 2–4 UTF-8 bytes, so byte-slicing a string can split a character and corrupt it. Operate on code points or graphemes, not raw bytes, unless you know it's ASCII.",
      lens: "both",
    },
    {
      title: "Trusting String.length for user-visible length",
      body: "It counts UTF-16 code units. Emoji count as 2; a flag or skin-toned emoji can be many. For 'how many characters does the user see', count grapheme clusters (e.g. Intl.Segmenter).",
      lens: "both",
    },
    {
      title: "Sampling below Nyquist (aliasing)",
      body: "To capture a signal you must sample at more than twice its highest frequency. Below that, high frequencies fold down into false low ones — the wagon-wheel effect in video, ugly artifacts in audio. Filter before you sample.",
      lens: "both",
    },
    {
      title: "Ignoring normalization and mojibake",
      body: "Visually identical strings can differ byte-wise (composed vs decomposed accents); normalize before comparing/hashing. And decoding bytes with the wrong charset yields garbage — carry the encoding with the data, default to UTF-8.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch2-1", "iv-ch2-2", "iv-ch2-3", "iv-ch2-4"],
  kataIds: [],
  seeAlso: ["ch1", "ch3"],
  sources: [
    { title: "Joel Spolsky — The Absolute Minimum Every Developer Must Know About Unicode", url: "https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/" },
    { title: "UTF-8 — Wikipedia", url: "https://en.wikipedia.org/wiki/UTF-8" },
    { title: "The Unicode Standard (unicode.org)", url: "https://www.unicode.org/standard/standard.html" },
    { title: "Nyquist–Shannon sampling theorem — Wikipedia", url: "https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem" },
  ],
};

// ---------------------------------------------------------------
// ch.3 — Compression & entropy  (P1 · Information, built in S2)
// ---------------------------------------------------------------
const ch3: Chapter = {
  id: "ch3",
  part: "p1",
  order: 5,
  title: "Compression & entropy",
  tagline: "How to spend fewer bits — and the hard floor, set by information itself, that no trick can cross",
  readMins: { foundations: 20, senior: 32 },
  storyHook: {
    md:
      "1951, MIT. In a graduate information-theory class, Professor Robert Fano offers his students a choice: sit the final exam, or write a term paper solving one open problem — find the *most efficient* way to assign binary codes to symbols. David Huffman spends months getting nowhere and, defeated, starts to throw his notes in the trash — when the key idea strikes: don't build the code top-down like everyone had tried, build the tree **bottom-up**, repeatedly merging the two rarest symbols. His solution was provably optimal, beating the method his own professor (with Claude Shannon) had devised. A dropped assignment became the algorithm now inside every JPEG, MP3 and ZIP file. This chapter is the payoff of Part 1: the world's data is redundant, and redundancy is compressible — down to a limit Shannon named **entropy**.",
  },
  assumes: [
    { chapterId: "ch2", oneLiner: "Text, images and sound are encoded as bits — usually spending equal bits on common and rare symbols alike. Here we stop wasting them." },
  ],
  mentalModel:
    "Compression removes redundancy, and there are two kinds. Skewed frequencies → give common symbols short codes (Huffman). Repeated patterns → point back to the earlier copy instead of repeating it (LZ). Entropy is the floor: the average surprise per symbol, below which no lossless code can go.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Bits (ch.1) → encodings (ch.2) → **you are here: compression & entropy**, the close of Part 1.\n" +
        "The encodings of ch.2 are honest but wasteful: ASCII spends 8 bits on a space and 8 bits on a 'z', though one is far more common. Real data is drenched in **redundancy** — repeated words, flat regions of sky, silence between notes. Compression is the art of noticing that redundancy and not paying for it twice. Morse felt his way to it by hand; Shannon gave it a limit and Huffman gave it an algorithm.",
    },
    {
      kind: "prose",
      md:
        "## Entropy: the floor\n" +
        "How few bits *could* a message take? Shannon's answer is **entropy** — the average unpredictability per symbol, measured in bits. A symbol that occurs with probability *p* carries **log₂(1/p)** bits of surprise: certain things (p = 1) carry zero, a coin flip carries one, a one-in-256 byte carries eight. Average that over a source and you get its entropy *H = −Σ p·log₂p*. Shannon's **source coding theorem** proves no lossless code can beat *H* bits per symbol on average. That's not an engineering limit to be out-cleverer'd; it's a law. Watch it move as text goes from boring to random:",
    },
    { kind: "figure", fig: "entropy-meter", caption: "Predictable text carries almost no information per symbol; truly random bytes carry the full 8 bits. Compression lives in the gap between a source's entropy and its naive size." },
    {
      kind: "code",
      lang: "ts",
      note: "Entropy in five lines — the exact function ch.3's engine tests assert. 'AAAA' → 0 bits; four equally likely symbols → 2 bits.",
      code:
        "function entropy(text: string): number {\n" +
        "  const freq = new Map<string, number>();\n" +
        "  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);\n" +
        "  let h = 0;\n" +
        "  for (const n of freq.values()) {\n" +
        "    const p = n / text.length;\n" +
        "    h -= p * Math.log2(p);         // rarer symbol → more bits of surprise\n" +
        "  }\n" +
        "  return h;                        // average bits/symbol — the coding floor\n" +
        "}",
    },
    {
      kind: "prose",
      md:
        "## Huffman: short codes for common symbols\n" +
        "Huffman coding turns 'frequent should be cheap' into a concrete recipe. Count how often each symbol appears; make each a leaf weighted by its count; then repeatedly **merge the two lowest-weight nodes** into a parent until one tree remains. Read left/right as 0/1 down to each leaf and you have its code. Common symbols end up near the root with short codes, rare ones sink deep with long ones — and because every symbol is a *leaf*, the codes are **prefix-free**: no code is the start of another, so the stream decodes with zero ambiguity. Type text and watch the tree assemble, then the bitstream shrink:",
    },
    { kind: "sim", sim: "huffman-lab" },
    {
      kind: "callout",
      tone: "senior",
      title: "Huffman is optimal — but only among integer-length codes",
      lens: "senior",
      md:
        "Huffman provably produces the best possible code *when each symbol must get a whole number of bits*. That constraint is its ceiling: if a symbol's ideal length is 2.3 bits, Huffman must round to 2 or 3, wasting a fraction of a bit per symbol — brutal when one symbol dominates (ideal length ≪ 1 bit, but Huffman still spends a full bit). **Arithmetic coding** (and modern **ANS**, used in zstd, Brotli, and video codecs) sidesteps the integer rule by encoding the whole message as one fractional number, hugging the entropy bound. Huffman endures because it's fast, simple, and near-optimal when probabilities sit near powers of two — and it pairs beautifully with LZ, which is what DEFLATE (gzip, PNG, ZIP) does.",
    },
    {
      kind: "prose",
      md:
        "## Run-length encoding: the simplest redundancy\n" +
        "Before patterns, the crudest win: **runs**. If the same symbol repeats — twelve white pixels in a scanned page, a held note — store the symbol once with a count: `WWWWWWWWWWWW` → `W×12`. Run-length encoding is trivial and superb for fax pages, icons and simple graphics. It's also a perfect cautionary tale: on data with *no* runs, each symbol becomes a (symbol, 1) pair and the output **doubles**. Feed it its own poison:",
    },
    { kind: "sim", sim: "rle-visualizer" },
    {
      kind: "prose",
      md:
        "## LZ: point back instead of repeating\n" +
        "The second kind of redundancy is repeated *patterns*, and the **Lempel–Ziv** family (LZ77, 1977) nails it. Keep a sliding **window** of recently seen text; when the upcoming text repeats something in the window, emit a back-reference — *(go back 15, copy 6)* — instead of the literal characters. No dictionary is shipped: the decoder rebuilds each match from its own output. Real-world **gzip / DEFLATE** is exactly this: LZ77 to kill duplication, then Huffman to squeeze the leftover token stream. Step through a repetitive string and watch the arrows reach back:",
    },
    { kind: "sim", sim: "lz-window" },
    { kind: "quiz", quiz: "compress-predict" },
    {
      kind: "prose",
      md:
        "## Lossy: throw away what no one will miss\n" +
        "Everything so far is **lossless** — decompress and get the original bytes back, exactly. For photos, audio and video we can do far better by cheating: **lossy** compression discards information a human won't perceive. JPEG converts 8×8 blocks to frequencies (a DCT) and *quantizes away* the high-frequency detail the eye is weak at — that's the quality slider. MP3 uses a psychoacoustic model to drop tones masked by louder ones. The catch is in the name: the loss is permanent and it accumulates, so lossy is right for media and disastrous for code, text, or anything you'll edit and re-save.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "You cannot compress everything — and definitely not twice",
      md:
        "A counting argument kills the dream of a universal compressor: there are 2ⁿ possible n-bit files but fewer than 2ⁿ shorter strings, so no lossless scheme can shrink *every* input — whatever it shortens, it must lengthen something else (pigeonhole). The everyday consequences: **random data is incompressible** (maximum entropy, no redundancy), and **re-compressing an already-compressed file** gains nothing and often adds a few bytes of overhead. If a vendor claims to shrink any data repeatedly, they're selling a perpetual-motion machine.",
    },
    {
      kind: "formal",
      title: "Formal corner — entropy, Kraft, and the source coding theorem",
      md:
        "- **Entropy**: H(X) = −Σᵢ pᵢ log₂ pᵢ bits/symbol. Maximal (log₂ n) for a uniform source of n symbols; zero for a certain one.\n" +
        "- **Self-information** of a symbol with probability p: log₂(1/p) bits — the number of bits its occurrence 'reveals'.\n" +
        "- **Kraft inequality**: a prefix-free code with lengths ℓᵢ exists iff Σ 2^(−ℓᵢ) ≤ 1 — the exact budget that makes codes uniquely decodable.\n" +
        "- **Shannon's source coding theorem**: the minimum expected code length L satisfies H ≤ L < H + 1; Huffman achieves the bottom of that band for integer lengths, and arithmetic coding closes the last fractional bit.\n" +
        "- Redundancy = (max entropy − actual entropy); it is precisely what a compressor can remove, and no more.",
    },
    {
      kind: "compare",
      a: "Lossless (PNG, ZIP, FLAC)",
      b: "Lossy (JPEG, MP3, H.264)",
      rows: [
        ["Reconstruction", "Bit-for-bit exact", "Approximate — perceptually close"],
        ["Typical ratio", "~2–5× on text/code", "10–100× on media"],
        ["Repeated save/edit", "Safe — no degradation", "Artifacts accumulate ('generation loss')"],
        ["Use it for", "Code, text, archives, medical/master audio", "Photos, streaming audio & video"],
      ],
    },
    {
      kind: "prose",
      md:
        "## The boss, and what's next\n" +
        "You have the whole Part 1 toolkit: bits, encodings, and now the two engines of compression plus the entropy floor beneath them. Time to use it. Open **huffman-lab** above, switch to **🔍 boss · decode the mystery file**, and put it together — raw bytes → spot the encoding → walk the tree → read the hidden message, and claim the **Bitreader** badge. Then Part 2 begins the climb from these abstract bits down to the silicon: in ch.4 a bit stops being a symbol and becomes a *voltage* held by a transistor, and we start building a computer from the electron up.",
    },
  ],
  keyPoints: [
    "Compression removes redundancy — of two kinds: skewed symbol frequencies (Huffman) and repeated patterns (LZ).",
    "Entropy — Shannon's floor: average bits/symbol = −Σ p·log₂p; no lossless code beats it, by law not by cleverness.",
    "Huffman — merge the two rarest nodes repeatedly to build short, prefix-free codes; optimal among integer-length codes.",
    "Prefix-free codes — no codeword is a prefix of another, so the bitstream decodes with no separators and no ambiguity.",
    "RLE — collapses runs to (symbol, count); brilliant for scanlines, but doubles data that has no runs.",
    "LZ77 — replaces repeats with (distance, length) back-references into a sliding window; gzip = LZ77 + Huffman.",
    "No free lunch — no lossless scheme shrinks every input; random data is incompressible, and re-compressing gains nothing.",
    "Lossy trades fidelity for size — JPEG/MP3 discard the imperceptible; right for media, wrong for code, and it accumulates.",
  ],
  pitfalls: [
    {
      title: "Expecting compression to always shrink",
      body: "No lossless method beats every input. Random or already-compressed data won't shrink and may grow by a header. Measure; don't assume a ratio.",
      lens: "both",
    },
    {
      title: "Re-compressing compressed data",
      body: "Zipping a JPEG or gzipping a .zip is near-useless — the redundancy is already gone, and you only add container overhead. Compress once, at the right layer.",
      lens: "both",
    },
    {
      title: "Using lossy where lossless is required",
      body: "JPEG for a screenshot of text, diagrams, or line art produces ringing artifacts; lossy audio for a master degrades on every re-encode. Match the codec to the data and to how often it will be re-saved.",
      lens: "both",
    },
    {
      title: "Forgetting the prefix-free requirement",
      body: "If codes aren't prefix-free (say 0 and 01), the decoder can't tell where one ends — the stream is ambiguous. Huffman guarantees it because every symbol is a leaf; hand-rolled variable-length schemes often don't.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch3-1", "iv-ch3-2", "iv-ch3-3", "iv-ch3-4", "iv-ch3-5"],
  kataIds: [],
  seeAlso: ["ch1", "ch2", "ch4"],
  sources: [
    { title: "D. A. Huffman — A Method for the Construction of Minimum-Redundancy Codes (1952) — overview", url: "https://en.wikipedia.org/wiki/Huffman_coding" },
    { title: "C. E. Shannon — A Mathematical Theory of Communication (1948)", url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf" },
    { title: "RFC 1951 — DEFLATE Compressed Data Format (LZ77 + Huffman)", url: "https://www.rfc-editor.org/rfc/rfc1951" },
    { title: "Entropy (information theory) — Wikipedia", url: "https://en.wikipedia.org/wiki/Entropy_(information_theory)" },
  ],
};

export const CHAPTERS: Chapter[] = [
  // P0 · Orientation
  stub("ch0a", "p0", 1, "The Map", "What CS is, and how to travel this guide", 17, { foundations: 10, senior: 12 }),
  stub("ch0b", "p0", 2, "Math toolkit", "Logic, sets, counting, probability — the on-ramp", 17, { foundations: 25, senior: 35 }),
  // P1 · Information (built in S2)
  ch1,
  ch2,
  ch3,
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
