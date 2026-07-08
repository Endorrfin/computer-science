// Pure engine — propositional logic for ch.0b (Math toolkit): parse a boolean
// expression over single-letter variables and the connectives ¬ ∧ ∨ → ↔, then
// build its full truth table and classify it as a tautology, a contradiction,
// or a contingency. Also decides logical EQUIVALENCE of two expressions (the
// machinery behind De Morgan, and the semantics of the ch.4 logic gates).
//
// Grammar (precedence high → low), parens override:
//   iff  := imp ( <-> imp )*            left-associative
//   imp  := or  ( -> imp )?             right-associative
//   or   := and ( ∨ and )*
//   and  := not ( ∧ not )*
//   not  := ¬ not | atom
//   atom := ( iff ) | var | const
// Accepts ASCII and unicode operators, plus word forms (and/or/not/implies/iff).
// Erasable-syntax only; imported by scripts/test-ch0b.ts via strip-types.

export type Ast =
  | { t: "var"; name: string }
  | { t: "const"; value: boolean }
  | { t: "not"; a: Ast }
  | { t: "and"; a: Ast; b: Ast }
  | { t: "or"; a: Ast; b: Ast }
  | { t: "imp"; a: Ast; b: Ast }
  | { t: "iff"; a: Ast; b: Ast };

type Tok =
  | { k: "var"; v: string }
  | { k: "const"; v: boolean }
  | { k: "not" }
  | { k: "and" }
  | { k: "or" }
  | { k: "imp" }
  | { k: "iff" }
  | { k: "lp" }
  | { k: "rp" };

// --- tokenizer ---------------------------------------------------------------
const WORDS: Record<string, Tok> = {
  not: { k: "not" },
  and: { k: "and" },
  or: { k: "or" },
  implies: { k: "imp" },
  iff: { k: "iff" },
  true: { k: "const", v: true },
  false: { k: "const", v: false },
};

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = src;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    // multi-char symbols first
    if (s.startsWith("<->", i) || s.startsWith("<=>", i)) {
      toks.push({ k: "iff" });
      i += 3;
      continue;
    }
    if (s.startsWith("->", i) || s.startsWith("=>", i)) {
      toks.push({ k: "imp" });
      i += 2;
      continue;
    }
    if (s.startsWith("&&", i)) {
      toks.push({ k: "and" });
      i += 2;
      continue;
    }
    if (s.startsWith("||", i)) {
      toks.push({ k: "or" });
      i += 2;
      continue;
    }
    // single-char symbols
    if (c === "¬" || c === "~" || c === "!") {
      toks.push({ k: "not" });
      i++;
      continue;
    }
    if (c === "∧" || c === "&" || c === "*" || c === "·") {
      toks.push({ k: "and" });
      i++;
      continue;
    }
    if (c === "∨" || c === "|" || c === "+") {
      toks.push({ k: "or" });
      i++;
      continue;
    }
    if (c === "→" || c === "⊃") {
      toks.push({ k: "imp" });
      i++;
      continue;
    }
    if (c === "↔" || c === "≡") {
      toks.push({ k: "iff" });
      i++;
      continue;
    }
    if (c === "(" || c === "[") {
      toks.push({ k: "lp" });
      i++;
      continue;
    }
    if (c === ")" || c === "]") {
      toks.push({ k: "rp" });
      i++;
      continue;
    }
    // constants written as 1/0 or ⊤/⊥
    if (c === "1" || c === "⊤") {
      toks.push({ k: "const", v: true });
      i++;
      continue;
    }
    if (c === "0" || c === "⊥") {
      toks.push({ k: "const", v: false });
      i++;
      continue;
    }
    // words / identifiers (letters only)
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const word = s.slice(i, j);
      const lower = word.toLowerCase();
      if (lower in WORDS) {
        toks.push(WORDS[lower]);
      } else if (word.length === 1) {
        // constant letters T / F, else a variable
        if (word === "T") toks.push({ k: "const", v: true });
        else if (word === "F") toks.push({ k: "const", v: false });
        else toks.push({ k: "var", v: word });
      } else {
        throw new Error(`unknown token "${word}" — variables are single letters`);
      }
      i = j;
      continue;
    }
    throw new Error(`unexpected character "${c}"`);
  }
  return toks;
}

