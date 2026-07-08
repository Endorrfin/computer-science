// Engine for ch.30 — the `election-toy` sim. Raft-style leader election, the
// modern canon (Ongaro & Ousterhout, 2014):
//   • Time is divided into TERMS; each election is a new, higher term.
//   • A follower that misses heartbeats becomes a CANDIDATE, votes for itself,
//     and asks the others for votes.
//   • A candidate that collects a MAJORITY (⌊N/2⌋+1 = a quorum) becomes leader.
//   • Election safety: at most one leader per term — because two majorities of
//     the same cluster must overlap in at least one node, and a node votes once.
// The quorum rule is exactly what prevents SPLIT-BRAIN under a partition: only a
// side holding a majority of the *whole* cluster can elect, so a minority side
// is stranded rather than crowning a rival leader.
//
// Deterministic (no real randomness — the caller picks who times out first, the
// role randomized timeouts play in real Raft). Erasable-syntax only.

export type Role = "leader" | "follower" | "candidate" | "down";

export type Node = { id: number; role: Role; term: number; votedFor: number | null };

export type Cluster = { nodes: Node[]; n: number };

export type ElectionEvent =
  | { kind: "timeout"; node: number }
  | { kind: "request-vote"; from: number; to: number; term: number }
  | { kind: "vote"; from: number; to: number; granted: boolean; term: number }
  | { kind: "leader"; node: number; term: number; votes: number }
  | { kind: "no-quorum"; node: number; term: number; votes: number; needed: number };

export function quorum(n: number): number {
  return Math.floor(n / 2) + 1;
}

export function initCluster(n: number): Cluster {
  const nodes: Node[] = [];
  for (let i = 0; i < n; i++) nodes.push({ id: i, role: i === 0 ? "leader" : "follower", term: 1, votedFor: 0 });
  return { nodes, n };
}

export function leaderOf(cluster: Cluster): number | null {
  const leaders = cluster.nodes.filter((x) => x.role === "leader");
  return leaders.length === 1 ? leaders[0].id : null;
}

export function killNode(cluster: Cluster, id: number): void {
  cluster.nodes[id].role = "down";
}

/**
 * One candidate stands for election in the next term, soliciting votes from the
 * nodes it can reach. Every reachable, live node grants its vote (the candidate's
 * term is strictly higher, and no one else has stood this term). Wins iff the
 * tally reaches a majority OF THE WHOLE CLUSTER.
 *
 * Mutates the cluster to reflect the outcome and returns the event trace.
 */
export function standForElection(cluster: Cluster, candidateId: number, reachable: number[]): { events: ElectionEvent[]; elected: boolean; term: number; votes: number } {
  const events: ElectionEvent[] = [];
  const cand = cluster.nodes[candidateId];
  const term = cand.term + 1;
  const reach = new Set(reachable);
  reach.add(candidateId);

  // Candidate transitions and votes for itself.
  cand.role = "candidate";
  cand.term = term;
  cand.votedFor = candidateId;
  events.push({ kind: "timeout", node: candidateId });

  let votes = 1; // self-vote
  for (const node of cluster.nodes) {
    if (node.id === candidateId) continue;
    if (!reach.has(node.id) || node.role === "down") continue;
    events.push({ kind: "request-vote", from: candidateId, to: node.id, term });
    // A live follower reachable at a strictly higher term grants its vote once.
    const granted = node.term < term;
    events.push({ kind: "vote", from: node.id, to: candidateId, granted, term });
    if (granted) {
      votes++;
      node.term = term;
      node.votedFor = candidateId;
      node.role = "follower";
    }
  }

  const need = quorum(cluster.n);
  const elected = votes >= need;
  if (elected) {
    cand.role = "leader";
    events.push({ kind: "leader", node: candidateId, term, votes });
  } else {
    cand.role = "candidate"; // stuck: no majority reachable
    events.push({ kind: "no-quorum", node: candidateId, term, votes, needed: need });
  }
  return { events, elected, term, votes };
}

// ---------------------------------------------------------------------------
// Scenarios the sim drives
// ---------------------------------------------------------------------------

/** Leader dies → a follower times out → a clean re-election one term higher. */
export function scenarioLeaderFailure(n: number): { cluster: Cluster; events: ElectionEvent[]; newLeader: number | null; term: number } {
  const cluster = initCluster(n);
  const old = leaderOf(cluster);
  if (old !== null) killNode(cluster, old);
  // The next live node stands; everyone still reachable (no partition).
  const candidate = cluster.nodes.find((x) => x.role !== "down")!.id;
  const reachable = cluster.nodes.filter((x) => x.role !== "down").map((x) => x.id);
  const r = standForElection(cluster, candidate, reachable);
  return { cluster, events: r.events, newLeader: leaderOf(cluster), term: r.term };
}

export type PartitionResult = {
  cluster: Cluster;
  groups: { members: number[]; candidate: number; elected: boolean; votes: number; needed: number }[];
  leaders: number; // how many leaders exist across the whole cluster afterward
  splitBrain: boolean;
};

/**
 * The network splits into groups; each group's candidate tries to elect using
 * only intra-group votes. Only a group holding a cluster-majority can win, so
 * `leaders ≤ 1` — split-brain is impossible. This is the whole point of quorum.
 */
export function scenarioPartition(n: number, groups: number[][]): PartitionResult {
  const cluster = initCluster(n);
  // Kill the current leader's authority by forcing a fresh election on each side.
  const out: PartitionResult["groups"] = [];
  for (const members of groups) {
    const candidate = members[0];
    const r = standForElection(cluster, candidate, members);
    out.push({ members, candidate, elected: r.elected, votes: r.votes, needed: quorum(n) });
  }
  const leaders = cluster.nodes.filter((x) => x.role === "leader").length;
  return { cluster, groups: out, leaders, splitBrain: leaders > 1 };
}
