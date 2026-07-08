// [micro] election-toy (ch.30) — Raft-style leader election. Three scenarios,
// each a thin skin over ./election.ts: kill the leader (a clean re-election
// one term higher), split 3|2 (the majority side elects, the minority is
// stranded), split 2|2 (neither side reaches quorum → no leader at all). The
// quorum arithmetic (quorum(n) = ⌊n/2⌋+1) is exactly what makes split-brain
// impossible — that's the one idea the sim exists to make visible. Nodes sit
// on a circle; a transport steps through the engine's own ElectionEvent trace
// (timeout → request-vote → vote → leader/no-quorum), animating vote messages
// between nodes. Nothing here recomputes an outcome — every role, term and
// verdict comes straight from election.ts. Reduced motion → step only.
// Prefix: el-.
import { useMemo, useRef, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { quorum, scenarioLeaderFailure, scenarioPartition } from "./election.ts";
import type { Cluster, ElectionEvent, PartitionResult, Role } from "./election.ts";
import "../../../theme/_p8css/election-toy.css";

const ACCENT = "#60A5FA";

// Fixed ring geometry for the node circle (SVG viewBox is 420×344).
const RING_CX = 210;
const RING_CY = 172;
const RING_R = 128;

type ScenarioId = "leader-failure" | "partition-3-2" | "even-split";

type Group = PartitionResult["groups"][number];

type Scenario = {
  id: ScenarioId;
  label: string;
  n: number;
  events: ElectionEvent[];
  cluster: Cluster;
  groups: PartitionResult["groups"] | null;
  splitBrain: boolean;
};

const SCENARIOS: readonly { id: ScenarioId; label: string; hint: string }[] = [
  { id: "leader-failure", label: "Kill leader", hint: "a follower times out and wins cleanly" },
  { id: "partition-3-2", label: "Partition 3 | 2", hint: "majority side elects, minority stranded" },
  { id: "even-split", label: "Even split 2 | 2", hint: "neither side reaches quorum → no leader" },
];

const ROLE_COLOR: Record<Role, string> = {
  leader: "var(--sem-control)",
  follower: "var(--accent)",
  candidate: "var(--sem-state)",
  down: "var(--sem-err)",
};

function buildScenario(id: ScenarioId): Scenario {
  if (id === "leader-failure") {
    const r = scenarioLeaderFailure(5);
    return { id, label: "Kill leader", n: 5, events: r.events, cluster: r.cluster, groups: null, splitBrain: false };
  }
  if (id === "partition-3-2") {
    const r = scenarioPartition(5, [[0, 1, 2], [3, 4]]);
    return { id, label: "Partition 3 | 2", n: 5, events: r.groups.flatMap((g) => eventsForGroup(r.cluster, g)), cluster: r.cluster, groups: r.groups, splitBrain: r.splitBrain };
  }
  const r = scenarioPartition(4, [[0, 1], [2, 3]]);
  return { id, label: "Even split 2 | 2", n: 4, events: r.groups.flatMap((g) => eventsForGroup(r.cluster, g)), cluster: r.cluster, groups: r.groups, splitBrain: r.splitBrain };
}

// scenarioPartition doesn't expose the per-group event trace (only the final
// cluster + tallies), so we re-derive a display trace's *shape* here purely
// for animation sequencing — the truth (elected/votes/needed) always comes
// from `groups`, never recomputed.
function eventsForGroup(cluster: Cluster, g: Group): ElectionEvent[] {
  const term = cluster.nodes[g.candidate].term; // already advanced by the engine
  const events: ElectionEvent[] = [{ kind: "timeout", node: g.candidate }];
  for (const m of g.members) {
    if (m === g.candidate) continue;
    events.push({ kind: "request-vote", from: g.candidate, to: m, term });
    events.push({ kind: "vote", from: m, to: g.candidate, granted: true, term });
  }
  events.push(
    g.elected
      ? { kind: "leader", node: g.candidate, term, votes: g.votes }
      : { kind: "no-quorum", node: g.candidate, term, votes: g.votes, needed: g.needed },
  );
  return events;
}

// Replay events 0..step to derive each node's role/term as of "now", for the
// SVG. Pure UI-side derivation of what the engine already decided — the
// engine's own cluster (fully resolved) is only consulted for the resting
// (step === events.length) frame, so mid-trace frames read consistently too.
type NodeView = { id: number; role: Role; term: number };
function deriveNodes(n: number, events: ElectionEvent[], step: number, restCluster: Cluster): NodeView[] {
  if (step >= events.length) {
    return restCluster.nodes.map((x) => ({ id: x.id, role: x.role, term: x.term }));
  }
  // Start every node as a plain follower at term 1, then replay the trace.
  const view: NodeView[] = Array.from({ length: n }, (_, i) => ({ id: i, role: "follower", term: 1 }));
  for (let i = 0; i < step; i++) {
    const ev = events[i];
    if (ev.kind === "timeout") {
      view[ev.node] = { ...view[ev.node], role: "candidate", term: view[ev.node].term + 1 };
    } else if (ev.kind === "vote" && ev.granted) {
      // ev.from is the voter: it adopts the candidate's term and stays a follower.
      view[ev.from] = { ...view[ev.from], term: ev.term, role: "follower" };
    } else if (ev.kind === "leader") {
      view[ev.node] = { ...view[ev.node], role: "leader", term: ev.term };
    } else if (ev.kind === "no-quorum") {
      view[ev.node] = { ...view[ev.node], role: "candidate", term: ev.term };
    }
  }
  // down nodes never come back — carry them over from the resting cluster.
  for (const x of restCluster.nodes) {
    if (x.role === "down") view[x.id] = { id: x.id, role: "down", term: view[x.id].term };
  }
  return view;
}

function circlePos(i: number, n: number, cx0: number, cy0: number, r: number): { x: number; y: number } {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: cx0 + r * Math.cos(a), y: cy0 + r * Math.sin(a) };
}

