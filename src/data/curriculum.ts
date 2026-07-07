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

// ---------------------------------------------------------------
// ch.5 — Circuits that count  (P2 · The Machine, built in S3)
// ---------------------------------------------------------------
const ch5: Chapter = {
  id: "ch5",
  part: "p2",
  order: 7,
  title: "Circuits that count",
  tagline: "Wire gates so the carry flows, and the same silicon that does logic starts doing arithmetic",
  readMins: { foundations: 18, senior: 28 },
  storyHook: {
    md:
      "November 1937. A Bell Labs mathematician named **George Stibitz** carries a bag of surplus telephone relays home for the weekend. At his kitchen table, with two relays, a dry-cell battery, flashlight bulbs and strips cut from a tobacco can, he wires a circuit that adds two binary digits and lights a bulb for the answer. His wife names it the **\"Model K\"** — K for *kitchen*. That one-bit adder grew into the Complex Number Computer, which in 1940 Stibitz operated *remotely* over a telegraph line from New Hampshire while the machine sat in New York — the first remote computation. The half-adder you are about to build on the screen is, gate for gate, Stibitz's kitchen-table circuit.",
  },
  assumes: [
    {
      chapterId: "ch4",
      oneLiner: "You have the gate zoo — AND, OR, NOT, XOR — and know any of them is a few transistors. Here we stop treating gates as logic and start wiring them into arithmetic.",
    },
  ],
  mentalModel:
    "Addition is one small gate pattern — the full adder — copied once per bit, with a single carry wire threading them together low-to-high. An ALU is a row of those adders sitting next to a row of logic gates, and a multiplexer at the end that picks which result to keep. Counting and calculating are not new physics; they are gates arranged so the carry can travel.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Gates (ch.4) → **you are here: circuits that count** → circuits that remember (ch.6) → a CPU (ch.7).\n" +
        "Adding two single bits is almost insultingly easy: 0+0=0, 0+1=1, 1+1=… **10** — the answer needs *two* bits, a **sum** and a **carry**. That carry is the entire story of this chapter. One column of addition is trivial; making the carry hop from each column to the next, all the way up an 8- or 64-bit number, is what turns a handful of gates into a machine that counts.",
    },
    {
      kind: "prose",
      md:
        "## The half adder — two gates you already own\n" +
        "Look at the one-bit sum again. The **sum** bit is 1 when the inputs *differ* (0+1 or 1+0) and 0 when they match — that is exactly **XOR**. The **carry** bit is 1 only when *both* inputs are 1 — that is **AND**. So a circuit that adds two bits is nothing but an XOR and an AND sharing the same two inputs. That's a **half adder**, and it is the whole of Stibitz's kitchen table.\n" +
        "Build it in stage ① below, then ask the obvious question: what happens when a carry arrives *from the column below*?",
    },
    { kind: "sim", sim: "build-an-adder" },
    {
      kind: "callout",
      tone: "tip",
      title: "Why \"half\"?",
      md:
        "A half adder has nowhere to put an incoming carry — it takes two inputs, not three. So it can only ever be the **rightmost** column of a sum. Every other column might receive a carry from its neighbour, and for those we need a circuit with a third input. That's the **full adder** — literally two half adders chained, with an OR combining their two carry outputs. Stage ② builds it; stage ③ chains four.",
    },
    {
      kind: "prose",
      md:
        "## Ripple-carry: chaining full adders\n" +
        "Stack four full adders in a row, wire each one's carry-*out* into the next one's carry-*in*, and you have a **4-bit ripple-carry adder** — the same trick scales to 8, 32, 64 bits. Feed it `1111 + 0001` in stage ③ and step it: the carry is *born* at the lowest bit and has to **ripple** all the way to the top, one full adder at a time, flipping every bit from 1 to 0 as it passes. The top bit cannot know its answer until the wave reaches it.\n" +
        "That is the adder's dirty secret: it is only as fast as its **longest carry chain**. For most inputs the carry dies quickly, but the worst case walks the entire width — and a CPU must budget for the worst case. ch.8 buys the speed back with *carry-lookahead*, which computes the carries in parallel instead of waiting for the ripple.",
    },
    { kind: "quiz", quiz: "adder-predict" },
    {
      kind: "prose",
      md:
        "## From an adder to an ALU\n" +
        "An adder only adds. The **ALU** (Arithmetic Logic Unit) — the CPU's calculator — does a menu of operations, and the beautiful part is how little extra it costs. **Subtraction** needs no subtractor: from ch.1, `−B` is `(NOT B) + 1` in two's complement, so `A − B = A + (NOT B) + 1`. Feed the adder an inverted B and force its carry-in to 1, and the *same* adder subtracts. **Comparison** is just subtraction whose result you throw away, keeping only the flags. And the **logic** ops (AND, OR, XOR) run bit-by-bit alongside. Pick which unit's answer to emit with a multiplexer, and one block computes six things.",
    },
    { kind: "sim", sim: "alu-visualizer" },
    {
      kind: "callout",
      tone: "senior",
      title: "The four condition flags — and why C ≠ V",
      lens: "senior",
      md:
        "Every ALU op also sets **flags** that the next instruction can branch on: **Z** (result is zero), **N** (top bit set — the two's-complement sign), **C** (carry/borrow out of the top bit — *unsigned* overflow), and **V** (*signed* overflow, defined as carry-into-MSB XOR carry-out-of-MSB). C and V answer different questions and routinely disagree. `127 + 1` in 8 bits: no unsigned carry (128 < 256) so **C = 0**, but it blew past the signed max 127 → **V = 1**. `200 + 100`: unsigned wrap → **C = 1**, yet read as signed (−56 + 100 = 44) it's correct → **V = 0**. Unsigned comparisons read C; signed comparisons read V and N. This is the hardware under `if (a < b)` — the compiler picks the flag that matches the *types*.",
    },
    {
      kind: "prose",
      md:
        "## The multiplexer — hardware's switch statement\n" +
        "The ALU needs to route *one* of several results to its output, chosen by the operation code. The circuit that does this is a **multiplexer** (mux): n **select** lines steer one of 2ⁿ data inputs through to a single output. It is the silicon form of `switch`/`if` — and it is everywhere a computer makes a choice: which ALU result to keep, which register to read, whether the next instruction is the next address or a branch target.",
    },
    { kind: "figure", fig: "mux-router", caption: "A 4-to-1 mux: two select bits choose which of four inputs reaches the output. Its mirror image — the decoder — is how RAM will find one cell in ch.6." },
    {
      kind: "formal",
      title: "Formal corner — the adder and overflow in Boolean algebra",
      md:
        "For a single full adder with inputs A, B and carry-in Cᵢₙ:\n" +
        "- **Sum** = A ⊕ B ⊕ Cᵢₙ\n" +
        "- **Carry-out** = (A ∧ B) ∨ (Cᵢₙ ∧ (A ⊕ B)) — a carry is *generated* when both bits are 1, or *propagated* when exactly one is 1 and a carry came in.\n" +
        "Those two terms, **generate** `Gᵢ = Aᵢ∧Bᵢ` and **propagate** `Pᵢ = Aᵢ⊕Bᵢ`, are the seed of carry-lookahead (ch.8): Cᵢ₊₁ = Gᵢ ∨ (Pᵢ ∧ Cᵢ).\n" +
        "**Two's-complement subtraction**: A − B = A + B̄ + 1, so a single adder with B-input inverters and Cᵢₙ = 1 subtracts.\n" +
        "**Signed overflow**: V = Cₙ ⊕ Cₙ₋₁ (carry out of the MSB differs from carry into it). Equivalently, adding two same-signed numbers and getting the other sign.",
    },
    {
      kind: "compare",
      a: "Half adder",
      b: "Full adder",
      rows: [
        ["Inputs", "2 (A, B)", "3 (A, B, carry-in)"],
        ["Built from", "1 XOR + 1 AND", "2 half adders + 1 OR"],
        ["Can be chained?", "No — no carry-in", "Yes — that's the point"],
        ["Used for", "Only the least-significant bit", "Every bit of a multi-bit adder"],
      ],
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where the ideal adder leaks",
      md:
        "Three honest caveats. **Overflow is silent** — the carry-out just falls off the end; the ALU raises a flag but never stops you, so `127 + 1 = −128` sails through unless *your code* checks (the wraparound of ch.1, now in gates). **Addition isn't O(1)** — ripple-carry delay grows with width; treating a 64-bit add as free is how timing budgets get blown. **Signed and unsigned share the same bits** — the adder doesn't know or care which you meant; only your choice of flag (C vs V) and comparison makes 1111₂ mean 15 or −1.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You can now count, add, subtract, compare and choose — a complete calculator made of nothing but gates. But notice what the ALU *can't* do: the instant its inputs change, its answer vanishes. It has no yesterday. To build a computer we need circuits that **hold** a value between one operation and the next — and the trick for that, in ch.6, is as strange as it is simple: wire a gate's output back into its own input.",
    },
  ],
  keyPoints: [
    "The carry is the whole problem — adding two bits is trivial (sum = XOR, carry = AND); threading the carry between columns is what makes addition a circuit.",
    "Half adder — sum = A XOR B, carry = A AND B; with no carry-in it can only ever be the least-significant column.",
    "Full adder — adds A, B and a carry-in (two half adders + an OR); chain N of them to add N-bit numbers.",
    "Ripple-carry — full adders in a row, carry flowing low bit → high bit; simple, but only as fast as its longest carry chain (ch.8 fixes it).",
    "Subtraction is free — A − B = A + (NOT B) + 1, so one adder does both add and subtract; no subtractor hardware exists.",
    "An ALU is — an adder + logic gates + a multiplexer that selects which result to emit, driven by an operation-select code.",
    "Condition flags — Z zero, N negative/sign, C unsigned carry/borrow, V signed overflow; they are what if-statements and branches read.",
    "C vs V — C catches unsigned overflow, V catches signed; the same addition can set one and clear the other.",
    "A multiplexer is hardware's switch — n select bits route 1 of 2ⁿ inputs to the output; its mirror, the decoder, addresses memory in ch.6.",
    "An ALU never remembers — it is pure combinational logic; its output appears and vanishes with its inputs, which is why ch.6 exists.",
  ],
  pitfalls: [
    {
      title: "Forgetting the carry-in",
      body: "A half adder looks like it 'adds', but it can't accept a carry from the column below, so it can't sit in the middle of a chain. Only bit 0 can be a half adder; every other bit needs a full adder.",
      lens: "both",
    },
    {
      title: "Reading the wrong overflow flag",
      body: "C and V are different flags for different worlds. Checking C after a signed operation (or V after an unsigned one) is a classic bug — pick the flag that matches how you're interpreting the bits.",
      lens: "both",
    },
    {
      title: "Assuming hardware addition is instant",
      body: "A ripple-carry adder's worst case walks the carry through every bit, so delay grows with width. It matters enough that real CPUs spend transistors on carry-lookahead — 'add' is not free (ch.8).",
      lens: "senior",
    },
    {
      title: "Thinking the ALU stores its answer",
      body: "An ALU is combinational: feed inputs, the result appears, and it's gone the moment inputs change. Holding a value needs a register (ch.6). The ALU computes; it never remembers.",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch5-1", "iv-ch5-2", "iv-ch5-3", "iv-ch5-4", "iv-ch5-5"],
  kataIds: [],
  seeAlso: ["ch4", "ch6", "ch7", "ch8"],
  sources: [
    { title: "George Stibitz & the Model K adder (Computer History Museum)", url: "https://www.computerhistory.org/tdih/november/9/" },
    { title: "Crash Course Computer Science #5 — How Computers Calculate: the ALU", url: "https://www.youtube.com/watch?v=1I5ZMmrOfnA" },
    { title: "Nand2Tetris — Project 2: Boolean Arithmetic (half/full adder → ALU)", url: "https://www.nand2tetris.org/project02" },
    { title: "Ken Shirriff — Reverse-engineering the classic 74181 ALU chip", url: "https://www.righto.com/2017/03/inside-vintage-74181-alu-chip-how-it.html" },
    { title: "Charles Petzold — Code (2nd ed.), ch. 17: Automation (the adding machine)", url: "https://www.charlespetzold.com/code/" },
  ],
};

// ---------------------------------------------------------------
// ch.6 — Circuits that remember  (P2 · The Machine, built in S3)
// ---------------------------------------------------------------
const ch6: Chapter = {
  id: "ch6",
  part: "p2",
  order: 8,
  title: "Circuits that remember",
  tagline: "Feed a gate's output back into itself and the loop holds a value — the strangest trick in the machine",
  readMins: { foundations: 18, senior: 30 },
  storyHook: {
    md:
      "1918. Two British physicists, **William Eccles and Frank Jordan**, are building radio equipment when they wire up a pair of vacuum tubes so that each one's output feeds the *other's* input. The circuit refuses to sit still in the usual way — instead it snaps into one of two states and **stays there** until you deliberately flip it. They call it the *trigger relay*; we call it the **flip-flop**, and it is the first electronic circuit that could remember. Every register, every cache line, every bit of static RAM in the device you're reading this on is a direct descendant of that 1918 loop. In ch.4 you saw feedback as a *bug* — a NOT gate wired to itself, oscillating forever. Tame that same feedback and it becomes memory.",
  },
  assumes: [
    {
      chapterId: "ch5",
      oneLiner: "You can build combinational circuits — adders, an ALU — that compute a fresh answer from their inputs. Their flaw: the answer vanishes when the inputs change. Here we build circuits that hold on.",
    },
  ],
  mentalModel:
    "Cross-couple two gates so each drives the other and the loop locks into one of two stable states — that is one stored bit. Add an enable and it becomes a controllable latch; add a clock edge and it becomes a flip-flop that only changes on the tick. Line up N of them for a register, and an array of registers behind an address decoder for RAM. All of memory is this one loop, replicated and addressed.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Gates (ch.4) → circuits that count (ch.5) → **you are here: circuits that remember** → a CPU (ch.7).\n" +
        "The ALU you just built has no memory at all: its output is a pure function of its inputs *right now*, and it forgets everything the instant they change. A computer is useless without a yesterday — it must hold the result of one step to feed the next. So we need a circuit with **state**: something that, once set, keeps its value even after the input that set it goes away.",
    },
    {
      kind: "prose",
      md:
        "## Feedback is memory\n" +
        "Here is the whole idea. Take two **NOR** gates and cross-couple them: the output of each becomes an input of the other. Now the circuit has *two* self-consistent resting states — output high, or output low — and with both control inputs at rest it **holds** whichever one it's in, because each gate keeps re-asserting the other. That's an **SR latch** (Set/Reset). Pulse **S** and it locks to 1; pulse **R** and it locks to 0; let both go and it *remembers*. Step it signal-by-signal below and watch the loop settle.",
    },
    { kind: "sim", sim: "latch-playground" },
    {
      kind: "callout",
      tone: "senior",
      title: "The forbidden input — and the fix",
      lens: "senior",
      md:
        "The raw SR latch has one illegal input: **S = R = 1** drives *both* outputs to 0, so Q and Q̄ are no longer complements — the abstraction breaks. Worse, if both inputs fall to 0 at the same instant, the loop **races** to a value decided by tiny, unrepeatable delay differences (a hardware coin flip). The cure is structural: derive S and R from a *single* data input D (`S = D`, `R = NOT D`) behind an **enable**, giving a **gated D latch** that has no forbidden state. This is why you rarely wire a bare SR latch in practice — you build up to D. The residual gremlin, **metastability** at the moment of capture, is tamed with synchronizer flip-flops (ch.6's real-world footnote, and a ch.22 concurrency echo).",
    },
    {
      kind: "prose",
      md:
        "## From latch to flip-flop: adding a clock\n" +
        "A gated D latch is **transparent**: while its enable is high, Q simply follows D — good, but dangerous, because a value can race through several latches in a single window. The fix that built modern computing is the **edge-triggered D flip-flop**: instead of a *level*, it captures D only at the **instant the clock rises**, and holds for the entire rest of the cycle. Flip modes in the sim and watch: wiggle D all you like between edges — Q ignores it — and only on the rising edge does Q snap to D. That discipline is what makes a machine **synchronous**: every stored bit updates together, on the tick, so signals have time to settle and never race.",
    },
    { kind: "quiz", quiz: "latch-predict" },
    {
      kind: "prose",
      md:
        "## Registers: holding a whole word\n" +
        "One flip-flop holds one bit. Line up eight of them, wire them to a shared **clock** and a shared **load** line, and you have an **8-bit register** — the fastest memory a CPU has, holding one word right next to the ALU. On each clock edge where load is 1, all eight bits capture their inputs at once; otherwise they hold. A CPU's handful of registers (its *register file*) is where the actual work happens; everything else in the memory system exists to feed them.",
    },
    {
      kind: "compare",
      a: "Latch (level)",
      b: "Flip-flop (edge)",
      rows: [
        ["Reacts to", "The enable's level (transparent while high)", "The clock's edge (an instant)"],
        ["While active", "Q continuously follows D", "Q samples D once, then holds"],
        ["Risk", "Data races through while open", "None — one capture per tick"],
        ["Role", "Building block; time-borrowing tricks", "The default state element of every CPU"],
      ],
    },
    {
      kind: "prose",
      md:
        "## RAM: naming a million bytes\n" +
        "A register holds *one* word. **RAM** holds millions — and it's built from exactly this idea plus one new part: an **address decoder**. RAM is an array of word-sized registers; to pick one, you feed an **n-bit address** to a decoder that raises exactly *one* of 2ⁿ word-lines (the mirror image of ch.5's multiplexer). That selected word is what you read or write. There is no searching — the address *is* the selection, which is why access is instant and order-independent. That's the **Random** in Random-Access Memory. Type an address in binary below and watch the decoder light one cell.",
    },
    { kind: "sim", sim: "ram-grid" },
    {
      kind: "callout",
      tone: "senior",
      title: "SRAM vs DRAM — and the address-width law",
      lens: "senior",
      md:
        "Two ways to store that bit, and the whole memory hierarchy falls out of the choice. **SRAM** is a genuine flip-flop — about **six transistors** per bit; fast and stable, but big and power-hungry, so it's used where speed rules: registers and CPU caches. **DRAM** cheats — **one transistor + one tiny capacitor** per bit; the charge *leaks*, so it must be **refreshed** thousands of times a second, but it's so much denser and cheaper that it became main memory. One capacitor per bit is why your machine has gigabytes of DRAM but only megabytes of SRAM cache. And the headline law from the sim: **capacity = 2ⁿ words** for n address wires — one more wire *doubles* your reach, which is exactly why a 32-bit address bus caps out at 4 GiB and why 64-bit had to happen.",
    },
    { kind: "figure", fig: "memory-hierarchy", caption: "Registers → L1 → L2 → L3 → RAM → SSD: each step out is bigger but farther, and latency grows like distance. Caches exist to keep the data you'll need next in the near, fast tiers." },
    {
      kind: "formal",
      title: "Formal corner — latch and flip-flop equations",
      md:
        "**SR latch** (cross-coupled NOR), computed from the previous outputs:\n" +
        "- Q = NOR(R, Q̄) ; Q̄ = NOR(S, Q)\n" +
        "- Characteristic table: (S,R) = (0,0) → hold · (1,0) → set Q=1 · (0,1) → reset Q=0 · (1,1) → forbidden\n" +
        "**Gated D latch**: Q⁺ = (enable ∧ D) ∨ (¬enable ∧ Q) — transparent when enable=1, holds when enable=0.\n" +
        "**D flip-flop**: Q⁺ = D sampled at the rising clock edge, else Q. The state advances only on ↑CLK.\n" +
        "**Register (N-bit)**: N D-flip-flops sharing CLK and load: Q⁺ = (load ∧ ↑CLK) ? D : Q, per bit.\n" +
        "**RAM**: read(addr) = cell[decode(addr)]; write(addr, v, we): if we, cell[decode(addr)] ← v. `decode` is a 1-of-2ⁿ demultiplexer.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where the ideal memory leaks",
      md:
        "The clean model hides real physics. **Setup and hold time**: D must be stable for a small window *around* the clock edge; violate it and the flip-flop can go **metastable** — hovering between 0 and 1 for an unpredictable time. **DRAM is volatile and leaky**: it forgets within milliseconds without refresh, and forgets entirely when powered off (persistence needs ch.24's storage). **The memory wall**: DRAM latency (~100 ns) has barely improved while CPUs raced ahead, so a cache miss can cost *hundreds* of wasted cycles — the reason the whole hierarchy in the figure exists, and a theme that returns in ch.8, ch.14 and ch.23.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You now have both halves of a computer: ch.5 gave you a circuit that **computes** (the ALU), and ch.6 gives you circuits that **remember** (registers and RAM). ch.7 wires them together and adds the missing third piece — **control**: a clock-driven loop that fetches an instruction from RAM, decodes it, drives the ALU, and stores the result back, over and over. That loop is a **CPU**, and once it exists you'll program it yourself to compute Fibonacci — the Part 2 boss.",
    },
  ],
  keyPoints: [
    "Memory is feedback — cross-couple two gates so each drives the other and the loop holds a value; ch.4's oscillation bug, tamed, becomes storage.",
    "SR latch — two cross-coupled NOR gates; S sets Q=1, R resets Q=0, S=R=0 holds, S=R=1 is forbidden.",
    "Gated D latch — one data input plus an enable; transparent when enabled (Q follows D), holds when not, and has no forbidden state.",
    "Latch vs flip-flop — a latch is level-sensitive (transparent while open); a flip-flop is edge-triggered (captures D only at the clock edge).",
    "The clock makes it synchronous — every flip-flop updates together on the edge, so combinational signals settle between ticks and never race.",
    "A register is — N flip-flops sharing a clock and a load line; the CPU's fastest storage, one word wide.",
    "RAM = registers + a decoder — an n-bit address raises 1 of 2ⁿ word-lines directly; no search, so access is O(1) and order-free (the 'Random' in RAM).",
    "Address width sets capacity — 2ⁿ words for n address wires; one more wire doubles it, which is why 32-bit caps at 4 GiB.",
    "SRAM vs DRAM — SRAM is a ~6-transistor flip-flop (fast, caches); DRAM is 1 transistor + capacitor (dense, leaky, must refresh, main memory).",
    "Memory hierarchy — registers→L1→L2→L3→RAM→SSD trade speed for size; latency grows like distance, which is why caches exist.",
  ],
  pitfalls: [
    {
      title: "The forbidden SR input",
      body: "S=R=1 doesn't mean 'both set' — it breaks the latch (both outputs 0) and races on release. Real designs derive S and R from one D input so the illegal case can't occur.",
      lens: "both",
    },
    {
      title: "Confusing a latch with a flip-flop",
      body: "A transparent latch passes D straight through while enabled — not the same as capturing on an edge. Use a level-latch where you needed an edge-flop and data races through several stages in a single clock.",
      lens: "senior",
    },
    {
      title: "Thinking RAM 'searches' for data",
      body: "It doesn't scan cells. The address decoder activates exactly one word-line directly, so access is O(1) and independent of address — that's what 'random access' means.",
      lens: "both",
    },
    {
      title: "Confusing capacity with address width",
      body: "Installing more memory chips does nothing if the address bus can't name them. 32 address bits = a 4 GiB ceiling no matter how much DRAM you solder on; capacity is 2^(address width).",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch6-1", "iv-ch6-2", "iv-ch6-3", "iv-ch6-4", "iv-ch6-5"],
  kataIds: [],
  seeAlso: ["ch4", "ch5", "ch7", "ch8", "ch23"],
  sources: [
    { title: "Flip-flop (electronics) — the Eccles–Jordan trigger, 1918 (Wikipedia)", url: "https://en.wikipedia.org/wiki/Flip-flop_(electronics)" },
    { title: "Crash Course Computer Science #6 — Registers and RAM", url: "https://www.youtube.com/watch?v=fpnE6UAfbtU" },
    { title: "Nand2Tetris — Project 3: Memory (sequential logic, registers, RAM)", url: "https://www.nand2tetris.org/project03" },
    { title: "Ben Eater — SR latch / building a flip-flop from NAND gates", url: "https://www.youtube.com/watch?v=KM0DdEaY5sY" },
    { title: "Colin Scott — Latency Numbers Every Programmer Should Know (interactive)", url: "https://colin-scott.github.io/personal_website/research/interactive_latency.html" },
  ],
};

// ---------------------------------------------------------------
// ch.7 — The CPU  (P2 HERO chapter, built in S4)
// ---------------------------------------------------------------
const ch7: Chapter = {
  id: "ch7",
  part: "p2",
  order: 9,
  title: "The CPU",
  tagline: "Wire the ALU and the registers to a clock-driven control loop, and the pile of circuits becomes a machine that runs your programs",
  readMins: { foundations: 25, senior: 40 },
  storyHook: {
    md:
      "21 June 1948, a laboratory at the University of Manchester. A refrigerator-sized machine nicknamed **“Baby”** grinds through 3.5 million operations over 52 minutes and prints an answer: 131,072, the largest proper factor of 262,144. Trivial arithmetic — but Baby had just done something no machine ever had: it ran a **program stored in its own memory**, the very same electronic memory that held its data. Tom Kilburn's 17-instruction program could be *changed by loading different numbers*, not by rewiring the machine. That is the whole idea of a computer, and it is barely 75 years old. (Baby had no divide instruction, so Kilburn's program divided by **repeated subtraction** — the exact trick you'll use to *multiply* on the CPU in this chapter.) Every processor since, from that room to the phone in your pocket, runs the same loop Baby ran: fetch an instruction, decode it, execute it, repeat.",
  },
  assumes: [
    {
      chapterId: "ch5",
      oneLiner: "You have an ALU — a circuit that computes ADD/SUB/AND/OR and sets Z/N/C/V flags — built from ch.4's gates.",
    },
    {
      chapterId: "ch6",
      oneLiner: "You have memory — registers (fast, one word, next to the ALU) and RAM (an address decoder over an array of registers), all clocked so they change only on the tick.",
    },
  ],
  mentalModel:
    "A CPU is the ALU (compute) and the registers/RAM (remember) joined by a third thing — control: a clock-driven loop that fetches the byte the Program Counter points at, decodes its opcode, and drives the datapath to execute it, then repeats. Instructions live in the same RAM as data (stored-program), so a program is just bytes. Loops are backward jumps; ifs are conditional jumps that read the flags. Redraw the loop — PC → fetch into IR → decode → execute → PC++ — and you've drawn every computer.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Gates (ch.4) → adders & the ALU (ch.5) → registers & RAM (ch.6) → **you are here: the CPU**. You already hold both halves of a computer: a circuit that *computes* (the ALU) and circuits that *remember* (registers and RAM). What's missing is the piece that makes them *do* something on their own: **control** — a clock-driven loop that reads instructions out of memory and drives the ALU and registers to carry them out. Add that loop and the heap of circuits becomes a **processor** that runs programs. This is the chapter where everything so far clicks into one running machine — and then you program it yourself.",
    },
    {
      kind: "prose",
      md:
        "## A program is just bytes\n" +
        "Here is the leap. The ALU and registers can perform *one* operation if you set the right control lines by hand. A CPU makes those control lines come from **memory**: you store a numbered list of instructions in RAM, keep a **Program Counter (PC)** pointing at the next one, and let the machine fetch and obey them in order. Crucially, those instructions sit in the *same* RAM as the data — an instruction is only a byte, and a program is only a sequence of bytes you can load, change, or even generate. That is the **stored-program** (von Neumann) idea, sketched in 1945, and it's why one machine can run a spreadsheet now and a game later: you don't rebuild it, you load different bytes. The diagram below is the hardware those bytes flow through — step through it once before you meet the full emulator.",
    },
    { kind: "figure", fig: "datapath", caption: "One instruction (ADD) as a sequence of register transfers. Fetch is identical for every instruction; the execute steps are chosen by the opcode. The glowing bus shows where the byte is moving this micro-step." },
    {
      kind: "prose",
      md:
        "## The loop that never stops\n" +
        "Every CPU runs one loop, forever. **Fetch:** copy the address in the PC onto the address bus, read the instruction byte it points at into the **Instruction Register (IR)**, and bump the PC to the next byte. **Decode:** the control unit reads the instruction's opcode and works out what it means. **Execute:** it carries the instruction out — load a value, drive the ALU, store a result, or, for a jump, load a new address into the PC. Then it fetches again. There is no cleverness anywhere in this loop: the processor cannot see your program, only the one byte it is fetching right now. The appearance of intelligence is built entirely from doing something utterly mechanical a few billion times a second.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "The control unit and the clock — where the loop actually lives",
      lens: "senior",
      md:
        "That loop is *sequenced* by the **control unit** against the ch.6 **clock**. Each instruction is a fixed series of **micro-steps** (T-states); on every clock edge the control unit asserts a specific set of control lines — *output PC to the bus*, *load the IR*, *ALU add*, *load A* — that gate exactly one register transfer. The fetch micro-steps are identical for every instruction; the execute micro-steps are selected by the decoded opcode. In a simple CPU this sequencing is **hardwired** combinational logic; in a big ISA like x86 it's stored as **microcode** — tiny programs inside the processor that expand each instruction into micro-ops. Either way the clock period must clear the slowest transfer (ch.6's critical path), which is what a clock speed *is*. Single-step the emulator and each click advances exactly one T-state.",
    },
    { kind: "sim", sim: "cpu-8bit" },
    {
      kind: "prose",
      md:
        "## Speaking the machine's language\n" +
        "What can you actually say to this CPU? Exactly the instructions its hardware was built to decode — its **instruction set architecture (ISA)**. Ours is deliberately tiny: **one byte per instruction**, split into a 4-bit **opcode** (which of 16 operations) and a 4-bit **operand** (a RAM address, or a small immediate number). There are two working registers: **A**, the *accumulator*, where results accumulate, and **B**, the ALU's second input — plus the PC, the IR, and the flags. `LDA 14` means “load A from RAM cell 14”; the assembler turns that human-readable line into the byte `0x1E` that actually sits in memory. Assembly *is* the ISA — the same bytes, written for people instead of for the decoder.",
    },
    {
      kind: "table",
      caption: "The full instruction set. Opcode = the high nibble, operand = the low nibble. Only the ALU ops (and CMP) touch the flags.",
      head: ["Opcode", "Instruction", "Operand", "What it does"],
      rows: [
        ["0x0", "NOP", "—", "do nothing for one cycle"],
        ["0x1", "LDA a", "address", "A ← RAM[a]"],
        ["0x2", "LDI n", "0–15", "A ← n (the operand itself)"],
        ["0x3", "STA a", "address", "RAM[a] ← A"],
        ["0x4", "ADD a", "address", "A ← A + RAM[a] · sets Z/N/C/V"],
        ["0x5", "SUB a", "address", "A ← A − RAM[a] · sets Z/N/C/V"],
        ["0x6", "AND a", "address", "A ← A AND RAM[a] · sets Z/N"],
        ["0x7", "OR a", "address", "A ← A OR RAM[a] · sets Z/N"],
        ["0x8", "JMP a", "address", "PC ← a (always)"],
        ["0x9", "JZ a", "address", "PC ← a if Z (last result was 0)"],
        ["0xA", "JNZ a", "address", "PC ← a if not Z"],
        ["0xB", "JC a", "address", "PC ← a if C (carry out of the top bit)"],
        ["0xC", "JN a", "address", "PC ← a if N (result negative)"],
        ["0xD", "CMP a", "address", "flags ← A − RAM[a] (A unchanged)"],
        ["0xE", "OUT", "—", "print A to the output log"],
        ["0xF", "HLT", "—", "stop the clock"],
      ],
    },
    {
      kind: "prose",
      md:
        "## From instructions to programs\n" +
        "A straight run of instructions is a calculator. Two more ideas make it a computer. First, **loops**: a `JMP` can point *backward*, so the CPU re-runs earlier instructions — that is every loop you have ever written. Second, **decisions**: the ALU and compare instructions leave **flags** behind (Z if the result was zero, N if negative, C on carry, V on signed overflow), and *conditional* jumps like `JZ`/`JNZ`/`JC` read those flags to decide whether to jump. An `if` is a compare followed by a conditional jump; a `while` is that plus a backward `JMP`. All of control flow — every branch and loop in every language — compiles down to *conditionally changing what the PC points at next*. Predict where the registers land:",
    },
    { kind: "quiz", quiz: "register-predict" },
    {
      kind: "prose",
      md:
        "## Building what the hardware lacks\n" +
        "Notice what is *not* in that instruction set: no multiply, no divide. That's fine — you build them. To compute 3 × 4, add 3 to a running total four times; a loop and a counter do it. This isn't a toy limitation: the Manchester **Baby** from this chapter's story had no divide instruction either, so its very first program divided by repeated subtraction — exactly this move. It is the deepest pattern in computing: a small set of primitive operations, composed by control flow, reaches everything computable (a claim ch.20 will make precise). Load the **Multiply** preset and watch a multiplication happen out of nothing but adds and a loop.",
    },
    {
      kind: "callout",
      tone: "tip",
      title: "Drive it yourself",
      md:
        "In the emulator, load **Add two numbers** and single-step it: watch B *latch* the operand before the ALU fires, while A holds the running value. Then try **Count down** (a backward `JNZ` loop that stops when SUB makes Z), **Multiply 3 × 4** (a multiply with no multiply instruction), and finally **Fibonacci** — the boss. Use *step* to crawl one micro-step at a time, *step instruction* to move a whole fetch-decode-execute at once, or *play* to watch the datapath animate.",
    },
    {
      kind: "compare",
      a: "Von Neumann (our CPU)",
      b: "Harvard",
      rows: [
        ["Memory", "One RAM holds code and data together", "Separate instruction and data memories"],
        ["Buses", "Shared — one path (the von Neumann bottleneck)", "Independent — fetch an instruction and a datum at once"],
        ["Consequence", "Code is data: load or generate programs at runtime", "Program memory is often fixed / read-only"],
        ["Where you meet it", "The programmer's model of almost every CPU", "Microcontrollers — and inside chips as split L1 caches"],
      ],
    },
    {
      kind: "prose",
      md:
        "## The boss: make it compute Fibonacci\n" +
        "Time to earn the badge. Fibonacci — 1, 1, 2, 3, 5, 8, … — needs everything you now have: two variables in RAM, an `ADD`, a shuffle, and a backward `JMP`. Keep the two most recent terms, print one each pass, compute their sum, shift them along, repeat. Watch it climb… and then watch 8 bits betray it: after 233, the next term is 144 + 233 = **377**, which does not fit in a byte — it wraps to **121** and raises the carry flag **C**, the unsigned “it didn't fit” signal (and, since 144 and 233 both have their top bit set, the signed-overflow flag **V** lights up too — ch.5's two flags, disagreeing in real time). The largest Fibonacci number that fits in 8 bits is 233, and your CPU discovers that the hard way. That overflow is not a bug in the emulator; it's the exact ch.1 lesson, now unfolding inside a register you built from gates. Open **boss mode**, write it, and claim *Machine Whisperer*.",
    },
    {
      kind: "formal",
      title: "Formal corner — the machine as a state transition",
      md:
        "**Machine state** `S = (RAM[0..15], PC, IR, A, B, flags{Z,N,C,V}, OUT)`.\n" +
        "**Encoding**: a byte is `opcode·16 + operand`; the decoder reads `opcode = byte ≫ 4`, `operand = byte ∧ 0xF`.\n" +
        "**The instruction cycle as register transfers (RTL):**\n" +
        "- Fetch:  `MAR ← PC ; IR ← RAM[MAR] ; PC ← (PC + 1) mod 16`\n" +
        "- Decode: `control ← opcode(IR)`\n" +
        "- Execute `ADD a`:  `MAR ← operand(IR) ; B ← RAM[MAR] ; A ← (A + B) mod 256 ; flags ← f(A, carry)`\n" +
        "- Execute `JZ a`:  `if Z then PC ← operand(IR)` (else PC already points at the next byte)\n" +
        "One CPU step is a **total function** `next : S → S`; running the machine is iterating `next` until `HLT`. That's a finite-state description of computation — ch.20 replaces the fixed 16-byte RAM with an unbounded tape (a Turing machine) and asks what a machine can compute *in principle*.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where this model simplifies",
      md:
        "The ISA is honest but small. It has **no subroutines or stack** — ch.10 adds `CALL`/`RET` and the call stack that makes functions and recursion possible; **no interrupts** — ch.22 adds the mechanism that lets I/O and the OS seize the CPU; and its **4-bit operands** cap RAM at 16 bytes and immediates at 15 (real ISAs use multi-byte instructions). It also runs **one instruction fully before the next**, whereas real CPUs **pipeline** and **cache** for speed (ch.8). What *is* real and carries all the way up: the fetch–decode–execute loop, the register/ALU/flags datapath, stored-program memory, and the fact that every piece of software you will ever run bottoms out in exactly this.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You've closed the loop: gates became an ALU (ch.5), the ALU and registers became a datapath (ch.6), and a clock-driven control loop just turned that datapath into a **computer** that runs stored programs. Two directions open from here. **Faster:** ch.8 asks why real CPUs don't run one instruction at a time — pipelines, caches, branch prediction — and ch.9 turns to GPUs. **Higher:** you just wrote raw machine code by hand; ch.10 rides the abstraction elevator from assembly up to real languages (with functions, a call stack, and recursion), and ch.11 builds the compiler that gets you there. The machine is finished. Now we learn to talk to it.",
    },
  ],
  keyPoints: [
    "A CPU is the third piece — the ALU computes (ch.5) and registers/RAM remember (ch.6); the CPU adds control, a clock-driven fetch–decode–execute loop that turns them into a machine that runs programs.",
    "Stored-program (von Neumann) — instructions and data share the same RAM, so a program is just bytes; that's why one machine runs any program by loading different bytes.",
    "Fetch–decode–execute — the CPU repeats forever: fetch the byte at PC into IR (and PC++), decode the opcode, execute it on the datapath — each step dumb and mechanical, billions of times a second.",
    "Registers are the CPU's own storage — PC (which instruction is next), IR (the current one), A/B (the ALU's operands), flags (Z/N/C/V): flip-flops right next to the ALU, far faster than RAM.",
    "The ISA is the contract — the fixed set of opcode+operand encodings the hardware decodes; assembly is its human-readable form, and every higher-level language ultimately compiles down to it.",
    "A loop is a backward jump; an if is a conditional jump — control flow is just conditionally changing what the PC points at next, decided by the flags an ALU op left behind.",
    "You build what the hardware lacks — with only add and subtract you make multiply (repeated adding) and more; the Manchester Baby did division by repeated subtraction the same way.",
    "Each instruction is several micro-steps — T-states, single register transfers sequenced by the control unit against the clock; fetch is the same for every instruction, execute varies by opcode.",
    "Overflow doesn't vanish in a CPU — 8-bit Fibonacci climbs to 233, then 144+233 = 377 wraps to 121 and sets the carry flag: the ch.1 lesson, now happening inside a register.",
  ],
  pitfalls: [
    {
      title: "Thinking the CPU 'understands' the program",
      body: "It doesn't. It blindly fetches the next numbered byte and performs the one tiny operation that byte encodes. All meaning lives in the programmer's head and the ISA definition — never in the silicon, which is just gates switching.",
      lens: "both",
    },
    {
      title: "Forgetting the PC already moved on",
      body: "Fetch increments the PC before execute runs, so by the time a jump executes the PC has already advanced. Mis-modeling when the PC increments is the source of 'why did it skip / repeat an instruction?' confusion. A jump overwrites the already-bumped PC.",
      lens: "both",
    },
    {
      title: "Assuming code and data are different kinds of thing",
      body: "In a von Neumann machine they're the same bytes in the same RAM. Point the PC at data and the CPU will happily 'execute' it as instructions — usually garbage, sometimes a security exploit (this is the root of whole classes of attacks in ch.32).",
      lens: "senior",
    },
    {
      title: "Expecting a plain load to set flags",
      body: "Only the ALU ops (ADD/SUB/AND/OR) and CMP update Z/N/C/V; LDA/LDI/STA leave the flags untouched. So a JZ tests the result of the last ALU op, not the last value you loaded — a classic assembly bug.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch7-1", "iv-ch7-2", "iv-ch7-3", "iv-ch7-4", "iv-ch7-5"],
  kataIds: [],
  seeAlso: ["ch5", "ch6", "ch8", "ch10", "ch11"],
  sources: [
    { title: "Manchester Baby (Small-Scale Experimental Machine) — first stored-program computer, 21 June 1948 (Wikipedia)", url: "https://en.wikipedia.org/wiki/Manchester_Baby" },
    { title: "Von Neumann architecture — the stored-program idea (Wikipedia)", url: "https://en.wikipedia.org/wiki/Von_Neumann_architecture" },
    { title: "Crash Course Computer Science #7 — The Central Processing Unit (CPU)", url: "https://www.youtube.com/watch?v=FZGugFqdr60" },
    { title: "Nand2Tetris — Project 5: Computer Architecture (build a CPU from an ALU + memory)", url: "https://www.nand2tetris.org/project05" },
    { title: "Ben Eater — Building an 8-bit breadboard computer (the SAP-1 lineage this CPU follows)", url: "https://eater.net/8bit" },
  ],
};

