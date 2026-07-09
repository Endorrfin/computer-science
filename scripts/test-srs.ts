// SRS engine truth-tests — the SM-2-lite scheduler, deck building/activation,
// the review queue, and the export/import envelope validator. Deterministic:
// `now` is always injected. Run: node --experimental-strip-types scripts/test-srs.ts
import {
  AGAIN_DELAY_MS, DAY_MS, MAX_INTERVAL_DAYS, MIN_EASE, MAX_EASE, START_EASE,
  activeChapterIds, allCards, buildQueue, chapterCards, dueSummary, gradeCard,
  isDue, isNew, previewIntervals,
} from "../src/lib/srs.ts";
import type { SrsCardState } from "../src/lib/srs.ts";
import { CHAPTERS, chapterById, isStub } from "../src/data/curriculum.ts";
import { parseImport } from "../src/lib/dataTransfer.ts";
import { sanitizeSrs } from "../src/lib/srsStore.ts";

let failed = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}
function eq(name: string, got: unknown, want: unknown): void {
  ok(name, Object.is(got, want), `got ${String(got)}  want ${String(want)}`);
}

const NOW = Date.UTC(2026, 6, 8, 12, 0, 0); // fixed clock

// ===================== (A) deck building =====================
{
  console.log("deck building:");
  const all = allCards();
  const live = CHAPTERS.filter((c) => !isStub(c));
  ok("every live chapter contributes a deck", new Set(all.map((c) => c.chapterId)).size === live.length);
  ok(">= 200 cards guide-wide", all.length >= 200, `got ${all.length}`);
  const ids = all.map((c) => c.id);
  ok("card ids unique", new Set(ids).size === ids.length);
  const ch4 = chapterCards("ch4");
  const kp = chapterById("ch4");
  ok("ch4 deck = splittable keyPoints + 1 mental-model card", kp !== undefined && ch4.length <= kp.keyPoints.length + 1 && ch4.length >= 2, `got ${ch4.length}`);
  const mm = ch4.find((c) => c.id === "ch4:mm");
  ok("mental-model card present with the chapter's model as back", mm !== undefined && mm.back === kp?.mentalModel);
  ok("no empty fronts/backs", all.every((c) => c.front.trim() !== "" && c.back.trim() !== ""));
  ok("unknown chapter → empty deck", chapterCards("nope").length === 0);
}

// ===================== (B) grading transitions =====================
{
  console.log("grading (SM-2-lite):");
  const first = gradeCard(undefined, "good", NOW);
  eq("new + good → 1 day", first.intervalDays, 1);
  eq("new + good → dueAt now + 1d", first.dueAt, NOW + DAY_MS);
  eq("new + good → reps 1", first.reps, 1);
  eq("ease starts at 2.5", first.ease, START_EASE);

  const second = gradeCard(first, "good", NOW);
  eq("2nd good → 3 days", second.intervalDays, 3);
  const third = gradeCard(second, "good", NOW);
  eq("3rd good → 3 × ease = 8 days (rounded 7.5)", third.intervalDays, Math.round(3 * START_EASE));

  const easy1 = gradeCard(undefined, "easy", NOW);
  eq("new + easy → 2 days", easy1.intervalDays, 2);
  ok("easy raises ease", easy1.ease > START_EASE);
  const hard1 = gradeCard(undefined, "hard", NOW);
  eq("new + hard → 1 day", hard1.intervalDays, 1);
  ok("hard lowers ease", hard1.ease < START_EASE);

  const lapse = gradeCard(third, "again", NOW);
  eq("again → reps reset", lapse.reps, 0);
  eq("again → lapse counted", lapse.lapses, 1);
  eq("again → due in 10 min", lapse.dueAt, NOW + AGAIN_DELAY_MS);
  ok("again lowers ease", lapse.ease < START_EASE);
  const newAgain = gradeCard(undefined, "again", NOW);
  eq("failing a NEW card is not a lapse", newAgain.lapses, 0);

  // ease floor & ceiling
  let s: SrsCardState | undefined;
  for (let i = 0; i < 30; i++) s = gradeCard(s, "again", NOW);
  ok("ease never below 1.3", (s as SrsCardState).ease >= MIN_EASE - 1e-9, `got ${(s as SrsCardState).ease}`);
  s = undefined;
  for (let i = 0; i < 30; i++) s = gradeCard(s, "easy", NOW);
  ok("ease never above 3.0", (s as SrsCardState).ease <= MAX_EASE + 1e-9, `got ${(s as SrsCardState).ease}`);
  ok("interval caps at 365 d", (s as SrsCardState).intervalDays <= MAX_INTERVAL_DAYS);

  // monotonicity: for one mature state, again < hard ≤ good ≤ easy next-due
  const mature: SrsCardState = { reps: 4, ease: 2.5, intervalDays: 10, dueAt: NOW, lapses: 0 };
  const nAgain = gradeCard(mature, "again", NOW).dueAt;
  const nHard = gradeCard(mature, "hard", NOW).dueAt;
  const nGood = gradeCard(mature, "good", NOW).dueAt;
  const nEasy = gradeCard(mature, "easy", NOW).dueAt;
  ok("again < hard ≤ good ≤ easy", nAgain < nHard && nHard <= nGood && nGood <= nEasy,
    `${nAgain} ${nHard} ${nGood} ${nEasy}`);
}

