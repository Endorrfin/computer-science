// [micro] cache-sim — a direct-mapped cache over a 64-cell memory (8 lines).
// Step through an access pattern and watch hits and misses: sequential rides
// spatial locality (a wider line = more free neighbours), while strided and
// random thrash. The cache-line slider is the headline knob. Engine:
// fast-cpu/cache. Reuses the ch.6 RAM-grid visual language.
import { useMemo, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { CACHE_PATTERNS, cachePatternById, runCache } from "../fast-cpu/cache.ts";
import type { CacheParams } from "../fast-cpu/cache.ts";

const ACCENT = "#FB923C";
const MEM_CELLS = 64;
const NUM_LINES = 8;
const COLS = 8;
const LINE_SIZES = [1, 2, 4];

export default function CacheSim() {
  const [patternId, setPatternId] = useState("sequential");
  const [lineSize, setLineSize] = useState(4);
  const [i, setI] = useState(0); // accesses processed
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const params = useMemo<CacheParams>(() => ({ numLines: NUM_LINES, lineSize, memCells: MEM_CELLS }), [lineSize]);
  const pattern = cachePatternById(patternId) ?? CACHE_PATTERNS[0];
  const addrs = useMemo(() => pattern.make(params), [pattern, params]);
  const len = addrs.length;

  // full run (final metrics) + state after the first i accesses (residency now)
  const full = useMemo(() => runCache(addrs, params), [addrs, params]);
  const soFar = useMemo(() => runCache(addrs.slice(0, i), params), [addrs, params, i]);
  const lines = soFar.finalLines;
  const curAddr = i > 0 ? addrs[i - 1] : -1;
  const curRes = i > 0 ? soFar.results[i - 1] : null;

  useSimClock(running, 3 * speed, () => {
    setI((x) => {
      if (x >= len) {
        setRunning(false);
        return len;
      }
      return x + 1;
    });
  });

  function restart() {
    setI(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setI((x) => Math.min(len, x + 1));
  }
  function onReset() {
    setRunning(false);
    setI(0);
  }
  function pickPattern(id: string) {
    setPatternId(id);
    setRunning(false);
    setI(0);
  }
  function pickLine(n: number) {
    setLineSize(n);
    setRunning(false);
    setI(0);
  }

  const hitPct = (soFar.hitRate * 100).toFixed(0);
  const finalPct = (full.hitRate * 100).toFixed(0);

  // per-cell residency (is this address's block currently in its line?)
  const resident = (addr: number): boolean => {
    const block = Math.floor(addr / lineSize);
    const line = block % NUM_LINES;
    const tag = Math.floor(block / NUM_LINES);
    return lines[line].valid && lines[line].tag === tag;
  };

  return (
    <SimShell
      title="Direct-mapped cache — hit or miss"
      simKey="cache-sim"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={`${pattern.name} · line ${lineSize} · access ${i}/${len} · ${soFar.hits} hit / ${soFar.misses} miss (${hitPct}%). Full run: ${finalPct}% hit.`}
      controls={
        <div className="cs-ctl">
          <label className="ss-field">
            pattern
            <select value={patternId} onChange={(e) => pickPattern(e.target.value)} aria-label="Access pattern">
              {CACHE_PATTERNS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <div className="bit-seg" role="group" aria-label="Cache line size">
            {LINE_SIZES.map((n) => (
              <button key={n} type="button" className={cx("bit-segbtn", lineSize === n && "on")} onClick={() => pickLine(n)}>
                line {n}
              </button>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="cs-metrics" role="group" aria-label="Cache metrics">
          <div className={cx("cs-verdict", curRes && (curRes.hit ? "hit" : "miss"))}>{curRes ? (curRes.hit ? "HIT" : "MISS") : "—"}</div>
          <div className="cs-metric">
            <span className="cs-mv ok">{soFar.hits}</span>
            <span className="cs-ml">hits</span>
          </div>
          <div className="cs-metric">
            <span className="cs-mv err">{soFar.misses}</span>
            <span className="cs-ml">misses</span>
          </div>
          <div className="cs-metric">
            <span className="cs-mv">{hitPct}%</span>
            <span className="cs-ml">hit rate</span>
          </div>
          <div className="cs-metric">
            <span className="cs-mv">{finalPct}%</span>
            <span className="cs-ml">full run</span>
          </div>
        </div>
      }
    >
      <p className="cs-blurb muted">{pattern.blurb}</p>

      <div className="cs-panels">
        <div className="cs-mem">
          <div className="cs-lbl">
            memory — <b>{MEM_CELLS}</b> cells{curAddr >= 0 && <> · accessing <b>#{curAddr}</b></>}
          </div>
          <div className="cs-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} role="grid" aria-label="Memory cells">
            {Array.from({ length: MEM_CELLS }, (_, a) => {
              const isCur = a === curAddr;
              return (
                <div
                  key={a}
                  role="gridcell"
                  className={cx("cs-cell", resident(a) && "cached", isCur && "cur", isCur && curRes && (curRes.hit ? "hit" : "miss"))}
                  title={`cell ${a} → line ${Math.floor(a / lineSize) % NUM_LINES}`}
                >
                  {a}
                </div>
              );
            })}
          </div>
          <div className="cs-hint muted">Cells whose block is currently in the cache glow. The outlined cell is this step&apos;s access.</div>
        </div>

        <div className="cs-cache">
          <div className="cs-lbl">
            cache — <b>{NUM_LINES}</b> lines × <b>{lineSize}</b> {lineSize === 1 ? "cell" : "cells"}
          </div>
          <div className="cs-lines">
            {lines.map((ln, idx) => {
              const isCur = curRes?.line === idx;
              return (
                <div key={idx} className={cx("cs-line", ln.valid && "valid", isCur && curRes && (curRes.hit ? "hit" : "miss"))}>
                  <span className="cs-lineno">L{idx}</span>
                  {ln.valid ? (
                    <span className="cs-lineres">
                      cells {ln.base}–{ln.base + lineSize - 1} <span className="muted">· tag {ln.tag}</span>
                    </span>
                  ) : (
                    <span className="cs-lineres muted">empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SimShell>
  );
}
