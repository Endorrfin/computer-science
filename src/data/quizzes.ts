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
  {
    id: "overflow-predict",
    chapterId: "ch1",
    questions: [
      {
        prompt: "An **8-bit signed** integer holds `127` (the maximum). You add `1`. What does it read as?",
        options: ["128", "−128", "0", "a crash / exception"],
        answer: 1,
        explain:
          "The pattern goes `0111_1111` → `1000_0000`. Under two's complement the top bit carries weight −128, so the value silently **wraps to −128**. No exception fires — this is exactly the signed-overflow bug behind countless real crashes. Flip these bits in the bit-inspector to watch it.",
      },
      {
        prompt: "An **8-bit unsigned** counter is at `255`. You add `1`. Result?",
        options: ["256", "0", "255 (stuck)", "−1"],
        answer: 1,
        explain:
          "8 bits can't hold 256 (that needs a 9th bit), so the carry falls off the end and it **wraps to 0** — `1111_1111` + 1 = `1_0000_0000`, truncated to `0000_0000`. Odometers and `uint8` overflow the same way.",
      },
      {
        prompt: "In IEEE-754 double precision, is `0.1 + 0.2 === 0.3`?",
        options: ["true", "false"],
        answer: 1,
        explain:
          "**False.** Neither 0.1 nor 0.2 has an exact binary fraction, so each is stored slightly off; the errors don't cancel and the sum is `0.30000000000000004`. Compare with a tolerance (`Math.abs(a−b) < 1e−9`), never with `===`.",
      },
    ],
  },
  {
    id: "encoding-predict",
    chapterId: "ch2",
    questions: [
      {
        prompt: 'In JavaScript, what is `"😀".length`?',
        options: ["1", "2", "4"],
        answer: 1,
        explain:
          "**2.** `String.length` counts UTF-16 code *units*, and 😀 (U+1F600) sits above the BMP, so it's stored as a surrogate *pair* — two units for one character. It's one code point and four UTF-8 bytes. Three different counts for one emoji: the classic trap.",
      },
      {
        prompt: "How many **UTF-8 bytes** encode `€` (U+20AC)?",
        options: ["1", "2", "3", "4"],
        answer: 2,
        explain:
          "**3.** U+20AC is in the range U+0800–U+FFFF, which UTF-8 encodes as `1110xxxx 10xxxxxx 10xxxxxx`. Code points ≤ U+007F take 1 byte, ≤ U+07FF take 2, ≤ U+FFFF take 3, and the astral planes take 4.",
      },
      {
        prompt: "A pure-ASCII string, stored as UTF-8, versus stored as ASCII — the bytes are…",
        options: ["identical", "UTF-8 is larger", "UTF-8 is smaller"],
        answer: 0,
        explain:
          "**Identical.** Every ASCII code point (0–127) encodes to the same single byte in UTF-8 (leading bit 0). That backward compatibility — old ASCII files are already valid UTF-8 — is the main reason UTF-8 beat the fixed-width encodings.",
      },
    ],
  },
  {
    id: "compress-predict",
    chapterId: "ch3",
    questions: [
      {
        prompt: "Which string does Huffman compress **more**?",
        options: ["`aaaaaaaaab` (one rare symbol)", "`abcdefghij` (all distinct)", "the same for both"],
        answer: 0,
        explain:
          "The **skewed** one. Huffman spends short codes on frequent symbols; a lopsided distribution has low entropy (~0.9 bits/symbol here after the tree), so it shrinks a lot. Ten distinct equally-likely symbols have entropy log₂10 ≈ 3.32 bits each — barely better than fixed-width. Compression feeds on *imbalance*.",
      },
      {
        prompt: "You run RLE on `ABABABAB`. The output is…",
        options: ["smaller than the input", "bigger than the input", "the same size"],
        answer: 1,
        explain:
          "**Bigger.** With no runs to collapse, every symbol becomes a (symbol, 1) pair — the count byte is pure overhead, doubling the size. No lossless scheme shrinks *every* input; each one has adversarial cases (pigeonhole principle).",
      },
      {
        prompt: "Can you losslessly compress a file of **truly random** bytes?",
        options: ["yes, a little", "no"],
        answer: 1,
        explain:
          "**No.** Random data has maximum entropy (8 bits/byte) — no redundancy to remove. By counting, the ~2ⁿ possible n-byte files can't all map to shorter distinct outputs. It's also why compressing an already-compressed file gains nothing.",
      },
    ],
  },
];

export function quizById(id: string): QuizDef | undefined {
  return QUIZZES.find((q) => q.id === id);
}
