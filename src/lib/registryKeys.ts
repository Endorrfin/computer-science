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
] as const;

export type SimKey = (typeof SIM_KEYS)[number];
export type FigKey = (typeof FIG_KEYS)[number];
