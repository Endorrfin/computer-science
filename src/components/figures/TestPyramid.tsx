// [fig] test-pyramid — ch.12. The testing pyramid: a wide base of fast, cheap,
// isolated UNIT tests; fewer INTEGRATION tests that wire real pieces together;
// a thin cap of slow, brittle END-TO-END tests through the whole system. Shape =
// advice: push tests down. Palette (§7): fast/cheap base = green, integration =
// cyan, slow/flaky cap = orange.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

const BANDS = [
  { id: 0, name: "Unit", poly: "182,150 378,150 440,220 120,220", cx: 280, cy: 192, tone: "var(--sem-ok)", sub: "many · milliseconds · isolated" },
  { id: 1, name: "Integration", poly: "227,100 333,100 378,150 182,150", cx: 280, cy: 128, tone: "var(--sem-data)", sub: "some · seconds · real deps" },
  { id: 2, name: "End-to-end", poly: "280,40 227,100 333,100", cx: 280, cy: 84, tone: "var(--sem-control)", sub: "few · minutes · whole system" },
];

function Scene({ active }: { active: number }) {
  return (
    <g fontFamily="var(--font-body)">
      {BANDS.map((b) => {
        const on = active === -1 || active === b.id;
        return (
          <g key={b.id} opacity={on ? 1 : 0.4}>
            <polygon points={b.poly} fill={active === b.id ? `color-mix(in srgb, ${b.tone} 26%, var(--surface))` : "var(--s2)"} stroke={b.tone} strokeWidth={active === b.id ? 3 : 1.5} />
            <text x={b.cx} y={b.cy} textAnchor="middle" fontSize={b.id === 2 ? "12" : "14"} fontWeight="700" fill="var(--tx)">{b.name}</text>
            {b.id !== 2 && <text x={b.cx} y={b.cy + 17} textAnchor="middle" fontSize="10.5" fill="var(--tx2)">{b.sub}</text>}
          </g>
        );
      })}

      {/* axes */}
      <g fontSize="10.5">
        <line x1="70" y1="60" x2="70" y2="220" stroke="var(--line)" markerEnd="url(#tpUp)" markerStart="url(#tpUp2)" />
        <text x="60" y="52" textAnchor="middle" fill="var(--sem-control)" fontSize="10">slower · costlier</text>
        <text x="60" y="236" textAnchor="middle" fill="var(--sem-ok)" fontSize="10">faster · cheaper</text>
        <text x="500" y="120" textAnchor="middle" fill="var(--tx2)" fontSize="10">fewer</text>
        <text x="500" y="210" textAnchor="middle" fill="var(--tx2)" fontSize="10">many more</text>
      </g>
      <defs>
        <marker id="tpUp" markerWidth="9" markerHeight="9" refX="3" refY="6" orient="auto"><path d="M0,6 L3,0 L6,6 Z" fill="var(--sem-control)" /></marker>
        <marker id="tpUp2" markerWidth="9" markerHeight="9" refX="3" refY="0" orient="auto"><path d="M0,0 L3,6 L6,0 Z" fill="var(--sem-ok)" /></marker>
      </defs>
    </g>
  );
}

const FRAMES: Frame[] = [
  { caption: "The testing pyramid balances confidence against cost. Height = how slow, expensive and realistic a test is; width = how many of them you should have. The advice is baked into the shape: most of your tests belong at the bottom.", render: () => <Scene active={-1} /> },
  { caption: "Unit tests: check one function/module in isolation, no network or database. Milliseconds each, so you can have thousands and run them on every save. A failure points at exactly one place. This wide base is where most bugs should be caught.", render: () => <Scene active={0} /> },
  { caption: "Integration tests: wire real pieces together — code + a real database, or two services. Slower (seconds) and fewer, but they catch the bugs unit tests can't: wrong SQL, bad serialization, mismatched contracts between modules (ch.12's whole theme).", render: () => <Scene active={1} /> },
  { caption: "End-to-end tests: drive the whole system like a user, through the UI. Highest confidence, but slow (minutes), expensive, and flaky — a timing hiccup fails them without a real bug. Keep only a few for critical paths. Invert the pyramid (mostly E2E) and your suite becomes slow and untrustworthy — the classic 'ice-cream cone' anti-pattern.", render: () => <Scene active={2} /> },
];

export default function TestPyramid() {
  return <FigureStepper title="test-pyramid: many fast unit tests, few slow end-to-end" figKey="test-pyramid" viewBox="0 0 560 250" accent="#A3E635" frames={FRAMES} />;
}
