import { useEffect } from "react";
import type { ReactNode } from "react";
import { useHashRoute } from "./lib/hashRouter.ts";
import TopBar from "./components/layout/TopBar.tsx";
import Footer from "./components/layout/Footer.tsx";
import StackMap from "./components/map/StackMap.tsx";
import ChapterPage from "./components/chapter/ChapterPage.tsx";
import ReviewPage from "./components/pages/ReviewPage.tsx";
import InterviewPage from "./components/pages/InterviewPage.tsx";
import BossesPage from "./components/pages/BossesPage.tsx";
import KatasPage from "./components/pages/KatasPage.tsx";
import SearchPage from "./components/pages/SearchPage.tsx"; // CHANGED: S18
import SearchOverlay from "./components/search/SearchOverlay.tsx"; // CHANGED: S18
import NotFound from "./components/pages/NotFound.tsx";

export default function App() {
  const route = useHashRoute();
  const routeKey = JSON.stringify(route);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

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
    default:
      page = <NotFound />;
  }

  return (
    <div className="app">
      <TopBar />
      <main className="main">{page}</main>
      <Footer />
      <SearchOverlay /> {/* CHANGED: S18 — ⌘K palette, mounted once */}
    </div>
  );
}