// ---------------------------------------------------------------
// ch.8 — Fast CPUs  (built in S5)
// ---------------------------------------------------------------
const ch8: Chapter = {
  id: "ch8",
  part: "p2",
  order: 10,
  title: "Fast CPUs",
  tagline: "The ch.7 loop can't just be clocked faster — so real CPUs overlap it, cache around it, predict past it, and finally replicate it",
  readMins: { foundations: 22, senior: 38 },
  storyHook: {
    md:
      "For thirty years the recipe for a faster computer was simple: wait for a faster clock. In 2000, Intel's roadmap pointed all the way to **10 GHz**, and its NetBurst design traded everything for frequency. Then physics sent the bill. The Pentium 4's successor, **Tejas**, was designed to scream past 7 GHz — but an early 90 nm sample drew a blistering **150 watts at just 2.8 GHz**, and there was no way to cool the real thing. On **7 May 2004**, Intel cancelled Tejas outright and pivoted the entire company to putting *more cores* on a chip instead of *more gigahertz* in a core. The megahertz race was over; the clock has barely moved past ~5 GHz in the two decades since. Every trick in this chapter — pipelining, caching, prediction, multicore — is what \"faster\" had to mean once you could no longer just turn up the speed.",
  },
  assumes: [
    {
      chapterId: "ch7",
      oneLiner: "You have a working CPU: it runs the fetch–decode–execute loop, one instruction fully before the next, driven by a clock.",
    },
    {
      chapterId: "ch6",
      oneLiner: "You know registers are tiny and instant while RAM is a large, slower array — the seed of the memory hierarchy this chapter leans on.",
    },
  ],
  mentalModel:
    "A fast CPU is the ch.7 loop, three tricks deep. Pipeline it: overlap fetch/decode/execute so ~1 instruction finishes per cycle even though each still takes 5 steps (throughput, not latency). Cache around it: keep hot data in tiny fast memory because DRAM is ~100× slower than the core (the memory wall). Predict past it: guess each branch and speculate ahead to keep the pipeline full. When one core can't clock higher (the power wall), replicate it — many cores — and pay Amdahl's tax. Redraw the picture: one instruction stream flowing diagonally through 5 stages, a bubble when data isn't ready, a flush when a guess was wrong.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Gates (ch.4) → ALU (ch.5) → registers & RAM (ch.6) → a CPU (ch.7) → **you are here: making it fast**. The machine you built in ch.7 is *correct* but slow in two specific ways. First, it runs **one instruction all the way through before starting the next** — while the ALU works, the fetch and decode hardware sit idle. Second, the obvious fix — *run the clock faster* — is exactly the door 2004 slammed shut. So this chapter is about getting more work out of each tick and out of many cores at once, without a faster tick. It's the gap between your ch.7 emulator and the chip you're reading this on: same instruction set, ~1000× the performance, entirely from the tricks below.",
    },
    {
      kind: "prose",
      md:
        "## The wall the story hit\n" +
        "Why not just crank the gigahertz? Because of **Dennard scaling** and its end. For decades, shrinking transistors let each one switch faster *and* use proportionally less power, so clocks could rise for free. Around **2005–2006** that bargain broke: leakage current stopped shrinking, so pushing frequency up meant power (and heat) climbing roughly with the **cube** of the effort — the **power wall** Tejas smashed into. Clocks flatlined near 4–5 GHz. Note what did *not* stop: **Moore's law** — the transistor *count* — kept roughly doubling. Chips got more transistors that couldn't all run faster, only *wider* and *more numerous*. That single divergence is the reason for everything that follows.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Moore's law is not Dennard scaling — the confusion behind a decade of bad predictions",
      lens: "senior",
      md:
        "Two different laws get mashed into \"Moore's law.\" **Moore's law** (1965) is about *density*: transistors per chip double roughly every ~2 years. It is still limping along. **Dennard scaling** (1974) is about *power*: as transistors shrink, power per unit area stays constant, so you can raise frequency for free. It **died around 2005**. The popular belief that \"computers double in speed every 18 months\" conflated the two — and when Dennard scaling ended, single-thread speed stalled even as transistor counts kept climbing. Those extra transistors had to go *somewhere*: bigger caches, more execution units, and above all **more cores**. Multicore isn't a triumph; it's the industry's forced move after it could no longer sell you free frequency.",
    },
    {
      kind: "prose",
      md:
        "## Trick 1 — pipelining: an assembly line for instructions\n" +
        "Think of doing laundry in four stages — wash, dry, fold, put away. If you run one full load start-to-finish before touching the next, four loads take forever and three machines sit idle at any moment. Obviously you *overlap*: while load 1 dries, load 2 washes. A CPU does the same with the instruction cycle, split into stages — classically five: **IF** (fetch), **ID** (decode + read registers), **EX** (ALU), **MEM** (memory access), **WB** (write back). Run them overlapped and, in the steady state, **one instruction finishes every cycle** even though each still takes five cycles end to end. That's the single biggest speed trick in the CPU, and it costs no extra clock speed — only cleverer control. Step an instruction stream through the pipeline and watch the diagonal fill:",
    },
    { kind: "sim", sim: "pipeline-visualizer" },
    {
      kind: "prose",
      md:
        "## Why pipelines stall: hazards\n" +
        "Overlap only works when the instructions are independent — and real code isn't. Three **hazards** get in the way. A **data hazard**: an instruction needs a result the one just ahead hasn't produced yet (run the *dependency chain* preset with forwarding **off** and watch the bubbles). The fix is **forwarding** (a.k.a. bypassing) — wire a freshly computed result straight from one stage's output back into the ALU's input instead of waiting for it to reach the register file; flip forwarding **on** and most bubbles vanish. The one it can't remove is the **load-use** hazard: a value coming from memory simply isn't ready in time, costing exactly one bubble. A **control hazard** is a branch: until it's resolved the CPU doesn't know which instruction to fetch next, so a wrong guess **flushes** the wrongly-fetched instructions (the *taken branch* preset). A **structural hazard** is two instructions wanting the same hardware at once. Pipelining's whole engineering game is keeping these bubbles rare.",
    },
    {
      kind: "table",
      caption: "The three pipeline hazards and how real CPUs hide them. Every one of these is visible in the pipeline-visualizer.",
      head: ["Hazard", "The problem", "Typical fix"],
      rows: [
        ["Data (RAW)", "An instruction needs a result still in flight", "Forwarding/bypass; stall only for the load-use case"],
        ["Control", "A branch's direction is unknown when the next fetch must happen", "Branch prediction + speculation; flush on a mispredict"],
        ["Structural", "Two instructions need the same unit in one cycle", "Duplicate the unit; split instruction/data caches"],
      ],
    },
    {
      kind: "prose",
      md:
        "## Trick 1½ — predicting the future\n" +
        "A branch is a problem because the pipeline wants to fetch the *next* instruction now, but a conditional branch's direction isn't known until it reaches EX — several cycles later. Stalling every branch would be ruinous; branches are ~1 in 5 instructions. So the CPU **guesses** and runs ahead **speculatively**, throwing the work away if it guessed wrong. Guessing at random is 50/50; real predictors do far better by learning each branch's *history*. The workhorse is the **2-bit saturating counter**: it only flips its prediction after being wrong **twice**, so the single not-taken at the end of a heavily-taken loop costs just one misprediction instead of two. Step through one:",
    },
    { kind: "figure", fig: "branch-predictor", caption: "A 2-bit predictor riding a loop that runs, exits once, then runs again. The lone exit only weakens the counter — the very next iteration is still predicted taken. Modern predictors reach >95% accuracy on real code." },
    {
      kind: "callout",
      tone: "senior",
      title: "Superscalar, out-of-order, and the security bill for speculation",
      lens: "senior",
      md:
        "Pipelining issues at most one instruction per cycle; **superscalar** CPUs have *several* pipelines and issue 4–8 per cycle. **Out-of-order execution** lets an instruction whose inputs are ready run before an earlier stalled one (results are *retired* back in order so the program's semantics hold — the ch.7 contract). Both need aggressive **branch prediction + speculation** to find enough independent work. The catch surfaced publicly in 2018: **Spectre** and **Meltdown** showed that speculatively-executed instructions, even when their results are discarded, leave footprints in the **cache** that an attacker can measure to read memory they shouldn't — a microarchitectural side channel born entirely of these performance tricks (ch.32). Speed and security are in genuine tension here, and the mitigations cost real performance.",
    },
    {
      kind: "prose",
      md:
        "## Trick 2 — caching: beating the memory wall\n" +
        "Here is the number that shapes modern computers: a CPU core runs at well under a nanosecond per cycle, but reading a byte from **DRAM takes ~50–100 ns** — **hundreds of cycles** of the core doing nothing. That gap is the **memory wall**, and it grew as cores sped up while DRAM barely did. The fix is a **cache**: a small, fast memory that sits between the core and DRAM and keeps recently- and soon-to-be-used data close. It works only because programs have **locality**: **temporal** (you tend to reuse the same data soon) and **spatial** (you tend to use data near what you just used). Caches are stacked in levels — a tiny, ~1 ns **L1**, a bigger ~4 ns **L2**, a large shared ~15 ns **L3** — each a compromise between speed and size.",
    },
    {
      kind: "prose",
      md:
        "## How a cache decides hit or miss\n" +
        "A **direct-mapped** cache is the simplest design: memory is divided into fixed-size **lines** (a line holds several neighbouring bytes — that's how it cashes in on *spatial* locality), and each line of memory maps to exactly **one** slot in the cache, chosen by some of its address bits. Ask for an address: if the mapped slot holds that line, it's a **hit** (fast); if not, a **miss** — fetch the whole line from the next level and evict whatever was there. Walk different access patterns through the cache below and watch the hit rate swing. Crank the **line size** and see sequential access soar (each miss drags in the next few elements for free) while strided and random access stay cold:",
    },
    { kind: "sim", sim: "cache-sim" },
    {
      kind: "table",
      caption: "The memory hierarchy, order-of-magnitude. Each level trades size for speed; the jump from L3 to DRAM is the cliff caches exist to hide. (SSD/HDD from ch.24, shown for scale.)",
      head: ["Level", "Typical size", "~Latency (cycles)", "~Latency (time)"],
      rows: [
        ["Register", "~dozens of bytes", "0", "instant"],
        ["L1 cache", "32–64 KB per core", "~4", "~1 ns"],
        ["L2 cache", "256 KB–1 MB", "~12", "~4 ns"],
        ["L3 cache", "8–32 MB shared", "~40", "~15 ns"],
        ["DRAM", "8–128 GB", "~200+", "~50–100 ns"],
        ["SSD / HDD", "TBs", "~10⁵ / 10⁷", "~100 µs / ~10 ms"],
      ],
    },
    { kind: "quiz", quiz: "pattern-race" },
    {
      kind: "callout",
      tone: "senior",
      title: "What cache-sim simplifies",
      lens: "senior",
      md:
        "Real caches add three things our direct-mapped model skips. **Associativity:** a set-associative cache lets a line live in any of N slots in its set, cutting the *conflict* misses that make our strided pattern thrash — with a **replacement policy** (approx-LRU) to choose the victim. **Write policy:** write-back + write-allocate vs write-through, and the dirty-bit bookkeeping to know what must be flushed. **Prefetching:** hardware spots sequential/strided patterns and fetches lines *before* you ask, which is why real sequential access is even faster than compulsory misses suggest. The mental model — lines, locality, hit/miss, the eviction that punishes bad access patterns — is exactly right; production caches just play it with more finesse.",
    },
    { kind: "figure", fig: "memory-hierarchy", caption: "The same hierarchy as distance: if an L1 hit were one heartbeat away, DRAM would be a cross-town errand and the SSD a trip to another continent. Locality is what keeps you local." },
    {
      kind: "prose",
      md:
        "## Trick 3 — when one core isn't enough: parallelism\n" +
        "Pipelining, superscalar issue and caches all squeeze more out of **one** instruction stream — *instruction-level parallelism* — but there's a ceiling to how much independent work a single stream contains. So the post-2005 answer, forced by the power wall, was blunt: put **many cores** on the chip and run multiple streams at once (*thread-level parallelism*). It's not free speed, for two reasons. Cores must **share memory coherently** (a whole discipline, ch.25), and — more fundamentally — **Amdahl's law**: if a fraction of your program is inherently serial, that fraction caps your speedup no matter how many cores you add. A job that's 95% parallel maxes out at **20×** even on infinite cores, because the last 5% can't be split. This is the doorway to ch.9: a GPU takes thread-level parallelism to the extreme — *thousands* of small cores — and wins big precisely on the workloads Amdahl smiles on.",
    },
    {
      kind: "compare",
      a: "Make one core faster (ILP)",
      b: "Add more cores (TLP)",
      rows: [
        ["The lever", "Pipeline, superscalar, out-of-order, prediction, bigger caches", "Replicate the whole core; run many threads"],
        ["Helps", "Every program, transparently — no code changes", "Only code that can be split into independent work"],
        ["Ceiling", "Limited instruction-level parallelism in one stream", "Amdahl's law — the serial fraction caps it"],
        ["The catch", "Power wall; diminishing returns; speculation's security cost", "Hard to program: races, locks, deadlock (ch.25)"],
      ],
    },
    {
      kind: "formal",
      title: "Formal corner — the two speedup laws of this chapter",
      lens: "senior",
      md:
        "**Pipeline throughput.** With a k-stage pipeline running n instructions, ideal time is (k + n − 1) cycles versus k·n unpipelined; as n → ∞ the speedup → **k**, i.e. one instruction retired per cycle (**CPI → 1**). Real CPI = 1 + stalls-per-instruction, so hazards are exactly the gap from the ideal.\n" +
        "**Amdahl's law.** If fraction p of the work is parallelizable across s processors, overall speedup is\n" +
        "  `S(s) = 1 / ( (1 − p) + p/s )`.\n" +
        "As s → ∞, `S → 1/(1 − p)` — the serial part is the hard ceiling. p = 0.95 ⇒ max 20×; p = 0.99 ⇒ max 100×. (Gustafson's law offers the optimistic counterpoint: if bigger machines let you solve *bigger* problems, the parallel part grows and the serial fraction shrinks.)",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where this model simplifies",
      md:
        "Our pipeline is the classic 5 stages; real ones run **14–20+** stages (deeper = higher clock but costlier flushes). Real chips are **superscalar and out-of-order** with dozens of instructions in flight, several cache levels with prefetchers, multiple memory channels, and on big systems **NUMA** (memory that's faster for the core nearest it). And the predictors are far cleverer than one 2-bit counter (tournament, TAGE, neural). But every one of these is a *performance* trick layered on the ch.7 semantics: the observable result must still match running one instruction at a time. That invariant is the contract; speed is what you buy without breaking it.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You've made a single core fast — pipelined, cached, speculative — and then hit the ceiling of one stream and stepped sideways to many cores. **ch.9** takes that last idea to its limit: the **GPU**, a chip that throws away single-thread cleverness in exchange for *thousands* of simple lanes, and wins enormously on the embarrassingly-parallel work of drawing pixels — and, it turns out, training neural networks. That chapter closes Part 2: from a single electron through a switch, to gates, to a CPU, to a parallel supercomputer on a card. Then Part 3 finally lets us stop writing raw machine code and start talking to the machine in a language.",
    },
  ],
  keyPoints: [
    "Pipelining overlaps stages — while one instruction executes, the next decodes and a third is fetched, so a 5-stage pipeline approaches one finished instruction per cycle with no faster clock (throughput, not latency).",
    "The clock hit a power wall — the end of Dennard scaling (~2005) made higher frequency mean unsustainable heat, so speeds plateaued near 4–5 GHz and progress shifted to more work per cycle and more cores.",
    "Hazards are what stall a pipeline — data hazards (a needed result isn't ready), control hazards (branches), and structural hazards; forwarding and branch prediction hide most, but load-use always costs a bubble.",
    "Branch prediction lets the CPU speculate — it guesses each branch and runs ahead; a 2-bit saturating counter tolerates the odd anomaly, and a wrong guess costs a pipeline flush.",
    "The memory wall — DRAM is ~100× slower than the core, so caches (L1/L2/L3) keep hot data close; they pay off only because programs have temporal and spatial locality.",
    "Moore's law ≠ Dennard scaling — transistor counts kept doubling (Moore) after per-transistor power stopped shrinking (Dennard died ~2005); that divergence is the whole reason for multicore.",
    "More cores isn't free speed — Amdahl's law caps speedup by the serial fraction, so a 95%-parallel job maxes out at 20× no matter how many cores you add.",
  ],
  pitfalls: [
    {
      title: "Judging a CPU by gigahertz alone",
      body: "Clock speed is one factor among many. Instructions-per-cycle (pipelining, superscalar width), cache behaviour, and memory latency often matter more — a 3 GHz chip with a better microarchitecture routinely beats a 4 GHz one. Since ~2005 the interesting gains have been everywhere *except* the clock.",
      lens: "both",
    },
    {
      title: "Confusing latency and throughput",
      body: "Pipelining does not make a single instruction finish sooner — its latency is unchanged or slightly worse. It makes instructions finish more *often* (higher throughput). Deep pipelines even trade worse per-instruction latency (and costly flushes) for a higher clock. Know which one your problem cares about.",
      lens: "both",
    },
    {
      title: "Treating the cache as free, not just automatic",
      body: "The cache is managed for you, but it is not free: cache-hostile access — random lookups, pointer-chasing linked lists, column-major traversal of a row-major array — can run 10–100× slower than the identical work laid out for locality. Data layout and access order are performance decisions, not just correctness ones.",
      lens: "senior",
    },
    {
      title: "Forgetting speculation is observable",
      body: "Speculatively executed instructions whose results are discarded still change microarchitectural state — notably which lines are in the cache. Spectre/Meltdown weaponised exactly that to read protected memory. 'It was rolled back' is not the same as 'it left no trace' (ch.32).",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch8-1", "iv-ch8-2", "iv-ch8-3", "iv-ch8-4", "iv-ch8-5"],
  kataIds: [],
  seeAlso: ["ch6", "ch7", "ch9", "ch23", "ch25"],
  sources: [
    { title: "Patterson & Hennessy — Computer Organization and Design (pipelining, hazards, caches, Amdahl's law)", url: "https://www.elsevier.com/books/computer-organization-and-design-risc-v-edition/patterson/978-0-12-820331-6" },
    { title: "Instruction pipelining (Wikipedia)", url: "https://en.wikipedia.org/wiki/Instruction_pipelining" },
    { title: "CPU cache & the memory hierarchy (Wikipedia)", url: "https://en.wikipedia.org/wiki/CPU_cache" },
    { title: "Branch predictor — including the 2-bit saturating counter (Wikipedia)", url: "https://en.wikipedia.org/wiki/Branch_predictor" },
    { title: "Dennard scaling — the power wall and the end of free frequency (Wikipedia)", url: "https://en.wikipedia.org/wiki/Dennard_scaling" },
    { title: "Ulrich Drepper — What Every Programmer Should Know About Memory (LWN)", url: "https://lwn.net/Articles/250967/" },
    { title: "Tejas and Jayhawk — Intel's cancelled ~10 GHz successor (Wikipedia)", url: "https://en.wikipedia.org/wiki/Tejas_and_Jayhawk" },
  ],
};

// ---------------------------------------------------------------
// ch.9 — GPUs & parallel hardware  (built in S5 — closes Part 2)
// ---------------------------------------------------------------
const ch9: Chapter = {
  id: "ch9",
  part: "p2",
  order: 11,
  title: "GPUs & parallel hardware",
  tagline: "The opposite bet from a CPU — throw away single-thread cleverness for thousands of simple lanes — and why that turned the graphics card into the engine of AI",
  readMins: { foundations: 15, senior: 25 },
  storyHook: {
    md:
      "September 2012, the ImageNet competition. A neural network called **AlexNet** doesn't just win — it demolishes the field, halving the error rate of every hand-engineered rival and igniting the deep-learning era. Its secret weapon wasn't a new algorithm so much as *hardware*: the authors trained it on **two ordinary NVIDIA GTX 580 gaming GPUs** in a bedroom, doing in days what would have taken a CPU cluster weeks. The chips built to draw video-game explosions turned out to be almost perfect engines for the mathematics of learning. That is the twist this chapter explains: the GPU was designed for one job — turning triangles into millions of pixels, fast — and that job happens to have the *exact same shape* as training a neural network. Both are enormous piles of the same simple arithmetic, all independent, all at once.",
  },
  assumes: [
    {
      chapterId: "ch8",
      oneLiner: "You know a CPU spends transistors on making one instruction stream fast — pipelines, caches, prediction — and that Amdahl's law rewards parallel work.",
    },
    {
      chapterId: "ch5",
      oneLiner: "You know the ALU does one arithmetic op on one pair of numbers; a GPU is, in essence, thousands of ALUs driven together.",
    },
  ],
  mentalModel:
    "A GPU is the opposite bet from a CPU. The CPU spends its transistors making one instruction stream finish fast — big caches, out-of-order, prediction. The GPU spends them on width: thousands of tiny lanes running the same instruction on different data (SIMD/SIMT), hiding memory latency with sheer thread count instead of caches. It was built for graphics — dissolving triangles into millions of independent pixels via the rasterizer — but the same shape of math (a pile of independent multiply-adds = matrix multiply) is exactly what training a neural net needs. Redraw it: one instruction, a thousand data lanes; a triangle becoming a grid of pixels, each decided in parallel.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "This is the last stop in Part 2. In ch.8 you made a **single** instruction stream fast, then hit the ceiling of one stream and added a few cores. Now we go all-in on the other axis. A CPU is a **latency** machine: a handful of big, brilliant cores that finish any one task as fast as possible. A GPU is a **throughput** machine: thousands of small, dim lanes that finish an *enormous batch* of identical tasks per second, and don't much care how long any single one takes. Neither is 'better' — they're answers to different questions. The reason the GPU exists at all is a job that is *embarrassingly parallel*: drawing a screen.",
    },
    {
      kind: "prose",
      md:
        "## Why the GPU exists: drawing is embarrassingly parallel\n" +
        "A 4K screen is ~8 million pixels, and every frame the machine must decide a colour for each — 60+ times a second. Crucially, **each pixel's colour is (mostly) independent of its neighbours'**: the same little computation, run 8 million times on different inputs. That is the dream workload for parallel hardware — no waiting, no coordination, just width. 3D graphics reduces to a fixed **pipeline**: describe the world as **triangles**, figure out which pixels each triangle covers, and shade them. Step through it once, then we'll build the heart of it by hand.",
    },
    { kind: "figure", fig: "gfx-pipeline", caption: "Vertices → primitive assembly → rasterization → fragment shading → pixels. The wide step is fragment shading: each covered fragment is an independent little program, and a real GPU runs millions of them at once — the parallelism it's built to feed." },
    {
      kind: "prose",
      md:
        "## The heart of it: rasterization\n" +
        "How does the hardware know which pixels a triangle covers? With a beautifully simple test. For each of the triangle's three edges, an **edge function** — a 2-D cross product — tells you which side of that edge a point is on. A pixel is **inside** the triangle exactly when it's on the inside of all three edges. Better still, those same three edge values *are* the **barycentric weights**, so the identical math that decides coverage also **interpolates** depth and colour smoothly across the face. It's a per-pixel test with no dependence on any other pixel — so you can run it for every pixel simultaneously. Drag the triangle and watch it become pixels; flip to **depth** mode to see z interpolated across the surface:",
    },
    { kind: "sim", sim: "rasterizer-toy" },
    {
      kind: "prose",
      md:
        "## The bet: many thin lanes, not a few fat cores\n" +
        "Given a job that's millions of identical independent computations, what silicon do you build? Not a few genius cores — you spend every transistor on **arithmetic units** and run them in lockstep: one instruction, **many data lanes** (**SIMD** — single instruction, multiple data; NVIDIA's flavour is **SIMT**, single instruction, multiple *threads*). A modern GPU has **thousands to tens of thousands** of these lanes (an NVIDIA H100 has ~14,600; an RTX 5090 ~21,760). Each lane is slow and simple — no big out-of-order machinery, modest caches — and the chip hides memory latency not with clever caching but by having *so many* threads ready that whenever some are waiting on memory, others run. Width instead of wits.",
    },
    {
      kind: "compare",
      a: "CPU — latency machine",
      b: "GPU — throughput machine",
      rows: [
        ["Cores", "A few big, complex cores", "Thousands of small, simple lanes"],
        ["Optimized for", "Finishing one task as fast as possible", "Finishing a huge batch of identical tasks per second"],
        ["Hides memory latency with", "Big caches + out-of-order execution", "Massive thread count (something's always ready)"],
        ["Loves", "Branchy, serial, latency-sensitive code", "Data-parallel, arithmetic-heavy, regular code"],
        ["Hates", "Waiting on memory", "Divergent branches; small or serial jobs"],
      ],
    },
    {
      kind: "prose",
      md:
        "## When the GPU actually wins\n" +
        "Thousands of lanes sound unbeatable, but they come with fixed costs: it takes real time to **launch** work on the GPU, and often to **copy data** across the PCIe bus to it and back. So a GPU wins only when three things hold: the work is **parallel**, it is **arithmetic-intensive** (enough math per byte moved to earn the trip), and the **data is resident** (already on the device). Race the two processors on summing N numbers and watch the crossover: for small N the CPU wins outright — the GPU is still spinning up — and for a trivial per-element job, counting the PCIe transfer can erase most of the win even at huge N. Grow N with resident data and the GPU's width becomes overwhelming:",
    },
    { kind: "sim", sim: "cpu-vs-gpu-race" },
    { kind: "quiz", quiz: "gpu-predict" },
    {
      kind: "callout",
      tone: "senior",
      title: "SIMT up close: warps, divergence, and coalescing",
      lens: "senior",
      md:
        "NVIDIA GPUs run threads in lockstep groups called **warps** (32 threads) that share one instruction pointer. Two consequences dominate real GPU performance. **Branch divergence:** if threads in a warp take different sides of an `if`, the hardware runs *both* paths with the non-participating lanes masked off — so divergent code can drop to a fraction of peak throughput (the opposite of the CPU's branch prediction, which this can't use). **Memory coalescing:** when the 32 lanes read *contiguous* addresses, the hardware fuses them into one wide transaction; scattered addresses become many transactions and stall. So the GPU rewards *regular, aligned, uniform* code and punishes the branchy, pointer-chasing style a CPU shrugs off — the same locality lesson as ch.8's cache, turned up to eleven.",
    },
    {
      kind: "prose",
      md:
        "## The bridge to AI\n" +
        "Now the payoff. Strip a neural network down and it is mostly one operation: **matrix multiplication** — huge grids of numbers combined by **multiply-accumulate**, the same `a·b + c` your ch.5 ALU does, just billions of times, all independent. That is *precisely* the GPU's sweet spot: massively parallel, arithmetic-intensive, and (once the model is loaded) data-resident. Shading a pixel and updating a weight are the same *shape* of computation, which is why AlexNet's two gaming cards in 2012 lit the fuse, and why every large model since trains on racks of GPUs — now with **tensor cores**, units that do a small matrix-multiply as a single instruction. The hardware you've followed from a single transistor ends up, at scale, as the engine of machine learning. Part 10 picks up exactly here.",
    },
    {
      kind: "callout",
      tone: "story",
      title: "Part 2 complete — from an electron to a supercomputer on a card",
      md:
        "Look how far the machine has come. A voltage controlling a voltage became a **gate** (ch.4); gates that count and remember became an **ALU** and **RAM** (ch.5–6); wired to a clock-driven control loop they became a **CPU** that runs stored programs (ch.7); made fast they became a pipelined, cached, speculating, multicore processor (ch.8); and specialised for width they became a **GPU** with tens of thousands of lanes. That is the whole of Part 2 — pure hardware, electron to parallel supercomputer. Everything above this line is about *talking* to it.",
    },
    {
      kind: "formal",
      title: "Formal corner — arithmetic intensity, and why matrix multiply is the perfect GPU job",
      lens: "senior",
      md:
        "**Arithmetic intensity** = FLOPs performed per byte moved from memory. The **roofline model** says a machine is **memory-bound** below a threshold (peak-FLOPs ÷ memory-bandwidth) and **compute-bound** above it — more lanes only help once you're compute-bound.\n" +
        "- A vector **sum** of n numbers (4-byte floats) does ~n adds over ~4n bytes → intensity ≈ **0.25 FLOP/byte** → firmly **memory/transfer-bound** (exactly why the race's summed job goes transfer-bound when you count PCIe).\n" +
        "- A **matrix multiply** of two n×n matrices does ~2n³ FLOPs over ~3n² numbers ≈ 12n² bytes → intensity ≈ **n/6 FLOP/byte**, which grows without bound as n rises → deeply **compute-bound**, mapping perfectly onto the GPU's arithmetic throughput.\n" +
        "That ratio — not raw core count — is what decides whether width pays off, and it's why deep learning (matrix multiplies all the way down) is the ideal GPU workload while a lone `sum()` often isn't.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "Part 2 is done: you've built the machine from the electron up. But everything so far you've had to program in raw machine code, by hand — the ch.7 emulator's assembly, the ch.8 instruction stream. No human writes real software that way. **Part 3 — Code** rides the abstraction elevator: from assembly up to high-level languages with variables, functions, a call stack and recursion (ch.10), then the **compiler** that translates them back down to the instructions this hardware runs (ch.11). The machine is finished. Now we learn to speak to it.",
    },
  ],
  keyPoints: [
    "GPUs exist because graphics is embarrassingly parallel — millions of independent pixels per frame, so the chip bets its transistors on width (many simple lanes) instead of single-thread cleverness.",
    "CPU vs GPU is latency vs throughput — a few big out-of-order cores with large caches, versus thousands of thin SIMD lanes that hide memory stalls with sheer thread count.",
    "Rasterization turns triangles into pixels — three edge-function tests decide coverage and double as barycentric weights that interpolate depth and colour, each pixel independent of the rest.",
    "SIMD/SIMT drives many data lanes with one instruction — and branch divergence (lanes taking different paths) serializes them, so regular, uniform code is essential.",
    "A GPU wins only when work is data-parallel, arithmetic-intensive, and data-resident — kernel-launch and PCIe-transfer overhead mean small or serial jobs lose to the CPU.",
    "The bridge to AI — a neural network is mostly matrix multiplication (independent multiply-accumulates), the same shape as shading pixels, which is why deep learning runs on GPUs.",
  ],
  pitfalls: [
    {
      title: "Thinking a GPU is just a faster CPU",
      body: "It's a throughput machine, not a faster latency machine. On serial, branchy, or latency-sensitive code — i.e. most everyday programs — a GPU is dreadful. It only shines on large, regular, data-parallel work. Using the wrong one is the mistake, not the hardware.",
      lens: "both",
    },
    {
      title: "Assuming more lanes means proportional speedup",
      body: "Amdahl's law and fixed overheads apply. A job that isn't parallel, or is too small to amortise the launch/transfer cost, runs slower on the GPU than the CPU. Thousands of lanes are wasted if the work can't fill them or can't reach them in time.",
      lens: "both",
    },
    {
      title: "Ignoring branch and thread divergence",
      body: "In SIMT, a warp of lanes shares one instruction pointer. If lanes diverge at an if/else, the hardware runs both paths with lanes masked, so heavily divergent code can drop to a fraction of peak. Data-dependent branching is cheap on a CPU and expensive on a GPU.",
      lens: "senior",
    },
    {
      title: "Forgetting the data has to get there",
      body: "Host↔device transfer over PCIe is a real, per-byte cost. A trivial one-shot kernel can be entirely transfer-bound, wiping out the compute win. This is why ML frameworks work hard to keep tensors resident on the GPU and batch work — the win assumes the data is already there.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch9-1", "iv-ch9-2", "iv-ch9-3", "iv-ch9-4", "iv-ch9-5"],
  kataIds: [],
  seeAlso: ["ch5", "ch7", "ch8", "ch33", "ch34"],
  sources: [
    { title: "Graphics pipeline — vertices to pixels (Wikipedia)", url: "https://en.wikipedia.org/wiki/Graphics_pipeline" },
    { title: "Rasterisation — the triangle-to-pixel step (Wikipedia)", url: "https://en.wikipedia.org/wiki/Rasterisation" },
    { title: "Graphics processing unit & GPGPU (Wikipedia)", url: "https://en.wikipedia.org/wiki/Graphics_processing_unit" },
    { title: "Single instruction, multiple threads (SIMT) — warps & divergence (Wikipedia)", url: "https://en.wikipedia.org/wiki/Single_instruction,_multiple_threads" },
    { title: "Fabian Giesen — A trip through the Graphics Pipeline 2011", url: "https://fgiesen.wordpress.com/2011/07/09/a-trip-through-the-graphics-pipeline-2011-index/" },
    { title: "Krizhevsky, Sutskever & Hinton — ImageNet Classification with Deep CNNs (AlexNet, trained on 2 GPUs)", url: "https://papers.nips.cc/paper/4824-imagenet-classification-with-deep-convolutional-neural-networks" },
  ],
};

