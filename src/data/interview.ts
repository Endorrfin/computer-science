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
  {
    id: "iv-ch1-5",
    chapterId: "ch1",
    level: "senior",
    q: "What is endianness, when does it actually bite, and why don't we notice it most of the time?",
    a:
      "Endianness is the **byte order** of multi-byte values in memory: **little-endian** stores the least-significant byte first (x86, and in practice ARM), **big-endian** the most-significant first — which is also **network byte order**. Note it's about *bytes*, not bits: `0x12345678` lands as `78 56 34 12` on a little-endian machine.\n" +
      "It bites exactly where **raw bytes cross a boundary**: binary file formats, network protocols (hence `htons`/`ntohl`), memory dumps you read by eye, and type-punning — reinterpreting the same buffer as a different lane width (a classic source of 'works on my machine' in serialization code). We don't notice day-to-day because *within* one machine the CPU is self-consistent — byte order only becomes visible when bytes are **serialized** and read back under a different convention. The senior move: never let byte order be implicit — formats and protocols must *define* it, and portable code converts at the boundary.",
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
  {
    id: "iv-ch2-5",
    chapterId: "ch2",
    level: "senior",
    q: "Why can `'🇺🇦'.length` be 4 in JavaScript — and what are the three different 'lengths' of a string?",
    a:
      "JavaScript's `.length` counts **UTF-16 code units**, not characters. The flag is **two code points** (the regional indicators U+1F1FA + U+1F1E6), both outside the BMP, so each needs a **surrogate pair** — 2 × 2 code units = 4. The three lengths: **code units** (storage in UTF-16: `.length` = 4), **code points** (Unicode scalar values: `[...s].length` = 2), and **grapheme clusters** (what a user sees as one symbol: `Intl.Segmenter` = 1).\n" +
      "Where it bites: `slice` can cut a surrogate pair in half and produce mojibake; a DB limit counts **UTF-8 bytes** while the UI counts graphemes, so 'fits on screen' ≠ 'fits in the column'; ZWJ emoji (family, skin tones) are many code points but one grapheme, so naive 'reverse a string' or cursor math shreds them. The rule: pick the unit per task — byte limits in bytes, cursor/selection in graphemes — and never assume 1 visible character = 1 unit anywhere.",
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

  // ---- P3 · Code (S6) ----
  {
    id: "iv-ch10-1",
    chapterId: "ch10",
    level: "senior",
    q: "At the machine level, what actually happens when you call a function?",
    a:
      "The CPU pushes a **stack frame** (also called an activation record) for the call: the arguments, a **return address** (where to resume in the caller), and space for the callee's locals. It jumps to the function's code, which runs using that frame; on return it puts the result in a register, pops the frame, and jumps back to the return address.\n" +
      "The ch.7 CPU had no CALL/RET — that's the missing piece ch.10 adds. The stack pointer just moves down on call and up on return; 'the stack' is that region of memory plus the discipline of using it LIFO.",
  },
  {
    id: "iv-ch10-2",
    chapterId: "ch10",
    level: "senior",
    q: "Why does deep recursion overflow the stack when an equivalent loop doesn't?",
    a:
      "Each recursive call pushes a new frame that isn't freed until it returns, so depth-N recursion holds N frames at once. The call stack is a **fixed-size** region (often ~1 MB / tens of thousands of frames), so beyond some depth it overflows and the program crashes.\n" +
      "A loop reuses a **single** frame — it mutates counters in place, never growing the stack. That's why an iterative sum of a million items is fine but the recursive version explodes: same work, very different memory profile.",
  },
  {
    id: "iv-ch10-3",
    chapterId: "ch10",
    level: "staff",
    q: "What is tail-call optimization, and why can't you rely on it in most languages?",
    a:
      "A call is in **tail position** if it's the last thing a function does — its result is returned directly, with no pending work. Then the caller's frame is dead and the engine can **reuse** it instead of pushing a new one, turning tail recursion into a loop with O(1) stack.\n" +
      "It's in the ES2015 spec (proper tail calls), but among the major engines effectively only Safari/JavaScriptCore ships it: V8 implemented it and then **removed** it (broken stack traces and debuggability), and SpiderMonkey only ever had it behind a flag. So in Node/Chrome, tail-recursive code still overflows — you convert to an explicit loop or an explicit stack. Scheme/Lua and most functional languages guarantee it; treat it as language-specific, never assumed.",
  },
  {
    id: "iv-ch10-4",
    chapterId: "ch10",
    level: "mid",
    q: "Imperative, OOP, functional — not 'which is best', but what does each optimize for?",
    a:
      "They're different ways to **decompose** a problem, mostly differing in where state lives. **Imperative:** explicit steps that mutate state — closest to the machine, great for tight algorithms. **OOP:** bundle state with the methods that guard it — organizes large systems around 'things' and their responsibilities. **Functional:** pure functions over immutable data — easy to reason about, test, and parallelize, since nothing hidden changes.\n" +
      "Most real languages are multi-paradigm; seniority is picking the right one per problem (a pure reducer here, a stateful object there) rather than dogma.",
  },
  {
    id: "iv-ch10-5",
    chapterId: "ch10",
    level: "senior",
    q: "Stack vs heap — what lives where, and what are the trade-offs?",
    a:
      "The **stack** holds call frames: locals and arguments, allocated/freed automatically as calls push and pop. It's tiny, fast (just move the stack pointer), and strictly LIFO, so it can't hold anything that must outlive its function. The **heap** holds dynamically allocated, longer-lived data (objects, arrays, closures); allocation is more expensive and reclaiming it needs manual free (C) or a garbage collector (JS/Java).\n" +
      "Rule of thumb: short-lived, known-size → stack; lives beyond the call or size unknown → heap. Deep dive in ch.23.",
  },
  {
    id: "iv-ch11-1",
    chapterId: "ch11",
    level: "senior",
    q: "Walk me through the stages a compiler puts source code through.",
    a:
      "**Lex** (characters → tokens) → **parse** (tokens → AST, per the grammar) → **semantic analysis** (name resolution, type checking, the errors the parser can't see) → **IR / code generation** (AST → an intermediate representation or target instructions) → **optimization** → **emit** the target (machine code or bytecode).\n" +
      "The front end (lex/parse/check) is language-specific; the back end (optimize/emit) is target-specific; the IR in the middle is what lets one compiler target many CPUs. The compiler-pipeline sim shows the first four stages live.",
  },
  {
    id: "iv-ch11-2",
    chapterId: "ch11",
    level: "senior",
    q: "Compiler vs interpreter — and where does a JIT fit?",
    a:
      "A **compiler** translates the whole program ahead of time into machine code you run later (fast execution, slower edit-run loop, errors up front). An **interpreter** executes the program directly — walking the AST or running bytecode — so it starts instantly but each operation costs more.\n" +
      "A **JIT** is the hybrid: start by interpreting bytecode, profile which functions are 'hot', then compile just those to optimized machine code at runtime, on assumptions it can **deoptimize** if violated (the jit-tiers figure). It's how V8/JVM get interpreter-fast startup with compiler-fast steady state — the line between 'compiled' and 'interpreted' is really a spectrum.",
  },
  {
    id: "iv-ch11-3",
    chapterId: "ch11",
    level: "staff",
    q: "What is a bytecode virtual machine, and why do JVM, CPython, V8 and Wasm all use one?",
    a:
      "A **VM** is an interpreter for an invented instruction set (bytecode). You compile the source **once** to that portable bytecode, then any platform with a small VM can run it — 'write once, run anywhere' without shipping source or N native builds. It also simplifies the compiler (one target), enables a **security sandbox** (the VM mediates every op), and gives the JIT a clean unit to profile and optimize.\n" +
      "Most are **stack machines** (operands on a stack — like ch.11's VM and the JVM) because codegen is trivial; some are **register machines** (Lua, Dalvik) which are faster to interpret but harder to emit. The cost is a warm-up / indirection tax, which the JIT then buys back.",
  },
  {
    id: "iv-ch11-4",
    chapterId: "ch11",
    level: "senior",
    q: "Where does operator precedence actually get decided — how does `2 + 3 * 4` become 14, not 20?",
    a:
      "In the **parser**, via the grammar. The rules are layered by precedence — an additive rule calls a multiplicative rule beneath it — so `*` gets grouped before `+`. The result is an AST where `(3 * 4)` sits **under** the `+` node; evaluation just walks that tree bottom-up and gets 14.\n" +
      "The key insight interviewers want: precedence and associativity live in the **tree shape**, not in the tokens or the evaluator. Same tokens, a different grammar, would give a different tree and a different answer.",
  },
  {
    id: "iv-ch11-5",
    chapterId: "ch11",
    level: "staff",
    q: "A function is JIT-compiled but still runs slowly. Why might that happen?",
    a:
      "Because the JIT optimizes on **type stability**, and this code breaks it. If a call site sees many shapes/types (**polymorphic → megamorphic**), the engine can't specialize and falls back to generic, slow paths. If a hot function's assumptions keep getting violated it **deoptimizes** and re-optimizes repeatedly (deopt churn), paying compile cost without keeping the payoff.\n" +
      "Other causes: the function never got hot enough to tier up, it's dominated by allocation/GC pressure, or it does I/O (the CPU JIT can't help there). Diagnosis: profile, look for deopt/IC-miss events, and make the hot path monomorphic and allocation-light.",
  },
  {
    id: "iv-ch12-1",
    chapterId: "ch12",
    level: "senior",
    q: "What actually keeps a million-line codebase maintainable?",
    a:
      "Managing **human** attention, not machine limits. The tools: **modularity** (split into pieces that fit in one head), **encapsulation** (hide internals behind small interfaces so callers can't couple to them), **low coupling + high cohesion** (each module does one thing; changes stay local), and **automated tests** so you can change code without re-verifying everything by hand.\n" +
      "The metric that matters is the **blast radius** of a change: in a healthy system a change touches one module; in a ball of mud it ripples everywhere. Everything else — naming, docs, CI, review — serves that.",
  },
  {
    id: "iv-ch12-2",
    chapterId: "ch12",
    level: "senior",
    q: "Explain coupling vs cohesion, and how an interface 'seam' reduces the blast radius of change.",
    a:
      "**Cohesion** is how focused a module is (do its parts belong together?); **coupling** is how much modules depend on each other's details. You want high cohesion, low coupling. Tight coupling means a change in one place forces changes in many — a wide blast radius.\n" +
      "An **interface seam** (Dependency Inversion) makes callers depend on a stable **abstraction** rather than a concrete implementation. Now you can change or swap the implementation behind the interface and nothing downstream needs to move — the dependency-blast sim shows the radius shrinking the moment you insert the seam. That's the core move behind testability, plugins, and swappable infrastructure.",
  },
  {
    id: "iv-ch12-3",
    chapterId: "ch12",
    level: "senior",
    q: "Why the test pyramid rather than the 'ice-cream cone'?",
    a:
      "The pyramid says: **many** fast, isolated **unit** tests at the base, **fewer integration** tests, a **thin** cap of end-to-end tests. It optimizes the trade-off between confidence and cost. Unit tests run in milliseconds and pinpoint failures, so they give fast, precise feedback; E2E tests give the most realistic confidence but are slow, expensive, and **flaky** (they fail for timing reasons, not real bugs).\n" +
      "Invert it — mostly E2E, few units — and you get the **ice-cream cone**: a slow suite people stop trusting and stop running. Keep E2E for a handful of critical user journeys; catch everything else lower down.",
  },
  {
    id: "iv-ch12-4",
    chapterId: "ch12",
    level: "staff",
    q: "What does semantic versioning promise, and where does it break down in practice?",
    a:
      "**MAJOR.MINOR.PATCH**: patch = backward-compatible bug fixes, minor = backward-compatible new features, major = **breaking** changes. It's a contract that lets consumers auto-upgrade patches/minors safely and brace for majors — the basis for lockfiles and version ranges.\n" +
      "Where it breaks: compatibility is about **behavior**, not just the type signature, so a 'patch' can still break you (a changed default, a tightened validation, a perf regression). Transitive dependencies can pull incompatible versions; and plenty of projects practice 'semver in name only'. So treat it as a strong hint, not a guarantee — pin versions, keep a lockfile, and let tests be the real safety net.",
  },
  {
    id: "iv-ch12-5",
    chapterId: "ch12",
    level: "staff",
    q: "'Duplication is far cheaper than the wrong abstraction.' Defend that claim, then attack it.",
    a:
      "**Defend:** premature DRY couples call sites that merely *look* similar. When they diverge — and they do — the shared helper sprouts boolean flags and branches; now every change to it risks every caller, and the blast radius of a tweak is the whole codebase. Duplication keeps change **local**, and you can still unify later, once the real shape is known (the 'rule of three'). Undoing a wrong abstraction is much harder than merging two copies — the standard prescription is to **inline it back** and let the true seams re-emerge.\n" +
      "**Attack:** duplicated **knowledge** (a business rule, a validation, a tax formula) is a genuine hazard — a fix must be applied N times, and one copy *will* be missed. The resolution is that DRY was never about identical **text**, it's about single sources of **truth**: deduplicate when two pieces of code change for the *same reason*; tolerate lookalike code that changes for *different* reasons. The staff-level judgment is telling **essential** duplication (same knowledge) from **accidental** similarity (same shape today, different owners tomorrow) — and having the nerve to leave the second kind alone.",
  },
  {
    id: "iv-ch13-1",
    chapterId: "ch13",
    level: "mid",
    q: "What does it mean, precisely, to say an algorithm is O(n)?",
    a:
      "There exist constants c > 0 and n₀ such that for every input of size n ≥ n₀, the number of basic operations is ≤ c·n — an **upper bound** on growth. Informally: the work grows *at most* linearly, so doubling the input at most doubles the work.\n" +
      "Two things interviewers listen for: it discards **constant factors** (2n and 100n are both O(n)) and **lower-order terms** (n + log n is O(n)), and it's a statement about **large** n — it promises nothing about tiny inputs, where the dropped terms may dominate.",
  },
  {
    id: "iv-ch13-2",
    chapterId: "ch13",
    level: "mid",
    q: "Best, worst, and average case — explain the difference with one example.",
    a:
      "Same algorithm, three inputs. **Linear search** over n elements: **best** O(1) (target is first), **worst** O(n) (last or absent), **average** ≈ n/2 = O(n). Worst-case is the guarantee you can promise a caller; average-case needs an assumption about how inputs are distributed.\n" +
      "The classic trap is **quicksort**: O(n log n) average but O(n²) worst — so 'quicksort is n log n' is an *average*-case claim, and a bad pivot rule or adversarial input triggers the quadratic case.",
  },
  {
    id: "iv-ch13-3",
    chapterId: "ch13",
    level: "senior",
    q: "Explain amortized analysis using a dynamic array's push. Why O(1) amortized when one push can be O(n)?",
    a:
      "A growable array appends in O(1) until it fills, then must allocate a bigger block and **copy everything** — O(n). If capacity **doubles** on each resize, resizes happen at sizes 1, 2, 4, …, so over n pushes the total copying is 1 + 2 + 4 + … ≈ n (a geometric sum that stays below 2n). Total work for n pushes is O(n) → **O(1) per push amortized**.\n" +
      "The distinction that earns the point: amortized is a **worst-case guarantee over the whole sequence**, not a probabilistic average — it assumes nothing about the inputs. Growing by a fixed +k instead gives ~n/k resizes and Θ(n²) total copying (O(n) amortized) — which is exactly why real vectors multiply rather than add.",
  },
  {
    id: "iv-ch13-4",
    chapterId: "ch13",
    level: "senior",
    q: "O, Ω, Θ — when does using O where you mean Θ actually cause a problem?",
    a:
      "O is an upper bound, Ω a lower bound, Θ both (tight). Because O is only an upper bound, calling a linear scan O(n²) is *true* — and useless; the listener can't tell whether you know it's actually Θ(n).\n" +
      "It bites in **guarantees and comparisons**: 'this sort is O(n²)' doesn't tell a caller if it's usable at scale, while 'Θ(n log n)' does, and 'comparison sorting is Ω(n log n)' states an unavoidable *lower* bound no algorithm beats. Use O for a claimed upper bound, Ω for an inherent floor, Θ when you can pin the growth exactly.",
  },
  {
    id: "iv-ch13-5",
    chapterId: "ch13",
    level: "staff",
    q: "In production an O(n log n) implementation is consistently slower than an O(n²) one. Give three legitimate reasons.",
    a:
      "(1) **Small n**: asymptotics describe large inputs; below the crossover the O(n²) algorithm's smaller constant wins — why libraries drop to insertion sort under ~16 elements. (2) **Constants and cache**: the O(n log n) code may allocate and pointer-chase, wrecking its constant factor and cache behavior (ch.8), while the O(n²) one scans contiguous memory. (3) **Input distribution**: if real inputs are nearly-sorted or tiny-range, the 'O(n²)' algorithm may hit its *best* case (insertion sort is O(n) on nearly-sorted data) while the O(n log n) one pays full cost regardless.\n" +
      "The lesson: Big-O predicts the *eventual* winner; profiling decides the present one.",
  },
  {
    id: "iv-ch14-1",
    chapterId: "ch14",
    level: "mid",
    q: "Array vs linked list — when would you actually choose each?",
    a:
      "**Array** by default: O(1) indexing, no per-element overhead, and cache-friendly scans make it faster for almost all traversal, search, and random-access work — even where a list's insert complexity looks better on paper.\n" +
      "**Linked list** only when you're **constantly splicing at positions you already hold** — an LRU's recency list, a free list, editing the middle of a huge sequence — and you rarely need to index. Naming the **cache** cost of pointer-chasing, not just the Big-O, is what marks a senior answer.",
  },
  {
    id: "iv-ch14-2",
    chapterId: "ch14",
    level: "mid",
    q: "How does a hash table get O(1) lookup, and what makes it degrade to O(n)?",
    a:
      "A **hash function** maps the key to a bucket index, so a lookup goes *straight* to the bucket instead of searching — O(1) **average** under good hashing with a bounded load factor.\n" +
      "It slides toward **O(n)** when the **hash is bad** (ignores most of the key, collapsing keys into a few buckets), the **load factor** climbs (long chains / clustered probes), or an **adversary** crafts colliding keys. The defenses: a good (ideally randomized) hash and **resizing** to keep the load factor low.",
  },
  {
    id: "iv-ch14-3",
    chapterId: "ch14",
    level: "senior",
    q: "Chaining vs open addressing — the trade-offs.",
    a:
      "**Chaining** (a list per bucket): simple, tolerates load factor > 1, trivial deletion, degrades gracefully — but each node is a separate allocation, so it pointer-chases with poor locality and per-node overhead.\n" +
      "**Open addressing** (probing; all entries in the table array): cache-friendly, no per-node pointers — but very sensitive to load factor (expected probes ≈ 1/(1−α), exploding as α→1), suffers **clustering**, needs tombstones for deletion, and must resize earlier (α ≈ 0.7). Rule of thumb: open addressing for speed and locality at low α; chaining for simplicity and robustness under high or unpredictable load.",
  },
  {
    id: "iv-ch14-4",
    chapterId: "ch14",
    level: "senior",
    q: "What is load factor, why resize, and what does resizing cost?",
    a:
      "Load factor **α = n/m** (entries over buckets) measures fullness; as it rises, chains lengthen and probes cluster, so operations drift from O(1) toward O(n). To hold O(1), the table **resizes** — allocate a bigger bucket array (usually ×2) and **rehash every entry** — when α crosses a threshold (~0.75 chained, ~0.7 open).\n" +
      "A single resize is **O(n)**, but because capacity doubles, resizes are rare enough to be **O(1) amortized** across insertions (the dynamic-array argument, ch.13). Worth flagging: that amortization hides a **latency spike** on the resize itself — a problem for real-time paths, where you pre-size or use an incremental-rehash table.",
  },
  {
    id: "iv-ch14-5",
    chapterId: "ch14",
    level: "staff",
    q: "Design an LRU cache with O(1) get and put. What structures, and why each?",
    a:
      "A **hash map** plus a **doubly linked list**. The map gives O(1) key → node lookup; the list keeps nodes in **recency order**, most-recent at the head.\n" +
      "**get(k)**: map-lookup the node, splice it to the head, return its value — all O(1). **put(k,v)**: insert/refresh at the head; if size exceeds capacity, evict the **tail** (least-recently-used) and delete its key from the map — O(1). It must be *doubly* linked because moving or evicting an arbitrary node in O(1) needs its predecessor pointer.\n" +
      "This is the whole chapter in one design: the array/list/hash trade-offs composed so every operation is O(1). (It's also a kata — build it.)",
  },

  // ---- ch.15 · Trees & heaps ----
  {
    id: "iv-ch15-1",
    chapterId: "ch15",
    level: "mid",
    q: "When would you choose a balanced BST over a hash table, given the hash table's O(1) lookup?",
    a:
      "When you need **order**, which hashing destroys. A balanced BST (or your language's ordered map) gives O(log n) lookup *plus* sorted iteration, min/max, predecessor/successor, and **range queries** (everything between 10 and 20) — none of which a hash table can do without an O(n) scan.\n" +
      "So: hash table for pure membership/lookup by key; balanced tree when you'll also ask ordered or range questions. Bonus: trees have no worst-case-O(n) collision cliff and no rehash pauses.",
  },
  {
    id: "iv-ch15-2",
    chapterId: "ch15",
    level: "senior",
    q: "An AVL tree and a red-black tree both give O(log n). Why do standard libraries almost always pick red-black?",
    a:
      "Because red-black balances **more loosely**, so it rotates **less on writes**. AVL keeps every balance factor in {−1,0,1} (height ≤ ~1.44 log n) — shorter trees, faster lookups, but more rebalancing work per insert/delete. Red-black allows the longest path to be up to 2× the shortest (height ≤ ~2 log n) in exchange for O(1) *amortized* rotations per update.\n" +
      "For a general-purpose container facing mixed read/write workloads (std::map, TreeMap, the Linux scheduler), cheaper writes win. If the workload were overwhelmingly lookups, AVL's shorter tree could edge ahead — it's a read-vs-write trade, not a 'better/worse'.",
  },
  {
    id: "iv-ch15-3",
    chapterId: "ch15",
    level: "senior",
    q: "Building a heap from n elements: why is bottom-up build-heap O(n) when n insertions would be O(n log n)?",
    a:
      "Because the cost is dominated by the **many cheap nodes**, not the few expensive ones. Sifting down a node at height h costs O(h), and a complete tree has ~n/2^(h+1) nodes at height h. Total = Σ h·n/2^(h+1) = n·Σ h/2^(h+1), and Σ h/2^h converges to 2 — a **constant** — so the sum is O(n).\n" +
      "Intuitively: half the nodes are leaves (zero work), a quarter sift down ≤1, an eighth ≤2 — the O(log n) nodes near the root are too rare to matter. Inserting one at a time is O(n log n) because it processes nodes top-down, where the expensive positions are hit repeatedly. If you have all the data up front, always build-heap.",
  },
  {
    id: "iv-ch15-4",
    chapterId: "ch15",
    level: "mid",
    q: "How would you find the k-th smallest element in a stream, keeping only k items in memory?",
    a:
      "Keep a **max-heap of size k**. Push the first k elements; then for each new element, if it's smaller than the heap's max, pop the max and push it. After processing, the heap holds the k smallest seen, and its **root is the k-th smallest**.\n" +
      "Cost: O(n log k) time, O(k) space — far better than sorting the whole stream (O(n log n), O(n) space) when k ≪ n. The counter-intuitive bit interviewers probe: you use a **max**-heap to track the **smallest** k, because you need cheap access to the *largest of your keepers* to decide what to evict.",
  },
  {
    id: "iv-ch15-5",
    chapterId: "ch15",
    level: "staff",
    q: "Autocomplete over millions of terms: trie, sorted array, or hash table — and what breaks at scale?",
    a:
      "For prefix queries, a **trie** is the natural fit — walk the prefix in O(L), then the subtree is the candidate set — and a **sorted array + binary search** for the prefix range is a strong, cache-friendly alternative (two lower-bound queries bracket all completions). A **hash table can't do prefixes at all** (hashing destroys order).\n" +
      "What breaks: a naive pointer-per-child trie **wastes enormous memory** on millions of terms — fix with compressed/radix tries (collapse single-child chains), a DAWG (share suffixes too), or ternary search trees. And ranking matters: real autocomplete stores a **top-k by frequency** at each node so you return the *best* completions, not just any — otherwise the subtree collect is too large to sort per keystroke.",
  },

  // ---- ch.16 · Sorting & searching ----
  {
    id: "iv-ch16-1",
    chapterId: "ch16",
    level: "mid",
    q: "Write the invariant for a correct binary search, and name the two classic bugs.",
    a:
      "Invariant: the target, if present, is always **within the current window** [lo, hi]; each step shrinks the window and preserves that. With an inclusive window: loop while `lo <= hi`, `mid = lo + (hi − lo)/2`, and on a miss move the far bound **past** mid (`lo = mid+1` or `hi = mid−1`) so the window strictly shrinks.\n" +
      "Bug 1: the **boundary** — using `<` instead of `<=`, or moving to `mid` instead of `mid±1`, which skips the answer or loops forever. Bug 2: the **overflow** — `(lo+hi)/2` overflows for large indices; use `lo + (hi−lo)/2`.",
  },
  {
    id: "iv-ch16-2",
    chapterId: "ch16",
    level: "senior",
    q: "Merge sort and heapsort are both worst-case O(n log n). When do you pick each, and why isn't merge sort the default?",
    a:
      "**Heapsort** sorts **in place** (O(1) extra) with a hard O(n log n) worst case — good when memory is tight or you need a guarantee. But its access pattern is **cache-hostile** (sift-down jumps around the array), so it's often slower in wall-clock than quicksort/merge despite equal Big-O.\n" +
      "**Merge sort** has beautiful **sequential** access (cache-friendly) and is **stable**, but needs **O(n) scratch** memory — the reason it isn't the in-memory default. Where it shines: **external sorting** (data bigger than RAM — merge sorted runs off disk) and **linked lists** (merge needs no random access, so it's the natural list sort). Stability also makes it the base of Timsort.",
  },
  {
    id: "iv-ch16-3",
    chapterId: "ch16",
    level: "senior",
    q: "Prove no comparison sort can do better than O(n log n) in the worst case.",
    a:
      "Model any comparison sort as a **decision tree**: internal nodes are comparisons (a<b?), each with a yes/no branch; leaves are the final orderings. To sort every possible input correctly, there must be a **distinct leaf for each of the n! permutations** — so ≥ n! leaves.\n" +
      "A binary tree with L leaves has height ≥ ⌈log₂ L⌉. The height is the worst-case number of comparisons on some path, so worst-case comparisons ≥ **log₂(n!)**. By Stirling, log₂(n!) = Θ(n log n). Hence some input always forces ~n log n comparisons. Counting/radix dodge this only by never comparing elements — they aren't decision trees over comparisons.",
  },
  {
    id: "iv-ch16-4",
    chapterId: "ch16",
    level: "senior",
    q: "You need the k-th smallest of an unsorted array in expected O(n), not O(n log n). How?",
    a:
      "**Quickselect** — quicksort's partition, but recurse into **only one side**. Partition around a pivot; the pivot lands at its final sorted index p. If p == k you're done; if k < p recurse left, else recurse right. Because you discard half the work each time (on average), the recurrence is T(n) = T(n/2) + O(n) = **O(n)** expected, versus sorting's O(n log n).\n" +
      "Worst case is O(n²) with a bad pivot (same as quicksort); **median-of-medians** gives a guaranteed O(n) pivot if you need the worst-case bound. This is the `nth_element` in C++ and the core of the 'k smallest' kata.",
  },
  {
    id: "iv-ch16-5",
    chapterId: "ch16",
    level: "staff",
    q: "Why does Python's sorted / Java's Arrays.sort use Timsort instead of plain quicksort or merge sort?",
    a:
      "Because **real data is rarely random** — it's full of already-sorted stretches (appended logs, partially-updated lists). Timsort exploits that: it finds ascending/descending **runs**, extends short ones with insertion sort, and merges runs with a smart balancing rule — so partly-ordered input approaches **O(n)**, and it's still O(n log n) worst case.\n" +
      "It's also **stable**, which Java requires for object sorts (so multi-key sorts compose) — quicksort isn't stable, ruling it out there. Primitive arrays in Java *do* use a dual-pivot quicksort (stability is meaningless for primitives, and in-place is cheaper). The staff-level point: library sorts are chosen around **stability guarantees + real-world data shape + memory**, not textbook average-case Big-O.",
  },
  {
    id: "iv-ch17-1",
    chapterId: "ch17",
    level: "mid",
    q: "When would you store a graph as an adjacency matrix instead of an adjacency list?",
    a:
      "Use a **matrix** when the graph is **dense** (E approaches V²), when you do many **edge-existence tests** (matrix is O(1); a list scans), or when V is small and cache-friendly contiguity matters. Its cost is fixed **V² space**, which is wasteful for sparse graphs.\n" +
      "Use a **list** for the common case of **sparse** graphs: it stores only **V+E**, and iterating a vertex's neighbours is O(deg), which is what BFS/DFS/Dijkstra actually do. Rule of thumb: lists for most real graphs (roads, the web, social); matrix for tiny or near-complete graphs, or algorithms phrased in matrix terms (e.g. Floyd–Warshall).",
  },
  {
    id: "iv-ch17-2",
    chapterId: "ch17",
    level: "mid",
    q: "How do BFS and DFS differ, and when is each the right traversal?",
    a:
      "They're the same loop with a different frontier: **BFS** uses a FIFO **queue** and visits nodes in order of hop-distance; **DFS** uses a LIFO **stack** (or recursion) and dives down one path before backtracking. Both are O(V+E).\n" +
      "**BFS** when distance/levels matter: shortest path by hops, level-order, bipartite-ness check, nearest-thing search. **DFS** when structure matters: cycle detection, topological sort, connected/strongly-connected components, path existence, and anything naturally recursive (flood fill, tree walks). If the graph is deep, prefer an explicit stack over recursion to avoid overflowing the call stack.",
  },
  {
    id: "iv-ch17-3",
    chapterId: "ch17",
    level: "senior",
    q: "Why does Dijkstra require non-negative edge weights, and what do you use when weights can be negative?",
    a:
      "Dijkstra closes the frontier's minimum-cost node and treats its distance as **final**. That's valid only if no future path can be cheaper — which holds when edges are **non-negative** (extending a path can't lower its cost). A negative edge can make a later, longer-looking path undercut an already-closed node, which Dijkstra never revisits, so it returns wrong distances.\n" +
      "For negative weights use **Bellman–Ford**: relax all E edges V−1 times, O(V·E), making no finality assumption. A V-th pass that still relaxes an edge proves a **negative cycle** (where shortest paths are undefined). For all-pairs with negatives, **Johnson's algorithm** reweights with Bellman–Ford, then runs Dijkstra per source.",
  },
  {
    id: "iv-ch17-4",
    chapterId: "ch17",
    level: "senior",
    q: "What makes an A* heuristic admissible, and what's the stronger property of consistency?",
    a:
      "**Admissible** means h(n) **never overestimates** the true remaining cost to the goal. With an admissible h, A* is **optimal** — it can't close the goal on a worse-than-shortest path. Straight-line (Euclidean) and Manhattan distances are admissible on maps/grids because they under-count real travel.\n" +
      "**Consistent (monotone)** is stronger: h(n) ≤ cost(n, n′) + h(n′) for every edge — the estimate never drops faster than the real cost. Consistency implies admissibility and guarantees that once a node is closed its g-value is final, so **A* never re-expands a node** (no need for a re-open check). Inconsistent-but-admissible heuristics stay optimal but may re-expand nodes.",
  },
  {
    id: "iv-ch17-5",
    chapterId: "ch17",
    level: "senior",
    q: "Contrast Kruskal and Prim for building a minimum spanning tree — data structures and when each wins.",
    a:
      "**Kruskal** is edge-first: sort all edges, then add the cheapest that doesn't create a cycle, using a **union-find (disjoint-set)** structure to test connectivity in near-O(1). Cost is dominated by the sort: **O(E log E)**. It shines on **sparse** graphs and when edges are already sorted or given as a stream.\n" +
      "**Prim** is vertex-first: grow one tree, repeatedly adding the cheapest edge leaving it, via a **priority queue**. With a binary heap it's **O(E log V)**; with an array/Fibonacci heap it's O(V²)/O(E + V log V), which beats Kruskal on **dense** graphs. Both are greedy and both yield a provably minimum tree — the choice is about density and the data structures you already have.",
  },
  {
    id: "iv-ch17-6",
    chapterId: "ch17",
    level: "staff",
    q: "You must answer millions of shortest-path queries on a continent-scale road network. Plain Dijkstra is too slow. What do you do?",
    a:
      "Trade **preprocessing for query speed**. Practical options: **A\\*** with a good heuristic (great-circle distance) and **bidirectional** search to shrink the explored frontier; **ALT** (A\\* + Landmarks + Triangle inequality) precomputes distances to a few landmarks for a sharp heuristic; **Contraction Hierarchies** precompute shortcut edges so a query touches thousands of nodes instead of hundreds of millions; **Hub Labeling** pushes queries to microseconds at higher memory cost.\n" +
      "The staff-level framing: pick the point on the **preprocessing-time / space / query-time** curve that fits the workload — road topology is static, so heavy one-time preprocessing amortizes across billions of queries. Mention correctness (shortcuts preserve exact distances) and updates (traffic ⇒ customizable CH / dynamic techniques).",
  },
  {
    id: "iv-ch18-1",
    chapterId: "ch18",
    level: "mid",
    q: "What two properties must a problem have for dynamic programming to apply?",
    a:
      "**Optimal substructure** — an optimal solution is composed of optimal solutions to subproblems (a shortest path's prefix is itself shortest) — and **overlapping subproblems** — the same subproblems recur, so caching pays off.\n" +
      "If subproblems are independent (no overlap), plain **divide & conquer** is already efficient and there's nothing to memoize. If a provably-safe local choice exists, **greedy** may beat DP. DP is the tool when you have optimal substructure *and* the recursion tree revisits the same states.",
  },
  {
    id: "iv-ch18-2",
    chapterId: "ch18",
    level: "mid",
    q: "Memoization vs tabulation — what are the trade-offs?",
    a:
      "**Memoization** (top-down) keeps the natural recursion and caches each result; it's easy to write and computes **only the states you actually need** (good for sparse state spaces), but it recurses — risking **stack overflow** on deep inputs and paying call overhead.\n" +
      "**Tabulation** (bottom-up) fills a table in dependency order with loops: no recursion, predictable performance, and it often lets you keep only the **last row or two** (rolling array) for big space savings. The cost is that you compute every state whether needed or not, and you must work out the fill order explicitly. Same recurrence, opposite direction.",
  },
  {
    id: "iv-ch18-3",
    chapterId: "ch18",
    level: "senior",
    q: "How do you prove a greedy algorithm is correct?",
    a:
      "Two standard techniques. An **exchange argument**: take any optimal solution and show you can transform it, step by step, into the greedy one without ever making it worse — so greedy is at least as good as optimal. Or show the problem's independent sets form a **matroid**, in which the greedy algorithm is guaranteed optimal (Edmonds).\n" +
      "The discipline matters because greedy **looks** right far more often than it **is** right — general coin change and 0/1 knapsack are classic traps where a locally-best choice fails globally. If you can't produce the exchange/matroid argument, fall back to DP. In interviews, always pair a greedy claim with its justification.",
  },
  {
    id: "iv-ch18-4",
    chapterId: "ch18",
    level: "senior",
    q: "Give the DP recurrence for 0/1 knapsack and its complexity. Why is it called pseudo-polynomial?",
    a:
      "State `dp[i][w]` = best value using the first i items within capacity w. Recurrence: `dp[i][w] = max(dp[i−1][w], value[i] + dp[i−1][w − weight[i]])` when `weight[i] ≤ w`, else `dp[i−1][w]`. Time and space **O(n·W)** (space droppable to O(W) with a reverse-order rolling array).\n" +
      "It's **pseudo-polynomial** because the run-time is polynomial in the **numeric value** W, not in the **input size**. W takes only log₂W bits to write down, so O(n·W) is exponential in the length of the input — which is why 0/1 knapsack is NP-hard yet has this 'fast for small W' table.",
  },
  {
    id: "iv-ch18-5",
    chapterId: "ch18",
    level: "staff",
    q: "When does backtracking become branch & bound, and where is it used in practice?",
    a:
      "**Backtracking** prunes a branch only when a partial solution becomes **infeasible**. **Branch & bound** adds an **optimistic bound**: compute the best value any completion of the current partial solution could reach, and prune the branch whenever that bound can't beat the best solution found so far. It's backtracking guided by a DP-/relaxation-style estimate.\n" +
      "It's the backbone of exact **integer/linear programming** (LP-relaxation bounds), **SAT/CSP** solvers (with clause learning and constraint propagation), and exact **TSP**. The staff point: the quality of the bound and the branching/variable-ordering heuristics decide whether the search is tractable — a tight bound prunes exponentially more of the tree.",
  },
  // ---- ch.19 · Automata & regular languages ----
  {
    id: "iv-ch19-1",
    chapterId: "ch19",
    level: "mid",
    q: "What's the difference between a DFA and an NFA, and is one more powerful?",
    a:
      "Same power, different shape. A **DFA** has exactly one transition per (state, symbol) — its run is forced. An **NFA** may have zero, one, or many, plus ε-moves, and accepts if *some* path accepts.\n" +
      "They recognize the identical class (regular languages): the **subset construction** turns any NFA into a DFA whose states are sets of NFA states (Rabin–Scott). NFAs are smaller and drop straight out of a regex; DFAs run in linear time with no backtracking. The only cost of converting is size — up to 2ⁿ states.",
  },
  {
    id: "iv-ch19-2",
    chapterId: "ch19",
    level: "senior",
    q: "Prove that aⁿbⁿ is not a regular language.",
    a:
      "Pumping lemma. Assume it's regular with pumping length p and take s = aᵖbᵖ. The lemma splits s = xyz with |xy| ≤ p and |y| ≥ 1, so y sits entirely inside the a's. Pump to xy²z: it has more a's than b's, so it's not in the language — contradiction.\n" +
      "The deeper reason: a DFA with p states, reading p+1 a's, must repeat a state (pigeonhole), and from then on it can't tell two different a-counts apart. Finite memory can't track an unbounded count.",
  },
  {
    id: "iv-ch19-3",
    chapterId: "ch19",
    level: "senior",
    q: "Your API accepts a user-supplied regular expression and runs it on request data. What's the risk, and how do you handle it?",
    a:
      "**ReDoS** — catastrophic backtracking. Patterns like `(a+)+$` make a backtracking engine explore exponentially many ways to match, so one crafted string pins a CPU (a denial of service).\n" +
      "Mitigations: run a **linear-time** engine (RE2, Rust `regex`) that compiles to an automaton and has no backtracking; or if stuck with a backtracking engine, impose a match **timeout**, cap input length, and forbid dangerous features (nested quantifiers, backreferences). The root cause is that \"regex\" features like backreferences exceed the regular languages, which is exactly what forces the exponential search.",
  },
  {
    id: "iv-ch19-4",
    chapterId: "ch19",
    level: "mid",
    q: "Give one regular language and one non-regular language, and say what separates them.",
    a:
      "Regular: \"binary strings with an even number of 1s\" — two states (even/odd) suffice. Non-regular: \"aⁿbⁿ\" or \"balanced parentheses\" — both need to count to an unbounded depth.\n" +
      "The dividing line is **bounded vs unbounded memory**. A regular language needs only a fixed amount of state; the moment correctness depends on remembering an unbounded quantity (a count, a nesting depth), it leaves the regular class and needs at least a stack (context-free).",
  },
  {
    id: "iv-ch19-5",
    chapterId: "ch19",
    level: "staff",
    q: "Where do finite automata actually show up in production systems?",
    a:
      "Everywhere small, fast recognition is needed. **Lexers/tokenizers** (ch.11) are DFAs. `grep`/RE2 compile patterns to automata for linear-time search; **Aho–Corasick** is an automaton for multi-pattern matching (IDS, virus signatures). **Protocol and UI state machines** — the TCP connection lifecycle (ch.27) is literally a finite automaton. Validators (dates, identifiers) are regular. Even hardware controllers (ch.7) are FSMs.\n" +
      "Senior beats: **DFA minimization** (Hopcroft) for table size, and choosing an automaton engine over a backtracking one when input is untrusted.",
  },
  // ---- ch.20 · Computability ----
  {
    id: "iv-ch20-1",
    chapterId: "ch20",
    level: "mid",
    q: "State the halting problem and sketch why it's undecidable.",
    a:
      "Halting: decide, for an arbitrary program P and input x, whether P(x) eventually stops. No algorithm does this for all cases.\n" +
      "Sketch (diagonalization): suppose a decider H(P,x) exists. Build D(P) = { if H(P,P) says \"halts\" then loop forever, else halt }. Ask what D(D) does — if it halts, H said \"halts,\" so D should have looped; if it loops, H said \"loops,\" so D should have halted. Both contradict, so H can't exist.",
  },
  {
    id: "iv-ch20-2",
    chapterId: "ch20",
    level: "senior",
    q: "Decidable vs recognizable (recursively enumerable) — what's the difference, and where does halting sit?",
    a:
      "**Decidable**: a machine always halts and answers yes/no correctly. **Recognizable (RE)**: a machine halts and says \"yes\" on members, but may run forever on non-members — a semi-decision.\n" +
      "Halting is **recognizable but not decidable**: run P(x) and you'll see it halt if it does, but no finite wait proves it never will. A language is decidable iff both it and its complement are recognizable (RE ∩ co-RE) — and halting's complement is *not* RE, which is precisely why halting isn't decidable.",
  },
  {
    id: "iv-ch20-3",
    chapterId: "ch20",
    level: "senior",
    q: "What is Rice's theorem, and what does it mean for static analysis tools?",
    a:
      "Rice's theorem: **every non-trivial property of the function a program computes is undecidable** (trivial = true for all programs or none). \"Does it ever return null?\", \"are these two functions equivalent?\", \"is this code dead?\" — all undecidable in general.\n" +
      "So tools must compromise: **sound but incomplete** (over-approximate — reject some safe programs to guarantee catching every bad one, like a type system) or **unsound but useful** (under-approximate — miss some to avoid false-positive noise, like most linters). A tool claiming to detect *all* of some behavioral class with zero false positives is either restricting the language or overselling.",
  },
  {
    id: "iv-ch20-4",
    chapterId: "ch20",
    level: "staff",
    q: "How would you prove some new problem X is undecidable?",
    a:
      "**Reduction from a known-undecidable problem** (usually halting). Show that if you had a decider for X, you could use it to build a decider for halting — which can't exist, so X's decider can't either.\n" +
      "Concretely: map an arbitrary halting instance (P, x) to an instance of X such that the X-answer reveals whether P halts on x. The mapping must be computable. This \"halting ≤ X\" structure is the standard template; Rice's theorem is essentially this argument done once for all non-trivial semantic properties.",
  },
  {
    id: "iv-ch20-5",
    chapterId: "ch20",
    level: "mid",
    q: "If detecting infinite loops is undecidable, how do compilers and linters warn about them at all?",
    a:
      "They don't solve the general problem — they **approximate** it, and only over decidable sub-cases. A compiler can flag an obviously-infinite `while(true)` with no break, or unreachable code after a provable non-return, because those are syntactic/structural patterns, not the full semantic question.\n" +
      "The trade-off is baked in: be **conservative** (warn only when certain, missing subtle cases) or **noisy** (warn on suspicion, with false positives). Undecidability guarantees no analyzer is both complete and sound for the general case.",
  },
  {
    id: "iv-ch20-6",
    chapterId: "ch20",
    level: "staff",
    q: "What is the busy beaver function and why is it interesting?",
    a:
      "BB(n) (Radó, 1962) is the maximum number of steps a halting n-state, 2-symbol Turing machine can take from a blank tape. It's **uncomputable** and grows faster than any computable function — if you could compute BB(n), you'd decide halting for all n-state machines (run each BB(n) steps; if it hasn't stopped, it never will).\n" +
      "It makes uncomputability concrete: BB(1..4) = 1, 6, 21, 107, then BB(5) = **47,176,870**, proved only in **2024** (a machine-checked Coq proof by the bbchallenge collaboration). BB(6) is astronomically large and likely independent of standard axioms — a tiny question mathematics may never settle.",
  },
  // ---- ch.21 · Complexity ----
  {
    id: "iv-ch21-1",
    chapterId: "ch21",
    level: "mid",
    q: "Define P and NP precisely, and state their relationship.",
    a:
      "**P**: problems a deterministic machine solves in polynomial time (O(nᵏ)). **NP**: problems whose \"yes\" answers have a **certificate** verifiable in polynomial time — equivalently, solvable by a nondeterministic machine in polynomial time.\n" +
      "**P ⊆ NP**: if you can solve it fast, you can certainly verify a solution fast. Whether the inclusion is strict (P ≠ NP) is the open question. Note NP is about *verification*, not \"non-polynomial.\"",
  },
  {
    id: "iv-ch21-2",
    chapterId: "ch21",
    level: "senior",
    q: "What does NP-complete mean, and how do you show a problem is NP-complete?",
    a:
      "NP-complete = **in NP** *and* **NP-hard** (every NP problem reduces to it in polynomial time). They're the hardest problems in NP and all inter-reducible.\n" +
      "To prove a problem X is NP-complete: (1) show **X ∈ NP** — give a poly-time verifier for a certificate; (2) show **X is NP-hard** — pick a known NP-complete problem (3-SAT, vertex cover, subset-sum) and give a poly-time reduction *from* it *to* X. Cook–Levin bootstraps the whole chain by proving SAT NP-complete from the definition of NP directly.",
  },
  {
    id: "iv-ch21-3",
    chapterId: "ch21",
    level: "senior",
    q: "In an interview you realize the problem is essentially the travelling salesman. How do you proceed?",
    a:
      "Name it: \"this is NP-hard, so I won't chase an exact polynomial algorithm.\" Then clarify scope. **Small n?** Exact via DP (Held–Karp, O(n²2ⁿ)) or branch and bound. **Large n?** A heuristic + local search: nearest-neighbour then **2-opt**, or accept an **approximation** (metric-TSP has Christofides' 1.5×). **Structure?** If distances are a tree/Euclidean/bounded, special-case algorithms may exist.\n" +
      "The signal interviewers want: recognize the hardness, don't pretend it away, and choose the right *coping* strategy for the constraints.",
  },
  {
    id: "iv-ch21-4",
    chapterId: "ch21",
    level: "mid",
    q: "Why does P vs NP matter outside academia?",
    a:
      "Most **cryptography** assumes P ≠ NP-style hardness: it's easy to verify a signature or check a key, and (believed) hard to forge one or factor. If P = NP with a practical algorithm, much of that collapses.\n" +
      "It also bounds **optimization** everywhere — logistics, scheduling, chip layout, protein folding are NP-hard, so we rely on heuristics and approximations rather than optimal solvers. And it would reshape AI/math: finding proofs would be as easy as checking them. The stakes are why it's a $1,000,000 Millennium Prize.",
  },
  {
    id: "iv-ch21-5",
    chapterId: "ch21",
    level: "staff",
    q: "Explain pseudo-polynomial time using knapsack, and why knapsack is still NP-complete.",
    a:
      "The 0/1 knapsack DP runs in O(nW) where W is the capacity. That's polynomial in the **numeric value** W but exponential in its **encoding length** (W takes log₂W bits), so on the true input size it's exponential — **pseudo-polynomial**.\n" +
      "Knapsack is therefore **weakly** NP-complete: it has a pseudo-poly algorithm and an FPTAS. Contrast **strongly** NP-hard problems like TSP, which stay hard even when all numbers are polynomially bounded — no pseudo-poly algorithm unless P = NP. Watch for costs that scale with a number's magnitude rather than its bit-length.",
  },
  {
    id: "iv-ch21-6",
    chapterId: "ch21",
    level: "staff",
    q: "Give an example of an NP-hard problem that is not NP-complete, and explain why.",
    a:
      "The **halting problem** is NP-hard (every NP problem reduces to it — with unlimited power you can brute-force any certificate) but **not** NP-complete, because it isn't in NP: it's undecidable, and NP problems are at least decidable.\n" +
      "This shows NP-hard ⊋ NP-complete: NP-hardness is a *lower bound* (\"at least as hard as all of NP\") that says nothing about membership. Optimization variants (find the *shortest* TSP tour, as a function problem) are also NP-hard without being NP-complete decision problems.",
  },
  // ===================== ch.22 · Processes & scheduling =====================
  {
    id: "iv-ch22-1",
    chapterId: "ch22",
    level: "mid",
    q: "What's the difference between a process and a thread, and when would you reach for one over the other?",
    a:
      "A **process** has its own address space and resources; a **thread** is a schedulable flow of execution *inside* a process, sharing that address space with sibling threads.\n" +
      "Threads are cheaper to create and switch (no new page tables, no full TLB flush) and communicate by touching shared memory — great for parallelism within one app, at the cost of needing synchronization (ch.25) and shared-fate crashes. Processes give **isolation**: a fault or compromise is contained, and they only talk via IPC. Reach for processes when you want fault/security boundaries (browser tab-per-process), threads when you want cheap shared-memory concurrency.",
  },
  {
    id: "iv-ch22-2",
    chapterId: "ch22",
    level: "mid",
    q: "Walk through what physically happens on a context switch, and why it costs more than the register save/restore suggests.",
    a:
      "The kernel saves the running thread's CPU state (registers, PC, stack pointer) into its PCB, picks the next thread, loads *its* saved state, and (for a cross-process switch) swaps the page-table base register. Direct cost: ~a microsecond, a few thousand cycles.\n" +
      "The bigger, hidden cost is **indirect**: the new thread starts with cold L1/L2 caches, a cold branch predictor, and a TLB that's been flushed or holds the wrong process's entries — so it stalls on misses until it warms back up. On real workloads this indirect cost often exceeds the direct one, which is why excessive switching (tiny quanta, too many runnable threads) hurts throughput.",
  },
  {
    id: "iv-ch22-3",
    chapterId: "ch22",
    level: "senior",
    q: "SJF is provably optimal for average waiting time. Why don't real schedulers use it, and what do they do instead?",
    a:
      "SJF needs the length of each job's next CPU burst **in advance** — an oracle the OS doesn't have. So it's a theoretical optimum, not an implementation.\n" +
      "Practical answers: **estimate** the next burst from history (exponential averaging: τₙ₊₁ = α·tₙ + (1−α)·τₙ), or use a **feedback** scheduler like **MLFQ** that doesn't need the estimate — it starts every job at high priority and demotes ones that use full quanta, so short/interactive jobs stay near the top and CPU-bound jobs sink, approximating shortest-first from observed behaviour. General-purpose schedulers (Linux CFS/EEVDF) instead target *fairness* (equal share via virtual runtime) plus latency, which sidesteps the oracle entirely.",
  },
  {
    id: "iv-ch22-4",
    chapterId: "ch22",
    level: "senior",
    q: "How do you choose a round-robin time quantum? What breaks at each extreme?",
    a:
      "You balance responsiveness against overhead. **Too large** → RR degenerates into FCFS: the convoy effect returns and interactive jobs wait behind long ones. **Too small** → context-switch overhead dominates; a large fraction of every quantum is spent switching rather than computing.\n" +
      "The rule of thumb (Silberschatz): pick a quantum large enough that ~80% of CPU bursts finish within it, so most jobs complete in one slice while still preempting the rare long one — typically ~10–100 ms, and always ≫ the context-switch time. The right value depends on the measured switch cost and the workload's burst distribution.",
  },
  {
    id: "iv-ch22-5",
    chapterId: "ch22",
    level: "senior",
    q: "What is starvation, which schedulers cause it, and how is it fixed?",
    a:
      "**Starvation** is a runnable process never getting the CPU because the policy always prefers others. **Priority** scheduling (especially preemptive) causes it: a steady stream of higher-priority work can keep a low-priority job off the CPU forever. SJF/SRTF can starve long jobs the same way.\n" +
      "The fix is **aging**: gradually raise the priority of a process the longer it waits, guaranteeing it eventually wins. Fairness-based schedulers avoid it structurally — MLFQ periodically **boosts** everyone back to the top queue; CFS/EEVDF track accumulated CPU (virtual runtime / lag) so a neglected task's eligibility rises until it's scheduled.",
  },
  {
    id: "iv-ch22-6",
    chapterId: "ch22",
    level: "staff",
    q: "Sketch how Linux's scheduler evolved (O(1) → CFS → EEVDF) and what problem each step solved.",
    a:
      "**O(1)** (2.6, early 2000s): constant-time next-task selection via per-priority run-queues and a bitmap. Fast, but its heuristics for detecting 'interactive' tasks were fragile.\n" +
      "**CFS** (2007): drop fixed time-slices; track each task's **virtual runtime** and always run the one with the least — an ordered red-black tree that approximates giving every task an equal share, weighted by nice value. Clean and fair, but low-latency needs bolted on 'latency-nice' patches.\n" +
      "**EEVDF** (default since 6.6, Oct 2023): keep fair sharing but add **eligibility** (a task can't run ahead of its fair share — tracked as *lag*) and per-request **virtual deadlines**, so latency-sensitive tasks get served on time by construction. All three schedule **threads** and, on SMP, keep per-CPU run-queues with periodic load balancing.",
  },
  // ===================== ch.23 · Memory =====================
  {
    id: "iv-ch23-1",
    chapterId: "ch23",
    level: "mid",
    q: "What does virtual memory buy you, and how does a virtual address become a physical one?",
    a:
      "Virtual memory gives each process a private address space starting at zero. That buys **isolation** (a process can't even name another's memory), **relocation/simplicity** (every program is linked for the same clean layout), and the ability to use **more memory than physically exists** (cold pages live on disk).\n" +
      "Translation is by **paging**: the virtual address splits into a page number (high bits) and a byte offset (low bits). The MMU looks the page number up — first in the **TLB**, else by walking the page table — to get a physical frame, then forms `frame × page_size + offset`. It happens in hardware on every single access.",
  },
  {
    id: "iv-ch23-2",
    chapterId: "ch23",
    level: "mid",
    q: "What is a TLB, and why does the system slow to a crawl without a good hit rate?",
    a:
      "The **TLB** (translation lookaside buffer) is a small, fast cache of recent virtual-page → physical-frame translations, sitting in the MMU.\n" +
      "Without it, *every* memory access would need extra memory reads to walk the page table — and with multi-level tables that's one read **per level** (four on x86-64) before the actual access. A TLB hit collapses all of that into a single fast lookup. Because programs have locality, a small TLB catches the vast majority of translations; a poor hit rate (e.g. a working set that overflows TLB reach) means every access pays the walk, which is exactly what **huge pages** exist to mitigate.",
  },
  {
    id: "iv-ch23-3",
    chapterId: "ch23",
    level: "mid",
    q: "Distinguish a page fault from a segmentation fault.",
    a:
      "A **page fault** is a normal, expected event: the accessed address is *valid* but its page isn't currently in RAM (never loaded, or evicted). The MMU traps, the OS loads the page (evicting a victim if needed), updates the table, and restarts the instruction — the program never notices except as a pause.\n" +
      "A **segmentation fault** is an *error*: the address has no valid mapping at all (or the wrong permissions — writing read-only memory, dereferencing null). The OS can't satisfy it, so it signals the process (SIGSEGV), usually killing it. Same machinery (the MMU trap), opposite meaning: one is 'fetch it', the other is 'you may not touch that'.",
  },
  {
    id: "iv-ch23-4",
    chapterId: "ch23",
    level: "senior",
    q: "Why are page tables multi-level instead of one flat array, and what does that cost?",
    a:
      "A flat table needs one entry per virtual page whether or not it's used. For a 48-bit space with 4 KiB pages that's 2³⁶ entries **per process** — terabytes of table for programs that touch megabytes. Absurd.\n" +
      "**Multi-level (radix) tables** slice the page number into an index per level; subtrees for unmapped regions simply don't exist, so the table's size tracks what's actually mapped (sparse). The cost is a longer **walk** on a TLB miss — one memory reference per level (x86-64: 4 levels, optionally 5) — which is precisely why the TLB and huge pages matter. It's the classic space-vs-time trade, resolved by caching the result.",
  },
  {
    id: "iv-ch23-5",
    chapterId: "ch23",
    level: "senior",
    q: "Compare FIFO, LRU, Optimal and Clock. What's Bélády's anomaly and which policies avoid it?",
    a:
      "**Optimal (MIN)** evicts the page used farthest in the future — provably fewest faults, but unrealizable (needs the future); it's the benchmark. **LRU** approximates it using the past (evict least-recently-used); near-optimal under locality but expensive to track exactly. **Clock/second-chance** approximates LRU cheaply with a reference bit and a sweeping hand. **FIFO** evicts the oldest-loaded page — trivial, but blind to usage.\n" +
      "**Bélády's anomaly**: under FIFO, adding frames can *increase* faults (e.g. 1 2 3 4 1 2 5 1 2 3 4 5 → 9 faults at 3 frames, 10 at 4). It happens because FIFO isn't a **stack algorithm** — its resident set with n frames isn't necessarily a subset of the set with n+1. LRU and Optimal satisfy that inclusion property, so they're immune.",
  },
  {
    id: "iv-ch23-6",
    chapterId: "ch23",
    level: "staff",
    q: "A production box grinds to a halt paging constantly, though CPU is near idle. What's happening and how do you fix it?",
    a:
      "That's **thrashing**: the combined **working sets** of the running processes exceed physical RAM, so nearly every access faults, evicting a page that's needed again immediately. The disk (or swap) is the bottleneck; the CPU stalls waiting on I/O, so it looks idle while throughput craters.\n" +
      "The cure is **not** a smarter replacement policy — it's reducing memory pressure: lower the multiprogramming level (admit fewer processes / cap concurrency), add RAM, or size each process's frames to its working set (Denning's model, or a page-fault-frequency controller that grants more frames when a process faults too often and reclaims them when it faults rarely). Killing or suspending the biggest offender is the emergency stop.",
  },

  // ch24 · Files & storage
  {
    id: "iv-ch24-1",
    chapterId: "ch24",
    level: "mid",
    q: "What is an inode, and what does it NOT contain?",
    a:
      "An **inode** (index node) is the per-file on-disk record holding everything *about* a file: its type, size, owner, permissions, timestamps, a link count, and the **map from logical file blocks to physical disk blocks**.\n" +
      "What it deliberately does **not** hold is the file's **name**. Names live in **directories**, which map names to inode numbers. That separation is what lets one file have several names (**hard links**, counted by the link count so the data is freed only when the count hits zero) and makes a directory just another file.",
  },
  {
    id: "iv-ch24-2",
    chapterId: "ch24",
    level: "mid",
    q: "How does a fixed-size inode address both a 10-byte file and a multi-terabyte one?",
    a:
      "Through **multi-level indirection**. The inode has a handful of **direct** pointers (classically 12) that name a small file's blocks directly — one read each. Beyond that it has a **single-indirect** pointer to a block *of* pointers, a **double-indirect** pointer to a block of single-indirect blocks, and a **triple-indirect** for one more level.\n" +
      "The fan-out per level is `blockSize / pointerSize` (1024 for 4 KiB blocks and 4-byte pointers), so three levels reach past 4 TiB. Small files pay nothing extra; huge files pay at most a few extra reads to walk the indirection — and those indirect blocks are cached, so it's rarely felt.",
  },
  {
    id: "iv-ch24-3",
    chapterId: "ch24",
    level: "mid",
    q: "Compare contiguous, linked, and indexed allocation.",
    a:
      "**Contiguous** stores a file in one adjacent run: excellent sequential *and* random access (block *i* = start + *i*), but it needs a hole big enough and causes **external fragmentation**, so a large file can fail to fit even with plenty free.\n" +
      "**Linked** threads the file through any free blocks, each pointing to the next (FAT): no external fragmentation and easy growth, but random access must **walk the chain**, and one bad pointer truncates the file.\n" +
      "**Indexed** keeps one **index block** listing all data blocks: cheap random access and easy growth, at the cost of a block of overhead per file (and a bound on file size per index block). That's the inode approach — with indirection added to lift the size bound.",
  },
  {
    id: "iv-ch24-4",
    chapterId: "ch24",
    level: "senior",
    q: "What problem does journaling solve, and what does 'ordered mode' guarantee?",
    a:
      "A single logical update touches several blocks (data, free-space bitmap, inode); a crash **between** those writes leaves the file system inconsistent (leaked or double-allocated blocks). **Journaling** writes the intended change to a log and makes it durable with a single atomic **commit** record *before* touching the real locations. Recovery is then decidable: no commit ⇒ discard; commit present ⇒ replay (writes are idempotent). It replaces the O(disk) **fsck** scan.\n" +
      "Most systems journal **metadata only** for speed. ext3/4's default **ordered** mode adds one guarantee: file **data** is forced to disk *before* the metadata that points to it commits — so after a crash you never see an inode pointing at stale/garbage blocks, even though the data itself isn't journaled. (Full **journal** mode logs data too but ~halves write throughput; **writeback** drops the ordering and can expose garbage.)",
  },
  {
    id: "iv-ch24-5",
    chapterId: "ch24",
    level: "senior",
    q: "Why can't you treat an SSD like a faster hard disk?",
    a:
      "Flash can't overwrite a page in place — you must **erase an entire block** (many pages) before rewriting — and each cell tolerates a limited number of erase cycles. So an SSD hides a **Flash Translation Layer (FTL)** that writes updates to fresh pages, remaps logical→physical addresses, does **wear leveling**, and garbage-collects blocks full of stale pages. That GC causes **write amplification** (one logical write triggers several physical ones).\n" +
      "Consequences: **defragmenting** an SSD is pointless wear; small random writes are disproportionately costly; **TRIM** matters (it tells the drive which blocks are truly free); and 'securely wiping' a file is unreliable because the FTL may have relocated copies. Same interface as an HDD, very different rules — and no seek penalty, so random reads are nearly as fast as sequential.",
  },
  {
    id: "iv-ch24-6",
    chapterId: "ch24",
    level: "staff",
    q: "A service does many small appends and needs each acknowledged write to survive a crash. What do you need to know and do?",
    a:
      "Key fact: a successful `write()` only reaches the OS **page cache** — it can sit in RAM for seconds before hitting the disk. To make an ack durable you must **fsync** the file (and, for a newly created file, fsync its **directory** too, or the name may not survive). Only after fsync returns is the data on stable media.\n" +
      "Beyond correctness: batch appends and fsync **once per batch** (group commit) rather than per record, because each fsync is a durability barrier that can cost milliseconds; consider O_DIRECT or a dedicated log device if the page cache hurts; and know your file system's journaling mode — metadata journaling protects the *structure*, not necessarily your last data write. This is exactly why databases keep their own **write-ahead log** and fsync it deliberately rather than trusting buffered writes.",
  },

  // ch25 · Concurrency
  {
    id: "iv-ch25-1",
    chapterId: "ch25",
    level: "mid",
    q: "What is a race condition? Give the canonical example.",
    a:
      "A **race condition** is when the correctness of a result depends on the **timing/interleaving** of concurrent operations that no one controls.\n" +
      "The canonical example is `count++` from two threads without synchronization. `count++` isn't atomic — it's **load, increment, store**. If both threads load the same value, both increment their private register, and both store, the counter rises by **one** instead of two: a **lost update**. The fix is mutual exclusion (a lock, or an atomic operation) so the read-modify-write is indivisible.",
  },
  {
    id: "iv-ch25-2",
    chapterId: "ch25",
    level: "mid",
    q: "Mutex vs semaphore vs condition variable — when do you use each?",
    a:
      "A **mutex** enforces mutual exclusion: one holder at a time, and (by convention) the holder releases it — use it to protect a critical section.\n" +
      "A **semaphore** is a counter with atomic wait/signal (Dijkstra's P/V): a *binary* semaphore acts like a lock, but a *counting* one lets up to N through — use it to model a pool of N interchangeable resources or to signal availability between threads.\n" +
      "A **condition variable** lets a thread **wait until a predicate holds** (e.g. 'queue non-empty'), always paired with a mutex and used in a `while (!predicate) wait()` loop to handle spurious wakeups — use it for 'sleep until something changes' coordination, not for mutual exclusion itself.",
  },
  {
    id: "iv-ch25-3",
    chapterId: "ch25",
    level: "senior",
    q: "State the four conditions necessary for deadlock, and how each is broken.",
    a:
      "**Coffman's four** (all must hold at once): **mutual exclusion** (a resource is held exclusively), **hold-and-wait** (hold one resource while waiting for another), **no-preemption** (a resource is released only voluntarily), and **circular wait** (a closed chain of waiters).\n" +
      "Because they're jointly necessary, removing **any one** prevents deadlock: impose a global **resource ordering** to kill *circular wait*; require **all-or-nothing** acquisition to kill *hold-and-wait*; allow **preemption/rollback** (trylock + release) to kill *no-preemption*. Mutual exclusion is usually the one you can't drop — a lock is inherently exclusive — so real prevention attacks the other three.",
  },
  {
    id: "iv-ch25-4",
    chapterId: "ch25",
    level: "senior",
    q: "How does an OS or database detect deadlock, and how does it recover?",
    a:
      "Build the **wait-for graph** — a node per thread/transaction, an edge from each blocked one to the holder of the resource it wants — and look for a **cycle** (a DFS in O(V+E) for single-instance resources). A cycle *is* a deadlock: every member waits for the next, forever.\n" +
      "Recovery breaks the cycle by **preempting a victim**: databases abort and roll back the transaction 'chosen as deadlock victim' (usually the cheapest to undo), then let it retry; an OS might kill a process or force-release a resource. This is the **detection + recovery** posture — as opposed to **prevention** (structurally remove a condition), **avoidance** (Banker's algorithm — stay in safe states, needs max claims up front), or the **ostrich algorithm** (ignore it), which most general-purpose OSes use for application-level locks.",
  },
  {
    id: "iv-ch25-5",
    chapterId: "ch25",
    level: "senior",
    q: "Deadlock, livelock, starvation, priority inversion — distinguish them.",
    a:
      "**Deadlock**: a set of threads blocked in a wait-for cycle — nobody runs, nobody yields. **Livelock**: threads *are* running but make no progress, e.g. repeatedly detecting a conflict, backing off, and retrying in lockstep (two people sidestepping in a hallway) — fixed with randomized backoff. **Starvation**: a runnable thread is perpetually passed over because others keep winning the resource (an unfair scheduler or a stream of higher-priority work) — fixed with aging/fairness.\n" +
      "**Priority inversion**: a low-priority thread holds a lock a high-priority thread needs, and a medium-priority thread preempts the low one, so the high-priority thread is blocked indefinitely by a lower-priority one. The fix is **priority inheritance** (the holder temporarily inherits the waiter's priority) — famously the bug that reset the **Mars Pathfinder** rover in 1997.",
  },
  {
    id: "iv-ch25-6",
    chapterId: "ch25",
    level: "staff",
    q: "A service intermittently hangs under load; you suspect a lock-ordering deadlock. How do you confirm and fix it?",
    a:
      "**Confirm**: take a **thread/stack dump** of the hung process (jstack, gdb `thread apply all bt`, pprof) and look for two-plus threads each **blocked acquiring a lock while holding another** — the wait-for cycle is visible in the stacks. Many runtimes and tooling (Java's deadlock detector, TSAN, lock-order validators like the Linux kernel's lockdep) will name the inverted acquisition order directly.\n" +
      "**Fix**: impose a **global lock ordering** and make every path acquire in that order — the structural cure for circular wait. Where that's impractical, use **lock-free** structures or a single coarser lock for the contended invariant, shrink critical sections so locks are held briefly, or use **trylock with timeout + backoff** to break cycles at the cost of retries. Then add a **lockdep/TSAN** gate in CI so a re-introduced inversion fails a test rather than a customer.",
  },
  // ---- P7 · Networks (S13) ----
  {
    id: "iv-ch26-1",
    chapterId: "ch26",
    level: "mid",
    q: "What's the difference between a switch and a router?",
    a:
      "They operate at **different layers** on **different addresses**. A **switch** is link-layer: it forwards **frames** within one network by **MAC** address, which is flat and **learned** from traffic (flood the unknown, learn the source, then forward). A **router** is internet-layer: it forwards **packets** *between* networks by **IP** address, which is hierarchical and **routed** via a routing table, and it **decrements the TTL** at each hop.\n" +
      "Corollary: a switch defines a **broadcast domain**; a router **separates** them. Your home 'router' is really a switch + router + NAT + DHCP + firewall in one box, which is why the line blurs in casual use.",
  },
  {
    id: "iv-ch26-2",
    chapterId: "ch26",
    level: "senior",
    q: "Why doesn't the internet just route on MAC addresses? Why is IP necessary at all?",
    a:
      "Because MAC addresses are **flat** — to forward on one you need an entry for *that exact address*, so a global MAC table would need a row per device on Earth. That's why switching stays **local**.\n" +
      "IP addresses are **hierarchical** (prefix + host), so routers store one route per **prefix** and pick the **longest matching prefix**. A single entry like `93.184.0.0/16` covers 65,536 hosts, which is why the global table is ~1 million prefixes instead of ~20 billion hosts. Hierarchy turns an impossible O(hosts) problem into a tractable O(prefixes) one — the same trick that lets DNS scale.",
  },
  {
    id: "iv-ch26-3",
    chapterId: "ch26",
    level: "senior",
    q: "Type a URL, hit Enter — what happens at the network layers before the first byte of HTML?",
    a:
      "**Resolve**: DNS turns the hostname into an IP (recursive resolver → root → TLD → authoritative, heavily cached). **Locate the next hop**: the OS checks whether the destination is on the local subnet; if not, it targets the default gateway, using **ARP** to find that gateway's MAC. **Connect**: a **TCP three-way handshake** (SYN/SYN-ACK/ACK) to the server IP on port 443. **Secure**: a **TLS** handshake negotiates keys. Only *then* does the **HTTP GET** go out.\n" +
      "Good candidates name the two-address split (IP end-to-end, MAC rewritten per hop), TTL decrementing at each router, and that DNS/TCP/TLS are each a real round trip — which is exactly what caching and connection reuse exist to avoid.",
  },
  {
    id: "iv-ch26-4",
    chapterId: "ch26",
    level: "staff",
    q: "What is NAT, why does it exist, and what does it break?",
    a:
      "**NAT** (Network Address Translation) lets many devices share one public IPv4 address: the router rewrites source IP+port on the way out and keeps a **translation table** to reverse it on replies. It exists because **IPv4 has only ~4.3 billion addresses and ran out** — NAT was the stopgap (IPv6 is the real fix).\n" +
      "What it breaks: it **violates the end-to-end principle** — an outside host can't initiate a connection to a device behind NAT, which is why peer-to-peer needs **hole punching** and relays (STUN/TURN). It makes the router **stateful**, so idle connections get evicted (hence TCP keepalives), and it complicates protocols that embed addresses in their payload. It's a case study in how a pragmatic hack becomes permanent infrastructure.",
  },
  {
    id: "iv-ch26-5",
    chapterId: "ch26",
    level: "senior",
    q: "IP gets a packet across the internet — but how does it cross the last meter to the right network card? Explain ARP.",
    a:
      "Inside one link-layer segment, delivery is by **MAC address**; IP is a logical overlay on top. **ARP** bridges the two: the sender broadcasts *'who has 192.168.1.7?'*, the owner replies with its MAC, and the answer is cached (the ARP table, with a TTL). To leave the subnet, the host doesn't ARP for the destination at all — the netmask says 'not local', so it ARPs for the **default gateway's** MAC. That's the general pattern of the stack: **IP addresses stay end-to-end** while **MAC addresses are swapped hop by hop** — each router peels the L2 header and writes a new one.\n" +
      "The senior angles: ARP is **unauthenticated**, so anyone on the LAN can claim any IP — **ARP spoofing** is the classic on-path attack (one reason untrusted Wi-Fi is dangerous), while the same trick used honestly (**gratuitous ARP**) powers IP failover. And IPv6 replaced it with **NDP**, same job, ICMPv6 messages. One-liner: *IP decides where; ARP finds the next hop's name for it.*",
  },
  {
    id: "iv-ch27-1",
    chapterId: "ch27",
    level: "senior",
    q: "Explain the TCP three-way handshake. Why three messages and not two?",
    a:
      "Client → **SYN** (seq = x). Server → **SYN-ACK** (seq = y, ack = x+1). Client → **ACK** (ack = y+1). It synchronizes **both** directions' initial sequence numbers — each side must announce its own ISN *and* confirm it heard the other's.\n" +
      "Two messages can't do it: a SYN + SYN-ACK proves the *client's* ISN reached the server and the server's reply reached the client, but the **server has no confirmation that the client received the server's ISN** — the third ACK closes that loop. (Note the +1s: a SYN consumes one sequence number, so each side acks the peer's ISN **plus one**.) Random ISNs also matter for security — predictable ones enable spoofing.",
  },
  {
    id: "iv-ch27-2",
    chapterId: "ch27",
    level: "senior",
    q: "TCP or UDP — when would you deliberately reach for UDP?",
    a:
      "When **timeliness beats completeness**. For real-time media (voice, video, games), a retransmitted packet arrives too late to use — you want the *next* frame, not a perfect copy of last second's — so UDP's fire-and-forget (plus app-level concealment of losses) wins. Also for **short request/response** where TCP's handshake overhead dominates (classic **DNS**), and as the base for **QUIC**, which rebuilds its *own* reliability and multiplexing over UDP to escape TCP's head-of-line blocking.\n" +
      "The tell of a weak answer is 'UDP is just faster.' The real trade is **reliability + ordering vs latency + control** — you pick UDP when you'd rather handle loss yourself than let TCP's in-order guarantee stall you.",
  },
  {
    id: "iv-ch27-3",
    chapterId: "ch27",
    level: "staff",
    q: "Distinguish flow control from congestion control, and explain how TCP Reno probes for bandwidth.",
    a:
      "**Flow control** protects the **receiver** from overrun via the advertised **receive window** (rwnd) — 'I have room for this many more bytes.' **Congestion control** protects the **shared network** via the sender's **congestion window** (cwnd) — an estimate of what the *path* can absorb. Bytes in flight ≤ **min(rwnd, cwnd)**; they solve different problems with different signals.\n" +
      "**Reno**: start small, **slow-start** doubles cwnd per RTT until `ssthresh`, then **congestion avoidance** adds one MSS per RTT (AIMD). On **triple-dup ACKs** (fast retransmit) it halves cwnd and continues (fast recovery); on a **timeout** it collapses to 1 and slow-starts again — the sawtooth. Additive-increase/multiplicative-decrease is provably what drives competing flows toward a **fair, stable** share. Modern stacks use **CUBIC** (default in Linux, cubic growth for high bandwidth-delay paths) or **BBR** (models bandwidth × RTT instead of using loss as the signal).",
  },
  {
    id: "iv-ch27-4",
    chapterId: "ch27",
    level: "staff",
    q: "A large transfer is far slower than the link should allow, with low loss. Where do you look?",
    a:
      "With low loss, suspect the connection is **window-limited**, not congestion-limited. Throughput ≈ **window / RTT**, so to fill a path you need a window ≥ the **bandwidth-delay product** (link rate × RTT). A 1 Gbit/s path at 100 ms RTT needs ~**12.5 MB** in flight — if the receive window (or a small socket buffer, or disabled window scaling) caps it lower, you starve the pipe regardless of available bandwidth.\n" +
      "Check: the advertised **rwnd** and OS **buffer sizes** / window scaling, the **RTT** (a distant server hurts even a fat link), application-level stalls (is the sender actually writing fast enough?), and only then loss/congestion. The senior move is naming BDP and realizing 'slow but no loss' points at the *window*, not the network core.",
  },
  {
    id: "iv-ch27-5",
    chapterId: "ch27",
    level: "senior",
    q: "What is TIME_WAIT, why must it exist, and when does it become a production problem?",
    a:
      "After the side that closes **first** sends its last ACK, the socket lingers in **TIME_WAIT** for 2×MSL (max segment lifetime). Two correctness jobs: (1) if that final ACK is lost, the peer retransmits its FIN — someone must still be there to re-ACK it; (2) it quarantines the connection's 4-tuple (src IP, src port, dst IP, dst port) until any **delayed old segments die**, so a stray packet from the dead connection can't be mistaken for data on a *new* connection reusing the same tuple. It's a correctness feature, not a leak.\n" +
      "Production trouble: a busy client or proxy opening many **short-lived outbound** connections to one backend burns a 4-tuple per request — TIME_WAIT pins them, and you exhaust **ephemeral ports** (the tuple space, not memory) → sudden connect failures under load. The real fix is **connection pooling / keep-alive**; supporting moves are more source IPs/ports, `SO_REUSEADDR` so a restarting *server* can rebind its port, and cautious client-side `tcp_tw_reuse` (needs TCP timestamps). The trap answer is `tcp_tw_recycle` — it broke clients behind NAT and was removed from Linux entirely.",
  },
  {
    id: "iv-ch28-1",
    chapterId: "ch28",
    level: "senior",
    q: "What security properties does TLS provide, and what does HTTPS NOT protect?",
    a:
      "TLS provides three things: **confidentiality** (contents encrypted), **integrity** (tampering detected), and **authentication** (a CA-signed certificate proves the server's identity). TLS 1.3 does this in a **single round trip** (0-RTT on resumption).\n" +
      "What it does **not** hide: the **destination IP** (on the packet — routers need it), typically the **hostname** (via DNS and the TLS **SNI** field), and traffic **size/timing** (fingerprintable). So HTTPS stops eavesdropping and impersonation but is **not anonymity** — conflating the two is a real-world security error. It also doesn't protect against a compromised endpoint or a maliciously trusted CA.",
  },
  {
    id: "iv-ch28-2",
    chapterId: "ch28",
    level: "senior",
    q: "Why did HTTP go 1.1 → 2 → 3? Explain head-of-line blocking at both layers.",
    a:
      "**HTTP/1.1** handles one response at a time per connection, so a slow resource blocks its queue — **application-layer head-of-line blocking** — which browsers hack around by opening ~6 parallel TCP connections. **HTTP/2** multiplexes many streams over **one** TCP connection (plus header compression), killing the app-layer HOL. But those streams share one TCP byte stream, so **one lost packet stalls *every* stream** — **transport-layer** HOL. **HTTP/3** drops TCP for **QUIC** over UDP, giving each stream its **own** reliability, so a loss stalls only that stream; TLS is built in for a faster handshake.\n" +
      "The nuance interviewers want: HTTP/2 didn't *remove* head-of-line blocking, it **moved it down a layer**, and only QUIC actually eliminates it — at the cost of running on UDP, which some networks throttle.",
  },
  {
    id: "iv-ch28-3",
    chapterId: "ch28",
    level: "staff",
    q: "Set cache headers for (a) a content-hashed JS bundle, (b) the HTML shell, (c) a user's account page — and justify each.",
    a:
      "**(a) Hashed bundle** `app.9f3c2.js`: **`Cache-Control: public, max-age=31536000, immutable`** — the filename changes when the content does, so it can cache for a year with no revalidation; deploys are safe because a new build ships a new URL. **(b) HTML shell**: **`Cache-Control: no-cache`** (or a short max-age) + an **ETag** — must revalidate so users get new markup promptly, but a `304` keeps it cheap. **(c) Account page**: **`Cache-Control: private, no-store`** — personalized and sensitive, so it must never land in a shared/CDN cache or on disk.\n" +
      "The framework: cache **immutable, hashed assets** aggressively (the big win), **revalidate mutable HTML**, and **never store private/personalized** responses. The classic bug is caching the HTML shell as long as the assets — users get stuck on an old app pointing at deleted bundles.",
  },
  {
    id: "iv-ch28-4",
    chapterId: "ch28",
    level: "senior",
    q: "What problem does the same-origin policy solve, what does CORS change — and why does a request 'work in curl but fail in the browser'?",
    a:
      "The browser attaches **ambient credentials** (cookies, sessions) to requests automatically — so without a rule, any page you visit could quietly *read* responses from your bank using **your** logged-in session. The **same-origin policy** is that rule: scripts may only read responses from their own origin (scheme + host + port). **CORS is the server's opt-out**, not a lock: response headers (`Access-Control-Allow-Origin`, …) tell the *browser* that this cross-origin read is permitted. For non-simple requests (custom headers, JSON `Content-Type`, PUT/DELETE) the browser first sends a **preflight** `OPTIONS` asking whether the method and headers are allowed.\n" +
      "curl 'works' because SOP is a **browser** protection: no origin, no ambient cookies, nothing to enforce. Two nuances interviewers probe: a *simple* cross-origin request still **reaches the server and executes** — the browser only blocks the JS from *reading* the response (so CORS is not access control); and CORS protects **users from malicious sites**, never **servers from clients** — server-side auth still does that job.",
  },
  {
    id: "iv-ch28-5",
    chapterId: "ch28",
    level: "mid",
    q: "Walk through a DNS lookup for a name nobody has cached. Why is DNS both remarkably fast and occasionally fragile?",
    a:
      "Your stub resolver asks a **recursive resolver** (ISP, 1.1.1.1, 8.8.8.8). It walks the hierarchy: a **root** server answers 'ask the `.com` TLD servers', the **TLD** answers 'ask example.com's **authoritative** name servers', and the authoritative server returns the A/AAAA record. Every answer is **cached with a TTL** at every level — recursive resolver, OS, browser — so the full walk is rare; a typical lookup is one cached hop, and **anycast** puts root/resolver replicas physically near you. That's the fast half: *a hierarchical, aggressively cached phone book*.\n" +
      "The fragile half is the same design read backwards: caching means **staleness** (the TTL trade-off: low TTL = fast failover but constant re-resolution and more load; high TTL = cheap but slow to change — which is why cutovers 'take hours to propagate'); one provider's bad config can take out half the internet for an afternoon, because everything upstream *trusts* the answers; and classic DNS rides **unauthenticated UDP/53**, so poisoning is possible without mitigations (source-port randomization, DNSSEC, DoH/DoT). Same tree, same caches — speed and fragility are one mechanism.",
  },
  // ch.29 — Databases
  {
    id: "iv-ch29-1",
    chapterId: "ch29",
    level: "senior",
    q: "Why do relational databases index with B+-trees rather than binary search trees or hash tables?",
    a:
      "It's about the **disk**. A B+-tree node is sized to **one page** and holds hundreds of keys, so the fanout is huge and a tree over *millions* of rows is only **3–4 levels** deep — a lookup is a handful of page reads. All records live in the **linked leaves**, so range queries and `ORDER BY` just **walk the leaf chain** without re-descending. A **BST** has fanout 2 → dozens of levels and one pointer-chase (likely one page miss) per level. A **hash index** gives O(1) point lookups but **can't** do ranges, ordering, or prefix matches — which is most of what a query planner needs.",
  },
  {
    id: "iv-ch29-2",
    chapterId: "ch29",
    level: "senior",
    q: "What is a covering index, and when does it make a query 'index-only'?",
    a:
      "A **covering index** contains every column a query touches — both the predicate columns and the selected columns. The planner can then answer **entirely from the index leaves** and skip fetching the row from the heap (an **index-only scan**). It's a big win on hot read paths: e.g. `(customer_id, total)` fully serves `SELECT total WHERE customer_id = ?`. The cost is **write amplification** and space — every extra column widens the index and every write must maintain it, so you cover deliberately, not everywhere. (In Postgres an index-only scan also depends on the visibility map, since the index alone doesn't know if a row is visible to your snapshot.)",
  },
  {
    id: "iv-ch29-3",
    chapterId: "ch29",
    level: "staff",
    q: "Walk through the ANSI SQL isolation levels and the anomaly each one still allows — and the catch with snapshot isolation.",
    a:
      "**Read Uncommitted** → dirty reads (you see another txn's uncommitted, maybe-rolled-back writes). **Read Committed** → no dirty reads, but **non-repeatable reads** and **phantoms** (the common default, e.g. Postgres). **Repeatable Read** → re-reading a row is stable, but ANSI still permits **phantoms** (new rows matching a predicate). **Serializable** → none; the result equals *some* serial order.\n" +
      "The catch (Berenson et al., 1995): the ANSI phenomena are ambiguously worded, and **snapshot isolation** — the MVCC mechanism many engines label 'Repeatable Read' (Postgres does) — doesn't sit in the grid. SI prevents all three ANSI anomalies yet allows **write skew** (two txns each read a consistent snapshot, then write, violating a cross-row invariant). True `SERIALIZABLE` (e.g. Postgres SSI) closes that.",
  },
  {
    id: "iv-ch29-4",
    chapterId: "ch29",
    level: "senior",
    q: "A query filters on an indexed column but the planner chooses a sequential scan. Give a reason that's actually correct.",
    a:
      "**Selectivity.** If the predicate matches a large fraction of rows, an index scan's **random heap fetches** (roughly one page per matching row) cost more than reading the table **sequentially** (which the OS also prefetches). A cost-based optimizer estimates both and picks the cheaper — so a seq scan on a non-selective predicate is the *right* call. Other honest causes: **stale statistics** (fix with `ANALYZE`), a predicate the index can't use (a function/type mismatch on the column, e.g. `WHERE lower(email)=…` without a matching expression index), or a table small enough that one scan beats the index's overhead.",
  },
  {
    id: "iv-ch29-5",
    chapterId: "ch29",
    level: "senior",
    q: "ACID's Durability says a committed change survives a crash. How is that made cheap, given disks prefer sequential writes?",
    a:
      "With a **write-ahead log (WAL)**. Before `COMMIT` returns, the change is appended to a **sequential** log and `fsync`'d; the actual random heap/index pages can be flushed **lazily** afterward. On restart, recovery **replays** the log to redo committed work and undo the rest. The trick is that one sequential, forced log write is far cheaper than scattered random page writes — and it also gives **Atomicity** (a partial transaction is undone on replay). It's the same write-ahead-logging idea as filesystem journaling (ch.24).",
  },
  // ch.30 — Distributed systems
  {
    id: "iv-ch30-1",
    chapterId: "ch30",
    level: "senior",
    q: "State the CAP theorem precisely, and name the popular misreading.",
    a:
      "In an **asynchronous** network that may drop messages, no system can be simultaneously **Consistent** (linearizable) and **Available** (every request gets a non-error response) while tolerating a **Partition** — Gilbert & Lynch's 2002 proof of Brewer's 2000 conjecture. The misreading is *'pick 2 of 3.'* In a real distributed system partitions **will** happen and aren't something you choose to forgo, so the meaningful choice is **C vs A only while partitioned**. **PACELC** completes it: *else* (no partition) you still trade **Latency vs Consistency**.",
  },
  {
    id: "iv-ch30-2",
    chapterId: "ch30",
    level: "senior",
    q: "How does a read/write quorum (R + W > N) give consistency without a single leader?",
    a:
      "Write to at least **W** replicas and read from at least **R**; if **R + W > N**, the read set and the most-recent write set are **guaranteed to overlap** in ≥1 replica, so a read always *sees* the latest write (versioning — a timestamp or vector clock — lets it pick the newest of what it read). Tuning the knobs trades durability/latency: **W = N** makes writes strongly durable but fragile to one slow node; **R = 1, W = N** favors fast reads; Dynamo-style stores let you pick per operation. It buys overlap, not ordering — concurrent writes still need conflict resolution.",
  },
  {
    id: "iv-ch30-3",
    chapterId: "ch30",
    level: "staff",
    q: "In Raft, why the randomized election timeouts, and how is 'at most one leader per term' guaranteed?",
    a:
      "**Randomized timeouts** desynchronize the followers: one times out first, becomes a candidate, and usually gathers votes before the others wake — which makes **split votes** rare and self-correcting (a tied term just ends and a new randomized round begins). **Election safety** comes from two rules: a node grants **at most one vote per term**, and winning needs a **majority**. Since any two majorities of the same cluster must share ≥1 node, and that node won't vote twice in a term, **two leaders can't both win the same term**. Higher terms always supersede lower ones, so a stale leader steps down once it hears a newer term.",
  },
  {
    id: "iv-ch30-4",
    chapterId: "ch30",
    level: "senior",
    q: "What does a Lamport logical clock guarantee, and what can't it tell you?",
    a:
      "It enforces the **clock condition**: if event *a* happens-before *b* then **C(a) < C(b)** — giving a total order consistent with causality, handy for deterministic tie-breaking. What it **can't** do is detect concurrency: **C(a) < C(b) does *not* imply a → b** — two causally-unrelated (concurrent) events still get ordered by their counters. To capture the full happened-before partial order (and *detect* concurrency), you need **vector clocks** (Fidge & Mattern, 1988), at O(N) space per timestamp for N nodes.",
  },
  {
    id: "iv-ch30-5",
    chapterId: "ch30",
    level: "senior",
    q: "With a primary and async read-replicas, what consistency surprises appear, and how do you mitigate them?",
    a:
      "**Replication lag** produces **stale reads**, and two classic violations: **read-your-writes** (you don't see your own just-committed write) and **monotonic reads** (successive reads hit different replicas and appear to go *backward* in time). Mitigations without paying for full strong consistency: **read-your-writes routing** (send a client's own reads to the primary or a replica known to be caught up), **sticky sessions** to one replica for monotonic reads, and bounded-staleness reads. When correctness truly requires it, use **synchronous / quorum** replication for those operations — at a latency cost, exactly the PACELC trade.",
  },
  // ---- ch.31 · Cryptography ----
  {
    id: "iv-ch31-1",
    chapterId: "ch31",
    level: "mid",
    q: "Explain Diffie–Hellman key exchange, and what an eavesdropper who records the entire exchange still can't do.",
    a:
      "Both parties agree on a public prime `p` and generator `g`. Each picks a private secret (`a`, `b`), sends `gᵃ mod p` and `gᵇ mod p`, then raises the other's value to their own secret: Alice computes `(gᵇ)ᵃ`, Bob `(gᵃ)ᵇ` — both equal `g^(ab) mod p`, the **shared secret**. An eavesdropper sees `p`, `g`, `gᵃ`, `gᵇ` but to get `g^(ab)` must recover `a` or `b` — the **discrete-logarithm problem**, with no known efficient classical algorithm. The staff-level add: use **ephemeral** DH (new secrets per session) for **forward secrecy**, and remember DH gives you a shared secret but **not authentication** — unauthenticated DH is wide open to a man-in-the-middle, which is why TLS pairs it with a certificate signature.",
  },
  {
    id: "iv-ch31-2",
    chapterId: "ch31",
    level: "mid",
    q: "What properties define a cryptographic hash, and why is SHA-256 unsuitable for storing passwords?",
    a:
      "A cryptographic hash is **deterministic**, **one-way** (infeasible to invert), **collision-resistant** (infeasible to find two inputs with the same digest), and exhibits the **avalanche effect** (a one-bit input change flips ~half the output bits). Those make it ideal for integrity, commitments, and content addressing. But for **passwords** its greatest strength — **speed** — is the flaw: a GPU computes billions of SHA-256/sec, so a stolen hash database is brute-forced fast, and without a salt one precomputed table cracks everyone. Store passwords with a **slow, salted, memory-hard** function: **Argon2id** (current OWASP default), bcrypt, or scrypt, tuned so each guess is expensive.",
  },
  {
    id: "iv-ch31-3",
    chapterId: "ch31",
    level: "senior",
    q: "Walk through a TLS 1.3 handshake and name the cryptographic primitive behind each step.",
    a:
      "Client and server exchange **key_share** values — an **ephemeral Diffie–Hellman** (ECDHE) agreement that yields a shared secret (**key agreement**, and forward secrecy because the keys are per-session). The server sends its **certificate** and a **CertificateVerify** signature over the transcript — a **public-key signature** (RSA/ECDSA) proving identity (**authentication**). Both sides run the DH secret through **HKDF**, a hash-based **key-derivation** function, to produce traffic keys. A **Finished** message carries an HMAC over the transcript (**integrity**). Then application data flows under an **AEAD** symmetric cipher — AES-GCM or ChaCha20-Poly1305 (**confidentiality + integrity**, fast bulk encryption). The point: TLS is every primitive in the chapter assembled, and 1.3 cut it to **one round trip** and made forward secrecy mandatory by removing static-RSA key transport.",
  },
  {
    id: "iv-ch31-4",
    chapterId: "ch31",
    level: "senior",
    q: "What is forward secrecy, why does it matter, and how does TLS 1.3 provide it?",
    a:
      "**Forward secrecy** means compromising a server's long-term private key **cannot** decrypt past recorded sessions. Without it, an attacker who records ciphertext today and steals the RSA key next year decrypts everything retroactively (the 'harvest now, decrypt later' threat — acute with quantum on the horizon). TLS 1.3 provides it by making key agreement **ephemeral**: each session uses fresh, single-use Diffie–Hellman keys (ECDHE) that are discarded afterward, so there's no long-term secret whose theft unlocks history. TLS 1.3 removed the old static-RSA key-transport mode precisely because it lacked forward secrecy.",
  },
  {
    id: "iv-ch31-5",
    chapterId: "ch31",
    level: "staff",
    q: "Why does quantum computing threaten RSA and ECC but not (much) AES or SHA-256, and what's the response?",
    a:
      "**Shor's algorithm** on a large fault-tolerant quantum computer solves **integer factoring** and **discrete log** in polynomial time — which breaks **RSA, Diffie–Hellman, and ECC**, since their hardness *is* those problems. Symmetric primitives face only **Grover's algorithm**, a quadratic speedup that effectively halves the security level: AES-256 → ~128-bit security, SHA-256 → ~128-bit collision resistance, both still safe (and cheaply doubled by using larger sizes). The response is **post-quantum cryptography** built on problems quantum computers don't obviously crack (lattices, hashes): **NIST finalized FIPS 203 (ML-KEM/Kyber)** for key establishment and **FIPS 204/205** for signatures in **August 2024**, and industry is deploying **hybrid** classical+PQC key exchange now, with migration guidance targeting ~2030.",
  },
  // ---- ch.32 · Security ----
  {
    id: "iv-ch32-1",
    chapterId: "ch32",
    level: "mid",
    q: "SQL injection and XSS are often called the same bug. What is the shared root cause, and the correct fix for each?",
    a:
      "Both are **injection**: untrusted **data** is interpreted as **code** because it's concatenated into a code context. In **SQLi** the context is a SQL query; in **XSS** it's an HTML page. The fixes share a shape — keep input as data. For SQLi: **parameterized queries / prepared statements**, so values ride a separate channel and can never become SQL syntax (not hand-escaping). For XSS: **contextual output encoding** (HTML-encode so `<script>` renders as text) and safe sinks (`textContent`, a templating engine that auto-escapes), plus a **Content-Security-Policy** as defense in depth. Validating input helps, but the structural fix is separating data from code at the sink.",
  },
  {
    id: "iv-ch32-2",
    chapterId: "ch32",
    level: "mid",
    q: "Distinguish authentication from authorization, and describe a common way authorization fails.",
    a:
      "**Authentication** establishes **who** you are (login, tokens, MFA); **authorization** decides **what** you're allowed to do with a given resource. They're independent, and conflating them is dangerous. The classic failure is **Insecure Direct Object Reference / broken access control**: a route authenticates the user but then trusts a user-supplied identifier — `GET /invoice/1043` — without checking the invoice **belongs** to that user, so changing the id reads someone else's data. **Broken Access Control is #1 on the OWASP Top 10:2025.** Fix: enforce authorization **server-side, per request, against the actual resource and the caller's rights**, defaulting to deny.",
  },
  {
    id: "iv-ch32-3",
    chapterId: "ch32",
    level: "senior",
    q: "What is defense in depth, and why isn't strong cryptography sufficient on its own?",
    a:
      "**Defense in depth** layers independent controls so no single failure is a breach: validate at the edge, parameterize at the database, encode at output, least-privilege every component, **fail secure**, encrypt in transit and at rest, authenticate then authorize each request, log/monitor, and patch. Cryptography secures **one** concern (data in transit/at rest) but the attacker targets the weakest link, which is usually elsewhere — a memory-safety bug, a vulnerable dependency, a misconfiguration, or a phished credential. The strongest cipher sits behind a login form and an app full of business logic; if any layer around it fails open, the crypto is irrelevant. Security is a **system property**, not a feature you bolt on.",
  },
  {
    id: "iv-ch32-4",
    chapterId: "ch32",
    level: "senior",
    q: "Why are memory-safety bugs such a large share of severe vulnerabilities, and what mitigates them?",
    a:
      "In C/C++ the programmer manually manages memory and bounds, so a **buffer overflow**, use-after-free, or out-of-bounds write lets attacker-controlled input corrupt adjacent memory — including return addresses and function pointers — enabling code execution (the Morris Worm, Heartbleed, countless CVEs). Microsoft and Google have each reported **~70% of their severe vulnerabilities** are memory-safety issues. Mitigations layer up: **memory-safe languages** (Rust, or managed runtimes) that eliminate the class structurally; compiler/OS defenses (**ASLR, stack canaries, DEP/NX, CFI**) that raise the cost; and fuzzing/sanitizers to catch bugs early. CISA and others now push memory-safe languages for **new** code precisely because mitigations only reduce, not remove, the class.",
  },
  {
    id: "iv-ch32-5",
    chapterId: "ch32",
    level: "staff",
    q: "How would you threat-model a new web service, and what does 'assume breach' change about the design?",
    a:
      "Start structured: enumerate **assets** (data, funds, access), map the **attack surface** (every input, endpoint, dependency, trust boundary), then walk threats with a framework like **STRIDE** (Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege) per asset, and prioritize by likelihood × impact. Drive fixes structurally (parameterization, output encoding, authN/authZ, secrets management, dependency hygiene) rather than patching known payloads. **Assume breach** flips the posture from 'keep attackers out' to 'contain them when they're in': **least privilege** and **zero trust** (verify every request, even internal), network segmentation to limit **blast radius**, short-lived credentials, thorough **logging/alerting** (an OWASP 2025 category) for detection and response, and secure-by-default design so a single compromised component can't pivot to everything.",
  },
  // ================= ch33 · Machine learning =================
  {
    id: "iv-ch33-1",
    chapterId: "ch33",
    level: "mid",
    q: "What is overfitting, and how do you detect and reduce it?",
    a:
      "**Overfitting** is when a model fits the training data too closely — including its noise — so it scores well on data it has seen and poorly on new data. **Detect** it by the gap between training and held-out **test/validation** accuracy: training keeps improving while validation stalls or degrades. **Reduce** it with (in rough order of power) **more/better data** and augmentation, **regularization** (L2 weight decay, dropout), **early stopping**, a **simpler model** (less capacity), and cross-validation. The underlying frame is the **bias–variance trade-off**: overfitting is high variance, underfitting is high bias.",
  },
  {
    id: "iv-ch33-2",
    chapterId: "ch33",
    level: "mid",
    q: "Why does a single-layer perceptron fail on XOR, and what fixes it?",
    a:
      "A single linear unit can only draw a **linear decision boundary** (a hyperplane), and XOR's two classes are **not linearly separable** — no straight line separates {(0,1),(1,0)} from {(0,0),(1,1)}. This is exactly the Minsky–Papert result that stalled early neural nets. The fix is a **hidden layer with a non-linear activation** (tanh/ReLU): the hidden units warp the input space so the output can separate it with a plane. That's the whole point of depth + non-linearity — and why the neural-playground can solve XOR and the spiral while one neuron can't.",
  },
  {
    id: "iv-ch33-3",
    chapterId: "ch33",
    level: "senior",
    q: "Walk through gradient descent. How does the learning rate affect convergence?",
    a:
      "Gradient descent minimizes a loss by repeatedly stepping parameters opposite the gradient: θ ← θ − η·∇L. The **learning rate** η is the step size. **Too small**: convergence is slow and can stall in flat regions. **Too large**: you overshoot the minimum — the loss oscillates or diverges to NaN. On a quadratic bowl of curvature κ, steps are stable only while η < 2/κ, which is why ill-conditioned surfaces (very different curvature per direction) are hard and motivate **normalization**, **momentum/Adam** (adaptive per-parameter rates), and **learning-rate schedules** (warmup then decay). Practically: watch the loss curve — smooth decline is right, jagged or rising means lower η. Also note **batch size** interacts with η and gradient noise.",
  },
  {
    id: "iv-ch33-4",
    chapterId: "ch33",
    level: "senior",
    q: "What is backpropagation, really — and why is it efficient?",
    a:
      "Backpropagation is **reverse-mode automatic differentiation** applied to a neural network: it computes the gradient of the loss with respect to *every* parameter by applying the **chain rule** backward through the computation graph. A single **forward pass** caches each layer's activations; a single **backward pass** propagates the error signal from the loss back to each weight, reusing the downstream gradients so each parameter's derivative costs roughly the same as the forward computation — **O(number of parameters)**, not O(params²) as naive per-weight finite differences would. That efficiency (one forward + one backward pass gives *all* gradients) is what makes training networks with millions of weights feasible. Watch for **vanishing/exploding gradients** in deep stacks, mitigated by ReLU, residual connections, and careful initialization.",
  },
  {
    id: "iv-ch33-5",
    chapterId: "ch33",
    level: "staff",
    q: "A model scores 99% offline but performs poorly in production. How do you diagnose it?",
    a:
      "Systematically rule out the usual gaps between offline and online. **Data leakage**: a feature encodes the label or uses information unavailable at prediction time (or preprocessing statistics were computed before the split) — the classic cause of 'too good' offline scores. **Distribution shift**: production inputs differ from the training/test distribution (covariate shift), or labels drift over time. **Train/serve skew**: feature computation differs between training and serving. **Evaluation flaws**: test set contaminated by training data, wrong metric (accuracy on an imbalanced problem), or tuning that overfit the test set. **Feedback loops**: the model's own actions change the data. Diagnose by auditing the feature pipeline for leakage, comparing offline vs online feature/label distributions, checking the split methodology (time-based for temporal data), and shadow-deploying with live metrics before trusting offline numbers.",
  },
  // ================= ch34 · Modern AI & frontiers =================
  {
    id: "iv-ch34-1",
    chapterId: "ch34",
    level: "mid",
    q: "What are word embeddings, and what does king − man + woman ≈ queen show?",
    a:
      "**Embeddings** map tokens/words to dense vectors in a continuous space, learned so that words appearing in similar contexts (the **distributional hypothesis**) end up near each other. Because relationships are captured as consistent **directions**, you can do vector arithmetic on meaning: the 'gender' direction (man→woman) is roughly parallel to (king→queen), so **king − man + woman** lands near **queen**. It shows embeddings encode **semantic structure geometrically**, not just similarity — which is why they became the input layer of modern NLP. Caveat: classic word2vec/GloVe give one **static** vector per word (no sense disambiguation); transformers produce **contextual** embeddings that fix this.",
  },
  {
    id: "iv-ch34-2",
    chapterId: "ch34",
    level: "mid",
    q: "Why do LLMs struggle to count letters or do exact arithmetic?",
    a:
      "Because they operate on **tokens**, not characters or digits. A **BPE** tokenizer splits text into subword chunks, so a word like *strawberry* becomes a few opaque tokens and the model literally never sees the individual letters — counting them is off-distribution. Same for arithmetic: numbers get chunked into arbitrary token pieces, so there's no clean place-value representation to 'carry the one.' It's a **representation limit**, not a general reasoning failure. Practical fix: give the model **tools** (a code interpreter/calculator) for exact symbolic work and let it orchestrate, rather than expecting a token predictor to act like an ALU.",
  },
  {
    id: "iv-ch34-3",
    chapterId: "ch34",
    level: "senior",
    q: "Explain self-attention. Why did transformers replace RNNs?",
    a:
      "**Self-attention** lets each token build a **query**, match it against every token's **key** to get scores, softmax those into weights, and take a weighted sum of the **values**: softmax(Q·Kᵀ/√dₖ)·V. So every position can directly pull information from any other, regardless of distance. Transformers replaced **RNNs** because RNNs process sequentially (hard to parallelize) and struggle to carry information across long distances (vanishing gradients, a fixed-size hidden state bottleneck). Attention is **fully parallel** across positions (great for GPUs) and gives **O(1) path length** between any two tokens, so long-range dependencies are learned far better. The trade-off is **O(n²)** attention cost in sequence length — the motivation behind long-context and efficient-attention research. **Multi-head** attention lets different heads specialize (syntax, coreference, etc.).",
  },
  {
    id: "iv-ch34-4",
    chapterId: "ch34",
    level: "senior",
    q: "What are scaling laws, and what did Chinchilla change?",
    a:
      "**Scaling laws** (Kaplan et al., 2020) found that a model's test loss decreases as a smooth **power law** in three inputs — parameters, dataset size, and compute — which means you can **extrapolate** capability before training a big model. **Chinchilla** (Hoffmann et al., 2022) corrected the recipe: for a fixed **compute budget** there's an optimal balance, and most large models of the era were **undertrained** — too many parameters for too few tokens. Their 70B-parameter Chinchilla trained on 1.4T tokens **beat** the 280B Gopher trained on ~300B tokens at equal compute. The practical rule: scale **parameters and training tokens together** (roughly proportionally). It shifted the field from 'biggest model wins' to 'best use of compute,' and reframed data quantity/quality as first-class.",
  },
  {
    id: "iv-ch34-5",
    chapterId: "ch34",
    level: "staff",
    q: "What is RLHF, why is alignment hard, and what are an LLM's fundamental limits?",
    a:
      "**RLHF** (reinforcement learning from human feedback) aligns a pretrained model to human preferences: collect human rankings of outputs, train a **reward model** to predict them, then fine-tune the LLM (e.g. with PPO, or newer preference-optimization methods) to maximize that reward — turning a raw next-token predictor into an instruction-following assistant (InstructGPT, 2022). **Alignment is hard** because human values are hard to specify completely, reward models are **proxies** that can be gamed (reward hacking / Goodhart), feedback doesn't cover every situation, and we lack strong **interpretability** to verify *why* a model behaves as it does. **Fundamental limits**: an LLM has no built-in notion of **truth** (it optimizes plausibility, hence hallucination), no guarantee of consistency, tokenization blind spots, and — the link to computability (ch.20) — no escape from what's **uncomputable**: no scale lets it decide the halting problem. The honest framing is a powerful, fallible pattern machine, not an oracle — use it with verification and tooling.",
  },
  // ===================== P0 · Orientation (ch.0a) =====================
  {
    id: "iv-ch0a-1",
    chapterId: "ch0a",
    level: "mid",
    q: "Is computer science the same as programming? How would you explain the difference?",
    a:
      "No — programming is a **tool** used in CS, the way arithmetic is a tool used in physics. **Computer science** is the study of *computation, information, and abstraction*: what can be computed at all, how to represent and transform information, what a solution costs in time and space, and how to build reliable systems by layering abstractions. Its objects — an algorithm, a complexity bound, a proof of undecidability, a protocol — are independent of any language or machine and outlive both.\n" +
      "A useful tell: you can be a fluent programmer with shallow CS (you ship features but can't say why the app is slow) or a strong computer scientist who writes little code (you design the algorithm someone else implements). The two overlap heavily in practice, but conflating them is why people think 'learn CS' means 'learn Python' — it doesn't.",
  },
  {
    id: "iv-ch0a-2",
    chapterId: "ch0a",
    level: "senior",
    q: "What does it mean to call computer science 'a stack of abstractions,' and why does that framing matter when you debug?",
    a:
      "Every layer of computing is a **machine built to be taken for granted by the layer above**: transistors hide physics, gates hide transistors, a CPU hides gates, a language hides the CPU, an algorithm hides the language, an OS/network/database/model each hides everything beneath. Each abstraction exposes a simple interface and hides a complex implementation — that's what lets a web developer ignore cache-coherency protocols.\n" +
      "Why it matters for debugging: abstractions **leak** (Spolsky's law). A symptom at your layer often has its cause one or more layers *down* — a slow query is really a missing index; a flaky request is really packet loss; a memory 'leak' is really a retained reference the GC can't free. The senior skill is knowing the stack well enough to **descend to the right floor** instead of thrashing at the top. You don't need to work at every layer daily; you need to know they exist and how to drop into one on demand.",
  },
  {
    id: "iv-ch0a-3",
    chapterId: "ch0a",
    level: "mid",
    q: "Name the major areas of computer science, and give one idea that connects two of them.",
    a:
      "A reasonable decomposition (this guide's): **information/representation, hardware/architecture, programming/languages, algorithms & data structures, theory of computation, operating systems, networks, data/databases, security, and AI/ML.** They aren't silos — they're lenses on the same questions, wired by crossing ideas.\n" +
      "Examples of a connecting idea: **hashing** links algorithms (hash tables), databases (hash indexes/joins), and security (cryptographic hashes) — with the *birthday paradox* explaining collisions in all three. **Automata** link theory to compilers (lexing/parsing) and networking (protocol state machines). **Optimization/gradient descent** links algorithms to machine learning. Interviewers like this question because naming the areas is easy; showing you see the *edges* between them signals real understanding.",
  },
  {
    id: "iv-ch0a-4",
    chapterId: "ch0a",
    level: "senior",
    q: "A teammate says: 'Frameworks change every two years — why invest in CS fundamentals at all?' What's your answer?",
    a:
      "Because fundamentals are what frameworks are **made of**, and they change on decade scales, not release cycles. Every framework is a rearrangement of the same core ideas — caching, queues, state machines, hashing, trees, concurrency, complexity — so knowing the ideas turns 'new framework' from a foreign language into a **new dialect**: the learning cost collapses. And when the abstraction **leaks** (a performance cliff, a deadlock, an encoding bug), the fix lives one layer *below* the framework — precisely where only fundamentals help. You reach for them on the hardest 5% of days, and those are the expensive days.\n" +
      "The honest counterpoint: fundamentals **without** product/tooling fluency is also incomplete — you ship with both. The asymmetry is in depreciation: framework specifics **depreciate** with every major version; fundamentals **compound**, because they transfer to every stack you'll ever touch. That's the investment argument in one line: learn the things that are still true in ten years, rent the rest.",
  },
  {
    id: "iv-ch0a-5",
    chapterId: "ch0a",
    level: "staff",
    q: "Design a study path through computer science for a strong self-taught engineer with gaps. What order, and what do you cut first?",
    a:
      "Three principles. (1) **Follow dependency, not prestige**: representation first (bits, encodings), then one honest mental model of the machine (CPU, memory hierarchy), because everything above assumes them. A defensible spine: information → machine → programs & languages → algorithms + data structures (the longest stay) → theory where it starts paying → OS → networks → data → security → AI. (2) **Alternate theory with a touchable artifact per unit** — build a tiny interpreter, race two sorts, break a toy cipher; retention comes from *prediction and feedback*, not reading. (3) **Spaced review of the core models** beats cramming — a mental model you can redraw in a month is worth ten you recognized once.\n" +
      "Cut first: hardware minutiae below the gate level, exotic data structures, language-of-the-year trivia. Never cut: complexity reasoning, the memory hierarchy, concurrency hazards, hashing. The staff-level point: the **map** matters more than completeness — knowing *where* a topic lives and what its interfaces guarantee lets you learn the interior just-in-time. (That's the design brief of this very chapter.)",
  },
  // ===================== P0 · Math toolkit (ch.0b) =====================
  {
    id: "iv-ch0b-1",
    chapterId: "ch0b",
    level: "mid",
    q: "Permutations vs combinations: when do you use each? Count the number of 5-card poker hands from a 52-card deck.",
    a:
      "Ask one question: **does order matter?** If yes (a race podium, a PIN, an arrangement) it's a **permutation** P(n,r) = n!/(n−r)!. If no (a committee, a hand of cards, a subset) it's a **combination** C(n,r) = n!/(r!(n−r)!). The combination divides out the r! orderings the permutation counts as distinct.\n" +
      "A poker hand is unordered — you hold the same hand however the cards are dealt — so it's **C(52,5) = 52!/(5!·47!) = 2,598,960**. If you (wrongly) used P(52,5) you'd get 311,875,200, exactly 5! = 120 times too big, because you'd count every hand once per shuffle order.",
  },
  {
    id: "iv-ch0b-2",
    chapterId: "ch0b",
    level: "senior",
    q: "Explain the birthday paradox — why 23? — and name two places it shows up in computer science.",
    a:
      "With 23 people the probability that **some** pair shares a birthday exceeds 50%, which feels impossible until you count **pairs**, not people: 23 people form C(23,2) = 253 pairs, and each pair collides with probability 1/365. Formally, P(share) = 1 − (365/365)(364/365)…(343/365) ≈ 0.507. The count of pairs grows as ~n²/2, so the crossover happens around n ≈ 1.18·√days — far sooner than the ~183 intuition suggests.\n" +
      "In CS it shows up as: (1) **hash-table collisions** — with a table of m slots you expect a collision after only ~√m insertions, which is why good hashing and load-factor management matter (ch.14); and (2) the **birthday attack** on cryptographic hashes — finding *any* two colliding inputs takes ~2^(n/2) work, not 2^n, so a 256-bit hash offers only ~128 bits of *collision* resistance (ch.31). Same √ law, two very different stakes.",
  },
  {
    id: "iv-ch0b-3",
    chapterId: "ch0b",
    level: "senior",
    q: "Given p → q, define its converse, inverse, and contrapositive. Which are equivalent, and what bug comes from confusing them?",
    a:
      "For **p → q**: the **converse** is q → p, the **inverse** is ¬p → ¬q, and the **contrapositive** is ¬q → ¬p. The original is logically equivalent to its **contrapositive** only; the converse and inverse are equivalent to *each other* but **not** to the original. (Converse and inverse are contrapositives of each other.)\n" +
      "The classic bug is **affirming the consequent** — treating q → p as if it followed from p → q. In code: 'a valid token implies the request is authenticated' does **not** mean 'authenticated implies the token is valid,' and reasoning as if it did produces broken auth logic. The safe rewrite is always the contrapositive: 'if the request isn't authenticated, the token isn't valid' — same truth value, and often easier to check.",
  },
  {
    id: "iv-ch0b-4",
    chapterId: "ch0b",
    level: "senior",
    q: "Prove by induction that 1 + 2 + … + n = n(n+1)/2. Where does this sum show up in algorithm analysis?",
    a:
      "**Claim:** for all n ≥ 0, ∑ᵢ₌₀ⁿ i = n(n+1)/2.\n" +
      "**Base (n = 0):** the empty/zero sum is 0, and 0·1/2 = 0. ✓\n" +
      "**Step:** assume ∑ᵢ₌₀ᵏ i = k(k+1)/2 (the induction hypothesis). Then ∑ᵢ₌₀ᵏ⁺¹ i = k(k+1)/2 + (k+1) = (k+1)(k+2)/2, which is the formula at n = k+1. ✓ By induction it holds for all n.\n" +
      "It's everywhere in analysis because **nested loops that shrink** sum this way: the inner work 1+2+…+n in selection sort, insertion sort, or the naive 'compare every pair' is n(n+1)/2 ≈ n²/2 = **Θ(n²)**. Recognizing the triangular sum is how you turn a double loop into a Big-O bound on sight.",
  },
  {
    id: "iv-ch0b-5",
    chapterId: "ch0b",
    level: "staff",
    q: "What is linearity of expectation, and why is it such a powerful tool? Use it to find the expected number of collisions when hashing.",
    a:
      "**Linearity of expectation:** E[X + Y] = E[X] + E[Y] for *any* random variables, **even when they're dependent**. That independence-free property is what makes it so powerful — you decompose a messy count into indicator variables, take each tiny expectation, and just add, never touching the joint distribution.\n" +
      "**Hashing example:** throw n keys into m buckets uniformly. Let X be the number of colliding pairs. For each of the C(n,2) pairs, define an indicator Iₚ = 1 if that pair lands in the same bucket; E[Iₚ] = 1/m. Then E[X] = ∑ E[Iₚ] = C(n,2)/m = n(n−1)/(2m). Setting E[X] ≈ 1 gives n ≈ √(2m) — the birthday bound again. The same indicator-and-add trick gives the expected length of a hash chain (n/m, the load factor) and underpins why hash operations are **O(1) expected**, and it's how you analyze randomized algorithms like QuickSort's expected comparisons without wrestling a single joint distribution.",
  },
  // ===================== P11 · Capstone (ch.35) =====================
  {
    id: "iv-ch35-1",
    chapterId: "ch35",
    level: "senior",
    q: "Walk me through what happens, across the whole stack, when you press a key in a chat app and it appears on a friend's screen.",
    a:
      "This is the guide's grand traversal, and the strong answer names the **layer** at each step, not just the mechanism:\n" +
      "1. **Encoding (P1):** the key matrix produces a scancode; software maps it to a Unicode code point — the letter is now bits.\n" +
      "2. **Hardware (P2):** those bits are voltages settling through logic gates in the keyboard controller.\n" +
      "3. **CPU (P2):** a hardware interrupt; the CPU fetch-decode-executes the handler.\n" +
      "4. **OS (P6):** the kernel fields the interrupt, schedules your process, and delivers the event via a syscall; virtual memory maps the buffer.\n" +
      "5. **Code (P3):** your event handler runs — compiled from a language to bytecode/machine code, a frame on the call stack.\n" +
      "6. **Data structures (P4):** the character enters a text buffer and an event queue.\n" +
      "7. **Networks (P7):** on send, it's framed into packets and routed hop-by-hop to the server (after DNS, TCP).\n" +
      "8. **Security (P9):** TLS (via a key exchange) encrypts and authenticates it in flight.\n" +
      "9. **Data (P8):** the server persists it — a B-tree index, a durable transaction, replication.\n" +
      "10. **Intelligence (P10), optional:** a model may autocomplete or moderate it.\n" +
      "11. **Output (P2/GPU):** on your friend's device the reply is rasterized — triangles to fragments to lit pixels — and a photon reaches their eye.\n" +
      "The point interviewers listen for is that it's **one causal chain through every layer**, and that you can go deeper on *any* rung on request (how TCP recovers a lost packet, how the scheduler picks the process, how TLS derives keys).",
  },
  {
    id: "iv-ch35-2",
    chapterId: "ch35",
    level: "senior",
    q: "What is the 'law of leaky abstractions,' and how does it change the way you debug a hard problem?",
    a:
      "Joel Spolsky's law: **all non-trivial abstractions are, to some degree, leaky** — the simplifying interface eventually exposes the complexity it was meant to hide. TCP presents a reliable byte stream, but underlying packet loss leaks through as latency spikes. An ORM hides SQL until an N+1 query pattern tanks performance. Virtual memory hides the disk until a page fault stalls you for milliseconds. `a[i]` looks O(1) until a cache miss makes one access 100× another.\n" +
      "It changes debugging in two ways. First, **the cause usually lives one layer below the symptom**, so you develop the habit of descending — profile the query behind the slow endpoint, packet-capture behind the flaky request, check GC behind the 'memory leak.' Second, it argues for **learning down the stack proactively**: you can't descend into a layer you don't understand at all. You don't need daily expertise everywhere, but you need enough of each floor to recognize its fingerprints when it leaks.",
  },
  {
    id: "iv-ch35-3",
    chapterId: "ch35",
    level: "staff",
    q: "Where do quantum computers actually help, what's the rough state as of 2026, and what should a security team do about it now?",
    a:
      "**Where they help:** only a *narrow* set of structured problems — **Shor's algorithm** factors integers and computes discrete logs in polynomial time (breaking RSA/ECC); **Grover's** gives a quadratic (not exponential) speed-up for unstructured search; and **quantum simulation** helps with chemistry and materials. For the overwhelming majority of computing they offer no advantage, and even at scale they'll be a *coprocessor* called from a classical machine, not a replacement.\n" +
      "**State ~2026 (a dated snapshot):** the milestone of the last two years is **below-threshold error correction** — Google's Willow showed that adding physical qubits to a surface code *lowers* the logical error rate — and several groups now run **dozens of logical qubits**. But a machine that can run Shor against real 2048-bit RSA needs on the order of a **million** physical qubits (Google's Gidney cut the estimate from ~20 million in 2019 to under a million by 2025) — still orders of magnitude beyond today's dozens of logical qubits; roadmaps target fault tolerance around **2029–2030** and useful cryptographic threats later. It's an engineering problem now, not just physics — but not an operational threat yet.\n" +
      "**What a security team does now:** treat **'harvest now, decrypt later'** as real — adversaries can record encrypted traffic today and decrypt it once a quantum computer exists. So begin migrating to **NIST post-quantum algorithms** (ML-KEM/Kyber for key exchange, ML-DSA/Dilithium for signatures), prioritize long-lived secrets, and adopt **crypto-agility** so algorithms can be swapped without re-architecting. Grover just means doubling symmetric key sizes (AES-256) — the real pressure is on public-key crypto.",
  },
  {
    id: "iv-ch35-4",
    chapterId: "ch35",
    level: "staff",
    q: "How do you decide how deep into the stack you need to understand a given problem?",
    a:
      "Depth is a **cost/benefit** call, not a badge. My heuristics: (1) **Go as deep as the leak.** Debug at the layer where the symptom's *cause* lives — usually one below where it appears — and stop once you can explain and fix it. (2) **Match depth to leverage and blast radius.** A hot path, a security boundary, or a decision that's expensive to reverse justifies going down to cache lines or protocol details; a one-off script does not. (3) **Know the interfaces everywhere, the internals where it pays.** You should always understand the *contract* of each adjacent layer (what it guarantees, what it costs) even if you rarely open the implementation. (4) **Let recurring pain pull you down.** If the same class of bug keeps biting, that's the signal to invest in the layer beneath it.\n" +
      "The failure modes are symmetric: too shallow and you cargo-cult fixes and get surprised by leaks; too deep and you rebuild the world to change a button. The whole-stack literacy this guide builds is precisely what lets you make that call quickly — you know what's *down there*, so you can choose when it's worth the trip.",
  },
  {
    id: "iv-ch35-5",
    chapterId: "ch35",
    level: "mid",
    q: "'It's all just bits' — make that concrete: give three cases where identical bytes mean different things, and name what assigns the meaning.",
    a:
      "(1) The four bytes `41 42 43 44` are the text **\"ABCD\"** (ASCII), the 32-bit integer **1,094,861,636** (big-endian; a different number little-endian), an unremarkable float, — and in 32-bit x86, four valid **instructions** (`inc ecx/edx/ebx/esp`). Same bits; the *type* and the *decoder* differ. (2) A PNG 'is' a picture only while something honors the PNG format — rename it `.zip` and the bytes didn't change, the **interpreter** you summon did. (3) Ciphertext vs plaintext: with the key, bytes are your message; without it, indistinguishable from noise — meaning lives in **bits + key**, not the bits alone.\n" +
      "What assigns meaning every time: the **interpreter** — a type system, a file format, a character encoding, an ISA's fetch unit. That last one is von Neumann's punchline: code and data share one memory, and 'is this bytes or a program?' is decided by nothing but *what the CPU is pointed at* — which is simultaneously how JITs work and how code-injection attacks work. The whole guide is this answer stretched over 35 chapters: from ch.1's 'one row of switches, three readings' to a model whose weights are, of course, just bits.",
  },
];

export function interviewById(id: string): InterviewQ | undefined {
  return INTERVIEW.find((q) => q.id === id);
}
export function interviewOfChapter(chapterId: string): InterviewQ[] {
  return INTERVIEW.filter((q) => q.chapterId === chapterId);
}
