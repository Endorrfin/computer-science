// P2 · machine memory engine — pure, framework-free (erasable-syntax only;
// runs in Node under --experimental-strip-types). Shared by latch-playground
// + ram-grid, asserted in scripts/test-machine.ts.
//
// The whole trick of memory is feedback: wire a gate's output back to its own
// input and the loop *holds a value*. ch.4 showed feedback as a bug
// (oscillation); here it becomes the feature.

const nor = (a: number, b: number): number => (a || b ? 0 : 1);

// ---- SR latch (two cross-coupled NOR gates) ----

export type LatchState = { q: number; qbar: number };

/** One simultaneous step: both NORs recompute from the PREVIOUS outputs
    (same unit-delay model as the ch.4 logic-sandbox). Q = R NOR Q̄,
    Q̄ = S NOR Q. Set (S=1,R=0)→Q=1 · Reset (S=0,R=1)→Q=0 · Hold (0,0) ·
    Forbidden (1,1)→both 0, then races on release. */
export function srLatchStep(s: number, r: number, prev: LatchState): LatchState {
  return { q: nor(r & 1, prev.qbar), qbar: nor(s & 1, prev.q) };
}

/** Step until the loop stops changing. Returns the per-tick trace so the sim
    can animate the settle signal-by-signal; stable=false ⇒ oscillation. */
export function srLatchSettle(
  s: number,
  r: number,
  init: LatchState,
  maxTicks = 16,
): { trace: LatchState[]; stable: boolean } {
  const trace: LatchState[] = [init];
  let cur = init;
  for (let t = 0; t < maxTicks; t++) {
    const next = srLatchStep(s, r, cur);
    trace.push(next);
    if (next.q === cur.q && next.qbar === cur.qbar) return { trace, stable: true };
    cur = next;
  }
  return { trace, stable: false };
}

/** Is (Q,Q̄) a valid, complementary latch state? (1,1) and the transient
    (0,0) of the forbidden input are not. */
export function isValidLatch(st: LatchState): boolean {
  return (st.q ^ st.qbar) === 1;
}

// ---- gated D latch: no more "forbidden" input ----

/** Transparent when enable=1 (Q follows D), opaque when enable=0 (holds). */
export function dLatch(d: number, enable: number, prevQ: number): number {
  return enable ? d & 1 : prevQ & 1;
}

// ---- edge-triggered D flip-flop: the clocked 1-bit register ----

export function risingEdge(prevClk: number, clk: number): boolean {
  return (prevClk & 1) === 0 && (clk & 1) === 1;
}

/** Captures D only on a rising clock edge; holds otherwise. This is what makes
    a synchronous machine: state changes only at the tick, never between. */
export function dFlipFlop(prevClk: number, clk: number, d: number, prevQ: number): number {
  return risingEdge(prevClk, clk) ? d & 1 : prevQ & 1;
}

/** N flip-flops sharing a clock and a load-enable = a register. */
export function registerStep(
  prevClk: number,
  clk: number,
  load: number,
  d: number,
  prevValue: number,
  width: number,
): number {
  const mask = (1 << width) - 1;
  return risingEdge(prevClk, clk) && load ? d & mask : prevValue & mask;
}

// ---- RAM: an addressable array of registers + an address decoder ----

export type Ram = { addrBits: number; wordBits: number; cells: number[] };

export function makeRam(addrBits: number, wordBits: number, fill = 0): Ram {
  const size = 1 << addrBits;
  const mask = (1 << wordBits) - 1;
  return { addrBits, wordBits, cells: new Array<number>(size).fill(fill & mask) };
}

export function ramSize(ram: Ram): number {
  return 1 << ram.addrBits;
}

/** The address decoder: n address bits → exactly one of 2ⁿ word-lines high. */
export function decodeOneHot(addr: number, addrBits: number): number[] {
  const n = 1 << addrBits;
  const a = addr & (n - 1);
  const out = new Array<number>(n).fill(0);
  out[a] = 1;
  return out;
}

export function ramRead(ram: Ram, addr: number): number {
  return ram.cells[addr & (ramSize(ram) - 1)] ?? 0;
}

/** Write is gated by write-enable; returns a new Ram (immutable for React). */
export function ramWrite(ram: Ram, addr: number, value: number, we: number): Ram {
  if (!(we & 1)) return ram;
  const i = addr & (ramSize(ram) - 1);
  const mask = (1 << ram.wordBits) - 1;
  const cells = ram.cells.slice();
  cells[i] = value & mask;
  return { addrBits: ram.addrBits, wordBits: ram.wordBits, cells };
}

/** capacity = 2^addrBits words. The headline relation of the chapter:
    one more address wire doubles the memory you can name.
    NB: `2 ** addrBits`, NOT `1 << addrBits` — JS bitwise ops are 32-bit and
    mask the shift mod 32, so `1 << 32 === 1`, which would break the chapter's
    own "32 address bits → 4 GiB" claim. Float math is exact through 2^53. */
export function ramCapacityBytes(addrBits: number, wordBits: number): number {
  return (2 ** addrBits * wordBits) / 8;
}
