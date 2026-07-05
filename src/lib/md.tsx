// Mini-markdown → React. Deliberately tiny and dependency-free: content is
// authored in src/data/* and only needs headings, paragraphs, lists, quotes,
// bold/italic/inline-code and links. React escapes everything by default.
// CHANGED (S3 lint): inline rendering moved to mdRender.tsx so this file
// exports only the <Md> component (react-refresh/only-export-components).
import { renderInline } from "./mdRender.tsx";

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
