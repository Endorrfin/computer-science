// Custom hash router (no router lib — CLAUDE.md §2).
// Routes: #/ (map) · #/part/<id> (map, part expanded) · #/chapter/<id> ·
//         #/review · #/katas[/<kataId>] · #/interview[/<chapterId>] ·
//         #/bosses · #/search (S18) · #/about (S19)
import { useSyncExternalStore } from "react";

export type Route =
  | { name: "map"; expandPart?: string }
  | { name: "chapter"; id: string }
  | { name: "review" }
  | { name: "katas"; kataId?: string } // CHANGED: S18 — search deep-links a kata
  | { name: "interview"; chapterId?: string } // CHANGED: S18 — pre-filtered bank
  | { name: "bosses" }
  | { name: "search" } // CHANGED: S18 — global search page
  | { name: "about" } // CHANGED: S19 — about the guide & author
  | { name: "notfound"; hash: string };

export function parseHash(raw: string): Route {
  const h = raw.replace(/^#/, "");
  if (h === "" || h === "/" || h === "/map") return { name: "map" };
  const seg = h.split("/").filter(Boolean);
  if (seg[0] === "chapter" && seg[1]) return { name: "chapter", id: seg[1] };
  if (seg[0] === "part" && seg[1]) return { name: "map", expandPart: seg[1] };
  if (seg[0] === "review") return { name: "review" };
  if (seg[0] === "katas") return { name: "katas", kataId: seg[1] }; // CHANGED: S18
  if (seg[0] === "interview") return { name: "interview", chapterId: seg[1] }; // CHANGED: S18
  if (seg[0] === "bosses") return { name: "bosses" };
  if (seg[0] === "search") return { name: "search" }; // CHANGED: S18
  if (seg[0] === "about") return { name: "about" }; // CHANGED: S19
  return { name: "notfound", hash: h };
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function getSnapshot(): string {
  return window.location.hash;
}

export function useHashRoute(): Route {
  return parseHash(useSyncExternalStore(subscribe, getSnapshot));
}

export function navigate(hash: string): void {
  window.location.hash = hash;
}
