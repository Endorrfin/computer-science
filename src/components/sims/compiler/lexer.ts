// P3 · the compiler front-end, stage 1 — the LEXER (a.k.a. scanner/tokenizer).
// Pure, framework-free, erasable-syntax only (runs in Node under
// --experimental-strip-types for the qa gate + test-p3.ts). Powers the first
// pane of the ch.11 compiler-pipeline HERO.
//
// A lexer turns a flat string of characters into a flat list of TOKENS — the
// language's "words". It knows nothing about grammar; it only groups characters
// into meaningful chunks (a number, an identifier, the operator `<=`) and throws
// away whitespace and comments. Every token remembers WHERE it came from (line +
// column) so later stages can point at the exact spot when something is wrong.
//
// This is the same job the ch.2 UTF-8 decoder did at the byte level — group a
// stream into units — one level up: group characters into tokens.

export type TokType =
  | "num" // an integer literal, e.g. 42
  | "ident" // a variable name, e.g. total
  | "kw" // a reserved keyword, e.g. while (value holds which one)
  | "op" // an operator, e.g. + or <= (value holds which one)
  | "lparen" // (
  | "rparen" // )
  | "lbrace" // {
  | "rbrace" // }
  | "semi" // ;
  | "eof"; // end of input — a sentinel so the parser always has a token to read

export type Token = {
  type: TokType;
  value: string; // the exact lexeme ("42", "total", "<=", "while")
  pos: number; // 0-based char index of the first character
  line: number; // 1-based line
  col: number; // 1-based column
};

// The reserved words. An identifier that matches one of these lexes as a `kw`
// instead of an `ident`, which is how `while` stops being a possible variable.
export const KEYWORDS = ["let", "print", "while", "if", "else", "and", "or", "not", "true", "false"] as const;
export type Keyword = (typeof KEYWORDS)[number];
const KEYWORD_SET = new Set<string>(KEYWORDS);

// Multi-character operators must be tried before their single-char prefixes,
// so `<=` is one token, not `<` then `=`. Order matters here.
const TWO_CHAR_OPS = ["==", "!=", "<=", ">="];
const ONE_CHAR_OPS = "+-*/%=<>";

/** A lexing/parsing failure carrying a source position, so the UI can point at
    the exact character. Thrown by the lexer and parser; caught in lang.ts. */
export class SyntaxError_ extends Error {
  pos: number;
  line: number;
  col: number;
  stage: "lex" | "parse" | "compile"; // codegen reuses this class for name errors
  constructor(message: string, tok: { pos: number; line: number; col: number }, stage: "lex" | "parse") {
    super(message);
    this.name = "SyntaxError";
    this.pos = tok.pos;
    this.line = tok.line;
    this.col = tok.col;
    this.stage = stage;
  }
}

const isDigit = (c: string): boolean => c >= "0" && c <= "9";
const isAlpha = (c: string): boolean => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
const isAlphaNum = (c: string): boolean => isDigit(c) || isAlpha(c);

/** Tokenize source into a list of tokens, always ending in a single `eof`.
    Throws SyntaxError_ on an illegal character (with its exact position). */
export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const here = () => ({ pos: i, line, col });
  const advance = (): string => {
    const c = source[i++];
    if (c === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return c;
  };

  while (i < source.length) {
    const c = source[i];

    // whitespace — skip
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      advance();
      continue;
    }

    // line comment: // ... to end of line
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") advance();
      continue;
    }

    const start = here();

    // number — a run of digits (integers only; this language has no floats)
    if (isDigit(c)) {
      let text = "";
      while (i < source.length && isDigit(source[i])) text += advance();
      tokens.push({ type: "num", value: text, ...start });
      continue;
    }

    // identifier or keyword — letter/underscore then letters/digits/underscores
    if (isAlpha(c)) {
      let text = "";
      while (i < source.length && isAlphaNum(source[i])) text += advance();
      tokens.push({ type: KEYWORD_SET.has(text) ? "kw" : "ident", value: text, ...start });
      continue;
    }

    // punctuation with its own token type (keeps the parser readable)
    if (c === "(") { advance(); tokens.push({ type: "lparen", value: "(", ...start }); continue; }
    if (c === ")") { advance(); tokens.push({ type: "rparen", value: ")", ...start }); continue; }
    if (c === "{") { advance(); tokens.push({ type: "lbrace", value: "{", ...start }); continue; }
    if (c === "}") { advance(); tokens.push({ type: "rbrace", value: "}", ...start }); continue; }
    if (c === ";") { advance(); tokens.push({ type: "semi", value: ";", ...start }); continue; }

    // two-char operators before one-char ones (== != <= >=)
    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      advance();
      advance();
      tokens.push({ type: "op", value: two, ...start });
      continue;
    }
    if (ONE_CHAR_OPS.includes(c)) {
      advance();
      tokens.push({ type: "op", value: c, ...start });
      continue;
    }

    // a lone `!` (not `!=`) is a common mistake — name it precisely
    if (c === "!") {
      throw new SyntaxError_(`Unexpected "!" — did you mean "!=" (not-equal), or the keyword "not"?`, start, "lex");
    }
    throw new SyntaxError_(`Unexpected character "${c}"`, start, "lex");
  }

  tokens.push({ type: "eof", value: "", pos: i, line, col });
  return tokens;
}

/** Human label for a token, used in error messages ("expected ';', found '}'"). */
export function describe(tok: Token): string {
  if (tok.type === "eof") return "end of input";
  return `"${tok.value}"`;
}
