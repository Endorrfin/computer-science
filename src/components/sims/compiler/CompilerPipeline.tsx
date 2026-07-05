// compiler-pipeline [HERO] — ch.11's crown jewel (INTERACTIVES.md): type code in
// a mini-language and watch it flow through all four compiler stages LIVE —
// source → tokens → AST → bytecode → a stack VM you can single-step. Break the
// syntax and the failing stage complains precisely. Hosts the P3 boss "make the
// pipeline run your program" → markChallengeDone("boss-p3"), badge Language Smith.
//
// The engine (lexer/parser/compiler/vm) is pure and CI-tested (test-p3.ts); this
// file is only the view + transport, mirroring the ch.7 cpu-8bit HERO.
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx } from "../../../lib/utils.ts";
import { compile, formatInstr, initVm, step } from "./lang.ts";
import type { CompileResult, Expr, Stmt, Token, VmState } from "./lang.ts";
import { BOSS_STARTER, BOSS_TARGET, bossResult, PRESETS, presetById } from "./presets.ts";

const ACCENT = "#A3E635"; // P3 · Code
const OUT_TAIL = 24;

export default function CompilerPipeline() {
  const [mode, setMode] = useState<"lab" | "boss">("lab");
  const [presetId, setPresetId] = useState(PRESETS[2].id); // "countdown" — a loop reads well first
  const [source, setSource] = useState(PRESETS[2].source);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  // The whole front-end runs live as you type — this is the "AST grows as you
  // type" magic. The VM is (re)seeded whenever the compiled bytecode changes.
  const compiled = useMemo(() => compile(source), [source]);
  const codeSig = compiled.ok && compiled.cg ? JSON.stringify(compiled.cg.code) : "err";
  const [vm, setVm] = useState<VmState | null>(() => (compiled.ok && compiled.cg ? initVm(compiled.cg) : null));
  const lastSig = useRef(codeSig);

  useEffect(() => {
    if (codeSig !== lastSig.current) {
      lastSig.current = codeSig;
      setVm(compiled.ok && compiled.cg ? initVm(compiled.cg) : null);
      setRunning(false);
    }
  }, [codeSig, compiled]);

  const canStep = vm !== null && !vm.halted && !vm.error;

  function tick() {
    setVm((v) => {
      if (!v) return v;
      const n = step(v);
      if (n.halted || n.error) setRunning(false);
      return n;
    });
  }
  useSimClock(running, 3 * speed, tick);

  function reset() {
    setVm(compiled.ok && compiled.cg ? initVm(compiled.cg) : null);
    setRunning(false);
  }
  function runToEnd() {
    setVm((v) => {
      if (!v) return v;
      let st = v;
      let n = 0;
      while (!st.halted && !st.error && n < 200_000) {
        st = step(st);
        n++;
      }
      return st;
    });
    setRunning(false);
  }

  function onPickPreset(id: string) {
    const p = presetById(id);
    if (!p) return;
    setPresetId(id);
    setSource(p.source);
  }
  function onMode(next: "lab" | "boss") {
    setMode(next);
    if (next === "boss") setSource(BOSS_STARTER);
    else setSource(presetById(presetId)?.source ?? PRESETS[0].source);
  }

  const err = compiled.error;

  return (
    <SimShell
      title="compiler-pipeline — source to running bytecode, one stage at a time"
      simKey="compiler-pipeline"
      kind="hero"
      accent={ACCENT}
      transport={{
        running,
        onToggle: () => canStep && setRunning((r) => !r),
        onStep: () => canStep && setVm((v) => (v ? step(v) : v)),
        speed,
        onSpeed: setSpeed,
      }}
      onReset={reset}
      status={statusLine(compiled, vm)}
      controls={
        <div className="cmp-controls">
          <div className="bit-seg" role="group" aria-label="Mode">
            <button type="button" className={cx("bit-segbtn", mode === "lab" && "on")} onClick={() => onMode("lab")} aria-pressed={mode === "lab"}>lab</button>
            <button type="button" className={cx("bit-segbtn", mode === "boss" && "on")} onClick={() => onMode("boss")} aria-pressed={mode === "boss"}>🔨 boss</button>
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
      <div className="cmp">
        <div className="cmp-editor">
          <div className="cmp-caption">
            source <span className="muted">— our mini-language: let · + − × ÷ % · comparisons · and/or/not · while · if/else · print</span>
          </div>
          <textarea
            className="cmp-code"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            rows={12}
            aria-label="Mini-language source code"
          />
          {mode === "lab" && presetById(presetId)?.blurb && compiled.ok && (
            <p className="cmp-blurb muted">{presetById(presetId)?.blurb}</p>
          )}
          {err && (
            <p className={cx("cmp-err", "stage-" + err.stage)}>
              <span className="cmp-errtag">{err.stage} error</span>
              <span className="cmp-errpos">line {err.line}, col {err.col}</span>
              {err.message}
            </p>
          )}
        </div>

        <div className="cmp-panes">
          <TokenPane compiled={compiled} />
          <AstPane compiled={compiled} />
          <BytecodePane compiled={compiled} vm={vm} />
          <VmPane compiled={compiled} vm={vm} />
        </div>

        <div className="cmp-transport2">
          <button type="button" className="btn" onClick={runToEnd} disabled={!canStep}>⏩ run to end</button>
          <span className="cmp-vmhint muted">
            {vm?.error ? `runtime: ${vm.error}` : vm?.halted ? "program halted" : vm?.last ? vm.last.note : "press Step to execute one bytecode op"}
          </span>
        </div>

        {mode === "boss" && <BossPanel source={source} />}
      </div>
    </SimShell>
  );
}

function statusLine(c: CompileResult, vm: VmState | null): string {
  if (c.error) return `${c.error.stage} error (line ${c.error.line}): ${c.error.message}`;
  if (!vm) return "Compiled.";
  if (vm.error) return `Runtime error: ${vm.error}`;
  if (vm.halted) return `Halted. Output = [${vm.output.join(", ") || "—"}].`;
  return vm.last ? `Ran: ${vm.last.note}` : "Compiled ✓ — press Step or Play to run the bytecode.";
}

// ---------------- pane 1 · tokens ----------------
const TOK_CLASS: Record<string, string> = {
  kw: "tk-kw", ident: "tk-ident", num: "tk-num", op: "tk-op",
  lparen: "tk-punct", rparen: "tk-punct", lbrace: "tk-punct", rbrace: "tk-punct", semi: "tk-punct",
};
function TokenPane({ compiled }: { compiled: CompileResult }) {
  const toks = compiled.tokens.filter((t) => t.type !== "eof");
  const broken = compiled.error?.stage === "lex";
  return (
    <div className="cmp-pane">
      <div className="cmp-pane-head"><span className="cmp-stage-num">1</span> tokens <span className="muted">— the words</span></div>
      <div className="cmp-tokens">
        {toks.length === 0 && !broken && <span className="muted">—</span>}
        {toks.map((t: Token, i) => (
          <span key={i} className={cx("tk", TOK_CLASS[t.type] ?? "tk-punct")} title={`${t.type} @ line ${t.line}:${t.col}`}>{t.value}</span>
        ))}
        {broken && <span className="tk tk-bad" title={compiled.error?.message}>⨯</span>}
      </div>
    </div>
  );
}

// ---------------- pane 2 · AST ----------------
function AstPane({ compiled }: { compiled: CompileResult }) {
  return (
    <div className="cmp-pane">
      <div className="cmp-pane-head"><span className="cmp-stage-num">2</span> AST <span className="muted">— the structure</span></div>
      <div className="cmp-ast">
        {compiled.ast ? (
          compiled.ast.body.length === 0 ? <span className="muted">(empty program)</span> : compiled.ast.body.map((s, i) => <StmtView key={i} s={s} />)
        ) : (
          <span className="muted">{compiled.error?.stage === "parse" ? "parser stopped here ↓" : "—"}</span>
        )}
      </div>
    </div>
  );
}
function StmtView({ s }: { s: Stmt }) {
  if (s.kind === "let") return <AstNode label={`let ${s.name}`} kind="stmt"><ExprView e={s.expr} /></AstNode>;
  if (s.kind === "assign") return <AstNode label={`set ${s.name}`} kind="stmt"><ExprView e={s.expr} /></AstNode>;
  if (s.kind === "print") return <AstNode label="print" kind="stmt"><ExprView e={s.expr} /></AstNode>;
  if (s.kind === "while")
    return (
      <AstNode label="while" kind="ctrl">
        <AstNode label="cond" kind="slot"><ExprView e={s.cond} /></AstNode>
        <AstNode label="body" kind="slot">{s.body.map((b, i) => <StmtView key={i} s={b} />)}</AstNode>
      </AstNode>
    );
  return (
    <AstNode label="if" kind="ctrl">
      <AstNode label="cond" kind="slot"><ExprView e={s.cond} /></AstNode>
      <AstNode label="then" kind="slot">{s.then.map((b, i) => <StmtView key={i} s={b} />)}</AstNode>
      {s.els && <AstNode label="else" kind="slot">{s.els.map((b, i) => <StmtView key={i} s={b} />)}</AstNode>}
    </AstNode>
  );
}
function ExprView({ e }: { e: Expr }) {
  if (e.kind === "num") return <span className="ast-leaf ast-num">{e.value}</span>;
  if (e.kind === "bool") return <span className="ast-leaf ast-num">{String(e.value)}</span>;
  if (e.kind === "var") return <span className="ast-leaf ast-var">{e.name}</span>;
  if (e.kind === "unary") return <AstNode label={e.op} kind="op"><ExprView e={e.operand} /></AstNode>;
  return (
    <AstNode label={e.op} kind="op">
      <ExprView e={e.left} />
      <ExprView e={e.right} />
    </AstNode>
  );
}
function AstNode({ label, kind, children }: { label: string; kind: "stmt" | "ctrl" | "op" | "slot"; children: ReactNode }) {
  return (
    <div className={cx("ast-node", "ast-" + kind)}>
      <span className="ast-label">{label}</span>
      <div className="ast-children">{children}</div>
    </div>
  );
}

// ---------------- pane 3 · bytecode ----------------
function BytecodePane({ compiled, vm }: { compiled: CompileResult; vm: VmState | null }) {
  const cg = compiled.cg;
  return (
    <div className="cmp-pane">
      <div className="cmp-pane-head"><span className="cmp-stage-num">3</span> bytecode <span className="muted">— for the stack VM</span></div>
      <div className="cmp-bytecode">
        {cg ? (
          cg.code.map((instr, i) => {
            const isNext = vm !== null && !vm.halted && !vm.error && vm.pc === i;
            const ran = vm?.last?.pc === i;
            return (
              <div key={i} className={cx("bc-row", isNext && "next", ran && "ran")}>
                <span className="bc-addr">{i}</span>
                <span className="bc-instr">{formatInstr(instr, cg.varNames)}</span>
              </div>
            );
          })
        ) : (
          <span className="muted">{compiled.error?.stage === "compile" ? "codegen stopped ↓" : "—"}</span>
        )}
      </div>
    </div>
  );
}

// ---------------- pane 4 · the stack VM ----------------
function VmPane({ compiled, vm }: { compiled: CompileResult; vm: VmState | null }) {
  if (!compiled.ok || !vm) {
    return (
      <div className="cmp-pane">
        <div className="cmp-pane-head"><span className="cmp-stage-num">4</span> run <span className="muted">— the stack VM</span></div>
        <div className="cmp-vm"><span className="muted">fix the program to run it</span></div>
      </div>
    );
  }
  const stackTop = vm.stack.length - 1;
  const out = vm.output.slice(-OUT_TAIL);
  const hidden = vm.output.length - out.length;
  return (
    <div className="cmp-pane">
      <div className="cmp-pane-head"><span className="cmp-stage-num">4</span> run <span className="muted">— the stack VM</span></div>
      <div className="cmp-vm">
        <div className="vm-cols">
          <div className="vm-stack" aria-label="operand stack">
            <div className="vm-sub">stack</div>
            <div className="vm-stackcells">
              {vm.stack.length === 0 && <span className="muted">empty</span>}
              {vm.stack.map((v, i) => (
                <span key={i} className={cx("vm-cell", i === stackTop && "top")}>{v}</span>
              )).reverse()}
            </div>
          </div>
          <div className="vm-vars" aria-label="variables">
            <div className="vm-sub">variables</div>
            {vm.varNames.length === 0 && <span className="muted">none</span>}
            {vm.varNames.map((n, i) => (
              <span key={i} className="vm-var"><b>{n}</b> {vm.vars[i]}</span>
            ))}
          </div>
        </div>
        <div className="vm-out" aria-label="output">
          <div className="vm-sub">output</div>
          <div className="vm-outstrip">
            {vm.output.length === 0 && <span className="muted">nothing printed yet</span>}
            {hidden > 0 && <span className="vm-outmore">…{hidden}</span>}
            {out.map((v, i) => (
              <span key={i} className={cx("vm-outval", i === out.length - 1 && "latest")}>{v}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- boss · Language Smith ----------------
function BossPanel({ source }: { source: string }) {
  const done = useChallengesDone().has("boss-p3");
  const [checked, setChecked] = useState(false);
  const result = useMemo(() => bossResult(source), [source]);

  function check() {
    setChecked(true);
    if (result.pass) markChallengeDone("boss-p3");
  }

  return (
    <div className={cx("cmp-boss", result.pass && "ok")}>
      <div className="cmp-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Make the pipeline run your program</strong>
        <span className="muted">badge: Language Smith {done && "✓ earned"}</span>
      </div>
      <p className="cmp-boss-story">
        Write a program that uses a <strong>variable</strong> and a <strong>while loop</strong> to <strong>print {BOSS_TARGET}</strong> —
        the running-total shape from the presets is one way there. Edit the source above; the checklist updates live.
      </p>
      <ul className="cmp-boss-checks">
        <Check ok={result.usesVar} label="declares a variable (let)" />
        <Check ok={result.usesLoop} label="uses a while loop" />
        <Check ok={result.ok} label="compiles and runs without error" />
        <Check ok={result.reachedTarget} label={`prints the target ${BOSS_TARGET}`} />
      </ul>
      <div className="cmp-boss-actions">
        <button type="button" className="btn btn-primary" onClick={check}>✓ check my program</button>
        <span className="muted">output: [{result.output.slice(0, 12).join(", ") || "—"}]</span>
        {checked && result.pass && <span className="cmp-verdict ok">🏅 It runs! Badge <strong>Language Smith</strong> earned — you drove a program through every stage of a real toolchain.</span>}
        {checked && !result.pass && (
          <span className="cmp-verdict no">
            {result.errorMsg ? `Not yet — ${result.errorMsg}.` : `Not yet — got [${result.output.join(", ") || "—"}]. It must print ${BOSS_TARGET} using a variable and a loop.`}
          </span>
        )}
        {done && !checked && <span className="cmp-verdict muted">✓ already cleared — badge earned.</span>}
      </div>
    </div>
  );
}
function Check({ ok, label }: { ok: boolean; label: string }) {
  return <li className={cx("cmp-check", ok && "on")}>{ok ? "✓" : "○"} {label}</li>;
}
