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
  // P3 · Code (S6)
  {
    id: "trace-recursion",
    chapterId: "ch10",
    questions: [
      {
        prompt: "With `fib(n) = n` for `n < 2`, else `fib(n-1) + fib(n-2)` — what is `fib(4)`?",
        options: ["2", "3", "5", "8"],
        answer: 1,
        explain:
          "fib(4) = fib(3) + fib(2) = (fib2+fib1) + (fib1+fib0) = (1+1) + (1+0) = **3**. Counting from fib(0): 0, 1, 1, 2, 3. Step it in call-stack-viz and watch each frame hand its value back up.",
      },
      {
        prompt: "While evaluating `fib(3)`, which call **returns first**?",
        options: ["fib(3)", "fib(2)", "fib(1)", "they return together"],
        answer: 2,
        explain:
          "Calls stack deepest-first: fib(3) → fib(2) → fib(1). fib(1) hits the base case and returns before anything else — the stack is **LIFO**, so the last frame pushed is the first popped. fib(3), the outermost call, returns **last**.",
      },
      {
        prompt: "A recursive function is missing its base case. What happens at runtime?",
        options: ["Loops forever in constant memory", "A stack overflow after a finite number of calls", "It returns undefined", "The compiler rejects it"],
        answer: 1,
        explain:
          "Every call pushes a frame and none ever return, so the **finite** call stack fills and the program crashes with a stack-overflow error — not an infinite loop (which reuses one frame). The compiler can't catch it: whether recursion halts is undecidable in general (ch.20).",
      },
    ],
  },
  {
    id: "find-parse-error",
    chapterId: "ch11",
    questions: [
      {
        prompt: "In our mini-language, `let x = 5` (no semicolon) fails. Which stage reports it?",
        options: ["The lexer", "The parser", "The code generator", "It runs fine"],
        answer: 1,
        explain:
          "Lexing succeeds — `let`, `x`, `=`, `5` are all valid tokens. The **parser** expects a `;` to end the statement and complains when it hits end-of-input instead. Grammar structure is the parser's job.",
      },
      {
        prompt: "`print y;` where `y` was never declared with `let`. Which stage catches it?",
        options: ["The lexer", "The parser", "The code generator (semantic check)", "Nothing — it prints 0"],
        answer: 2,
        explain:
          "It lexes and parses fine — it's grammatically valid. The error is **semantic**: the code generator's symbol table has no slot for `y`, so it reports 'undefined variable'. Meaning-level errors live past the parser.",
      },
      {
        prompt: "What tree does the parser build for `2 + 3 * 4`, and what does it evaluate to?",
        options: ["(2 + 3) * 4 = 20", "2 + (3 * 4) = 14", "left-to-right: 20", "ambiguous — it errors"],
        answer: 1,
        explain:
          "Precedence lives in the **tree**, not the text: `*` binds tighter than `+`, so the parser nests `(3 * 4)` under the `+`, giving 2 + 12 = **14**. Type it into compiler-pipeline and watch the AST — the shape *is* the precedence.",
      },
    ],
  },
  {
    id: "blast-radius",
    chapterId: "ch12",
    questions: [
      {
        prompt: "Modules B, C and D all depend directly on A, which you change often. What best shrinks the blast radius of those changes?",
        options: ["Couple B, C, D to A even more tightly", "Put a stable interface between A and its callers", "Delete B, C and D's tests", "Copy A's code into B, C and D"],
        answer: 1,
        explain:
          "Depend on a **stable interface**, not A's implementation (Dependency Inversion). While the interface holds, changing A's internals doesn't ripple to B, C, D — exactly the seam in dependency-blast. Copying multiplies the change; tighter coupling widens the blast.",
      },
      {
        prompt: "A team's suite is 90% slow end-to-end UI tests and almost no unit tests. The diagnosis?",
        options: ["Ideal — E2E gives the most confidence", "The 'ice-cream cone': slow, flaky, costly — push tests down", "They need even more E2E tests", "Unit tests would add nothing"],
        answer: 1,
        explain:
          "That's the inverted pyramid — the **ice-cream cone**. E2E tests are valuable but slow and flaky; a suite dominated by them gives unreliable, sluggish feedback. Most checks belong in fast, isolated unit tests, with a thin E2E cap for critical paths.",
      },
      {
        prompt: "Under semantic versioning, a dependency goes `2.4.1` → `3.0.0`. What should you expect?",
        options: ["A bug fix only", "New features, backward compatible", "Breaking changes — your code may need updating", "Nothing meaningful changed"],
        answer: 2,
        explain:
          "The **major** bump signals **breaking changes** by contract: patch (2.4.1→2.4.2) = fixes, minor (2.4→2.5) = backward-compatible features, major = you may have to change your code. It's a compatibility promise encoded in the number.",
      },
    ],
  },
  {
    id: "match-the-O",
    chapterId: "ch13",
    questions: [
      {
        prompt: "Time complexity of this loop?\n`let s = 0;\nfor (let i = 0; i < n; i++) s += a[i];`",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 2,
        explain:
          "One pass over n elements, constant work each → **O(n)**. Double n and you double the work. Race it against the others in growth-racer.",
      },
      {
        prompt: "And this?\n`for (let i = 0; i < n; i++)\n  for (let j = 0; j < n; j++)\n    if (a[i] === a[j]) dup++;`",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        answer: 2,
        explain:
          "A loop **nested** inside a loop compares every pair: n × n = **O(n²)**. Nesting multiplies — this is the quadratic trap that hides in innocent-looking double loops.",
      },
      {
        prompt: "The loop keeps halving n:\n`while (n > 1) n = Math.floor(n / 2);`",
        options: ["O(log n)", "O(n)", "O(√n)", "O(1)"],
        answer: 0,
        explain:
          "Halving each step reaches 1 in ~log₂ n steps → **O(log n)**. Exactly why binary search finds one item among a million in ~20 probes.",
      },
      {
        prompt: "Two separate (not nested) loops over the same array:\n`for (const x of a) sum += x;\nfor (const x of a) max = Math.max(max, x);`",
        options: ["O(n²)", "O(2n) — its own class", "O(n)", "O(n log n)"],
        answer: 2,
        explain:
          "Sequential loops **add**: O(n) + O(n) = O(2n) = **O(n)** once constants drop. Only *nested* loops multiply. Reading two passes as quadratic is a classic review mistake.",
      },
      {
        prompt: "A single loop that does a hash-set lookup each time:\n`for (const x of a) { if (seen.has(x)) return true; seen.add(x); }`",
        options: ["O(n) average", "O(n²)", "O(n log n)", "O(log n)"],
        answer: 0,
        explain:
          "The loop is O(n); each `has`/`add` is **O(1) average** for a hash set (ch.14), so the whole scan is **O(n)** on average. (Pathological collisions can degrade it — see ch.14's worst case.)",
      },
      {
        prompt: "Naive recursive Fibonacci, `fib(n) = fib(n-1) + fib(n-2)`. How does the number of calls grow?",
        options: ["O(n)", "O(n²)", "O(2ⁿ) — exponential", "O(log n)"],
        answer: 2,
        explain:
          "Each call spawns two more and re-computes the same subproblems, so the call tree roughly doubles per level → **exponential** (~O(φⁿ), φ ≈ 1.618). ch.18's dynamic programming is the fix.",
      },
    ],
  },
  {
    id: "where-it-lands",
    chapterId: "ch14",
    questions: [
      {
        prompt: "A hash table has **8** buckets and a key hashes to the raw value **20**. Which bucket?",
        options: ["bucket 2", "bucket 4", "bucket 8", "bucket 20"],
        answer: 1,
        explain:
          "The index is the hash **mod the table size**: 20 mod 8 = **4**. The mod folds an unbounded hash down into a valid slot. Try it in hash-collision-lab.",
      },
      {
        prompt: "**Linear probing**, size 8. Slots 3 and 4 are occupied; a new key hashes to home bucket **3**. Where does it land?",
        options: ["slot 3 (overwrites)", "slot 4", "slot 5", "it's rejected"],
        answer: 2,
        explain:
          "Open addressing **probes forward** to the first free slot: 3 (taken) → 4 (taken) → **5** (free). That run of occupied slots is *clustering* — what slows probing as the table fills.",
      },
      {
        prompt: "**Chaining**, and two different keys both hash to bucket **6**. What happens?",
        options: ["The second key is dropped", "Both live in bucket 6's chain", "The table resizes immediately", "The first key is overwritten"],
        answer: 1,
        explain:
          "With chaining each bucket holds a **list**, so both keys sit in bucket 6's chain and a lookup walks it. Collisions cost chain length, not data — Luhn's original fix from 1953.",
      },
      {
        prompt: "A table with **10** buckets now holds **8** entries. Load factor, and the usual consequence?",
        options: ["α = 0.8; do nothing", "α = 0.8; over ~0.75, so resize & rehash", "α = 1.25; already full", "α = 8; overflow"],
        answer: 1,
        explain:
          "α = n/m = 8/10 = **0.8**. Past the ~0.75 threshold, chains lengthen and probes cluster, so the table **doubles and rehashes** — O(n), but O(1) amortized (ch.13).",
      },
    ],
  },
  {
    id: "tree-predict",
    chapterId: "ch15",
    questions: [
      {
        prompt: "You insert **10, 20, 30, 40, 50** in that order into a **plain** BST (no balancing). What shape results, and what is search now?",
        options: ["A balanced tree, O(log n)", "A right-leaning stick of height 5, O(n)", "A heap, O(1) min", "It refuses duplicate-free sorted input"],
        answer: 1,
        explain:
          "Each key is larger than everything before it, so it hangs off the right again and again — a **linked list in tree costume**, height 5. Search is O(n). This is exactly the case AVL/red-black trees exist to prevent; flip the sim to AVL mode and the same inserts rotate into a bush.",
      },
      {
        prompt: "In a **min-heap** stored as an array, where is the **largest** element guaranteed to be?",
        options: ["At the root (index 0)", "At the last array index", "Somewhere in a leaf", "At index n/2"],
        answer: 2,
        explain:
          "A heap only guarantees parent ≤ children, so the **min** is the root — but the max has no fixed home except that it must be a **leaf** (it can't be a parent, or its child would be larger). Leaves occupy the back half of the array, so the max is somewhere in indices ⌊n/2⌋…n−1, not at any single fixed slot.",
      },
      {
        prompt: "A trie holds **\"car\", \"card\", \"care\"**. How many nodes store the shared prefix **c-a-r**?",
        options: ["Three sets of three (nine)", "One set of three, reused by all", "None — prefixes aren't stored", "Depends on insertion order"],
        answer: 1,
        explain:
          "The whole point of a trie: the prefix **c-a-r is stored once** and the three words branch below it (a word marker on 'r', then edges to 'd' and 'e'). That sharing is why autocomplete for 'car' is just 'collect the subtree under c-a-r'.",
      },
    ],
  },
  {
    id: "sort-predict",
    chapterId: "ch16",
    questions: [
      {
        prompt: "You run **quicksort with a last-element pivot** on an array that is **already sorted**. Time complexity?",
        options: ["O(n) — it's already done", "O(n log n) — best case", "O(n²) — worst case", "O(log n)"],
        answer: 2,
        explain:
          "Every partition picks the largest element as pivot, splitting into a side of n−1 and a side of 0 — maximally unbalanced, n levels deep. That's **O(n²)** time and O(n) stack, quicksort's worst case, triggered by its *best-looking* input. Real quicksorts randomize the pivot to avoid exactly this.",
      },
      {
        prompt: "**Counting sort** on 1,000 elements whose keys are all in the range **0–9**. How many element-to-element **comparisons**?",
        options: ["About 1,000", "About 10,000 (n log n)", "Zero", "About 500,000 (n²/2)"],
        answer: 2,
        explain:
          "**Zero.** Counting sort never asks 'is a < b?' — it tallies keys into 10 buckets and places by running totals. That's how it beats the Ω(n log n) comparison bound: it isn't a comparison sort at all. It runs in O(n + k) = O(1000 + 10) here.",
      },
      {
        prompt: "You **stably** sort a table by *date*, then **stably** sort the result by *name*. Within one name, what order are the rows in?",
        options: ["Random", "By date (preserved)", "Reversed date", "Undefined"],
        answer: 1,
        explain:
          "A **stable** sort preserves the relative order of equal keys — so among rows with the same name, the earlier date-ordering survives. This 'sort by secondary, then stably by primary' trick is the standard way to do multi-key sorts, and it only works if the sort is stable.",
      },
    ],
  },
  {
    id: "graph-predict",
    chapterId: "ch17",
    questions: [
      {
        prompt: "You run **BFS** from S to find the cheapest route on a graph whose edges have **different weights**. What does BFS actually minimize?",
        options: ["Total edge weight", "The number of edges (hops), ignoring weight", "Nothing — BFS crashes on weighted graphs", "The number of nodes visited"],
        answer: 1,
        explain:
          "BFS explores in rings of equal **hop count**, so it returns the path with the **fewest edges** — which is only the cheapest path when every edge costs the same. With real weights you need **Dijkstra** (a priority queue keyed by cumulative cost). BFS runs fine; it just answers the wrong question.",
      },
      {
        prompt: "In **A\\***, you crank the heuristic weight far above 1, so h(n) dominates g(n). What happens?",
        options: ["Slower, but still guaranteed shortest", "Much faster, but the path may no longer be the shortest", "It silently becomes Dijkstra", "It fails to find any path"],
        answer: 1,
        explain:
          "Over-weighting h turns A\\* into **greedy best-first search**: it races toward the goal and expands almost nothing, but the heuristic can now **overestimate** and lure it onto a longer route. That's the trade — you buy speed with the optimality guarantee. Weight 0 = Dijkstra (optimal, blind); weight 1 with an admissible h = optimal and informed.",
      },
      {
        prompt: "A graph has one edge with a **negative** weight. You run Dijkstra. The result is…",
        options: ["Correct shortest paths", "Possibly wrong — a node closed early is never reconsidered", "An infinite loop", "Correct, just slower"],
        answer: 1,
        explain:
          "Dijkstra's correctness rests on the invariant that a node's distance is **final when it's closed** — true only if adding an edge can never *lower* a cost, i.e. weights are non-negative. A negative edge can create a cheaper path to an already-closed node, which Dijkstra never revisits. Use **Bellman–Ford** for negative weights.",
      },
      {
        prompt: "Kahn's topological sort halts with **3 nodes still remaining, none at in-degree 0**. What does that tell you?",
        options: ["A bug in the algorithm", "Those 3 nodes are tangled in a cycle", "The graph is disconnected", "You ran out of memory"],
        answer: 1,
        explain:
          "If every remaining node still has an incoming edge, none is 'ready', and the peel stalls — which is precisely a **cycle**. A directed graph topologically sorts **iff** it's acyclic, so Kahn's algorithm doubles as a cycle detector: the leftover nodes are the ones trapped in the cycle.",
      },
    ],
  },
  {
    id: "pick-the-paradigm",
    chapterId: "ch18",
    questions: [
      {
        prompt: "**Count the number of ways** to make amount N from unlimited coins of given denominations. Which paradigm?",
        options: ["Greedy", "Dynamic programming", "Divide & conquer", "Backtracking"],
        answer: 1,
        explain:
          "The count for amount N reuses the counts for smaller amounts over and over — **overlapping subproblems** with optimal substructure — so it's **dynamic programming**: fill a table `ways[0..N]`. Greedy can't count, and plain recursion recomputes the same amounts exponentially.",
      },
      {
        prompt: "Sort a large array as fast as possible in the **average** case.",
        options: ["Divide & conquer", "Dynamic programming", "Greedy", "Backtracking"],
        answer: 0,
        explain:
          "Split, sort the halves **independently**, combine — that's **divide & conquer** (quicksort partitions; merge sort merges). The subproblems don't overlap, so there's nothing to memoize; DP would be pointless here.",
      },
      {
        prompt: "Lay cable to connect **every** building for the **least total length** (a minimum spanning tree).",
        options: ["Backtracking", "Greedy", "Dynamic programming", "Divide & conquer"],
        answer: 1,
        explain:
          "MST has the **greedy-choice property**: repeatedly adding the cheapest safe edge (Kruskal) or growing from a vertex (Prim) is provably optimal. No table, no search — **greedy**, and its correctness is a real theorem (matroid structure), not a lucky guess.",
      },
      {
        prompt: "Find **all** ways to place N non-attacking queens on an N×N board.",
        options: ["Backtracking", "Greedy", "Divide & conquer", "Dynamic programming"],
        answer: 0,
        explain:
          "You're **searching** a constrained configuration space, so it's **backtracking**: place a queen, and the instant it conflicts, abandon that whole branch instead of finishing the board. Pruning is what makes it beat the Nⁿ brute force.",
      },
      {
        prompt: "Make an amount with the **fewest coins** on an **arbitrary** coin system (e.g. {1, 3, 4}).",
        options: ["Greedy — always take the biggest coin that fits", "Dynamic programming", "Divide & conquer", "Backtracking"],
        answer: 1,
        explain:
          "Greedy is optimal only on **canonical** systems; on {1, 3, 4} it makes 6 as 4+1+1 (three coins) when 3+3 (two) is better. The minimum needs **dynamic programming** over every amount up to the target — the only method that's correct for *any* coin set.",
      },
    ],
  },
  {
    id: "regular-or-not",
    chapterId: "ch19",
    questions: [
      {
        prompt: "Which of these languages is **not** regular?",
        options: [
          "Binary strings with an even number of 1s",
          "Strings over {a,b} that end in `ab`",
          "aⁿbⁿ — n a's followed by exactly n b's",
          "Strings that contain the substring `101`",
        ],
        answer: 2,
        explain:
          "aⁿbⁿ needs the machine to **count** the a's so it can match the b's, and n is unbounded — impossible with finitely many states (the pumping lemma proves it). The other three are all recognizable by a small DFA: each needs only a fixed, finite amount of state.",
      },
      {
        prompt: "Can a classical regular expression match **balanced parentheses** nested to any depth?",
        options: ["Yes", "No"],
        answer: 1,
        explain:
          "No — balanced parentheses is **context-free**, not regular. Tracking nesting depth needs a stack (a pushdown automaton), which a finite automaton doesn't have. This is the theorem behind \"don't parse HTML with regex.\"",
      },
      {
        prompt: "An NFA has **5 states**. Its equivalent DFA, built by the subset construction, has at most how many states?",
        options: ["5", "10", "25", "32"],
        answer: 3,
        explain:
          "The DFA's states are **subsets** of the NFA's states, so at most 2⁵ = **32**. Usually far fewer are reachable, but the exponential worst case is real — it's the blow-up behind determinized regex engines.",
      },
    ],
  },
  {
    id: "does-it-halt",
    chapterId: "ch20",
    questions: [
      {
        prompt: "Which of these is **undecidable** — no program can answer it correctly for every input program?",
        options: [
          "Does this source file have a syntax error?",
          "Will this program eventually halt on its input?",
          "Is this list already sorted?",
          "Does this integer exceed 1000?",
        ],
        answer: 1,
        explain:
          "Halting is the classic undecidable problem (Turing, 1936) — assume a decider and diagonalization derives a contradiction. The others are all decidable: parsing, a single scan, and a comparison each always finish with a definite answer.",
      },
      {
        prompt: "Is *\"does program P ever print the word HELLO on some input?\"* decidable?",
        options: ["Yes", "No"],
        answer: 1,
        explain:
          "No — it's a **non-trivial property of P's behavior**, so **Rice's theorem** makes it undecidable. You could reduce halting to it: deciding it in general would let you decide halting.",
      },
      {
        prompt: "Why can't we just write a clever program that computes the busy beaver BB(n) for every n?",
        options: [
          "BB grows faster than any computable function — computing it would solve the halting problem",
          "We simply haven't found the right algorithm yet",
          "BB(n) is infinite for every n",
          "It would need more RAM than exists",
        ],
        answer: 0,
        explain:
          "BB is **uncomputable**: it dominates every computable function, and knowing BB(n) would let you decide halting for all n-state machines (run each for BB(n) steps — if it hasn't halted, it never will). BB(5) = 47,176,870 was pinned down only in 2024; BB(6) is beyond current mathematics.",
      },
    ],
  },
  {
    id: "np-or-not",
    chapterId: "ch21",
    questions: [
      {
        prompt: "Which statement best describes the class **NP**?",
        options: [
          "Problems with no polynomial-time algorithm",
          "Problems whose proposed solutions can be verified in polynomial time",
          "Problems that require special nondeterministic hardware",
          "Problems that are impossible to solve",
        ],
        answer: 1,
        explain:
          "NP = **nondeterministic-polynomial** = a candidate solution is checkable in polynomial time. It is *not* \"non-polynomial\": in fact every P problem is in NP (P ⊆ NP). Whether NP has problems outside P is the open P-vs-NP question.",
      },
      {
        prompt: "You discover a polynomial-time algorithm for the travelling-salesman **decision** problem (which is NP-complete). What follows?",
        options: [
          "Only TSP gets faster; nothing else changes",
          "Every problem in NP now has a polynomial algorithm — you've proved P = NP",
          "Nothing — TSP isn't actually in NP",
          "The halting problem becomes decidable",
        ],
        answer: 1,
        explain:
          "Every NP problem reduces to any NP-complete one, so a fast algorithm for TSP-decision gives a fast algorithm for **all** of NP — that's P = NP (and a $1,000,000 prize). Halting stays undecidable regardless: it's not in NP at all.",
      },
      {
        prompt: "Which of these is **not** known to be in NP?",
        options: [
          "Boolean satisfiability (SAT)",
          "Graph 3-colouring",
          "The halting problem",
          "n×n Sudoku solvability",
        ],
        answer: 2,
        explain:
          "The halting problem is **undecidable**, so it can't be in NP (NP problems are at least decidable). It *is* NP-hard — at least as hard as everything in NP — which is why NP-hard ⊋ NP-complete. The other three have polynomial-time-checkable certificates.",
      },
    ],
  },
  {
    id: "scheduling-predict",
    chapterId: "ch22",
    questions: [
      {
        prompt:
          "Three processes arrive together at t = 0: **P1** (burst 20), **P2** (burst 2), **P3** (burst 2). Under **FCFS**, what is the average waiting time?",
        options: ["14", "2", "8", "24"],
        answer: 0,
        explain:
          "FCFS runs them in arrival order: P1 waits 0, P2 waits 20, P3 waits 22 → (0 + 20 + 22) / 3 = **14**. That's the **convoy effect** — two tiny jobs stuck behind one long one. Shortest-job-first would run P2, P3, P1 for waits 0, 2, 4 → average **2**. Load this into the scheduler-sim and flip FCFS → SJF to watch the Gantt (and the number) collapse.",
      },
      {
        prompt:
          "You set **round-robin** to a very small quantum (1 tick) on a machine where each context switch costs real time. Compared with a large quantum, what happens?",
        options: [
          "Throughput drops — most of the CPU goes to context switches",
          "Turnaround always improves",
          "It behaves exactly like SJF",
          "Page faults increase",
        ],
        answer: 0,
        explain:
          "A tiny quantum means the scheduler switches constantly, and each switch burns cycles saving/restoring state and running cold. Overhead eats the CPU. The opposite extreme — a huge quantum — decays into **FCFS**. Turn on the context-switch cost in the sim and shrink the quantum: utilization visibly falls.",
      },
      {
        prompt:
          "**SJF** is provably optimal for average waiting time. Why don't real operating systems simply use it?",
        options: [
          "It needs each job's CPU-burst length in advance, which the OS can't know",
          "It only works on a single core",
          "It causes deadlocks",
          "It is patented",
        ],
        answer: 0,
        explain:
          "SJF requires an **oracle** for burst lengths you don't have — a program's next CPU burst isn't known until it runs. Real schedulers *estimate* it (e.g. exponential averaging of past bursts) or sidestep it entirely with feedback schemes like **MLFQ**, which infer 'short and interactive' from behaviour instead of asking.",
      },
    ],
  },
  {
    id: "paging-predict",
    chapterId: "ch23",
    questions: [
      {
        prompt:
          "Under **FIFO** page replacement you increase the frames from 3 to 4. Can the number of page faults **increase**?",
        options: [
          "Yes — that's Bélády's anomaly",
          "No, more frames can never increase faults",
          "Only if the page size is 4 KiB",
          "Only under LRU",
        ],
        answer: 0,
        explain:
          "FIFO isn't a **stack algorithm** (its resident set with n frames need not be a subset of the set with n+1), so more memory can cost *more* faults. The classic witness **1 2 3 4 1 2 5 1 2 3 4 5** faults 9 times with 3 frames but **10** times with 4 — Bélády's anomaly. LRU and Optimal are immune.",
      },
      {
        prompt:
          "A process reads a **valid** address whose page was evicted to disk. What happens?",
        options: [
          "A page fault traps to the OS, which loads the page and restarts the instruction",
          "The program crashes with a segmentation fault",
          "The read returns garbage",
          "The CPU halts until reboot",
        ],
        answer: 0,
        explain:
          "A **page fault is not a crash**. The access is legal; the page just isn't resident. The MMU traps, the OS fetches the page (evicting a victim if needed), fixes the table, and re-runs the instruction — invisibly. A **segfault** is different: that's touching an *invalid* address (no valid mapping at all).",
      },
      {
        prompt:
          "Reference string **1 2 3 1 2 4 1 2 5**, **3 frames**. FIFO produces **7** page faults. How many does **LRU** produce?",
        options: ["5", "7", "9", "3"],
        answer: 0,
        explain:
          "**5.** LRU keeps the hot pages 1 and 2 resident because they're used recently and often, so only 1, 2, 3, 4, 5 each fault once. FIFO evicts 1 and 2 just for being *old*, then has to fault them back in — 7 faults. Run both in page-fault-lab on this string to see the two extra FIFO faults.",
      },
    ],
  },
  {
    id: "files-predict",
    chapterId: "ch24",
    questions: [
      {
        prompt:
          "A file system uses **4 KiB blocks** and **4-byte** block pointers. How many pointers fit in a single indirect block?",
        options: ["1024", "4096", "512", "256"],
        answer: 0,
        explain:
          "Pointers per block = block size ÷ pointer size = 4096 ÷ 4 = **1024**. That fan-out is why the scheme scales so fast: the double-indirect block reaches 1024² blocks and the triple-indirect 1024³, so a fixed-size inode with just 12 direct pointers still addresses over **4 TiB**.",
      },
      {
        prompt:
          "A disk is **30% free**, but the largest run of adjacent free blocks is **3**. Under **contiguous** allocation, can you create a **5-block** file?",
        options: [
          "No — contiguous allocation needs one hole of ≥ 5 blocks",
          "Yes — 30% free is more than enough",
          "Only after defragmenting RAM",
          "Yes, the OS automatically splits the file",
        ],
        answer: 0,
        explain:
          "This is **external fragmentation**: total free space is plenty, but it's shattered into gaps too small to hold the file in one run, so contiguous allocation fails. **Linked** or **indexed** allocation would place the file fine — they don't need adjacency, at the cost of chain-walking (linked) or an index block (indexed).",
      },
      {
        prompt:
          "A journaling file system crashes **after** writing the log blocks but **before** the commit record. What happens on reboot?",
        options: [
          "The transaction is discarded — the file system is exactly as before",
          "The half-written change is applied anyway",
          "It must fsck-scan the whole disk to repair",
          "The affected file is silently corrupted",
        ],
        answer: 0,
        explain:
          "No commit record means the transaction never became official, so recovery **discards** it and the file system is untouched — no corruption. That's the point of write-ahead logging: the single atomic commit turns recovery into a decision (no commit ⇒ discard, commit ⇒ replay) instead of an O(disk) scan.",
      },
    ],
  },
  {
    id: "concurrency-predict",
    chapterId: "ch25",
    questions: [
      {
        prompt:
          "Two threads each run `count++` **once** with no lock; `count` starts at **0**. What is the **smallest** final value it can have?",
        options: ["1", "0", "2", "-1"],
        answer: 0,
        explain:
          "`count++` is load-increment-store. Both threads can load **0**, both increment their register to **1**, and both store **1** — two increments, but `count` ends at **1**. One update was lost. The correct value is 2; a mutex around the section guarantees it.",
      },
      {
        prompt:
          "To make **deadlock impossible**, how many of the four Coffman conditions must you remove?",
        options: [
          "Just one — all four are necessary, so breaking any single one prevents it",
          "All four",
          "Only mutual exclusion, specifically",
          "None — deadlock is unavoidable once you use locks",
        ],
        answer: 0,
        explain:
          "The four conditions (mutual exclusion, hold-and-wait, no-preemption, circular wait) are **jointly necessary** — all must hold at once. Negating **any one** prevents deadlock, which is exactly why the dining-philosophers fixes each target a different condition.",
      },
      {
        prompt:
          "Thread A locks (m1, then m2); thread B locks (m2, then m1). They sometimes deadlock. The simplest structural fix is:",
        options: [
          "Make every thread acquire m1 before m2 — a global lock ordering",
          "Add a third lock around both",
          "Raise thread A's priority",
          "Use a larger scheduling quantum",
        ],
        answer: 0,
        explain:
          "A consistent global **lock order** removes the **circular wait**: if everyone takes the lower-numbered lock first, no cycle in the wait-for graph can ever close. Priorities and quanta don't address the cycle; an extra enclosing lock just serializes everything (and can create new deadlocks).",
      },
    ],
  },
];

export function quizById(id: string): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
