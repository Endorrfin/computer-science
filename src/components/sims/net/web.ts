// Engine for ch.28 — The Web. Framework-free models for url-journey,
// http-evolution, and cache-headers:
//   1. URL JOURNEY — the phases between pressing Enter and seeing pixels, each
//      with a duration, laid out on one timeline (DNS → TCP → TLS → request →
//      wait → download → parse → render).
//   2. HTTP EVOLUTION — why HTTP/1.1 → 2 → 3 happened, reduced to head-of-line
//      blocking: how many streams a single packet loss stalls under each.
//   3. CACHE — max-age / ETag / no-store → fresh hit, revalidate (304), or a
//      full refetch. Erasable-syntax only.

// ===========================================================================
// (1) URL JOURNEY — the timeline from Enter to pixels
// ===========================================================================

export type PhaseId = "dns" | "tcp" | "tls" | "request" | "wait" | "download" | "parse" | "render";

export type Phase = { id: PhaseId; name: string; ms: number; layer: string; blurb: string };

/** A representative warm-network breakdown (ms). Numbers are illustrative but
    ordered and proportioned the way a real first visit behaves: DNS + connection
    setup dominate on a cold connection, TTFB (server think time) is the wait. */
export const DEFAULT_PHASES: Phase[] = [
  { id: "dns", name: "DNS lookup", ms: 40, layer: "app / UDP", blurb: "resolve the hostname to an IP (skipped if cached)" },
  { id: "tcp", name: "TCP handshake", ms: 30, layer: "transport", blurb: "one round trip: SYN / SYN-ACK / ACK" },
  { id: "tls", name: "TLS handshake", ms: 30, layer: "security", blurb: "TLS 1.3 keys in a single round trip" },
  { id: "request", name: "Send request", ms: 5, layer: "app", blurb: "the GET line + headers go out" },
  { id: "wait", name: "Wait (TTFB)", ms: 80, layer: "server", blurb: "server think time — the first byte comes back" },
  { id: "download", name: "Download", ms: 45, layer: "transport", blurb: "the response body streams in" },
  { id: "parse", name: "Parse HTML/CSS", ms: 35, layer: "browser", blurb: "build the DOM + CSSOM" },
  { id: "render", name: "Render", ms: 25, layer: "browser", blurb: "layout, paint, composite — pixels on screen" },
];

export type TimelineEntry = { phase: Phase; startMs: number; endMs: number };

/** Lay phases end to end, returning start/end offsets and the grand total. */
export function timeline(phases: Phase[]): { entries: TimelineEntry[]; totalMs: number } {
  const entries: TimelineEntry[] = [];
  let t = 0;
  for (const phase of phases) {
    entries.push({ phase, startMs: t, endMs: t + phase.ms });
    t += phase.ms;
  }
  return { entries, totalMs: t };
}

// ===========================================================================
// (2) HTTP EVOLUTION — head-of-line blocking, version by version
// ===========================================================================

export type HttpVersion = {
  id: "h1" | "h2" | "h3";
  name: string;
  transport: string;
  connections: number; // TCP/QUIC connections a browser opens for one origin
  streamsStalledByLoss: number; // how many in-flight resources one lost packet stalls
  roundsNoLoss: number; // time to deliver all resources, in RTT-ish units
  roundsWithLoss: number; // same, when one packet is lost
  win: string;
};

/**
 * Compare HTTP/1.1, HTTP/2 and HTTP/3 delivering `nResources` small resources
 * from one origin, where each needs `roundsPerResource` units and a lost packet
 * costs `lossRounds` to recover. The headline the sim shows is
 * `streamsStalledByLoss` — the famous distinction:
 *   • HTTP/1.1: ~6 parallel TCP connections, one resource at a time each →
 *     a loss stalls that connection's queue only, but you pay ⌈N/6⌉ serial waves.
 *   • HTTP/2:   one TCP connection, all N multiplexed → fixes 1.1's app-layer
 *     head-of-line blocking, BUT one lost packet stalls ALL N streams (TCP HOL).
 *   • HTTP/3:   one QUIC connection over UDP, independent streams → a loss stalls
 *     only its OWN stream. TLS is built in, and 0-RTT resumption is possible.
 */
export function httpEvolution(nResources: number, roundsPerResource: number, lossRounds: number): {
  h1: HttpVersion;
  h2: HttpVersion;
  h3: HttpVersion;
} {
  const waves = Math.ceil(nResources / 6);
  return {
    h1: {
      id: "h1",
      name: "HTTP/1.1",
      transport: "TCP (≈6 connections)",
      connections: 6,
      streamsStalledByLoss: Math.ceil(nResources / 6), // queue behind the loss on its connection
      roundsNoLoss: waves * roundsPerResource,
      roundsWithLoss: waves * roundsPerResource + lossRounds,
      win: "baseline: text protocol, but only one response at a time per connection → head-of-line blocking, so browsers open ~6",
    },
    h2: {
      id: "h2",
      name: "HTTP/2",
      transport: "TCP (1 connection)",
      connections: 1,
      streamsStalledByLoss: nResources, // TCP HOL: one loss blocks every stream
      roundsNoLoss: roundsPerResource,
      roundsWithLoss: roundsPerResource + lossRounds,
      win: "multiplexes all streams over ONE connection + header compression → kills 1.1's app-layer HOL, but a single TCP loss still stalls every stream",
    },
    h3: {
      id: "h3",
      name: "HTTP/3",
      transport: "QUIC over UDP (1 connection)",
      connections: 1,
      streamsStalledByLoss: 1, // independent streams: a loss stalls only its own
      roundsNoLoss: roundsPerResource,
      roundsWithLoss: roundsPerResource + lossRounds, // for the one hit stream; the rest are unaffected
      win: "QUIC gives each stream its own reliability → a loss stalls only that stream; TLS is built in and resumption can be 0-RTT",
    },
  };
}

// ===========================================================================
// (3) CACHE — fresh, revalidate, or refetch
// ===========================================================================

export type CachePolicy = { maxAge: number; etag: boolean; noStore: boolean };

export type CacheOutcome = {
  outcome: "hit" | "revalidate" | "miss";
  status: number; // 200 fresh/refetched · 304 not-modified · 200 no-store
  network: boolean; // did we touch the network at all?
  bytes: "full" | "none" | "headers-only";
  note: string;
};

/**
 * Decide what a second request does, given the cached response's headers and how
 * many seconds have passed. Precedence matches real HTTP:
 *   no-store            → always a full refetch (never cached);
 *   age < max-age       → fresh HIT, served from cache, no network;
 *   stale + ETag        → conditional GET (If-None-Match) → 304, headers only;
 *   stale, no validator → full refetch (200).
 */
export function cacheDecision(policy: CachePolicy, ageSec: number): CacheOutcome {
  if (policy.noStore) {
    return { outcome: "miss", status: 200, network: true, bytes: "full", note: "no-store: nothing was cached — full round trip every time" };
  }
  if (ageSec < policy.maxAge) {
    return { outcome: "hit", status: 200, network: false, bytes: "none", note: `fresh: ${ageSec}s < max-age ${policy.maxAge}s — served from cache, zero network` };
  }
  if (policy.etag) {
    return { outcome: "revalidate", status: 304, network: true, bytes: "headers-only", note: "stale but has an ETag: conditional GET → 304 Not Modified, body reused (cheap)" };
  }
  return { outcome: "miss", status: 200, network: true, bytes: "full", note: "stale with no validator: full refetch (200)" };
}
