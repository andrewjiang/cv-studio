import type { NextConfig } from "next";

const configDirectory = new URL(".", import.meta.url).pathname;

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
