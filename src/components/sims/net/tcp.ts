// Engine for ch.27 — TCP & UDP. Three deterministic, framework-free models the
// UI (tcp-lab, udp-vs-tcp-race) and the tests both drive:
//   1. HANDSHAKE — the 3-way SYN / SYN-ACK / ACK exchange with real sequence &
//      acknowledgement numbers, where a SYN *consumes* one sequence number.
//      A validator pinpoints the exact broken field — the P7 boss's engine.
//   2. RELIABILITY — a Go-Back-N sliding-window sender over a lossy channel:
//      cumulative ACKs, a timeout that retransmits from the first gap, so an
//      injected drop is always recovered. Reused by the UDP-vs-TCP race.
//   3. CONGESTION (TCP Reno) — slow-start → AIMD congestion avoidance →
//      fast retransmit / fast recovery (halve) and timeout (collapse to 1),
//      producing the classic sawtooth cwnd the sim animates.
// Erasable-syntax only (Node runs this via --experimental-strip-types): no
// enums/namespaces, `import type` only, unions + `as const`.

// ===========================================================================
// (1) HANDSHAKE — SYN / SYN-ACK / ACK, and the boss's broken traces
// ===========================================================================

/** A TCP segment, reduced to the fields the handshake turns on. `ack` is only
    meaningful when the ACK flag is set (`-1` = "no ack field"). */
export type Segment = {
  from: "client" | "server";
  syn: boolean;
  ack: boolean;
  seq: number;
  ackNum: number; // valid iff ack === true; else -1
  label: string; // short human tag for the UI, e.g. "SYN"
};

/** The named ways a 3-way handshake can be broken — the boss's diagnosis set. */
export type TcpFault =
  | "none"
  | "missing-ack-flag" // SYN-ACK arrived as a bare SYN — the server never acknowledged
  | "synack-ack-off-by-one" // SYN-ACK acks the client ISN, not ISN+1 (forgot SYN eats a seq)
  | "wrong-final-ack" // client's final ACK acks the server ISN, not ISN+1
  | "final-seq-wrong"; // client's final segment seq isn't clientISN+1

export const FAULTS: { id: TcpFault; label: string; blurb: string }[] = [
  { id: "none", label: "Nothing — the handshake is valid", blurb: "All three segments line up: every ack is the peer's sequence number plus one." },
  { id: "missing-ack-flag", label: "SYN-ACK is missing the ACK flag", blurb: "The server answered with a bare SYN, so it never acknowledged the client's SYN — the connection stays half-open." },
  { id: "synack-ack-off-by-one", label: "SYN-ACK acknowledges the wrong number", blurb: "A SYN consumes one sequence number, so the server must ack clientISN + 1 — not clientISN." },
  { id: "wrong-final-ack", label: "Final ACK acknowledges the wrong number", blurb: "The client's closing ACK must acknowledge serverISN + 1, because the server's SYN also consumed a sequence number." },
  { id: "final-seq-wrong", label: "Final ACK carries the wrong sequence", blurb: "After its SYN the client's next byte is clientISN + 1; the final segment's own seq must reflect that." },
];

export function faultById(id: TcpFault): { id: TcpFault; label: string; blurb: string } {
  const f = FAULTS.find((x) => x.id === id);
  if (!f) throw new Error(`unknown fault ${id}`);
  return f;
}

/** A correct 3-way handshake for the given initial sequence numbers. */
export function correctHandshake(clientISN: number, serverISN: number): Segment[] {
  return [
    { from: "client", syn: true, ack: false, seq: clientISN, ackNum: -1, label: "SYN" },
    { from: "server", syn: true, ack: true, seq: serverISN, ackNum: clientISN + 1, label: "SYN-ACK" },
    { from: "client", syn: false, ack: true, seq: clientISN + 1, ackNum: serverISN + 1, label: "ACK" },
  ];
}

/**
 * Validate a 3-segment handshake against the TCP rules and name the FIRST
 * broken field. The rules, in order:
 *   seg0  SYN, ack flag clear
 *   seg1  SYN+ACK, ackNum === seg0.seq + 1     (SYN consumes a sequence number)
 *   seg2  ACK (not SYN), ackNum === seg1.seq + 1, seq === seg0.seq + 1
 */
