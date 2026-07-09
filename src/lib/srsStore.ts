// SRS user state — localStorage-backed store for the review hub, in the same
// tiny external-store + useSyncExternalStore style as progress.ts. All the
// SCHEDULING MATH lives in srs.ts (pure, Node-tested); this file only holds
// per-card states + per-deck overrides and re-renders subscribers on change.
import { useSyncExternalStore } from "react";
import type { DeckOverride, SrsCardState, SrsGrade } from "./srs.ts";
import { gradeCard } from "./srs.ts";

export const SRS_KEY = "csguide.srs.v1";

export type SrsPersisted = {
  cards: Record<string, SrsCardState>;
  decks: Record<string, DeckOverride>;
};

const DEFAULTS: SrsPersisted = { cards: {}, decks: {} };

function isCardState(v: unknown): v is SrsCardState {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.reps === "number" &&
    typeof c.ease === "number" &&
    typeof c.intervalDays === "number" &&
    typeof c.dueAt === "number" &&
    typeof c.lapses === "number"
  );
}

/** Parse + validate a raw persisted blob (shared with import — dataTransfer.ts). */
export function sanitizeSrs(raw: unknown): SrsPersisted {
  if (typeof raw !== "object" || raw === null) return { cards: {}, decks: {} };
  const p = raw as Partial<SrsPersisted>;
  const cards: Record<string, SrsCardState> = {};
  if (p.cards && typeof p.cards === "object") {
    for (const [id, st] of Object.entries(p.cards)) if (isCardState(st)) cards[id] = st;
  }
  const decks: Record<string, DeckOverride> = {};
  if (p.decks && typeof p.decks === "object") {
    for (const [id, ov] of Object.entries(p.decks)) if (ov === "on" || ov === "off") decks[id] = ov;
  }
  return { cards, decks };
}

function load(): SrsPersisted {
  try {
    const raw = localStorage.getItem(SRS_KEY);
    if (!raw) return { ...DEFAULTS };
    return sanitizeSrs(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

let state: SrsPersisted = load();
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(state));
  } catch {
    /* private mode — state stays in memory */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const getVersion = (): number => version;

function useStore<T>(selector: () => T): T {
  useSyncExternalStore(subscribe, getVersion);
  return selector();
}

// ---- hooks & actions ------------------------------------------------------

export function useSrsCards(): Readonly<Record<string, SrsCardState>> {
  return useStore(() => state.cards);
}
export function useDeckOverrides(): Readonly<Record<string, DeckOverride>> {
  return useStore(() => state.decks);
}

export function gradeCardAction(cardId: string, grade: SrsGrade, now = Date.now()): void {
  const next = gradeCard(state.cards[cardId], grade, now);
  state = { ...state, cards: { ...state.cards, [cardId]: next } };
  emit();
}

/** Override a deck: "on" (study before finishing), "off" (mute), null (follow done-status). */
export function setDeckOverride(chapterId: string, ov: DeckOverride | null): void {
  const decks = { ...state.decks };
  if (ov === null) delete decks[chapterId];
  else decks[chapterId] = ov;
  state = { ...state, decks };
  emit();
}

/** Forget scheduling for one chapter's cards (used when muting a deck entirely). */
export function resetChapterCards(chapterId: string): void {
  const cards: Record<string, SrsCardState> = {};
  let changed = false;
  for (const [id, st] of Object.entries(state.cards)) {
    if (id.startsWith(`${chapterId}:`)) changed = true;
    else cards[id] = st;
  }
  if (!changed) return;
  state = { ...state, cards };
  emit();
}

// ---- raw access for export/import (dataTransfer.ts) ------------------------

export function getSrsRaw(): SrsPersisted {
  return state;
}
export function replaceSrs(next: unknown): void {
  state = sanitizeSrs(next);
  emit();
}
