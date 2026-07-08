// Registry KEYS only — pure data, importable by the Node qa gate
// (no React here; component wiring lives in registry.tsx).
// INTERACTIVES.md is the naming authority: keys are defined there first.

export const SIM_KEYS = [
  // P1 · Information (S2)
  "bit-inspector", // ch.1 HERO — flip bits on int & float lanes
  "base-converter", // ch.1 micro — positional weights, lit up
  "utf8-encoder", // ch.2 micro — text → code points → bytes
  "pixel-zoom", // ch.2 micro — a colour is three numbers
  "sampling-toy", // ch.2 micro — sampling & aliasing
  "huffman-lab", // ch.3 HERO — build a code / decode the mystery file
  "rle-visualizer", // ch.3 micro — run-length encoding (and its backfire)
  "lz-window", // ch.3 micro — LZ77 sliding window
  // P2 · The Machine (S1)
  "logic-sandbox", // ch.4 HERO — drag-drop circuit builder
  "demorgan-flip", // ch.4 micro — De Morgan morph
  // P2 · The Machine (S3)
  "build-an-adder", // ch.5 micro — half → full → 4-bit ripple, carry sweep
  "alu-visualizer", // ch.5 micro — op select + Z/N/C/V flags
  "latch-playground", // ch.6 micro — SR latch feedback + D flip-flop clock edge
  "ram-grid", // ch.6 micro — address decoder + read/write (reused ch.8/14/23)
  // P2 · The Machine (S4)
  "cpu-8bit", // ch.7 HERO — full 8-bit CPU: assembler + micro-stepped emulator + Fibonacci boss
  // P2 · The Machine (S5)
  "pipeline-visualizer", // ch.8 micro — 5-stage pipeline: flow, data-hazard stall, branch flush, CPI
  "cache-sim", // ch.8 micro — direct-mapped cache: access patterns, line-size, hit/miss/hit-rate
  "rasterizer-toy", // ch.9 micro — drag a triangle; scanline fill; wireframe/filled/depth
  "cpu-vs-gpu-race", // ch.9 micro — 1 fast lane vs 1000 slow lanes; launch/transfer overhead
  // P3 · Code (S6)
  "abstraction-elevator", // ch.10 micro — one program at four heights (TS/C/asm/machine)
  "call-stack-viz", // ch.10 micro — recursive fib frames push/pop; stack-overflow demo
  "compiler-pipeline", // ch.11 HERO — source → tokens → AST → bytecode → stack VM, live + boss
  "dependency-blast", // ch.12 micro — change a module, watch the blast radius; interface seam shrinks it
  // P4 · Algorithms & Data Structures (S7)
  "growth-racer", // ch.13 HERO — O(1)…O(n!) curves race on real instrumented op-counts; log-scale toggle
  "amortized-doubling", // ch.13 micro — dynamic array grows; per-op cost spikes at doublings, running average flattens
  "array-vs-list-memory", // ch.14 micro — contiguous strides vs pointer-chasing on the RAM grid (reuses ch.6/8 visual)
  "hash-collision-lab", // ch.14 micro — chaining vs open addressing; bad/good hash; load-factor slider → clustering → rehash
  "stack-queue-stepper", // ch.14 micro — push/pop/enqueue/dequeue with pointer arrows
  // P4 · Algorithms & Data Structures (S8)
  "bst-builder", // ch.15 micro — grow a BST; Senior AVL mode animates LL/RR/LR/RL rotations + balance factors
  "heap-operations", // ch.15 micro — min-heap as array AND complete tree; push=sift-up, pop=sift-down, build-heap
  "trie-autocomplete", // ch.15 micro — type to walk/insert; shared prefixes; autocomplete = collect the subtree
  "sorting-race", // ch.16 HERO — seven sorts race on a fair access clock; counting/radix show zero comparisons
  "binary-search", // ch.16 micro — lo/mid/hi window halves each probe; exact search + lower-bound
  // P4 · Algorithms & Data Structures (S9)
  "pathfinder", // ch.17 HERO — BFS/DFS/Dijkstra/A* on a grid; paint walls & terrain; A* heuristic morph; P4 boss
  "repr-switcher", // ch.17 micro — adjacency matrix ↔ list; edge-test vs list-neighbours read counts
  "topo-stepper", // ch.17 micro — Kahn's algorithm peels in-degree-0 nodes; add a cycle → stuck
  "dp-table-filler", // ch.18 micro — LCS: exploding recursion vs the memo table filled cell by cell
  "nqueens-backtracker", // ch.18 micro — place/conflict/back-track with a tries counter vs Nⁿ brute force
  "greedy-fails", // ch.18 micro — coin change: greedy vs optimal; hunt the smallest counterexample
  // P5 · Theory (S10)
  "fsm-builder", // ch.19 micro — build a DFA; feed strings; the divisible-by-3 challenge
  "regex-nfa", // ch.19 micro — regex → Thompson ε-NFA; live parallel paths; NFA≡DFA state count
  "turing-machine", // ch.20 HERO — tape + rule table; presets (unary add, palindrome, busy beavers) + aⁿbⁿ boss
  "brute-force-death-watch", // ch.21 micro — grow n, watch runtime explode at a billion ops/s
  "tsp-playground", // ch.21 micro — nearest-neighbour vs 2-opt vs brute-force optimal
  // P6 · Operating Systems (S11)
  "scheduler-sim", // ch.22 HERO — FCFS/SJF/SRTF/RR/priority/MLFQ; live Gantt, stats, context-switch cost
  "syscall-boundary", // ch.22 micro — user↔kernel mode crossing, stepped
  "address-translate", // ch.23 micro — virtual addr → page-table walk → TLB → physical, digit by digit
  "page-fault-lab", // ch.23 micro — FIFO/LRU/Optimal/Clock over a reference string; thrashing & Bélády
  // P6 · Operating Systems (S12)
  "inode-explorer", // ch.24 HERO — byte offset → direct/single/double/triple indirect → data block; max file size
  "disk-allocation", // ch.24 micro — contiguous/linked/indexed allocation, first-fit, external fragmentation
  "race-lab", // ch.25 micro — two threads race on a shared counter (load-inc-store); a mutex repairs the lost update
  "deadlock-lab", // ch.25 HERO — dining philosophers + four fixes mapped to Coffman conditions + Deadlock Breaker boss
  // P7 · Networks (S13)
  "packet-journey", // ch.26 HERO — DNS side-quest then a packet hop-by-hop: TTL ticks, MACs rewritten, IP pinned, encapsulation envelope
  "switch-learning", // ch.26 micro — a switch floods, learns source MAC→port, then forwards; floods fall as the table fills
  "tcp-lab", // ch.27 HERO — 3-way handshake + Go-Back-N loss/retransmit + Reno sawtooth + the Wire Shark boss (broken handshakes)
  "udp-vs-tcp-race", // ch.27 micro — same lossy channel: TCP perfect-but-late (file) vs UDP fast-but-lossy (video call)
  "url-journey", // ch.28 micro — type a URL → DNS→TCP→TLS→request→wait→download→parse→render waterfall, click to expand
  "cache-headers", // ch.28 micro — max-age/ETag/no-store × age → fresh hit / 304 revalidate / full refetch
  // P8 · Data (S14)
  "btree-lab", // ch.29 HERO — B+-tree insert/split/search + range-scan leaf walk + index-vs-scan scoreboard + the Query Planner boss
  "isolation-anomalies", // ch.29 micro — two txns on a timeline; pick a level → dirty / non-repeatable / phantom appear or vanish
  "join-visualizer", // ch.29 micro — nested-loop (|R|·|S|) vs hash join (|R|+|S|), row touches counted
  "election-toy", // ch.30 micro — Raft-style leader election: heartbeats → timeout → term vote → quorum; partition → no split-brain
  "cap-explorer", // ch.30 micro — a partition strikes; choose CP (reject) or AP (diverge), consequences replay on heal
  "replication-lag", // ch.30 micro — primary write, replica trails → stale read; read-your-writes routes to the primary
] as const;

