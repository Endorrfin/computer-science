// ch.26 · How networks work — engine checks (layers · packet journey · DNS · switch).
// Run: node --experimental-strip-types scripts/test-ch26.ts
import {
  STACK,
  encapsulate,
  decapsulate,
  DEFAULT_PATH,
  journey,
  resolveDns,
  dnsAnswer,
} from "../src/components/sims/net/layers.ts";
import { runSwitch, floodCount } from "../src/components/sims/net/switching.ts";
import type { Frame } from "../src/components/sims/net/switching.ts";

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

// ================= (A) layers · encapsulation =================
{
  console.log("layers · encapsulation:");
  eq("four layers", STACK.length, 4);
  eq("top layer is application", STACK[0].id, "application");
  eq("bottom layer is link", STACK[3].id, "link");
  const f = encapsulate("GET / HTTP/1.1");
  eq("wire order is link-outermost", f.headersOutToIn, ["Ethernet", "IP", "TCP", "HTTP"]);
  eq("decapsulate is the inverse", decapsulate(f), "GET / HTTP/1.1");
  let threw = false;
  try {
    decapsulate({ headersOutToIn: ["IP", "TCP", "HTTP"], payload: "x" });
  } catch {
    threw = true;
  }
  ok("a malformed frame is rejected", threw);
}

// ================= (B) packet journey · TTL & addressing =================
{
  console.log("journey · TTL and addressing:");
  const steps = journey(DEFAULT_PATH, 64);
  eq("visits every hop", steps.length, DEFAULT_PATH.length);
  ok("source IP is constant end-to-end", steps.every((s) => s.srcIp === steps[0].srcIp));
  ok("dest IP is constant end-to-end", steps.every((s) => s.dstIp === steps[0].dstIp));
  const routers = steps.filter((s) => s.kind === "router");
  // TTL starts 64; four routers on the default path (home, ISP, backbone,
  // datacenter) each decrement once → leaves the last router at 60.
  eq("four routers on the default path", routers.length, 4);
  eq("TTL after the last router is 60", routers[routers.length - 1].ttl, 60);
  ok("switch does not touch TTL", steps[1].ttl === 64 && steps[1].kind === "switch");
  ok("MAC pair is rewritten hop to hop", steps[0].dstMac !== steps[3].dstMac);

  // A packet that starts with too little TTL dies at a router (traceroute's trick).
  const dies = journey(DEFAULT_PATH, 1);
  ok("TTL=1 packet is dropped at the first router", dies.some((s) => s.dropped));
  const drop = dies.find((s) => s.dropped)!;
  eq("dropped at TTL 0", drop.ttl, 0);
  eq("journey stops at the drop", dies[dies.length - 1].dropped, true);
}

// ================= (C) DNS · recursive resolution =================
{
  console.log("dns · recursive resolution:");
  const steps = resolveDns("example.com", "93.184.216.34");
  eq("root → TLD → authoritative → answer", steps.length, 4);
  eq("exactly one answer step", steps.filter((s) => s.isAnswer).length, 1);
  eq("answer is the last step", steps[steps.length - 1].isAnswer, true);
  ok("the TLD server is .com", steps[2].server.includes(".com"));
  eq("resolves to the address", dnsAnswer(steps), "93.184.216.34");
}

// ================= (D) switch · MAC learning =================
{
  console.log("switch · MAC learning:");
  // A on port 0 talks to B (unknown) → flood; B on port 1 replies to A (now known) → forward.
  const frames: Frame[] = [
    { src: "A", dst: "B", inPort: 0 },
    { src: "B", dst: "A", inPort: 1 },
    { src: "A", dst: "B", inPort: 0 },
  ];
  const steps = runSwitch(frames, 4);
  eq("first frame floods (B unknown)", steps[0].action, "flood");
  eq("flood goes out every other port", steps[0].outPorts, [1, 2, 3]);
  eq("learned A@0 from the first frame", steps[0].learned, { mac: "A", port: 0 });
  eq("reply forwards (A now known)", steps[1].action, "forward");
  eq("...straight to port 0", steps[1].outPorts, [0]);
  eq("third frame forwards (B now known too)", steps[2].action, "forward");
  eq("table has both hosts", steps[2].table.length, 2);
  // Learning strictly reduces flooding: only the very first frame floods here.
  eq("only one flood across the exchange", floodCount(steps), 1);
}

console.log(failed === 0 ? "\n✓ ch.26 engines: all checks pass" : `\n✗ ch.26 engines: ${failed} failing`);
process.exit(failed === 0 ? 0 : 1);
