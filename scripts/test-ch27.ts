// ch.27 · TCP & UDP — engine checks (handshake + boss · reliability · Reno).
// Run: node --experimental-strip-types scripts/test-ch27.ts
import {
  correctHandshake,
  validateHandshake,
  BOSS_TRACES,
  gradeHandshakeBoss,
  runReliableTransfer,
  runUdpVsTcp,
  initReno,
  stepReno,
  renoTrace,
} from "../src/components/sims/net/tcp.ts";
import type { Segment } from "../src/components/sims/net/tcp.ts";

let failed = 0;
function eq<T>(name: string, got: T, want: T): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}\n      got  ${g}\n      want ${w}`);
  }
}
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.error(`  ✗ ${name}${detail ? "\n      " + detail : ""}`);
  }
}

// ================= (A) handshake · sequence/ack rules =================
{
  console.log("handshake · SYN/SYN-ACK/ACK:");
  const hs = correctHandshake(1000, 5000);
  eq("a correct handshake validates", validateHandshake(hs).valid, true);
  // SYN consumes a sequence number: the server acks clientISN+1, client acks serverISN+1.
  eq("SYN-ACK acks clientISN + 1", hs[1].ackNum, 1001);
  eq("final ACK acks serverISN + 1", hs[2].ackNum, 5001);
  eq("client's next seq is clientISN + 1", hs[2].seq, 1001);

  // Each single-field corruption is caught, and named.
  const noAck = correctHandshake(1000, 5000);
  noAck[1] = { ...noAck[1], ack: false, ackNum: -1 };
  eq("bare-SYN reply → missing-ack-flag", validateHandshake(noAck).fault, "missing-ack-flag");

  const offBy1 = correctHandshake(1000, 5000);
  offBy1[1] = { ...offBy1[1], ackNum: 1000 };
  eq("SYN-ACK acking ISN not ISN+1 → off-by-one", validateHandshake(offBy1).fault, "synack-ack-off-by-one");
  eq("...flagged at segment 1", validateHandshake(offBy1).faultIndex, 1);

  const badFinal = correctHandshake(1000, 5000);
  badFinal[2] = { ...badFinal[2], ackNum: 5000 };
  eq("final ACK acking serverISN → wrong-final-ack", validateHandshake(badFinal).fault, "wrong-final-ack");

  const badSeq = correctHandshake(1000, 5000);
  badSeq[2] = { ...badSeq[2], seq: 1000 };
  eq("final seq not ISN+1 → final-seq-wrong", validateHandshake(badSeq).fault, "final-seq-wrong");

  const short: Segment[] = hs.slice(0, 2);
  eq("a two-segment 'handshake' is invalid", validateHandshake(short).valid, false);
}

// ================= (B) the P7 boss · three broken traces =================
{
  console.log("boss · debug the broken handshake:");
  eq("three boss traces", BOSS_TRACES.length, 3);
  // Every planted fault is the one the validator independently finds.
  for (const bt of BOSS_TRACES) {
    eq(`${bt.id}: planted fault is detected`, validateHandshake(bt.trace).fault, bt.fault);
    ok(`${bt.id}: none of them accidentally validate`, !validateHandshake(bt.trace).valid);
    eq(`${bt.id}: correct diagnosis passes`, gradeHandshakeBoss(bt.id, bt.fault).passed, true);
    ok(`${bt.id}: a wrong diagnosis fails`, !gradeHandshakeBoss(bt.id, "none").passed);
  }
  // The three faults are genuinely distinct (not the same bug three times).
  eq("all three faults are different", new Set(BOSS_TRACES.map((b) => b.fault)).size, 3);
}

// ================= (C) reliability · Go-Back-N over loss =================
{
  console.log("reliability · sliding window + loss:");
  const clean = runReliableTransfer(5, 3, []);
  eq("clean transfer delivers everything", clean.delivered, 5);
  eq("clean transfer never retransmits", clean.retransmissions, 0);

  const lossy = runReliableTransfer(5, 3, [2]);
  eq("a dropped segment is still delivered", lossy.delivered, 5);
  ok("...but it costs a retransmit", lossy.retransmissions > 0, `retx=${lossy.retransmissions}`);
  ok("total sends exceed the clean case", lossy.transmissions > clean.transmissions);

  // UDP vs TCP on the same lossy channel: TCP perfect but slower, UDP fast but lossy.
  const race = runUdpVsTcp(5, 3, [2], 10);
  eq("TCP delivers all five", race.tcp.delivered, 5);
  eq("UDP drops the lost one", race.udp.delivered, 4);
  eq("UDP loses exactly one", race.udp.lost, 1);
  ok("UDP finishes sooner than TCP", race.udp.timeMs < race.tcp.timeMs, `udp=${race.udp.timeMs} tcp=${race.tcp.timeMs}`);
}

// ================= (D) congestion · TCP Reno sawtooth =================
{
  console.log("congestion · TCP Reno:");
  eq("starts at cwnd 1, slow-start", { c: initReno(16).cwnd, p: initReno(16).phase }, { c: 1, p: "slow-start" });

  // Slow-start doubles per RTT until it reaches ssthresh, then goes linear.
  const ss = renoTrace(6, {}, 16);
  eq("doubling then linear", ss.cwnd, [1, 2, 4, 8, 16, 17, 18]);
  eq("phase flips to congestion-avoidance at ssthresh", ss.states[4].phase, "congestion-avoidance");

  // Triple-dup ACK: fast retransmit + fast recovery — halve, stay in CA (the sawtooth).
  const fast = renoTrace(6, { 5: "triple-dup" }, 16);
  eq("triple-dup halves cwnd", fast.cwnd, [1, 2, 4, 8, 16, 8, 9]);
  eq("...and ssthresh follows", fast.states[5].ssthresh, 8);
  eq("...staying in congestion-avoidance", fast.states[5].phase, "congestion-avoidance");

  // Timeout: the harsh reset — cwnd back to 1, slow-start again.
  const to = renoTrace(6, { 5: "timeout" }, 16);
  eq("timeout collapses cwnd to 1", to.cwnd, [1, 2, 4, 8, 16, 1, 2]);
  eq("...back in slow-start", to.states[5].phase, "slow-start");
  eq("...with ssthresh halved to 8", to.states[5].ssthresh, 8);

  // A single Reno step is pure and repeatable.
  const s = stepReno(initReno(8), "ack");
  eq("one slow-start ack doubles 1→2", s.cwnd, 2);
}

console.log(failed === 0 ? "\n✓ ch.27 engines: all checks pass" : `\n✗ ch.27 engines: ${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
