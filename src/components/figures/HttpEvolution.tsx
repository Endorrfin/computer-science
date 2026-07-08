// [fig] http-evolution (ch.28) — why HTTP went 1.1 → 2 → 3, told through ONE
// question: when a single packet is lost, how many of your in-flight resources
// does it stall? The answer is the whole story of head-of-line (HOL) blocking.
//   • HTTP/1.1 opens ~6 TCP connections and sends one response at a time on each,
//     so only ~6 of your 12 resources are ever in flight — the rest wait in line
//     (application-layer HOL), and a loss stalls that connection's queue.
//   • HTTP/2 multiplexes ALL 12 over ONE TCP connection — fixing 1.1's app-layer
//     HOL — but because TCP delivers one ordered byte stream, a single lost packet
//     freezes EVERY stream (transport-layer HOL): 12 stalled.
//   • HTTP/3 runs over QUIC/UDP, where each stream has its own reliability, so a
//     loss stalls ONLY its own stream: just 1. TLS is built in; resumption is 0-RTT.
// Every number comes verbatim from httpEvolution(12, 1, 3) in ../sims/net/web.ts
// (the tested engine); nothing is recomputed here. Stepped SVG (§6); never a GIF.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import { httpEvolution } from "../sims/net/web.ts";
import type { HttpVersion } from "../sims/net/web.ts";
import "../../theme/_p7css/http-evolution.css";

const ACCENT = "#38bdf8";

// The engine is the source of truth. 12 resources, 1 round each, a loss costs 3.
const N = 12;
const EVO = httpEvolution(N, 1, 3);

const VB_W = 680;
const VB_H = 400;

// ---- small SVG primitives (mirroring JournalingStepper's style) ----

type StreamTone = "flowing" | "stalled" | "loss" | "waiting" | "done";

function toneColor(tone: StreamTone): string {
  switch (tone) {
    case "flowing":
      return "var(--sem-data)"; // cyan — bytes moving
    case "done":
      return "var(--sem-ok)"; // green — delivered
    case "loss":
      return "var(--sem-err)"; // red — the lost packet
    case "stalled":
      return "var(--sem-err)"; // red-tinted — blocked by the loss
    case "waiting":
      return "var(--tx3)"; // muted — queued, not yet started
  }
}

// A single resource stream drawn as a rounded lane with a moving-packet glyph.
function Stream({
  x,
  y,
  w,
  tone,
  label,
}: {
  x: number;
  y: number;
  w: number;
  tone: StreamTone;
  label?: string;
}): ReactNode {
  const color = toneColor(tone);
  const muted = tone === "waiting";
  const fill =
    tone === "stalled"
      ? "color-mix(in srgb, var(--sem-err) 12%, var(--surface))"
      : tone === "loss"
        ? "color-mix(in srgb, var(--sem-err) 22%, var(--surface))"
        : muted
          ? "var(--surface)"
          : `color-mix(in srgb, ${color} 15%, var(--surface))`;
  const h = 15;
  return (
    <g fontFamily="var(--font-mono)" className={tone === "stalled" || tone === "loss" ? "httpe-blocked" : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={fill}
        stroke={color}
        strokeWidth={muted ? 1 : 1.75}
        strokeDasharray={tone === "waiting" ? "3 3" : undefined}
      />
      {label && (
        <text x={x - 6} y={y + 11} textAnchor="end" fontSize="8.5" fill="var(--tx3)">
          {label}
        </text>
      )}
      {/* a small packet head to show motion / where it froze */}
      {tone === "flowing" && (
        <circle className="httpe-pkt" cx={x + w - 6} cy={y + h / 2} r={3.25} fill="var(--sem-data)" />
      )}
      {tone === "done" && (
        <text x={x + w - 8} y={y + 11} textAnchor="middle" fontSize="10" fill="var(--sem-ok)" fontWeight={700}>
          ✓
        </text>
      )}
      {(tone === "stalled" || tone === "loss") && (
        <text x={x + w - 8} y={y + 11.5} textAnchor="middle" fontSize="10" fill="var(--sem-err)" fontWeight={700}>
          {tone === "loss" ? "✕" : "⏸"}
        </text>
      )}
    </g>
  );
}

// The big "stalls N streams" headline chip.
function Headline({
  x,
  y,
  n,
  total,
  tone,
}: {
  x: number;
  y: number;
  n: number;
  total: number;
  tone: "bad" | "warn" | "good";
}): ReactNode {
  const color = tone === "good" ? "var(--sem-ok)" : tone === "warn" ? "var(--sem-control)" : "var(--sem-err)";
  return (
    <g fontFamily="var(--font-mono)">
      <text x={x} y={y} fontSize="12" fill="var(--tx3)" letterSpacing="0.04em">
        one lost packet stalls
      </text>
      <text x={x} y={y + 34} fontSize="34" fontWeight={800} fill={color} fontFamily="var(--font-head)">
        {n}
      </text>
      <text x={x + (String(n).length * 20 + 12)} y={y + 34} fontSize="14" fill="var(--tx2)">
        of {total} streams
      </text>
    </g>
  );
}

// A labelled transport box (the connection(s) carrying the streams).
function TransportBox({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  tone: "neutral" | "bad" | "good";
}): ReactNode {
  const color = tone === "good" ? "var(--sem-ok)" : tone === "bad" ? "var(--sem-err)" : "var(--accent)";
  return (
    <g fontFamily="var(--font-mono)">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={`color-mix(in srgb, ${color} 7%, var(--surface))`}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text x={x + 10} y={y + 16} fontSize="10.5" fontWeight={700} fill={color} letterSpacing="0.04em">
        {title}
      </text>
      <text x={x + 10} y={y + 30} fontSize="9" fill="var(--tx3)">
        {sub}
      </text>
    </g>
  );
}

function note(text: string): ReactNode {
  return (
    <text x={24} y={382} fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx2)">
      {text}
    </text>
  );
}

