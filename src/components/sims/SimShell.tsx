// SimShell — the shared chrome around every [HERO]/[micro] sim (§6 mandate,
// INTERACTIVES.md "Shared framework"). Consistent transport, keyboard
// bindings, ARIA live status, reduced-motion behavior — the guide's signature.
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { cx, useReducedMotion } from "../../lib/utils.ts";

export type SimTransport = {
  running: boolean;
  onToggle: () => void;
  onStep: () => void;
  speed: number; // multiplier: 0.25 … 4
  onSpeed: (v: number) => void;
};

type Props = {
  title: string;
  simKey: string;
  kind?: "hero" | "micro";
  accent?: string;
  /** Omit for sims with no time axis (purely reactive ones). */
  transport?: SimTransport;
  onReset: () => void;
  /** One-line machine state, announced politely to screen readers. */
  status?: string;
  /** Sim-specific param controls (selects, toggles…). */
  controls?: ReactNode;
  /** Below-stage area (e.g. truth table). */
  footer?: ReactNode;
  children: ReactNode;
};

const SPEEDS = [0.25, 0.5, 1, 2, 4];

export default function SimShell({
  title,
  simKey,
  kind = "micro",
  accent,
  transport,
  onReset,
  status,
  controls,
  footer,
  children,
}: Props) {
  const reduced = useReducedMotion();

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const t = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (!transport) return;
    if (e.key === " ") {
      e.preventDefault();
      if (!reduced) transport.onToggle();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      transport.onStep();
    }
  }

  return (
    <section
      className={cx("simshell", kind === "hero" && "is-hero")}
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
      role="group"
      aria-roledescription="interactive simulator"
      aria-label={title}
      onKeyDown={onKeyDown}
    >
      <header className="ss-head">
        <span className="ss-kind">{kind === "hero" ? "hero sim" : "sim"}</span>
        <span className="ss-title">{title}</span>
        <code className="ss-key">{simKey}</code>
      </header>

      <div className="ss-toolbar">
        {transport && (
          <>
            <button
              type="button"
              className="btn"
              onClick={transport.onToggle}
              disabled={reduced && !transport.running}
              title={
                reduced && !transport.running
                  ? "Reduced motion is on — use Step"
                  : "Play/pause (Space)"
              }
              aria-label={transport.running ? "Pause" : "Play"}
            >
              {transport.running ? "⏸ pause" : "▶ play"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={transport.onStep}
              disabled={transport.running}
              title="One step (→)"
              aria-label="Step forward"
            >
              ⏭ step
            </button>
            <label className="ss-speed">
              <span aria-hidden="true">speed</span>
              <select
                aria-label="Simulation speed"
                value={transport.speed}
                onChange={(e) => transport.onSpeed(Number(e.target.value))}
              >
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="button" className="btn" onClick={onReset} aria-label="Reset simulation">
          ↺ reset
        </button>
        {controls && <div className="ss-controls">{controls}</div>}
      </div>

      <div className="ss-stage">{children}</div>

      <div className="ss-statusbar">
        <span className="ss-status" aria-live="polite">
          {status ?? ""}
        </span>
        {reduced && <span className="ss-rm">reduced motion → step mode</span>}
        {transport && !reduced && <span className="ss-hint">Space = play/pause · → = step</span>}
      </div>

      {footer && <div className="ss-foot">{footer}</div>}
    </section>
  );
}
