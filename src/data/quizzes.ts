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
];

export function quizById(id: string): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
