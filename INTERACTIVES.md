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

### ch.15 — Trees & heaps *(built S8)*
- [micro] `bst-builder` — insert/find/delete animated on a step trace; plain-BST mode degenerates on sorted input; **Senior AVL mode** animates LL/RR/LR/RL rotations with live balance factors (the "why balance" aha); traversal readout (in/pre/post/level-order)
- [micro] `heap-operations` — min-heap shown in BOTH the array and the complete-tree views at once; push=sift-up, pop=sift-down, heapify (Floyd build-heap); active indices highlighted in both panes
- [micro] `trie-autocomplete` — type a prefix; the path lights up; suggestions spill from the subtree; Insert flags the newly-created nodes; node-count shows prefix sharing
- [fig] `tree-rotation` — the AVL single right rotation that fixes the left-left case, step by step
- [fig] `rb-intuition` — red-black rules as intuition: no red-red + equal black-heights → O(log n)
- [quiz] `tree-predict` — degenerate BST shape, where the heap max lives, prefix sharing

### ch.16 — Sorting & searching *(built S8)*
- [HERO] `sorting-race` — seven sorts (insertion/selection/merge/quick/heap/counting/radix) race on the *same* data on a **fair shared access clock** (reads+writes); data shapes: random / sorted / reversed / few-unique; comparisons shown as a second column so counting/radix's hard **zero** is the payoff; per-lane bars + ranking
- [micro] `binary-search` — lo/mid/hi window halves each probe, discarded half greyed out; exact-search AND lower-bound modes; probes-vs-⌊log₂n⌋+1 meter
- [fig] `merge-recursion` — merge sort's divide-and-merge tree: split to singletons, merge up sorted
- [fig] `sort-stability` — what "stable" means (equal keys keep input order) — the one thing the number-only race can't show
- [quiz] `sort-predict` — quicksort's O(n²) worst case, counting's zero comparisons, stability for multi-key sorts

### ch.17 — Graphs *(built S9)*
- [HERO] `pathfinder` — grid world: paint walls & weight terrain; run BFS/DFS/Dijkstra/A\* — frontier flood animated, visited count vs path cost; A\* heuristic-weight slider (greedy↔Dijkstra morph); hosts the P4 boss
- [micro] `repr-switcher` — same graph as adjacency matrix ↔ list; "is u→v an edge?" vs "list neighbors" cost counters
- [micro] `topo-stepper` — dependency graph; peel zero-in-degree nodes; introduce a cycle → stuck (teachable fail)
- [fig] `mst-grow` — Kruskal vs Prim growing side by side
- [quiz] `graph-predict` — BFS-vs-weighted, the A\* heuristic dial, Dijkstra + negative edges, Kahn cycle detection
- [boss] `P4: beat the blind race` — on a revealed maze, pick algorithm + heuristic to hit the target visited-node budget — badge: *Pathmaster*

### ch.18 — Design paradigms *(built S9)*
- [micro] `dp-table-filler` — LCS: recursion *tree* (exploding, duplicated subtrees highlighted) vs memo *table* filling cell-by-cell — side by side
- [micro] `nqueens-backtracker` — watch place→conflict→backtrack; tries counter; N + first/all toggle
- [micro] `greedy-fails` — coin systems where greedy wins vs loses; counterexample hunter
- [quiz] `pick-the-paradigm` — 5 problems → which technique fits

## P5 · Theory

### ch.19 — Automata & regular languages *(built S10)*
- [micro] `fsm-builder` — draw states/transitions, mark accepting; feed strings, watch the token walk; challenge: "accept binary numbers divisible by 3" (graded against the true language)
- [micro] `regex-nfa` — type a regex → Thompson ε-NFA renders; test string lights the live paths (parallel ones included); shows the equivalent-DFA state count (NFA≡DFA)
- [fig] `chomsky-rings` — regular ⊂ context-free ⊂ context-sensitive ⊂ recursively-enumerable ⊂ beyond, stepped with example languages + the machine each needs
- [quiz] `regular-or-not` — classify languages as regular or not (the pumping-lemma boundary)

### ch.20 — Computability *(built S10)*
- [HERO] `turing-machine` — tape window + editable rule table; step/run/timeout; presets: unary addition, palindrome checker, 3- & 4-state busy beavers (with step-count fireworks + S(3)=21 / S(5)=47,176,870 note); boss mode grades an aⁿbⁿ decider
- [fig] `halting-paradox` — the diagonalization self-reference told as a 6-frame comic stepper
- [quiz] `does-it-halt` — problems you *can* and provably *can't* decide (halting, Rice, busy beaver)
- [boss] `P5: build a TM that accepts aⁿbⁿ` (rule table from scratch, full test suite must pass) — badge: *Halting Oracle*

