// Figure/sim registry (CLAUDE.md §2): content references interactives by
// key; components are lazy-loaded so each chapter only ships its own sims.
// Record<Key, …> makes the mapping total — a key added in registryKeys.ts
// without a component here is a compile error.
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { FigKey, SimKey } from "./registryKeys.ts";

type LazyComp = LazyExoticComponent<ComponentType>;

const sims: Record<SimKey, LazyComp> = {
  // P1 · Information
  "bit-inspector": lazy(() => import("../components/sims/bit-inspector/BitInspector.tsx")),
  "base-converter": lazy(() => import("../components/sims/BaseConverter.tsx")),
  "utf8-encoder": lazy(() => import("../components/sims/utf8-encoder/Utf8Encoder.tsx")),
  "pixel-zoom": lazy(() => import("../components/sims/PixelZoom.tsx")),
  "sampling-toy": lazy(() => import("../components/sims/SamplingToy.tsx")),
  "huffman-lab": lazy(() => import("../components/sims/huffman-lab/HuffmanLab.tsx")),
  "rle-visualizer": lazy(() => import("../components/sims/RleVisualizer.tsx")),
  "lz-window": lazy(() => import("../components/sims/LzWindow.tsx")),
  // P2 · The Machine
  "logic-sandbox": lazy(() => import("../components/sims/logic-sandbox/LogicSandbox.tsx")),
  "demorgan-flip": lazy(() => import("../components/sims/DeMorganFlip.tsx")),
  "build-an-adder": lazy(() => import("../components/sims/build-an-adder/BuildAnAdder.tsx")),
  "alu-visualizer": lazy(() => import("../components/sims/alu-visualizer/AluVisualizer.tsx")),
  "latch-playground": lazy(() => import("../components/sims/latch-playground/LatchPlayground.tsx")),
  "ram-grid": lazy(() => import("../components/sims/ram-grid/RamGrid.tsx")),
  "cpu-8bit": lazy(() => import("../components/sims/cpu-8bit/CpuEmulator.tsx")),
  "pipeline-visualizer": lazy(() => import("../components/sims/pipeline-visualizer/PipelineVisualizer.tsx")),
  "cache-sim": lazy(() => import("../components/sims/cache-sim/CacheSim.tsx")),
  "rasterizer-toy": lazy(() => import("../components/sims/rasterizer-toy/RasterizerToy.tsx")),
  "cpu-vs-gpu-race": lazy(() => import("../components/sims/cpu-vs-gpu-race/CpuVsGpuRace.tsx")),
  // P3 · Code
  "abstraction-elevator": lazy(() => import("../components/sims/abstraction-elevator/AbstractionElevator.tsx")),
  "call-stack-viz": lazy(() => import("../components/sims/call-stack-viz/CallStackViz.tsx")),
  "compiler-pipeline": lazy(() => import("../components/sims/compiler/CompilerPipeline.tsx")),
  "dependency-blast": lazy(() => import("../components/sims/dependency-blast/DependencyBlast.tsx")),
  // P4 · Algorithms & Data Structures
  "growth-racer": lazy(() => import("../components/sims/growth-racer/GrowthRacer.tsx")),
  "amortized-doubling": lazy(() => import("../components/sims/amortized-doubling/AmortizedDoubling.tsx")),
  "array-vs-list-memory": lazy(() => import("../components/sims/array-vs-list-memory/ArrayVsListMemory.tsx")),
  "hash-collision-lab": lazy(() => import("../components/sims/hash-collision-lab/HashCollisionLab.tsx")),
  "stack-queue-stepper": lazy(() => import("../components/sims/stack-queue-stepper/StackQueueStepper.tsx")),
  "bst-builder": lazy(() => import("../components/sims/bst-builder/BstBuilder.tsx")),
  "heap-operations": lazy(() => import("../components/sims/heap-operations/HeapOperations.tsx")),
  "trie-autocomplete": lazy(() => import("../components/sims/trie-autocomplete/TrieAutocomplete.tsx")),
  "sorting-race": lazy(() => import("../components/sims/sorting-race/SortingRace.tsx")),
  "binary-search": lazy(() => import("../components/sims/binary-search/BinarySearch.tsx")),
  "pathfinder": lazy(() => import("../components/sims/pathfinder/Pathfinder.tsx")),
  "repr-switcher": lazy(() => import("../components/sims/repr-switcher/ReprSwitcher.tsx")),
  "topo-stepper": lazy(() => import("../components/sims/topo-stepper/TopoStepper.tsx")),
  "dp-table-filler": lazy(() => import("../components/sims/dp-table-filler/DpTableFiller.tsx")),
  "nqueens-backtracker": lazy(() => import("../components/sims/nqueens-backtracker/NQueensBacktracker.tsx")),
  "greedy-fails": lazy(() => import("../components/sims/greedy-fails/GreedyFails.tsx")),
  // P5 · Theory
  "fsm-builder": lazy(() => import("../components/sims/automata/FsmBuilder.tsx")),
  "regex-nfa": lazy(() => import("../components/sims/automata/RegexNfa.tsx")),
  "turing-machine": lazy(() => import("../components/sims/turing/TuringMachine.tsx")),
  "brute-force-death-watch": lazy(() => import("../components/sims/complexity/BruteForceDeathWatch.tsx")),
  "tsp-playground": lazy(() => import("../components/sims/complexity/TspPlayground.tsx")),
  // P6 · Operating Systems
  "scheduler-sim": lazy(() => import("../components/sims/scheduler-sim/SchedulerSim.tsx")),
  "syscall-boundary": lazy(() => import("../components/sims/syscall-boundary/SyscallBoundary.tsx")),
  "address-translate": lazy(() => import("../components/sims/paging/AddressTranslate.tsx")),
  "page-fault-lab": lazy(() => import("../components/sims/paging/PageFaultLab.tsx")),
};

