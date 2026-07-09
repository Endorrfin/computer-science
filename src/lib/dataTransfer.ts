// Progress export / import — one JSON file for ALL local state (CLAUDE.md §6:
// "progress model — export/import JSON"). localStorage is the only backend
// (§2), so this file is the user's backup/migration path between browsers.
//
// The bundle carries the RAW persisted blobs. On import we write them back and
// reload: every store (progress.ts, srsStore.ts, the kata solved-set) already
// sanitizes whatever it finds in localStorage on load, so a hand-edited or
// stale file can degrade gracefully but can never crash the app.
//
// parseImport() is PURE (no DOM) and truth-tested in scripts/test-srs.ts;
// the localStorage/Blob plumbing lives in the browser-only helpers below it.

export const PROGRESS_KEY = "csguide.v1";
export const SRS_STORAGE_KEY = "csguide.srs.v1";
export const KATA_SOLVED_KEY = "cs:kata-solved";
export const KATA_DRAFT_PREFIX = "cs:kata:";
export const IV_SEEN_KEY = "cs:iv-seen";

export type ExportBundle = {
  app: "cs-guide-progress";
  version: 1;
  exportedAt: string; // ISO
  data: {
    progress?: unknown; // csguide.v1 blob (done/lens/quiz/challenges)
    srs?: unknown; // csguide.srs.v1 blob (cards/decks)
    kataSolved?: unknown; // cs:kata-solved blob (string[])
    kataDrafts?: Record<string, string>; // kataId -> editor buffer
    interviewSeen?: unknown; // cs:iv-seen blob (string[])
  };
};

export type ImportSummary = {
  chaptersDone: number;
  quizzesAnswered: number;
  badges: number;
  cardsScheduled: number;
  katasSolved: number;
  kataDrafts: number;
};

// ---------------------------------------------------------------------------
// Pure: validate an uploaded file → bundle + human summary
// ---------------------------------------------------------------------------

export function parseImport(json: string): { ok: true; bundle: ExportBundle; summary: ImportSummary } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not a JSON file." };
  }
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Not a progress file (expected a JSON object)." };
  const b = raw as Partial<ExportBundle>;
  if (b.app !== "cs-guide-progress") return { ok: false, error: "Not a CS-guide progress file (missing app marker)." };
  if (b.version !== 1) return { ok: false, error: `Unsupported version ${String(b.version)} (this build reads v1).` };
  if (typeof b.data !== "object" || b.data === null) return { ok: false, error: "Progress file has no data section." };

  const d = b.data;
  const progress = (typeof d.progress === "object" && d.progress !== null ? d.progress : {}) as Record<string, unknown>;
  const srs = (typeof d.srs === "object" && d.srs !== null ? d.srs : {}) as Record<string, unknown>;
  const summary: ImportSummary = {
    chaptersDone: Array.isArray(progress.done) ? progress.done.length : 0,
    quizzesAnswered: typeof progress.quiz === "object" && progress.quiz !== null ? Object.keys(progress.quiz).length : 0,
    badges: Array.isArray(progress.challenges) ? progress.challenges.length : 0,
    cardsScheduled: typeof srs.cards === "object" && srs.cards !== null ? Object.keys(srs.cards).length : 0,
    katasSolved: Array.isArray(d.kataSolved) ? d.kataSolved.length : 0,
    kataDrafts: typeof d.kataDrafts === "object" && d.kataDrafts !== null ? Object.keys(d.kataDrafts).length : 0,
  };
  return { ok: true, bundle: b as ExportBundle, summary };
}

// ---------------------------------------------------------------------------
// Browser-only: gather / download / apply
// ---------------------------------------------------------------------------

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

export function buildExport(): ExportBundle {
  const kataDrafts: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key !== null && key.startsWith(KATA_DRAFT_PREFIX) && key !== KATA_SOLVED_KEY) {
        const v = localStorage.getItem(key);
        if (v !== null) kataDrafts[key.slice(KATA_DRAFT_PREFIX.length)] = v;
      }
    }
  } catch {
    /* private mode — export what we can */
  }
  return {
    app: "cs-guide-progress",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      progress: readJson(PROGRESS_KEY),
      srs: readJson(SRS_STORAGE_KEY),
      kataSolved: readJson(KATA_SOLVED_KEY),
      kataDrafts,
      interviewSeen: readJson(IV_SEEN_KEY),
    },
  };
}

export function downloadExport(): void {
  const bundle = buildExport();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cs-guide-progress-${bundle.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Write the bundle into localStorage and reload so every store rehydrates
    (each store sanitizes on load — a bad file degrades, never crashes). */
export function applyImport(bundle: ExportBundle): void {
  const { data } = bundle;
  try {
    if (data.progress !== undefined) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
    if (data.srs !== undefined) localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(data.srs));
    if (data.kataSolved !== undefined) localStorage.setItem(KATA_SOLVED_KEY, JSON.stringify(data.kataSolved));
    if (data.kataDrafts) {
      for (const [id, code] of Object.entries(data.kataDrafts)) {
        if (typeof code === "string") localStorage.setItem(`${KATA_DRAFT_PREFIX}${id}`, code);
      }
    }
    if (data.interviewSeen !== undefined) localStorage.setItem(IV_SEEN_KEY, JSON.stringify(data.interviewSeen));
  } catch {
    /* quota/private mode — import as much as fit */
  }
  window.location.reload();
}
