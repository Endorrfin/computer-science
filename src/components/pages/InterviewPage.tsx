// InterviewPage — the filterable interview bank (S18).
//
// Filter bar (.ivf-*, styles in theme/_engine/interview.css): part <select>,
// level toggle chips (multi-select, all on by default), a text search over
// question text, a live "N of TOTAL shown · M reviewed" count, and a
// "clear filters" link-button whenever any filter is active. A deep link
// from search (#/interview/<chapterId>) arrives as the `chapterId` prop —
// INITIAL state only (App key-remounts if it changes) — and renders as a
// dismissible "chapter: <title> ✕" chip; dismissing it widens back to the
// other filters.
//
// The list keeps the original chapter-grouped markup (.iv-group / .iv-q /
// .chip.level-*, styled in global.css) so nothing restyles: chapters in
// CHAPTERS curriculum order, groups without visible questions skipped, group
// header linking to #/chapter/<id>. New per question: a "reviewed" ✓ toggle
// on the right of the summary row (stopPropagation so it never toggles the
// <details>). The seen set persists in localStorage under `cs:iv-seen`
// (JSON string[] of question ids) via a module-local external store +
// useSyncExternalStore — mirrors KatasPage's solved store, NOT exported, so
// this file still default-exports a single component (react-refresh clean).
import { useState, useSyncExternalStore } from "react";
import { INTERVIEW } from "../../data/interview.ts";
import type { InterviewQ } from "../../lib/types.ts";
import { CHAPTERS, PARTS, chapterById, chaptersOfPart } from "../../data/curriculum.ts";
import { Md } from "../../lib/md.tsx";
import { cx } from "../../lib/utils.ts";
import "../../theme/_engine/interview.css";

// ---- seen-set store (localStorage, mirrors KatasPage's solved store) ------
const SEEN_KEY = "cs:iv-seen";

function loadSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

let seenState: string[] = loadSeen();
let seenVersion = 0;
const seenListeners = new Set<() => void>();

function emitSeen(): void {
  seenVersion++;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seenState));
  } catch {
    /* private mode — seen set stays in memory */
  }
  seenListeners.forEach((l) => l());
}
function subscribeSeen(cb: () => void): () => void {
  seenListeners.add(cb);
  return () => seenListeners.delete(cb);
}
function toggleSeen(id: string): void {
  seenState = seenState.includes(id) ? seenState.filter((x) => x !== id) : [...seenState, id];
  emitSeen();
}
function useSeenSet(): ReadonlySet<string> {
  useSyncExternalStore(subscribeSeen, () => seenVersion);
  return new Set(seenState);
}

// ---- filters ---------------------------------------------------------------
type Level = InterviewQ["level"];
const LEVELS: readonly Level[] = ["mid", "senior", "staff"];

export default function InterviewPage({ chapterId }: { chapterId?: string }) {
  const seen = useSeenSet();

  // Deep-link chapter filter — prop is initial state only; invalid ids fall
  // back to the unfiltered bank instead of a confusing empty page.
  const [chapterFilter, setChapterFilter] = useState<string | null>(() =>
    chapterId && chapterById(chapterId) ? chapterId : null,
  );
  const [partId, setPartId] = useState("");
  const [levels, setLevels] = useState<ReadonlySet<Level>>(() => new Set(LEVELS));
  const [query, setQuery] = useState("");

  const filtersActive =
    chapterFilter !== null || partId !== "" || levels.size !== LEVELS.length || query.trim() !== "";

  function clearFilters(): void {
    setChapterFilter(null);
    setPartId("");
    setLevels(new Set(LEVELS));
    setQuery("");
  }
  function toggleLevel(l: Level): void {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  }

  // A question is shown iff it passes ALL active filters (AND semantics).
  const needle = query.trim().toLowerCase();
  const partChapterIds = partId ? new Set(chaptersOfPart(partId).map((c) => c.id)) : null;
  const visible = INTERVIEW.filter(
    (q) =>
      (chapterFilter === null || q.chapterId === chapterFilter) &&
      (partChapterIds === null || partChapterIds.has(q.chapterId)) &&
      levels.has(q.level) &&
      (needle === "" || q.q.toLowerCase().includes(needle)),
  );
  const reviewedCount = INTERVIEW.filter((q) => seen.has(q.id)).length;
  const filterChapter = chapterFilter ? chapterById(chapterFilter) : undefined;

  return (
    <div className="container pagestub">
      <h1>Interview bank</h1>
      <p className="muted">
        Senior-grade CS questions, tagged by chapter. Filter by part, level, or question text —
        and tick off the ones you have reviewed. Current count:{" "}
        <strong>{INTERVIEW.length}</strong>.
      </p>

      <div className="ivf-bar">
        <div className="ivf-row">
          <select
            className="ivf-select"
            aria-label="Filter by part"
            value={partId}
            onChange={(e) => setPartId(e.target.value)}
          >
            <option value="">All parts</option>
            {PARTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="ivf-levels" role="group" aria-label="Filter by level">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                className={cx("chip", `level-${l}`, "ivf-lvl")}
                aria-pressed={levels.has(l)}
                onClick={() => toggleLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <input
            className="ivf-search"
            type="text"
            aria-label="Search question text"
            placeholder="Search question text…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="ivf-meta">
          {filterChapter && (
            <button
              type="button"
              className="chip ivf-chapchip"
              onClick={() => setChapterFilter(null)}
              aria-label={`Clear chapter filter: ${filterChapter.title}`}
            >
              chapter: {filterChapter.title}{" "}
              <span className="ivf-x" aria-hidden="true">
                ✕
              </span>
            </button>
          )}
          <span className="ivf-count" aria-live="polite">
            {visible.length} of {INTERVIEW.length} shown · {reviewedCount} reviewed
          </span>
          {filtersActive && (
            <button type="button" className="ivf-clear" onClick={clearFilters}>
              clear filters
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="ivf-empty">
          Nothing matches these filters — loosen one, or{" "}
          <button type="button" className="ivf-clear" onClick={clearFilters}>
            clear filters
          </button>
          .
        </p>
      ) : (
        CHAPTERS.map((ch) => {
          const qs = visible.filter((q) => q.chapterId === ch.id);
          if (qs.length === 0) return null;
          return (
            <section key={ch.id} className="iv-group">
              <h2>
                <a href={`#/chapter/${ch.id}`}>{ch.title}</a>
              </h2>
              {qs.map((q) => {
                const isSeen = seen.has(q.id);
                return (
                  <details key={q.id} className="iv-q">
                    <summary className="ivf-sum">
                      <span className={cx("chip", `level-${q.level}`)}>{q.level}</span> {q.q}
                      <button
                        type="button"
                        className="ivf-seen"
                        aria-pressed={isSeen}
                        aria-label={isSeen ? "Mark as not reviewed" : "Mark as reviewed"}
                        title={isSeen ? "Reviewed — click to unmark" : "Mark as reviewed"}
                        onClick={(e) => {
                          // a plain click must never toggle the <details>
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSeen(q.id);
                        }}
                      >
                        ✓
                      </button>
                    </summary>
                    <div className="iv-a">
                      <Md md={q.a} />
                    </div>
                  </details>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
