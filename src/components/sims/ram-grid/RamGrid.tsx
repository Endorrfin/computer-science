// [micro] ram-grid — RAM is just an array of registers plus an address
// decoder. Set an address (in binary), watch the decoder light exactly ONE
// cell, then read or write a byte there. Change the address-bus width and see
// the headline law: one more address wire DOUBLES the memory you can name.
// Reused by ch.8 (caches), ch.14 (arrays), ch.23 (virtual memory).
// Engine: machine/memory.ts. Reactive.
import { useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { decodeOneHot, makeRam, ramCapacityBytes, ramRead, ramWrite } from "../machine/memory.ts";
import type { Ram } from "../machine/memory.ts";

const ACCENT = "#FB923C";
const WORD_BITS = 8;

const seed = (addrBits: number): Ram => {
  let ram = makeRam(addrBits, WORD_BITS, 0);
  // a few non-zero bytes so reads are interesting from the start
  const demo: [number, number][] = [
    [0, 0x2a],
    [1, 0xff],
    [3, 0x80],
    [5, 0x01],
  ];
  for (const [a, v] of demo) if (a < 1 << addrBits) ram = ramWrite(ram, a, v, 1);
  return ram;
};

export default function RamGrid() {
  const [addrBits, setAddrBits] = useState(4);
  const [ram, setRam] = useState<Ram>(() => seed(4));
  const [addr, setAddr] = useState(0);
  const [data, setData] = useState(0x2a);
  const [flash, setFlash] = useState<{ i: number; kind: "read" | "write" } | null>(null);

  const size = 1 << addrBits;
  const oneHot = decodeOneHot(addr, addrBits);
  const cols = size <= 8 ? 4 : size <= 16 ? 4 : 8;

  function setBits(nb: number) {
    setAddrBits(nb);
    setRam(seed(nb));
    setAddr((a) => a & ((1 << nb) - 1));
    setFlash(null);
  }
  function doRead() {
    setFlash({ i: addr, kind: "read" });
  }
  function doWrite() {
    setRam((rm) => ramWrite(rm, addr, data, 1));
    setFlash({ i: addr, kind: "write" });
  }
  function onReset() {
    setBits(4);
    setAddr(0);
    setData(0x2a);
  }

  const readVal = ramRead(ram, addr);
  const hex = (v: number) => v.toString(16).toUpperCase().padStart(2, "0");

  return (
    <SimShell
      title="RAM — address in, one byte out"
      simKey="ram-grid"
      accent={ACCENT}
      onReset={onReset}
      status={`address ${addr} (${addr.toString(2).padStart(addrBits, "0")}₂) → cell holds 0x${hex(readVal)} (${readVal}). ${addrBits} address wires ⇒ ${size} cells = ${ramCapacityBytes(addrBits, WORD_BITS)} bytes.`}
      controls={
        <div className="ram-ctl">
          <div className="bit-seg" role="group" aria-label="Address bus width">
            {[3, 4, 5].map((nb) => (
              <button key={nb} type="button" className={cx("bit-segbtn", addrBits === nb && "on")} onClick={() => setBits(nb)}>
                {nb} wires
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="ram-bus">
        <div className="ram-addr">
          <span className="ram-lbl">address</span>
          <span className="ram-addr-bits">
            {Array.from({ length: addrBits }, (_, i) => {
              const bitIndex = addrBits - 1 - i;
              const on = (addr >> bitIndex) & 1;
              return (
                <button key={i} type="button" className={cx("bit-cell", on !== 0 && "on")} onClick={() => setAddr(addr ^ (1 << bitIndex))} aria-label={`address bit ${bitIndex} = ${on}`}>
                  {on}
                </button>
              );
            })}
          </span>
          <span className="ram-dec muted">= {addr}</span>
        </div>

        <div className="ram-decoder" aria-hidden="true">
          <span className="ram-lbl">decoder</span>
          <span className="ram-arrow">▶ one-hot ▶</span>
        </div>

        <div className="ram-data">
          <label className="ss-field">
            data byte
            <input
              className="bit-input"
              type="number"
              min={0}
              max={255}
              value={data}
              onChange={(e) => setData(Math.max(0, Math.min(255, Number(e.target.value) | 0)))}
              aria-label="Data byte to write (0–255)"
            />
          </label>
          <div className="ram-ops">
            <button type="button" className="btn" onClick={doRead}>
              read
            </button>
            <button type="button" className="btn btn-primary" onClick={doWrite}>
              write
            </button>
          </div>
        </div>
      </div>

      <div className="ram-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} role="grid" aria-label="Memory cells">
        {ram.cells.map((v, i) => {
          const selected = oneHot[i] === 1;
          const isFlash = flash?.i === i;
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              className={cx("ram-cell", selected && "sel", v !== 0 && "nonzero", isFlash && (flash?.kind === "write" ? "flash-w" : "flash-r"))}
              onClick={() => setAddr(i)}
              aria-label={`cell ${i} = ${v}${selected ? ", selected" : ""}`}
              aria-selected={selected}
            >
              <span className="ram-cell-addr">{i.toString(2).padStart(addrBits, "0")}</span>
              <span className="ram-cell-val">{hex(v)}</span>
            </button>
          );
        })}
      </div>

      <p className="lsb-canvas-hint muted">
        The decoder turns an <b>n-bit address</b> into exactly one of <b>2ⁿ</b> word-lines — that’s a demultiplexer, the mirror of
        ch.5’s mux. Click a cell (or type the address in binary), then <b>write</b> a byte and <b>read</b> it back. Widen the bus:
        3→4→5 wires steps capacity 8→16→32 cells. This is why a 32-bit CPU tops out at 4 GB of addresses and why 64-bit exists.
      </p>
    </SimShell>
  );
}
