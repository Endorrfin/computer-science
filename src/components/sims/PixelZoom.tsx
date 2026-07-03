// [micro] pixel-zoom — zoom into a picture until pixels dissolve into three
// numbers each (R, G, B). Drag the channel gains and watch the colour recompute
// live. Reactive (no time axis). The image is procedural so it ships offline.
import { useState } from "react";
import SimShell from "./SimShell.tsx";
import { clamp, cx } from "../../lib/utils.ts";

const ACCENT = "#FACC15";
const SIZE = 16; // 16×16 image
const WIN = 4; // zoom window is 4×4 pixels

type RGB = [number, number, number];

/** A tiny procedural scene: sky gradient, a sun, a strip of ground. */
function basePixel(x: number, y: number): RGB {
  const gy = y / (SIZE - 1);
  if (y >= 11) return [70 + ((x * 9) % 30), 120 + ((x * 13) % 40), 60 + ((y * 5) % 20)]; // ground
  const dx = x - 11.5;
  const dy = y - 3.5;
  if (dx * dx + dy * dy <= 7) return [252, 210, 70]; // sun
  return [70 + Math.round(gy * 70), 130 + Math.round(gy * 80), 210 - Math.round(gy * 50)]; // sky
}

function applyGain([r, g, b]: RGB, gains: RGB): RGB {
  return [
    clamp(Math.round(r * gains[0]), 0, 255),
    clamp(Math.round(g * gains[1]), 0, 255),
    clamp(Math.round(b * gains[2]), 0, 255),
  ];
}
const css = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;

export default function PixelZoom() {
  const [win, setWin] = useState<{ x: number; y: number }>({ x: 10, y: 2 });
  const [gain, setGain] = useState<RGB>([1, 1, 1]);

  function pick(x: number, y: number) {
    setWin({ x: clamp(x - 1, 0, SIZE - WIN), y: clamp(y - 1, 0, SIZE - WIN) });
  }

  const gainLabel = ["R", "G", "B"] as const;
  const neutral = gain[0] === 1 && gain[1] === 1 && gain[2] === 1;

  return (
    <SimShell
      title="Pixel zoom — a colour is just three numbers"
      simKey="pixel-zoom"
      accent={ACCENT}
      onReset={() => {
        setWin({ x: 10, y: 2 });
        setGain([1, 1, 1]);
      }}
      status={
        neutral
          ? "Click anywhere in the picture to move the zoom window. Each pixel below is one colour = three bytes (0–255), 24 bits total."
          : `Channel gains applied: R×${gain[0]} G×${gain[1]} B×${gain[2]} — every pixel's stored numbers are recomputed. This is (a crude version of) what an image filter does.`
      }
      controls={
        <div className="px-gains">
          {gainLabel.map((ch, i) => (
            <label key={ch} className="ss-field px-gain">
              {ch}×{gain[i].toFixed(1)}
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={gain[i]}
                aria-label={`${ch} channel gain`}
                onChange={(e) => setGain((g) => g.map((v, j) => (j === i ? Number(e.target.value) : v)) as RGB)}
              />
            </label>
          ))}
        </div>
      }
    >
      <div className="px-stage">
        <div className="px-overview" role="img" aria-label="16 by 16 pixel image; click to zoom">
          {Array.from({ length: SIZE }, (_, y) =>
            Array.from({ length: SIZE }, (_, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                className="px-cell"
                style={{ background: css(applyGain(basePixel(x, y), gain)) }}
                onClick={() => pick(x, y)}
                aria-label={`pixel ${x},${y}`}
                tabIndex={-1}
              />
            )),
          )}
          <div
            className="px-window"
            style={{ left: `${(win.x / SIZE) * 100}%`, top: `${(win.y / SIZE) * 100}%`, width: `${(WIN / SIZE) * 100}%`, height: `${(WIN / SIZE) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="px-zoom" aria-label="zoomed pixels with RGB numbers">
          {Array.from({ length: WIN }, (_, dy) =>
            Array.from({ length: WIN }, (_, dx) => {
              const rgb = applyGain(basePixel(win.x + dx, win.y + dy), gain);
              const light = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 140;
              return (
                <div key={`${dx}-${dy}`} className={cx("px-big", light ? "on-light" : "on-dark")} style={{ background: css(rgb) }}>
                  <span>{rgb[0]}</span>
                  <span>{rgb[1]}</span>
                  <span>{rgb[2]}</span>
                </div>
              );
            }),
          )}
        </div>
      </div>

      <p className="lsb-canvas-hint muted">
        No colours live in the file — only numbers. Three bytes per pixel (8 bits each: 256 levels of red, green, blue →
        16.7 million colours). A 4000×3000 photo is 36 million such numbers, which is exactly why images beg to be
        compressed (ch.3).
      </p>
    </SimShell>
  );
}
