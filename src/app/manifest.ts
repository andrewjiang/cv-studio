import type { MetadataRoute } from "next";

const description = "Write in markdown, preview on paper, publish a clean CV link, and export a PDF.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fbf7f0",
    description,
    display: "standalone",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    name: "Tiny CV",
    short_name: "Tiny CV",
    start_url: "/",
    theme_color: "#065f46",
  };
}
