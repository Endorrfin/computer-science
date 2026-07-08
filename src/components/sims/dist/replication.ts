// Engine for ch.30 — the `replication-lag` sim. A primary takes writes; a
// read-replica trails it by a replication delay. Read the replica inside that
// window and you get a STALE value — the everyday face of eventual consistency.
// The `read-your-writes` guarantee fixes the surprising case (you don't see your
// own just-made write) by routing a client's own reads to a copy that already
// has them (here: the primary) until the replica catches up.
//
// Deterministic. Erasable-syntax only.

export type ReplStep = { t: number; primary: string; replica: string; note: string };

export type ReplResult = {
  readValue: string;
  stale: boolean;
  servedBy: "primary" | "replica";
  timeline: ReplStep[];
};

/**
 * A write of `v1` lands on the primary at t=`writeTime`; the replica applies it
 * at `writeTime + lag`. A read happens at `readTime`.
 *   • readYourWrites=false → the read goes to the replica and may be stale.
 *   • readYourWrites=true  → the writer's own read is served by the primary, so
 *                            it always reflects the write.
 */
export function simulateReplication(writeTime: number, readTime: number, lag: number, readYourWrites: boolean): ReplResult {
  const applied = writeTime + lag;
  const timeline: ReplStep[] = [];
  const before = "v0";
  const after = "v1";
  for (let t = 0; t <= Math.max(readTime, applied) + 1; t++) {
    const primary = t >= writeTime ? after : before;
    const replica = t >= applied ? after : before;
    let note = "";
    if (t === writeTime) note = "write v1 → primary (acked)";
    else if (t === applied) note = "replica applies v1 (caught up)";
    else if (t === readTime) note = "read happens here";
    timeline.push({ t, primary, replica, note });
  }

  if (readYourWrites) {
    const primaryVal = readTime >= writeTime ? after : before;
    return { readValue: primaryVal, stale: false, servedBy: "primary", timeline };
  }
  const replicaVal = readTime >= applied ? after : before;
  const primaryVal = readTime >= writeTime ? after : before;
  // "Stale" = the replica read disagrees with the authoritative primary value.
  const stale = replicaVal !== primaryVal;
  return { readValue: replicaVal, stale, servedBy: "replica", timeline };
}
