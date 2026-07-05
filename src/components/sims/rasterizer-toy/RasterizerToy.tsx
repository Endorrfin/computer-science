// [micro] rasterizer-toy — drag the three vertices of a triangle and watch the
// GPU's core job: turning a shape into pixels. The same edge-function math
// decides coverage and interpolates depth across the face. Modes: wireframe
// (just the edges), filled (solid), depth (shade by interpolated z). The fill
// animates in scanline order — exactly how a rasterizer walks the triangle.
// Engine: gpu/raster.
import { useMemo, useRef, useState } from "react";
import { cx } from "../../../lib/utils.ts";
import SimShell from "../SimShell.tsx";
import { useSimClock } from "../../../lib/simClock.ts";
import { DEFAULT_GRID, DEFAULT_TRI, rasterize, signedArea, wireframe } from "../gpu/raster.ts";
import type { Tri } from "../gpu/raster.ts";

const ACCENT = "#FB923C";
const CELL = 22;
const W = DEFAULT_GRID.w;
const H = DEFAULT_GRID.h;
type Mode = "wireframe" | "filled" | "depth";
const VLABEL = ["A", "B", "C"];

function depthColor(z: number): string {
  // near (z→0) = bright cyan, far (z→1) = deep violet — the classic depth ramp
  const light = Math.round(78 - z * 48);
  const hue = Math.round(190 + z * 70);
  return `hsl(${hue} 80% ${light}%)`;
}

export default function RasterizerToy() {
  const [tri, setTri] = useState<Tri>(() => DEFAULT_TRI.map((v) => ({ ...v })) as Tri);
  const [mode, setMode] = useState<Mode>("filled");
  const [t, setT] = useState<number>(-1); // pixels revealed (−1 = show all)
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [drag, setDrag] = useState<number>(-1);
  const svgRef = useRef<SVGSVGElement>(null);

  const area = signedArea(tri);
  const pixels = useMemo(() => rasterize(tri, W, H), [tri]);
  const wire = useMemo(() => wireframe(tri), [tri]);
  const revealList = mode === "wireframe" ? wire : pixels;
  const total = revealList.length;
  const shown = t < 0 ? total : Math.min(t, total);

  useSimClock(running, 22 * speed, () => {
    setT((x) => {
      const cur = x < 0 ? total : x;
      if (cur >= total) {
        setRunning(false);
        return total;
      }
      return cur + 1;
    });
  });

  function svgToGrid(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const gx = ((e.clientX - rect.left) / rect.width) * W;
    const gy = ((e.clientY - rect.top) / rect.height) * H;
    return { x: Math.max(0, Math.min(W, gx)), y: Math.max(0, Math.min(H, gy)) };
  }
  function onMove(e: React.PointerEvent) {
    if (drag < 0) return;
    const { x, y } = svgToGrid(e);
    setTri((cur) => cur.map((v, i) => (i === drag ? { ...v, x, y } : v)) as Tri);
    setT(-1);
  }

  function restart() {
    setT(0);
    setRunning(true);
  }
  function onStep() {
    setRunning(false);
    setT((x) => Math.min(total, (x < 0 ? 0 : x) + 1));
  }
  function onReset() {
    setRunning(false);
    setTri(DEFAULT_TRI.map((v) => ({ ...v })) as Tri);
    setT(-1);
  }

  return (
    <SimShell
      title="Rasterizer — a triangle becomes pixels"
      simKey="rasterizer-toy"
      accent={ACCENT}
      transport={{ running, onToggle: () => (running ? setRunning(false) : restart()), onStep, speed, onSpeed: setSpeed }}
      onReset={onReset}
      status={area === 0 ? "Degenerate triangle (zero area) — the three points are collinear, so it covers no pixels." : `${mode} · ${pixels.length} pixels covered${mode !== "wireframe" ? ` · showing ${shown}/${total}` : ""}`}
      controls={
        <div className="rz-ctl" role="group" aria-label="Render mode">
          {(["wireframe", "filled", "depth"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={cx("bit-segbtn", mode === m && "on")}
              onClick={() => {
                setMode(m);
                setT(-1);
                setRunning(false);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      }
      footer={
        <p className="rz-foot muted">
          Every covered pixel is decided by three <b>edge functions</b> (which side of each edge it&apos;s on); their values double as the
          barycentric weights that interpolate <b>depth</b> and colour. A GPU runs this test for thousands of pixels at once — the parallel
          job ch.9 is about.
        </p>
      }
    >
      <svg
        ref={svgRef}
        className="rz-svg"
        viewBox={`0 0 ${W * CELL} ${H * CELL}`}
        width="100%"
        role="img"
        aria-label={`Rasterized triangle, ${pixels.length} pixels`}
        onPointerMove={onMove}
        onPointerUp={() => setDrag(-1)}
        onPointerLeave={() => setDrag(-1)}
        style={{ touchAction: "none" }}
      >
        {/* grid */}
        <g stroke="var(--line)" strokeWidth="1">
          {Array.from({ length: W + 1 }, (_, x) => (
            <line key={`v${x}`} x1={x * CELL} y1={0} x2={x * CELL} y2={H * CELL} />
          ))}
          {Array.from({ length: H + 1 }, (_, y) => (
            <line key={`h${y}`} x1={0} y1={y * CELL} x2={W * CELL} y2={y * CELL} />
          ))}
        </g>

        {/* filled / depth pixels, revealed in scanline order */}
        {mode !== "wireframe" &&
          pixels.slice(0, shown).map((p, idx) => (
            <rect
              key={idx}
              x={p.x * CELL + 1}
              y={p.y * CELL + 1}
              width={CELL - 2}
              height={CELL - 2}
              rx="3"
              fill={mode === "depth" ? depthColor(p.depth) : `color-mix(in srgb, ${ACCENT} 55%, var(--surface))`}
            />
          ))}

        {/* wireframe cells */}
        {mode === "wireframe" &&
          wire.slice(0, shown).map((p, idx) => (
            <rect key={idx} x={p.x * CELL + 1} y={p.y * CELL + 1} width={CELL - 2} height={CELL - 2} rx="3" fill="none" stroke="var(--sem-data)" strokeWidth="2" />
          ))}

        {/* triangle outline */}
        <polygon
          points={tri.map((v) => `${v.x * CELL},${v.y * CELL}`).join(" ")}
          fill="none"
          stroke="var(--sem-control)"
          strokeWidth="2"
          strokeDasharray="5 4"
          opacity="0.8"
        />

        {/* draggable vertices */}
        {tri.map((v, i) => (
          <g key={i} className="rz-vtx" onPointerDown={() => setDrag(i)} style={{ cursor: "grab" }}>
            <circle cx={v.x * CELL} cy={v.y * CELL} r="9" fill="var(--surface)" stroke="var(--sem-control)" strokeWidth="2.5" />
            <text x={v.x * CELL} y={v.y * CELL + 4} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill="var(--tx)">
              {VLABEL[i]}
            </text>
          </g>
        ))}
      </svg>
      <p className="rz-hint muted">Drag A · B · C to reshape the triangle. Press ▶ to watch the scanline fill; try depth mode to see z interpolated across the face.</p>
    </SimShell>
  );
}
