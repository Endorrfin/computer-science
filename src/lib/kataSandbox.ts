// Kata sandbox — the ONE execution model for in-browser coding katas (v1).
//
// DESIGN (locked): a kata's runnable starter/solution/tests are plain ES2022
// JavaScript. The kata PROMPT shows the intended TypeScript signature (that is
// teaching-only); we never transpile TS here. This keeps the whole thing
// offline, dependency-free, and forward-compatible — a real TS→JS transpile
// can be swapped in later without touching any kata content.
//
// HOW UNTRUSTED CODE RUNS
// -----------------------
// The user's code + a test body are concatenated with a small ASSERT helper
// preamble and evaluated in a *fresh* strict scope built by `new Function`
// (no access to this module's closure variables). Throwing anything = test
// failure; the thrown message is surfaced to the learner.
//
// Two execution paths share EXACTLY the same per-test semantics:
//   • runOneCaseSync — synchronous. Used by the Node test harness
//     (scripts/test-katas.ts) to lock reference solutions, and it is the
//     literal source of truth the worker reproduces line-for-line.
//   • runKata        — the browser path. It cannot run user code on the main
//     thread, because a kata bug like `while (true) {}` would freeze the tab
//     with no way to recover. So it spins a *time-boxed Web Worker* built from
//     a Blob URL: the worker has no DOM, `importScripts` is overridden to
//     throw (no network / no extra code), and the MAIN thread terminates the
//     worker after a hard timeout (default 2000ms). A terminated worker is
//     reported as a probable infinite loop (`timedOut: true`). The worker and
//     its Blob URL are ALWAYS cleaned up (terminate + revokeObjectURL).
//
// IMPORTANT: this module is imported by BOTH the browser (KataRunner.tsx) AND
// Node (scripts/test-katas.ts). It must therefore NOT touch any browser global
// (Worker / Blob / URL / window) at module top level — those appear only inside
// runKata's body, which the Node harness never calls.
//
// This file runs under `node --experimental-strip-types`, so it is
// ERASABLE-SYNTAX ONLY: `import type`, `as const` + unions, no enums/namespaces.

export type KataCaseResult = { name: string; ok: boolean; error?: string };

export type KataResult = {
  ok: boolean;
  cases: KataCaseResult[];
  error?: string;
  timedOut?: boolean;
  durationMs: number;
};

// ---------------------------------------------------------------------------
// ASSERT_SOURCE — JS source (a string) defining the helpers every test body may
// call. It is prepended verbatim to the user code + test body in BOTH paths, so
// the assert semantics are identical in Node and in the worker. Helpers throw
// on failure; a thrown Error is what marks a case as failed.
// ---------------------------------------------------------------------------
export const ASSERT_SOURCE: string = `
"use strict";
function __fmt(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "bigint") return String(v) + "n";
  if (v === undefined) return "undefined";
  if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
  try { return JSON.stringify(v); } catch (_e) { return String(v); }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assert failed: expected a truthy value");
}
function assertEqual(actual, expected, msg) {
  // Strict (===) equality, with NaN treated as equal to itself.
  var same = actual === expected || (actual !== actual && expected !== expected);
  if (!same) {
    throw new Error(
      (msg ? msg + " — " : "") +
      "expected " + __fmt(expected) + " but got " + __fmt(actual)
    );
  }
}
function assertDeepEqual(actual, expected, msg) {
  if (!__deepEqual(actual, expected)) {
    throw new Error(
      (msg ? msg + " — " : "") +
      "deep-equal failed: expected " + __fmt(expected) + " but got " + __fmt(actual)
    );
  }
}
function __deepEqual(a, b) {
  if (a === b) return true;
  if (a !== a && b !== b) return true; // NaN
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  var aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!__deepEqual(a[i], b[i])) return false;
    return true;
  }
  var ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (var j = 0; j < ak.length; j++) {
    var k = ak[j];
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!__deepEqual(a[k], b[k])) return false;
  }
  return true;
}
`;

