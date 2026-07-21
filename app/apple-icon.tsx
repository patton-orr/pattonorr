import { ImageResponse } from "next/og";

// iOS home-screen icon. 180x180 with an opaque background — iOS renders any
// transparency as black and applies its own rounded-corner mask.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontSize: 84,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        PO
      </div>
    ),
    { ...size },
  );
}
