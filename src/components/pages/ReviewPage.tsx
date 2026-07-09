// ReviewPage — the SRS review hub (#/review, S18; replaces the S1 stub).
//
// Three stacked blocks over the ACTIVE decks (done ∪ opt-in − opt-out,
// srs.ts:activeChapterIds):
//   1. session — buildQueue orders due-then-new and we always render queue[0].
//      Flip (click / Space) → grade Again/Hard/Good/Easy (keys 1–4) →
//      gradeCardAction writes the store, the hook re-renders, the queue is
//      recomputed — "advancing" falls out of the data, only a session counter
//      lives in React state. Queue empty → calm caught-up state with the next
//      due time; no active decks at all → onboarding.
//   2. decks — every live chapter grouped by part: cards/due/new counts, a
//      status pill (auto = done chapter · on = opted in · off = muted ·
//      inactive = not studied yet) and one predictable toggle (setDeckOverride).
//   3. your data — export/import the full progress bundle (dataTransfer.ts);
//      import confirms INLINE (summary + replace warning) before applyImport
//      reloads. No window.confirm anywhere.
//
// Time: Date.now() is read at render and recomputed on every interaction — no
// timers ("check again" in the caught-up state forces a fresh read). Single
// default export (react-refresh rule); every helper is module-local.
import { useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, KeyboardEvent } from "react";
import { PARTS, chapterById, chaptersOfPart, isStub, partById } from "../../data/curriculum.ts";
import type { Chapter } from "../../lib/types.ts";
import {
  activeChapterIds,
  buildQueue,
  dueSummary,
  previewIntervals,
} from "../../lib/srs.ts";
import { chapterCards } from "../../lib/srsCards.ts"; // CHANGED: S19 — content-heavy deck building split out
import { CHAPTERS_META } from "../../data/curriculumMeta.gen.ts"; // CHANGED: S19 — activation runs on meta stub flags
import type {
  DeckOverride,
  DueSummary,
  SrsCard,
  SrsCardState,
  SrsGrade,
  SrsStates,
} from "../../lib/srs.ts";
import {
  gradeCardAction,
  setDeckOverride,
  useDeckOverrides,
  useSrsCards,
} from "../../lib/srsStore.ts";
import { useDoneSet } from "../../lib/progress.ts";
import { applyImport, downloadExport, parseImport } from "../../lib/dataTransfer.ts";
import type { ExportBundle, ImportSummary } from "../../lib/dataTransfer.ts";
import { renderInline } from "../../lib/mdRender.tsx";
import { cx } from "../../lib/utils.ts";
import "../../theme/_engine/review.css";

// ---- module-local helpers ---------------------------------------------------

const GRADES: SrsGrade[] = ["again", "hard", "good", "easy"];
const GRADE_LABEL: Record<SrsGrade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** previewIntervals label ("10 min" / "3 d" / "1.5 mo") → spoken, for aria. */
function spokenInterval(label: string): string {
  const [n, unit] = label.split(" ");
  const one = n === "1";
  if (unit === "min") return `${n} ${one ? "minute" : "minutes"}`;
  if (unit === "d") return `${n} ${one ? "day" : "days"}`;
  if (unit === "mo") return `${n} ${one ? "month" : "months"}`;
  return label;
}