// ---------------------------------------------------------------
// ch.10 — From machine code to languages  (built in S6)
// ---------------------------------------------------------------
const ch10: Chapter = {
  id: "ch10",
  part: "p3",
  order: 12,
  title: "From machine code to languages",
  tagline: "Nobody should write raw opcodes by hand — so we build an elevator of abstractions up from the CPU, and add the one mechanism ch.7 lacked: the call stack",
  readMins: { foundations: 22, senior: 35 },
  storyHook: {
    md:
      "1952. Computers are programmed by hand in raw numeric codes, and the reigning wisdom is that they always will be — a machine can only obey numbers, so a human must think in them. **Grace Hopper** disagrees. She writes the **A-0 system**, the first program that takes higher-level, human-readable instructions and *automatically* assembles the machine code for them by pulling routines from a library. She calls it a **“compiler”** — because it *compiles* subroutines out of a library the way you compile references for a paper. Colleagues are skeptical that a computer could ever write its own programs. It could; the abstraction elevator you're about to ride was her idea, and every language since sits on top of it.",
  },
  assumes: [
    {
      chapterId: "ch7",
      oneLiner: "A CPU runs one-byte instructions (opcode + operand) in a fetch–decode–execute loop; loops are backward JMPs and ifs are conditional jumps. You wrote programs in that raw assembly by hand.",
    },
  ],
  mentalModel:
    "Stack a ladder of languages — machine code at the bottom, then assembly, C, and high-level languages on top — with a translator (a compiler or interpreter) that walks any rung down to the one below. High-level control flow (if/while) and functions are conveniences that compile back down to ch.7's jumps and instructions. The one genuinely new mechanism is the call stack: each function call pushes a frame (its arguments, locals, and return address) and each return pops one. Recursion is that stack applied to a function that calls itself — and it overflows when the finite stack fills.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "In ch.7 you programmed a real (emulated) CPU — but you did it in **assembly**, hand-assembling `LDA`/`ADD`/`JMP` into bytes. That works for sixteen bytes; it is agony for sixteen thousand. The whole history of programming is the search for ways to say *more* with *less*, and to say it in terms humans can hold in their heads. This chapter is the bridge from the machine you built to the languages you actually write in — and, crucially, it stays honest: everything up here still turns into the instructions down there.",
    },
    {
      kind: "prose",
      md:
        "## The abstraction elevator\n" +
        "Think of languages as floors in an elevator. At the bottom is **machine code** — the bytes in RAM. One floor up, **assembly** gives those bytes names (`ADD` instead of `0x4?`). Up again, **C** lets you write `sum = a + b` and forget which registers are involved. Higher still, **TypeScript** hands you objects, closures and garbage collection. Each floor **hides** detail to buy expressiveness — and something has to translate between floors. Ride it: hover any line and watch the *same* program light up on every floor.",
    },
    { kind: "sim", sim: "abstraction-elevator" },
    {
      kind: "prose",
      md:
        "## Control flow, structured\n" +
        "The first thing high-level languages add is **structure**. In assembly, a loop is a bare backward jump and an `if` is a conditional jump to a label — powerful, but easy to tangle into “spaghetti” (the reason Dijkstra wrote *Go To Statement Considered Harmful*). Languages replace raw jumps with named shapes — `if`/`else`, `while`, `for` — that nest cleanly and can't jump into the middle of each other. None of it is new capability; it's the *same* jumps from ch.7, packaged so humans stop making mistakes.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "…and it all compiles back to ch.7's jumps",
      lens: "senior",
      md:
        "A `while (cond) { body }` becomes exactly the pattern you built by hand: evaluate `cond`, a conditional jump *past* the body when it's false, the body, then an unconditional jump *back* to re-test. An `if/else` is a conditional jump to the else-block and an unconditional jump over it. You'll watch a real compiler emit precisely these jumps as bytecode in ch.11 — the structured statement is the human interface; the jump is what runs.",
    },
    {
      kind: "prose",
      md:
        "## Functions, and the stack they need\n" +
        "The second big idea is the **function**: a named, parameterized block you can call from anywhere and return from. But calling raises a question ch.7's CPU couldn't answer — when the function finishes, *where does it return to*, and where does it keep its own variables while it runs? The answer is a **stack**. Each call **pushes a frame** holding the arguments, the local variables, and the **return address**; when the function returns, its frame is **popped** and control resumes where it left off. Nested calls stack up and unwind in perfect last-in-first-out order.",
    },
    { kind: "sim", sim: "call-stack-viz" },
    {
      kind: "prose",
      md:
        "## Recursion — and its limit\n" +
        "Once calls have their own frames, a function can call **itself**, each invocation with its own arguments — **recursion**. It's the natural way to express anything self-similar (a factorial, a tree walk, `fib`). The rule that keeps it from running forever is the **base case**: a condition that returns *without* recursing. Miss it — or recurse deeper than the finite stack allows — and you don't get an infinite loop, you get a **stack overflow**: the frames pile up until the stack is full and the program crashes. Predict what this trace does before you run it:",
    },
    { kind: "quiz", quiz: "trace-recursion" },
    {
      kind: "code",
      lang: "ts",
      note: "The classic. Each call waits on two more until n < 2 — and that waiting is exactly what stacks frames. Run it in call-stack-viz.",
      code:
        "function fib(n: number): number {\n" +
        "  if (n < 2) return n;             // base case — stops the recursion\n" +
        "  return fib(n - 1) + fib(n - 2);  // two recursive calls, two more frames\n" +
        "}",
    },
    {
      kind: "prose",
      md:
        "## Different shapes of thought: paradigms\n" +
        "Languages don't just differ in syntax; they nudge you to **decompose** problems differently. A **paradigm** is that style of decomposition. The same “sum a list” task looks genuinely different as imperative steps, as interacting objects, or as composed pure functions — and most real languages let you mix all three. Flip through the same problem three ways:",
    },
    { kind: "figure", fig: "paradigm-lens" },
    {
      kind: "table",
      caption: "The three big paradigms — not rivals to pick between, but tools; seniority is choosing the right one per problem.",
      head: ["Paradigm", "Core idea", "You think in…"],
      rows: [
        ["Imperative", "Steps that mutate state", "Sequences of commands (closest to the CPU)"],
        ["Object-oriented", "Bundle state with the behavior that guards it", "Interacting objects and their responsibilities"],
        ["Functional", "Compose pure functions over immutable data", "Data flowing through transformations, no mutation"],
      ],
    },
    {
      kind: "formal",
      title: "Formal corner — the call stack as activation records",
      md:
        "Each call allocates an **activation record** (stack frame) containing its parameters, local variables, saved registers, and a **return address**. A **stack pointer** marks the top; **call** decrements it to allocate a frame and saves the return address, **return** reads that address and increments the pointer to free the frame.\n" +
        "For `fib(n)` the maximum stack depth is `O(n)` (the longest chain fib(n)→fib(n−1)→…→fib(1)), even though the total number of calls is `O(φⁿ)`. That gap — deep vs. wide — is why the naive `fib` is *slow* (exponential calls) but doesn't *overflow* for modest n (linear depth). A real CPU implements this with `CALL`/`RET` instructions and a hardware stack pointer — the two instructions ch.7's ISA deliberately left out.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where this model simplifies",
      md:
        "Frames live on the **stack**; longer-lived data (objects, arrays, closures that outlive their call) lives on the **heap** and is reclaimed by a garbage collector (ch.23). Some languages perform **tail-call optimization** — reusing a frame when a call is the last thing a function does — turning certain recursions into O(1)-stack loops; most JS engines don't, so deep recursion still overflows. And real ISAs *do* have `CALL`/`RET` plus interrupts (ch.22). What carries all the way up: calls push frames, returns pop them, and the stack is finite.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You've ridden the elevator up — but who *drives* it? When you write `sum = a + b`, some program turns that text into the bytes ch.7 executes. That program is a **compiler**, and in ch.11 you'll build one end to end: it reads source, breaks it into tokens, parses it into a tree, and emits bytecode for a little virtual machine you can single-step — Grace Hopper's idea, running in your browser.",
    },
  ],
  keyPoints: [
    "The abstraction elevator — machine code → assembly → C → high-level; each floor hides detail to buy expressiveness, and a compiler or interpreter translates between floors.",
    "High-level languages add no new machine power — their control structures (if/while) and functions all compile back down to ch.7's jumps and instructions; they exist so humans make fewer mistakes.",
    "A function call needs a stack — each call pushes a frame (arguments, locals, return address) and each return pops it; that frame + return-address machinery is exactly what ch.7's ISA lacked (CALL/RET).",
    "Recursion is the call stack applied to itself — a function calling itself piles a frame per call, each with its own arguments, unwound in last-in-first-out order; a base case is what stops it.",
    "Stack overflow is not an infinite loop — missing base case or too-deep recursion fills the finite stack and crashes, because frames aren't freed until they return; the equivalent loop reuses one frame.",
    "Paradigms are decomposition strategies — imperative mutates state step by step, OOP bundles state with behavior, functional composes pure functions; most languages mix them and seniority is picking the right one.",
    "Stack vs heap — the stack holds call frames (fast, LIFO, bounded); the heap holds longer-lived dynamically allocated data (garbage-collected, larger). Deep dive in ch.23.",
  ],
  pitfalls: [
    {
      title: "Thinking 'higher-level' means 'slower' or 'worse'",
      body: "Abstraction is about human productivity, not a performance tax you can't afford. Optimizing compilers and JITs (ch.11) routinely make high-level code run as fast as hand-written assembly — the FORTRAN team proved that in 1957. You climb the elevator to think clearly, and the translator gives back the speed.",
      lens: "both",
    },
    {
      title: "Forgetting recursion has a memory cost",
      body: "Every recursive call is a live stack frame until it returns, so depth-N recursion holds N frames at once. Elegant recursion over a deep or unbounded structure can overflow where a boring loop — reusing one frame — wouldn't. Know your maximum depth.",
      lens: "both",
    },
    {
      title: "Confusing 'the stack' the data structure with 'the call stack'",
      body: "They're the same idea: the call stack IS a stack (the LIFO structure you'll meet as an ADT in ch.14). Calls push, returns pop, and only the top frame is active. Seeing them as one thing demystifies both.",
      lens: "senior",
    },
    {
      title: "Treating paradigms as tribes",
      body: "Imperative/OOP/functional aren't rival religions to pick one of forever. They're lenses; a single function might use a pure functional reduce inside an object's method inside an imperative loop. Dogma costs more than it saves.",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch10-1", "iv-ch10-2", "iv-ch10-3", "iv-ch10-4", "iv-ch10-5"],
  kataIds: [],
  seeAlso: ["ch7", "ch11", "ch14", "ch23"],
  sources: [
    { title: "Grace Hopper — the A-0 system (1952), the first compiler, and coining 'compiler' (Wikipedia)", url: "https://en.wikipedia.org/wiki/Grace_Hopper" },
    { title: "A-0 System — automatic programming for an electronic computer (Wikipedia)", url: "https://en.wikipedia.org/wiki/A-0_System" },
    { title: "Call stack — activation records, return addresses, the LIFO discipline (Wikipedia)", url: "https://en.wikipedia.org/wiki/Call_stack" },
    { title: "Recursion (computer science) — base cases and stack depth (Wikipedia)", url: "https://en.wikipedia.org/wiki/Recursion_(computer_science)" },
  ],
};

// ---------------------------------------------------------------
// ch.11 — Compilers & interpreters  (built in S6)
// ---------------------------------------------------------------
const ch11: Chapter = {
  id: "ch11",
  part: "p3",
  order: 13,
  title: "Compilers & interpreters",
  tagline: "The program that drives the abstraction elevator: source → tokens → tree → bytecode → a running machine, one honest stage at a time",
  readMins: { foundations: 22, senior: 38 },
  storyHook: {
    md:
      "1954, IBM. **John Backus** pitches a system that will let scientists write formulas instead of assembly. The reaction is disbelief — everyone *knows* a machine can't generate code as tight as a good human, and on machines this small and slow, wasteful code is unaffordable. His team spends three years on it. When **FORTRAN** ships in 1957 it includes the first serious **optimizing compiler**, and the generated code runs *nearly as fast as hand-written assembly* — close enough that by 1958 more than half the code on IBM machines is compiler-generated. The skeptics weren't wrong that efficiency mattered; they were wrong that only humans could deliver it. This chapter builds the machine that changed their minds.",
  },
  assumes: [
    {
      chapterId: "ch10",
      oneLiner: "Languages stack in an abstraction elevator, and a translator walks each floor down to the one below; high-level control flow compiles to ch.7's jumps.",
    },
    {
      chapterId: "ch7",
      oneLiner: "A simple machine runs a linear list of instructions in a fetch–execute loop, with jumps for control flow.",
    },
  ],
  mentalModel:
    "A compiler is an assembly line of representations. Draw four boxes with an arrow between each and push one example — 2 + 3 * 4 — through them: the raw text, then a token stream [2][+][3][*][4] (the lexer), then a tree (+ 2 (× 3 4)) that encodes precedence (the parser/AST), then a flat instruction list PUSH 2 · PUSH 3 · PUSH 4 · MUL · ADD for a stack machine (codegen/bytecode), then the answer 14 (the VM runs it). An interpreter runs the tree or bytecode directly; a compiler emits machine code ahead of time; a JIT does both — interpret first, compile the hot parts at runtime.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "In ch.10 you rode the abstraction elevator by hand, seeing one program on four floors. This chapter builds the **elevator operator**: the program that takes source text on the top floor and mechanically produces the instructions on the bottom floor. A **compiler** does the whole descent ahead of time; an **interpreter** rides down and executes each step live. Either way the journey is the same four stages — and you're about to watch all four happen as you type.",
    },
    {
      kind: "prose",
      md:
        "## Four stages, one pipeline\n" +
        "Turning text into behavior is too big a leap to make at once, so a compiler makes it in stages, each handing a cleaner representation to the next: **lex** (characters → tokens), **parse** (tokens → a tree), **generate** (tree → bytecode), and **run** (a virtual machine executes the bytecode). Type a program into the mini-language below and watch all four panes update live — then break the syntax and see exactly which stage complains.",
    },
    { kind: "sim", sim: "compiler-pipeline" },
    {
      kind: "prose",
      md:
        "## Stage 1 — the lexer: characters become words\n" +
        "The **lexer** (or scanner) reads the raw character stream and groups it into **tokens** — the language's words. `let total = 0;` becomes five tokens: the keyword `let`, the identifier `total`, the operator `=`, the number `0`, and the semicolon. Whitespace and comments are discarded. The lexer knows nothing about grammar; it just chunks characters and records where each token came from, so later stages can point at the exact spot on an error. This is the same “group a stream into units” job as ch.2's UTF-8 decoder, one level up.",
    },
    {
      kind: "prose",
      md:
        "## Stage 2 — the parser: words gain structure\n" +
        "Tokens are still flat. The **parser** imposes **structure**, following the language's grammar to build an **Abstract Syntax Tree (AST)** — a tree where the *shape* encodes meaning. The crucial payoff is precedence: `2 + 3 * 4` parses into `(+ 2 (× 3 4))`, nesting the multiply *underneath* the add, so “× binds tighter than +” is a fact about the tree, not a rule the evaluator re-checks. Which stage catches which mistake? Commit an answer:",
    },
    { kind: "quiz", quiz: "find-parse-error" },
    {
      kind: "table",
      caption: "One expression, `2 + 3 * 4`, flowing through all four stages. Each stage's output is the next stage's input.",
      head: ["Stage", "What it produces", "For `2 + 3 * 4`"],
      rows: [
        ["Lexer", "a token stream", "2 · + · 3 · * · 4"],
        ["Parser", "an AST (structure + precedence)", "(+ 2 (× 3 4))"],
        ["Codegen", "bytecode for a stack machine", "PUSH 2 · PUSH 3 · PUSH 4 · MUL · ADD"],
        ["VM", "the result", "14"],
      ],
    },
    {
      kind: "prose",
      md:
        "## Stage 3 — codegen: a tree becomes instructions\n" +
        "The AST says *what* the program means; **code generation** decides *how* to run it, by flattening the tree into instructions for a target machine. Our target is a **stack machine**: a CPU with no registers, just a push-down stack. `2 + 3` compiles to `PUSH 2; PUSH 3; ADD`, where `ADD` pops two values and pushes their sum. Control flow reuses ch.7's trick exactly — a `while` becomes a conditional jump past the loop and a backward jump to re-test. It's the ch.7 CPU idea again, but the machine is *invented in software*.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Why a virtual machine at all?",
      lens: "senior",
      md:
        "Compiling to **bytecode** for a VM instead of straight to machine code buys **portability** — compile once, run anywhere a small VM exists (this is how the JVM, CPython, V8's Ignition and WebAssembly all work). It also simplifies the compiler (one clean target), enables a **security sandbox** (the VM mediates every operation), and gives a JIT a tidy unit to profile. Most VMs are **stack machines** because codegen is trivial (post-order-walk the AST and emit); some are **register machines** (Lua, Android's Dalvik) which interpret faster but are harder to emit for. The cost is a warm-up/indirection tax — which the next idea buys back.",
    },
    {
      kind: "prose",
      md:
        "## Stage 4 — run it: compiler vs interpreter\n" +
        "Finally the **virtual machine** executes the bytecode in the same fetch–execute loop as ch.7's CPU: read the instruction at the program counter, do it to the stack, advance, repeat. Here the deep split appears. An **interpreter** runs the tree or bytecode directly — instant startup, slower each step. A **compiler** translates everything to native machine code first — slower to get going, then full speed. Modern engines refuse to choose:",
    },
    { kind: "figure", fig: "jit-tiers" },
    {
      kind: "prose",
      md:
        "## The JIT: have it both ways\n" +
        "A **Just-In-Time** compiler starts by *interpreting* bytecode (instant startup), counts how often each function runs, and **compiles the hot ones to optimized machine code at runtime** — betting on what it has seen (e.g. “this variable is always an integer”). If a bet is later violated it **deoptimizes**: throws the fast code away and falls back to the interpreter. That adaptive loop is why V8 gives you interpreter-fast startup *and* compiler-fast steady state — and why type-unstable code stays slow.",
    },
    {
      kind: "callout",
      tone: "story",
      title: "A darker thought: can you trust the compiler?",
      md:
        "In his 1984 Turing Award lecture *Reflections on Trusting Trust*, **Ken Thompson** showed a compiler could be rigged to insert a backdoor into a program it compiles — and to insert *that same rigging* when it compiles a new copy of itself, so the malicious code vanishes from all source yet survives forever in the binary. The unsettling moral: you can read every line of source and still not know what your binary does, unless you trust the entire toolchain that built it (a live concern for supply-chain security, ch.32).",
    },
    {
      kind: "compare",
      a: "Compiler (ahead-of-time)",
      b: "Interpreter",
      rows: [
        ["When it translates", "The whole program, before running", "Each construct, while running"],
        ["Startup", "Slower — compile first", "Instant — just start executing"],
        ["Run speed", "Fast — native machine code", "Slower — re-reads/dispatches each op"],
        ["Errors", "Many caught up front (types, syntax)", "Often surface only at runtime"],
        ["Typical examples", "C, Rust, Go", "Python, Ruby (and a JIT blends both)"],
      ],
    },
    {
      kind: "formal",
      title: "Formal corner — a language is a grammar",
      md:
        "A language's syntax is a **formal grammar**: a set of rules (productions) in a notation like **BNF**. Our expression grammar, roughly:\n" +
        "`expr := term (('+' | '−') term)*`\n" +
        "`term := factor (('×' | '÷') factor)*`\n" +
        "`factor := NUMBER | IDENT | '(' expr ')'`\n" +
        "Because `term` (with × ÷) sits *below* `expr` (with + −), multiplication binds tighter — precedence is literally the nesting of the rules. A **recursive-descent** parser is this grammar turned into code: one function per rule, the call stack (ch.10!) mirroring the tree it builds. Which strings a grammar can describe — and which no grammar can — is the subject of ch.19–20.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Where this model simplifies",
      md:
        "A production compiler does much more between parse and codegen: a **semantic/type-checking** pass, one or more **intermediate representations**, many **optimization** passes (inlining, constant folding, register allocation), and **linking**. Real errors also include type errors our tiny language has no types to catch. And industrial parsers handle ambiguity, error recovery, and precedence far more carefully. What's real and complete here: the four-stage spine — lex, parse, generate, run — that every compiler and interpreter shares.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You can now build a language *and* the machine that runs it — the top of the abstraction elevator meets the bottom. But a real system is millions of lines written by hundreds of people over years. Ch.12 asks the last question of Part 3: not how to make a program *run*, but how to keep a giant, ever-changing codebase from collapsing under its own weight.",
    },
  ],
  keyPoints: [
    "A compiler is a pipeline — source → tokens (lexer) → AST (parser) → bytecode (codegen) → result (VM); each stage does one job and hands a cleaner representation to the next.",
    "The lexer groups characters into tokens; the parser gives them structure — precedence and grouping live in the AST's shape, not in the text or the tokens.",
    "Errors have a stage — the lexer catches illegal characters, the parser catches grammar mistakes, and semantic checks (undefined variables, types) come after; which stage complains tells you what kind of bug it is.",
    "Bytecode + a virtual machine = portability — compile once to an invented instruction set, run anywhere a small VM exists (JVM, CPython, V8, Wasm); a stack VM is ch.7's CPU idea reinvented in software.",
    "Compiler vs interpreter is a spectrum, not a language property — AOT compilers translate up front for speed, interpreters run directly for instant startup, and a JIT interprets then compiles hot code at runtime, deoptimizing when its assumptions break.",
    "Everything high-level bottoms out in ch.7 — if/while/functions compile to the machine's jumps and instructions; the compiler is what makes the abstraction elevator automatic.",
  ],
  pitfalls: [
    {
      title: "Thinking the parser understands meaning",
      body: "The parser only checks structure — is this a grammatically valid program? Whether a variable exists, or a type fits, is a separate semantic stage after parsing. That's why `print y;` parses fine but fails in codegen: 'undefined variable' is a meaning error, not a grammar error.",
      lens: "senior",
    },
    {
      title: "Believing 'compiled' vs 'interpreted' is a property of the language",
      body: "It's an implementation choice. The same language can be both: JavaScript is interpreted as bytecode and then JIT-compiled to machine code in the same engine. 'Is Python compiled?' is the wrong question — CPython compiles to bytecode, then interprets it.",
      lens: "both",
    },
    {
      title: "Assuming precedence lives in the tokens",
      body: "The lexer emits `+` and `*` as equal, structureless tokens. It's the parser's grammar that decides `*` binds tighter, by nesting it deeper in the tree. Change the grammar and the same tokens compute a different answer — precedence is a parsing decision.",
      lens: "both",
    },
    {
      title: "Thinking JIT-compiled always means fast",
      body: "The JIT's speed comes from assumptions about types. Type-unstable, megamorphic code forces the engine to bail out to generic paths or deoptimize repeatedly, so 'it's JIT-compiled' doesn't guarantee speed — monomorphic, predictable code does.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch11-1", "iv-ch11-2", "iv-ch11-3", "iv-ch11-4", "iv-ch11-5"],
  kataIds: [],
  seeAlso: ["ch7", "ch10", "ch19", "ch20"],
  sources: [
    { title: "Fortran — Backus's team and the first optimizing compiler, 1957 (IBM History)", url: "https://www.ibm.com/history/fortran" },
    { title: "Compiler — stages, front/back end, IR (Wikipedia)", url: "https://en.wikipedia.org/wiki/Compiler" },
    { title: "Just-in-time compilation — interpret, profile, compile hot code, deoptimize (Wikipedia)", url: "https://en.wikipedia.org/wiki/Just-in-time_compilation" },
    { title: "Crafting Interpreters (Robert Nystrom) — the lexer→parser→bytecode→VM path this mini-language follows", url: "https://craftinginterpreters.com/" },
  ],
};

