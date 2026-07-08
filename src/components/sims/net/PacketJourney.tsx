// [HERO] packet-journey (ch.26) — one HTTP request crossing the planet.
// Two phases play in order, exactly as the network does them:
//   1. RESOLVE — the DNS side-quest. Before hop 1 can leave, the name has to
//      become an address: a recursive resolver walks root → TLD → authoritative
//      → the A record. We play the four resolveDns() steps to learn dstIp.
//   2. IN FLIGHT — the packet itself, hop by hop via journey(). The teaching
//      beat lives here: the src/dst IP is END-TO-END and never changes, while
//      the src/dst MAC is REWRITTEN at every router, and the TTL ticks down once
//      per router. Start with TTL=1 and the packet is DROPPED at the first
//      router — that's the traceroute hook (a step with dropped=true, journey
//      stops). Everything is driven verbatim from ./layers.ts (the tested
//      engine). Reduced motion → Step only, no auto-advance.
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import {
  STACK,
  DEFAULT_PATH,
  encapsulate,
  journey,
  resolveDns,
  dnsAnswer,
} from "./layers.ts";
import type { HopKind, JourneyStep, DnsStep } from "./layers.ts";
import "../../../theme/_p7css/packet-journey.css";

const ACCENT = "#38bdf8"; // P7 accent
const DST_NAME = "example.com";
const FULL_TTL = 64; // a normal starting TTL
const LOW_TTL = 1; // the traceroute preset — dies at the first router

// Phase 0 is "idle / not started". DNS steps occupy 1…dns.length, then the
// journey steps follow. We track a single monotonic cursor and derive which
// phase we're in from it.
type Phase = "idle" | "dns" | "flight" | "done";

// Colour a hop by its role. Routers are the interesting ones (TTL + MAC rewrite).
const KIND_SEM: Record<HopKind, string> = {
  host: "var(--sem-ok)",
  switch: "var(--sem-state)",
  router: "var(--sem-control)",
};
const KIND_LABEL: Record<HopKind, string> = {
  host: "host",
  switch: "switch",
  router: "router",
};
const KIND_GLYPH: Record<HopKind, string> = {
  host: "🖥",
  switch: "🔀",
  router: "🛰",
};

// The four encapsulation headers, paired with the semantic colour of their
// layer. STACK is app→link; the wire order (outermost first) is link→app, which
// is exactly what encapsulate() returns in headersOutToIn.
const LAYER_SEM: Record<string, string> = {
  application: "var(--sem-data)",
  transport: "var(--sem-control)",
  internet: "var(--sem-state)",
  link: "var(--sem-ok)",
};
function semForHeader(header: string): string {
  const layer = STACK.find((l) => l.header === header);
  return layer ? LAYER_SEM[layer.id] : "var(--accent)";
}

