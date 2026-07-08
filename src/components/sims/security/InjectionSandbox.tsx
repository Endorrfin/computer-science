// [micro] injection-sandbox (ch.32) — SQL injection made concrete. A fake login
// form builds one query two ways and the WHERE **AST** tells the whole story:
// string-concat splices the input into SQL *text*, so `' OR 1=1--` grows an `or`
// tautology branch and comments the password check away → auth bypass; the
// parameterized build keeps a fixed `and(name=?, pw=?)` tree and matches the
// same payload as an inert literal → access denied. Purely reactive: pick a
// payload or a build mode and `buildConcatQuery`/`buildParamQuery` + `evaluate`
// recompute via useMemo. Nothing here re-implements the parser — every token,
// node and verdict comes straight from sqli.ts. Prefix: inj-.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { buildConcatQuery, buildParamQuery, evaluate, PAYLOADS } from "./sqli.ts";
import type { Built, Operand, QueryOutcome, Where } from "./sqli.ts";
import "../../../theme/_p9css/injection-sandbox.css";

const ACCENT = "#818CF8";

type Mode = "concat" | "param";

const MODES: readonly { id: Mode; label: string; tag: string }[] = [
  { id: "concat", label: "String-concat (vulnerable)", tag: "input is spliced into the SQL text" },
  { id: "param", label: "Parameterized (safe)", tag: "input rides a separate params channel" },
];

const DEFAULT_NAME = "admin";
const DEFAULT_PW = "s3cr3t!";

