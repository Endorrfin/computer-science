// KatasPage — the kata runner hub. Lists all KATAS grouped by chapter with a
// difficulty chip, tags, and a solved ✓; selecting one opens the KataRunner.
// A "N / total solved" counter reads the solved set. Layout mirrors
// InterviewPage / BossesPage (.container .pagestub, grouped sections).
//
// The solved set is persisted in localStorage under `cs:kata-solved` (key
// style mirrors progress.ts). The store lives here as a tiny external store +
// useSyncExternalStore hook — NOT exported, so this file still default-exports
// a single component (react-refresh clean). KataRunner receives the current
// kata's solved flag and an onSolved callback; marking solved updates the store
// and the counter re-renders live.
import { useState, useSyncExternalStore } from "react";
import { KATAS } from "../../data/katas.ts";
import type { Kata } from "../../data/katas.ts";
import { chapterById } from "../../data/curriculum.ts";
import { cx } from "../../lib/utils.ts";
import KataRunner from "../study/KataRunner.tsx";

// ---- solved-set store (localStorage, mirrors progress.ts style) ----------
const SOLVED_KEY = "cs:kata-solved";

function loadSolved(): string[] {
  try {
    const raw = localStorage.getItem(SOLVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

let solvedState: string[] = loadSolved();
let solvedVersion = 0;
const solvedListeners = new Set<() => void>();

function emitSolved(): void {
  solvedVersion++;
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify(solvedState));
  } catch {
    /* private mode — solved set stays in memory */
  }
  solvedListeners.forEach((l) => l());
}
function subscribeSolved(cb: () => void): () => void {
  solvedListeners.add(cb);
  return () => solvedListeners.delete(cb);
}
function markSolved(id: string): void {
  if (!solvedState.includes(id)) {
    solvedState = [...solvedState, id];
    emitSolved();
  }
}
function useSolvedSet(): ReadonlySet<string> {
  useSyncExternalStore(subscribeSolved, () => solvedVersion);
  return new Set(solvedState);
}

// Stable chapter ordering: the two chapters this batch targets, in curriculum
// order. Derived from the data so adding a kata for a new chapter still shows.
function chapterOrder(): string[] {
  const seen: string[] = [];
  for (const k of KATAS) if (!seen.includes(k.chapterId)) seen.push(k.chapterId);
  seen.sort((a, b) => {
    const ca = chapterById(a);
    const cb = chapterById(b);
    return (ca?.order ?? 0) - (cb?.order ?? 0);
  });
  return seen;
}

const DIFFICULTY_LABEL: Record<Kata["difficulty"], string> = {
  intro: "intro",
  core: "core",
  stretch: "stretch",
};

export default function KatasPage() {
  const solved = useSolvedSet();
  const [selectedId, setSelectedId] = useState<string>(() => KATAS[0]?.id ?? "");
  const selected = KATAS.find((k) => k.id === selectedId) ?? KATAS[0];

  const solvedCount = KATAS.filter((k) => solved.has(k.id)).length;

  return (
    <div className="container pagestub" style={{ maxWidth: 1000 }}>
      <h1>Katas</h1>
      <p className="muted">
        Small coding exercises with instant tests. Write plain JavaScript, hit{" "}
        <strong>Run</strong>, and see each test go green or red. Your code runs entirely in your
        browser — inside a sandboxed, time-boxed Web Worker with no network and no page access, so
        an accidental infinite loop is stopped after a couple of seconds rather than freezing the
        tab. The prompt shows the intended TypeScript signature for teaching; the runnable code is
        JavaScript.
      </p>
      <p className="chip chip-accent" style={{ marginTop: 4 }}>
        {solvedCount} / {KATAS.length} solved
      </p>

      <div
        className="kata-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 300px) 1fr",
          gap: 24,
          marginTop: 24,
          alignItems: "start",
        }}
      >
        {/* Master list, grouped by chapter */}
        <nav className="kata-list" aria-label="Kata list">
          {chapterOrder().map((cid) => {
            const ch = chapterById(cid);
            const num = cid.replace(/^ch/, "");
            const label = ch ? `ch.${num} · ${ch.title}` : cid;
            return (
              <div key={cid} className="kata-group" style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, color: "var(--tx2)", margin: "0 0 8px" }}>{label}</h2>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {KATAS.filter((k) => k.chapterId === cid).map((k) => {
                    const isSel = k.id === selected?.id;
                    const isSolved = solved.has(k.id);
                    return (
                      <li key={k.id} style={{ marginBottom: 6 }}>
                        <button
                          type="button"
                          className={cx("kata-listitem", isSel && "selected")}
                          onClick={() => setSelectedId(k.id)}
                          aria-current={isSel ? "true" : undefined}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            padding: "8px 10px",
                            borderRadius: "var(--r-s)",
                            border: "1px solid",
                            borderColor: isSel ? "var(--p4)" : "var(--line)",
                            background: isSel
                              ? "color-mix(in srgb, var(--p4) 12%, var(--surface))"
                              : "var(--surface)",
                            color: "var(--tx)",
                            font: "inherit",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ fontWeight: isSel ? 600 : 400 }}>{k.title}</span>
                            {isSolved && (
                              <span aria-label="solved" style={{ color: "var(--sem-ok)" }}>
                                ✓
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 5,
                              alignItems: "center",
                            }}
                          >
                            <span
                              className="kata-diff"
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10.5,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                color: "var(--tx3)",
                              }}
                            >
                              {DIFFICULTY_LABEL[k.difficulty]}
                            </span>
                            {k.tags.map((t) => (
                              <span
                                key={t}
                                className="kata-tag"
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 10.5,
                                  color: "var(--tx3)",
                                  border: "1px solid var(--line)",
                                  borderRadius: 999,
                                  padding: "0 6px",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Runner for the selected kata */}
        <div className="kata-detail" style={{ minWidth: 0 }}>
          {selected && (
            <KataRunner
              key={selected.id}
              kata={selected}
              solved={solved.has(selected.id)}
              onSolved={() => markSolved(selected.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
