// Engine for ch.26 — How networks work. Framework-free models for the
// packet-journey HERO and the layer-cake figure:
//   1. LAYERS — the TCP/IP model as encapsulation: on the way down each layer
//      wraps the payload in its own header; on the way up each strips its own.
//   2. JOURNEY — a packet crossing the planet hop by hop. The IP addresses are
//      end-to-end and never change; the link-layer MACs are rewritten at every
//      router; the TTL ticks down once per router and a packet that hits 0 dies.
//   3. DNS — the name→address side-quest that must resolve before hop 1: a
//      recursive resolver walking root → TLD → authoritative → answer.
// Erasable-syntax only (Node runs this via --experimental-strip-types).

// ===========================================================================
// (1) LAYERS — encapsulation down the stack, decapsulation up
// ===========================================================================

export type LayerId = "application" | "transport" | "internet" | "link";

export const STACK: { id: LayerId; name: string; header: string; pdu: string; blurb: string }[] = [
  { id: "application", name: "Application", header: "HTTP", pdu: "message", blurb: "what you actually mean — a web request, an email, a DNS query" },
  { id: "transport", name: "Transport", header: "TCP", pdu: "segment", blurb: "port numbers + reliability: which program, delivered in order (TCP) or fire-and-forget (UDP)" },
  { id: "internet", name: "Internet", header: "IP", pdu: "packet", blurb: "source & destination IP addresses — end-to-end routing across networks" },
  { id: "link", name: "Link", header: "Ethernet", pdu: "frame", blurb: "MAC addresses for the next hop on this physical wire; rewritten every hop" },
];

/** A payload after encapsulation: the innermost data plus the headers wrapped
    around it, outermost first (link header is sent on the wire first). */
export type Frame = { headersOutToIn: string[]; payload: string };

/** Wrap application data down through all four layers. The result's header list
    is link→internet→transport→application, i.e. the order bytes hit the wire. */
export function encapsulate(appData: string): Frame {
  // STACK is top(app)→bottom(link); on the wire the outermost header is link.
  const headersOutToIn = [...STACK].reverse().map((l) => l.header);
  return { headersOutToIn, payload: appData };
}

/** Peel every header back off, in the order a receiver removes them (link
    first), returning the original application data. Throws if the frame is
    malformed — used by the test to prove the round-trip is lossless. */
export function decapsulate(frame: Frame): string {
  const expected = [...STACK].reverse().map((l) => l.header);
  if (frame.headersOutToIn.length !== expected.length) throw new Error("wrong header count");
  for (let i = 0; i < expected.length; i++) {
    if (frame.headersOutToIn[i] !== expected[i]) throw new Error(`header ${i} mismatch: ${frame.headersOutToIn[i]}`);
  }
  return frame.payload;
}

// ===========================================================================
// (2) JOURNEY — one packet, many hops, one TTL
// ===========================================================================

export type HopKind = "host" | "switch" | "router";

export type Hop = { name: string; kind: HopKind; net: string };

/** laptop → home Wi-Fi/switch → home router → ISP router → backbone → datacenter
    router → the server. Switches forward within a network (no TTL touch); every
    router is a network boundary (decrement TTL, rewrite the link-layer MACs). */
export const DEFAULT_PATH: Hop[] = [
  { name: "Your laptop", kind: "host", net: "home LAN" },
  { name: "Home Wi-Fi switch", kind: "switch", net: "home LAN" },
  { name: "Home router (NAT)", kind: "router", net: "home LAN → ISP" },
  { name: "ISP edge router", kind: "router", net: "ISP" },
  { name: "Backbone router", kind: "router", net: "internet backbone" },
  { name: "Datacenter router", kind: "router", net: "datacenter" },
  { name: "Web server", kind: "host", net: "datacenter" },
];

export type JourneyStep = {
  index: number;
  hop: string;
  kind: HopKind;
  ttl: number; // TTL as it LEAVES this node
  srcMac: string; // link-layer source for the NEXT link (rewritten at routers)
  dstMac: string;
  srcIp: string; // end-to-end — constant the whole way
  dstIp: string;
  action: string;
  dropped: boolean;
};

const MACS = ["aa:00", "bb:11", "cc:22", "dd:33", "ee:44", "ff:55", "12:67"];

/**
 * Walk a packet along `path`, starting at `ttlStart`. Invariants the test pins:
 *   • srcIp / dstIp never change (the internet layer is end-to-end);
 *   • the MAC pair is rewritten at every router (the link layer is hop-by-hop);
 *   • TTL drops by one at each router; if it reaches 0 AT a router the packet is
 *     dropped there (an ICMP "time exceeded" would go back — this is traceroute).
 */
export function journey(path: Hop[], ttlStart: number, srcIp = "192.168.1.42", dstIp = "93.184.216.34"): JourneyStep[] {
  const steps: JourneyStep[] = [];
  let ttl = ttlStart;
  for (let i = 0; i < path.length; i++) {
    const hop = path[i];
    const isRouter = hop.kind === "router";
    let dropped = false;
    let action: string;

    if (isRouter) {
      ttl -= 1; // decrement on forward
      if (ttl <= 0) {
        dropped = true;
        action = `TTL hit 0 — packet dropped, "time exceeded" sent back (this is how traceroute maps the path)`;
      } else {
        action = `route toward ${dstIp}: decrement TTL, rewrite src/dst MAC for the next link`;
      }
    } else if (hop.kind === "switch") {
      action = "forward within the LAN by MAC — no TTL change, IP untouched";
    } else if (i === 0) {
      action = `wrap the request in TCP → IP → Ethernet and send toward ${dstIp}`;
    } else {
      action = "arrived — strip the headers back off and hand the request up to the server";
    }

    steps.push({
      index: i,
      hop: hop.name,
      kind: hop.kind,
      ttl: Math.max(0, ttl),
      srcMac: MACS[i % MACS.length],
      dstMac: MACS[(i + 1) % MACS.length],
      srcIp,
      dstIp,
      action,
      dropped,
    });
    if (dropped) break;
  }
  return steps;
}

// ===========================================================================
// (3) DNS — resolve the name before the journey starts
// ===========================================================================

export type DnsStep = { server: string; asks: string; replies: string; isAnswer: boolean };

/**
 * A recursive resolver walking the hierarchy for a two-label name like
 * "example.com": root server → TLD (.com) server → authoritative server → the
 * A record. Deterministic; the sim plays it as the packet's "side-quest".
 */
export function resolveDns(name: string, ip = "93.184.216.34"): DnsStep[] {
  const labels = name.split(".");
  const tld = labels[labels.length - 1];
  return [
    { server: "Recursive resolver (your ISP / 1.1.1.1)", asks: `A record for ${name}?`, replies: "cache miss — I'll go ask, starting at the root", isAnswer: false },
    { server: "Root name server", asks: `where is ${name}?`, replies: `I don't know ${name}, but here are the .${tld} servers`, isAnswer: false },
    { server: `.${tld} TLD server`, asks: `where is ${name}?`, replies: `ask ${name}'s authoritative server`, isAnswer: false },
    { server: `Authoritative server for ${name}`, asks: `A record for ${name}?`, replies: `${name} = ${ip}`, isAnswer: true },
  ];
}

/** The resolved address a DNS walk ends on (last answer step). */
export function dnsAnswer(steps: DnsStep[]): string | null {
  const ans = steps.find((s) => s.isAnswer);
  if (!ans) return null;
  const m = ans.replies.match(/=\s*([0-9.]+)/);
  return m ? m[1] : null;
}