/** "in 12 min" / "in 3 h" / "tomorrow" / "on Jul 15" for the caught-up state. */
function nextDueLabel(dueAt: number, now: number): string {
  const diff = dueAt - now;
  if (diff <= 0) return "now";
  if (diff < 3_600_000) return `in ${Math.max(1, Math.round(diff / 60_000))} min`;
  const due = new Date(dueAt);
  if (due.toDateString() === new Date(now).toDateString())
    return `in ${Math.round(diff / 3_600_000)} h`;
  if (due.toDateString() === new Date(now + 86_400_000).toDateString()) return "tomorrow";
  return `on ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** Earliest future dueAt across the given cards (the "come back at…" hint). */
function nextDueAt(cards: SrsCard[], states: SrsStates, now: number): number | undefined {
  let min: number | undefined;
  for (const c of cards) {
    const s = states[c.id];
    if (s !== undefined && s.dueAt > now && (min === undefined || s.dueAt < min)) min = s.dueAt;
  }
  return min;
}

type DeckStatus = "auto" | "on" | "off" | "inactive";

function deckStatus(
  id: string,
  done: ReadonlySet<string>,
  overrides: Readonly<Record<string, DeckOverride>>,
): DeckStatus {
  const ov = overrides[id];
  if (ov === "off") return "off";
  if (done.has(id)) return "auto"; // done wins the label even over a stale "on"
  if (ov === "on") return "on";
  return "inactive";
}

const DECK_UI: Record<DeckStatus, { action: string; hint: string }> = {
  auto: { action: "mute", hint: "Active because the chapter is done. Mute to keep it out of the queue." },
  on: { action: "remove", hint: "Opted in by hand. Remove to take it back out of the queue." },
  off: { action: "resume", hint: "Muted. Resume to bring its cards back into the queue." },
  inactive: { action: "study now", hint: "Not studied yet. Opt in to start reviewing it right away." },
};

function toggleDeck(id: string, status: DeckStatus, done: ReadonlySet<string>): void {
  if (status === "inactive") setDeckOverride(id, "on");
  else if (status === "auto") setDeckOverride(id, "off");
  else if (status === "on") setDeckOverride(id, null);
  else setDeckOverride(id, done.has(id) ? null : "on"); // off → follow done, or re-opt-in
}

// ---- the page ---------------------------------------------------------------

export default function ReviewPage() {
  const done = useDoneSet();
  const overrides = useDeckOverrides();
  const states = useSrsCards();
  const [reviewed, setReviewed] = useState(0);
  const [, setTick] = useState(0); // bump → re-read Date.now() without a timer

  const now = Date.now();
  const activeIds = activeChapterIds(CHAPTERS_META, done, overrides); // CHANGED: S19 — new signature
  const activeCards = [...activeIds].flatMap((id) => chapterCards(id));
  const summary = dueSummary(activeCards, states, now);
  const queue = buildQueue(activeCards, states, now);
  const current: SrsCard | undefined = queue[0];

  return (
    <div className="container pagestub rv">
      <h1>Review</h1>
      <p className="muted">
        Spaced repetition across everything you've studied — flashcards built from each chapter's
        key points and mental model, scheduled with an SM-2-lite algorithm, stored only in this
        browser. A chapter's deck activates when you mark it done; fine-tune under{" "}
        <strong>Decks</strong> below.
      </p>

      <div className="rv-stats">
        <span className={cx("rv-stat", summary.due > 0 && "rv-stat--due")}>
          <strong>{summary.due}</strong> due now
        </span>
        <span className="rv-stat">
          <strong>{summary.fresh}</strong> new
        </span>
        <span className="rv-stat">
          <strong>{summary.later}</strong> scheduled later
        </span>
        <span className="rv-stat">
          <strong>{summary.total}</strong> cards · <strong>{activeIds.size}</strong> active{" "}
          {activeIds.size === 1 ? "deck" : "decks"}
        </span>
      </div>

      {activeIds.size === 0 ? (
        <Onboarding />
      ) : current !== undefined ? (
        <Session
          card={current}
          state={states[current.id]}
          queueLength={queue.length}
          reviewed={reviewed}
          now={now}
          onGrade={(g) => {
            gradeCardAction(current.id, g);
            setReviewed((n) => n + 1);
          }}
        />
      ) : (
        <CaughtUp
          summary={summary}
          nextDue={nextDueAt(activeCards, states, now)}
          reviewed={reviewed}
          now={now}
          onRecheck={() => setTick((t) => t + 1)}
        />
      )}

      <DeckManager done={done} overrides={overrides} states={states} now={now} />
      <DataPanel />
    </div>
  );
}

// ---- session ----------------------------------------------------------------

function Session({
  card,
  state,
  queueLength,
  reviewed,
  now,
  onGrade,
}: {
  card: SrsCard;
  state: SrsCardState | undefined;
  queueLength: number;
  reviewed: number;
  now: number;
  onGrade: (g: SrsGrade) => void;
}) {
  // Flip is tracked per card id and the component is NOT keyed by card, so the
  // card button keeps its DOM node across grades — keyboard focus survives the
  // advance and the next card always starts front-side up.
  const [flippedFor, setFlippedFor] = useState<string | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const flipped = flippedFor === card.id;

  const chapter = chapterById(card.chapterId);
  const part = chapter ? partById(chapter.part) : undefined;
  const preview = previewIntervals(state, now);

  function toggleFlip() {
    setFlippedFor(flipped ? null : card.id);
  }
  function grade(g: SrsGrade) {
    onGrade(g); // store write → parent re-renders with the next queue[0]
    setFlippedFor(null);
    cardRef.current?.focus(); // keep the keyboard flow alive across the advance
  }
  function handleKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4") {
      if (!flipped) return; // only grade a revealed answer
      e.preventDefault();
      grade(GRADES[Number(e.key) - 1]);
      return;
    }
    if (e.key === " ") {
      if ((e.target as HTMLElement).closest(".rv-grade")) return; // native Space = click
      e.preventDefault(); // no page scroll, no double-toggle on the card button
      toggleFlip();
    }
  }

  return (
    <section
      className="rv-session"
      aria-label="Review session"
      onKeyDown={handleKey}
      style={part ? ({ "--accent": part.accent } as CSSProperties) : undefined}
    >
      <div className="rv-sessionbar">
        <a className="rv-chapchip" href={`#/chapter/${card.chapterId}`}>
          {chapter ? chapter.title : card.chapterId}
        </a>
        <span className="rv-queueinfo">
          {queueLength} in queue · reviewed {reviewed} this session
        </span>
      </div>

      <button
        ref={cardRef}
        type="button"
        className={cx("rv-card", flipped && "flipped")}
        onClick={toggleFlip}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? "Card back — click to see the front again"
            : "Card front — click to reveal the answer"
        }
      >
        <span className="rv-face rv-face--front">
          <span className="rv-facelabel">recall it, then flip</span>
          <span className="rv-facetext">{renderInline(card.front)}</span>
        </span>
        <span className="rv-face rv-face--back">
          <span className="rv-facelabel">answer</span>
          <span className="rv-facetext">{renderInline(card.back)}</span>
        </span>
      </button>

      {flipped ? (
        <div className="rv-grades" role="group" aria-label="Grade your recall">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              className={`rv-grade rv-grade--${g}`}
              onClick={() => grade(g)}
              aria-label={`${GRADE_LABEL[g]} — next in ${spokenInterval(preview[g])}`}
            >
              <span className="rv-gradename">{GRADE_LABEL[g]}</span>
              <span className="rv-gradeint">{preview[g]}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rv-gradehint">flip the card, then grade your recall</p>
      )}
      <p className="rv-keys">
        <kbd>Space</kbd> flip · <kbd>1</kbd>–<kbd>4</kbd> grade
      </p>
    </section>
  );
}

