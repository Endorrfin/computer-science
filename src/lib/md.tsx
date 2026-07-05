// Mini-markdown → React. Deliberately tiny and dependency-free: content is
// authored in src/data/* and only needs headings, paragraphs, lists, quotes,
// bold/italic/inline-code and links. React escapes everything by default.
import type { ReactNode } from "react";
import { isExternal, tokenizeInline } from "./mdInline.ts";
import type { InlineTok } from "./mdInline.ts";

// CHANGED (S2 hotfix): render pre-tokenized inline nodes. The tokenizer lives
// in mdInline.ts with a fresh regex per call — the old shared /g regex + this
// recursion infinite-looped on any **bold** text and crashed the renderer.
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

type Block =
  | { t: "h2" | "h3" | "p" | "quote"; text: string }
  | { t: "ul" | "ol"; items: string[] };

function toBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ t: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ t: list.ordered ? "ol" : "ul", items: list.items });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (trimmed === "") {
      flushPara();
      flushList();
    } else if (trimmed.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push({ t: "h3", text: trimmed.slice(4) });
    } else if (trimmed.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push({ t: "h2", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("> ")) {
      flushPara();
      flushList();
      blocks.push({ t: "quote", text: trimmed.slice(2) });
    } else if (/^- /.test(trimmed)) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(trimmed.slice(2));
    } else if (/^\d+\. /.test(trimmed)) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(trimmed.replace(/^\d+\. /, ""));
    } else {
      flushList();
      para.push(trimmed);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export function Md({ md }: { md: string }) {
  const blocks = toBlocks(md);
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return <h2 key={i}>{renderInline(b.text)}</h2>;
          case "h3":
            return <h3 key={i}>{renderInline(b.text)}</h3>;
          case "quote":
            return <blockquote key={i}>{renderInline(b.text)}</blockquote>;
          case "ul":
          case "ol": {
            const items = b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>);
            return b.t === "ul" ? <ul key={i}>{items}</ul> : <ol key={i}>{items}</ol>;
          }
          default:
            return <p key={i}>{renderInline(b.text)}</p>;
        }
      })}
    </>
  );
}
