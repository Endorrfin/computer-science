// SRS engine — SM-2-lite scheduling for the review hub (CLAUDE.md §6.3).
//
// PURE MODULE: deterministic functions over plain data, `now` always injected —
// imported by BOTH the browser store (srsStore.ts) and the Node truth-tests
// (scripts/test-srs.ts). No React, no localStorage, no Date.now() here.
// Erasable-syntax only (runs under --experimental-strip-types).
//
// The model (a deliberately small SM-2):
//   · a card is born "new" (no state). Grading it creates state.
//   · again → lapse: reps reset, ease −0.20 (floor 1.3), come back in 10 min;
//   · hard  → reps++, ease −0.15 (floor 1.3), interval grows ×1.2 (min 1 day);
//   · good  → reps++, ease unchanged, interval 1d → 3d → ×ease;
//   · easy  → reps++, ease +0.15 (cap 3.0), interval 2d → 5d → ×ease×1.3.
//   Intervals cap at 365 days. Fractional days round to the nearest whole day.
//
// Decks: a chapter's deck = its keyPoints (front — back convention) + one
// "redraw the mental model" card. A deck is ACTIVE when its chapter is marked
// done, or when the user opts it in from the hub; an explicit opt-out always
// wins (review only the parts you study — §6).

// CHANGED: S19 — this module is now CONTENT-FREE (no curriculum import): the
// always-loaded due-badge (TopBar/StackMap) only needs the scheduler + counts.
// Card BUILDING (keyPoints → fronts/backs) moved to srsCards.ts, which pulls
// the full curriculum and is reached only from lazy pages / dynamic import.

export type SrsGrade = "again" | "hard" | "good" | "easy";

export type SrsCardState = {
  reps: number; // successful recalls in a row (0 = learning/lapsed)
  ease: number; // SM-2 ease factor, 1.3 … 3.0
  intervalDays: number; // last scheduled interval (0 = re-learn today)
  dueAt: number; // epoch ms
  lapses: number; // times the card fell back to "again"
};

export type SrsCard = {
  id: string; // `${chapterId}:kp${i}` | `${chapterId}:mm`
  chapterId: string;
  front: string;
  back: string;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const AGAIN_DELAY_MS = 10 * 60 * 1000; // re-learn in 10 minutes
export const MAX_INTERVAL_DAYS = 365;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const START_EASE = 2.5;

// CHANGED: S19 — deck building (chapterCards / allCards) lives in srsCards.ts;
// deck ACTIVATION stays here because it only needs meta-level stub flags.

export type DeckOverride = "on" | "off";

/** Which decks are active, over any chapter list that knows its stub status.
    Done chapters are in; an explicit override always wins (§6). */
export function activeChapterIds(
  chapters: readonly { id: string; stub: boolean }[],
  doneIds: ReadonlySet<string>,
  overrides: Readonly<Record<string, DeckOverride>>,
): Set<string> {
  const active = new Set<string>();
  for (const ch of chapters) {
    if (ch.stub) continue;
    const ov = overrides[ch.id];
    if (ov === "off") continue;
    if (ov === "on" || doneIds.has(ch.id)) active.add(ch.id);
  }
  return active;
}

// ---------------------------------------------------------------------------
// Scheduling — one pure transition.
// ---------------------------------------------------------------------------

function clampEase(e: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, e));
}
function clampInterval(d: number): number {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(d)));
}

/** Grade a card (undefined state = first ever grade) → its next state. */
export function gradeCard(state: SrsCardState | undefined, grade: SrsGrade, now: number): SrsCardState {
  const s: SrsCardState = state ?? {
    reps: 0,
    ease: START_EASE,
    intervalDays: 0,
    dueAt: now,
    lapses: 0,
  };

  if (grade === "again") {
    return {
      reps: 0,
      ease: clampEase(s.ease - 0.2),
      intervalDays: 0,
      dueAt: now + AGAIN_DELAY_MS,
      lapses: s.lapses + (s.reps > 0 ? 1 : 0),
    };
  }

  const reps = s.reps + 1;
  let ease = s.ease;
  let interval: number;
  if (grade === "hard") {
    ease = clampEase(s.ease - 0.15);
    interval = reps === 1 ? 1 : clampInterval(s.intervalDays * 1.2);
  } else if (grade === "good") {
    interval = reps === 1 ? 1 : reps === 2 ? 3 : clampInterval(s.intervalDays * s.ease);
  } else {
    ease = clampEase(s.ease + 0.15);
    interval = reps === 1 ? 2 : reps === 2 ? 5 : clampInterval(s.intervalDays * s.ease * 1.3);
  }
  return { reps, ease, intervalDays: interval, dueAt: now + interval * DAY_MS, lapses: s.lapses };
}

// ---------------------------------------------------------------------------
// Queue & counts — what the hub shows.
// ---------------------------------------------------------------------------

export type SrsStates = Readonly<Record<string, SrsCardState>>;

export function isDue(state: SrsCardState | undefined, now: number): boolean {
  return state !== undefined && state.dueAt <= now;
}
export function isNew(state: SrsCardState | undefined): boolean {
  return state === undefined;
}

/** Review queue over the ACTIVE decks: due first (oldest due first), then new
    cards in curriculum order. Cards graded into the future are excluded. */
export function buildQueue(cards: SrsCard[], states: SrsStates, now: number): SrsCard[] {
  const due = cards
    .filter((c) => isDue(states[c.id], now))
    .sort((a, b) => (states[a.id]?.dueAt ?? 0) - (states[b.id]?.dueAt ?? 0));
  const fresh = cards.filter((c) => isNew(states[c.id]));
  return [...due, ...fresh];
}

export type DueSummary = { due: number; fresh: number; later: number; total: number };

// CHANGED: S19 — counts only need ids, so the badge can run on meta cardIds.
export function dueSummary(cards: readonly { id: string }[], states: SrsStates, now: number): DueSummary {
  let due = 0;
  let fresh = 0;
  let later = 0;
  for (const c of cards) {
    const s = states[c.id];
    if (s === undefined) fresh++;
    else if (s.dueAt <= now) due++;
    else later++;
  }
  return { due, fresh, later, total: cards.length };
}

/** Human label for the next interval each grade would schedule ("10 min", "3 d"). */
export function previewIntervals(state: SrsCardState | undefined, now: number): Record<SrsGrade, string> {
  const label = (g: SrsGrade): string => {
    const next = gradeCard(state, g, now);
    const ms = next.dueAt - now;
    if (ms < DAY_MS) return `${Math.round(ms / 60000)} min`;
    const d = Math.round(ms / DAY_MS);
    return d >= 30 ? `${(d / 30).toFixed(d % 30 === 0 ? 0 : 1)} mo` : `${d} d`;
  };
  return { again: label("again"), hard: label("hard"), good: label("good"), easy: label("easy") };
}
