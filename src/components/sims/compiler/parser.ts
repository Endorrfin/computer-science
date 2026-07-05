// P3 · the compiler front-end, stage 2 — the PARSER, and the AST it builds.
// Pure, erasable-syntax only. Powers the second pane of the compiler-pipeline
// HERO (the tree that grows as you type) and the `find-parse-error` quiz.
//
// The lexer gave us a flat list of tokens; the parser gives that list STRUCTURE.
// It reads tokens left-to-right following the language's grammar and builds an
// Abstract Syntax Tree (AST): a tree where `2 + 3 * 4` becomes (+ 2 (* 3 4)),
// so the tree ITSELF encodes that × binds tighter than +. The AST is the shape
// every later stage walks — it's the real "meaning skeleton" of the program.
//
// Technique: recursive descent with precedence climbing. One function per
// grammar rule; lower-precedence rules call higher-precedence ones, so the call
// stack (ch.10!) mirrors the grammar. When a token doesn't fit, we throw a
// SyntaxError_ that points at the exact spot.

import { describe, SyntaxError_ } from "./lexer.ts";
import type { Token, TokType } from "./lexer.ts";

// ---- AST node shapes --------------------------------------------------------

export type UnaryOp = "-" | "not";
export type BinOp =
  | "+" | "-" | "*" | "/" | "%"
  | "==" | "!=" | "<" | "<=" | ">" | ">="
  | "and" | "or";

export type Expr =
  | { kind: "num"; value: number; tok: Token }
  | { kind: "bool"; value: boolean; tok: Token }
  | { kind: "var"; name: string; tok: Token }
  | { kind: "unary"; op: UnaryOp; operand: Expr; tok: Token }
  | { kind: "binary"; op: BinOp; left: Expr; right: Expr; tok: Token };

export type Stmt =
  | { kind: "let"; name: string; expr: Expr; tok: Token }
  | { kind: "assign"; name: string; expr: Expr; tok: Token }
  | { kind: "print"; expr: Expr; tok: Token }
  | { kind: "while"; cond: Expr; body: Stmt[]; tok: Token }
  | { kind: "if"; cond: Expr; then: Stmt[]; els: Stmt[] | null; tok: Token };

export type Program = { body: Stmt[] };

// ---- the parser -------------------------------------------------------------

class Parser {
  private toks: Token[];
  private i = 0;
  constructor(toks: Token[]) {
    this.toks = toks;
  }

