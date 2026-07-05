# INTERACTIVES.md — The Touchable Inventory (binding contract)

> Companion to `CLAUDE.md` §5/§6. **Every core entity must be touchable.** This file names
> every interactive in the guide; authoring sessions implement from here (keys = registry
> keys). Adding/renaming interactives happens **here first**, then in code.
> Escape hatch: where an interactive adds no real insight, a steppable figure + table is
> the floor — decoration for its own sake is banned.

**Types**
- `[HERO]` — flagship simulator/emulator; play/pause/step/speed/reset; the chapter is built around it
- `[micro]` — focused single-idea sim; 1–3 controls; embeds inline
- `[fig]` — steppable animated SVG figure (prev/next/auto; never a GIF in-app)
- `[quiz]` — predict-the-behavior widget (every chapter has ≥1; only *custom* ones listed)
- `[boss]` — part capstone challenge, hosted inside the named hero
- 🔊 — optional sound; ⚠ — heavy build cost, plan session time

---

## P0 · Orientation

### 0a — The Map
- [HERO] `stack-map` — the landing itself: 11-part glowing stack, hover-expand to chapters, progress rings, boss badges; click = navigate
- [fig] `discipline-map` — pan/zoom mind-map of the whole CS discipline (what's in/out of this guide)

### 0b — Math toolkit *(optional on-ramp)*
- [micro] `truth-table-builder` — toggle P/Q inputs, ops (∧∨¬→↔), table fills live
- [micro] `combinatorics-counter` — n/k sliders on a visual grid: permutations vs combinations counts animate
- [micro] `birthday-lab` — n-people slider; run 1000 simulated rooms; collision % converges on the curve
- [micro] `dice-lln` — roll dice ×N; watch the mean converge (law of large numbers)
- [fig] `induction-dominoes` — base case + step = infinite fall, stepped
- [fig] `graph-notation` — same graph: drawing ↔ V/E sets ↔ degree table

## P1 · Information

### ch.1 — Bits & numbers
- [HERO] `bit-inspector` — two lanes. **Int lane:** 8/16/32-bit, signed/unsigned toggle, click bits, decimal/hex live, `MAX+1` overflow wraparound animated, two's-complement mirror view. **Float lane:** IEEE-754 sign/exp/mantissa fields colored, type any decimal → see stored approximation, `0.1+0.2` demo, precision-gap explorer
- [micro] `base-converter` — positional weights light up as you type (bin/dec/hex)
- [fig] `float-number-line` — representable floats on a zoomable line; gaps widen visibly
- [quiz] `overflow-predict` — predict results of int arithmetic at the edge

### ch.2 — Encoding the world
- [micro] `utf8-encoder` — type text (incl. emoji) → code points → bytes; continuation bits highlighted; byte-count vs char-count trap
- [micro] `pixel-zoom` — zoom into an image until pixels → RGB numbers; channel sliders recolor live
- [micro] `sampling-toy` — sine wave, sample-rate + bit-depth sliders; see (🔊 hear) aliasing kick in
- [fig] `unicode-planes` — the code-space map, stepped from ASCII outward

### ch.3 — Compression & entropy
- [HERO] `huffman-lab` — type text → frequency bars → tree assembles animated → bitstream; live "× smaller than ASCII" meter
- [micro] `rle-visualizer` — runs collapse; adversarial input makes output *bigger* (teachable fail)
- [micro] `lz-window` — LZ77 sliding window; back-reference arrows as you step through text
- [fig] `entropy-meter` — predictable vs random text; bits/char gauge
- [quiz] `compress-predict` — which of two strings compresses better, and why
- [boss] `P1: decode the mystery file` (raw bytes → spot the encoding → decompress → read the message; uses ch.1–3 skills) — badge: *Bitreader*

## P2 · The Machine

### ch.4 — From electricity to gates **(GOLDEN)**
- [HERO] `logic-sandbox` — drag AND/OR/NOT/XOR/NAND onto canvas, wire outputs→inputs, toggle switches; signals propagate with pulse animation; truth table auto-derives for selected sub-circuit; challenge mode ("build XOR from NAND only")
- [fig] `transistor-switch` — stepper: gate voltage → channel opens → current flows → it's a switch
- [micro] `demorgan-flip` — one click morphs a circuit into its De Morgan equivalent; truth tables stay identical
- [quiz] `gate-predict` — given circuit + inputs, predict the output

### ch.5 — Circuits that count
- [micro] `build-an-adder` — guided: half-adder → full-adder → chain to 4-bit ripple; carry pulse travels; try 1111+0001
- [micro] `alu-visualizer` — op selector (ADD/SUB/AND/OR/CMP); inputs, result, Z/N/C/V flags light up
- [fig] `mux-router` — select lines steer one of N inputs through

### ch.6 — Circuits that remember
- [micro] `latch-playground` — SR latch feedback loop stepped signal-by-signal (the "aha": loops = memory); D flip-flop + clock edge
- [micro] `ram-grid` — type an address → decoder lights the cell; read/write bytes; address-bus width vs capacity
- [fig] `memory-hierarchy` — register→L1→L2→RAM→SSD as distances on a city map; latency = travel time animation

### ch.7 — The CPU
- [HERO] `cpu-8bit` ⚠ — full emulator: mini-assembler editor (LDA/STA/ADD/JMP/JZ…), assemble → RAM panel; run/step/speed; PC/IR/A/B/flags registers; each instruction animates fetch→decode→execute on the datapath; preset programs (add two numbers, count-down loop, multiply by addition, **Fibonacci = P2 boss**)
- [fig] `datapath` — the CPU block diagram; each stepper frame = one micro-step with active buses glowing
- [quiz] `register-predict` — given 4 instructions, predict final register state
- [boss] `P2: program Fibonacci on cpu-8bit` — badge: *Machine Whisperer*

### ch.8 — Fast CPUs
- [micro] `pipeline-visualizer` — 5-stage pipeline lanes; instructions flow; insert a data hazard or branch → stall bubble / flush animation; CPI counter
- [micro] `cache-sim` — 64-cell RAM + 8-line cache; access-pattern presets (sequential/strided/random); hit/miss lights, hit-rate %; cache-line size slider
- [fig] `branch-predictor` — taken/not-taken history stepper
- [quiz] `pattern-race` — which access pattern finishes first, and why

### ch.9 — GPUs & parallel hardware
- [micro] `rasterizer-toy` — drag triangle vertices; scanline fill animates pixel-by-pixel; wireframe/filled/depth toggle
- [micro] `cpu-vs-gpu-race` — sum 1M numbers: 1 fast lane vs 1000 slow lanes; total-time bars
- [fig] `gfx-pipeline` — vertices→raster→fragments→pixels, stepped
- [quiz] `gpu-predict` — CPU vs GPU on a given workload: which wins, and why (overhead, divergence, matmul)

## P3 · Code

### ch.10 — From machine code to languages
- [micro] `abstraction-elevator` — same program at 4 floors (machine code / asm / C / TS); hover a TS line → corresponding lines glow on every floor
- [micro] `call-stack-viz` — run recursive `fib(5)`; frames push/pop with args/locals/return values; depth slider → stack-overflow demo
- [fig] `paradigm-lens` — same problem, imperative vs OOP vs FP shape
- [quiz] `trace-recursion` — predict call order / return value

### ch.11 — Compilers & interpreters
- [HERO] `compiler-pipeline` ⚠ — type mini-language code; four live panes: token stream → AST (tree grows as you type) → bytecode listing → stack-VM execution (step); break the syntax → watch the parser complain precisely
- [fig] `jit-tiers` — interpreter → baseline → optimizing JIT → deopt, stepped
- [quiz] `find-parse-error` — spot why the AST broke
- [boss] `P3: make the pipeline run your program` (write a program using vars+loop that computes a target) — badge: *Language Smith*

### ch.12 — Software engineering *(lighter chapter)*
- [micro] `dependency-blast` — small module graph; break one module → blast-radius highlight; add an interface seam → radius shrinks
- [fig] `test-pyramid` — unit/integration/e2e cost-speed stepper

## P4 · Algorithms & Data Structures

### ch.13 — Big-O & algorithmic thinking
- [HERO] `growth-racer` — O(1)…O(n!) curves race on shared axes for your chosen n; attach to *real running code* (op counters instrument actual TS snippets); log-scale toggle
- [micro] `amortized-doubling` — dynamic array grows; per-op cost spikes at doublings; running-average line flattens
- [fig] `complexity-ladder` — the ranked ladder O(1)→O(n!), each rung revealed with a concrete cost at n (the picture to redraw from memory)
- [quiz] `match-the-O` — match 6 code snippets to their complexity

### ch.14 — Linear structures
- [micro] `array-vs-list-memory` — traverse both on the RAM grid from ch.6/8; contiguous strides vs pointer-chasing; cache-hit overlay (cross-link to `cache-sim`)
- [micro] `hash-collision-lab` — insert keys; hash-fn selector (bad vs good); chaining vs open addressing side-by-side; load-factor slider → watch clustering, trigger rehash
- [micro] `stack-queue-stepper` — push/pop/enqueue/dequeue with pointer arrows
- [fig] `hash-anatomy` — one lookup stepped: key → hash → index → bucket (chain walk vs linear probe)
- [fig] `memory-hierarchy` *(reused from ch.6)* — array locality vs pointer-chasing framed as travel time
- [quiz] `where-it-lands` — predict the bucket / the probe sequence

### ch.15 — Trees & heaps
- [micro] `bst-builder` — insert/search/delete animated; insert sorted input → degenerate list; one click: AVL rotations rebalance it (the "why balance" aha)
- [micro] `heap-ops` — insert/extract-min; bubble-up/down animated in both tree and array views simultaneously
- [micro] `trie-autocomplete` — type a prefix; path lights up; suggestions spill from the subtree
- [fig] `btree-teaser` — why disks like fat nodes (→ ch.29)

### ch.16 — Sorting & searching
- [HERO] `sorting-race` — bar-array visualizer; bubble/insertion/merge/quick/heap race side-by-side on the *same* data; presets: random / nearly-sorted / reversed / few-uniques; step mode with compare & swap counters; stability demo via colored duplicates
- [micro] `binary-search-stepper` — lo/mid/hi pointers walk; classic off-by-one traps flagged
- [quiz] `race-predict` — which algorithm wins on nearly-sorted data?

### ch.17 — Graphs
- [HERO] `pathfinder` — grid world: paint walls & weight terrain; run BFS/DFS/Dijkstra/A\* — frontier flood animated, visited count vs path cost; A\* heuristic-weight slider (greedy↔Dijkstra morph)
- [micro] `repr-switcher` — same graph as adjacency matrix ↔ list; "is u→v an edge?" vs "list neighbors" cost counters
- [micro] `topo-stepper` — dependency graph; peel zero-in-degree nodes; introduce a cycle → stuck (teachable fail)
- [fig] `mst-grow` — Kruskal vs Prim growing side by side
- [boss] `P4: beat the blind race` — on a revealed maze, pick algorithm + heuristic to hit the target visited-node budget — badge: *Pathmaster*

### ch.18 — Design paradigms
- [micro] `dp-table-filler` — LCS (or knapsack): recursion *tree* (exploding, duplicated subtrees highlighted) vs memo *table* filling cell-by-cell — side by side
- [micro] `nqueens-backtracker` — watch place→conflict→backtrack; tries counter; speed slider
- [micro] `greedy-fails` — coin systems where greedy wins vs loses; counterexample generator
- [quiz] `pick-the-paradigm` — 5 problems → which technique fits

## P5 · Theory

### ch.19 — Automata & regular languages
- [micro] `fsm-builder` — draw states/transitions, mark accepting; feed strings, watch the token walk; challenges ("accept binary numbers divisible by 3")
- [micro] `regex-nfa` — type a regex → NFA renders; test string lights the live paths (including parallel ones)
- [fig] `chomsky-rings` — regular ⊂ context-free ⊂ … nesting, stepped with example languages

### ch.20 — Computability
- [HERO] `turing-machine` — tape editor + rule table; run/step; presets: unary addition, palindrome checker, 3-state busy beaver (with step-count fireworks)
- [fig] `halting-paradox` — the diagonalization self-reference told as a 6-frame comic stepper
- [quiz] `does-it-halt` — programs you *can* and provably *can't* decide
- [boss] `P5: build a TM that accepts aⁿbⁿ` (rule table from scratch, test suite must pass) — badge: *Halting Oracle*

### ch.21 — Complexity
- [micro] `brute-force-death-watch` — subset-sum/TSP brute force; n slider; live time-at-10⁹-ops/s readout ("n=25 → 4 centuries")
- [micro] `tsp-playground` — drag cities; nearest-neighbor vs 2-opt vs brute force; tour-length scoreboard
- [fig] `pnp-map` — P / NP / NP-complete / NP-hard territory map, stepped
- [quiz] `np-or-not` — classify 5 problems

## P6 · Operating Systems

### ch.22 — Processes & scheduling
- [HERO] `scheduler-sim` — define processes (arrival/burst/priority); run FCFS/SJF/RR (quantum slider)/priority; live Gantt chart, per-process wait/turnaround stats; context-switch cost toggle shows overhead eating throughput
- [fig] `process-states` — new→ready→running→blocked→done state machine; transitions animate with causes
- [micro] `syscall-boundary` — user→kernel mode crossing stepper (what a "system call" physically is)

### ch.23 — Memory
- [micro] `address-translate` — virtual address → page-table walk → TLB hit/miss → physical address, digit-by-digit stepper
- [micro] `page-fault-lab` — frames vs working set; eviction policy (FIFO/LRU) selector; shrink RAM → thrashing meltdown visible
- [fig] `stack-vs-heap` — one process's address space; calls grow stack, mallocs pepper heap; leak animation

### ch.24 — Files & storage
- [micro] `fs-blocks` — create/grow/delete files on a block grid; fragmentation emerges; inode pointer fan-out view
- [fig] `hdd-vs-ssd` — seek arm physically travels vs instant flash lookup
- [fig] `journal-replay` — crash mid-write; journal replays to consistency, stepped

### ch.25 — Concurrency
- [HERO] `deadlock-lab` — two exhibits: **(a) race:** two threads `count++` interleaved instruction-by-instruction → lost updates counter; add mutex → correct but slower (throughput bar). **(b) dining philosophers:** run → deadlock freeze-frame with the wait-cycle highlighted; fixes: resource ordering / waiter — replay
- [micro] `producer-consumer` — bounded buffer; speed sliders both sides; full/empty stalls visible
- [quiz] `find-the-race` — spot the unprotected access
- [boss] `P6: unfreeze the philosophers` (pick + apply the right fix, explain why) — badge: *Deadlock Breaker*

## P7 · Networks

### ch.26 — How networks work
- [HERO] `packet-journey` — map: laptop→wifi→router→ISP→backbone→datacenter; DNS side-quest resolves first; packet hops animate, TTL ticks down, each hop unwraps/rewraps frame headers (envelope-in-envelope visual)
- [micro] `switch-learning` — LAN toy: frames flood, switch learns MAC table entry by entry
- [fig] `layer-cake` — app→transport→network→link wrapping, stepped both directions
- [boss] `P7 boss lives in ch.27`

### ch.27 — TCP & UDP
- [micro] `tcp-lab` — 3-way handshake stepper → data phase: loss-injection button → timeout/retransmit; window-size slider → throughput gauge; congestion sawtooth graph running
- [micro] `udp-vs-tcp-race` — loss slider; file transfer (must be perfect) vs video call (must be *now*) framing
- [quiz] `seq-puzzle` — fill in the sequence/ack numbers
- [boss] `P7: debug the broken handshake` (three faulty traces, diagnose each) — badge: *Wire Shark*

### ch.28 — The Web
- [micro] `url-journey` — type a URL → live timeline: DNS→TCP→TLS→request→response→parse→render; click a segment to expand it
- [fig] `http-evolution` — 1.1 head-of-line vs 2 multiplexing vs 3/QUIC lanes, animated
- [micro] `cache-headers` — tweak `max-age`/`etag`/`no-store` → fresh/stale/revalidate outcome per request

## P8 · Data

### ch.29 — Databases
- [HERO] `btree-lab` — insert keys → node fills → **split animates**; range-query walk highlighted; scoreboard: indexed search (log steps) vs full scan (row-by-row) with op counters on 10k rows
- [micro] `isolation-anomalies` — two transactions interleave on a timeline; pick isolation level → dirty read / non-repeatable read / phantom appear or vanish
- [micro] `join-visualizer` — nested-loop vs hash join on two small tables, row touches counted
- [quiz] `why-slow` — given query + schema, spot the missing index
- [boss] `P8: hit the query budget` (choose indexes for 3 workloads under a page-read budget) — badge: *Query Planner*

### ch.30 — Distributed systems
- [micro] `election-toy` — 5 nodes with heartbeats; kill the leader → timeout → election; partition the network → split-brain demo → quorum rule fixes it
- [micro] `cap-explorer` — partition strikes; choose C (reject writes) or A (accept, diverge) → watch consequences replay on heal
- [micro] `replication-lag` — write primary, read replica → stale read; read-your-writes toggle
- [fig] `logical-clocks` — Lamport timestamps stepped across 3 node timelines

## P9 · Security

### ch.31 — Cryptography
- [HERO] `dh-color-lab` — Diffie-Hellman twice: **paint mode** (public color + secret colors mix → same shared color, eavesdropper stuck) and **number mode** (small primes, real modular arithmetic) — toggle between them
- [micro] `hash-avalanche` — edit one character → SHA-256 bits flip everywhere (diff heat-map); mining-difficulty toy (find hash starting with N zeros)
- [micro] `cipher-cracker` — Caesar/Vigenère; frequency-analysis chart cracks it live as ciphertext accumulates
- [fig] `rsa-locks` — public-lock/private-key metaphor + small-number walkthrough, stepped
- [fig] `tls-replay` — the ch.28 handshake reframed: which crypto primitive does each step use
- [boss] `P9: break Vigenère, then run DH by hand` — badge: *Codebreaker*

### ch.32 — Security
- [micro] `injection-sandbox` — fake login; try `' OR 1=1--` against naive string-concat vs parameterized query; the query's AST shown for both (why parameters win)
- [micro] `password-entropy` — length/charset/pattern → entropy bits → crack-time at GPU speeds; dictionary-attack demo on "P@ssw0rd"
- [micro] `xss-demo` — sandboxed fake page; unescaped vs escaped comment rendering
- [fig] `defense-layers` — attacker walks through missing layers, stepped
- [quiz] `spot-the-vuln` — 4 code snippets, find the holes

## P10 · Intelligence

### ch.33 — Machine learning
- [HERO] `neural-playground` ⚠ — datasets (linear/circle/spiral 2D points); build the net (layers/neurons sliders); train → decision boundary morphs live, loss curve draws; overfit a tiny noisy set → train/test split exposes it
- [micro] `gradient-bowl` — drag the start point on a loss surface; learning-rate slider → converge / oscillate / explode
- [micro] `knn-toy` — k slider redraws class regions around your draggable points
- [quiz] `why-overfit` — diagnose 3 training curves
- [boss] `P10: train to 95% on the spiral` (budget: ≤3 layers) — badge: *Model Tamer*

### ch.34 — Modern AI & frontiers
- [micro] `tokenizer-toy` — type text → token chips (weird splits visible); why letter-counting fails
- [micro] `attention-heatmap` — pick a sentence; hover a word → attention weights shade the others
- [micro] `embedding-space` — 2D word-vector map; the king−man+woman arrow lands near queen
- [fig] `transformer-block` — embeddings→attention→MLP→next-token, stepped
- [fig] `scaling-curves` — capability vs compute/data/params

## P11 · Capstone

### ch.35 — The whole picture
- [HERO] `grand-traversal` — press a key in a fake editor → ride the event down the whole stack (keyboard interrupt → OS → process → CPU fetch-decode-execute → memory → back up through runtime → network fetch → render pixel) — every stop deep-links to its chapter; this is the guide's closing argument
- [fig] `one-page-map` — the entire curriculum as a single poster figure
- Boss gallery — all badges, replay links

---

## Learning engine — Katas (kata runner v1, S7)

In-browser coding exercises with instant tests, run in a **sandboxed, time-boxed Web
Worker** (Blob-URL worker; no DOM; `importScripts` blocked; hard timeout kills infinite
loops — CLAUDE.md §10). Each kata carries a prompt, a **TS signature** (shown for teaching),
a **JS starter**, hidden **tests**, and a **reference solution** locked by
`scripts/test-katas.ts`. v1 batch (~10) is focused on **P4-so-far** — Big-O reasoning +
linear structures — and grows one part at a time (§6). Route `#/katas`; per-chapter
`kataIds` deep-link the relevant ones.

- `binary-search` — index-or-−1, no off-by-one *(ch.13)*
- `dynamic-array` — growable array with amortized-O(1) push (doubling) *(ch.13/14)*
- `dedup-sorted` — remove duplicates from a sorted array in place, O(n) two-pointer *(ch.13)*
- `stack-impl` — a Stack: push/pop/peek/size *(ch.14)*
- `queue-ring` — a fixed-capacity ring-buffer Queue *(ch.14)*
- `is-balanced` — balanced brackets via a stack *(ch.14)*
- `hashmap-chaining` — a hash map with separate chaining: set/get/delete *(ch.14)*
- `two-sum` — indices that sum to target, one pass with a map *(ch.14)*
- `reverse-list` — reverse a singly linked list in place *(ch.14)*
- `lru-cache` — O(1) LRU cache (map + recency order) *(ch.14)*

## Shared framework (built once at S1, reused ~90 times)

- **`SimShell`** — chrome for every `[HERO]`/`[micro]`: play/pause/step/reset, speed slider,
  param controls slot, keyboard bindings (space/←/→), ARIA live region announcing state
  changes, `prefers-reduced-motion` → auto-switches to step mode. Consistent look = the
  guide's signature.
- **`FigureStepper`** — every `[fig]`: SVG frames with prev/next/auto and a frame caption;
  no GIFs in-app (GIF export only as marketing assets later).
- **`PredictQuiz`** — every `[quiz]`: question → commit an answer → reveal with animated
  explanation (the sim itself replays the truth where possible).
- **Cross-sim continuity:** RAM grid, cache overlay, and packet/envelope visuals reuse the
  *same* visual components across parts (ch.6→8→14→23, ch.26→27→28→31) — entities look
  identical wherever they appear.

## Inventory census (S0 baseline)

**17 HERO** (incl. stack-map + grand-traversal; P4 carries 3, P1/P2/P6 carry 2 each) ·
**65 micro** · **36 fig** (+complexity-ladder, +hash-anatomy at S7) · **10 boss** (each with
a badge) · **kata runner** (10 katas at v1, S7) · quizzes in every chapter
≈ **126+ touchables**. Census re-run on every change; `npm run qa` enforces per-chapter
minimums (see CLAUDE.md §6 mandate).