// Lay out a column of N stream lanes inside a transport box.
function streamColumn(
  count: number,
  x: number,
  top: number,
  w: number,
  toneOf: (i: number) => StreamTone,
): ReactNode {
  const gap = 4;
  const h = 15;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <Stream key={i} x={x} y={top + i * (h + gap)} w={w} tone={toneOf(i)} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Frames. h1/h2/h3 pulled from the engine; the SVG dramatizes each headline.
// ---------------------------------------------------------------------------
const { h1, h2, h3 } = EVO;

const FRAMES: Frame[] = [
  // 0 — the setup / the question
  {
    caption:
      `A page needs ${N} small resources from one origin. The version of HTTP you speak decides how they share the network — and, when a packet drops, how much of the page freezes. We measure each protocol by one number: how many in-flight streams a single loss stalls.`,
    render: () => (
      <g>
        <text x={24} y={70} fontSize="15" fontFamily="var(--font-head)" fontWeight={700} fill="var(--tx)">
          {N} resources, one origin — who gets blocked when a packet drops?
        </text>
        {/* twelve waiting lanes, centred */}
        {streamColumn(N, 260, 96, 170, () => "waiting")}
        <text x={244} y={96 + 6 * 19 - 6} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx3)">
          {N}
        </text>
        <text x={244} y={96 + 6 * 19 + 10} textAnchor="end" fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx3)">
          resources
        </text>
        <text x={454} y={188} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx3)">
          ← all queued,
        </text>
        <text x={454} y={204} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx3)">
          none delivered yet
        </text>
        {note("the headline of each version: “one lost packet stalls N of 12 streams”.")}
      </g>
    ),
  },

  // 1 — HTTP/1.1: ~6 connections, one at a time each → app-layer HOL
  {
    caption:
      `${h1.name} — ${h1.transport}. Each connection carries one response at a time, so only ~6 of the ${N} resources are ever in flight; the other 6 wait in line behind them. That queueing IS application-layer head-of-line blocking, and a loss stalls whatever is queued on that connection.`,
    render: () => (
      <g>
        <VersionTag v={h1} tone="bad" />
        <TransportBox x={40} y={62} w={300} h={296} title="≈6 TCP CONNECTIONS" sub="one response at a time on each" tone="neutral" />
        {/* 6 flowing (in flight), 6 waiting behind — the app-layer HOL */}
        {streamColumn(6, 150, 78, 170, () => "flowing")}
        <text x={132} y={92} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--sem-data)">6 in</text>
        <text x={132} y={104} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--sem-data)">flight</text>
        {streamColumn(6, 150, 78 + 6 * 19 + 8, 170, () => "waiting")}
        <text x={132} y={78 + 6 * 19 + 8 + 40} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--tx3)">6 wait</text>
        <Headline x={380} y={150} n={h1.streamsStalledByLoss} total={N} tone="warn" />
        <text x={380} y={214} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          only ~6 flow at once;
        </text>
        <text x={380} y={230} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          the rest queue behind them
        </text>
        <text x={380} y={258} fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx3)">
          engine: stall ⌈12/6⌉ = {h1.streamsStalledByLoss}
        </text>
        <text x={380} y={274} fontSize="10.5" fontFamily="var(--font-mono)" fill="var(--tx3)">
          per connection queue
        </text>
        {note(`waves ≈ ⌈12/6⌉ = ${h1.roundsNoLoss}; a loss adds ${h1.roundsWithLoss - h1.roundsNoLoss} → ${h1.roundsWithLoss}. browsers open ~6 just to parallelise.`)}
      </g>
    ),
  },

  // 2 — HTTP/2: one connection, all multiplexed (fixes app-layer HOL)
  {
    caption:
      `${h2.name} — ${h2.transport}. All ${N} streams are multiplexed over ONE connection with header compression, so every resource is in flight at once. This kills 1.1's application-layer HOL: no more waiting in six separate queues.`,
    render: () => (
      <g>
        <VersionTag v={h2} tone="good" />
        <TransportBox x={40} y={62} w={330} h={296} title="1 TCP CONNECTION" sub="all 12 streams multiplexed" tone="good" />
        {streamColumn(N, 150, 74, 200, () => "flowing")}
        <text x={132} y={74 + 6 * 19} textAnchor="end" fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-data)">all 12</text>
        <text x={132} y={74 + 6 * 19 + 12} textAnchor="end" fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-data)">in flight</text>
        <text x={400} y={150} fontSize="13" fontFamily="var(--font-head)" fontWeight={700} fill="var(--sem-ok)">
          app-layer HOL: fixed
        </text>
        <text x={400} y={178} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
          one connection, no queues —
        </text>
        <text x={400} y={195} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--tx2)">
          every stream moves together.
        </text>
        <text x={400} y={224} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--sem-control)" fontWeight={700}>
          but they share ONE
        </text>
        <text x={400} y={241} fontSize="11.5" fontFamily="var(--font-mono)" fill="var(--sem-control)" fontWeight={700}>
          ordered TCP byte stream…
        </text>
        {note("so far so good — until a single packet goes missing on that shared stream.")}
      </g>
    ),
  },

  // 3 — HTTP/2: one loss freezes ALL streams (TCP HOL) — the headline
  {
    caption:
      `${h2.name}'s catch: because TCP is one ordered byte stream, a single lost packet makes TCP hold back EVERYTHING behind it — so all ${h2.streamsStalledByLoss} streams freeze until it is retransmitted. The blocking just moved down a layer, from the app to TCP itself.`,
    render: () => (
      <g>
        <VersionTag v={h2} tone="bad" />
        <TransportBox x={40} y={62} w={330} h={296} title="1 TCP CONNECTION — one ordered byte stream" sub="a gap in the stream blocks all that follow" tone="bad" />
        {/* one loss + all others stalled */}
        {streamColumn(N, 150, 74, 200, (i) => (i === 4 ? "loss" : "stalled"))}
        <text x={132} y={74 + 4 * 19 + 11} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--sem-err)" fontWeight={700}>lost</text>
        <Headline x={400} y={150} n={h2.streamsStalledByLoss} total={N} tone="bad" />
        <text x={400} y={216} fontSize="12" fontFamily="var(--font-mono)" fill="var(--sem-err)" fontWeight={700}>
          TCP head-of-line blocking
        </text>
        <text x={400} y={238} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          one drop → every stream waits
        </text>
        <text x={400} y={254} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          for the retransmit ({h2.roundsWithLoss - h2.roundsNoLoss} extra)
        </text>
        {note(`multiplexing helped throughput, but TCP can’t tell the streams apart → all ${h2.streamsStalledByLoss} stall on one loss.`)}
      </g>
    ),
  },

  // 4 — HTTP/3: QUIC over UDP, independent streams → loss stalls only its own
  {
    caption:
      `${h3.name} — ${h3.transport}. QUIC gives each stream its OWN reliability, so a lost packet stalls only the one stream it belonged to — just ${h3.streamsStalledByLoss}. The other 11 keep flowing. Same loss as HTTP/2, a twelfth of the damage.`,
    render: () => (
      <g>
        <VersionTag v={h3} tone="good" />
        <TransportBox x={40} y={62} w={330} h={296} title="1 QUIC CONNECTION (over UDP)" sub="independent, per-stream reliability" tone="good" />
        {/* one stalled (its own loss), the rest keep flowing */}
        {streamColumn(N, 150, 74, 200, (i) => (i === 4 ? "loss" : "flowing"))}
        <text x={132} y={74 + 4 * 19 + 11} textAnchor="end" fontSize="9" fontFamily="var(--font-mono)" fill="var(--sem-err)" fontWeight={700}>lost</text>
        <Headline x={400} y={150} n={h3.streamsStalledByLoss} total={N} tone="good" />
        <text x={400} y={214} fontSize="12" fontFamily="var(--font-mono)" fill="var(--sem-ok)" fontWeight={700}>
          only its own stream waits
        </text>
        <text x={400} y={236} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          the other {N - h3.streamsStalledByLoss} deliver on time
        </text>
        <text x={400} y={252} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)">
          no transport-layer HOL
        </text>
        {note(`QUIC multiplexes without shared ordering → a loss stalls just ${h3.streamsStalledByLoss} of ${N}.`)}
      </g>
    ),
  },

  // 5 — the payoff: side-by-side 6 → 12 → 1, plus HTTP/3's extras
  {
    caption:
      "The whole arc in one number. HTTP/1.1: only ~6 flow at once, the rest queue (app-layer HOL). HTTP/2: all 12 flow, but one loss freezes all 12 (TCP HOL). HTTP/3: one loss stalls just 1 — and TLS is built into the QUIC handshake, so a return visit can start sending at 0-RTT.",
    render: () => (
      <g>
        <ScoreCard x={36} y={70} v={h1} big="~6" tone="bad" tag="app-layer HOL" desc="~6 flow, 6 queue" />
        <ScoreCard x={252} y={70} v={h2} big={String(h2.streamsStalledByLoss)} tone="bad" tag="TCP HOL" desc="one loss ⇒ all 12" />
        <ScoreCard x={468} y={70} v={h3} big={String(h3.streamsStalledByLoss)} tone="good" tag="no transport HOL" desc="one loss ⇒ just 1" />
        {/* arrows between cards */}
        <text x={238} y={168} textAnchor="middle" fontSize="18" fill="var(--tx3)">→</text>
        <text x={454} y={168} textAnchor="middle" fontSize="18" fill="var(--tx3)">→</text>
        {/* HTTP/3 extras banner */}
        <rect x={468} y={280} width={196} height={72} rx={8} fill="color-mix(in srgb, var(--sem-ok) 8%, var(--surface))" stroke="var(--sem-ok)" strokeWidth={1.5} />
        <text x={566} y={300} textAnchor="middle" fontSize="11" fontFamily="var(--font-head)" fontWeight={700} fill="var(--sem-ok)">HTTP/3 bonus</text>
        <text x={566} y={320} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx2)">TLS built into QUIC</text>
        <text x={566} y={336} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--tx2)">resumption at 0-RTT</text>
        {note("streams stalled by one loss:  ~6 waiting  →  all 12 frozen  →  just 1.")}
      </g>
    ),
  },
];

