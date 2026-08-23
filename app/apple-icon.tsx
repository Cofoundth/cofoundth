import { ImageResponse } from "next/og";

// Home-screen icon, generated from the live tokens for the same reason as
// opengraph-image: the checked-in public/apple-touch-icon.png was pre-restyle
// artwork (#0A1F44 + #B8941F + Georgia) and had no way to follow the palette.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1B1A17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 600, color: "#FFFFFF" }}>C</div>
        <div
          style={{
            position: "absolute",
            right: 38,
            bottom: 52,
            width: 16,
            height: 16,
            borderRadius: 16,
            background: "#E9E2D4",
          }}
        />
      </div>
    ),
    size,
  );
}