### ch.21 — Complexity *(built S10)*
- [micro] `brute-force-death-watch` — n slider × problem (O(n)…O(n!)) × rate (10⁶…10¹⁸ ops/s); live op-count + honest wall-clock ("age-of-universe" readout); log-scale bars
- [micro] `tsp-playground` — drag/add cities; nearest-neighbour vs 2-opt vs brute-force optimal; tour-length scoreboard + (n−1)!/2 tour count; brute force locked past n=9
- [fig] `pnp-map` — P / NP / NP-complete / NP-hard territory map + the P=NP two-worlds collapse, stepped
- [quiz] `np-or-not` — classify problems as P / NP / NP-complete / NP-hard / undecidable

## P6 · Operating Systems

### ch.22 — Processes & scheduling *(built S11)*
- [HERO] `scheduler-sim` — editable process table (arrival/burst/priority); run FCFS/SJF/SRTF/RR (quantum slider)/priority (preemptive + aging)/MLFQ; live Gantt revealed by the transport, per-process wait/turnaround/response + averages/utilization; context-switch cost slider shows overhead eating throughput; Convoy/Mixed/RR presets
- [fig] `process-states` — new→ready→running→blocked→terminated state machine; an 8-frame walk lights one process's transitions with their causes (incl. the involuntary, OS-drawn preempt arrow)
- [micro] `syscall-boundary` — user↔kernel mode crossing, 7-step trap stepper: mode bit flips, control token crosses the one vetted entry point (what a "system call" physically is)
- [quiz] `scheduling-predict` — convoy effect (FCFS avg-wait), tiny-quantum overhead, why SJF needs an unknowable oracle

### ch.23 — Memory *(built S11)*
- [micro] `address-translate` — virtual address → bit-split (VPN/offset, sub-split per level) → single/2-level page-table walk → TLB hit/miss (persists across translations) → physical address, step by step; page-fault trap
- [micro] `page-fault-lab` — reference string × frames × policy (FIFO/LRU/Optimal/Clock, clock shows ref-bits + hand); fault/hit counters, fault-vs-frames curve, Bélády's-anomaly callout, thrashing intuition; Silberschatz/Bélády presets
- [fig] `stack-vs-heap` — one process's address space; calls grow the stack down, mallocs grow the heap up, a leak ratchets the high-water mark toward OOM
- [quiz] `paging-predict` — Bélády's anomaly, page-fault-≠-segfault, LRU-vs-FIFO fault count

### ch.24 — Files & storage *(built S12)*
- [HERO] `inode-explorer` — scrub a byte offset (or block/pointer-size presets) → the direct/single/double/triple-indirect walk lights up; logical block, offset-in-block, disk-read count (indirection depth + 1), and the live maximum file size the fan-out yields
- [micro] `disk-allocation` — allocate files on a 48-block device under contiguous/linked/indexed; click a file to delete it; first-fit placement, external-fragmentation meter, a "fragment it" preset that defeats contiguous, and the per-method random-read cost
- [fig] `journaling` — write-ahead logging in 6 frames: the multi-block update, the crash-in-the-middle hazard, log → commit → checkpoint, and both crash cases (before commit ⇒ discard, after ⇒ replay)
- [quiz] `files-predict` — pointers-per-block fan-out, contiguous fragmentation failure, crash-before-commit recovery

### ch.25 — Concurrency *(built S12)*
- [HERO] `deadlock-lab` — dining philosophers around a shared plate; **Naive** freezes into a red circular-wait (wait-for arrows drawn), then four fixes — resource ordering / arbitrator (both-or-none) / trylock+backoff / bounded diners — each let all five eat, annotated with the Coffman condition they break; the P6 boss hosts here
- [micro] `race-lab` — two threads run `count++` as load·inc·store; step them by hand to lose an update or auto-interleave; flip the mutex on and the section is atomic (exact); live trace + expected-vs-actual counter
- [fig] `wait-for-graph` — deadlock detection as graph search in 5 frames: resource-allocation graph → wait-for graph → "a cycle *is* a deadlock" → the five-philosopher cycle → break one edge (ordering) ⇒ deadlock-free
- [quiz] `concurrency-predict` — smallest lost-update value, "remove any one Coffman condition", the lock-ordering fix
- [boss] `P6: unfreeze the philosophers` — pick a fix that frees the table **and** name the condition it breaks — badge: 🔓 *Deadlock Breaker*