// ---------------------------------------------------------------
// ch.12 — Software engineering  (built in S6, the lighter P3 chapter)
// ---------------------------------------------------------------
const ch12: Chapter = {
  id: "ch12",
  part: "p3",
  order: 14,
  title: "Software engineering",
  tagline: "Writing a program is ch.10–11; keeping a million-line system that hundreds of people change every day from collapsing is a different problem — this is how",
  readMins: { foundations: 15, senior: 22 },
  storyHook: {
    md:
      "1968, Garmisch, Germany. Fifty computer people gather at a **NATO conference** and discover, comparing notes, that they share the same secret shame: their projects are late, over budget, riddled with bugs, and impossible to change safely. Having never met, they're stunned the disease is universal. They give it a name — the **“software crisis”** — and a cure they can only gesture at: treat building software as an **engineering discipline**, not an art. Half a century later the systems are a million times bigger and the crisis never fully ended; this chapter is the hard-won toolkit for holding it at bay.",
  },
  assumes: [
    {
      chapterId: "ch11",
      oneLiner: "You can build programs — and even the compiler that runs them. Now the problem is scale: many programs, many authors, many years.",
    },
  ],
  mentalModel:
    "Picture a dependency graph of modules. A healthy system is a shallow graph of small, cohesive modules that depend on stable interfaces, so any one change lights up a small blast radius. A 'big ball of mud' is a dense graph where everything touches everything and a change ripples everywhere. The practices of software engineering all serve to keep that graph shallow and the blast radius small: encapsulation hides internals, interface seams break dependency chains, the test pyramid catches regressions fast, and semantic versioning makes the contracts between parts explicit.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Parts 1–3 took you from electrons to a running language. But every real system is bigger than one person can hold in their head — and that, not the CPU, is the binding constraint. Software engineering is the study of managing **complexity and change across people and time**. Its enemies aren't slow algorithms (that's Part 4); they're tangled dependencies, silent regressions, and interfaces nobody can safely touch. Its tools are all about keeping a change **local**.",
    },
    {
      kind: "prose",
      md:
        "## Modularity and the blast radius\n" +
        "The master tool is **modularity**: split the system into pieces small enough to understand alone, each hiding its internals behind a small **interface** (encapsulation) so other modules can't depend on how it works — only on what it promises. Why it matters: when you change a module, everything that depends on it may have to change too. That ripple is the **blast radius** of a change. Click a module and watch the damage spread — then add an interface seam and watch it shrink:",
    },
    { kind: "sim", sim: "dependency-blast" },
    {
      kind: "prose",
      md:
        "## Coupling, cohesion, and the seam\n" +
        "Two words name the health of that graph. **Cohesion** is how focused a module is — do its parts belong together? **Coupling** is how much modules lean on each other's *details*. You want high cohesion and low coupling: each piece does one thing, and depends on as little as possible. The trick that decouples is the **seam** — depend on a stable *interface*, not a concrete implementation, so you can change or replace what's behind it without anything downstream noticing.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Dependency inversion — the seam, formalized",
      lens: "senior",
      md:
        "The principle behind the seam is **Dependency Inversion**: high-level policy shouldn't depend on low-level detail; both should depend on an **abstraction**. Concretely, `authService` shouldn't import the concrete `PostgresUserRepo`; it should depend on a `UserRepo` *interface* that Postgres (or an in-memory fake, for tests) implements. Now the database is a plug-in, not a load-bearing wall — you can swap it, mock it, or rewrite it, and `authService` never changes. This one move is what makes large systems testable and evolvable; it's the seam in the sim, named.",
    },
    {
      kind: "prose",
      md:
        "## You can't re-check it by hand: tests\n" +
        "Once a system is too big to re-verify manually, **automated tests** are what let you change it without fear. But not all tests are equal. **Unit** tests check one piece in isolation — milliseconds each, so you run thousands on every save. **Integration** tests wire real pieces together (code + a real database) — slower, fewer, but they catch what units can't. **End-to-end** tests drive the whole system like a user — most realistic, but slow and flaky. Balance them like a pyramid:",
    },
    { kind: "figure", fig: "test-pyramid" },
    {
      kind: "prose",
      md:
        "## Contracts between parts: APIs and versioning\n" +
        "Modules talk through **APIs** — the promised surface one part exposes to another. An API is a **contract**, and the moment other code depends on it, changing it can break them. **Semantic versioning** makes the contract explicit in the version number itself, so consumers know whether an upgrade is safe. Test your read of the discipline:",
    },
    { kind: "quiz", quiz: "blast-radius" },
    {
      kind: "table",
      caption: "Semantic versioning: MAJOR.MINOR.PATCH. The number is a promise about compatibility.",
      head: ["Bump", "Example", "Means → you should…"],
      rows: [
        ["PATCH", "2.4.1 → 2.4.2", "Backward-compatible bug fix → upgrade freely"],
        ["MINOR", "2.4 → 2.5.0", "New features, still compatible → upgrade freely"],
        ["MAJOR", "2.x → 3.0.0", "Breaking changes → read the migration notes first"],
      ],
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Conway's Law — the system mirrors the org",
      lens: "senior",
      md:
        "A 1967 observation that keeps proving true: *organizations design systems that copy their own communication structure*. Four teams building a compiler tend to produce a four-pass compiler; a monolith often reflects one big team, microservices a set of small ones. The corollary is strategic — if you want a particular architecture, structure the teams to match it (the 'Inverse Conway Maneuver'). Software boundaries are as much social as technical, which is exactly why ch.12 sits at the human end of the stack.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "That closes **Part 3 · Code** — from raw machine instructions (ch.10), up through the compiler that hides them (ch.11), to the discipline of keeping vast systems sane (ch.12). You now have a computer *and* the means to program it at scale. **Part 4** turns to the other half of the craft: not how to express a computation, but how to make it **fast** — Big-O thinking, the classic data structures, and the algorithms that separate a program that works from one that works at scale.",
    },
  ],
  keyPoints: [
    "Software engineering manages people and change, not just code — the binding constraint on a million-line system is human understanding, and every practice exists to keep a change local.",
    "Modularity + encapsulation — split the system into pieces that fit in one head, each hiding its internals behind a small interface so callers can't couple to details.",
    "Low coupling, high cohesion — a module should do one thing (cohesion) and depend on as little as possible (coupling); together they keep a change's blast radius small.",
    "Depend on interfaces, not implementations — a stable interface (dependency inversion) is a seam that stops a change rippling downstream, and it's what makes systems testable and swappable.",
    "The test pyramid — many fast isolated unit tests, fewer integration tests, a thin cap of slow end-to-end tests; inverting it into an 'ice-cream cone' gives a slow, flaky, distrusted suite.",
    "Semantic versioning is a compatibility contract — MAJOR.MINOR.PATCH signals breaking changes / new features / fixes, so consumers know when an upgrade is safe.",
  ],
  pitfalls: [
    {
      title: "Chasing DRY straight into tight coupling",
      body: "'Don't repeat yourself' is good until you fold two things that merely look alike into one shared unit — now an unrelated change to one caller breaks the other. A little duplication is often cheaper than the wrong abstraction; couple things that change together, not things that happen to match today.",
      lens: "senior",
    },
    {
      title: "Inverting the test pyramid",
      body: "A suite that's mostly slow end-to-end tests (the 'ice-cream cone') runs for ages, fails for flaky timing reasons, and gets ignored — the worst outcome. Push most checks down to fast, deterministic unit tests; reserve E2E for a few critical user journeys.",
      lens: "both",
    },
    {
      title: "Treating semver as a guarantee",
      body: "Compatibility is about behavior, not just the type signature — a 'patch' can still break you via a changed default or a tightened validation, and transitive deps can pull incompatible versions. Trust it as a strong hint, but keep a lockfile and let tests be the real safety net.",
      lens: "senior",
    },
    {
      title: "Adding abstraction before you need it",
      body: "A seam is not free — every interface and layer is coupling and indirection you now maintain. Premature abstraction (an interface with one implementation, 'just in case') adds cost with no payoff. Add the seam when a change actually starts to hurt, not before.",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch12-1", "iv-ch12-2", "iv-ch12-3", "iv-ch12-4"],
  kataIds: [],
  seeAlso: ["ch10", "ch11", "ch32"],
  sources: [
    { title: "NATO Software Engineering Conferences (1968 Garmisch) — where 'software engineering' and the 'software crisis' were named (Wikipedia)", url: "https://en.wikipedia.org/wiki/NATO_Software_Engineering_Conferences" },
    { title: "The Practical Test Pyramid (Ham Vocke, martinfowler.com)", url: "https://martinfowler.com/articles/practical-test-pyramid.html" },
    { title: "Semantic Versioning 2.0.0 — the MAJOR.MINOR.PATCH spec", url: "https://semver.org/" },
    { title: "Conway's law — systems mirror the communication structure of the organizations that build them (Wikipedia)", url: "https://en.wikipedia.org/wiki/Conway%27s_law" },
  ],
};

// ---------------------------------------------------------------
// ch.13 — Big-O & algorithmic thinking  (built in S7)
// ---------------------------------------------------------------
const ch13: Chapter = {
  id: "ch13",
  part: "p4",
  order: 15,
  title: "Big-O & algorithmic thinking",
  tagline: "Two programs can both be correct and yet one finishes before lunch while the other outlives the sun — Big-O is how you tell them apart before you ever run them",
  readMins: { foundations: 20, senior: 32 },
  storyHook: {
    md:
      "1894. The number theorist **Paul Bachmann**, writing about how error terms *grow*, needs a compact way to say “no bigger than, up to a constant.” He writes a capital **O** — for *Ordnung*, German for “order” — and a notation is born. **Edmund Landau** adopts it in 1909 and adds a little-*o*; together they become the “Landau symbols.” For seventy years it lives in pure mathematics. Then, in 1976, **Donald Knuth** — building the science of algorithm analysis — reclaims it for computer science, pins down the companion **Ω** and **Θ**, and half-jokingly rechristens the letter a capital *omicron*. A tool for bounding error terms became the way every programmer talks about speed. This chapter is that tool, made touchable.",
  },
  assumes: [
    {
      chapterId: "ch10",
      oneLiner: "You can read code with loops and function calls. Here the question isn't what a program computes, but how the amount of work it does grows as the input gets bigger.",
    },
  ],
  mentalModel:
    "Ignore the hardware, the language, and the constant factors. Count how the number of basic operations grows as the input size n grows, and keep only the fastest-growing term. That growth class — O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ), O(n!) — is the algorithm's fingerprint. On a big enough input the class always dominates the constant factor, so a better class beats a faster machine.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "Parts 1–3 gave you a computer and the means to program it. But knowing *how* to express a computation says nothing about whether it will finish in time. Two programs can both be correct and differ by a factor of a billion on the same input. This part is about that other axis — **efficiency** — and it opens with the single most useful idea in it: a way to predict how an algorithm scales **without running it**, without a stopwatch, and without caring what machine you're on.",
    },
    {
      kind: "prose",
      md:
        "## Count work, not seconds\n" +
        "Why not just time it? Because a stopwatch measures your laptop, your language, the JIT (ch.11), and today's input — not the algorithm. Change any of those and the number moves. So instead we **count basic operations** as a function of the input size **n**, then do two ruthless simplifications: **drop constant factors** (2n and 100n both scale like n) and **keep only the fastest-growing term** (n² + n is just n² once n is large). What's left is the *growth class* — and it's a property of the algorithm itself. Pick an algorithm and a size, and race the classes on real, instrumented op-counts:",
    },
    { kind: "sim", sim: "growth-racer" },
    {
      kind: "prose",
      md:
        "## The ladder of growth\n" +
        "A handful of classes cover almost everything you'll meet. **O(1)** constant — a hash lookup or array index, the same cost no matter how big the data. **O(log n)** logarithmic — binary search, halving the problem each step; a million items in ~20 probes. **O(n)** linear — one scan. **O(n log n)** — the good sorts (ch.16), a scan done log-n times. **O(n²)** quadratic — nested loops, every pair. **O(2ⁿ)** exponential — trying every subset. **O(n!)** factorial — every ordering. The last two are walls: they're fine at n = 10 and hopeless at n = 100.",
    },
    { kind: "figure", fig: "complexity-ladder", caption: "The ladder to redraw from memory: each rung with a concrete cost at n = 1,000. The jump from n² to 2ⁿ is the cliff between “slow” and “impossible.”" },
    {
      kind: "prose",
      md:
        "## Best, worst, and average\n" +
        "One algorithm can have three different costs depending on the input. **Best case** is the lucky input (linear search finds it first — O(1)). **Worst case** is the adversarial one (it's last, or absent — O(n)); this is the **guarantee** you can promise a caller. **Average case** needs an assumption about the distribution of inputs, and can differ sharply: **quicksort** is O(n log n) on average but O(n²) on its worst input. When someone says “quicksort is n log n,” they mean *average*; the honest full answer names all three.",
    },
    { kind: "quiz", quiz: "match-the-O" },
    {
      kind: "prose",
      md:
        "## Amortized: paying for the occasional expensive op\n" +
        "Sometimes *most* operations are cheap and a *rare* one is expensive — and averaging them over the whole sequence gives a guarantee that neither best- nor worst-case captures. The canonical example is the **growable array** (ch.14). Appending is normally O(1), but when it fills it must **allocate a bigger block and copy everything** — O(n). If you double the capacity each time, those expensive copies get so rare that the cost *per push, averaged over any sequence*, is **O(1) amortized**. Watch the per-op spikes at each doubling, and the running average flatten:",
    },
    { kind: "sim", sim: "amortized-doubling" },
    {
      kind: "compare",
      a: "Double the capacity (×2)",
      b: "Grow by a fixed chunk (+k)",
      rows: [
        ["Resizes over n pushes", "~log₂ n (rare)", "~n/k (frequent)"],
        ["Total elements copied", "~n (a geometric sum)", "~n²/2k (an arithmetic sum)"],
        ["Amortized cost per push", "O(1)", "O(n)"],
      ],
    },
    {
      kind: "formal",
      title: "Formal corner — O, Ω, Θ, and why the difference matters",
      md:
        "**f(n) = O(g(n))** means there exist constants c > 0 and n₀ such that f(n) ≤ c·g(n) for all n ≥ n₀ — an **upper bound** (g grows *at least* as fast as f). **Ω(g)** is the mirror **lower bound**; **Θ(g)** is both at once — a **tight** bound. Little-**o** is a strict upper bound (f becomes negligible against g).\n" +
        "The trap: O is *only* an upper bound, so a linear scan is O(n), O(n²), and O(2ⁿ) — all technically true, only the first useful. Say **Θ(n)** when you mean “grows exactly like n.” **Amortized** analysis (Robert Tarjan, 1985) is a separate axis: it bounds the *worst-case average over a sequence* of operations — not a probabilistic average, but a guarantee that any n operations together cost O(n), so each is O(1) amortized.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Constants and cache still decide real races",
      lens: "senior",
      md:
        "Big-O throws away exactly the constant factor and the memory-access reality that ch.8 spent a whole chapter on. For small n, a Θ(n²) algorithm with a tiny constant and perfect cache locality routinely beats a Θ(n log n) one that pointer-chases — which is why production sorts (ch.16) drop to insertion sort below ~16 elements, and why an array can outrun a “better” linked list (ch.14). Big-O tells you who wins *eventually*; the constant tells you *where* eventually starts.",
    },
    {
      kind: "callout",
      tone: "warn",
      title: "Asymptotic means eventually",
      md:
        "Every Big-O statement is about behavior as n → ∞. For the n in front of you today, the lower-order terms and constants you dropped may dominate. This is not a licence to ignore Big-O — a worse class *will* catch up and bury you as data grows — but it is a reminder to know your actual n, and to measure when the classes are close.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You can now rank algorithms by how they scale, and spot the difference between a program that works and one that works *at scale*. But algorithms don't run in a vacuum — they run over **data structures**, and each structure makes some operations cheap and others expensive for concrete, physical reasons. ch.14 starts with the linear ones — arrays, lists, stacks, queues, and the near-magical hash table — and shows where each of these Big-O costs actually comes from.",
    },
  ],
  keyPoints: [
    "Big-O measures growth, not time — count basic operations as a function of input size n, drop constant factors, and keep only the fastest-growing term; the result is a property of the algorithm, not the machine.",
    "On a big enough input the growth class always wins — an O(log n) algorithm on a slow machine eventually beats an O(n²) one on a fast machine; choosing a better class beats buying better hardware.",
    "Know the ladder, best to worst — O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!), and a real example of each; the step from n² to 2ⁿ is the cliff from slow to impossible.",
    "Best, worst, and average are different questions — worst-case is the guarantee you can promise; average-case needs an assumption about input distribution (quicksort is O(n log n) average but O(n²) worst).",
    "Amortized is not average-case — it spreads a few expensive operations over a whole sequence with a worst-case guarantee, which is why a growable array's push is O(1) amortized even though the doubling copy is O(n).",
    "Big-O is an upper bound; Θ is tight — calling a linear scan O(n²) is true but useless; use Θ(n) when you mean it grows exactly like n, and Ω for a lower bound.",
    "Asymptotics hide constants and cache — for small n the dropped constant factor and memory locality (ch.8) can dominate, so real libraries switch to a simpler algorithm below a size threshold.",
  ],
  pitfalls: [
    {
      title: "Optimizing the constant instead of the class",
      body: "Shaving instructions off a loop body speeds up a constant factor; if the algorithm is O(n²), a better class dwarfs any such win the moment the data grows. Find the dominant term first, then optimize inside it.",
      lens: "both",
    },
    {
      title: "Confusing amortized with average-case",
      body: "Amortized analysis is a worst-case guarantee spread over a sequence of operations — it assumes nothing about the distribution of inputs. Average-case does, and can be wrong if your inputs are adversarial. They answer different questions; don't swap them.",
      lens: "senior",
    },
    {
      title: "Reading Big-O as a promise of speed",
      body: "O() describes growth as n → ∞, not the wall-clock time for your actual n. For small inputs the terms and constants you dropped may dominate, and two algorithms in the same class can differ 100×. When it matters and the classes are close, measure.",
      lens: "both",
    },
    {
      title: "Adding when you should multiply (and vice-versa)",
      body: "Two loops one after another are O(n) + O(n) = O(n); one loop nested inside another is O(n) × O(n) = O(n²). Mis-reading sequential as nested (or the reverse) is the most common complexity error in code review.",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch13-1", "iv-ch13-2", "iv-ch13-3", "iv-ch13-4", "iv-ch13-5"],
  kataIds: ["binary-search", "dynamic-array", "dedup-sorted"],
  seeAlso: ["ch8", "ch14", "ch16", "ch21"],
  sources: [
    { title: "Big O notation — Bachmann (1894), Landau, and Knuth's reintroduction to CS (Wikipedia)", url: "https://en.wikipedia.org/wiki/Big_O_notation" },
    { title: "Donald Knuth, “Big Omicron and big Omega and big Theta,” ACM SIGACT News (1976)", url: "https://dl.acm.org/doi/10.1145/1008328.1008329" },
    { title: "Robert Tarjan, “Amortized Computational Complexity,” SIAM J. Alg. Disc. Meth. (1985)", url: "https://epubs.siam.org/doi/10.1137/0606031" },
    { title: "Big-O Cheat Sheet — time/space complexity of common data structures and algorithms", url: "https://www.bigocheatsheet.com/" },
  ],
};

// ---------------------------------------------------------------
// ch.14 — Linear structures  (built in S7)
// ---------------------------------------------------------------
const ch14: Chapter = {
  id: "ch14",
  part: "p4",
  order: 16,
  title: "Linear structures",
  tagline: "Arrays, linked lists, stacks, queues and hash tables — the containers you reach for a hundred times a day, and the memory-layout reasons each is fast at some things and slow at others",
  readMins: { foundations: 22, senior: 35 },
  storyHook: {
    md:
      "January 1953. At IBM, **Hans Peter Luhn** writes an internal memo on a problem that sounds mundane and turns out to be foundational: how do you find a record *fast* when the keys are scattered? His idea is to run the key through a function that spits out a **bucket** number, and store the record there — so a lookup goes *straight* to the bucket instead of searching. When two keys land in the same bucket, he strings them together in a little chain. In a handful of pages Luhn sketched two of this chapter's stars at once: the **hash table** (with chaining) and the **linked list**. Seventy years later they're in every program you write. This chapter is that memo, made touchable.",
  },
  assumes: [
    {
      chapterId: "ch6",
      oneLiner: "Memory is a huge array of numbered cells, and reading or writing a cell by its address takes the same small constant time no matter which cell it is.",
    },
  ],
  mentalModel:
    "A data structure is a deal: you pick a memory layout that makes the operations you care about fast, and pay for it on the ones you don't. An array is one contiguous block — instant indexing and cache-friendly scans, but costly middle inserts. A linked list scatters nodes joined by pointers — cheap splicing, but pointer-chasing that thrashes the cache and no way to jump to the i-th item. Stacks (LIFO) and queues (FIFO) deliberately restrict access to make intent clear and both ends O(1). A hash table trades a little space and a hash function for near-O(1) lookup by key.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "ch.13 gave you the language of cost; this chapter gives you the things that cost. Every operation on these structures has one of the Big-O prices you just learned — and, crucially, that price is not arbitrary. It falls straight out of **how the structure sits in memory** (ch.6) and **how the cache treats that layout** (ch.8). Get the layout in your head and the complexities stop being facts to memorize and become things you can *derive*.",
    },
    {
      kind: "prose",
      md:
        "## Arrays: contiguous, and instant to index\n" +
        "An **array** is n elements laid **back-to-back** from a base address. Because they're contiguous and equal-sized, element *i* lives at exactly `base + i × size` — one multiply-add, so **indexing is O(1)** for any i. Scanning is even better than that arithmetic suggests: a single cache line drags in several neighbours at once (ch.8), so a linear walk is about as fast as memory gets. The bill comes due on **structural change** — inserting or deleting in the middle must **shift every following element** (O(n)), and growing past the block means allocating a bigger one and copying (the amortized doubling of ch.13).",
    },
    { kind: "sim", sim: "array-vs-list-memory" },
    {
      kind: "prose",
      md:
        "## Linked lists: cheap to splice, costly to find\n" +
        "A **linked list** gives up contiguity. Each element is a **node** holding its value plus a **pointer** to the next node, and the nodes can live anywhere in memory. That makes **insertion and deletion O(1)** *if you already hold the node* — just rewire two pointers, no shifting. But you pay twice: there's **no indexing** (to reach the i-th node you walk from the head — O(n)), and because nodes are scattered, **each hop is a likely cache miss**. That second cost is invisible in Big-O and brutal in practice — the reason arrays usually win real benchmarks even where a list has the better complexity on paper.",
    },
    {
      kind: "compare",
      a: "Array (contiguous)",
      b: "Linked list (pointers)",
      rows: [
        ["Index the i-th element", "O(1) — base + i×size", "O(n) — walk from the head"],
        ["Insert/delete at a held position", "O(n) — shift the tail", "O(1) — rewire two pointers"],
        ["Cache behavior on a scan", "Excellent — neighbours share a line", "Poor — every hop may miss"],
        ["Memory overhead per element", "None", "A pointer (or two) per node"],
      ],
    },
    { kind: "figure", fig: "memory-hierarchy", caption: "Why pointer-chasing hurts: a cache miss is a trip to a far-away city. The array keeps its data on one street; the linked list sends you across town for every node." },
    {
      kind: "prose",
      md:
        "## Stacks & queues: access with intent\n" +
        "Sometimes the power move is to *restrict* access. A **stack** allows adds and removes at **one end only** — **LIFO**, last-in-first-out. You've already met it: the **call stack** (ch.10) is exactly this, and so is undo, and the depth-first search of ch.17. A **queue** adds at the back and removes from the front — **FIFO**, first-in-first-out — the shape of buffers, fair scheduling (ch.22), and breadth-first search (ch.17). Both give **O(1)** at their working ends. Watch the same value stream drain in opposite orders:",
    },
    { kind: "sim", sim: "stack-queue-stepper" },
    {
      kind: "prose",
      md:
        "## Hash tables: near-O(1) lookup by key\n" +
        "The structures so far find things by *position*. A **hash table** finds them by **key** — and in **O(1) average time**. The trick is Luhn's: run the key through a **hash function** to get a **bucket index**, and store the value there; a lookup hashes the key and goes *straight* to the bucket. The catch is **collisions** — different keys hashing to the same bucket, which the pigeonhole principle makes inevitable. Step through one lookup end to end, then experiment with what makes it fast or slow:",
    },
    { kind: "figure", fig: "hash-anatomy", caption: "One lookup, stepped: key → hash → mod table size → home bucket → resolve any collision by walking a chain or probing to the next slot." },
    { kind: "sim", sim: "hash-collision-lab" },
    {
      kind: "prose",
      md:
        "## Collisions, load factor, and resizing\n" +
        "Two classic fixes for collisions. **Chaining**: each bucket holds a little list (Luhn's chain); a collision just appends. **Open addressing**: keep one entry per slot and, on a collision, **probe** to the next free slot (linear probing). Either way, the enemy is the **load factor** α = n / m (entries over buckets): as it climbs, chains lengthen and probe runs **cluster**, and lookup drifts from O(1) toward O(n). So real tables **resize** — double m and rehash everything — once α crosses a threshold (~0.75). That rehash is O(n), but rare, so it's **O(1) amortized** (ch.13 again).",
    },
    { kind: "quiz", quiz: "where-it-lands" },
    {
      kind: "formal",
      title: "Formal corner — why hashing is O(1) on average",
      md:
        "Under the **simple uniform hashing** assumption (each key equally likely to land in any bucket, independently), a table of m buckets holding n keys has expected chain length **α = n / m** per bucket. An unsuccessful search scans one chain: **expected O(1 + α)** — constant if you keep α bounded. For **open addressing**, the expected probes for an unsuccessful search are about **1 / (1 − α)** — 2 probes at α = 0.5, but **10** at α = 0.9 and → ∞ as α → 1, which is why open-addressed tables resize earlier than chained ones. Keep α constant by resizing and both stay O(1) amortized; the whole edifice rests on the hash spreading keys evenly.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "The good hash is doing real work — and it's a security boundary",
      lens: "senior",
      md:
        "Everything above assumed keys spread evenly. A **bad hash** that ignores most of the key (say, only its first character) collapses everything into a few buckets, and your O(1) table becomes an O(n) linked list wearing a costume — flip the hash selector in the lab to watch it happen. Worse, if an attacker can *predict* your hash, they can craft thousands of keys that all collide on purpose — a **hash-flooding** denial-of-service that turns every request O(n) (ch.32). Production hash maps defend with **randomized, keyed hashes** (e.g. SipHash) so collisions can't be engineered. Open addressing is more cache-friendly than chaining (entries are contiguous), but it's more sensitive to a high load factor — the trade-off never fully disappears.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "Linear structures get you astonishingly far. But some jobs need **hierarchy**: keeping data sorted for fast range queries, always pulling out the smallest thing, or matching by prefix. For those you bend the line into a **tree** — and ch.15 shows how a good tree keeps the O(log n) promise that a sorted array can't when it has to change.",
    },
  ],
  keyPoints: [
    "A data structure is a trade — you choose a memory layout that makes the operations you care about fast, and accept the cost it imposes on the ones you don't.",
    "Arrays index in O(1) and scan cache-friendly — element i sits at base + i×size, and contiguous layout lets a cache line pull in neighbours (ch.8); the price is O(n) middle inserts and an amortized copy to grow (ch.13).",
    "Linked lists splice in O(1) but find in O(n) — rewiring pointers is cheap, but there's no indexing and every hop is a likely cache miss, so arrays often win in practice despite the list's better insert complexity.",
    "Stacks and queues restrict access on purpose — a stack is LIFO (the call stack, undo, DFS), a queue is FIFO (buffers, scheduling, BFS); both are O(1) at their working ends.",
    "A hash table trades space and a hash function for O(1) average lookup by key — hash the key to a bucket and go straight there, instead of searching by position.",
    "Collisions are inevitable and have two classic fixes — chaining (a list per bucket) and open addressing (probe to the next slot); a bad hash or a high load factor drags lookup back toward O(n).",
    "Load factor α = n/m drives resizing — past ~0.75 chains lengthen and probes cluster, so the table doubles and rehashes: an O(n) step that is O(1) amortized (ch.13).",
  ],
  pitfalls: [
    {
      title: "“Linked lists are faster than arrays”",
      body: "For an insert when you already hold the node, yes. But a list has no O(1) indexing and terrible cache locality, so for traversal, search, and most real workloads the array wins — often by an order of magnitude. Reach for a list only when you're constantly splicing at held positions.",
      lens: "both",
    },
    {
      title: "Treating hash lookup as unconditionally O(1)",
      body: "It's O(1) *average*, and only with a good hash and a bounded load factor. The worst case — a bad hash, adversarial keys, or α near 1 — is O(n). Never rely on hash-table timing in a security- or latency-critical path without accounting for that tail.",
      lens: "senior",
    },
    {
      title: "Using an array's front as a queue",
      body: "Dequeuing from the front of a plain array (JavaScript's Array.shift) moves every remaining element down — O(n) per dequeue, O(n²) to drain. Use a ring buffer or a real deque for O(1) at both ends.",
      lens: "both",
    },
    {
      title: "Budgeting the resize as a per-operation cost",
      body: "One push that triggers a doubling copy is O(n), and one insert that triggers a rehash is O(n) — but averaged over the sequence each is O(1) amortized (ch.13). Sizing your worst-case latency as if every op pays the resize is a costly over-estimate; sizing it as if none ever does is a latency-spike bug.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch14-1", "iv-ch14-2", "iv-ch14-3", "iv-ch14-4", "iv-ch14-5"],
  kataIds: ["stack-impl", "queue-ring", "is-balanced", "hashmap-chaining", "two-sum", "reverse-list", "lru-cache"],
  seeAlso: ["ch6", "ch8", "ch13", "ch15", "ch29", "ch32"],
  sources: [
    { title: "Hans Peter Luhn and the birth of the hashing algorithm (IEEE Spectrum)", url: "https://spectrum.ieee.org/hans-peter-luhn-and-the-birth-of-the-hashing-algorithm" },
    { title: "Hash table — chaining, open addressing, load factor, and resizing (Wikipedia)", url: "https://en.wikipedia.org/wiki/Hash_table" },
    { title: "Linked list — nodes, pointers, and the O(1)-splice / O(n)-index trade (Wikipedia)", url: "https://en.wikipedia.org/wiki/Linked_list" },
    { title: "Dynamic array — amortized O(1) append via geometric growth (Wikipedia)", url: "https://en.wikipedia.org/wiki/Dynamic_array" },
  ],
};

