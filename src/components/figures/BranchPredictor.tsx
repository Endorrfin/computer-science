// [fig] branch-predictor — the 2-bit saturating counter, stepped over a loop
// that runs a few times then exits. Four states; predict "taken" in the right
// half. The lesson: a single not-taken (the loop exit) only nudges the counter
// from strong→weak taken, so it still predicts taken next time — one anomaly
// costs one misprediction, not two. Semantic palette (§7): taken/control =
// orange, the other direction = violet, correct = green, wrong = red.
// Engine: fast-cpu/branch.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import { BIT2_LABELS, run2bit } from "../sims/fast-cpu/branch.ts";
import type { Bit2State } from "../sims/fast-cpu/branch.ts";

const SEQ: boolean[] = [true, true, true, false, true, true, true]; // loop ×, then exit, then loop again
const INIT: Bit2State = 3; // warm: strong-taken (the loop has been running)
const RUN = run2bit(SEQ, INIT);
const X = [90, 220, 350, 480];
const Y = 120;
const R = 30;

function stateNode(idx: number, current: boolean) {
  const taken = idx >= 2;
  const fill = current ? "color-mix(in srgb, var(--sem-ok) 26%, var(--surface))" : "var(--s2)";
  const stroke = current ? "var(--sem-ok)" : taken ? "var(--sem-control)" : "var(--sem-state)";
  return (
    <g key={idx}>
      <circle cx={X[idx]} cy={Y} r={R} fill={fill} stroke={stroke} strokeWidth={current ? 3.5 : 2} />
      <text x={X[idx]} y={Y - 3} textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--tx)">
        {(idx >> 1) & 1}
        {idx & 1}
      </text>
      <text x={X[idx]} y={Y + 12} textAnchor="middle" fontSize="8.5" fill="var(--tx2)">
        {idx === 0 ? "str ¬T" : idx === 1 ? "wk ¬T" : idx === 2 ? "wk T" : "str T"}
      </text>
    </g>
  );
}

