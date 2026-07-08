// [micro] cache-headers — ch.28 "The Web". Tweak a response's cache directives
// (max-age, ETag, no-store) and slide "age" = seconds since it was cached, then
// re-request. The browser↔server exchange re-renders from the engine's verdict:
// a fresh HIT skips the network, a stale-but-validated response revalidates
// (conditional GET → 304, headers only), and everything else is a full 200
// refetch. Purely reactive — no time axis — so there's no transport, only reset.
// This is a thin skin over ./web.ts: every outcome comes straight from
// cacheDecision(); nothing is recomputed here.
import { useMemo, useState } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { cacheDecision } from "./web.ts";
import type { CacheOutcome, CachePolicy } from "./web.ts";
import "../../../theme/_p7css/cache-headers.css";

const ACCENT = "#38bdf8";

const MAX_AGE_MAX = 300; // 5 min — enough range to cross the freshness line
const AGE_MAX = 360; // let age run past the longest max-age so "stale" is reachable

type OutcomeId = CacheOutcome["outcome"];

// Per-outcome presentation. Colors map to the shared semantic palette; the
// engine owns the words, we own the tone.
const OUTCOME_META: Record<OutcomeId, { label: string; tone: string; headline: string }> = {
  hit: {
    label: "HIT",
    tone: "var(--sem-ok)",
    headline: "served from cache — 0 network",
  },
  revalidate: {
    label: "REVALIDATE",
    tone: "var(--sem-control)",
    headline: "conditional GET → 304 Not Modified, headers only",
  },
  miss: {
    label: "MISS",
    tone: "var(--sem-err)",
    headline: "full refetch — 200",
  },
};

// The three presets from the teaching precedence, each a one-tap way to land in
// a distinct outcome so the rule reads itself: no-store never caches; inside
// max-age is fresh; stale + a validator revalidates.
type Preset = { id: string; label: string; policy: CachePolicy; age: number };
const PRESETS: readonly Preset[] = [
  { id: "fresh", label: "Fresh hit", policy: { maxAge: 120, etag: true, noStore: false }, age: 30 },
  { id: "reval", label: "Stale + ETag", policy: { maxAge: 60, etag: true, noStore: false }, age: 180 },
  { id: "nostore", label: "no-store", policy: { maxAge: 0, etag: false, noStore: true }, age: 0 },
];

const DEFAULT_POLICY: CachePolicy = { maxAge: 60, etag: true, noStore: false };
const DEFAULT_AGE = 20;