// ---------------------------------------------------------------
// ch.15 — Trees & heaps  (built in S8)
// ---------------------------------------------------------------
const ch15: Chapter = {
  id: "ch15",
  part: "p4",
  order: 17,
  title: "Trees & heaps",
  tagline:
    "Bending the line into a hierarchy — search trees that stay balanced under adversarial input, heaps that always surface the smallest, and tries that share prefixes",
  readMins: { foundations: 22, senior: 35 },
  storyHook: {
    md:
      "1962, Moscow. Two Soviet mathematicians — **Georgy Adelson-Velsky** and **Evgenii Landis** — publish a four-page paper, *An algorithm for the organization of information*. In it is the first data structure that keeps a search tree **short on purpose**: after every insertion it checks whether any node has grown lopsided and, if so, performs a tiny local **rotation** to even it out. Their initials name it — the **AVL tree** — and it settles a problem that had quietly haunted the young field: a binary search tree is beautifully fast *until* you feed it sorted keys, at which point it collapses into a slow list. Two years later J. W. J. Williams would pack a different tree into a flat array to build the **heap** (1964); Edward Fredkin had already spent a key one letter at a time in the **trie** (1960, from re**trie**val). This chapter is those three shapes, made touchable.",
  },
  assumes: [
    {
      chapterId: "ch14",
      oneLiner: "A node is a value plus pointers to other nodes; arrays are contiguous and index in O(1). Trees are nodes wired into a branching shape.",
    },
    {
      chapterId: "ch13",
      oneLiner: "O(log n) is exponentially better than O(n): doubling n adds one step, not double the steps. Keeping a tree's height at log n is the whole game.",
    },
  ],
  mentalModel:
    "A binary search tree pours a total order into a branching shape: every node's left subtree is all-smaller and its right subtree all-larger, so search, insert and delete each follow ONE root-to-leaf path — cost O(height). The entire art is keeping height near log n. A balanced tree (AVL, red-black) rotates after each change to guarantee it; a naive tree fed sorted keys degenerates into a linked list and every operation slumps to O(n). A heap gives up full ordering for just 'parent ≤ children', which keeps the minimum at the root and lets the whole tree live in a flat array with no pointers. A trie spends the key one character per level, so keys that share a prefix share nodes.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "ch.14 gave you **linear** containers — arrays, lists, stacks, queues, hash tables. They're superb at what they do, but a straight line can't answer *ordered* questions cheaply: give me the next-biggest key, everything between 10 and 20, the current minimum, every word starting with 'car'. For those you bend the line into a **tree** — a branching hierarchy where the right structure keeps those questions at O(log n) instead of O(n).",
    },
    {
      kind: "prose",
      md:
        "## The binary search tree\n" +
        "A **binary search tree (BST)** stores one key per node under a single invariant: **every key in the left subtree is smaller, every key in the right subtree is larger**. That invariant turns search into a decision at each node — go left for smaller, right for larger — so a lookup walks **one root-to-leaf path**, doing O(**height**) comparisons. Insert works the same way, attaching a new leaf where the search falls off the tree. And the payoff that a hash table can't match: an **in-order traversal** (left, node, right) visits the keys **in sorted order**, for free. Build one and watch every operation trace its path:",
    },
    { kind: "sim", sim: "bst-builder" },
    {
      kind: "prose",
      md:
        "## The catch: balance is not automatic\n" +
        "That O(height) is only good news if the height is small. Insert keys in **sorted order** — 10, 20, 30, 40 — and each new key is larger than everything, so it hangs off the right again and again. The 'tree' becomes a **linked list wearing a tree costume**: height n, every operation O(n). This isn't a rare edge case; sorted or nearly-sorted input is *common*. A BST that doesn't defend against it is a performance trap. The fix is to **rebalance** after each change — and the key move is a **rotation**, which reshapes three nodes while preserving the search invariant:",
    },
    { kind: "figure", fig: "tree-rotation", caption: "A rotation lifts a child above its parent and re-hangs the middle subtree — O(1) pointer surgery that lowers the tall side without breaking the left-smaller / right-larger order." },
    {
      kind: "prose",
      md:
        "## Self-balancing: the AVL tree\n" +
        "An **AVL tree** is a BST that never lets any node get lopsided. Each node tracks its **balance factor** — the height of its left subtree minus its right. The invariant is simply **|balance factor| ≤ 1** everywhere. The instant an insert or delete pushes some node to ±2, the tree performs the one rotation (or pair of rotations) that fixes it, in **O(1)**. There are exactly four cases by where the offending node landed — **LL** and **RR** need a single rotation, **LR** and **RL** need a double — and that's the whole algorithm. The guarantee: height stays below **~1.44·log₂n**, so every operation is O(log n) *forever*, even under the sorted-input attack. Flip the sim above into **AVL mode** and insert 1, 2, 3, 4, 5 in order — instead of a stick, you get a bush that rotates itself level.",
    },
    {
      kind: "callout",
      tone: "senior",
      title: "Red-black trees are what your standard library actually ships",
      lens: "senior",
      md:
        "AVL is the cleanest balancing story, but most libraries use a cousin: the **red-black tree**. It colors nodes red or black and balances on two rules — no red node has a red child, and every root-to-leaf path crosses the same number of black nodes. That's a **looser** balance than AVL (a red-black tree can be up to 2× the shortest path tall, vs AVL's tighter bound), which means **fewer rotations per write** — a better trade when writes are frequent. So AVL wins on lookup-heavy workloads (shorter trees), red-black wins on write-heavy ones. `std::map`, Java's `TreeMap`, and the Linux kernel's process scheduler all run on red-black trees.",
    },
    { kind: "figure", fig: "rb-intuition", caption: "Red-black rules as intuition: 'no two reds in a row' plus 'equal black-height on every path' together force the longest path to be at most twice the shortest — which is exactly O(log n) height." },
    {
      kind: "compare",
      a: "AVL tree",
      b: "Red-black tree",
      rows: [
        ["Balance discipline", "Strict: |balance factor| ≤ 1", "Loose: longest path ≤ 2× shortest"],
        ["Height", "Shorter (≤ ~1.44 log n)", "Taller (≤ ~2 log n)"],
        ["Rotations per write", "More (keeps it tight)", "Fewer (cheaper writes)"],
        ["Best for", "Lookup-heavy workloads", "Write-heavy workloads (library default)"],
      ],
    },
    {
      kind: "formal",
      title: "Formal corner — why AVL height stays logarithmic",
      md:
        "Let N(h) be the **minimum** number of nodes in an AVL tree of height h. A shortest AVL tree of height h has a root, one subtree of height h−1, and — since balance allows a difference of 1 — the other of height h−2. So **N(h) = 1 + N(h−1) + N(h−2)**, with N(0)=0, N(1)=1. That's the Fibonacci recurrence shifted by a constant: N(h) = F(h+2) − 1. Because Fibonacci grows like φʰ (φ ≈ 1.618), a tree with n nodes has height **h ≤ log_φ(n) ≈ 1.4404·log₂n**. The strict balance factor buys a provable logarithmic height — no input can make an AVL tree tall.",
    },
    {
      kind: "prose",
      md:
        "## Heaps: always the smallest, and no pointers at all\n" +
        "A **heap** relaxes the BST's demand. Instead of a full left-smaller/right-larger order, it asks only that **every parent is ≤ its children** (a min-heap). That's weak enough that the **minimum is always the root** — O(1) to peek — yet strong enough to be useful, and it's the structure behind every **priority queue**. The magic is the storage: a heap is a **complete** tree (every level full, last level filled left-to-right), and a complete tree needs **no pointers** — it packs into a plain array where `parent(i) = ⌊(i−1)/2⌋` and the children of i are `2i+1` and `2i+2`. The tree is just an *indexing convention* over a contiguous array (ch.14), which is why heaps are so cache-friendly:",
    },
    { kind: "sim", sim: "heap-operations" },
    {
      kind: "prose",
      md:
        "## Two O(log n) moves, and an O(n) surprise\n" +
        "Both updates restore the invariant by walking **one path**. **push**: drop the new value at the end (keeping the tree complete), then **sift up** — swap with the parent while it's smaller. **pop-min**: take the root, move the last element up to fill the hole, then **sift down** — swap with the *smaller* child while it's larger. Each is O(log n). But **building** a heap from a raw array is the pleasant surprise: sifting down every internal node from the bottom up (Floyd's method, 1964) is **O(n)**, not O(n log n) — because most nodes are near the leaves and barely move.",
    },
    {
      kind: "formal",
      title: "Formal corner — why build-heap is O(n), not O(n log n)",
      md:
        "Naively, building a heap by n insertions costs O(n log n). Floyd's bottom-up build-heap does better. A node at height h can sift down at most h levels, and a complete tree of n nodes has about **n / 2^(h+1)** nodes at height h. Total work is Σ h·(n / 2^(h+1)) = n · Σ h/2^(h+1). The sum Σ h/2^h converges to **2** (a constant), so the total is **O(n)**. The intuition: half the nodes are leaves that do zero work, a quarter sift down at most once, an eighth at most twice — the expensive nodes near the root are too few to matter. Heapsort then pops n times at O(log n) each for its O(n log n) total (ch.16), but the *build* is linear.",
    },
    {
      kind: "prose",
      md:
        "## Tries: spend the key one character at a time\n" +
        "A last shape for a special job: matching by **prefix**. A **trie** (from re**trie**val) makes each **edge a character**, so the path from the root spells a prefix and a flagged node means 'a word ends here'. Two consequences fall out. First, lookup and insert cost **O(key length)** — *independent of how many keys the trie holds*, because you never compare against other keys, you just walk letters. Second, words that share a prefix **share the nodes** for it, so the subtree under any prefix is exactly its set of completions — which makes **autocomplete** trivial: walk to the prefix, then collect everything below. Type into one:",
    },
    { kind: "sim", sim: "trie-autocomplete" },
    { kind: "quiz", quiz: "tree-predict" },
    {
      kind: "table",
      caption: "Pick the structure by the operations you need — not out of habit. (n = number of keys; L = key length; balanced = AVL/red-black.)",
      head: ["Structure", "Search by key", "Min / ordered iteration", "Prefix / range"],
      rows: [
        ["Sorted array", "O(log n) — binary search", "O(1) min · O(n) iterate", "Range: O(log n + k)"],
        ["Hash table", "O(1) average", "No order — O(n) scan", "No — hashing destroys order"],
        ["Balanced BST", "O(log n)", "O(log n) min · O(n) in-order", "Range: O(log n + k)"],
        ["Binary heap", "O(n) — not searchable", "O(1) peek-min · O(log n) pop", "No"],
        ["Trie", "O(L)", "O(n) ordered walk", "Prefix: O(L + matches)"],
      ],
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "One more tree is coming: when the data is too big for RAM and lives on disk, the winner is the **B-tree** — a shallow, high-fan-out tree tuned so each node is one disk page, keeping the number of slow disk reads tiny. That's the heart of every database index, and ch.29 builds one. But first, ch.16 turns to the operations these structures assume you can do — **sorting** a pile of keys, and **searching** a sorted one — and to the surprising limits on how fast sorting can possibly be.",
    },
  ],
  keyPoints: [
    "A binary search tree pours a total order into a branching shape — left subtree all-smaller, right all-larger — so search, insert and delete each follow one root-to-leaf path at O(height), and an in-order traversal yields the keys already sorted.",
    "Height is the whole game — a balanced tree is O(log n) per operation, but a plain BST fed sorted keys degenerates into a linked list where every operation is O(n).",
    "Self-balancing trees rotate to stay short — an AVL tree keeps every node's balance factor in {−1,0,1} using O(1) rotations (LL/RR single, LR/RL double), guaranteeing height ≤ ~1.44·log₂n against any input.",
    "Red-black trees are the library default — looser balance than AVL means fewer rotations per write (and a slightly taller tree), which is why std::map, Java's TreeMap and the Linux scheduler use them.",
    "A heap is a complete tree with the heap-order property (parent ≤ children) — the minimum is always the root (O(1) peek), and it lives in a flat array with parent = ⌊(i−1)/2⌋ and children 2i+1, 2i+2, no pointers needed.",
    "Heap push and pop are O(log n) via sift-up / sift-down, but build-heap is O(n) — Floyd's bottom-up construction beats n separate insertions because most nodes sit near the leaves and barely move.",
    "A trie spends the key one character per level — lookup and insert are O(key length) regardless of how many keys are stored, and shared prefixes share nodes, so autocomplete is just collecting the subtree under a prefix.",
    "Match the structure to the operation — a hash table wins pure key lookup, but only an ordered structure (balanced BST, heap, trie) supports min-extraction, ordered iteration, range queries or prefix search.",
  ],
  pitfalls: [
    {
      title: "Assuming a plain BST is O(log n)",
      body: "It's O(log n) only if it stays balanced, and nothing balances it for you. Sorted, reverse-sorted, or adversarial insertions make it O(n) per operation — a linked list in disguise. Use a self-balancing tree (AVL / red-black) or your language's ordered map, which is one already.",
      lens: "both",
    },
    {
      title: "Treating a heap like a sorted structure",
      body: "A heap is only partially ordered: the root is the min, but siblings and cousins are in no particular order. You cannot binary-search a heap, an in-order walk is NOT sorted, and finding an arbitrary key is O(n). A heap gives you the min fast and nothing else fast — reach for it only when min-extraction is what you need.",
      lens: "both",
    },
    {
      title: "Off-by-one in the heap index arithmetic",
      body: "With 0-based arrays the parent of i is ⌊(i−1)/2⌋ and the children are 2i+1 and 2i+2. Copying the 1-based textbook formulas (parent = i/2, children 2i, 2i+1) onto a 0-based array silently corrupts the heap. Pick a convention and pin it with a test — the sim and scripts/test-ch15.ts both use 0-based.",
      lens: "both",
    },
    {
      title: "Using a trie for sparse or non-string keys",
      body: "A trie shines when keys are strings that share prefixes. Give each node a full 256-slot array for arbitrary bytes, or store random high-entropy keys, and it explodes in memory for little benefit. Use a map per node, a compressed (radix) trie, or just a hash table when there's no prefix structure to exploit.",
      lens: "senior",
    },
  ],
  interviewIds: ["iv-ch15-1", "iv-ch15-2", "iv-ch15-3", "iv-ch15-4", "iv-ch15-5"],
  kataIds: ["bst-insert", "validate-bst", "bst-level-order", "min-heap", "heapify", "trie-autocomplete"],
  seeAlso: ["ch13", "ch14", "ch16", "ch29"],
  sources: [
    { title: "AVL tree — Adelson-Velsky & Landis (1962), the first self-balancing BST (Wikipedia)", url: "https://en.wikipedia.org/wiki/AVL_tree" },
    { title: "Red-black tree — looser balance, the library default (Wikipedia)", url: "https://en.wikipedia.org/wiki/Red%E2%80%93black_tree" },
    { title: "Binary heap — J. W. J. Williams (1964), Floyd's O(n) build-heap (Wikipedia)", url: "https://en.wikipedia.org/wiki/Binary_heap" },
    { title: "Trie — prefix tree, coined by Fredkin from 're-trie-val' (Wikipedia)", url: "https://en.wikipedia.org/wiki/Trie" },
  ],
};

