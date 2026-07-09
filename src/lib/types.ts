// ============================================================
// The content contract — CLAUDE.md §4. Single source of truth
// for every chapter's shape. Data modules must stay erasable-
// syntax-only (no enums/namespaces): the qa gate runs them in
// Node via --experimental-strip-types.
// ============================================================

export type Lens = "foundations" | "senior" | "both";

/** The reader-side lens toggle (content-side 'both' never appears here). */
export type ViewLens = "foundations" | "senior";

export type Part = {
  id: string;
  order: number;
  name: string;
  accent: string; // spectrum color (§7)
  tagline: string;
  blurb: string;
  bossId?: string; // capstone challenge (§6)
};

export type Section = (
  | { kind: "prose"; md: string }
  | { kind: "figure"; fig: string; caption?: string } // steppable animated SVG component
  | { kind: "sim"; sim: string } // interactive widget registry key
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "code"; lang: "ts" | "c" | "py" | "asm" | "sql" | "pseudo"; code: string; note?: string }
  | { kind: "callout"; tone: "tip" | "warn" | "senior" | "story"; title: string; md: string }
  | { kind: "formal"; title: string; md: string } // collapsible Formal corner
  | { kind: "quiz"; quiz: string } // predict-the-behavior widget key
  | { kind: "compare"; a: string; b: string; rows: [string, string, string][] }
) & { lens?: Lens }; // default 'both'

export type Chapter = {
  id: string;
  part: string;
  order: number;
  title: string;
  tagline: string;
  readMins: { foundations: number; senior: number };
  /** Stub chapters only: which session (CLAUDE.md §12) builds this chapter. */
  plannedSession?: number;
  storyHook?: { md: string }; // the history/narrative opener
  assumes: { chapterId: string; oneLiner: string }[]; // RecapBox — NOT prerequisites
  mentalModel: string; // the one picture to redraw from memory
  sections: Section[];
  /** "front — back" convention: text before the first " — " is the flashcard
      front, the rest is the back. Renders as a plain statement elsewhere. */
  keyPoints: string[];
  pitfalls: { title: string; body: string; lens: Lens }[];
  interviewIds: string[];
  kataIds: string[];
  seeAlso: string[];
  sources: { title: string; url: string }[];
};

// CHANGED: S19 — light landing-path metadata (curriculumMeta.gen.ts). The
// landing (TopBar/Footer/StackMap) renders from this instead of the full
// curriculum, so the ~½ MB content module loads only when a chapter,
// review, search or study page actually needs it.
export type ChapterMeta = {
  id: string;
  part: string;
  order: number;
  title: string;
  tagline: string;
  stub: boolean;
  plannedSession?: number;
  /** SRS card ids of this chapter (keyPoints with a back + the :mm card) —
      lets the due-badge count cards without loading chapter content. */
  cardIds: string[];
};

export type QuizDef = {
  id: string;
  chapterId: string;
  questions: {
    prompt: string;
    options: string[];
    answer: number; // index into options
    explain: string; // markdown, shown on reveal
  }[];
};

export type BossDef = {
  id: string;
  part: string;
  title: string;
  badge: string; // badge name, e.g. "Machine Whisperer"
  icon: string; // single emoji/glyph for the badge
  hostChapterId: string;
  hostSim: string; // registry key of the hero that hosts it
  blurb: string;
  plannedSession: number;
};

export type InterviewQ = {
  id: string;
  chapterId: string;
  level: "mid" | "senior" | "staff";
  q: string;
  a: string; // markdown
};
