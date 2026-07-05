// Predict-the-behavior quizzes (§6): commit → reveal → explanation.
// Referenced from curriculum sections by id. Pure data — qa gate imports this.
import type { QuizDef } from "../lib/types.ts";

export const QUIZZES: QuizDef[] = [
  {
    id: "gate-predict",
    chapterId: "ch4",
    questions: [
      {
        prompt: "Both inputs of an **XOR** gate are 1. What does it output?",
        options: ["1", "0"],
        answer: 1,
        explain:
          "XOR asks *\"are my inputs different?\"* — 1,1 are the same, so it outputs **0**. This is exactly where XOR and OR part ways: OR would say 1. Rebuild it in the sandbox and try all four input pairs.",
      },
      {
        prompt:
          "A = 1, B = 0. Predict the output of this NAND-only wiring:\n`nand( nand(A,A), nand(B,B) )`",
        options: ["0", "1"],
        answer: 1,
        explain:
          "`nand(x,x)` is just NOT x — so this reads ¬(¬A ∧ ¬B), which by **De Morgan** is A ∨ B. It's an OR built from three NANDs: 1 OR 0 = **1**. Universality in one line.",
      },
      {
        prompt: "Which single gate replaces the pair `NOT(A AND B)`?",
        options: ["NOR", "XOR", "NAND", "It takes at least two gates"],
        answer: 2,
        explain:
          "NAND literally means *not-AND* — its bubble **is** the NOT. Fusing the inversion into the gate is free in CMOS (a plain AND is actually NAND + inverter, i.e. *more* transistors, not fewer).",
      },
    ],
  },
  {
    id: "overflow-predict",
    chapterId: "ch1",
    questions: [
      {
        prompt: "An **8-bit signed** integer holds `127` (the maximum). You add `1`. What does it read as?",
        options: ["128", "−128", "0", "a crash / exception"],
        answer: 1,
        explain:
          "The pattern goes `0111_1111` → `1000_0000`. Under two's complement the top bit carries weight −128, so the value silently **wraps to −128**. No exception fires — this is exactly the signed-overflow bug behind countless real crashes. Flip these bits in the bit-inspector to watch it.",
      },
      {
        prompt: "An **8-bit unsigned** counter is at `255`. You add `1`. Result?",
        options: ["256", "0", "255 (stuck)", "−1"],
        answer: 1,
        explain:
          "8 bits can't hold 256 (that needs a 9th bit), so the carry falls off the end and it **wraps to 0** — `1111_1111` + 1 = `1_0000_0000`, truncated to `0000_0000`. Odometers and `uint8` overflow the same way.",
      },
      {
        prompt: "In IEEE-754 double precision, is `0.1 + 0.2 === 0.3`?",
        options: ["true", "false"],
        answer: 1,
        explain:
          "**False.** Neither 0.1 nor 0.2 has an exact binary fraction, so each is stored slightly off; the errors don't cancel and the sum is `0.30000000000000004`. Compare with a tolerance (`Math.abs(a−b) < 1e−9`), never with `===`.",
      },
    ],
  },
  {
    id: "encoding-predict",
    chapterId: "ch2",
    questions: [
      {
        prompt: 'In JavaScript, what is `"😀".length`?',
        options: ["1", "2", "4"],
        answer: 1,
        explain:
          "**2.** `String.length` counts UTF-16 code *units*, and 😀 (U+1F600) sits above the BMP, so it's stored as a surrogate *pair* — two units for one character. It's one code point and four UTF-8 bytes. Three different counts for one emoji: the classic trap.",
      },
      {
        prompt: "How many **UTF-8 bytes** encode `€` (U+20AC)?",
        options: ["1", "2", "3", "4"],
        answer: 2,
        explain:
          "**3.** U+20AC is in the range U+0800–U+FFFF, which UTF-8 encodes as `1110xxxx 10xxxxxx 10xxxxxx`. Code points ≤ U+007F take 1 byte, ≤ U+07FF take 2, ≤ U+FFFF take 3, and the astral planes take 4.",
      },
      {
        prompt: "A pure-ASCII string, stored as UTF-8, versus stored as ASCII — the bytes are…",
        options: ["identical", "UTF-8 is larger", "UTF-8 is smaller"],
        answer: 0,
        explain:
          "**Identical.** Every ASCII code point (0–127) encodes to the same single byte in UTF-8 (leading bit 0). That backward compatibility — old ASCII files are already valid UTF-8 — is the main reason UTF-8 beat the fixed-width encodings.",
      },
    ],
  },
  {
    id: "compress-predict",
    chapterId: "ch3",
    questions: [
      {
        prompt: "Which string does Huffman compress **more**?",
        options: ["`aaaaaaaaab` (one rare symbol)", "`abcdefghij` (all distinct)", "the same for both"],
        answer: 0,
        explain:
          "The **skewed** one. Huffman spends short codes on frequent symbols; a lopsided distribution has low entropy (~0.9 bits/symbol here after the tree), so it shrinks a lot. Ten distinct equally-likely symbols have entropy log₂10 ≈ 3.32 bits each — barely better than fixed-width. Compression feeds on *imbalance*.",
      },
      {
        prompt: "You run RLE on `ABABABAB`. The output is…",
        options: ["smaller than the input", "bigger than the input", "the same size"],
        answer: 1,
        explain:
          "**Bigger.** With no runs to collapse, every symbol becomes a (symbol, 1) pair — the count byte is pure overhead, doubling the size. No lossless scheme shrinks *every* input; each one has adversarial cases (pigeonhole principle).",
      },
      {
        prompt: "Can you losslessly compress a file of **truly random** bytes?",
        options: ["yes, a little", "no"],
        answer: 1,
        explain:
          "**No.** Random data has maximum entropy (8 bits/byte) — no redundancy to remove. By counting, the ~2ⁿ possible n-byte files can't all map to shorter distinct outputs. It's also why compressing an already-compressed file gains nothing.",
      },
    ],
  },
  {
    id: "adder-predict",
    chapterId: "ch5",
    questions: [
      {
        prompt: "A **4-bit** adder computes `1111 + 0001`. What's the 4-bit result and the carry-out?",
        options: ["0000, carry-out 1", "10000, no carry", "1111, carry-out 1", "0001, carry-out 0"],
        answer: 0,
        explain:
          "15 + 1 = 16, which needs **5** bits. The four bits you keep are `0000`; the missing 16 appears as **carry-out = 1**. On a machine with no 5th bit, that carry is dropped and the result *wraps to 0* — 4-bit overflow. Run it in build-an-adder and watch the carry sweep all four positions.",
      },
      {
        prompt: "An 8-bit ALU computes `100 + 50`. Which flags are set? (signed two's-complement)",
        options: ["V and N", "C only", "Z only", "none"],
        answer: 0,
        explain:
          "150 = `10010110`. It fits *unsigned* (< 256) so **C = 0** — but signed 8-bit maxes at 127, so 150 is a signed **overflow → V = 1**, and the top bit is 1 → **N = 1**. Two positives adding to a 'negative' is the classic V tell. The value is fine as raw bits; it's the *interpretation* that broke.",
      },
      {
        prompt: "`CMP 5, 8` (compute 5 − 8) on an 8-bit ALU. Is the carry/borrow flag C set?",
        options: ["C = 0 — a borrow happened", "C = 1 — no borrow", "C is undefined for CMP", "C = 1 and the result is stored"],
        answer: 0,
        explain:
          "Subtraction is `A + (~B) + 1`. When A < B there's **no carry out of the top bit**, so C = 0 — the convention 'C=1 means no borrow'. CMP does the subtraction only to set flags (it stores nothing); a *branch-if-lower* reads exactly this C. (x86 inverts the meaning, but the hardware is identical.)",
      },
    ],
  },
  {
    id: "latch-predict",
    chapterId: "ch6",
    questions: [
      {
        prompt: "An SR latch is holding **Q = 1**. You set **S = 0, R = 0**. What is Q now?",
        options: ["1 — it holds", "0 — it clears", "it oscillates", "undefined"],
        answer: 0,
        explain:
          "S = R = 0 is the **hold** input. The cross-coupled feedback keeps whatever was last stored, so Q stays **1** — with no switching, no power spent. *That* is the memory: the loop remembers even though nothing is telling it to. Setting S=1 sets, R=1 resets; 0,0 holds.",
      },
      {
        prompt: "A positive-edge D flip-flop has **D = 1**, Q = 0. The clock goes **1 → 0** (a falling edge). What is Q after?",
        options: ["0 — no rising edge, it holds", "1 — it captures D", "it toggles to 1 then 0", "1 — level-sensitive"],
        answer: 0,
        explain:
          "A positive-edge flip-flop samples D **only on 0 → 1**. A falling edge is ignored, so Q **holds 0**. You can wiggle D as much as you like between rising edges — it's invisible until the tick. That discipline is what makes the machine synchronous and race-free.",
      },
      {
        prompt: "A memory has a **10-bit** address bus and 8-bit words. How many bytes can it address?",
        options: ["1024 (1 KiB)", "10", "256", "65536"],
        answer: 0,
        explain:
          "2¹⁰ = **1024** addressable words × 8 bits = 1024 bytes. Each extra address wire **doubles** the reach (11 bits → 2 KiB). It's the address *width*, not the chip size, that caps how much a CPU can name — which is why 32-bit tops out at 4 GiB and 64-bit exists.",
      },
    ],
  },
  {
    id: "register-predict",
    chapterId: "ch7",
    questions: [
      {
        prompt:
          "The 8-bit CPU runs three instructions:\n`LDI 5` · `ADD n` (RAM cell n holds 10) · `OUT`.\nWhat does OUT print?",
        options: ["15", "5", "10", "0"],
        answer: 0,
        explain:
          "`LDI 5` puts 5 in the accumulator A. `ADD n` latches RAM[n]=10 into B and the ALU computes A+B → **15**, back into A. `OUT` copies A to the output. Single-step it in the emulator and watch B latch the 10 before the ALU fires.",
      },
      {
        prompt:
          "A holds 8. The CPU executes `SUB n` where RAM cell n also holds 8. Which flag is set, and is a following `JZ` taken?",
        options: ["Z set → JZ is taken", "C set → JZ is not taken", "N set → JZ is taken", "no flags change → JZ is not taken"],
        answer: 0,
        explain:
          "8 − 8 = 0, so the **Z** (zero) flag sets. `JZ` branches exactly when Z is set, so it **is taken**. This Z-then-JZ pair is how every loop and `if` ultimately works. (Note: a plain `LDA` would *not* have touched the flags — only ALU ops do.)",
      },
      {
        prompt:
          "A holds 200. The CPU runs `ADD b` with RAM cell b = 100. A is 8 bits. What's in A afterward, and is the carry flag C set?",
        options: ["44, and C is set", "300, no flags set", "255 (saturated), C set", "44, but C is clear"],
        answer: 0,
        explain:
          "200 + 100 = 300, which doesn't fit in 8 bits (max 255). The result **wraps to 300 − 256 = 44**, and the carry out of the top bit sets **C = 1**. It doesn't saturate or throw — it silently wraps, exactly the ch.1 overflow, now happening inside a register. A program that cared would `JC` to an error handler.",
      },
    ],
  },
  {
    id: "pattern-race",
    chapterId: "ch8",
    questions: [
      {
        prompt: "Two loops read the **same** 2-D array — one **row-major** (walking memory in order), one **column-major** (jumping a whole row each step). Which finishes faster?",
        options: ["Row-major — sequential access rides the cache line", "Column-major", "Identical — same number of reads"],
        answer: 0,
        explain:
          "**Row-major.** It walks memory sequentially, so each cache line's neighbours are used before eviction (spatial locality) — one miss drags in several useful elements. Column-major strides across lines, touching one element per line and evicting it before the next pass, so nearly every access misses. Same reads, same result, often 5–10× the time — purely from access order. Compare 'sequential' vs 'strided' in cache-sim.",
      },
      {
        prompt: "In cache-sim, which pattern gets the **biggest** boost when you increase the **line size**?",
        options: ["Sequential", "Strided (stride = one line)", "Random"],
        answer: 0,
        explain:
          "**Sequential.** A wider line prefetches more neighbours you're about to use, so the hit rate climbs toward 1 − 1/lineSize. Strided-by-a-line gets *nothing* (it uses one element per line no matter how wide), and random has no spatial locality to exploit. Bigger lines help exactly to the degree your access is spatially local.",
      },
      {
        prompt: "You add a cache in front of memory. Which workload benefits **least**?",
        options: ["Randomly probing a dataset far larger than the cache", "Repeatedly summing a small array", "Scanning an array in order"],
        answer: 0,
        explain:
          "**Random probes into a huge dataset.** With no temporal or spatial locality and a working set that dwarfs the cache, almost every access misses — the cache just adds a failed lookup before the inevitable DRAM trip. Caches feed on locality; pointer-chasing over huge data is the pathological case, and the reason cache-aware data structures exist (ch.14).",
      },
    ],
  },
  {
    id: "gpu-predict",
    chapterId: "ch9",
    questions: [
      {
        prompt: "You need to sum just **100 numbers**, once. CPU or GPU?",
        options: ["CPU — the GPU's launch/transfer overhead dwarfs 100 adds", "GPU — thousands of lanes must win", "Identical"],
        answer: 0,
        explain:
          "**CPU.** 100 adds is a few dozen nanoseconds on one core. Launching a GPU kernel (and copying the data across) costs *thousands* of nanoseconds before a single lane does anything. GPUs win at scale; below the overhead threshold the CPU finishes before the GPU has warmed up. Try N = 1000 in cpu-vs-gpu-race.",
      },
      {
        prompt: "A kernel runs a data-dependent `if/else` per element, and about half the threads take each side. On a GPU this is…",
        options: ["Slow — SIMT divergence runs both paths masked", "Free — GPUs predict branches like CPUs", "Faster — the branch skips work"],
        answer: 0,
        explain:
          "**Slow.** Threads run in lockstep warps sharing one instruction pointer; when they diverge the hardware executes *both* branches with the idle lanes masked, so a 50/50 split can halve throughput. GPUs have no per-lane branch predictor — uniform control flow is what keeps all the lanes busy.",
      },
      {
        prompt: "Why do large neural networks train on GPUs rather than CPUs?",
        options: ["Training is mostly matrix multiply — parallel, arithmetic-intensive, data-resident", "GPUs have far higher clock speeds", "CPUs can't do floating-point math"],
        answer: 0,
        explain:
          "**It's the shape of the math.** Training is dominated by matrix multiplication: billions of independent multiply-accumulates, high arithmetic intensity, on data that stays resident on the device — exactly the three conditions a GPU needs. It isn't clock speed (GPU lanes are *slower*) and CPUs do floating-point fine; it's the parallel, compute-bound structure mapping onto thousands of lanes and tensor cores.",
      },
    ],
  },
];

export function quizById(id: string): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
