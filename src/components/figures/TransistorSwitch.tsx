// [fig] transistor-switch — the chapter's physics→logic border crossing:
// gate voltage → field → channel → current → "it's a switch".
// Semantic palette (§7): control voltage = orange, moving charge = cyan.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

type Scene = {
  labels?: boolean;
  gateOn?: boolean;
  fieldArrows?: boolean;
  electrons?: boolean;
  channel?: boolean;
  current?: boolean;
  lampOn?: boolean;
};

function Mosfet({ labels, gateOn, fieldArrows, electrons, channel, current, lampOn }: Scene) {
  return (
    <g fontFamily="var(--font-mono)" fontSize="12">
      {/* external circuit: battery → source … drain → lamp → back */}
      <path d="M115 195 H70 V60 H470 V195 H445" fill="none" stroke="var(--tx3)" strokeWidth="2" />
      {/* battery */}
      <line x1="70" y1="118" x2="70" y2="142" stroke="var(--bg)" strokeWidth="10" />
      <line x1="58" y1="122" x2="82" y2="122" stroke="var(--tx2)" strokeWidth="3" />
      <line x1="64" y1="138" x2="76" y2="138" stroke="var(--tx2)" strokeWidth="5" />
      {/* lamp in the drain branch */}
      <circle cx="470" cy="126" r="14" fill={lampOn ? "#FACC15" : "var(--s2)"} stroke={lampOn ? "#FACC15" : "var(--tx3)"} strokeWidth="2" className={lampOn ? "glow-lamp" : undefined} />
      {lampOn && <circle cx="470" cy="126" r="22" fill="#FACC15" opacity="0.15" />}

      {/* silicon body */}
      <rect x="90" y="195" width="380" height="70" rx="6" fill="var(--s2)" stroke="var(--line)" />
      <text x="280" y="252" textAnchor="middle" fill="var(--tx3)">silicon</text>
      {/* source / drain wells */}
      <rect x="105" y="195" width="80" height="28" rx="5" fill="var(--surface)" stroke="var(--tx2)" />
      <rect x="375" y="195" width="80" height="28" rx="5" fill="var(--surface)" stroke="var(--tx2)" />
      <text x="145" y="214" textAnchor="middle" fill="var(--tx)">source</text>
      <text x="415" y="214" textAnchor="middle" fill="var(--tx)">drain</text>

      {/* insulator + gate electrode */}
      <rect x="200" y="186" width="160" height="8" fill="var(--line)" />
      <rect x="210" y="152" width="140" height="30" rx="5" fill={gateOn ? "var(--sem-control)" : "var(--surface)"} stroke={gateOn ? "var(--sem-control)" : "var(--tx2)"} />
      <text x="280" y="172" textAnchor="middle" fill={gateOn ? "#1a1206" : "var(--tx)"} fontWeight="700">
        gate {gateOn ? "= +V" : "= 0 V"}
      </text>
      <text x="280" y="145" textAnchor="middle" fill="var(--tx3)" fontSize="10">insulated — no contact with the channel</text>

      {/* the gap / channel region */}
      {channel ? (
        <rect x="185" y="196" width="190" height="12" rx="6" fill="var(--sem-data)" opacity="0.85" />
      ) : (
        <line x1="190" y1="202" x2="372" y2="202" stroke="var(--tx3)" strokeWidth="2" strokeDasharray="4 7" />
      )}

      {/* field arrows from gate down into silicon */}
      {fieldArrows &&
        [235, 265, 295, 325].map((x) => (
          <g key={x} stroke="var(--sem-control)" strokeWidth="2">
            <line x1={x} y1="196" x2={x} y2="214" />
            <path d={`M ${x - 4} 210 L ${x} 218 L ${x + 4} 210`} fill="none" />
          </g>
        ))}

      {/* electrons gathering */}
      {electrons &&
        [215, 240, 262, 285, 308, 330, 352].map((x, i) => (
          <circle key={x} cx={x} cy={channel ? 202 : 222 - (i % 3) * 6} r="3.5" fill="var(--sem-data)" />
        ))}

      {/* current flow arrows through channel + circuit */}
      {current && (
        <g fill="var(--sem-data)">
          {[205, 255, 305, 355].map((x) => (
            <path key={x} d={`M ${x} 197 l 12 5 l -12 5 z`} opacity="0.95" />
          ))}
        </g>
      )}

      {labels && (
        <g fill="var(--tx2)" fontSize="11">
          <text x="145" y="188">current in ↘</text>
          <text x="352" y="188">↗ current out</text>
          <text x="480" y="160">lamp = the</text>
          <text x="480" y="174">output we</text>
          <text x="480" y="188">care about</text>
        </g>
      )}
    </g>
  );
}

