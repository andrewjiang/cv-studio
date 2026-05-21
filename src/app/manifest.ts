import type { MetadataRoute } from "next";
import { TINYCV_APP_DESCRIPTION } from "@/app/_lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fbf7f0",
    description: TINYCV_APP_DESCRIPTION,
    display: "standalone",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
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
