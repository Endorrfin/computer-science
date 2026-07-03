// huffman-lab [HERO] — ch.3's centerpiece (INTERACTIVES.md): type text, watch
// frequencies sort into bars, the Huffman tree assemble one merge at a time
// (transport-stepped), and the bitstream shrink below its ASCII size. Also
// hosts the P1 boss "decode the mystery file" → markChallengeDone("boss-p1").
import { useMemo, useState } from "react";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { markChallengeDone, useChallengesDone } from "../../../lib/progress.ts";
import { cx } from "../../../lib/utils.ts";
import {
  codeTable,
  decode,
  depthOf,
  huffmanBuild,
  mysteryPuzzle,
  stats,
} from "./model.ts";
import type { HuffInternal, HuffNode } from "./model.ts";

const ACCENT = "#FACC15";
const glyph = (s: string) => (s === " " ? "␣" : s);

// ---------- tree layout ----------
type Pos = { x: number; y: number };
function layout(root: HuffNode): { pos: Map<number, Pos>; leaves: number; depth: number } {
  const pos = new Map<number, Pos>();
  let leafX = 0;
  let maxDepth = 0;
  const visit = (n: HuffNode, d: number): number => {
    maxDepth = Math.max(maxDepth, d);
    if (n.kind === "leaf") {
      const x = leafX++;
      pos.set(n.seq, { x, y: d });
      return x;
    }
    const lx = visit(n.left, d + 1);
    const rx = visit(n.right, d + 1);
    const x = (lx + rx) / 2;
    pos.set(n.seq, { x, y: d });
    return x;
  };
  visit(root, 0);
  return { pos, leaves: leafX, depth: maxDepth };
}

const SAMPLE = "she sells sea shells";

export default function HuffmanLab() {
  const [mode, setMode] = useState<"build" | "boss">("build");
  return (
    <SimShell
      title="Huffman lab — squeeze text to its entropy"
      simKey="huffman-lab"
      kind="hero"
      accent={ACCENT}
      onReset={() => setMode("build")}
      controls={
        <label className="ss-field">
          mode
          <select aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value as "build" | "boss")}>
            <option value="build">build a code</option>
            <option value="boss">🔍 boss · decode the mystery file</option>
          </select>
        </label>
      }
    >
      {mode === "build" ? <BuildMode /> : <BossMode />}
    </SimShell>
  );
}

