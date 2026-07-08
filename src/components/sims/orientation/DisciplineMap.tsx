// [HERO] discipline-map — ch.0a (The Map). A DIFFERENT view of computer science
// than the landing's vertical spectrum stack: the ten AREAS laid out on a ring
// (by their `slot`, 0 at top and clockwise), each node colored by its part's
// accent, with the LINKS drawn as edges labeled by the crossing idea (bits run
// on gates; adversaries live on the wire; models learn from data). Click or
// focus an area to light it and its neighbors and dim the rest; a side panel
// tells you what the area is, which areas it touches and why, and links to that
// part of the guide. Reactive (no time axis) → SimShell without transport.
// Fully keyboard-driven: every node is a focusable button; Enter/Space selects.
//
// Single default export (react-refresh); geometry helpers are file-local. Colors
// are theme vars (part accents via partById); the sheet adds hover/anim only.
// No localStorage — the selection lives in React.
import { useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { AREAS, LINKS, areaById, neighborsOf } from "./map.ts";
import type { Area } from "./map.ts";
import { partById } from "../../../data/curriculum.ts";
import "../../../theme/_p0css/discipline-map.css";

const ACCENT = "#94A3B8";

// SVG canvas + ring geometry. Square viewBox so the ring scales cleanly.
const VB = 640;
const CX = VB / 2;
const CY = VB / 2;
const RING = 232; // radius of the node ring
const NODE_R = 40; // node circle radius
const SLOTS = 10; // AREAS.length, but kept explicit for the angle math

// slot 0 at the top (−90°), going clockwise.
function slotAngle(slot: number): number {
  return (-90 + (360 / SLOTS) * slot) * (Math.PI / 180);
}
function slotXY(slot: number): { x: number; y: number } {
  const a = slotAngle(slot);
  return { x: CX + RING * Math.cos(a), y: CY + RING * Math.sin(a) };
}

function accentOf(area: Area): string {
  return partById(area.partId)?.accent ?? ACCENT;
}

// Where a node's label sits relative to its center — pushed outward on the
// left/right flanks so text clears the ring, stacked under top/bottom nodes.
function labelAnchor(slot: number): "start" | "middle" | "end" {
  const { x } = slotXY(slot);
  if (Math.abs(x - CX) < 12) return "middle";
  return x > CX ? "start" : "end";
}

type Edge = { from: Area; to: Area; label: string; incident: boolean };

export default function DisciplineMap() {
  // start with nothing selected — the whole map glows, an invitation to explore.
  const [selected, setSelected] = useState<string | null>(null);

  const sel = selected ? areaById(selected) : undefined;
  const neighbors = useMemo(() => (sel ? neighborsOf(sel.id) : []), [sel]);
  const neighborIds = useMemo(
    () => new Set(neighbors.map((n) => n.area.id)),
    [neighbors],
  );

  // is an area lit? nothing selected → everyone; otherwise self + neighbors.
  const isLit = (id: string): boolean => !sel || id === sel.id || neighborIds.has(id);

  const edges: Edge[] = useMemo(
    () =>
      LINKS.map((l) => {
        const from = areaById(l.from);
        const to = areaById(l.to);
        if (!from || !to) return null;
        const incident = sel ? l.from === sel.id || l.to === sel.id : false;
        return { from, to, label: l.label, incident };
      }).filter((e): e is Edge => e !== null),
    [sel],
  );

  const part = sel ? partById(sel.partId) : undefined;

  const status = sel
    ? `${sel.name} — ${neighbors.length} link${neighbors.length === 1 ? "" : "s"} to neighbouring areas. ${sel.blurb}`
    : "Ten areas of computer science on one ring — click or focus a node to trace what it connects to.";

  return (
    <SimShell
      title="The discipline map — computer science as a connected landscape"
      simKey="discipline-map"
      kind="hero"
      accent={ACCENT}
      onReset={() => setSelected(null)}
      status={status}
      controls={
        <div className="dm-ctl">
          <span className="dm-ctl-hint muted">click a node · Tab + Enter to explore by keyboard</span>
          {sel && (
            <button type="button" className="btn" onClick={() => setSelected(null)}>
              ✕ clear selection
            </button>
          )}
        </div>
      }
    >
      <div className="dm-stage">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className={cx("dm-svg", sel && "has-sel")}
          role="img"
          aria-label={`Discipline map of ${AREAS.length} areas of computer science on a ring, connected by ${LINKS.length} crossing ideas`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* edges (under the nodes) */}
          <g className="dm-edges">
            {edges.map((e) => {
              const a = slotXY(e.from.slot);
              const b = slotXY(e.to.slot);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dim = sel ? !e.incident : false;
              return (
                <g
                  key={`${e.from.id}-${e.to.id}`}
                  className={cx("dm-edge", e.incident && "is-hot", dim && "is-dim")}
                >
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="dm-edge-line" />
                  {e.incident && (
                    <text x={mx} y={my - 4} className="dm-edge-label" textAnchor="middle">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* nodes */}
          <g className="dm-nodes">
            {AREAS.map((area) => {
              const { x, y } = slotXY(area.slot);
              const accent = accentOf(area);
              const active = sel?.id === area.id;
              const lit = isLit(area.id);
              const anchor = labelAnchor(area.slot);
              const lx = anchor === "middle" ? x : anchor === "start" ? x + NODE_R + 8 : x - NODE_R - 8;
              const ly = anchor === "middle" ? (y < CY ? y - NODE_R - 10 : y + NODE_R + 20) : y + 5;
              return (
                <g
                  key={area.id}
                  className={cx("dm-node", active && "is-active", !lit && "is-dim")}
                  style={{ "--node": accent } as CSSProperties}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${area.name} — ${partById(area.partId)?.name ?? "part"}. ${area.blurb}`}
                  onClick={() => setSelected((s) => (s === area.id ? null : area.id))}
                  onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected((s) => (s === area.id ? null : area.id));
                    }
                  }}
                >
                  <circle cx={x} cy={y} r={NODE_R} className="dm-node-ring" />
                  <text x={x} y={y + 5} className="dm-node-slot" textAnchor="middle">
                    {area.slot}
                  </text>
                  <text
                    x={lx}
                    y={ly}
                    className="dm-node-name"
                    textAnchor={anchor}
                  >
                    {area.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* side panel */}
        <aside className="dm-panel" aria-live="polite">
          {sel && part ? (
            <>
              <header className="dm-panel-head" style={{ "--node": accentOf(sel) } as CSSProperties}>
                <span className="dm-panel-dot" aria-hidden="true" />
                <div>
                  <h3 className="dm-panel-title">{sel.name}</h3>
                  <p className="dm-panel-part">
                    {part.name} · <span className="muted">{part.tagline}</span>
                  </p>
                </div>
              </header>
              <p className="dm-panel-blurb">{sel.blurb}</p>

              <h4 className="dm-panel-sub">Connects to</h4>
              <ul className="dm-links">
                {neighbors.map((n) => (
                  <li key={n.area.id} className="dm-link">
                    <button
                      type="button"
                      className="dm-link-btn"
                      style={{ "--node": accentOf(n.area) } as CSSProperties}
                      onClick={() => setSelected(n.area.id)}
                    >
                      <span className="dm-link-name">{n.area.name}</span>
                      <span className="dm-link-why muted">{n.label}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <a className="btn btn-primary dm-panel-go" href={`#/part/${sel.partId}`}>
                Open {part.name} →
              </a>
            </>
          ) : (
            <div className="dm-panel-empty">
              <p className="dm-panel-lead">Computer science is one connected landscape.</p>
              <p className="muted">
                Ten areas on a ring, each a part of this guide. The edges are the ideas that cross between them — bits
                running on gates, adversaries on the wire, models learning from data. Pick a node to see what it
                touches and jump in.
              </p>
            </div>
          )}
        </aside>
      </div>
    </SimShell>
  );
}
