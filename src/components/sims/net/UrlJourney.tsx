// [micro] url-journey — ch.28 "The Web". What actually happens between pressing
// Enter and seeing pixels: the request goes through eight phases — DNS lookup,
// TCP handshake, TLS handshake, send request, wait (TTFB), download, parse,
// render — each taking some milliseconds. Laid end to end they form a WATERFALL
// on one timeline, so you can see where the time really goes (setup + server
// think time dominate a cold first visit; rendering is a sliver). Play sweeps a
// cursor left→right revealing the bars in order; click any segment to expand its
// layer + what it does. The URL field is a cosmetic label only — the phases and
// their durations come verbatim from DEFAULT_PHASES / timeline() in ./web.ts
// (the tested engine); nothing is recomputed here. Reduced motion → all revealed,
// Step only.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { clamp, cx, useReducedMotion } from "../../../lib/utils.ts";
import { DEFAULT_PHASES, timeline } from "./web.ts";
import type { Phase, PhaseId, TimelineEntry } from "./web.ts";
import "../../../theme/_p7css/url-journey.css";

const ACCENT = "#38bdf8";

// Each phase's layer maps to a semantic hue: the transport/link work is data
// (cyan), setup handshakes (TCP) are control (orange), security is state
// (violet), the server wait is the accent, and browser work is green.
const PHASE_TONE: Record<PhaseId, string> = {
  dns: "var(--sem-control)", // resolve name → IP: app/UDP round trip
  tcp: "var(--sem-control)", // connection setup
  tls: "var(--sem-state)", // security handshake
  request: "var(--sem-data)", // bytes on the wire
  wait: "var(--accent)", // server think time (TTFB)
  download: "var(--sem-data)", // response body streams in
  parse: "var(--sem-ok)", // browser builds DOM/CSSOM
  render: "var(--sem-ok)", // layout, paint, composite
};

// Short axis label per phase (mono, must stay legible under a bar).
const PHASE_SHORT: Record<PhaseId, string> = {
  dns: "DNS",
  tcp: "TCP",
  tls: "TLS",
  request: "req",
  wait: "wait",
  download: "down",
  parse: "parse",
  render: "render",
};

// Waterfall SVG geometry (viewBox units).
const VB_W = 660;
const BAR_H = 40;
const BAR_TOP = 44;
const PAD_X = 10;
const AXIS_H = 22;
const VB_H = BAR_TOP + BAR_H + AXIS_H;

