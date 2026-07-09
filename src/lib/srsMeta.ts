// CHANGED: S19 — the due-badge's data path (lazy-load split).
//
// TopBar and StackMap show "N cards due" on every page load; before S19 that
// pulled the whole curriculum through srs.ts. Card IDS are enough to count
// due/new against the stored states, and they live in the generated meta —
// so the badge stays synchronous and content-free.

import { CHAPTERS_META, chapterMetaById } from "../data/curriculumMeta.gen.ts";
import { activeChapterIds, dueSummary } from "./srs.ts";
import type { DeckOverride, SrsStates } from "./srs.ts";

/** Card ids over the ACTIVE decks — same activation rule as the review hub. */
export function activeCardIds(
  doneIds: ReadonlySet<string>,
  overrides: Readonly<Record<string, DeckOverride>>,
): { id: string }[] {
  const active = activeChapterIds(CHAPTERS_META, doneIds, overrides);
  const ids: { id: string }[] = [];
  for (const chId of active) {
    const meta = chapterMetaById(chId);
    if (meta) for (const id of meta.cardIds) ids.push({ id });
  }
  return ids;
}

/** The one number the shell needs: how many cards are due right now. */
export function dueCount(
  doneIds: ReadonlySet<string>,
  overrides: Readonly<Record<string, DeckOverride>>,
  states: SrsStates,
  now: number,
): number {
  return dueSummary(activeCardIds(doneIds, overrides), states, now).due;
}
