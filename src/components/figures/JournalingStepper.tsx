// [fig] journaling (ch.24) — how a file system survives a crash mid-update. A
// single logical change (say, append a block) touches several on-disk
// structures; a crash between those writes leaves the file system inconsistent.
// Journaling writes the intent to a log and commits it FIRST, then checkpoints
// to the real locations — so recovery is decidable: no commit ⇒ discard, commit
// present ⇒ replay. Stepped SVG (§6). Palette: pending = amber, committed =
// green, crash = red, untouched = muted.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import type { ReactNode } from "react";

type BoxTone = "idle" | "pending" | "done" | "bad";

function Box({ x, y, w, label, sub, tone = "idle" }: { x: number; y: number; w: number; label: string; sub?: string; tone?: BoxTone }): ReactNode {
  const color = tone === "pending" ? "var(--sem-control)" : tone === "done" ? "var(--sem-ok)" : tone === "bad" ? "var(--sem-err)" : "var(--line)";
  const fill = tone === "idle" ? "var(--surface)" : `color-mix(in srgb, ${color} 16%, var(--surface))`;
  return (
    <g fontFamily="var(--font-mono)">
      <rect x={x} y={y} width={w} height={40} rx={6} fill={fill} stroke={color} strokeWidth={tone === "idle" ? 1.5 : 2.25} />
      <text x={x + w / 2} y={y + (sub ? 18 : 25)} textAnchor="middle" fontSize="12.5" fontWeight={700} fill={tone === "idle" ? "var(--tx3)" : "var(--tx)"}>{label}</text>
      {sub && <text x={x + w / 2} y={y + 32} textAnchor="middle" fontSize="9.5" fill="var(--tx3)">{sub}</text>}
    </g>
  );
}

function Lane({ y, title }: { y: number; title: string }): ReactNode {
  return (
    <text x={24} y={y} fontSize="11" fontFamily="var(--font-mono)" fill="var(--tx2)" fontWeight={700}>{title}</text>
  );
}

function crash(x: number, y: number): ReactNode {
  return (
    <g>
      <text x={x} y={y} fontSize="30" textAnchor="middle">⚡</text>
      <text x={x} y={y + 18} fontSize="11" textAnchor="middle" fill="var(--sem-err)" fontFamily="var(--font-mono)" fontWeight={700}>CRASH</text>
    </g>
  );
}

function note(text: string): ReactNode {
  return <text x={24} y={378} fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx2)">{text}</text>;
}

// journal cells at top, final-location cells below
const JX = 150;
const JW = 96;
const jx = (i: number) => JX + i * (JW + 12);
const DX = 150;
const DW = 150;
const dx = (i: number) => DX + i * (DW + 16);

