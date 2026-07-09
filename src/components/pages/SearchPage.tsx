// #/search (S18) — the keyboard-less fallback for the ⌘K palette: same
// engine, roomier grouped list (snippet + host chapter), plain <a> rows.
// Constants mirror SearchOverlay deliberately — each file stays
// self-contained (react-refresh: components-only exports).
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ensureIndex, search } from "../../lib/search.ts";
import type { SearchDoc, SearchDocKind, SearchHit } from "../../lib/search.ts";
import { chapterById, partById } from "../../data/curriculum.ts";
import "../../theme/_engine/search.css";

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
const CHAPTER_KINDS = new Set<SearchDocKind>(["keypoint", "interview", "kata", "sim"]);
const SUGGESTIONS = ["deadlock", "huffman", "cache", "two's complement", "tcp handshake"];

function hitAccent(doc: SearchDoc): string | undefined {
  if (doc.kind === "part") return partById(doc.id.replace(/^part:/, ""))?.accent;
  if (doc.chapterId) {
    const ch = chapterById(doc.chapterId);
    return ch ? partById(ch.part)?.accent : undefined;
  }
  return undefined;
}

function renderTitle(title: string, q: string): ReactNode {
  const ql = q.toLowerCase();
  if (ql.length >= 2 && title.toLowerCase().startsWith(ql)) {
    return (
      <>
        <mark className="spg-hl">{title.slice(0, ql.length)}</mark>
        {title.slice(ql.length)}
      </>
    );
  }
  return title;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");

  // prebuild once on page mount so the first keystroke answers instantly
  useEffect(() => {
    ensureIndex();
  }, []);

  const q = query.trim();
  const hits = useMemo(() => (q === "" ? [] : search(q, 30)), [q]);
  const groups = useMemo(() => {
    const g: { kind: SearchDocKind; label: string; hits: SearchHit[] }[] = [];
    for (const kind of KIND_ORDER) {
      const inKind = hits.filter((h) => h.doc.kind === kind);
      if (inKind.length > 0) g.push({ kind, label: KIND_LABEL[kind], hits: inKind });
    }
    return g;
  }, [hits]);

  return (
    <div className="container pagestub">
      <h1>Search</h1>
      <p className="muted">
        Everything in the guide — chapters, parts, key points, interview questions, katas, sims and
        bosses.
      </p>
      <input
        className="spg-input"
        type="text"
        value={query}
        placeholder="Search chapters, key points, interview questions, katas…"
        aria-label="Search the guide"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="spg-tip">
        Tip: press <kbd>⌘K</kbd> (or <kbd>Ctrl K</kbd>) anywhere in the guide for the quick palette.
      </p>

      {q === "" ? (
        <div className="spg-try">
          <span>try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setQuery(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="spg-empty">Nothing for “{q}” — try fewer words.</p>
      ) : (
        groups.map((g) => (
          <section key={g.kind} className="spg-group">
            <h2 className="spg-ghead">{g.label}</h2>
            {g.hits.map((h) => {
              const doc = h.doc;
              const chTitle =
                CHAPTER_KINDS.has(doc.kind) && doc.chapterId ? chapterById(doc.chapterId)?.title : undefined;
              const accent = hitAccent(doc);
              return (
                <a
                  key={doc.id}
                  className="spg-row"
                  href={doc.hash}
                  style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
                >
                  <span className="spg-kind">{KIND_CHIP[doc.kind]}</span>
                  <span className="spg-main">
                    <span className="spg-title">{renderTitle(doc.title, q)}</span>
                    <span className="spg-snippet">{doc.snippet}</span>
                    {chTitle !== undefined && <span className="spg-ch">in {chTitle}</span>}
                  </span>
                </a>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
