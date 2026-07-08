// Engine for ch.32 — the `xss-demo` micro. Cross-site scripting is the browser
// analogue of SQL injection: untrusted text is spliced into a *page* instead of
// a query, so markup in a comment becomes executable markup in someone else's
// session. The fix is symmetric too: treat input as DATA. Output-encode it
// (escape the HTML metacharacters) so `<script>` renders as the literal text
// "<script>", not a script element.
//
// This is a SAFE model — it never touches a real DOM. It classifies whether a
// payload WOULD execute if inserted raw, and shows the escaped, inert form.
// Deterministic. Erasable-syntax only.

/** HTML-escape the five metacharacters. `&` must go first. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Vector = { pattern: string; why: string };

/** Detect active-markup vectors a raw insertion would trigger. */
export function detectVectors(raw: string): Vector[] {
  const s = raw.toLowerCase();
  const hits: Vector[] = [];
  if (/<script[\s>]/.test(s)) hits.push({ pattern: "<script>", why: "a script element runs its contents immediately" });
  if (/on\w+\s*=/.test(s)) hits.push({ pattern: "on…= handler", why: "an inline event handler (onerror/onload/onclick) runs attacker JS" });
  if (/javascript:/.test(s)) hits.push({ pattern: "javascript: URL", why: "a javascript: URL executes when followed" });
  if (/<iframe[\s>]/.test(s)) hits.push({ pattern: "<iframe>", why: "an iframe can load hostile content" });
  if (/<svg[\s>]/.test(s) && /on\w+\s*=/.test(s)) hits.push({ pattern: "<svg onload>", why: "SVG supports script-triggering attributes" });
  return hits;
}

export type XssResult = {
  mode: "raw" | "escaped";
  output: string; // what lands in the HTML
  executes: boolean; // would attacker JS run?
  vectors: Vector[]; // what was found in the payload
  displayText: string; // what a user visually sees
};

/** Analyze a comment either inserted raw (vulnerable) or escaped (safe). */
export function analyze(raw: string, escape: boolean): XssResult {
  const vectors = detectVectors(raw);
  if (escape) {
    const output = escapeHtml(raw);
    return { mode: "escaped", output, executes: false, vectors, displayText: raw };
  }
  return { mode: "raw", output: raw, executes: vectors.length > 0, vectors, displayText: vectors.length > 0 ? "(payload executed)" : raw };
}

export const PAYLOADS: readonly { label: string; raw: string; note: string }[] = [
  { label: "Normal comment", raw: "Great article, thanks!", note: "plain text — harmless either way" },
  { label: "Benign markup", raw: "<b>bold</b> move", note: "even harmless tags are neutralized by escaping" },
  { label: "Script tag", raw: "<script>steal(document.cookie)</script>", note: "classic stored-XSS payload" },
  { label: "Image onerror", raw: '<img src=x onerror="steal()">', note: "no <script> needed — an event handler fires" },
];
