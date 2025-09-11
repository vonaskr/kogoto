import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",         
  images: { unoptimized: true }, // next/image を使っている場合の保険
};

export default nextConfig;
