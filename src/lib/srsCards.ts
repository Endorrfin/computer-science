// CHANGED: S19 — SRS deck building, split out of srs.ts (lazy-load split).
//
// This module pulls the FULL curriculum (keyPoints + mentalModel text), so it
// must never be imported from the always-loaded shell. Reach it only from
// lazy pages (ReviewPage) or via dynamic import. The due-badge counts cards
// without it (srsMeta.ts + meta cardIds).
//
// PURE MODULE: no React, no localStorage — also imported by the Node
// truth-tests (scripts/test-srs.ts). Erasable-syntax only.

import { CHAPTERS, chapterById, isStub } from "../data/curriculum.ts";
import { splitKeyPoint } from "./utils.ts";
import type { SrsCard } from "./srs.ts";

/** All flashcards of one chapter: keyPoints with a back side + the mental model. */
export function chapterCards(chapterId: string): SrsCard[] {
  const ch = chapterById(chapterId);
  if (!ch || isStub(ch)) return [];
  const cards: SrsCard[] = [];
  ch.keyPoints.forEach((kp, i) => {
    const { front, back } = splitKeyPoint(kp);
    if (back !== "") cards.push({ id: `${ch.id}:kp${i}`, chapterId: ch.id, front, back });
  });
  cards.push({
    id: `${ch.id}:mm`,
    chapterId: ch.id,
    front: `Redraw the mental model of “${ch.title}” from memory.`,
    back: ch.mentalModel,
  });
  return cards;
}

/** Every card in the guide, in curriculum order (the new-card order). */
export function allCards(): SrsCard[] {
  return CHAPTERS.filter((c) => !isStub(c)).flatMap((c) => chapterCards(c.id));
}
