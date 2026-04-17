import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "images.unsplash.com",
        protocol: "https",
      },
    ],
  },
  turbopack: {
    root: configDirectory,
  },
};

export default nextConfig;
