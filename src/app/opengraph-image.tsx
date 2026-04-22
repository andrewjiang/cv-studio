import { ImageResponse } from "next/og";

export const alt = "Tiny CV, markdown-first resume builder";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #fbf7f0 0%, #efe7da 100%)",
          color: "#0f172a",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "stretch",
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 44,
            boxShadow: "0 32px 80px rgba(15,23,42,0.12)",
            display: "flex",
            gap: 56,
            height: "100%",
            padding: 56,
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#065f46",
              borderRadius: 32,
              color: "white",
              display: "flex",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 88,
              fontWeight: 800,
              height: 176,
              justifyContent: "center",
              letterSpacing: -5,
              width: 176,
            }}
          >
            CV
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                color: "#065f46",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 7,
                marginBottom: 28,
                textTransform: "uppercase",
              }}
            >
              Tiny CV
            </div>
            <div
              style={{
                color: "#111827",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: -3.2,
                lineHeight: 0.98,
                marginBottom: 30,
              }}
            >
              The resume builder that stays on one page.
            </div>
            <div
              style={{
                color: "#475569",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 1.35,
                maxWidth: 720,
              }}
            >
              Write in markdown, preview on real paper, and publish a clean link when it is ready.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
