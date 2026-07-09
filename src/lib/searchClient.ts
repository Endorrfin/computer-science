// CHANGED: S19 — the browser side of search (lazy-load split).
//
// search.ts is pure & data-free; THIS module owns the async index singleton.
// The four data modules (~1 MB source) load via dynamic import the first time
// the palette / #/search page needs them — never with the app shell. The
// snapshot also carries the chapter titles + part accents the result rows
// render, so the UI needs no curriculum import of its own.

import { buildIndex } from "./search.ts";
import type { SearchDoc } from "./search.ts";
// Static on purpose: bosses.ts is ~3 KB and already eager via StackMap —
// a dynamic import here would be ineffective (Rolldown warns).
import { BOSSES } from "../data/bosses.ts";

export type SearchSnapshot = {
  docs: SearchDoc[];
  /** chapterId → chapter title (shown on keypoint/interview/kata/sim rows). */
  chapterTitle: Record<string, string>;
  /** chapterId → part accent color (row highlight). */
  chapterAccent: Record<string, string>;
  /** partId → accent color (part rows). */
  partAccent: Record<string, string>;
};

let snapshot: Promise<SearchSnapshot> | null = null;

export function ensureSearchIndex(): Promise<SearchSnapshot> {
  snapshot ??= Promise.all([
    import("../data/curriculum.ts"),
    import("../data/interview.ts"),
    import("../data/katas.ts"),
  ]).then(([curriculum, interview, katas]) => {
    const docs = buildIndex({
      parts: curriculum.PARTS,
      chapters: curriculum.CHAPTERS,
      interview: interview.INTERVIEW,
      katas: katas.KATAS,
      bosses: BOSSES,
    });
    const chapterTitle: Record<string, string> = {};
    const chapterAccent: Record<string, string> = {};
    const partAccent: Record<string, string> = {};
    for (const p of curriculum.PARTS) partAccent[p.id] = p.accent;
    for (const c of curriculum.CHAPTERS) {
      chapterTitle[c.id] = c.title;
      const accent = partAccent[c.part];
      if (accent !== undefined) chapterAccent[c.id] = accent;
    }
    return { docs, chapterTitle, chapterAccent, partAccent };
  });
  return snapshot;
}
