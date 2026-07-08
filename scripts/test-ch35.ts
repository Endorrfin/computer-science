// ch.35 · The whole picture — the grand-traversal integrity contract. The
// traversal is DATA that deep-links across the whole guide, so the test proves
// it stays honest: contiguous stages, every part/chapter/hero it names really
// exists and is live, each stage sits in the part it claims, all ten content
// parts are covered, and the boss gallery it aggregates is fully wired.
// Run: node --experimental-strip-types scripts/test-ch35.ts
import { STAGES, stageAt, partsCovered } from "../src/components/sims/capstone/traversal.ts";
import { PARTS, chapterById, partById, isStub } from "../src/data/curriculum.ts";
import { SIM_KEYS } from "../src/lib/registryKeys.ts";
import { BOSSES } from "../src/data/bosses.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

const simKeys = new Set<string>(SIM_KEYS);

// ===================== (A) traversal integrity =====================
{
  console.log("traversal · structure:");
  ok("has stages", STAGES.length >= 11, `count = ${STAGES.length}`);
  ok("indices are contiguous 0…n−1", STAGES.every((s, i) => s.index === i));
  ok("keys are unique", new Set(STAGES.map((s) => s.key)).size === STAGES.length);
  ok("stageAt round-trips", STAGES.every((s, i) => stageAt(i) === s) && stageAt(STAGES.length) === undefined);
  ok("every stage has non-empty prose", STAGES.every((s) => s.title.length > 0 && s.what.length > 20 && s.builtIn.length > 0));

  console.log("traversal · every reference resolves and is LIVE:");
  ok("every partId is a real part", STAGES.every((s) => partById(s.partId) !== undefined), STAGES.filter((s) => !partById(s.partId)).map((s) => s.partId).join(", "));
  ok("every chapterId is a real, non-stub chapter", STAGES.every((s) => { const c = chapterById(s.chapterId); return c !== undefined && !isStub(c); }), STAGES.filter((s) => { const c = chapterById(s.chapterId); return !c || isStub(c); }).map((s) => s.chapterId).join(", "));
  ok("each stage's chapter belongs to the stage's part", STAGES.every((s) => chapterById(s.chapterId)?.part === s.partId), STAGES.filter((s) => chapterById(s.chapterId)?.part !== s.partId).map((s) => `${s.chapterId}∈${chapterById(s.chapterId)?.part}≠${s.partId}`).join(", "));
  ok("every hostSim is a registered sim key", STAGES.every((s) => simKeys.has(s.hostSim)), STAGES.filter((s) => !simKeys.has(s.hostSim)).map((s) => s.hostSim).join(", "));

  console.log("traversal · coverage of the whole climb:");
  const covered = new Set(partsCovered());
  const contentParts = PARTS.filter((p) => p.id !== "p0" && p.id !== "p11").map((p) => p.id);
  ok("touches all ten content parts p1…p10", contentParts.every((p) => covered.has(p)), `missing: ${contentParts.filter((p) => !covered.has(p)).join(", ")}`);
  ok("opens at Information (a keypress → bits)", STAGES[0].partId === "p1");
  ok("closes at a rendered pixel (GPU stage)", STAGES[STAGES.length - 1].hostSim === "rasterizer-toy");
}

// ===================== (B) boss gallery is fully wired =====================
{
  console.log("boss gallery · the ten bosses the capstone aggregates:");
  ok("ten bosses, one per content part p1…p10", BOSSES.length === 10 && new Set(BOSSES.map((b) => b.part)).size === 10);
  ok("every boss host chapter exists and is live", BOSSES.every((b) => { const c = chapterById(b.hostChapterId); return c !== undefined && !isStub(c); }));
  ok("every boss hostSim is a registered sim", BOSSES.every((b) => simKeys.has(b.hostSim)));
  ok("every boss part resolves", BOSSES.every((b) => partById(b.part) !== undefined));
  ok("badges & icons are non-empty", BOSSES.every((b) => b.badge.length > 0 && b.icon.length > 0));
}

console.log(failed === 0 ? "\n✓ ch.35 capstone: all checks pass" : `\n✗ ch.35: ${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
