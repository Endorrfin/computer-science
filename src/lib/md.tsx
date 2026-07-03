// Mini-markdown → React. Deliberately tiny and dependency-free: content is
// authored in src/data/* and only needs headings, paragraphs, lists, quotes,
// bold/italic/inline-code and links. React escapes everything by default.
import type { ReactNode } from "react";

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<code key={k++}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k++}>{renderInline(m[2].slice(2, -2))}</strong>);
    else if (m[3]) out.push(<em key={k++}>{m[3].slice(1, -1)}</em>);
    else if (m[4] !== undefined && m[5] !== undefined) {
      const ext = /^https?:/.test(m[5]);
      out.push(
        <a key={k++} href={m[5]} target={ext ? "_blank" : undefined} rel={ext ? "noreferrer" : undefined}>
          {m[4]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
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
