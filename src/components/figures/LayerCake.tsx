// [fig] layer-cake (ch.26) — the TCP/IP stack as encapsulation, stepped BOTH
// ways. Going DOWN the sender's stack, the application message is wrapped by
// each layer's header in turn — HTTP → +TCP → +IP → +Ethernet — an
// envelope-in-envelope that grows outward as the PDU is renamed
// message → segment → packet → frame. Then going UP the receiver's stack, each
// header is peeled back off in reverse (link first) until the original message
// is delivered untouched. Layer names, headers and PDU labels all come verbatim
// from STACK in ../sims/net/layers.ts. Stepped SVG (§6); never a GIF in-app.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";
import { STACK } from "../sims/net/layers.ts";
import "../../theme/_p7css/layer-cake.css";

const ACCENT = "#38bdf8";

// STACK is top(app)→bottom(link). Index by role for clarity.
const APP = STACK[0];
const TRANSPORT = STACK[1];
const INTERNET = STACK[2];
const LINK = STACK[3];

// Distinct semantic tone per layer; the payload stays constant (accent/data).
const LAYER_TONE: Record<string, string> = {
  application: "var(--sem-ok)", // the message itself — green
  transport: "var(--sem-state)", // ports/reliability — violet
  internet: "var(--sem-control)", // addressing — orange
  link: "var(--sem-data)", // the wire — cyan
};

const VB_W = 680;
const VB_H = 400;

// Nested-envelope geometry. Each wrapped layer adds a ring of `PAD` around the
// payload, plus a header tab of height `TAB` at the top-left of its band.
const CX = VB_W / 2;
const CY = VB_H / 2 + 6;
const CORE_W = 150;
const CORE_H = 44;
const PAD = 30;
const TAB = 20;

/** Draw the payload plus a set of header rings around it, outermost first.
    `wraps` lists the layers currently wrapping the payload from OUTERMOST to
    innermost. `flashHeader` highlights the header being added/removed. */
function Envelope({
  wraps,
  flashHeader,
  flashKind,
}: {
  wraps: { layer: typeof APP; kind: "add" | "strip" | "static" }[];
  flashHeader?: string;
  flashKind?: "add" | "strip";
}): ReactNode {
  const rings = wraps.length;
  const w = CORE_W + rings * 2 * PAD;
  const h = CORE_H + rings * 2 * (PAD + TAB * 0.35);
  const x0 = CX - w / 2;
  const y0 = CY - h / 2;

  return (
    <g fontFamily="var(--font-mono)">
      {wraps.map((wr, i) => {
        const tone = LAYER_TONE[wr.layer.id];
        const inset = i * PAD;
        const insetY = i * (PAD + TAB * 0.35);
        const rx = x0 + inset;
        const ry = y0 + insetY;
        const rw = w - inset * 2;
        const rh = h - insetY * 2;
        const flashing = wr.layer.header === flashHeader;
        const dashed = flashing && flashKind === "strip";
        return (
          <g key={wr.layer.id} className={`lcake-ring ${flashing ? `is-${flashKind}` : ""}`}>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={9}
              fill={`color-mix(in srgb, ${tone} ${flashing ? 20 : 11}%, var(--surface))`}
              stroke={tone}
              strokeWidth={flashing ? 2.75 : 1.75}
              strokeDasharray={dashed ? "6 5" : undefined}
            />
            {/* header tab sitting on the top edge of this ring */}
            <rect
              x={rx + 10}
              y={ry - TAB / 2}
              width={54}
              height={TAB}
              rx={5}
              fill={`color-mix(in srgb, ${tone} 26%, var(--surface))`}
              stroke={tone}
              strokeWidth={flashing ? 2 : 1.25}
            />
            <text x={rx + 37} y={ry + TAB / 2 - 4} textAnchor="middle" fontSize="10.5" fontWeight={700} fill={tone}>
              {wr.layer.header}
            </text>
            {/* PDU name on the ring's lower edge */}
            <text x={rx + rw - 10} y={ry + rh - 8} textAnchor="end" fontSize="9" fill={tone} opacity={0.85}>
              {wr.layer.pdu}
            </text>
          </g>
        );
      })}

      {/* the constant payload core */}
      <rect
        x={CX - CORE_W / 2}
        y={CY - CORE_H / 2}
        width={CORE_W}
        height={CORE_H}
        rx={7}
        className="lcake-core"
      />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11.5" fontWeight={700} className="lcake-core-t">
        GET /index.html
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="9" className="lcake-core-s">
        the message
      </text>
    </g>
  );
}

/** The four-layer column on the left, with the active layer lit. `activeId` is
    the layer doing work this frame; `dir` colors the travel arrow. */
