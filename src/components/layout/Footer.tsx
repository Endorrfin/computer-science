// CHANGED: footer is two centred rows — identity, then tagline + derived stats.
// (The "Built with Vite · React · TypeScript" row was dropped to keep it to two
// lines.) Counts are DERIVED from the curriculum data so they can never drift;
// `SIGNATURE_SIMS` is the planned hero-simulator target (INTERACTIVES.md census).
import { CHAPTERS_META, PARTS_META } from "../../data/curriculumMeta.gen.ts"; // CHANGED: S19 — meta

// The climb brands as 11 parts (P1 Information … P11 Capstone); P0 Orientation
// is the on-ramp, so it's excluded from the headline count.
const PARTS_COUNT = PARTS_META.filter((p) => p.id !== "p0").length;
const UNITS_COUNT = CHAPTERS_META.length; // 37 units — all stubbed from S1, filled session by session
const SIGNATURE_SIMS = 17; // planned hero simulators (INTERACTIVES.md)

const Dot = () => (
  <span className="sep" aria-hidden="true">
    ·
  </span>
);

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-id">
          <b>Vasyl Krupka</b>
          <Dot />
          <span>Senior Fullstack Engineer</span>
          <Dot />
          <span>
            Ukraine <span aria-label="Ukraine">🇺🇦</span>
          </span>
          <Dot />
          <a className="flink" href="https://www.linkedin.com/in/vasyl-krupka/" target="_blank" rel="noreferrer">
            LinkedIn&nbsp;↗
          </a>
          <Dot />
          <a className="flink" href="https://github.com/Endorrfin/computer-science" target="_blank" rel="noreferrer">
            GitHub&nbsp;↗
          </a>
          <Dot />
          {/* CHANGED: S19 — about page */}
          <a className="flink" href="#/about">
            About
          </a>
        </div>

        <div className="footer-tag">
          <span>A deep, interactive journey through computer science — from a single transistor to modern AI.</span>
          <Dot />
          <span>{PARTS_COUNT} parts</span>
          <Dot />
          <span>{UNITS_COUNT} units</span>
          <Dot />
          <span>{SIGNATURE_SIMS} signature sims</span>
        </div>
      </div>
    </footer>
  );
}
