import type { CSSProperties } from "react";
import type { BossDef, Chapter, Part } from "../../lib/types.ts";
import { isStub } from "../../data/curriculum.ts";
import { cx } from "../../lib/utils.ts";

type Props = {
  part: Part;
  chapters: Chapter[];
  boss?: BossDef;
  bossCleared: boolean;
  doneSet: ReadonlySet<string>;
  expanded: boolean;
  onToggle: () => void;
};

function Ring({ done, total, accent }: { done: number; total: number; accent: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const frac = total === 0 ? 0 : done / total;
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" className="ring" aria-hidden="true">
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fill="var(--tx2)">
        {done}
      </text>
    </svg>
  );
}

export default function PartNode({ part, chapters, boss, bossCleared, doneSet, expanded, onToggle }: Props) {
  const done = chapters.filter((c) => doneSet.has(c.id)).length;
  const live = chapters.filter((c) => !isStub(c)).length;

  return (
    <section
      className={cx("part-node", expanded && "open")}
      style={{ "--accent": part.accent } as CSSProperties}
      role="listitem"
    >
      <button
        type="button"
        className="part-head"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${part.name} — ${part.tagline}. ${done} of ${chapters.length} chapters done.`}
      >
        <Ring done={done} total={chapters.length} accent={part.accent} />
        <span className="part-id">{part.id.toUpperCase()}</span>
        <span className="part-text">
          <span className="part-name">{part.name}</span>
          <span className="part-tagline">{part.tagline}</span>
        </span>
        <span className="part-side">
          {boss && (
            <span
              className={cx("badge-boss", bossCleared && "earned")}
              title={bossCleared ? `Boss cleared — ${boss.badge}` : `Boss: ${boss.title}`}
            >
              {boss.icon}
            </span>
          )}
          <span className="part-count">
            {live > 0 ? `${live}/${chapters.length} live` : `${chapters.length} planned`}
          </span>
          <span className="part-chevron" aria-hidden="true">
            {expanded ? "▾" : "▸"}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="chapter-list">
          <p className="part-blurb">{part.blurb}</p>
          {chapters.map((ch) => {
            const stub = isStub(ch);
            const isDone = doneSet.has(ch.id);
            return stub ? (
              <div key={ch.id} className="chapter-item stub">
                <span className="ch-title">{ch.title}</span>
                <span className="ch-tagline">{ch.tagline}</span>
                <span className="chip">S{ch.plannedSession}</span>
              </div>
            ) : (
              <a key={ch.id} href={`#/chapter/${ch.id}`} className={cx("chapter-item", isDone && "done")}>
                <span className="ch-title">
                  {isDone && <span aria-label="completed">✓ </span>}
                  {ch.title}
                </span>
                <span className="ch-tagline">{ch.tagline}</span>
                <span className="chip chip-accent">read →</span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
