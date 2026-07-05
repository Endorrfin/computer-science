// Engine — triangle rasterization by edge functions (the method every GPU
// uses). Pure & erasable-syntax (Node-testable). Drives rasterizer-toy (ch.9).
//
// A pixel is "inside" the triangle when it lies on the same side of all three
// edges. The edge function edge(a,b,p) is the 2-D cross product (b−a)×(p−a);
// its sign tells you which side of line a→b the point p is on, and the three
// edge values are (up to a scale) the barycentric weights — so the same math
// that decides coverage also interpolates depth/colour across the face.

export type Vertex = { x: number; y: number; z: number }; // z ∈ [0,1] for depth shading
export type Tri = [Vertex, Vertex, Vertex];
export type Pixel = { x: number; y: number; depth: number; bary: [number, number, number] };

/** 2-D cross product of (b−a) and (p−a). Sign = which side of a→b p is on. */
export function edge(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/** Twice the signed area of the triangle (0 ⇒ degenerate / collinear). */
export function signedArea(t: Tri): number {
  return edge(t[0].x, t[0].y, t[1].x, t[1].y, t[2].x, t[2].y);
}

/** Covered pixels in scanline order (row by row, left to right) — exactly the
    order the animation fills them. Pixel centres sit at (x+0.5, y+0.5). */
export function rasterize(t: Tri, w: number, h: number): Pixel[] {
  const area = signedArea(t);
  const out: Pixel[] = [];
  if (area === 0) return out; // degenerate: no interior
  const s = area > 0 ? 1 : -1; // normalize winding so "inside" = all weights ≥ 0
  const absArea = Math.abs(area);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = s * edge(t[1].x, t[1].y, t[2].x, t[2].y, px, py);
      const w1 = s * edge(t[2].x, t[2].y, t[0].x, t[0].y, px, py);
      const w2 = s * edge(t[0].x, t[0].y, t[1].x, t[1].y, px, py);
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        const b0 = w0 / absArea;
        const b1 = w1 / absArea;
        const b2 = w2 / absArea;
        out.push({ x, y, depth: b0 * t[0].z + b1 * t[1].z + b2 * t[2].z, bary: [b0, b1, b2] });
      }
    }
  }
  return out;
}

/** Integer line points (Bresenham) — the wireframe of one edge. */
export function bresenham(x0: number, y0: number, x1: number, y1: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let x = Math.round(x0);
  let y = Math.round(y0);
  const xe = Math.round(x1);
  const ye = Math.round(y1);
  const dx = Math.abs(xe - x);
  const dy = -Math.abs(ye - y);
  const sx = x < xe ? 1 : -1;
  const sy = y < ye ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push({ x, y });
    if (x === xe && y === ye) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}

/** The three edges as a de-duplicated set of grid cells (for wireframe mode). */
export function wireframe(t: Tri): { x: number; y: number }[] {
  const seen = new Set<string>();
  const out: { x: number; y: number }[] = [];
  const edges: [Vertex, Vertex][] = [
    [t[0], t[1]],
    [t[1], t[2]],
    [t[2], t[0]],
  ];
  for (const [a, b] of edges) {
    for (const p of bresenham(a.x, a.y, b.x, b.y)) {
      const k = `${p.x},${p.y}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
  }
  return out;
}

export const DEFAULT_GRID = { w: 22, h: 15 };
export const DEFAULT_TRI: Tri = [
  { x: 3, y: 2, z: 0.15 },
  { x: 18, y: 6, z: 1.0 },
  { x: 6, y: 13, z: 0.45 },
];
