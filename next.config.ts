import type { NextConfig } from "next";

const configDirectory = new URL(".", import.meta.url).pathname;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        destination: "/ben-yanuaria",
        permanent: true,
        source: "/SteadyBlueSparrow",
      },
      {
        destination: "/ben-yanuaria/pdf",
        permanent: true,
        source: "/SteadyBlueSparrow/pdf",
      },
    ];
  },
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
