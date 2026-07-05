// KataRunner — the interactive shell for one kata: prompt + TS signature +
// a monospace editor whose contents persist per-kata in localStorage, a Run
// button that executes the tests in the sandboxed, time-boxed Web Worker
// (lib/kataSandbox.ts), a Reset-to-starter button, and a Reveal-solution
// toggle. When every test passes we call `onSolved` so the parent page can
// record it (key style mirrors progress.ts, e.g. `cs:kata-solved`).
//
// This is a .tsx that default-exports a single component; no other exports
// (react-refresh). Kata-specific look is done with inline styles keyed to the
// theme's CSS vars so it renders without any global.css changes; existing
// classes (.btn, .codeblock, .chip, .muted) are reused. Reduced motion is
// honoured — nothing here animates; state changes are instant.
import { useEffect, useRef, useState } from "react";
import type { Kata } from "../../data/katas.ts";
import type { KataResult } from "../../lib/kataSandbox.ts";
import { runKata } from "../../lib/kataSandbox.ts";
import { Md } from "../../lib/md.tsx";
import CodeBlock from "../chapter/CodeBlock.tsx";
import { cx } from "../../lib/utils.ts";

// Per-kata editor buffer. Direct localStorage (no cross-component reactivity
// needed — only this editor reads/writes it). Guarded for private mode.
function editorKey(id: string): string {
  return `cs:kata:${id}`;
}
function loadBuffer(kata: Kata): string {
  try {
    const raw = localStorage.getItem(editorKey(kata.id));
    if (raw !== null) return raw;
  } catch {
    /* private mode — fall through to starter */
  }
  return kata.starter;
}
function saveBuffer(id: string, code: string): void {
  try {
    localStorage.setItem(editorKey(id), code);
  } catch {
    /* private mode — buffer stays in memory only */
  }
}