function CaughtUp({
  summary,
  nextDue,
  reviewed,
  now,
  onRecheck,
}: {
  summary: DueSummary;
  nextDue: number | undefined;
  reviewed: number;
  now: number;
  onRecheck: () => void;
}) {
  return (
    <section className="rv-session rv-calm" aria-label="Review session">
      <p className="rv-calmhead">All caught up.</p>
      <p className="rv-calmbody">
        {reviewed > 0 && (
          <>
            You graded <strong>{reviewed}</strong> {reviewed === 1 ? "card" : "cards"} this
            session.{" "}
          </>
        )}
        {nextDue !== undefined ? (
          <>
            The next card is due <strong>{nextDueLabel(nextDue, now)}</strong> —{" "}
            {summary.later} {summary.later === 1 ? "card is" : "cards are"} scheduled ahead.
          </>
        ) : (
          <>Nothing is scheduled ahead yet — mark more chapters done, or opt decks in below.</>
        )}
      </p>
      {nextDue !== undefined && (
        <button type="button" className="btn" onClick={onRecheck}>
          check again
        </button>
      )}
    </section>
  );
}

function Onboarding() {
  return (
    <section className="rv-session rv-calm" aria-label="Review session">
      <p className="rv-calmhead">No decks are active yet.</p>
      <p className="rv-calmbody">
        A chapter's deck joins the rotation when you mark that chapter <strong>done</strong> on
        the map — the hub then keeps its key ideas alive with a few cards a day. Want to start
        earlier? Open <strong>Decks</strong> below and press <em>study now</em> on any chapter.
      </p>
      <a className="btn btn-primary" href="#/">
        open the map
      </a>
    </section>
  );
}

// ---- deck manager -----------------------------------------------------------

