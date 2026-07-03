import type { CSSProperties } from "react";
import type { Chapter, Part } from "../../lib/types.ts";
import { prevNext } from "../../data/curriculum.ts";

export default function ComingSoon({ ch, part }: { ch: Chapter; part: Part }) {
  const { prev, next } = prevNext(ch.id);
  return (
    <div className="container chapter" style={{ "--accent": part.accent } as CSSProperties}>
      <nav className="ch-breadcrumb">
        <a href="#/">Map</a> <span aria-hidden="true">/</span>{" "}
        <a href={`#/part/${part.id}`}>{part.name}</a>
      </nav>
      <h1 className="ch-title">{ch.title}</h1>
      <p className="ch-tagline">{ch.tagline}</p>
      <div className="pagestub">
        <p className="muted">
          This chapter arrives in <strong>session {ch.plannedSession}</strong> of the roadmap.
          The guide is built bottom-up, in the open — heroes never ship half-done.
        </p>
        <p>
          <a className="btn btn-primary" href="#/">
            ← Back to the map
          </a>
        </p>
      </div>
      <nav className="ch-nav">
        {prev ? <a href={`#/chapter/${prev.id}`}>← {prev.title}</a> : <span />}
        {next ? <a href={`#/chapter/${next.id}`}>{next.title} →</a> : <span />}
      </nav>
    </div>
  );
}
