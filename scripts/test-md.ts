// Regression test for the inline markdown tokenizer (src/lib/mdInline.ts).
// This exists because a shared /g regex + recursion infinite-looped on any
// **bold** text and crashed the browser tab (S2). If that regresses, this
// test HANGS (CI timeout) or fails an assertion — never ships silently again.
import { tokenizeInline } from "../src/lib/mdInline.ts";
import type { InlineTok } from "../src/lib/mdInline.ts";

let failed = 0;
function ok(name: string, cond: boolean): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

/** Flatten tokens back to their visible text — a simple structural check. */
function flatten(toks: InlineTok[]): string {
  return toks
    .map((t) => {
      switch (t.t) {
        case "text":
        case "code":
        case "em":
          return t.v;
        case "link":
          return t.text;
        case "strong":
          return flatten(t.children);
      }
    })
    .join("");
}
const kinds = (toks: InlineTok[]): string[] => toks.map((t) => t.t);

// ---- the crash cases: must TERMINATE (the whole point) ----
ok("bold terminates: 'a **b** c'", flatten(tokenizeInline("a **b** c")) === "a b c");
ok("bold-only terminates: '**AND, OR, NOT**'", flatten(tokenizeInline("**AND, OR, NOT**")) === "AND, OR, NOT");
ok("bold mid-sentence terminates", flatten(tokenizeInline("meet the **gate zoo** below")) === "meet the gate zoo below");
ok("multiple bolds terminate", kinds(tokenizeInline("**a** and **b**")).join(",") === "strong,text,strong");
ok("bold with inner code terminates", flatten(tokenizeInline("**a `c` b** end")) === "a c b end");
const long = "The **M1 Max** carries **57 billion** transistors; every one is a **switch**, and `1 - (a & b)` is a NAND.";
ok("long multi-bold string terminates", flatten(tokenizeInline(long)) === "The M1 Max carries 57 billion transistors; every one is a switch, and 1 - (a & b) is a NAND.");

// ---- correctness of each token kind ----
ok("plain text", kinds(tokenizeInline("no markers here")).join(",") === "text");
ok("bold → strong", kinds(tokenizeInline("**x**")).join(",") === "strong");
ok("italic → em", kinds(tokenizeInline("type *italic* here")).join(",") === "text,em,text");
ok("code → code", kinds(tokenizeInline("`z` only")).join(",") === "code,text");
{
  const toks = tokenizeInline("[Shannon](https://example.com) wrote");
  const link = toks[0];
  ok("link parses href + text", link.t === "link" && link.href === "https://example.com" && link.text === "Shannon");
}
{
  const toks = tokenizeInline("**bold `code`**");
  ok("nested code inside bold", toks[0].t === "strong" && toks[0].t === "strong" && flatten(toks) === "bold code");
}

if (failed > 0) {
  console.error(`\n✗ ${failed} markdown test(s) failed`);
  process.exit(1);
}
console.log("✓ inline markdown tokenizer tests pass (no infinite recursion)");
