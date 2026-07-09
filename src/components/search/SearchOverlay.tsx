// ⌘K command palette (S18). Mounted ONCE in App: the outer component owns
// the global hotkey listener and renders null while closed; the inner
// <Palette> mounts fresh on every open (query resets, index prebuilds,
// scroll locks). Combobox pattern: focus stays in the input, ↑/↓ move
// aria-activedescendant across the flat hit list, Enter navigates.
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { ensureIndex, search } from "../../lib/search.ts";
import type { SearchDoc, SearchDocKind, SearchHit } from "../../lib/search.ts";
import { chapterById, partById } from "../../data/curriculum.ts";
import { navigate } from "../../lib/hashRouter.ts";
import { closeSearchPalette, toggleSearchPalette, useSearchOpen } from "../../lib/searchOverlayStore.ts";
import { cx } from "../../lib/utils.ts";
import "../../theme/_engine/search.css";

// ---- grouping (display order per S18 spec) ----
const KIND_ORDER: SearchDocKind[] = ["chapter", "part", "keypoint", "interview", "kata", "sim", "boss"];
const KIND_LABEL: Record<SearchDocKind, string> = {
  chapter: "Chapters",
  part: "Parts",
  keypoint: "Key points",
  interview: "Interview",
  kata: "Katas",
  sim: "Sims & figures",
  boss: "Bosses",
};
const KIND_CHIP: Record<SearchDocKind, string> = {
  chapter: "ch",
  part: "part",
  keypoint: "kp",
  interview: "iv",
  kata: "kata",
  sim: "sim",
  boss: "boss",
};
/** Kinds whose rows show the host chapter's name on the right. */
const CHAPTER_KINDS = new Set<SearchDocKind>(["keypoint", "interview", "kata", "sim"]);

const SUGGESTIONS = ["deadlock", "huffman", "cache", "two's complement", "tcp handshake"];

type Group = { kind: SearchDocKind; label: string; start: number; hits: SearchHit[] };

function groupHits(hits: SearchHit[]): Group[] {
  const groups: Group[] = [];
  let start = 0;
  for (const kind of KIND_ORDER) {
    const inKind = hits.filter((h) => h.doc.kind === kind);
    if (inKind.length > 0) {
      groups.push({ kind, label: KIND_LABEL[kind], start, hits: inKind });
      start += inKind.length;
    }
  }
  return groups;
}

/** Part accent for a hit — colors the active row's border only (no rainbow). */
function hitAccent(doc: SearchDoc): string | undefined {
  if (doc.kind === "part") return partById(doc.id.replace(/^part:/, ""))?.accent;
  if (doc.chapterId) {
    const ch = chapterById(doc.chapterId);
    return ch ? partById(ch.part)?.accent : undefined;
  }
  return undefined;
}

/** Highlight the matched prefix when trivial (title starts with the query). */
function renderTitle(title: string, q: string): ReactNode {
  const ql = q.toLowerCase();
  if (ql.length >= 2 && title.toLowerCase().startsWith(ql)) {
    return (
      <>
        <mark className="sov-hl">{title.slice(0, ql.length)}</mark>
        {title.slice(ql.length)}
      </>
    );
  }
  return title;
}

const optId = (i: number): string => `sov-opt-${i}`;

// ---- the panel: mounted only while open ----
function Palette() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // prebuild the index the moment the palette opens → first keystroke is instant
  useEffect(() => {
    ensureIndex();
  }, []);

  // body scroll lock while open (documentElement — body has no scroll of its own)
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, []);

  const q = query.trim();
  const hits = useMemo(() => (q === "" ? [] : search(q, 20)), [q]);
  const groups = useMemo(() => groupHits(hits), [hits]);
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);
  const act = flat.length === 0 ? -1 : Math.min(active, flat.length - 1);

  useEffect(() => {
    if (act >= 0) document.getElementById(optId(act))?.scrollIntoView({ block: "nearest" });
  }, [act]);

  function openHit(h: SearchHit): void {
    navigate(h.doc.hash);
    closeSearchPalette();
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((act + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((act - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && act >= 0) {
      e.preventDefault();
      openHit(flat[act]);
    }
  }

  const hasResults = q !== "" && flat.length > 0;

  return (
    <div className="sov-root" role="dialog" aria-modal="true" aria-label="Search">
      <div className="sov-backdrop" onClick={closeSearchPalette} aria-hidden="true" />
      <div className="sov-panel">
        <input
          ref={inputRef}
          className="sov-input"
          type="text"
          value={query}
          placeholder="Search chapters, key points, interview questions, katas…"
          aria-label="Search the guide"
          role="combobox"
          aria-expanded={hasResults}
          aria-controls={hasResults ? "sov-listbox" : undefined}
          aria-activedescendant={act >= 0 ? optId(act) : undefined}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />

        {q === "" ? (
          <div className="sov-hints">
            <div className="sov-ghead">Try searching for</div>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="sov-hint"
                onClick={() => {
                  setQuery(s);
                  setActive(0);
                  inputRef.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : flat.length === 0 ? (
          <p className="sov-empty">
            Nothing for “{q}” — try fewer words.
          </p>
        ) : (
          <div className="sov-results" id="sov-listbox" role="listbox" aria-label="Search results">
            {groups.map((g) => (
              <div key={g.kind} className="sov-group" role="group" aria-label={g.label}>
                <div className="sov-ghead">{g.label}</div>
                {g.hits.map((h, j) => {
                  const i = g.start + j;
                  const on = i === act;
                  const doc = h.doc;
                  const chTitle =
                    CHAPTER_KINDS.has(doc.kind) && doc.chapterId ? chapterById(doc.chapterId)?.title : undefined;
                  const accent = hitAccent(doc);
                  return (
                    <div
                      key={doc.id}
                      id={optId(i)}
                      role="option"
                      aria-selected={on}
                      className={cx("sov-row", on && "active")}
                      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
                      onClick={() => openHit(h)}
                      onMouseMove={() => {
                        if (!on) setActive(i);
                      }}
                    >
                      <span className="sov-kind">{KIND_CHIP[doc.kind]}</span>
                      <span className="sov-main">
                        <span className="sov-title">{renderTitle(doc.title, q)}</span>
                        <span className="sov-snippet">{doc.snippet}</span>
                      </span>
                      {chTitle !== undefined && <span className="sov-ch">{chTitle}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div className="sov-foot" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span className="sov-sep">·</span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span className="sov-sep">·</span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

// ---- always-mounted shell: hotkey listener + conditional palette ----
export default function SearchOverlay() {
  const open = useSearchOpen();

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // plain ⌘K / Ctrl+K only — Shift/Alt combos belong to the browser
      // (Ctrl+Shift+K is Firefox's devtools console)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSearchPalette();
      } else if (e.key === "Escape") {
        closeSearchPalette(); // no-op while closed
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return open ? <Palette /> : null;
}
