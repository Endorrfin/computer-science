// ch.28 · The Web — engine checks (url-journey timeline · HTTP evolution · cache).
// Run: node --experimental-strip-types scripts/test-ch28.ts
import {
  DEFAULT_PHASES,
  timeline,
  httpEvolution,
  cacheDecision,
} from "../src/components/sims/net/web.ts";

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

// ================= (A) url-journey · the timeline =================
{
  console.log("url-journey · timeline:");
  const { entries, totalMs } = timeline(DEFAULT_PHASES);
  eq("one entry per phase", entries.length, DEFAULT_PHASES.length);
  eq("total is the sum of phases", totalMs, DEFAULT_PHASES.reduce((a, p) => a + p.ms, 0));
  eq("first phase starts at 0", entries[0].startMs, 0);
  ok("phases are contiguous (no gaps/overlaps)", entries.every((e, i) => i === 0 || e.startMs === entries[i - 1].endMs));
  eq("the journey opens with DNS", entries[0].phase.id, "dns");
  eq("...and ends at render", entries[entries.length - 1].phase.id, "render");
  ok("DNS precedes the TCP handshake", entries.findIndex((e) => e.phase.id === "dns") < entries.findIndex((e) => e.phase.id === "tcp"));
}

// ================= (B) http-evolution · head-of-line blocking =================
{
  console.log("http-evolution · HOL blocking:");
  const N = 12;
  const e = httpEvolution(N, 1, 3);
  eq("HTTP/1.1 opens ~6 connections", e.h1.connections, 6);
  eq("HTTP/2 uses one connection", e.h2.connections, 1);
  eq("HTTP/3 uses one connection", e.h3.connections, 1);
  // The headline distinction: how many streams one lost packet stalls.
  eq("HTTP/2 loss stalls ALL streams (TCP HOL)", e.h2.streamsStalledByLoss, N);
  eq("HTTP/3 loss stalls only its own stream", e.h3.streamsStalledByLoss, 1);
  ok("HTTP/1.1 stalls only its connection's queue", e.h1.streamsStalledByLoss < N, `${e.h1.streamsStalledByLoss}`);
  // Multiplexing wins with no loss: 1.1 pays ⌈N/6⌉ serial waves; 2/3 send all at once.
  ok("multiplexing beats 6-connection serial (no loss)", e.h2.roundsNoLoss < e.h1.roundsNoLoss);
  eq("HTTP/2 and /3 match with no loss", e.h2.roundsNoLoss, e.h3.roundsNoLoss);
  // The HTTP/3 win is that fewer streams wait — even if the hit stream costs the same.
  ok("HTTP/3 stalls strictly fewer streams than HTTP/2", e.h3.streamsStalledByLoss < e.h2.streamsStalledByLoss);
}

// ================= (C) cache-headers · fresh / revalidate / refetch =================
{
  console.log("cache-headers · freshness:");
  // Fresh: within max-age, no ETag needed — pure cache hit, zero network.
  const fresh = cacheDecision({ maxAge: 3600, etag: true, noStore: false }, 100);
  eq("fresh → hit", fresh.outcome, "hit");
  eq("...no network", fresh.network, false);
  eq("...status 200 from cache", fresh.status, 200);

  // Stale with an ETag: conditional GET → 304, headers only (cheap revalidation).
  const stale = cacheDecision({ maxAge: 60, etag: true, noStore: false }, 120);
  eq("stale + ETag → revalidate", stale.outcome, "revalidate");
  eq("...304 Not Modified", stale.status, 304);
  eq("...headers only, body reused", stale.bytes, "headers-only");

  // Stale with no validator: full refetch.
  const refetch = cacheDecision({ maxAge: 60, etag: false, noStore: false }, 120);
  eq("stale, no validator → miss", refetch.outcome, "miss");
  eq("...full 200", refetch.bytes, "full");

  // no-store beats everything: never cached, always a full trip.
  const noStore = cacheDecision({ maxAge: 3600, etag: true, noStore: true }, 1);
  eq("no-store → miss even when 'fresh'", noStore.outcome, "miss");
  eq("...always hits the network", noStore.network, true);
  eq("...always a full body", noStore.bytes, "full");
}

console.log(failed === 0 ? "\n✓ ch.28 engines: all checks pass" : `\n✗ ch.28 engines: ${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
