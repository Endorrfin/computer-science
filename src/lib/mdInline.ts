// Inline markdown tokenizer — pure, erasable-syntax, no React (so the Node
// test runner can import it). Split out of md.tsx after S2 found a crash:
// the old parser shared one module-level /g regex AND recursed for **bold**,
// so the recursive call reset the shared regex's lastIndex and the outer loop
// re-matched forever → infinite loop → renderer OOM ("Aw, Snap!"). The fix is
// a FRESH regex per call (independent lastIndex) + a zero-length-match guard.

export type InlineTok =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "strong"; children: InlineTok[] }
  | { t: "em"; v: string }
  | { t: "link"; text: string; href: string };

// order matters: code, then **bold**, then *italic*, then [text](href)
const INLINE_SRC = "(`[^`]+`)|(\\*\\*[^*]+\\*\\*)|(\\*[^*\\s][^*]*\\*)|\\[([^\\]]+)\\]\\(([^)\\s]+)\\)";

export function tokenizeInline(text: string): InlineTok[] {
  const re = new RegExp(INLINE_SRC, "g"); // fresh instance → recursion-safe lastIndex
  const out: InlineTok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
    if (m[1]) out.push({ t: "code", v: m[1].slice(1, -1) });
    else if (m[2]) out.push({ t: "strong", children: tokenizeInline(m[2].slice(2, -2)) });
    else if (m[3]) out.push({ t: "em", v: m[3].slice(1, -1) });
    else if (m[4] !== undefined && m[5] !== undefined) out.push({ t: "link", text: m[4], href: m[5] });
    last = m.index + m[0].length;
    if (re.lastIndex <= m.index) re.lastIndex = m.index + 1; // never stall on a zero-length match
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

export function isExternal(href: string): boolean {
  return /^https?:/.test(href);
}
