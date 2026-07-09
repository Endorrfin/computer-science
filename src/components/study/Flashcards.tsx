// Flashcards — auto-generated from a chapter's keyPoints ("front — back"
// convention, types.ts). The SRS review hub (SM-2-lite, cross-chapter)
// lives at #/review (S18); per-chapter decks ship from S1 so every finished
// chapter is immediately reviewable.
import { useState } from "react";
import type { CSSProperties } from "react";
import { cx, splitKeyPoint } from "../../lib/utils.ts";
import { renderInline } from "../../lib/mdRender.tsx";

export default function Flashcards({ keyPoints, accent }: { keyPoints: string[]; accent?: string }) {
  const cards = keyPoints.map(splitKeyPoint).filter((c) => c.back !== "");
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  if (cards.length === 0) return null;
  const card = cards[i];

  function go(delta: number) {
    setI((c) => (c + delta + cards.length) % cards.length);
    setFlipped(false);
  }

  return (
    <section
      className="flashcards"
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
      aria-label="Chapter flashcards"
    >
      <div className="fc-bar">
        <span className="quiz-tag">recall</span>
        <span className="fc-count">
          card {i + 1} / {cards.length}
        </span>
        <span className="fc-note">
          full spaced repetition <a href="#/review">in the review hub</a>
        </span>
      </div>
      <button
        type="button"
        className={cx("fc-card", flipped && "flipped")}
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={flipped ? "Card back — click to see front" : "Card front — click to reveal answer"}
      >
        <span className="fc-side fc-front">
          <span className="fc-label">{flipped ? "" : "recall it, then flip"}</span>
          <span className="fc-text">{renderInline(card.front)}</span>
        </span>
        <span className="fc-side fc-back">
          <span className="fc-text">{renderInline(card.back)}</span>
        </span>
      </button>
      <div className="fc-nav">
        <button type="button" className="btn" onClick={() => go(-1)} aria-label="Previous card">
          ← prev
        </button>
        <button type="button" className="btn" onClick={() => setFlipped((f) => !f)}>
          flip
        </button>
        <button type="button" className="btn" onClick={() => go(1)} aria-label="Next card">
          next →
        </button>
      </div>
    </section>
  );
}
