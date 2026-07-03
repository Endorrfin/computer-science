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
];

export function interviewById(id: string): InterviewQ | undefined {
  return INTERVIEW.find((q) => q.id === id);
}
export function interviewOfChapter(chapterId: string): InterviewQ[] {
  return INTERVIEW.filter((q) => q.chapterId === chapterId);
}