// ---------------------------------------------------------------
// ch.16 — Sorting & searching  (built in S8)
// ---------------------------------------------------------------
const ch16: Chapter = {
  id: "ch16",
  part: "p4",
  order: 18,
  title: "Sorting & searching",
  tagline:
    "Binary search's O(log n) reward for keeping data sorted, the classic sorts and how to race them fairly, stability, and why comparison sorts can't beat n log n — but counting and radix can",
  readMins: { foundations: 22, senior: 35 },
  storyHook: {
    md:
      "1959, Moscow State University. A 25-year-old British exchange student named **Tony Hoare** is set a problem in machine translation: translate Russian sentences into English by looking each word up in a dictionary stored on **magnetic tape**. Tape is agonizingly slow to seek, so Hoare realizes he should **sort the words of each sentence first**, then sweep the tape once. Casting about for a fast way to sort in memory, he invents **quicksort** — pick a pivot, partition everything smaller to one side and larger to the other, recurse. He can't yet write it down elegantly (ALGOL didn't have recursion he could reach), and it waits until 1961 to appear as *Algorithm 64* in the *Communications of the ACM*. Sixty-five years later it's still, in tuned form, the sort in your standard library. This chapter is the family it belongs to — and the wall none of them can climb past.",
  },
  assumes: [
    {
      chapterId: "ch13",
      oneLiner: "Cost is counted work, and algorithms have best / average / worst cases; O(n log n) sits between linear and quadratic.",
    },
    {
      chapterId: "ch15",
      oneLiner: "A heap surfaces the minimum in O(log n) — heapsort is just 'build a heap, then pop n times'. Balanced order is what search exploits.",
    },
  ],
  mentalModel:
    "Sorting is the investment; searching is the payoff. Keep data sorted and binary search finds anything in O(log n) by halving the window each probe. The comparison sorts differ only in HOW they divide the work — insertion grows a sorted prefix, selection repeatedly extracts the minimum, merge divides and merges, quick partitions around a pivot, heap drains a heap — but none can beat Ω(n log n) comparisons in the worst case, because sorting by yes/no comparisons is a decision tree with n! leaves. The only escape is to stop comparing: counting and radix use the keys themselves as array indices to sort in O(n + k), trading generality for linear speed when the keys are small integers.",
  sections: [
    {
      kind: "prose",
      md:
        "## Where you are in the stack\n" +
        "ch.15's structures *maintain* order as data arrives. This chapter is about the two operations that *impose* and *exploit* it: **sorting** an unordered pile, and **searching** a sorted one. They're a pair — sorting is worth the effort largely *because* a sorted array unlocks O(log n) search, dedup, grouping and range queries. We start with the payoff, because it's the simplest and the most bug-prone.",
    },
    {
      kind: "prose",
      md:
        "## Binary search: the payoff of sorted\n" +
        "Given a **sorted** array, you never scan. Look at the **middle** element: if it's your target, done; if it's too big, the answer is in the **left half**; too small, the **right half**. Each probe **halves** the live window, so you find anything in **⌊log₂n⌋+1** probes — about **20 for a million** elements, 30 for a billion. The idea is ancient and the mechanics are treacherous: the whole difficulty is the **boundary math** (is the window inclusive? does `hi` move to `mid` or `mid−1`?), where a single off-by-one either skips the answer or loops forever. Step one and watch the window collapse:",
    },
    { kind: "sim", sim: "binary-search" },
    {
      kind: "callout",
      tone: "senior",
      title: "The bug that hid in (lo + hi) / 2 for two decades",
      lens: "senior",
      md:
        "In 2006 Joshua Bloch — who wrote the JDK's binary search — published *Nearly All Binary Searches and Mergesorts are Broken*. The culprit: `int mid = (lo + hi) / 2`. When `lo + hi` exceeds the maximum `int` (about 2.1 billion), the sum **overflows to a negative number** and `mid` goes out of bounds. The version in Jon Bentley's *Programming Pearls* — *proven correct* and taught for twenty years — had it too; it just never mattered until arrays got past ~2³⁰ elements. The fix is to compute the offset instead of the sum: **`mid = lo + (hi − lo) / 2`**. A reminder that 'proven correct' is only as good as its model of the machine (ch.1's fixed-width integers).",
    },
    {
      kind: "prose",
      md:
        "## The comparison sorts\n" +
        "Now the pile. Five classics, each a different strategy for the same job. **Insertion** grows a sorted prefix, sliding each new element back into place — brilliant on nearly-sorted data. **Selection** repeatedly finds the minimum and swaps it forward — always the same n²/2 comparisons, but the fewest writes. **Merge** splits the array in half, sorts each, and merges the two sorted runs — a guaranteed O(n log n). **Quick** partitions around a pivot and recurses — fast and cache-friendly on average, but fragile. **Heap** builds a heap (ch.15) and pops the max n times — worst-case O(n log n) and in place.",
    },
    { kind: "figure", fig: "merge-recursion", caption: "Merge sort's divide-and-conquer: split to single elements (already sorted), then merge sorted runs pairwise back up. Each level does O(n) work across log n levels → O(n log n), guaranteed." },
    {
      kind: "prose",
      md:
        "## Race them — fairly\n" +
        "Which is fastest? The honest answer is *it depends*, so the sim races all seven at once — including two we haven't met — on **one dataset**, advancing by a single fair metric: **array accesses** (reads + writes), the count of times each algorithm touches memory. Comparisons are shown too, as a second column, because they hold the punchline. Change the **data shape** and the winner changes: on **already-sorted** input, insertion nearly walks it in one pass while naive quicksort **collapses to O(n²)**; on **few-unique** keys, two green newcomers run away from the pack.",
    },
    { kind: "sim", sim: "sorting-race" },
    {
      kind: "prose",
      md:
        "## Reading the race\n" +
        "Three lessons jump out. **Data shape matters more than the name**: insertion sort is O(n²) in general but near-O(n) when the array is almost sorted — which is why it's the base case inside industrial sorts. **Quicksort's worst case is real**: a last-element pivot on already-sorted data partitions into 0 and n−1 every time, giving n²/2 comparisons and O(n) stack depth — the reason real quicksorts randomize or use median-of-three. And **selection sort's writes are minimal** (≤ n−1 swaps) even though its comparisons are always maximal — occasionally the right pick when a write is far more expensive than a compare (e.g. sorting on flash memory).",
    },
    {
      kind: "prose",
      md:
        "## Stability\n" +
        "One property the bars can't show, because it's about *equal* keys. A sort is **stable** if elements with equal keys keep their **original relative order**. It sounds academic until you sort by two keys: sort a table by date, then *stably* by name, and you get names alphabetical with each person's rows still in date order. **Insertion, merge, counting and radix are stable; selection, quick and heap are not** (they fling equal elements past each other). When you sort records by a secondary key, stability is the difference between right and subtly wrong:",
    },
    { kind: "figure", fig: "sort-stability", caption: "Three equal keys (tagged a, b, c by color): a stable sort preserves a-b-c; an unstable one may emit a-c-b. Identical values, different provenance — stability is whether that provenance survives." },
    {
      kind: "table",
      caption: "The comparison sorts plus the two non-comparison sorts. n = elements, k = key range, d = digits, b = radix base. 'In place' = O(1) extra space beyond the input.",
      head: ["Sort", "Best / Average / Worst", "Stable?", "In place?"],
      rows: [
        ["Insertion", "n / n² / n²", "yes", "yes"],
        ["Selection", "n² / n² / n²", "no", "yes"],
        ["Merge", "n log n / n log n / n log n", "yes", "no — O(n)"],
        ["Quick", "n log n / n log n / n²", "no", "yes (O(log n) stack)"],
        ["Heap", "n log n / n log n / n log n", "no", "yes"],
        ["Counting", "n + k / n + k / n + k", "yes", "no — O(n + k)"],
        ["Radix (LSD)", "d(n + b) / d(n + b) / d(n + b)", "yes", "no — O(n + b)"],
      ],
    },
    {
      kind: "prose",
      md:
        "## The Ω(n log n) wall\n" +
        "Notice that no comparison sort in that table beats **n log n** in the worst case. That's not a failure of imagination — it's a **theorem**. Any sort that orders elements purely by asking 'is a < b?' is really navigating a **decision tree**: each comparison is a yes/no branch, and each of the **n!** possible input orderings must reach its own leaf. A binary tree with n! leaves has depth at least **log₂(n!) ≈ n log₂n** (Stirling). So *some* input always forces ~n log n comparisons. Comparison sorting cannot, even in principle, be linear.",
    },
    {
      kind: "formal",
      title: "Formal corner — the comparison lower bound",
      md:
        "Model a comparison sort as a binary **decision tree**: internal nodes are comparisons (a<b?), leaves are the sorted permutations. To sort correctly, the tree must have a distinct leaf for each of the **n!** input permutations, so it has ≥ n! leaves. A binary tree with L leaves has height ≥ **⌈log₂ L⌉**. Therefore worst-case comparisons ≥ log₂(n!) . By Stirling, log₂(n!) = n log₂n − n log₂e + O(log n) = **Θ(n log n)**. This bounds *comparisons*, which is why it doesn't apply to counting/radix — they never compare two elements, so they aren't nodes in this tree at all.",
    },
    {
      kind: "prose",
      md:
        "## Counting & radix: stop comparing\n" +
        "The only way under the wall is to **not compare**. **Counting sort** works when keys are small integers: tally how many of each key, turn the tallies into starting positions, and place each element directly — **O(n + k)** for key range k, with **zero comparisons**. **Radix sort** extends that to bigger keys by counting-sorting **one digit at a time**, least-significant first (stability across passes is what makes it work) — **O(d·(n + b))** for d digits. In the race, set the data to **few-unique** and watch counting and radix pull ahead: their comparison column is a hard **0**. The catch, and the reason they aren't the default: when the key range k is huge or keys aren't small integers, the k term dominates and a good comparison sort wins — plus they need O(n + k) scratch memory.",
    },
    { kind: "quiz", quiz: "sort-predict" },
    {
      kind: "callout",
      tone: "senior",
      title: "What real libraries actually ship",
      lens: "senior",
      md:
        "Nobody ships a textbook quicksort. Production sorts are **hybrids** tuned around these exact trade-offs. **Timsort** (Tim Peters, 2002 — Python's `sorted`, Java's `Arrays.sort` for objects) is a **stable** merge sort that finds already-sorted 'runs' and merges them, so real-world partly-ordered data sorts in near-O(n). **Introsort** (C++ `std::sort`) runs quicksort for speed but **watches its recursion depth** and switches to heapsort if a bad pivot threatens the O(n²) cliff — getting quicksort's average with heapsort's worst-case guarantee. Both fall back to **insertion sort** on small subarrays, where its low overhead wins. The lesson: the 'best sort' is an engineering blend of the ones in this chapter.",
    },
    {
      kind: "prose",
      md:
        "## What's next\n" +
        "You now have the toolkit for linear data and hierarchies, and the algorithms that order and search them. ch.17 removes the last restriction — that structure is a line or a tree — and lets any node connect to any other. That's a **graph**, the model behind maps, social networks, dependencies and the web, and it comes with its own signature searches (BFS, DFS, Dijkstra, A*) — the subject of Part 4's boss.",
    },
  ],
  keyPoints: [
    "Keep data sorted and binary search finds anything in O(log n) — each probe halves the live window; the classic bugs are the boundary math (≤ vs <, mid±1) and the (lo+hi)/2 integer overflow, fixed by lo + (hi−lo)/2.",
    "lower_bound is the workhorse variant — the first index whose value is ≥ target (the insertion point) — which finds the first of duplicate keys and powers range queries.",
    "The comparison sorts trade differently — insertion is O(n) on nearly-sorted data, selection is always n²/2 comparisons but minimal writes, merge is a guaranteed n log n at O(n) space, quicksort averages n log n but degrades to n² on a bad pivot, heapsort is worst-case n log n in place.",
    "'Fastest sort' depends on the data and the metric — racing on array accesses is fair to every sort, and the winner changes with input shape: insertion wins nearly-sorted, naive quicksort collapses on already-sorted.",
    "No comparison sort beats Ω(n log n) in the worst case — sorting by yes/no comparisons is a decision tree with n! leaves, and a binary tree with n! leaves has depth ≥ log₂(n!) ≈ n log n.",
    "Counting and radix escape the wall by not comparing — using keys as array indices they run in O(n + k) and O(d·(n + b)) with zero comparisons, winning when keys are small integers but wasting time and memory when the key range is large.",
    "Stability means equal keys keep their input order — insertion, merge, counting and radix are stable; selection, quick and heap are not — and it is what lets you correctly sort by one key and then another.",
    "Sorting is an investment that pays off in search — a sorted array unlocks O(log n) lookup, dedup, grouping and range queries, which is why 'sort first' is a default opening move in algorithm design.",
  ],
  pitfalls: [
    {
      title: "Binary searching an array that isn't sorted",
      body: "Binary search's entire contract is a sorted input; on unsorted data it doesn't error, it silently returns wrong answers. If you binary-search repeatedly, the sort must happen first (and stay valid on every mutation) — otherwise use a hash table for O(1) membership instead.",
      lens: "both",
    },
    {
      title: "Assuming quicksort is always O(n log n)",
      body: "A naive fixed pivot (first/last element) hits O(n²) time and O(n) stack depth on already-sorted or adversarial input — a real denial-of-service vector. Production quicksorts randomize the pivot or use median-of-three, and cap recursion depth by falling back to heapsort (introsort).",
      lens: "senior",
    },
    {
      title: "Reaching for counting or radix by default",
      body: "They're linear only when the key range k (or digit count d) is small relative to n. On 64-bit keys, floats, strings, or a sparse range, the k term dominates and they lose to a good comparison sort — while still paying O(n + k) extra memory. They're specialists, not the default.",
      lens: "both",
    },
    {
      title: "Ignoring stability when sorting records",
      body: "Sorting rows by a secondary key with an unstable sort scrambles the primary order you set up earlier. When you sort by A then B and expect ties in B to stay ordered by A, you must use a stable sort (or encode the tiebreak into the key). This bites hardest in multi-column table sorts.",
      lens: "both",
    },
  ],
  interviewIds: ["iv-ch16-1", "iv-ch16-2", "iv-ch16-3", "iv-ch16-4", "iv-ch16-5"],
  kataIds: ["binary-search-lower-bound", "merge-two-sorted", "quickselect", "counting-sort"],
  seeAlso: ["ch1", "ch13", "ch15", "ch17"],
  sources: [
    { title: "Quicksort — Hoare (1959, publ. CACM 1961 as Algorithm 64) (Wikipedia)", url: "https://en.wikipedia.org/wiki/Quicksort" },
    { title: "Comparison sort — the Ω(n log n) decision-tree lower bound (Wikipedia)", url: "https://en.wikipedia.org/wiki/Comparison_sort" },
    { title: "Binary search algorithm — variants and the boundary pitfalls (Wikipedia)", url: "https://en.wikipedia.org/wiki/Binary_search_algorithm" },
    { title: "J. Bloch, 'Nearly All Binary Searches and Mergesorts are Broken' (Google Research, 2006)", url: "https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/" },
    { title: "Radix sort — non-comparison, LSD/MSD, O(d·(n+b)) (Wikipedia)", url: "https://en.wikipedia.org/wiki/Radix_sort" },
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
  // P2 · The Machine (ch.4 S1 · ch.5–6 S3)
  ch4,
  ch5,
  ch6,
  ch7,
  ch8,
  ch9,
  // P3 · Code (built in S6)
  ch10,
  ch11,
  ch12,
  // P4 · Algorithms & Data Structures (ch.13–14 built in S7)
  ch13,
  ch14,
  ch15,
  ch16,
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
