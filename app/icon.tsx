import { ImageResponse } from "next/og";

// App icon (also used by the web manifest). "PO" monogram kept within the
// central safe zone so the same image works as a maskable icon on Android.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 240,
          fontWeight: 700,
          letterSpacing: -12,
        }}
      >
        PO
      </div>
    ),
    { ...size },
  );
}
