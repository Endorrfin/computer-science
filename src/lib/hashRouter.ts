// Custom hash router (no router lib — CLAUDE.md §2).
// Routes: #/ (map) · #/part/<id> (map, part expanded) · #/chapter/<id> ·
//         #/review · #/interview · #/bosses
import { useSyncExternalStore } from "react";

export type Route =
  | { name: "map"; expandPart?: string }
  | { name: "chapter"; id: string }
  | { name: "review" }
  | { name: "interview" }
  | { name: "bosses" }
  | { name: "notfound"; hash: string };

export function parseHash(raw: string): Route {
  const h = raw.replace(/^#/, "");
  if (h === "" || h === "/" || h === "/map") return { name: "map" };
  const seg = h.split("/").filter(Boolean);
  if (seg[0] === "chapter" && seg[1]) return { name: "chapter", id: seg[1] };
  if (seg[0] === "part" && seg[1]) return { name: "map", expandPart: seg[1] };
  if (seg[0] === "review") return { name: "review" };
  if (seg[0] === "interview") return { name: "interview" };
  if (seg[0] === "bosses") return { name: "bosses" };
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
