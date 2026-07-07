// [micro] address-translate — ch.23 "Memory". Step one virtual address all the
// way down: split it into VPN + offset, subdivide the VPN across a (multi-)level
// page table, check the TLB, walk the table (or trap on a page fault), then form
// the physical address — one TranslateStep at a time. The TLB persists across
// translations so a repeat visit lands as a hit. Pure engine: paging/model.ts.
// Transport mirrors cache-sim / syscall-boundary (useState cursor + interval
// keyed to speed; reduced motion → step only).
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { cx, useReducedMotion } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import {
  DEFAULT_PAGING,
  decompose,
  demoTable,
  levelBits,
  pageSize,
  toBits,
  toHex,
  tlbInit,
  translate,
  vpnBits,
} from "./model.ts";
import type { PagingConfig, TranslateResult, TranslateStep, TlbState } from "./model.ts";
import "../../../theme/_p6css/address-translate.css";

const ACCENT = "#22d3ee";
const TLB_CAP = 4;

// Colour a piece of the diagram by the tone of the active step.
const TONE_VAR: Record<TranslateStep["tone"], string> = {
  vpn: "var(--sem-data)",
  tlb: "var(--accent)",
  walk: "var(--sem-control)",
  phys: "var(--sem-ok)",
  fault: "var(--sem-err)",
};

// Preset addresses chosen against demoTable(): VPN 2 is present (frame 7), VPN 3
// is absent (page fault), and re-picking a present one after it is cached shows a
// TLB hit. Byte offsets are arbitrary but non-zero so the arithmetic is visible.
const PRESETS: readonly { label: string; hint: string; va: number }[] = [
  { label: "VPN 2 · present", hint: "walks, then caches", va: 2 * 4096 + 0x1c },
  { label: "VPN 4 · present", hint: "another mapped page", va: 4 * 4096 + 0x40 },
  { label: "VPN 3 · fault", hint: "not in the table", va: 3 * 4096 + 0x08 },
];

const MAX_VA = 0xffffffff;

type Dec = { vpn: number; offset: number; indices: number[] };

