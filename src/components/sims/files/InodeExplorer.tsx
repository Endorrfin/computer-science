// [HERO] inode-explorer (ch.24) — how a file's bytes map to disk blocks. A
// classic Unix inode holds 12 direct block pointers plus one single-, one
// double-, and one triple-indirect pointer. Type a byte offset (or scrub the
// slider) and watch the walk light up: direct offsets are one read; deeper ones
// climb indirect blocks, one extra read per level. The fan-out (pointers per
// block = blockSize / pointerSize) also sets the maximum file size, shown live.
// Purely reactive — no time axis, so no transport. Driven by ./model.ts.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import {
  DEFAULT_INODE,
  resolve,
  regionCapacities,
  maxFileSize,
  pointersPerBlock,
} from "./model.ts";
import type { InodeConfig, Region } from "./model.ts";
import "../../../theme/_p6css/inode-explorer.css";

const ACCENT = "#22d3ee";

function fmtBytes(n: number): string {
  const u = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  const s = v >= 100 || Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1);
  return `${s} ${u[i]}`;
}

const PRESETS: { label: string; offset: number }[] = [
  { label: "byte 0", offset: 0 },
  { label: "40 KiB", offset: 40 * 1024 },
  { label: "1 MiB", offset: 1024 * 1024 },
  { label: "1 GiB", offset: 1024 * 1024 * 1024 },
];

export default function InodeExplorer() {
  const [cfg, setCfg] = useState<InodeConfig>(DEFAULT_INODE);
  const [offset, setOffset] = useState(0);

  const res = useMemo(() => resolve(cfg, offset), [cfg, offset]);
  const caps = useMemo(() => regionCapacities(cfg), [cfg]);
  const ppb = pointersPerBlock(cfg);
  const max = maxFileSize(cfg);

  function reset(): void {
    setCfg(DEFAULT_INODE);
    setOffset(0);
  }

  const status = `offset ${fmtBytes(offset)} → block ${res.logicalBlock} · ${res.region} · ${res.reads} disk read${res.reads === 1 ? "" : "s"}`;

  return (
    <SimShell
      title="Inode explorer — offset → block, and the indirection it costs"
      simKey="inode-explorer"
      kind="hero"
      accent={ACCENT}
      onReset={reset}
      status={status}
      controls={
        <div className="ie-ctl">
          <label className="ss-field">
            byte offset
            <input
              className="ie-offset"
              type="number"
              min={0}
              step={cfg.blockSize}
              value={offset}
              aria-label="Byte offset into the file"
              onChange={(e) => setOffset(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="ss-field">
            block size
            <select aria-label="Block size" value={cfg.blockSize} onChange={(e) => setCfg({ ...cfg, blockSize: Number(e.target.value) })}>
              <option value={1024}>1 KiB</option>
              <option value={4096}>4 KiB</option>
            </select>
          </label>
          <label className="ss-field">
            pointer size
            <select aria-label="Pointer size" value={cfg.pointerSize} onChange={(e) => setCfg({ ...cfg, pointerSize: Number(e.target.value) })}>
              <option value={4}>4 B (32-bit)</option>
              <option value={8}>8 B (64-bit)</option>
            </select>
          </label>
          <div className="ie-presets">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className={cx("btn", offset === p.offset && "ie-on")} onClick={() => setOffset(p.offset)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      }
      footer={
        <div className="ie-foot">
          <div className="ie-stats">
            <Stat label="logical block" value={`#${res.logicalBlock}`} />
            <Stat label="offset in block" value={`${res.offsetInBlock} B`} />
            <Stat label="region" value={res.region} tone={res.region === "out-of-range" ? "err" : "accent"} />
            <Stat label="disk reads" value={`${res.reads}`} tone={res.reads >= 3 ? "warn" : "ok"} />
          </div>
          <p className="ie-facts">
            pointers/block = {cfg.blockSize} / {cfg.pointerSize} = <b>{ppb}</b> · direct {caps.direct}, single {ppb}, double {ppb.toLocaleString()}², triple {ppb.toLocaleString()}³ blocks · <b>max file ≈ {fmtBytes(max)}</b>
          </p>
        </div>
      }
    >
      <InodeDiagram res={res} />
    </SimShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "ok" | "warn" | "err" }) {
  return (
    <div className={cx("ie-stat", tone && `ie-stat--${tone}`)}>
      <span className="ie-stat-l">{label}</span>
      <span className="ie-stat-v">{value}</span>
    </div>
  );
}

// Horizontal flow: inode (left) → indirect levels (middle) → data block (right).
// Levels shown depend on the active region; the walked path is lit.
function InodeDiagram({ res }: { res: ReturnType<typeof resolve> }) {
  const region = res.region;
  const levels: Region[] = ["single", "double", "triple"];
  const activeLevelCount = region === "single" ? 1 : region === "double" ? 2 : region === "triple" ? 3 : 0;

  return (
    <div className="ie-diagram">
      {/* the inode */}
      <div className="ie-inode">
        <div className="ie-inode-title">inode</div>
        <div className="ie-direct">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={cx("ie-slot", region === "direct" && i === res.logicalBlock && "ie-slot--hot")}>{i}</span>
          ))}
        </div>
        <div className="ie-ptrs">
          <span className={cx("ie-ptr", region === "single" && "ie-ptr--hot")}>single ▸</span>
          <span className={cx("ie-ptr", region === "double" && "ie-ptr--hot")}>double ▸</span>
          <span className={cx("ie-ptr", region === "triple" && "ie-ptr--hot")}>triple ▸</span>
        </div>
      </div>

      {/* indirect blocks for the active region */}
      {region !== "out-of-range" &&
        levels.slice(0, activeLevelCount).map((lvl, i) => (
          <div key={lvl} className="ie-arrowbox">
            <span className="ie-arrow">→</span>
            <div className="ie-indirect ie-indirect--hot">
              <span className="ie-ind-t">L{i + 1} indirect</span>
              <span className="ie-ind-s">{res.path[i + 1]?.replace("→ ", "") ?? "index block"}</span>
            </div>
          </div>
        ))}

      {/* the data block (or an out-of-range marker) */}
      <div className="ie-arrowbox">
        <span className="ie-arrow">→</span>
        {region === "out-of-range" ? (
          <div className="ie-data ie-data--bad">beyond<br />max size</div>
        ) : (
          <div className="ie-data">
            <span className="ie-data-t">data</span>
            <span className="ie-data-s">block #{res.logicalBlock}</span>
          </div>
        )}
      </div>
    </div>
  );
}
