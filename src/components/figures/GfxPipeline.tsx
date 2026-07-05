// [fig] gfx-pipeline — the graphics pipeline stepped: vertices → primitive
// assembly → rasterization → fragment shading → pixels. Uses the same
// rasterizer engine as rasterizer-toy so the covered cells match exactly.
// The closing beat: every fragment is shaded independently — thousands at once
// — which is the parallel-hardware bridge to the rest of ch.9. Engine:
// gpu/raster. Semantic palette (§7): data = cyan, control = orange.
import FigureStepper from "./FigureStepper.tsx";
import type { Frame } from "./FigureStepper.tsx";
import { rasterize } from "../sims/gpu/raster.ts";
import type { Tri } from "../sims/gpu/raster.ts";

const GW = 10;
const GH = 7;
const CELL = 30;
const GX = 175;
const GY = 45;
const TRI: Tri = [
  { x: 1, y: 1, z: 0.12 },
  { x: 8, y: 3, z: 1.0 },
  { x: 3, y: 6, z: 0.5 },
];
const COVERED = rasterize(TRI, GW, GH);
const VLABEL = ["A", "B", "C"];

const sx = (gx: number) => GX + gx * CELL;
const sy = (gy: number) => GY + gy * CELL;

function depthFill(z: number): string {
  const light = Math.round(72 - z * 42);
  const hue = Math.round(190 + z * 70);
  return `hsl(${hue} 80% ${light}%)`;
}

function grid() {
  const lines = [];
  for (let x = 0; x <= GW; x++) lines.push(<line key={`v${x}`} x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(GH)} stroke="var(--line)" strokeWidth="1" />);
  for (let y = 0; y <= GH; y++) lines.push(<line key={`h${y}`} x1={sx(0)} y1={sy(y)} x2={sx(GW)} y2={sy(y)} stroke="var(--line)" strokeWidth="1" />);
  return <g>{lines}</g>;
}

function verts(showCoords: boolean) {
  return (
    <g>
      {TRI.map((v, i) => (
        <g key={i}>
          <circle cx={sx(v.x)} cy={sy(v.y)} r="6" fill="var(--sem-data)" stroke="var(--bg)" strokeWidth="1.5" />
          <text x={sx(v.x) + 10} y={sy(v.y) - 8} fontSize="12" fontWeight="700" fontFamily="var(--font-mono)" fill="var(--sem-data)">
            {VLABEL[i]}
          </text>
          {showCoords && (
            <text x={sx(v.x) + 10} y={sy(v.y) + 6} fontSize="9" fill="var(--tx2)">
              ({v.x},{v.y}) z={v.z}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function outline() {
  return <polygon points={TRI.map((v) => `${sx(v.x)},${sy(v.y)}`).join(" ")} fill="none" stroke="var(--sem-control)" strokeWidth="2.5" />;
}

function stageLabel(active: number) {
  const stages = ["vertices", "assembly", "raster", "fragments", "pixels"];
  return (
    <g fontFamily="var(--font-mono)" fontSize="11">
      {stages.map((s, i) => (
        <g key={s}>
          <rect x="18" y={50 + i * 34} width="120" height="26" rx="6" fill={i === active ? "color-mix(in srgb, var(--sem-control) 22%, var(--surface))" : "var(--s2)"} stroke={i === active ? "var(--sem-control)" : "var(--line)"} strokeWidth={i === active ? 2 : 1} />
          <text x="34" y={67 + i * 34} fill={i === active ? "var(--tx)" : "var(--tx3)"} fontWeight={i === active ? 700 : 400}>
            {i + 1}. {s}
          </text>
        </g>
      ))}
    </g>
  );
}

function Scene({ stage }: { stage: number }) {
  return (
    <g>
      {stageLabel(stage)}
      {stage >= 2 && grid()}

      {/* fragments (covered cells) */}
      {stage === 3 && COVERED.map((p, i) => <rect key={i} x={sx(p.x) + 1.5} y={sy(p.y) + 1.5} width={CELL - 3} height={CELL - 3} rx="3" fill="none" stroke="var(--sem-control)" strokeWidth="1.5" opacity="0.9" />)}
      {stage >= 4 && COVERED.map((p, i) => <rect key={i} x={sx(p.x) + 1} y={sy(p.y) + 1} width={CELL - 2} height={CELL - 2} rx="3" fill={depthFill(p.depth)} />)}

      {stage >= 1 && stage <= 3 && outline()}
      {stage <= 3 && verts(stage === 0)}

      {stage >= 4 && (
        <text x={sx(0)} y={sy(GH) + 22} fontSize="10.5" fill="var(--tx2)">
          {COVERED.length} fragments shaded independently — a GPU does all of them at once.
        </text>
      )}
    </g>
  );
}

const FRAMES: Frame[] = [
  { caption: "1 · Vertices in. The GPU is handed three vertices — each a position plus attributes (here a depth z, but also colour, texture coords, normals). Just three points so far.", render: () => <Scene stage={0} /> },
  { caption: "2 · Primitive assembly. The vertices are connected into a primitive — a triangle. (Everything you see in 3D graphics is ultimately triangles.)", render: () => <Scene stage={1} /> },
  { caption: "3 · Rasterization. The triangle is laid over the pixel grid and tested cell by cell: which pixel centres fall inside? Those become candidate fragments (outlined) — the edge-function test from rasterizer-toy.", render: () => <Scene stage={2} /> },
  { caption: "4 · Fragment shading. Each covered fragment gets its attributes interpolated from the vertices (depth here, giving the near→far shade) and a shader computes its final colour — one tiny independent program per fragment.", render: () => <Scene stage={3} /> },
  { caption: "5 · Pixels out. After the depth test and blending, fragments land in the framebuffer as pixels. The key point: every fragment is shaded in parallel — a handful here, but millions in a real frame — the same SIMD width that, pointed at matrices instead of pixels, powers AI (ch.33–34).", render: () => <Scene stage={4} /> },
];

export default function GfxPipeline() {
  return <FigureStepper title="The graphics pipeline: vertices → pixels" figKey="gfx-pipeline" viewBox="0 0 500 290" accent="#FB923C" frames={FRAMES} />;
}