export function validateHandshake(trace: Segment[]): { valid: boolean; faultIndex: number; fault: TcpFault; reason: string } {
  if (trace.length !== 3) return { valid: false, faultIndex: -1, fault: "none", reason: "a handshake is exactly three segments" };
  const [s0, s1, s2] = trace;

  // Segment 0 — the client's opening SYN.
  if (!s0.syn || s0.ack) return { valid: false, faultIndex: 0, fault: "missing-ack-flag", reason: "the first segment must be a lone SYN" };

  // Segment 1 — the server's SYN-ACK.
  if (!s1.syn || !s1.ack) return { valid: false, faultIndex: 1, fault: "missing-ack-flag", reason: "the server's reply must set BOTH SYN and ACK" };
  if (s1.ackNum !== s0.seq + 1) return { valid: false, faultIndex: 1, fault: "synack-ack-off-by-one", reason: `SYN-ACK must ack ${s0.seq + 1} (clientISN + 1), got ${s1.ackNum}` };

  // Segment 2 — the client's final ACK.
  if (s2.syn || !s2.ack) return { valid: false, faultIndex: 2, fault: "missing-ack-flag", reason: "the final segment must be a pure ACK (no SYN)" };
  if (s2.ackNum !== s1.seq + 1) return { valid: false, faultIndex: 2, fault: "wrong-final-ack", reason: `final ACK must ack ${s1.seq + 1} (serverISN + 1), got ${s2.ackNum}` };
  if (s2.seq !== s0.seq + 1) return { valid: false, faultIndex: 2, fault: "final-seq-wrong", reason: `final segment seq must be ${s0.seq + 1} (clientISN + 1), got ${s2.seq}` };

  return { valid: true, faultIndex: -1, fault: "none", reason: "every ack is the peer's sequence number + 1 — connection established" };
}

/** The boss: three faulty traces, each a different real bug. Sequence numbers
    are deliberately un-round so the reader has to reason, not pattern-match. */
export type BossTrace = { id: string; title: string; trace: Segment[]; fault: TcpFault };

export const BOSS_TRACES: BossTrace[] = [
  (() => {
    // Bug A — the server replied with a bare SYN (ACK flag never set).
    const t = correctHandshake(1000, 5000);
    t[1] = { ...t[1], ack: false, ackNum: -1, label: "SYN" };
    return { id: "trace-a", title: "The half-open connection", trace: t, fault: "missing-ack-flag" as TcpFault };
  })(),
  (() => {
    // Bug B — SYN-ACK acknowledges clientISN instead of clientISN + 1.
    const t = correctHandshake(4200, 9100);
    t[1] = { ...t[1], ackNum: 4200 };
    return { id: "trace-b", title: "The off-by-one server", trace: t, fault: "synack-ack-off-by-one" as TcpFault };
  })(),
  (() => {
    // Bug C — the client's final ACK acks serverISN instead of serverISN + 1.
    const t = correctHandshake(700, 300);
    t[2] = { ...t[2], ackNum: 300 };
    return { id: "trace-c", title: "The premature client", trace: t, fault: "wrong-final-ack" as TcpFault };
  })(),
];

/** Boss grading — the diagnosis is right iff it matches what the validator finds. */
export function gradeHandshakeBoss(traceId: string, chosen: TcpFault): { correctFault: TcpFault; passed: boolean } {
  const bt = BOSS_TRACES.find((b) => b.id === traceId);
  if (!bt) throw new Error(`unknown boss trace ${traceId}`);
  const found = validateHandshake(bt.trace).fault;
  return { correctFault: found, passed: chosen === found };
}

// ===========================================================================
// (2) RELIABILITY — Go-Back-N sender over a lossy channel
// ===========================================================================

export type TransferResult = {
  delivered: number; // segments handed to the receiver, in order
  transmissions: number; // total sends, including retransmits
  retransmissions: number; // sends that were repeats
  rounds: number; // window-fuls sent
};

/**
 * Send `nSegs` segments (numbered 1..nSegs) through a window of `window`, where
 * every index in `lossOnce` is dropped the FIRST time it is transmitted. The
 * receiver only accepts the next in-order segment and re-ACKs the last good one;
 * a gap triggers a Go-Back-N retransmit from the missing segment. Deterministic,
 * so the sim and the tests agree exactly. Always terminates (each loss fires once).
 */
