// [micro] disk-allocation (ch.24) — three ways to lay a file across blocks, and
// what each costs. Pick a method and add files to the block device:
//   • contiguous — one adjacent run (first-fit). Fast, but needs a big-enough
//     hole; deletions leave external fragmentation and a big file can fail to
//     fit even with plenty of free space.
//   • linked — any free blocks, each pointing to the next. Never fragments, but
//     random access must walk the chain.
//   • indexed — one index block lists the data blocks (the inode idea): cheap
//     random access, one block of overhead per file.
// Click a file's blocks to delete it. Reactive — no time axis. From ./model.ts.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { firstFit, freeCount, largestFreeRun, freeHoles, externalFragmentation, ALLOC_METHODS } from "./model.ts";
import type { AllocMethod } from "./model.ts";
import "../../../theme/_p6css/disk-allocation.css";

const ACCENT = "#22d3ee";
const N = 48;
const COLS = 12;
const PALETTE = ["#22d3ee", "#a78bfa", "#4ade80", "#fb923c", "#f472b6", "#facc15", "#38bdf8", "#f87171"];

type FileRec = { id: number; method: AllocMethod; data: number[]; index: number | null };

export default function DiskAllocation() {
  const [method, setMethod] = useState<AllocMethod>("contiguous");
  const [size, setSize] = useState(4);
  const [owner, setOwner] = useState<number[]>(() => new Array(N).fill(-1));
  const [indexSet, setIndexSet] = useState<Set<number>>(() => new Set());
  const [files, setFiles] = useState<FileRec[]>([]);
  const [nextId, setNextId] = useState(0);
  const [msg, setMsg] = useState<string>("");

  const free = useMemo(() => owner.map((o) => o === -1), [owner]);
  const stats = useMemo(
    () => ({
      free: freeCount(free),
      largest: largestFreeRun(free),
      holes: freeHoles(free),
      frag: externalFragmentation(free),
    }),
    [free],
  );

  function reset(): void {
    setOwner(new Array(N).fill(-1));
    setIndexSet(new Set());
    setFiles([]);
    setNextId(0);
    setMsg("");
  }

  function freeIndices(): number[] {
    const out: number[] = [];
    for (let i = 0; i < N; i++) if (owner[i] === -1) out.push(i);
    return out;
  }

  function addFile(): void {
    const id = nextId;
    const next = owner.slice();
    const idx = new Set(indexSet);

    if (method === "contiguous") {
      const start = firstFit(free, size);
      if (start === -1) {
        setMsg(`✗ contiguous: no free run of ${size} blocks — ${stats.free} free, but the largest hole is ${stats.largest}. External fragmentation defeats it.`);
        return;
      }
      const data: number[] = [];
      for (let i = start; i < start + size; i++) {
        next[i] = id;
        data.push(i);
      }
      setFiles([...files, { id, method, data, index: null }]);
    } else if (method === "linked") {
      const spots = freeIndices();
      if (spots.length < size) {
        setMsg(`✗ not enough free blocks: need ${size}, have ${spots.length}.`);
        return;
      }
      const data = spots.slice(0, size);
      for (const b of data) next[b] = id;
      setFiles([...files, { id, method, data, index: null }]);
    } else {
      // indexed — one index block + data blocks
      const spots = freeIndices();
      if (spots.length < size + 1) {
        setMsg(`✗ indexed needs ${size + 1} blocks (1 index + ${size} data), have ${spots.length}.`);
        return;
      }
      const index = spots[0];
      const data = spots.slice(1, size + 1);
      next[index] = id;
      idx.add(index);
      for (const b of data) next[b] = id;
      setFiles([...files, { id, method, data, index }]);
    }

    setOwner(next);
    setIndexSet(idx);
    setNextId(id + 1);
    setMsg("");
  }

  function removeFile(id: number): void {
    const f = files.find((x) => x.id === id);
    if (!f) return;
    const next = owner.slice();
    const idx = new Set(indexSet);
    for (const b of f.data) next[b] = -1;
    if (f.index !== null) {
      next[f.index] = -1;
      idx.delete(f.index);
    }
    setOwner(next);
    setIndexSet(idx);
    setFiles(files.filter((x) => x.id !== id));
    setMsg("");
  }

  function fragment(): void {
    // lay four size-3 files then delete the 2nd and 4th → scattered holes
    reset();
    const next = new Array(N).fill(-1);
    const fs: FileRec[] = [];
    let id = 0;
    for (let k = 0; k < 6; k++) {
      const start = k * 6;
      const data: number[] = [];
      for (let i = start; i < start + 4; i++) {
        next[i] = id;
        data.push(i);
      }
      fs.push({ id, method: "contiguous", data, index: null });
      id++;
    }
    // free the even-indexed files → four-block holes separated by files
    for (const del of [1, 3, 5]) {
      const f = fs[del];
      for (const b of f.data) next[b] = -1;
    }
    setOwner(next);
    setFiles(fs.filter((f) => ![1, 3, 5].includes(f.id)));
    setNextId(id);
    setMethod("contiguous");
    setSize(6);
    setMsg("Now try to add a 6-block contiguous file — there's room, but not in one run.");
  }

  const colorOf = (o: number) => (o === -1 ? "var(--line)" : PALETTE[o % PALETTE.length]);
  const status = `${method} · ${files.length} file${files.length === 1 ? "" : "s"} · ${stats.free}/${N} free · frag ${(stats.frag * 100).toFixed(0)}%`;

  return (
    <SimShell
      title="Disk allocation — contiguous vs linked vs indexed"
      simKey="disk-allocation"
      kind="micro"
      accent={ACCENT}
      onReset={reset}
      status={status}
      controls={
        <div className="da-ctl">
          <div className="bit-seg" role="group" aria-label="Allocation method">
            {ALLOC_METHODS.map((m) => (
              <button key={m.id} type="button" className={cx("bit-segbtn", method === m.id && "on")} onClick={() => { setMethod(m.id); setMsg(""); }} aria-pressed={method === m.id}>
                {m.label}
              </button>
            ))}
          </div>
          <label className="ss-field">
            file size
            <select aria-label="File size in blocks" value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[1, 2, 3, 4, 6, 8].map((v) => (
                <option key={v} value={v}>{v} blk</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={addFile}>＋ add file</button>
          <button type="button" className="btn" onClick={fragment}>fragment it</button>
        </div>
      }
      footer={
        <div className="da-foot">
          <div className="da-stats">
            <Stat label="free blocks" value={`${stats.free}/${N}`} />
            <Stat label="largest hole" value={`${stats.largest}`} />
            <Stat label="free holes" value={`${stats.holes}`} />
            <Stat label="external frag" value={`${(stats.frag * 100).toFixed(0)}%`} tone={stats.frag > 0.4 ? "warn" : "ok"} />
          </div>
          <p className="da-note">
            {ALLOC_METHODS.find((m) => m.id === method)?.blurb}
          </p>
          <p className="da-cost">
            random read of the k-th data block: <b>contiguous</b> 1 · <b>indexed</b> 2 · <b>linked</b> k+1 (walk the chain)
          </p>
          {msg && <p className={cx("da-msg", msg.startsWith("✗") && "da-msg--bad")}>{msg}</p>}
        </div>
      }
    >
      <div className="da-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} role="img" aria-label={`Disk of ${N} blocks, ${stats.free} free`}>
        {owner.map((o, i) => {
          const isIndex = indexSet.has(i);
          return (
            <button
              key={i}
              type="button"
              className={cx("da-block", o === -1 && "da-free", isIndex && "da-index")}
              style={o === -1 ? undefined : { background: colorOf(o), borderColor: colorOf(o) }}
              onClick={() => o !== -1 && removeFile(o)}
              disabled={o === -1}
              title={o === -1 ? `block ${i} — free` : `block ${i} — file ${o}${isIndex ? " (index)" : ""} · click to delete`}
              aria-label={o === -1 ? `block ${i} free` : `block ${i} file ${o}${isIndex ? " index" : ""}`}
            >
              {isIndex ? "i" : o === -1 ? "" : o}
            </button>
          );
        })}
      </div>
    </SimShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className={cx("da-stat", tone && `da-stat--${tone}`)}>
      <span className="da-stat-l">{label}</span>
      <span className="da-stat-v">{value}</span>
    </div>
  );
}
