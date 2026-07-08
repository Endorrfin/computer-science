// Engine for ch.30 — the `cap-explorer` sim. The CAP theorem made concrete
// (Brewer 2000; Gilbert & Lynch 2002). Two replicas hold one value. A network
// PARTITION cuts them apart while a write arrives on one side and a read on the
// other. Since partition-tolerance isn't optional for a distributed store, the
// real choice is C vs A *during the partition*:
//   • CP — refuse to act unless the replicas can agree. The write (or the
//          minority read) is REJECTED: consistent, but not available. On heal,
//          nothing diverged.
//   • AP — answer anyway. The write is accepted on its side; the other side
//          serves a STALE read: available, but inconsistent. On heal the two
//          copies conflict and must be reconciled (here: last-write-wins).
// PACELC (Abadi 2010) adds the else-case: even with no partition you trade
// Latency vs Consistency — surfaced in the chapter's senior lens, not modeled.
//
// Deterministic. Erasable-syntax only.

export type Choice = "CP" | "AP";

export type CapStep = { t: number; label: string; a: string | null; b: string | null; note: string };

export type CapResult = {
  choice: Choice;
  steps: CapStep[];
  duringPartition: { writeAccepted: boolean; readValue: string | null; available: boolean; consistent: boolean };
  onHeal: { a: string; b: string; converged: boolean; conflictResolved: boolean };
};

const V0 = "v0";
const V1 = "v1";

/**
 * Fixed scenario: both replicas start at v0. Partition. A client writes v1 to
 * replica A and reads from replica B. Then the partition heals.
 */
export function simulateCap(choice: Choice): CapResult {
  const steps: CapStep[] = [];
  let a = V0;
  let b = V0;
  steps.push({ t: 0, label: "steady state", a, b, note: "both replicas agree on v0" });
  steps.push({ t: 1, label: "partition!", a, b, note: "A and B can no longer talk" });

  if (choice === "CP") {
    // Consistency first: A can't confirm with B, so it refuses the write.
    steps.push({ t: 2, label: "write v1 → A", a, b, note: "A can't reach a quorum → REJECTS the write (error to client)" });
    steps.push({ t: 3, label: "read ← B", a, b, note: "B also refuses (can't guarantee freshness) — unavailable but never wrong" });
    const during = { writeAccepted: false, readValue: null, available: false, consistent: true };
    steps.push({ t: 4, label: "heal", a, b, note: "nothing diverged — still v0 everywhere" });
    return { choice, steps, duringPartition: during, onHeal: { a, b, converged: true, conflictResolved: false } };
  }

  // AP — availability first: A takes the write locally; B answers with what it has.
  a = V1;
  steps.push({ t: 2, label: "write v1 → A", a, b, note: "A ACCEPTS locally and acks the client (available)" });
  steps.push({ t: 3, label: "read ← B", a, b, note: "B still shows v0 — a STALE read (inconsistent)" });
  const during = { writeAccepted: true, readValue: b, available: true, consistent: false };
  // Heal: the two copies conflict; resolve last-write-wins (A's write is newer).
  b = a;
  steps.push({ t: 4, label: "heal + reconcile", a, b, note: "conflict detected (v1 vs v0) → last-write-wins → both v1" });
  return { choice, steps, duringPartition: during, onHeal: { a, b, converged: a === b, conflictResolved: true } };
}
