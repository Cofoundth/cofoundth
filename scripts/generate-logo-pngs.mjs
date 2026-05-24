// Generate PNG versions of the Cofoundee logo from SVG sources.
// Run: node scripts/generate-logo-pngs.mjs
//
// LinkedIn app requires PNG min 300×300. Sharp comes with Next.js so no
// extra install. Outputs to public/ and app/.

import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// ---- SVG sources --------------------------------------------------

// Higher-detail mark for raster output. Slightly thicker padding so the
// "C" reads at small sizes.
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0A1F44"/>
  <text x="270" y="740" font-family="Georgia, 'Times New Roman', serif" font-size="680" font-weight="500" fill="#FFFFFF">C</text>
  <circle cx="760" cy="690" r="68" fill="#B8941F"/>
</svg>`;

const WORDMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 280">
  <rect width="1200" height="280" fill="#FAFAF7"/>
  <text x="80" y="200" font-family="Georgia, 'Times New Roman', serif" font-size="180" letter-spacing="-2">
    <tspan fill="#0A1F44" font-weight="500">cofoundee</tspan><tspan fill="#B8941F" font-weight="700">.</tspan>
  </text>
</svg>`;

const WORDMARK_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 280">
  <rect width="1200" height="280" fill="#0A1F44"/>
  <text x="80" y="200" font-family="Georgia, 'Times New Roman', serif" font-size="180" letter-spacing="-2">
    <tspan fill="#FFFFFF" font-weight="500">cofoundee</tspan><tspan fill="#B8941F" font-weight="700">.</tspan>
  </text>
</svg>`;

const OG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FAFAF7"/>
  <rect x="0" y="0" width="1200" height="6" fill="#B8941F"/>
  <g transform="translate(80, 140)">
    <rect width="100" height="100" fill="#0A1F44"/>
    <text x="28" y="76" font-family="Georgia, serif" font-size="72" font-weight="500" fill="#FFFFFF">C</text>
    <circle cx="74" cy="72" r="7" fill="#B8941F"/>
  </g>
  <text x="80" y="380" font-family="Georgia, serif" font-size="64" fill="#0A1F44" font-weight="500">
    Where Thai startups build together.
  </text>
  <text x="80" y="445" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="26" fill="#888888">
    Community + bridge for Thailand's startup ecosystem.
  </text>
  <text x="80" y="565" font-family="Georgia, serif" font-size="22" fill="#B8941F" letter-spacing="2">
    COFOUNDEE.CO
  </text>
</svg>`;

// ---- Output specs --------------------------------------------------

const outputs = [
  // Mark (square) — for LinkedIn, app icons, favicons
  { svg: MARK_SVG, size: 1024, file: "public/logo-mark-1024.png" },
  { svg: MARK_SVG, size: 512, file: "public/logo-mark-512.png" },
  { svg: MARK_SVG, size: 300, file: "public/logo-mark-300.png" },
  { svg: MARK_SVG, size: 180, file: "public/apple-touch-icon.png" },

  // Wordmark — for emails, decks, social
  { svg: WORDMARK_SVG, size: { w: 1200, h: 280 }, file: "public/logo-wordmark.png" },
  { svg: WORDMARK_DARK_SVG, size: { w: 1200, h: 280 }, file: "public/logo-wordmark-dark.png" },

  // OG image — social sharing preview
  { svg: OG_SVG, size: { w: 1200, h: 630 }, file: "public/og-image.png" },
];

// ---- Run -----------------------------------------------------------

for (const out of outputs) {
  const buf = Buffer.from(out.svg);
  const target = path.join(ROOT, out.file);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });

  const resize = typeof out.size === "number"
    ? { width: out.size, height: out.size }
    : { width: out.size.w, height: out.size.h };

  await sharp(buf, { density: 300 })
    .resize(resize)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(target);

  console.log(`✓ ${out.file} (${resize.width}x${resize.height})`);
}

console.log("\nAll PNGs generated. Upload logo-mark-512.png or logo-mark-300.png to LinkedIn.");