export default function InjectionSandbox() {
  const [name, setName] = useState(DEFAULT_NAME);
  const [pw, setPw] = useState(DEFAULT_PW);
  const [mode, setMode] = useState<Mode>("concat");

  const built = useMemo<Built>(
    () => (mode === "concat" ? buildConcatQuery(name, pw) : buildParamQuery(name, pw)),
    [name, pw, mode],
  );
  const outcome = useMemo<QueryOutcome>(() => evaluate(built), [built]);

  function onReset(): void {
    setName(DEFAULT_NAME);
    setPw(DEFAULT_PW);
    setMode("concat");
  }

  const verdict = outcome.bypass
    ? "AUTH BYPASS"
    : outcome.loggedIn
      ? "authenticated"
      : "access denied";
  const status =
    `${mode === "concat" ? "concat" : "parameterized"} · ` +
    `${outcome.loggedIn ? `logged in as ${outcome.loggedInAs}` : "no rows"} · ${verdict}`;

  return (
    <SimShell
      title="Injection sandbox — how a payload reshapes the query tree"
      simKey="injection-sandbox"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="inj-seg bit-seg" role="group" aria-label="Query build mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cx("bit-segbtn", mode === m.id && "on")}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              title={m.tag}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="inj-foot">
          <span className="inj-foot-lbl">quick-fill payloads</span>
          <div className="inj-payloads" role="group" aria-label="Quick-fill payloads">
            {PAYLOADS.map((p) => {
              const active = p.input === name && p.pw === pw;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={cx("btn", "inj-payload", active && "btn-primary")}
                  onClick={() => {
                    setName(p.input);
                    setPw(p.pw);
                  }}
                  aria-pressed={active}
                  title={p.note}
                >
                  <span className="inj-payload-lbl">{p.label}</span>
                  <span className="inj-payload-note">{p.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="inj-stage">
        <div className="inj-grid">
          {/* fake login form */}
          <form className="inj-login" onSubmit={(e) => e.preventDefault()} aria-label="Login form">
            <span className="inj-panel-h">login form</span>
            <label className="inj-field">
              <span>username</span>
              <input
                className="inj-input"
                type="text"
                value={name}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                aria-label="Username"
              />
            </label>
            <label className="inj-field">
              <span>password</span>
              <input
                className="inj-input"
                type="text"
                value={pw}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setPw(e.target.value)}
                aria-label="Password (shown in plain text for the demo)"
              />
            </label>
            <p className="inj-hint">
              plain-text password box — this is a demo of the query, not a real login.
            </p>
          </form>

          {/* the SQL the DB actually sees */}
          <div className="inj-sql-panel">
            <span className="inj-panel-h">query the database runs</span>
            <SqlView built={built} />
            {built.mode === "param" && (
              <div className="inj-params" aria-label="Bound parameters">
                <span className="inj-params-lbl">params</span>
                <ol className="inj-params-list">
                  {built.params.map((p, i) => (
                    <li key={i}>
                      <span className="inj-param-idx">?{i + 1}</span>
                      <span className="inj-param-val">{quote(p)}</span>
                    </li>
                  ))}
                </ol>
                <p className="inj-params-note">data, never SQL — the tree can't change.</p>
              </div>
            )}
          </div>
        </div>

        {/* the parsed WHERE AST — the payoff */}
        <div className="inj-ast-panel">
          <span className="inj-panel-h">parsed WHERE tree (AST)</span>
          {built.ast ? (
            <div className="inj-ast" role="tree" aria-label="Parsed WHERE clause abstract syntax tree">
              <AstNode node={built.ast} params={built.params} depth={0} last />
            </div>
          ) : (
            <p className="inj-ast-empty">no parseable WHERE clause — the query returns nothing.</p>
          )}
        </div>

        {/* the security verdict */}
        <Verdict outcome={outcome} mode={built.mode} suppliedPw={built.suppliedPw} />
      </div>
    </SimShell>
  );
}

/* -------------------------------------------------------------------------- */
/* The SQL string. For concat we highlight the two spliced user inputs inside  */
/* the literal so it's visible that the payload became SQL text. For param the */
/* text is fixed and the ? placeholders are marked.                            */
/* -------------------------------------------------------------------------- */
function SqlView({ built }: { built: Built }) {
  if (built.mode === "param") {
    // Fixed text: mark each ? placeholder.
    const parts = built.sql.split("?");
    return (
      <pre className="inj-sql" aria-label={`SQL: ${built.sql}`}>
        <code>
          {parts.map((seg, i) => (
            <span key={i}>
              {seg}
              {i < parts.length - 1 && <span className="inj-ph">?</span>}
            </span>
          ))}
        </code>
      </pre>
    );
  }
  // Concat: rebuild the string ourselves so we can wrap the injected inputs.
  const label = `SQL: SELECT * FROM users WHERE name = '${built.suppliedName}' AND pw = '${built.suppliedPw}'`;
  return (
    <pre className="inj-sql" aria-label={label}>
      <code>
        {"SELECT * FROM users WHERE name = '"}
        <span className="inj-inject">{built.suppliedName}</span>
        {"' AND pw = '"}
        <span className="inj-inject">{built.suppliedPw}</span>
        {"'"}
      </code>
    </pre>
  );
}

/* -------------------------------------------------------------------------- */
/* Recursive AST renderer — an indented tree of boxes. `and`/`or` are branch   */
/* nodes (or is tinted with --sem-err since it's the tautology that bypasses); */
/* `cmp` is a leaf comparison with typed operands.                             */
/* -------------------------------------------------------------------------- */
function AstNode({
  node,
  params,
  depth,
  last,
}: {
  node: Where;
  params: readonly string[];
  depth: number;
  last: boolean;
}) {
  if (node.kind === "cmp") {
    return (
      <div className="inj-node inj-node--cmp" role="treeitem" style={indent(depth)}>
        <span className="inj-branch" aria-hidden="true">
          {depth > 0 ? (last ? "└─" : "├─") : ""}
        </span>
        <span className="inj-tag inj-tag--cmp">cmp</span>
        <span className="inj-cmp">
          <OperandChip op={node.left} params={params} />
          <span className="inj-op">{node.op}</span>
          <OperandChip op={node.right} params={params} />
        </span>
      </div>
    );
  }
  const isOr = node.kind === "or";
  return (
    <div className="inj-node inj-node--branch" role="treeitem" aria-expanded="true">
      <div className={cx("inj-node-head", isOr && "is-or")} style={indent(depth)}>
        <span className="inj-branch" aria-hidden="true">
          {depth > 0 ? (last ? "└─" : "├─") : ""}
        </span>
        <span className={cx("inj-tag", isOr ? "inj-tag--or" : "inj-tag--and")}>{node.kind}</span>
        {isOr && <span className="inj-taut">tautology branch — always true</span>}
      </div>
      <div className="inj-node-kids" role="group">
        <AstNode node={node.left} params={params} depth={depth + 1} last={false} />
        <AstNode node={node.right} params={params} depth={depth + 1} last />
      </div>
    </div>
  );
}

function OperandChip({ op, params }: { op: Operand; params: readonly string[] }) {
  if (op.kind === "col") {
    return <span className="inj-oper inj-oper--col">{op.name}</span>;
  }
  if (op.kind === "param") {
    const val = params[op.index];
    return (
      <span className="inj-oper inj-oper--param" title={val !== undefined ? quote(val) : undefined}>
        ?{op.index + 1}
        {val !== undefined && <span className="inj-oper-bound">= {quote(val)}</span>}
      </span>
    );
  }
  // literal — a `1=1` numeric tautology (or the classic `1`) reads as danger.
  const taut = op.numeric && op.value === "1";
  return (
    <span className={cx("inj-oper", op.numeric ? "inj-oper--num" : "inj-oper--lit", taut && "is-taut")}>
      {op.numeric ? op.value : quote(op.value)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* The verdict banner: red AUTH BYPASS when the engine flags a bypass, green   */
/* otherwise. The contrast note makes the concat↔param difference explicit.    */
/* -------------------------------------------------------------------------- */
function Verdict({
  outcome,
  mode,
  suppliedPw,
}: {
  outcome: QueryOutcome;
  mode: Built["mode"];
  suppliedPw: string;
}) {
  const bypass = outcome.bypass;
  const ok = !bypass;
  const line = bypass
    ? `logged in as ${outcome.loggedInAs} — but the supplied password ${quote(suppliedPw)} is wrong. The payload became SQL and rewrote the WHERE tree.`
    : outcome.loggedIn
      ? `logged in as ${outcome.loggedInAs} with the correct password — a legitimate authentication.`
      : mode === "param"
        ? "no rows: the payload was matched as a literal string against the columns, so it found no account. Same input, handled as data."
        : "no rows: the supplied credentials matched no account.";
  return (
    <div
      className={cx("inj-verdict", bypass ? "is-bypass" : ok && outcome.loggedIn ? "is-auth" : "is-denied")}
      role="status"
      aria-live="polite"
    >
      <div className="inj-verdict-banner">
        <span className="inj-verdict-icon" aria-hidden="true">
          {bypass ? "⚠" : outcome.loggedIn ? "✓" : "⛔"}
        </span>
        <span className="inj-verdict-headline">
          {bypass ? "AUTH BYPASS" : outcome.loggedIn ? "authenticated" : "access denied"}
        </span>
      </div>
      <p className="inj-verdict-note">{line}</p>
    </div>
  );
}

/* --------------------------------- helpers -------------------------------- */
function quote(s: string): string {
  return `'${s}'`;
}
function indent(depth: number): { paddingLeft: string } {
  return { paddingLeft: `${depth * 18}px` };
}