// ---------------------------------------------------------------------------
// runOneCaseSync — evaluate one test case synchronously in a fresh scope.
// The concatenation order is: ASSERT_SOURCE + userCode + testBody. `new
// Function` gives us a scope that cannot see this module's variables, and the
// "use strict" inside ASSERT_SOURCE makes the whole body strict. We catch
// everything and never throw out of here, so callers get a clean result.
// This is the exact behaviour the worker reproduces.
// ---------------------------------------------------------------------------
export function runOneCaseSync(userCode: string, testBody: string): KataCaseResult {
  // `name` is filled by the caller (harness / worker), which knows the test's
  // name; here we only report pass/fail + any thrown message.
  try {
    // `new Function` is intentional here — it is the sandbox boundary (a fresh
    // scope that cannot see this module's variables). See the file header.
    const fn = new Function(ASSERT_SOURCE + "\n" + userCode + "\n" + testBody);
    fn();
    return { name: "", ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { name: "", ok: false, error };
  }
}

// ---------------------------------------------------------------------------
// Worker source builder. We inline ASSERT_SOURCE and reproduce runOneCaseSync's
// semantics (same concatenation, same try/catch) inside the worker. The worker
// receives { userCode, tests } via postMessage, runs every case, and posts back
// the array of results. It also hardens the environment: importScripts throws.
//
// Kept as a plain string so the SAME per-test logic lives in one obvious place.
// ---------------------------------------------------------------------------
function buildWorkerSource(): string {
  // The template literal below becomes the worker's whole program. It must not
  // reference anything from this module except ASSERT_SOURCE (interpolated as a
  // JSON string literal so quotes/newlines are safe).
  return `
"use strict";
// Harden the worker: no loading extra scripts (offline + no code injection).
try { self.importScripts = function () { throw new Error("importScripts is disabled in the kata sandbox"); }; } catch (_e) {}
var ASSERT_SOURCE = ${JSON.stringify(ASSERT_SOURCE)};
function runOne(userCode, testBody) {
  try {
    var fn = new Function(ASSERT_SOURCE + "\\n" + userCode + "\\n" + testBody);
    fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}
self.onmessage = function (ev) {
  var data = ev.data || {};
  var userCode = data.userCode || "";
  var tests = data.tests || [];
  var cases = [];
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var r = runOne(userCode, t.body);
    cases.push({ name: t.name, ok: r.ok, error: r.error });
  }
  self.postMessage({ cases: cases });
};
`;
}

// ---------------------------------------------------------------------------
// runKata — the BROWSER path. Spins a time-boxed Blob-URL Worker, enforces a
// hard timeout by terminating it, and always cleans up. Per-test semantics are
// identical to runOneCaseSync (the worker inlines the same logic).
// ---------------------------------------------------------------------------
export function runKata(
  userCode: string,
  tests: { name: string; body: string }[],
  opts?: { timeoutMs?: number },
): Promise<KataResult> {
  const timeoutMs = opts?.timeoutMs ?? 2000;
  const started = Date.now();

  return new Promise<KataResult>((resolve) => {
    // Browser globals are touched ONLY here, never at module top level, so a
    // Node import of this module cannot crash.
    let url = "";
    let worker: Worker | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (url) {
        URL.revokeObjectURL(url);
        url = "";
      }
    };

    const finish = (result: KataResult): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    try {
      const blob = new Blob([buildWorkerSource()], { type: "text/javascript" });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);

      // Hard timeout: a kata with an infinite loop never posts back, so the
      // main thread terminates the worker and reports a probable infinite loop.
      timer = setTimeout(() => {
        finish({
          ok: false,
          cases: tests.map((t) => ({
            name: t.name,
            ok: false,
            error: "timed out — did the code loop forever?",
          })),
          timedOut: true,
          error: `Execution exceeded ${timeoutMs}ms and was stopped (probable infinite loop).`,
          durationMs: Date.now() - started,
        });
      }, timeoutMs);

      worker.onmessage = (ev: MessageEvent): void => {
        const data = ev.data as { cases?: KataCaseResult[] };
        const cases = Array.isArray(data.cases) ? data.cases : [];
        finish({
          ok: cases.length > 0 && cases.every((c) => c.ok),
          cases,
          durationMs: Date.now() - started,
        });
      };

      worker.onerror = (ev: ErrorEvent): void => {
        // A top-level throw in the worker (e.g. a syntax error in userCode)
        // lands here rather than in onmessage.
        ev.preventDefault();
        finish({
          ok: false,
          cases: tests.map((t) => ({ name: t.name, ok: false })),
          error: ev.message || "Worker error while running the kata.",
          durationMs: Date.now() - started,
        });
      };

      // Hand the user code + tests to the worker; it runs every case and posts
      // back { cases }. The timeout above races this — whichever fires first wins.
      worker.postMessage({ userCode, tests });
    } catch (e) {
      // Environment without Worker/Blob support, or Blob-URL creation failed.
      finish({
        ok: false,
        cases: tests.map((t) => ({ name: t.name, ok: false })),
        error: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - started,
      });
    }
  });
}