export default function ElectionToy() {
  const reduced = useReducedMotion();
  const [scenarioId, setScenarioId] = useState<ScenarioId>("leader-failure");
  const scenario = useMemo(() => buildScenario(scenarioId), [scenarioId]);

  const [step, setStep] = useState(scenario.events.length); // rest fully resolved
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    setStep((x) => {
      if (x >= scenario.events.length) {
        setRunning(false);
        return x;
      }
      return x + 1;
    });
  };
  useSimClock(running, 2 * speed, () => advanceRef.current());

  function selectScenario(id: ScenarioId): void {
    setScenarioId(id);
    setRunning(false);
    setStep(0);
  }
  function onStep(): void {
    setRunning(false);
    setStep((x) => Math.min(scenario.events.length, x + 1));
  }
  function onToggle(): void {
    if (reduced) return;
    if (running) {
      setRunning(false);
      return;
    }
    setStep((x) => (x >= scenario.events.length ? 0 : x));
    setRunning(true);
  }
  function onReset(): void {
    setRunning(false);
    setStep(0);
  }

  const nodes = useMemo(
    () => deriveNodes(scenario.n, scenario.events, step, scenario.cluster),
    [scenario, step],
  );
  const need = quorum(scenario.n);
  const done = step >= scenario.events.length;
  const currentEvent = step > 0 && step <= scenario.events.length ? scenario.events[step - 1] : null;

  const status = useMemo(() => {
    if (!done) {
      if (!currentEvent) return `${scenario.label} · ready — press step or play`;
      return `${scenario.label} · ${eventLabel(currentEvent)}`;
    }
    if (scenario.groups) {
      const summary = scenario.groups
        .map((g) => `{${g.members.join(",")}} ${g.votes}/${g.needed}${g.elected ? " → leader" : " → no quorum"}`)
        .join("  ·  ");
      return scenario.splitBrain
        ? `${scenario.label} · ${summary} · SPLIT-BRAIN (should never happen)`
        : `${scenario.label} · ${summary} · no split-brain`;
    }
    const leader = nodes.find((x) => x.role === "leader");
    return leader
      ? `${scenario.label} · node ${leader.id} elected leader at term ${leader.term}`
      : `${scenario.label} · no leader elected`;
  }, [done, currentEvent, scenario, nodes]);

  const verdict: { ok: boolean; text: string } | null = done
    ? scenario.groups
      ? scenario.splitBrain
        ? { ok: false, text: "split-brain — two leaders (should be impossible)" }
        : scenario.groups.some((g) => g.elected)
          ? { ok: true, text: "one leader — no split-brain" }
          : { ok: true, text: "no quorum on either side — no leader" }
      : { ok: true, text: "one leader — no split-brain" }
    : null;

  const positions = useMemo(
    () => Array.from({ length: scenario.n }, (_, i) => circlePos(i, scenario.n, RING_CX, RING_CY, RING_R)),
    [scenario.n],
  );

  // in-flight message arrows for the current event (request-vote / vote)
  const flight = currentEvent && (currentEvent.kind === "request-vote" || currentEvent.kind === "vote") ? currentEvent : null;

  return (
    <SimShell
      title="Leader election — quorum vs. split-brain"
      simKey="election-toy"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="el-ctl" role="group" aria-label="Scenario">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cx("btn", scenarioId === s.id && "btn-primary")}
              onClick={() => selectScenario(s.id)}
              aria-pressed={scenarioId === s.id}
              title={s.hint}
            >
              {s.label}
            </button>
          ))}
          <span className="el-quorum">
            n={scenario.n} · quorum={need}
          </span>
        </div>
      }
      footer={
        <div className="el-foot">
          {scenario.groups && (
            <div className="el-groups" role="group" aria-label="Partition groups">
              {scenario.groups.map((g, i) => (
                <div key={i} className={cx("el-group", done && (g.elected ? "is-ok" : "is-no"))}>
                  <span className="el-group-members">{`{ ${g.members.join(", ")} }`}</span>
                  <span className="el-group-votes">
                    {done ? `${g.votes} / ${g.needed} votes` : `needs ${g.needed} votes`}
                  </span>
                  {done && <span className="el-group-tag">{g.elected ? "elected" : "no quorum"}</span>}
                </div>
              ))}
            </div>
          )}
          {verdict && (
            <p className={cx("el-verdict", verdict.ok ? "is-ok" : "is-no")} role="status">
              {verdict.ok ? "✓" : "✕"} {verdict.text}
            </p>
          )}
        </div>
      }
    >
      <div className="el-stage">
        <svg
          className={cx("el-svg", !reduced && "el-anim")}
          viewBox="0 0 420 344"
          width="100%"
          role="img"
          aria-label={status}
        >
          <defs>
            <marker id="elArrow" markerWidth="9" markerHeight="9" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="currentColor" />
            </marker>
          </defs>

          {/* cluster ring, just a visual guide */}
          <circle cx={RING_CX} cy={RING_CY} r={RING_R} className="el-ring" />

          {/* in-flight message */}
          {flight && (
            <g className="el-msg" style={{ color: flight.kind === "vote" && !flight.granted ? "var(--sem-err)" : "var(--sem-data)" }}>
              <line
                x1={positions[flight.from].x}
                y1={positions[flight.from].y}
                x2={positions[flight.to].x}
                y2={positions[flight.to].y}
                markerEnd="url(#elArrow)"
              />
              <text
                x={(positions[flight.from].x + positions[flight.to].x) / 2}
                y={(positions[flight.from].y + positions[flight.to].y) / 2 - 8}
                textAnchor="middle"
                className="el-msg-lbl"
              >
                {flight.kind === "request-vote" ? "request-vote" : flight.granted ? "vote ✓" : "vote ✕"}
              </text>
            </g>
          )}

          {nodes.map((node) => {
            const p = positions[node.id];
            const timedOut = currentEvent?.kind === "timeout" && currentEvent.node === node.id;
            return (
              <g key={node.id} className={cx("el-node", `is-${node.role}`, timedOut && "is-pulsing")} style={{ color: ROLE_COLOR[node.role] }}>
                <circle cx={p.x} cy={p.y} r={30} />
                <text x={p.x} y={p.y - 2} textAnchor="middle" className="el-node-id">
                  N{node.id}
                </text>
                <text x={p.x} y={p.y + 14} textAnchor="middle" className="el-node-term">
                  t{node.term}
                </text>
                <text x={p.x} y={p.y - 42} textAnchor="middle" className="el-node-role">
                  {node.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </SimShell>
  );
}

function eventLabel(ev: ElectionEvent): string {
  if (ev.kind === "timeout") return `node ${ev.node} times out — becomes candidate`;
  if (ev.kind === "request-vote") return `node ${ev.from} → node ${ev.to}: request-vote (term ${ev.term})`;
  if (ev.kind === "vote") return `node ${ev.from} → node ${ev.to}: vote ${ev.granted ? "granted" : "denied"}`;
  if (ev.kind === "leader") return `node ${ev.node} wins with ${ev.votes} votes — new leader at term ${ev.term}`;
  return `node ${ev.node} stuck at ${ev.votes}/${ev.needed} votes — no quorum`;
}
