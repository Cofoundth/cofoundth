import { ImageResponse } from "next/og";

// The share card, rendered from the live design tokens instead of a checked-in
// PNG. The old public/og-image.png was baked against the pre-restyle palette
// (#FAFAF7 ground, #0A1F44 navy, #B8941F gold, Georgia) and silently kept
// serving that on every shared link after the restyle. Generating it here means
// it can never drift again.
//
// No custom font is loaded on purpose: Satori has no access to next/font, and
// fetching a woff2 at request time would add a failure mode to a route whose
// only job is to not break link previews. The system stack is close enough at
// 1200x630.

export const alt = "Cofoundee — Where Thai startups build together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#F3F0E9";
const INK = "#1B1A17";
const MUTED = "#6A655D";
const ACCENT = "#E9E2D4";
const LINE = "#DDDBD4";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CREAM,
          padding: 88,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 600, color: "#FFFFFF" }}>
              C
            </div>
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 22,
                width: 9,
                height: 9,
                borderRadius: 9,
                background: ACCENT,
              }}
            />
          </div>
          <div style={{ fontSize: 38, fontWeight: 600, color: INK }}>
            cofoundee.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: INK,
              maxWidth: 900,
            }}
          >
            Where Thai startups build together
          </div>
          <div style={{ fontSize: 30, color: MUTED, maxWidth: 820 }}>
            Community, partners, capital, and co-founders — in one place.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingTop: 28,
            borderTop: `1px solid ${LINE}`,
            fontSize: 24,
            color: MUTED,
          }}
        >
          cofoundee.co
        </div>
      </div>
    ),
    size,
  );
}
