// cpu-8bit [HERO] — ch.7's crown jewel (INTERACTIVES.md): a full 8-bit CPU.
// Write assembly, assemble it INTO the 16-byte RAM, then run/step and watch the
// byte travel the datapath fetch→decode→execute while A/B/PC/IR/flags update.
// Wires ch.5's ALU (arith.ts) + ch.6's registers/RAM (memory.ts) into a running
// machine. Hosts the P2 boss "program Fibonacci" → markChallengeDone("boss-p2").
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx } from "../../../lib/utils.ts";
import DatapathView from "./DatapathView.tsx";
import {
  assemble,
  disassemble,
  initCpu,
  instructionStep,
  microStep,
  run,
  signed8,
} from "../machine/cpu.ts";
import type { AsmResult, CpuState } from "../machine/cpu.ts";
import { BOSS_STARTER, FIB_FIRST_10, PRESETS, presetById } from "./presets.ts";

const ACCENT = "#FB923C";
const OUT_TAIL = 22; // how many OUT values to render

const bits8 = (v: number) => Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1);

export default function CpuEmulator() {
  const [mode, setMode] = useState<"lab" | "boss">("lab");
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [source, setSource] = useState(PRESETS[0].source);
  const [loadedSource, setLoadedSource] = useState(PRESETS[0].source);
  const [loaded, setLoaded] = useState<AsmResult>(() => assemble(PRESETS[0].source));
  const [cpu, setCpu] = useState<CpuState>(() => initCpu(assemble(PRESETS[0].source).bytes));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const asm = useMemo(() => assemble(source), [source]); // live, for the editor
  const dirty = source !== loadedSource;

  function loadProgram(src: string) {
    const a = assemble(src);
    setSource(src);
    setLoadedSource(src);
    setLoaded(a);
    setCpu(initCpu(a.bytes));
    setRunning(false);
  }

  function onPickPreset(id: string) {
    const p = presetById(id);
    if (!p) return;
    setPresetId(id);
    loadProgram(p.source);
  }

  function onMode(next: "lab" | "boss") {
    setMode(next);
    if (next === "boss") loadProgram(BOSS_STARTER);
    else loadProgram(presetById(presetId)?.source ?? PRESETS[0].source);
  }

  function tick() {
    setCpu((c) => {
      const next = microStep(c);
      if (next.halted) setRunning(false);
      return next;
    });
  }
  useSimClock(running, 2.5 * speed, tick);

  const canStep = !cpu.halted && loaded.ok;
  const step = cpu.last;

  return (
    <SimShell
      title="cpu-8bit — a whole computer you can single-step"
      simKey="cpu-8bit"
      kind="hero"
      accent={ACCENT}
      transport={{
        running,
        onToggle: () => canStep && setRunning((r) => !r),
        onStep: () => canStep && setCpu(microStep),
        speed,
        onSpeed: setSpeed,
      }}
      onReset={() => {
        setCpu(initCpu(loaded.bytes));
        setRunning(false);
      }}
      status={
        cpu.halted
          ? `Halted after ${cpu.retired} instruction(s). OUT = [${cpu.out.join(", ") || "—"}].`
          : step
            ? `${step.phase.toUpperCase()} · ${step.label}`
            : "Ready — press Step (one micro-step) or Play to fetch the first instruction."
      }
      controls={
        <div className="cpu-controls">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button type="button" className={cx("bit-segbtn", mode === "lab" && "on")} onClick={() => onMode("lab")} aria-pressed={mode === "lab"}>lab</button>
            <button type="button" className={cx("bit-segbtn", mode === "boss" && "on")} onClick={() => onMode("boss")} aria-pressed={mode === "boss"}>⚙️ boss</button>
          </div>
          {mode === "lab" && (
            <label className="ss-field">
              program
              <select aria-label="Preset program" value={presetId} onChange={(e) => onPickPreset(e.target.value)}>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      }
    >
      <div className="cpu">
        <div className="cpu-top">
          <Editor
            source={source}
            setSource={setSource}
            asm={asm}
            dirty={dirty}
            onLoad={() => loadProgram(source)}
            blurb={mode === "lab" ? presetById(presetId)?.blurb : undefined}
          />
          <div className="cpu-stage">
            <DatapathView state={cpu} />
            <MicroStepNote state={cpu} />
          </div>
        </div>

        <div className="cpu-transport2">
          <button type="button" className="btn" onClick={() => setCpu(instructionStep)} disabled={!canStep || running}>⏭ step instruction</button>
          <button type="button" className="btn" onClick={() => { setCpu((c) => run(c, 500)); setRunning(false); }} disabled={!canStep}>⏩ run to end</button>
          <button type="button" className="btn" onClick={() => loadProgram(source)}>⤓ assemble &amp; load</button>
        </div>

        <div className="cpu-panels">
          <Registers state={cpu} />
          <RamPanel state={cpu} loaded={loaded} />
        </div>

        <OutLog out={cpu.out} />

        {mode === "boss" && <BossPanel loaded={loaded} />}
      </div>
    </SimShell>
  );
}

// ---------------- editor ----------------
function Editor({
  source,
  setSource,
  asm,
  dirty,
  onLoad,
  blurb,
}: {
  source: string;
  setSource: (s: string) => void;
  asm: AsmResult;
  dirty: boolean;
  onLoad: () => void;
  blurb?: string;
}) {
  return (
    <div className="cpu-editor">
      <div className="cpu-caption">
        assembly <span className="muted">— one line per byte; labels end in “:”, a bare number is data</span>
      </div>
      <textarea
        className="cpu-code"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        rows={13}
        aria-label="Assembly source"
      />
      <div className="cpu-editor-foot">
        <button type="button" className={cx("btn", dirty && "btn-primary")} onClick={onLoad}>⤓ assemble &amp; load</button>
        <span className={cx("cpu-asmstate", asm.errors.length ? "bad" : "ok")}>
          {asm.errors.length === 0 ? `✓ ${asm.listing.length}/16 bytes${dirty ? " · edited" : ""}` : `✗ ${asm.errors.length} error(s)`}
        </span>
      </div>
      {asm.errors.length > 0 && (
        <ul className="cpu-errs">
          {asm.errors.slice(0, 5).map((e, i) => (
            <li key={i}>line {e.line}: {e.message}</li>
          ))}
        </ul>
      )}
      {blurb && asm.errors.length === 0 && <p className="cpu-blurb muted">{blurb}</p>}
    </div>
  );
}

// ---------------- current micro-step ----------------
function MicroStepNote({ state }: { state: CpuState }) {
  const s = state.last;
  if (state.halted) {
    return <p className="cpu-note halted" aria-live="polite"><span className="cpu-phase halt">HALT</span> Clock stopped. Final OUT = [{state.out.join(", ") || "—"}].</p>;
  }
  if (!s) {
    return <p className="cpu-note" aria-live="polite"><span className="cpu-phase">ready</span> Press <strong>Step</strong> to run one micro-step (T-state), or <strong>Play</strong> to animate the fetch–decode–execute loop.</p>;
  }
  return (
    <p className="cpu-note" aria-live="polite">
      <span className={cx("cpu-phase", s.phase)}>{s.phase}</span>
      <strong>{s.label}</strong> — {s.note}
    </p>
  );
}

// ---------------- registers ----------------
function Registers({ state }: { state: CpuState }) {
  return (
    <div className="cpu-regs" aria-label="registers">
      <div className="cpu-caption">registers</div>
      <div className="cpu-reg-row">
        <span className="cpu-reg-name">A</span>
        <span className="cpu-reg-bits">
          {bits8(state.a).map((b, i) => (
            <span key={i} className={cx("cpu-regbit", b === 1 && "on", i === 0 && "sign")}>{b}</span>
          ))}
        </span>
        <span className="cpu-reg-dec">{state.a} u · {signed8(state.a)} s</span>
      </div>
      <div className="cpu-reg-row">
        <span className="cpu-reg-name">B</span>
        <span className="cpu-reg-bits">
          {bits8(state.b).map((b, i) => (
            <span key={i} className={cx("cpu-regbit", b === 1 && "on", i === 0 && "sign")}>{b}</span>
          ))}
        </span>
        <span className="cpu-reg-dec">{state.b} u</span>
      </div>
      <div className="cpu-reg-mini">
        <span className="cpu-reg-chip"><b>PC</b> {state.pc}</span>
        <span className="cpu-reg-chip"><b>IR</b> {disassemble(state.ir)}</span>
        <span className="cpu-reg-chip"><b>MAR</b> {state.mar}</span>
        <span className="cpu-reg-chip"><b>retired</b> {state.retired}</span>
      </div>
      <div className="cpu-flagrow" role="group" aria-label="flags">
        {(["z", "n", "c", "v"] as const).map((k) => (
          <span key={k} className={cx("cpu-flag", state.flags[k] && "on")} title={FLAG_TITLE[k]}>
            <b>{k.toUpperCase()}</b>{state.flags[k] ? 1 : 0}
          </span>
        ))}
      </div>
    </div>
  );
}

const FLAG_TITLE: Record<"z" | "n" | "c" | "v", string> = {
  z: "Zero — last ALU result was 0 (JZ/JNZ read this)",
  n: "Negative — top bit of the result is 1",
  c: "Carry — carry/borrow out of the top bit (JC reads this)",
  v: "oVerflow — signed overflow (result sign wrong)",
};

// ---------------- RAM ----------------
function RamPanel({ state, loaded }: { state: CpuState; loaded: AsmResult }) {
  return (
    <div className="cpu-ram" aria-label="RAM">
      <div className="cpu-caption">
        RAM <span className="muted">— 16 bytes, program + data together (Von Neumann)</span>
      </div>
      <div className="cpu-ramgrid">
        {state.ram.map((byte, addr) => {
          const row = loaded.listing[addr];
          const isCode = row?.kind === "code";
          const isPc = addr === state.pc;
          const isMar = addr === state.mar;
          return (
            <div
              key={addr}
              className={cx("cpu-cell", isCode ? "code" : "data", isPc && "pc", isMar && "mar")}
              title={row ? row.source : `${byte}`}
            >
              <span className="cpu-cell-addr">{addr.toString(16).toUpperCase()}</span>
              <span className="cpu-cell-byte">{byte.toString(16).toUpperCase().padStart(2, "0")}</span>
              <span className="cpu-cell-txt">{isCode ? disassemble(byte) : `${byte}${row?.label ? " " + row.label : ""}`}</span>
            </div>
          );
        })}
      </div>
      <div className="cpu-ram-legend">
        <span className="cpu-legend pc">▮ PC (next fetch)</span>
        <span className="cpu-legend mar">▮ MAR (addressed now)</span>
        <span className="cpu-legend code">▮ code</span>
        <span className="cpu-legend data">▮ data</span>
      </div>
    </div>
  );
}

// ---------------- OUT log ----------------
function OutLog({ out }: { out: number[] }) {
  const shown = out.slice(-OUT_TAIL);
  const hidden = out.length - shown.length;
  return (
    <div className="cpu-out" aria-label="output log">
      <div className="cpu-caption">OUT <span className="muted">— what the program printed</span></div>
      <div className="cpu-outstrip">
        {out.length === 0 && <span className="muted">nothing printed yet</span>}
        {hidden > 0 && <span className="cpu-outmore">…{hidden} earlier</span>}
        {shown.map((v, i) => (
          <span key={i} className={cx("cpu-outval", i === shown.length - 1 && "latest")}>{v}</span>
        ))}
      </div>
    </div>
  );
}

// ---------------- boss ----------------
function BossPanel({ loaded }: { loaded: AsmResult }) {
  const challengesDone = useChallengesDone();
  const cleared = challengesDone.has("boss-p2");
  const [verdict, setVerdict] = useState<"ok" | "no" | null>(null);
  const [got, setGot] = useState<number[]>([]);

  function check() {
    const out = run(initCpu(loaded.bytes), 300).out;
    setGot(out);
    const pass = out.length >= FIB_FIRST_10.length && FIB_FIRST_10.every((v, i) => out[i] === v);
    setVerdict(pass ? "ok" : "no");
    if (pass) markChallengeDone("boss-p2");
  }

  return (
    <div className={cx("cpu-boss", verdict === "ok" && "ok")}>
      <div className="cpu-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Program Fibonacci on the 8-bit CPU</strong>
        <span className="muted">badge: Machine Whisperer {cleared && "✓ earned"}</span>
      </div>
      <p className="cpu-boss-story">
        Make the machine print the Fibonacci sequence — <code>1, 1, 2, 3, 5, 8, 13, …</code> Keep the two latest terms in RAM,
        print one each pass, then compute their sum and shift. Edit the code on the left, <strong>assemble &amp; load</strong>, then check.
      </p>
      <div className="cpu-boss-target">
        {FIB_FIRST_10.map((v, i) => (
          <span key={i} className={cx("cpu-target", got[i] === v && "hit", verdict === "no" && got[i] !== undefined && got[i] !== v && "miss")}>{v}</span>
        ))}
      </div>
      <div className="cpu-boss-actions">
        <button type="button" className="btn btn-primary" onClick={check}>✓ check my program</button>
        {verdict === "ok" && <span className="cpu-verdict ok">🏅 Fibonacci! Badge <strong>Machine Whisperer</strong> earned — you programmed real (emulated) iron.</span>}
        {verdict === "no" && <span className="cpu-verdict no">Not yet — got [{got.slice(0, 10).join(", ") || "—"}]. It must start 1, 1, 2, 3, 5, … Check your shift (x ← old y, y ← sum) and the loop JMP.</span>}
        {cleared && verdict !== "ok" && <span className="cpu-verdict muted">✓ already cleared — badge earned.</span>}
      </div>
    </div>
  );
}