export default function KataRunner({
  kata,
  solved,
  onSolved,
}: {
  kata: Kata;
  solved: boolean;
  onSolved?: () => void;
}) {
  const [code, setCode] = useState<string>(() => loadBuffer(kata));
  const [result, setResult] = useState<KataResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  // Guard against a slow worker resolving after the user switched katas.
  const runToken = useRef(0);

  // Re-seed the editor + clear transient UI when the selected kata changes.
  useEffect(() => {
    setCode(loadBuffer(kata));
    setResult(null);
    setShowSolution(false);
    setRunning(false);
    runToken.current++;
  }, [kata]);

  function updateCode(next: string): void {
    setCode(next);
    saveBuffer(kata.id, next);
  }

  async function run(): Promise<void> {
    setRunning(true);
    setResult(null);
    const token = ++runToken.current;
    const r = await runKata(code, kata.tests);
    if (token !== runToken.current) return; // superseded by a newer run / kata switch
    setResult(r);
    setRunning(false);
    if (r.ok && onSolved) onSolved();
  }

  function reset(): void {
    updateCode(kata.starter);
    setResult(null);
  }

  const passCount = result ? result.cases.filter((c) => c.ok).length : 0;
  const totalCount = kata.tests.length;

  return (
    <section className="kata-runner" aria-label={`Kata: ${kata.title}`}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{kata.title}</h2>
        <span className="chip" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          {kata.difficulty}
        </span>
        {solved && (
          <span
            className="kata-solved-badge"
            style={{ color: "var(--sem-ok)", fontWeight: 600, fontSize: 14 }}
          >
            ✓ solved
          </span>
        )}
      </header>

      {/* Prompt — rendered by the shared markdown renderer, never hand-rolled. */}
      <div className="kata-prompt" style={{ marginTop: 4 }}>
        <Md md={kata.prompt} />
      </div>

      {/* Teaching signature (TypeScript). Runnable code is JS; this is the intent. */}
      <p className="muted" style={{ fontSize: 13, margin: "16px 0 -8px" }}>
        Signature (TypeScript — for reference; write plain JavaScript below):
      </p>
      <CodeBlock lang="ts" code={kata.signature} note="teaching signature" />

      {/* Editor */}
      <label htmlFor={`kata-editor-${kata.id}`} className="muted" style={{ fontSize: 13 }}>
        Your solution (JavaScript) — define <code>{kata.exportName}</code>:
      </label>
      <textarea
        id={`kata-editor-${kata.id}`}
        className="kata-editor"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        wrap="off"
        value={code}
        onChange={(e) => updateCode(e.target.value)}
        aria-label={`Code editor for ${kata.title}`}
        style={{
          display: "block",
          width: "100%",
          minHeight: 220,
          marginTop: 6,
          padding: "12px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--tx)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-s)",
          resize: "vertical",
          tabSize: 2,
        }}
      />

      {/* Controls */}
      <div
        className="kata-actions"
        style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}
      >
        <button type="button" className="btn btn-primary" onClick={run} disabled={running}>
          {running ? "Running…" : "▶ Run tests"}
        </button>
        <button type="button" className="btn" onClick={reset} disabled={running}>
          ↺ Reset to starter
        </button>
        <button
          type="button"
          className={cx("btn", showSolution && "btn-done")}
          onClick={() => setShowSolution((s) => !s)}
          aria-pressed={showSolution}
        >
          {showSolution ? "Hide solution" : "Reveal solution"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="kata-results" aria-live="polite" style={{ marginTop: 16 }}>
          <div
            className="kata-verdict"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "8px 12px",
              borderRadius: "var(--r-s)",
              border: "1px solid",
              borderColor: result.ok ? "var(--sem-ok)" : "var(--sem-err)",
              background: result.ok
                ? "color-mix(in srgb, var(--sem-ok) 12%, var(--surface))"
                : "color-mix(in srgb, var(--sem-err) 10%, var(--surface))",
              color: result.ok ? "var(--sem-ok)" : "var(--sem-err)",
              fontWeight: 600,
            }}
          >
            {result.timedOut ? (
              <span>⏱ Timed out — probable infinite loop</span>
            ) : result.ok ? (
              <span>✓ All {totalCount} tests passed</span>
            ) : (
              <span>
                ✗ {passCount} / {totalCount} tests passed
              </span>
            )}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12.5 }}>
              {result.durationMs} ms
            </span>
          </div>

          {result.error && (
            <p
              className="kata-error"
              style={{
                margin: "10px 0 0",
                padding: "8px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                color: "var(--sem-err)",
                background: "color-mix(in srgb, var(--sem-err) 6%, var(--surface))",
                borderLeft: "3px solid var(--sem-err)",
                borderRadius: "0 var(--r-s) var(--r-s) 0",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.error}
            </p>
          )}

          <ul
            className="kata-caselist"
            style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}
          >
            {result.cases.map((c, i) => (
              <li
                key={i}
                className={cx("kata-case", c.ok ? "ok" : "fail")}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                  padding: "6px 12px",
                  borderRadius: "var(--r-s)",
                  borderLeft: `3px solid ${c.ok ? "var(--sem-ok)" : "var(--sem-err)"}`,
                  background: "var(--s2)",
                  marginBottom: 6,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ color: c.ok ? "var(--sem-ok)" : "var(--sem-err)", fontWeight: 700 }}
                >
                  {c.ok ? "✓" : "✗"}
                </span>
                <span style={{ flex: 1 }}>
                  <span>{c.name}</span>
                  {!c.ok && c.error && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--sem-err)",
                      }}
                    >
                      {c.error}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reference solution (read-only) */}
      {showSolution && (
        <div className="kata-solution" style={{ marginTop: 16 }}>
          <p className="muted" style={{ fontSize: 13, margin: "0 0 -8px" }}>
            Reference solution (one correct approach; yours may differ):
          </p>
          <CodeBlock lang="ts" code={kata.solution} note="reference · read-only" />
        </div>
      )}
    </section>
  );
}