export default function PacketJourney() {
  const reduced = useReducedMotion();

  // The two presets: normal delivery vs. the low-TTL traceroute drop.
  const [ttlStart, setTtlStart] = useState<number>(FULL_TTL);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Everything downstream is a pure function of the preset; recompute on change.
  const dns = useMemo<DnsStep[]>(() => resolveDns(DST_NAME), []);
  const dstIp = useMemo<string>(() => dnsAnswer(dns) ?? "93.184.216.34", [dns]);
  const steps = useMemo<JourneyStep[]>(
    () => journey(DEFAULT_PATH, ttlStart, undefined, dstIp),
    [ttlStart, dstIp],
  );
  const envelope = useMemo(() => encapsulate("GET / HTTP/1.1"), []);

  // cursor: 0 = idle. 1..dns.length = playing DNS step (cursor-1). Then
  // dns.length + 1 .. dns.length + steps.length = journey step. The total run
  // length lets us know when we're done.
  const dnsLen = dns.length;
  const total = dnsLen + steps.length;
  const [cursor, setCursor] = useState(0);

  const phase: Phase =
    cursor === 0 ? "idle" : cursor <= dnsLen ? "dns" : cursor >= total ? "done" : "flight";

  const dnsIdx = phase === "dns" ? cursor - 1 : phase === "idle" ? -1 : dnsLen - 1;
  const flightIdx = cursor > dnsLen ? Math.min(cursor - dnsLen - 1, steps.length - 1) : -1;
  const activeStep: JourneyStep | undefined = flightIdx >= 0 ? steps[flightIdx] : undefined;

  // The journey may end early on a drop; the last real step is steps[last].
  const lastStep = steps[steps.length - 1];
  const droppedStep = steps.find((s) => s.dropped);
  const reachedEnd = cursor >= total;

  function reset(): void {
    setCursor(0);
    setRunning(false);
  }
  function load(nextTtl: number): void {
    setTtlStart(nextTtl);
    setCursor(0);
    setRunning(false);
  }
  function doStep(): void {
    setCursor((c) => Math.min(c + 1, total));
  }

  useSimClock(running, 1.6 * speed, doStep);
  // Auto-stop the play loop once we hit the end (drop or arrival).
  useEffect(() => {
    if (running && reachedEnd) setRunning(false);
  }, [running, reachedEnd]);

  function onToggle(): void {
    if (reduced) return;
    if (reachedEnd) {
      // Replay from the top on a fresh play press.
      setCursor(0);
      setRunning(true);
      return;
    }
    setRunning((r) => !r);
  }

  const statusLine = useMemo(() => {
    if (phase === "idle") {
      return ttlStart === LOW_TTL
        ? `ready · TTL=${ttlStart} preset — the packet will be dropped at the first router (traceroute)`
        : `ready · resolve ${DST_NAME}, then send with TTL=${ttlStart}`;
    }
    if (phase === "dns") {
      const s = dns[dnsIdx];
      return `resolving ${DST_NAME} · step ${dnsIdx + 1}/${dnsLen} · ${s.server}`;
    }
    if (activeStep) {
      const ttlTxt = activeStep.kind === "router" ? ` · TTL ${activeStep.ttl}` : "";
      return activeStep.dropped
        ? `hop ${activeStep.index + 1}/${DEFAULT_PATH.length} · ${activeStep.hop} · TTL 0 — DROPPED`
        : `hop ${activeStep.index + 1}/${DEFAULT_PATH.length} · ${activeStep.hop}${ttlTxt} · IP ${activeStep.srcIp} → ${activeStep.dstIp}`;
    }
    // done
    return droppedStep
      ? `done · packet died at ${droppedStep.hop} (TTL exhausted) — this is one traceroute probe`
      : `done · request delivered to ${lastStep.hop} · IP stayed ${lastStep.srcIp} → ${lastStep.dstIp} the whole way`;
  }, [phase, ttlStart, dns, dnsIdx, dnsLen, activeStep, droppedStep, lastStep]);

  return (
    <SimShell
      title="One HTTP request across the planet — name to address, then hop by hop"
      simKey="packet-journey"
      kind="hero"
      accent={ACCENT}
      transport={{ running, onToggle, onStep: doStep, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={statusLine}
      controls={
        <div className="pj-ctl" role="group" aria-label="Journey preset">
          <div className="bit-seg" role="group" aria-label="TTL preset">
            <button
              type="button"
              className={cx("bit-segbtn", ttlStart === FULL_TTL && "on")}
              onClick={() => load(FULL_TTL)}
              aria-pressed={ttlStart === FULL_TTL}
            >
              deliver (TTL {FULL_TTL})
            </button>
            <button
              type="button"
              className={cx("bit-segbtn", ttlStart === LOW_TTL && "on")}
              onClick={() => load(LOW_TTL)}
              aria-pressed={ttlStart === LOW_TTL}
              title="Start with TTL=1 so the packet is dropped at the first router — the traceroute trick"
            >
              drop · TTL 1
            </button>
          </div>
        </div>
      }
      footer={
        <Explain
          phase={phase}
          envelope={envelope}
          activeStep={activeStep}
          dstName={DST_NAME}
          dstIp={dstIp}
          droppedStep={droppedStep}
          reached={reachedEnd}
        />
      }
    >
      <div className="pj-stage">
        <DnsQuest dns={dns} phase={phase} dnsIdx={dnsIdx} dstName={DST_NAME} reduced={reduced} />
        <HopMap
          steps={steps}
          phase={phase}
          flightIdx={flightIdx}
          droppedStep={droppedStep}
          reduced={reduced}
        />
      </div>
    </SimShell>
  );
}

// =========================================================================
// Phase 1 — the DNS side-quest (root → TLD → authoritative → answer)
// =========================================================================
function DnsQuest({
  dns,
  phase,
  dnsIdx,
  dstName,
  reduced,
}: {
  dns: DnsStep[];
  phase: Phase;
  dnsIdx: number;
  dstName: string;
  reduced: boolean;
}) {
  const active = phase === "dns";
  const resolved = phase === "flight" || phase === "done";
  const answer = dns.find((s) => s.isAnswer);

  return (
    <div
      className={cx("pj-dns", active && "pj-dns--live", resolved && "pj-dns--ok", !reduced && "pj-anim")}
      aria-label={`DNS resolution for ${dstName}`}
    >
      <div className="pj-dns-head">
        <span className="pj-phase-tag" data-on={active}>
          1 · resolve name
        </span>
        <span className="pj-dns-title">
          {resolved ? (
            <>
              <b>{dstName}</b> → <code className="pj-ip">{answer ? dnsAnswer(dns) : "?"}</code>
            </>
          ) : active ? (
            <>looking up <b>{dstName}</b>…</>
          ) : (
            <>where is <b>{dstName}</b>?</>
          )}
        </span>
      </div>

      <ol className="pj-dns-chain">
        {dns.map((s, i) => {
          const state =
            phase === "idle" ? "pending" : i < dnsIdx || resolved ? "done" : i === dnsIdx ? "live" : "pending";
          return (
            <li key={s.server} className={cx("pj-dns-step", `is-${state}`, s.isAnswer && "is-answer")}>
              <span className="pj-dns-dot" aria-hidden="true">
                {state === "done" ? "✓" : i + 1}
              </span>
              <div className="pj-dns-body">
                <span className="pj-dns-server">{s.server}</span>
                <span className="pj-dns-line">
                  <span className="pj-dns-asks">“{s.asks}”</span>
                  {(state === "done" || state === "live") && (
                    <span className="pj-dns-replies"> → {s.replies}</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// =========================================================================
// Phase 2 — the hop map (laptop → … → server), the packet, TTL, MAC rewrite
// =========================================================================
function HopMap({
  steps,
  phase,
  flightIdx,
  droppedStep,
  reduced,
}: {
  steps: JourneyStep[];
  phase: Phase;
  flightIdx: number;
  droppedStep: JourneyStep | undefined;
  reduced: boolean;
}) {
  const path = DEFAULT_PATH;
  const n = path.length;

  // Layout: a horizontal chain, evenly spaced, with a little vertical bob so the
  // datacenter end reads distinct from the home end.
  const W = 720;
  const H = 260;
  const padX = 44;
  const y = 150;
  const gap = (W - padX * 2) / (n - 1);
  const nodeX = (i: number): number => padX + i * gap;

  const inFlight = phase === "flight";
  const done = phase === "done";
  // Where the packet glyph sits: at the active hop while in flight; parked at the
  // last reached hop when done.
  const lastReached = steps[steps.length - 1]?.index ?? 0;
  const pktIdx = inFlight ? Math.max(0, flightIdx) : done ? lastReached : 0;
  const pktX = nodeX(pktIdx);
  const active = flightIdx >= 0 ? steps[flightIdx] : undefined;
  const showPacket = phase !== "idle" && phase !== "dns";

  const mapLabel = done
    ? droppedStep
      ? `Packet dropped at ${droppedStep.hop}; the journey stopped there.`
      : `Packet delivered from ${path[0].name} to ${path[n - 1].name}.`
    : `Packet route across ${n} hops from ${path[0].name} to ${path[n - 1].name}.`;

  return (
    <div className="pj-map">
      <div className="pj-map-head">
        <span className="pj-phase-tag" data-on={inFlight}>
          2 · packet in flight
        </span>
        <span className="pj-map-sub">
          {phase === "idle" || phase === "dns"
            ? "waiting for the address…"
            : done
              ? droppedStep
                ? "TTL hit zero — traceroute learns this hop"
                : "arrived — headers peeled back off"
              : active
                ? active.action
                : ""}
        </span>
      </div>

      <svg
        className={cx("pj-svg", !reduced && "pj-anim")}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={mapLabel}
      >
        <defs>
          <filter id="pjGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* the wire — segment between each hop, lit up once traversed */}
        {path.slice(0, -1).map((_, i) => {
          const traversed = showPacket && i < pktIdx;
          const isDropEdge = droppedStep && done && i === droppedStep.index - 1;
          return (
            <line
              key={`edge-${i}`}
              x1={nodeX(i)}
              y1={y}
              x2={nodeX(i + 1)}
              y2={y}
              className={cx("pj-edge", traversed && "is-live", isDropEdge && "is-drop")}
            />
          );
        })}

        {/* hop nodes */}
        {path.map((hop, i) => {
          const cx0 = nodeX(i);
          const reached = showPacket && (done ? i <= lastReached : i <= pktIdx);
          const isHere = showPacket && i === pktIdx && !done;
          const isDead = !!droppedStep && done && i === droppedStep.index;
          const sem = KIND_SEM[hop.kind];
          return (
            <g key={hop.name} className="pj-node">
              <circle
                cx={cx0}
                cy={y}
                r={isHere ? 21 : 18}
                fill={`color-mix(in srgb, ${isDead ? "var(--sem-err)" : sem} ${reached ? 24 : 12}%, var(--surface))`}
                stroke={isDead ? "var(--sem-err)" : sem}
                strokeWidth={isHere || isDead ? 3 : 1.75}
                className={cx("pj-node-c", isHere && "is-here", isDead && "is-dead")}
              />
              <text x={cx0} y={y + 5} textAnchor="middle" className="pj-node-glyph">
                {isDead ? "✕" : KIND_GLYPH[hop.kind]}
              </text>
              {/* kind chip above */}
              <text x={cx0} y={y - 30} textAnchor="middle" className="pj-node-kind" fill={sem}>
                {KIND_LABEL[hop.kind]}
              </text>
              {/* name below, wrapped to two short lines by splitting on space */}
              <NodeName x={cx0} y={y + 40} name={hop.name} />
            </g>
          );
        })}

        {/* the packet — an envelope glyph riding the wire */}
        {showPacket && (
          <g className={cx("pj-packet", active?.dropped && done && "is-dead")} transform={`translate(${pktX}, ${y - 44})`}>
            <g filter="url(#pjGlow)">
              <rect x={-16} y={-12} width={32} height={22} rx={3} className="pj-pkt-body" />
              <path d="M-16,-12 L0,2 L16,-12" className="pj-pkt-flap" />
            </g>
            {/* TTL badge — only meaningful at routers, shown whenever we have one */}
            {active && (
              <text x={0} y={-20} textAnchor="middle" className="pj-pkt-ttl">
                {active.kind === "router" ? `TTL ${active.ttl}` : "◦"}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* the header-invariance readout — the key teaching beat */}
      <AddrReadout active={active} phase={phase} steps={steps} droppedStep={droppedStep} done={done} />
    </div>
  );
}

// Two-line node name inside the SVG (mono, small).
function NodeName({ x, y, name }: { x: number; y: number; name: string }) {
  const words = name.split(" ");
  // Greedy 2-line wrap ~ balanced.
  let l1 = words[0];
  let l2 = "";
  for (let i = 1; i < words.length; i++) {
    if ((l1 + " " + words[i]).length <= 12 && l2 === "") l1 += " " + words[i];
    else l2 = (l2 ? l2 + " " : "") + words[i];
  }
  return (
    <>
      <text x={x} y={y} textAnchor="middle" className="pj-node-name">
        {l1}
      </text>
      {l2 && (
        <text x={x} y={y + 12} textAnchor="middle" className="pj-node-name">
          {l2}
        </text>
      )}
    </>
  );
}

// The IP-pinned / MAC-rewritten panel. This is the whole point of the sim, so it
// reads as a compact "envelope address label" that changes (MAC) vs. stays put
// (IP) as the packet advances.
function AddrReadout({
  active,
  phase,
  steps,
  droppedStep,
  done,
}: {
  active: JourneyStep | undefined;
  phase: Phase;
  steps: JourneyStep[];
  droppedStep: JourneyStep | undefined;
  done: boolean;
}) {
  const show = phase === "flight" || phase === "done";
  const step = active ?? (done ? steps[steps.length - 1] : undefined);
  // The link-layer rewrite is the router's job (the engine's own narrative:
  // switches "forward within the LAN by MAC", routers "rewrite src/dst MAC for
  // the next link"). We highlight the change exactly where the model says it
  // happens — at a router — while still showing the verbatim engine MAC values.
  const macChanged = step?.kind === "router";

  return (
    <div className={cx("pj-addr", !show && "pj-addr--idle")} aria-hidden={!show}>
      <div className="pj-addr-col pj-addr-col--ip">
        <span className="pj-addr-k">
          IP <span className="pj-pin">pinned end-to-end</span>
        </span>
        <span className="pj-addr-v">
          <code>{step?.srcIp ?? "192.168.1.42"}</code>
          <span className="pj-arrow">→</span>
          <code>{step?.dstIp ?? "—"}</code>
        </span>
        <span className="pj-addr-note">the internet layer never touches these</span>
      </div>
      <div className={cx("pj-addr-col pj-addr-col--mac", macChanged && "is-changed")}>
        <span className="pj-addr-k">
          MAC{" "}
          <span className="pj-rewrite">{macChanged ? "rewritten ✎" : "this link"}</span>
        </span>
        <span className="pj-addr-v">
          <code>{step ? `${step.srcMac}…` : "aa:00…"}</code>
          <span className="pj-arrow">→</span>
          <code>{step ? `${step.dstMac}…` : "bb:11…"}</code>
        </span>
        <span className="pj-addr-note">
          {droppedStep && done
            ? "…and here it never got rewritten again"
            : "swapped at every router for the next hop"}
        </span>
      </div>
    </div>
  );
}

// =========================================================================
// Footer — the encapsulation envelope + the per-phase teaching line
// =========================================================================
function Explain({
  phase,
  envelope,
  activeStep,
  dstName,
  dstIp,
  droppedStep,
  reached,
}: {
  phase: Phase;
  envelope: ReturnType<typeof encapsulate>;
  activeStep: JourneyStep | undefined;
  dstName: string;
  dstIp: string;
  droppedStep: JourneyStep | undefined;
  reached: boolean;
}) {
  return (
    <div className="pj-foot">
      <Envelope envelope={envelope} />
      <div className="pj-note">
        <p className="pj-note-p">
          {phase === "idle" && (
            <>
              A single <code>GET /</code> to <b>{dstName}</b> is a two-act play. First the{" "}
              <b>name is resolved</b> to an address; only then can the packet leave. Press{" "}
              <b>play</b> (or <b>step</b>) to watch both.
            </>
          )}
          {phase === "dns" && (
            <>
              <b>Nothing can be sent yet.</b> The recursive resolver doesn&apos;t know{" "}
              <code>{dstName}</code>, so it walks the hierarchy — <i>root → TLD → authoritative</i>{" "}
              — until an authoritative server hands back the <b>A record</b>.
            </>
          )}
          {phase === "flight" && activeStep && (
            <>
              {activeStep.kind === "router" ? (
                <>
                  <b>A router.</b> It decrements the <b>TTL</b> and <b>rewrites the MAC pair</b> for
                  the next physical link — but the <b>source and destination IP are left exactly as
                  they were</b>. Addressing across the internet is end-to-end; addressing on each wire
                  is hop-by-hop.
                </>
              ) : activeStep.kind === "switch" ? (
                <>
                  <b>A switch.</b> It forwards inside the LAN purely by MAC address — it never looks
                  at the IP header and never touches the TTL. Routers cross networks; switches move
                  frames within one.
                </>
              ) : activeStep.index === 0 ? (
                <>
                  <b>Off it goes.</b> Your laptop wraps the request in TCP → IP → Ethernet (the
                  envelope on the right) and sends it toward <code>{dstIp}</code>.
                </>
              ) : (
                <>
                  <b>Arrival.</b> The server strips Ethernet, then IP, then TCP back off and hands the
                  bare <code>HTTP</code> request up to the web server.
                </>
              )}
            </>
          )}
          {phase === "done" &&
            (droppedStep ? (
              <>
                <b>The packet died at {droppedStep.hop}.</b> Its TTL reached 0, so the router dropped
                it and sent back a <i>“time exceeded”</i>. Do this on purpose with rising TTLs and each
                reply reveals one more hop — that is exactly how <b>traceroute</b> maps the path.
              </>
            ) : (
              <>
                <b>Delivered.</b> Across {DEFAULT_PATH.length} hops the <b>IP pair never changed</b>{" "}
                (<code>{activeStep?.srcIp ?? "192.168.1.42"}</code> → <code>{dstIp}</code>) while the{" "}
                <b>MAC pair was rewritten at every router</b>. That split is the heart of how the
                internet routes.
              </>
            ))}
        </p>
        {reached && !droppedStep && (
          <p className="pj-note-hint">
            Try the <b>drop · TTL 1</b> preset to see the traceroute mechanism — the packet won&apos;t
            make it past the first router.
          </p>
        )}
      </div>
    </div>
  );
}

// The "envelope-in-envelope" from encapsulate(): HTTP wrapped in TCP wrapped in
// IP wrapped in Ethernet. headersOutToIn is link-outermost, so we nest each box
// literally inside the previous one (Ethernet ▸ IP ▸ TCP ▸ HTTP+payload) — that
// physical containment IS the point of encapsulation.
function EnvBox({ headers, payload }: { headers: string[]; payload: string }) {
  const [h, ...rest] = headers;
  const layer = STACK.find((l) => l.header === h);
  const isInner = rest.length === 0;
  return (
    <div
      className={cx("pj-env-box", isInner && "is-inner")}
      style={{ "--pj-layer": semForHeader(h) } as CSSProperties}
    >
      <span className="pj-env-tag">
        {h}
        <span className="pj-env-pdu">{layer ? layer.pdu : ""}</span>
      </span>
      {isInner ? (
        <span className="pj-env-payload">{payload}</span>
      ) : (
        <EnvBox headers={rest} payload={payload} />
      )}
    </div>
  );
}

function Envelope({ envelope }: { envelope: ReturnType<typeof encapsulate> }) {
  return (
    <div className="pj-env" aria-label="Encapsulation — HTTP wrapped in TCP, IP and Ethernet">
      <span className="pj-env-cap">on the wire, outermost first</span>
      <div className="pj-env-nest">
        <EnvBox headers={envelope.headersOutToIn} payload={envelope.payload} />
      </div>
    </div>
  );
}
