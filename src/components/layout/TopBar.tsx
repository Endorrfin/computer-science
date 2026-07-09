import { useHashRoute } from "../../lib/hashRouter.ts";
import { useDoneSet } from "../../lib/progress.ts";
import { CHAPTERS_META } from "../../data/curriculumMeta.gen.ts"; // CHANGED: S19 — meta, not the full curriculum
import { cx } from "../../lib/utils.ts";
import LensToggle from "./LensToggle.tsx";
import { dueCount } from "../../lib/srsMeta.ts"; // CHANGED: S19 — content-free badge
import { useDeckOverrides, useSrsCards } from "../../lib/srsStore.ts"; // CHANGED: S18
import { openSearchPalette } from "../../lib/searchOverlayStore.ts"; // CHANGED: S18

const NAV = [
  { hash: "#/", name: "map", label: "Map" },
  { hash: "#/review", name: "review", label: "Review" },
  { hash: "#/katas", name: "katas", label: "Katas" },
  { hash: "#/interview", name: "interview", label: "Interview" },
  { hash: "#/bosses", name: "bosses", label: "Bosses" },
] as const;

const IS_MAC = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);

export default function TopBar() {
  const route = useHashRoute();
  const done = useDoneSet();
  // CHANGED: S19 — live "cards due" badge, counted from meta card ids
  const overrides = useDeckOverrides();
  const srsStates = useSrsCards();
  const due = dueCount(done, overrides, srsStates, Date.now());

  return (
    <header className="topbar">
      <a className="brand" href="#/">
        <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">
          <rect width="64" height="64" rx="14" fill="var(--s2)" />
          <rect x="14" y="44" width="36" height="7" rx="3.5" fill="#FB923C" />
          <rect x="14" y="33" width="36" height="7" rx="3.5" fill="#34D399" />
          <rect x="14" y="22" width="36" height="7" rx="3.5" fill="#38BDF8" />
          <rect x="14" y="11" width="36" height="7" rx="3.5" fill="#A78BFA" />
        </svg>
        <span className="brand-name">
          Computer Science <span className="brand-sub">the interactive journey</span>
        </span>
      </a>
      <nav className="topnav" aria-label="Main">
        {NAV.map((n) => (
          <a
            key={n.name}
            href={n.hash}
            className={cx("topnav-link", route.name === n.name && "active")}
            aria-current={route.name === n.name ? "page" : undefined} // CHANGED: S19 — a11y
          >
            {n.label}
            {/* CHANGED: S18 — due-cards badge (§6: "landing shows N cards due today") */}
            {n.name === "review" && due > 0 && (
              <span className="due-badge" aria-label={`${due} cards due for review`}>
                {due > 99 ? "99+" : due}
              </span>
            )}
          </a>
        ))}
      </nav>
      <div className="topbar-right">
        {/* CHANGED: S18 — global search trigger (⌘K / Ctrl+K) */}
        <button
          type="button"
          className="search-trigger"
          onClick={openSearchPalette}
          aria-label="Search the guide"
          title={IS_MAC ? "Search (⌘K)" : "Search (Ctrl+K)"}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="search-trigger-label">Search</span>
          <kbd className="search-trigger-kbd">{IS_MAC ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <span className="progress-chip" title="Chapters completed">
          {done.size} / {CHAPTERS_META.length}
        </span>
        <LensToggle />
      </div>
    </header>
  );
}
