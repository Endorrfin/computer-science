// abstraction-elevator [micro] — ch.10 (INTERACTIVES.md). One program shown at
// four heights: TypeScript → C → assembly → machine code. Hover (or focus) any
// line and the SAME idea lights up on every floor — so you can see a single
// `sum = a + b` become two instructions and a handful of bytes. The bottom two
// floors are the real ch.7 ISA + its assembler output (program.ts, locked by
// test-p3.ts), tying "code" back to the machine that runs it.
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { cx } from "../../../lib/utils.ts";
import { assemble, disassemble } from "../machine/cpu.ts";
import { ASM_LINES, C_LINES, ELEVATOR_ASM, LINKS, TS_LINES } from "./program.ts";

const ACCENT = "#A3E635";
type FloorId = "ts" | "c" | "asm" | "mc";

export default function AbstractionElevator() {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = hover ?? pinned;

  // machine-code floor = ch.7's assembler output for the same program
  const mcLines = useMemo(
    () =>
      assemble(ELEVATOR_ASM).listing.map((r) => ({
        hex: r.byte.toString(16).toUpperCase().padStart(2, "0"),
        text: r.kind === "code" ? disassemble(r.byte) : `${r.byte}${r.label ? " " + r.label.replace(/:.*/, "") : ""}`,
      })),
    [],
  );

  // reverse map: for each floor + line index, which LINK owns it (or -1)
  const owner = useMemo(() => {
    const m: Record<FloorId, number[]> = {
      ts: TS_LINES.map(() => -1),
      c: C_LINES.map(() => -1),
      asm: ASM_LINES.map(() => -1),
      mc: mcLines.map(() => -1),
    };
    LINKS.forEach((link, g) => {
      link.ts.forEach((i) => (m.ts[i] = g));
      link.c.forEach((i) => (m.c[i] = g));
      link.asm.forEach((i) => (m.asm[i] = g));
      link.mc.forEach((i) => (m.mc[i] = g));
    });
    return m;
  }, [mcLines]);

  const floors: { id: FloorId; label: string; lang: string; lines: string[] }[] = [
    { id: "ts", label: "TypeScript", lang: "high level — what you write", lines: TS_LINES },
    { id: "c", label: "C", lang: "lower — explicit types, still portable", lines: C_LINES },
    { id: "asm", label: "Assembly (ch.7 ISA)", lang: "the CPU's own words, human-readable", lines: ASM_LINES },
    { id: "mc", label: "Machine code", lang: "the actual bytes in RAM", lines: mcLines.map((m) => `${m.hex}   ${m.text}`) },
  ];

  const setActive = (floor: FloorId, i: number) => setHover(owner[floor][i] >= 0 ? owner[floor][i] : null);

  return (
    <SimShell
      title="abstraction-elevator — one program, four heights"
      simKey="abstraction-elevator"
      accent={ACCENT}
      onReset={() => {
        setPinned(null);
        setHover(null);
      }}
      status={active !== null ? `Highlighting: ${LINKS[active].label} — the same idea on every floor.` : "Hover or click a line to see it on every floor."}
    >
      <div className="elev">
        <p className="muted elev-hint">
          The elevator goes down from what you <b>write</b> to what the machine <b>runs</b>. Each step is a translation —
          and a compiler (ch.11) automates the whole descent.
        </p>
        {floors.map((fl) => (
          <div key={fl.id} className="elev-floor">
            <div className="elev-floor-head">
              <span className="elev-floor-name">{fl.label}</span>
              <span className="muted elev-floor-lang">{fl.lang}</span>
            </div>
            <div className="elev-lines">
              {fl.lines.map((line, i) => {
                const g = owner[fl.id][i];
                const lit = active !== null && g === active;
                const linked = g >= 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className={cx("elev-line", lit && "lit", !linked && "dim")}
                    onMouseEnter={() => setActive(fl.id, i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setActive(fl.id, i)}
                    onBlur={() => setHover(null)}
                    onClick={() => setPinned(linked ? (pinned === g ? null : g) : null)}
                    aria-pressed={lit}
                  >
                    {line}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SimShell>
  );
}
