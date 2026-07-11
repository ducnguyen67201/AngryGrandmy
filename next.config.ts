import type { NextConfig } from "next";
import { resolveLocalSurface } from "./src/lib/runtime/surface";

const surface = resolveLocalSurface(process.env.GRANNYSMITH_SURFACE);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async rewrites() {
    return {
      beforeFiles:
        surface === "app"
          ? [{ source: "/", destination: "/lab" }]
          : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
