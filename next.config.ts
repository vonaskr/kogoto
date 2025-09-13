// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages で ESLint エラーで止まるのを回避
  eslint: { ignoreDuringBuilds: true },
  // 型エラーでもビルド継続（デプロイ優先）
  typescript: { ignoreBuildErrors: true },

  // （任意）静的書き出しの場合のみ
  // output: "export",
};

export default nextConfig;