function SymbolView() {
  return (
    <g fontFamily="var(--font-mono)" fontSize="12">
      {/* MOSFET schematic symbol */}
      <g stroke="var(--tx)" strokeWidth="2" fill="none">
        <line x1="80" y1="90" x2="80" y2="170" />
        <line x1="92" y1="95" x2="92" y2="165" />
        <line x1="92" y1="105" x2="130" y2="105" />
        <line x1="92" y1="155" x2="130" y2="155" />
        <line x1="130" y1="105" x2="130" y2="75" />
        <line x1="130" y1="155" x2="130" y2="185" />
        <line x1="45" y1="130" x2="80" y2="130" stroke="var(--sem-control)" />
      </g>
      <text x="20" y="134" fill="var(--sem-control)">G</text>
      <text x="136" y="80" fill="var(--tx2)">D</text>
      <text x="136" y="192" fill="var(--tx2)">S</text>
      <text x="45" y="225" fill="var(--tx)">= a switch controlled</text>
      <text x="45" y="241" fill="var(--tx)">by a voltage</text>

      {/* series = AND */}
      <g transform="translate(255 70)" stroke="var(--tx2)" strokeWidth="2" fill="none">
        <line x1="0" y1="30" x2="24" y2="30" />
        <rect x="24" y="18" width="34" height="24" rx="5" fill="var(--s2)" />
        <line x1="58" y1="30" x2="82" y2="30" />
        <rect x="82" y="18" width="34" height="24" rx="5" fill="var(--s2)" />
        <line x1="116" y1="30" x2="140" y2="30" />
      </g>
      <text x="255" y="60" fill="var(--tx)">in series → both must be ON</text>
      <text x="400" y="105" fill="var(--sem-ok)" fontWeight="700">= AND</text>

      {/* parallel = OR */}
      <g transform="translate(255 150)" stroke="var(--tx2)" strokeWidth="2" fill="none">
        <line x1="0" y1="40" x2="20" y2="40" />
        <line x1="20" y1="40" x2="20" y2="14" />
        <line x1="20" y1="40" x2="20" y2="66" />
        <rect x="20" y="2" width="34" height="24" rx="5" fill="var(--s2)" />
        <rect x="20" y="54" width="34" height="24" rx="5" fill="var(--s2)" />
        <line x1="54" y1="14" x2="76" y2="14" />
        <line x1="54" y1="66" x2="76" y2="66" />
        <line x1="76" y1="14" x2="76" y2="66" />
        <line x1="76" y1="40" x2="96" y2="40" />
      </g>
      <text x="255" y="145" fill="var(--tx)">in parallel → either is enough</text>
      <text x="365" y="195" fill="var(--sem-ok)" fontWeight="700">= OR</text>
    </g>
  );
}

const FRAMES: Frame[] = [
  {
    caption:
      "Three terminals. Current would flow source → drain and light the lamp — if the gap between them conducted. The gate hovers above that gap, fully insulated: it will never touch the current itself.",
    render: () => <Mosfet labels />,
  },
  {
    caption:
      "Gate at 0 V: the gap stays empty of charge carriers (dashed = no channel). The path is broken — switch OPEN, lamp dark.",
    render: () => <Mosfet />,
  },
  {
    caption:
      "Put a small voltage on the gate. Its electric field reaches through the insulator and attracts electrons toward the surface — charge gathers under the gate.",
    render: () => <Mosfet gateOn fieldArrows electrons />,
  },
  {
    caption:
      "Enough electrons: they merge into a conductive channel bridging source → drain. Current flows, the lamp lights. Switch CLOSED — flipped by a voltage, not a finger.",
    render: () => <Mosfet gateOn electrons channel current lampOn />,
  },
  {
    caption:
      "Zoom out and keep only the behavior: a voltage-controlled switch. Wire two in series and both must be ON — that's AND. In parallel, either suffices — OR. You already see the next section coming.",
    render: () => <SymbolView />,
  },
];

export default function TransistorSwitch() {
  return (
    <FigureStepper
      title="The transistor: a switch flipped by a voltage"
      figKey="transistor-switch"
      viewBox="0 0 560 300"
      accent="#FB923C"
      frames={FRAMES}
    />
  );
}
