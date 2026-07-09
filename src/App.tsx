import { Suspense, lazy, useEffect, useRef } from "react"; // CHANGED: S19 — route-level code splitting
import type { MouseEvent, ReactNode } from "react";
import { useHashRoute } from "./lib/hashRouter.ts";
import { chapterMetaById } from "./data/curriculumMeta.gen.ts"; // CHANGED: S19 — per-route document titles
import TopBar from "./components/layout/TopBar.tsx";
import Footer from "./components/layout/Footer.tsx";
import StackMap from "./components/map/StackMap.tsx";
import NotFound from "./components/pages/NotFound.tsx";
import SearchOverlay from "./components/search/SearchOverlay.tsx"; // CHANGED: S18

// CHANGED: S19 — every content-heavy route is a lazy chunk: the landing paints
// from the meta module alone; curriculum/interview/katas load on first use and
// stay cached (shared chunks dedupe across pages).
const ChapterPage = lazy(() => import("./components/chapter/ChapterPage.tsx"));
const ReviewPage = lazy(() => import("./components/pages/ReviewPage.tsx"));
const InterviewPage = lazy(() => import("./components/pages/InterviewPage.tsx"));
const BossesPage = lazy(() => import("./components/pages/BossesPage.tsx"));
const KatasPage = lazy(() => import("./components/pages/KatasPage.tsx"));
const SearchPage = lazy(() => import("./components/pages/SearchPage.tsx"));
const AboutPage = lazy(() => import("./components/pages/AboutPage.tsx")); // CHANGED: S19

// CHANGED: S19 — visible fallback while a route chunk downloads. The spinner
// is CSS-only and collapses to plain text under prefers-reduced-motion.
function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>Loading…</span>
    </div>
  );
}

const BASE_TITLE = "Computer Science — The Interactive Journey";

// CHANGED: S19 — a11y: every route announces itself in the tab title.
function routeTitle(route: ReturnType<typeof useHashRoute>): string {
  switch (route.name) {
    case "map":
      return BASE_TITLE;
    case "chapter": {
      const meta = chapterMetaById(route.id);
      return meta ? `${meta.title} · ${BASE_TITLE}` : BASE_TITLE;
    }
    case "review":
      return `Review · ${BASE_TITLE}`;
    case "interview":
      return `Interview bank · ${BASE_TITLE}`;
    case "bosses":
      return `Boss challenges · ${BASE_TITLE}`;
    case "katas":
      return `Katas · ${BASE_TITLE}`;
    case "search":
      return `Search · ${BASE_TITLE}`;
    case "about":
      return `About · ${BASE_TITLE}`;
    default:
      return `Not found · ${BASE_TITLE}`;
  }
}

export default function App() {
  const route = useHashRoute();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const routeKey = JSON.stringify(route);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = routeTitle(route); // CHANGED: S19
    // CHANGED: S19 — a11y: after in-app navigation, move focus to the page
    // region so screen readers announce the change (never on initial load).
    if (firstRender.current) {
      firstRender.current = false;
    } else {
      mainRef.current?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routeKey is the route's identity
  }, [routeKey]);

  // CHANGED: S19 — hash router owns location.hash, so the skip link must
  // focus the target instead of navigating (href stays for AT semantics).
  function onSkip(e: MouseEvent<HTMLAnchorElement>): void {
    e.preventDefault();
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollIntoView({ block: "start" });
  }

  let page: ReactNode;
  switch (route.name) {
    case "map":
      page = <StackMap expandPart={route.expandPart} />;
      break;
    case "chapter":
      page = <ChapterPage id={route.id} />;
      break;
    case "review":
      page = <ReviewPage />;
      break;
    case "interview":
      // CHANGED: S18 — deep-linkable pre-filter; key remounts on a new deep link
      page = <InterviewPage key={route.chapterId ?? "all"} chapterId={route.chapterId} />;
      break;
    case "bosses":
      page = <BossesPage />;
      break;
    case "katas":
      // CHANGED: S18 — search deep-links a specific kata
      page = <KatasPage key={route.kataId ?? "all"} initialKataId={route.kataId} />;
      break;
    case "search": // CHANGED: S18
      page = <SearchPage />;
      break;
    case "about": // CHANGED: S19
      page = <AboutPage />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <div className="app">
      {/* CHANGED: S19 — a11y: lets keyboard users jump over the nav */}
      <a className="skip-link" href="#main-content" onClick={onSkip}>
        Skip to content
      </a>
      <TopBar />
      {/* CHANGED: S19 — Suspense around lazy routes; tabIndex −1 makes the
          region programmatically focusable for the skip link + route change */}
      <main className="main" id="main-content" ref={mainRef} tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>{page}</Suspense>
      </main>
      <Footer />
      <SearchOverlay /> {/* CHANGED: S18 — ⌘K palette, mounted once */}
    </div>
  );
}
