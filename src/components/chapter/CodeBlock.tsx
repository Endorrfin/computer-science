// Dependency-free syntax highlighting — small tokenizer, good enough for
// the guide's short snippets (ts/c/py/asm/sql/pseudo).
import type { ReactNode } from "react";

type Lang = "ts" | "c" | "py" | "asm" | "sql" | "pseudo";

const KEYWORDS: Record<Lang, string[]> = {
  ts: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "type", "interface", "import", "from", "export", "new", "class", "extends", "async", "await", "of", "in", "typeof", "keyof", "readonly", "satisfies", "as", "number", "string", "boolean", "void", "null", "undefined", "true", "false"],
  c: ["int", "char", "void", "return", "if", "else", "for", "while", "struct", "typedef", "unsigned", "signed", "long", "short", "static", "sizeof", "include", "define", "float", "double", "const"],
  py: ["def", "return", "if", "elif", "else", "for", "while", "import", "from", "class", "lambda", "None", "True", "False", "in", "not", "and", "or", "with", "as", "yield", "print", "range", "len"],
  asm: [],
  sql: ["SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "JOIN", "LEFT", "INNER", "ON", "GROUP", "BY", "ORDER", "LIMIT", "CREATE", "TABLE", "INDEX", "PRIMARY", "KEY", "NOT", "NULL", "AND", "OR", "AS", "BEGIN", "COMMIT", "ROLLBACK"],
  pseudo: ["if", "else", "for", "each", "while", "return", "function", "repeat", "until", "then", "do", "end"],
};

const COMMENT: Record<Lang, RegExp> = {
  ts: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/,
  c: /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)/,
  py: /^#[^\n]*/,
  asm: /^;[^\n]*/,
  sql: /^--[^\n]*/,
  pseudo: /^(\/\/|#)[^\n]*/,
};

const STRING_RE = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/;
const NUMBER_RE = /^\b\d[\d_]*(\.\d+)?\b/;
const WORD_RE = /^[A-Za-z_][A-Za-z0-9_]*/;

function tokenize(code: string, lang: Lang): ReactNode[] {
  const out: ReactNode[] = [];
  const kw = new Set(KEYWORDS[lang]);
  let rest = code;
  let plain = "";
  let k = 0;
  const flush = () => {
    if (plain) {
      out.push(plain);
      plain = "";
    }
  };
  while (rest.length > 0) {
    const cm = COMMENT[lang].exec(rest);
    if (cm) {
      flush();
      out.push(<span key={k++} className="tok-comment">{cm[0]}</span>);
      rest = rest.slice(cm[0].length);
      continue;
    }
    const sm = STRING_RE.exec(rest);
    if (sm) {
      flush();
      out.push(<span key={k++} className="tok-string">{sm[0]}</span>);
      rest = rest.slice(sm[0].length);
      continue;
    }
    const nm = NUMBER_RE.exec(rest);
    if (nm) {
      flush();
      out.push(<span key={k++} className="tok-number">{nm[0]}</span>);
      rest = rest.slice(nm[0].length);
      continue;
    }
    const wm = WORD_RE.exec(rest);
    if (wm) {
      const w = wm[0];
      const isKw = lang === "asm" ? /^[A-Z]{2,4}$/.test(w) : kw.has(w) || (lang === "sql" && kw.has(w.toUpperCase()));
      if (isKw) {
        flush();
        out.push(<span key={k++} className="tok-keyword">{w}</span>);
      } else plain += w;
      rest = rest.slice(w.length);
      continue;
    }
    plain += rest[0];
    rest = rest.slice(1);
  }
  flush();
  return out;
}

export default function CodeBlock({ lang, code, note }: { lang: Lang; code: string; note?: string }) {
  return (
    <div className="codeblock">
      <div className="cb-bar">
        <span className="cb-lang">{lang}</span>
        {note && <span className="cb-note">{note}</span>}
      </div>
      <pre>
        <code>{tokenize(code, lang)}</code>
      </pre>
    </div>
  );
}