function DeckManager({
  done,
  overrides,
  states,
  now,
}: {
  done: ReadonlySet<string>;
  overrides: Readonly<Record<string, DeckOverride>>;
  states: SrsStates;
  now: number;
}) {
  return (
    <details className="rv-decks">
      <summary>
        <h2>Decks</h2>
        <span className="rv-deckssub">choose what the review queue draws from</span>
      </summary>
      {PARTS.map((part) => {
        const live = chaptersOfPart(part.id).filter((ch) => !isStub(ch));
        if (live.length === 0) return null;
        return (
          <section
            key={part.id}
            className="rv-partgroup"
            style={{ "--accent": part.accent } as CSSProperties}
          >
            <h3 className="rv-partname">{part.name}</h3>
            <ul className="rv-decklist">
              {live.map((ch) => (
                <DeckRow
                  key={ch.id}
                  chapter={ch}
                  done={done}
                  overrides={overrides}
                  states={states}
                  now={now}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </details>
  );
}

function DeckRow({
  chapter,
  done,
  overrides,
  states,
  now,
}: {
  chapter: Chapter;
  done: ReadonlySet<string>;
  overrides: Readonly<Record<string, DeckOverride>>;
  states: SrsStates;
  now: number;
}) {
  const status = deckStatus(chapter.id, done, overrides);
  const counts = dueSummary(chapterCards(chapter.id), states, now);
  const ui = DECK_UI[status];
  const active = status === "auto" || status === "on";
  return (
    <li className={cx("rv-deck", !active && "rv-deck--dim")}>
      <div className="rv-deckmain">
        <a className="rv-decktitle" href={`#/chapter/${chapter.id}`}>
          {chapter.title}
        </a>
        <span className="rv-deckmeta">
          ch.{chapter.id.replace(/^ch/, "")} · {counts.total} cards
          {counts.due > 0 && <> · {counts.due} due</>}
          {counts.fresh > 0 && <> · {counts.fresh} new</>}
        </span>
      </div>
      <span className={`rv-pill rv-pill--${status}`}>{status}</span>
      <button
        type="button"
        className="rv-deckbtn"
        title={ui.hint}
        aria-label={`${ui.action} — ${chapter.title}`}
        onClick={() => toggleDeck(chapter.id, status, done)}
      >
        {ui.action}
      </button>
    </li>
  );
}

// ---- your data --------------------------------------------------------------

type ImportUi =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ready"; bundle: ExportBundle; summary: ImportSummary; fileName: string };

function DataPanel() {
  const [imp, setImp] = useState<ImportUi>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // same file re-pickable after cancel
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImp({ kind: "error", message: "Could not read that file." });
      return;
    }
    const parsed = parseImport(text);
    if (parsed.ok) {
      setImp({ kind: "ready", bundle: parsed.bundle, summary: parsed.summary, fileName: file.name });
    } else {
      setImp({ kind: "error", message: parsed.error });
    }
  }

  return (
    <section className="rv-data" aria-label="Your data">
      <h2>Your data</h2>
      <p className="rv-datalead">
        Everything lives in this browser's localStorage — nothing leaves your machine unless you
        export it.
      </p>
      <div className="rv-datarow">
        <div className="rv-datainfo">
          <h3>Export</h3>
          <p>
            One JSON file: chapters, quizzes, badges, katas, drafts, review schedule. Keep it as a
            backup or carry it to another browser.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={downloadExport}>
          export progress
        </button>
      </div>
      <div className="rv-datarow">
        <div className="rv-datainfo">
          <h3>Import</h3>
          <p>Pick a previously exported file — you'll see a summary before anything changes.</p>
        </div>
        <input
          ref={fileRef}
          className="rv-file"
          type="file"
          accept="application/json"
          aria-label="Import progress file"
          onChange={onFile}
        />
      </div>
      {imp.kind === "error" && (
        <p className="rv-importerr" role="alert">
          {imp.message}
        </p>
      )}
      {imp.kind === "ready" && (
        <div className="rv-confirm">
          <p className="rv-confirmhead">Import “{imp.fileName}”?</p>
          <ul className="rv-confirmlist">
            <li>
              <strong>{imp.summary.chaptersDone}</strong> chapters done
            </li>
            <li>
              <strong>{imp.summary.quizzesAnswered}</strong> quizzes answered
            </li>
            <li>
              <strong>{imp.summary.badges}</strong> badges
            </li>
            <li>
              <strong>{imp.summary.cardsScheduled}</strong> cards scheduled
            </li>
            <li>
              <strong>{imp.summary.katasSolved}</strong> katas solved
            </li>
            <li>
              <strong>{imp.summary.kataDrafts}</strong> kata drafts
            </li>
          </ul>
          <p className="rv-confirmwarn">
            Importing <strong>replaces</strong> the current progress on this device, then reloads
            the page.
          </p>
          <div className="rv-confirmbtns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => applyImport(imp.bundle)}
            >
              import
            </button>
            <button type="button" className="btn" onClick={() => setImp({ kind: "idle" })}>
              cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
