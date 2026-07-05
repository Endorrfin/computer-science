// dependency-blast [micro] — ch.12 (INTERACTIVES.md). A little module graph:
// click a module to "change" it and watch the BLAST RADIUS — every module that
// (transitively) depends on it and might have to change too. Then add an
// interface SEAM and watch the radius shrink: dependents that lean on a stable
// interface instead of the implementation are insulated. This is Dependency
// Inversion made visible — the core trick that keeps million-line systems sane.
import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import SimShell from "../SimShell.tsx";

const ACCENT = "#A3E635";

type Node = { id: string; label: string; x: number; y: number };
const NODES: Node[] = [
  { id: "api", label: "api", x: 270, y: 52 },
  { id: "authService", label: "authService", x: 140, y: 142 },
  { id: "userRepo", label: "userRepo", x: 344, y: 158 },
  { id: "logger", label: "logger", x: 108, y: 258 },
  { id: "db", label: "db", x: 404, y: 262 },
];
// [dependent, dependency] — "dependent uses dependency"
const EDGES: [string, string][] = [
  ["api", "authService"],
  ["api", "userRepo"],
  ["authService", "userRepo"],
  ["authService", "logger"],
  ["userRepo", "db"],
  ["userRepo", "logger"],
];
const SEAM_NODE = "userRepo"; // where we can insert an interface

const byId: Record<string, Node> = Object.fromEntries(NODES.map((n) => [n.id, n]));
const dependents: Record<string, string[]> = Object.fromEntries(NODES.map((n) => [n.id, [] as string[]]));
for (const [dep, on] of EDGES) dependents[on].push(dep);

/** Everything that must change when `start` changes: reverse-dependency reach.
    A seam on SEAM_NODE stops the ripple flowing OUT of it to its dependents. */
function blastRadius(start: string, seam: boolean): Set<string> {
  const hit = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift() as string;
    if (seam && n === SEAM_NODE) continue; // insulated: dependents lean on the interface
    for (const d of dependents[n]) {
      if (!hit.has(d)) {
        hit.add(d);
        queue.push(d);
      }
    }
  }
  return hit;
}

function edgeGeom(a: Node, b: Node) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { x1: a.x + ux * 34, y1: a.y + uy * 20, x2: b.x - ux * 40, y2: b.y - uy * 22 };
}

export default function DependencyBlast() {
  const [changed, setChanged] = useState<string | null>(null);
  const [seam, setSeam] = useState(false);

  const hit = useMemo(() => (changed ? blastRadius(changed, seam) : new Set<string>()), [changed, seam]);
  const radius = changed ? hit.size - 1 : 0;

  const status = changed
    ? `Change "${changed}" → ${radius} other module${radius === 1 ? "" : "s"} in the blast radius${seam ? " (seam active)" : ""}.`
    : "Click a module to change it and see what else must change.";

  return (
    <SimShell
      title="dependency-blast — a change ripples up the graph"
      simKey="dependency-blast"
      accent={ACCENT}
      onReset={() => {
        setChanged(null);
        setSeam(false);
      }}
      status={status}
      controls={
        <label className="db-seamtoggle">
          <input type="checkbox" checked={seam} onChange={(e) => setSeam(e.target.checked)} />
          add interface seam at <code>userRepo</code>
        </label>
      }
      footer={
        <div className="db-legend">
          <span className="db-key origin">■ changed</span>
          <span className="db-key blast">■ must change too</span>
          <span className="db-key safe">■ insulated</span>
          {changed && <span className="db-count">blast radius: <b>{radius}</b></span>}
          <span className="muted">tip: change <code>db</code>, then toggle the seam.</span>
        </div>
      }
    >
      <div className="db">
        <svg viewBox="0 0 520 320" width="100%" role="img" aria-label="module dependency graph">
          <defs>
            <marker id="dbArrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--tx2)" />
            </marker>
          </defs>
          {/* edges: dependent → dependency */}
          {EDGES.map(([dep, on], i) => {
            const g = edgeGeom(byId[dep], byId[on]);
            const throughSeam = seam && on === SEAM_NODE;
            return (
              <line
                key={i}
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                stroke={throughSeam ? "var(--sem-data)" : "var(--line)"}
                strokeWidth={throughSeam ? 2 : 1.5}
                strokeDasharray={throughSeam ? "5 4" : undefined}
                markerEnd="url(#dbArrow)"
              />
            );
          })}
          {/* interface seam badge */}
          {seam && (
            <g>
              <rect x={byId[SEAM_NODE].x - 46} y={byId[SEAM_NODE].y - 46} width="92" height="18" rx="9" fill="color-mix(in srgb, var(--sem-data) 18%, var(--surface))" stroke="var(--sem-data)" />
              <text x={byId[SEAM_NODE].x} y={byId[SEAM_NODE].y - 33} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--sem-data)">IUserRepo</text>
            </g>
          )}
          {/* nodes */}
          {NODES.map((n) => {
            const isOrigin = changed === n.id;
            const isBlast = !isOrigin && hit.has(n.id);
            const tone = isOrigin ? "var(--sem-control)" : isBlast ? "var(--sem-err)" : changed ? "var(--sem-ok)" : "var(--line)";
            const fill = isOrigin
              ? "color-mix(in srgb, var(--sem-control) 24%, var(--surface))"
              : isBlast
                ? "color-mix(in srgb, var(--sem-err) 20%, var(--surface))"
                : "var(--s2)";
            const onKey = (e: KeyboardEvent<SVGGElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setChanged(n.id);
              }
            };
            return (
              <g key={n.id} role="button" tabIndex={0} aria-label={`Change ${n.label}`} onClick={() => setChanged(n.id)} onKeyDown={onKey} className="db-node">
                <rect x={n.x - 58} y={n.y - 19} width="116" height="38" rx="9" fill={fill} stroke={tone} strokeWidth={isOrigin || isBlast ? 2.5 : 1.5} />
                <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="13" fontFamily="var(--font-mono)" fill="var(--tx)">{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </SimShell>
  );
}