## P7 · Networks  — ✅ SHIPPED S13 (engine: `sims/net/{layers,switching,tcp,web}.ts`; tests ch.26–28)

### ch.26 — How networks work
- [HERO] `packet-journey` ✅ — DNS side-quest resolves first, then a packet hops laptop→wifi switch→home/ISP/backbone/datacenter routers→server; TTL ticks down at each router, MACs rewritten while IP stays pinned, encapsulation envelope; low-TTL drop preset (traceroute)
- [micro] `switch-learning` ✅ — LAN toy: unknown dest floods, switch learns source MAC→port entry by entry, floods fall as the table fills
- [fig] `layer-cake` ✅ — app→transport→internet→link wrapping (message→segment→packet→frame), stepped both directions
- [quiz] `packet-predict` ✅ — TTL after N routers · which address changes at a router · flood vs forward
- [boss] `P7 boss lives in ch.27`

### ch.27 — TCP & UDP
- [HERO] `tcp-lab` ✅ — lab|boss modes; handshake stepper (seq/ack, SYN eats a number) → reliability (window slider + loss-injection → Go-Back-N retransmit) → Reno cwnd **sawtooth** (inject triple-dup/timeout); hosts the boss
- [micro] `udp-vs-tcp-race` ✅ — loss slider; TCP = file transfer (perfect but late) vs UDP = video call (fast but lossy)
- [quiz] `seq-puzzle` ✅ — fill in the sequence/ack numbers (why +1)
- [boss] `P7: debug the broken handshake` ✅ (three faulty traces — missing ACK flag · SYN-ACK off-by-one · wrong final ACK — diagnose each) — badge: 🦈 *Wire Shark* → `markChallengeDone("boss-p7")`

### ch.28 — The Web
- [micro] `url-journey` ✅ — type a URL → live waterfall: DNS→TCP→TLS→request→wait→download→parse→render; click a segment to expand it
- [fig] `http-evolution` ✅ — 1.1 head-of-line vs 2 multiplex-over-one-TCP (loss stalls all) vs 3/QUIC independent streams (loss stalls one), stepped
- [micro] `cache-headers` ✅ — tweak `max-age`/`etag`/`no-store` × age → fresh hit / 304 revalidate / full refetch per request
- [quiz] `web-predict` ✅ — cache freshness · which HTTP version stalls most on loss · what TLS does *not* hide

## P8 · Data  — ✅ SHIPPED S14 (engines: `sims/db/{btree,planner,isolation,joins}.ts` + `sims/dist/{election,cap,replication,clocks}.ts`; tests ch.29–30)

### ch.29 — Databases
- [HERO] `btree-lab` ✅ — real B+-tree: insert keys → node fills → **split animates**; search highlights the root→leaf path (nodeReads = height); range-query **walks the linked leaves**; scoreboard: index reads vs full scan on 10k rows at a realistic fanout. Hosts the boss.
- [micro] `isolation-anomalies` ✅ — two transactions interleave on a T1/T2 timeline; pick a level → dirty read / non-repeatable read / phantom appear or vanish; the full ANSI 3×4 matrix rendered alongside
- [micro] `join-visualizer` ✅ — nested-loop (|R|·|S|) vs hash join (|R|+|S|) on two small tables, row touches counted, matches linked as you step
- [quiz] `why-slow` ✅ — missing index / selectivity / composite-for-filter+sort
- [boss] `P8: hit the query budget` ✅ (choose indexes for 3 workloads under a page-read budget; over-indexing blows the ingest write budget) — badge: 📇 *Query Planner* → `markChallengeDone("boss-p8")`

### ch.30 — Distributed systems
- [micro] `election-toy` ✅ — Raft-style: nodes in a ring, kill the leader → timeout → term vote → majority quorum; partition 3\|2 → only the majority elects; even 2\|2 → nobody (no split-brain)
- [micro] `cap-explorer` ✅ — partition strikes; choose CP (reject, stay consistent) or AP (accept, diverge → reconcile on heal), stepped on a timeline
- [micro] `replication-lag` ✅ — primary write, replica trails → stale read inside the lag window; read-your-writes routes to the primary
- [fig] `logical-clocks` ✅ — Lamport timestamps stepped across 3 process timelines; every message arrow climbs, plus a concurrent pair the clock can't distinguish
- [quiz] `consistency-predict` ✅ — quorum majority / AP trade-off / read-your-writes / R+W>N

