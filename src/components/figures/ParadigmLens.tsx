// [fig] paradigm-lens — ch.10. The SAME tiny problem (sum a list) rendered in
// three paradigms, so you feel the *shape* each one imposes: imperative =
// steps that mutate state; OOP = objects bundling data + behavior; functional =
// pure functions data flows through. Palette (§7): control/steps = orange,
// state/objects = violet, data/flow = cyan.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

function Code({ x, y, lines, color }: { x: number; y: number; lines: string[]; color: string }) {
  return (
    <g fontFamily="var(--font-mono)" fontSize="13">
      <rect x={x} y={y} width="270" height={22 + lines.length * 20} rx="8" fill="var(--s2)" stroke="var(--line)" />
      {lines.map((ln, i) => (
        <text key={i} x={x + 14} y={y + 26 + i * 20} fill={ln.trim().startsWith("//") ? "var(--tx2)" : "var(--tx)"}>
          {ln}
        </text>
      ))}
      <rect x={x} y={y} width="4" height={22 + lines.length * 20} rx="2" fill={color} />
    </g>
  );
}

function Problem() {
  return (
    <g fontFamily="var(--font-body)">
      <text x="280" y="70" textAnchor="middle" fontSize="15" fill="var(--tx2)">One problem, three shapes</text>
      <text x="280" y="120" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--tx)" fontFamily="var(--font-mono)">
        sum [2, 4, 6, 8] → 20
      </text>
      <text x="280" y="170" textAnchor="middle" fontSize="13" fill="var(--tx2)">
        A paradigm isn't the language — it's how you decompose a problem.
      </text>
      <text x="280" y="192" textAnchor="middle" fontSize="13" fill="var(--tx2)">
        The next three frames solve this same task three ways.
      </text>
    </g>
  );
}

function Imperative() {
  return (
    <g fontFamily="var(--font-body)">
      <text x="30" y="34" fontSize="15" fontWeight="700" fill="var(--sem-control)">Imperative</text>
      <text x="30" y="54" fontSize="12" fill="var(--tx2)">step-by-step instructions that change state</text>
      <Code x={30} y={72} color="var(--sem-control)" lines={["let total = 0;", "for (const x of xs) {", "  total = total + x;", "}"]} />
      {/* mutable box changing */}
      <g fontFamily="var(--font-mono)" fontSize="12">
        <text x="340" y="92" fill="var(--tx2)" fontFamily="var(--font-body)">total mutates over time:</text>
        {["0", "2", "6", "12", "20"].map((v, i) => (
          <g key={i}>
            <rect x={340 + i * 40} y={104} width="30" height="26" rx="5" fill="color-mix(in srgb, var(--sem-control) 16%, var(--surface))" stroke="var(--sem-control)" />
            <text x={355 + i * 40} y={122} textAnchor="middle" fill="var(--tx)">{v}</text>
          </g>
        ))}
        <text x="340" y="170" fontSize="12" fill="var(--tx2)" fontFamily="var(--font-body)">mental model: a recipe of steps</text>
      </g>
    </g>
  );
}

function Oop() {
  return (
    <g fontFamily="var(--font-body)">
      <text x="30" y="34" fontSize="15" fontWeight="700" fill="var(--sem-state)">Object-oriented</text>
      <text x="30" y="54" fontSize="12" fill="var(--tx2)">bundle data with the methods that act on it</text>
      <Code x={30} y={72} color="var(--sem-state)" lines={["class Adder {", "  total = 0;", "  add(x) {", "    this.total += x;", "  }", "}"]} />
      {/* object capsule */}
      <g>
        <rect x="345" y="86" width="185" height="96" rx="12" fill="color-mix(in srgb, var(--sem-state) 12%, var(--surface))" stroke="var(--sem-state)" strokeWidth="2" />
        <text x="437" y="108" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--tx)" fontFamily="var(--font-mono)">Adder</text>
        <line x1="360" y1="118" x2="515" y2="118" stroke="var(--line)" />
        <text x="360" y="138" fontSize="11.5" fill="var(--sem-data)" fontFamily="var(--font-mono)">data: total</text>
        <text x="360" y="162" fontSize="11.5" fill="var(--sem-control)" fontFamily="var(--font-mono)">method: add()</text>
      </g>
      <text x="345" y="204" fontSize="12" fill="var(--tx2)">mental model: interacting objects</text>
    </g>
  );
}

function Functional() {
  return (
    <g fontFamily="var(--font-body)">
      <text x="30" y="34" fontSize="15" fontWeight="700" fill="var(--sem-data)">Functional</text>
      <text x="30" y="54" fontSize="12" fill="var(--tx2)">compose pure functions; nothing mutates</text>
      <Code x={30} y={82} color="var(--sem-data)" lines={["xs.reduce(", "  (t, x) => t + x,", "  0,", ")"]} />
      {/* data flow pipeline */}
      <g fontFamily="var(--font-mono)" fontSize="12">
        <rect x="340" y="96" width="60" height="28" rx="6" fill="var(--s2)" stroke="var(--line)" />
        <text x="370" y="115" textAnchor="middle" fill="var(--tx)">[2,4,6,8]</text>
        <line x1="400" y1="110" x2="432" y2="110" stroke="var(--sem-data)" strokeWidth="2" markerEnd="url(#plArrow)" />
        <rect x="434" y="96" width="66" height="28" rx="6" fill="color-mix(in srgb, var(--sem-data) 16%, var(--surface))" stroke="var(--sem-data)" />
        <text x="467" y="115" textAnchor="middle" fill="var(--tx)">reduce +</text>
        <line x1="500" y1="110" x2="524" y2="110" stroke="var(--sem-data)" strokeWidth="2" markerEnd="url(#plArrow)" />
        <text x="524" y="115" fill="var(--tx)">20</text>
        <text x="340" y="168" fontSize="12" fill="var(--tx2)" fontFamily="var(--font-body)">mental model: data flowing through functions</text>
      </g>
      <defs>
        <marker id="plArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-data)" />
        </marker>
      </defs>
    </g>
  );
}

const FRAMES: Frame[] = [
  { caption: "The same task — total a list — solved three ways. A paradigm is a lens: it decides what you name, what you hide, and where state lives.", render: () => <Problem /> },
  { caption: "Imperative: a sequence of statements that mutate a running variable. You spell out how, step by step. This is what the CPU (ch.7) does natively — and what our mini-language (ch.11) compiles to.", render: () => <Imperative /> },
  { caption: "Object-oriented: bundle the state (total) with the behavior (add) into an object. You think in interacting things that own their data and expose methods.", render: () => <Oop /> },
  { caption: "Functional: express the result as a composition of pure functions with no mutation — reduce folds the list into one value. Same answer, a very different shape of thought. Most real languages let you mix all three.", render: () => <Functional /> },
];

export default function ParadigmLens() {
  return <FigureStepper title="paradigm-lens: one problem, three shapes of thought" figKey="paradigm-lens" viewBox="0 0 560 240" accent="#A3E635" frames={FRAMES} />;
}
