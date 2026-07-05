// Engine — amortized analysis of a growable ("dynamic") array. This is the
// canonical example of why *amortized* cost differs from *worst-case per op*:
// a single push can be expensive (it triggers a full copy), yet the AVERAGE
// cost per push over a long run is a small constant. The trick is the growth
// policy: DOUBLE the capacity when full, so the rare expensive copies are
// spread ever more thinly across the cheap pushes between them.
//
// Cost model (charge one unit per element touched):
//   • every push writes its element      → +1        (the unavoidable write)
//   • a resize first copies the old ones  → +oldSize  (only when full)
// So a push into a non-full array costs 1; a push that overflows capacity C
// costs 1 + C (copy C existing elements into the new C·2 buffer, then write).
//
// The doubling geometry: capacity goes 1 → 2 → 4 → 8 → … so resizes happen at
// sizes 1,2,4,8,… and the copy costs sum to 1+2+4+…+N/2 < N. Add the N writes
// and total < 2N (we prove < 3N with headroom). Amortized cost = total / N < 3
// and, crucially, does NOT grow with N — that is what "amortized O(1)" means.
//
// The contrast (fixedGrowthCost): if instead you grow by a CONSTANT chunk k,
// resizes happen every k pushes and each copies an ever-larger prefix, so the
// copy costs sum to k + 2k + 3k + … ≈ N²/(2k). That is Θ(N²) total, i.e. Θ(N)
// per push — linear, not constant. Same code shape, catastrophically worse,
// purely because of the growth policy. The doubling is what saves you.

/** One push, fully accounted. `runningAvg` is the amortized cost SO FAR
    (cumulative cost ÷ pushes so far) — the number that visibly flattens. */
export type PushStep = {
  index: number; // 0-based push number
  cost: number; // cost charged to THIS push (1, or 1 + oldSize on a resize)
  capacityBefore: number;
  capacityAfter: number;
  resized: boolean; // did this push trigger a doubling?
  runningAvg: number; // cumulativeCost / (index + 1)
};

export type DoublingResult = {
  steps: PushStep[];
  totalCost: number; // Σ cost over all pushes
  amortized: number; // totalCost / pushes  (converges below 3)
};

/** Simulate `pushes` appends into an array that starts at capacity 1 and
    doubles when full. Returns the per-push trace plus the totals. */
export function simulateDoubling(pushes: number): DoublingResult {
  const steps: PushStep[] = [];
  let capacity = pushes > 0 ? 1 : 0; // start with room for one element
  let size = 0; // elements currently stored
  let cumulative = 0;

  for (let i = 0; i < pushes; i++) {
    const capacityBefore = capacity;
    let cost = 0;
    let resized = false;

    // Full? Double first, paying to copy the existing `size` elements.
    if (size === capacity) {
      cost += size; // copy old elements into the bigger buffer
      capacity = capacity === 0 ? 1 : capacity * 2;
      resized = true;
    }

    // The write itself always costs 1.
    cost += 1;
    size += 1;
    cumulative += cost;

    steps.push({
      index: i,
      cost,
      capacityBefore,
      capacityAfter: capacity,
      resized,
      runningAvg: cumulative / (i + 1),
    });
  }

  return {
    steps,
    totalCost: cumulative,
    amortized: pushes > 0 ? cumulative / pushes : 0,
  };
}

/** Contrast policy — grow by a CONSTANT chunk `grow` (e.g. +1 or +4) instead of
    doubling. Same cost model (copy old elements on each resize + 1 per write),
    but because capacity climbs arithmetically the copies pile up: total cost is
    Θ(N²/grow), i.e. Θ(N) amortized. Kept for the UI's "why not just add a
    little each time?" moment. Tested alongside the doubling variant. */
export function fixedGrowthCost(pushes: number, grow: number): DoublingResult {
  const chunk = Math.max(1, Math.floor(grow));
  const steps: PushStep[] = [];
  let capacity = 0;
  let size = 0;
  let cumulative = 0;

  for (let i = 0; i < pushes; i++) {
    const capacityBefore = capacity;
    let cost = 0;
    let resized = false;

    if (size === capacity) {
      cost += size; // copy existing elements
      capacity += chunk; // grow by a fixed chunk — the fatal choice
      resized = true;
    }

    cost += 1;
    size += 1;
    cumulative += cost;

    steps.push({
      index: i,
      cost,
      capacityBefore,
      capacityAfter: capacity,
      resized,
      runningAvg: cumulative / (i + 1),
    });
  }

  return {
    steps,
    totalCost: cumulative,
    amortized: pushes > 0 ? cumulative / pushes : 0,
  };
}