export default function AddressTranslate() {
  const reduced = useReducedMotion();
  const table = useMemo(() => demoTable(), []);

  const [levels, setLevels] = useState(DEFAULT_PAGING.levels);
  const [raw, setRaw] = useState("0x0000201C"); // VPN 2 + offset 0x1C
  const [tlb, setTlb] = useState<TlbState>(() => tlbInit(TLB_CAP));

  // The committed translation and the config it was run under (so the diagram
  // stays consistent even if `levels` is toggled before the next translate).
  const [run, setRun] = useState<{ result: TranslateResult; cfg: PagingConfig } | null>(null);
  const [i, setI] = useState(0); // step cursor, 0 = nothing revealed yet
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const cfg = useMemo<PagingConfig>(() => ({ ...DEFAULT_PAGING, levels }), [levels]);
  const parsed = parseVa(raw);
  const res = run?.result ?? null;
  const steps = res?.steps ?? [];
  const shown = res ? Math.min(i, steps.length) : 0;
  const activeTone = shown > 0 ? steps[shown - 1].tone : null;

  // The diagram reflects the committed run when present, else a live preview of
  // the typed address (so the bit-split is always meaningful). `dcfg` is the
  // config the visible decomposition belongs to.
  const dcfg = run ? run.cfg : cfg;
  const dec: Dec | null = res
    ? { vpn: res.vpn, offset: res.offset, indices: res.indices }
    : parsed === null
      ? null
      : decompose(parsed, cfg);

  // Play loop: ~1 step/sec at 1×, scaled by speed; auto-stops at the last step.
  useEffect(() => {
    if (!running || res === null) return;
    const ms = Math.max(260, 1000 / speed);
    const id = window.setInterval(() => {
      setI((x) => {
        if (x >= steps.length) {
          setRunning(false);
          return steps.length;
        }
        return x + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [running, speed, res, steps.length]);

  function commit(va: number, from: TlbState) {
    const out = translate(va, cfg, table, from);
    setRun({ result: out.result, cfg });
    setTlb(out.tlb); // persist: hits accumulate across translations
    setI(0);
    setRunning(!reduced); // reveal step-by-step; reduced motion → manual stepping
  }
  function onTranslate() {
    if (parsed === null) return;
    commit(parsed, tlb);
  }
  function pickPreset(va: number) {
    setRaw(toHex(va, cfg.virtualBits));
    commit(va, tlb);
  }
  function onToggle() {
    if (res === null) {
      onTranslate();
      return;
    }
    if (running) {
      setRunning(false);
      return;
    }
    setI((x) => (x >= steps.length ? 0 : x)); // replay from the top once finished
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    if (res === null) {
      onTranslate();
      return;
    }
    setI((x) => Math.min(steps.length, x + 1));
  }
  function onReset() {
    setRunning(false);
    setRun(null);
    setI(0);
    setTlb(tlbInit(TLB_CAP)); // clear the TLB so hits must be re-earned
  }

  const done = res !== null && shown >= steps.length;
  const status = statusLine(res, done, cfg);
  const summary = ariaSummary(dec, dcfg, res, shown, steps);

  return (
    <SimShell
      title="Address translation — virtual to physical"
      simKey="address-translate"
      kind="micro"
      accent={ACCENT}
      transport={{ running, onToggle, onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={status}
      controls={
        <div className="atr-ctl">
          <label className="ss-field">
            <span aria-hidden="true">VA</span>
            <input
              className={cx("atr-input", parsed === null && "bad")}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onTranslate();
              }}
              spellCheck={false}
              aria-label="Virtual address (hex)"
              aria-invalid={parsed === null}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={onTranslate} disabled={parsed === null}>
            translate
          </button>
          <div className="bit-seg" role="group" aria-label="Page-table levels">
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                className={cx("bit-segbtn", levels === n && "on")}
                onClick={() => setLevels(n)}
                aria-pressed={levels === n}
              >
                {n === 1 ? "1 level" : "2 level"}
              </button>
            ))}
          </div>
          <span className="atr-cap" title="TLB capacity">
            TLB {tlb.entries.length}/{tlb.cap}
          </span>
        </div>
      }
      footer={
        <div className="atr-tables">
          <TlbTable tlb={tlb} table={table} active={res && activeTone === "tlb" ? res.vpn : null} />
          <PageTable table={table} vpn={dec ? dec.vpn : null} res={res} shown={shown} />
        </div>
      }
    >
      <div className="atr-stage">
        <div className="atr-presets" role="group" aria-label="Preset addresses">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn atr-preset" onClick={() => pickPreset(p.va)}>
              <span className="atr-preset-l">{p.label}</span>
              <span className="atr-preset-h muted">{p.hint}</span>
            </button>
          ))}
        </div>

        {dec === null ? (
          <p className="atr-empty muted">Enter a virtual address in hex (0x…) to translate it.</p>
        ) : (
          <BitSplit cfg={dcfg} dec={dec} tone={activeTone} summary={summary} />
        )}

        <ol className="atr-steps" aria-label="Translation steps">
          {steps.length === 0 && <li className="atr-step muted">Press translate, then play or step to walk the translation.</li>}
          {steps.map((s, idx) => {
            const state = idx < shown ? (idx === shown - 1 ? "on" : "done") : "todo";
            return (
              <li
                key={idx}
                className={cx("atr-step", `is-${s.tone}`, state)}
                aria-current={idx === shown - 1 ? "step" : undefined}
                style={{ "--tone": TONE_VAR[s.tone] } as CSSProperties}
              >
                <span className="atr-step-n">{idx + 1}</span>
                <span className="atr-step-b">
                  <span className="atr-step-t">{s.title}</span>
                  {state !== "todo" && <span className="atr-step-d">{s.detail}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </SimShell>
  );
}

// ---- bit-split diagram -----------------------------------------------------

function BitSplit({ cfg, dec, tone, summary }: { cfg: PagingConfig; dec: Dec; tone: TranslateStep["tone"] | null; summary: string }) {
  const va = dec.vpn * pageSize(cfg) + dec.offset;
  const bits = toBits(va, cfg.virtualBits);
  const vBits = vpnBits(cfg);
  // Segment the VPN into level slices (msb first) when multi-level, else one slice.
  const vpnSegs =
    cfg.levels > 1
      ? levelBits(cfg).map((n, li) => ({ n, idx: dec.indices[li], label: `L${li + 1}` }))
      : [{ n: vBits, idx: dec.vpn, label: "VPN" }];

  // Highlight VPN or offset by the active step's tone.
  const vpnHot = tone === "vpn" || tone === "tlb" || tone === "walk";
  const offHot = tone === "phys";

  let cursor = 0;
  return (
    <div className="atr-bits" role="img" aria-label={summary} style={{ "--tone": tone ? TONE_VAR[tone] : "var(--sem-data)" } as CSSProperties}>
      <div className="atr-bitrow">
        {vpnSegs.map((seg, si) => {
          const slice = bits.slice(cursor, cursor + seg.n);
          cursor += seg.n;
          return (
            <span
              key={si}
              className={cx("atr-seg", "is-vpn", vpnHot && "hot", si > 0 && "div")}
              style={{ color: "var(--sem-data)" }}
              title={`${seg.label} = ${seg.idx} (${seg.n} bits)`}
            >
              <span className="atr-seg-bits">{slice}</span>
              <span className="atr-seg-tag">
                {seg.label} <b>{seg.idx}</b>
              </span>
            </span>
          );
        })}
        <span className={cx("atr-seg", "is-off", offHot && "hot")} title={`offset = ${dec.offset} (${cfg.offsetBits} bits)`}>
          <span className="atr-seg-bits">{bits.slice(vBits)}</span>
          <span className="atr-seg-tag">
            offset <b>{dec.offset}</b>
          </span>
        </span>
      </div>
      <div className="atr-hexrow">
        <span className="muted">VA</span> {toHex(va, cfg.virtualBits)}
        <span className="atr-hexsep">·</span>
        <span className="atr-hex-vpn">VPN {dec.vpn}</span>
        <span className="atr-hexsep">·</span>
        page {pageSize(cfg)} B
      </div>
    </div>
  );
}

// ---- TLB (cached VPN → frame) ----------------------------------------------

function TlbTable({ tlb, table, active }: { tlb: TlbState; table: ReadonlyMap<number, number>; active: number | null }) {
  // Show MRU first (entries store MRU last).
  const rows = [...tlb.entries].reverse();
  return (
    <div className="atr-panel">
      <div className="atr-panel-h">
        TLB <span className="muted">· {tlb.entries.length}/{tlb.cap} · MRU first</span>
      </div>
      <table className="atr-tbl">
        <thead>
          <tr>
            <th>VPN</th>
            <th>frame</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td className="muted" colSpan={2}>empty</td>
            </tr>
          )}
          {rows.map((vpn) => (
            <tr key={vpn} className={cx(active === vpn && "hit")} style={active === vpn ? { color: "var(--accent)" } : undefined}>
              <td>{vpn}</td>
              <td>{table.get(vpn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- page table (VPN → frame, valid bit) -----------------------------------

function PageTable({ table, vpn, res, shown }: { table: ReadonlyMap<number, number>; vpn: number | null; res: TranslateResult | null; shown: number }) {
  // Show a small window of the VPN space around present pages (0..7 covers the demo).
  const rows = [0, 1, 2, 3, 4, 5, 6, 7];
  // The walk highlight only lights up once the walk steps are revealed.
  const walking = res !== null && shown >= 2 && !res.tlbHit;
  return (
    <div className="atr-panel">
      <div className="atr-panel-h">
        page table <span className="muted">· present pages glow</span>
      </div>
      <table className="atr-tbl">
        <thead>
          <tr>
            <th>VPN</th>
            <th>frame</th>
            <th>valid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const present = table.has(v);
            const isCur = vpn === v;
            // The fault step is the last one, revealed only when the walk is done.
            const faultHere = isCur && res !== null && res.pageFault && shown >= res.steps.length;
            return (
              <tr
                key={v}
                className={cx(present && "valid", isCur && walking && "cur", faultHere && "fault")}
                style={faultHere ? { color: "var(--sem-err)" } : isCur && walking && present ? { color: "var(--sem-control)" } : undefined}
              >
                <td>{v}</td>
                <td>{present ? table.get(v) : "—"}</td>
                <td className={present ? "atr-valid" : "atr-invalid"}>{present ? "1" : "0"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function parseVa(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const hex = /^0x/i.test(t) ? t.slice(2) : t;
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return null;
  return Math.min(MAX_VA, Math.max(0, n));
}

function statusLine(res: TranslateResult | null, done: boolean, cfg: PagingConfig): string {
  if (res === null) return `Idle · ${cfg.levels}-level · 4 KiB pages · TLB cap ${TLB_CAP}. Enter an address and translate.`;
  const base = `VPN ${res.vpn} → `;
  if (res.pageFault) return base + "page fault (valid = 0) · no physical address · CPU traps to the OS.";
  const tail = done ? ` · phys ${toHex(res.physical!, cfg.virtualBits)}` : " · translating…";
  return `${base}frame ${res.frame} · ${res.tlbHit ? "TLB hit" : "TLB miss"}${tail}`;
}

function ariaSummary(
  dec: Dec | null,
  cfg: PagingConfig,
  res: TranslateResult | null,
  shown: number,
  steps: readonly TranslateStep[],
): string {
  if (dec === null) return "No address entered.";
  const idx =
    cfg.levels > 1 ? ` Level indices ${dec.indices.join(", ")}.` : "";
  const head = `Virtual address split into VPN ${dec.vpn} and offset ${dec.offset}.${idx}`;
  if (res === null) return head + " Press translate to walk it.";
  const step = shown > 0 ? ` Step ${shown} of ${steps.length}: ${steps[shown - 1].title}.` : "";
  if (res.pageFault) return `${head}${step} Page fault — the page is not present, no physical address.`;
  const phys = res.physical !== null && shown >= steps.length ? ` Physical address ${toHex(res.physical, cfg.virtualBits)}.` : "";
  return `${head} ${res.tlbHit ? "TLB hit" : "TLB miss"}, frame ${res.frame}.${step}${phys}`;
}
