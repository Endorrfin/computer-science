import { useHashRoute } from "../../lib/hashRouter.ts";
import { useDoneSet } from "../../lib/progress.ts";
import { CHAPTERS } from "../../data/curriculum.ts";
import { cx } from "../../lib/utils.ts";
import LensToggle from "./LensToggle.tsx";

const NAV = [
  { hash: "#/", name: "map", label: "Map" },
  { hash: "#/review", name: "review", label: "Review" },
  { hash: "#/katas", name: "katas", label: "Katas" },
  { hash: "#/interview", name: "interview", label: "Interview" },
  { hash: "#/bosses", name: "bosses", label: "Bosses" },
] as const;

export default function TopBar() {
  const route = useHashRoute();
  const done = useDoneSet();

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
          <a key={n.name} href={n.hash} className={cx("topnav-link", route.name === n.name && "active")}>
            {n.label}
          </a>
        ))}
      </nav>
      <div className="topbar-right">
        <span className="progress-chip" title="Chapters completed">
          {done.size} / {CHAPTERS.length}
        </span>
        <LensToggle />
      </div>
    </header>
  );
}
