// [HERO] grand-traversal (ch.35, Capstone) — THE flagship. One keystroke is
// traced falling through every layer the guide built: a key becomes bits, the
// bits ride gates, the CPU handles the interrupt, the OS schedules it, code
// runs, it lands in a buffer, a machine recognizes it, it crosses the network,
// is sealed, stored, a model reacts, and finally a pixel lights back up. The 12
// STAGES render as a vertical stack of "layer bands" (keypress at the top,
// pixel at the bottom); a glowing token rides the active band and play/step
// walks it down the stack. The payoff — shown in the "parts lit" rail — is that
// this single journey touches all ten content parts. All data is verbatim from
// ./traversal.ts (the tested engine); nothing here re-derives the journey.
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { STAGES, partsCovered } from "./traversal.ts";
import type { Stage } from "./traversal.ts";
import { partById } from "../../../data/curriculum.ts";
import "../../../theme/_p11css/grand-traversal.css";

const ACCENT = "#94A3B8"; // P11 (Capstone) neutral
const TICKS_PER_SEC = 1.2; // one layer band per ~0.8s at speed 1
const LAST = STAGES.length - 1;

// The ten content parts, in the order the traversal first touches them. Used to
// build the "parts lit" rail — the "one keystroke touched the whole stack" beat.
const PART_ORDER = partsCovered();

// Accent for a stage, resolved once from the curriculum spectrum.
function accentOf(partId: string): string {
  return partById(partId)?.accent ?? "var(--tx3)";
}