export const FIG_KEYS = [
  // P1 · Information (S2)
  "float-number-line", // ch.1 — representable floats, widening gaps
  "unicode-planes", // ch.2 — the code space from ASCII outward
  "entropy-meter", // ch.3 — Shannon's floor
  // P2 · The Machine (S1)
  "transistor-switch", // ch.4 — voltage-controlled switch stepper
  // P2 · The Machine (S3)
  "mux-router", // ch.5 — select lines steer one of N inputs through
  "memory-hierarchy", // ch.6 — register→L1→L2→RAM→SSD as distances (reused ch.8/14/23)
  // P2 · The Machine (S4)
  "datapath", // ch.7 — the CPU block diagram, stepped micro-op by micro-op
  // P2 · The Machine (S5)
  "branch-predictor", // ch.8 — 2-bit saturating counter, stepped over a loop
  "gfx-pipeline", // ch.9 — vertices → assembly → raster → fragments → pixels
  // P3 · Code (S6)
  "paradigm-lens", // ch.10 — one problem in imperative / OOP / functional shape
  "jit-tiers", // ch.11 — interpret → optimize on assumptions → deoptimize
  "test-pyramid", // ch.12 — many fast unit tests, few slow end-to-end
  // P4 · Algorithms & Data Structures (S7)
  "complexity-ladder", // ch.13 — the ranked ladder O(1)→O(n!), each rung revealed with a concrete cost at n
  "hash-anatomy", // ch.14 — one lookup stepped: key → hash → index → bucket (chain walk / probe)
  // P4 · Algorithms & Data Structures (S8)
  "tree-rotation", // ch.15 — the AVL single right rotation that fixes the left-left case, step by step
  "rb-intuition", // ch.15 — red-black rules as intuition: no red-red, equal black-heights → O(log n)
  "merge-recursion", // ch.16 — merge sort's divide-and-merge tree, split to singletons then merge up sorted
  "sort-stability", // ch.16 — what "stable" means: equal keys keep their input order (the race can't show this)
  // P4 · Algorithms & Data Structures (S9)
  "mst-grow", // ch.17 — Kruskal (edge-first, global) vs Prim (vertex-first, local) grow the same MST
  // P5 · Theory (S10)
  "chomsky-rings", // ch.19 — regular ⊂ context-free ⊂ context-sensitive ⊂ recursively-enumerable ⊂ beyond
  "halting-paradox", // ch.20 — the diagonalization self-reference, as a 6-frame comic
  "pnp-map", // ch.21 — P / NP / NP-complete / NP-hard territory + the P=NP two-worlds frame
  // P6 · Operating Systems (S11)
  "process-states", // ch.22 — new→ready→running→blocked→terminated lifecycle, transitions animate
  "stack-vs-heap", // ch.23 — one process's address space: stack grows down, heap grows up, a leak ratchets
  // P6 · Operating Systems (S12)
  "journaling", // ch.24 — write-ahead log: log → commit → checkpoint; crash before/after commit → discard vs replay
  "wait-for-graph", // ch.25 — resource-allocation → wait-for graph; a cycle IS a deadlock; break an edge to free it
  // P7 · Networks (S13)
  "layer-cake", // ch.26 — the TCP/IP stack as encapsulation: wrap HTTP→TCP→IP→Ethernet down, strip back up
  "http-evolution", // ch.28 — HTTP/1.1 head-of-line vs /2 multiplex-over-one-TCP vs /3 QUIC independent streams under loss
  // P8 · Data (S14)
  "logical-clocks", // ch.30 — Lamport timestamps stepped across 3 process timelines; the clock condition + a concurrent pair
] as const;

export type SimKey = (typeof SIM_KEYS)[number];
export type FigKey = (typeof FIG_KEYS)[number];
