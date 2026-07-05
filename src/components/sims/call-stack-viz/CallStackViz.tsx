// call-stack-viz [micro] — ch.10 (INTERACTIVES.md). Run the naive recursive
// fib(n) and watch the CALL STACK grow and shrink: each call pushes a frame with
// its own n, each return pops one and hands its value back. Flip to the
// no-base-case function to watch the finite stack overflow. Engine: model.ts
// (pure, CI-tested in test-p3.ts).
import { useEffect, useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx } from "../../../lib/utils.ts";
import { traceFib, traceOverflow } from "./model.ts";

const ACCENT = "#A3E635";
const FIB_MAX = 6;

export default function CallStackViz() {
  const [fn, setFn] = useState<"fib" | "overflow">("fib");
  const [n, setN] = useState(5);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const trace = useMemo(() => (fn === "fib" ? traceFib(n) : traceOverflow()), [fn, n]);
  const sig = `${fn}:${n}`;
  const [lastSig, setLastSig] = useState(sig);
  useEffect(() => {
    if (sig !== lastSig) {
      setLastSig(sig);
      setIdx(0);
      setRunning(false);
    }
  }, [sig, lastSig]);

  const last = trace.events.length - 1;
  const at = Math.min(idx, last);
  const ev = trace.events[at];
  const atEnd = at >= last;

  function tick() {
    setIdx((i) => {
      if (i >= last) {
        setRunning(false);
        return i;
      }
      return i + 1;
    });
  }
  useSimClock(running, 2 * speed, tick);

  return (
    <SimShell
      title="call-stack-viz — recursion is a stack of frames"
      simKey="call-stack-viz"
      accent={ACCENT}
      transport={{
        running,
        onToggle: () => !atEnd && setRunning((r) => !r),
        onStep: () => setIdx((i) => Math.min(i + 1, last)),
        speed,
        onSpeed: setSpeed,
      }}
      onReset={() => {
        setIdx(0);
        setRunning(false);
      }}
      status={ev.note}
      controls={
        <div className="stk-controls">
          <div className="bit-seg" role="group" aria-label="Function">
            <button type="button" className={cx("bit-segbtn", fn === "fib" && "on")} onClick={() => setFn("fib")} aria-pressed={fn === "fib"}>fib(n)</button>
            <button type="button" className={cx("bit-segbtn", fn === "overflow" && "on")} onClick={() => setFn("overflow")} aria-pressed={fn === "overflow"}>no base case</button>
          </div>
          {fn === "fib" && (
            <label className="ss-field">
              n = {n}
              <input type="range" min={1} max={FIB_MAX} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="fib argument n" />
            </label>
          )}
        </div>
      }
      footer={
        <div className="stk-stats">
          <span>depth now: <b>{ev.depth}</b></span>
          <span>deepest: <b>{trace.maxDepth}</b></span>
          <span>frames pushed: <b>{trace.calls}</b></span>
          {fn === "fib" && atEnd && <span className="stk-result">fib({n}) = <b>{trace.result}</b></span>}
          {trace.overflow && atEnd && <span className="stk-overflow">stack overflow</span>}
        </div>
      }
    >
      <div className="stk">
        <div className="stk-code">
          <div className="cmp-caption">the function</div>
          {fn === "fib" ? (
            <pre className="stk-pre">
{`fib(n):
  if (n < 2) return n;`}<span className="stk-cmt">   // base case — stops it</span>{`
  return fib(n-1) + fib(n-2);`}<span className="stk-cmt"> // two recursive calls</span>
            </pre>
          ) : (
            <pre className="stk-pre">
{`countUp(n):
  return countUp(n + 1);`}<span className="stk-cmt">  // no base case → never stops</span>
            </pre>
          )}
          <p className="muted cs-hint">
            Each call <b>pushes</b> a frame (its own <code>n</code>, its locals, where to return); each <b>return</b> pops one and
            hands its value up. Recursion is that, over and over — and the stack is finite.
          </p>
        </div>

        <div className="stk-stackwrap" aria-label="call stack">
          <div className="cmp-caption">the call stack <span className="muted">— newest frame on top</span></div>
          <div className="stk-stack">
            {ev.stack.length === 0 && <div className="stk-empty muted">stack empty</div>}
            {ev.stack
              .map((f) => (
                <div key={f.id} className={cx("stk-frame", f.active && "active", f.ret !== null && "resolved")}>
                  <span className="stk-frame-label">{f.label}</span>
                  <span className="stk-frame-sub">{f.sub}</span>
                  {f.ret !== null && <span className="stk-frame-ret">→ {f.ret}</span>}
                </div>
              ))
              .reverse()}
          </div>
          <div className="stk-base muted">stack base</div>
        </div>
      </div>
    </SimShell>
  );
}
