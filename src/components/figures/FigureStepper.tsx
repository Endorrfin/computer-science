// FigureStepper — shared frame player for every [fig] (INTERACTIVES.md):
// steppable animated SVG frames with prev/next/auto and a live caption.
// Never a GIF in-app (§6).
import { useEffect, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { cx, useReducedMotion } from "../../lib/utils.ts";

export type Frame = {
  caption: string;
  render: () => ReactNode; // SVG content for this frame
};

type Props = {
  title: string;
  figKey: string;
  viewBox: string;
  frames: Frame[];
  accent?: string;
  autoMs?: number;
};

export default function FigureStepper({ title, figKey, viewBox, frames, accent, autoMs = 2600 }: Props) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const reduced = useReducedMotion();
  const last = frames.length - 1;

  useEffect(() => {
    if (!auto || reduced) return;
    const id = window.setInterval(() => {
      setI((cur) => {
        if (cur >= last) {
          setAuto(false);
          return cur;
        }
        return cur + 1;
      });
    }, autoMs);
    return () => window.clearInterval(id);
  }, [auto, reduced, autoMs, last]);

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setI((c) => Math.min(last, c + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setI((c) => Math.max(0, c - 1));
    }
  }

  return (
    <figure
      className="figstep"
      style={accent ? ({ "--accent": accent } as CSSProperties) : undefined}
      role="group"
      aria-roledescription="steppable figure"
      aria-label={title}
      onKeyDown={onKeyDown}
    >
      <div className="fs-head">
        <span className="fs-title">{title}</span>
        <code className="ss-key">{figKey}</code>
      </div>
      <div className="fs-stage">
        {/* key swap re-triggers the CSS enter animation per frame */}
        <svg viewBox={viewBox} width="100%" role="img" aria-label={frames[i].caption} key={i} className="fs-frame">
          {frames[i].render()}
        </svg>
      </div>
      <div className="fs-bar">
        <button type="button" className="btn" onClick={() => setI((c) => Math.max(0, c - 1))} disabled={i === 0} aria-label="Previous frame">
          ← prev
        </button>
        <div className="fs-dots" aria-hidden="true">
          {frames.map((_, d) => (
            <button key={d} type="button" className={cx("fs-dot", d === i && "on")} onClick={() => setI(d)} tabIndex={-1} />
          ))}
        </div>
        <button type="button" className="btn" onClick={() => setI((c) => Math.min(last, c + 1))} disabled={i === last} aria-label="Next frame">
          next →
        </button>
        {!reduced && (
          <button type="button" className="btn" onClick={() => { if (!auto && i >= last) setI(0); setAuto((a) => !a); }} aria-label={auto ? "Stop auto-play" : "Auto-play frames"}>
            {auto ? "⏸ auto" : "⏵ auto"}
          </button>
        )}
        <span className="fs-count">
          {i + 1} / {frames.length}
        </span>
      </div>
      <figcaption className="fs-caption" aria-live="polite">
        <strong>{i + 1}.</strong> {frames[i].caption}
      </figcaption>
    </figure>
  );
}
