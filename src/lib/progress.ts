// User state — localStorage only (CLAUDE.md §2): chapter completion,
// lens preference, quiz answers, in-sim challenge badges.
// Tiny external store + useSyncExternalStore hooks.
import { useSyncExternalStore } from "react";
import type { ViewLens } from "./types.ts";

const KEY = "csguide.v1";

type Persisted = {
  done: string[]; // completed chapter ids
  lens: ViewLens;
  quiz: Record<string, number[]>; // quizId -> committed answer per question
  challenges: string[]; // completed in-sim challenge ids
};

const DEFAULTS: Persisted = { done: [], lens: "foundations", quiz: {}, challenges: [] };

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      done: Array.isArray(p.done) ? p.done : [],
      lens: p.lens === "senior" ? "senior" : "foundations",
      quiz: p.quiz && typeof p.quiz === "object" ? (p.quiz as Persisted["quiz"]) : {},
      challenges: Array.isArray(p.challenges) ? p.challenges : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let state: Persisted = load();
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
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

/** Re-render on any store change; read fresh state via selector. */
function useStore<T>(selector: () => T): T {
  useSyncExternalStore(subscribe, getVersion);
  return selector();
}

// ---- lens ----
export function useLens(): [ViewLens, (l: ViewLens) => void] {
  const lens = useStore(() => state.lens);
  return [lens, setLens];
}
export function setLens(l: ViewLens): void {
  if (state.lens !== l) {
    state = { ...state, lens: l };
    emit();
  }
}

// ---- chapter completion ----
export function useDoneSet(): ReadonlySet<string> {
  return useStore(() => new Set(state.done));
}
export function useChapterDone(id: string): [boolean, (done: boolean) => void] {
  const done = useStore(() => state.done.includes(id));
  return [done, (d) => setChapterDone(id, d)];
}
export function setChapterDone(id: string, done: boolean): void {
  const has = state.done.includes(id);
  if (done && !has) state = { ...state, done: [...state.done, id] };
  else if (!done && has) state = { ...state, done: state.done.filter((c) => c !== id) };
  else return;
  emit();
}

// ---- quizzes ----
export function useQuizAnswers(quizId: string): [number[] | undefined, (answers: number[]) => void] {
  const a = useStore(() => state.quiz[quizId]);
  return [a, (answers) => commitQuiz(quizId, answers)];
}
export function commitQuiz(quizId: string, answers: number[]): void {
  state = { ...state, quiz: { ...state.quiz, [quizId]: answers } };
  emit();
}
export function clearQuiz(quizId: string): void {
  if (quizId in state.quiz) {
    const quiz = { ...state.quiz };
    delete quiz[quizId];
    state = { ...state, quiz };
    emit();
  }
}

// ---- in-sim challenges ----
export function useChallengesDone(): ReadonlySet<string> {
  return useStore(() => new Set(state.challenges));
}
export function markChallengeDone(id: string): void {
  if (!state.challenges.includes(id)) {
    state = { ...state, challenges: [...state.challenges, id] };
    emit();
  }
}
