// Inline markdown token → React nodes. Split out of md.tsx so md.tsx exports
// only the <Md> component (react-refresh rule: components OR helpers, not both).
// The tokenizer itself lives in mdInline.ts with a fresh regex per call — the
// S2 hotfix that fixed the render-time infinite loop.
import type { ReactNode } from "react";
import { isExternal, tokenizeInline } from "./mdInline.ts";
import type { InlineTok } from "./mdInline.ts";

function renderTok(tok: InlineTok, key: number): ReactNode {
  switch (tok.t) {
    case "text":
      return tok.v;
    case "code":
      return <code key={key}>{tok.v}</code>;
    case "strong":
      return <strong key={key}>{tok.children.map((c, i) => renderTok(c, i))}</strong>;
    case "em":
      return <em key={key}>{tok.v}</em>;
    case "link": {
      const ext = isExternal(tok.href);
      return (
        <a key={key} href={tok.href} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
          {tok.text}
        </a>
      );
    }
  }
}

export function renderInline(text: string): ReactNode[] {
  return tokenizeInline(text).map((tok, i) => renderTok(tok, i));
}
