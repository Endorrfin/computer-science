// CHANGED: S19 — one-shot generator for public/og.png (1200×630).
//
// The social card mirrors the guide's visual signature: the 11-part layer
// spectrum (silicon warm → AI cool) glowing on the dark base, with the
// wordmark, the journey line and derived stats.
//
// Not part of the build; rerun only when the brand/stats change:
//   1) npm i --no-save @resvg/resvg-js
//   2) fonts: extract TTFs from @fontsource/space-grotesk + @fontsource/inter
//      (woff → ttf via python fontTools; see FONTS below)
//   3) node scripts/gen-og.mjs <fontsDir>
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = process.argv[2] ?? "/tmp/fonts";
const FONTS = [
  join(fontsDir, "SpaceGrotesk-Bold.ttf"),
  join(fontsDir, "SpaceGrotesk-Medium.ttf"),
  join(fontsDir, "Inter-Regular.ttf"),
  join(fontsDir, "Inter-SemiBold.ttf"),
  // fallback with the U+2192 arrow glyph (fontsource latin subsets lack it)
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

// Layer spectrum, bottom (silicon) → top (AI) — CLAUDE.md §7.
const SPECTRUM = [
  "#FACC15", // P1 Information
  "#FB923C", // P2 Machine
  "#A3E635", // P3 Code
  "#34D399", // P4 Algorithms
  "#2DD4BF", // P5 Theory
  "#22D3EE", // P6 OS
  "#38BDF8", // P7 Networks
  "#60A5FA", // P8 Data
  "#818CF8", // P9 Security
  "#A78BFA", // P10 Intelligence
  "#94A3B8", // P11 Capstone
];

// The stack, top of the SVG = top of the journey (AI) → reverse the array.
const bars = [...SPECTRUM].reverse().map((color, i) => {
  const h = 34;
  const gap = 14.5;
  const y = 60 + i * (h + gap);
  const x = 872;
  const w = 252;
  return `
    <rect x="${x - 10}" y="${y - 4}" width="${w + 20}" height="${h + 8}" rx="14" fill="${color}" opacity="0.28" filter="url(#glow)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${color}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#sheen)"/>`;
});

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-40%" y="-120%" width="180%" height="340%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
    <radialGradient id="bgGlow" cx="0.78" cy="0.5" r="0.75">
      <stop offset="0" stop-color="#1B2130"/>
      <stop offset="1" stop-color="#0B0C0E"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bgGlow)"/>

  <!-- favicon glyph: four stacked layers -->
  <g transform="translate(80,64)">
    <rect width="52" height="52" rx="12" fill="#171A1E" stroke="#262B32"/>
    <rect x="11" y="35" width="30" height="6" rx="3" fill="#FB923C"/>
    <rect x="11" y="26" width="30" height="6" rx="3" fill="#34D399"/>
    <rect x="11" y="17" width="30" height="6" rx="3" fill="#38BDF8"/>
    <rect x="11" y="8"  width="30" height="6" rx="3" fill="#A78BFA"/>
  </g>
  <text x="152" y="88" font-family="Space Grotesk" font-weight="500" font-size="26" fill="#9AA7B4">computer-science</text>

  <text x="80" y="235" font-family="Space Grotesk" font-weight="700" font-size="84" fill="#F2F5F7">Computer Science</text>
  <text x="80" y="298" font-family="Space Grotesk" font-weight="500" font-size="40" fill="#38BDF8">The Interactive Journey</text>

  <text x="80" y="372" font-family="Inter" font-weight="400" font-size="23" fill="#9AA7B4">electron → gate → CPU → algorithm → OS → network → data → AI</text>

  <text x="80" y="452" font-family="Inter" font-weight="600" font-size="22" fill="#F2F5F7">37 units · 82 live simulators · 74 katas · 10 boss challenges</text>
  <text x="80" y="490" font-family="Inter" font-weight="400" font-size="20" fill="#9AA7B4">from zero to senior depth — every core idea touchable</text>

  <!-- author line with a small UA flag -->
  <g transform="translate(80,540)">
    <rect x="0" y="2" width="27" height="18" fill="#FACC15" rx="2.5"/>
    <path d="M0 4.5 a2.5 2.5 0 0 1 2.5 -2.5 h22 a2.5 2.5 0 0 1 2.5 2.5 v6.5 h-27 z" fill="#3B82F6"/>
    <text x="40" y="18" font-family="Inter" font-weight="600" font-size="21" fill="#F2F5F7">Vasyl Krupka</text>
    <text x="184" y="18" font-family="Inter" font-weight="400" font-size="21" fill="#9AA7B4">· Senior Fullstack Engineer · Ukraine</text>
  </g>

  <!-- the journey stack -->
  ${bars.join("\n")}

  <!-- journey endpoints -->
  <text x="998" y="42" font-family="Inter" font-weight="600" font-size="17" fill="#A78BFA" text-anchor="middle">AI</text>
  <text x="998" y="608" font-family="Inter" font-weight="600" font-size="17" fill="#FACC15" text-anchor="middle">silicon</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Inter" },
  background: "#0B0C0E",
});
const png = resvg.render().asPng();
const out = join(here, "..", "public", "og.png");
writeFileSync(out, png);
console.log(`gen-og: wrote ${out} (${(png.length / 1024).toFixed(1)} KB)`);