export function runReliableTransfer(nSegs: number, window: number, lossOnce: number[]): TransferResult {
  const dropped = new Set(lossOnce);
  const firedLoss = new Set<number>();
  let base = 1; // first unacked segment
  let transmissions = 0;
  let retransmissions = 0;
  let rounds = 0;
  const sent = new Set<number>(); // has this segment ever been transmitted?
  let guard = 0;
  const cap = (nSegs + lossOnce.length) * 4 + 32;

  while (base <= nSegs && guard++ < cap) {
    rounds++;
    let highestAcked = base - 1;
    for (let seg = base; seg < base + window && seg <= nSegs; seg++) {
      const isRetransmit = sent.has(seg);
      transmissions++;
      if (isRetransmit) retransmissions++;
      sent.add(seg);
      // A dropped segment vanishes the first time only.
      if (dropped.has(seg) && !firedLoss.has(seg)) {
        firedLoss.add(seg);
        break; // Go-Back-N: everything after the gap is discarded by the receiver
      }
      highestAcked = seg; // cumulative ACK advances
    }
    base = highestAcked + 1; // retransmit from the first gap next round
  }

  return { delivered: Math.min(base - 1, nSegs), transmissions, retransmissions, rounds };
}

/**
 * The UDP-vs-TCP contrast on one lossy channel. TCP recovers every segment but
 * pays extra transmissions (and thus time); UDP fires once and never looks back —
 * faster, but whatever dropped is simply gone. `unitMs` is the per-transmission
 * cost so both are quoted on the same clock.
 */
export function runUdpVsTcp(nSegs: number, window: number, lossOnce: number[], unitMs: number): {
  tcp: { delivered: number; transmissions: number; timeMs: number };
  udp: { delivered: number; lost: number; timeMs: number };
} {
  const tcp = runReliableTransfer(nSegs, window, lossOnce);
  const lost = new Set(lossOnce.filter((i) => i >= 1 && i <= nSegs)).size;
  return {
    tcp: { delivered: tcp.delivered, transmissions: tcp.transmissions, timeMs: tcp.transmissions * unitMs },
    udp: { delivered: nSegs - lost, lost, timeMs: nSegs * unitMs },
  };
}

// ===========================================================================
// (3) CONGESTION CONTROL — TCP Reno (slow-start · AIMD · fast recovery)
// ===========================================================================

export type RenoPhase = "slow-start" | "congestion-avoidance";
export type RenoEvent = "ack" | "triple-dup" | "timeout";

export type RenoState = {
  round: number;
  cwnd: number; // congestion window, in MSS units
  ssthresh: number; // slow-start threshold
  phase: RenoPhase;
};

export function initReno(ssthresh = 16): RenoState {
  return { round: 0, cwnd: 1, ssthresh, phase: "slow-start" };
}

/**
 * One RTT of Reno, given what the round's ACKs reported (pure):
 *   ack        — no loss. Slow-start DOUBLES cwnd (×2 per RTT) until it reaches
 *                ssthresh, then congestion-avoidance adds +1 MSS per RTT (linear).
 *   triple-dup — fast retransmit + fast recovery: ssthresh ← cwnd/2, cwnd ← that,
 *                stay in congestion-avoidance. This is the sawtooth's half-drop.
 *   timeout    — the harsh reset: ssthresh ← cwnd/2, cwnd ← 1, back to slow-start.
 */
export function stepReno(s: RenoState, event: RenoEvent): RenoState {
  let { cwnd, ssthresh, phase } = s;

  if (event === "timeout") {
    ssthresh = Math.max(1, Math.floor(cwnd / 2));
    cwnd = 1;
    phase = "slow-start";
  } else if (event === "triple-dup") {
    ssthresh = Math.max(1, Math.floor(cwnd / 2));
    cwnd = ssthresh; // fast recovery: down to the new threshold, not to 1
    phase = "congestion-avoidance";
  } else {
    if (phase === "slow-start") {
      cwnd = cwnd * 2;
      if (cwnd >= ssthresh) {
        cwnd = ssthresh;
        phase = "congestion-avoidance";
      }
    } else {
      cwnd = cwnd + 1;
    }
  }

  return { round: s.round + 1, cwnd, ssthresh, phase };
}

/**
 * Run Reno for `rounds` RTTs. `events[r]` overrides the event at round r
 * ("triple-dup" or "timeout"); every other round is a plain "ack". Returns the
 * cwnd trajectory — the sawtooth — with one sample per round (index 0 = initial).
 */
export function renoTrace(rounds: number, events: Record<number, RenoEvent>, ssthresh = 16): {
  cwnd: number[];
  states: RenoState[];
} {
  let s = initReno(ssthresh);
  const cwnd = [s.cwnd];
  const states = [s];
  for (let r = 1; r <= rounds; r++) {
    s = stepReno(s, events[r] ?? "ack");
    cwnd.push(s.cwnd);
    states.push(s);
  }
  return { cwnd, states };
}
