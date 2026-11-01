import { ImageResponse } from "next/og";
export const alt = "JI-EUM · Your personal music archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#151615",
        color: "#e5bd83",
        display: "flex",
        flexDirection: "column",
        padding: "95px",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 23, letterSpacing: 9 }}>
        YOUR PERSONAL MUSIC ARCHIVE
      </div>
      <div style={{ fontSize: 110, marginTop: 32 }}>JI–EUM</div>
      <div style={{ fontSize: 28, color: "#eceee7", marginTop: 30 }}>
        Dig deeper. Keep closer.
      </div>
    </div>,
    size,
  );
}
