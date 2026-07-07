// [micro] race-lab (ch.25) — why count++ is a lie under concurrency. Two threads
// each run the same increment, but count++ is really three micro-ops: LOAD the
// shared value into a private register, INC the register, STORE it back.
// Interleave the two threads by hand (step T0 / step T1) and you can make an
// update vanish — both load the same value, both store it, one write is lost.
// Flip the mutex on and the section becomes atomic: a thread that hasn't entered
// blocks until the lock is free, and the count is always exact. Auto-play picks
// a random ready thread each tick. Driven by ./model.ts. Reduced motion → step.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import { initRace, raceStep, raceBlocked, raceDone, expectedCount, MICROS } from "./model.ts";
import type { RaceState } from "./model.ts";
import "../../../theme/_p6css/race-lab.css";

const ACCENT = "#22d3ee";

export default function RaceLab() {
  const reduced = useReducedMotion();
  const [incs, setIncs] = useState(1);
  const [useLock, setUseLock] = useState(false);
  const [state, setState] = useState<RaceState>(() => initRace(2, 1, false));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const expected = expectedCount(2, incs);
  const finished = raceDone(state);
  const lost = expected - state.count;

  function load(nextIncs: number, nextLock: boolean): void {
    setIncs(nextIncs);
    setUseLock(nextLock);
    setState(initRace(2, nextIncs, nextLock));
    setRunning(false);
  }
  function reset(): void {
    setState(initRace(2, incs, useLock));
    setRunning(false);
  }
  function stepThread(tid: number): void {
    setState((prev) => raceStep(prev, tid));
  }
  function stepAuto(): void {
    setState((prev) => {
      if (raceDone(prev)) return prev;
      const ready = [0, 1].filter((t) => !raceBlocked(prev, t));
      if (ready.length === 0) return prev;
      const pick = ready[Math.floor(Math.random() * ready.length)];
      return raceStep(prev, pick);
    });
  }

  useSimClock(running, 3 * speed, stepAuto);
  if (running && finished) setRunning(false);

  function onToggle(): void {
    if (reduced || finished) return;
    setRunning((r) => !r);
  }

  const status = useMemo(() => {
    const base = `count = ${state.count} · expected ${expected}${useLock ? " · 🔒 mutex on" : ""}`;
    if (!finished) return `${base} · running…`;
    return lost > 0 ? `${base} · ${lost} update${lost === 1 ? "" : "s"} LOST — a race` : `${base} · exact — no lost updates`;
  }, [state.count, expected, useLock, finished, lost]);

  return (
    <SimShell
      title="Race the counter — count++ is not atomic"
      simKey="race-lab"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep: stepAuto, speed, onSpeed: setSpeed }}
      onReset={reset}
      status={status}
      controls={
        <div className="rl-ctl">
          <label className="ss-field">
            increments / thread
            <select aria-label="Increments per thread" value={incs} onChange={(e) => load(Number(e.target.value), useLock)}>
              {[1, 2, 3].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <div className="bit-seg" role="group" aria-label="Mutex">
            <button type="button" className={cx("bit-segbtn", !useLock && "on")} onClick={() => load(incs, false)} aria-pressed={!useLock}>no lock</button>
            <button type="button" className={cx("bit-segbtn", useLock && "on")} onClick={() => load(incs, true)} aria-pressed={useLock}>🔒 mutex</button>
          </div>
          <div className="rl-steps">
            <button type="button" className="btn" onClick={() => stepThread(0)} disabled={raceBlocked(state, 0)}>step T0 ▸</button>
            <button type="button" className="btn" onClick={() => stepThread(1)} disabled={raceBlocked(state, 1)}>step T1 ▸</button>
          </div>
        </div>
      }
      footer={
        <div className="rl-foot">
          <div className="rl-scoreboard">
            <span className="rl-count" style={lost > 0 ? { color: "var(--sem-err)" } : undefined}>count = {state.count}</span>
            <span className="rl-expected">expected {expected}</span>
            {finished && lost > 0 && <span className="rl-lost">✗ {lost} lost</span>}
            {finished && lost === 0 && <span className="rl-okmark">✓ exact</span>}
          </div>
          <RaceLog log={state.log} />
        </div>
      }
    >
      <div className="rl-stage">
        {[0, 1].map((tid) => (
          <ThreadCol key={tid} state={state} tid={tid} />
        ))}
        <SharedCell count={state.count} lost={lost} finished={finished} useLock={useLock} owner={state.lockOwner} />
      </div>
    </SimShell>
  );
}

function ThreadCol({ state, tid }: { state: RaceState; tid: number }) {
  const t = state.threads[tid];
  const next = t.pc < 3 ? MICROS[t.pc] : "done";
  const owns = state.useLock && state.lockOwner === tid;
  const blocked = state.useLock && t.pc === 0 && state.lockOwner !== -1 && state.lockOwner !== tid;
  return (
    <div className={cx("rl-thread", `rl-thread--${tid}`, blocked && "rl-blocked")}>
      <div className="rl-thead">
        T{tid} {owns && <span className="rl-lockchip" title="holds the mutex">🔒</span>}
        {blocked && <span className="rl-waitchip" title="blocked on the mutex">⏳ blocked</span>}
      </div>
      <div className="rl-reg">reg = <b>{t.reg}</b></div>
      <ol className="rl-ops">
        {MICROS.map((m, i) => (
          <li key={m} className={cx("rl-op", i === t.pc && t.pc < 3 && "rl-op--next", i < t.pc && "rl-op--done")}>
            {m}
            {m === "load" && i < t.pc ? ` (${t.reg})` : ""}
          </li>
        ))}
      </ol>
      <div className="rl-next">{next === "done" ? "✓ done" : `next: ${next}`}</div>
    </div>
  );
}

function SharedCell({ count, lost, finished, useLock, owner }: { count: number; lost: number; finished: boolean; useLock: boolean; owner: number }) {
  return (
    <div className="rl-shared">
      <div className="rl-shared-lbl">shared</div>
      <div className={cx("rl-shared-box", finished && lost > 0 && "rl-shared-box--bad", finished && lost === 0 && "rl-shared-box--ok")}>
        <span className="rl-shared-name">count</span>
        <span className="rl-shared-val">{count}</span>
      </div>
      <div className="rl-lockstate">{useLock ? (owner === -1 ? "🔓 free" : `🔒 T${owner}`) : "no mutex"}</div>
    </div>
  );
}

function RaceLog({ log }: { log: string[] }) {
  const tail = log.slice(-7);
  return (
    <ol className="rl-log" aria-label="Execution trace">
      {tail.length === 0 && <li className="rl-log-empty">step a thread to trace load · inc · store</li>}
      {tail.map((line, i) => (
        <li key={log.length - tail.length + i} className="rl-log-line">{line}</li>
      ))}
    </ol>
  );
}