// --- parser (recursive descent) ----------------------------------------------
export function parse(src: string): Ast {
  const toks = tokenize(src);
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];
  const eat = (k: Tok["k"]): Tok => {
    const t = toks[pos];
    if (!t || t.k !== k) throw new Error(`expected ${k} at token ${pos}`);
    pos++;
    return t;
  };

  function parseIff(): Ast {
    let node = parseImp();
    while (peek() && peek()!.k === "iff") {
      pos++;
      node = { t: "iff", a: node, b: parseImp() };
    }
    return node;
  }
  function parseImp(): Ast {
    const left = parseOr();
    if (peek() && peek()!.k === "imp") {
      pos++;
      return { t: "imp", a: left, b: parseImp() }; // right-associative
    }
    return left;
  }
  function parseOr(): Ast {
    let node = parseAnd();
    while (peek() && peek()!.k === "or") {
      pos++;
      node = { t: "or", a: node, b: parseAnd() };
    }
    return node;
  }
  function parseAnd(): Ast {
    let node = parseNot();
    while (peek() && peek()!.k === "and") {
      pos++;
      node = { t: "and", a: node, b: parseNot() };
    }
    return node;
  }
  function parseNot(): Ast {
    if (peek() && peek()!.k === "not") {
      pos++;
      return { t: "not", a: parseNot() };
    }
    return parseAtom();
  }
  function parseAtom(): Ast {
    const t = peek();
    if (!t) throw new Error("unexpected end of expression");
    if (t.k === "lp") {
      eat("lp");
      const inner = parseIff();
      eat("rp");
      return inner;
    }
    if (t.k === "var") {
      pos++;
      return { t: "var", name: t.v };
    }
    if (t.k === "const") {
      pos++;
      return { t: "const", value: t.v };
    }
    throw new Error(`unexpected token ${t.k}`);
  }

  const ast = parseIff();
  if (pos !== toks.length) throw new Error(`trailing tokens after position ${pos}`);
  return ast;
}

// --- evaluation --------------------------------------------------------------
export function evaluate(ast: Ast, env: Record<string, boolean>): boolean {
  switch (ast.t) {
    case "var": {
      if (!(ast.name in env)) throw new Error(`unbound variable ${ast.name}`);
      return env[ast.name];
    }
    case "const":
      return ast.value;
    case "not":
      return !evaluate(ast.a, env);
    case "and":
      return evaluate(ast.a, env) && evaluate(ast.b, env);
    case "or":
      return evaluate(ast.a, env) || evaluate(ast.b, env);
    case "imp":
      return !evaluate(ast.a, env) || evaluate(ast.b, env);
    case "iff":
      return evaluate(ast.a, env) === evaluate(ast.b, env);
  }
}

/** Variables used, in first-appearance order made deterministic (sorted). */
export function variables(ast: Ast): string[] {
  const set = new Set<string>();
  const walk = (n: Ast): void => {
    if (n.t === "var") set.add(n.name);
    else if (n.t === "not") walk(n.a);
    else if (n.t === "and" || n.t === "or" || n.t === "imp" || n.t === "iff") {
      walk(n.a);
      walk(n.b);
    }
  };
  walk(ast);
  return [...set].sort();
}

export type TruthRow = { assignment: Record<string, boolean>; value: boolean };
export type Classification = "tautology" | "contradiction" | "contingency";
export type TruthTable = {
  variables: string[];
  rows: TruthRow[];
  classification: Classification;
};

/** Full truth table over all 2^v assignments (v = number of variables).
    Guards against blow-up: caps at 10 variables (1024 rows). */
export function truthTable(src: string): TruthTable {
  const ast = parse(src);
  const vars = variables(ast);
  if (vars.length > 10) throw new Error("too many variables (max 10)");
  const rows: TruthRow[] = [];
  let anyTrue = false;
  let anyFalse = false;
  const total = 1 << vars.length;
  // Descend so the first row is all-true (T,T,…) down to all-false (F,F,…),
  // the conventional truth-table order; MSB of the mask = the first variable.
  for (let mask = total - 1; mask >= 0; mask--) {
    const assignment: Record<string, boolean> = {};
    for (let b = 0; b < vars.length; b++) {
      assignment[vars[b]] = (mask & (1 << (vars.length - 1 - b))) !== 0;
    }
    const value = evaluate(ast, assignment);
    if (value) anyTrue = true;
    else anyFalse = true;
    rows.push({ assignment, value });
  }
  const classification: Classification = !anyFalse ? "tautology" : !anyTrue ? "contradiction" : "contingency";
  return { variables: vars, rows, classification };
}

/** Are two expressions logically equivalent (same value on every assignment
    of the union of their variables)? This is `⊢ a ↔ b` decided by table. */
export function equivalent(srcA: string, srcB: string): boolean {
  const a = parse(srcA);
  const b = parse(srcB);
  const vars = [...new Set([...variables(a), ...variables(b)])].sort();
  const total = 1 << vars.length;
  for (let mask = 0; mask < total; mask++) {
    const env: Record<string, boolean> = {};
    for (let i = 0; i < vars.length; i++) env[vars[i]] = (mask & (1 << i)) !== 0;
    if (evaluate(a, env) !== evaluate(b, env)) return false;
  }
  return true;
}
