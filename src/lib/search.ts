// Global search — a static, offline index over everything the guide contains
// (CLAUDE.md §6: chapters, sections, key points, interview bank, katas, sims).
//
// PURE MODULE: no React, no DOM — imported by the ⌘K palette, the #/search
// page AND the Node truth-tests (scripts/test-search.ts). The index is built
// lazily on first query from the same data modules the app renders, so it can
// never drift from the content. Erasable-syntax only.
//
// Matching model (deliberately simple, no dependencies):
//   · query → lowercase word tokens;
//   · a doc matches only if EVERY query token hits (exact or prefix);
//   · score per token: title exact 6 · title prefix 3 · body exact 2 ·
//     body prefix 1, summed over tokens, plus a small kind boost so
//     chapters/parts surface above snippets. Ties break alphabetically.

import { CHAPTERS, PARTS, isStub } from "../data/curriculum.ts";
import { INTERVIEW } from "../data/interview.ts";
import { KATAS } from "../data/katas.ts";
import { BOSSES } from "../data/bosses.ts";

export type SearchDocKind = "chapter" | "part" | "keypoint" | "interview" | "kata" | "sim" | "boss";

export type SearchDoc = {
  id: string;
  kind: SearchDocKind;
  title: string;
  snippet: string;
  hash: string; // deep link (#/chapter/…, #/katas/…, #/interview/…)
  chapterId?: string;
  titleTokens: string[];
  bodyTokens: string[];
};

export type SearchHit = { doc: SearchDoc; score: number };

// ---------------------------------------------------------------------------
// Text → tokens
// ---------------------------------------------------------------------------

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "it",
  "on", "as", "for", "with", "that", "this", "at", "be", "by", "its",
]);

/** Strip the md we use in prose (emphasis, code ticks, links, headings). */
export function stripMd(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links/images → label
    .replace(/[*_#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const m = text.toLowerCase().match(/[a-z0-9]+/g);
  if (!m) return [];
  return m.filter((t) => t.length >= 2 && !STOP.has(t));
}

function uniqueTokens(text: string): string[] {
  return [...new Set(tokenize(text))];
}

function clip(text: string, max = 160): string {
  const s = stripMd(text);
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Index construction (lazy singleton)
// ---------------------------------------------------------------------------

function doc(
  id: string,
  kind: SearchDocKind,
  title: string,
  body: string,
  snippet: string,
  hash: string,
  chapterId?: string,
): SearchDoc {
  return {
    id,
    kind,
    title,
    snippet,
    hash,
    chapterId,
    titleTokens: uniqueTokens(title),
    bodyTokens: uniqueTokens(body),
  };
}

export function buildIndex(): SearchDoc[] {
  const docs: SearchDoc[] = [];

  for (const p of PARTS) {
    docs.push(doc(`part:${p.id}`, "part", p.name, `${p.tagline} ${p.blurb}`, clip(p.tagline), `#/part/${p.id}`));
  }

  for (const ch of CHAPTERS) {
    if (isStub(ch)) continue;
    const bodyParts: string[] = [ch.tagline, ch.mentalModel];
    if (ch.storyHook) bodyParts.push(ch.storyHook.md);
    for (const s of ch.sections) {
      if (s.kind === "prose" || s.kind === "formal") bodyParts.push(stripMd(s.kind === "prose" ? s.md : `${s.title} ${s.md}`));
      else if (s.kind === "callout") bodyParts.push(stripMd(`${s.title} ${s.md}`));
      else if (s.kind === "table") bodyParts.push([s.caption ?? "", ...s.head, ...s.rows.flat()].join(" "));
      else if (s.kind === "compare") bodyParts.push([s.a, s.b, ...s.rows.flat()].join(" "));
    }
    for (const pf of ch.pitfalls) bodyParts.push(`${pf.title} ${pf.body}`);
    docs.push(
      doc(`chapter:${ch.id}`, "chapter", ch.title, bodyParts.join(" "), clip(ch.tagline), `#/chapter/${ch.id}`, ch.id),
    );
    ch.keyPoints.forEach((kp, i) => {
      docs.push(doc(`kp:${ch.id}:${i}`, "keypoint", clip(kp, 90), kp, clip(kp), `#/chapter/${ch.id}`, ch.id));
    });
  }

  // every sim/figure is findable by its registry key; shared components
  // (ram-grid & co.) reappear across chapters — the FIRST host wins the link
  const seenSims = new Set<string>();
  for (const ch of CHAPTERS) {
    if (isStub(ch)) continue;
    for (const s of ch.sections) {
      if (s.kind !== "sim" && s.kind !== "figure") continue;
      const key = s.kind === "sim" ? s.sim : s.fig;
      if (seenSims.has(key)) continue;
      seenSims.add(key);
      docs.push(
        doc(`sim:${key}`, "sim", key.replace(/-/g, " "), `${key} ${ch.title} sim interactive`, `interactive in “${ch.title}”`, `#/chapter/${ch.id}`, ch.id),
      );
    }
  }

  for (const q of INTERVIEW) {
    docs.push(
      doc(`iv:${q.id}`, "interview", clip(q.q, 110), `${q.q} ${q.a} interview question`, `${q.level} · interview`, `#/interview/${q.chapterId}`, q.chapterId),
    );
  }

  for (const k of KATAS) {
    docs.push(
      doc(`kata:${k.id}`, "kata", k.title, `${k.id} ${k.prompt} ${k.tags.join(" ")} kata exercise`, `${k.difficulty} kata · ${k.tags.join(", ")}`, `#/katas/${k.id}`, k.chapterId),
    );
  }

  for (const b of BOSSES) {
    docs.push(
      doc(`boss:${b.id}`, "boss", `${b.icon} ${b.title}`, `${b.badge} ${b.blurb} boss challenge`, clip(b.blurb), `#/chapter/${b.hostChapterId}`, b.hostChapterId),
    );
  }

  return docs;
}

let INDEX: SearchDoc[] | null = null;
export function ensureIndex(): SearchDoc[] {
  if (INDEX === null) INDEX = buildIndex();
  return INDEX;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

const KIND_BOOST: Record<SearchDocKind, number> = {
  chapter: 3,
  part: 2,
  sim: 1,
  boss: 1,
  kata: 1,
  keypoint: 0,
  interview: 0,
};

function tokenScore(qt: string, titleTokens: string[], bodyTokens: string[]): number {
  let best = 0;
  for (const t of titleTokens) {
    if (t === qt) return 6;
    if (best < 3 && t.startsWith(qt)) best = 3;
  }
  for (const t of bodyTokens) {
    if (t === qt) {
      if (best < 2) best = 2;
    } else if (best < 1 && t.startsWith(qt)) best = 1;
  }
  return best;
}

export function search(query: string, limit = 20): SearchHit[] {
  const qTokens = tokenize(query);
  // stop-word-only queries ("the", "of") tokenize to [] — treat raw words as tokens then
  if (qTokens.length === 0) {
    const raw = query.toLowerCase().match(/[a-z0-9]+/g);
    if (!raw || raw.length === 0) return [];
    qTokens.push(...raw);
  }
  const hits: SearchHit[] = [];
  for (const d of ensureIndex()) {
    let score = 0;
    let all = true;
    for (const qt of qTokens) {
      const s = tokenScore(qt, d.titleTokens, d.bodyTokens);
      if (s === 0) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) hits.push({ doc: d, score: score + KIND_BOOST[d.kind] });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
  return hits.slice(0, limit);
}
