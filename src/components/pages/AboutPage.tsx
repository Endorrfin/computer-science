// CHANGED: S19 — #/about: what this guide is, how to use the learning engine,
// what it's built with, who made it. Linked from the footer. All counts are
// DERIVED (meta + registry) so this page can never drift from the content.
import { CHAPTERS_META, INTERVIEW_COUNT, KATA_COUNT, PARTS_META, QUIZ_COUNT } from "../../data/curriculumMeta.gen.ts";
import { BOSSES } from "../../data/bosses.ts";
import { FIG_KEYS, SIM_KEYS } from "../../lib/registryKeys.ts";

const PARTS_COUNT = PARTS_META.filter((p) => p.id !== "p0").length;
const UNITS_COUNT = CHAPTERS_META.length;
const SIMS_COUNT = SIM_KEYS.length;
const FIGS_COUNT = FIG_KEYS.length;

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="about-stat">
      <span className="about-stat-n">{n}</span>
      <span className="about-stat-label">{label}</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="container pagestub about">
      <h1>About this guide</h1>
      <p className="about-lead">
        <strong>Computer Science — The Interactive Journey</strong> tells the whole discipline as
        one bottom-up story: a drifting electron becomes a logic gate, gates become a CPU, code
        becomes algorithms and theory, machines join into networks, data grows into databases —
        and the journey ends at modern AI. Every core idea is <em>touchable</em>: live emulators,
        steppable simulators and animated figures, never walls of text.
      </p>

      <div className="about-stats" role="list" aria-label="What's inside, by the numbers">
        <Stat n={PARTS_COUNT} label="parts" />
        <Stat n={UNITS_COUNT} label="units" />
        <Stat n={SIMS_COUNT} label="simulators" />
        <Stat n={FIGS_COUNT} label="animated figures" />
        <Stat n={QUIZ_COUNT} label="predict-quizzes" />
        <Stat n={INTERVIEW_COUNT} label="interview questions" />
        <Stat n={KATA_COUNT} label="katas" />
        <Stat n={BOSSES.length} label="boss challenges" />
      </div>

      <h2>Who it's for</h2>
      <p>
        Two readers at once. The <strong>Foundations</strong> lens teaches every chapter from
        zero — visual and intuitive, no prerequisites. The <strong>Senior</strong> lens adds the
        internals, trade-offs and interview-grade depth on top. Flip the toggle in the top bar at
        any time; the whole guide re-renders for your lane. Each part is also self-contained:
        take only the OS part, or only Algorithms — every chapter opens with a 30-second recap of
        what it assumes.
      </p>

      <h2>How to use the learning engine</h2>
      <p>
        <strong>The map.</strong> The landing page is the journey itself — eleven glowing layers
        from silicon to AI. Expand a part, read its chapters, and mark each one done; progress
        rings and boss badges light up as you climb.
      </p>
      <p>
        <strong>Bosses.</strong> Every part ends in an applied challenge inside its hero
        simulator — program the 8-bit CPU to compute Fibonacci, fix the deadlocked philosophers,
        break a Vigenère cipher. Clearing a boss earns the part's badge. This is the exam you
        actually want to take.
      </p>
      <p>
        <strong>Review.</strong> Flashcards are generated from each chapter's key points and
        mental model, scheduled with a spaced-repetition algorithm (SM-2-lite). A chapter's deck
        activates when you mark it done — or opt any deck in or out under Review → Decks. The
        top bar shows how many cards are due today.
      </p>
      <p>
        <strong>Katas & interview bank.</strong> Small coding exercises run right in the browser
        against instant tests (in a sandboxed worker — nothing leaves the page), and a filterable
        bank of {INTERVIEW_COUNT} interview questions spans every chapter, mid to staff level.
      </p>
      <p>
        <strong>Search.</strong> Press <kbd>⌘K</kbd> (or <kbd>Ctrl K</kbd>) anywhere — chapters,
        key points, sims, katas, interview questions and bosses are all one palette away.
      </p>

      <h2>Your data</h2>
      <p>
        Everything you do — progress, review schedule, kata drafts, quiz answers — lives in{" "}
        <em>this browser's</em> localStorage. There is no backend, no account, no analytics, no
        cookies. Moving to another browser or machine? Export everything as one JSON file under
        Review → Your data, and import it there.
      </p>

      <h2>Under the hood</h2>
      <p>
        A fully static single-page app: React 19 + TypeScript (strict) + Vite, custom hash
        router, zero runtime fetches — it works offline once loaded. Every simulator's engine is
        a pure, framework-free module verified by Node truth-tests in CI; the content pipeline is
        data-driven (chapters render from typed data, figures and sims resolve via a registry).
        The source is open under the MIT license.
      </p>

      <h2>Sources & inspiration</h2>
      <p>
        Standing on broad shoulders: Harvard's CS50, Crash Course Computer Science, and the
        classic bottom-up tradition of Petzold's <em>Code</em> and nand2tetris. Facts are
        verified at authoring time; each chapter lists its own sources at the end.
      </p>

      <h2>Author</h2>
      <p className="about-author">
        <strong>Vasyl Krupka</strong> — Senior Fullstack Engineer · Ukraine{" "}
        <span aria-label="Ukraine">🇺🇦</span>
        <br />
        <a className="flink" href="https://www.linkedin.com/in/vasyl-krupka/" target="_blank" rel="noreferrer">
          LinkedIn ↗
        </a>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <a className="flink" href="https://github.com/Endorrfin/computer-science" target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <a className="flink" href="mailto:krupka.ua@gmail.com">
          krupka.ua@gmail.com
        </a>
      </p>
      <p className="muted">
        Found a mistake or have an idea? Open an issue on GitHub — the guide is built in the
        open.
      </p>

      <p>
        <a className="btn btn-primary" href="#/">
          ← Back to the map
        </a>
      </p>
    </div>
  );
}