export default function CacheHeaders() {
  const reduced = useReducedMotion();

  const [maxAge, setMaxAge] = useState(DEFAULT_POLICY.maxAge);
  const [etag, setEtag] = useState(DEFAULT_POLICY.etag);
  const [noStore, setNoStore] = useState(DEFAULT_POLICY.noStore);
  const [age, setAge] = useState(DEFAULT_AGE);

  const policy = useMemo<CachePolicy>(() => ({ maxAge, etag, noStore }), [maxAge, etag, noStore]);
  const decision = useMemo(() => cacheDecision(policy, age), [policy, age]);

  // The three-request timeline: same policy, sampled at rising ages, so the
  // fresh → stale transition is visible in one glance. Ages straddle max-age.
  const timeline = useMemo(() => {
    const at = noStore
      ? [0, Math.round(AGE_MAX / 3), Math.round((2 * AGE_MAX) / 3)]
      : [
          Math.max(0, Math.round(maxAge / 2)),
          maxAge, // exactly at the boundary → already stale (age < max-age is strict)
          Math.min(AGE_MAX, maxAge + Math.max(30, Math.round(maxAge / 2))),
        ];
    return at.map((a) => ({ age: a, outcome: cacheDecision(policy, a) }));
  }, [policy, maxAge, noStore]);

  function onReset() {
    setMaxAge(DEFAULT_POLICY.maxAge);
    setEtag(DEFAULT_POLICY.etag);
    setNoStore(DEFAULT_POLICY.noStore);
    setAge(DEFAULT_AGE);
  }

  function loadPreset(p: Preset) {
    setMaxAge(p.policy.maxAge);
    setEtag(p.policy.etag);
    setNoStore(p.policy.noStore);
    setAge(p.age);
  }

  const meta = OUTCOME_META[decision.outcome];
  const freshFor = Math.max(0, maxAge - age);
  const status =
    `${decision.outcome.toUpperCase()} · ${decision.status} · ` +
    `${decision.network ? "network" : "no network"} · ${decision.bytes} · age ${age}s / max-age ${maxAge}s`;

  return (
    <SimShell
      title="Cache headers — hit, revalidate, or refetch?"
      simKey="cache-headers"
      kind="micro"
      accent={ACCENT}
      onReset={onReset}
      status={status}
      controls={
        <div className="cah-ctl">
          <label className="ss-field cah-field">
            max-age
            <input
              className="cah-slider"
              type="range"
              min={0}
              max={MAX_AGE_MAX}
              step={5}
              value={maxAge}
              disabled={noStore}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              aria-label="max-age in seconds"
            />
            <span className="cah-numval">{maxAge}s</span>
          </label>

          <label className={cx("cah-toggle ss-field", noStore && "is-disabled")}>
            <input
              type="checkbox"
              checked={etag}
              disabled={noStore}
              onChange={(e) => setEtag(e.target.checked)}
              aria-label="Response carries an ETag validator"
            />
            ETag
          </label>

          <label className="cah-toggle ss-field">
            <input
              type="checkbox"
              checked={noStore}
              onChange={(e) => setNoStore(e.target.checked)}
              aria-label="no-store — never cache this response"
            />
            no-store
          </label>
        </div>
      }
      footer={<PrecedencePanel activeAge={age} maxAge={maxAge} etag={etag} noStore={noStore} timeline={timeline} />}
    >
      <div className="cah-stage">
        <div className="cah-presets" role="group" aria-label="Preset cache scenarios">
          <span className="cah-panel-title">scenarios</span>
          {PRESETS.map((p) => {
            const preview = cacheDecision(p.policy, p.age);
            const isCurrent =
              p.policy.maxAge === maxAge && p.policy.etag === etag && p.policy.noStore === noStore && p.age === age;
            return (
              <button
                key={p.id}
                type="button"
                className={cx("cah-preset", isCurrent && "is-current")}
                style={{ ["--tone" as string]: OUTCOME_META[preview.outcome].tone }}
                onClick={() => loadPreset(p)}
                aria-pressed={isCurrent}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <AgeControl age={age} maxAge={maxAge} noStore={noStore} onChange={setAge} />
        <Exchange decision={decision} meta={meta} reduced={reduced} />
        <Verdict decision={decision} meta={meta} freshFor={freshFor} noStore={noStore} />
      </div>
    </SimShell>
  );
}

// ---------------------------------------------------------------------------
// The "age" slider — seconds since the response was cached — with the
// freshness line drawn where age crosses max-age.
// ---------------------------------------------------------------------------
function AgeControl({
  age,
  maxAge,
  noStore,
  onChange,
}: {
  age: number;
  maxAge: number;
  noStore: boolean;
  onChange: (v: number) => void;
}) {
  const fresh = !noStore && age < maxAge;
  const linePct = noStore ? 0 : Math.min(100, (maxAge / AGE_MAX) * 100);
  const fillPct = Math.min(100, (age / AGE_MAX) * 100);
  return (
    <div className="cah-agebar">
      <div className="cah-agebar-head">
        <span className="cah-panel-title">age since cached</span>
        <span className="cah-age-read">
          <span className={cx("cah-age-num", fresh ? "is-fresh" : "is-stale")}>{age}s</span>
          <span className="cah-age-tag" style={{ color: fresh ? "var(--sem-ok)" : "var(--sem-err)" }}>
            {noStore ? "not cached" : fresh ? "fresh" : "stale"}
          </span>
        </span>
      </div>
      <div className="cah-track-wrap">
        <div className="cah-track" aria-hidden="true">
          <span
            className={cx("cah-track-fill", fresh ? "is-fresh" : "is-stale")}
            style={{ width: `${fillPct}%` }}
          />
          {!noStore && maxAge > 0 && maxAge < AGE_MAX && (
            <span className="cah-freshline" style={{ left: `${linePct}%` }}>
              <span className="cah-freshline-lbl">max-age {maxAge}s</span>
            </span>
          )}
        </div>
        <input
          className="cah-agerange"
          type="range"
          min={0}
          max={AGE_MAX}
          step={5}
          value={age}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Age in seconds since the response was cached"
          aria-valuetext={`${age} seconds — ${noStore ? "not cached" : fresh ? "fresh" : "stale"}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Browser ↔ server exchange. On a HIT the request never leaves the browser
// (it's served from the cache box); otherwise a request goes out and a
// response — 200 full or 304 tiny — comes back.
// ---------------------------------------------------------------------------
function Exchange({
  decision,
  meta,
  reduced,
}: {
  decision: CacheOutcome;
  meta: (typeof OUTCOME_META)[OutcomeId];
  reduced: boolean;
}) {
  const W = 640;
  const H = 168;
  const browserX = 78;
  const serverX = 562;
  const laneY = 60;
  const cacheY = 122;

  const hit = decision.outcome === "hit";
  const revalidate = decision.outcome === "revalidate";
  const respLabel = decision.status === 304 ? "304" : "200";
  const respSize = decision.bytes === "headers-only" ? "headers only" : decision.bytes === "none" ? "cached body" : "full body";

  const summary =
    `Browser to server exchange. Outcome ${meta.label}. ` +
    (hit
      ? "The request is served from the browser cache; nothing touches the network."
      : `A ${decision.status === 304 ? "conditional GET is sent and the server replies 304 Not Modified with headers only" : "GET is sent and the server replies 200 with the full body"}.`);

  return (
    <div className="cah-exchange" style={{ ["--tone" as string]: meta.tone }}>
      <svg
        className="cah-exchange-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="cah-arrow-out" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--tone)" />
          </marker>
          <marker id="cah-arrow-in" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--sem-data)" />
          </marker>
        </defs>

        {/* the wire */}
        <line className="cah-wire" x1={browserX + 46} y1={laneY} x2={serverX - 46} y2={laneY} />

        {/* browser node */}
        <g className="cah-node">
          <rect x={browserX - 46} y={laneY - 26} width={92} height={52} rx={9} className="cah-node-box" />
          <text x={browserX} y={laneY - 4} textAnchor="middle" className="cah-node-title">
            browser
          </text>
          <text x={browserX} y={laneY + 13} textAnchor="middle" className="cah-node-sub">
            re-request
          </text>
        </g>

        {/* cache box under the browser — lit when it serves the response */}
        <g className={cx("cah-cachebox", hit && "is-served")}>
          <rect x={browserX - 46} y={cacheY - 20} width={92} height={40} rx={8} />
          <text x={browserX} y={cacheY - 2} textAnchor="middle" className="cah-cache-title">
            cache
          </text>
          <text x={browserX} y={cacheY + 13} textAnchor="middle" className="cah-cache-sub">
            {decision.network && decision.outcome === "miss" ? "(no entry)" : hit ? "fresh copy" : "stored copy"}
          </text>
        </g>
        {/* served-from-cache connector (hit only) */}
        {hit && <path className="cah-serve" d={`M${browserX} ${cacheY - 20} L${browserX} ${laneY + 12}`} />}

        {/* server node */}
        <g className={cx("cah-node", "cah-server", !decision.network && "is-idle")}>
          <rect x={serverX - 46} y={laneY - 26} width={92} height={52} rx={9} className="cah-node-box" />
          <text x={serverX} y={laneY - 4} textAnchor="middle" className="cah-node-title">
            server
          </text>
          <text x={serverX} y={laneY + 13} textAnchor="middle" className="cah-node-sub">
            {decision.network ? "origin" : "not contacted"}
          </text>
        </g>

        {/* request + response arrows — only when the network is touched */}
        {decision.network && (
          <>
            <g className={cx("cah-msg cah-req", !reduced && "is-live")}>
              <line
                className="cah-msg-line cah-req-line"
                x1={browserX + 50}
                y1={laneY - 15}
                x2={serverX - 52}
                y2={laneY - 15}
                markerEnd="url(#cah-arrow-out)"
              />
              <text x={(browserX + serverX) / 2} y={laneY - 21} textAnchor="middle" className="cah-msg-lbl cah-req-lbl">
                {revalidate ? "GET · If-None-Match" : "GET"}
              </text>
            </g>
            <g className={cx("cah-msg cah-resp", !reduced && "is-live")}>
              <line
                className="cah-msg-line cah-resp-line"
                x1={serverX - 50}
                y1={laneY + 21}
                x2={browserX + 52}
                y2={laneY + 21}
                markerEnd="url(#cah-arrow-in)"
              />
              <text x={(browserX + serverX) / 2} y={laneY + 38} textAnchor="middle" className="cah-msg-lbl cah-resp-lbl">
                {respLabel} · {respSize}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The verdict card — outcome pill, the engine's note, and the response line.
// ---------------------------------------------------------------------------
function Verdict({
  decision,
  meta,
  freshFor,
  noStore,
}: {
  decision: CacheOutcome;
  meta: (typeof OUTCOME_META)[OutcomeId];
  freshFor: number;
  noStore: boolean;
}) {
  return (
    <div className="cah-verdict" style={{ ["--tone" as string]: meta.tone }} aria-live="polite">
      <div className="cah-verdict-top">
        <span className="cah-pill" style={{ ["--tone" as string]: meta.tone }}>
          <span className="cah-pill-dot" />
          {meta.label}
        </span>
        <span className="cah-headline">{meta.headline}</span>
        <span className="cah-statuscode">
          <span className="cah-statuscode-num">{decision.status}</span>
        </span>
      </div>
      <p className="cah-note">{decision.note}</p>
      <div className="cah-metrics">
        <Metric label="network" value={decision.network ? "yes" : "none"} good={!decision.network} />
        <Metric label="body sent" value={decision.bytes} good={decision.bytes !== "full"} />
        <Metric
          label={noStore ? "cacheable" : "stays fresh"}
          value={noStore ? "never" : freshFor > 0 ? `${freshFor}s more` : "expired"}
          good={!noStore && freshFor > 0}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="cah-metric">
      <span className="cah-metric-lbl">{label}</span>
      <span className={cx("cah-metric-val", good ? "is-good" : "is-cost")}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Precedence teaching + the 3-request timeline. The rule table shows which
// branch fires; the timeline replays the same policy at rising ages.
// ---------------------------------------------------------------------------
function PrecedencePanel({
  activeAge,
  maxAge,
  etag,
  noStore,
  timeline,
}: {
  activeAge: number;
  maxAge: number;
  etag: boolean;
  noStore: boolean;
  timeline: { age: number; outcome: CacheOutcome }[];
}) {
  const fresh = !noStore && activeAge < maxAge;
  // Exactly one rule "fires" — matches cacheDecision's precedence ladder.
  const active: "nostore" | "fresh" | "reval" | "miss" = noStore
    ? "nostore"
    : fresh
      ? "fresh"
      : etag
        ? "reval"
        : "miss";

  const rules: { id: typeof active; cond: string; then: string; tone: string }[] = [
    { id: "nostore", cond: "no-store set", then: "never cached → full 200 every time", tone: "var(--sem-err)" },
    { id: "fresh", cond: "age < max-age", then: "fresh HIT → served from cache, 0 network", tone: "var(--sem-ok)" },
    { id: "reval", cond: "stale + ETag", then: "revalidate → 304 Not Modified, headers only", tone: "var(--sem-control)" },
    { id: "miss", cond: "stale, no validator", then: "full refetch → 200", tone: "var(--sem-err)" },
  ];

  return (
    <div className="cah-teach">
      <div className="cah-rules" role="list" aria-label="Cache decision precedence">
        <span className="cah-panel-title cah-rules-cap">precedence — first match wins</span>
        {rules.map((r, i) => {
          const on = r.id === active;
          return (
            <div key={r.id} className={cx("cah-rule", on && "is-active")} role="listitem" style={{ ["--tone" as string]: r.tone }}>
              <span className="cah-rule-ord" aria-hidden="true">
                {i + 1}
              </span>
              <span className="cah-rule-cond">
                <code>{r.cond}</code>
              </span>
              <span className="cah-rule-arrow" aria-hidden="true">
                →
              </span>
              <span className="cah-rule-then">{r.then}</span>
              {on && (
                <span className="cah-rule-flag" aria-label="active rule">
                  active
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="cah-timeline" role="group" aria-label="Three requests at increasing ages">
        <span className="cah-panel-title">same policy, rising age</span>
        <ol className="cah-tl-list">
          {timeline.map((step, i) => {
            const m = OUTCOME_META[step.outcome.outcome];
            return (
              <li key={i} className="cah-tl-item" style={{ ["--tone" as string]: m.tone }}>
                <span className="cah-tl-age">t{i + 1} · {step.age}s</span>
                <span className="cah-tl-chip">
                  <span className="cah-tl-dot" />
                  {m.label}
                </span>
                <span className="cah-tl-status">{step.outcome.status}</span>
              </li>
            );
          })}
        </ol>
        <p className="cah-tl-note">{noStore ? "no-store: every request is a fresh 200, no matter the age." : "the same response goes fresh → stale as age crosses max-age."}</p>
      </div>
    </div>
  );
}