  private peek(ahead = 0): Token {
    return this.toks[Math.min(this.i + ahead, this.toks.length - 1)];
  }
  private next(): Token {
    return this.toks[this.i++];
  }
  private isOp(value: string, ahead = 0): boolean {
    const t = this.peek(ahead);
    return t.type === "op" && t.value === value;
  }
  private isKw(value: string, ahead = 0): boolean {
    const t = this.peek(ahead);
    return t.type === "kw" && t.value === value;
  }
  private expect(type: TokType, what: string): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new SyntaxError_(`Expected ${what}, but found ${describe(t)}`, t, "parse");
    }
    return this.next();
  }
  private expectOp(value: string, what: string): Token {
    if (!this.isOp(value)) {
      const t = this.peek();
      throw new SyntaxError_(`Expected ${what}, but found ${describe(t)}`, t, "parse");
    }
    return this.next();
  }

  // program := statement* EOF
  parseProgram(): Program {
    const body: Stmt[] = [];
    while (this.peek().type !== "eof") body.push(this.statement());
    return { body };
  }

  // statement := let | assign | print | while | if
  private statement(): Stmt {
    if (this.isKw("let")) return this.letStmt();
    if (this.isKw("print")) return this.printStmt();
    if (this.isKw("while")) return this.whileStmt();
    if (this.isKw("if")) return this.ifStmt();
    if (this.peek().type === "ident") return this.assignStmt();

    const t = this.peek();
    if (this.isKw("else")) throw new SyntaxError_(`"else" without a matching "if"`, t, "parse");
    throw new SyntaxError_(`Expected a statement (let, print, while, if, or an assignment), but found ${describe(t)}`, t, "parse");
  }

  private block(): Stmt[] {
    this.expect("lbrace", `"{" to open a block`);
    const body: Stmt[] = [];
    while (this.peek().type !== "rbrace" && this.peek().type !== "eof") body.push(this.statement());
    this.expect("rbrace", `"}" to close the block`);
    return body;
  }

  private letStmt(): Stmt {
    const kw = this.next(); // 'let'
    const name = this.expect("ident", "a variable name after 'let'");
    this.expectOp("=", `"=" after "let ${name.value}"`);
    const expr = this.expression();
    this.expect("semi", `";" after the let statement`);
    return { kind: "let", name: name.value, expr, tok: kw };
  }

  private assignStmt(): Stmt {
    const name = this.next(); // ident
    if (!this.isOp("=")) {
      throw new SyntaxError_(
        `Unexpected ${describe(name)} at the start of a statement — did you mean "${name.value} = …;" or "print ${name.value};"?`,
        this.peek(),
        "parse",
      );
    }
    this.next(); // '='
    const expr = this.expression();
    this.expect("semi", `";" after the assignment`);
    return { kind: "assign", name: name.value, expr, tok: name };
  }

  private printStmt(): Stmt {
    const kw = this.next(); // 'print'
    const expr = this.expression();
    this.expect("semi", `";" after the print statement`);
    return { kind: "print", expr, tok: kw };
  }

  private whileStmt(): Stmt {
    const kw = this.next(); // 'while'
    this.expect("lparen", `"(" after "while"`);
    const cond = this.expression();
    this.expect("rparen", `")" to close the while condition`);
    const body = this.block();
    return { kind: "while", cond, body, tok: kw };
  }

  private ifStmt(): Stmt {
    const kw = this.next(); // 'if'
    this.expect("lparen", `"(" after "if"`);
    const cond = this.expression();
    this.expect("rparen", `")" to close the if condition`);
    const then = this.block();
    let els: Stmt[] | null = null;
    if (this.isKw("else")) {
      this.next();
      els = this.block();
    }
    return { kind: "if", cond, then, els, tok: kw };
  }

  // expression grammar, lowest precedence (or) to highest (unary/primary).
  // Each rule folds a left-associative chain of the operators at its level.
  private expression(): Expr {
    return this.or();
  }
  private or(): Expr {
    let left = this.and();
    while (this.isKw("or")) {
      const tok = this.next();
      left = { kind: "binary", op: "or", left, right: this.and(), tok };
    }
    return left;
  }
  private and(): Expr {
    let left = this.equality();
    while (this.isKw("and")) {
      const tok = this.next();
      left = { kind: "binary", op: "and", left, right: this.equality(), tok };
    }
    return left;
  }
  private equality(): Expr {
    let left = this.comparison();
    while (this.isOp("==") || this.isOp("!=")) {
      const tok = this.next();
      left = { kind: "binary", op: tok.value as BinOp, left, right: this.comparison(), tok };
    }
    return left;
  }
  private comparison(): Expr {
    let left = this.term();
    while (this.isOp("<") || this.isOp("<=") || this.isOp(">") || this.isOp(">=")) {
      const tok = this.next();
      left = { kind: "binary", op: tok.value as BinOp, left, right: this.term(), tok };
    }
    return left;
  }
  private term(): Expr {
    let left = this.factor();
    while (this.isOp("+") || this.isOp("-")) {
      const tok = this.next();
      left = { kind: "binary", op: tok.value as BinOp, left, right: this.factor(), tok };
    }
    return left;
  }
  private factor(): Expr {
    let left = this.unary();
    while (this.isOp("*") || this.isOp("/") || this.isOp("%")) {
      const tok = this.next();
      left = { kind: "binary", op: tok.value as BinOp, left, right: this.unary(), tok };
    }
    return left;
  }
  private unary(): Expr {
    if (this.isKw("not") || this.isOp("-")) {
      const tok = this.next();
      const op: UnaryOp = tok.value === "not" ? "not" : "-";
      return { kind: "unary", op, operand: this.unary(), tok };
    }
    return this.primary();
  }
  private primary(): Expr {
    const t = this.peek();
    if (t.type === "num") {
      this.next();
      return { kind: "num", value: parseInt(t.value, 10), tok: t };
    }
    if (this.isKw("true") || this.isKw("false")) {
      this.next();
      return { kind: "bool", value: t.value === "true", tok: t };
    }
    if (t.type === "ident") {
      this.next();
      return { kind: "var", name: t.value, tok: t };
    }
    if (t.type === "lparen") {
      this.next();
      const inner = this.expression();
      this.expect("rparen", `")" to close the group`);
      return inner; // grouping needs no node — the tree already nests correctly
    }
    throw new SyntaxError_(`Expected a value (a number, a variable, or "("), but found ${describe(t)}`, t, "parse");
  }
}

/** Parse a token list into an AST. Throws SyntaxError_ (stage "parse") on the
    first structural problem, positioned at the offending token. */
export function parse(toks: Token[]): Program {
  return new Parser(toks).parseProgram();
}

// ---- helpers used by the sim's AST pane + tests -----------------------------

/** Does the program contain a `while` loop anywhere? (Boss check: "use a loop".)
    A top-level `while` returns immediately; nested ones are found by descending
    into `if` branches. */
export function usesWhile(prog: Program): boolean {
  const walk = (stmts: Stmt[]): boolean => {
    for (const s of stmts) {
      if (s.kind === "while") return true;
      if (s.kind === "if" && (walk(s.then) || (s.els !== null && walk(s.els)))) return true;
    }
    return false;
  };
  return walk(prog.body);
}

/** Does the program declare at least one variable with `let`? */
export function declaresVar(prog: Program): boolean {
  const walk = (stmts: Stmt[]): boolean => {
    for (const s of stmts) {
      if (s.kind === "let") return true;
      if (s.kind === "while" && walk(s.body)) return true;
      if (s.kind === "if" && (walk(s.then) || (s.els !== null && walk(s.els)))) return true;
    }
    return false;
  };
  return walk(prog.body);
}
