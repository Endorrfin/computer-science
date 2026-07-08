// A small, bundled English corpus used to TRAIN the tokenizer-toy's BPE merge
// table (scripts/gen-bpe.ts) — original prose, no external data. It is
// deliberately modest: enough for the merges to capture common English
// fragments (th, the, ing, ion, er, and whole frequent words), which is all a
// teaching tokenizer needs. Real production tokenizers train on terabytes; the
// mechanism is identical, only the scale differs.
export const CORPUS = `
A computer is a machine that follows instructions. It reads a program one step
at a time, and each step is small and exact. The processor fetches an
instruction, decodes what it means, and executes it, then moves on to the next
one. This simple loop, repeated billions of times every second, is how a
handful of switches becomes a spreadsheet, a game, a message to a friend across
the world.

Underneath everything is information, and all information is bits. A bit is a
single choice between two options, a zero or a one, and from that one idea we
build numbers, letters, colors, sound, and pictures. Text becomes numbers
through an encoding, and those numbers become patterns of voltage inside the
memory of the machine. Nothing here is magic; it is only layers, each one
resting on the layer below it.

People often think that computers are smart, but a computer does exactly what it
is told, no more and no less. When a program is wrong, the machine is not
confused; it simply does the wrong thing very quickly and very reliably. The art
of programming is the art of being clear, because the machine will take you at
your word. A good programmer learns to think in small, careful steps.

Learning works in a similar way. You do not understand a hard idea all at once.
You take it apart, you find the simplest piece, and you make that piece solid
before you move on. Then the next piece is easier, because it rests on the first.
Knowledge is built from the bottom up, the same way a computer is built from the
bottom up, from electrons to logic gates to programs to the ideas we care about.

The world outside the machine is wide and old. A king once ruled a country, and
a queen ruled beside him. A man and a woman raised a son and a daughter. People
traveled from the city to the sea, over the mountains, along the river, under the
sun and the moon and the stars. They told stories at night about love and war,
about time and money, about the summer and the long cold winter.

Words carry meaning, and meaning lives in how words are used together. The word
king appears near throne and crown and rule; the word queen appears there too,
but also near woman and mother. A machine that reads enough text begins to place
words that share company close together, so that similar words end up in similar
places. That is the quiet idea behind modern language models: meaning from
company, pattern from repetition, structure from scale.

Every day the same common words return again and again: the, and, of, to, a, in,
that, it, is, was, for, on, with, as, at, by, this, from, they, we, you, he, she.
Because they are so common, a tokenizer learns to keep them whole, while a rare
or strange word gets broken into smaller pieces it has seen before. The machine
never really sees the letters; it sees the pieces, and it counts and predicts
over those pieces, one token at a time.
`;
