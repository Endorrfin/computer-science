// Renders one content Section (types.ts) — the switchboard between the
// data contract and the component library. Sims/figures resolve lazily
// through the registry so chapters only ship what they use.
import { Suspense } from "react";
import type { Section } from "../../lib/types.ts";
import { getFig, getSim } from "../../lib/registry.tsx";
import { quizById } from "../../data/quizzes.ts";
import { Md } from "../../lib/md.tsx";
import CodeBlock from "./CodeBlock.tsx";
import PredictQuiz from "../study/PredictQuiz.tsx";

const TONE_META = {
  tip: { icon: "💡", label: "tip" },
  warn: { icon: "⚠️", label: "careful" },
  senior: { icon: "🔬", label: "senior lens" },
  story: { icon: "📜", label: "story" },
} as const;

function Loading({ what }: { what: string }) {
  return <div className="sim-loading">loading {what}…</div>;
}
function MissingKey({ kind, k }: { kind: string; k: string }) {
  // qa gate makes this unreachable in CI; keep a loud dev-time fallback.
  return (
    <div className="callout tone-warn">
      <strong>missing {kind}:</strong> <code>{k}</code>
    </div>
  );
}

export default function SectionView({ section, accent }: { section: Section; accent: string }) {
  switch (section.kind) {
    case "prose":
      return (
        <div className="prose">
          <Md md={section.md} />
        </div>
      );

    case "figure": {
      const Fig = getFig(section.fig);
      if (!Fig) return <MissingKey kind="figure" k={section.fig} />;
      return (
        <div className="figure-block">
          <Suspense fallback={<Loading what={section.fig} />}>
            <Fig />
          </Suspense>
          {section.caption && <p className="fig-extra-caption">{section.caption}</p>}
        </div>
      );
    }

    case "sim": {
      const Sim = getSim(section.sim);
      if (!Sim) return <MissingKey kind="sim" k={section.sim} />;
      return (
        <Suspense fallback={<Loading what={section.sim} />}>
          <Sim />
        </Suspense>
      );
    }

    case "table":
      return (
        <div className="datatable-wrap">
          <table className="datatable">
            <thead>
              <tr>
                {section.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {section.caption && <p className="table-caption">{section.caption}</p>}
        </div>
      );

    case "code":
      return <CodeBlock lang={section.lang} code={section.code} note={section.note} />;

    case "callout": {
      const meta = TONE_META[section.tone];
      return (
        <aside className={`callout tone-${section.tone}`}>
          <div className="callout-head">
            <span aria-hidden="true">{meta.icon}</span>
            <span className="callout-label">{meta.label}</span>
            <strong className="callout-title">{section.title}</strong>
          </div>
          <Md md={section.md} />
        </aside>
      );
    }

    case "formal":
      return (
        <details className="formal">
          <summary>
            <span aria-hidden="true">∑</span> {section.title}
          </summary>
          <div className="formal-body">
            <Md md={section.md} />
          </div>
        </details>
      );

    case "quiz": {
      const quiz = quizById(section.quiz);
      if (!quiz) return <MissingKey kind="quiz" k={section.quiz} />;
      return <PredictQuiz quiz={quiz} accent={accent} />;
    }

    case "compare":
      return (
        <div className="datatable-wrap">
          <table className="datatable compare">
            <thead>
              <tr>
                <th />
                <th>{section.a}</th>
                <th>{section.b}</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map(([label, av, bv], i) => (
                <tr key={i}>
                  <th scope="row">{label}</th>
                  <td>{av}</td>
                  <td>{bv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