function StackColumn({ activeId, dir }: { activeId: string | null; dir: "down" | "up" | null }): ReactNode {
  const x = 26;
  const w = 150;
  const boxH = 62;
  const gap = 12;
  const top = 40;
  return (
    <g fontFamily="var(--font-mono)">
      <text x={x} y={top - 14} fontSize="10.5" fontWeight={700} fill="var(--tx3)" letterSpacing="0.04em">
        {dir === "up" ? "receiver ↑" : "sender ↓"}
      </text>
      {STACK.map((l, i) => {
        const y = top + i * (boxH + gap);
        const tone = LAYER_TONE[l.id];
        const active = l.id === activeId;
        return (
          <g key={l.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={boxH}
              rx={7}
              fill={active ? `color-mix(in srgb, ${tone} 18%, var(--surface))` : "var(--surface)"}
              stroke={active ? tone : "var(--line)"}
              strokeWidth={active ? 2.5 : 1.5}
            />
            <text x={x + 12} y={y + 22} fontSize="12" fontWeight={700} fill={active ? "var(--tx)" : "var(--tx2)"}>
              {l.name}
            </text>
            <text x={x + 12} y={y + 39} fontSize="10" fill={tone} fontWeight={600}>
              {l.header}
            </text>
            <text x={x + 12} y={y + 54} fontSize="9" fill="var(--tx3)">
              {l.pdu}
            </text>
          </g>
        );
      })}
      {/* direction rail */}
      {dir && (
        <g>
          <line
            x1={x + w + 14}
            y1={top}
            x2={x + w + 14}
            y2={top + STACK.length * (boxH + gap) - gap}
            stroke="var(--line)"
            strokeWidth={2}
          />
          <text
            x={x + w + 22}
            y={dir === "down" ? top + 12 : top + STACK.length * (boxH + gap) - gap - 4}
            fontSize="14"
            fill="var(--tx3)"
          >
            {dir === "down" ? "↓" : "↑"}
          </text>
        </g>
      )}
    </g>
  );
}

function caption(strong: string, rest: string): { caption: string } {
  return { caption: `${strong} ${rest}` };
}

const FRAMES: Frame[] = [
  // ---- DOWN the sender's stack: encapsulation ----
  {
    ...caption(
      "Start at the top.",
      `The ${APP.name} layer has the actual ${APP.pdu} — an ${APP.header} request. No headers yet: this is just what you mean. ${APP.blurb}.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={APP.id} dir="down" />
        <Envelope wraps={[]} />
      </g>
    ),
  },
  {
    ...caption(
      "Transport wraps it.",
      `The ${TRANSPORT.name} layer prepends a ${TRANSPORT.header} header — port numbers + reliability. The ${APP.pdu} is now a ${TRANSPORT.pdu}: ${TRANSPORT.blurb}.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={TRANSPORT.id} dir="down" />
        <Envelope
          wraps={[{ layer: TRANSPORT, kind: "add" }]}
          flashHeader={TRANSPORT.header}
          flashKind="add"
        />
      </g>
    ),
  },
  {
    ...caption(
      "Internet wraps that.",
      `The ${INTERNET.name} layer adds an ${INTERNET.header} header with source & destination addresses. The ${TRANSPORT.pdu} becomes a ${INTERNET.pdu}: ${INTERNET.blurb}.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={INTERNET.id} dir="down" />
        <Envelope
          wraps={[
            { layer: INTERNET, kind: "add" },
            { layer: TRANSPORT, kind: "static" },
          ]}
          flashHeader={INTERNET.header}
          flashKind="add"
        />
      </g>
    ),
  },
  {
    ...caption(
      "Link seals the outside.",
      `The ${LINK.name} layer wraps everything in an ${LINK.header} header for the next hop. Now a ${LINK.pdu}, it hits the wire — outermost header first. Full stack: ${LINK.header} · ${INTERNET.header} · ${TRANSPORT.header} · ${APP.header}.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={LINK.id} dir="down" />
        <Envelope
          wraps={[
            { layer: LINK, kind: "add" },
            { layer: INTERNET, kind: "static" },
            { layer: TRANSPORT, kind: "static" },
          ]}
          flashHeader={LINK.header}
          flashKind="add"
        />
      </g>
    ),
  },
  // ---- UP the receiver's stack: decapsulation (strip in reverse) ----
  {
    ...caption(
      "It arrives as a frame.",
      `The receiver pulls the full ${LINK.pdu} off the wire — every header still nested, ${LINK.header} on the outside. Decapsulation now runs the wrapping in reverse: link first.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={LINK.id} dir="up" />
        <Envelope
          wraps={[
            { layer: LINK, kind: "static" },
            { layer: INTERNET, kind: "static" },
            { layer: TRANSPORT, kind: "static" },
          ]}
        />
      </g>
    ),
  },
  {
    ...caption(
      "Strip the Ethernet header.",
      `The ${LINK.name} layer checks the ${LINK.header} frame was for this NIC, then removes it. What remains is an ${INTERNET.header} ${INTERNET.pdu}, handed up to the internet layer.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={LINK.id} dir="up" />
        <Envelope
          wraps={[
            { layer: LINK, kind: "strip" },
            { layer: INTERNET, kind: "static" },
            { layer: TRANSPORT, kind: "static" },
          ]}
          flashHeader={LINK.header}
          flashKind="strip"
        />
      </g>
    ),
  },
  {
    ...caption(
      "Strip IP, then TCP.",
      `The ${INTERNET.name} layer confirms the ${INTERNET.header} address is ours and peels it; the ${TRANSPORT.name} layer reads the ${TRANSPORT.header} ports, reassembles, and peels that too. Down to the bare ${APP.pdu}.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={TRANSPORT.id} dir="up" />
        <Envelope
          wraps={[{ layer: TRANSPORT, kind: "strip" }]}
          flashHeader={TRANSPORT.header}
          flashKind="strip"
        />
      </g>
    ),
  },
  {
    ...caption(
      "Delivered — unchanged.",
      `Every header has been stripped in the reverse of the order it was added. The ${APP.name} layer receives the exact same ${APP.header} ${APP.pdu} the sender started with. That round-trip is lossless by construction.`,
    ),
    render: () => (
      <g>
        <StackColumn activeId={APP.id} dir="up" />
        <Envelope wraps={[]} />
        <text x={CX} y={CY + CORE_H / 2 + 34} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--sem-ok)" fontFamily="var(--font-mono)">
          ✓ same bytes, delivered
        </text>
      </g>
    ),
  },
];

export default function LayerCake() {
  return (
    <FigureStepper
      title="Encapsulation — down the sender's stack, up the receiver's"
      figKey="layer-cake"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accent={ACCENT}
      frames={FRAMES}
    />
  );
}