export default function GrandTraversal() {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [index, setIndex] = useState(0);

  const stage: Stage = STAGES[index];
  const atEnd = index >= LAST;
  const partNo = partById(stage.partId)?.order ?? 0;

  // Which parts have been lit by the journey so far (stages 0..index), in
  // first-touch order — a subset (or all) of PART_ORDER.
  const litParts = useMemo(() => {
    const seen = new Set<string>();
    for (let i = 0; i <= index; i++) seen.add(STAGES[i].partId);
    return seen;
  }, [index]);
  const allLit = litParts.size >= PART_ORDER.length;

  function reset(): void {
    setIndex(0);
    setRunning(false);
  }
  function step(): void {
    setIndex((i) => Math.min(i + 1, LAST));
  }
  function jumpTo(i: number): void {
    setRunning(false);
    setIndex(i);
  }

  // Play advances one band per tick and stops itself at the pixel.
  useSimClock(running, TICKS_PER_SEC * speed, step);
  useEffect(() => {
    if (running && atEnd) setRunning(false);
  }, [running, atEnd]);

  function onToggle(): void {
    if (reduced) return;
    if (atEnd) {
      // Replay from the keypress on a fresh play.
      setIndex(0);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }

  const status = `Stage ${index + 1} / ${STAGES.length} · ${stage.title} · Part ${partNo}`;

  return (
    <SimShell
      title="One keystroke, the whole stack — a key becomes bits, and a pixel lights back up"
      simKey="grand-traversal"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep: step, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      footer={<PartsRail litParts={litParts} allLit={allLit} activePart={stage.partId} />}
    >
      <div className="gt-stage">
        <BandStack index={index} onJump={jumpTo} reduced={reduced} />
        <Detail stage={stage} index={index} atEnd={atEnd} />
      </div>
    </SimShell>
  );
}

// =========================================================================
// The layer stack — 12 bands top (keypress) to bottom (pixel). The active band
// carries the glowing token; clicking a band jumps the traversal to it.
// =========================================================================
function BandStack({
  index,
  onJump,
  reduced,
}: {
  index: number;
  onJump: (i: number) => void;
  reduced: boolean;
}) {
  return (
    <div className={cx("gt-stack", !reduced && "gt-anim")} role="list" aria-label="The layer stack, keypress at top to pixel at bottom">
      <div className="gt-endcap gt-endcap--top" aria-hidden="true">
        <span className="gt-endcap-glyph">⌨</span> keypress in
      </div>

      {STAGES.map((s, i) => {
        const active = i === index;
        const passed = i < index;
        const accent = accentOf(s.partId);
        return (
          <button
            type="button"
            key={s.key}
            role="listitem"
            className={cx("gt-band", active && "is-active", passed && "is-passed")}
            style={{ "--band": accent } as CSSProperties}
            onClick={() => onJump(i)}
            aria-current={active ? "step" : undefined}
            aria-label={`Stage ${i + 1}: ${s.title} — ${s.layer}`}
          >
            <span className="gt-band-swatch" aria-hidden="true" />
            <span className="gt-band-idx" aria-hidden="true">
              {passed ? "✓" : i + 1}
            </span>
            <span className="gt-band-text">
              <span className="gt-band-layer">{s.layer}</span>
              <span className="gt-band-title">{s.title}</span>
            </span>
            {active && (
              <span className="gt-token" aria-hidden="true">
                <span className="gt-token-key">A</span>
              </span>
            )}
          </button>
        );
      })}

      <div className="gt-endcap gt-endcap--bottom" aria-hidden="true">
        <span className="gt-endcap-glyph">▧</span> pixel out
      </div>
    </div>
  );
}

// =========================================================================
// Detail card for the active stage — headline, kicker, prose, the "you built
// this" tie-back, and the deep-link into the host chapter's hero sim.
// =========================================================================
function Detail({ stage, index, atEnd }: { stage: Stage; index: number; atEnd: boolean }) {
  const accent = accentOf(stage.partId);
  const part = partById(stage.partId);
  return (
    <aside className="gt-detail" style={{ "--accent": accent } as CSSProperties} aria-live="polite">
      <div className="gt-detail-kick">
        <span className="gt-detail-num">
          {index + 1} / {STAGES.length}
        </span>
        <span className="gt-detail-layer">{stage.layer}</span>
        {part && (
          <span className="gt-detail-part" style={{ "--accent": accent } as CSSProperties}>
            {part.name}
          </span>
        )}
      </div>

      <h3 className="gt-detail-title">{stage.title}</h3>
      <p className="gt-detail-what">{stage.what}</p>

      <p className="gt-detail-built">
        <span className="gt-built-tag" aria-hidden="true">
          you built this
        </span>
        {stage.builtIn}
      </p>

      <a className="btn btn-primary gt-detail-link" href={`#/chapter/${stage.chapterId}`}>
        open {stage.hostSim} →
      </a>

      {atEnd && (
        <p className="gt-detail-closed">
          The loop closes. From one closed switch under a key to a photon leaving the screen, that
          single keystroke fell through every layer you built.
        </p>
      )}
    </aside>
  );
}

// =========================================================================
// The "parts lit" rail — one dot per content part, lit in the accent of each
// part as the traversal reaches it. Full rail = the whole stack was touched.
// =========================================================================
function PartsRail({
  litParts,
  allLit,
  activePart,
}: {
  litParts: ReadonlySet<string>;
  allLit: boolean;
  activePart: string;
}) {
  return (
    <div className="gt-rail" aria-label={`Parts touched: ${litParts.size} of ${PART_ORDER.length}`}>
      <span className="gt-rail-label">
        parts lit <b>{litParts.size}</b>/<span>{PART_ORDER.length}</span>
      </span>
      <ol className="gt-rail-dots">
        {PART_ORDER.map((pid) => {
          const part = partById(pid);
          const lit = litParts.has(pid);
          const active = pid === activePart;
          return (
            <li
              key={pid}
              className={cx("gt-rail-dot", lit && "is-lit", active && "is-active")}
              style={{ "--accent": accentOf(pid) } as CSSProperties}
              title={part?.name}
            >
              <span className="gt-rail-swatch" aria-hidden="true" />
              <span className="gt-rail-name">{part?.name}</span>
            </li>
          );
        })}
      </ol>
      <span className={cx("gt-rail-note", allLit && "is-full")}>
        {allLit
          ? "One keystroke touched the whole stack."
          : "Watch each part light as the keystroke falls through it."}
      </span>
    </div>
  );
}
