// [micro] boss-gallery (ch.35, Capstone) — an aggregated trophy shelf. Not a
// transport sim: it reads the ten part-bosses from data/bosses.ts and lights
// each card the reader has already cleared (progress.ts challenge ids). The card
// markup mirrors BossesPage.tsx verbatim so it inherits the global .boss-card
// styling; this file only adds the wrapper + the "N / 10 badges" header.
import type { CSSProperties } from "react";
import { BOSSES } from "../../../data/bosses.ts";
import { chapterById, partById } from "../../../data/curriculum.ts";
import { useChallengesDone } from "../../../lib/progress.ts";
import { cx } from "../../../lib/utils.ts";
import "../../../theme/_p11css/boss-gallery.css";

export default function BossGallery() {
  const done = useChallengesDone();
  const earned = BOSSES.reduce((n, b) => (done.has(b.id) ? n + 1 : n), 0);
  const total = BOSSES.length;
  const allDone = earned === total;

  return (
    <section className="bg-wrap" aria-label="Boss badge gallery">
      <header className="bg-head">
        <span className="bg-head-label">Badges earned</span>
        <span className={cx("bg-count", allDone && "is-full")}>
          <strong>{earned}</strong> / {total}
        </span>
        <span className="bg-head-note">
          {allDone
            ? "Every part cleared — the whole stack is lit."
            : "Clear each part's boss inside its hero sim to light a badge."}
        </span>
      </header>

      <div className="boss-grid">
        {BOSSES.map((b) => {
          const host = chapterById(b.hostChapterId);
          const part = partById(b.part);
          const cleared = done.has(b.id);
          return (
            <article
              key={b.id}
              className={cx("boss-card", cleared && "cleared")}
              style={{ "--accent": part?.accent } as CSSProperties}
            >
              <div className="boss-icon" aria-hidden="true">
                {b.icon}
              </div>
              <div className="boss-meta">
                <span className="boss-part">{part?.name}</span>
                <h3 className="boss-title">{b.title}</h3>
                <p className="boss-blurb">{b.blurb}</p>
                <p className="boss-badge">
                  badge: <strong>{b.badge}</strong>
                  {cleared && " ✓ earned"}
                </p>
                <a className="btn btn-primary" href={`#/chapter/${b.hostChapterId}`}>
                  Enter → {host?.title}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
