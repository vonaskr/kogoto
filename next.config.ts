import type { NextConfig } from "next";

const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true, 
  },
  turbopack: { root: __dirname }, 
};
export default nextConfig;
