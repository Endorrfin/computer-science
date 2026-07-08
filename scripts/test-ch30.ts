// ch.30 · Distributed systems — engine checks (Raft election · CAP · replication · Lamport).
// Run: node --experimental-strip-types scripts/test-ch30.ts
import {
  quorum,
  initCluster,
  leaderOf,
  standForElection,
  scenarioLeaderFailure,
  scenarioPartition,
} from "../src/components/sims/dist/election.ts";
import { simulateCap } from "../src/components/sims/dist/cap.ts";
import { simulateReplication } from "../src/components/sims/dist/replication.ts";
import { runLamport, happensBefore, concurrent, CANONICAL } from "../src/components/sims/dist/clocks.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`); }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else { failed++; console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

// ===================== (A) Raft-style leader election =====================
{
  console.log("election · quorum & leader failure:");
  eq("quorum(3) = 2", quorum(3), 2);
  eq("quorum(5) = 3", quorum(5), 3);
  eq("quorum(4) = 3", quorum(4), 3); // even clusters still need a strict majority

  const c = initCluster(5);
  eq("fresh cluster has exactly one leader", leaderOf(c), 0);
  eq("...in term 1", c.nodes[0].term, 1);

  const fail = scenarioLeaderFailure(5);
  ok("after leader dies, a new leader emerges", fail.newLeader !== null, JSON.stringify(fail.newLeader));
  ok("...it is not the dead node 0", fail.newLeader !== 0);
  eq("...in the next term (2)", fail.term, 2);
  eq("...still exactly one leader", leaderOf(fail.cluster), fail.newLeader);
}

// ===================== (B) partition → no split-brain =====================
{
  console.log("election · partition & split-brain:");
  // 5 nodes split 3 | 2 — only the majority side (3) can elect.
  const p = scenarioPartition(5, [[0, 1, 2], [3, 4]]);
  eq("majority side (3) elects", p.groups[0].elected, true);
  eq("minority side (2) cannot elect", p.groups[1].elected, false);
  eq("exactly one leader across the cluster", p.leaders, 1);
  eq("no split-brain", p.splitBrain, false);

  // A perfectly even 2 | 2 of a 4-node cluster: NEITHER side has a majority.
  const even = scenarioPartition(4, [[0, 1], [2, 3]]);
  eq("even split → no leader on either side", even.leaders, 0);
  eq("...and therefore no split-brain", even.splitBrain, false);

  // 3 | 3 | 1 of a 7-node cluster: no group reaches 4, so nobody wins.
  const three = scenarioPartition(7, [[0, 1, 2], [3, 4, 5], [6]]);
  eq("no third of 7 reaches quorum(4) → 0 leaders", three.leaders, 0);

  // Reachability matters: a candidate reaching only itself never wins.
  const lonely = initCluster(5);
  const r = standForElection(lonely, 1, []);
  eq("a candidate reaching nobody gets 1 vote", r.votes, 1);
  eq("...and is not elected", r.elected, false);
}

// ===================== (C) CAP — the C-vs-A trade under partition =====================
{
  console.log("CAP · consistency vs availability:");
  const cp = simulateCap("CP");
  eq("CP rejects the write during partition", cp.duringPartition.writeAccepted, false);
  eq("CP is consistent", cp.duringPartition.consistent, true);
  eq("CP is NOT available", cp.duringPartition.available, false);
  eq("CP heals with no conflict", cp.onHeal.conflictResolved, false);
  ok("CP stayed converged", cp.onHeal.converged);

  const ap = simulateCap("AP");
  eq("AP accepts the write", ap.duringPartition.writeAccepted, true);
  eq("AP is available", ap.duringPartition.available, true);
  eq("AP is NOT consistent (stale read)", ap.duringPartition.consistent, false);
  eq("AP serves the stale v0 from B", ap.duringPartition.readValue, "v0");
  eq("AP must reconcile a conflict on heal", ap.onHeal.conflictResolved, true);
  ok("AP converges after last-write-wins", ap.onHeal.converged);
  eq("...both replicas end at v1", [ap.onHeal.a, ap.onHeal.b], ["v1", "v1"]);
}

// ===================== (D) replication lag & read-your-writes =====================
{
  console.log("replication · lag & read-your-writes:");
  // write at t=2, lag 3 → replica has it at t=5.
  const early = simulateReplication(2, 4, 3, false); // read at t=4, before t=5
  eq("read inside the lag window is stale", early.stale, true);
  eq("...and returns the old v0", early.readValue, "v0");

  const late = simulateReplication(2, 6, 3, false); // read at t=6, after t=5
  eq("read after the replica catches up is fresh", late.stale, false);
  eq("...and returns v1", late.readValue, "v1");

  const ryw = simulateReplication(2, 4, 3, true); // same stale window, but RYW on
  eq("read-your-writes serves from the primary", ryw.servedBy, "primary");
  eq("...so it is never stale", ryw.stale, false);
  eq("...and sees its own write v1", ryw.readValue, "v1");

  // Before the write even happened, a replica read legitimately sees v0 (not stale).
  const before = simulateReplication(5, 3, 2, false);
  eq("reading before the write is v0, not 'stale'", before.stale, false);
}

// ===================== (E) Lamport logical clocks =====================
{
  console.log("clocks · Lamport timestamps & the clock condition:");
  const res = runLamport(CANONICAL);
  const ts = res.events.map((e) => e.ts);
  // a,b,c,d,e,f → 1,2,3,4,1,5
  eq("timestamps match the hand computation", ts, [1, 2, 3, 4, 1, 5]);

  // Clock condition: a → b  ⇒  C(a) < C(b), for EVERY causal pair.
  let clockOk = true;
  for (let i = 0; i < res.events.length; i++)
    for (let j = 0; j < res.events.length; j++)
      if (i !== j && happensBefore(res, i, j) && !(res.events[i].ts < res.events[j].ts)) clockOk = false;
  ok("every happened-before pair has strictly increasing timestamps", clockOk);

  // Each message climbs: C(send) < C(recv).
  let msgsClimb = true;
  for (const m of res.messages) if (!(res.events[m.sendIndex].ts < res.events[m.recvIndex].ts)) msgsClimb = false;
  ok("every message's send precedes its receive in timestamp", msgsClimb);

  // The converse fails: e (ts 1) and b (ts 2) are CONCURRENT, yet ordered by ts.
  const e = 4, b = 1;
  ok("e and b are concurrent (no causal path)", concurrent(res, e, b));
  ok("...yet C(e) < C(b) — Lamport can't tell concurrency from causality", res.events[e].ts < res.events[b].ts);

  // Sanity on the causal graph itself.
  ok("a → f transitively (through both messages)", happensBefore(res, 0, 5));
  ok("f does NOT happen-before a", !happensBefore(res, 5, 0));
}

console.log(failed === 0 ? "\n✓ ch.30 engines: all checks pass" : `\n✗ ch.30 engines: ${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