const figs: Record<FigKey, LazyComp> = {
  // P1 · Information
  "float-number-line": lazy(() => import("../components/figures/FloatNumberLine.tsx")),
  "unicode-planes": lazy(() => import("../components/figures/UnicodePlanes.tsx")),
  "entropy-meter": lazy(() => import("../components/figures/EntropyMeter.tsx")),
  // P2 · The Machine
  "transistor-switch": lazy(() => import("../components/figures/TransistorSwitch.tsx")),
  "mux-router": lazy(() => import("../components/figures/MuxRouter.tsx")),
  "memory-hierarchy": lazy(() => import("../components/figures/MemoryHierarchy.tsx")),
  "datapath": lazy(() => import("../components/figures/Datapath.tsx")),
  "branch-predictor": lazy(() => import("../components/figures/BranchPredictor.tsx")),
  "gfx-pipeline": lazy(() => import("../components/figures/GfxPipeline.tsx")),
  // P3 · Code
  "paradigm-lens": lazy(() => import("../components/figures/ParadigmLens.tsx")),
  "jit-tiers": lazy(() => import("../components/figures/JitTiers.tsx")),
  "test-pyramid": lazy(() => import("../components/figures/TestPyramid.tsx")),
  // P4 · Algorithms & Data Structures
  "complexity-ladder": lazy(() => import("../components/figures/ComplexityLadder.tsx")),
  "hash-anatomy": lazy(() => import("../components/figures/HashAnatomy.tsx")),
  "tree-rotation": lazy(() => import("../components/figures/TreeRotation.tsx")),
  "rb-intuition": lazy(() => import("../components/figures/RbIntuition.tsx")),
  "merge-recursion": lazy(() => import("../components/figures/MergeRecursion.tsx")),
  "sort-stability": lazy(() => import("../components/figures/SortStability.tsx")),
  "mst-grow": lazy(() => import("../components/figures/MstGrow.tsx")),
  // P5 · Theory
  "chomsky-rings": lazy(() => import("../components/figures/ChomskyRings.tsx")),
  "halting-paradox": lazy(() => import("../components/figures/HaltingParadox.tsx")),
  "pnp-map": lazy(() => import("../components/figures/PnpMap.tsx")),
  // P6 · Operating Systems
  "process-states": lazy(() => import("../components/figures/ProcessStates.tsx")),
  "stack-vs-heap": lazy(() => import("../components/figures/StackVsHeap.tsx")),
};

export function getSim(key: string): LazyComp | undefined {
  return (sims as Record<string, LazyComp | undefined>)[key];
}
export function getFig(key: string): LazyComp | undefined {
  return (figs as Record<string, LazyComp | undefined>)[key];
}
