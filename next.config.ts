import type { NextConfig } from "next";

const configDirectory = new URL(".", import.meta.url).pathname;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        destination: "/ben",
        permanent: true,
        source: "/SteadyBlueSparrow",
      },
      {
        destination: "/ben/pdf",
        permanent: true,
        source: "/SteadyBlueSparrow/pdf",
      },
      {
        destination: "/ben",
        permanent: true,
        source: "/ben-yanuaria",
      },
      {
        destination: "/ben/pdf",
        permanent: true,
        source: "/ben-yanuaria/pdf",
      },
      {
        destination: "/dan",
        permanent: true,
        source: "/SunnyCedarHare",
      },
      {
        destination: "/dan/pdf",
        permanent: true,
        source: "/SunnyCedarHare/pdf",
      },
      {
        destination: "/ashwin",
        permanent: true,
        source: "/WarmStoneHare",
      },
      {
        destination: "/ashwin/pdf",
        permanent: true,
        source: "/WarmStoneHare/pdf",
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