// A version name + transport chip, top-right of a frame.
function VersionTag({ v, tone }: { v: HttpVersion; tone: "bad" | "good" }): ReactNode {
  const color = tone === "good" ? "var(--sem-ok)" : "var(--sem-err)";
  return (
    <g fontFamily="var(--font-head)">
      <text x={24} y={40} fontSize="18" fontWeight={800} fill="var(--tx)">
        {v.name}
      </text>
      <g fontFamily="var(--font-mono)">
        <rect x={132} y={26} width={Math.max(90, v.transport.length * 6.4)} height={19} rx={9} fill={`color-mix(in srgb, ${color} 12%, var(--surface))`} stroke={color} strokeWidth={1.25} />
        <text x={132 + Math.max(90, v.transport.length * 6.4) / 2} y={39} textAnchor="middle" fontSize="10" fill={color}>
          {v.transport}
        </text>
      </g>
    </g>
  );
}

// One column of the final scoreboard.
function ScoreCard({
  x,
  y,
  v,
  big,
  tone,
  tag,
  desc,
}: {
  x: number;
  y: number;
  v: HttpVersion;
  big: string;
  tone: "bad" | "good";
  tag: string;
  desc: string;
}): ReactNode {
  const color = tone === "good" ? "var(--sem-ok)" : "var(--sem-err)";
  const w = 176;
  return (
    <g fontFamily="var(--font-mono)">
      <rect x={x} y={y} width={w} height={188} rx={10} fill="var(--surface)" stroke={color} strokeWidth={1.75} />
      <text x={x + w / 2} y={y + 26} textAnchor="middle" fontSize="14" fontFamily="var(--font-head)" fontWeight={800} fill="var(--tx)">
        {v.name}
      </text>
      <text x={x + w / 2} y={y + 44} textAnchor="middle" fontSize="9" fill="var(--tx3)">
        {v.transport}
      </text>
      <text x={x + w / 2} y={y + 104} textAnchor="middle" fontSize="46" fontFamily="var(--font-head)" fontWeight={800} fill={color}>
        {big}
      </text>
      <text x={x + w / 2} y={y + 124} textAnchor="middle" fontSize="9.5" fill="var(--tx3)">
        streams stalled / loss
      </text>
      <rect x={x + 14} y={y + 138} width={w - 28} height={18} rx={9} fill={`color-mix(in srgb, ${color} 12%, transparent)`} />
      <text x={x + w / 2} y={y + 151} textAnchor="middle" fontSize="9.5" fontWeight={700} fill={color}>
        {tag}
      </text>
      <text x={x + w / 2} y={y + 174} textAnchor="middle" fontSize="9.5" fill="var(--tx2)">
        {desc}
      </text>
    </g>
  );
}

export default function HttpEvolution() {
  return (
    <FigureStepper
      title="HTTP/1.1 → 2 → 3 — who does one lost packet stall?"
      figKey="http-evolution"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
