import type { CSSProperties } from "react";
import { BOSSES } from "../../data/bosses.ts";
import { chapterById, isStub, partById } from "../../data/curriculum.ts";
import { useChallengesDone } from "../../lib/progress.ts";
import { cx } from "../../lib/utils.ts";

export default function BossesPage() {
  const done = useChallengesDone();
  return (
    <div className="container pagestub">
      <h1>Boss gallery</h1>
      <p className="muted">
        Every part ends in an applied challenge inside its hero sim. Clear it, earn the badge,
        light your stack map. Bosses unlock as their chapters are built — the roadmap climbs
        bottom-up.
      </p>
      <div className="boss-grid">
        {BOSSES.map((b) => {
          const host = chapterById(b.hostChapterId);
          const part = partById(b.part);
          const live = host !== undefined && !isStub(host);
          const cleared = done.has(b.id);
          return (
            <article
              key={b.id}
              className={cx("boss-card", !live && "locked", cleared && "cleared")}
              style={{ "--accent": part?.accent } as CSSProperties}
            >
              <div className="boss-icon" aria-hidden="true">
                {b.icon}
              </div>
              <div className="boss-meta">
                <span className="boss-part">{part?.name}</span>
                <h2 className="boss-title">{b.title}</h2>
                <p className="boss-blurb">{b.blurb}</p>
                <p className="boss-badge">
                  badge: <strong>{b.badge}</strong>
                  {cleared && " ✓ earned"}
                </p>
                {live ? (
                  <a className="btn btn-primary" href={`#/chapter/${b.hostChapterId}`}>
                    Enter → {host?.title}
                  </a>
                ) : (
                  <span className="chip">arrives in session {b.plannedSession}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