export default function UrlJourney() {
  const reduced = useReducedMotion();

  const phases = useMemo<Phase[]>(() => DEFAULT_PHASES, []);
  const { entries, totalMs } = useMemo(() => timeline(phases), [phases]);
  const n = entries.length;

  const [url, setUrl] = useState("https://example.com/");
  // Reveal cursor, in ms along the timeline. Starts at 0 (nothing revealed).
  const [cursorMs, setCursorMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Which segment is expanded (its detail card shown). Independent of playback.
  const [openId, setOpenId] = useState<PhaseId | null>(null);

  // Under reduced motion, show the whole waterfall immediately.
  const revealMs = reduced ? totalMs : cursorMs;
  const atEnd = revealMs >= totalMs;

  // How many phases are fully revealed at the current cursor.
  const revealedCount = useMemo(
    () => entries.filter((e) => e.endMs <= revealMs).length,
    [entries, revealMs],
  );
  // The phase currently in progress under the cursor (partially filled), if any.
  const activeEntry = useMemo(
    () => entries.find((e) => e.startMs < revealMs && revealMs < e.endMs) ?? null,
    [entries, revealMs],
  );
  const openEntry = useMemo(
    () => (openId ? entries.find((e) => e.phase.id === openId) ?? null : null),
    [entries, openId],
  );

  // Play loop: sweep the cursor across totalMs. ~one full pass in ~2.4s at 1×,
  // scaled by speed; the tick advances by a fixed ms slice so the sweep is smooth.
  const step = Math.max(4, Math.round(totalMs / 26));
  useSimClock(running, 12 * speed, () => {
    setCursorMs((c) => {
      const next = c + step;
      if (next >= totalMs) {
        setRunning(false);
        return totalMs;
      }
      return next;
    });
  });

  function onToggle(): void {
    if (reduced) return;
    if (!running && atEnd) {
      setCursorMs(0); // replay from the start
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }
  // Step advances one whole phase boundary (snaps the cursor to the next endMs).
  function onStep(): void {
    setRunning(false);
    setCursorMs((c) => {
      const next = entries.find((e) => e.endMs > c + 0.5);
      return next ? next.endMs : totalMs;
    });
  }
  function onReset(): void {
    setRunning(false);
    setCursorMs(0);
    setOpenId(null);
  }

  function pickSegment(id: PhaseId): void {
    setOpenId((cur) => (cur === id ? null : id));
  }

  const status = activeEntry
    ? `in ${activeEntry.phase.name} · ${Math.round(revealMs)} / ${totalMs} ms · ${revealedCount}/${n} phases done`
    : atEnd
      ? `complete: pixels on screen after ${totalMs} ms · ${n}/${n} phases`
      : revealedCount > 0
        ? `${revealedCount}/${n} phases done · ${Math.round(revealMs)} / ${totalMs} ms`
        : `ready — press play to trace the request (total ${totalMs} ms)`;

  return (
    <SimShell
      title="URL journey — Enter to pixels"
      simKey="url-journey"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <label className="urlj-field ss-field">
          <span aria-hidden="true">url</span>
          <input
            className="urlj-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            aria-label="URL to visit (label only — the phases are fixed)"
            placeholder="https://example.com/"
          />
        </label>
      }
      footer={
        <SegmentDetail entry={openEntry} tone={openEntry ? PHASE_TONE[openEntry.phase.id] : ACCENT} />
      }
    >
      <div className="urlj-stage">
        <Waterfall
          entries={entries}
          totalMs={totalMs}
          revealMs={revealMs}
          openId={openId}
          reduced={reduced}
          onPick={pickSegment}
        />
        <Legend />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// The waterfall: each phase a bar whose width ∝ its ms, laid end to end, colored
// by layer, revealed left→right up to the cursor. A moving playhead marks the
// cursor; clicking a bar expands its detail. Bars are real <button>s so the
// whole thing is keyboard operable.
// ---------------------------------------------------------------------------
function Waterfall({
  entries,
  totalMs,
  revealMs,
  openId,
  reduced,
  onPick,
}: {
  entries: TimelineEntry[];
  totalMs: number;
  revealMs: number;
  openId: PhaseId | null;
  reduced: boolean;
  onPick: (id: PhaseId) => void;
}) {
  const inner = VB_W - PAD_X * 2;
  const span = Math.max(1, totalMs);
  const scale = inner / span;
  const x = (ms: number) => PAD_X + ms * scale;

  const playing = revealMs > 0 && revealMs < totalMs;

  const summary =
    `Request waterfall: ${entries.length} phases totalling ${totalMs} ms — ` +
    entries.map((e) => `${e.phase.name} ${e.phase.ms}ms`).join(", ") +
    `. Revealed to ${Math.round(revealMs)} ms.`;

  return (
    <div className="urlj-wf">
      <svg
        className={cx("urlj-svg", !reduced && "urlj-anim")}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={summary}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* running total, right-aligned above the bar */}
        <text className="urlj-total" x={VB_W - PAD_X} y={26} textAnchor="end">
          {Math.round(revealMs)} / {totalMs} ms
        </text>
        <text className="urlj-total-lbl" x={PAD_X} y={26} textAnchor="start">
          time to first pixel
        </text>

        {/* baseline track */}
        <rect
          className="urlj-track"
          x={PAD_X}
          y={BAR_TOP}
          width={inner}
          height={BAR_H}
          rx={6}
        />

        {entries.map((e) => {
          const x0 = x(e.startMs);
          const x1 = x(e.endMs);
          const w = Math.max(0, x1 - x0);
          const full = e.endMs <= revealMs;
          const started = e.startMs < revealMs;
          const frac = full ? 1 : started ? (revealMs - e.startMs) / e.phase.ms : 0;
          const revW = w * clamp(frac, 0, 1);
          const tone = PHASE_TONE[e.phase.id];
          const isOpen = openId === e.phase.id;
          const wide = w > 30;
          return (
            <g
              key={e.phase.id}
              className={cx("urlj-seg", started && "is-on", isOpen && "is-open")}
              style={{ color: tone }}
              onClick={() => onPick(e.phase.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isOpen}
              aria-label={`${e.phase.name}, ${e.phase.ms} ms, ${e.phase.layer} layer. ${isOpen ? "Selected." : "Select to expand."}`}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  onPick(e.phase.id);
                }
              }}
            >
              {/* faint full extent so the whole waterfall is legible before reveal */}
              <rect className="urlj-seg-ghost" x={x0} y={BAR_TOP} width={w} height={BAR_H} rx={4} fill={tone} />
              {/* the revealed portion, drawn on top */}
              {revW > 0.5 && (
                <rect className="urlj-seg-fill" x={x0} y={BAR_TOP} width={revW} height={BAR_H} rx={4} fill={tone} />
              )}
              {/* hairline separators between phases */}
              <line className="urlj-seg-sep" x1={x0} y1={BAR_TOP} x2={x0} y2={BAR_TOP + BAR_H} />
              {/* under-bar label + ms tick */}
              {wide && (
                <>
                  <text className="urlj-seg-lbl" x={x0 + w / 2} y={BAR_TOP + BAR_H + 12} textAnchor="middle">
                    {PHASE_SHORT[e.phase.id]}
                  </text>
                  <text className="urlj-seg-ms" x={x0 + w / 2} y={BAR_TOP + BAR_H + 20} textAnchor="middle">
                    {e.phase.ms}ms
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* playhead cursor */}
        {playing && (
          <g className="urlj-playhead" aria-hidden="true">
            <line x1={x(revealMs)} y1={BAR_TOP - 6} x2={x(revealMs)} y2={BAR_TOP + BAR_H + 6} />
            <path d={`M ${x(revealMs) - 4} ${BAR_TOP - 6} L ${x(revealMs) + 4} ${BAR_TOP - 6} L ${x(revealMs)} ${BAR_TOP - 1} Z`} />
          </g>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail card for the clicked segment: its layer + blurb. Empty prompt when
// nothing is selected, so the footer height is stable.
// ---------------------------------------------------------------------------
function SegmentDetail({ entry, tone }: { entry: TimelineEntry | null; tone: string }) {
  if (!entry) {
    return (
      <div className="urlj-detail is-empty" aria-live="polite">
        <span className="urlj-detail-hint">click a segment above to see what that phase does →</span>
      </div>
    );
  }
  const { phase, startMs, endMs } = entry;
  return (
    <div className="urlj-detail" style={{ ["--urlj-tone" as string]: tone }} aria-live="polite">
      <div className="urlj-detail-head">
        <span className="urlj-detail-name">{phase.name}</span>
        <span className="urlj-detail-layer">{phase.layer}</span>
      </div>
      <p className="urlj-detail-blurb">{phase.blurb}</p>
      <div className="urlj-detail-meta">
        <span className="urlj-detail-chip">
          <span className="urlj-detail-k">takes</span> {phase.ms} ms
        </span>
        <span className="urlj-detail-chip">
          <span className="urlj-detail-k">at</span> {startMs}–{endMs} ms
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend keying the layer colors.
// ---------------------------------------------------------------------------
function Legend() {
  const items: { tone: string; label: string }[] = [
    { tone: "var(--sem-control)", label: "connection setup" },
    { tone: "var(--sem-state)", label: "security (TLS)" },
    { tone: "var(--accent)", label: "server wait (TTFB)" },
    { tone: "var(--sem-data)", label: "bytes on the wire" },
    { tone: "var(--sem-ok)", label: "browser (parse/render)" },
  ];
  return (
    <div className="urlj-legend" aria-hidden="true">
      {items.map((it) => (
        <span key={it.label} className="urlj-legend-item">
          <span className="urlj-legend-chip" style={{ background: it.tone }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
