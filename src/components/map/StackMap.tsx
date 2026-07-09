// The landing IS the map (§7): a glowing vertical stack of the 11 parts —
// silicon at the bottom, AI at the top. Parts expand to chapters; progress
// rings and boss badges light up as you climb.
import { useEffect, useRef, useState } from "react";
import { CHAPTERS, PARTS, chaptersOfPart, isStub } from "../../data/curriculum.ts";
import { BOSSES } from "../../data/bosses.ts";
import { SIM_KEYS, FIG_KEYS } from "../../lib/registryKeys.ts";
import { QUIZZES } from "../../data/quizzes.ts";
import { useChallengesDone, useDoneSet } from "../../lib/progress.ts";
import { activeChapterIds, chapterCards, dueSummary } from "../../lib/srs.ts"; // CHANGED: S18
import { useDeckOverrides, useSrsCards } from "../../lib/srsStore.ts"; // CHANGED: S18
import PartNode from "./PartNode.tsx";

export default function StackMap({ expandPart }: { expandPart?: string }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(expandPart ? [expandPart] : ["p2"]), // p2 holds the first live chapter
  );
  const done = useDoneSet();
  const challenges = useChallengesDone();
  // CHANGED: S18 — due-cards count over the active SRS decks
  const overrides = useDeckOverrides();
  const srsStates = useSrsCards();
  const srsDue = dueSummary(
    [...activeChapterIds(done, overrides)].flatMap(chapterCards),
    srsStates,
    Date.now(),
  ).due;
  const expandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandPart) {
      setExpanded((s) => new Set([...s, expandPart]));
      expandRef.current?.scrollIntoView({ block: "start" });
    }
  }, [expandPart]);

  const liveChapters = CHAPTERS.filter((c) => !isStub(c)).length;
  const interactives = SIM_KEYS.length + FIG_KEYS.length + QUIZZES.length;
  const bossesCleared = BOSSES.filter((b) => challenges.has(b.id)).length;

  // top of the visual stack = top of the journey
  const stacked = [...PARTS].sort((a, b) => b.order - a.order);

  return (
    <div className="container stackmap">
      <header className="map-hero">
        <h1>
          The whole of computer science,
          <br />
          <em>bottom-up and touchable</em>
        </h1>
        <p className="map-sub">
          One journey from a drifting electron to a learning machine — told through live
          emulators and steppable simulators, never walls of text. Take it in order, or grab any
          part: each one stands alone.
        </p>
        <div className="map-stats">
          <span className="chip">
            {done.size} / {CHAPTERS.length} chapters read
          </span>
          <span className="chip">
            {bossesCleared} / {BOSSES.length} boss badges
          </span>
          <span className="chip">{interactives} interactives live · ~126 planned</span>
          <span className="chip">{liveChapters} of 37 units built — building in the open</span>
          {/* CHANGED: S18 — §6: the landing shows how many cards are due today */}
          {srsDue > 0 && (
            <a className="chip chip-due" href="#/review">
              {srsDue} {srsDue === 1 ? "card" : "cards"} due for review →
            </a>
          )}
        </div>
      </header>

      <div className="stack" role="list" aria-label="The journey, bottom (silicon) to top (AI)">
        <div className="stack-spine" aria-hidden="true" />
        {stacked.map((part) => {
          const chapters = chaptersOfPart(part.id);
          const boss = BOSSES.find((b) => b.part === part.id);
          return (
            <div key={part.id} ref={part.id === expandPart ? expandRef : undefined}>
              <PartNode
                part={part}
                chapters={chapters}
                boss={boss}
                bossCleared={boss !== undefined && challenges.has(boss.id)}
                doneSet={done}
                expanded={expanded.has(part.id)}
                onToggle={() =>
                  setExpanded((s) => {
                    const next = new Set(s);
                    if (next.has(part.id)) next.delete(part.id);
                    else next.add(part.id);
                    return next;
                  })
                }
              />
              {part.id === "p1" && (
                <p className="stack-cue" aria-hidden="true">
                  ▲ the journey starts here — everything below is orientation
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