## P9 · Security

### ch.31 — Cryptography
- [HERO] `dh-color-lab` ✅ — Diffie-Hellman twice: **paint mode** (public color + secret colors mix → same shared color, eavesdropper stuck) and **number mode** (small primes, real modular arithmetic) — toggle between them
- [micro] `hash-avalanche` ✅ — edit one character → SHA-256 bits flip everywhere (diff heat-map); mining-difficulty toy (find hash starting with N zeros)
- [micro] `cipher-cracker` ✅ — Caesar/Vigenère; frequency-analysis chart cracks it live as ciphertext accumulates
- [fig] `rsa-locks` ✅ — public-lock/private-key metaphor + small-number walkthrough, stepped
- [fig] `tls-replay` ✅ — the ch.28 handshake reframed: which crypto primitive does each step use
- [boss] `P9: break Vigenère, then run DH by hand` ✅ — badge: *Codebreaker*

### ch.32 — Security
- [micro] `injection-sandbox` ✅ — fake login; try `' OR 1=1--` against naive string-concat vs parameterized query; the query's AST shown for both (why parameters win)
- [micro] `password-entropy` ✅ — length/charset/pattern → entropy bits → crack-time at GPU speeds; dictionary-attack demo on "P@ssw0rd"
- [micro] `xss-demo` ✅ — sandboxed fake page; unescaped vs escaped comment rendering
- [fig] `defense-layers` ✅ — attacker walks through missing layers, stepped
- [quiz] `spot-the-vuln` ✅ — 4 code snippets, find the holes

## P10 · Intelligence  — ✅ SHIPPED S16 (engines: `sims/ml/{rng,datasets,mlp,knn,gd}.ts` + `sims/ai/{bpe,attention,embeddings}.ts` with vendored `sims/ai/data/{bpe-data,embeddings-data,corpus}.ts`; tests ch.33–34. Real backprop MLP, real BPE, real word2vec vectors, real softmax attention.)

### ch.33 — Machine learning
- [HERO] `neural-playground` ✅ — datasets (linear/circle/xor/spiral); build the net (0–3 hidden layers, width, activation, input-feature toggles); train live → decision-boundary heat-map morphs, loss curve draws, train/test accuracy split; 🎲 reseed = live-random init. Real forward+backprop+gradient descent (`mlp.ts`).
- [micro] `gradient-bowl` ✅ — drag the start point on the loss bowl `L=½(a²+κb²)`; learning-rate control → converge / oscillate / explode, with the `lr < 2/κ` stability threshold shown
- [micro] `knn-toy` ✅ — k slider redraws the class-region map; a query crosshair shows its k nearest neighbours + vote; leave-one-out accuracy narrates memorize-vs-smooth
- [quiz] `why-overfit` ✅ — diagnose the train-vs-test curves (3 questions)
- [boss] `P10: train to 95% on the spiral` ✅ (budget: ≤3 hidden layers) — badge: 🧠 *Model Tamer* (winnable two ways: 3 raw layers, or 2 layers + engineered features — both CI-proven)

