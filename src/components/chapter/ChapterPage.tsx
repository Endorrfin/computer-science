// ChapterPage — renders a chapter entirely from data (§2: content is never
// hand-written page HTML). Implements the lens rendering rule (§4):
// foundations hides senior sections AND formal corners, with a teaser count.
import type { CSSProperties } from "react";
import type { Chapter, Section } from "../../lib/types.ts";
import { chapterById, isStub, partById, prevNext } from "../../data/curriculum.ts";
import { interviewOfChapter } from "../../data/interview.ts";
import { useChapterDone, useLens } from "../../lib/progress.ts";
import { Md } from "../../lib/md.tsx";
import { cx, splitKeyPoint } from "../../lib/utils.ts";
import SectionView from "./SectionView.tsx";
import ComingSoon from "./ComingSoon.tsx";
import NotFound from "../pages/NotFound.tsx";
import LensToggle from "../layout/LensToggle.tsx";
import Flashcards from "../study/Flashcards.tsx";

function hiddenInFoundations(s: Section): boolean {
  return s.lens === "senior" || s.kind === "formal";
}

function RecapBox({ ch }: { ch: Chapter }) {
  if (ch.assumes.length === 0) return null;
  return (
    <aside className="recap">
      <div className="recap-title">What this chapter assumes — 30-second recap</div>
      <ul>
        {ch.assumes.map((a) => {
          const target = chapterById(a.chapterId);
          const stub = target === undefined || isStub(target);
          return (
            <li key={a.chapterId}>
              {a.oneLiner}{" "}
              {stub ? (
                <span className="muted">({target ? target.title : a.chapterId} — coming soon)</span>
              ) : (
                <a href={`#/chapter/${a.chapterId}`}>→ {target.title}</a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="recap-note">Enough to continue — parts of this guide are self-contained.</p>
    </aside>
  );
}

export default function ChapterPage({ id }: { id: string }) {
  const ch = chapterById(id);
  const [lens] = useLens();
  const [done, setDone] = useChapterDone(id);

  if (!ch) return <NotFound />;
  const part = partById(ch.part);
  if (!part) return <NotFound />;
  if (isStub(ch)) return <ComingSoon ch={ch} part={part} />;

  const visible = lens === "senior" ? ch.sections : ch.sections.filter((s) => !hiddenInFoundations(s));
  const hiddenCount = ch.sections.length - visible.length;
  const pitfalls = ch.pitfalls.filter((p) => p.lens === "both" || p.lens === lens);
  const hiddenPitfalls = ch.pitfalls.length - pitfalls.length;
  const interview = interviewOfChapter(ch.id);
  const { prev, next } = prevNext(ch.id);

  return (
    <article className="container chapter" style={{ "--accent": part.accent } as CSSProperties}>
      <nav className="ch-breadcrumb">
        <a href="#/">Map</a> <span aria-hidden="true">/</span>{" "}
        <a href={`#/part/${part.id}`}>{part.name}</a>
      </nav>

      <header className="ch-head">
        <h1 className="ch-title">{ch.title}</h1>
        <p className="ch-tagline">{ch.tagline}</p>
        <div className="ch-meta">
          <span className="chip">~{ch.readMins[lens]} min at this depth</span>
          <LensToggle />
          {lens === "foundations" && hiddenCount + hiddenPitfalls > 0 && (
            <span className="chip chip-teaser" title="Switch to the Senior lens to reveal">
              {hiddenCount + hiddenPitfalls} senior block{hiddenCount + hiddenPitfalls > 1 ? "s" : ""} hidden
            </span>
          )}
        </div>
      </header>

      {ch.storyHook && (
        <aside className="callout tone-story">
          <div className="callout-head">
            <span aria-hidden="true">📜</span>
            <span className="callout-label">story</span>
          </div>
          <Md md={ch.storyHook.md} />
        </aside>
      )}

      <RecapBox ch={ch} />

      <aside className="mental">
        <div className="mental-title">🧠 The mental model — one picture to redraw from memory</div>
        <p>{ch.mentalModel}</p>
      </aside>

      {visible.map((s, i) => (
        <SectionView key={i} section={s} accent={part.accent} />
      ))}

      {pitfalls.length > 0 && (
        <section className="pitfalls">
          <h2>Pitfalls — the classic ways this goes wrong</h2>
          {pitfalls.map((p, i) => (
            <div key={i} className="pitfall">
              <strong>{p.title}.</strong> {p.body}
            </div>
          ))}
        </section>
      )}

      <section className="keypoints">
        <h2>If you remember {Math.min(ch.keyPoints.length, 10)} things</h2>
        <ul>
          {ch.keyPoints.map((kp, i) => {
            const { front, back } = splitKeyPoint(kp);
            return (
              <li key={i}>
                <strong>{front}</strong>
                {back && <> — {back}</>}
              </li>
            );
          })}
        </ul>
      </section>

      <Flashcards keyPoints={ch.keyPoints} accent={part.accent} />

      {lens === "senior" && interview.length > 0 && (
        <section className="iv-group">
          <h2>Interview corner</h2>
          {interview.map((q) => (
            <details key={q.id} className="iv-q">
              <summary>
                <span className={cx("chip", `level-${q.level}`)}>{q.level}</span> {q.q}
              </summary>
              <div className="iv-a">
                <Md md={q.a} />
              </div>
            </details>
          ))}
        </section>
      )}

      <section className="ch-end">
        <button
          type="button"
          className={cx("btn", done ? "btn-done" : "btn-primary")}
          onClick={() => setDone(!done)}
        >
          {done ? "✓ Completed — tap to unmark" : "Mark chapter complete"}
        </button>
        {ch.seeAlso.length > 0 && (
          <p className="see-also">
            See also:{" "}
            {ch.seeAlso.map((sid, i) => {
              const target = chapterById(sid);
              if (!target) return null;
              const stub = isStub(target);
              return (
                <span key={sid}>
                  {i > 0 && " · "}
                  {stub ? (
                    <span className="muted">{target.title} (S{target.plannedSession})</span>
                  ) : (
                    <a href={`#/chapter/${sid}`}>{target.title}</a>
                  )}
                </span>
              );
            })}
          </p>
        )}
        <div className="sources">
          <h3>Sources & further depth</h3>
          <ul>
            {ch.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <nav className="ch-nav">
        {prev ? <a href={`#/chapter/${prev.id}`}>← {prev.title}</a> : <span />}
        {next ? <a href={`#/chapter/${next.id}`}>{next.title} →</a> : <span />}
      </nav>
    </article>
  );
}
