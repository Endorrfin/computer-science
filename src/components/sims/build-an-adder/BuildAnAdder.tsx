// [micro] build-an-adder — guided lab: half-adder → full-adder → chain four
// of them into a 4-bit ripple-carry adder, and watch the carry travel LSB→MSB
// one gate-delay at a time. Try 1111 + 0001 to see the carry sweep the whole
// width. Engine: machine/arith.ts (same functions the tests assert).
import { useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { useSimClock } from "../../../lib/simClock.ts";
import { fullAdder, halfAdder, rippleAdd } from "../machine/arith.ts";

const ACCENT = "#FB923C";
const WIDTH = 4;

type Stage = "half" | "full" | "ripple";
const STAGES: { id: Stage; label: string }[] = [
  { id: "half", label: "① half adder" },
  { id: "full", label: "② full adder" },
  { id: "ripple", label: "③ 4-bit ripple" },
];

const bit = (v: number) => (v ? "1" : "0");

export default function BuildAnAdder() {
  const [stage, setStage] = useState<Stage>("half");
  // 1-bit playground (half + full stages)
  const [a1, setA1] = useState(1);
  const [b1, setB1] = useState(1);
  const [cin, setCin] = useState(0);
  // 4-bit playground (ripple stage)
  const [a4, setA4] = useState(0b0111);
  const [b4, setB4] = useState(0b0001);
  const [carryIn, setCarryIn] = useState(0);
  const [step, setStep] = useState(WIDTH); // how many bit positions have resolved
  const [running, setRunning] = useState(false);

  const ripple = rippleAdd(a4, b4, WIDTH, carryIn);

  useSimClock(running && stage === "ripple", 2.2, () => {
    setStep((s) => {
      if (s >= WIDTH) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  });

  function resetRipple(next?: { a?: number; b?: number; c?: number }) {
    if (next?.a !== undefined) setA4(next.a);
    if (next?.b !== undefined) setB4(next.b);
    if (next?.c !== undefined) setCarryIn(next.c);
    setStep(0);
    setRunning(false);
  }

  function onReset() {
    if (stage === "ripple") resetRipple({ a: 0b0111, b: 0b0001, c: 0 });
    else {
      setA1(1);
      setB1(1);
      setCin(0);
    }
  }

  const stageSelector = (
    <div className="bit-seg" role="tablist" aria-label="Adder stage">
      {STAGES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={stage === s.id}
          className={cx("bit-segbtn", stage === s.id && "on")}
          onClick={() => setStage(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  // ---- stage bodies ----
  if (stage !== "ripple") {
    const h1 = halfAdder(a1, b1);
    const isFull = stage === "full";
    const res = isFull ? fullAdder(a1, b1, cin) : { sum: h1.sum, cout: h1.carry };
    const status = isFull
      ? `full adder: ${a1}+${b1}+${cin} = ${2 * res.cout + res.sum} → sum ${res.sum}, carry-out ${res.cout}. Two half-adders feed an OR on their carries.`
      : `half adder: ${a1}+${b1} = ${2 * res.cout + res.sum} → sum ${res.sum} (A XOR B), carry ${res.cout} (A AND B).`;

    return (
      <SimShell title="Build an adder" simKey="build-an-adder" accent={ACCENT} onReset={onReset} status={status} controls={stageSelector}>
        <div className="adder-onebit">
          <div className="adder-inputs">
            <BitToggle label="A" value={a1} onClick={() => setA1(a1 ^ 1)} />
            <BitToggle label="B" value={b1} onClick={() => setB1(b1 ^ 1)} />
            {isFull && <BitToggle label="Cin" value={cin} onClick={() => setCin(cin ^ 1)} tone="control" />}
          </div>

          <div className="adder-gates" aria-hidden="true">
            <div className={cx("adder-gate", res.sum !== 0 && "hot")}>
              <span className="adder-gate-op">XOR{isFull ? " ∘ XOR" : ""}</span>
              <span className="adder-gate-out">sum</span>
            </div>
            <div className={cx("adder-gate", res.cout !== 0 && "hot-carry")}>
              <span className="adder-gate-op">AND{isFull ? " + OR" : ""}</span>
              <span className="adder-gate-out">carry</span>
            </div>
          </div>

          <div className="adder-outputs">
            <BitReadout label="carry-out" value={res.cout} tone="control" />
            <BitReadout label="sum" value={res.sum} tone="data" />
          </div>
        </div>

        <table className="datatable adder-tt">
          <thead>
            <tr>
              <th>A</th>
              <th>B</th>
              {isFull && <th>Cin</th>}
              <th>carry</th>
              <th>sum</th>
            </tr>
          </thead>
          <tbody>
            {(isFull ? FULL_ROWS : HALF_ROWS).map((r, i) => {
              const active = isFull ? r[0] === a1 && r[1] === b1 && r[2] === cin : r[0] === a1 && r[1] === b1;
              return (
                <tr key={i} className={cx(active && "adder-row-on")}>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                  {isFull && <td>{r[2]}</td>}
                  <td>{isFull ? fullAdder(r[0], r[1], r[2]).cout : halfAdder(r[0], r[1]).carry}</td>
                  <td>{isFull ? fullAdder(r[0], r[1], r[2]).sum : halfAdder(r[0], r[1]).sum}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="lsb-canvas-hint muted">
          {isFull
            ? "A full adder = two half-adders + one OR. Its carry-in is what lets you chain them — go to stage ③."
            : "Sum is A XOR B; carry is A AND B. But it can't accept a carry from a lower bit — so it can't be chained. That's why we need the full adder."}
        </p>
      </SimShell>
    );
  }

  // ---- ripple stage ----
  const carryInto = ripple.carries[step] ?? ripple.cout;
  const done = step >= WIDTH;
  const value = ripple.value;
  const overflow = ripple.cout === 1;
  const status = done
    ? `${a4} + ${b4}${carryIn ? " + 1" : ""} = ${value}${overflow ? ` with carry-out 1 (result ${value + 16} needs a 5th bit — 4-bit overflow)` : ""}.`
    : `carry rippling… bit ${step} of ${WIDTH}. Carry into position ${step} is ${carryInto}. Each full adder must wait for the one below it — that delay is why addition isn't free.`;

  const transport = {
    running,
    onToggle: () => {
      if (done) setStep(0);
      setRunning((r) => !r);
    },
    onStep: () => setStep((s) => Math.min(WIDTH, s + 1)),
    speed: 1,
    onSpeed: () => {},
  };

  return (
    <SimShell
      title="Build an adder — 4-bit ripple-carry"
      simKey="build-an-adder"
      accent={ACCENT}
      transport={transport}
      onReset={onReset}
      status={status}
      controls={
        <div className="adder-ripctl">
          {stageSelector}
          <button type="button" className="btn bit-preset" onClick={() => resetRipple({ a: 0b1111, b: 0b0001, c: 0 })}>
            1111 + 0001
          </button>
          <button type="button" className="btn bit-preset" onClick={() => resetRipple({ a: 0b1010, b: 0b0110, c: 0 })}>
            1010 + 0110
          </button>
          <label className="ss-field">
            <input type="checkbox" checked={carryIn === 1} onChange={(e) => resetRipple({ c: e.target.checked ? 1 : 0 })} /> carry-in
          </label>
        </div>
      }
    >
      <div className="adder-word-edit">
        <WordEditor label="A" value={a4} onChange={(v) => resetRipple({ a: v })} />
        <span className="adder-plus">+</span>
        <WordEditor label="B" value={b4} onChange={(v) => resetRipple({ b: v })} />
      </div>

      <div className="adder-chain">
        {[...ripple.bits].reverse().map((bt) => {
          const resolved = bt.i < step;
          const activeCarry = bt.i === step - 1 || (bt.i === step && step < WIDTH);
          return (
            <div key={bt.i} className={cx("adder-fa", resolved && "done", bt.i >= step && "pending")}>
              <div className="adder-fa-bitlabels">
                <span className="adder-fa-bit data">{bit(bt.a)}</span>
                <span className="adder-fa-bit data">{bit(bt.b)}</span>
              </div>
              <div className={cx("adder-fa-body", resolved && "done")}>
                FA<sub>{bt.i}</sub>
                <div className={cx("adder-fa-cin", (bt.cin === 1 || activeCarry) && "hot")}>c{bt.cin ? "=1" : "=0"}</div>
              </div>
              <div className={cx("adder-fa-sum", resolved ? "data" : "muted")}>{resolved ? bit(bt.sum) : "·"}</div>
            </div>
          );
        })}
        <div className={cx("adder-cout", done && overflow && "hot-carry", done && !overflow && "cold")}>
          carry-out
          <b>{done ? ripple.cout : "·"}</b>
        </div>
      </div>

      <div className="adder-result">
        <span>
          result = <b className="data">{done ? value : "…"}</b>
          {done && <span className="muted"> ({[...ripple.bits].reverse().map((b) => bit(b.sum)).join("")}₂)</span>}
        </span>
        {done && overflow && <span className="adder-of">⚠ overflow — the 5th bit fell off</span>}
      </div>
      <p className="lsb-canvas-hint muted">
        Press <b>play</b> (or Step / →) and watch the carry crawl from the lowest bit upward. The top bit can't finish until
        the carry reaches it — the adder is only as fast as its longest carry chain. ch.8 shows the trick (carry-lookahead)
        that buys the speed back.
      </p>
    </SimShell>
  );
}

// ---- little presentational helpers (not exported) ----
function BitToggle({ label, value, onClick, tone }: { label: string; value: number; onClick: () => void; tone?: "control" }) {
  return (
    <button type="button" className={cx("adder-toggle", value !== 0 && "on", tone === "control" && "control")} onClick={onClick} aria-pressed={value === 1} aria-label={`${label} = ${value}, toggle`}>
      <span className="adder-toggle-lbl">{label}</span>
      <span className="adder-toggle-val">{bit(value)}</span>
    </button>
  );
}

function BitReadout({ label, value, tone }: { label: string; value: number; tone: "data" | "control" }) {
  return (
    <div className={cx("adder-readout", tone, value !== 0 && "on")}>
      <span className="adder-readout-lbl">{label}</span>
      <span className="adder-readout-val">{bit(value)}</span>
    </div>
  );
}

function WordEditor({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="adder-word">
      <span className="adder-word-lbl">{label}</span>
      <span className="adder-word-bits">
        {[3, 2, 1, 0].map((i) => {
          const on = (value >> i) & 1;
          return (
            <button key={i} type="button" className={cx("bit-cell", on !== 0 && "on")} onClick={() => onChange(value ^ (1 << i))} aria-label={`${label} bit ${i} = ${on}`}>
              {bit(on)}
            </button>
          );
        })}
      </span>
      <span className="adder-word-dec muted">={value}</span>
    </div>
  );
}

const HALF_ROWS: number[][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
const FULL_ROWS: number[][] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
  [0, 1, 1],
  [1, 0, 0],
  [1, 0, 1],
  [1, 1, 0],
  [1, 1, 1],
];