### ch.34 — Modern AI & frontiers
- [micro] `tokenizer-toy` ✅ — type text → real BPE token chips (subword splits visible); char-vs-token count; the `strawberry` letter-counting demo (letters buried across tokens)
- [micro] `attention-heatmap` ✅ — pick a sentence; hover a word → real softmax attention shades the others + an n×n heat-map (weights real; token vectors illustrative, labeled)
- [micro] `embedding-space` ✅ — 2-D PCA map of real word2vec vectors; the analogy builder computes king−man+woman → **queen** in full 64-D (genuinely learned, not placed)
- [fig] `transformer-block` ✅ — embeddings→attention→feed-forward→next-token, stepped, with residuals
- [fig] `scaling-curves` ✅ — test loss vs compute/data/params power laws + the Chinchilla compute-optimal point

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
- `bst-insert` — insert into a BST, in-order stays sorted *(ch.15)*
- `validate-bst` — is it a valid BST? (the range-bound trap) *(ch.15)*
- `bst-level-order` — breadth-first traversal with a queue *(ch.15)*
- `min-heap` — a priority queue: push/pop/peek/size *(ch.15)*
- `heapify` — Floyd bottom-up build-heap, O(n) *(ch.15)*
- `trie-autocomplete` — trie with search/startsWith/autocomplete *(ch.15)*
- `binary-search-lower-bound` — first index ≥ target (insertion point) *(ch.16)*
- `merge-two-sorted` — the merge step, two-pointer O(n+m) *(ch.16)*
- `quickselect` — k-th smallest in expected O(n), partition-based *(ch.16)*
- `counting-sort` — non-comparison sort of small non-negative ints *(ch.16)*
- `bfs-shortest-path` — fewest hops on an unweighted graph via BFS, −1 if unreachable *(ch.17)*
- `topo-order` — a valid topological order via Kahn, [] on a cycle *(ch.17)*
- `lcs-length` — longest common subsequence length via the DP table *(ch.18)*
- `coin-change-min` — fewest coins for an amount (DP, where greedy fails) *(ch.18)*
- `dfa-accepts` — simulate a DFA over an input string, dead-state on missing transitions *(ch.19)*
- `binary-divisible-by-three` — the mod-3 remainder automaton in O(1) space *(ch.19)*
- `anbn-decide` — decide { aⁿbⁿ : n ≥ 0 }, the non-regular language a counter cracks *(ch.20)*
- `collatz-steps` — count steps to 1 (halting for one input, though the general case is open) *(ch.20)*
- `subset-sum-decide` — reachable-sums DP for the NP-complete decision problem *(ch.21)*
- `verify-hamiltonian` — the easy "check a certificate" side of an NP problem *(ch.21)*

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
**65 micro** · **36 fig** (+complexity-ladder, +hash-anatomy at S7; +tree-rotation,
+rb-intuition, +merge-recursion, +sort-stability at S8) · **10 boss** (each with a badge) ·
**kata runner** (10 katas at v1, S7 → **20 katas** after S8; **24** after S9; **30** after
S10's +6 automata/computability/complexity batch; **34** after S11's +4 scheduling/paging
batch; **38** after S12's +4 files/concurrency batch; **44** after S13's +6 networks batch;
**48** after S14's +4 data batch; **52** after S15's +4 security batch; **56** after S16's
+4 ML/AI batch) · quizzes in every chapter. As of **S16** the live build
carries **76 sims, 34 figures, 34 quizzes, 171 interview Qs, 56 katas** across **34 live
chapters** (`npm run qa` prints the running census and enforces the per-chapter minimums —
CLAUDE.md §6 mandate). **Part 5 · Theory
complete** (ch.19–21 + the *Halting Oracle* boss inside `turing-machine`). **Part 6 · Operating
Systems complete** (ch.22–25): S11 shipped ch.22–23 with the `scheduler-sim` HERO; **S12** shipped
ch.24 (Files & storage, `inode-explorer` HERO) and ch.25 (Concurrency, `deadlock-lab` HERO) with
the *Deadlock Breaker* boss. **Part 7 · Networks complete** (ch.26–28): **S13** shipped ch.26
(`packet-journey` HERO), ch.27 (TCP & UDP, `tcp-lab` HERO with the Reno sawtooth) and ch.28 (The
Web) with the 🦈 *Wire Shark* boss inside `tcp-lab` (debug three broken handshakes). **Part 8 ·
Data complete** (ch.29–30): **S14** shipped ch.29 (Databases, the `btree-lab` **B+-tree** HERO +
`isolation-anomalies` + `join-visualizer`) with the 📇 *Query Planner* boss inside `btree-lab`
(choose indexes to fit three workloads under a page-read budget), and ch.30 (Distributed systems,
Raft-style `election-toy` + `cap-explorer` + `replication-lag` + the `logical-clocks` figure).
**Part 9 · Security complete** (ch.31–32): **S15** shipped ch.31 (Cryptography, the `dh-color-lab`
HERO — paint + real modular arithmetic) + `hash-avalanche` + `cipher-cracker`, and ch.32 (Security,
`injection-sandbox` + `password-entropy` + `xss-demo`) with the 🗝️ *Codebreaker* boss. **Part 10 ·
Intelligence complete** (ch.33–34): **S16** shipped ch.33 (Machine learning, the `neural-playground`
**real-backprop MLP** HERO + `gradient-bowl` + `knn-toy`) with the 🧠 *Model Tamer* boss (train the
spiral to 95% within ≤3 layers), and ch.34 (Modern AI, real BPE `tokenizer-toy` + real-softmax
`attention-heatmap` + real-word2vec `embedding-space` + `transformer-block` & `scaling-curves` figs).
