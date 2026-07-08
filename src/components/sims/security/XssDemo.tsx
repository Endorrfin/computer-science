// [micro] xss-demo (ch.32) — cross-site scripting is SQL injection for the
// browser: untrusted text spliced into a *page* becomes executable markup in
// someone else's session. The fix is symmetric — output-encode it so `<script>`
// renders as the literal text "<script>", not a script element. Purely
// reactive: type a comment (or tap a payload) and flip "Escape output", then
// `analyze(raw, escape)` recomputes via useMemo. This NEVER touches a real DOM:
// the "breach" is a simulated banner driven by the engine's `executes` flag; no
// innerHTML, no eval, ever. Every vector and output string comes from xss.ts.
// Prefix: xss-.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { analyze, PAYLOADS } from "./xss.ts";
import type { XssResult } from "./xss.ts";
import "../../../theme/_p9css/xss-demo.css";

const ACCENT = "#818CF8";

const DEFAULT_RAW = "Great article, thanks!";

export default function XssDemo() {
  const [raw, setRaw] = useState(DEFAULT_RAW);
  const [escape, setEscape] = useState(true);

  const result = useMemo<XssResult>(() => analyze(raw, escape), [raw, escape]);

  function onReset(): void {
    setRaw(DEFAULT_RAW);
    setEscape(true);
  }

  const breached = result.mode === "raw" && result.executes;
  const status =
    `${escape ? "escaped (safe)" : "raw (vulnerable)"} · ` +
    `${result.vectors.length} vector${result.vectors.length === 1 ? "" : "s"} found · ` +
    (breached ? "SCRIPT EXECUTED" : result.mode === "escaped" && result.vectors.length > 0 ? "neutralized" : "inert");

  return (
    <SimShell
      title="XSS demo — escaping turns a payload into inert text"
      simKey="xss-demo"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <label className="xss-toggle ss-field">
          <input
            type="checkbox"
            checked={escape}
            onChange={(e) => setEscape(e.target.checked)}
            aria-label="Escape output before rendering (safe)"
          />
          <span>Escape output (safe)</span>
        </label>
      }
      footer={
        <div className="xss-foot">
          <span className="xss-foot-lbl">quick-fill payloads</span>
          <div className="xss-payloads" role="group" aria-label="Quick-fill comment payloads">
            {PAYLOADS.map((p) => {
              const active = p.raw === raw;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={cx("btn", "xss-payload", active && "btn-primary")}
                  onClick={() => setRaw(p.raw)}
                  aria-pressed={active}
                  title={p.note}
                >
                  <span className="xss-payload-lbl">{p.label}</span>
                  <span className="xss-payload-note">{p.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <div className="xss-stage">
        <label className="xss-input-field">
          <span className="xss-input-lbl">post a comment</span>
          <textarea
            className="xss-input"
            value={raw}
            rows={3}
            spellCheck={false}
            onChange={(e) => setRaw(e.target.value)}
            aria-label="Comment text to post"
            placeholder="write a comment…"
          />
        </label>

        <div className="xss-grid">
          {/* what actually lands in the HTML */}
          <div className="xss-wire-panel">
            <span className="xss-panel-h">
              what lands in the page HTML
              <span className={cx("xss-mode-tag", escape ? "is-safe" : "is-raw")}>
                {escape ? "output-encoded" : "raw insertion"}
              </span>
            </span>
            <pre className="xss-wire" aria-label={`HTML written to the page: ${result.output}`}>
              <code>{result.output || " "}</code>
            </pre>
            <p className="xss-wire-note">
              {escape
                ? "the five HTML metacharacters became entities — the browser draws them as text."
                : "the raw bytes are written straight into the DOM, tags and all."}
            </p>
          </div>

          {/* the mock comment board — where the effect is visible */}
          <div className="xss-board-panel">
            <span className="xss-panel-h">comment board (what a visitor sees)</span>
            <div className="xss-board" aria-label="Rendered comment board">
              <article className="xss-comment">
                <div className="xss-comment-head">
                  <span className="xss-avatar" aria-hidden="true">
                    U
                  </span>
                  <span className="xss-comment-user">a_visitor</span>
                </div>
                {breached ? (
                  // SIMULATED breach — we render an inert mock, never the payload.
                  <div className="xss-breach" role="alert">
                    <span className="xss-breach-icon" aria-hidden="true">
                      ⚠
                    </span>
                    <div className="xss-breach-body">
                      <b>script executed — document.cookie exfiltrated</b>
                      <span className="xss-breach-sub">
                        the comment ran as code in every reader's session (this is a simulation — no
                        real script ran)
                      </span>
                    </div>
                  </div>
                ) : (
                  // Safe: the engine's output is shown as LITERAL text.
                  <p className="xss-comment-body">{result.output || result.displayText}</p>
                )}
              </article>
            </div>
            <p className="xss-board-note">
              {breached
                ? "an active payload inserted raw = stored XSS: it fires for everyone who loads the page."
                : escape
                  ? "encoded, so even <script> shows up as harmless characters."
                  : "plain text with no active markup — nothing to execute."}
            </p>
          </div>
        </div>

        {/* vectors the engine detected in the raw payload */}
        <div className="xss-vectors-panel">
          <span className="xss-panel-h">
            active-markup vectors in the payload
            {result.vectors.length > 0 && (
              <span className="xss-vec-count">{result.vectors.length}</span>
            )}
          </span>
          {result.vectors.length === 0 ? (
            <p className="xss-vectors-empty">none — this comment carries no script-triggering markup.</p>
          ) : (
            <ul className="xss-vectors" aria-label="Detected active-markup vectors">
              {result.vectors.map((v) => (
                <li key={v.pattern} className={cx("xss-vector", escape && "is-defused")}>
                  <code className="xss-vector-pat">{v.pattern}</code>
                  <span className="xss-vector-why">{v.why}</span>
                  <span className={cx("xss-vector-state", escape ? "is-defused" : "is-live")}>
                    {escape ? "defused" : "live"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="xss-lesson">
            Same payload, two fates: inserted raw it runs; output-encoded it's just characters on the
            page. Treat input as data — escape on output — and an active exploit becomes inert text.
          </p>
        </div>
      </div>
    </SimShell>
  );
}