function Scene({ step }: { step: number }) {
  // step 0 = initial; step k (1..len) = after processing SEQ[k-1]
  const current = step === 0 ? INIT : RUN.steps[step - 1].after;
  const s = step > 0 ? RUN.steps[step - 1] : null;

  return (
    <g fontFamily="var(--font-body)">
      <defs>
        <marker id="bpT" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-control)" />
        </marker>
        <marker id="bpN" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--sem-state)" />
        </marker>
      </defs>

      {/* predict regions */}
      <line x1="285" y1="55" x2="285" y2="185" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="4 4" />
      <text x="187" y="48" textAnchor="middle" fontSize="10.5" fill="var(--sem-state)" fontWeight="700">
        predict ¬taken
      </text>
      <text x="415" y="48" textAnchor="middle" fontSize="10.5" fill="var(--sem-control)" fontWeight="700">
        predict taken
      </text>

      {/* T transitions (above, →) */}
      <g stroke="var(--sem-control)" strokeWidth="2" fill="none">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${X[i] + R} ${Y - 12} Q ${(X[i] + X[i + 1]) / 2} ${Y - 46} ${X[i + 1] - R} ${Y - 12}`} markerEnd="url(#bpT)" />
        ))}
        <path d={`M ${X[3] + 10} ${Y - R} Q ${X[3] + 52} ${Y - 52} ${X[3] + 26} ${Y - R + 4}`} markerEnd="url(#bpT)" />
      </g>
      {/* N transitions (below, ←) */}
      <g stroke="var(--sem-state)" strokeWidth="2" fill="none">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M ${X[i + 1] - R} ${Y + 12} Q ${(X[i] + X[i + 1]) / 2} ${Y + 46} ${X[i] + R} ${Y + 12}`} markerEnd="url(#bpN)" />
        ))}
        <path d={`M ${X[0] - 10} ${Y + R} Q ${X[0] - 52} ${Y + 52} ${X[0] - 26} ${Y + R - 4}`} markerEnd="url(#bpN)" />
      </g>
      <text x={X[3] + 40} y={Y - 54} fontSize="10" fill="var(--sem-control)">T</text>
      <text x={X[0] - 46} y={Y + 60} fontSize="10" fill="var(--sem-state)">¬T</text>

      {[0, 1, 2, 3].map((i) => stateNode(i, i === current))}

      {/* outcome tape */}
      <text x="40" y="228" fontSize="10" fill="var(--tx2)">
        outcomes:
      </text>
      {SEQ.map((o, i) => {
        const done = step > i;
        const st = RUN.steps[i];
        const cellFill = done ? (st.correct ? "color-mix(in srgb, var(--sem-ok) 22%, var(--surface))" : "color-mix(in srgb, var(--sem-err) 22%, var(--surface))") : "var(--s2)";
        const cellStroke = step - 1 === i ? "var(--tx)" : done ? (st.correct ? "var(--sem-ok)" : "var(--sem-err)") : "var(--line)";
        return (
          <g key={i}>
            <rect x={40 + i * 66} y={240} width="56" height="30" rx="6" fill={cellFill} stroke={cellStroke} strokeWidth={step - 1 === i ? 2.5 : 1.5} />
            <text x={40 + i * 66 + 28} y={259} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)" fill={o ? "var(--sem-control)" : "var(--sem-state)"}>
              {o ? "T" : "¬T"}
            </text>
            {done && (
              <text x={40 + i * 66 + 28} y={285} textAnchor="middle" fontSize="10" fill={st.correct ? "var(--sem-ok)" : "var(--sem-err)"}>
                {st.correct ? "✓" : "✗"}
              </text>
            )}
          </g>
        );
      })}

      {/* readout */}
      <text x="40" y="308" fontSize="11" fill="var(--tx)">
        {s
          ? `outcome ${s.actual ? "taken" : "not taken"} · predicted ${s.prediction ? "taken" : "not taken"} · ${s.correct ? "✓ correct" : "✗ mispredict"} · counter ${(s.before >> 1) & 1}${s.before & 1} → ${(s.after >> 1) & 1}${s.after & 1}`
          : `start in ${BIT2_LABELS[INIT]} — the loop has been taken for a while. Step through the outcomes.`}
      </text>
    </g>
  );
}

const FRAMES: Frame[] = [
  { caption: "Four states, one counter. In the right half (weak/strong taken) the predictor guesses TAKEN; in the left half it guesses not-taken. Each taken outcome pushes right, each not-taken pushes left — saturating at the ends.", render: () => <Scene step={0} /> },
  { caption: "Taken, as predicted (strong-taken → stays strong-taken). ✓ A loop that keeps looping is trivially predicted right every time.", render: () => <Scene step={1} /> },
  { caption: "Taken again — still pinned at strong-taken. The counter can't go any further right; that saturation is the whole point.", render: () => <Scene step={2} /> },
  { caption: "Taken a third time. Confidence stays maxed. So far every prediction is correct.", render: () => <Scene step={3} /> },
  { caption: "The loop exits: not-taken. The predictor guessed taken, so this is the one misprediction ✗ — but the counter only drops strong→weak taken, so it will STILL predict taken next time.", render: () => <Scene step={4} /> },
  { caption: "Taken again (loop restarts). Because the counter merely weakened rather than flipping, the prediction is taken — correct ✓. A 1-bit predictor would have flipped and missed here too; the second bit bought that save.", render: () => <Scene step={5} /> },
  { caption: "Taken — the counter climbs back to strong-taken. The single anomaly cost exactly one misprediction, not two.", render: () => <Scene step={6} /> },
  { caption: `Taken — fully recovered at strong-taken. Total for this run: ${RUN.mispredicts} misprediction out of ${SEQ.length}. That resilience to the odd anomaly is why real CPUs use 2-bit counters (and cleverer variants) to keep the pipeline's speculative fetch on the right path.`, render: () => <Scene step={7} /> },
];

export default function BranchPredictor() {
  return <FigureStepper title="2-bit branch predictor: history in a saturating counter" figKey="branch-predictor" viewBox="0 0 560 320" accent="#FB923C" frames={FRAMES} />;
}
