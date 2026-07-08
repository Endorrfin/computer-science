// Engine for ch.32 — the `injection-sandbox` micro. A tiny SQL tokenizer +
// parser for one query family — the login check
//   SELECT * FROM users WHERE name = '<input>' AND pw = '<pw>'
// — built two ways so the AST tells the whole story:
//   • CONCAT: the input is spliced into the SQL *text*, so a payload like
//     ' OR 1=1-- reshapes the WHERE tree (its quote closes the string, OR adds
//     a tautology branch, -- comments the password check away) → auth bypass.
//   • PARAMETERIZED: the SQL text is fixed with ? placeholders; the input rides
//     in a separate params channel as a pure literal, so the tree never changes
//     and the payload is matched as a harmless string → no rows, login fails.
// This is why parameterized queries (not escaping) are the real fix, and why
// Injection stays on the OWASP Top 10 (A05:2025).
//
// Deterministic. Erasable-syntax only.

export type Operand =
  | { kind: "col"; name: string }
  | { kind: "lit"; value: string; numeric: boolean }
  | { kind: "param"; index: number };

export type Where =
  | { kind: "cmp"; left: Operand; op: string; right: Operand }
  | { kind: "and"; left: Where; right: Where }
  | { kind: "or"; left: Where; right: Where };

export type User = { name: string; pw: string };
export const USERS: readonly User[] = [
  { name: "admin", pw: "s3cr3t!" },
  { name: "alice", pw: "hunter2" },
];

// ------------------------------ tokenizer ------------------------------

type Tok =
  | { t: "ident"; v: string }
  | { t: "kw"; v: "AND" | "OR" }
  | { t: "str"; v: string }
  | { t: "num"; v: string }
  | { t: "op"; v: string }
  | { t: "param" };

/** Tokenize a WHERE-clause string. A `--` starts a comment: everything after it
 *  (to end of line) is discarded — exactly how the injection hides the rest. */
function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c === "-" && s[i + 1] === "-") break; // comment → stop
    if (c === "'") {
      let j = i + 1;
      let v = "";
      while (j < s.length && s[j] !== "'") { v += s[j]; j++; }
      toks.push({ t: "str", v });
      i = j < s.length ? j + 1 : j; // skip closing quote if present
      continue;
    }
    if (c === "?") { toks.push({ t: "param" }); i++; continue; }
    if (c >= "0" && c <= "9") {
      let v = "";
      while (i < s.length && s[i] >= "0" && s[i] <= "9") { v += s[i]; i++; }
      toks.push({ t: "num", v });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let v = "";
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) { v += s[i]; i++; }
      const up = v.toUpperCase();
      if (up === "AND" || up === "OR") toks.push({ t: "kw", v: up });
      else toks.push({ t: "ident", v });
      continue;
    }
    if (c === "=" || c === "<" || c === ">" || c === "!") {
      let v = c;
      if (s[i + 1] === "=") { v += "="; i++; }
      toks.push({ t: "op", v });
      i++;
      continue;
    }
    i++; // skip anything unrecognized
  }
  return toks;
}

// ------------------------------- parser --------------------------------
// Precedence (loosest → tightest): OR, AND, comparison.

function toOperand(tok: Tok): Operand {
  if (tok.t === "ident") return { kind: "col", name: tok.v };
  if (tok.t === "str") return { kind: "lit", value: tok.v, numeric: false };
  if (tok.t === "num") return { kind: "lit", value: tok.v, numeric: true };
  return { kind: "col", name: "?" };
}

function parseWhere(toks: Tok[]): Where | null {
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];

  function parseCmp(): Where | null {
    const l = toks[pos];
    if (!l || l.t === "kw" || l.t === "op") return null;
    const opTok = toks[pos + 1];
    const r = toks[pos + 2];
    if (opTok && opTok.t === "op" && r && r.t !== "kw" && r.t !== "op") {
      pos += 3;
      return { kind: "cmp", left: toOperand(l), op: opTok.v, right: toOperand(r) };
    }
    return null;
  }
  function parseAnd(): Where | null {
    let left = parseCmp();
    if (!left) return null;
    while (peek() && peek()!.t === "kw" && (peek() as { v: string }).v === "AND") {
      pos++;
      const right = parseCmp();
      if (!right) break;
      left = { kind: "and", left, right };
    }
    return left;
  }
  function parseOr(): Where | null {
    let left = parseAnd();
    if (!left) return null;
    while (peek() && peek()!.t === "kw" && (peek() as { v: string }).v === "OR") {
      pos++;
      const right = parseAnd();
      if (!right) break;
      left = { kind: "or", left, right };
    }
    return left;
  }
  return parseOr();
}

