// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },     // ← ESLint をビルドで無視
  typescript: { ignoreBuildErrors: true },  // ← TS エラーも一時無視
  turbopack: { root: __dirname },
};

export default nextConfig;