// ================= build mode =================
function BuildMode() {
  const [text, setText] = useState(SAMPLE);
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);

  const clean = text.slice(0, 60);
  const { root, steps, freqs } = useMemo(() => huffmanBuild(clean), [clean]);
  const table = useMemo(() => codeTable(root), [root]);
  const st = stats(clean, table);
  const totalSteps = steps.length;
  const done = step >= totalSteps;

  // reset the animation when the text (and thus the tree) changes
  const treeKey = freqs.map((f) => `${f.symbol}${f.count}`).join("|");
  const [lastKey, setLastKey] = useState(treeKey);
  if (treeKey !== lastKey) {
    setLastKey(treeKey);
    setStep(0);
    setRunning(false);
  }

  function tick() {
    setStep((s) => {
      if (s >= totalSteps) {
        setRunning(false);
        return s;
      }
      return s + 1;
    });
  }
  useSimClock(running, 1.4 * speed, tick);

  const maxCount = Math.max(1, ...freqs.map((f) => f.count));
  const status = done
    ? `Tree complete · ${freqs.length} symbols · ${st.huffBits} bits vs ${st.asciiBits} ASCII bits → ${st.ratio.toFixed(2)}× smaller (${st.avgBitsPerSymbol.toFixed(2)} bits/symbol).`
    : `Building… merge ${step} of ${totalSteps}. Each step fuses the two lowest-weight nodes — rarest symbols sink deepest and get the longest codes.`;

  return (
    <div className="huf">
      <label className="huf-inputrow">
        <span className="ss-field">text</span>
        <input className="bit-input huf-input" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to compress" spellCheck={false} />
      </label>

      <div className="huf-transport">
        <button type="button" className="btn" onClick={() => setRunning((r) => !r)} disabled={done}>
          {running ? "⏸ pause" : "▶ build"}
        </button>
        <button type="button" className="btn" onClick={tick} disabled={running || done}>
          ⏭ merge
        </button>
        <button type="button" className="btn" onClick={() => { setStep(0); setRunning(false); }}>
          ↺ restart
        </button>
        <button type="button" className="btn" onClick={() => { setStep(totalSteps); setRunning(false); }} disabled={done}>
          ⏩ finish
        </button>
        <label className="ss-speed">
          <span aria-hidden="true">speed</span>
          <select aria-label="Build speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {[0.5, 1, 2, 4].map((s) => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>
      </div>

      <p className="ss-status huf-status" aria-live="polite">{status}</p>

      <div className="huf-panels">
        <div className="huf-freqs" aria-label="symbol frequencies">
          <div className="huf-caption">frequencies (rarest get the longest codes)</div>
          {freqs.map((f) => (
            <div key={f.symbol} className="huf-fbar">
              <span className="huf-fsym">{glyph(f.symbol)}</span>
              <span className="huf-ftrack">
                <span className="huf-ffill" style={{ width: `${(f.count / maxCount) * 100}%` }} />
              </span>
              <span className="huf-fcount">{f.count}</span>
              {done && <code className="huf-fcode">{table.get(f.symbol)}</code>}
            </div>
          ))}
        </div>

        <TreeView root={root} steps={steps} step={step} />
      </div>

      {done && root && (
        <div className="huf-out">
          <div className="huf-meter">
            <div className="huf-bar ascii">
              <span className="huf-barlabel">ASCII · {st.asciiBits} bits</span>
              <span className="huf-barfill" style={{ width: "100%" }} />
            </div>
            <div className="huf-bar huff">
              <span className="huf-barlabel">Huffman · {st.huffBits} bits</span>
              <span className="huf-barfill" style={{ width: `${Math.max(6, (st.huffBits / st.asciiBits) * 100)}%` }} />
            </div>
            <div className="huf-ratio">
              {st.ratio.toFixed(2)}× smaller
              <span className="huf-sub">{st.savedPct.toFixed(0)}% saved · {st.avgBitsPerSymbol.toFixed(2)} bits/symbol · tree depth {depthOf(root)}</span>
            </div>
          </div>
          <div className="huf-stream" aria-label="encoded bitstream">
            {[...clean].slice(0, 40).map((ch, i) => (
              <span key={i} className={cx("huf-chunk", i % 2 === 0 && "alt")} title={`${glyph(ch)} → ${table.get(ch)}`}>
                {table.get(ch)}
              </span>
            ))}
            {clean.length > 40 && <span className="huf-more">…</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function TreeView({ root, steps, step }: { root: HuffNode | null; steps: ReturnType<typeof huffmanBuild>["steps"]; step: number }) {
  if (!root) return <div className="huf-tree empty muted">Type some text to grow a tree.</div>;

  const { pos, leaves, depth } = layout(root);
  const W = 360;
  const H = Math.max(140, (depth + 1) * 52);
  const padX = 26;
  const mapX = (x: number) => (leaves <= 1 ? W / 2 : padX + (x / (leaves - 1)) * (W - 2 * padX));
  const mapY = (y: number) => 24 + y * ((H - 44) / Math.max(1, depth));

  const stepOf = new Map<number, number>();
  steps.forEach((s, i) => stepOf.set(s.parent.seq, i));
  const shown = (n: HuffNode): boolean => n.kind === "leaf" || (stepOf.get(n.seq) ?? Infinity) < step;
  const active = new Set<number>();
  if (step > 0 && step <= steps.length) {
    active.add(steps[step - 1].a.seq);
    active.add(steps[step - 1].b.seq);
    active.add(steps[step - 1].parent.seq);
  }

  const edges: HuffNode[] = [];
  const collect = (n: HuffNode): void => {
    if (n.kind === "internal") {
      edges.push(n);
      collect(n.left);
      collect(n.right);
    }
  };
  collect(root);

  return (
    <div className="huf-tree">
      <div className="huf-caption">the code tree — assembles from the leaves up</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="huf-svg" role="img" aria-label="Huffman tree">
        {edges.filter(shown).map((n) => {
          const p = pos.get(n.seq) as Pos;
          const int = n as HuffInternal;
          return [int.left, int.right].map((c, k) => {
            const cp = pos.get(c.seq) as Pos;
            return (
              <g key={`${n.seq}-${k}`}>
                <line x1={mapX(p.x)} y1={mapY(p.y)} x2={mapX(cp.x)} y2={mapY(cp.y)} stroke="var(--line)" strokeWidth="1.5" />
                <text x={(mapX(p.x) + mapX(cp.x)) / 2 - 4} y={(mapY(p.y) + mapY(cp.y)) / 2} fill="var(--tx3)" fontFamily="var(--font-mono)" fontSize="11">
                  {k === 0 ? "0" : "1"}
                </text>
              </g>
            );
          });
        })}
        {[...pos.entries()].map(([seq, p]) => {
          const node = findBySeq(root, seq);
          if (!node || !shown(node)) return null;
          const isActive = active.has(seq);
          if (node.kind === "leaf") {
            return (
              <g key={seq} transform={`translate(${mapX(p.x)} ${mapY(p.y)})`}>
                <rect x={-13} y={-11} width={26} height={22} rx={4} fill={isActive ? "color-mix(in srgb, var(--sem-control) 40%, var(--s2))" : "var(--s2)"} stroke={isActive ? "var(--sem-control)" : "var(--sem-data)"} strokeWidth="1.5" />
                <text y="4" textAnchor="middle" fill="var(--tx)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">{glyph(node.symbol)}</text>
                <text y="24" textAnchor="middle" fill="var(--tx3)" fontFamily="var(--font-mono)" fontSize="10">{node.count}</text>
              </g>
            );
          }
          return (
            <g key={seq} transform={`translate(${mapX(p.x)} ${mapY(p.y)})`}>
              <circle r="11" fill={isActive ? "color-mix(in srgb, var(--sem-control) 35%, var(--surface))" : "var(--surface)"} stroke={isActive ? "var(--sem-control)" : "var(--tx3)"} strokeWidth="1.5" />
              <text y="4" textAnchor="middle" fill="var(--tx2)" fontFamily="var(--font-mono)" fontSize="10">{node.count}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function findBySeq(n: HuffNode, seq: number): HuffNode | null {
  if (n.seq === seq) return n;
  if (n.kind === "internal") return findBySeq(n.left, seq) ?? findBySeq(n.right, seq);
  return null;
}

// ================= boss mode: decode the mystery file =================
function BossMode() {
  const puzzle = useMemo(() => mysteryPuzzle(), []);
  const challengesDone = useChallengesDone();
  const cleared = challengesDone.has("boss-p1");

  const [consumed, setConsumed] = useState(0); // bits decoded so far via the helper
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<string | null>(null);

  const revealed = decode(puzzle.bits.slice(0, consumed), puzzle.root);
  // decode one more symbol: extend `consumed` until decode() yields one extra char
  function revealNext() {
    const before = decode(puzzle.bits.slice(0, consumed), puzzle.root).length;
    let c = consumed;
    while (c < puzzle.bits.length && decode(puzzle.bits.slice(0, c), puzzle.root).length <= before) c++;
    setConsumed(c);
  }

  function check() {
    if (guess.trim().toUpperCase() === puzzle.secret) {
      setVerdict("ok");
      markChallengeDone("boss-p1");
    } else {
      setVerdict("no");
    }
  }

  const codeRows = [...puzzle.table.entries()].sort((a, b) => a[1].length - b[1].length);

  return (
    <div className={cx("huf-boss", verdict === "ok" && "ok")}>
      <div className="huf-boss-head">
        <span className="quiz-tag">boss</span>
        <strong>Decode the mystery file</strong>
        <span className="muted">badge: Bitreader {cleared && "✓ earned"}</span>
      </div>
      <p className="huf-boss-story">
        A file lands on your desk — just raw bytes, no extension. Alongside it, a scrap of paper: a code table. Spot the
        encoding, walk the tree, read the message, then type it to claim the badge.
      </p>

      <div className="huf-boss-grid">
        <div className="huf-boss-card">
          <div className="huf-caption">① the file · raw bytes (hex)</div>
          <div className="huf-hex">
            {puzzle.bytes.map((b, i) => (
              <span key={i}>{b.toString(16).toUpperCase().padStart(2, "0")}</span>
            ))}
          </div>
          <div className="huf-caption">…as bits</div>
          <div className="huf-bits">
            {[...puzzle.bits].map((bit, i) => (
              <span key={i} className={cx("huf-bitcell", i < consumed && "used")}>{bit}</span>
            ))}
          </div>
        </div>

        <div className="huf-boss-card">
          <div className="huf-caption">② the key · code table</div>
          <table className="lsb-truth huf-codetable">
            <thead>
              <tr><th>symbol</th><th>code</th></tr>
            </thead>
            <tbody>
              {codeRows.map(([sym, code]) => (
                <tr key={sym}><td>{glyph(sym)}</td><td><code>{code}</code></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="huf-boss-decode">
        <div className="huf-caption">③ decode — walk the tree one code at a time</div>
        <div className="huf-reveal" aria-live="polite">
          {revealed === "" ? <span className="muted">nothing decoded yet</span> : revealed.split("").map((c, i) => <span key={i} className="huf-revchar">{glyph(c)}</span>)}
          <span className="huf-cursor" />
        </div>
        <div className="huf-boss-actions">
          <button type="button" className="btn" onClick={revealNext} disabled={consumed >= puzzle.bits.length}>
            ▶ reveal next character
          </button>
          <button type="button" className="btn" onClick={() => setConsumed(0)}>↺ rewind</button>
        </div>
      </div>

      <div className="huf-boss-answer">
        <label className="huf-inputrow">
          <span className="ss-field">the message is</span>
          <input className="bit-input huf-input" value={guess} onChange={(e) => { setGuess(e.target.value); setVerdict(null); }} placeholder="type what you decoded" aria-label="Decoded message" spellCheck={false} />
        </label>
        <button type="button" className="btn btn-primary" onClick={check}>Check</button>
      </div>
      {verdict === "ok" && <p className="lsb-verdict" style={{ color: "var(--sem-ok)" }}>🏅 Decoded! Badge <strong>Bitreader</strong> earned — the P1 boss is down. You read bytes → bits → tree → message, exactly the ch.1–3 pipeline.</p>}
      {verdict === "no" && <p className="lsb-verdict" style={{ color: "var(--sem-err)" }}>Not quite — use “reveal next character” to walk every bit, then type precisely what comes out (letters and the space).</p>}
      {cleared && verdict !== "ok" && <p className="lsb-verdict muted">✓ already cleared — badge earned.</p>}
    </div>
  );
}
