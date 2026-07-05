// Senior CS interview bank (§6). Filterable hub arrives in S18;
// questions accumulate per chapter from S1 on. Pure data.
import type { InterviewQ } from "../lib/types.ts";

export const INTERVIEW: InterviewQ[] = [
  {
    id: "iv-ch4-1",
    chapterId: "ch4",
    level: "senior",
    q: "Build XOR using only NAND gates. How few can you use?",
    a:
      "Four. With `m = NAND(A,B)`: `XOR = NAND( NAND(A,m), NAND(B,m) )`.\n" +
      "Intuition: m says *\"not both\"*; each side then asks *\"am I 1 while not-both?\"* — together: exactly one is 1.\n" +
      "Interviewers look for method over memory: write the target truth table, express it as ¬/∧/∨ (A∧¬B ∨ ¬A∧B), then mechanically De-Morgan everything into NANDs and merge duplicates.",
  },
  {
    id: "iv-ch4-2",
    chapterId: "ch4",
    level: "senior",
    q: "Why do real chip libraries prefer NAND over NOR, when both are universal?",
    a:
      "CMOS asymmetry. A 2-input NAND stacks its two nMOS transistors in series — and nMOS carriers (electrons) are ~2–3× more mobile than pMOS holes. NOR stacks the *pMOS* side in series, so it's the slower, weaker gate at equal size.\n" +
      "So synthesis targets NAND-heavy standard cells. Historical counterexample: the Apollo Guidance Computer used only NOR ICs — in its RTL technology the trade-off differed, and *one* qualified part number mattered more than speed.",
  },
  {
    id: "iv-ch4-3",
    chapterId: "ch4",
    level: "staff",
    q: "What physically limits how fast a gate can switch — and how does that connect to CPUs plateauing near ~5 GHz?",
    a:
      "Per gate: charging/discharging real capacitance through real resistance (RC delay) — a signal needs picoseconds per stage, so a clock period must cover the *longest* gate chain between two registers (the critical path).\n" +
      "Per chip: dynamic power ≈ C·V²·f. Raising f (and the voltage needed to hit it) grows heat superlinearly, and post-Dennard leakage burns power even at idle. Around ~4–5 GHz, cooling becomes the wall — the industry pivoted to pipelines, caches and more cores (ch.8).",
  },
  {
    id: "iv-ch4-4",
    chapterId: "ch4",
    level: "mid",
    q: "Refactor `!(user.isAdmin && user.isActive)` for readability. What law are you using, and what's the classic bug?",
    a:
      "De Morgan: `!user.isAdmin || !user.isActive` — \"not admin, or not active\".\n" +
      "The classic bug is the half-flip: rewriting to `!user.isAdmin && !user.isActive` (operator kept, operands negated — or vice versa). Push the NOT through **both** moves: flip the operator *and* negate each operand.\n" +
      "Bonus point in review: after De Morgan, short-circuit order changes which property is read first — visible if accessors have side effects or cost.",
  },
  {
    id: "iv-ch4-5",
    chapterId: "ch4",
    level: "senior",
    q: "Why must unused inputs on a real logic IC be tied high or low, when simulators happily treat them as 0?",
    a:
      "A floating CMOS gate input is a tiny capacitor with no defined charge path — it drifts with coupling and noise, can bias both transistors of the complementary pair partially on (shoot-through current, heat), and produces intermittent logic garbage.\n" +
      "Simulators pick a convention (this guide's sandbox reads floating as 0) because *something* deterministic must render — a good example of a simulation being honest about being a model.",
  },
  {
    id: "iv-ch4-6",
    chapterId: "ch4",
    level: "mid",
    q: "Explain to a junior why 'hardware vs software' is a smaller distinction than it looks.",
    a:
      "Both are arrangements of the same math. Any boolean function can be a NAND circuit (universality) *or* an expression in code — `1 - (a & b)` and a 4-transistor cell compute the identical truth table.\n" +
      "What actually differs is the *binding time* of the arrangement: etched at the fab, loaded as microcode/FPGA bitstream, or interpreted at runtime — a spectrum of flexibility vs speed, not a wall. (The full elevator ride is ch.10–11.)",
  },
  // ---- ch.1 · Bits & numbers ----
  {
    id: "iv-ch1-1",
    chapterId: "ch1",
    level: "senior",
    q: "Why do machines use two's complement for signed integers instead of sign-magnitude?",
    a:
      "Three payoffs, all about the hardware. **One zero** — sign-magnitude has +0 and −0; two's complement has a single 0, freeing a code point (that's why the range is asymmetric: −128…127). **One adder** — `a − b` is just `a + (~b + 1)`; the same ripple-carry adder handles signed and unsigned, no special-casing the sign. **Carry just works** — wraparound is modular arithmetic mod 2ⁿ, so overflow is a discarded carry bit, not a branch.\n" +
      "The tell in an interview: can you derive −x = ~x + 1 and explain why the top bit carries weight −2ⁿ⁻¹ rather than 'is the sign'.",
  },
  {
    id: "iv-ch1-2",
    chapterId: "ch1",
    level: "senior",
    q: "Walk me through why `0.1 + 0.2 !== 0.3`, and how you'd compare floats correctly.",
    a:
      "0.1 in binary is `0.0001100110011…` repeating — like 1/3 in decimal, it has no finite representation. A double rounds it to the nearest 52-bit fraction; same for 0.2. Their stored values are each a hair off, the errors compound rather than cancel, and the sum rounds to `0.30000000000000004`, which is a *different* double from the rounded 0.3.\n" +
      "Never `===` floats. Compare with a tolerance: an absolute epsilon near zero, but a **relative** epsilon in general (`|a−b| ≤ ε·max(|a|,|b|)`), because the gap between representable values scales with magnitude. For money, don't use floats at all — integer cents or a decimal type.",
  },
  {
    id: "iv-ch1-3",
    chapterId: "ch1",
    level: "staff",
    q: "In C, signed overflow is undefined behavior but unsigned overflow is defined. Why the split, and why should I care?",
    a:
      "Unsigned is specified to wrap mod 2ⁿ; signed overflow is UB so compilers may **assume it never happens** and optimize on that — e.g. proving `i + 1 > i` is always true and deleting a bounds check, or promoting an `int` loop counter to not wrap. Great for speed, a footgun for safety.\n" +
      "Consequences: `INT_MAX + 1` can miscompile a security check into a no-op; signed loop induction variables can be assumed monotonic. Practical guidance — use unsigned (or `size_t`) for sizes and indices, compile with `-fsanitize=undefined` in CI, and use checked/`__builtin_add_overflow` intrinsics where wraparound matters. Rust's answer: panics in debug, defined wrapping in release, and explicit `wrapping_add`/`checked_add`.",
  },
  {
    id: "iv-ch1-4",
    chapterId: "ch1",
    level: "mid",
    q: "Why is one hex digit exactly four binary digits, and where does that make life easier?",
    a:
      "Because 16 = 2⁴: a hex digit ranges 0–15, precisely what four bits encode. So conversion is mechanical — group bits into nibbles and translate each: `1101_0110` = `D6`. No arithmetic needed, unlike decimal.\n" +
      "That's why hex is everywhere bytes matter: memory addresses, color codes (`#FF8800` = three bytes), bitmasks, hexdumps. Two hex digits = one byte, which is the unit you actually reason about.",
  },
  // ---- ch.2 · Encoding the world ----
  {
    id: "iv-ch2-1",
    chapterId: "ch2",
    level: "senior",
    q: "Compare UTF-8, UTF-16 and UTF-32. Why did UTF-8 win the web?",
    a:
      "**UTF-32** is fixed 4 bytes — random-access by code point, but 4× the size and full of zero bytes. **UTF-16** is 2 or 4 bytes (surrogate pairs above the BMP) and carries an endianness/BOM problem; it's the internal string form in Java, C#, JS. **UTF-8** is 1–4 bytes, variable-width.\n" +
      "UTF-8's wins: **ASCII is a byte-identical subset** (old files/protocols just work), **no endianness** (byte-oriented), **self-synchronizing** (you can find character boundaries from any byte), and it's compact for Latin text. The cost — you can't index the *n*-th character in O(1) — rarely matters. For interchange it's the default; UTF-16's fixed-looking 2 bytes is a trap because of surrogates.",
  },
  {
    id: "iv-ch2-2",
    chapterId: "ch2",
    level: "senior",
    q: "What does it mean that UTF-8 is 'self-synchronizing', and why is that valuable?",
    a:
      "Every byte announces its role by its top bits: `0xxxxxxx` is a standalone ASCII byte, `11xxxxxx` starts a multi-byte sequence (and the count of leading 1s = its length), `10xxxxxx` is a continuation. So from *any* byte you can tell whether you're at a character boundary and, if not, scan a few bytes to the next one.\n" +
      "Value: a corrupted or dropped byte desynchronizes at most one character, not the whole stream; you can seek into the middle of a UTF-8 file and resync; and a naive byte search for an ASCII delimiter can't accidentally match the middle of a multi-byte character (continuation bytes never look like ASCII). Robustness by construction.",
  },
  {
    id: "iv-ch2-3",
    chapterId: "ch2",
    level: "staff",
    q: "Two strings both display as 'é' but `a === b` is false. What's going on, and what are the security angles?",
    a:
      "Unicode often has multiple encodings of the same visual: precomposed `é` (U+00E9) vs `e` + combining acute (U+0065 U+0301). Byte-wise different, canonically equivalent. Fix: **normalize** (NFC to compose, NFD to decompose) before comparing, hashing, or storing — `String.prototype.normalize()`.\n" +
      "Security: **homoglyph/confusable** attacks — Cyrillic 'а' (U+0430) vs Latin 'a' in a spoofed domain or username; normalization + a confusables skeleton or IDNA restrictions are the defense. Also **normalization mismatches** across a trust boundary (validate one form, store/serve another) can bypass filters, and unnormalized input breaks uniqueness constraints. Rule: normalize at the edge, pick one form, enforce it.",
  },
  {
    id: "iv-ch2-4",
    chapterId: "ch2",
    level: "mid",
    q: "What is the Nyquist limit, and why is CD audio sampled at 44.1 kHz with 16-bit depth?",
    a:
      "Nyquist: to capture a signal you must sample at **more than twice its highest frequency**; below that, high frequencies fold down and masquerade as false low ones (aliasing). Human hearing tops out near 20 kHz, so you need >40 kHz — 44.1 kHz leaves headroom for an anti-alias filter's roll-off (and it fit early video-tape storage). **Sample rate** sets the frequency ceiling; **bit depth** sets the amplitude resolution / noise floor: 16 bits ≈ 65,536 levels ≈ ~96 dB dynamic range, past most listening environments. Two orthogonal knobs — time and amplitude.",
  },
  // ---- ch.3 · Compression & entropy ----
  {
    id: "iv-ch3-1",
    chapterId: "ch3",
    level: "senior",
    q: "Huffman is optimal — yet arithmetic coding often beats it. Reconcile that.",
    a:
      "Huffman is optimal *among codes that assign an integer number of bits to each symbol*. That integer constraint is the leak: if a symbol's ideal length is 2.3 bits, Huffman must spend 2 or 3. When one symbol dominates (probability ≫ 0.5, ideal length ≪ 1 bit) Huffman still pays a whole bit — badly suboptimal.\n" +
      "**Arithmetic/range coding** encodes the whole message as one number in [0,1), so symbols effectively get fractional bits and it hugs the entropy bound. Modern coders (ANS in zstd, arithmetic in H.264/H.265) use this. Huffman survives because it's fast, simple, and near-optimal when probabilities are close to powers of two — and DEFLATE pairs it with LZ77.",
  },
  {
    id: "iv-ch3-2",
    chapterId: "ch3",
    level: "mid",
    q: "What is a prefix-free code and why does Huffman require it?",
    a:
      "No codeword is a prefix of another. That's what makes a bitstream **instantaneously decodable** without delimiters: read bits until they match a codeword, emit it, repeat — you never have to look ahead to know a code ended. In the tree, prefix-free = every symbol is a *leaf*, so following bits from the root always lands on exactly one symbol.\n" +
      "If codes could be prefixes (say `0` and `01`), a decoder couldn't tell whether `0` is done or the start of `01`. Prefix-free is precisely what buys the ratio without needing separators.",
  },
  {
    id: "iv-ch3-3",
    chapterId: "ch3",
    level: "senior",
    q: "Prove to me that no lossless compressor can shrink every input.",
    a:
      "Counting. Suppose a compressor maps every 100-bit input to a strictly shorter output. There are 2¹⁰⁰ possible inputs but only 2¹⁰⁰ − 1 shorter strings (all lengths 0…99 summed). By the pigeonhole principle two inputs collide onto the same output — so decompression can't recover both, and it isn't lossless. Therefore any real lossless scheme must *expand* some inputs (it can't be injective while always shrinking).\n" +
      "Intuition: compression buys short codes for likely inputs by charging longer codes to unlikely ones. It works because real data isn't uniform. On truly random data — maximum entropy — there's nothing to exploit, which is also why you can't re-compress a compressed file.",
  },
  {
    id: "iv-ch3-4",
    chapterId: "ch3",
    level: "staff",
    q: "How does gzip/DEFLATE actually work, and why the two-stage design?",
    a:
      "DEFLATE = **LZ77 then Huffman**. LZ77 slides a 32 KB window and replaces repeated substrings with (distance, length) back-references — killing *duplication* (repeated words, boilerplate, structure). That leaves a stream of literals and match tokens whose symbols are still unevenly distributed, so **Huffman** then gives the frequent ones short codes — killing *per-symbol redundancy*. Two different kinds of redundancy, two passes.\n" +
      "Details worth knowing: dynamic Huffman tables are built per block and shipped in the stream; length/distance use extra-bit codes; zlib wraps DEFLATE with a header + Adler-32. Successors swap in stronger primitives — zstd uses larger windows + FSE/ANS entropy coding and optional trained dictionaries for big wins on small payloads.",
  },
  {
    id: "iv-ch3-5",
    chapterId: "ch3",
    level: "senior",
    q: "Lossy vs lossless — when do you reach for lossy, and what's the core trick in JPEG?",
    a:
      "Lossless (PNG, zip, FLAC) reproduces bytes exactly — mandatory for code, text, archives. Lossy (JPEG, MP3, H.264) throws away information a human won't notice, buying far bigger ratios — right for photos, audio, video where perceptual fidelity, not bit-fidelity, is the goal.\n" +
      "JPEG's core: split into 8×8 blocks, **DCT** each into frequency coefficients, then **quantize** — divide by a table that discards high-frequency detail the eye is insensitive to (that's the lossy step; the quality slider scales the table). Convert to YCbCr first and subsample the chroma, because we see luminance detail more than color. Then the survivors are run-length + Huffman coded (lossless tail). MP3 is the same shape with a psychoacoustic model masking inaudible tones.",
  },

  // ---- ch.5 · Circuits that count ----
  {
    id: "iv-ch5-1",
    chapterId: "ch5",
    level: "mid",
    q: "You have an adder but no subtractor. How do you compute A − B?",
    a:
      "Two's complement: `A − B = A + (~B) + 1`. Invert every bit of B and force the adder's **carry-in to 1**. No new hardware — the same ripple adder does both.\n" +
      "In an ALU a single *subtract* control line drives the B-input inverters and the carry-in together, so ADD and SUB share one datapath. This is also why the carry flag doubles as a *borrow*: on subtraction, carry-out = 0 means a borrow occurred (A < B unsigned).",
  },
  {
    id: "iv-ch5-2",
    chapterId: "ch5",
    level: "senior",
    q: "Explain the Z, N, C, V condition flags. How can C and V disagree?",
    a:
      "**Z** = result is zero. **N** = its top (sign) bit is 1. **C** = carry/borrow out of the MSB — the *unsigned* overflow. **V** = *signed* overflow, defined as `carry-in(MSB) XOR carry-out(MSB)`.\n" +
      "They answer different questions, so they diverge. `127 + 1` (8-bit): no unsigned carry (128 < 256) → **C = 0**, but signed it overflowed 127→−128 → **V = 1**. `200 + 100`: unsigned wrap → **C = 1**, but as signed values (−56 + 100 = 44) it's correct → **V = 0**. Unsigned comparisons read C; signed comparisons read V (and N).",
  },
  {
    id: "iv-ch5-3",
    chapterId: "ch5",
    level: "senior",
    q: "Why is a ripple-carry adder slow, and what's the standard fix?",
    a:
      "The carry into bit *k* depends on bit *k−1*, which depends on *k−2*… so worst case the carry ripples through all N stages: delay is **O(N)** gate-delays, and the top sum bit can't settle until it arrives. For a 64-bit add that's a long critical path.\n" +
      "**Carry-lookahead** computes each stage's *generate* (`Gᵢ = Aᵢ·Bᵢ`) and *propagate* (`Pᵢ = Aᵢ⊕Bᵢ`) signals, then derives all carries in parallel through a tree → **O(log N)** depth at the cost of more gates. Real ALUs use hybrids (carry-select, Kogge-Stone). This speed-vs-area trade is a preview of ch.8.",
  },
  {
    id: "iv-ch5-4",
    chapterId: "ch5",
    level: "mid",
    q: "What is a multiplexer, and where does a CPU rely on them?",
    a:
      "A 2ⁿ:1 **mux** is a hardware switch: n select bits choose one of 2ⁿ data inputs to pass to the output — the silicon form of `switch`/`if`. Its mirror image, the decoder/demux, sends one input to one of 2ⁿ outputs.\n" +
      "CPUs are full of them: selecting which ALU operation's result to keep, picking read ports out of the register file, choosing the next program counter (sequential vs branch target), and forwarding/bypass paths in a pipeline. The RAM address decoder in ch.6 is the demux twin.",
  },
  {
    id: "iv-ch5-5",
    chapterId: "ch5",
    level: "staff",
    q: "How would you build multiplication out of an adder?",
    a:
      "**Shift-and-add**, exactly like long multiplication in binary: for each 1 bit in the multiplier, add the multiplicand shifted left by that bit's position; accumulate. N-bit operands → up to N add/shift steps. This is the P2 boss's 'multiply by repeated addition', made systematic.\n" +
      "Hardware speeds it up by summing all partial products at once: array multipliers, **Wallace/Dadda trees** of carry-save adders, and Booth encoding to halve the partial-product count. Division is the harder cousin (restoring/non-restoring, SRT) — which is why early FPUs shipped bugs there.",
  },

  // ---- ch.6 · Circuits that remember ----
  {
    id: "iv-ch6-1",
    chapterId: "ch6",
    level: "mid",
    q: "How can a circuit made only of logic gates remember a bit?",
    a:
      "**Feedback.** Cross-couple two NOR (or NAND) gates so each gate's output feeds the other's input. The loop has two self-consistent stable states — Q = 0 or Q = 1 — and it *holds* whichever one it's in: an SR latch.\n" +
      "In ch.4 feedback showed up as a *bug* (a NOT wired to itself oscillates). Here the same trick, tamed, is the feature: memory is a deliberately built, controllable feedback loop. Every register, cache line and RAM bit above is this cell, replicated.",
  },
  {
    id: "iv-ch6-2",
    chapterId: "ch6",
    level: "senior",
    q: "What's the difference between a latch and a flip-flop?",
    a:
      "A **latch** is *level-sensitive*: a gated D latch is transparent while its enable is high, so Q tracks D the whole time the gate is open. A **flip-flop** is *edge-triggered*: it samples D only at the clock **edge** (rising, typically) and holds otherwise — usually built as two latches in a master-slave pair.\n" +
      "Edge-triggering is what makes synchronous logic safe: every register captures at the same instant, so a signal can't ripple through several stages in one clock tick and cause a race. Latches are cheaper/faster and still used deliberately (e.g. time borrowing), but flip-flops are the default state element.",
  },
  {
    id: "iv-ch6-3",
    chapterId: "ch6",
    level: "senior",
    q: "What is the SR latch's 'forbidden' state and how do real designs avoid it?",
    a:
      "Driving **S = R = 1** forces *both* outputs to 0 on a NOR latch — no longer complementary, so Q and Q̄ are meaningless. Worse, if both inputs drop to 0 at once, the loop **races** to an unpredictable value (a coin flip decided by tiny delay differences).\n" +
      "The fix is structural: a **gated D latch** derives S and R from a single D input (`S = D·en`, `R = ¬D·en`), so they can never both be asserted. You trade the raw SR primitive for one that has no illegal input. Metastability at the clock edge is the residual worry, handled with synchronizer flip-flops.",
  },
  {
    id: "iv-ch6-4",
    chapterId: "ch6",
    level: "staff",
    q: "Why are computers clocked (synchronous) at all — and what does that cost?",
    a:
      "Combinational paths have *different* delays. Without a shared clock, a downstream gate could read its inputs mid-transition and latch a glitch. A clock gives every signal a fixed window to settle, then captures all flip-flops together on the edge — turning messy analog timing into clean discrete steps.\n" +
      "The cost: the clock period must exceed the **critical path** (slowest combinational route between registers), which sets the max frequency. Raising that frequency is what ran into a **power/heat wall** — switching power climbs with clock speed — and *that*, more than the critical path itself, is why CPUs plateaued near ~5 GHz and pivoted to more cores (ch.8). Asynchronous/clockless design removes the global clock but is hard (hazards, handshakes, hard to verify), so it stays niche.",
  },
  {
    id: "iv-ch6-5",
    chapterId: "ch6",
    level: "senior",
    q: "A CPU has a 32-bit address bus. How much memory can it address, and why did we move to 64-bit?",
    a:
      "2³² = ~4.29 billion distinct addresses; with byte addressing that's **4 GiB**. The address *width* is the hard cap — not how many RAM chips you solder on.\n" +
      "Workloads (databases, media, big in-memory datasets) outgrew 4 GB, so 64-bit address spaces arrived: 2⁶⁴ ≈ 16 **EiB** in principle, though CPUs physically implement only part of it (e.g. 48–57 bits today). Stopgaps like x86 PAE widened *physical* addressing while each process stayed 32-bit — a patch, not a cure. The decoder in ram-grid makes the law visceral: one more address wire doubles the reach.",
  },
  {
    id: "iv-ch7-1",
    chapterId: "ch7",
    level: "mid",
    q: "Walk me through the fetch–decode–execute cycle.",
    a:
      "It's the loop every CPU runs forever. **Fetch:** the Program Counter holds the address of the next instruction; that address goes to memory and the instruction byte comes back into the Instruction Register, and the PC increments. **Decode:** the control unit reads the opcode and works out what the instruction is and which control lines to raise. **Execute:** the data path does the work — read an operand from RAM, drive the ALU, write a register, or (for a jump) load a new value into the PC. Then it repeats.\n" +
      "The key insight is that this is *mechanical and dumb*: the CPU doesn't 'understand' your program, it just fetches the next numbered byte and does the one tiny thing that byte encodes, billions of times a second. Each of those phases is itself several **micro-steps** (register transfers over the bus), which is what a clocked control unit sequences.",
  },
  {
    id: "iv-ch7-2",
    chapterId: "ch7",
    level: "senior",
    q: "What does 'stored-program' (von Neumann) mean, and what's the von Neumann bottleneck?",
    a:
      "**Stored-program** means instructions live in the *same* read/write memory as data — a program is just bytes you can load, store, and even generate at runtime. That's the idea that made general-purpose computers possible: to run a different program you don't rewire the machine, you load different bytes. (In the emulator you literally watch your assembly land in the same 16-byte RAM the data uses.)\n" +
      "The **bottleneck**: because code and data share one memory over one bus, the CPU must funnel every instruction and every operand through that single channel — so memory bandwidth/latency, not the ALU, is often the limit. It's a major reason caches exist (ch.6/8) and why **Harvard**-style splits (separate instruction and data paths/caches) appear inside real chips even when the programmer's model stays von Neumann.",
  },
  {
    id: "iv-ch7-3",
    chapterId: "ch7",
    level: "senior",
    q: "Registers vs RAM — why does a CPU have both, and what is a register file?",
    a:
      "Registers are a handful of one-word storage cells built from flip-flops (ch.6) *inside* the CPU, right next to the ALU; the **register file** is that small bank plus a few special registers (PC, IR, flags). RAM is millions of bytes but 'far away' — tens to hundreds of cycles per access. So the CPU keeps the values it's actively computing on in registers (≈0-cycle access) and treats RAM as the big backing store you load from and store to.\n" +
      "It's a speed/capacity trade — the top of the memory hierarchy. It's also why instruction sets are built around registers (load–store architectures make it explicit) and why compilers spend real effort on *register allocation*: keeping hot variables in that scarce, fast space instead of spilling them to memory.",
  },
  {
    id: "iv-ch7-4",
    chapterId: "ch7",
    level: "senior",
    q: "At the hardware level, how is an `if` or a loop actually implemented?",
    a:
      "With **flags** and a **conditional write to the PC**. An ALU op (or an explicit compare) sets condition flags — Zero, Negative, Carry, oVerflow. A conditional-branch instruction then tests a flag and, if the condition holds, loads a new address into the PC instead of letting it fall through to the next instruction. `if (a == b)` compiles to *compare a,b* (sets Z) then *branch-if-not-zero* past the body; a loop is the same test plus an unconditional backward jump.\n" +
      "So control flow isn't special magic — it's arithmetic that conditionally changes *where the PC points next*. That's the whole trick, and it's why the flags register and the branch instructions are the bridge from 'a calculator' to 'a computer that can decide and repeat'. (It also sets up ch.8: branches are hard to predict, which is why fast CPUs guess.)",
  },
  {
    id: "iv-ch7-5",
    chapterId: "ch7",
    level: "staff",
    q: "Our emulator runs one instruction fully before starting the next. Why don't real high-performance CPUs work that way?",
    a:
      "Running strictly one-at-a-time wastes the hardware: while an instruction is in its execute stage, the fetch and decode logic sit idle. Real CPUs **pipeline** — overlap fetch of instruction *n+1* with decode of *n* and execute of *n−1*, so ideally one instruction *retires* per cycle even though each still takes several stages end-to-end (ch.8). On top of that: superscalar issue (multiple pipelines), out-of-order execution, branch prediction and speculation to keep the pipeline full across the branches from the previous question, and caches to hide the memory latency.\n" +
      "The teaching model is deliberately the honest *semantics* (what the result must be) without the performance tricks. Every one of those tricks must preserve exactly the single-instruction-at-a-time result our micro-stepped machine shows — that observable contract is precisely what pipelines, caches and speculation are engineered not to violate.",
  },

  // ---- ch.8 · Fast CPUs ----
  {
    id: "iv-ch8-1",
    chapterId: "ch8",
    level: "mid",
    q: "What is instruction pipelining, and what kind of speedup does it give?",
    a:
      "Pipelining splits the instruction cycle into stages (classically five: fetch, decode, execute, memory, write-back) and overlaps them like an assembly line — while one instruction executes, the next decodes and a third is fetched. In the steady state a k-stage pipeline retires about **one instruction per cycle**, up to a k× throughput gain, with no faster clock.\n" +
      "The subtlety interviewers want: it improves **throughput, not latency**. A single instruction still takes k cycles end-to-end (slightly more, from pipeline-register overhead); you just *start* one every cycle. Deeper pipelines enable a higher clock but make each flush costlier, so there's an optimal depth — real CPUs run ~14–20 stages.",
  },
  {
    id: "iv-ch8-2",
    chapterId: "ch8",
    level: "senior",
    q: "What are the pipeline hazards, and how does hardware deal with each?",
    a:
      "Three kinds. **Structural** — two instructions want the same unit in one cycle; fixed by duplicating units (e.g. split instruction/data caches). **Data (RAW)** — an instruction needs a result not yet written back; handled mostly by **forwarding/bypassing** the result straight between stages, with an unavoidable one-cycle stall for the **load-use** case (a value from memory isn't ready in time). **Control** — a branch's outcome is unknown when the next fetch must happen; handled by **branch prediction + speculation**, flushing on a mispredict.\n" +
      "Strong answers note that forwarding removes *most* data stalls (the load-use bubble is the residual), and that control hazards are why prediction matters so much — roughly one instruction in five is a branch, so stalling on each would gut the pipeline.",
  },
  {
    id: "iv-ch8-3",
    chapterId: "ch8",
    level: "senior",
    q: "Why did CPU clock speeds stop climbing in the mid-2000s, and what did the industry do instead?",
    a:
      "The end of **Dennard scaling** (~2005). Historically, shrinking transistors switched faster while power-per-area held constant, so frequency rose essentially for free. Then leakage current and a floor on threshold voltage broke that deal: pushing frequency higher made power and heat climb unsustainably — the **power wall** (Intel's ~10 GHz roadmap and the cancelled Tejas are the famous casualties). Clocks plateaued near 4–5 GHz.\n" +
      "**Moore's law** (transistor *count*) kept going, so the extra transistors went into doing more per cycle (wider superscalar, bigger caches, better prediction) and above all **more cores**. Multicore was a forced move, not a triumph — and it shifted the burden of using the transistors onto software parallelism (ch.25) and specialised hardware like GPUs (ch.9).",
  },
  {
    id: "iv-ch8-4",
    chapterId: "ch8",
    level: "senior",
    q: "Explain the memory hierarchy and why caches work at all.",
    a:
      "There's a brutal gap: a core cycle is well under a nanosecond, but DRAM latency is ~50–100 ns — hundreds of cycles. To hide it, machines stack small-fast to large-slow: registers → L1 (~1 ns) → L2 (~4 ns) → L3 (~15 ns) → DRAM (~100 ns) → SSD/disk. A **cache** keeps recently/soon-used data close to the core.\n" +
      "Caches work **only because programs have locality**: **temporal** (reuse the same data soon) and **spatial** (use nearby data soon — which is why caches move whole *lines*, not single bytes). Code with locality serves most accesses from L1; code without it (random access, pointer-chasing, column-major traversal) misses constantly and runs an order of magnitude slower. So real performance is often about access pattern and data layout, not just algorithmic Big-O (ch.13–14).",
  },
  {
    id: "iv-ch8-5",
    chapterId: "ch8",
    level: "staff",
    q: "What is speculative execution, and what is its security cost?",
    a:
      "To keep a deep, superscalar pipeline full across branches, the CPU **predicts** each branch and executes down the predicted path **speculatively**, discarding the results (rolling back architectural state) if it guessed wrong. With out-of-order execution this is a large performance win.\n" +
      "The cost, exposed by **Spectre/Meltdown** (2018): speculatively executed instructions that are architecturally discarded still leave **microarchitectural** traces — above all, which lines are resident in the **cache**. An attacker can time cache accesses to recover data touched during mis-speculation, reading across privilege boundaries. The deep lesson: 'the result was rolled back' is not 'it left no observable trace.' Mitigations cost real performance, making this a standing speed-vs-security trade-off (ch.32).",
  },

  // ---- ch.9 · GPUs & parallel hardware ----
  {
    id: "iv-ch9-1",
    chapterId: "ch9",
    level: "mid",
    q: "How does a GPU differ from a CPU, architecturally?",
    a:
      "A CPU is a **latency** machine: a few big cores full of machinery to finish one instruction stream fast — deep pipelines, out-of-order execution, branch prediction, large caches. A GPU is a **throughput** machine: it spends its transistors on **thousands of small, simple lanes** running the same instruction on different data (SIMD/SIMT), with modest caches and no per-lane cleverness, hiding memory latency by having so many threads that some are always ready while others wait.\n" +
      "So the CPU minimises time-per-task; the GPU maximises tasks-per-second. Each is the right answer to a different question — and picking the wrong one is the actual mistake.",
  },
  {
    id: "iv-ch9-2",
    chapterId: "ch9",
    level: "senior",
    q: "What kinds of workloads run well on a GPU, and which run badly?",
    a:
      "**Well:** work that is (1) **data-parallel** — the same operation over many independent elements; (2) **arithmetic-intensive** — enough math per byte moved to earn the trip (high on the roofline); and (3) **data-resident** — already on the device, so you don't pay PCIe transfer each call. Graphics, dense linear algebra, and neural-net training/inference all qualify.\n" +
      "**Badly:** serial or latency-sensitive code; heavily **branch-divergent** code (a warp splitting at an `if` runs both sides masked); irregular/pointer-chasing access (no coalescing); and small or one-shot jobs where **launch and transfer overhead** dominate. A lone `sum()` of a modest array is usually faster on the CPU for exactly these reasons.",
  },
  {
    id: "iv-ch9-3",
    chapterId: "ch9",
    level: "senior",
    q: "What is SIMT, and what are warp divergence and memory coalescing?",
    a:
      "**SIMT** (single instruction, multiple threads) is the GPU execution model: threads are grouped into **warps** (32) that share one instruction pointer and run in lockstep. **Divergence:** if threads in a warp take different branches, the hardware serialises the paths — running each with the non-participating lanes masked — so divergent control flow can cut throughput to a fraction. **Coalescing:** when a warp's lanes access **contiguous, aligned** addresses, the hardware fuses them into one wide memory transaction; scattered accesses become many transactions and stall.\n" +
      "Together they yield the GPU mantra: keep control flow uniform across a warp and memory accesses regular and aligned. It's the ch.8 locality/regularity lesson, amplified.",
  },
  {
    id: "iv-ch9-4",
    chapterId: "ch9",
    level: "senior",
    q: "Why are GPUs the workhorse of deep learning?",
    a:
      "Because a neural network is, computationally, mostly **matrix multiplication** — huge grids of numbers combined by **multiply-accumulate** — which is massively parallel (every output element independent), highly arithmetic-intensive (a matmul's intensity grows with size, so it's compute-bound), and runs on data that stays **resident** on the device across many operations. That's exactly the three conditions a GPU needs to win.\n" +
      "It isn't clock speed (GPU lanes are slower than CPU cores) — it's the shape of the math matching the shape of the hardware. Modern GPUs add **tensor cores** that do a small matrix-multiply as one instruction, plus huge memory bandwidth to feed them. AlexNet (2012), trained on two gaming GPUs, was the proof of concept that started the era.",
  },
  {
    id: "iv-ch9-5",
    chapterId: "ch9",
    level: "staff",
    q: "A GPU kernel shows high occupancy but disappointing throughput. What do you investigate?",
    a:
      "High occupancy only guarantees latency *hiding*, not throughput, so I'd find the real bottleneck:\n" +
      "- **Memory-bound / coalescing:** is it bandwidth-limited? Are accesses coalesced or scattered? Compare achieved vs peak bandwidth (roofline).\n" +
      "- **Arithmetic intensity:** too little math per byte means no occupancy helps; fix algorithmically (tiling, kernel fusion, reuse via shared memory).\n" +
      "- **Divergence:** divergent warps serialise; measure warp execution efficiency.\n" +
      "- **Shared-memory bank conflicts** and **host↔device transfer** (is time lost to copies, not compute?).\n" +
      "- **Small grid / tail effects:** not enough work to saturate all SMs, or an unbalanced final wave.\n" +
      "The frame is the **roofline**: establish compute-bound vs memory-bound first, because that decides which of the above matters.",
  },

];

export function interviewById(id: string): InterviewQ | undefined {
  return INTERVIEW.find((q) => q.id === id);
}
export function interviewOfChapter(chapterId: string): InterviewQ[] {
  return INTERVIEW.filter((q) => q.chapterId === chapterId);
}