// ------------------------------ evaluation -----------------------------

function operandValue(o: Operand, row: User, params: readonly string[]): string {
  if (o.kind === "col") return o.name === "name" ? row.name : o.name === "pw" ? row.pw : "";
  if (o.kind === "param") return params[o.index] ?? "";
  return o.value;
}

function evalWhere(w: Where, row: User, params: readonly string[]): boolean {
  if (w.kind === "and") return evalWhere(w.left, row, params) && evalWhere(w.right, row, params);
  if (w.kind === "or") return evalWhere(w.left, row, params) || evalWhere(w.right, row, params);
  const a = operandValue(w.left, row, params);
  const b = operandValue(w.right, row, params);
  return w.op === "=" ? a === b : w.op === "!=" ? a !== b : false;
}

// -------------------------------- build --------------------------------

export type Built = {
  mode: "concat" | "param";
  sql: string; // the SQL as the DB sees it
  ast: Where | null; // parsed WHERE tree
  params: string[]; // the params channel ([] for concat)
  suppliedName: string;
  suppliedPw: string;
};

/** String-concatenation login query — the vulnerable version. */
export function buildConcatQuery(input: string, pw: string): Built {
  const whereStr = `name = '${input}' AND pw = '${pw}'`;
  const sql = `SELECT * FROM users WHERE ${whereStr}`;
  return { mode: "concat", sql, ast: parseWhere(tokenize(whereStr)), params: [], suppliedName: input, suppliedPw: pw };
}

/** Parameterized login query — the safe version. The tree is fixed; input is data. */
export function buildParamQuery(input: string, pw: string): Built {
  const ast: Where = {
    kind: "and",
    left: { kind: "cmp", left: { kind: "col", name: "name" }, op: "=", right: { kind: "param", index: 0 } },
    right: { kind: "cmp", left: { kind: "col", name: "pw" }, op: "=", right: { kind: "param", index: 1 } },
  };
  return { mode: "param", sql: "SELECT * FROM users WHERE name = ? AND pw = ?", ast, params: [input, pw], suppliedName: input, suppliedPw: pw };
}

/** Run the built query against the user table; returns matching rows. */
export function runQuery(built: Built, users: readonly User[] = USERS): User[] {
  if (!built.ast) return [];
  const ast = built.ast;
  return users.filter((row) => evalWhere(ast, row, built.params));
}

export type QueryOutcome = {
  rows: User[];
  loggedIn: boolean; // any row returned
  bypass: boolean; // logged in WITHOUT the correct password
  loggedInAs: string | null;
};

/** The security verdict: did we authenticate, and did we do so without the
 *  right password (i.e., was this an injection bypass)? */
export function evaluate(built: Built, users: readonly User[] = USERS): QueryOutcome {
  const rows = runQuery(built, users);
  const loggedIn = rows.length > 0;
  // Bypass = a returned account whose real password isn't the one supplied.
  const bypass = rows.some((r) => r.pw !== built.suppliedPw);
  return { rows, loggedIn, bypass, loggedInAs: loggedIn ? rows[0].name : null };
}

/** Payloads the sandbox offers as one-tap demos. */
export const PAYLOADS: readonly { label: string; input: string; pw: string; note: string }[] = [
  { label: "Legit login", input: "admin", pw: "s3cr3t!", note: "correct credentials — should succeed either way" },
  { label: "Wrong password", input: "admin", pw: "guess", note: "bad password — should fail either way" },
  { label: "Tautology", input: "' OR 1=1--", pw: "anything", note: "closes the string, adds an always-true branch, comments out the rest" },
  { label: "Comment-out", input: "admin'--", pw: "anything", note: "logs in as admin by commenting away the password check" },
];
