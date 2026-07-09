// Global-search truth-tests — tokenizer, md stripping, index coverage and
// integrity, ranking sanity, AND-semantics, prefix matching, deep-link shape.
// Deterministic, no DOM. Run: node --experimental-strip-types scripts/test-search.ts
// CHANGED: S19 — search.ts is data-free now; tests inject the data and bind
// a local `search` over one shared index (same shape the browser client uses).
import { buildIndex, searchIn, stripMd, tokenize } from "../src/lib/search.ts";
import { CHAPTERS, PARTS, isStub } from "../src/data/curriculum.ts";
import { INTERVIEW } from "../src/data/interview.ts";
import { KATAS } from "../src/data/katas.ts";
import { BOSSES } from "../src/data/bosses.ts";

const DATA = { parts: PARTS, chapters: CHAPTERS, interview: INTERVIEW, katas: KATAS, bosses: BOSSES };
const INDEX = buildIndex(DATA);
const search = (q: string, limit?: number) => searchIn(INDEX, q, limit);

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

// ===================== (A) text plumbing =====================
{
  console.log("tokenize / stripMd:");
  ok("lowercases and splits", tokenize("Two's Complement, 8-bit!").join(",") === "two,complement,bit"
    || tokenize("Two's Complement, 8-bit!").join(",") === "two,complement,8,bit",
    tokenize("Two's Complement, 8-bit!").join(","));
  ok("drops stop words", !tokenize("the cache of the CPU").includes("the"));
  ok("keeps numbers with letters", tokenize("utf8 http2").join(",") === "utf8,http2");
  ok("strips emphasis/code", stripMd("**bold** and `code` here") === "bold and code here");
  ok("strips links to labels", stripMd("[TCP](https://x.y) wins") === "TCP wins");
  ok("strips fenced blocks", !stripMd("before\n```ts\nconst x = 1;\n```\nafter").includes("const"));
}

// ===================== (B) index coverage & integrity =====================
{
  console.log("index:");
  const idx = INDEX; // CHANGED: S19 — built once above with injected data
  const live = CHAPTERS.filter((c) => !isStub(c));
  const kinds = (k: string) => idx.filter((d) => d.kind === k);
  ok("one doc per live chapter", kinds("chapter").length === live.length, `${kinds("chapter").length} vs ${live.length}`);
  ok("keypoints indexed", kinds("keypoint").length >= 200, `got ${kinds("keypoint").length}`);
  ok("every interview Q indexed", kinds("interview").length === INTERVIEW.length);
  ok("every kata indexed", kinds("kata").length === KATAS.length);
  ok("every boss indexed", kinds("boss").length === BOSSES.length);
  ok("doc ids unique", new Set(idx.map((d) => d.id)).size === idx.length);
  ok("every doc has a #/ deep link", idx.every((d) => d.hash.startsWith("#/")));
  // CHANGED: S19 — determinism: two builds over the same data agree exactly
  ok("buildIndex is deterministic", JSON.stringify(buildIndex(DATA)) === JSON.stringify(idx));
  const simDoc = idx.find((d) => d.id === "sim:huffman-lab");
  ok("sims indexed and linked to their host chapter", simDoc !== undefined && simDoc.hash === "#/chapter/ch3",
    simDoc?.hash);
}

// ===================== (C) query behaviour =====================
{
  console.log("query:");
  const cache = search("cache");
  ok("'cache' finds ch.8 among top hits", cache.slice(0, 6).some((h) => h.doc.chapterId === "ch8"),
    cache.slice(0, 6).map((h) => h.doc.id).join(", "));
  const huff = search("huffman");
  ok("'huffman' → ch.3 content first-ish", huff.slice(0, 5).some((h) => h.doc.chapterId === "ch3"));
  const tcp = search("tcp handshake");
  ok("multi-token is AND (all hits mention both)", tcp.length > 0 && tcp.every((h) => {
    const all = [...h.doc.titleTokens, ...h.doc.bodyTokens];
    return all.some((t) => t.startsWith("tcp")) && all.some((t) => t.startsWith("handshake"));
  }));
  ok("prefix works: 'deadlo' finds deadlock content", search("deadlo").length > 0);
  const exact = search("deadlock");
  ok("'deadlock' top hit is deadlock-titled content", exact[0] !== undefined && exact[0].doc.title.toLowerCase().includes("deadlock"),
    exact[0]?.doc.id);
  ok("'deadlock' also surfaces the ch.25 chapter doc (UI groups by kind)",
    exact.some((h) => h.doc.kind === "chapter" && (h.doc.chapterId === "ch25" || h.doc.chapterId === "ch24")),
    exact.map((h) => h.doc.id).join(", "));
  ok("garbage → no hits", search("qzxjvw").length === 0);
  ok("empty → no hits", search("   ").length === 0);
  ok("limit respected", search("the machine", 5).length <= 5);
  const kata = search("binary search kata");
  ok("katas findable", kata.some((h) => h.doc.kind === "kata"));
  const iv = search("head of line blocking");
  ok("interview bank findable + links to #/interview/<ch>", iv.some((h) => h.doc.kind === "interview" && h.doc.hash.startsWith("#/interview/")));
  ok("deterministic ordering", JSON.stringify(search("stack").map((h) => h.doc.id)) === JSON.stringify(search("stack").map((h) => h.doc.id)));
}

if (failed > 0) {
  console.error(`\ntest-search: ${failed} FAILED`);
  process.exit(1);
}
console.log("\ntest-search: all passed");
