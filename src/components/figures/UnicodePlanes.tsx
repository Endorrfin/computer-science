// [fig] unicode-planes — the code space, stepped outward from ASCII's 128
// slots to Unicode's 1.1M. Facts current to Unicode 17.0 (2026): 297,334
// assigned code points across 172 scripts; 18.0 ships Sept 2026.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";

function Grid({ cols, rows, cell, x, y, lit, dim }: { cols: number; rows: number; cell: number; x: number; y: number; lit?: (i: number) => boolean; dim?: (i: number) => boolean }) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const on = lit ? lit(i) : true;
      const isDim = dim ? dim(i) : false;
      cells.push(
        <rect
          key={i}
          x={x + c * cell}
          y={y + r * cell}
          width={cell - 1.5}
          height={cell - 1.5}
          rx="1"
          fill={isDim ? "var(--line)" : on ? "var(--sem-data)" : "var(--s2)"}
          opacity={isDim ? 0.6 : on ? 0.75 : 1}
          stroke="var(--bg)"
          strokeWidth="0.5"
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

const FRAMES: Frame[] = [
  {
    caption:
      "1963 — ASCII. 128 code points fit in 7 bits: the English alphabet, digits, punctuation, and 33 invisible control codes (dimmed). Enough for an American teletype; blind to the rest of the world.",
    render: () => (
      <g>
        <Grid cols={16} rows={8} cell={20} x={120} y={30} dim={(i) => i < 33 || i === 127} />
        <text x={280} y={210} textAnchor="middle" fill="var(--tx2)" fontFamily="var(--font-mono)" fontSize="12">
          ASCII · 128 code points · 7 bits
        </text>
      </g>
    ),
  },
  {
    caption:
      "The byte era. Eight bits gave 256 slots — but everyone filled the top half differently. Byte 0xE9 was 'é' in Western Europe, 'щ' in one Cyrillic page, something else again elsewhere. The same bytes, mutually unreadable text.",
    render: () => (
      <g fontFamily="var(--font-mono)" fontSize="13">
        <rect x={240} y={40} width={80} height={40} rx="6" fill="var(--s2)" stroke="var(--tx2)" />
        <text x={280} y={65} textAnchor="middle" fill="var(--tx)">
          0xE9
        </text>
        {[
          { g: "é", lbl: "Latin-1", y: 120 },
          { g: "щ", lbl: "KOI8-R", y: 150 },
          { g: "ι", lbl: "Greek-8", y: 180 },
        ].map((row, k) => (
          <g key={k}>
            <line x1={280} y1={80} x2={200 + k * 80} y2={row.y - 12} stroke="var(--sem-err)" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x={200 + k * 80} y={row.y} textAnchor="middle" fill="var(--sem-err)" fontSize="16">
              {row.g}
            </text>
            <text x={200 + k * 80} y={row.y + 16} textAnchor="middle" fill="var(--tx3)" fontSize="10">
              {row.lbl}
            </text>
          </g>
        ))}
        <text x={280} y={28} textAnchor="middle" fill="var(--sem-err)" fontSize="12">
          one byte, many meanings → chaos
        </text>
      </g>
    ),
  },
  {
    caption:
      "Unicode's fix: give every character one universal number — a code point — independent of any encoding. Plane 0, the Basic Multilingual Plane, holds 65,536 of them: nearly every living script lives in here.",
    render: () => (
      <g>
        <Grid cols={16} rows={10} cell={13} x={190} y={20} lit={(i) => i < 150} />
        <text x={280} y={175} textAnchor="middle" fill="var(--tx2)" fontFamily="var(--font-mono)" fontSize="12">
          Plane 0 · the BMP · U+0000–U+FFFF
        </text>
        <text x={280} y={196} textAnchor="middle" fill="var(--tx3)" fontFamily="var(--font-mono)" fontSize="10">
          Latin · Greek · Cyrillic · Arabic · Hebrew · CJK · …
        </text>
      </g>
    ),
  },
  {
    caption:
      "Above the BMP, 16 more 'astral' planes. Plane 1 is where emoji and historic scripts live; Plane 2 is extended CJK. 17 planes in all → 1,114,112 possible code points. UTF-8 reaches every one with up to 4 bytes.",
    render: () => (
      <g fontFamily="var(--font-mono)" fontSize="10">
        {Array.from({ length: 17 }, (_, p) => {
          const filled = p === 0 || p === 1 || p === 2 || p === 14 || p >= 15;
          return (
            <g key={p}>
              <rect x={60 + p * 26} y={70} width={22} height={60} rx="2" fill={filled ? "var(--sem-data)" : "var(--s2)"} opacity={filled ? 0.75 : 1} stroke="var(--line)" />
              <text x={71 + p * 26} y={144} textAnchor="middle" fill="var(--tx3)" fontSize="9">
                {p}
              </text>
            </g>
          );
        })}
        <text x={71} y={60} textAnchor="middle" fill="var(--sem-data)" fontSize="9">
          BMP
        </text>
        <text x={97} y={60} textAnchor="middle" fill="var(--sem-data)" fontSize="9">
          emoji
        </text>
        <text x={280} y={172} textAnchor="middle" fill="var(--tx2)" fontSize="12">
          17 planes · 1,114,112 code points
        </text>
      </g>
    ),
  },
  {
    caption:
      "Today (Unicode 17.0, 2026): 297,334 code points assigned across 172 scripts — about 27% of the space, with centuries of room to grow (18.0 lands Sept 2026). And crucially, ASCII text is still valid UTF-8, byte-for-byte. Backward compatible forever.",
    render: () => (
      <g fontFamily="var(--font-mono)">
        <rect x={60} y={70} width={440} height={30} rx="4" fill="var(--s2)" stroke="var(--line)" />
        <rect x={60} y={70} width={440 * (297334 / 1114112)} height={30} rx="4" fill="var(--sem-data)" opacity="0.8" />
        <text x={64} y={62} fill="var(--sem-data)" fontSize="11">
          297,334 assigned
        </text>
        <text x={500} y={62} textAnchor="end" fill="var(--tx3)" fontSize="11">
          1,114,112 total
        </text>
        <text x={280} y={132} textAnchor="middle" fill="var(--tx2)" fontSize="12">
          172 scripts · one number per character · UTF-8 keeps ASCII 1 byte
        </text>
        <text x={280} y={154} textAnchor="middle" fill="var(--tx3)" fontSize="10">
          ~27% used — the encoding that finally let every language share one file
        </text>
      </g>
    ),
  },
];

export default function UnicodePlanes() {
  return (
    <FigureStepper title="The Unicode code space, from ASCII outward" figKey="unicode-planes" viewBox="0 0 560 220" accent="#FACC15" frames={FRAMES} />
  );
}