// ===================== (C) activation, queue, counts =====================
{
  console.log("deck activation & queue:");
  const done = new Set(["ch4", "ch5"]);
  const act1 = activeChapterIds(done, {});
  ok("done chapters active", act1.has("ch4") && act1.has("ch5") && !act1.has("ch6"));
  const act2 = activeChapterIds(done, { ch6: "on", ch4: "off" });
  ok("opt-in adds, opt-out beats done", act2.has("ch6") && !act2.has("ch4") && act2.has("ch5"));

  const cards = chapterCards("ch4");
  const a = cards[0].id;
  const b = cards[1].id;
  const states = {
    [a]: { reps: 1, ease: 2.5, intervalDays: 1, dueAt: NOW - DAY_MS, lapses: 0 }, // overdue
    [b]: { reps: 1, ease: 2.5, intervalDays: 1, dueAt: NOW + DAY_MS, lapses: 0 }, // tomorrow
  };
  const q = buildQueue(cards, states, NOW);
  eq("queue = overdue + all new (future excluded)", q.length, cards.length - 1);
  eq("overdue card first", q[0].id, a);
  ok("future card not in queue", q.every((c) => c.id !== b));
  ok("isDue/isNew agree", isDue(states[a], NOW) && !isDue(states[b], NOW) && isNew(undefined));

  const sum = dueSummary(cards, states, NOW);
  eq("summary.due", sum.due, 1);
  eq("summary.later", sum.later, 1);
  eq("summary.fresh", sum.fresh, cards.length - 2);
  eq("summary.total", sum.total, cards.length);

  const labels = previewIntervals(undefined, NOW);
  eq("preview: again label", labels.again, "10 min");
  eq("preview: good label", labels.good, "1 d");
  eq("preview: easy label", labels.easy, "2 d");
}

// ===================== (D) export/import envelope =====================
{
  console.log("parseImport:");
  ok("rejects non-JSON", !parseImport("not json").ok);
  ok("rejects wrong app marker", !parseImport(JSON.stringify({ app: "x", version: 1, data: {} })).ok);
  ok("rejects future version", !parseImport(JSON.stringify({ app: "cs-guide-progress", version: 2, data: {} })).ok);
  ok("rejects missing data", !parseImport(JSON.stringify({ app: "cs-guide-progress", version: 1 })).ok);

  const good = parseImport(JSON.stringify({
    app: "cs-guide-progress", version: 1, exportedAt: "2026-07-08T00:00:00Z",
    data: {
      progress: { done: ["ch4", "ch5"], lens: "senior", quiz: { "gate-predict": [1] }, challenges: ["boss-p2"] },
      srs: { cards: { "ch4:kp0": { reps: 1, ease: 2.5, intervalDays: 1, dueAt: 1, lapses: 0 } }, decks: { ch6: "on" } },
      kataSolved: ["binary-search"],
      kataDrafts: { "binary-search": "function binarySearch() {}" },
    },
  }));
  ok("accepts a well-formed bundle", good.ok);
  if (good.ok) {
    eq("summary chaptersDone", good.summary.chaptersDone, 2);
    eq("summary quizzesAnswered", good.summary.quizzesAnswered, 1);
    eq("summary badges", good.summary.badges, 1);
    eq("summary cardsScheduled", good.summary.cardsScheduled, 1);
    eq("summary katasSolved", good.summary.katasSolved, 1);
    eq("summary kataDrafts", good.summary.kataDrafts, 1);
  }

  console.log("sanitizeSrs:");
  const dirty = sanitizeSrs({
    cards: { good: { reps: 1, ease: 2.5, intervalDays: 1, dueAt: 1, lapses: 0 }, bad: { reps: "x" } },
    decks: { ch4: "on", ch5: "sideways", ch6: "off" },
  });
  eq("keeps valid cards, drops malformed", Object.keys(dirty.cards).join(","), "good");
  eq("keeps only on/off overrides", Object.keys(dirty.decks).sort().join(","), "ch4,ch6");
  eq("garbage → empty state", JSON.stringify(sanitizeSrs("junk")), JSON.stringify({ cards: {}, decks: {} }));
}

if (failed > 0) {
  console.error(`\ntest-srs: ${failed} FAILED`);
  process.exit(1);
}
console.log("\ntest-srs: all passed");
