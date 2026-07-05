// qa:interactivity — the binding Interactivity-mandate gate (CLAUDE.md §6)
// + data integrity. Runs in Node via --experimental-strip-types; fails CI
// on any violation. Stub chapters (sections.length === 0) are exempt from
// the mandate but still checked for referential integrity.
import { CHAPTERS, PARTS, chapterById, isStub, partById } from "../src/data/curriculum.ts";
import { QUIZZES, quizById } from "../src/data/quizzes.ts";
import { INTERVIEW } from "../src/data/interview.ts";
import { BOSSES, bossById } from "../src/data/bosses.ts";
import { KATAS } from "../src/data/katas.ts";
import { FIG_KEYS, SIM_KEYS } from "../src/lib/registryKeys.ts";

const errors: string[] = [];
const warnings: string[] = [];
const err = (msg: string) => errors.push(msg);
const warn = (msg: string) => warnings.push(msg);

// ---------- global integrity ----------
{
  const partIds = new Set<string>();
  for (const p of PARTS) {
    if (partIds.has(p.id)) err(`duplicate part id: ${p.id}`);
    partIds.add(p.id);
    if (p.bossId) {
      const boss = bossById(p.bossId);
      if (!boss) err(`${p.id}: bossId ${p.bossId} not found in BOSSES`);
      else if (boss.part !== p.id) err(`${p.id}: boss ${p.bossId} belongs to ${boss.part}`);
    }
  }
  const chIds = new Set<string>();
  const orders = new Set<number>();
  for (const c of CHAPTERS) {
    if (chIds.has(c.id)) err(`duplicate chapter id: ${c.id}`);
    chIds.add(c.id);
    if (orders.has(c.order)) err(`${c.id}: duplicate global order ${c.order}`);
    orders.add(c.order);
    if (!partById(c.part)) err(`${c.id}: unknown part ${c.part}`);
    if (isStub(c) && c.plannedSession === undefined) err(`${c.id}: stub without plannedSession`);
    for (const a of c.assumes) {
      if (!chapterById(a.chapterId)) err(`${c.id}: assumes unknown chapter ${a.chapterId}`);
    }
    for (const s of c.seeAlso) {
      if (!chapterById(s)) err(`${c.id}: seeAlso unknown chapter ${s}`);
    }
    for (const iv of c.interviewIds) {
      const q = INTERVIEW.find((x) => x.id === iv);
      if (!q) err(`${c.id}: interview id ${iv} not found`);
      else if (q.chapterId !== c.id) err(`${c.id}: interview ${iv} is tagged to ${q.chapterId}`);
    }
    for (const kid of c.kataIds) {
      const kata = KATAS.find((x) => x.id === kid);
      if (!kata) err(`${c.id}: kata id ${kid} not found`);
      else if (kata.chapterId !== c.id) err(`${c.id}: kata ${kid} is tagged to ${kata.chapterId}`);
    }
  }
  for (const b of BOSSES) {
    if (!chapterById(b.hostChapterId)) err(`boss ${b.id}: unknown host chapter ${b.hostChapterId}`);
    if (!partById(b.part)) err(`boss ${b.id}: unknown part ${b.part}`);
  }
  const quizIds = new Set<string>();
  for (const q of QUIZZES) {
    if (quizIds.has(q.id)) err(`duplicate quiz id: ${q.id}`);
    quizIds.add(q.id);
    if (!chapterById(q.chapterId)) err(`quiz ${q.id}: unknown chapter ${q.chapterId}`);
    q.questions.forEach((qq, i) => {
      if (qq.answer < 0 || qq.answer >= qq.options.length) err(`quiz ${q.id} #${i}: answer index out of range`);
    });
  }
  const kataIds = new Set<string>();
  for (const k of KATAS) {
    if (kataIds.has(k.id)) err(`duplicate kata id: ${k.id}`);
    kataIds.add(k.id);
    if (!chapterById(k.chapterId)) err(`kata ${k.id}: unknown chapter ${k.chapterId}`);
    if (!k.exportName || k.tests.length === 0) err(`kata ${k.id}: missing exportName or tests`);
  }
}

// ---------- the Interactivity mandate (non-stub chapters) ----------
const simKeySet = new Set<string>(SIM_KEYS);
const figKeySet = new Set<string>(FIG_KEYS);
const usedSims = new Set<string>();
const usedFigs = new Set<string>();
const usedQuizzes = new Set<string>();

for (const c of CHAPTERS.filter((x) => !isStub(x))) {
  let sims = 0;
  let figs = 0;
  let quizzes = 0;
  let proseRun = 0;
  let maxProseRun = 0;
  for (const s of c.sections) {
    if (s.kind === "prose") {
      proseRun++;
      maxProseRun = Math.max(maxProseRun, proseRun);
    } else {
      proseRun = 0;
    }
    if (s.kind === "sim") {
      sims++;
      usedSims.add(s.sim);
      if (!simKeySet.has(s.sim)) err(`${c.id}: sim key '${s.sim}' missing from registryKeys.ts`);
    }
    if (s.kind === "figure") {
      figs++;
      usedFigs.add(s.fig);
      if (!figKeySet.has(s.fig)) err(`${c.id}: figure key '${s.fig}' missing from registryKeys.ts`);
    }
    if (s.kind === "quiz") {
      quizzes++;
      usedQuizzes.add(s.quiz);
      if (!quizById(s.quiz)) err(`${c.id}: quiz key '${s.quiz}' not found in quizzes.ts`);
    }
  }
  if (sims + figs === 0) err(`${c.id}: MANDATE — no sim or steppable figure`);
  if (quizzes === 0) err(`${c.id}: MANDATE — no predict-quiz`);
  if (maxProseRun > 2) err(`${c.id}: MANDATE — ${maxProseRun} consecutive prose sections (max 2 before an interactive)`);
  if (c.keyPoints.length < 5) err(`${c.id}: quality floor — ${c.keyPoints.length} keyPoints (<5)`);
  for (const kp of c.keyPoints) {
    if (!kp.includes(" — ")) err(`${c.id}: keyPoint missing "front — back" separator: "${kp.slice(0, 40)}…"`);
  }
  if (c.pitfalls.length < 3) err(`${c.id}: quality floor — ${c.pitfalls.length} pitfalls (<3)`);
  if (c.sources.length < 2) err(`${c.id}: quality floor — ${c.sources.length} sources (<2)`);
  if (c.mentalModel.trim() === "") err(`${c.id}: quality floor — empty mentalModel`);
}

for (const k of SIM_KEYS) if (!usedSims.has(k)) warn(`registry sim '${k}' referenced by no chapter`);
for (const k of FIG_KEYS) if (!usedFigs.has(k)) warn(`registry figure '${k}' referenced by no chapter`);
for (const q of QUIZZES) if (!usedQuizzes.has(q.id)) warn(`quiz '${q.id}' referenced by no chapter`);

// ---------- report ----------
const live = CHAPTERS.filter((c) => !isStub(c)).length;
console.log(`qa:interactivity — ${CHAPTERS.length} chapters (${live} live), ${PARTS.length} parts, ` +
  `${SIM_KEYS.length} sims, ${FIG_KEYS.length} figures, ${QUIZZES.length} quizzes, ${BOSSES.length} bosses, ${INTERVIEW.length} interview Qs, ${KATAS.length} katas`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} violation(s):`);
  for (const e of errors) console.error(`  – ${e}`);
  process.exit(1);
}
console.log("✓ interactivity mandate & data integrity hold");