const FRAMES: Frame[] = [
  {
    caption:
      "One logical change — append a block to a file — touches THREE on-disk structures: the data block, the free-space bitmap, and the inode. They can't be written in one atomic step; the disk takes them one at a time.",
    render: () => (
      <g>
        <Lane y={90} title="final locations (the file system)" />
        <Box x={dx(0)} y={100} w={DW} label="data block" sub="the new bytes" />
        <Box x={dx(1)} y={100} w={DW} label="bitmap" sub="mark block used" />
        <Box x={dx(2)} y={100} w={DW} label="inode" sub="size + pointer" />
        {note("three writes must all land — or none. how?")}
      </g>
    ),
  },
  {
    caption:
      "The danger: a crash BETWEEN those writes. If the bitmap says 'used' but the inode never got the pointer, that block is leaked; the reverse double-allocates. A half-applied update is a corrupt file system.",
    render: () => (
      <g>
        <Lane y={90} title="final locations (the file system)" />
        <Box x={dx(0)} y={100} w={DW} label="data block" sub="written" tone="done" />
        <Box x={dx(1)} y={100} w={DW} label="bitmap" sub="written" tone="done" />
        <Box x={dx(2)} y={100} w={DW} label="inode" sub="NOT written" tone="bad" />
        {crash(dx(2) + DW / 2, 190)}
        {note("crash here → bitmap & inode disagree → inconsistent")}
      </g>
    ),
  },
  {
    caption:
      "Journaling's fix: write the intended changes to a log FIRST, before touching the real locations. The journal records a transaction-begin marker and the three pending blocks — but it is not yet trusted.",
    render: () => (
      <g>
        <Lane y={48} title="journal (write-ahead log)" />
        <Box x={jx(0)} y={58} w={JW} label="TxBegin" tone="pending" />
        <Box x={jx(1)} y={58} w={JW} label="data" tone="pending" />
        <Box x={jx(2)} y={58} w={JW} label="bitmap" tone="pending" />
        <Box x={jx(3)} y={58} w={JW} label="inode" tone="pending" />
        <Lane y={150} title="final locations (the file system)" />
        <Box x={dx(0)} y={160} w={DW} label="data block" sub="untouched" />
        <Box x={dx(1)} y={160} w={DW} label="bitmap" sub="untouched" />
        <Box x={dx(2)} y={160} w={DW} label="inode" sub="untouched" />
        {note("log the intent first; the real file system is still untouched")}
      </g>
    ),
  },
  {
    caption:
      "Then write the COMMIT record. This single write is the atomic switch: once it is durably on disk, the transaction is officially real. The commit is small, so writing it is effectively atomic.",
    render: () => (
      <g>
        <Lane y={48} title="journal (write-ahead log)" />
        <Box x={jx(0)} y={58} w={JW} label="TxBegin" tone="done" />
        <Box x={jx(1)} y={58} w={JW} label="data" tone="done" />
        <Box x={jx(2)} y={58} w={JW} label="bitmap" tone="done" />
        <Box x={jx(3)} y={58} w={JW} label="inode" tone="done" />
        <Box x={jx(4)} y={58} w={JW} label="✓ Commit" tone="done" />
        <Lane y={150} title="final locations (the file system)" />
        <Box x={dx(0)} y={160} w={DW} label="data block" sub="untouched" />
        <Box x={dx(1)} y={160} w={DW} label="bitmap" sub="untouched" />
        <Box x={dx(2)} y={160} w={DW} label="inode" sub="untouched" />
        {note("commit lands → the transaction is now durable & official")}
      </g>
    ),
  },
  {
    caption:
      "Only now does the OS checkpoint: copy the logged blocks to their real homes. If a crash interrupts THIS step, recovery just replays the committed journal — the writes are idempotent, so re-doing them is safe. Committed ⇒ replay.",
    render: () => (
      <g>
        <Lane y={48} title="journal (write-ahead log)" />
        <Box x={jx(0)} y={58} w={JW} label="TxBegin" tone="done" />
        <Box x={jx(1)} y={58} w={JW} label="data" tone="done" />
        <Box x={jx(2)} y={58} w={JW} label="bitmap" tone="done" />
        <Box x={jx(3)} y={58} w={JW} label="inode" tone="done" />
        <Box x={jx(4)} y={58} w={JW} label="✓ Commit" tone="done" />
        <Lane y={150} title="final locations (the file system)" />
        <Box x={dx(0)} y={160} w={DW} label="data block" sub="checkpointed" tone="done" />
        <Box x={dx(1)} y={160} w={DW} label="bitmap" sub="checkpointed" tone="done" />
        <Box x={dx(2)} y={160} w={DW} label="inode" sub="checkpointed" tone="done" />
        {note("checkpoint copies log → home; crash mid-copy ⇒ just replay")}
      </g>
    ),
  },
  {
    caption:
      "The payoff, both crash cases. Crash BEFORE the commit: the journal has no commit record, so recovery discards the transaction — the file system is exactly as before, no corruption. Crash AFTER commit: recovery replays it to completion. Either way, consistent.",
    render: () => (
      <g>
        <rect x={40} y={60} width={260} height={110} rx={8} fill="color-mix(in srgb, var(--sem-err) 10%, var(--surface))" stroke="var(--sem-err)" strokeWidth={1.75} />
        <text x={170} y={84} textAnchor="middle" fontSize="12.5" fontWeight={700} fill="var(--sem-err)" fontFamily="var(--font-head)">crash BEFORE commit</text>
        <text x={170} y={112} textAnchor="middle" fontSize="11" fill="var(--tx2)" fontFamily="var(--font-mono)">no commit record</text>
        <text x={170} y={132} textAnchor="middle" fontSize="11" fill="var(--tx2)" fontFamily="var(--font-mono)">→ discard the transaction</text>
        <text x={170} y={152} textAnchor="middle" fontSize="11.5" fontWeight={700} fill="var(--sem-ok)" fontFamily="var(--font-mono)">FS unchanged ✓</text>

        <rect x={340} y={60} width={260} height={110} rx={8} fill="color-mix(in srgb, var(--sem-ok) 10%, var(--surface))" stroke="var(--sem-ok)" strokeWidth={1.75} />
        <text x={470} y={84} textAnchor="middle" fontSize="12.5" fontWeight={700} fill="var(--sem-ok)" fontFamily="var(--font-head)">crash AFTER commit</text>
        <text x={470} y={112} textAnchor="middle" fontSize="11" fill="var(--tx2)" fontFamily="var(--font-mono)">commit present</text>
        <text x={470} y={132} textAnchor="middle" fontSize="11" fill="var(--tx2)" fontFamily="var(--font-mono)">→ replay the journal</text>
        <text x={470} y={152} textAnchor="middle" fontSize="11.5" fontWeight={700} fill="var(--sem-ok)" fontFamily="var(--font-mono)">FS consistent ✓</text>
        {note("the commit record makes recovery a decision, not a guess")}
      </g>
    ),
  },
];

export default function JournalingStepper() {
  return <FigureStepper title="Journaling — surviving a crash mid-update" figKey="journaling" viewBox="0 0 680 400" accent="#22d3ee" frames={FRAMES} />;
}
